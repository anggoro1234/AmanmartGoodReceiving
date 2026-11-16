-- Amanmart Goods Receiving (GR) System — Supabase / PostgreSQL Schema Migration
-- Compatible with Supabase PostgreSQL 15+ and standard pgcrypto/uuid-ossp extensions

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Master Item Catalog (populated via Excel/CSV imports)
CREATE TABLE IF NOT EXISTS public.master_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_code TEXT NOT NULL UNIQUE,
  barcode TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  uom TEXT NOT NULL DEFAULT 'PCS',
  unit_cost INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_master_items_barcode ON public.master_items (barcode);
CREATE INDEX IF NOT EXISTS idx_master_items_item_code ON public.master_items (item_code);

-- 2. Goods Receiving Sessions (header log per shipment arrival)
CREATE TABLE IF NOT EXISTS public.gr_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_code TEXT NOT NULL UNIQUE,
  operator_uid TEXT NOT NULL,
  operator_name TEXT NOT NULL,
  supplier_name TEXT NOT NULL,
  po_number TEXT NOT NULL,
  dock_bay TEXT NOT NULL DEFAULT 'Dock A1',
  notes TEXT NOT NULL DEFAULT '',
  total_skus INTEGER NOT NULL CHECK (total_skus >= 0),
  total_units INTEGER NOT NULL CHECK (total_units >= 0),
  qc_pass_count INTEGER NOT NULL DEFAULT 0,
  qc_fail_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'submitted',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gr_sessions_submitted_at ON public.gr_sessions (submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_gr_sessions_po_number ON public.gr_sessions (po_number);

-- 3. Goods Receiving Line Items (aggregated scanned SKUs + Yes/No QC checklist)
CREATE TABLE IF NOT EXISTS public.gr_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.gr_sessions(id) ON DELETE CASCADE,
  master_item_id UUID REFERENCES public.master_items(id) ON DELETE SET NULL,
  item_code TEXT NOT NULL,
  barcode TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  uom TEXT NOT NULL DEFAULT 'PCS',
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  qc_packaging_intact BOOLEAN NOT NULL,
  qc_expired_or_near BOOLEAN NOT NULL,
  qc_physical_good BOOLEAN NOT NULL,
  qc_notes TEXT NOT NULL DEFAULT '',
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gr_items_session_id ON public.gr_items (session_id);
CREATE INDEX IF NOT EXISTS idx_gr_items_barcode ON public.gr_items (barcode);
