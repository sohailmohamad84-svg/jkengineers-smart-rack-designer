'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { AdminLayout } from '@/presentation/components/admin/AdminLayout';
import { ShopFloorCanvas } from '@/presentation/components/canvas/ShopFloorCanvas';
import { ShopSpecification } from '@/domain/entities/Shop';
import { PlacedRack } from '@/domain/entities/Rack';
import {
  ArrowLeft,
  PhoneCall,
  MessageSquare,
  CheckCircle,
  FileText,
  Boxes,
  Plus,
  ShieldCheck,
  Ruler,
  AlertCircle,
  Save,
  Send,
} from 'lucide-react';

export default function AdminCustomerDetailPage() {
  const params = useParams();
  const customerId = params.id as string;
  const router = useRouter();

  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProjectIndex, setSelectedProjectIndex] = useState(0);
  const [selectedVersionIndex, setSelectedVersionIndex] = useState(0);

  // New Note
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  // Lead Status Update
  const [currentLeadStatus, setCurrentLeadStatus] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Site Measurement Modal
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyLengthMm, setVerifyLengthMm] = useState(0);
  const [verifyBreadthMm, setVerifyBreadthMm] = useState(0);
  const [verifyHeightMm, setVerifyHeightMm] = useState(0);
  const [verifyNotes, setVerifyNotes] = useState('');
  const [verifying, setVerifying] = useState(false);

  // Quotation Generation Modal
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [quoteValidityDays, setQuoteValidityDays] = useState(15);
  const [quoteTerms, setQuoteTerms] = useState('');
  const [generatingQuote, setGeneratingQuote] = useState(false);
  const [generatedQuote, setGeneratedQuote] = useState<any>(null);

  const loadCustomer = async () => {
    try {
      const res = await fetch(`/api/admin/customers/${customerId}`);
      const data = await res.json();
      if (data.success && data.customer) {
        setCustomer(data.customer);
        const proj = data.customer.projects[selectedProjectIndex] || data.customer.projects[0];
        if (proj) {
          setCurrentLeadStatus(proj.leadStatus);
          const dims = proj.shop?.dimensions;
          if (dims) {
            setVerifyLengthMm(dims.verifiedLengthMm || dims.lengthMm);
            setVerifyBreadthMm(dims.verifiedBreadthMm || dims.breadthMm);
            setVerifyHeightMm(dims.verifiedHeightMm || dims.heightMm);
          }
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomer();
  }, [customerId]);

  const handleStatusChange = async (newStatus: string) => {
    setCurrentLeadStatus(newStatus);
    const proj = customer?.projects[selectedProjectIndex];
    if (!proj) return;

    setUpdatingStatus(true);
    try {
      await fetch(`/api/admin/projects/${proj.id}/lead-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadStatus: newStatus }),
      });
      loadCustomer();
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;

    setSavingNote(true);
    try {
      await fetch(`/api/admin/customers/${customerId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteText }),
      });
      setNoteText('');
      loadCustomer();
    } catch (e) {
      console.error(e);
    } finally {
      setSavingNote(false);
    }
  };

  const handleVerifyMeasurements = async () => {
    const proj = customer?.projects[selectedProjectIndex];
    if (!proj) return;

    setVerifying(true);
    try {
      const res = await fetch(`/api/admin/projects/${proj.id}/verify-dimensions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verifiedLengthMm: Number(verifyLengthMm),
          verifiedBreadthMm: Number(verifyBreadthMm),
          verifiedHeightMm: Number(verifyHeightMm),
          adminNotes: verifyNotes,
          regenerateDesign: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowVerifyModal(false);
        loadCustomer();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setVerifying(false);
    }
  };

  const handleCreateQuotation = async () => {
    const proj = customer?.projects[selectedProjectIndex];
    const version = proj?.designs[0]?.versions[selectedVersionIndex];
    const estimateId = version?.estimate?.id;
    if (!estimateId) return;

    setGeneratingQuote(true);
    try {
      const res = await fetch('/api/admin/quotations/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estimateId,
          validityDays: quoteValidityDays,
          customTerms: quoteTerms || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setGeneratedQuote(data.quotation);
        loadCustomer();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setGeneratingQuote(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64 text-slate-500">
          Loading customer record...
        </div>
      </AdminLayout>
    );
  }

  if (!customer) return null;

  const project = customer.projects[selectedProjectIndex] || customer.projects[0];
  const versions = project?.designs[0]?.versions || [];
  const activeVersion = versions[selectedVersionIndex] || versions[0];
  const estimate = activeVersion?.estimate;
  const dims = project?.shop?.dimensions;

  const shopSpec: ShopSpecification = {
    id: project?.shop?.id,
    shape: project?.shop?.shape || 'RECTANGLE',
    dimensions: {
      lengthMm: dims?.verifiedLengthMm || dims?.lengthMm || 6000,
      breadthMm: dims?.verifiedBreadthMm || dims?.breadthMm || 4500,
      heightMm: dims?.verifiedHeightMm || dims?.heightMm || 3000,
      displayUnit: dims?.displayUnit || 'FEET',
    },
    openings: project?.shop?.openings || [],
    obstacles: project?.shop?.obstacles || [],
  };

  const racks: PlacedRack[] = activeVersion?.racks?.map((r: any) => ({
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

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/admin/customers"
            className="inline-flex items-center text-xs font-bold text-slate-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Customers Directory
          </Link>

          <div className="flex items-center space-x-3">
            <a
              href={`tel:+91${customer.user?.mobile}`}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold flex items-center border border-slate-700"
            >
              <PhoneCall className="w-3.5 h-3.5 mr-1.5" />
              Call Client
            </a>
            <a
              href={`https://wa.me/91${customer.whatsappNumber || customer.user?.mobile}?text=Hello%20${encodeURIComponent(customer.fullName)},%20this%20is%20JK%20Engineers%20Works%20Mumbai%20regarding%20project%20${project?.projectCode}.`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center shadow-sm"
            >
              <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
              WhatsApp Client
            </a>
          </div>
        </div>

        {/* Customer Profile Header */}
        <div className="bg-slate-950 border border-slate-800 p-6 rounded-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <span className="text-brand-400 font-bold text-xs uppercase tracking-wider">Client File</span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-400 text-xs">Registered {new Date(customer.createdAt).toLocaleDateString('en-IN')}</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">{customer.fullName}</h1>
            <p className="text-xs text-slate-400 mt-1">
              {customer.businessName || 'Independent Retailer'} • {customer.shopLocation}, {customer.city}
            </p>
          </div>

          {/* CRM Lead Status Dropdown */}
          <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg flex items-center space-x-3">
            <span className="text-xs text-slate-400 font-bold uppercase">Lead Status:</span>
            <select
              value={currentLeadStatus}
              disabled={updatingStatus}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-white text-xs font-bold py-1.5 px-3 rounded-md focus:ring-1 focus:ring-brand-500 focus:outline-none"
            >
              <option value="NEW">New Lead</option>
              <option value="CONTACTED">Contacted</option>
              <option value="SITE_VISIT_REQUIRED">Site Visit Required</option>
              <option value="DESIGN_PREPARED">Design Prepared</option>
              <option value="QUOTATION_SENT">Quotation Sent</option>
              <option value="NEGOTIATION">Negotiation</option>
              <option value="CONFIRMED">Confirmed / Order Won</option>
              <option value="PRODUCTION">In Factory Production</option>
              <option value="INSTALLATION">Site Installation</option>
              <option value="COMPLETED">Completed</option>
              <option value="LOST">Lost</option>
            </select>
          </div>
        </div>

        {/* Project & 2D Layout Workspace */}
        {project && (
          <div className="space-y-6">
            <div className="bg-slate-950 border border-slate-800 p-6 rounded-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-sm font-black text-brand-400">{project.projectCode}</span>
                    <span className="text-slate-400">•</span>
                    <span className="font-bold text-white text-sm">{project.storeType?.name}</span>
                    {project.siteVerified && (
                      <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold px-2 py-0.5 rounded">
                        ✓ Verified Measurements
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Client Dimensions: {(dims?.lengthMm / 304.8).toFixed(1)} ft × {(dims?.breadthMm / 304.8).toFixed(1)} ft • Budget: ₹{project.budget.toLocaleString('en-IN')}
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowVerifyModal(true)}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold border border-slate-700 flex items-center transition-colors"
                  >
                    <Ruler className="w-3.5 h-3.5 mr-1.5 text-brand-400" />
                    Enter Verified Site Measurements
                  </button>

                  <button
                    onClick={() => setShowQuoteModal(true)}
                    className="px-3.5 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-xs font-bold flex items-center transition-colors shadow-sm"
                  >
                    <FileText className="w-3.5 h-3.5 mr-1.5" />
                    Issue Formal Quotation
                  </button>
                </div>
              </div>

              {/* Version Switcher */}
              <div className="flex items-center space-x-2">
                {versions.map((v: any, idx: number) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVersionIndex(idx)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                      selectedVersionIndex === idx
                        ? 'bg-brand-500 text-white'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {v.optionType === 'OPTION_A_MAX_DISPLAY'
                      ? 'Option A: Max Display'
                      : v.optionType === 'OPTION_B_BALANCED'
                      ? 'Option B: Balanced'
                      : 'Option C: Budget Optimized'}
                  </button>
                ))}
              </div>

              {/* 2D Canvas */}
              <div className="w-full h-[580px]">
                <ShopFloorCanvas
                  shop={shopSpec}
                  racks={racks}
                  aisleWidthMm={activeVersion?.aisleWidthMm || 1000}
                />
              </div>

              {/* Estimate Breakdown */}
              {estimate && (
                <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-xs text-slate-400 uppercase font-bold block">Current Active Estimate</span>
                    <div className="text-xl font-black text-brand-400 font-mono">
                      ₹{estimate.grandTotal.toLocaleString('en-IN')}
                    </div>
                    <span className="text-[11px] text-slate-500">
                      Indicative range: ₹{estimate.minRange.toLocaleString('en-IN')} – ₹{estimate.maxRange.toLocaleString('en-IN')} (incl 18% GST)
                    </span>
                  </div>

                  <div className="flex items-center space-x-4 text-xs text-slate-300 font-mono">
                    <div>Fixtures: <strong className="text-white">{racks.length}</strong></div>
                    <div>Display Area: <strong className="text-white">{activeVersion.totalDisplayAreaSqM} m²</strong></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Two Columns: Customer Notes & Activity History */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Notes Section */}
          <div className="bg-slate-950 border border-slate-800 p-6 rounded-xl space-y-4">
            <h3 className="text-sm font-bold text-white">Internal Admin Notes & Call History</h3>

            <form onSubmit={handleAddNote} className="space-y-2">
              <textarea
                rows={2}
                placeholder="Add note on phone conversation, site visit, or customer requirements..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                className="w-full p-3 bg-slate-900 border border-slate-800 rounded-lg text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              <button
                type="submit"
                disabled={savingNote}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg transition-colors flex items-center"
              >
                <Save className="w-3.5 h-3.5 mr-1.5" />
                {savingNote ? 'Saving...' : 'Add Internal Note'}
              </button>
            </form>

            <div className="divide-y divide-slate-800 text-xs max-h-60 overflow-y-auto pt-2">
              {customer.customerNotes?.length === 0 ? (
                <div className="py-4 text-center text-slate-500">No notes recorded yet.</div>
              ) : (
                customer.customerNotes?.map((n: any) => (
                  <div key={n.id} className="py-2.5 space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span className="font-semibold text-slate-300">{n.admin?.username || 'Admin'}</span>
                      <span className="font-mono">{new Date(n.createdAt).toLocaleDateString('en-IN')}</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed">{n.noteText}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quotations History */}
          <div className="bg-slate-950 border border-slate-800 p-6 rounded-xl space-y-4">
            <h3 className="text-sm font-bold text-white">Formal Quotations Issued</h3>

            <div className="divide-y divide-slate-800 text-xs">
              {project?.quotations?.length === 0 ? (
                <div className="py-6 text-center text-slate-500">
                  No formal quotation has been issued yet. Click "Issue Formal Quotation" above.
                </div>
              ) : (
                project?.quotations?.map((q: any) => (
                  <div key={q.id} className="py-3 flex items-center justify-between">
                    <div>
                      <span className="font-mono font-bold text-brand-400 block">{q.quotationNumber}</span>
                      <span className="text-[11px] text-slate-400">
                        Validity: {q.validityDays} days • Status: <strong className="text-emerald-400">{q.status}</strong>
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-500">
                      {new Date(q.createdAt).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Site Measurement Verification Modal */}
        {showVerifyModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 text-white shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <Ruler className="w-5 h-5 text-brand-400" />
                  <h3 className="text-base font-bold">Verify Field Site Measurements</h3>
                </div>
                <button onClick={() => setShowVerifyModal(false)} className="text-slate-400 hover:text-white">
                  ✕
                </button>
              </div>

              <p className="text-xs text-slate-400">
                Enter laser-verified site measurements taken by JK Engineers Works technicians. The layout engine will automatically regenerate the design.
              </p>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                    Verified Length (mm)
                  </label>
                  <input
                    type="number"
                    value={verifyLengthMm}
                    onChange={(e) => setVerifyLengthMm(parseInt(e.target.value) || 0)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                  />
                  <span className="text-[10px] text-slate-500">{(verifyLengthMm / 304.8).toFixed(2)} feet</span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                    Verified Breadth / Width (mm)
                  </label>
                  <input
                    type="number"
                    value={verifyBreadthMm}
                    onChange={(e) => setVerifyBreadthMm(parseInt(e.target.value) || 0)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                  />
                  <span className="text-[10px] text-slate-500">{(verifyBreadthMm / 304.8).toFixed(2)} feet</span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                    Verified Height (mm)
                  </label>
                  <input
                    type="number"
                    value={verifyHeightMm}
                    onChange={(e) => setVerifyHeightMm(parseInt(e.target.value) || 0)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                  />
                  <span className="text-[10px] text-slate-500">{(verifyHeightMm / 304.8).toFixed(2)} feet</span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                    Verification Notes
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Measured by Engineer Amit via Bosch laser tool"
                    value={verifyNotes}
                    onChange={(e) => setVerifyNotes(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowVerifyModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleVerifyMeasurements}
                  disabled={verifying}
                  className="px-5 py-2 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold rounded-lg shadow-sm"
                >
                  {verifying ? 'Regenerating Layout...' : 'Save & Regenerate Layout'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quotation Generation Modal */}
        {showQuoteModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 text-white shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-brand-400" />
                  <h3 className="text-base font-bold">Generate Official Commercial Quotation</h3>
                </div>
                <button onClick={() => setShowQuoteModal(false)} className="text-slate-400 hover:text-white">
                  ✕
                </button>
              </div>

              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1">
                <div className="text-slate-400">Project Reference: <strong className="text-white">{project?.projectCode}</strong></div>
                <div className="text-slate-400">Total Quotation Value: <strong className="text-brand-400 font-mono">₹{(estimate?.grandTotal || 0).toLocaleString('en-IN')}</strong> (incl 18% GST)</div>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                    Price Validity (Days)
                  </label>
                  <input
                    type="number"
                    min="7"
                    max="60"
                    value={quoteValidityDays}
                    onChange={(e) => setQuoteValidityDays(parseInt(e.target.value) || 15)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                    Custom Terms & Conditions (Optional)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Leave blank to use standard company terms (Tata steel, 7-tank coating, 50% advance)..."
                    value={quoteTerms}
                    onChange={(e) => setQuoteTerms(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>
              </div>

              {generatedQuote && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-lg">
                  Quotation <strong>{generatedQuote.quotationNumber}</strong> successfully created and logged.
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowQuoteModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleCreateQuotation}
                  disabled={generatingQuote}
                  className="px-5 py-2 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold rounded-lg shadow-sm"
                >
                  {generatingQuote ? 'Issuing...' : 'Issue Formal Quotation'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
