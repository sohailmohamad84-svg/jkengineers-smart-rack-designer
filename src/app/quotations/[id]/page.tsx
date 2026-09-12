'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Printer, ArrowLeft, Download, ShieldCheck, Phone, Mail, MapPin } from 'lucide-react';

export default function QuotationViewPage() {
  const params = useParams();
  const quotationId = params.id as string;
  const router = useRouter();

  const [quotation, setQuotation] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In our project, quotationId might be a quotation id or project id
    fetch(`/api/projects/${quotationId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.project) {
          const proj = data.project;
          const activeDesign = proj.designs?.[0];
          const activeVersion =
            activeDesign?.versions?.find((v: any) => v.id === activeDesign.activeVersionId) ||
            activeDesign?.versions?.[0];
          const rawEstimate = activeVersion?.estimate;
          const subTotal = rawEstimate
            ? (rawEstimate.subTotal ?? Math.round(rawEstimate.grandTotal - (rawEstimate.totalGstCost || 0)))
            : 0;
          const disclaimer =
            rawEstimate?.disclaimer ||
            'This quotation is an indicative engineering estimate based on client-provided shop dimensions. Final fabrication and material billing will be reconciled post physical site laser measurement.';
          const estimate = rawEstimate
            ? {
                ...rawEstimate,
                subTotal,
                disclaimer,
              }
            : null;

          const quote = proj.quotations?.[0] || {
            quotationNumber: `Q-JK-2026-${proj.projectCode.slice(-4)}`,
            status: 'ISSUED',
            validityDays: 15,
            termsConditions: `1. Validity: 15 days from issuance date.
2. Raw Material: Prime standard Tata / JSW CRCA Steel sheets with 7-tank anti-rust pre-treatment.
3. Finish: Pure epoxy polyester powder coating (60-80 microns thickness) in approved shade.
4. Delivery: 10-14 working days from technical drawing sign-off.
5. Payment Terms: 50% advance with order, 40% before dispatch, balance 10% on installation sign-off.`,
            createdAt: new Date().toISOString(),
          };

          setQuotation({
            ...quote,
            customer: proj.customer,
            project: proj,
            estimate,
            version: activeVersion,
          });
        }
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, [quotationId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 text-slate-500">
        Loading quotation document...
      </div>
    );
  }

  if (!quotation || !quotation.estimate) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100 p-4">
        <p className="text-slate-600 mb-4">Quotation or estimate records not found.</p>
        <Link href="/customer/dashboard" className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const { customer, project, estimate } = quotation;
  const dims = project.shop?.dimensions;

  return (
    <div className="min-h-screen bg-slate-200 py-8 px-4 sm:px-6 print:p-0 print:bg-white">
      {/* Top Action Bar (Hidden when printing) */}
      <div className="max-w-4xl mx-auto mb-6 flex items-center justify-between print:hidden">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center text-xs font-bold text-slate-700 hover:text-slate-900 bg-white px-3 py-2 rounded-lg border border-slate-300 shadow-sm"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back
        </button>

        <div className="flex items-center space-x-3">
          <a
            href={`/api/projects/${project.id}/pdf`}
            download={`JK-Engineers-Works-Quotation-${project.projectCode}.pdf`}
            className="inline-flex items-center px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-lg shadow-sm transition-colors"
          >
            <Download className="w-4 h-4 mr-1.5" />
            Download Official PDF
          </a>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-lg shadow-sm transition-colors"
          >
            <Printer className="w-4 h-4 mr-1.5" />
            Print / Browser PDF
          </button>
        </div>
      </div>

      {/* Printable Sheet */}
      <div className="max-w-4xl mx-auto bg-white border border-slate-300 shadow-xl rounded-xl print:rounded-none print:shadow-none print:border-none p-8 sm:p-12 text-slate-800 text-xs font-sans space-y-6">
        {/* Header with Company Logo & Details */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between pb-6 border-b-2 border-slate-900 gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <div className="w-9 h-9 rounded bg-brand-500 text-white flex items-center justify-center font-black text-lg">
                JK
              </div>
              <h1 className="font-black text-xl text-slate-900 tracking-tight">
                JK ENGINEERS WORKS
              </h1>
            </div>
            <p className="text-[11px] text-slate-500 font-semibold">
              Supermarket Racks, Display Racks & Commercial Store Interiors
            </p>
            <div className="text-[11px] text-slate-600 space-y-0.5 pt-1">
              <div className="flex items-center space-x-1.5">
                <MapPin className="w-3 h-3 text-slate-400" />
                <span>Mumbai, Maharashtra, India</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <Phone className="w-3 h-3 text-slate-400" />
                <span>+91 7942546295</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <Mail className="w-3 h-3 text-slate-400" />
                <span>info@jkengineersworks.com • www.jkengineersworks.in</span>
              </div>
            </div>
          </div>

          <div className="text-right sm:self-start space-y-1">
            <span className="text-base font-black text-brand-600 font-mono block">
              {quotation.quotationNumber}
            </span>
            <div className="text-[11px] text-slate-500">
              Date: <strong className="text-slate-800">{new Date(quotation.createdAt).toLocaleDateString('en-IN')}</strong>
            </div>
            <div className="text-[11px] text-slate-500">
              Validity: <strong className="text-slate-800">{quotation.validityDays} Days</strong>
            </div>
            <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
              {estimate.isIndicative ? 'Indicative Commercial Estimate' : 'Confirmed Quotation'}
            </span>
          </div>
        </div>

        {/* Client & Project Reference Grid */}
        <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-lg border border-slate-200">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Quotation Issued To:
            </span>
            <h3 className="font-bold text-sm text-slate-900">{customer.fullName}</h3>
            {customer.businessName && (
              <p className="font-semibold text-xs text-brand-600">{customer.businessName}</p>
            )}
            <p className="text-slate-600 text-xs mt-0.5">{customer.shopLocation}, {customer.city}</p>
            <p className="text-slate-600 font-mono text-xs">Mobile: +91 {customer.user?.mobile || customer.whatsappNumber}</p>
          </div>

          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Store & Project Details:
            </span>
            <div className="space-y-0.5 text-xs text-slate-700">
              <div>Project Code: <strong className="font-mono text-slate-900">{project.projectCode}</strong></div>
              <div>Retail Category: <strong className="text-slate-900">{project.storeType?.name}</strong></div>
              {dims && (
                <div>
                  Shop Dimensions: <strong className="text-slate-900">
                    {(dims.lengthMm / 304.8).toFixed(1)} ft (L) × {(dims.breadthMm / 304.8).toFixed(1)} ft (W) × {(dims.heightMm / 304.8).toFixed(1)} ft (H)
                  </strong>
                </div>
              )}
              <div>
                Site Measurement Status: <strong className={project.siteVerified ? 'text-emerald-600' : 'text-amber-600'}>
                  {project.siteVerified ? 'Laser Verified by JK Technician' : 'Customer Indicative Entry'}
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* Itemized Bill of Materials Table */}
        <div className="space-y-2">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">
            Bill of Materials & Component Costing
          </h3>
          <table className="w-full text-left text-xs border border-slate-200 divide-y divide-slate-200">
            <thead className="bg-slate-100 text-slate-600 font-bold text-[11px]">
              <tr>
                <th className="p-2.5 w-12 text-center">#</th>
                <th className="p-2.5">Item & Material Specification</th>
                <th className="p-2.5 text-right">Qty</th>
                <th className="p-2.5 text-right">Unit Rate (₹)</th>
                <th className="p-2.5 text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {estimate.items?.map((item: any, i: number) => (
                <tr key={i}>
                  <td className="p-2.5 text-center font-mono text-slate-400">{i + 1}</td>
                  <td className="p-2.5 font-medium">{item.description}</td>
                  <td className="p-2.5 text-right font-mono">{item.quantity} {item.unit}</td>
                  <td className="p-2.5 text-right font-mono">₹{item.unitRate}</td>
                  <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                    ₹{(item.totalAmount ?? 0).toLocaleString('en-IN')}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 font-bold divide-y divide-slate-200">
              <tr>
                <td colSpan={4} className="p-2.5 text-right text-slate-600">Sub-Total:</td>
                <td className="p-2.5 text-right font-mono text-slate-900">
                  ₹{((estimate.subTotal ?? (estimate.grandTotal - (estimate.totalGstCost || 0))) || 0).toLocaleString('en-IN')}
                </td>
              </tr>
              <tr>
                <td colSpan={4} className="p-2.5 text-right text-slate-600">Goods & Services Tax (GST @ 18%):</td>
                <td className="p-2.5 text-right font-mono text-slate-900">
                  ₹{(estimate.totalGstCost ?? 0).toLocaleString('en-IN')}
                </td>
              </tr>
              <tr className="bg-slate-100 text-sm font-black text-brand-600">
                <td colSpan={4} className="p-3 text-right">Total Estimated Project Cost:</td>
                <td className="p-3 text-right font-mono">
                  ₹{(estimate.grandTotal ?? 0).toLocaleString('en-IN')}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Commercial Terms & Conditions */}
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2">
          <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800">
            Terms & Conditions
          </h4>
          <pre className="font-sans text-[11px] text-slate-600 whitespace-pre-line leading-relaxed">
            {quotation.termsConditions}
          </pre>
        </div>

        {/* Statutory Disclaimers & Signatures */}
        <div className="pt-4 border-t border-slate-200 space-y-6">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-900 leading-relaxed">
            <strong className="block mb-0.5">Indicative Engineering Notice:</strong>
            {estimate.disclaimer || 'This quotation is an indicative engineering estimate based on client-provided shop dimensions. Final fabrication and material billing will be reconciled post physical site laser verification.'}
          </div>

          <div className="flex justify-between items-end pt-8">
            <div className="text-center">
              <div className="w-44 border-b border-slate-400 pb-1 mb-1 font-mono text-[10px] text-slate-400">
                Customer Signature / Stamp
              </div>
              <span className="text-[11px] text-slate-500 font-semibold">Accepted By Client</span>
            </div>

            <div className="text-center">
              <div className="w-44 border-b border-slate-400 pb-1 mb-1 font-mono text-[10px] text-slate-400">
                Authorized Signatory
              </div>
              <span className="text-[11px] text-slate-800 font-bold block">For JK Engineers Works</span>
              <span className="text-[10px] text-slate-500 block">Mumbai Factory Office</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
