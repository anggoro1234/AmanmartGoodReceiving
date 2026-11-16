import { AlertCircle, CheckCircle2, ClipboardCheck } from 'lucide-react';
import {
  evaluateItemQcStatus,
  type ActiveGrLineItem,
  type QcChecklist,
  type SessionMeta,
  type SessionSummary,
} from '../utils/grLogic';

interface QcAndSubmitPanelProps {
  meta: SessionMeta;
  onUpdateMeta: (patch: Partial<SessionMeta>) => void;
  selectedItem: ActiveGrLineItem | null;
  summary: SessionSummary;
  onUpdateQc: (
    barcode: string,
    field: keyof QcChecklist,
    value: boolean | string
  ) => void;
  onApplyQcToAll: (
    template: Pick<QcChecklist, 'packagingIntact' | 'expiredOrNear' | 'physicalGood'>
  ) => void;
  onSubmitSession: () => Promise<void>;
  isSubmitting: boolean;
  validationErrors: string[];
  submissionSuccessCode: string | null;
}

const DOCK_BAYS = ['Dock A1', 'Dock A2', 'Cold Chain B1', 'Cross-Dock C1'];

export function QcAndSubmitPanel({
  meta,
  onUpdateMeta,
  selectedItem,
  summary,
  onUpdateQc,
  onApplyQcToAll,
  onSubmitSession,
  isSubmitting,
  validationErrors,
  submissionSuccessCode,
}: QcAndSubmitPanelProps) {
  const selectedStatus = selectedItem
    ? evaluateItemQcStatus(selectedItem.qc)
    : null;

  return (
    <aside className="space-y-4">
      <section
        aria-label="Quality control inspection"
        className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5"
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Quality Control Checklist
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {selectedItem
                ? `${selectedItem.description} · ${selectedItem.barcode}`
                : 'Scan or select a line item to inspect'}
            </p>
          </div>
          {selectedItem && (
            <button
              type="button"
              onClick={() =>
                onApplyQcToAll({
                  packagingIntact: selectedItem.qc.packagingIntact,
                  expiredOrNear: selectedItem.qc.expiredOrNear,
                  physicalGood: selectedItem.qc.physicalGood,
                })
              }
              className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              Apply to All
            </button>
          )}
        </div>

        {!selectedItem ? (
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center gap-2.5">
            <ClipboardCheck className="w-4 h-4 text-slate-500 shrink-0" aria-hidden="true" />
            <span>
              Yes/No QC controls activate automatically as soon as an item is scanned.
            </span>
          </div>
        ) : (
          <div className="space-y-3.5" data-testid="qc-checklist-panel">
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-200">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Packaging Intact?
                </p>
                <p className="text-xs text-slate-500">No crushed cartons or broken seals</p>
              </div>
              <div
                role="group"
                aria-label="Packaging Intact?"
                className="inline-flex rounded-lg border border-slate-200 p-1 bg-slate-100 shrink-0"
              >
                <button
                  type="button"
                  aria-pressed={selectedItem.qc.packagingIntact === true}
                  onClick={() =>
                    onUpdateQc(selectedItem.barcode, 'packagingIntact', true)
                  }
                  className={`min-w-[54px] min-h-[40px] px-3 text-xs font-bold rounded-md transition-colors ${
                    selectedItem.qc.packagingIntact === true
                      ? 'bg-emerald-700 text-white'
                      : 'text-slate-700 hover:text-slate-900'
                  }`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  aria-pressed={selectedItem.qc.packagingIntact === false}
                  onClick={() =>
                    onUpdateQc(selectedItem.barcode, 'packagingIntact', false)
                  }
                  className={`min-w-[54px] min-h-[40px] px-3 text-xs font-bold rounded-md transition-colors ${
                    selectedItem.qc.packagingIntact === false
                      ? 'bg-red-700 text-white'
                      : 'text-slate-700 hover:text-slate-900'
                  }`}
                >
                  No
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-200">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Expired / Near Expired?
                </p>
                <p className="text-xs text-slate-500">Select No if shelf-life is acceptable</p>
              </div>
              <div
                role="group"
                aria-label="Expired or Near Expired?"
                className="inline-flex rounded-lg border border-slate-200 p-1 bg-slate-100 shrink-0"
              >
                <button
                  type="button"
                  aria-pressed={selectedItem.qc.expiredOrNear === false}
                  onClick={() =>
                    onUpdateQc(selectedItem.barcode, 'expiredOrNear', false)
                  }
                  className={`min-w-[54px] min-h-[40px] px-3 text-xs font-bold rounded-md transition-colors ${
                    selectedItem.qc.expiredOrNear === false
                      ? 'bg-emerald-700 text-white'
                      : 'text-slate-700 hover:text-slate-900'
                  }`}
                >
                  No
                </button>
                <button
                  type="button"
                  aria-pressed={selectedItem.qc.expiredOrNear === true}
                  onClick={() =>
                    onUpdateQc(selectedItem.barcode, 'expiredOrNear', true)
                  }
                  className={`min-w-[54px] min-h-[40px] px-3 text-xs font-bold rounded-md transition-colors ${
                    selectedItem.qc.expiredOrNear === true
                      ? 'bg-red-700 text-white'
                      : 'text-slate-700 hover:text-slate-900'
                  }`}
                >
                  Yes
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-200">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Physical Condition Good?
                </p>
                <p className="text-xs text-slate-500">No leaks, dents, or cold-chain thaw</p>
              </div>
              <div
                role="group"
                aria-label="Physical Condition Good?"
                className="inline-flex rounded-lg border border-slate-200 p-1 bg-slate-100 shrink-0"
              >
                <button
                  type="button"
                  aria-pressed={selectedItem.qc.physicalGood === true}
                  onClick={() =>
                    onUpdateQc(selectedItem.barcode, 'physicalGood', true)
                  }
                  className={`min-w-[54px] min-h-[40px] px-3 text-xs font-bold rounded-md transition-colors ${
                    selectedItem.qc.physicalGood === true
                      ? 'bg-emerald-700 text-white'
                      : 'text-slate-700 hover:text-slate-900'
                  }`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  aria-pressed={selectedItem.qc.physicalGood === false}
                  onClick={() =>
                    onUpdateQc(selectedItem.barcode, 'physicalGood', false)
                  }
                  className={`min-w-[54px] min-h-[40px] px-3 text-xs font-bold rounded-md transition-colors ${
                    selectedItem.qc.physicalGood === false
                      ? 'bg-red-700 text-white'
                      : 'text-slate-700 hover:text-slate-900'
                  }`}
                >
                  No
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="item-qc-notes"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Item QC Notes {selectedStatus === 'flagged' ? '(Recommended)' : '(Optional)'}
              </label>
              <input
                id="item-qc-notes"
                type="text"
                value={selectedItem.qc.notes}
                onChange={(e) =>
                  onUpdateQc(selectedItem.barcode, 'notes', e.target.value)
                }
                placeholder="e.g. 2 cartons dented on pallet corner"
                className="w-full min-h-[40px] px-3 py-2 text-sm text-slate-900 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>
        )}
      </section>

      <section
        aria-label="Shipment details and submission"
        className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4"
      >
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Shipment & Finalization
          </h2>
          <p className="text-xs font-mono text-slate-500 mt-0.5">
            {meta.sessionCode}
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <label
              htmlFor="supplier-name-input"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Supplier Name *
            </label>
            <input
              id="supplier-name-input"
              type="text"
              value={meta.supplierName}
              onChange={(e) => onUpdateMeta({ supplierName: e.target.value })}
              placeholder="e.g. PT Indofood CBP"
              className="w-full min-h-[42px] px-3 py-2 text-sm text-slate-900 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="po-number-input"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                PO / DO Number *
              </label>
              <input
                id="po-number-input"
                type="text"
                value={meta.poNumber}
                onChange={(e) => onUpdateMeta({ poNumber: e.target.value })}
                placeholder="e.g. PO-2026-4410"
                className="w-full min-h-[42px] px-3 py-2 font-mono text-sm text-slate-900 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label
                htmlFor="dock-bay-select"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Receiving Bay
              </label>
              <select
                id="dock-bay-select"
                value={meta.dockBay}
                onChange={(e) => onUpdateMeta({ dockBay: e.target.value })}
                className="w-full min-h-[42px] px-3 py-2 text-sm text-slate-900 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
              >
                {DOCK_BAYS.map((bay) => (
                  <option key={bay} value={bay}>
                    {bay}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="operator-name-input"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Operator Name / ID *
            </label>
            <input
              id="operator-name-input"
              type="text"
              value={meta.operatorName}
              onChange={(e) => onUpdateMeta({ operatorName: e.target.value })}
              placeholder="e.g. Budi Santoso (OP-104)"
              className="w-full min-h-[42px] px-3 py-2 text-sm text-slate-900 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>
        </div>

        <div className="pt-3 border-t border-slate-200 grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-slate-500">Distinct SKUs</p>
            <p className="text-lg font-mono font-bold tabular-nums text-slate-900">
              {summary.totalSkus}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Total Units</p>
            <p className="text-lg font-mono font-bold tabular-nums text-slate-900">
              {summary.totalUnits}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">QC Passed</p>
            <p className="text-sm font-mono font-bold tabular-nums text-emerald-700">
              {summary.qcPassCount} SKUs
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">QC Flagged</p>
            <p
              className={`text-sm font-mono font-bold tabular-nums ${
                summary.qcFailCount > 0 ? 'text-amber-700' : 'text-slate-600'
              }`}
            >
              {summary.qcFailCount} SKUs
            </p>
          </div>
        </div>

        {validationErrors.length > 0 && (
          <div
            role="alert"
            className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-900 space-y-1"
          >
            {validationErrors.map((err) => (
              <p key={err} className="flex items-center gap-1.5 font-medium">
                <AlertCircle className="w-3.5 h-3.5 text-red-700 shrink-0" aria-hidden="true" />
                <span>{err}</span>
              </p>
            ))}
          </div>
        )}

        {submissionSuccessCode && (
          <div
            role="status"
            data-testid="submission-success-banner"
            className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 flex items-center gap-2 font-semibold"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
            <span>
              Session {submissionSuccessCode} finalized and logged. Ready for next shipment.
            </span>
          </div>
        )}

        <button
          type="button"
          onClick={onSubmitSession}
          disabled={isSubmitting}
          className="w-full min-h-[48px] px-5 py-3 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
        >
          {isSubmitting ? 'Submitting Receiving Log...' : 'Submit Goods Receiving'}
        </button>
      </section>
    </aside>
  );
}
