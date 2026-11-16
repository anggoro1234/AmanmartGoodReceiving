import {
  AlertTriangle,
  CheckCircle2,
  Minus,
  PackageOpen,
  Plus,
  Trash2,
} from 'lucide-react';
import { AMANMART_SEED_CATALOG } from '../data/seedCatalog';
import {
  evaluateItemQcStatus,
  type ActiveGrLineItem,
} from '../utils/grLogic';

interface ReceivingTableProps {
  items: ActiveGrLineItem[];
  selectedBarcode: string | null;
  onSelectBarcode: (barcode: string) => void;
  onAdjustQuantity: (barcode: string, nextQty: number) => void;
  onRemoveItem: (barcode: string) => void;
  onQuickScanSample: (barcode: string) => void;
  onClearAll: () => void;
}

export function ReceivingTable({
  items,
  selectedBarcode,
  onSelectBarcode,
  onAdjustQuantity,
  onRemoveItem,
  onQuickScanSample,
  onClearAll,
}: ReceivingTableProps) {
  const sampleItems = AMANMART_SEED_CATALOG.slice(0, 3);

  return (
    <section
      aria-label="Active receiving manifest"
      className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col"
    >
      <div className="px-4 sm:px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Active Receiving Manifest
          </h2>
          <p className="text-xs text-slate-500">
            Duplicate scans auto-increment quantity · Select any row to inspect QC
          </p>
        </div>

        {items.length > 0 && (
          <button
            type="button"
            onClick={onClearAll}
            className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-red-700 hover:bg-red-50 rounded-lg border border-slate-200 transition-colors whitespace-nowrap shrink-0"
          >
            Clear List
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="p-8 sm:p-10 text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center mb-4">
            <PackageOpen className="w-6 h-6 text-slate-500" aria-hidden="true" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">
            No items scanned in this session yet
          </h3>
          <p className="text-sm text-slate-600 max-w-md mb-6">
            Scan a supplier carton or retail barcode above to begin aggregating units and logging quality control checks.
          </p>

          <div className="w-full max-w-xl border-t border-slate-200 pt-5">
            <p className="text-xs font-semibold text-slate-500 mb-3">
              Quick floor test scans from Amanmart catalog
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-left">
              {sampleItems.map((sample) => (
                <button
                  key={sample.barcode}
                  type="button"
                  onClick={() => onQuickScanSample(sample.barcode)}
                  className="p-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                >
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {sample.description}
                  </p>
                  <p className="text-xs font-mono text-slate-500 mt-1">
                    {sample.barcode}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div>
          {/* Mobile Touch-Friendly Stack (< md) */}
          <div className="md:hidden divide-y divide-slate-200">
            {items.map((item) => {
              const isSelected = selectedBarcode === item.barcode;
              const qcStatus = evaluateItemQcStatus(item.qc);
              return (
                <div
                  key={`mobile-${item.barcode}`}
                  onClick={() => onSelectBarcode(item.barcode)}
                  className={`p-4 space-y-3 transition-colors ${
                    isSelected ? 'bg-emerald-50/60' : 'bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900">
                        {item.description}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-slate-700">{item.barcode}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono">{item.itemCode}</span>
                      </p>
                    </div>

                    <button
                      type="button"
                      aria-label={`Remove ${item.description} (mobile)`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveItem(item.barcode);
                      }}
                      className="w-10 h-10 inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-red-700 shrink-0"
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>

                  <div
                    className="flex items-center justify-between gap-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        aria-label={`Decrease quantity for ${item.description} (mobile)`}
                        onClick={() =>
                          onAdjustQuantity(item.barcode, item.quantity - 1)
                        }
                        className="w-11 h-11 inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-800"
                      >
                        <Minus className="w-4 h-4" aria-hidden="true" />
                      </button>

                      <input
                        type="number"
                        min={1}
                        aria-label={`Quantity for ${item.description} (mobile)`}
                        value={item.quantity}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (Number.isFinite(val) && val >= 1) {
                            onAdjustQuantity(item.barcode, val);
                          }
                        }}
                        className="w-14 h-11 text-center font-mono text-base font-bold tabular-nums text-slate-900 bg-slate-50 border border-slate-300 rounded-lg"
                      />

                      <button
                        type="button"
                        aria-label={`Increase quantity for ${item.description} (mobile)`}
                        onClick={() =>
                          onAdjustQuantity(item.barcode, item.quantity + 1)
                        }
                        className="w-11 h-11 inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-800"
                      >
                        <Plus className="w-4 h-4" aria-hidden="true" />
                      </button>

                      <span className="text-xs font-mono text-slate-500 ml-1">
                        {item.uom}
                      </span>
                    </div>

                    {qcStatus === 'passed' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 shrink-0">
                        <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                        <span>QC Pass</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 shrink-0">
                        <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
                        <span>QC Flagged</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Data Table (>= md) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse" data-testid="receiving-manifest-table">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th scope="col" className="py-3 px-4">Item & Barcode</th>
                  <th scope="col" className="py-3 px-3 text-center">Received QTY</th>
                  <th scope="col" className="py-3 px-3">QC Status</th>
                  <th scope="col" className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {items.map((item) => {
                  const isSelected = selectedBarcode === item.barcode;
                  const qcStatus = evaluateItemQcStatus(item.qc);
                  return (
                    <tr
                      key={item.barcode}
                      data-testid={`manifest-row-${item.barcode}`}
                      onClick={() => onSelectBarcode(item.barcode)}
                      className={`transition-colors cursor-pointer ${
                        isSelected ? 'bg-emerald-50/60' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-3.5 px-4 align-middle">
                        <div className="min-w-[200px]">
                          <p className="text-sm font-bold text-slate-900">
                            {item.description}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-1.5">
                            <span className="font-mono text-slate-700">{item.barcode}</span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono">{item.itemCode}</span>
                            <span aria-hidden="true">·</span>
                            <span>{item.category}</span>
                          </p>
                        </div>
                      </td>

                      <td
                        className="py-3.5 px-3 align-middle"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center justify-center gap-1.5 w-full">
                          <button
                            type="button"
                            aria-label={`Decrease quantity for ${item.description}`}
                            onClick={() =>
                              onAdjustQuantity(item.barcode, item.quantity - 1)
                            }
                            className="w-10 h-10 inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-800 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                          >
                            <Minus className="w-4 h-4" aria-hidden="true" />
                          </button>

                          <input
                            type="number"
                            min={1}
                            aria-label={`Quantity for ${item.description}`}
                            value={item.quantity}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              if (Number.isFinite(val) && val >= 1) {
                                onAdjustQuantity(item.barcode, val);
                              }
                            }}
                            className="w-16 h-10 text-center font-mono text-base font-bold tabular-nums text-slate-900 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                          />

                          <button
                            type="button"
                            aria-label={`Increase quantity for ${item.description}`}
                            onClick={() =>
                              onAdjustQuantity(item.barcode, item.quantity + 1)
                            }
                            className="w-10 h-10 inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-800 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                          >
                            <Plus className="w-4 h-4" aria-hidden="true" />
                          </button>

                          <span className="text-xs font-mono text-slate-500 ml-1 w-9">
                            {item.uom}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-3 align-middle whitespace-nowrap">
                        {qcStatus === 'passed' ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                            <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                            <span>QC Pass</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                            <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
                            <span>QC Flagged</span>
                          </span>
                        )}
                      </td>

                      <td
                        className="py-3.5 px-4 align-middle text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          aria-label={`Remove ${item.description}`}
                          onClick={() => onRemoveItem(item.barcode)}
                          className="w-10 h-10 inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-red-700 hover:border-red-300 hover:bg-red-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
                        >
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
