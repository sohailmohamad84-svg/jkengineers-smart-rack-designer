'use client';

import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/presentation/components/admin/AdminLayout';
import {
  History,
  Shield,
  Search,
  Filter,
  ArrowRight,
  User,
  Calendar,
} from 'lucide-react';

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/audit-logs')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setLogs(data.logs);
        }
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  const getActionBadge = (action: string) => {
    if (action.includes('PRICE')) return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    if (action.includes('VERIF')) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    if (action.includes('QUOTATION')) return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    return 'bg-slate-800 text-slate-300 border-slate-700';
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand-400">Security & Governance</span>
          <h1 className="text-2xl font-black text-white tracking-tight">System Audit Trail</h1>
          <p className="text-xs text-slate-400 mt-1">
            Immutable log of all administrator rate modifications, catalog adjustments, and verified site measurements (Rule 57).
          </p>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="p-3.5">Timestamp</th>
                  <th className="p-3.5">Action</th>
                  <th className="p-3.5">Entity</th>
                  <th className="p-3.5">Actor</th>
                  <th className="p-3.5">Previous Snapshot</th>
                  <th className="p-3.5">New Snapshot</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      Loading audit logs...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      No audit events recorded yet.
                    </td>
                  </tr>
                ) : (
                  logs.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-900/50 transition-colors">
                      <td className="p-3.5 font-mono text-[11px] text-slate-400">
                        {new Date(l.timestamp).toLocaleString('en-IN')}
                      </td>

                      <td className="p-3.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${getActionBadge(l.action)}`}>
                          {l.action.replace(/_/g, ' ')}
                        </span>
                      </td>

                      <td className="p-3.5 font-semibold text-white">
                        {l.entityType}
                      </td>

                      <td className="p-3.5 text-slate-400">
                        <span className="text-slate-200 font-medium block">
                          {l.actor?.admin?.username || l.actor?.email || 'System'}
                        </span>
                        <span className="text-[10px] text-slate-500">{l.actorRole}</span>
                      </td>

                      <td className="p-3.5 font-mono text-[11px] text-slate-400 max-w-[200px] truncate">
                        {l.previousValue || '—'}
                      </td>

                      <td className="p-3.5 font-mono text-[11px] text-brand-300 max-w-[200px] truncate">
                        {l.newValue || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
