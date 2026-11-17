export interface MasterCatalogItem {
  id?: string;
  itemCode: string;
  barcode: string;
  description: string;
  category: string;
  uom: string;
  unitCost: number;
}

export interface QcChecklist {
  packagingIntact: boolean;
  expiredOrNear: boolean;
  physicalGood: boolean;
  notes: string;
}

export interface ActiveGrLineItem {
  masterItemId: string | null;
  itemCode: string;
  barcode: string;
  description: string;
  category: string;
  uom: string;
  unitCost: number;
  quantity: number;
  qc: QcChecklist;
  lastScannedAt: string;
}

export interface SessionMeta {
  sessionCode: string;
  operatorName: string;
  supplierName: string;
  poNumber: string;
  dockBay: string;
  notes: string;
}

export interface SessionSummary {
  totalSkus: number;
  totalUnits: number;
  qcPassCount: number;
  qcFailCount: number;
  allQcPassed: boolean;
}

export interface GrSessionRecord {
  id: string;
  sessionCode: string;
  operatorName: string;
  supplierName: string;
  poNumber: string;
  dockBay: string;
  notes: string;
  totalSkus: number;
  totalUnits: number;
  qcPassCount: number;
  qcFailCount: number;
  status: string;
  submittedAt: string;
  items: {
    id?: string;
    itemCode: string;
    barcode: string;
    description: string;
    category: string;
    uom: string;
    quantity: number;
    qcPackagingIntact: boolean;
    qcExpiredOrNear: boolean;
    qcPhysicalGood: boolean;
    qcNotes: string;
  }[];
}

export function normalizeBarcode(raw: string): string {
  return raw.replace(/[\r\n\t\s\u0000-\u001F\u007F]+/g, '').trim();
}

export function createDefaultQc(): QcChecklist {
  return {
    packagingIntact: true,
    expiredOrNear: false,
    physicalGood: true,
    notes: '',
  };
}

export function evaluateItemQcStatus(qc: QcChecklist): 'passed' | 'flagged' {
  return qc.packagingIntact && !qc.expiredOrNear && qc.physicalGood
    ? 'passed'
    : 'flagged';
}

export function upsertScannedItem(
  items: ActiveGrLineItem[],
  catalogItem: MasterCatalogItem,
  batchQty = 1,
  timestamp = new Date().toISOString()
): { nextItems: ActiveGrLineItem[]; action: 'incremented' | 'added'; updatedItem: ActiveGrLineItem } {
  const qtyToAdd = Number.isFinite(batchQty) && batchQty >= 1 ? Math.floor(batchQty) : 1;
  const targetBarcode = normalizeBarcode(catalogItem.barcode);
  const existingIndex = items.findIndex(
    (entry) => normalizeBarcode(entry.barcode) === targetBarcode
  );

  if (existingIndex >= 0) {
    const existing = items[existingIndex];
    const updatedItem: ActiveGrLineItem = {
      ...existing,
      quantity: existing.quantity + qtyToAdd,
      lastScannedAt: timestamp,
    };
    const nextItems = [
      updatedItem,
      ...items.filter((_, idx) => idx !== existingIndex),
    ];
    return { nextItems, action: 'incremented', updatedItem };
  }

  const newItem: ActiveGrLineItem = {
    masterItemId: catalogItem.id ?? null,
    itemCode: catalogItem.itemCode,
    barcode: targetBarcode,
    description: catalogItem.description,
    category: catalogItem.category,
    uom: catalogItem.uom || 'PCS',
    unitCost: catalogItem.unitCost || 0,
    quantity: qtyToAdd,
    qc: createDefaultQc(),
    lastScannedAt: timestamp,
  };

  return {
    nextItems: [newItem, ...items],
    action: 'added',
    updatedItem: newItem,
  };
}

export function updateItemQuantity(
  items: ActiveGrLineItem[],
  barcode: string,
  nextQty: number
): ActiveGrLineItem[] {
  const normalized = normalizeBarcode(barcode);
  if (!Number.isFinite(nextQty) || nextQty <= 0) {
    return items.filter((item) => normalizeBarcode(item.barcode) !== normalized);
  }
  const safeQty = Math.max(1, Math.floor(nextQty));
  return items.map((item) =>
    normalizeBarcode(item.barcode) === normalized
      ? { ...item, quantity: safeQty }
      : item
  );
}

export function updateItemQcField(
  items: ActiveGrLineItem[],
  barcode: string,
  field: keyof QcChecklist,
  value: boolean | string
): ActiveGrLineItem[] {
  const normalized = normalizeBarcode(barcode);
  return items.map((item) => {
    if (normalizeBarcode(item.barcode) !== normalized) {
      return item;
    }
    return {
      ...item,
      qc: {
        ...item.qc,
        [field]: value,
      },
    };
  });
}

