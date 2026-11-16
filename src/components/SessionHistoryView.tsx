import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Download,
  FileText,
  Search,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchGrSessions } from '../services/grService';
import type { GrSessionRecord } from '../utils/grLogic';

interface SessionHistoryViewProps {
  onGoToReceiving: () => void;
}

export function SessionHistoryView({ onGoToReceiving }: SessionHistoryViewProps) {
  const { user, getToken } = useAuth();
  const [sessions, setSessions] = useState<GrSessionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const token = await getToken();
        const data = await fetchGrSessions(token);
        if (!cancelled) {
          setSessions(data);
          if (data.length > 0) {
            setExpandedId(data[0].id);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Unable to load receiving history.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, getToken]);

  const filtered = sessions.filter((s) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      s.sessionCode.toLowerCase().includes(q) ||
      s.supplierName.toLowerCase().includes(q) ||
      s.poNumber.toLowerCase().includes(q) ||
      s.operatorName.toLowerCase().includes(q)
    );
  });

  const handleExportCsv = (session: GrSessionRecord) => {
    const headers = [
      'Session Code',
      'Supplier',
      'PO Number',
      'Dock Bay',
      'Operator',
      'Item Code',
      'Barcode',
      'Description',
      'UOM',
      'Quantity',
      'Packaging Intact',
      'Expired or Near',
      'Physical Condition Good',
      'QC Notes',
    ];

    const rows = session.items.map((item) => [
      session.sessionCode,
      session.supplierName,
      session.poNumber,
      session.dockBay,
      session.operatorName,
      item.itemCode,
      item.barcode,
      item.description,
      item.uom,
      String(item.quantity),
      item.qcPackagingIntact ? 'Yes' : 'No',
      item.qcExpiredOrNear ? 'Yes' : 'No',
      item.qcPhysicalGood ? 'Yes' : 'No',
      item.qcNotes || '',
    ]);

    const csvContent = [headers, ...rows]
      .map((cols) =>
        cols.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(',')
      )
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${session.sessionCode}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Receiving Session History
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Audit completed shipments, aggregated unit counts, and quality inspection logs.
          </p>
        </div>

        <div className="relative w-full sm:w-80">
          <Search
            className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"
            aria-hidden="true"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by PO #, supplier, or code..."
            aria-label="Filter receiving history"
            className="w-full min-h-[42px] pl-10 pr-4 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-900"
        >
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 space-y-3">
          <div className="h-5 bg-slate-100 rounded w-1/3" />
          <div className="h-10 bg-slate-100 rounded w-full" />
          <div className="h-10 bg-slate-100 rounded w-full" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center flex flex-col items-center">
          <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center mb-4">
            <FileText className="w-6 h-6 text-slate-500" aria-hidden="true" />
          </div>
          <h2 className="text-base font-bold text-slate-900 mb-1">
            No submitted receiving sessions found
          </h2>
          <p className="text-sm text-slate-600 max-w-md mb-5">
            Complete a barcode receiving batch on the Receiving Workbench to see finalized logs here.
          </p>
          <button
            type="button"
            onClick={onGoToReceiving}
            className="px-5 py-2.5 min-h-[44px] text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
          >
            Go to Receiving Workbench
          </button>
        </div>
      ) : (
        <div className="space-y-3" data-testid="history-sessions-list">
          {filtered.map((session) => {
            const isExpanded = expandedId === session.id;
            const formattedTime = new Date(session.submittedAt).toLocaleString(
              undefined,
              {
                dateStyle: 'medium',
                timeStyle: 'short',
              }
            );
            return (
              <div
                key={session.id}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden"
              >
                <div className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
                  <button
                    type="button"
                    aria-expanded={isExpanded}
                    onClick={() =>
                      setExpandedId(isExpanded ? null : session.id)
                    }
                    className="flex items-start gap-3 text-left flex-1 min-w-[240px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-slate-500 mt-0.5 shrink-0" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-slate-500 mt-0.5 shrink-0" />
                    )}
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {session.supplierName}
                      </p>
                      <p className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-slate-700 font-semibold">
                          {session.sessionCode}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono">PO {session.poNumber}</span>
                        <span aria-hidden="true">·</span>
                        <span>{session.dockBay}</span>
                        <span aria-hidden="true">·</span>
                        <span>{session.operatorName}</span>
                        <span aria-hidden="true">·</span>
                        <span>{formattedTime}</span>
                      </p>
                    </div>
                  </button>

                  <div className="flex items-center gap-6 shrink-0">
                    <div className="text-right">
                      <p className="text-xs text-slate-500">SKUs / Units</p>
                      <p className="text-sm font-mono font-bold tabular-nums text-slate-900">
                        {session.totalSkus} / {session.totalUnits}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-xs text-slate-500">QC Result</p>
                      {session.qcFailCount === 0 ? (
                        <p className="text-xs font-semibold text-emerald-700 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>All Passed</span>
                        </p>
                      ) : (
                        <p className="text-xs font-semibold text-amber-700 inline-flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>{session.qcFailCount} Flagged</span>
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleExportCsv(session)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Export CSV</span>
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-slate-200 overflow-x-auto bg-slate-50/50">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-xs font-semibold text-slate-600">
                          <th className="py-2.5 px-5">Item & Barcode</th>
                          <th className="py-2.5 px-3 text-right">QTY</th>
                          <th className="py-2.5 px-3">Packaging Intact</th>
                          <th className="py-2.5 px-3">Expired / Near</th>
                          <th className="py-2.5 px-3">Physical Good</th>
                          <th className="py-2.5 px-5">QC Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {session.items.map((item, idx) => (
                          <tr key={`${item.barcode}-${idx}`}>
                            <td className="py-3 px-5">
                              <p className="font-semibold text-slate-900">
                                {item.description}
                              </p>
                              <p className="text-xs font-mono text-slate-500">
                                {item.barcode} · {item.itemCode}
                              </p>
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-bold tabular-nums text-slate-900">
                              {item.quantity} {item.uom}
                            </td>
                            <td className="py-3 px-3 text-xs font-semibold">
                              <span
                                className={
                                  item.qcPackagingIntact
                                    ? 'text-emerald-700'
                                    : 'text-red-700'
                                }
                              >
                                {item.qcPackagingIntact ? 'Yes' : 'No'}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-xs font-semibold">
                              <span
                                className={
                                  item.qcExpiredOrNear
                                    ? 'text-red-700'
                                    : 'text-emerald-700'
                                }
                              >
                                {item.qcExpiredOrNear ? 'Yes' : 'No'}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-xs font-semibold">
                              <span
                                className={
                                  item.qcPhysicalGood
                                    ? 'text-emerald-700'
                                    : 'text-red-700'
                                }
                              >
                                {item.qcPhysicalGood ? 'Yes' : 'No'}
                              </span>
                            </td>
                            <td className="py-3 px-5 text-xs text-slate-600">
                              {item.qcNotes || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
