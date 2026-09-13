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
  Box,
  Compass,
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
  viewMode?: '2D' | '3D';
  onToggleViewMode?: (mode: '2D' | '3D') => void;
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
  viewMode = '2D',
  onToggleViewMode,
}) => {
  return (
    <div className="bg-slate-900 border-b border-slate-800 flex flex-col shadow-md shrink-0 select-none">
      {/* Primary Toolbar Row (Row 1) */}
      <div className="px-3 sm:px-4 py-2.5 flex items-center justify-between gap-3 flex-nowrap">
        {/* Left: View Mode (2D / 3D) + Mode Toggle + Add Rack */}
        <div className="flex items-center space-x-2 shrink-0 overflow-x-auto py-0.5">
          {/* 2D / 3D View Switcher */}
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 shadow-inner shrink-0">
            <button
              type="button"
              onClick={() => onToggleViewMode?.('2D')}
              title="Switch to 2D Floor Plan CAD Layout"
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all shrink-0 ${
                viewMode === '2D'
                  ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Compass className="w-3.5 h-3.5 text-brand-400" />
              <span>2D Plan</span>
            </button>
            <button
              type="button"
              onClick={() => onToggleViewMode?.('3D')}
              title="Switch to Interactive 3D Photorealistic Store View"
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all shrink-0 ${
                viewMode === '3D'
                  ? 'bg-brand-600 text-white shadow-md ring-1 ring-brand-400/50'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Box className="w-3.5 h-3.5 text-amber-300" />
              <span>3D View</span>
            </button>
          </div>

          <div className="h-5 w-px bg-slate-800 shrink-0" />

          {viewMode === '2D' && (
            <button
              type="button"
              onClick={onToggleArrangeMode}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all shadow-sm shrink-0 ${
                isArrangeMode
                  ? 'bg-amber-600 hover:bg-amber-500 text-white ring-2 ring-amber-400/50'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              }`}
            >
              {isArrangeMode ? (
                <Move className="w-3.5 h-3.5 animate-pulse text-amber-200" />
              ) : (
                <Eye className="w-3.5 h-3.5" />
              )}
              <span>{isArrangeMode ? 'Arrange Mode Active' : 'Arrange Racks'}</span>
            </button>
          )}

          {isArrangeMode && onOpenAddRackModal && (
            <button
              type="button"
              onClick={onOpenAddRackModal}
              className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1.5 rounded-md text-xs font-semibold shadow-sm transition-all shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Rack</span>
            </button>
          )}
        </div>

        {/* Right: Repricing Status & Save Version Button (ALWAYS VISIBLE!) */}
        <div className="flex items-center space-x-2.5 shrink-0 ml-auto">
          {isArrangeMode && (
            <>
              {isRepricing ? (
                <div className="flex items-center space-x-1.5 text-amber-400 text-xs px-2.5 py-1 bg-amber-950/40 rounded border border-amber-800/60 shrink-0">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span className="font-medium text-[11px] hidden sm:inline">Calculating BOM...</span>
                </div>
              ) : isDirty ? (
                <div className="flex items-center space-x-1 text-amber-300 text-xs px-2.5 py-1 bg-amber-950/40 rounded border border-amber-800/60 shrink-0">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[11px] font-medium hidden sm:inline">Unsaved changes</span>
                </div>
              ) : (
                <div className="hidden md:flex items-center space-x-1 text-emerald-400 text-xs px-2.5 py-1 bg-emerald-950/30 rounded border border-emerald-900/50 shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span className="text-slate-300 text-[11px]">BOM Synced</span>
                </div>
              )}
            </>
          )}

          {isArrangeMode && onSaveArrangement && (
            <button
              type="button"
              onClick={onSaveArrangement}
              disabled={isSaving}
              title="Save this arrangement as a new version"
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-md text-xs font-bold transition-all shadow-md shrink-0 ${
                isDirty
                  ? 'bg-gradient-to-r from-brand-600 via-amber-600 to-brand-500 hover:from-brand-500 hover:to-amber-500 text-white ring-2 ring-amber-400/60 shadow-amber-500/20'
                  : 'bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white'
              } disabled:opacity-50`}
            >
              {isSaving ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>{isSaving ? 'Saving Version...' : 'Save Arrangement'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Secondary Arrange Utility Bar (Row 2: Only when Arrange Mode is Active) */}
      {isArrangeMode && viewMode === '2D' && (
        <div className="bg-slate-950/90 border-t border-slate-800/80 px-3 sm:px-4 py-1.5 flex items-center justify-between gap-3 text-xs flex-wrap sm:flex-nowrap">
          {/* Left: Snap Grid Controls */}
          <div className="flex items-center space-x-1.5 shrink-0">
            <Grid className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-slate-400 text-[11px] font-medium mr-0.5">Snap Grid:</span>
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
                className={`px-1.5 py-0.5 rounded text-[11px] font-mono transition-colors ${
                  gridSizeMm === g.val
                    ? 'bg-brand-600 text-white font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>

          {/* Right: Selected Fixture Quick Actions OR Hint */}
          <div className="flex items-center space-x-2 shrink-0 ml-auto">
            {selectedRack ? (
              <div className="flex items-center gap-2 bg-slate-900 px-2.5 py-1 rounded border border-slate-700/80 text-xs">
                <span className="text-slate-300 font-medium truncate max-w-[130px] sm:max-w-[200px] text-[11px]">
                  {selectedRack.label || selectedRack.rackTypeName}
                </span>
                <span className="text-slate-600">|</span>
                <span className="text-amber-400 font-mono text-[11px]">{selectedRack.rotation || 0}°</span>

                {onRotateRack && (
                  <button
                    type="button"
                    onClick={onRotateRack}
                    title="Rotate 90 degrees (Shortcut: R)"
                    className="flex items-center space-x-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white px-2 py-0.5 rounded border border-slate-700 text-[11px] transition-colors"
                  >
                    <RotateCw className="w-3 h-3 text-brand-400" />
                    <span>Rotate 90°</span>
                  </button>
                )}

                {onDeleteRack && (
                  <button
                    type="button"
                    onClick={onDeleteRack}
                    title="Delete selected rack (Shortcut: Del)"
                    className="flex items-center space-x-1 bg-red-950/60 hover:bg-red-900 text-red-300 px-2 py-0.5 rounded border border-red-800 text-[11px] transition-colors"
                  >
                    <Trash2 className="w-3 h-3 text-red-400" />
                    <span>Delete</span>
                  </button>
                )}
              </div>
            ) : (
              <span className="hidden md:inline-block text-[11px] text-slate-400 italic">
                Click any rack to move, rotate, or delete • Drag to reposition
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
