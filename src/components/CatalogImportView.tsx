import { CheckCircle2, Download, FileSpreadsheet, Upload } from 'lucide-react';
import { useState, type ChangeEvent } from 'react';
import * as XLSX from 'xlsx';
import { useAuth } from '../context/AuthContext';
import { importCatalogItems } from '../services/grService';
import { parseCatalogRows, type MasterCatalogItem } from '../utils/grLogic';

export function CatalogImportView() {
  const { getToken } = useAuth();
  const [parsedItems, setParsedItems] = useState<MasterCatalogItem[]>([]);
  const [skippedCount, setSkippedCount] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    setResultMessage(null);
    setFileName(file.name);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheet = workbook.SheetNames[0];
      if (!firstSheet) {
        setErrorMessage('The uploaded spreadsheet contains no sheets.');
        return;
      }

      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
        workbook.Sheets[firstSheet],
        { defval: '' }
      );
      const { validItems, skippedRows } = parseCatalogRows(rawRows);
      setParsedItems(validItems);
      setSkippedCount(skippedRows);

      if (validItems.length === 0) {
        setErrorMessage(
          'No valid items found. Ensure columns include item_code, barcode, description, category, and uom.'
        );
      }
    } catch {
      setErrorMessage('Could not parse file. Upload a valid .xlsx, .xls, or .csv spreadsheet.');
    }
  };

  const handleCommitImport = async () => {
    if (parsedItems.length === 0) return;
    setImporting(true);
    setErrorMessage(null);
    setResultMessage(null);

    try {
      const token = await getToken();
      const res = await importCatalogItems(parsedItems, token);
      setResultMessage(
        `Imported ${res.upsertedCount} master catalog items. Operators can now scan these barcodes immediately.`
      );
      setParsedItems([]);
      setFileName(null);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Catalog import failed.'
      );
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadTemplate = () => {
    const csv = [
      'item_code,barcode,description,category,uom,unit_cost',
      'AM-DAI-010,8991002109998,Ultra Milk Chocolate 1L,Dairy & Chilled,CTN,19800',
      'AM-DRY-011,8992761139995,Indomie Soto Mie 70g (40-Pack Box),Dry Pantry,BOX,115000',
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'amanmart_master_catalog_template.csv';
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
            Master Catalog Spreadsheet Import
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Upload Amanmart Excel (.xlsx, .xls) or CSV item files to update barcodes and product descriptions.
          </p>
        </div>

        <button
          type="button"
          onClick={handleDownloadTemplate}
          className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[42px] text-xs font-bold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
        >
          <Download className="w-4 h-4" aria-hidden="true" />
          <span>Download CSV Template</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-8 space-y-4">
          <section className="bg-white border border-slate-200 rounded-xl p-6">
            <label
              htmlFor="catalog-file-input"
              className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 hover:border-emerald-600 rounded-xl p-10 text-center cursor-pointer transition-colors bg-slate-50/50"
            >
              <FileSpreadsheet
                className="w-8 h-8 text-emerald-700 mb-3"
                aria-hidden="true"
              />
              <span className="text-sm font-bold text-slate-900">
                {fileName ? `Selected: ${fileName}` : 'Choose Excel or CSV spreadsheet'}
              </span>
              <span className="text-xs text-slate-500 mt-1">
                Supports .xlsx, .xls, and .csv files · Barcodes upsert automatically
              </span>
              <input
                id="catalog-file-input"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="sr-only"
              />
            </label>

            {errorMessage && (
              <div
                role="alert"
                className="mt-4 p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs font-medium text-red-900"
              >
                {errorMessage}
              </div>
            )}

            {resultMessage && (
              <div
                role="status"
                className="mt-4 p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-950 flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
                <span>{resultMessage}</span>
              </div>
            )}
          </section>

          {parsedItems.length > 0 && (
            <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Preview Ready to Import
                  </h2>
                  <p className="text-xs text-slate-500">
                    {parsedItems.length} valid items parsed
                    {skippedCount > 0 ? ` · ${skippedCount} invalid or duplicate rows skipped` : ''}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCommitImport}
                  disabled={importing}
                  className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-400 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  <Upload className="w-4 h-4" aria-hidden="true" />
                  <span>
                    {importing
                      ? 'Importing Catalog...'
                      : `Import ${parsedItems.length} Items`}
                  </span>
                </button>
              </div>

              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                      <th className="py-2.5 px-5">SKU</th>
                      <th className="py-2.5 px-3">Barcode</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-5">UOM</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {parsedItems.slice(0, 50).map((item) => (
                      <tr key={item.barcode}>
                        <td className="py-2.5 px-5 font-mono text-xs text-slate-700">
                          {item.itemCode}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-xs font-semibold text-slate-900">
                          {item.barcode}
                        </td>
                        <td className="py-2.5 px-3 text-slate-900 font-medium">
                          {item.description}
                        </td>
                        <td className="py-2.5 px-3 text-xs text-slate-600">
                          {item.category}
                        </td>
                        <td className="py-2.5 px-5 font-mono text-xs text-slate-700">
                          {item.uom}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>

        <aside className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Spreadsheet Column Guide
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Headers are matched case-insensitively on the first sheet.
            </p>
          </div>

          <dl className="divide-y divide-slate-200 text-xs">
            <div className="py-2.5 flex items-center justify-between gap-3">
              <dt className="font-mono font-semibold text-slate-900">item_code</dt>
              <dd className="text-slate-600">Required · Internal SKU</dd>
            </div>
            <div className="py-2.5 flex items-center justify-between gap-3">
              <dt className="font-mono font-semibold text-slate-900">barcode</dt>
              <dd className="text-slate-600">Required · EAN-13 / UPC</dd>
            </div>
            <div className="py-2.5 flex items-center justify-between gap-3">
              <dt className="font-mono font-semibold text-slate-900">description</dt>
              <dd className="text-slate-600">Required · Official item name</dd>
            </div>
            <div className="py-2.5 flex items-center justify-between gap-3">
              <dt className="font-mono font-semibold text-slate-900">category</dt>
              <dd className="text-slate-600">Optional · Department</dd>
            </div>
            <div className="py-2.5 flex items-center justify-between gap-3">
              <dt className="font-mono font-semibold text-slate-900">uom</dt>
              <dd className="text-slate-600">Optional · CTN, BOX, PCS</dd>
            </div>
          </dl>
        </aside>
      </div>
    </div>
  );
}
