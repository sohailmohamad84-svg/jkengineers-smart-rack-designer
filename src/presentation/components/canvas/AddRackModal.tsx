'use client';

import React, { useState, useEffect } from 'react';
import { RackSpecification } from '@/domain/entities/Rack';
import { X, Plus, Search, Layers, ShieldCheck, Box, RefreshCw } from 'lucide-react';

interface AddRackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddRack: (rack: RackSpecification) => void;
  storeTypeCode?: string;
}

export const AddRackModal: React.FC<AddRackModalProps> = ({
  isOpen,
  onClose,
  onAddRack,
  storeTypeCode = 'GENERAL_RETAIL',
}) => {
  const [racks, setRacks] = useState<RackSpecification[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  useEffect(() => {
    if (!isOpen) return;

    const fetchCatalogue = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/racks/catalogue?storeType=${encodeURIComponent(storeTypeCode)}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.racks)) {
          setRacks(data.racks);
        }
      } catch (err) {
        console.error('Failed to load rack catalogue:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCatalogue();
  }, [isOpen, storeTypeCode]);

  if (!isOpen) return null;

  const categories = [
    { id: 'ALL', label: 'All Fixtures' },
    { id: 'WALL_RACK', label: 'Wall Units' },
    { id: 'GONDOLA_RACK', label: 'Center Gondolas' },
    { id: 'END_RACK', label: 'End Caps' },
    { id: 'CHECKOUT_COUNTER', label: 'Counters & Desks' },
    { id: 'MEDICAL_RACK', label: 'Medical Racks' },
    { id: 'GARMENT_RACK', label: 'Garment Displays' },
  ];

  const filteredRacks = racks.filter((r) => {
    const matchesCategory = selectedCategory === 'ALL' || r.category === selectedCategory;
    const matchesSearch =
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden text-white">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-600/20 text-brand-400 flex items-center justify-center border border-brand-500/30">
              <Box className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Add Fixture to Shop Floor</h3>
              <p className="text-xs text-slate-400">
                Select a standard JK Engineers engineered modular rack unit from the catalogue
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/50 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by fixture name or code (e.g. Gondola, Wall Rack, Cashier)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat.id
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Rack List */}
        <div className="p-6 overflow-y-auto flex-1 space-y-3">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin text-brand-400 mb-2" />
              <p className="text-xs">Loading JK Engineers catalogue...</p>
            </div>
          ) : filteredRacks.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <p className="text-sm font-medium">No fixtures found matching your criteria.</p>
              <p className="text-xs text-slate-500 mt-1">Try changing your search query or category filter.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredRacks.map((rack) => (
                <div
                  key={rack.id}
                  className="bg-slate-950/80 border border-slate-800 hover:border-brand-500/50 rounded-lg p-4 transition-all hover:bg-slate-800/40 flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-[10px] font-mono font-semibold text-brand-400 bg-brand-950/80 border border-brand-800/60 px-2 py-0.5 rounded">
                        {rack.code}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {rack.isDoubleSided ? 'Double-Sided' : 'Single-Sided'}
                      </span>
                    </div>

                    <h4 className="font-bold text-sm text-slate-100 group-hover:text-brand-300 transition-colors">
                      {rack.name}
                    </h4>

                    <div className="grid grid-cols-2 gap-2 mt-3 text-[11px] text-slate-300">
                      <div>
                        <span className="text-slate-500">Dimensions:</span>
                        <p className="font-mono">{rack.defaultWidthMm} × {rack.defaultDepthMm} × {rack.defaultHeightMm} mm</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Capacity:</span>
                        <p className="text-emerald-400 font-medium">{rack.loadCapacityKg} kg / shelf</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Shelves:</span>
                        <p>{rack.defaultShelves} Tiers</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Base Cost:</span>
                        <p className="font-bold text-white">₹{rack.baseCost.toLocaleString('en-IN')}</p>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onAddRack(rack);
                      onClose();
                    }}
                    className="mt-4 w-full flex items-center justify-center space-x-1.5 bg-brand-600 hover:bg-brand-500 text-white font-semibold py-1.5 px-3 rounded-md text-xs transition-all shadow-sm group-hover:shadow-brand-500/20"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add to Layout</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-400">
          <span>Tata/JSW Heavy-Gauge Steel with 7-Tank Powder Coating</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