export function applyQcToAllItems(
  items: ActiveGrLineItem[],
  template: Pick<QcChecklist, 'packagingIntact' | 'expiredOrNear' | 'physicalGood'>
): ActiveGrLineItem[] {
  return items.map((item) => ({
    ...item,
    qc: {
      ...item.qc,
      packagingIntact: template.packagingIntact,
      expiredOrNear: template.expiredOrNear,
      physicalGood: template.physicalGood,
    },
  }));
}

export function computeSessionSummary(items: ActiveGrLineItem[]): SessionSummary {
  let totalUnits = 0;
  let qcPassCount = 0;
  let qcFailCount = 0;

  for (const item of items) {
    totalUnits += item.quantity;
    if (evaluateItemQcStatus(item.qc) === 'passed') {
      qcPassCount += 1;
    } else {
      qcFailCount += 1;
    }
  }

  return {
    totalSkus: items.length,
    totalUnits,
    qcPassCount,
    qcFailCount,
    allQcPassed: items.length > 0 && qcFailCount === 0,
  };
}

export function validateSessionSubmission(
  meta: SessionMeta,
  items: ActiveGrLineItem[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!meta.supplierName.trim()) {
    errors.push('Supplier name is required.');
  }
  if (!meta.poNumber.trim()) {
    errors.push('PO / Delivery Note number is required.');
  }
  if (!meta.operatorName.trim()) {
    errors.push('Operator name or ID is required.');
  }
  if (items.length === 0) {
    errors.push('Scan at least one item before submitting.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function generateSessionCode(now = new Date()): string {
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const sec = String(now.getSeconds()).padStart(2, '0');
  return `GR-${yyyy}${mm}${dd}-${hh}${min}${sec}`;
}

export interface ParsedCatalogResult {
  validItems: MasterCatalogItem[];
  skippedRows: number;
  skippedReasons: Array<{ row: number; itemCode?: string; barcode?: string; reason: string }>;
}

export function parseCatalogRows(
  rawRows: Record<string, unknown>[]
): ParsedCatalogResult {
  const seenBarcodes = new Set<string>();
  const validItems: MasterCatalogItem[] = [];
  let skippedRows = 0;
  const skippedReasons: Array<{ row: number; itemCode?: string; barcode?: string; reason: string }> = [];

  for (let i = 0; i < rawRows.length; i++) {
    const raw = rawRows[i];
    const normalizedMap = new Map<string, unknown>();
    for (const [k, v] of Object.entries(raw)) {
      normalizedMap.set(k.trim().toLowerCase().replace(/[\s_-]+/g, ''), v);
    }

    const barcode = normalizeBarcode(
      String(
        normalizedMap.get('barcode') ??
          normalizedMap.get('ean') ??
          normalizedMap.get('upc') ??
          ''
      )
    );
    const itemCode = String(
      normalizedMap.get('itemcode') ??
        normalizedMap.get('sku') ??
        normalizedMap.get('code') ??
        ''
    ).trim();
    const description = String(
      normalizedMap.get('description') ??
        normalizedMap.get('name') ??
        normalizedMap.get('itemname') ??
        ''
    ).trim();
    const category =
      String(
        normalizedMap.get('category') ??
          normalizedMap.get('dept') ??
          normalizedMap.get('department') ??
          'General Merchandise'
      ).trim() || 'General Merchandise';
    const uom =
      String(normalizedMap.get('uom') ?? normalizedMap.get('unit') ?? 'PCS')
        .trim()
        .toUpperCase() || 'PCS';
    const rawCost = Number(
      normalizedMap.get('unitcost') ?? normalizedMap.get('cost') ?? 0
    );

    const rowNumber = i + 1;

    if (!itemCode) {
      skippedRows += 1;
      skippedReasons.push({ row: rowNumber, reason: 'item_code kosong' });
      continue;
    }

    if (!description) {
      skippedRows += 1;
      skippedReasons.push({ row: rowNumber, itemCode, reason: 'description kosong' });
      continue;
    }

    // Generate fallback barcode jika kosong
    let finalBarcode = barcode;
    if (!finalBarcode) {
      finalBarcode = `GEN-${itemCode}`;
    }

    if (seenBarcodes.has(finalBarcode)) {
      skippedRows += 1;
      skippedReasons.push({ row: rowNumber, itemCode, barcode: finalBarcode, reason: 'barcode duplikat' });
      continue;
    }

    seenBarcodes.add(finalBarcode);
    validItems.push({
      itemCode,
      barcode: finalBarcode,
      description,
      category,
      uom,
      unitCost: Number.isFinite(rawCost) ? Math.max(0, Math.round(rawCost)) : 0,
    });
  }

  return { validItems, skippedRows, skippedReasons };
}
