'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/presentation/components/navigation/Navbar';
import { Footer } from '@/presentation/components/navigation/Footer';
import {
  Layers,
  FolderKanban,
  FileText,
  Clock,
  ArrowRight,
  Plus,
  PhoneCall,
  User,
  ShieldCheck,
  CheckCircle,
  MapPin,
  Calendar,
} from 'lucide-react';

interface ProjectSummary {
  id: string;
  projectCode: string;
  status: string;
  leadStatus: string;
  budget: number;
  createdAt: string;
  updatedAt: string;
  siteVerified: boolean;
  storeType: {
    name: string;
    code: string;
  };
  shop?: {
    dimensions?: {
      lengthMm: number;
      breadthMm: number;
      heightMm: number;
      displayUnit: string;
    };
  };
  designs: Array<{
    versions: Array<{
      id: string;
      versionNumber: number;
      optionType: string;
      estimate?: {
        grandTotal: number;
        minRange: number;
        maxRange: number;
      };
    }>;
  }>;
}

export default function CustomerDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);

  // Auth check and load projects
  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (!data.authenticated || !data.user) {
          router.push('/designer'); // Redirect to wizard if not logged in
        } else {
          setUserProfile(data.user);
          loadProjects();
        }
      })
      .catch(() => {
        router.push('/designer');
      });
  }, [router]);

  const loadProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      if (data.success && data.projects) {
        setProjects(data.projects);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SITE_VISIT_REQUIRED':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'QUOTATION_SENT':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'CONFIRMED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Welcome Header */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-600">Customer Portal</span>
              <span className="text-slate-300">•</span>
              <span className="text-xs text-slate-500 font-medium">JK Engineers Works Mumbai</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Welcome, {userProfile?.customer?.fullName || 'Valued Customer'}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              {userProfile?.customer?.shopLocation || 'Mumbai'} • Mobile: +91 {userProfile?.mobile}
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href="/designer"
              className="inline-flex items-center px-4 py-2.5 text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 rounded-lg shadow-sm shadow-brand-500/20 transition-all"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              New Shop Design
            </Link>
          </div>
        </div>

        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
            <div className="p-3 rounded-lg bg-blue-50 text-blue-600">
              <FolderKanban className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-400 font-bold uppercase">My Shop Projects</span>
              <h3 className="text-xl font-black text-slate-900">{projects.length}</h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
            <div className="p-3 rounded-lg bg-brand-50 text-brand-600">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-400 font-bold uppercase">Generated Layouts</span>
              <h3 className="text-xl font-black text-slate-900">
                {projects.reduce((acc, p) => acc + (p.designs[0]?.versions.length || 0), 0)}
              </h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
            <div className="p-3 rounded-lg bg-emerald-50 text-emerald-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-400 font-bold uppercase">Support Line</span>
              <h3 className="text-sm font-bold text-slate-900">+91 7942546295</h3>
            </div>
          </div>
        </div>

        {/* Projects List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">My Saved Shop Designs</h2>
            <span className="text-xs text-slate-400">{projects.length} project(s) found</span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
              Loading your designs...
            </div>
          ) : projects.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-xl border border-dashed border-slate-300 space-y-3">
              <p className="text-sm font-semibold text-slate-600">No shop designs saved yet.</p>
              <p className="text-xs text-slate-400">
                Create your first shop layout to receive custom 2D floor plans and instant material cost estimates.
              </p>
              <Link
                href="/designer"
                className="inline-flex items-center text-xs font-bold px-4 py-2 text-white bg-brand-500 hover:bg-brand-600 rounded-lg shadow-sm"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Start Your First Design
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map((proj) => {
                const latestVersion = proj.designs[0]?.versions[0];
                const estimate = latestVersion?.estimate;
                const dims = proj.shop?.dimensions;

                return (
                  <div
                    key={proj.id}
                    className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:border-brand-500 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-xs font-black text-brand-600">
                          {proj.projectCode}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadge(
                            proj.leadStatus
                          )}`}
                        >
                          {proj.leadStatus.replace(/_/g, ' ')}
                        </span>
                      </div>

                      <h3 className="font-extrabold text-base text-slate-900">
                        {proj.storeType.name}
                      </h3>

                      <div className="mt-3 text-xs text-slate-500 space-y-1">
                        {dims && (
                          <div className="flex justify-between">
                            <span>Dimensions:</span>
                            <span className="font-medium text-slate-800">
                              {(dims.lengthMm / 304.8).toFixed(1)} ft × {(dims.breadthMm / 304.8).toFixed(1)} ft × {(dims.heightMm / 304.8).toFixed(1)} ft
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span>Target Budget:</span>
                          <span className="font-semibold text-slate-800">
                            ₹{proj.budget.toLocaleString('en-IN')}
                          </span>
                        </div>
                        {estimate && (
                          <div className="flex justify-between">
                            <span>Estimated Total:</span>
                            <span className="font-extrabold text-brand-600">
                              ₹{estimate.grandTotal.toLocaleString('en-IN')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400 flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        {new Date(proj.createdAt).toLocaleDateString('en-IN')}
                      </span>

                      <Link
                        href={`/customer/projects/${proj.id}`}
                        className="inline-flex items-center text-xs font-bold text-brand-600 hover:text-brand-700"
                      >
                        <span>Open Design</span>
                        <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
