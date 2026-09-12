import React from 'react';
import Link from 'next/link';
import { ShieldCheck, MapPin, Phone, Mail, Award, Clock } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-400 text-sm mt-auto border-t border-slate-800">
      {/* Upper Footer: Value Props */}
      <div className="border-b border-slate-800 py-8 bg-slate-950/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-white font-bold text-sm">Tata / JSW Standard Prime Steel</h4>
              <p className="text-xs text-slate-400">Consistent quality steel with 7-tank anti-rust powder coating.</p>
            </div>
          </div>
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-white font-bold text-sm">Engineered in Mumbai</h4>
              <p className="text-xs text-slate-400">Custom fabrication factory catering to all commercial retail.</p>
            </div>
          </div>
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-white font-bold text-sm">Fast Turnaround & Installation</h4>
              <p className="text-xs text-slate-400">Direct on-site erection by certified JK Engineers technicians.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded bg-brand-500 flex items-center justify-center text-white font-black text-sm">
              JK
            </div>
            <span className="text-white font-bold text-base tracking-tight">JK ENGINEERS WORKS</span>
          </div>
          <p className="text-xs leading-relaxed text-slate-400">
            Premier manufacturer of customized supermarket racks, grocery displays, medical pharmacy shelving, garment fixtures, and heavy duty industrial storage racks in Mumbai, Maharashtra.
          </p>
          <div className="pt-2 text-xs space-y-1 text-slate-300">
            <div className="flex items-start space-x-2">
              <MapPin className="w-3.5 h-3.5 text-brand-400 mt-0.5 shrink-0" />
              <span>Mumbai, Maharashtra, India</span>
            </div>
            <div className="flex items-center space-x-2">
              <Phone className="w-3.5 h-3.5 text-brand-400 shrink-0" />
              <a href="tel:+917942546295" className="hover:text-white transition-colors">
                +91 7942546295
              </a>
            </div>
            <div className="flex items-center space-x-2">
              <Mail className="w-3.5 h-3.5 text-brand-400 shrink-0" />
              <span>info@jkengineersworks.com</span>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-3">Product Catalog</h4>
          <ul className="space-y-2 text-xs">
            <li><Link href="/#products" className="hover:text-white transition-colors">Supermarket Wall Display Racks</Link></li>
            <li><Link href="/#products" className="hover:text-white transition-colors">Supermarket Center Gondolas</Link></li>
            <li><Link href="/#products" className="hover:text-white transition-colors">Gondola End Cap Units</Link></li>
            <li><Link href="/#products" className="hover:text-white transition-colors">Grocery & Kirana Display Racks</Link></li>
            <li><Link href="/#products" className="hover:text-white transition-colors">Medical & Pharmacy Drawers</Link></li>
            <li><Link href="/#products" className="hover:text-white transition-colors">Heavy Duty Checkout Counters</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-3">Shop Solutions</h4>
          <ul className="space-y-2 text-xs">
            <li><Link href="/designer" className="hover:text-white transition-colors">Supermarket 2D Layouts</Link></li>
            <li><Link href="/designer" className="hover:text-white transition-colors">Grocery Store Planning</Link></li>
            <li><Link href="/designer" className="hover:text-white transition-colors">Pharmacy & Chemist Interiors</Link></li>
            <li><Link href="/designer" className="hover:text-white transition-colors">Garment & Apparel Displays</Link></li>
            <li><Link href="/designer" className="hover:text-white transition-colors">Warehouse Storage Systems</Link></li>
            <li><Link href="/customer/dashboard" className="hover:text-white transition-colors">Customer Portal</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-3">Admin & Portals</h4>
          <ul className="space-y-2 text-xs">
            <li><Link href="/admin/login" className="hover:text-white transition-colors">Staff / Admin Login</Link></li>
            <li><Link href="/admin/materials" className="hover:text-white transition-colors">Raw Material Rates</Link></li>
            <li><Link href="/admin/racks" className="hover:text-white transition-colors">Catalogue Management</Link></li>
            <li><Link href="/admin/audit-logs" className="hover:text-white transition-colors">System Audit Trails</Link></li>
          </ul>
        </div>
      </div>

      {/* Mandatory Statutory Engineering Disclaimer (Rule 37 & 10) */}
      <div className="border-t border-slate-800/80 bg-slate-950 py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-2">
          <p className="text-[11px] leading-relaxed text-slate-500">
            <strong className="text-slate-400">Engineering & Statutory Notice:</strong> This automated shop rack designer and cost estimator is an indicative planning tool. Final rack specifications, steel gauge selections, structural load distribution, fire egress compliance, and on-site alignment details must be physically measured and certified by JK Engineers Works technical team before manufacturing and installation.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-600 pt-2">
            <span>© {new Date().getFullYear()} JK Engineers Works (Mumbai, India). All Rights Reserved.</span>
            <span>Target Deployment: jkengineersworks.in</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
