'use client';

import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/presentation/components/admin/AdminLayout';
import {
  Layers,
  Plus,
  Edit2,
  CheckCircle,
  AlertCircle,
  Package,
  X,
} from 'lucide-react';

export default function AdminRacksPage() {
  const [racks, setRacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [editingRack, setEditingRack] = useState<any>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    category: 'WALL_RACK',
    defaultWidthMm: 900,
    defaultHeightMm: 2100,
    defaultDepthMm: 450,
    defaultShelves: 5,
    loadCapacityKg: 70,
    baseCost: 5200,
    active: true,
  });
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadRacks = async () => {
    try {
      const res = await fetch('/api/admin/racks');
      const data = await res.json();
      if (data.success) {
        setRacks(data.racks);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRacks();
  }, []);

  const handleOpenEdit = (rack?: any) => {
    setErrorMessage('');
    if (rack) {
      setEditingRack(rack);
      setFormData({
        code: rack.code,
        name: rack.name,
        category: rack.category,
        defaultWidthMm: rack.defaultWidthMm,
        defaultHeightMm: rack.defaultHeightMm,
        defaultDepthMm: rack.defaultDepthMm,
        defaultShelves: rack.defaultShelves,
        loadCapacityKg: rack.loadCapacityKg,
        baseCost: rack.baseCost,
        active: rack.active,
      });
    } else {
      setEditingRack({ isNew: true });
      setFormData({
        code: `RACK_${Date.now().toString().slice(-4)}`,
        name: '',
        category: 'WALL_RACK',
        defaultWidthMm: 900,
        defaultHeightMm: 2100,
        defaultDepthMm: 450,
        defaultShelves: 5,
        loadCapacityKg: 70,
        baseCost: 5000,
        active: true,
      });
    }
  };

  const handleSaveRack = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/admin/racks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        setEditingRack(null);
        loadRacks();
      } else {
        setErrorMessage(data.message || 'Failed to save rack type');
      }
    } catch {
      setErrorMessage('Network error while saving rack.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-brand-400">Inventory Specifications</span>
            <h1 className="text-2xl font-black text-white tracking-tight">Rack Type Catalogue</h1>
            <p className="text-xs text-slate-400 mt-1">
              Configure standard rack dimensions, load ratings, shelf counts, and base manufacturing costs.
            </p>
          </div>

          <button
            onClick={() => handleOpenEdit()}
            className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs rounded-lg transition-colors flex items-center shadow-sm shrink-0 self-start"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add New Rack Type
          </button>
        </div>

        {/* Racks Table */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="p-3.5">Rack Code & Name</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Standard Dimensions (W x D x H)</th>
                  <th className="p-3.5">Shelves</th>
                  <th className="p-3.5">Load Capacity</th>
                  <th className="p-3.5">Base Cost (₹)</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      Loading rack catalogue...
                    </td>
                  </tr>
                ) : (
                  racks.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-900/50 transition-colors">
                      <td className="p-3.5">
                        <span className="font-mono text-[10px] text-brand-400 font-bold block">
                          {r.code}
                        </span>
                        <span className="font-bold text-white block">{r.name}</span>
                      </td>

                      <td className="p-3.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 uppercase">
                          {r.category.replace(/_/g, ' ')}
                        </span>
                      </td>

                      <td className="p-3.5 font-mono text-slate-300">
                        {r.defaultWidthMm} × {r.defaultDepthMm} × {r.defaultHeightMm} mm
                      </td>

                      <td className="p-3.5 text-slate-200 font-bold">
                        {r.defaultShelves} tiers
                      </td>

                      <td className="p-3.5 text-brand-400 font-bold font-mono">
                        {r.loadCapacityKg} kg / tier
                      </td>

                      <td className="p-3.5 font-mono font-bold text-white">
                        ₹{r.baseCost.toLocaleString('en-IN')}
                      </td>

                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => handleOpenEdit(r)}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded border border-slate-700 text-[11px] font-semibold inline-flex items-center"
                        >
                          <Edit2 className="w-3 h-3 mr-1" />
                          Edit Spec
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Edit Modal */}
        {editingRack && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 text-white shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <Package className="w-5 h-5 text-brand-400" />
                  <h3 className="text-base font-bold">
                    {editingRack.isNew ? 'Add New Rack Specification' : `Edit: ${formData.name}`}
                  </h3>
                </div>
                <button onClick={() => setEditingRack(null)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {errorMessage && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs">
                  {errorMessage}
                </div>
              )}

              <form onSubmit={handleSaveRack} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Rack Code *</label>
                    <input
                      type="text"
                      required
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Category *</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                    >
                      <option value="WALL_RACK">Wall Display Rack</option>
                      <option value="GONDOLA_RACK">Center Gondola Rack</option>
                      <option value="END_RACK">Gondola End Cap</option>
                      <option value="MEDICAL_RACK">Medical Rack</option>
                      <option value="GARMENT_RACK">Garment Display Rack</option>
                      <option value="CHECKOUT_COUNTER">Checkout Cash Desk</option>
                      <option value="HEAVY_DUTY">Heavy Duty Rack</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Display Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Width (mm) *</label>
                    <input
                      type="number"
                      required
                      value={formData.defaultWidthMm}
                      onChange={(e) => setFormData({ ...formData, defaultWidthMm: parseInt(e.target.value) || 0 })}
                      className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Depth (mm) *</label>
                    <input
                      type="number"
                      required
                      value={formData.defaultDepthMm}
                      onChange={(e) => setFormData({ ...formData, defaultDepthMm: parseInt(e.target.value) || 0 })}
                      className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Height (mm) *</label>
                    <input
                      type="number"
                      required
                      value={formData.defaultHeightMm}
                      onChange={(e) => setFormData({ ...formData, defaultHeightMm: parseInt(e.target.value) || 0 })}
                      className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Shelves Count</label>
                    <input
                      type="number"
                      value={formData.defaultShelves}
                      onChange={(e) => setFormData({ ...formData, defaultShelves: parseInt(e.target.value) || 5 })}
                      className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Load (kg/tier)</label>
                    <input
                      type="number"
                      value={formData.loadCapacityKg}
                      onChange={(e) => setFormData({ ...formData, loadCapacityKg: parseInt(e.target.value) || 70 })}
                      className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Base Cost (₹)</label>
                    <input
                      type="number"
                      value={formData.baseCost}
                      onChange={(e) => setFormData({ ...formData, baseCost: parseInt(e.target.value) || 5000 })}
                      className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setEditingRack(null)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg font-bold shadow-sm"
                  >
                    {saving ? 'Saving...' : 'Save Rack Specification'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
