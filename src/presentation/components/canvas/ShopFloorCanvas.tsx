'use client';

import React, { useState, useRef, useEffect } from 'react';
import { PlacedRack } from '@/domain/entities/Rack';
import { ShopSpecification } from '@/domain/entities/Shop';
import { ZoomIn, ZoomOut, RotateCcw, Eye, Layers, Maximize2, Tag, Info, X } from 'lucide-react';

interface ShopFloorCanvasProps {
  shop: ShopSpecification;
  racks: PlacedRack[];
  aisleWidthMm?: number;
  highlightedRackCode?: string;
  onSelectRack?: (rack: PlacedRack) => void;
}

export const ShopFloorCanvas: React.FC<ShopFloorCanvasProps> = ({
  shop,
  racks,
  aisleWidthMm = 1000,
  onSelectRack,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.08); // mm to canvas pixels
  const [pan, setPan] = useState({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Toggles
  const [showDimensions, setShowDimensions] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [showAisles, setShowAisles] = useState(true);
  const [showGrid, setShowGrid] = useState(true);

  // Selected Rack for detail drawer
  const [selectedRack, setSelectedRack] = useState<PlacedRack | null>(null);

  const { lengthMm, breadthMm } = shop.dimensions;

  // Auto-fit canvas on initial render or dimension change
  useEffect(() => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.clientWidth || 800;
      const containerHeight = containerRef.current.clientHeight || 550;

      // Leave padding of 120px for annotations
      const scaleX = (containerWidth - 140) / lengthMm;
      const scaleY = (containerHeight - 140) / breadthMm;
      const autoScale = Math.min(scaleX, scaleY, 0.18);

      setScale(Math.max(0.03, autoScale));
      setPan({
        x: Math.max(60, (containerWidth - lengthMm * autoScale) / 2),
        y: Math.max(60, (containerHeight - breadthMm * autoScale) / 2),
      });
    }
  }, [lengthMm, breadthMm]);

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only pan if clicking canvas background, not elements
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleZoom = (delta: number) => {
    setScale((prev) => Math.min(0.4, Math.max(0.02, prev + delta)));
  };

  const handleResetZoom = () => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.clientWidth || 800;
      const containerHeight = containerRef.current.clientHeight || 550;
      const autoScale = Math.min(
        (containerWidth - 140) / lengthMm,
        (containerHeight - 140) / breadthMm
      );
      setScale(autoScale);
      setPan({
        x: (containerWidth - lengthMm * autoScale) / 2,
        y: (containerHeight - breadthMm * autoScale) / 2,
      });
    }
  };

  // Color helper for rack categories
  const getRackColor = (category: string) => {
    switch (category) {
      case 'WALL_RACK':
        return { fill: '#1e3a8a', stroke: '#172554', text: '#ffffff', badge: 'bg-blue-900 text-blue-100' }; // Steel Navy
      case 'GONDOLA_RACK':
        return { fill: '#0f766e', stroke: '#134e4a', text: '#ffffff', badge: 'bg-teal-900 text-teal-100' }; // Teal
      case 'END_RACK':
        return { fill: '#d97706', stroke: '#92400e', text: '#ffffff', badge: 'bg-amber-900 text-amber-100' }; // Amber
      case 'CHECKOUT_COUNTER':
        return { fill: '#047857', stroke: '#064e3b', text: '#ffffff', badge: 'bg-emerald-900 text-emerald-100' }; // Emerald
      case 'MEDICAL_RACK':
        return { fill: '#4338ca', stroke: '#312e81', text: '#ffffff', badge: 'bg-indigo-900 text-indigo-100' };
      case 'GARMENT_RACK':
        return { fill: '#9333ea', stroke: '#581c87', text: '#ffffff', badge: 'bg-purple-900 text-purple-100' };
      default:
        return { fill: '#334155', stroke: '#1e293b', text: '#ffffff', badge: 'bg-slate-900 text-slate-100' };
    }
  };

  return (
    <div className="relative w-full h-full min-h-[500px] bg-slate-900 rounded-xl overflow-hidden select-none border border-slate-700 shadow-xl flex flex-col">
      {/* Canvas Top Bar Controls */}
      <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none">
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
              showDimensions ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>Dimensions</span>
          </button>
          <button
            onClick={() => setShowLabels(!showLabels)}
            title="Toggle Fixture Labels"
            className={`px-2 py-1 text-xs font-semibold rounded flex items-center space-x-1 transition-colors ${
              showLabels ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Tag className="w-3 h-3 mr-1" />
            <span>Labels</span>
          </button>
          <button
            onClick={() => setShowAisles(!showAisles)}
            title="Toggle Aisle Walking Corridors"
            className={`px-2 py-1 text-xs font-semibold rounded flex items-center space-x-1 transition-colors ${
              showAisles ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>Aisles</span>
          </button>
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`w-full flex-1 relative overflow-hidden cursor-grab active:cursor-grabbing`}
      >
        <svg
          className="w-full h-full"
          style={{ transform: `translate(${pan.x}px, ${pan.y}px)` }}
        >
          {/* Pattern Definitions */}
          <defs>
            {/* Grid Pattern */}
            <pattern id="grid" width={1000 * scale} height={1000 * scale} patternUnits="userSpaceOnUse">
              <path
                d={`M ${1000 * scale} 0 L 0 0 0 ${1000 * scale}`}
                fill="none"
                stroke="#1e293b"
                strokeWidth="1"
                strokeDasharray="2,2"
              />
            </pattern>

            {/* Pillar Obstacle Hatch Pattern */}
            <pattern id="pillarHatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="8" stroke="#f59e0b" strokeWidth="2" />
            </pattern>
          </defs>

          {/* Grid Background */}
          {showGrid && (
            <rect
              x="-2000"
              y="-2000"
              width={lengthMm * scale + 4000}
              height={breadthMm * scale + 4000}
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

            {/* Aisle Walking Corridor Indicators (Optionally shown) */}
            {showAisles && (
              <g opacity={0.35}>
                <rect
                  x={(450 + aisleWidthMm) * scale}
                  y={(450 + aisleWidthMm) * scale}
                  width={Math.max(0, (lengthMm - 2 * (450 + aisleWidthMm)) * scale)}
                  height={Math.max(0, (breadthMm - 2 * (450 + aisleWidthMm)) * scale)}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth={1.5}
                  strokeDasharray="6,4"
                />
              </g>
            )}

            {/* Openings: Doors and Windows */}
            {shop.openings.map((op, idx) => {
              const buffer = 300 * scale;
              let x = 0, y = 0, w = 0, h = 0;
              let swingPath = '';

              if (op.wall === 'NORTH') {
                x = op.distanceMm * scale;
                y = -200 * scale;
                w = op.widthMm * scale;
                h = 200 * scale;
                swingPath = `M ${x} 0 A ${w} ${w} 0 0 1 ${x + w} ${w}`;
              } else if (op.wall === 'SOUTH') {
                x = op.distanceMm * scale;
                y = breadthMm * scale;
                w = op.widthMm * scale;
                h = 200 * scale;
                swingPath = `M ${x} ${breadthMm * scale} A ${w} ${w} 0 0 0 ${x + w} ${breadthMm * scale - w}`;
              } else if (op.wall === 'WEST') {
                x = -200 * scale;
                y = op.distanceMm * scale;
                w = 200 * scale;
                h = op.widthMm * scale;
              } else if (op.wall === 'EAST') {
                x = lengthMm * scale;
                y = op.distanceMm * scale;
                w = 200 * scale;
                h = op.widthMm * scale;
              }

              const isWindow = op.type === 'WINDOW';

              return (
                <g key={idx}>
                  {/* Opening Wall Cutout */}
                  <rect
                    x={x}
                    y={y}
                    width={w}
                    height={h}
                    fill={isWindow ? '#0284c7' : '#059669'}
                    stroke="#ffffff"
                    strokeWidth={1}
                  />

                  {/* Door Swing Arc */}
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

                  {/* Label */}
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
              const color = getRackColor(rack.category);
              const isSelected = selectedRack?.posX === rack.posX && selectedRack?.posY === rack.posY;

              const isRotated = rack.rotation === 90 || rack.rotation === 270;
              const rWidth = (isRotated ? rack.depthMm : rack.widthMm) * scale;
              const rHeight = (isRotated ? rack.widthMm : rack.depthMm) * scale;
              const posX = rack.posX * scale;
              const posY = rack.posY * scale;

              return (
                <g
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedRack(rack);
                    if (onSelectRack) onSelectRack(rack);
                  }}
                  className="cursor-pointer group"
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
          <span>Total Fixtures: <strong className="text-white">{racks.length}</strong></span>
          <span>Aisle Width: <strong className="text-white">{aisleWidthMm} mm</strong></span>
          <span>Shop Area: <strong className="text-white">{((lengthMm * breadthMm) / 1000000).toFixed(1)} m²</strong></span>
        </div>
      </div>

      {/* Selected Rack Inspector Drawer */}
      {selectedRack && (
        <div className="absolute bottom-12 right-4 w-80 bg-slate-800/95 backdrop-blur-md rounded-lg border border-slate-700 shadow-2xl p-4 z-30 text-white animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between pb-2 border-b border-slate-700">
            <div className="flex items-center space-x-2">
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${getRackColor(selectedRack.category).badge}`}>
                {selectedRack.category.replace('_', ' ')}
              </span>
              <h4 className="font-bold text-xs truncate">{selectedRack.rackTypeName}</h4>
            </div>
            <button
              onClick={() => setSelectedRack(null)}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="py-2.5 space-y-1.5 text-xs text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-400">Dimensions (W x D x H):</span>
              <span className="font-mono font-medium">{selectedRack.widthMm} x {selectedRack.depthMm} x {selectedRack.heightMm} mm</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Shelves / Tiers:</span>
              <span className="font-semibold text-white">{selectedRack.shelvesCount} tiers</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Load Capacity:</span>
              <span className="text-brand-400 font-bold">{selectedRack.loadCapacityKg} kg / tier</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Configuration:</span>
              <span>{selectedRack.isDoubleSided ? 'Double-Sided Island' : 'Single-Sided Wall Unit'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Finishing:</span>
              <span className="text-slate-300">7-Tank Epoxy Powder Coated</span>
            </div>
          </div>

          <p className="text-[10px] text-slate-400 bg-slate-900/60 p-2 rounded border border-slate-700/50 italic">
            Manufactured from standard Tata/JSW prime steel. Standard leveling bolts included.
          </p>
        </div>
      )}
    </div>
  );
};
