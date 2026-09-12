'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/presentation/components/admin/AdminLayout';
import {
  Users,
  Search,
  PhoneCall,
  MessageSquare,
  ArrowRight,
  Filter,
  CheckCircle,
  Calendar,
} from 'lucide-react';

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const loadCustomers = async (q: string = '') => {
    try {
      const res = await fetch(`/api/admin/customers${q ? `?q=${encodeURIComponent(q)}` : ''}`);
      const data = await res.json();
      if (data.success) {
        setCustomers(data.customers);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    loadCustomers(searchQuery);
  };

  const getStatusBadge = (status: string) => {
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
      <div className="space-y-6">
        {/* Header & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-brand-400">CRM Database</span>
            <h1 className="text-2xl font-black text-white tracking-tight">Customer & Lead Directory</h1>
            <p className="text-xs text-slate-400 mt-1">
              All registered retail clients, shop dimensions, and layout requests.
            </p>
          </div>

          <form onSubmit={handleSearch} className="flex items-center space-x-2">
            <div className="relative w-64">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search name, phone, city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <button
              type="submit"
              className="px-3.5 py-2 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs rounded-lg transition-colors"
            >
              Search
            </button>
          </form>
        </div>

        {/* Customers Table */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="p-3.5">Customer Name & Business</th>
                  <th className="p-3.5">Contact Details</th>
                  <th className="p-3.5">Location</th>
                  <th className="p-3.5">Latest Project</th>
                  <th className="p-3.5">Lead Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      Loading customer database...
                    </td>
                  </tr>
                ) : customers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      No customer records found.
                    </td>
                  </tr>
                ) : (
                  customers.map((c) => {
                    const latestProj = c.projects[0];
                    const estimate = latestProj?.designs[0]?.versions[0]?.estimate;

                    return (
                      <tr key={c.id} className="hover:bg-slate-900/50 transition-colors">
                        <td className="p-3.5">
                          <Link
                            href={`/admin/customers/${c.id}`}
                            className="font-bold text-white hover:text-brand-400 block"
                          >
                            {c.fullName}
                          </Link>
                          <span className="text-[11px] text-slate-500 block">
                            {c.businessName || 'Independent Retailer'}
                          </span>
                        </td>

                        <td className="p-3.5 space-y-0.5 font-mono">
                          <div className="text-slate-200">+91 {c.user?.mobile}</div>
                          {c.whatsappNumber && (
                            <div className="text-emerald-400 text-[10px]">WA: +91 {c.whatsappNumber}</div>
                          )}
                        </td>

                        <td className="p-3.5 text-slate-400">
                          <div className="font-medium text-slate-300">{c.city}</div>
                          <div className="text-[11px] text-slate-500 truncate max-w-[140px]">{c.shopLocation}</div>
                        </td>

                        <td className="p-3.5">
                          {latestProj ? (
                            <div>
                              <span className="font-mono text-[11px] text-brand-400 font-bold block">
                                {latestProj.projectCode}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                {latestProj.storeType?.name}
                              </span>
                              {estimate && (
                                <span className="text-[11px] text-emerald-400 font-mono block">
                                  ₹{estimate.grandTotal.toLocaleString('en-IN')}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-500">No projects yet</span>
                          )}
                        </td>

                        <td className="p-3.5">
                          {latestProj ? (
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${getStatusBadge(
                                latestProj.leadStatus
                              )}`}
                            >
                              {latestProj.leadStatus.replace(/_/g, ' ')}
                            </span>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>

                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <a
                              href={`tel:+91${c.user?.mobile}`}
                              className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded border border-slate-700"
                              title="Call Customer"
                            >
                              <PhoneCall className="w-3.5 h-3.5" />
                            </a>
                            <a
                              href={`https://wa.me/91${c.whatsappNumber || c.user?.mobile}?text=Hello%20${encodeURIComponent(c.fullName)},%20this%20is%20JK%20Engineers%20Works%20Mumbai%20regarding%20your%20shop%20rack%20layout.`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 bg-emerald-950 hover:bg-emerald-900 text-emerald-400 rounded border border-emerald-800"
                              title="WhatsApp Customer"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </a>
                            <Link
                              href={`/admin/customers/${c.id}`}
                              className="p-1.5 bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 rounded border border-brand-500/30"
                              title="Open Customer File"
                            >
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
