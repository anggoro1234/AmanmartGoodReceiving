import { Plus, Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { searchCatalog } from '../services/grService';
import type { MasterCatalogItem } from '../utils/grLogic';

interface CatalogSearchModalProps {
  open: boolean;
  initialQuery?: string;
  onClose: () => void;
  onAddItem: (item: MasterCatalogItem) => void;
}

export function CatalogSearchModal({
  open,
  initialQuery = '',
  onClose,
  onAddItem,
}: CatalogSearchModalProps) {
  const { getToken } = useAuth();
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<MasterCatalogItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setQuery(initialQuery);
    }
  }, [open, initialQuery]);

  useEffect(() => {
    if (!open) {
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const token = await getToken();
        const items = await searchCatalog(query, token);
        if (!cancelled) {
          setResults(items);
        }
      } catch {
        if (!cancelled) {
          setResults([]);
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
  }, [open, query, getToken]);

  if (!open) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="catalog-search-title"
      className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
    >
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div>
            <h2 id="catalog-search-title" className="text-base font-bold text-slate-900">
              Search Amanmart Master Catalog
            </h2>
            <p className="text-xs text-slate-500">
              Look up damaged or unreadable barcodes by item description, SKU, or category
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close catalog search"
            className="w-10 h-10 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="p-4 border-b border-slate-200">
          <div className="relative">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"
              aria-hidden="true"
            />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by product name, SKU, or barcode..."
              aria-label="Filter master catalog"
              className="w-full min-h-[44px] pl-10 pr-4 py-2 text-sm text-slate-900 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-200">
          {loading ? (
            <div className="p-8 text-center text-sm text-slate-500">
              Searching master catalog...
            </div>
          ) : results.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-600">
              No matching items found in master catalog.
            </div>
          ) : (
            results.map((item) => (
              <div
                key={item.barcode}
                className="px-5 py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50"
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">
                    {item.description}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-1.5">
                    <span className="font-mono text-slate-700">{item.barcode}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono">{item.itemCode}</span>
                    <span aria-hidden="true">·</span>
                    <span>{item.category}</span>
                    <span aria-hidden="true">·</span>
                    <span>{item.uom}</span>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onAddItem(item);
                    onClose();
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Add Item</span>
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
