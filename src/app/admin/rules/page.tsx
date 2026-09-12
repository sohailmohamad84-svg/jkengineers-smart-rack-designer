'use client';

import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/presentation/components/admin/AdminLayout';
import {
  Sliders,
  Shield,
  Save,
  Plus,
  Edit2,
  CheckCircle,
  AlertCircle,
  Store,
  X,
  Compass,
} from 'lucide-react';

export default function AdminDesignRulesPage() {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [storeTypes, setStoreTypes] = useState<any[]>([]);

  const [savingSettings, setSavingSettings] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Store Type Modal
  const [editingStoreType, setEditingStoreType] = useState<any>(null);
  const [storeFormData, setStoreFormData] = useState({
    code: '',
    name: '',
    description: '',
    minAisleWidthMm: 1000,
    defaultRackHeightMm: 2100,
    active: true,
  });
  const [savingStoreType, setSavingStoreType] = useState(false);

  const loadData = async () => {
    try {
      const res = await fetch('/api/admin/rules');
      const data = await res.json();
      if (data.success) {
        const map: Record<string, string> = {};
        for (const s of data.settings) {
          map[s.settingKey] = s.settingValue;
        }
        setSettings(map);
        setStoreTypes(data.storeTypes);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setStatusMessage('');
    setErrorMessage('');

    const payload = Object.entries(settings).map(([settingKey, settingValue]) => ({
      settingKey,
      settingValue,
    }));

    try {
      const res = await fetch('/api/admin/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: payload }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage('Spatial design rules and GST configurations saved successfully.');
        setTimeout(() => setStatusMessage(''), 3000);
      } else {
        setErrorMessage(data.message || 'Failed to save settings.');
      }
    } catch {
      setErrorMessage('Network error while saving settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleOpenStoreModal = (st?: any) => {
    if (st) {
      setEditingStoreType(st);
      setStoreFormData({
        code: st.code,
        name: st.name,
        description: st.description,
        minAisleWidthMm: st.minAisleWidthMm,
        defaultRackHeightMm: st.defaultRackHeightMm,
        active: st.active,
      });
    } else {
      setEditingStoreType({ isNew: true });
      setStoreFormData({
        code: '',
        name: '',
        description: '',
        minAisleWidthMm: 1000,
        defaultRackHeightMm: 2100,
        active: true,
      });
    }
  };

  const handleSaveStoreType = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingStoreType(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/admin/rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(storeFormData),
      });
      const data = await res.json();
      if (data.success) {
        setEditingStoreType(null);
        loadData();
      } else {
        setErrorMessage(data.message || 'Failed to save store type');
      }
    } catch {
      setErrorMessage('Network error while saving store type.');
    } finally {
      setSavingStoreType(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand-400">Spatial Layout Engine</span>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Design Rules & Store Types Administration
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure clearance safety limits, fire aisle minimums, and add dynamic retail store categories (Rules 8 & 34).
          </p>
        </div>

        {statusMessage && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Section 1: Global Safety & Layout Rules */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <Compass className="w-5 h-5 text-brand-400" />
              <h2 className="text-base font-bold text-white">Global Architectural & Safety Rules</h2>
            </div>
            <span className="text-xs text-slate-500 font-mono">Calibrates RackDesignEngine</span>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                  Absolute Minimum Aisle Width (mm)
                </label>
                <input
                  type="number"
                  min="600"
                  max="2000"
                  value={settings['MIN_SAFE_AISLE_MM'] || '800'}
                  onChange={(e) => setSettings({ ...settings, MIN_SAFE_AISLE_MM: e.target.value })}
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono font-bold"
                />
                <p className="text-[10px] text-slate-500 mt-1">Fire egress code requires at least 750-800mm.</p>
              </div>

              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                  Door Swing Clearance Buffer (mm)
                </label>
                <input
                  type="number"
                  min="150"
                  max="800"
                  value={settings['DOOR_BUFFER_MM'] || '300'}
                  onChange={(e) => setSettings({ ...settings, DOOR_BUFFER_MM: e.target.value })}
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono font-bold"
                />
                <p className="text-[10px] text-slate-500 mt-1">Buffer distance between rack sides and door edges.</p>
              </div>

              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                  Standard GST Rate (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="28"
                  value={settings['GST_RATE_PERCENTAGE'] || '18'}
                  onChange={(e) => setSettings({ ...settings, GST_RATE_PERCENTAGE: e.target.value })}
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono font-bold"
                />
                <p className="text-[10px] text-slate-500 mt-1">Current statutory Indian GST on fabrication goods.</p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={savingSettings}
                className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs rounded-lg transition-colors flex items-center shadow-sm"
              >
                <Save className="w-3.5 h-3.5 mr-1.5" />
                {savingSettings ? 'Saving...' : 'Save Global Rules'}
              </button>
            </div>
          </form>
        </div>

        {/* Section 2: Store Types Administration (Rule 8) */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Store className="w-5 h-5 text-brand-400" />
              <div>
                <h2 className="text-base font-bold text-white">Configured Store Categories</h2>
                <p className="text-xs text-slate-400">
                  Add new business types anytime without redeploying code (Rule 8).
                </p>
              </div>
            </div>

            <button
              onClick={() => handleOpenStoreModal()}
              className="px-3.5 py-2 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs rounded-lg transition-colors flex items-center shadow-sm"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add Business Type
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="p-3.5">Category Code & Name</th>
                  <th className="p-3.5">Description</th>
                  <th className="p-3.5">Default Min Aisle (mm)</th>
                  <th className="p-3.5">Default Rack Height (mm)</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {storeTypes.map((st) => (
                  <tr key={st.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="p-3.5">
                      <span className="font-mono text-[10px] text-brand-400 font-bold block">{st.code}</span>
                      <span className="font-bold text-white block">{st.name}</span>
                    </td>
                    <td className="p-3.5 text-slate-400 max-w-sm truncate">{st.description}</td>
                    <td className="p-3.5 font-mono text-white font-bold">{st.minAisleWidthMm} mm</td>
                    <td className="p-3.5 font-mono text-slate-300">{st.defaultRackHeightMm} mm</td>
                    <td className="p-3.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${st.active ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-800 text-slate-500 border-slate-700'}`}>
                        {st.active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => handleOpenStoreModal(st)}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded border border-slate-700 text-[11px] font-semibold inline-flex items-center"
                      >
                        <Edit2 className="w-3 h-3 mr-1" />
                        Edit Rules
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Store Type Modal */}
        {editingStoreType && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 text-white shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <Store className="w-5 h-5 text-brand-400" />
                  <h3 className="text-base font-bold">
                    {editingStoreType.isNew ? 'Add New Store Category' : `Edit: ${storeFormData.name}`}
                  </h3>
                </div>
                <button onClick={() => setEditingStoreType(null)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveStoreType} className="space-y-3 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Unique Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. FOOTWEAR_STORE"
                    value={storeFormData.code}
                    disabled={!editingStoreType.isNew}
                    onChange={(e) => setStoreFormData({ ...storeFormData, code: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Display Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Footwear & Shoes Retail"
                    value={storeFormData.name}
                    onChange={(e) => setStoreFormData({ ...storeFormData, name: e.target.value })}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Description</label>
                  <textarea
                    rows={2}
                    placeholder="Short summary of customer movement and fixture requirements..."
                    value={storeFormData.description}
                    onChange={(e) => setStoreFormData({ ...storeFormData, description: e.target.value })}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Min Aisle (mm) *</label>
                    <input
                      type="number"
                      min="750"
                      value={storeFormData.minAisleWidthMm}
                      onChange={(e) => setStoreFormData({ ...storeFormData, minAisleWidthMm: parseInt(e.target.value) || 1000 })}
                      className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Default Height (mm) *</label>
                    <input
                      type="number"
                      min="1500"
                      value={storeFormData.defaultRackHeightMm}
                      onChange={(e) => setStoreFormData({ ...storeFormData, defaultRackHeightMm: parseInt(e.target.value) || 2100 })}
                      className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setEditingStoreType(null)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingStoreType}
                    className="px-5 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg font-bold shadow-sm"
                  >
                    {savingStoreType ? 'Saving...' : 'Save Store Category'}
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
