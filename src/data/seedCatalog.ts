export interface SeedMasterItem {
  itemCode: string;
  barcode: string;
  description: string;
  category: string;
  uom: string;
  unitCost: number;
}

export const AMANMART_SEED_CATALOG: SeedMasterItem[] = [
  {
    itemCode: 'AM-DAI-001',
    barcode: '8991002101015',
    description: 'Ultra Milk Full Cream 1L',
    category: 'Dairy & Chilled',
    uom: 'CTN',
    unitCost: 19500,
  },
  {
    itemCode: 'AM-DAI-002',
    barcode: '8991002101022',
    description: 'Greenfields Fresh Pasteurized Milk 1L',
    category: 'Dairy & Chilled',
    uom: 'BTL',
    unitCost: 28500,
  },
  {
    itemCode: 'AM-DRY-001',
    barcode: '8992761139018',
    description: 'Indomie Goreng Original 85g (40-Pack Box)',
    category: 'Dry Pantry',
    uom: 'BOX',
    unitCost: 118000,
  },
  {
    itemCode: 'AM-DRY-002',
    barcode: '8998866200318',
    description: 'Bimoli Classic Cooking Oil Pouch 2L',
    category: 'Cooking Essentials',
    uom: 'PCH',
    unitCost: 37500,
  },
  {
    itemCode: 'AM-DRY-003',
    barcode: '8993175534819',
    description: 'Sania Premium Jasmine Rice 5kg',
    category: 'Grains & Rice',
    uom: 'BAG',
    unitCost: 74500,
  },
  {
    itemCode: 'AM-BEV-001',
    barcode: '8996001301012',
    description: 'Aqua Mineral Water 600ml (24-Bottle Case)',
    category: 'Beverages',
    uom: 'CASE',
    unitCost: 48000,
  },
  {
    itemCode: 'AM-BEV-002',
    barcode: '8992775210116',
    description: 'Kapal Api Special Mix Coffee 10x24g',
    category: 'Beverages',
    uom: 'PCK',
    unitCost: 16200,
  },
  {
    itemCode: 'AM-BAK-001',
    barcode: '8997014400125',
    description: 'Sari Roti White Sandwich Bread 400g',
    category: 'Bakery',
    uom: 'PCK',
    unitCost: 15500,
  },
  {
    itemCode: 'AM-SNK-001',
    barcode: '8992753101108',
    description: 'Chitato Potato Chips Beef BBQ 68g',
    category: 'Snacks & Confectionery',
    uom: 'PCK',
    unitCost: 11200,
  },
  {
    itemCode: 'AM-HPC-001',
    barcode: '8999999036140',
    description: 'Lifebuoy Total 10 Body Wash Refill 450ml',
    category: 'Personal Care',
    uom: 'PCH',
    unitCost: 24900,
  },
  {
    itemCode: 'AM-HOM-001',
    barcode: '8998866603126',
    description: 'Rinso Anti-Noda Molto Detergent 770g',
    category: 'Household Care',
    uom: 'BAG',
    unitCost: 22400,
  },
  {
    itemCode: 'AM-FRZ-001',
    barcode: '8992907910020',
    description: 'Fiesta Crispy Chicken Nuggets 500g',
    category: 'Frozen Foods',
    uom: 'PCK',
    unitCost: 46500,
  },
];
