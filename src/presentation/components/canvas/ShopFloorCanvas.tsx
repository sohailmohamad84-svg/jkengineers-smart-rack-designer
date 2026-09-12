'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { PlacedRack, RackSpecification } from '@/domain/entities/Rack';
import { ShopSpecification } from '@/domain/entities/Shop';
import { PlacementValidator, ValidationResult } from '@/domain/services/PlacementValidator';
import { ArrangeToolbar } from './ArrangeToolbar';
import { AddRackModal } from './AddRackModal';
import { ShopFloor3DCanvas } from './ShopFloor3DCanvas';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Tag,
  X,
  AlertTriangle,
} from 'lucide-react';

export interface ShopFloorCanvasProps {
  shop: ShopSpecification;
  racks: PlacedRack[];
  aisleWidthMm?: number;
  highlightedRackCode?: string;
  onSelectRack?: (rack: PlacedRack | null) => void;
  // Arrange Mode Props
  isArrangeMode?: boolean;
  onToggleArrangeMode?: () => void;
  onRacksChange?: (racks: PlacedRack[]) => void;
  storeTypeCode?: string;
  onSaveArrangement?: () => void;
  isSaving?: boolean;
  isRepricing?: boolean;
  isDirty?: boolean;
  initialViewMode?: '2D' | '3D';
}

