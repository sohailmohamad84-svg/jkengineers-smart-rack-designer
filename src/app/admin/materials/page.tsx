'use client';

import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/presentation/components/admin/AdminLayout';
import {
  Coins,
  History,
  TrendingUp,
  Edit2,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
  Calendar,
  X,
} from 'lucide-react';

export default function AdminMaterialsPage() {
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Update Price Modal
  const [selectedMaterial, setSelectedMaterial] = useState<any>(null);
  const [newRate, setNewRate] = useState<number>(0);
  const [changeReason, setChangeReason] = useState<string>('');
  const [updating, setUpdating] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Price History Drawer
  const [historyMaterial, setHistoryMaterial] = useState<any>(null);

  const loadMaterials = async () => {
    try {
      const res = await fetch('/api/admin/materials');
      const data = await res.json();
      if (data.success) {
        setMaterials(data.materials);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMaterials();
  }, []);

  const handleOpenUpdate = (mat: any) => {
    setSelectedMaterial(mat);
    setNewRate(mat.currentPrice?.currentRate || 0);
    setChangeReason('');
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newRate <= 0) {
      setErrorMessage('Please enter a positive rate.');
      return;
    }

    setUpdating(true);
    setErrorMessage('');
    try {
      const res = await fetch('/api/admin/materials/price-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          materialId: selectedMaterial.id,
          newRate: Number(newRate),
          changeReason: changeReason || 'Market index revision',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMessage(data.message);
        setTimeout(() => {
          setSelectedMaterial(null);
          loadMaterials();
        }, 1200);
      } else {
        setErrorMessage(data.message || 'Failed to update rate');
      }
    } catch {
      setErrorMessage('Network error while updating rate.');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-brand-400">Pricing Engine</span>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Raw Material Rates & Price Versioning
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Admin-controlled dynamic rates. Changing a rate logs immutable historical records (Rule 20).
            </p>
          </div>

          <div className="bg-slate-950 border border-slate-800 px-3.5 py-2 rounded-lg text-xs text-slate-400 flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-brand-400" />
            <span>Pre-existing customer estimates retain their historical price snapshots.</span>
          </div>
        </div>

        {/* Materials Table */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="p-3.5">Material Code & Name</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Unit</th>
                  <th className="p-3.5">Active Rate (₹)</th>
                  <th className="p-3.5">Previous Rate (₹)</th>
                  <th className="p-3.5">Effective Date</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      Loading raw material rates...
                    </td>
                  </tr>
                ) : (
                  materials.map((mat) => {
                    const currentRate = mat.currentPrice?.currentRate || 0;
                    const latestHistory = mat.priceHistory?.[0];
                    const previousRate = latestHistory?.previousRate;

                    return (
                      <tr key={mat.id} className="hover:bg-slate-900/50 transition-colors">
                        <td className="p-3.5">
                          <span className="font-mono text-[10px] text-brand-400 font-bold block">
                            {mat.code}
                          </span>
                          <span className="font-bold text-white block">{mat.name}</span>
                          {mat.notes && <span className="text-[11px] text-slate-500 block">{mat.notes}</span>}
                        </td>

                        <td className="p-3.5">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 uppercase">
                            {mat.category}
                          </span>
                        </td>

                        <td className="p-3.5 font-mono text-slate-400">{mat.unit}</td>

                        <td className="p-3.5 font-mono font-bold text-base text-brand-400">
                          ₹{currentRate.toFixed(2)}
                        </td>

                        <td className="p-3.5 font-mono text-slate-500">
                          {previousRate ? `₹${previousRate.toFixed(2)}` : '—'}
                        </td>

                        <td className="p-3.5 text-slate-400 text-[11px]">
                          {new Date(mat.currentPrice?.effectiveDate || mat.createdAt).toLocaleDateString('en-IN')}
                        </td>

                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => setHistoryMaterial(mat)}
                              className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded border border-slate-700"
                              title="View Price History"
                            >
                              <History className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleOpenUpdate(mat)}
                              className="px-3 py-1.5 bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 rounded border border-brand-500/30 font-bold text-[11px] flex items-center"
                            >
                              <Edit2 className="w-3 h-3 mr-1" />
                              Update Rate
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Update Price Modal */}
        {selectedMaterial && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 text-white shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5 text-brand-400" />
                  <h3 className="text-base font-bold">Update Material Rate</h3>
                </div>
                <button onClick={() => setSelectedMaterial(null)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1">
                <div className="text-slate-400">Material: <strong className="text-white">{selectedMaterial.name}</strong></div>
                <div className="text-slate-400">Current Active Rate: <strong className="text-brand-400 font-mono">₹{selectedMaterial.currentPrice?.currentRate} / {selectedMaterial.unit}</strong></div>
              </div>

              {errorMessage && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>{successMessage}</span>
                </div>
              )}

              <form onSubmit={handleUpdateSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                    New Rate (₹ per {selectedMaterial.unit}) *
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    required
                    value={newRate}
                    onChange={(e) => setNewRate(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono text-base font-bold focus:ring-1 focus:ring-brand-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                    Reason for Price Change (Audit Log Record) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tata Steel HR sheet price revision for September"
                    value={changeReason}
                    onChange={(e) => setChangeReason(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-white focus:ring-1 focus:ring-brand-500 focus:outline-none"
                  />
                </div>

                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[11px]">
                  <strong>Price Versioning Note:</strong> The previous rate will be archived in the historical pricing table with timestamp. Existing customer project estimates will continue to show their original agreed pricing.
                </div>

                <div className="flex justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedMaterial(null)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updating}
                    className="px-5 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg font-bold shadow-sm"
                  >
                    {updating ? 'Saving Rate...' : 'Confirm Rate Update'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Price History Drawer */}
        {historyMaterial && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 text-white shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <History className="w-5 h-5 text-brand-400" />
                  <h3 className="text-base font-bold">Historical Rates: {historyMaterial.name}</h3>
                </div>
                <button onClick={() => setHistoryMaterial(null)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto text-xs divide-y divide-slate-800">
                {historyMaterial.priceHistory?.map((h: any) => (
                  <div key={h.id} className="pt-2 pb-2 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-mono text-brand-400 font-bold">
                        ₹{h.newRate.toFixed(2)} / {historyMaterial.unit}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {new Date(h.effectiveDate).toLocaleDateString('en-IN')}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Previous: ₹{h.previousRate.toFixed(2)} • Reason: {h.changeReason || 'Market adjustment'}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setHistoryMaterial(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-bold text-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
