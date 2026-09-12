'use client';

import React from 'react';
import { PlacedRack } from '@/domain/entities/Rack';
import {
  Move,
  RotateCw,
  Trash2,
  Plus,
  Save,
  Grid,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Eye,
} from 'lucide-react';

interface ArrangeToolbarProps {
  isArrangeMode: boolean;
  onToggleArrangeMode: () => void;
  gridSizeMm: number;
  onChangeGridSize: (gridSize: number) => void;
  selectedRack: PlacedRack | null;
  onRotateRack?: () => void;
  onDeleteRack?: () => void;
  onOpenAddRackModal?: () => void;
  onSaveArrangement?: () => void;
  isSaving?: boolean;
  isRepricing?: boolean;
  isDirty?: boolean;
}

export const ArrangeToolbar: React.FC<ArrangeToolbarProps> = ({
  isArrangeMode,
  onToggleArrangeMode,
  gridSizeMm,
  onChangeGridSize,
  selectedRack,
  onRotateRack,
  onDeleteRack,
  onOpenAddRackModal,
  onSaveArrangement,
  isSaving = false,
  isRepricing = false,
  isDirty = false,
}) => {
  return (
    <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-md">
      {/* Left: Mode Toggle & Grid Control */}
      <div className="flex items-center flex-wrap gap-2.5">
        <button
          type="button"
          onClick={onToggleArrangeMode}
          className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all shadow-sm ${
            isArrangeMode
              ? 'bg-brand-600 hover:bg-brand-500 text-white ring-2 ring-brand-400/50'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
          }`}
        >
          {isArrangeMode ? <Move className="w-3.5 h-3.5 animate-pulse text-amber-300" /> : <Eye className="w-3.5 h-3.5" />}
          <span>{isArrangeMode ? 'Arrange Mode Active' : 'Arrange Racks'}</span>
        </button>

        {isArrangeMode && (
          <div className="flex items-center space-x-1.5 bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800 text-xs">
            <Grid className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400 text-[11px] font-medium mr-1">Snap Grid:</span>
            {[
              { label: '100mm', val: 100 },
              { label: '250mm', val: 250 },
              { label: '500mm', val: 500 },
              { label: 'Off', val: 0 },
            ].map((g) => (
              <button
                key={g.val}
                type="button"
                onClick={() => onChangeGridSize(g.val)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                  gridSizeMm === g.val
                    ? 'bg-brand-700 text-white font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        )}

        {isArrangeMode && onOpenAddRackModal && (
          <button
            type="button"
            onClick={onOpenAddRackModal}
            className="flex items-center space-x-1.5 bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-md text-xs font-semibold shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Rack</span>
          </button>
        )}
      </div>

      {/* Center: Selected Rack Actions (Rotate & Delete) */}
      {isArrangeMode && selectedRack && (
        <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-1 rounded-md border border-slate-700/60 text-xs animate-in fade-in">
          <span className="text-slate-300 font-medium truncate max-w-[150px]">
            {selectedRack.label || selectedRack.rackTypeName}
          </span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-400 font-mono text-[11px]">{selectedRack.rotation || 0}°</span>

          {onRotateRack && (
            <button
              type="button"
              onClick={onRotateRack}
              title="Rotate 90 degrees"
              className="flex items-center space-x-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white px-2.5 py-1 rounded border border-slate-700 text-xs transition-colors"
            >
              <RotateCw className="w-3.5 h-3.5 text-brand-400" />
              <span>Rotate 90°</span>
            </button>
          )}

          {onDeleteRack && (
            <button
              type="button"
              onClick={onDeleteRack}
              title="Delete selected rack"
              className="flex items-center space-x-1 bg-red-950/60 hover:bg-red-900 text-red-300 px-2.5 py-1 rounded border border-red-800 text-xs transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
              <span>Delete</span>
            </button>
          )}
        </div>
      )}

      {/* Right: Repricing Status & Save Version Button */}
      <div className="flex items-center gap-3">
        {isRepricing ? (
          <div className="flex items-center space-x-1.5 text-amber-400 text-xs">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span className="font-medium">Calculating BOM...</span>
          </div>
        ) : isDirty ? (
          <div className="flex items-center space-x-1 text-slate-400 text-xs">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-amber-300/90 text-[11px]">Unsaved version changes</span>
          </div>
        ) : (
          <div className="flex items-center space-x-1 text-emerald-400 text-xs">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="text-slate-400 text-[11px]">JK Deterministic BOM Synced</span>
          </div>
        )}

        {isArrangeMode && onSaveArrangement && (
          <button
            type="button"
            onClick={onSaveArrangement}
            disabled={isSaving}
            className="flex items-center space-x-1.5 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-bold px-3.5 py-1.5 rounded-md text-xs shadow-md transition-all disabled:opacity-50"
          >
            {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>{isSaving ? 'Saving Version...' : 'Save Arrangement'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
