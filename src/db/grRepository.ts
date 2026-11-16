import { desc, eq, ilike, inArray, or } from 'drizzle-orm';
import { db } from './index.ts';
import { grItems, grSessions, masterItems } from './schema.ts';
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

export async function ensureSeedMasterCatalog() {
  try {
    const existing = await db
      .select({ id: masterItems.id })
      .from(masterItems)
      .limit(1);

    if (existing.length > 0) {
      return;
    }

    await db
      .insert(masterItems)
      .values(
        AMANMART_SEED_CATALOG.map((item: SeedMasterItem) => ({
          itemCode: item.itemCode,
          barcode: item.barcode,
          description: item.description,
          category: item.category,
          uom: item.uom,
          unitCost: item.unitCost,
        }))
      )
      .onConflictDoNothing();
  } catch (error) {
    console.error('Failed to seed master catalog:', error);
    throw new Error('Database catalog initialization failed.', { cause: error });
  }
}

export async function findMasterItemByBarcode(barcode: string) {
  try {
    await ensureSeedMasterCatalog();
    const rows = await db
      .select()
      .from(masterItems)
      .where(eq(masterItems.barcode, barcode))
      .limit(1);

    return rows[0] ?? null;
  } catch (error) {
    console.error('Master item barcode lookup failed:', error);
    throw new Error('Failed to look up barcode in master catalog.', { cause: error });
  }
}

export async function searchMasterItems(query: string, limit = 30) {
  try {
    await ensureSeedMasterCatalog();
    const trimmed = query.trim();
    if (!trimmed) {
      return await db
        .select()
        .from(masterItems)
        .orderBy(masterItems.description)
        .limit(limit);
    }

    const pattern = `%${trimmed}%`;
    return await db
      .select()
      .from(masterItems)
      .where(
        or(
          ilike(masterItems.barcode, pattern),
          ilike(masterItems.itemCode, pattern),
          ilike(masterItems.description, pattern),
          ilike(masterItems.category, pattern)
        )
      )
      .orderBy(masterItems.description)
      .limit(limit);
  } catch (error) {
    console.error('Master item search failed:', error);
    throw new Error('Failed to search master catalog.', { cause: error });
  }
}

export async function upsertMasterItems(rows: MasterItemInput[]) {
  try {
    if (rows.length === 0) {
      return { upsertedCount: 0 };
    }

    let upsertedCount = 0;
    await db.transaction(async (tx) => {
      for (const row of rows) {
        await tx
          .insert(masterItems)
          .values({
            itemCode: row.itemCode,
            barcode: row.barcode,
            description: row.description,
            category: row.category,
            uom: row.uom || 'PCS',
            unitCost: Number.isFinite(row.unitCost) ? Math.max(0, Math.round(row.unitCost)) : 0,
          })
          .onConflictDoUpdate({
            target: masterItems.barcode,
            set: {
              itemCode: row.itemCode,
              description: row.description,
              category: row.category,
              uom: row.uom || 'PCS',
              unitCost: Number.isFinite(row.unitCost) ? Math.max(0, Math.round(row.unitCost)) : 0,
            },
          });
        upsertedCount += 1;
      }
    });

    return { upsertedCount };
  } catch (error) {
    console.error('Master item import failed:', error);
    throw new Error('Failed to import master catalog items.', { cause: error });
  }
}

export async function createGrSession(payload: CreateGrSessionInput) {
  try {
    return await db.transaction(async (tx) => {
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

      const [session] = await tx
        .insert(grSessions)
        .values({
          sessionCode: payload.sessionCode,
          operatorUid: payload.operatorUid,
          operatorName: payload.operatorName,
          supplierName: payload.supplierName,
          poNumber: payload.poNumber,
          dockBay: payload.dockBay,
          notes: payload.notes,
          totalSkus: payload.items.length,
          totalUnits,
          qcPassCount,
          qcFailCount,
          status: 'submitted',
        })
        .returning();

      const insertedItems = await tx
        .insert(grItems)
        .values(
          payload.items.map((item) => ({
            sessionId: session.id,
            masterItemId: item.masterItemId ?? null,
            itemCode: item.itemCode,
            barcode: item.barcode,
            description: item.description,
            category: item.category,
            uom: item.uom,
            quantity: item.quantity,
            qcPackagingIntact: item.qcPackagingIntact,
            qcExpiredOrNear: item.qcExpiredOrNear,
            qcPhysicalGood: item.qcPhysicalGood,
            qcNotes: item.qcNotes,
          }))
        )
        .returning();

      return {
        ...session,
        items: insertedItems,
      };
    });
  } catch (error) {
    console.error('Failed to persist GR session:', error);
    throw new Error('Failed to submit Goods Receiving session.', { cause: error });
  }
}

export async function listGrSessions(limit = 25) {
  try {
    const sessions = await db
      .select()
      .from(grSessions)
      .orderBy(desc(grSessions.submittedAt))
      .limit(limit);

    if (sessions.length === 0) {
      return [];
    }

    const sessionIds = sessions.map((s) => s.id);
    const allItems = await db
      .select()
      .from(grItems)
      .where(inArray(grItems.sessionId, sessionIds));

    const itemsBySession = new Map<string, typeof allItems>();
    for (const item of allItems) {
      const list = itemsBySession.get(item.sessionId) ?? [];
      list.push(item);
      itemsBySession.set(item.sessionId, list);
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
