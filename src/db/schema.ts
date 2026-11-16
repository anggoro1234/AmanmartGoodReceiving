import { relations } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const masterItems = pgTable(
  'master_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    itemCode: text('item_code').notNull().unique(),
    barcode: text('barcode').notNull().unique(),
    description: text('description').notNull(),
    category: text('category').notNull(),
    uom: text('uom').notNull().default('PCS'),
    unitCost: integer('unit_cost').notNull().default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_master_items_barcode').on(table.barcode),
    index('idx_master_items_item_code').on(table.itemCode),
  ]
);

export const grSessions = pgTable(
  'gr_sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sessionCode: text('session_code').notNull().unique(),
    operatorUid: text('operator_uid').notNull(),
    operatorName: text('operator_name').notNull(),
    supplierName: text('supplier_name').notNull(),
    poNumber: text('po_number').notNull(),
    dockBay: text('dock_bay').notNull().default('Dock A1'),
    notes: text('notes').notNull().default(''),
    totalSkus: integer('total_skus').notNull(),
    totalUnits: integer('total_units').notNull(),
    qcPassCount: integer('qc_pass_count').notNull(),
    qcFailCount: integer('qc_fail_count').notNull(),
    status: text('status').notNull().default('submitted'),
    submittedAt: timestamp('submitted_at').defaultNow().notNull(),
  },
  (table) => [index('idx_gr_sessions_submitted_at').on(table.submittedAt)]
);

export const grItems = pgTable(
  'gr_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sessionId: uuid('session_id')
      .references(() => grSessions.id, { onDelete: 'cascade' })
      .notNull(),
    masterItemId: uuid('master_item_id').references(() => masterItems.id),
    itemCode: text('item_code').notNull(),
    barcode: text('barcode').notNull(),
    description: text('description').notNull(),
    category: text('category').notNull(),
    uom: text('uom').notNull().default('PCS'),
    quantity: integer('quantity').notNull(),
    qcPackagingIntact: boolean('qc_packaging_intact').notNull(),
    qcExpiredOrNear: boolean('qc_expired_or_near').notNull(),
    qcPhysicalGood: boolean('qc_physical_good').notNull(),
    qcNotes: text('qc_notes').notNull().default(''),
    scannedAt: timestamp('scanned_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_gr_items_session_id').on(table.sessionId),
    index('idx_gr_items_barcode').on(table.barcode),
  ]
);

export const grSessionsRelations = relations(grSessions, ({ many }) => ({
  items: many(grItems),
}));

export const grItemsRelations = relations(grItems, ({ one }) => ({
  session: one(grSessions, {
    fields: [grItems.sessionId],
    references: [grSessions.id],
  }),
  masterItem: one(masterItems, {
    fields: [grItems.masterItemId],
    references: [masterItems.id],
  }),
}));
