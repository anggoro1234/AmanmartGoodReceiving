import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyQcToAllItems,
  computeSessionSummary,
  evaluateItemQcStatus,
  normalizeBarcode,
  parseCatalogRows,
  updateItemQcField,
  updateItemQuantity,
  upsertScannedItem,
  validateSessionSubmission,
  type ActiveGrLineItem,
  type MasterCatalogItem,
} from './grLogic';

const sampleMilk: MasterCatalogItem = {
  id: 'uuid-milk',
  itemCode: 'AM-DAI-001',
  barcode: '8991002101015',
  description: 'Ultra Milk Full Cream 1L',
  category: 'Dairy & Chilled',
  uom: 'CTN',
  unitCost: 19500,
};

const sampleRice: MasterCatalogItem = {
  id: 'uuid-rice',
  itemCode: 'AM-DRY-003',
  barcode: '8993175534819',
  description: 'Sania Premium Jasmine Rice 5kg',
  category: 'Grains & Rice',
  uom: 'BAG',
  unitCost: 74500,
};

test('normalizeBarcode strips scanner control characters and whitespace', () => {
  assert.equal(normalizeBarcode('  8991002101015\r\n '), '8991002101015');
  assert.equal(normalizeBarcode('\t8993175534819\u0000'), '8993175534819');
});

test('upsertScannedItem adds new item and auto-aggregates duplicate scans', () => {
  const first = upsertScannedItem([], sampleMilk, 1, '2026-11-15T10:00:00.000Z');
  assert.equal(first.action, 'added');
  assert.equal(first.nextItems.length, 1);
  assert.equal(first.nextItems[0].quantity, 1);

  const second = upsertScannedItem(
    first.nextItems,
    sampleMilk,
    1,
    '2026-11-15T10:00:02.000Z'
  );
  assert.equal(second.action, 'incremented');
  assert.equal(second.nextItems.length, 1);
  assert.equal(second.nextItems[0].quantity, 2);

  const third = upsertScannedItem(
    second.nextItems,
    sampleRice,
    6,
    '2026-11-15T10:00:05.000Z'
  );
  assert.equal(third.action, 'added');
  assert.equal(third.nextItems.length, 2);
  assert.equal(third.nextItems[0].barcode, '8993175534819');
  assert.equal(third.nextItems[0].quantity, 6);
});

test('updateItemQuantity adjusts quantity and removes row at 0 or below', () => {
  const { nextItems } = upsertScannedItem([], sampleMilk, 3);
  const adjusted = updateItemQuantity(nextItems, '8991002101015', 5);
  assert.equal(adjusted[0].quantity, 5);

  const removed = updateItemQuantity(adjusted, '8991002101015', 0);
  assert.equal(removed.length, 0);
});

test('QC binary checklist flags defective or near-expired items accurately', () => {
  let items: ActiveGrLineItem[] = upsertScannedItem([], sampleMilk, 2).nextItems;
  items = upsertScannedItem(items, sampleRice, 1).nextItems;

  assert.equal(evaluateItemQcStatus(items[0].qc), 'passed');

  items = updateItemQcField(items, '8991002101015', 'expiredOrNear', true);
  const summary = computeSessionSummary(items);
  assert.equal(summary.totalSkus, 2);
  assert.equal(summary.totalUnits, 3);
  assert.equal(summary.qcPassCount, 1);
  assert.equal(summary.qcFailCount, 1);
  assert.equal(summary.allQcPassed, false);

  items = applyQcToAllItems(items, {
    packagingIntact: true,
    expiredOrNear: false,
    physicalGood: true,
  });
  const resetSummary = computeSessionSummary(items);
  assert.equal(resetSummary.qcPassCount, 2);
  assert.equal(resetSummary.qcFailCount, 0);
  assert.equal(resetSummary.allQcPassed, true);
});

test('validateSessionSubmission enforces required metadata and non-empty items', () => {
  const { nextItems } = upsertScannedItem([], sampleMilk, 1);

  const invalidEmpty = validateSessionSubmission(
    {
      sessionCode: 'GR-1',
      operatorName: 'Budi Santoso',
      supplierName: '',
      poNumber: '',
      dockBay: 'Dock A1',
      notes: '',
    },
    []
  );
  assert.equal(invalidEmpty.valid, false);
  assert.equal(invalidEmpty.errors.length, 3);

  const valid = validateSessionSubmission(
    {
      sessionCode: 'GR-1',
      operatorName: 'Budi Santoso',
      supplierName: 'PT Ultrajaya Milk',
      poNumber: 'PO-2026-8841',
      dockBay: 'Dock A1',
      notes: '',
    },
    nextItems
  );
  assert.equal(valid.valid, true);
  assert.equal(valid.errors.length, 0);
});

test('parseCatalogRows normalizes headers and skips incomplete or duplicate barcodes', () => {
  const parsed = parseCatalogRows([
    {
      item_code: 'AM-001',
      Barcode: '8991002101015',
      Description: 'Ultra Milk 1L',
      Category: 'Dairy',
      UOM: 'ctn',
      unit_cost: '19500',
    },
    {
      item_code: 'AM-DUP',
      Barcode: '8991002101015',
      Description: 'Duplicate Barcode',
    },
    {
      item_code: 'AM-MISSING',
      Barcode: '',
      Description: 'Missing Barcode',
    },
  ]);

  assert.equal(parsed.validItems.length, 1);
  assert.equal(parsed.skippedRows, 2);
  assert.equal(parsed.validItems[0].uom, 'CTN');
  assert.equal(parsed.validItems[0].unitCost, 19500);
});
