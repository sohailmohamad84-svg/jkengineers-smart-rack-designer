'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/presentation/components/navigation/Navbar';
import { Footer } from '@/presentation/components/navigation/Footer';
import { ShopFloorCanvas } from '@/presentation/components/canvas/ShopFloorCanvas';
import { StoreLayoutResult, DesignOption } from '@/domain/entities/Design';
import { CostEstimate } from '@/domain/entities/Estimate';
import { ShopSpecification } from '@/domain/entities/Shop';
import { PlacedRack } from '@/domain/entities/Rack';
import {
  ShoppingBag,
  Store,
  Cross,
  Shirt,
  Boxes,
  Layers,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  Plus,
  Trash2,
  AlertCircle,
  IndianRupee,
  Sliders,
  FileText,
  PhoneCall,
  Save,
  Clock,
  Sparkles,
  HelpCircle,
  Info,
  Download,
} from 'lucide-react';

interface StoreTypeData {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  minAisleWidthMm: number;
  storeRequirements: Array<{
    id: string;
    code: string;
    label: string;
    defaultValue: string;
    isRequired: boolean;
  }>;
}

export default function DesignerPage() {
  const router = useRouter();

  // Wizard Step (1 to 7, plus 8 for Results)
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Store Types from DB
  const [storeTypes, setStoreTypes] = useState<StoreTypeData[]>([]);

  // Step 1: Store Type
  const [selectedStoreType, setSelectedStoreType] = useState<string>('SUPERMARKET');

  // Step 2: Dimensions
  const [unit, setUnit] = useState<'FEET' | 'INCHES' | 'METERS' | 'MM'>('FEET');
  const [length, setLength] = useState<number>(20);
  const [lengthInches, setLengthInches] = useState<number>(0);
  const [breadth, setBreadth] = useState<number>(15);
  const [breadthInches, setBreadthInches] = useState<number>(0);
  const [height, setHeight] = useState<number>(10);

  // Step 3: Openings
  const [openings, setOpenings] = useState<
    Array<{
      type: 'DOOR_MAIN' | 'DOOR_EXIT' | 'DOOR_ADDITIONAL' | 'WINDOW';
      wall: 'NORTH' | 'SOUTH' | 'EAST' | 'WEST';
      distanceMm: number;
      widthMm: number;
      heightMm: number;
      swingDirection: 'INSIDE' | 'OUTSIDE' | 'NONE';
    }>
  >([
    {
      type: 'DOOR_MAIN',
      wall: 'NORTH',
      distanceMm: 1200,
      widthMm: 1200,
      heightMm: 2100,
      swingDirection: 'INSIDE',
    },
  ]);

  // Step 4: Obstacles
  const [obstacles, setObstacles] = useState<
    Array<{
      type: 'PILLAR' | 'COLUMN' | 'ELECTRICAL_PANEL' | 'STAIRCASE' | 'COUNTER' | 'BEAM' | 'REFRIGERATOR' | 'OTHER';
      posX: number;
      posY: number;
      widthMm: number;
      depthMm: number;
      heightMm: number;
    }>
  >([]);

  // Step 5: Requirements
  const [requirements, setRequirements] = useState<Record<string, boolean>>({
    REQ_GONDOLA_AISLES: true,
    REQ_END_CAPS: true,
    REQ_CHECKOUT_COUNTER: true,
  });

  // Step 6: Budget
  const [budget, setBudget] = useState<number>(250000);

  // Step 7: Customer Info & OTP (Rule 1 & 2)
  const [customerSession, setCustomerSession] = useState<any>(null);
  const [customerForm, setCustomerForm] = useState({
    fullName: '',
    mobile: '',
    whatsappNumber: '',
    email: '',
    city: 'Mumbai',
    shopLocation: '',
    businessName: '',
  });
  const [otpSent, setOtpSent] = useState<boolean>(false);
  const [otpValue, setOtpValue] = useState<string>('');
  const [devOtpHint, setDevOtpHint] = useState<string>('');
  const [otpSending, setOtpSending] = useState<boolean>(false);
  const [otpVerifying, setOtpVerifying] = useState<boolean>(false);

  // Generated Layout Results
  const [layoutResult, setLayoutResult] = useState<StoreLayoutResult | null>(null);
  const [activeOptionIndex, setActiveOptionIndex] = useState<number>(1); // Default Option B (Balanced)
  const [generatedProjectId, setGeneratedProjectId] = useState<string>('');
  const [generatedProjectCode, setGeneratedProjectCode] = useState<string>('');

  // Interactive 2D Arrange Mode States
  const [isArrangeMode, setIsArrangeMode] = useState<boolean>(false);
  const [isRepricing, setIsRepricing] = useState<boolean>(false);
  const [isSavingVersion, setIsSavingVersion] = useState<boolean>(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState<boolean>(false);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const repriceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleRacksChange = (updatedRacks: PlacedRack[]) => {
    if (!layoutResult) return;
    setIsDirty(true);

    const updatedOptions = [...layoutResult.options];
    const currentOpt = { ...updatedOptions[activeOptionIndex], racks: updatedRacks };
    updatedOptions[activeOptionIndex] = currentOpt;
    setLayoutResult({ ...layoutResult, options: updatedOptions });

    // Debounce live authoritative repricing
    if (repriceTimerRef.current) clearTimeout(repriceTimerRef.current);
    setIsRepricing(true);

    repriceTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch('/api/designer/reprice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ racks: updatedRacks, includeInstallation: true }),
        });
        const data = await res.json();
        if (data.success && data.estimate) {
          setLayoutResult((prev) => {
            if (!prev) return prev;
            const nextOpts = [...prev.options];
            nextOpts[activeOptionIndex] = {
              ...nextOpts[activeOptionIndex],
              totalRacks: data.totalRacks,
              totalDisplayAreaSqM: data.totalDisplayAreaSqM,
              racksByType: data.racksByType,
              estimate: data.estimate,
            };
            return { ...prev, options: nextOpts };
          });
        }
      } catch (err) {
        console.error('Reprice error:', err);
      } finally {
        setIsRepricing(false);
      }
    }, 400);
  };

  const handleSaveArrangement = async () => {
    if (!layoutResult || !generatedProjectId) return;
    setIsSavingVersion(true);
    try {
      const activeOpt = layoutResult.options[activeOptionIndex];
      const res = await fetch(`/api/projects/${generatedProjectId}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          racks: activeOpt.racks,
          includeInstallation: true,
          note: `Custom arrangement (${activeOpt.title || 'Modified'})`,
        }),
      });
      const data = await res.json();
      if (data.success && data.version) {
        setIsDirty(false);

        // Dynamically compute racksByType from current active fixtures
        const racksByType: Record<string, number> = {};
        activeOpt.racks.forEach((r) => {
          const name = r.rackTypeName || 'Modular Rack';
          racksByType[name] = (racksByType[name] || 0) + 1;
        });

        // Ensure estimate is 100% complete with subTotal, GST, disclaimer, and items
        const est = data.version.estimate || {};
        const grandTotal = est.grandTotal ?? activeOpt.estimate?.grandTotal ?? 0;
        const totalGstCost = est.totalGstCost ?? activeOpt.estimate?.totalGstCost ?? Math.round(grandTotal * 0.18 / 1.18);
        const subTotal = est.subTotal ?? (grandTotal - totalGstCost);
        const minRange = est.minRange ?? activeOpt.estimate?.minRange ?? Math.round(grandTotal * 0.95);
        const maxRange = est.maxRange ?? activeOpt.estimate?.maxRange ?? Math.round(grandTotal * 1.05);

        const safeEstimate: CostEstimate = {
          ...activeOpt.estimate,
          ...est,
          subTotal,
          totalGstCost,
          grandTotal,
          minRange,
          maxRange,
          disclaimer:
            est.disclaimer ||
            activeOpt.estimate?.disclaimer ||
            'Authoritative deterministic estimate based on active raw material rates and statutory 18% GST.',
          items: est.items || activeOpt.estimate?.items || [],
          totalMaterialCost: est.totalMaterialCost ?? activeOpt.estimate?.totalMaterialCost ?? 0,
          totalFabricationCost: est.totalFabricationCost ?? activeOpt.estimate?.totalFabricationCost ?? 0,
          totalPowderCoatingCost: est.totalPowderCoatingCost ?? activeOpt.estimate?.totalPowderCoatingCost ?? 0,
          totalLaborCost: est.totalLaborCost ?? activeOpt.estimate?.totalLaborCost ?? 0,
          totalInstallationCost: est.totalInstallationCost ?? activeOpt.estimate?.totalInstallationCost ?? 0,
          totalTransportationCost: est.totalTransportationCost ?? activeOpt.estimate?.totalTransportationCost ?? 0,
          isIndicative: true,
          createdAt: est.createdAt ? new Date(est.createdAt) : new Date(),
        };

        const newOpt: DesignOption = {
          id: data.version.id,
          versionNumber: data.version.versionNumber,
          optionType: 'OPTION_B_BALANCED',
          title: `Version ${data.version.versionNumber}: Custom Arrangement`,
          subtitle: 'Customer arranged floor plan',
          totalRacks: data.version.totalRacks || activeOpt.racks.length,
          racksByType,
          totalDisplayAreaSqM: data.version.totalDisplayAreaSqM || activeOpt.totalDisplayAreaSqM,
          floorAreaSqM: data.version.floorAreaSqM || activeOpt.floorAreaSqM,
          aisleWidthMm: data.version.aisleWidthMm || activeOpt.aisleWidthMm,
          racks: activeOpt.racks,
          estimate: safeEstimate,
          explanation: data.version.explanation || 'Custom customer arrangement preserved',
          highlights: [`Custom arrangement preserved with ${activeOpt.racks.length} fixtures`],
        };

        const nextOpts = [...layoutResult.options, newOpt];
        setLayoutResult({ ...layoutResult, options: nextOpts });
        setActiveOptionIndex(nextOpts.length - 1);
        alert(`Layout successfully saved as Version ${data.version.versionNumber}!`);
      } else {
        alert(data.message || 'Failed to save version');
      }
    } catch (err: any) {
      alert('Error saving version: ' + err.message);
    } finally {
      setIsSavingVersion(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!generatedProjectId) return;
    setIsDownloadingPdf(true);
    try {
      const link = document.createElement('a');
      link.href = `/api/projects/${generatedProjectId}/pdf`;
      link.setAttribute('download', `JK-Engineers-Works-Quotation-${generatedProjectCode}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to download PDF:', err);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Fetch store types on load
  useEffect(() => {
    fetch('/api/store-types')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.storeTypes) {
          setStoreTypes(data.storeTypes);
        }
      })
      .catch((e) => console.error(e));

    // Check existing session
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          setCustomerSession(data.user);
          if (data.user.customer) {
            setCustomerForm({
              fullName: data.user.customer.fullName || '',
              mobile: data.user.mobile || '',
              whatsappNumber: data.user.customer.whatsappNumber || '',
              email: data.user.email || '',
              city: data.user.customer.city || 'Mumbai',
              shopLocation: data.user.customer.shopLocation || '',
              businessName: data.user.customer.businessName || '',
            });
          }
        }
      })
      .catch(() => {});
  }, []);

  // Update default requirements when store type changes
  useEffect(() => {
    const selected = storeTypes.find((s) => s.code === selectedStoreType);
    if (selected && selected.storeRequirements) {
      const initialReqs: Record<string, boolean> = {};
      for (const req of selected.storeRequirements) {
        initialReqs[req.code] = req.defaultValue === 'true';
      }
      setRequirements(initialReqs);
    }
  }, [selectedStoreType, storeTypes]);

  // Convert current dimensions to mm for internal preview
  const getShopSpec = (): ShopSpecification => {
    let lMm = length * 304.8 + lengthInches * 25.4;
    let bMm = breadth * 304.8 + breadthInches * 25.4;
    let hMm = height * 304.8;

    if (unit === 'METERS') {
      lMm = length * 1000;
      bMm = breadth * 1000;
      hMm = height * 1000;
    } else if (unit === 'MM') {
      lMm = length;
      bMm = breadth;
      hMm = height;
    }

    return {
      shape: 'RECTANGLE',
      dimensions: {
        lengthMm: Math.round(lMm),
        breadthMm: Math.round(bMm),
        heightMm: Math.round(hMm),
        displayUnit: unit,
      },
      openings,
      obstacles,
    };
  };

  // Helper: Send OTP
  const handleSendOtp = async () => {
    if (!customerForm.mobile || customerForm.mobile.length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number');
      return;
    }
    setErrorMessage('');
    setOtpSending(true);

    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: customerForm.mobile }),
      });
      const data = await res.json();
      if (data.success) {
        setOtpSent(true);
        if (data.devOtp) {
          setDevOtpHint(data.devOtp);
          setOtpValue(data.devOtp); // Auto-fill in demo mode for convenience
        }
      } else {
        setErrorMessage(data.message || 'Failed to send OTP.');
      }
    } catch {
      setErrorMessage('Network error while requesting OTP.');
    } finally {
      setOtpSending(false);
    }
  };

  // Helper: Verify OTP and Register/Login
  const handleVerifyOtp = async () => {
    if (!otpValue || otpValue.length !== 6) {
      setErrorMessage('Please enter the 6-digit OTP');
      return;
    }
    if (!customerForm.fullName.trim()) {
      setErrorMessage('Please enter your full name');
      return;
    }
    if (!customerForm.shopLocation.trim()) {
      setErrorMessage('Please enter your shop locality / address');
      return;
    }

    setErrorMessage('');
    setOtpVerifying(true);

    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...customerForm,
          otp: otpValue,
        }),
      });
      const data = await res.json();

      if (data.success && data.user) {
        setCustomerSession(data.user);
        // Automatically proceed to layout generation!
        await triggerLayoutGeneration(data.user.customerId);
      } else {
        setErrorMessage(data.message || 'OTP verification failed');
      }
    } catch {
      setErrorMessage('Network error during verification.');
    } finally {
      setOtpVerifying(false);
    }
  };

  // Helper: Trigger Layout Generation
  const triggerLayoutGeneration = async (customerId?: string) => {
    setLoading(true);
    setErrorMessage('');

    const currentShop = getShopSpec();

    try {
      const res = await fetch('/api/projects/new/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeTypeCode: selectedStoreType,
          budget,
          shape: currentShop.shape,
          dimensions: {
            length,
            breadth,
            height,
            unit,
            lengthInches,
            breadthInches,
          },
          openings: currentShop.openings,
          obstacles: currentShop.obstacles,
          requirements,
        }),
      });

      const data = await res.json();

      if (data.success && data.result) {
        setLayoutResult(data.result);
        setGeneratedProjectId(data.projectId);
        setGeneratedProjectCode(data.projectCode);
        setCurrentStep(8); // Results Step
      } else {
        setErrorMessage(data.message || 'Layout generation failed. Please check measurements.');
      }
    } catch {
      setErrorMessage('Server error while generating layout.');
    } finally {
      setLoading(false);
    }
  };

  // Next Step Action
  const handleNext = () => {
    setErrorMessage('');
    if (currentStep === 2) {
      if (length <= 0 || breadth <= 0 || height <= 0) {
        setErrorMessage('All dimensions must be greater than zero.');
        return;
      }
    }

    if (currentStep === 6) {
      // If user has an active customer profile OR is an admin, directly generate design!
      const canDirectlyGenerate = Boolean(customerSession?.customer?.id || customerSession?.role === 'ADMIN');
      if (canDirectlyGenerate) {
        triggerLayoutGeneration();
        return;
      }
      // Otherwise proceed to Step 7 (Customer Info & OTP verification)
      setCurrentStep(7);
      return;
    }

    setCurrentStep((prev) => prev + 1);
  };

  // Helper: Select Active Version in Results
  const handleSelectOption = async (index: number) => {
    setActiveOptionIndex(index);
    if (layoutResult && layoutResult.options[index] && generatedProjectId) {
      const versionId = layoutResult.options[index].id;
      if (versionId) {
        fetch(`/api/projects/${generatedProjectId}/select-version`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ versionId }),
        }).catch(() => {});
      }
    }
  };

  // Step Indicators
  const stepsList = [
    { num: 1, title: 'Store Type' },
    { num: 2, title: 'Dimensions' },
    { num: 3, title: 'Openings' },
    { num: 4, title: 'Obstacles' },
    { num: 5, title: 'Requirements' },
    { num: 6, title: 'Budget' },
    { num: 7, title: 'Verification' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Wizard Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
            <div>
              <span className="text-brand-600 font-bold text-xs uppercase tracking-wider">
                JK Smart Shop Planner
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {currentStep === 8 ? 'Your Custom Shop Rack Design & Estimate' : 'Interactive Shop Rack Designer'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                {currentStep === 8
                  ? `Project Reference: ${generatedProjectCode} • Mumbai Factory Direct Quotation`
                  : 'Enter your shop dimensions and requirements to receive a customized 2D layout and cost plan.'}
              </p>
            </div>

            {currentStep < 8 && (
              <div className="flex items-center space-x-2 text-xs font-semibold text-slate-600 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm self-start">
                <ShieldCheck className="w-4 h-4 text-brand-500" />
                <span>Standard Prime Steel Guaranteed (Rule 5)</span>
              </div>
            )}
          </div>

          {/* Progress Indicator (Steps 1 to 7) */}
          {currentStep < 8 && (
            <div className="mt-4 overflow-x-auto pb-2">
              <div className="flex items-center space-x-2 min-w-[650px]">
                {stepsList.map((st) => {
                  const isCurrent = currentStep === st.num;
                  const isDone = currentStep > st.num;
                  return (
                    <div
                      key={st.num}
                      onClick={() => {
                        if (isDone) setCurrentStep(st.num);
                      }}
                      className={`flex-1 flex items-center p-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
                          : isDone
                          ? 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                          : 'bg-slate-100 text-slate-400 opacity-60 cursor-not-allowed'
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center mr-2 text-[10px] font-black ${
                          isCurrent
                            ? 'bg-white text-brand-600'
                            : isDone
                            ? 'bg-brand-100 text-brand-700'
                            : 'bg-slate-200 text-slate-500'
                        }`}
                      >
                        {isDone ? '✓' : st.num}
                      </span>
                      <span className="truncate">{st.title}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 1: STORE TYPE SELECTION */}
        {/* ========================================================================= */}
        {currentStep === 1 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Select Business Type</h2>
            <p className="text-xs text-slate-500 mb-6">
              The layout engine calibrates customer aisle clearance and rack types based on your retail category.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {storeTypes.map((st) => {
                const isSelected = selectedStoreType === st.code;
                return (
                  <div
                    key={st.code}
                    onClick={() => setSelectedStoreType(st.code)}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-brand-500 bg-brand-50/40 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div
                        className={`p-2.5 rounded-lg ${
                          isSelected ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <Store className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-sm text-slate-900">{st.name}</h3>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-brand-600" />}
                        </div>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">{st.description}</p>
                        <span className="inline-block mt-2 text-[10px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                          Min Aisle: {st.minAisleWidthMm} mm
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: SHOP DIMENSIONS */}
        {/* ========================================================================= */}
        {currentStep === 2 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Enter Shop Dimensions</h2>
                <p className="text-xs text-slate-500">
                  Enter accurate measurements. Internal calculations automatically standardize to millimeters.
                </p>
              </div>

              {/* Unit Switcher */}
              <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
                {(['FEET', 'METERS', 'MM'] as const).map((u) => (
                  <button
                    key={u}
                    onClick={() => setUnit(u)}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                      unit === u ? 'bg-brand-500 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              {/* Length */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Shop Length (Front to Back)
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min="1"
                    step="0.1"
                    value={length}
                    onChange={(e) => setLength(parseFloat(e.target.value) || 0)}
                    className="w-full text-lg font-bold p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                  <span className="text-xs font-bold text-slate-500">{unit}</span>
                </div>
                {unit === 'FEET' && (
                  <div className="mt-2 flex items-center space-x-2">
                    <span className="text-xs text-slate-500">+</span>
                    <input
                      type="number"
                      min="0"
                      max="11"
                      placeholder="Inches"
                      value={lengthInches}
                      onChange={(e) => setLengthInches(parseInt(e.target.value) || 0)}
                      className="w-24 text-sm font-semibold p-1.5 bg-white border border-slate-300 rounded-md"
                    />
                    <span className="text-xs text-slate-500">inches</span>
                  </div>
                )}
                <p className="text-[11px] text-slate-400 mt-2">
                  Approx: {Math.round(getShopSpec().dimensions.lengthMm)} mm
                </p>
              </div>

              {/* Breadth */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Shop Breadth / Width (Side to Side)
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min="1"
                    step="0.1"
                    value={breadth}
                    onChange={(e) => setBreadth(parseFloat(e.target.value) || 0)}
                    className="w-full text-lg font-bold p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                  <span className="text-xs font-bold text-slate-500">{unit}</span>
                </div>
                {unit === 'FEET' && (
                  <div className="mt-2 flex items-center space-x-2">
                    <span className="text-xs text-slate-500">+</span>
                    <input
                      type="number"
                      min="0"
                      max="11"
                      placeholder="Inches"
                      value={breadthInches}
                      onChange={(e) => setBreadthInches(parseInt(e.target.value) || 0)}
                      className="w-24 text-sm font-semibold p-1.5 bg-white border border-slate-300 rounded-md"
                    />
                    <span className="text-xs text-slate-500">inches</span>
                  </div>
                )}
                <p className="text-[11px] text-slate-400 mt-2">
                  Approx: {Math.round(getShopSpec().dimensions.breadthMm)} mm
                </p>
              </div>

              {/* Height */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Ceiling Clear Height
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min="6"
                    step="0.1"
                    value={height}
                    onChange={(e) => setHeight(parseFloat(e.target.value) || 0)}
                    className="w-full text-lg font-bold p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                  <span className="text-xs font-bold text-slate-500">{unit}</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-2">
                  Approx: {Math.round(getShopSpec().dimensions.heightMm)} mm (Standard racks: 2100mm)
                </p>
              </div>
            </div>

            <div className="mt-6 p-4 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-800 flex items-start space-x-2.5">
              <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
              <div>
                <strong>Site Measurement Verification Notice:</strong> Entered measurements will be treated as indicative. After reviewing your layout, a certified JK Engineers Works technical engineer can conduct a physical laser measurement before final fabrication.
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 3: OPENINGS (DOORS & WINDOWS) */}
        {/* ========================================================================= */}
        {currentStep === 3 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Doors, Entrances & Windows</h2>
                <p className="text-xs text-slate-500">
                  The rack generator automatically keeps door clearance corridors clear and avoids placing racks across windows.
                </p>
              </div>

              <button
                onClick={() =>
                  setOpenings([
                    ...openings,
                    {
                      type: 'DOOR_EXIT',
                      wall: 'SOUTH',
                      distanceMm: 1000,
                      widthMm: 1000,
                      heightMm: 2100,
                      swingDirection: 'OUTSIDE',
                    },
                  ])
                }
                className="inline-flex items-center text-xs font-bold px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-300 transition-colors"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add Door / Window
              </button>
            </div>

            <div className="space-y-3">
              {openings.map((op, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 grid grid-cols-1 sm:grid-cols-6 gap-3 items-center"
                >
                  <div className="sm:col-span-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Type</label>
                    <select
                      value={op.type}
                      onChange={(e) => {
                        const next = [...openings];
                        next[idx].type = e.target.value as any;
                        setOpenings(next);
                      }}
                      className="w-full text-xs font-semibold p-2 bg-white border border-slate-300 rounded-md"
                    >
                      <option value="DOOR_MAIN">Main Entrance</option>
                      <option value="DOOR_EXIT">Exit Door</option>
                      <option value="DOOR_ADDITIONAL">Side Door</option>
                      <option value="WINDOW">Window</option>
                    </select>
                  </div>

                  <div className="sm:col-span-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Wall</label>
                    <select
                      value={op.wall}
                      onChange={(e) => {
                        const next = [...openings];
                        next[idx].wall = e.target.value as any;
                        setOpenings(next);
                      }}
                      className="w-full text-xs font-semibold p-2 bg-white border border-slate-300 rounded-md"
                    >
                      <option value="NORTH">North (Front)</option>
                      <option value="SOUTH">South (Back)</option>
                      <option value="WEST">West (Left)</option>
                      <option value="EAST">East (Right)</option>
                    </select>
                  </div>

                  <div className="sm:col-span-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Distance From Corner (mm)</label>
                    <input
                      type="number"
                      min="0"
                      value={op.distanceMm}
                      onChange={(e) => {
                        const next = [...openings];
                        next[idx].distanceMm = parseInt(e.target.value) || 0;
                        setOpenings(next);
                      }}
                      className="w-full text-xs font-semibold p-2 bg-white border border-slate-300 rounded-md"
                    />
                  </div>

                  <div className="sm:col-span-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Width (mm)</label>
                    <input
                      type="number"
                      min="500"
                      value={op.widthMm}
                      onChange={(e) => {
                        const next = [...openings];
                        next[idx].widthMm = parseInt(e.target.value) || 1000;
                        setOpenings(next);
                      }}
                      className="w-full text-xs font-semibold p-2 bg-white border border-slate-300 rounded-md"
                    />
                  </div>

                  <div className="sm:col-span-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Swing</label>
                    <select
                      value={op.swingDirection}
                      onChange={(e) => {
                        const next = [...openings];
                        next[idx].swingDirection = e.target.value as any;
                        setOpenings(next);
                      }}
                      className="w-full text-xs font-semibold p-2 bg-white border border-slate-300 rounded-md"
                    >
                      <option value="INSIDE">Inside</option>
                      <option value="OUTSIDE">Outside</option>
                      <option value="NONE">None / Sliding</option>
                    </select>
                  </div>

                  <div className="sm:col-span-1 flex justify-end">
                    {openings.length > 1 && (
                      <button
                        onClick={() => setOpenings(openings.filter((_, i) => i !== idx))}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 4: OBSTACLES (PILLARS, PANELS, ETC.) */}
        {/* ========================================================================= */}
        {currentStep === 4 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Pillars, Columns & Obstacles</h2>
                <p className="text-xs text-slate-500">
                  Enter any structural columns, electrical panels, or existing coolers that racks must avoid.
                </p>
              </div>

              <button
                onClick={() =>
                  setObstacles([
                    ...obstacles,
                    {
                      type: 'PILLAR',
                      posX: Math.round(getShopSpec().dimensions.lengthMm / 2),
                      posY: Math.round(getShopSpec().dimensions.breadthMm / 2),
                      widthMm: 400,
                      depthMm: 400,
                      heightMm: 3000,
                    },
                  ])
                }
                className="inline-flex items-center text-xs font-bold px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-300 transition-colors"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add Obstacle
              </button>
            </div>

            {obstacles.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300">
                <p className="text-sm font-semibold text-slate-600">No obstacles added.</p>
                <p className="text-xs text-slate-400 mt-1">
                  If your shop has no columns or fixed equipment, you can proceed to the next step.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {obstacles.map((obs, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 grid grid-cols-1 sm:grid-cols-6 gap-3 items-center"
                  >
                    <div className="sm:col-span-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Obstacle Type</label>
                      <select
                        value={obs.type}
                        onChange={(e) => {
                          const next = [...obstacles];
                          next[idx].type = e.target.value as any;
                          setObstacles(next);
                        }}
                        className="w-full text-xs font-semibold p-2 bg-white border border-slate-300 rounded-md"
                      >
                        <option value="PILLAR">Pillar / Column</option>
                        <option value="ELECTRICAL_PANEL">Electrical Panel</option>
                        <option value="REFRIGERATOR">Chiller / Refrigerator</option>
                        <option value="STAIRCASE">Staircase</option>
                        <option value="OTHER">Other Obstacle</option>
                      </select>
                    </div>

                    <div className="sm:col-span-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Distance X from Left (mm)</label>
                      <input
                        type="number"
                        min="0"
                        value={obs.posX}
                        onChange={(e) => {
                          const next = [...obstacles];
                          next[idx].posX = parseInt(e.target.value) || 0;
                          setObstacles(next);
                        }}
                        className="w-full text-xs font-semibold p-2 bg-white border border-slate-300 rounded-md"
                      />
                    </div>

                    <div className="sm:col-span-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Distance Y from Top (mm)</label>
                      <input
                        type="number"
                        min="0"
                        value={obs.posY}
                        onChange={(e) => {
                          const next = [...obstacles];
                          next[idx].posY = parseInt(e.target.value) || 0;
                          setObstacles(next);
                        }}
                        className="w-full text-xs font-semibold p-2 bg-white border border-slate-300 rounded-md"
                      />
                    </div>

                    <div className="sm:col-span-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Width (mm)</label>
                      <input
                        type="number"
                        min="100"
                        value={obs.widthMm}
                        onChange={(e) => {
                          const next = [...obstacles];
                          next[idx].widthMm = parseInt(e.target.value) || 400;
                          setObstacles(next);
                        }}
                        className="w-full text-xs font-semibold p-2 bg-white border border-slate-300 rounded-md"
                      />
                    </div>

                    <div className="sm:col-span-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Depth (mm)</label>
                      <input
                        type="number"
                        min="100"
                        value={obs.depthMm}
                        onChange={(e) => {
                          const next = [...obstacles];
                          next[idx].depthMm = parseInt(e.target.value) || 400;
                          setObstacles(next);
                        }}
                        className="w-full text-xs font-semibold p-2 bg-white border border-slate-300 rounded-md"
                      />
                    </div>

                    <div className="sm:col-span-1 flex justify-end">
                      <button
                        onClick={() => setObstacles(obstacles.filter((_, i) => i !== idx))}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 5: STORE REQUIREMENTS */}
        {/* ========================================================================= */}
        {currentStep === 5 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Select Fixture Requirements</h2>
            <p className="text-xs text-slate-500 mb-6">
              Customize what fixture categories should be prioritized in your shop design.
            </p>

            <div className="space-y-4 max-w-2xl">
              <label className="flex items-start space-x-3 p-3.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requirements['REQ_GONDOLA_AISLES'] !== false}
                  onChange={(e) => setRequirements({ ...requirements, REQ_GONDOLA_AISLES: e.target.checked })}
                  className="mt-1 w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500"
                />
                <div>
                  <h4 className="font-bold text-sm text-slate-900">Central Double-Sided Gondola Aisles</h4>
                  <p className="text-xs text-slate-500">
                    Dual-sided center island fixtures to maximize walking loops and impulse product display.
                  </p>
                </div>
              </label>

              <label className="flex items-start space-x-3 p-3.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requirements['REQ_END_CAPS'] !== false}
                  onChange={(e) => setRequirements({ ...requirements, REQ_END_CAPS: e.target.checked })}
                  className="mt-1 w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500"
                />
                <div>
                  <h4 className="font-bold text-sm text-slate-900">Promotional Gondola End-Cap Racks</h4>
                  <p className="text-xs text-slate-500">
                    Single-sided display units fixed to the ends of central gondolas for high-visibility promotional SKUs.
                  </p>
                </div>
              </label>

              <label className="flex items-start space-x-3 p-3.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requirements['REQ_CHECKOUT_COUNTER'] !== false}
                  onChange={(e) => setRequirements({ ...requirements, REQ_CHECKOUT_COUNTER: e.target.checked })}
                  className="mt-1 w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500"
                />
                <div>
                  <h4 className="font-bold text-sm text-slate-900">Cash Desk / Billing Counter</h4>
                  <p className="text-xs text-slate-500">
                    Heavy-duty checkout counter with cash drawer casing positioned near the main entrance/exit.
                  </p>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 6: BUDGET (RULE 5 & 22) */}
        {/* ========================================================================= */}
        {currentStep === 6 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Set Your Target Budget</h2>
            <p className="text-xs text-slate-500 mb-6">
              Enter your planned investment envelope. We optimize your fixture layout without cutting steel quality.
            </p>

            {/* Non-Degradation Rule 5 Notice */}
            <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start space-x-3">
              <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold text-sm block mb-1">JK Engineers Quality Assurance Rule:</strong>
                We NEVER downgrade raw steel thickness, angle gauges, or our 7-tank powder coating process to meet a lower budget. Budget optimization happens strictly by adjusting fixture counts, shelf tiers, and layout efficiency—never structural safety.
              </div>
            </div>

            {/* Budget Presets */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {[150000, 250000, 500000, 1000000].map((amt) => (
                <button
                  key={amt}
                  onClick={() => setBudget(amt)}
                  className={`p-3 rounded-lg border font-bold text-sm transition-all ${
                    budget === amt
                      ? 'border-brand-500 bg-brand-50 text-brand-700 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-slate-50'
                  }`}
                >
                  ₹{(amt / 100000).toFixed(amt % 100000 === 0 ? 0 : 1)} Lakh
                </button>
              ))}
            </div>

            {/* Custom Budget Input */}
            <div className="max-w-md">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Custom Budget Amount (INR ₹)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-slate-400 font-bold">₹</span>
                <input
                  type="number"
                  min="25000"
                  step="5000"
                  value={budget}
                  onChange={(e) => setBudget(parseFloat(e.target.value) || 0)}
                  className="w-full pl-8 pr-4 py-2.5 text-lg font-bold bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Selected: <strong>₹{budget.toLocaleString('en-IN')}</strong> (Approx ₹{(budget / 100000).toFixed(2)} Lakh)
              </p>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 7: CUSTOMER REGISTRATION & OTP (RULE 1 & 2) */}
        {/* ========================================================================= */}
        {currentStep === 7 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm max-w-2xl mx-auto">
            <div className="text-center mb-6">
              <span className="w-12 h-12 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center mx-auto mb-2 font-bold text-xl">
                📱
              </span>
              <h2 className="text-xl font-bold text-slate-900">Verify Mobile & Create Your Design</h2>
              <p className="text-xs text-slate-500 mt-1">
                Per company policy, customer details are captured and verified before generating your customized shop layout and factory quotation.
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Patel"
                    value={customerForm.fullName}
                    onChange={(e) => setCustomerForm({ ...customerForm, fullName: e.target.value })}
                    className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Business / Shop Name (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Patel Super Mart"
                    value={customerForm.businessName}
                    onChange={(e) => setCustomerForm({ ...customerForm, businessName: e.target.value })}
                    className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">City *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mumbai / Thane / Navi Mumbai"
                    value={customerForm.city}
                    onChange={(e) => setCustomerForm({ ...customerForm, city: e.target.value })}
                    className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Shop Locality / Address *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Borivali West, Link Road"
                    value={customerForm.shopLocation}
                    onChange={(e) => setCustomerForm({ ...customerForm, shopLocation: e.target.value })}
                    className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Number (For OTP Verification) *</label>
                <div className="flex space-x-2">
                  <span className="p-2.5 bg-slate-100 border border-slate-300 rounded-lg text-xs font-bold text-slate-600">
                    +91
                  </span>
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="9820012345"
                    value={customerForm.mobile}
                    onChange={(e) => setCustomerForm({ ...customerForm, mobile: e.target.value })}
                    className="w-full text-xs font-bold p-2.5 bg-slate-50 border border-slate-300 rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={otpSending}
                    className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shrink-0 disabled:opacity-50"
                  >
                    {otpSending ? 'Sending...' : otpSent ? 'Resend' : 'Send OTP'}
                  </button>
                </div>
              </div>

              {/* OTP Field */}
              {otpSent && (
                <div className="p-4 bg-brand-50 border border-brand-200 rounded-xl animate-in fade-in space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-brand-900">
                      Enter 6-Digit OTP received on +91 {customerForm.mobile}
                    </label>
                    {devOtpHint && (
                      <span className="text-[11px] font-mono text-brand-700 bg-white px-2 py-0.5 rounded border border-brand-200">
                        Demo OTP: <strong>{devOtpHint}</strong>
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="Enter 6-digit OTP"
                    value={otpValue}
                    onChange={(e) => setOtpValue(e.target.value)}
                    className="w-full text-center text-xl font-mono tracking-widest font-black p-2.5 bg-white border border-brand-300 rounded-lg"
                  />

                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={otpVerifying || loading}
                    className="w-full py-3 text-sm font-black text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-md shadow-brand-600/30 transition-all flex items-center justify-center space-x-2"
                  >
                    {otpVerifying || loading ? (
                      <span>Verifying & Generating Layout...</span>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Verify OTP & Generate Layout</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 8: RESULTS & 2D FLOOR PLAN COMPARISON */}
        {/* ========================================================================= */}
        {currentStep === 8 && layoutResult && (
          <div className="space-y-6 animate-in fade-in">
            {/* Top Overview Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <span className="bg-brand-100 text-brand-800 text-xs font-black px-2 py-0.5 rounded uppercase tracking-wider">
                    {layoutResult.storeTypeCode}
                  </span>
                  <span className="text-slate-400 text-xs">•</span>
                  <span className="text-slate-600 text-xs font-semibold">
                    Shop: {length} × {breadth} × {height} {unit}
                  </span>
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  {layoutResult.options[activeOptionIndex].title}
                </h2>
                <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                  {layoutResult.options[activeOptionIndex].explanation}
                </p>
              </div>

              {/* Estimate Summary Box */}
              <div className="bg-slate-950 text-white p-4 rounded-xl shrink-0 text-right">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 block">Indicative Cost</span>
                <div className="text-2xl font-black text-brand-400 tracking-tight">
                  ₹{(layoutResult.options[activeOptionIndex]?.estimate?.grandTotal ?? 0).toLocaleString('en-IN')}
                </div>
                <span className="text-[11px] text-slate-400 block">
                  Range: ₹{(layoutResult.options[activeOptionIndex]?.estimate?.minRange ?? 0).toLocaleString('en-IN')} – ₹{(layoutResult.options[activeOptionIndex]?.estimate?.maxRange ?? 0).toLocaleString('en-IN')}
                </span>
                <span className="text-[10px] text-emerald-400 block mt-0.5">Includes 18% GST & Installation</span>
              </div>
            </div>

            {/* Option Tabs (Option A, Option B, Option C & Saved Versions) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {layoutResult.options.map((opt, idx) => {
                const isSelected = activeOptionIndex === idx;
                const tabLabel =
                  opt.versionNumber > 3
                    ? `Version ${opt.versionNumber}`
                    : idx === 0
                    ? 'Option A'
                    : idx === 1
                    ? 'Option B'
                    : 'Option C';

                return (
                  <div
                    key={opt.id || `${opt.versionNumber || idx}-${opt.title}`}
                    onClick={() => handleSelectOption(idx)}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-brand-500 bg-white shadow-md'
                        : 'border-slate-200 bg-slate-50/70 hover:bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        {tabLabel}
                      </span>
                      {isSelected && (
                        <span className="text-[10px] font-bold bg-brand-500 text-white px-2 py-0.5 rounded-full">
                          Active
                        </span>
                      )}
                    </div>
                    <h3 className="font-extrabold text-sm text-slate-900 truncate">
                      {opt.title.includes(':') ? opt.title.split(':')[1].trim() : opt.title}
                    </h3>
                    <div className="mt-2 text-xs text-slate-600 space-y-1">
                      <div className="flex justify-between">
                        <span>Total Fixtures:</span>
                        <strong className="text-slate-900">{opt.totalRacks} units</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Display Area:</span>
                        <strong className="text-slate-900">{opt.totalDisplayAreaSqM} m²</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Estimate:</span>
                        <strong className="text-brand-600 font-bold">
                          ₹{(opt.estimate?.grandTotal ?? 0).toLocaleString('en-IN')}
                        </strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Main Interactive 2D Floor Plan */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3 px-2">
                <div className="flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-brand-500" />
                  <h3 className="text-sm font-bold text-slate-900">Interactive 2D Shop Floor Plan</h3>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    disabled={isDownloadingPdf}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 transition-colors shadow-sm disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5 text-brand-600" />
                    <span>{isDownloadingPdf ? 'Generating PDF...' : 'Download Quotation (PDF)'}</span>
                  </button>
                  <span className="text-xs text-slate-400">Drag fixtures in arrange mode to customize</span>
                </div>
              </div>

              <div className="w-full h-[580px]">
                <ShopFloorCanvas
                  shop={getShopSpec()}
                  racks={layoutResult.options[activeOptionIndex].racks}
                  aisleWidthMm={layoutResult.options[activeOptionIndex].aisleWidthMm}
                  isArrangeMode={isArrangeMode}
                  onToggleArrangeMode={() => setIsArrangeMode(!isArrangeMode)}
                  onRacksChange={handleRacksChange}
                  storeTypeCode={selectedStoreType}
                  onSaveArrangement={handleSaveArrangement}
                  isSaving={isSavingVersion}
                  isRepricing={isRepricing}
                  isDirty={isDirty}
                />
              </div>
            </div>

            {/* Transparent Bill of Materials (BOM) & Line Items */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Fixture Breakdown */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center">
                  <Boxes className="w-4 h-4 mr-2 text-brand-500" />
                  Fixture Quantity Breakdown
                </h3>
                <div className="divide-y divide-slate-100 text-xs">
                  {Object.entries(layoutResult.options[activeOptionIndex]?.racksByType || {}).map(([name, qty]) => (
                    <div key={name} className="py-2.5 flex justify-between items-center">
                      <span className="text-slate-700 font-medium">{name}</span>
                      <span className="font-mono font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-900">
                        {qty} units
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Transparent Material Bill of Materials (BOM) */}
              <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center">
                  <FileText className="w-4 h-4 mr-2 text-brand-500" />
                  Transparent Material Breakdown & Costing
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] tracking-wider">
                        <th className="pb-2">Material / Component Description</th>
                        <th className="pb-2 text-right">Qty</th>
                        <th className="pb-2 text-right">Rate (₹)</th>
                        <th className="pb-2 text-right">Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(layoutResult.options[activeOptionIndex]?.estimate?.items || []).map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2 pr-2 text-slate-800 font-medium">{item.description}</td>
                          <td className="py-2 text-right text-slate-600 font-mono">
                            {item.quantity} {item.unit}
                          </td>
                          <td className="py-2 text-right text-slate-600 font-mono">
                            ₹{item.unitRate}
                          </td>
                          <td className="py-2 text-right font-bold text-slate-900 font-mono">
                            ₹{(item.totalAmount ?? 0).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-slate-200 font-bold">
                        <td colSpan={3} className="pt-2 text-right text-slate-600">Subtotal:</td>
                        <td className="pt-2 text-right font-mono">
                          ₹{(layoutResult.options[activeOptionIndex]?.estimate?.subTotal ?? 0).toLocaleString('en-IN')}
                        </td>
                      </tr>
                      <tr className="font-bold">
                        <td colSpan={3} className="text-right text-slate-600">GST @ 18%:</td>
                        <td className="text-right font-mono">
                          ₹{(layoutResult.options[activeOptionIndex]?.estimate?.totalGstCost ?? 0).toLocaleString('en-IN')}
                        </td>
                      </tr>
                      <tr className="border-t border-slate-200 font-black text-sm text-brand-600">
                        <td colSpan={3} className="pt-2 text-right">Estimated Total:</td>
                        <td className="pt-2 text-right font-mono">
                          ₹{(layoutResult.options[activeOptionIndex]?.estimate?.grandTotal ?? 0).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-500 italic">
                  * {layoutResult.options[activeOptionIndex]?.estimate?.disclaimer || 'Authoritative deterministic estimate based on active raw material rates and statutory 18% GST.'}
                </div>
              </div>
            </div>

            {/* Next Steps CTA Bar */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-xl p-6 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="font-extrabold text-base">Ready to proceed with JK Engineers Works?</h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Book a physical laser site visit in Mumbai or speak directly with our design engineering team.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <a
                  href={`https://wa.me/917942546295?text=Hello%20JK%20Engineers%20Works,%20I%20designed%20my%20shop%20layout%20(Ref:%20${generatedProjectCode})%20and%20would%20like%20to%20discuss.`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center"
                >
                  <PhoneCall className="w-3.5 h-3.5 mr-1.5" />
                  Chat on WhatsApp
                </a>

                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={isDownloadingPdf}
                  className="px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center shadow-md disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  <span>{isDownloadingPdf ? 'Generating PDF...' : 'Download Quotation (PDF)'}</span>
                </button>

                <button
                  onClick={() => router.push(`/customer/projects/${generatedProjectId}`)}
                  className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-lg transition-colors flex items-center"
                >
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  View in Customer Portal
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Wizard Bottom Navigation Buttons (Steps 1 to 6) */}
        {currentStep < 7 && (
          <div className="mt-6 flex items-center justify-between">
            <button
              onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
              disabled={currentStep === 1}
              className="inline-flex items-center px-4 py-2 text-xs font-bold rounded-lg text-slate-600 hover:bg-slate-200 disabled:opacity-30 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Previous
            </button>

            <button
              onClick={handleNext}
              disabled={loading}
              className="inline-flex items-center px-6 py-2.5 text-xs font-bold rounded-lg text-white bg-brand-500 hover:bg-brand-600 shadow-sm transition-all disabled:opacity-50"
            >
              <span>
                {loading
                  ? 'Generating Custom Layout...'
                  : currentStep === 6
                  ? (customerSession?.customer?.id || customerSession?.role === 'ADMIN' ? 'Proceed to Design' : 'Next: Verify Phone')
                  : 'Next Step'}
              </span>
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </button>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
