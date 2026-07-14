import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import toast from 'react-hot-toast';
import type { ScannedProductItem } from '../types';
import {
  X, Camera, Upload, Check, CheckCircle2, RefreshCw,
  PackagePlus, PackageCheck, Edit3, Trash2,
} from 'lucide-react';

type Step = 'upload' | 'processing' | 'review' | 'done';

interface ImportResult {
  created: number;
  updated: number;
  skipped: number;
  details: Array<{ name: string; action: string; newStock?: number }>;
}

export default function ScanStockModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>('upload');
  const [scanId, setScanId] = useState<string | null>(null);
  const [items, setItems] = useState<ScannedProductItem[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleUpload = useCallback(async (file: File) => {
    setStep('processing');

    const formData = new FormData();
    formData.append('image', file);

    try {
      const { data } = await api.post('/scans/inventory', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setScanId(data.scan.id);

      const parsed = data.scan.parsed;
      const scannedItems: ScannedProductItem[] = (parsed?.items || []).map((item: any) => ({
        name: item.name || item.productName || '',
        category: 'General',
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice || 0,
        costPrice: item.unitPrice || 0, // supplier price = cost price
        sku: '',
        expiryDate: '',
        include: true,
        updatePriceIfExists: false,
        existingMatch: false,
      }));

      // Check for existing products
      try {
        const { data: productsData } = await api.get('/products', { params: { limit: 500 } });
        const existingNames = new Set(
          (productsData.products || []).map((p: any) => p.name.toLowerCase().trim())
        );
        for (const item of scannedItems) {
          item.existingMatch = existingNames.has(item.name.toLowerCase().trim());
        }
      } catch {
        // ignore
      }

      if (scannedItems.length > 0) {
        setItems(scannedItems);
        setStep('review');
      } else {
        toast.error("Couldn't extract products — try better lighting or add manually");
        setStep('upload');
      }
    } catch {
      toast.error('Scan failed — please try again');
      setStep('upload');
    }
  }, []);

  const updateItem = (index: number, field: keyof ScannedProductItem, value: any) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleImport = async () => {
    if (!scanId) return;
    setIsImporting(true);

    try {
      const { data } = await api.post(`/scans/inventory/${scanId}/import`, {
        items: items.filter((i) => i.include),
      });
      setImportResult(data.result);
      setStep('done');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(`Imported ${data.result.created} new + ${data.result.updated} updated products!`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  const includedCount = items.filter((i) => i.include).length;
  const newCount = items.filter((i) => i.include && !i.existingMatch).length;
  const updateCount = items.filter((i) => i.include && i.existingMatch).length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-counter-slate/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="card p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-xl text-counter-slate flex items-center gap-2">
            <PackagePlus size={22} className="text-stamp-vermillion" />
            {step === 'upload' && 'Scan Supplier Bill'}
            {step === 'processing' && 'Processing...'}
            {step === 'review' && 'Review & Import Products'}
            {step === 'done' && 'Import Complete!'}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-counter-slate-50 rounded-lg transition-colors">
            <X size={18} className="text-faded-docket" />
          </button>
        </div>

        {/* Step: Upload */}
        {step === 'upload' && (
          <div>
            <p className="text-sm text-faded-docket mb-4">
              Upload a photo of your supplier invoice or wholesale bill. The system will extract product
              names, quantities, and prices — then you can review before importing to inventory.
            </p>
            <div className="border-2 border-dashed border-faded-docket/30 rounded-xl p-10 text-center hover:border-stamp-vermillion/40 transition-colors cursor-pointer relative">
              <Upload size={36} className="text-faded-docket/40 mx-auto mb-3" />
              <p className="text-sm font-medium text-counter-slate">Click to upload or drag a supplier bill</p>
              <p className="text-xs text-faded-docket mt-1">JPEG, PNG, or WebP · Max 10MB</p>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/bmp"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUpload(file);
                }}
              />
            </div>
            <p className="text-xs text-faded-docket mt-3 text-center">
              💡 Tip: Flatten the bill, use good lighting, and capture all product rows clearly.
            </p>
          </div>
        )}

        {/* Step: Processing */}
        {step === 'processing' && (
          <div className="text-center py-16">
            <div className="w-16 h-16 border-4 border-stamp-vermillion/20 border-t-stamp-vermillion rounded-full animate-spin mx-auto mb-5" />
            <p className="text-lg font-medium text-counter-slate mb-1">Scanning your supplier bill...</p>
            <p className="text-sm text-faded-docket">Extracting product names, quantities, and prices via OCR</p>
          </div>
        )}

        {/* Step: Review */}
        {step === 'review' && (
          <div>
            {/* Summary bar */}
            <div className="flex items-center gap-3 mb-4 p-3 bg-counter-slate-50/50 rounded-lg">
              <span className="text-sm text-counter-slate font-medium">
                {items.length} items found
              </span>
              <span className="text-xs text-faded-docket">·</span>
              <span className="text-xs text-mint-tender font-medium flex items-center gap-1">
                <PackagePlus size={12} /> {newCount} new
              </span>
              <span className="text-xs text-faded-docket">·</span>
              <span className="text-xs text-blue-500 font-medium flex items-center gap-1">
                <PackageCheck size={12} /> {updateCount} existing (restock)
              </span>
            </div>

            {/* Items table */}
            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1 mb-4">
              {items.map((item, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className={`p-3 rounded-lg border transition-all ${
                    item.include
                      ? 'border-faded-docket/20 bg-white'
                      : 'border-faded-docket/10 bg-counter-slate-50/30 opacity-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <button
                      onClick={() => updateItem(idx, 'include', !item.include)}
                      className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                        item.include
                          ? 'bg-mint-tender border-mint-tender'
                          : 'border-faded-docket/30'
                      }`}
                    >
                      {item.include && <Check size={12} className="text-white" />}
                    </button>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => updateItem(idx, 'name', e.target.value)}
                          className="input-field text-sm font-medium flex-1"
                          placeholder="Product name"
                        />
                        {item.existingMatch && (
                          <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded shrink-0">
                            EXISTS
                          </span>
                        )}
                        {!item.existingMatch && (
                          <span className="text-[10px] font-medium text-mint-tender bg-mint-tender/10 px-1.5 py-0.5 rounded shrink-0">
                            NEW
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div>
                          <label className="text-[10px] text-faded-docket uppercase font-medium">Qty</label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                            className="input-field text-sm font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-faded-docket uppercase font-medium">Sell ₹</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                            className="input-field text-sm font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-faded-docket uppercase font-medium">Cost ₹</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.costPrice || ''}
                            onChange={(e) => updateItem(idx, 'costPrice', parseFloat(e.target.value) || 0)}
                            className="input-field text-sm font-mono"
                            placeholder="Optional"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-faded-docket uppercase font-medium">Category</label>
                          <input
                            type="text"
                            value={item.category}
                            onChange={(e) => updateItem(idx, 'category', e.target.value)}
                            className="input-field text-sm"
                            placeholder="General"
                          />
                        </div>
                      </div>

                      {item.existingMatch && item.include && (
                        <label className="flex items-center gap-2 mt-2 text-xs text-faded-docket cursor-pointer">
                          <input
                            type="checkbox"
                            checked={item.updatePriceIfExists}
                            onChange={(e) => updateItem(idx, 'updatePriceIfExists', e.target.checked)}
                            className="rounded"
                          />
                          Also update selling price for this existing product
                        </label>
                      )}
                    </div>

                    {/* Remove */}
                    <button
                      onClick={() => removeItem(idx)}
                      className="p-1 text-faded-docket hover:text-stamp-vermillion transition-colors mt-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 pt-2 border-t border-faded-docket/20">
              <button onClick={onClose} className="btn-ghost flex-1">Cancel</button>
              <button
                onClick={handleImport}
                disabled={includedCount === 0 || isImporting}
                className="btn-success flex-1"
              >
                {isImporting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <PackagePlus size={16} />
                    Import {includedCount} Products
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step: Done */}
        {step === 'done' && importResult && (
          <div className="text-center py-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              <CheckCircle2 size={64} className="text-mint-tender mx-auto mb-4" />
            </motion.div>

            <h3 className="font-display text-2xl text-counter-slate mb-2">Import Complete!</h3>
            <p className="text-faded-docket mb-6">Your inventory has been updated successfully.</p>

            <div className="flex justify-center gap-6 mb-6">
              <div className="text-center">
                <p className="font-display text-3xl text-mint-tender">{importResult.created}</p>
                <p className="text-xs text-faded-docket">New Products</p>
              </div>
              <div className="text-center">
                <p className="font-display text-3xl text-blue-500">{importResult.updated}</p>
                <p className="text-xs text-faded-docket">Restocked</p>
              </div>
              {importResult.skipped > 0 && (
                <div className="text-center">
                  <p className="font-display text-3xl text-faded-docket">{importResult.skipped}</p>
                  <p className="text-xs text-faded-docket">Skipped</p>
                </div>
              )}
            </div>

            {importResult.details.length > 0 && (
              <div className="text-left max-h-40 overflow-y-auto mb-6">
                {importResult.details.map((d, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm py-1 px-3">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                      d.action === 'created' ? 'text-mint-tender bg-mint-tender/10' :
                      d.action === 'updated' ? 'text-blue-600 bg-blue-50' :
                      'text-faded-docket bg-counter-slate-50'
                    }`}>
                      {d.action.toUpperCase()}
                    </span>
                    <span className="text-counter-slate truncate">{d.name}</span>
                    {d.newStock !== undefined && (
                      <span className="text-xs text-faded-docket font-mono ml-auto">Stock: {d.newStock}</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            <button onClick={onClose} className="btn-primary">
              Close
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
