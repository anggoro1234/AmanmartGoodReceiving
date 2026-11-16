import {
  AlertTriangle,
  Barcode,
  CheckCircle2,
  Lock,
  LockOpen,
  Search,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';

export interface ScanFeedbackState {
  status: 'idle' | 'success' | 'error';
  title: string;
  detail: string;
  barcode?: string;
  timestamp?: number;
}

interface BarcodeScannerBarProps {
  batchMultiplier: number;
  onBatchMultiplierChange: (qty: number) => void;
  scannerLocked: boolean;
  onToggleScannerLock: () => void;
  muted: boolean;
  onToggleMute: () => void;
  isScanning: boolean;
  feedback: ScanFeedbackState;
  onScanSubmit: (rawBarcode: string) => Promise<void>;
  onOpenCatalogSearch: (initialQuery?: string) => void;
  focusTrigger: number;
}

const MULTIPLIER_OPTIONS = [1, 6, 12, 24];

export function BarcodeScannerBar({
  batchMultiplier,
  onBatchMultiplierChange,
  scannerLocked,
  onToggleScannerLock,
  muted,
  onToggleMute,
  isScanning,
  feedback,
  onScanSubmit,
  onOpenCatalogSearch,
  focusTrigger,
}: BarcodeScannerBarProps) {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [focusTrigger]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const raw = inputValue.trim();
    if (!raw || isScanning) {
      return;
    }
    setInputValue('');
    await onScanSubmit(raw);
    inputRef.current?.focus();
  };

  return (
    <section
      aria-label="Barcode scanner input"
      className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Barcode Scan Terminal
          </h2>
          <p className="text-xs text-slate-500">
            Ready for USB, Bluetooth, or handheld scanner input · Press Enter to log item
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label="Batch scan multiplier"
            className="inline-flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200"
          >
            {MULTIPLIER_OPTIONS.map((qty) => (
              <button
                key={qty}
                type="button"
                onClick={() => {
                  onBatchMultiplierChange(qty);
                  if (scannerLocked) inputRef.current?.focus();
                }}
                className={`px-3 py-1.5 text-xs font-mono font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  batchMultiplier === qty
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                ×{qty}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onToggleScannerLock}
            aria-pressed={scannerLocked}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 min-h-[40px] ${
              scannerLocked
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {scannerLocked ? (
              <Lock className="w-3.5 h-3.5" aria-hidden="true" />
            ) : (
              <LockOpen className="w-3.5 h-3.5" aria-hidden="true" />
            )}
            <span>{scannerLocked ? 'Focus Locked' : 'Focus Unlocked'}</span>
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            aria-label={muted ? 'Unmute scan sound' : 'Mute scan sound'}
            aria-pressed={muted}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 min-h-[40px]"
          >
            {muted ? (
              <VolumeX className="w-4 h-4 text-slate-500" aria-hidden="true" />
            ) : (
              <Volume2 className="w-4 h-4 text-slate-700" aria-hidden="true" />
            )}
            <span>{muted ? 'Muted' : 'Sound On'}</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <label htmlFor="barcode-scan-input" className="sr-only">
            Scan or enter item barcode
          </label>
          <Barcode
            className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            ref={inputRef}
            id="barcode-scan-input"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            autoFocus
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Scan barcode (e.g. 8991002101015) or type SKU..."
            className="w-full min-h-[52px] pl-12 pr-4 py-3 font-mono text-base sm:text-lg font-medium text-slate-900 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="submit"
            disabled={isScanning || !inputValue.trim()}
            className="min-h-[52px] px-6 py-3 text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 disabled:text-slate-500 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
          >
            {isScanning ? 'Looking Up...' : 'Log Scan'}
          </button>

          <button
            type="button"
            onClick={() => onOpenCatalogSearch()}
            className="min-h-[52px] inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
          >
            <Search className="w-4 h-4" aria-hidden="true" />
            <span>Search Catalog</span>
          </button>
        </div>
      </form>

      {feedback.status === 'success' && (
        <div
          key={feedback.timestamp}
          role="status"
          aria-live="polite"
          data-testid="scan-feedback-success"
          className="mt-3 p-3.5 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-950 flex items-center justify-between gap-3 animate-scan-success"
        >
          <div className="flex items-center gap-3 min-w-0">
            <CheckCircle2
              className="w-5 h-5 text-emerald-700 shrink-0"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className="text-sm font-bold truncate">{feedback.title}</p>
              <p className="text-xs text-emerald-800 truncate">{feedback.detail}</p>
            </div>
          </div>
          {feedback.barcode && (
            <span className="font-mono text-xs font-semibold text-emerald-800 shrink-0">
              {feedback.barcode}
            </span>
          )}
        </div>
      )}

      {feedback.status === 'error' && (
        <div
          key={feedback.timestamp}
          role="alert"
          data-testid="scan-feedback-error"
          className="mt-3 p-3.5 rounded-lg border border-red-300 bg-red-50 text-red-950 flex flex-wrap items-center justify-between gap-3 animate-scan-error"
        >
          <div className="flex items-center gap-3 min-w-0">
            <AlertTriangle
              className="w-5 h-5 text-red-700 shrink-0"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className="text-sm font-bold">{feedback.title}</p>
              <p className="text-xs text-red-800">{feedback.detail}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenCatalogSearch(feedback.barcode)}
            className="px-3.5 py-2 text-xs font-bold text-red-900 bg-white border border-red-300 hover:bg-red-100 rounded-md transition-colors whitespace-nowrap shrink-0"
          >
            Find in Master Catalog
          </button>
        </div>
      )}
    </section>
  );
}
