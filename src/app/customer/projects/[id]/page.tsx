'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Navbar } from '@/presentation/components/navigation/Navbar';
import { Footer } from '@/presentation/components/navigation/Footer';
import { ShopFloorCanvas } from '@/presentation/components/canvas/ShopFloorCanvas';
import { ShopSpecification } from '@/domain/entities/Shop';
import { PlacedRack } from '@/domain/entities/Rack';
import {
  Layers,
  ArrowLeft,
  FileText,
  Boxes,
  ShieldCheck,
  PhoneCall,
  Calendar,
  IndianRupee,
  CheckCircle,
  Download,
} from 'lucide-react';

export default function CustomerProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [loading, setLoading] = useState<boolean>(true);
  const [project, setProject] = useState<any>(null);
  const [activeVersionIndex, setActiveVersionIndex] = useState<number>(0);

  // Interactive 2D Arrange Mode States
  const [isArrangeMode, setIsArrangeMode] = useState<boolean>(false);
  const [isRepricing, setIsRepricing] = useState<boolean>(false);
  const [isSavingVersion, setIsSavingVersion] = useState<boolean>(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState<boolean>(false);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [customRacks, setCustomRacks] = useState<PlacedRack[] | null>(null);
  const repriceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetch(`/api/projects/${projectId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.project) {
          setProject(data.project);
        } else {
          router.push('/customer/dashboard');
        }
      })
      .catch((e) => {
        console.error(e);
        router.push('/customer/dashboard');
      })
      .finally(() => setLoading(false));
  }, [projectId, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Navbar />
        <div className="flex-1 flex items-center justify-center text-slate-400">
          Loading project details...
        </div>
        <Footer />
      </div>
    );
  }

  if (!project) return null;

  const versions = project.designs[0]?.versions || [];
  const currentVersion = versions[activeVersionIndex] || versions[0];
  const estimate = currentVersion?.estimate;

  // Build shop spec for canvas
  const dims = project.shop?.dimensions || { lengthMm: 6000, breadthMm: 4500, heightMm: 3000 };
  const shopSpec: ShopSpecification = {
    id: project.shop?.id,
    shape: project.shop?.shape || 'RECTANGLE',
    dimensions: {
      lengthMm: dims.verifiedLengthMm || dims.lengthMm,
      breadthMm: dims.verifiedBreadthMm || dims.breadthMm,
      heightMm: dims.verifiedHeightMm || dims.heightMm,
      displayUnit: dims.displayUnit || 'FEET',
    },
    openings: project.shop?.openings || [],
    obstacles: project.shop?.obstacles || [],
  };

  const racks: PlacedRack[] = currentVersion?.racks?.map((r: any) => ({
    rackTypeCode: r.rackType?.code || 'WALL_RACK',
    rackTypeName: r.rackType?.name || 'Rack',
    category: r.rackType?.category || 'WALL_RACK',
    label: r.label,
    posX: r.posX,
    posY: r.posY,
    rotation: r.rotation,
    widthMm: r.widthMm,
    depthMm: r.depthMm,
    heightMm: r.heightMm,
    shelvesCount: r.shelvesCount,
    wallPlacement: r.wallPlacement,
    loadCapacityKg: r.rackType?.loadCapacityKg || 70,
    isDoubleSided: r.rackType?.isDoubleSided || false,
  })) || [];

  const displayedRacks: PlacedRack[] = customRacks || racks;

  const handleRacksChange = (updatedRacks: PlacedRack[]) => {
    setCustomRacks(updatedRacks);
    setIsDirty(true);

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
          setProject((prev: any) => {
            if (!prev) return prev;
            const updated = JSON.parse(JSON.stringify(prev));
            const activeVer = updated.designs[0].versions[activeVersionIndex];
            if (activeVer) {
              activeVer.estimate = data.estimate;
              activeVer.totalRacks = data.totalRacks;
              activeVer.totalDisplayAreaSqM = data.totalDisplayAreaSqM;
            }
            return updated;
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
    if (!project) return;
    setIsSavingVersion(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          racks: displayedRacks,
          includeInstallation: true,
          note: 'Customer customized layout',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsDirty(false);
        setCustomRacks(null);
        const projRes = await fetch(`/api/projects/${projectId}`);
        const projData = await projRes.json();
        if (projData.success && projData.project) {
          setProject(projData.project);
          setActiveVersionIndex(0);
          alert(`New Layout Version ${data.version?.versionNumber} successfully saved!`);
        }
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
    if (!project) return;
    setIsDownloadingPdf(true);
    try {
      const verId = currentVersion?.id ? `?versionId=${currentVersion.id}` : '';
      const link = document.createElement('a');
      link.href = `/api/projects/${projectId}/pdf${verId}`;
      link.setAttribute(
        'download',
        `JK-Engineers-Works-Quotation-${project.projectCode}-V${currentVersion?.versionNumber || 1}.pdf`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Download PDF error:', err);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/customer/dashboard"
            className="inline-flex items-center text-xs font-bold text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Dashboard
          </Link>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded border border-slate-200">
              Ref: {project.projectCode}
            </span>
            {project.siteVerified && (
              <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded border border-emerald-200 flex items-center">
                <CheckCircle className="w-3.5 h-3.5 mr-1" />
                Site Verified
              </span>
            )}
          </div>
        </div>

        {/* Project Header */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-brand-600">
              {project.storeType.name}
            </span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
              Shop Design Layout & Quotation
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Dimensions: {(dims.lengthMm / 304.8).toFixed(1)} ft × {(dims.breadthMm / 304.8).toFixed(1)} ft • Budget: ₹{project.budget.toLocaleString('en-IN')}
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-3">
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="px-4 py-3 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl transition-all flex items-center shadow-md disabled:opacity-50"
            >
              <Download className="w-4 h-4 mr-1.5" />
              <span>{isDownloadingPdf ? 'Generating PDF...' : 'Download Quotation (PDF)'}</span>
            </button>

            {estimate && (
              <div className="bg-slate-950 text-white p-4 rounded-xl text-right shrink-0">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 block">Indicative Cost</span>
                <div className="text-2xl font-black text-brand-400">
                  ₹{estimate.grandTotal.toLocaleString('en-IN')}
                </div>
                <span className="text-[11px] text-slate-400">
                  Range: ₹{estimate.minRange.toLocaleString('en-IN')} – ₹{estimate.maxRange.toLocaleString('en-IN')}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Version Switcher Tabs */}
        {versions.length > 0 && (
          <div className="flex items-center space-x-2 border-b border-slate-200 pb-2 overflow-x-auto">
            {versions.map((ver: any, idx: number) => (
              <button
                key={ver.id}
                onClick={() => {
                  setActiveVersionIndex(idx);
                  setCustomRacks(null);
                  setIsDirty(false);
                }}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                  activeVersionIndex === idx
                    ? 'bg-brand-500 text-white shadow-sm'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {ver.optionType === 'OPTION_A_MAX_DISPLAY'
                  ? 'Option A: Max Display'
                  : ver.optionType === 'OPTION_B_BALANCED'
                  ? 'Option B: Balanced'
                  : ver.optionType === 'OPTION_C_BUDGET_OPTIMIZED'
                  ? 'Option C: Budget Optimized'
                  : `Version ${ver.versionNumber}: Custom Layout`}
              </button>
            ))}
          </div>
        )}

        {/* 2D Interactive Canvas */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="min-h-[520px]">
            <ShopFloorCanvas
              shop={shopSpec}
              racks={displayedRacks}
              aisleWidthMm={currentVersion?.aisleWidthMm || 1000}
              isArrangeMode={isArrangeMode}
              onToggleArrangeMode={() => setIsArrangeMode(!isArrangeMode)}
              onRacksChange={handleRacksChange}
              storeTypeCode={project.storeType?.code || 'SUPERMARKET'}
              onSaveArrangement={handleSaveArrangement}
              isSaving={isSavingVersion}
              isRepricing={isRepricing}
              isDirty={isDirty}
            />
          </div>
        </div>

        {/* Breakdown & Bill of Materials */}
        {estimate && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center">
                <Boxes className="w-4 h-4 mr-2 text-brand-500" />
                Placed Fixtures ({racks.length} total)
              </h3>
              <div className="divide-y divide-slate-100 text-xs">
                {racks.map((r, i) => (
                  <div key={i} className="py-2 flex justify-between">
                    <span className="text-slate-700 font-medium">{r.rackTypeName}</span>
                    <span className="text-slate-500 font-mono">{r.widthMm}mm ({r.shelvesCount} tiers)</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center">
                <FileText className="w-4 h-4 mr-2 text-brand-500" />
                Transparent Material Breakdown
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] tracking-wider">
                      <th className="pb-2">Description</th>
                      <th className="pb-2 text-right">Quantity</th>
                      <th className="pb-2 text-right">Unit Rate (₹)</th>
                      <th className="pb-2 text-right">Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {estimate.items?.map((it: any) => (
                      <tr key={it.id} className="hover:bg-slate-50">
                        <td className="py-2 text-slate-800 font-medium">{it.description}</td>
                        <td className="py-2 text-right font-mono text-slate-600">{it.quantity} {it.unit}</td>
                        <td className="py-2 text-right font-mono text-slate-600">₹{it.unitRate}</td>
                        <td className="py-2 text-right font-bold text-slate-900 font-mono">
                          ₹{it.totalAmount.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-200 font-black text-sm text-brand-600">
                      <td colSpan={3} className="pt-2 text-right">Grand Total (inc 18% GST):</td>
                      <td className="pt-2 text-right font-mono">
                        ₹{estimate.grandTotal.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Contact Action Bar */}
        <div className="bg-slate-900 text-white rounded-xl p-6 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-base">Questions about this layout?</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Contact JK Engineers Works design desk to request a site visit or technical consultation.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/quotations/${project.id}`}
              className="px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold rounded-lg transition-colors inline-flex items-center"
            >
              <FileText className="w-4 h-4 mr-1.5" />
              View / Print Official Quotation
            </Link>

            <a
              href={`https://wa.me/917942546295?text=Hello%20JK%20Engineers%20Works,%20I%20have%20questions%20regarding%20my%20saved%20project%20${project.projectCode}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors inline-flex items-center shrink-0"
            >
              <PhoneCall className="w-4 h-4 mr-1.5" />
              Chat on WhatsApp
            </a>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
