'use client';

import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PlacedRack } from '@/domain/entities/Rack';
import { ShopSpecification, ShopOpening } from '@/domain/entities/Shop';
import {
  RotateCcw,
  Compass,
  Eye,
  DoorOpen,
  Sparkles,
  Layers,
  X,
} from 'lucide-react';

export interface ShopFloor3DCanvasProps {
  shop: ShopSpecification;
  racks: PlacedRack[];
  selectedRackIndex?: number | null;
  onSelectRack?: (rack: PlacedRack | null, index: number | null) => void;
  aisleWidthMm?: number;
}

export const ShopFloor3DCanvas: React.FC<ShopFloor3DCanvasProps> = ({
  shop,
  racks,
  selectedRackIndex = null,
  onSelectRack,
  aisleWidthMm = 1000,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const rackMeshesMapRef = useRef<Map<number, THREE.Group>>(new Map());

  // UI States
  const [autoRotate, setAutoRotate] = useState(false);
  const [activePreset, setActivePreset] = useState<'ISO' | 'WALKTHROUGH' | 'TOP' | 'FRONT'>('ISO');
  const [selectedRackLocal, setSelectedRackLocal] = useState<PlacedRack | null>(null);

  const { lengthMm, breadthMm } = shop.dimensions;
  const lengthM = lengthMm / 1000;
  const breadthM = breadthMm / 1000;

  // Color palette for rack categories in 3D
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'WALL_RACK':
        return { frame: 0x1e3a8a, shelf: 0xdbeafe, accent: 0x3b82f6 }; // Royal blue
      case 'GONDOLA_RACK':
        return { frame: 0x0f766e, shelf: 0xccfbf1, accent: 0x14b8a6 }; // Teal
      case 'END_RACK':
        return { frame: 0xd97706, shelf: 0xfef3c7, accent: 0xf59e0b }; // Amber
      case 'CHECKOUT_COUNTER':
        return { frame: 0x047857, shelf: 0xf1f5f9, accent: 0x10b981 }; // Emerald
      case 'MEDICAL_RACK':
        return { frame: 0x4338ca, shelf: 0xe0e7ff, accent: 0x6366f1 }; // Indigo
      case 'GARMENT_RACK':
        return { frame: 0x9333ea, shelf: 0xf3e8ff, accent: 0xa855f7 }; // Purple
      default:
        return { frame: 0x334155, shelf: 0xe2e8f0, accent: 0x64748b }; // Slate
    }
  };

  // Generate seamless floor tile texture programmatically
  const createTileTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Base porcelain tile color
    ctx.fillStyle = '#1e293b'; // Slate dark commercial showroom floor
    ctx.fillRect(0, 0, 256, 256);

    // Subtle tile body sheen
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(4, 4, 248, 248);

    // Grid grout line
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, 252, 252);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(lengthM / 0.6, breadthM / 0.6); // 600mm x 600mm tiles
    return texture;
  };

  // Generate high-resolution backlit sign texture (ENTRANCE / EXIT)
  const createSignTexture = (title: string, subtext: string, isEntrance: boolean) => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Gradient background
    const grad = ctx.createLinearGradient(0, 0, 512, 128);
    if (isEntrance) {
      grad.addColorStop(0, '#064e3b');
      grad.addColorStop(0.5, '#059669');
      grad.addColorStop(1, '#047857');
    } else {
      grad.addColorStop(0, '#7f1d1d');
      grad.addColorStop(0.5, '#dc2626');
      grad.addColorStop(1, '#991b1b');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 128);

    // Glowing border
    ctx.strokeStyle = isEntrance ? '#34d399' : '#f87171';
    ctx.lineWidth = 6;
    ctx.strokeRect(4, 4, 504, 120);

    // Inner subtle border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, 492, 108);

    // Main Title Text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 42px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, 256, 48);

    // Subtitle
    ctx.fillStyle = isEntrance ? '#a7f3d0' : '#fecaca';
    ctx.font = '600 18px sans-serif';
    ctx.fillText(subtext, 256, 92);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  };

  // Build a realistic commercial 3D door assembly with jambs, threshold, glass leaf, handle, sign & swing arc
  const buildDoorAssembly = (op: ShopOpening, wallThickness: number) => {
    const doorGroup = new THREE.Group();
    const opW = op.widthMm / 1000;
    const doorH = 2.15; // 2150mm commercial doorway height
    const jambW = 0.06; // 60mm aluminum post
    const jambD = wallThickness + 0.03; // slightly wider than wall

    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.65,
      roughness: 0.35,
    });

    const brushedAlumMat = new THREE.MeshStandardMaterial({
      color: 0xcfd8dc,
      metalness: 0.85,
      roughness: 0.25,
    });

    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x93c5fd,
      transparent: true,
      opacity: 0.45,
      roughness: 0.1,
      metalness: 0.1,
    });

    const handleMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      metalness: 0.95,
      roughness: 0.08,
    });

    // 1. Left Jamb
    const leftJamb = new THREE.Mesh(new THREE.BoxGeometry(jambW, doorH, jambD), frameMat);
    leftJamb.position.set(-opW / 2 + jambW / 2, doorH / 2, 0);
    leftJamb.castShadow = true;
    doorGroup.add(leftJamb);

    // 2. Right Jamb
    const rightJamb = new THREE.Mesh(new THREE.BoxGeometry(jambW, doorH, jambD), frameMat);
    rightJamb.position.set(opW / 2 - jambW / 2, doorH / 2, 0);
    rightJamb.castShadow = true;
    doorGroup.add(rightJamb);

    // 3. Header Transom Beam
    const headerH = jambW + 0.02;
    const header = new THREE.Mesh(new THREE.BoxGeometry(opW, headerH, jambD), frameMat);
    header.position.set(0, doorH - headerH / 2, 0);
    header.castShadow = true;
    doorGroup.add(header);

    // 4. Floor Threshold Plate
    const thresh = new THREE.Mesh(new THREE.BoxGeometry(opW, 0.014, jambD), brushedAlumMat);
    thresh.position.set(0, 0.007, 0);
    thresh.receiveShadow = true;
    doorGroup.add(thresh);

    // 5. Welcome Floor Entry Mat (inside the store, local +Z)
    const matW = Math.max(0.6, opW * 0.85);
    const matD = 0.75;
    const matMesh = new THREE.Mesh(
      new THREE.BoxGeometry(matW, 0.006, matD),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 })
    );
    matMesh.position.set(0, 0.004, matD / 2 + 0.05);
    matMesh.receiveShadow = true;
    doorGroup.add(matMesh);

    // Mat border trim
    const trimMesh = new THREE.Mesh(
      new THREE.BoxGeometry(matW + 0.03, 0.004, matD + 0.03),
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 })
    );
    trimMesh.position.set(0, 0.002, matD / 2 + 0.05);
    doorGroup.add(trimMesh);

    // 6. Illuminated Backlit Overhead Lightbox Sign
    const isEntrance = op.type === 'DOOR_MAIN' || op.type === 'DOOR_ADDITIONAL';
    const signTitle =
      op.type === 'DOOR_MAIN' ? 'ENTRANCE ➔' : op.type === 'DOOR_EXIT' ? 'EMERGENCY EXIT' : 'SERVICE DOOR';
    const signSub =
      op.type === 'DOOR_MAIN' ? 'JK ENGINEERS WORKS' : op.type === 'DOOR_EXIT' ? 'WAY OUT' : 'STAFF ENTRY';

    const signW = Math.max(0.8, opW * 0.88);
    const signH = 0.22;
    const signD = 0.12;
    const signY = doorH + signH / 2 + 0.01;

    // Housing Box
    const signBox = new THREE.Mesh(
      new THREE.BoxGeometry(signW, signH, signD),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.7, roughness: 0.3 })
    );
    signBox.position.set(0, signY, 0);
    doorGroup.add(signBox);

    // Textured Sign Faces
    const signTex = createSignTexture(signTitle, signSub, isEntrance);
    const signFaceMat = new THREE.MeshStandardMaterial({
      color: isEntrance ? 0x059669 : 0xdc2626,
      map: signTex || undefined,
      emissive: isEntrance ? 0x047857 : 0x991b1b,
      emissiveIntensity: 0.65,
      roughness: 0.3,
    });

    const faceGeo = new THREE.PlaneGeometry(signW - 0.02, signH - 0.02);
    // Outer Face (facing exterior -Z)
    const outerFace = new THREE.Mesh(faceGeo, signFaceMat);
    outerFace.rotation.y = Math.PI;
    outerFace.position.set(0, signY, -signD / 2 - 0.001);
    doorGroup.add(outerFace);

    // Inner Face (facing interior +Z)
    const innerFace = new THREE.Mesh(faceGeo, signFaceMat);
    innerFace.position.set(0, signY, signD / 2 + 0.001);
    doorGroup.add(innerFace);

    // Accent LED downlight glow under sign
    const signLight = new THREE.PointLight(isEntrance ? 0x34d399 : 0xf87171, 0.4, 2.5);
    signLight.position.set(0, doorH + 0.02, 0);
    doorGroup.add(signLight);

    // 7. Commercial Glass Door Leaf (Swung Open)
    const isDoubleDoor = opW >= 1.6;
    const clearLeafH = doorH - headerH - 0.03; // ~2.04m

    if (!isDoubleDoor) {
      // Single Leaf Door (hinged at left jamb)
      const leafW = opW - jambW * 2 - 0.02;
      const hingeX = -opW / 2 + jambW + 0.01;

      const doorPivotGroup = new THREE.Group();
      doorPivotGroup.position.set(hingeX, 0, 0);

      // Swung open 45 degrees inward into the store
      const swingIn = op.swingDirection !== 'OUTSIDE';
      doorPivotGroup.rotation.y = swingIn ? Math.PI / 4 : -Math.PI / 4;

      const leafGroup = new THREE.Group();

      // Bottom Kickplate
      const kickH = 0.16;
      const kickMesh = new THREE.Mesh(new THREE.BoxGeometry(leafW, kickH, 0.04), brushedAlumMat);
      kickMesh.position.set(leafW / 2, 0.015 + kickH / 2, 0);
      leafGroup.add(kickMesh);

      // Top Rail
      const topRailH = 0.08;
      const topRail = new THREE.Mesh(new THREE.BoxGeometry(leafW, topRailH, 0.04), frameMat);
      topRail.position.set(leafW / 2, 0.015 + clearLeafH - topRailH / 2, 0);
      leafGroup.add(topRail);

      // Stiles
      const stileW = 0.055;
      const stileH = clearLeafH - kickH - topRailH;
      const stileGeo = new THREE.BoxGeometry(stileW, stileH, 0.04);
      const leftStile = new THREE.Mesh(stileGeo, frameMat);
      leftStile.position.set(stileW / 2, 0.015 + kickH + stileH / 2, 0);
      leafGroup.add(leftStile);

      const rightStile = new THREE.Mesh(stileGeo, frameMat);
      rightStile.position.set(leafW - stileW / 2, 0.015 + kickH + stileH / 2, 0);
      leafGroup.add(rightStile);

      // Glass Pane
      const glassW = leafW - stileW * 2;
      const glassMesh = new THREE.Mesh(new THREE.BoxGeometry(glassW, stileH, 0.01), glassMat);
      glassMesh.position.set(leafW / 2, 0.015 + kickH + stileH / 2, 0);
      leafGroup.add(glassMesh);

      // Vertical Tubular Pull Handle
      const handleH = 0.9;
      const handleR = 0.014;
      const handleGeo = new THREE.CylinderGeometry(handleR, handleR, handleH, 16);

      const handleOut = new THREE.Mesh(handleGeo, handleMat);
      handleOut.position.set(leafW - stileW * 1.5, 0.015 + kickH + stileH * 0.45, -0.038);
      leafGroup.add(handleOut);

      const handleIn = new THREE.Mesh(handleGeo, handleMat);
      handleIn.position.set(leafW - stileW * 1.5, 0.015 + kickH + stileH * 0.45, 0.038);
      leafGroup.add(handleIn);

      const pinGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.08, 12);
      const topPin = new THREE.Mesh(pinGeo, handleMat);
      topPin.rotation.x = Math.PI / 2;
      topPin.position.set(leafW - stileW * 1.5, 0.015 + kickH + stileH * 0.45 + handleH * 0.38, 0);
      leafGroup.add(topPin);

      const botPin = new THREE.Mesh(pinGeo, handleMat);
      botPin.rotation.x = Math.PI / 2;
      botPin.position.set(leafW - stileW * 1.5, 0.015 + kickH + stileH * 0.45 - handleH * 0.38, 0);
      leafGroup.add(botPin);

      doorPivotGroup.add(leafGroup);
      doorGroup.add(doorPivotGroup);

      // 8. Architectural CAD Floor Swing Arc
      const arcSegments = 24;
      const arcPositions: number[] = [];
      const fanIndices: number[] = [];
      const fanVertices: number[] = [hingeX, 0.004, 0];

      for (let i = 0; i <= arcSegments; i++) {
        const theta = (i / arcSegments) * (Math.PI / 2);
        const px = hingeX + leafW * Math.cos(theta);
        const pz = leafW * Math.sin(theta);
        arcPositions.push(px, 0.005, pz);
        fanVertices.push(px, 0.004, pz);
        if (i > 0) {
          fanIndices.push(0, i, i + 1);
        }
      }

      const arcLineGeo = new THREE.BufferGeometry();
      arcLineGeo.setAttribute('position', new THREE.Float32BufferAttribute(arcPositions, 3));
      const arcLineMat = new THREE.LineDashedMaterial({
        color: 0x10b981,
        dashSize: 0.06,
        gapSize: 0.04,
        linewidth: 2,
      });
      const arcLine = new THREE.Line(arcLineGeo, arcLineMat);
      arcLine.computeLineDistances();
      doorGroup.add(arcLine);

      const fanGeo = new THREE.BufferGeometry();
      fanGeo.setAttribute('position', new THREE.Float32BufferAttribute(fanVertices, 3));
      fanGeo.setIndex(fanIndices);
      fanGeo.computeVertexNormals();
      const fanMat = new THREE.MeshBasicMaterial({
        color: 0x10b981,
        transparent: true,
        opacity: 0.08,
        side: THREE.DoubleSide,
      });
      const fanMesh = new THREE.Mesh(fanGeo, fanMat);
      doorGroup.add(fanMesh);
    } else {
      // Double Leaf Door (for wide entrances >= 1.6m)
      const leafW = (opW - jambW * 2 - 0.04) / 2;
      const swingAngle = Math.PI / 4.5;

      const leftPivotGroup = new THREE.Group();
      leftPivotGroup.position.set(-opW / 2 + jambW + 0.01, 0, 0);
      leftPivotGroup.rotation.y = swingAngle;

      const rightPivotGroup = new THREE.Group();
      rightPivotGroup.position.set(opW / 2 - jambW - 0.01, 0, 0);
      rightPivotGroup.rotation.y = -swingAngle;

      const buildLeaf = (isRight: boolean) => {
        const lg = new THREE.Group();
        const dir = isRight ? -1 : 1;

        const kickH = 0.16;
        const kickMesh = new THREE.Mesh(new THREE.BoxGeometry(leafW, kickH, 0.04), brushedAlumMat);
        kickMesh.position.set((leafW / 2) * dir, 0.015 + kickH / 2, 0);
        lg.add(kickMesh);

        const topRailH = 0.08;
        const topRail = new THREE.Mesh(new THREE.BoxGeometry(leafW, topRailH, 0.04), frameMat);
        topRail.position.set((leafW / 2) * dir, 0.015 + clearLeafH - topRailH / 2, 0);
        lg.add(topRail);

        const stileW = 0.055;
        const stileH = clearLeafH - kickH - topRailH;
        const stileGeo = new THREE.BoxGeometry(stileW, stileH, 0.04);
        const s1 = new THREE.Mesh(stileGeo, frameMat);
        s1.position.set((stileW / 2) * dir, 0.015 + kickH + stileH / 2, 0);
        lg.add(s1);

        const s2 = new THREE.Mesh(stileGeo, frameMat);
        s2.position.set((leafW - stileW / 2) * dir, 0.015 + kickH + stileH / 2, 0);
        lg.add(s2);

        const glassW = leafW - stileW * 2;
        const glassMesh = new THREE.Mesh(new THREE.BoxGeometry(glassW, stileH, 0.01), glassMat);
        glassMesh.position.set((leafW / 2) * dir, 0.015 + kickH + stileH / 2, 0);
        lg.add(glassMesh);

        const handleH = 0.8;
        const handleR = 0.013;
        const handleGeo = new THREE.CylinderGeometry(handleR, handleR, handleH, 16);
        const hOut = new THREE.Mesh(handleGeo, handleMat);
        hOut.position.set((leafW - stileW * 1.5) * dir, 0.015 + kickH + stileH * 0.45, -0.038);
        lg.add(hOut);

        const hIn = new THREE.Mesh(handleGeo, handleMat);
        hIn.position.set((leafW - stileW * 1.5) * dir, 0.015 + kickH + stileH * 0.45, 0.038);
        lg.add(hIn);

        return lg;
      };

      leftPivotGroup.add(buildLeaf(false));
      rightPivotGroup.add(buildLeaf(true));
      doorGroup.add(leftPivotGroup);
      doorGroup.add(rightPivotGroup);
    }

    return doorGroup;
  };

  // Build a realistic commercial 3D window assembly
  const buildWindowAssembly = (op: ShopOpening, wallThickness: number) => {
    const windowGroup = new THREE.Group();
    const opW = op.widthMm / 1000;
    const sillH = 0.85;
    const winH = 0.65;
    const frameThickness = 0.04;

    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.6,
      roughness: 0.4,
    });

    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.35,
      roughness: 0.1,
      metalness: 0.15,
    });

    // Frame Bottom & Top
    const botFrame = new THREE.Mesh(new THREE.BoxGeometry(opW, frameThickness, wallThickness + 0.02), frameMat);
    botFrame.position.set(0, sillH + frameThickness / 2, 0);
    windowGroup.add(botFrame);

    const topFrame = new THREE.Mesh(new THREE.BoxGeometry(opW, frameThickness, wallThickness + 0.02), frameMat);
    topFrame.position.set(0, sillH + winH - frameThickness / 2, 0);
    windowGroup.add(topFrame);

    // Frame Sides & Center Mullion
    const sideGeo = new THREE.BoxGeometry(frameThickness, winH, wallThickness + 0.02);
    const leftSide = new THREE.Mesh(sideGeo, frameMat);
    leftSide.position.set(-opW / 2 + frameThickness / 2, sillH + winH / 2, 0);
    windowGroup.add(leftSide);

    const rightSide = new THREE.Mesh(sideGeo, frameMat);
    rightSide.position.set(opW / 2 - frameThickness / 2, sillH + winH / 2, 0);
    windowGroup.add(rightSide);

    const centerMullion = new THREE.Mesh(sideGeo, frameMat);
    centerMullion.position.set(0, sillH + winH / 2, 0);
    windowGroup.add(centerMullion);

    // Panes
    const paneW = (opW - frameThickness * 3) / 2;
    const paneGeo = new THREE.BoxGeometry(paneW, winH - frameThickness * 2, 0.01);
    const leftPane = new THREE.Mesh(paneGeo, glassMat);
    leftPane.position.set(-paneW / 2 - frameThickness / 2, sillH + winH / 2, 0);
    windowGroup.add(leftPane);

    const rightPane = new THREE.Mesh(paneGeo, glassMat);
    rightPane.position.set(paneW / 2 + frameThickness / 2, sillH + winH / 2, 0);
    windowGroup.add(rightPane);

    // Projected Sill Ledge
    const ledgeGeo = new THREE.BoxGeometry(opW + 0.04, 0.025, wallThickness + 0.06);
    const ledgeMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.5 });
    const ledge = new THREE.Mesh(ledgeGeo, ledgeMat);
    ledge.position.set(0, sillH + 0.01, 0);
    windowGroup.add(ledge);

    return windowGroup;
  };

  // Build segmented walls with physical cutouts for openings
  const buildSegmentedWall = (
    wallLength: number,
    wallHeight: number,
    wallThickness: number,
    wallMat: THREE.Material,
    openingsOnWall: { start: number; end: number; type: string }[],
    isXAxis: boolean,
    wallBasePos: { x: number; y: number; z: number }
  ) => {
    const wallGroup = new THREE.Group();

    const sorted = [...openingsOnWall]
      .map((o) => ({
        start: Math.max(0, Math.min(wallLength, o.start)),
        end: Math.max(0, Math.min(wallLength, o.end)),
        type: o.type,
      }))
      .filter((o) => o.end > o.start)
      .sort((a, b) => a.start - b.start);

    let currentPos = 0;

    sorted.forEach((op) => {
      // Solid wall before opening
      const segLen = op.start - currentPos;
      if (segLen > 0.005) {
        const segGeo = isXAxis
          ? new THREE.BoxGeometry(segLen, wallHeight, wallThickness)
          : new THREE.BoxGeometry(wallThickness, wallHeight, segLen);
        const segMesh = new THREE.Mesh(segGeo, wallMat);
        segMesh.castShadow = true;
        segMesh.receiveShadow = true;

        const centerAlong = currentPos + segLen / 2 - wallLength / 2;
        if (isXAxis) {
          segMesh.position.set(wallBasePos.x + centerAlong, wallBasePos.y + wallHeight / 2, wallBasePos.z);
        } else {
          segMesh.position.set(wallBasePos.x, wallBasePos.y + wallHeight / 2, wallBasePos.z + centerAlong);
        }
        wallGroup.add(segMesh);
      }

      // If WINDOW: build sill wall underneath window
      if (op.type === 'WINDOW') {
        const sillH = 0.85;
        const opLen = op.end - op.start;
        if (opLen > 0.005) {
          const sillGeo = isXAxis
            ? new THREE.BoxGeometry(opLen, sillH, wallThickness)
            : new THREE.BoxGeometry(wallThickness, sillH, opLen);
          const sillMesh = new THREE.Mesh(sillGeo, wallMat);
          sillMesh.castShadow = true;
          sillMesh.receiveShadow = true;

          const centerAlong = op.start + opLen / 2 - wallLength / 2;
          if (isXAxis) {
            sillMesh.position.set(wallBasePos.x + centerAlong, wallBasePos.y + sillH / 2, wallBasePos.z);
          } else {
            sillMesh.position.set(wallBasePos.x, wallBasePos.y + sillH / 2, wallBasePos.z + centerAlong);
          }
          wallGroup.add(sillMesh);
        }
      }
      // If DOOR: NO wall in the gap! Complete walk-through opening!

      currentPos = Math.max(currentPos, op.end);
    });

    // Solid wall after last opening
    const remLen = wallLength - currentPos;
    if (remLen > 0.005) {
      const segGeo = isXAxis
        ? new THREE.BoxGeometry(remLen, wallHeight, wallThickness)
        : new THREE.BoxGeometry(wallThickness, wallHeight, remLen);
      const segMesh = new THREE.Mesh(segGeo, wallMat);
      segMesh.castShadow = true;
      segMesh.receiveShadow = true;

      const centerAlong = currentPos + remLen / 2 - wallLength / 2;
      if (isXAxis) {
        segMesh.position.set(wallBasePos.x + centerAlong, wallBasePos.y + wallHeight / 2, wallBasePos.z);
      } else {
        segMesh.position.set(wallBasePos.x, wallBasePos.y + wallHeight / 2, wallBasePos.z + centerAlong);
      }
      wallGroup.add(segMesh);
    }

    return wallGroup;
  };

  // Build a realistic 3D procedural steel rack unit
  const buildRack3DGroup = (rack: PlacedRack, index: number, isSelected: boolean) => {
    const group = new THREE.Group();
    group.name = `rack-${index}`;
    group.userData = { rackIndex: index, rack };

    const colors = getCategoryColor(rack.category);
    const w = rack.widthMm / 1000;
    const d = rack.depthMm / 1000;
    const h = (rack.heightMm || 2100) / 1000;
    const shelfCount = rack.shelvesCount || 5;

    // Upright column material (powder-coated steel)
    const frameMat = new THREE.MeshStandardMaterial({
      color: isSelected ? 0xf97316 : colors.frame,
      metalness: 0.6,
      roughness: 0.35,
      emissive: isSelected ? 0xea580c : 0x000000,
      emissiveIntensity: isSelected ? 0.35 : 0,
    });

    // Shelf deck material (pressed steel plate)
    const shelfMat = new THREE.MeshStandardMaterial({
      color: isSelected ? 0xffedd5 : colors.shelf,
      metalness: 0.4,
      roughness: 0.4,
    });

    // Scanner rail accent material
    const railMat = new THREE.MeshStandardMaterial({
      color: colors.accent,
      metalness: 0.2,
      roughness: 0.6,
    });

    if (rack.category === 'CHECKOUT_COUNTER') {
      // Realistic Checkout / Billing Desk
      const counterH = 0.85;
      const counterGeo = new THREE.BoxGeometry(w, counterH, d);
      const counterMesh = new THREE.Mesh(counterGeo, frameMat);
      counterMesh.position.y = counterH / 2;
      counterMesh.castShadow = true;
      counterMesh.receiveShadow = true;
      group.add(counterMesh);

      // Stainless steel checkout top plate
      const topPlateGeo = new THREE.BoxGeometry(w + 0.04, 0.04, d + 0.04);
      const topPlateMat = new THREE.MeshStandardMaterial({
        color: 0xf1f5f9,
        metalness: 0.85,
        roughness: 0.2,
      });
      const topPlate = new THREE.Mesh(topPlateGeo, topPlateMat);
      topPlate.position.y = counterH + 0.02;
      group.add(topPlate);

      // POS / Monitor Stand on billing counter
      const standGeo = new THREE.BoxGeometry(0.25, 0.25, 0.05);
      const standMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2 });
      const stand = new THREE.Mesh(standGeo, standMat);
      stand.position.set(w * 0.25, counterH + 0.16, 0);
      group.add(stand);
    } else {
      // Modular Slotted Steel Rack (Wall Rack, Gondola, End Cap)
      const postThickness = 0.035; // 35mm steel upright post

      // 4 Upright Corner Posts
      const postGeo = new THREE.BoxGeometry(postThickness, h, postThickness);
      const halfW = w / 2 - postThickness / 2;
      const halfD = d / 2 - postThickness / 2;

      const postPositions = [
        [-halfW, halfD],
        [halfW, halfD],
        [-halfW, -halfD],
        [halfW, -halfD],
      ];

      postPositions.forEach(([px, pz]) => {
        const post = new THREE.Mesh(postGeo, frameMat);
        post.position.set(px, h / 2, pz);
        post.castShadow = true;
        group.add(post);

        // Base footplate
        const footGeo = new THREE.BoxGeometry(postThickness * 1.8, 0.015, postThickness * 1.8);
        const foot = new THREE.Mesh(footGeo, frameMat);
        foot.position.set(px, 0.0075, pz);
        group.add(foot);
      });

      // Back Panel Sheet (between uprights)
      const backH = h - 0.1;
      const backGeo = new THREE.BoxGeometry(w - postThickness, backH, 0.006);
      const backMat = new THREE.MeshStandardMaterial({
        color: colors.frame,
        metalness: 0.5,
        roughness: 0.5,
      });
      const backPanel = new THREE.Mesh(backGeo, backMat);
      backPanel.position.set(0, backH / 2 + 0.05, rack.isDoubleSided ? 0 : -halfD);
      group.add(backPanel);

      // Bottom Base Kickplate (Closed front skirt)
      const kickH = 0.12;
      const kickGeo = new THREE.BoxGeometry(w - postThickness, kickH, postThickness);
      const kick = new THREE.Mesh(kickGeo, frameMat);
      kick.position.set(0, kickH / 2, halfD);
      group.add(kick);

      // Horizontal Shelf Tiers
      const shelfThickness = 0.025; // 25mm steel box plate
      const shelfDepth = rack.isDoubleSided ? d / 2 - 0.02 : d - 0.02;
      const shelfGeo = new THREE.BoxGeometry(w - 0.01, shelfThickness, shelfDepth);
      const railGeo = new THREE.BoxGeometry(w, 0.018, 0.008);

      const bottomShelfY = kickH + 0.02;
      const topShelfY = h - 0.04;
      const shelfStep = (topShelfY - bottomShelfY) / Math.max(1, shelfCount - 1);

      for (let s = 0; s < shelfCount; s++) {
        const sy = bottomShelfY + s * shelfStep;

        if (rack.isDoubleSided) {
          // Front shelf
          const frontShelf = new THREE.Mesh(shelfGeo, shelfMat);
          frontShelf.position.set(0, sy, d / 4);
          frontShelf.castShadow = true;
          frontShelf.receiveShadow = true;
          group.add(frontShelf);

          // Front scanner rail
          const frontRail = new THREE.Mesh(railGeo, railMat);
          frontRail.position.set(0, sy, halfD + 0.005);
          group.add(frontRail);

          // Back shelf
          const backShelf = new THREE.Mesh(shelfGeo, shelfMat);
          backShelf.position.set(0, sy, -d / 4);
          backShelf.castShadow = true;
          backShelf.receiveShadow = true;
          group.add(backShelf);

          // Back scanner rail
          const backRail = new THREE.Mesh(railGeo, railMat);
          backRail.position.set(0, sy, -halfD - 0.005);
          group.add(backRail);
        } else {
          // Single-sided shelf
          const shelf = new THREE.Mesh(shelfGeo, shelfMat);
          shelf.position.set(0, sy, 0);
          shelf.castShadow = true;
          shelf.receiveShadow = true;
          group.add(shelf);

          // Front scanner rail
          const rail = new THREE.Mesh(railGeo, railMat);
          rail.position.set(0, sy, halfD + 0.005);
          group.add(rail);
        }
      }

      // Top Canopy Header Strip
      const canopyGeo = new THREE.BoxGeometry(w, 0.06, postThickness);
      const canopy = new THREE.Mesh(canopyGeo, frameMat);
      canopy.position.set(0, h - 0.03, halfD);
      group.add(canopy);
    }

    // Selection Glow Bounding Box
    if (isSelected) {
      const boxHelperGeo = new THREE.BoxGeometry(w + 0.08, h + 0.08, d + 0.08);
      const boxHelperEdges = new THREE.EdgesGeometry(boxHelperGeo);
      const boxHelperLine = new THREE.LineSegments(
        boxHelperEdges,
        new THREE.LineBasicMaterial({ color: 0xf97316, linewidth: 2 })
      );
      boxHelperLine.position.y = h / 2;
      group.add(boxHelperLine);
    }

    return group;
  };

  // Setup Three.js scene, camera, lights, room, and event listeners
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 580;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0f1d); // Deep architectural blueprint dark
    scene.fog = new THREE.FogExp2(0x0a0f1d, 0.035);
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.set(lengthM * 0.85, Math.max(lengthM, breadthM) * 0.9, breadthM * 1.15);
    camera.lookAt(0, 0.8, 0);
    cameraRef.current = camera;

    // 3. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2 - 0.04; // Prevent going underneath floor
    controls.minDistance = 1.5;
    controls.maxDistance = Math.max(lengthM, breadthM) * 3.5;
    controls.target.set(0, 0.8, 0);
    controlsRef.current = controls;

    // 5. Lighting Setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.1);
    dirLight.position.set(lengthM * 0.6, 6.0, breadthM * 0.6);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 25;
    const shadowBound = Math.max(lengthM, breadthM) * 0.9;
    dirLight.shadow.camera.left = -shadowBound;
    dirLight.shadow.camera.right = shadowBound;
    dirLight.shadow.camera.top = shadowBound;
    dirLight.shadow.camera.bottom = -shadowBound;
    dirLight.shadow.bias = -0.0005;
    scene.add(dirLight);

    const hemiLight = new THREE.HemisphereLight(0xe2e8f0, 0x1e293b, 0.5);
    hemiLight.position.set(0, 8, 0);
    scene.add(hemiLight);

    // 6. Architectural Store Floor
    const floorGeo = new THREE.PlaneGeometry(lengthM, breadthM);
    const tileTexture = createTileTexture();
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      map: tileTexture || undefined,
      roughness: 0.35,
      metalness: 0.15,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    scene.add(floor);

    // Outer Ground Expansion (surrounding pavement)
    const outerGroundGeo = new THREE.PlaneGeometry(lengthM + 12, breadthM + 12);
    const outerGroundMat = new THREE.MeshStandardMaterial({
      color: 0x090d16,
      roughness: 0.9,
    });
    const outerGround = new THREE.Mesh(outerGroundGeo, outerGroundMat);
    outerGround.rotation.x = -Math.PI / 2;
    outerGround.position.y = -0.002;
    outerGround.receiveShadow = true;
    scene.add(outerGround);

    // Architectural Outer Walls with Openings Cutouts (Cutaway style at 1.4m so interior is never blocked)
    const wallH = 1.4;
    const wallThickness = 0.2; // 200mm
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.6,
      metalness: 0.1,
    });

    // Segregate openings by wall
    const northOps = shop.openings.filter((o) => o.wall === 'NORTH');
    const southOps = shop.openings.filter((o) => o.wall === 'SOUTH');
    const westOps = shop.openings.filter((o) => o.wall === 'WEST');
    const eastOps = shop.openings.filter((o) => o.wall === 'EAST');

    // North Wall: Spans X from -lengthM/2 - wallThickness to +lengthM/2 + wallThickness
    const northWallGroup = buildSegmentedWall(
      lengthM + wallThickness * 2,
      wallH,
      wallThickness,
      wallMat,
      northOps.map((o) => ({
        start: wallThickness + o.distanceMm / 1000,
        end: wallThickness + (o.distanceMm + o.widthMm) / 1000,
        type: o.type,
      })),
      true,
      { x: 0, y: 0, z: -breadthM / 2 - wallThickness / 2 }
    );
    scene.add(northWallGroup);

    // South Wall: Spans X from -lengthM/2 - wallThickness to +lengthM/2 + wallThickness
    const southWallGroup = buildSegmentedWall(
      lengthM + wallThickness * 2,
      wallH,
      wallThickness,
      wallMat,
      southOps.map((o) => ({
        start: wallThickness + o.distanceMm / 1000,
        end: wallThickness + (o.distanceMm + o.widthMm) / 1000,
        type: o.type,
      })),
      true,
      { x: 0, y: 0, z: breadthM / 2 + wallThickness / 2 }
    );
    scene.add(southWallGroup);

    // West Wall: Spans Z from -breadthM/2 to +breadthM/2
    const westWallGroup = buildSegmentedWall(
      breadthM,
      wallH,
      wallThickness,
      wallMat,
      westOps.map((o) => ({
        start: o.distanceMm / 1000,
        end: (o.distanceMm + o.widthMm) / 1000,
        type: o.type,
      })),
      false,
      { x: -lengthM / 2 - wallThickness / 2, y: 0, z: 0 }
    );
    scene.add(westWallGroup);

    // East Wall: Spans Z from -breadthM/2 to +breadthM/2
    const eastWallGroup = buildSegmentedWall(
      breadthM,
      wallH,
      wallThickness,
      wallMat,
      eastOps.map((o) => ({
        start: o.distanceMm / 1000,
        end: (o.distanceMm + o.widthMm) / 1000,
        type: o.type,
      })),
      false,
      { x: lengthM / 2 + wallThickness / 2, y: 0, z: 0 }
    );
    scene.add(eastWallGroup);

    // Openings Assemblies: Commercial Doors & Windows with Frame, Signage, Glass Leaf & Handles
    shop.openings.forEach((op) => {
      const isDoor =
        op.type === 'DOOR_MAIN' ||
        op.type === 'DOOR_EXIT' ||
        op.type === 'DOOR_ADDITIONAL' ||
        op.type.includes('DOOR');

      const assembly = isDoor
        ? buildDoorAssembly(op, wallThickness)
        : buildWindowAssembly(op, wallThickness);

      let dX = 0,
        dZ = 0,
        rotY = 0;

      if (op.wall === 'NORTH') {
        dX = (op.distanceMm + op.widthMm / 2 - lengthMm / 2) / 1000;
        dZ = -breadthM / 2;
        rotY = 0;
      } else if (op.wall === 'SOUTH') {
        dX = (op.distanceMm + op.widthMm / 2 - lengthMm / 2) / 1000;
        dZ = breadthM / 2;
        rotY = Math.PI;
      } else if (op.wall === 'WEST') {
        dX = -lengthM / 2;
        dZ = (op.distanceMm + op.widthMm / 2 - breadthMm / 2) / 1000;
        rotY = -Math.PI / 2;
      } else if (op.wall === 'EAST') {
        dX = lengthM / 2;
        dZ = (op.distanceMm + op.widthMm / 2 - breadthMm / 2) / 1000;
        rotY = Math.PI / 2;
      }

      assembly.position.set(dX, 0, dZ);
      assembly.rotation.y = rotY;
      scene.add(assembly);
    });

    // Structural Pillars / Obstacles
    shop.obstacles.forEach((obs) => {
      const obsW = obs.widthMm / 1000;
      const obsD = obs.depthMm / 1000;
      const obsH = 2.8; // full ceiling pillar

      const pX = (obs.posX + obs.widthMm / 2 - lengthMm / 2) / 1000;
      const pZ = (obs.posY + obs.depthMm / 2 - breadthMm / 2) / 1000;

      const pillarGeo = new THREE.BoxGeometry(obsW, obsH, obsD);
      const pillarMat = new THREE.MeshStandardMaterial({
        color: 0x475569,
        roughness: 0.7,
      });
      const pillar = new THREE.Mesh(pillarGeo, pillarMat);
      pillar.position.set(pX, obsH / 2, pZ);
      pillar.castShadow = true;
      pillar.receiveShadow = true;
      scene.add(pillar);

      // Safety Hazard Band around pillar
      const bandGeo = new THREE.BoxGeometry(obsW + 0.01, 0.25, obsD + 0.01);
      const bandMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        roughness: 0.3,
        metalness: 0.2,
      });
      const band = new THREE.Mesh(bandGeo, bandMat);
      band.position.set(pX, 1.1, pZ);
      scene.add(band);
    });

    // 9. Procedural 3D Modular Racks
    rackMeshesMapRef.current.clear();
    racks.forEach((rack, idx) => {
      const isSelected = selectedRackIndex === idx;
      const rackGroup = buildRack3DGroup(rack, idx, isSelected);

      // Map (posX, posY) in mm to Three.js centered space accounting for rotation
      const isRotated = rack.rotation === 90 || rack.rotation === 270;
      const effectiveWidth = isRotated ? rack.depthMm : rack.widthMm;
      const effectiveDepth = isRotated ? rack.widthMm : rack.depthMm;

      const rX = (rack.posX + effectiveWidth / 2 - lengthMm / 2) / 1000;
      const rZ = (rack.posY + effectiveDepth / 2 - breadthMm / 2) / 1000;

      rackGroup.position.set(rX, 0, rZ);

      // Rotation around Y axis (standard right-hand rule in Three.js)
      const rotRad = ((rack.rotation || 0) * Math.PI) / 180;
      rackGroup.rotation.y = rotRad;

      scene.add(rackGroup);
      rackMeshesMapRef.current.set(idx, rackGroup);
    });

    // 10. Raycaster for Interactive Rack Click & Inspection
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const handlePointerDown = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);

      let foundRackIndex: number | null = null;
      for (const hit of intersects) {
        let curr: THREE.Object3D | null = hit.object;
        while (curr && curr !== scene) {
          if (curr.userData && curr.userData.rackIndex !== undefined) {
            foundRackIndex = curr.userData.rackIndex;
            break;
          }
          curr = curr.parent;
        }
        if (foundRackIndex !== null) break;
      }

      if (foundRackIndex !== null && racks[foundRackIndex]) {
        const target = racks[foundRackIndex];
        setSelectedRackLocal(target);
        if (onSelectRack) onSelectRack(target, foundRackIndex);
      }
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);

    // 11. Responsive ResizeObserver
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
          const w = entry.contentRect.width;
          const h = entry.contentRect.height;
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        }
      }
    });
    resizeObserver.observe(container);

    // 12. Animation Render Loop
    const animate = () => {
      animFrameIdRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Cleanup on unmount
    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      controls.dispose();
      renderer.dispose();
    };
  }, [lengthMm, breadthMm, shop.openings, shop.obstacles, racks, selectedRackIndex, onSelectRack]);

  // Compute primary entrance coordinates and orientation for smart camera framing
  const getMainEntranceCoords = () => {
    const mainEntrance =
      shop.openings.find((o) => o.type === 'DOOR_MAIN') ||
      shop.openings.find((o) => o.type === 'DOOR_EXIT' || o.type === 'DOOR_ADDITIONAL' || o.type.includes('DOOR')) ||
      shop.openings[0];

    if (!mainEntrance) {
      return { pos: { x: 0, y: 1.2, z: -breadthM / 2 }, normal: { x: 0, z: 1 } };
    }

    const opCenterMm = mainEntrance.distanceMm + mainEntrance.widthMm / 2;
    if (mainEntrance.wall === 'NORTH') {
      return {
        pos: { x: (opCenterMm - lengthMm / 2) / 1000, y: 1.2, z: -breadthM / 2 },
        normal: { x: 0, z: 1 }, // points inside store (+Z)
      };
    } else if (mainEntrance.wall === 'SOUTH') {
      return {
        pos: { x: (opCenterMm - lengthMm / 2) / 1000, y: 1.2, z: breadthM / 2 },
        normal: { x: 0, z: -1 }, // points inside store (-Z)
      };
    } else if (mainEntrance.wall === 'WEST') {
      return {
        pos: { x: -lengthM / 2, y: 1.2, z: (opCenterMm - breadthMm / 2) / 1000 },
        normal: { x: 1, z: 0 }, // points inside store (+X)
      };
    } else {
      return {
        pos: { x: lengthM / 2, y: 1.2, z: (opCenterMm - breadthMm / 2) / 1000 },
        normal: { x: -1, z: 0 }, // points inside store (-X)
      };
    }
  };

  // Handle camera presets
  const handleSetPreset = (preset: 'ISO' | 'WALKTHROUGH' | 'TOP' | 'FRONT') => {
    setActivePreset(preset);
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    controls.autoRotate = false;
    setAutoRotate(false);

    const { pos: entPos, normal: entNorm } = getMainEntranceCoords();

    switch (preset) {
      case 'ISO':
        camera.position.set(lengthM * 0.85, Math.max(lengthM, breadthM) * 0.95, breadthM * 1.15);
        controls.target.set(0, 0.7, 0);
        break;
      case 'WALKTHROUGH':
        // Eye-level (1.65m) just inside the entrance doorway looking down the shop
        camera.position.set(
          entPos.x + entNorm.x * 0.5,
          1.65,
          entPos.z + entNorm.z * 0.5
        );
        controls.target.set(
          entPos.x + entNorm.x * 3.5,
          1.4,
          entPos.z + entNorm.z * 3.5
        );
        break;
      case 'TOP':
        camera.position.set(0, Math.max(lengthM, breadthM) * 1.5, 0.01);
        controls.target.set(0, 0, 0);
        break;
      case 'FRONT':
        // Storefront entrance view looking in through the doorway
        camera.position.set(
          entPos.x - entNorm.x * 2.8,
          1.85,
          entPos.z - entNorm.z * 2.8
        );
        controls.target.set(
          entPos.x + entNorm.x * 1.2,
          1.1,
          entPos.z + entNorm.z * 1.2
        );
        break;
    }
    controls.update();
  };

  // Toggle Turntable Auto-Rotate
  const handleToggleAutoRotate = () => {
    const next = !autoRotate;
    setAutoRotate(next);
    if (controlsRef.current) {
      controlsRef.current.autoRotate = next;
      controlsRef.current.autoRotateSpeed = 1.2;
    }
  };

  // Reset Camera View
  const handleResetCamera = () => {
    handleSetPreset('ISO');
  };

  return (
    <div className="relative w-full h-full min-h-[580px] bg-slate-950 rounded-xl overflow-hidden select-none">
      {/* 3D WebGL Canvas Container */}
      <div ref={mountRef} className="w-full h-full min-h-[580px] cursor-grab active:cursor-grabbing" />

      {/* Top Floating Controls Bar */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between pointer-events-none gap-2">
        {/* Left: Camera View Presets */}
        <div className="flex items-center space-x-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-lg border border-slate-700 pointer-events-auto shadow-xl">
          <button
            type="button"
            onClick={() => handleSetPreset('ISO')}
            title="Isometric 3D Perspective"
            className={`px-2.5 py-1 text-xs font-semibold rounded-md flex items-center space-x-1.5 transition-colors ${
              activePreset === 'ISO'
                ? 'bg-brand-600 text-white shadow'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Isometric</span>
          </button>

          <button
            type="button"
            onClick={() => handleSetPreset('WALKTHROUGH')}
            title="Eye-Level Store Walkthrough (1.65m)"
            className={`px-2.5 py-1 text-xs font-semibold rounded-md flex items-center space-x-1.5 transition-colors ${
              activePreset === 'WALKTHROUGH'
                ? 'bg-brand-600 text-white shadow'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Walkthrough</span>
          </button>

          <button
            type="button"
            onClick={() => handleSetPreset('TOP')}
            title="Top-Down Bird's Eye View"
            className={`px-2.5 py-1 text-xs font-semibold rounded-md flex items-center space-x-1.5 transition-colors ${
              activePreset === 'TOP'
                ? 'bg-brand-600 text-white shadow'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Top-Down</span>
          </button>

          <button
            type="button"
            onClick={() => handleSetPreset('FRONT')}
            title="Store Front Entrance View"
            className={`px-2.5 py-1 text-xs font-semibold rounded-md flex items-center space-x-1.5 transition-colors ${
              activePreset === 'FRONT'
                ? 'bg-brand-600 text-white shadow'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <DoorOpen className="w-3.5 h-3.5" />
            <span>Entrance</span>
          </button>
        </div>

        {/* Right: Showcase & Turntable Controls */}
        <div className="flex items-center space-x-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-lg border border-slate-700 pointer-events-auto shadow-xl">
          <button
            type="button"
            onClick={handleToggleAutoRotate}
            title={autoRotate ? 'Stop 360° Turntable' : 'Start 360° Turntable Auto-Rotation'}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md flex items-center space-x-1.5 transition-all ${
              autoRotate
                ? 'bg-amber-500 text-slate-950 font-bold shadow-lg ring-2 ring-amber-400/50 animate-pulse'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{autoRotate ? 'Rotating 360°' : 'Turntable'}</span>
          </button>

          <button
            type="button"
            onClick={handleResetCamera}
            title="Reset Camera Framing"
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Floating 3D Navigation Guide Tip */}
      <div className="absolute bottom-14 left-4 z-20 pointer-events-none hidden sm:flex items-center space-x-3 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800 text-[11px] text-slate-400 shadow-md">
        <span>🖱️ <strong>Left Drag:</strong> 360° Orbit</span>
        <span className="text-slate-600">•</span>
        <span>🖱️ <strong>Right Drag:</strong> Pan</span>
        <span className="text-slate-600">•</span>
        <span>🔍 <strong>Scroll:</strong> Zoom</span>
        <span className="text-slate-600">•</span>
        <span>👆 <strong>Click:</strong> Inspect Fixture</span>
      </div>

      {/* Floating Rack Inspector Drawer (if selected in 3D) */}
      {selectedRackLocal && (
        <div className="absolute bottom-14 right-4 w-80 bg-slate-900/95 backdrop-blur-md rounded-xl border border-slate-700 shadow-2xl p-4 z-30 text-white animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-brand-900 text-brand-200 border border-brand-700">
                {selectedRackLocal.category.replace('_', ' ')}
              </span>
              <h4 className="font-bold text-xs truncate">{selectedRackLocal.rackTypeName}</h4>
            </div>
            <button
              onClick={() => {
                setSelectedRackLocal(null);
                if (onSelectRack) onSelectRack(null, null);
              }}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="py-2.5 space-y-1.5 text-xs text-slate-300 font-mono">
            <div className="flex justify-between">
              <span className="text-slate-400">Dimensions:</span>
              <span className="text-white">
                {selectedRackLocal.widthMm} x {selectedRackLocal.depthMm} x {selectedRackLocal.heightMm} mm
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Floor Coordinates:</span>
              <span className="text-brand-300">
                X: {Math.round(selectedRackLocal.posX)} mm, Y: {Math.round(selectedRackLocal.posY)} mm
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Shelves / Tiers:</span>
              <span className="text-emerald-400 font-bold">{selectedRackLocal.shelvesCount} tiers</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Load Capacity:</span>
              <span className="text-amber-300 font-bold">{selectedRackLocal.loadCapacityKg} kg / tier</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Configuration:</span>
              <span className="text-white font-sans text-[11px]">
                {selectedRackLocal.isDoubleSided ? 'Double-Sided Gondola' : 'Single-Sided Wall Unit'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Summary Bar */}
      <div className="absolute bottom-0 inset-x-0 bg-slate-950/90 backdrop-blur-md border-t border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between text-xs text-slate-400 z-10 gap-2">
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
          <span className="text-slate-200 font-semibold">Interactive 3D Photorealistic Store View</span>
        </div>

        <div className="flex items-center space-x-3 text-slate-400 font-mono text-[11px]">
          <span>
            Total Fixtures: <strong className="text-white">{racks.length}</strong>
          </span>
          <span>
            Aisle Clearance: <strong className="text-white">{aisleWidthMm} mm</strong>
          </span>
          <span>
            Carpet Area: <strong className="text-white">{((lengthMm * breadthMm) / 1000000).toFixed(1)} m²</strong>
          </span>
        </div>
      </div>
    </div>
  );
};
