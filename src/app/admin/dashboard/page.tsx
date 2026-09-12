'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/presentation/components/admin/AdminLayout';
import {
  Users,
  FolderKanban,
  Layers,
  IndianRupee,
  ArrowRight,
  Clock,
  CheckCircle,
  PhoneCall,
  History,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/overview')
      .then((res) => res.json())
      .then((resData) => {
        if (resData.success) setData(resData);
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64 text-slate-500">
          Loading analytics & CRM pipeline...
        </div>
      </AdminLayout>
    );
  }

  const metrics = data?.metrics || {
    totalCustomers: 0,
    totalProjects: 0,
    totalDesigns: 0,
    totalEstimatedValue: 0,
    leadsByStatus: {},
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SITE_VISIT_REQUIRED':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'QUOTATION_SENT':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'CONFIRMED':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand-400">Operations Control</span>
          <h1 className="text-2xl font-black text-white tracking-tight">Executive Dashboard</h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time pipeline overview of customer shop designs, dynamic raw material pricing, and active inquiries.
          </p>
        </div>

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-950 border border-slate-800 p-5 rounded-xl flex items-center space-x-4">
            <div className="p-3 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-400 font-bold uppercase">Total Leads / Clients</span>
              <h3 className="text-2xl font-black text-white mt-0.5">{metrics.totalCustomers}</h3>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 p-5 rounded-xl flex items-center space-x-4">
            <div className="p-3 rounded-lg bg-brand-500/10 text-brand-400 border border-brand-500/20">
              <FolderKanban className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-400 font-bold uppercase">Shop Projects</span>
              <h3 className="text-2xl font-black text-white mt-0.5">{metrics.totalProjects}</h3>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 p-5 rounded-xl flex items-center space-x-4">
            <div className="p-3 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-400 font-bold uppercase">Designs Generated</span>
              <h3 className="text-2xl font-black text-white mt-0.5">{metrics.totalDesigns}</h3>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 p-5 rounded-xl flex items-center space-x-4">
            <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <IndianRupee className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-400 font-bold uppercase">Pipeline Value</span>
              <h3 className="text-2xl font-black text-brand-400 mt-0.5">
                ₹{(metrics.totalEstimatedValue / 100000).toFixed(1)}L
              </h3>
            </div>
          </div>
        </div>

        {/* Lead Status Funnel & Breakdown */}
        <div className="bg-slate-950 border border-slate-800 p-6 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">CRM Lead Pipeline Funnel</h3>
            <Link href="/admin/customers" className="text-xs text-brand-400 hover:text-brand-300 font-semibold">
              View All Customers →
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {[
              { label: 'New Inquiries', key: 'NEW' },
              { label: 'Contacted', key: 'CONTACTED' },
              { label: 'Site Visit Required', key: 'SITE_VISIT_REQUIRED' },
              { label: 'Design Prepared', key: 'DESIGN_PREPARED' },
              { label: 'Quotation Sent', key: 'QUOTATION_SENT' },
              { label: 'Confirmed / In Production', key: 'CONFIRMED' },
            ].map((st) => (
              <div key={st.key} className="bg-slate-900 border border-slate-800 p-3.5 rounded-lg text-center">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">{st.label}</span>
                <span className="text-xl font-black text-white font-mono mt-1 block">
                  {metrics.leadsByStatus[st.key] || 0}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Two Columns: Recent Projects & Activity Stream */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Projects */}
          <div className="bg-slate-950 border border-slate-800 p-6 rounded-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Recent Shop Projects</h3>
              <Link href="/admin/customers" className="text-xs text-slate-400 hover:text-white">
                View CRM
              </Link>
            </div>

            <div className="divide-y divide-slate-800 text-xs">
              {data?.recentProjects?.length === 0 ? (
                <div className="py-6 text-center text-slate-500">No projects yet.</div>
              ) : (
                data?.recentProjects?.map((proj: any) => (
                  <div key={proj.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-brand-400">{proj.projectCode}</span>
                        <span className="text-slate-400">•</span>
                        <span className="font-semibold text-white">{proj.customer?.fullName}</span>
                      </div>
                      <span className="text-slate-500 text-[11px]">
                        {proj.storeType?.name} • Budget: ₹{proj.budget.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getStatusColor(proj.leadStatus)}`}>
                        {proj.leadStatus.replace(/_/g, ' ')}
                      </span>
                      <Link
                        href={`/admin/customers/${proj.customer?.id}`}
                        className="p-1 text-slate-400 hover:text-white"
                        title="View Details"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Audit Log Stream */}
          <div className="bg-slate-950 border border-slate-800 p-6 rounded-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center">
                <History className="w-4 h-4 mr-2 text-brand-400" />
                Recent System & Pricing Audits
              </h3>
              <Link href="/admin/audit-logs" className="text-xs text-slate-400 hover:text-white">
                All Logs
              </Link>
            </div>

            <div className="divide-y divide-slate-800 text-xs">
              {data?.recentAuditLogs?.length === 0 ? (
                <div className="py-6 text-center text-slate-500">No audit events recorded yet.</div>
              ) : (
                data?.recentAuditLogs?.map((log: any) => (
                  <div key={log.id} className="py-3 flex items-start justify-between">
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-white uppercase text-[10px] tracking-wide">
                          {log.action.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[10px] text-slate-500">({log.entityType})</span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        By {log.actor?.email || 'System'}
                      </p>
                    </div>

                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(log.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
