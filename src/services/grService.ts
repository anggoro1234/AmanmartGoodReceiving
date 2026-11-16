import { AMANMART_SEED_CATALOG } from '../data/seedCatalog';
import {
  normalizeBarcode,
  type ActiveGrLineItem,
  type GrSessionRecord,
  type MasterCatalogItem,
  type SessionMeta,
} from '../utils/grLogic';

const LOCAL_CATALOG_KEY = 'amanmart_gr_local_catalog_v1';
const LOCAL_SESSIONS_KEY = 'amanmart_gr_local_sessions_v1';

function readLocalCatalog(): MasterCatalogItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_CATALOG_KEY);
    if (!raw) {
      return AMANMART_SEED_CATALOG.map((item) => ({ ...item }));
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0
      ? parsed
      : AMANMART_SEED_CATALOG.map((item) => ({ ...item }));
  } catch {
    return AMANMART_SEED_CATALOG.map((item) => ({ ...item }));
  }
}

function writeLocalCatalog(items: MasterCatalogItem[]) {
  try {
    localStorage.setItem(LOCAL_CATALOG_KEY, JSON.stringify(items));
  } catch {
    // Ignore storage quota errors
  }
}

function readLocalSessions(): GrSessionRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_SESSIONS_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalSessions(sessions: GrSessionRecord[]) {
  try {
    localStorage.setItem(LOCAL_SESSIONS_KEY, JSON.stringify(sessions));
  } catch {
    // Ignore storage quota errors
  }
}

export async function lookupBarcode(
  rawBarcode: string,
  token: string | null
): Promise<MasterCatalogItem | null> {
  const barcode = normalizeBarcode(rawBarcode);
  if (!barcode) {
    return null;
  }

  if (token) {
    const res = await fetch(
      `/api/master-items/lookup?barcode=${encodeURIComponent(barcode)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (res.status === 404) {
      return null;
    }
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error || 'Failed to look up barcode.');
    }
    const data = await res.json();
    return data.item ?? null;
  }

  const catalog = readLocalCatalog();
  return catalog.find((item) => normalizeBarcode(item.barcode) === barcode) ?? null;
}

export async function searchCatalog(
  query: string,
  token: string | null
): Promise<MasterCatalogItem[]> {
  if (token) {
    const res = await fetch(
      `/api/master-items/search?q=${encodeURIComponent(query)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    if (!res.ok) {
      throw new Error('Failed to search master catalog.');
    }
    const data = await res.json();
    return Array.isArray(data.items) ? data.items : [];
  }

  const catalog = readLocalCatalog();
  const q = query.trim().toLowerCase();
  if (!q) {
    return catalog;
  }
  return catalog.filter(
    (item) =>
      item.barcode.toLowerCase().includes(q) ||
      item.itemCode.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
  );
}

export async function importCatalogItems(
  items: MasterCatalogItem[],
  token: string | null
): Promise<{ upsertedCount: number }> {
  if (token) {
    const res = await fetch('/api/master-items/import', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ items }),
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error || 'Failed to import catalog items.');
    }
    return await res.json();
  }

  const current = readLocalCatalog();
  const map = new Map<string, MasterCatalogItem>();
  for (const item of current) {
    map.set(normalizeBarcode(item.barcode), item);
  }
  for (const item of items) {
    map.set(normalizeBarcode(item.barcode), item);
  }
  writeLocalCatalog(Array.from(map.values()));
  return { upsertedCount: items.length };
}

export async function submitGrSession(
  meta: SessionMeta,
  items: ActiveGrLineItem[],
  token: string | null
): Promise<GrSessionRecord> {
  const payload = {
    sessionCode: meta.sessionCode,
    operatorName: meta.operatorName,
    supplierName: meta.supplierName,
    poNumber: meta.poNumber,
    dockBay: meta.dockBay,
    notes: meta.notes,
    items: items.map((item) => ({
      masterItemId: item.masterItemId,
      itemCode: item.itemCode,
      barcode: item.barcode,
      description: item.description,
      category: item.category,
      uom: item.uom,
      quantity: item.quantity,
      qcPackagingIntact: item.qc.packagingIntact,
      qcExpiredOrNear: item.qc.expiredOrNear,
      qcPhysicalGood: item.qc.physicalGood,
      qcNotes: item.qc.notes,
    })),
  };

  if (token) {
    const res = await fetch('/api/gr-sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error || 'Failed to submit Goods Receiving session.');
    }
    const data = await res.json();
    return data.session;
  }

  let totalUnits = 0;
  let qcPassCount = 0;
  let qcFailCount = 0;
  for (const item of items) {
    totalUnits += item.quantity;
    if (item.qc.packagingIntact && !item.qc.expiredOrNear && item.qc.physicalGood) {
      qcPassCount += 1;
    } else {
      qcFailCount += 1;
    }
  }

  const record: GrSessionRecord = {
    id: crypto.randomUUID ? crypto.randomUUID() : `local-${Date.now()}`,
    sessionCode: meta.sessionCode,
    operatorName: meta.operatorName,
    supplierName: meta.supplierName,
    poNumber: meta.poNumber,
    dockBay: meta.dockBay,
    notes: meta.notes,
    totalSkus: items.length,
    totalUnits,
    qcPassCount,
    qcFailCount,
    status: 'submitted',
    submittedAt: new Date().toISOString(),
    items: payload.items,
  };

  const existing = readLocalSessions();
  writeLocalSessions([record, ...existing]);
  return record;
}

export async function fetchGrSessions(
  token: string | null
): Promise<GrSessionRecord[]> {
  if (token) {
    const res = await fetch('/api/gr-sessions', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) {
      throw new Error('Failed to load Goods Receiving history.');
    }
    const data = await res.json();
    return Array.isArray(data.sessions) ? data.sessions : [];
  }

  return readLocalSessions();
}
