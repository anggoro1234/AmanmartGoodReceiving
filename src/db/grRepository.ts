import { supabase } from './index.ts';
import { AMANMART_SEED_CATALOG, type SeedMasterItem } from '../data/seedCatalog.ts';

export interface MasterItemInput {
  itemCode: string;
  barcode: string;
  description: string;
  category: string;
  uom: string;
  unitCost: number;
}

export interface CreateGrSessionInput {
  sessionCode: string;
  operatorUid: string;
  operatorName: string;
  supplierName: string;
  poNumber: string;
  dockBay: string;
  notes: string;
  items: {
    masterItemId?: string | null;
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

function supabaseError(error: unknown, message: string): asserts error is null {
  if (error) {
    console.error(message, error);
    throw new Error(message, { cause: error });
  }
}

export async function ensureSeedMasterCatalog() {
  try {
    const { data: existing, error } = await supabase
      .from('master_items')
      .select('id')
      .limit(1);

    supabaseError(error, 'Failed to check master catalog seed status.');

    if (existing?.length > 0) {
      return;
    }

    const { error: insertError } = await supabase
      .from('master_items')
      .insert(
        AMANMART_SEED_CATALOG.map((item: SeedMasterItem) => ({
          item_code: item.itemCode,
          barcode: item.barcode,
          description: item.description,
          category: item.category,
          uom: item.uom,
          unit_cost: item.unitCost,
        }))
      );

    supabaseError(insertError, 'Failed to seed master catalog.');
  } catch (error) {
    console.error('Failed to seed master catalog:', error);
    throw new Error('Database catalog initialization failed.', { cause: error });
  }
}

export async function findMasterItemByBarcode(barcode: string) {
  try {
    await ensureSeedMasterCatalog();

    const { data, error } = await supabase
      .from('master_items')
      .select('*')
      .eq('barcode', barcode)
      .limit(1)
      .maybeSingle();

    if (error && (error as { code?: string }).code !== 'PGRST116') {
      supabaseError(error, 'Failed to look up barcode in master catalog.');
    }

    return data ?? null;
  } catch (error) {
    console.error('Master item barcode lookup failed:', error);
    throw new Error('Failed to look up barcode in master catalog.', { cause: error });
  }
}

export async function searchMasterItems(query: string, limit = 30) {
  try {
    await ensureSeedMasterCatalog();
    const trimmed = query.trim();

    let queryBuilder = supabase
      .from('master_items')
      .select('*')
      .order('description', { ascending: true })
      .limit(limit);

    if (trimmed) {
      const pattern = `%${trimmed}%`;
      queryBuilder = supabase
        .from('master_items')
        .select('*')
        .or(
          `barcode.ilike.${pattern},item_code.ilike.${pattern},description.ilike.${pattern},category.ilike.${pattern}`
        )
        .order('description', { ascending: true })
        .limit(limit);
    }

    const { data, error } = await queryBuilder;
    supabaseError(error, 'Failed to search master catalog.');
    return data ?? [];
  } catch (error) {
    console.error('Master item search failed:', error);
    throw new Error('Failed to search master catalog.', { cause: error });
  }
}

export interface UpsertMasterItemsResult {
  upsertedCount: number;
  skippedCount: number;
  failedCount: number;
  errors: Array<{ row: number; itemCode?: string; barcode?: string; reason: string }>;
}

export async function upsertMasterItems(rows: MasterItemInput[]): Promise<UpsertMasterItemsResult> {
  const result: UpsertMasterItemsResult = {
    upsertedCount: 0,
    skippedCount: 0,
    failedCount: 0,
    errors: [],
  };

  if (rows.length === 0) {
    return result;
  }

  // 1. Filter baris dengan item_code dan barcode kosong, generate fallback jika perlu
  const cleanedRows: Array<{ index: number; payload: MasterItemInput }> = [];
  const seenBarcodes = new Set<string>();
  const seenItemCodes = new Set<string>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const itemCode = String(row.itemCode ?? '').trim();
    let barcode = String(row.barcode ?? '').trim();

    if (!itemCode) {
      result.skippedCount += 1;
      result.errors.push({
        row: i + 1,
        barcode,
        reason: 'item_code kosong, baris di-skip',
      });
      continue;
    }

    // Generate fallback barcode jika kosong
    if (!barcode) {
      barcode = `GEN-${itemCode}`;
    }

    // Hindari duplikat dalam batch CSV yang sama
    if (seenBarcodes.has(barcode)) {
      result.skippedCount += 1;
      result.errors.push({
        row: i + 1,
        itemCode,
        barcode,
        reason: `barcode duplikat dalam file (${barcode}), baris di-skip`,
      });
      continue;
    }
    if (seenItemCodes.has(itemCode)) {
      result.skippedCount += 1;
      result.errors.push({
        row: i + 1,
        itemCode,
        barcode,
        reason: `item_code duplikat dalam file (${itemCode}), baris di-skip`,
      });
      continue;
    }

    seenBarcodes.add(barcode);
    seenItemCodes.add(itemCode);

    cleanedRows.push({
      index: i + 1,
      payload: {
        ...row,
        itemCode,
        barcode,
        uom: row.uom || 'PCS',
        unitCost: Number.isFinite(row.unitCost) ? Math.max(0, Math.round(row.unitCost)) : 0,
      },
    });
  }

  // 2. Upsert dalam batch (Supabase support array upsert)
  const BATCH_SIZE = 500;
  for (let offset = 0; offset < cleanedRows.length; offset += BATCH_SIZE) {
    const batch = cleanedRows.slice(offset, offset + BATCH_SIZE);

    const { error } = await supabase
      .from('master_items')
      .upsert(
        batch.map((r) => ({
          item_code: r.payload.itemCode,
          barcode: r.payload.barcode,
          description: r.payload.description,
          category: r.payload.category,
          uom: r.payload.uom,
          unit_cost: r.payload.unitCost,
        })),
        { onConflict: 'barcode' }
      );

    if (error) {
      // Jika batch gagal secara total, coba satu per satu untuk isolate baris error
      for (const row of batch) {
        try {
          const { error: singleError } = await supabase
            .from('master_items')
            .upsert({
              item_code: row.payload.itemCode,
              barcode: row.payload.barcode,
              description: row.payload.description,
              category: row.payload.category,
              uom: row.payload.uom,
              unit_cost: row.payload.unitCost,
            }, { onConflict: 'barcode' });

          if (singleError) {
            result.failedCount += 1;
            result.errors.push({
              row: row.index,
              itemCode: row.payload.itemCode,
              barcode: row.payload.barcode,
              reason: String(singleError.message),
            });
          } else {
            result.upsertedCount += 1;
          }
        } catch (err: unknown) {
          result.failedCount += 1;
          result.errors.push({
            row: row.index,
            itemCode: row.payload.itemCode,
            barcode: row.payload.barcode,
            reason: err instanceof Error ? err.message : String(err),
          });
        }
      }
    } else {
      result.upsertedCount += batch.length;
    }
  }

  return result;
}

export async function createGrSession(payload: CreateGrSessionInput) {
  try {
    let totalUnits = 0;
    let qcPassCount = 0;
    let qcFailCount = 0;

    for (const item of payload.items) {
      totalUnits += item.quantity;
      const passed =
        item.qcPackagingIntact && !item.qcExpiredOrNear && item.qcPhysicalGood;
      if (passed) {
        qcPassCount += 1;
      } else {
        qcFailCount += 1;
      }
    }

    const { data: session, error: sessionError } = await supabase
      .from('gr_sessions')
      .insert({
        session_code: payload.sessionCode,
        operator_uid: payload.operatorUid,
        operator_name: payload.operatorName,
        supplier_name: payload.supplierName,
        po_number: payload.poNumber,
        dock_bay: payload.dockBay,
        notes: payload.notes,
        total_skus: payload.items.length,
        total_units: totalUnits,
        qc_pass_count: qcPassCount,
        qc_fail_count: qcFailCount,
        status: 'submitted',
      })
      .select()
      .single();

    supabaseError(sessionError, 'Failed to create GR session.');

    const { data: insertedItems, error: itemsError } = await supabase
      .from('gr_items')
      .insert(
        payload.items.map((item) => ({
          session_id: session.id,
          master_item_id: item.masterItemId ?? null,
          item_code: item.itemCode,
          barcode: item.barcode,
          description: item.description,
          category: item.category,
          uom: item.uom,
          quantity: item.quantity,
          qc_packaging_intact: item.qcPackagingIntact,
          qc_expired_or_near: item.qcExpiredOrNear,
          qc_physical_good: item.qcPhysicalGood,
          qc_notes: item.qcNotes,
        }))
      )
      .select();

    supabaseError(itemsError, 'Failed to insert GR items.');

    return {
      ...session,
      items: insertedItems ?? [],
    };
  } catch (error) {
    console.error('Failed to persist GR session:', error);
    throw new Error('Failed to submit Goods Receiving session.', { cause: error });
  }
}

export async function listGrSessions(limit = 25) {
  try {
    const { data: sessions, error: sessionsError } = await supabase
      .from('gr_sessions')
      .select('*')
      .order('submitted_at', { ascending: false })
      .limit(limit);

    supabaseError(sessionsError, 'Failed to load Goods Receiving history.');

    if (!sessions || sessions.length === 0) {
      return [];
    }

    const sessionIds = sessions.map((s) => s.id);

    const { data: allItems, error: itemsError } = await supabase
      .from('gr_items')
      .select('*')
      .in('session_id', sessionIds);

    supabaseError(itemsError, 'Failed to load GR items.');

    const itemsBySession = new Map<string, typeof allItems>();
    for (const item of allItems ?? []) {
      const list = itemsBySession.get(item.session_id) ?? [];
      list.push(item);
      itemsBySession.set(item.session_id, list);
    }

    return sessions.map((session) => ({
      ...session,
      items: itemsBySession.get(session.id) ?? [],
    }));
  } catch (error) {
    console.error('Failed to list GR sessions:', error);
    throw new Error('Failed to load Goods Receiving history.', { cause: error });
  }
}