export const ShopFloorCanvas: React.FC<ShopFloorCanvasProps> = ({
  shop,
  racks,
  aisleWidthMm = 1000,
  onSelectRack,
  isArrangeMode = false,
  onToggleArrangeMode,
  onRacksChange,
  storeTypeCode = 'GENERAL_RETAIL',
  onSaveArrangement,
  isSaving = false,
  isRepricing = false,
  isDirty = false,
  initialViewMode = '2D',
}) => {
  const [viewMode, setViewMode] = useState<'2D' | '3D'>(initialViewMode);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.08); // mm to canvas pixels
  const [pan, setPan] = useState({ x: 50, y: 50 });

  // Canvas Pan Dragging
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Grid Snapping (mm)
  const [gridSizeMm, setGridSizeMm] = useState(250);

  // Fixture Selection & Add Modal
  const [selectedRackIndex, setSelectedRackIndex] = useState<number | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Rack Dragging State
  const [draggingRackIndex, setDraggingRackIndex] = useState<number | null>(null);
  const [dragOffsetMm, setDragOffsetMm] = useState({ x: 0, y: 0 });
  const [candidateRack, setCandidateRack] = useState<PlacedRack | null>(null);
  const [candidateValidation, setCandidateValidation] = useState<ValidationResult | null>(null);

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // View Toggles
  const [showDimensions, setShowDimensions] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [showAisles, setShowAisles] = useState(true);
  const [showGrid, setShowGrid] = useState(true);

  const { lengthMm, breadthMm } = shop.dimensions;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Auto-fit canvas helper
  const fitCanvas = useCallback(() => {
    if (!containerRef.current) return;
    const containerWidth = containerRef.current.clientWidth || 800;
    const containerHeight = containerRef.current.clientHeight || 520;

    // Generous clearance padding for dimension text, walls, controls, and legend
    // Top clearance: ~90px (controls bar at top-16 + length dimension line)
    // Bottom clearance: ~70px (outer 200mm architectural wall + margin above bottom legend)
    // Left/Right clearance: ~80px (breadth dimension line + outer walls + margin)
    const paddingX = 180;
    const paddingY = 180;
    const effectiveLength = lengthMm + 400; // includes 200mm outer architectural wall on both sides
    const effectiveBreadth = breadthMm + 400; // includes 200mm outer architectural wall on both sides

    const scaleX = (containerWidth - paddingX) / effectiveLength;
    const scaleY = (containerHeight - paddingY) / effectiveBreadth;
    const autoScale = Math.min(Math.max(0.02, Math.min(scaleX, scaleY)), 0.18);

    setScale(autoScale);

    const renderedWidth = lengthMm * autoScale;
    const renderedHeight = breadthMm * autoScale;

    setPan({
      x: Math.round((containerWidth - renderedWidth) / 2),
      y: Math.round(Math.max(80, (containerHeight - renderedHeight) / 2)),
    });
  }, [lengthMm, breadthMm]);

  // Auto-fit canvas on initial render and dimension change, with ResizeObserver for responsive layout
  useEffect(() => {
    fitCanvas();

    const element = containerRef.current;
    if (!element || typeof ResizeObserver === 'undefined') return;

    let timeoutId: ReturnType<typeof setTimeout>;
    const observer = new ResizeObserver((entries) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        for (const entry of entries) {
          if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
            fitCanvas();
          }
        }
      }, 150);
    });

    observer.observe(element);
    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, [fitCanvas]);

  // Handle selected rack synchronization
  const selectedRack = selectedRackIndex !== null && racks[selectedRackIndex] ? racks[selectedRackIndex] : null;

  const handleSelectRack = (rack: PlacedRack | null, index: number | null) => {
    setSelectedRackIndex(index);
    if (onSelectRack) onSelectRack(rack);
  };

  // Zoom handlers
  const handleZoom = (delta: number) => {
    setScale((prev) => Math.min(0.4, Math.max(0.02, prev + delta)));
  };

  const handleResetZoom = () => {
    fitCanvas();
  };

  // Canvas Mouse / Touch Down (Pan)
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (draggingRackIndex !== null) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (draggingRackIndex !== null) return;
    if (e.touches.length === 1) {
      setIsPanning(true);
      setPanStart({ x: e.touches[0].clientX - pan.x, y: e.touches[0].clientY - pan.y });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];

    if (draggingRackIndex !== null && isArrangeMode) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const mouseX = touch.clientX - rect.left;
      const mouseY = touch.clientY - rect.top;
      const mmX = (mouseX - pan.x) / scale;
      const mmY = (mouseY - pan.y) / scale;

      const rawCandidateX = mmX - dragOffsetMm.x;
      const rawCandidateY = mmY - dragOffsetMm.y;

      const snappedX = PlacementValidator.snapToGrid(rawCandidateX, gridSizeMm);
      const snappedY = PlacementValidator.snapToGrid(rawCandidateY, gridSizeMm);

      const activeRack = racks[draggingRackIndex];
      const updatedCandidate: PlacedRack = {
        ...activeRack,
        posX: snappedX,
        posY: snappedY,
      };

      const validation = PlacementValidator.validateRackPlacement(
        updatedCandidate,
        racks,
        shop,
        draggingRackIndex
      );

      setCandidateRack(updatedCandidate);
      setCandidateValidation(validation);
      return;
    }

    if (isPanning) {
      setPan({
        x: touch.clientX - panStart.x,
        y: touch.clientY - panStart.y,
      });
    }
  };

  // Canvas Mouse Move (Pan OR Rack Drag)
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      // 1. Handling Rack Dragging
      if (draggingRackIndex !== null && isArrangeMode) {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;

        // Current pointer in canvas mm space
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const mmX = (mouseX - pan.x) / scale;
        const mmY = (mouseY - pan.y) / scale;

        const rawCandidateX = mmX - dragOffsetMm.x;
        const rawCandidateY = mmY - dragOffsetMm.y;

        const snappedX = PlacementValidator.snapToGrid(rawCandidateX, gridSizeMm);
        const snappedY = PlacementValidator.snapToGrid(rawCandidateY, gridSizeMm);

        const activeRack = racks[draggingRackIndex];
        const updatedCandidate: PlacedRack = {
          ...activeRack,
          posX: snappedX,
          posY: snappedY,
        };

        const validation = PlacementValidator.validateRackPlacement(
          updatedCandidate,
          racks,
          shop,
          draggingRackIndex
        );

        setCandidateRack(updatedCandidate);
        setCandidateValidation(validation);
        return;
      }

      // 2. Handling Canvas Pan
      if (isPanning) {
        setPan({
          x: e.clientX - panStart.x,
          y: e.clientY - panStart.y,
        });
      }
    },
    [draggingRackIndex, isArrangeMode, pan, scale, dragOffsetMm, gridSizeMm, racks, shop, isPanning, panStart]
  );

  // Mouse Up (Commit or Revert Rack Drag, or End Pan)
  const handleMouseUp = useCallback(() => {
    if (draggingRackIndex !== null) {
      if (candidateRack && candidateValidation && candidateValidation.isValid) {
        // Valid drop: commit new position
        const updatedRacks = [...racks];
        updatedRacks[draggingRackIndex] = {
          ...candidateRack,
        };
        if (onRacksChange) onRacksChange(updatedRacks);
      } else if (candidateValidation && !candidateValidation.isValid) {
        // Invalid drop: auto-revert to previous position!
        showToast(`Cannot place rack: ${candidateValidation.message || 'Invalid collision'}`);
      }

      setDraggingRackIndex(null);
      setCandidateRack(null);
      setCandidateValidation(null);
    }

    setIsPanning(false);
  }, [draggingRackIndex, candidateRack, candidateValidation, racks, onRacksChange]);

  // Rack Drag Start
  const handleRackDragStart = (
    e: React.MouseEvent | React.TouchEvent,
    rack: PlacedRack,
    index: number
  ) => {
    e.stopPropagation();
    handleSelectRack(rack, index);

    if (!isArrangeMode) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;
    const mmX = (mouseX - pan.x) / scale;
    const mmY = (mouseY - pan.y) / scale;

    setDragOffsetMm({
      x: mmX - rack.posX,
      y: mmY - rack.posY,
    });
    setDraggingRackIndex(index);
    setCandidateRack(rack);
    setCandidateValidation({ isValid: true });
  };

  // Rotate Selected Rack
  const handleRotateSelected = () => {
    if (selectedRackIndex === null || !racks[selectedRackIndex]) return;

    const currentRack = racks[selectedRackIndex];
    const newRotation = ((currentRack.rotation || 0) + 90) % 360;

    const candidate: PlacedRack = {
      ...currentRack,
      rotation: newRotation,
    };

    const validation = PlacementValidator.validateRackPlacement(
      candidate,
      racks,
      shop,
      selectedRackIndex
    );

    if (!validation.isValid) {
      showToast(`Cannot rotate: ${validation.message || 'Obstructed'}`);
      return;
    }

    const updatedRacks = [...racks];
    updatedRacks[selectedRackIndex] = candidate;
    if (onRacksChange) onRacksChange(updatedRacks);
    handleSelectRack(candidate, selectedRackIndex);
  };

  // Delete Selected Rack
  const handleDeleteSelected = () => {
    if (selectedRackIndex === null || !racks[selectedRackIndex]) return;
    const target = racks[selectedRackIndex];

    if (target.category === 'CHECKOUT_COUNTER') {
      const ok = window.confirm(
        'Are you sure you want to remove the Cashier / Billing Counter? It is recommended for store operations.'
      );
      if (!ok) return;
    }

    const updatedRacks = racks.filter((_, idx) => idx !== selectedRackIndex);
    handleSelectRack(null, null);
    if (onRacksChange) onRacksChange(updatedRacks);
  };

  // Add Fixture to Layout
  const handleAddFixture = (spec: RackSpecification) => {
    // Initial position: center of shop snapped to grid
    let placedX = Math.max(200, Math.round((lengthMm - spec.defaultWidthMm) / 2));
    let placedY = Math.max(200, Math.round((breadthMm - spec.defaultDepthMm) / 2));
    placedX = PlacementValidator.snapToGrid(placedX, gridSizeMm);
    placedY = PlacementValidator.snapToGrid(placedY, gridSizeMm);

    const newRack: PlacedRack = {
      rackTypeCode: spec.code,
      rackTypeName: spec.name,
      category: spec.category,
      label: `${spec.name} ${racks.length + 1}`,
      posX: placedX,
      posY: placedY,
      rotation: 0,
      widthMm: spec.defaultWidthMm,
      depthMm: spec.defaultDepthMm,
      heightMm: spec.defaultHeightMm,
      shelvesCount: spec.defaultShelves,
      loadCapacityKg: spec.loadCapacityKg,
      isDoubleSided: spec.isDoubleSided,
    };

    // Find collision-free spot by stepping if needed
    let step = 0;
    let validRack = { ...newRack };
    let validation = PlacementValidator.validateRackPlacement(validRack, racks, shop);

    while (!validation.isValid && step < 20) {
      step++;
      const shiftX = (step % 4) * 300;
      const shiftY = Math.floor(step / 4) * 300;
      validRack.posX = Math.min(lengthMm - validRack.widthMm, placedX + shiftX);
      validRack.posY = Math.min(breadthMm - validRack.depthMm, placedY + shiftY);
      validation = PlacementValidator.validateRackPlacement(validRack, racks, shop);
    }

    const updated = [...racks, validRack];
    if (onRacksChange) onRacksChange(updated);
    handleSelectRack(validRack, updated.length - 1);
    showToast(`Added ${spec.name} to layout.`);
  };

  // Keyboard Shortcuts (Delete, Rotate)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isArrangeMode || selectedRackIndex === null) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleDeleteSelected();
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        handleRotateSelected();
      } else if (e.key === 'Escape') {
        handleSelectRack(null, null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isArrangeMode, selectedRackIndex, racks]);

  // Color helper for rack categories
  const getRackColor = (category: string) => {
    switch (category) {
      case 'WALL_RACK':
        return { fill: '#1e3a8a', stroke: '#172554', text: '#ffffff', badge: 'bg-blue-900 text-blue-100' };
      case 'GONDOLA_RACK':
        return { fill: '#0f766e', stroke: '#134e4a', text: '#ffffff', badge: 'bg-teal-900 text-teal-100' };
      case 'END_RACK':
        return { fill: '#d97706', stroke: '#92400e', text: '#ffffff', badge: 'bg-amber-900 text-amber-100' };
      case 'CHECKOUT_COUNTER':
        return { fill: '#047857', stroke: '#064e3b', text: '#ffffff', badge: 'bg-emerald-900 text-emerald-100' };
      case 'MEDICAL_RACK':
        return { fill: '#4338ca', stroke: '#312e81', text: '#ffffff', badge: 'bg-indigo-900 text-indigo-100' };
      case 'GARMENT_RACK':
        return { fill: '#9333ea', stroke: '#581c87', text: '#ffffff', badge: 'bg-purple-900 text-purple-100' };
      default:
        return { fill: '#334155', stroke: '#1e293b', text: '#ffffff', badge: 'bg-slate-900 text-slate-100' };
    }
  };

  return (
    <div className="relative w-full h-[580px] min-h-[520px] bg-slate-900 rounded-xl overflow-hidden select-none border border-slate-700 shadow-xl flex flex-col">
      {/* Arrange Mode Toolbar */}
      <ArrangeToolbar
        isArrangeMode={isArrangeMode}
        onToggleArrangeMode={onToggleArrangeMode || (() => {})}
        gridSizeMm={gridSizeMm}
        onChangeGridSize={setGridSizeMm}
        selectedRack={selectedRack}
        onRotateRack={handleRotateSelected}
        onDeleteRack={handleDeleteSelected}
        onOpenAddRackModal={() => setIsAddModalOpen(true)}
        onSaveArrangement={onSaveArrangement}
        isSaving={isSaving}
        isRepricing={isRepricing}
        isDirty={isDirty}
        viewMode={viewMode}
        onToggleViewMode={setViewMode}
      />

      {viewMode === '3D' ? (
        <div className="w-full flex-1 relative overflow-hidden min-h-[440px]">
          <ShopFloor3DCanvas
            shop={shop}
            racks={racks}
            selectedRackIndex={selectedRackIndex}
            onSelectRack={handleSelectRack}
            aisleWidthMm={aisleWidthMm}
          />
        </div>
      ) : (
        <>
          {/* Canvas Top Bar Controls */}
          <div className="absolute top-16 left-3 right-3 z-20 flex items-center justify-between pointer-events-none">
        {/* Left: View Controls */}
        <div className="flex items-center space-x-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-lg border border-slate-700 pointer-events-auto shadow-md">
          <button
            onClick={() => handleZoom(0.02)}
            title="Zoom In"
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleZoom(-0.02)}
            title="Zoom Out"
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleResetZoom}
            title="Fit to Screen"
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <div className="h-4 w-px bg-slate-700 mx-1" />
          <span className="text-[11px] font-mono font-medium text-slate-400 px-1">
            {Math.round(scale * 1000)}%
          </span>
        </div>

        {/* Right: Feature Toggles */}
        <div className="flex items-center space-x-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-lg border border-slate-700 pointer-events-auto shadow-md">
          <button
            onClick={() => setShowDimensions(!showDimensions)}
            title="Toggle Dimension Annotations"
            className={`px-2 py-1 text-xs font-semibold rounded flex items-center space-x-1 transition-colors ${
              showDimensions
                ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>Dimensions</span>
          </button>
          <button
            onClick={() => setShowLabels(!showLabels)}
            title="Toggle Fixture Labels"
            className={`px-2 py-1 text-xs font-semibold rounded flex items-center space-x-1 transition-colors ${
              showLabels
                ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Tag className="w-3 h-3 mr-1" />
            <span>Labels</span>
          </button>
          <button
            onClick={() => setShowAisles(!showAisles)}
            title="Toggle Aisle Walking Corridors"
            className={`px-2 py-1 text-xs font-semibold rounded flex items-center space-x-1 transition-colors ${
              showAisles
                ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>Aisles</span>
          </button>
        </div>
      </div>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="absolute top-28 left-1/2 -translate-x-1/2 z-40 bg-red-900/90 backdrop-blur-md border border-red-700 text-red-100 text-xs px-4 py-2 rounded-lg shadow-xl flex items-center space-x-2 animate-in fade-in slide-in-from-top-2">
          <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* SVG Canvas Area */}
      <div
        ref={containerRef}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleMouseUp}
        className={`w-full flex-1 relative overflow-hidden min-h-[420px] ${
          draggingRackIndex !== null
            ? 'cursor-grabbing'
            : isArrangeMode
            ? 'cursor-default'
            : 'cursor-grab active:cursor-grabbing'
        }`}
      >
        <svg className="absolute inset-0 w-full h-full block">
          {/* Pattern Definitions */}
          <defs>
            <pattern
              id="grid"
              width={(gridSizeMm || 1000) * scale}
              height={(gridSizeMm || 1000) * scale}
              patternUnits="userSpaceOnUse"
            >
              <path
                d={`M ${(gridSizeMm || 1000) * scale} 0 L 0 0 0 ${(gridSizeMm || 1000) * scale}`}
                fill="none"
                stroke="#1e293b"
                strokeWidth="1"
                strokeDasharray="2,2"
              />
            </pattern>

            <pattern
              id="pillarHatch"
              width="8"
              height="8"
              patternTransform="rotate(45 0 0)"
              patternUnits="userSpaceOnUse"
            >
              <line x1="0" y1="0" x2="0" y2="8" stroke="#f59e0b" strokeWidth="2" />
            </pattern>
          </defs>

          {/* Master Viewport Pan Group */}
          <g transform={`translate(${pan.x}, ${pan.y})`}>
            {/* Grid Background */}
            {showGrid && (
              <rect
                x="-5000"
                y="-5000"
                width={lengthMm * scale + 10000}
                height={breadthMm * scale + 10000}
                fill="url(#grid)"
              />
            )}

            {/* Shop Floor Polygon */}
            <g>
            {/* Usable Floor Interior */}
            <rect
              x={0}
              y={0}
              width={lengthMm * scale}
              height={breadthMm * scale}
              fill="#0f172a"
              stroke="#475569"
              strokeWidth={3}
            />

            {/* Architectural Outer Wall Thickness (200mm standard) */}
            <rect
              x={-200 * scale}
              y={-200 * scale}
              width={(lengthMm + 400) * scale}
              height={(breadthMm + 400) * scale}
              fill="none"
              stroke="#334155"
              strokeWidth={4}
            />

            {/* Door Clearance Buffer Zones (Subtle dashed fill when in arrange mode) */}
            {isArrangeMode &&
              shop.openings.map((op, idx) => {
                const box = PlacementValidator.getOpeningBoundingBox(op, lengthMm, breadthMm);
                return (
                  <rect
                    key={`buffer-${idx}`}
                    x={box.minX * scale}
                    y={box.minY * scale}
                    width={(box.maxX - box.minX) * scale}
                    height={(box.maxY - box.minY) * scale}
                    fill="rgba(16, 185, 129, 0.06)"
                    stroke="#10b981"
                    strokeWidth={1}
                    strokeDasharray="3,3"
                  />
                );
              })}

            {/* Openings: Doors & Windows */}
            {shop.openings.map((op, idx) => {
              const isWindow = op.type === 'WINDOW';
              let x = 0, y = 0, w = 0, h = 0;
              let swingPath = '';

              switch (op.wall) {
                case 'NORTH':
                  x = op.distanceMm * scale;
                  y = -100 * scale;
                  w = op.widthMm * scale;
                  h = 200 * scale;
                  if (!isWindow) swingPath = `M ${x} 0 A ${w} ${w} 0 0 0 ${x + w} ${w}`;
                  break;
                case 'SOUTH':
                  x = op.distanceMm * scale;
                  y = (breadthMm - 100) * scale;
                  w = op.widthMm * scale;
                  h = 200 * scale;
                  if (!isWindow) swingPath = `M ${x} ${breadthMm * scale} A ${w} ${w} 0 0 1 ${x + w} ${(breadthMm - op.widthMm) * scale}`;
                  break;
                case 'WEST':
                  x = -100 * scale;
                  y = op.distanceMm * scale;
                  w = 200 * scale;
                  h = op.widthMm * scale;
                  if (!isWindow) swingPath = `M 0 ${y} A ${h} ${h} 0 0 0 ${h} ${y + h}`;
                  break;
                case 'EAST':
                  x = (lengthMm - 100) * scale;
                  y = op.distanceMm * scale;
                  w = 200 * scale;
                  h = op.widthMm * scale;
                  if (!isWindow) swingPath = `M ${lengthMm * scale} ${y} A ${h} ${h} 0 0 1 ${(lengthMm - op.widthMm) * scale} ${y + h}`;
                  break;
              }

              return (
                <g key={idx}>
                  <rect
                    x={x}
                    y={y}
                    width={w}
                    height={h}
                    fill={isWindow ? '#0284c7' : '#059669'}
                    stroke="#ffffff"
                    strokeWidth={1}
                  />

                  {!isWindow && swingPath && (
                    <path
                      d={swingPath}
                      fill="none"
                      stroke="#10b981"
                      strokeWidth={1.5}
                      strokeDasharray="3,3"
                      opacity={0.8}
                    />
                  )}

                  <text
                    x={x + w / 2}
                    y={y + h / 2 + 4}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize={Math.max(9, 10 * scale * 10)}
                    fontWeight="bold"
                    className="pointer-events-none"
                  >
                    {isWindow ? 'WINDOW' : op.type === 'DOOR_MAIN' ? 'ENTRANCE' : 'EXIT'}
                  </text>
                </g>
              );
            })}

            {/* Obstacles: Pillars, Panels, Freezers */}
            {shop.obstacles.map((obs, idx) => (
              <g key={idx}>
                <rect
                  x={obs.posX * scale}
                  y={obs.posY * scale}
                  width={obs.widthMm * scale}
                  height={obs.depthMm * scale}
                  fill="url(#pillarHatch)"
                  stroke="#f59e0b"
                  strokeWidth={2}
                />
                <text
                  x={(obs.posX + obs.widthMm / 2) * scale}
                  y={(obs.posY + obs.depthMm / 2 + 4) * scale}
                  textAnchor="middle"
                  fill="#fef3c7"
                  fontSize={Math.max(8, 9 * scale * 10)}
                  fontWeight="bold"
                >
                  {obs.type}
                </text>
              </g>
            ))}

            {/* Placed Racks */}
            {racks.map((rack, idx) => {
              const isBeingDragged = draggingRackIndex === idx;
              // If being dragged, render ghost/original faintly, candidate rack is rendered separately
              const opacity = isBeingDragged ? 0.3 : 1;
              const color = getRackColor(rack.category);
              const isSelected = selectedRackIndex === idx;

              const isRotated = rack.rotation === 90 || rack.rotation === 270;
              const rWidth = (isRotated ? rack.depthMm : rack.widthMm) * scale;
              const rHeight = (isRotated ? rack.widthMm : rack.depthMm) * scale;
              const posX = rack.posX * scale;
              const posY = rack.posY * scale;

              return (
                <g
                  key={idx}
                  onMouseDown={(e) => handleRackDragStart(e, rack, idx)}
                  onTouchStart={(e) => handleRackDragStart(e, rack, idx)}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectRack(rack, idx);
                  }}
                  className={`${isArrangeMode ? 'cursor-move' : 'cursor-pointer'} group`}
                  opacity={opacity}
                >
                  {/* Rack Box */}
                  <rect
                    x={posX}
                    y={posY}
                    width={rWidth}
                    height={rHeight}
                    fill={color.fill}
                    stroke={isSelected ? '#f97316' : color.stroke}
                    strokeWidth={isSelected ? 3 : 1.5}
                    rx={2}
                    className="transition-all hover:brightness-125"
                  />

                  {/* Shelf tier depth ticks */}
                  <line
                    x1={posX + (isRotated ? rWidth / 2 : 0)}
                    y1={posY + (isRotated ? 0 : rHeight / 2)}
                    x2={posX + (isRotated ? rWidth / 2 : rWidth)}
                    y2={posY + (isRotated ? rHeight : rHeight / 2)}
                    stroke="#ffffff"
                    strokeWidth={0.75}
                    strokeDasharray="2,2"
                    opacity={0.6}
                  />

                  {/* Rack Label */}
                  {showLabels && rWidth > 15 && (
                    <text
                      x={posX + rWidth / 2}
                      y={posY + rHeight / 2 + 3}
                      textAnchor="middle"
                      fill={color.text}
                      fontSize={Math.max(8, 9 * scale * 10)}
                      fontWeight="600"
                      className="pointer-events-none"
                    >
                      {rack.category === 'CHECKOUT_COUNTER'
                        ? 'CASHIER'
                        : rack.category === 'END_RACK'
                        ? 'END CAP'
                        : rack.category === 'GONDOLA_RACK'
                        ? 'GONDOLA'
                        : `${rack.widthMm}mm`}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Dragging Candidate Rack Overlay with Real-time Validation Highlight */}
            {draggingRackIndex !== null && candidateRack && (
              <g>
                {(() => {
                  const isRotated = candidateRack.rotation === 90 || candidateRack.rotation === 270;
                  const cWidth = (isRotated ? candidateRack.depthMm : candidateRack.widthMm) * scale;
                  const cHeight = (isRotated ? candidateRack.widthMm : candidateRack.depthMm) * scale;
                  const cX = candidateRack.posX * scale;
                  const cY = candidateRack.posY * scale;
                  const isValid = candidateValidation?.isValid !== false;

                  return (
                    <g>
                      {/* Candidate outline: Bright Red if invalid, Bright Cyan/Blue if valid */}
                      <rect
                        x={cX}
                        y={cY}
                        width={cWidth}
                        height={cHeight}
                        fill={isValid ? 'rgba(59, 130, 246, 0.4)' : 'rgba(239, 68, 68, 0.45)'}
                        stroke={isValid ? '#38bdf8' : '#ef4444'}
                        strokeWidth={3}
                        strokeDasharray={isValid ? 'none' : '4,3'}
                        rx={2}
                      />

                      {/* Warning Badge if Invalid Drop Position */}
                      {!isValid && (
                        <g>
                          <rect
                            x={cX + cWidth / 2 - 90}
                            y={cY - 28}
                            width={180}
                            height={22}
                            rx={4}
                            fill="#991b1b"
                            stroke="#f87171"
                            strokeWidth={1}
                          />
                          <text
                            x={cX + cWidth / 2}
                            y={cY - 13}
                            textAnchor="middle"
                            fill="#ffffff"
                            fontSize={10}
                            fontWeight="bold"
                          >
                            ⚠️ {candidateValidation?.message || 'Invalid collision'}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })()}
              </g>
            )}

            {/* Outer Dimension Annotations */}
            {showDimensions && (
              <g>
                {/* Length Dimension Line (Top) */}
                <line
                  x1={0}
                  y1={-70 * scale}
                  x2={lengthMm * scale}
                  y2={-70 * scale}
                  stroke="#94a3b8"
                  strokeWidth={1.5}
                />
                <line x1={0} y1={-90 * scale} x2={0} y2={-50 * scale} stroke="#94a3b8" strokeWidth={1.5} />
                <line
                  x1={lengthMm * scale}
                  y1={-90 * scale}
                  x2={lengthMm * scale}
                  y2={-50 * scale}
                  stroke="#94a3b8"
                  strokeWidth={1.5}
                />
                <text
                  x={(lengthMm * scale) / 2}
                  y={-80 * scale}
                  textAnchor="middle"
                  fill="#cbd5e1"
                  fontSize={11}
                  fontWeight="bold"
                >
                  Length: {lengthMm} mm ({(lengthMm / 304.8).toFixed(1)} ft)
                </text>

                {/* Breadth Dimension Line (Left) */}
                <line
                  x1={-70 * scale}
                  y1={0}
                  x2={-70 * scale}
                  y2={breadthMm * scale}
                  stroke="#94a3b8"
                  strokeWidth={1.5}
                />
                <line x1={-90 * scale} y1={0} x2={-50 * scale} y2={0} stroke="#94a3b8" strokeWidth={1.5} />
                <line
                  x1={-90 * scale}
                  y1={breadthMm * scale}
                  x2={-50 * scale}
                  y2={breadthMm * scale}
                  stroke="#94a3b8"
                  strokeWidth={1.5}
                />
                <text
                  x={-80 * scale}
                  y={(breadthMm * scale) / 2}
                  textAnchor="middle"
                  transform={`rotate(-90 ${-80 * scale} ${(breadthMm * scale) / 2})`}
                  fill="#cbd5e1"
                  fontSize={11}
                  fontWeight="bold"
                >
                  Breadth: {breadthMm} mm ({(breadthMm / 304.8).toFixed(1)} ft)
                </text>
              </g>
            )}
          </g>
        </g>
      </svg>
    </div>

      {/* Canvas Bottom Legend & Quick Stats */}
      <div className="bg-slate-950 border-t border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between text-xs text-slate-400 z-10 gap-2">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-sm bg-blue-900 border border-blue-700 inline-block" />
            <span>Wall Display Racks</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-sm bg-teal-900 border border-teal-700 inline-block" />
            <span>Center Gondola</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-sm bg-amber-900 border border-amber-700 inline-block" />
            <span>End Cap</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-sm bg-emerald-900 border border-emerald-700 inline-block" />
            <span>Cash Desk Counter</span>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-slate-400 font-mono text-[11px]">
          <span>
            Total Fixtures: <strong className="text-white">{racks.length}</strong>
          </span>
          <span>
            Aisle Width: <strong className="text-white">{aisleWidthMm} mm</strong>
          </span>
          <span>
            Shop Area:{' '}
            <strong className="text-white">{((lengthMm * breadthMm) / 1000000).toFixed(1)} m²</strong>
          </span>
        </div>
      </div>
      </>
      )}

      {/* Selected Rack Inspector Drawer */}
      {selectedRack && (
        <div className="absolute bottom-12 right-4 w-80 bg-slate-800/95 backdrop-blur-md rounded-lg border border-slate-700 shadow-2xl p-4 z-30 text-white animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between pb-2 border-b border-slate-700">
            <div className="flex items-center space-x-2">
              <span
                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                  getRackColor(selectedRack.category).badge
                }`}
              >
                {selectedRack.category.replace('_', ' ')}
              </span>
              <h4 className="font-bold text-xs truncate">{selectedRack.rackTypeName}</h4>
            </div>
            <button
              onClick={() => handleSelectRack(null, null)}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="py-2.5 space-y-1.5 text-xs text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-400">Dimensions (W x D x H):</span>
              <span className="font-mono font-medium">
                {selectedRack.widthMm} x {selectedRack.depthMm} x {selectedRack.heightMm} mm
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Position (X, Y):</span>
              <span className="font-mono text-brand-300">
                {Math.round(selectedRack.posX)}, {Math.round(selectedRack.posY)} mm
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Orientation:</span>
              <span className="font-mono text-amber-300">{selectedRack.rotation || 0}°</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Shelves / Tiers:</span>
              <span className="font-semibold text-white">{selectedRack.shelvesCount} tiers</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Load Capacity:</span>
              <span className="text-brand-400 font-bold">
                {selectedRack.loadCapacityKg} kg / tier
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Configuration:</span>
              <span>
                {selectedRack.isDoubleSided ? 'Double-Sided Island' : 'Single-Sided Wall Unit'}
              </span>
            </div>
          </div>

          {isArrangeMode && (
            <div className="mt-2 pt-2 border-t border-slate-700/60 flex items-center gap-2">
              <button
                type="button"
                onClick={handleRotateSelected}
                className="flex-1 py-1 px-2 bg-slate-700 hover:bg-slate-600 rounded text-xs text-slate-200 font-medium transition-colors text-center"
              >
                Rotate 90°
              </button>
              <button
                type="button"
                onClick={handleDeleteSelected}
                className="py-1 px-2 bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-300 rounded text-xs font-medium transition-colors"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      )}

      {/* Catalogue Rack Picker Modal */}
      <AddRackModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddRack={handleAddFixture}
        storeTypeCode={storeTypeCode}
      />
    </div>
  );
};
