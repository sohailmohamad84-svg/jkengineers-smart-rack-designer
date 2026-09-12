'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Layers,
  Coins,
  FileCheck2,
  LogOut,
  Shield,
  Menu,
  X,
  History,
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  const [adminUser, setAdminUser] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (!data.authenticated || data.user?.role !== 'ADMIN') {
          router.push('/admin/login');
        } else {
          setAdminUser(data.user);
        }
      })
      .catch(() => router.push('/admin/login'));
  }, [router]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/admin/login');
  };

  const navItems = [
    { label: 'Overview', href: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Customers & Leads', href: '/admin/customers', icon: Users },
    { label: 'Raw Materials & Pricing', href: '/admin/materials', icon: Coins },
    { label: 'Rack Catalogue', href: '/admin/racks', icon: Layers },
    { label: 'Design Rules & Store Types', href: '/admin/rules', icon: FileCheck2 },
    { label: 'Audit Logs', href: '/admin/audit-logs', icon: History },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col md:flex-row">
      {/* Mobile Top Header */}
      <div className="md:hidden bg-slate-950 p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded bg-brand-500 flex items-center justify-center font-black text-white text-sm">
            JK
          </div>
          <span className="font-extrabold text-sm text-white">JK Admin Portal</span>
        </div>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 text-slate-400">
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-40 h-screen w-64 bg-slate-950 border-r border-slate-800 p-5 flex flex-col justify-between transition-transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="space-y-6">
          {/* Logo */}
          <Link href="/admin/dashboard" className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center font-black text-white text-lg shadow-md shadow-brand-500/20">
              JK
            </div>
            <div>
              <span className="font-black text-sm text-white block tracking-tight">
                JK ENGINEERS WORKS
              </span>
              <span className="text-[10px] text-brand-400 font-bold uppercase tracking-wider block">
                Executive Portal
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="space-y-1 text-xs font-semibold">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-brand-500/15 text-brand-400 border border-brand-500/30 font-bold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User profile & Logout */}
        <div className="pt-4 border-t border-slate-800/80 space-y-3">
          <div className="text-xs">
            <span className="text-slate-400 block text-[11px]">Logged in as:</span>
            <span className="font-bold text-white block truncate">
              {adminUser?.admin?.username || 'Administrator'}
            </span>
            <span className="text-[10px] text-slate-500 block">
              {adminUser?.admin?.department || 'Operations'}
            </span>
          </div>

          <div className="flex items-center justify-between pt-1">
            <Link href="/" className="text-[11px] text-slate-400 hover:text-white">
              Public Site →
            </Link>
            <button
              onClick={handleLogout}
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-900 rounded-md transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Pane */}
      <div className="flex-1 p-4 sm:p-6 lg:p-8 min-h-screen bg-slate-900 overflow-y-auto">
        {children}
      </div>
    </div>
  );
};
