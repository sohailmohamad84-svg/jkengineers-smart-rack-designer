'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Layers, ShoppingBag, Shield, Phone, User, Menu, X, ArrowRight } from 'lucide-react';

export const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userSession, setUserSession] = useState<{ fullName?: string; role?: string } | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    // Check current auth status
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          setUserSession({
            fullName: data.user.customer?.fullName || data.user.admin?.username || 'Account',
            role: data.user.role,
          });
        }
      })
      .catch(() => {});
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-200 ${
        isScrolled ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-200 py-3' : 'bg-white border-b border-slate-200 py-4'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center space-x-3 group shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-black text-xl shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform shrink-0">
              JK
            </div>
            <div className="flex flex-col">
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight whitespace-nowrap">
                  JK ENGINEERS WORKS
                </span>
                <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-1.5 py-0.5 rounded border border-slate-200 uppercase tracking-wide shrink-0">
                  Mumbai
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium whitespace-nowrap hidden sm:block">
                Smart Retail Racks & Storage Systems
              </p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-5 xl:space-x-7 text-xs xl:text-sm font-semibold text-slate-600 shrink-0">
            <Link href="/#how-it-works" className="hover:text-brand-600 transition-colors whitespace-nowrap">
              How It Works
            </Link>
            <Link href="/#store-types" className="hover:text-brand-600 transition-colors whitespace-nowrap">
              Store Solutions
            </Link>
            <Link href="/#products" className="hover:text-brand-600 transition-colors whitespace-nowrap">
              Rack Catalog
            </Link>
            <Link href="/#about" className="hover:text-brand-600 transition-colors whitespace-nowrap">
              About JK
            </Link>
            <a
              href="tel:+917942546295"
              className="hidden xl:inline-flex items-center whitespace-nowrap text-slate-700 hover:text-brand-600 font-medium text-xs bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200 transition-colors shrink-0"
            >
              <Phone className="w-3.5 h-3.5 mr-1.5 text-brand-600 shrink-0" />
              <span>+91 7942546295</span>
            </a>
          </nav>

          {/* Action CTAs */}
          <div className="hidden sm:flex items-center space-x-2.5 xl:space-x-3 shrink-0">
            {userSession ? (
              <Link
                href={userSession.role === 'ADMIN' ? '/admin/dashboard' : '/customer/dashboard'}
                className="inline-flex items-center whitespace-nowrap text-xs font-semibold px-3 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors max-w-[160px] shrink-0"
              >
                <User className="w-3.5 h-3.5 mr-1.5 text-slate-600 shrink-0" />
                <span className="truncate">{userSession.fullName}</span>
              </Link>
            ) : (
              <Link
                href="/admin/login"
                className="text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors px-2 py-1 whitespace-nowrap shrink-0"
              >
                Admin
              </Link>
            )}

            <Link
              href="/designer"
              className="inline-flex items-center justify-center whitespace-nowrap text-xs sm:text-sm font-bold px-3.5 py-2 sm:px-4 sm:py-2 text-white bg-brand-500 hover:bg-brand-600 rounded-lg shadow-sm shadow-brand-500/30 transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0"
            >
              <Layers className="w-4 h-4 mr-2 shrink-0" />
              <span>Design My Shop</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1.5 shrink-0" />
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex lg:hidden items-center space-x-2">
            <Link
              href="/designer"
              className="sm:hidden text-xs font-bold px-3 py-1.5 text-white bg-brand-500 rounded-md shadow-sm whitespace-nowrap"
            >
              Design
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-600 hover:text-slate-900 focus:outline-none"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden pt-4 pb-3 border-t border-slate-100 mt-3 space-y-2">
            <Link
              href="/#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-50"
            >
              How It Works
            </Link>
            <Link
              href="/#store-types"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-50"
            >
              Store Solutions
            </Link>
            <Link
              href="/#products"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-50"
            >
              Rack Catalog
            </Link>
            <Link
              href="/designer"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-base font-bold text-brand-600 hover:bg-brand-50"
            >
              Design My Shop (Interactive 2D Wizard)
            </Link>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between px-3">
              <Link
                href="/customer/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-semibold text-slate-600 hover:text-slate-900"
              >
                Customer Dashboard
              </Link>
              <Link
                href="/admin/login"
                onClick={() => setMobileMenuOpen(false)}
                className="text-xs font-medium text-slate-400 hover:text-slate-700"
              >
                Admin Login
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
