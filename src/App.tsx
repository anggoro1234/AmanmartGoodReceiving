import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarcodeScannerBar,
  type ScanFeedbackState,
} from './components/BarcodeScannerBar';
import { CatalogImportView } from './components/CatalogImportView';
import { CatalogSearchModal } from './components/CatalogSearchModal';
import { QcAndSubmitPanel } from './components/QcAndSubmitPanel';
import { ReceivingTable } from './components/ReceivingTable';
import { SessionHistoryView } from './components/SessionHistoryView';
import { TopBar, type AppView } from './components/TopBar';
import { AuthProvider, useAuth } from './context/AuthContext';
import { lookupBarcode, submitGrSession } from './services/grService';
import {
  applyQcToAllItems,
  computeSessionSummary,
  generateSessionCode,
  normalizeBarcode,
  updateItemQcField,
  updateItemQuantity,
  upsertScannedItem,
  validateSessionSubmission,
  type ActiveGrLineItem,
  type MasterCatalogItem,
  type QcChecklist,
  type SessionMeta,
} from './utils/grLogic';
import { playScanBeep } from './utils/soundFeedback';

function GoodsReceivingApp() {
  const { user, authError, getToken } = useAuth();
  const [activeView, setActiveView] = useState<AppView>('receiving');

  const [meta, setMeta] = useState<SessionMeta>(() => ({
    sessionCode: generateSessionCode(),
    operatorName: '',
    supplierName: '',
    poNumber: '',
    dockBay: 'Dock A1',
    notes: '',
  }));

  useEffect(() => {
    if (user && !meta.operatorName.trim()) {
      setMeta((prev) => ({
        ...prev,
        operatorName: user.displayName || user.email || '',
      }));
    }
  }, [user, meta.operatorName]);

  const [items, setItems] = useState<ActiveGrLineItem[]>([]);
  const [selectedBarcode, setSelectedBarcode] = useState<string | null>(null);
  const [batchMultiplier, setBatchMultiplier] = useState(1);
  const [scannerLocked, setScannerLocked] = useState(true);
  const [muted, setMuted] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [focusTrigger, setFocusTrigger] = useState(0);

  const [feedback, setFeedback] = useState<ScanFeedbackState>({
    status: 'idle',
    title: '',
    detail: '',
  });

  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchInitialQuery, setSearchInitialQuery] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [submissionSuccessCode, setSubmissionSuccessCode] = useState<string | null>(null);

  const summary = useMemo(() => computeSessionSummary(items), [items]);

  const selectedItem = useMemo(() => {
    if (items.length === 0) return null;
    if (selectedBarcode) {
      const match = items.find((i) => i.barcode === selectedBarcode);
      if (match) return match;
    }
    return items[0];
  }, [items, selectedBarcode]);

  const applyCatalogItemToSession = useCallback(
    (catalogItem: MasterCatalogItem) => {
      setSubmissionSuccessCode(null);
      setValidationErrors([]);

      setItems((prev) => {
        const { nextItems, action, updatedItem } = upsertScannedItem(
          prev,
          catalogItem,
          batchMultiplier
        );
        setSelectedBarcode(updatedItem.barcode);
        setFeedback({
          status: 'success',
          title:
            action === 'incremented'
              ? `${updatedItem.description} (+${batchMultiplier} → QTY ${updatedItem.quantity})`
              : `${updatedItem.description} (Added ×${batchMultiplier})`,
          detail: `${updatedItem.itemCode} · ${updatedItem.category}`,
          barcode: updatedItem.barcode,
          timestamp: Date.now(),
        });
        return nextItems;
      });
      playScanBeep('success', muted);
    },
    [batchMultiplier, muted]
  );

  const handleScanSubmit = useCallback(
    async (rawBarcode: string) => {
      const barcode = normalizeBarcode(rawBarcode);
      if (!barcode) return;

      setIsScanning(true);
      setSubmissionSuccessCode(null);

      try {
        const token = await getToken();
        const found = await lookupBarcode(barcode, token);
        if (!found) {
          playScanBeep('error', muted);
          setFeedback({
            status: 'error',
            title: `Unregistered barcode: ${barcode}`,
            detail:
              'Item not found in Amanmart master catalog. Check label or search manually.',
            barcode,
            timestamp: Date.now(),
          });
          return;
        }
        applyCatalogItemToSession(found);
      } catch (err) {
        playScanBeep('error', muted);
        setFeedback({
          status: 'error',
          title: 'Scan lookup failed',
          detail:
            err instanceof Error ? err.message : 'Network error during barcode lookup.',
          barcode,
          timestamp: Date.now(),
        });
      } finally {
        setIsScanning(false);
        if (scannerLocked) {
          setFocusTrigger((n) => n + 1);
        }
      }
    },
    [getToken, muted, applyCatalogItemToSession, scannerLocked]
  );

  const handleAdjustQuantity = useCallback(
    (barcode: string, nextQty: number) => {
      setItems((prev) => updateItemQuantity(prev, barcode, nextQty));
      if (scannerLocked) {
        setFocusTrigger((n) => n + 1);
      }
    },
    [scannerLocked]
  );

  const handleRemoveItem = useCallback(
    (barcode: string) => {
      setItems((prev) => updateItemQuantity(prev, barcode, 0));
      if (scannerLocked) {
        setFocusTrigger((n) => n + 1);
      }
    },
    [scannerLocked]
  );

  const handleUpdateQc = useCallback(
    (barcode: string, field: keyof QcChecklist, value: boolean | string) => {
      setItems((prev) => updateItemQcField(prev, barcode, field, value));
    },
    []
  );

  const handleApplyQcToAll = useCallback(
    (
      template: Pick<
        QcChecklist,
        'packagingIntact' | 'expiredOrNear' | 'physicalGood'
      >
    ) => {
      setItems((prev) => applyQcToAllItems(prev, template));
    },
    []
  );

  const handleSubmitSession = useCallback(async () => {
    const check = validateSessionSubmission(meta, items);
    if (!check.valid) {
      setValidationErrors(check.errors);
      return;
    }

    setValidationErrors([]);
    setIsSubmitting(true);

    try {
      const token = await getToken();
      const created = await submitGrSession(meta, items, token);
      setSubmissionSuccessCode(created.sessionCode);
      setItems([]);
      setSelectedBarcode(null);
      setFeedback({ status: 'idle', title: '', detail: '' });
      setMeta((prev) => ({
        ...prev,
        sessionCode: generateSessionCode(),
        supplierName: '',
        poNumber: '',
        notes: '',
      }));
    } catch (err) {
      setValidationErrors([
        err instanceof Error
          ? err.message
          : 'Unable to submit receiving session.',
      ]);
    } finally {
      setIsSubmitting(false);
    }
  }, [meta, items, getToken]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <TopBar activeView={activeView} onNavigate={setActiveView} />

      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-5 sm:py-6">
        <nav
          aria-label="Mobile navigation"
          className="md:hidden grid grid-cols-3 gap-1 p-1 bg-slate-200/70 rounded-lg mb-4"
        >
          <button
            type="button"
            onClick={() => setActiveView('receiving')}
            className={`min-h-[40px] px-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
              activeView === 'receiving'
                ? 'bg-white text-slate-900'
                : 'text-slate-600'
            }`}
          >
            Receiving
          </button>
          <button
            type="button"
            onClick={() => setActiveView('history')}
            className={`min-h-[40px] px-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
              activeView === 'history'
                ? 'bg-white text-slate-900'
                : 'text-slate-600'
            }`}
          >
            History
          </button>
          <button
            type="button"
            onClick={() => setActiveView('import')}
            className={`min-h-[40px] px-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
              activeView === 'import'
                ? 'bg-white text-slate-900'
                : 'text-slate-600'
            }`}
          >
            Catalog Import
          </button>
        </nav>

        {authError && (
          <div
            role="alert"
            className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-medium text-red-900"
          >
            {authError}
          </div>
        )}

        {activeView === 'receiving' && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  Inbound Goods Receiving Workbench
                </h1>
                <p className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-1.5">
                  <span className="font-mono font-semibold text-slate-700">
                    {meta.sessionCode}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{meta.dockBay}</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {user
                      ? `Cloud Sync Active (${user.email})`
                      : 'Floor Demo Mode · Sign in to sync with Cloud SQL'}
                  </span>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              <div className="lg:col-span-8 space-y-4">
                <BarcodeScannerBar
                  batchMultiplier={batchMultiplier}
                  onBatchMultiplierChange={setBatchMultiplier}
                  scannerLocked={scannerLocked}
                  onToggleScannerLock={() => setScannerLocked((v) => !v)}
                  muted={muted}
                  onToggleMute={() => setMuted((v) => !v)}
                  isScanning={isScanning}
                  feedback={feedback}
                  onScanSubmit={handleScanSubmit}
                  onOpenCatalogSearch={(initialQuery) => {
                    setSearchInitialQuery(initialQuery ?? '');
                    setSearchModalOpen(true);
                  }}
                  focusTrigger={focusTrigger}
                />

                <ReceivingTable
                  items={items}
                  selectedBarcode={selectedItem?.barcode ?? null}
                  onSelectBarcode={setSelectedBarcode}
                  onAdjustQuantity={handleAdjustQuantity}
                  onRemoveItem={handleRemoveItem}
                  onQuickScanSample={handleScanSubmit}
                  onClearAll={() => {
                    setItems([]);
                    setSelectedBarcode(null);
                    setFeedback({ status: 'idle', title: '', detail: '' });
                  }}
                />
              </div>

              <div className="lg:col-span-4">
                <QcAndSubmitPanel
                  meta={meta}
                  onUpdateMeta={(patch) => {
                    setValidationErrors([]);
                    setMeta((prev) => ({ ...prev, ...patch }));
                  }}
                  selectedItem={selectedItem}
                  summary={summary}
                  onUpdateQc={handleUpdateQc}
                  onApplyQcToAll={handleApplyQcToAll}
                  onSubmitSession={handleSubmitSession}
                  isSubmitting={isSubmitting}
                  validationErrors={validationErrors}
                  submissionSuccessCode={submissionSuccessCode}
                />
              </div>
            </div>
          </div>
        )}

        {activeView === 'history' && (
          <SessionHistoryView onGoToReceiving={() => setActiveView('receiving')} />
        )}

        {activeView === 'import' && <CatalogImportView />}
      </main>

      <CatalogSearchModal
        open={searchModalOpen}
        initialQuery={searchInitialQuery}
        onClose={() => {
          setSearchModalOpen(false);
          if (scannerLocked) {
            setFocusTrigger((n) => n + 1);
          }
        }}
        onAddItem={(item) => {
          applyCatalogItemToSession(item);
          if (scannerLocked) {
            setFocusTrigger((n) => n + 1);
          }
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <GoodsReceivingApp />
    </AuthProvider>
  );
}
