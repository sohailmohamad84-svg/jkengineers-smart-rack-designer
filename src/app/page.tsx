import React from 'react';
import Link from 'next/link';
import { Navbar } from '@/presentation/components/navigation/Navbar';
import { Footer } from '@/presentation/components/navigation/Footer';
import {
  Layers,
  ShoppingBag,
  Store,
  Cross,
  Shirt,
  Boxes,
  ShieldCheck,
  CheckCircle,
  ArrowRight,
  Sparkles,
  Phone,
  Ruler,
  IndianRupee,
  Factory,
  Clock,
  Compass,
} from 'lucide-react';

export default function HomePage() {
  const storeCategories = [
    {
      title: 'Supermarket & Hypermarket',
      icon: ShoppingBag,
      desc: 'Central gondola aisles, promotional end-caps, wall displays, and checkout counters designed for high volume circulation.',
      tag: 'Most Popular',
    },
    {
      title: 'Grocery Store / Kirana',
      icon: Store,
      desc: 'High-density grain bins, heavy-duty display racks, front service desks, and compact storage optimization.',
      tag: 'High Density',
    },
    {
      title: 'Medical Store / Pharmacy',
      icon: Cross,
      desc: 'Prescription dispensing counters, high-density modular drawer racks, and vaccine refrigeration clearances.',
      tag: 'Precision Storage',
    },
    {
      title: 'Garment & Apparel Store',
      icon: Shirt,
      desc: 'Hanging display systems, folded apparel display shelves, boutique cashier desks, and trial room planning.',
      tag: 'Boutique Display',
    },
    {
      title: 'Mini Mart / Convenience',
      icon: Store,
      desc: 'Optimized perimeter loops with impulse center gondolas designed for quick customer transactions.',
      tag: 'Quick Retail',
    },
    {
      title: 'Warehouse & Heavy Duty',
      icon: Boxes,
      desc: 'Structural slotted angle and heavy beam racks engineered for industrial loads and palletized goods.',
      tag: 'Up to 200kg/tier',
    },
  ];

  const productCatalogue = [
    {
      name: 'Supermarket Wall Display Rack',
      category: 'WALL_RACK',
      dimensions: '900 / 1200 mm W × 450 mm D × 2100 mm H',
      load: '70–80 kg per shelf tier',
      finish: 'Pure Epoxy Polyester Powder Coated (7-Tank)',
      img: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800&auto=format&fit=crop&q=60',
      description: 'Single-sided wall unit featuring adjustable cantilever brackets and heavy-gauge Tata/JSW prime steel.',
    },
    {
      name: 'Supermarket Center Gondola Rack',
      category: 'GONDOLA_RACK',
      dimensions: '900 / 1200 mm W × 900 mm D × 1500 mm H',
      load: '70–80 kg per shelf tier (10 tiers total)',
      finish: 'Epoxy Powder Coated with Leveling Studs',
      img: 'https://images.unsplash.com/photo-1588854337221-4cf9fa96059c?w=800&auto=format&fit=crop&q=60',
      description: 'Double-sided island rack designed for customer walking aisles with maximum product visibility.',
    },
    {
      name: 'Supermarket Gondola End Rack',
      category: 'END_RACK',
      dimensions: '900 mm W × 450 mm D × 1500 mm H',
      load: '65 kg per shelf tier',
      finish: 'Anti-corrosive Powder Coating',
      img: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=800&auto=format&fit=crop&q=60',
      description: 'Promotional end-cap fixture for high-margin impulse goods, attaching seamlessly to gondola runs.',
    },
    {
      name: 'Heavy-Duty Retail Checkout Counter',
      category: 'CHECKOUT_COUNTER',
      dimensions: '1500 mm W × 750 mm D × 900 mm H',
      load: '150 kg counter surface rating',
      finish: 'Stainless Steel Top & Powder Coated Body',
      img: 'https://images.unsplash.com/photo-1556742049-0a67e557224f?w=800&auto=format&fit=crop&q=60',
      description: 'Cashier billing desk with integrated cash drawer compartment, barcode scanner zone, and basket area.',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />

      <main className="flex-1">
        {/* ========================================================================= */}
        {/* HERO SECTION */}
        {/* ========================================================================= */}
        <section className="relative overflow-hidden bg-gradient-to-b from-white via-slate-50 to-slate-100 pt-12 pb-20 border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              {/* Left Content */}
              <div className="lg:col-span-7 space-y-6">
                <div className="inline-flex items-center space-x-2 bg-brand-50 border border-brand-200 text-brand-700 px-3 py-1.5 rounded-full text-xs font-bold tracking-wide">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Next-Generation Commercial Rack Planning</span>
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.1]">
                  Design Your Shop. <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-brand-500">
                    Plan Your Racks.
                  </span> <br />
                  Know Your Budget.
                </h1>

                <p className="text-base sm:text-lg text-slate-600 max-w-xl leading-relaxed">
                  Enter your exact shop dimensions, choose your retail business, and our rule-based spatial layout engine will generate custom 2D floor plans, material specifications, and transparent cost estimates in minutes.
                </p>

                {/* Primary & Secondary CTAs */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 pt-2">
                  <Link
                    href="/designer"
                    className="inline-flex items-center justify-center px-6 py-3.5 text-base font-black text-white bg-brand-500 hover:bg-brand-600 rounded-xl shadow-lg shadow-brand-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Layers className="w-5 h-5 mr-2" />
                    Design My Shop
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>

                  <Link
                    href="#how-it-works"
                    className="inline-flex items-center justify-center px-5 py-3.5 text-sm font-bold text-slate-700 bg-white hover:bg-slate-100 rounded-xl border border-slate-300 transition-colors shadow-sm"
                  >
                    How It Works
                  </Link>

                  <Link
                    href="#products"
                    className="inline-flex items-center justify-center px-5 py-3.5 text-sm font-bold text-slate-700 bg-white hover:bg-slate-100 rounded-xl border border-slate-300 transition-colors shadow-sm"
                  >
                    View Products
                  </Link>
                </div>

                {/* Trust Badges */}
                <div className="pt-4 grid grid-cols-3 gap-4 border-t border-slate-200/80 max-w-lg text-xs font-semibold text-slate-600">
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4 text-brand-600" />
                    <span>Prime Tata / JSW Steel</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Factory className="w-4 h-4 text-brand-600" />
                    <span>Made in Mumbai</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-brand-600" />
                    <span>On-Site Erection</span>
                  </div>
                </div>
              </div>

              {/* Right Visual Teaser (Floor Plan Mockup) */}
              <div className="lg:col-span-5 relative">
                <div className="relative rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-4 overflow-hidden group">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs text-slate-400">
                    <div className="flex items-center space-x-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                      <span className="font-mono text-[10px] pl-2 text-slate-500">2D Layout Engine Preview</span>
                    </div>
                    <span className="text-brand-400 font-bold text-[11px]">Option B: Balanced</span>
                  </div>

                  {/* Visual Preview SVG Floor Plan */}
                  <div className="py-6 px-4 bg-slate-950 rounded-xl my-3 border border-slate-800/80 flex flex-col items-center justify-center">
                    <div className="w-full h-56 relative bg-slate-900 rounded border border-slate-700 p-2">
                      {/* Perimeter Wall Racks Preview */}
                      <div className="absolute top-1 left-2 right-2 h-4 bg-blue-900 rounded-sm border border-blue-700" />
                      <div className="absolute bottom-1 left-2 right-2 h-4 bg-blue-900 rounded-sm border border-blue-700" />
                      <div className="absolute top-6 bottom-6 left-1 w-4 bg-blue-900 rounded-sm border border-blue-700" />
                      <div className="absolute top-6 bottom-6 right-1 w-4 bg-blue-900 rounded-sm border border-blue-700" />

                      {/* Central Gondolas */}
                      <div className="absolute top-14 left-16 right-16 h-7 bg-teal-900 rounded-sm border border-teal-700 flex items-center justify-center text-[9px] text-white font-bold">
                        Center Gondola Row
                      </div>
                      <div className="absolute top-26 left-16 right-16 h-7 bg-teal-900 rounded-sm border border-teal-700 flex items-center justify-center text-[9px] text-white font-bold" style={{ top: '105px' }}>
                        Center Gondola Row
                      </div>

                      {/* Cashier Counter */}
                      <div className="absolute bottom-6 left-8 w-12 h-6 bg-emerald-900 rounded-sm border border-emerald-700 flex items-center justify-center text-[8px] text-white font-bold">
                        Cashier
                      </div>

                      {/* Door Indicator */}
                      <div className="absolute top-0 left-8 w-10 h-2 bg-emerald-500 rounded-sm text-[7px] text-white font-black text-center">
                        DOOR
                      </div>
                    </div>

                    <div className="w-full mt-3 flex justify-between text-[11px] text-slate-300 font-mono">
                      <span>Shop: 20 × 15 ft</span>
                      <span className="text-brand-400 font-bold">Est: ₹2,64,500</span>
                      <span>16 Fixtures</span>
                    </div>
                  </div>

                  <Link
                    href="/designer"
                    className="block w-full text-center py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg font-bold text-xs shadow-md shadow-brand-500/20 transition-all"
                  >
                    Launch Interactive Designer →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* HOW IT WORKS SECTION */}
        {/* ========================================================================= */}
        <section id="how-it-works" className="py-16 bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="text-brand-600 font-bold text-xs uppercase tracking-wider">
                Simple & Transparent Process
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
                How The Smart Shop Designer Works
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1.5">
                From shop measurements to custom layouts, transparent material calculations, and verified fabrication.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
              {[
                {
                  step: '01',
                  title: 'Select Business',
                  desc: 'Pick your store category (Supermarket, Grocery, Pharmacy, Garment, etc.).',
                  icon: Store,
                },
                {
                  step: '02',
                  title: 'Enter Dimensions',
                  desc: 'Input length, width, ceiling height, and door/window positions.',
                  icon: Ruler,
                },
                {
                  step: '03',
                  title: 'Set Budget',
                  desc: 'Define your investment target. We optimize quantity—never steel quality.',
                  icon: IndianRupee,
                },
                {
                  step: '04',
                  title: 'Generate 2D Layout',
                  desc: 'Review 3 layout options with interactive pan, zoom, and aisle clearance checks.',
                  icon: Compass,
                },
                {
                  step: '05',
                  title: 'Verify & Manufacture',
                  desc: 'JK Engineers conducts physical laser verification before factory dispatch.',
                  icon: Factory,
                },
              ].map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div
                    key={idx}
                    className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-md transition-all space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xl font-black text-brand-600 font-mono">{item.step}</span>
                      <div className="p-2 rounded-lg bg-brand-50 text-brand-600">
                        <Icon className="w-4 h-4" />
                      </div>
                    </div>
                    <h3 className="font-bold text-sm text-slate-900">{item.title}</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
                  </div>
                );
              })}
            </div>

            <div className="mt-10 text-center">
              <Link
                href="/designer"
                className="inline-flex items-center text-xs font-bold px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg shadow-sm transition-all"
              >
                <span>Start Designing Now</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Link>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* STORE TYPES SECTION */}
        {/* ========================================================================= */}
        <section id="store-types" className="py-16 bg-slate-50 border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="text-brand-600 font-bold text-xs uppercase tracking-wider">
                Specialized Retail Solutions
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
                Engineered For Every Retail Format
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1.5">
                Every business model has unique aisle widths, shelf loading demands, and customer traffic flows.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {storeCategories.map((cat, idx) => {
                const Icon = cat.icon;
                return (
                  <div
                    key={idx}
                    className="bg-white rounded-xl border border-slate-200 p-6 hover:border-brand-500 hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-3 rounded-xl bg-brand-50 text-brand-600">
                          <Icon className="w-6 h-6" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                          {cat.tag}
                        </span>
                      </div>
                      <h3 className="font-extrabold text-base text-slate-900 mb-2">{cat.title}</h3>
                      <p className="text-xs text-slate-500 leading-relaxed">{cat.desc}</p>
                    </div>

                    <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                      <Link
                        href="/designer"
                        className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center"
                      >
                        <span>Plan This Store Type</span>
                        <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* RACK CATALOGUE & PRODUCTS SECTION */}
        {/* ========================================================================= */}
        <section id="products" className="py-16 bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
              <div>
                <span className="text-brand-600 font-bold text-xs uppercase tracking-wider">
                  Industrial Fixture Catalogue
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
                  JK Engineers Works Core Products
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Fabricated with prime steel, CNC punching, and 7-tank anti-corrosive powder coating in Mumbai.
                </p>
              </div>

              <Link
                href="/designer"
                className="inline-flex items-center text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-lg border border-slate-300 transition-colors shrink-0 self-start"
              >
                <span>Calculate Total Quantities in Designer</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {productCatalogue.map((prod, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all flex flex-col group"
                >
                  <div className="h-44 bg-slate-100 overflow-hidden relative">
                    <img
                      src={prod.img}
                      alt={prod.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <span className="absolute bottom-2 left-2 text-[10px] font-bold bg-slate-900/80 backdrop-blur-sm text-white px-2 py-0.5 rounded">
                      {prod.category.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900 group-hover:text-brand-600 transition-colors">
                        {prod.name}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{prod.description}</p>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-slate-100 text-[11px] text-slate-600">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Dimensions:</span>
                        <span className="font-medium truncate max-w-[130px]">{prod.dimensions}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Load Capacity:</span>
                        <span className="font-bold text-slate-900">{prod.load}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Finish:</span>
                        <span className="truncate max-w-[130px]">{prod.finish}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* WHY JK ENGINEERS WORKS */}
        {/* ========================================================================= */}
        <section id="about" className="py-16 bg-slate-900 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              <div className="lg:col-span-6 space-y-6">
                <span className="text-brand-400 font-bold text-xs uppercase tracking-wider">
                  Why Choose JK Engineers Works
                </span>
                <h2 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
                  Over Two Decades of Engineering Precision in Mumbai
                </h2>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Headquartered in Mumbai, Maharashtra, JK Engineers Works is an established leader in retail rack fabrication, supermarket gondolas, medical store cabinetry, and heavy-duty storage fixtures.
                </p>

                <div className="space-y-3.5 text-xs text-slate-300">
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
                    <span><strong>100% Certified Prime CRCA Steel:</strong> We use strictly standardized Tata and JSW prime cold-rolled steel sheets.</span>
                  </div>
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
                    <span><strong>7-Tank Anti-Rust Powder Coating:</strong> Degreasing, phosphating, and pure epoxy polyester powder coating for maximum lifetime durability.</span>
                  </div>
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
                    <span><strong>Zero Monolithic Templates:</strong> Every floor plan is tailored to the store owner's exact footprint and customer traffic axis.</span>
                  </div>
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
                    <span><strong>Turnkey On-Site Installation:</strong> Direct alignment, leveling, and erection across Mumbai Metropolitan Region and Western India.</span>
                  </div>
                </div>

                <div className="pt-2">
                  <a
                    href="tel:+917942546295"
                    className="inline-flex items-center px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-xs font-bold transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5 mr-2" />
                    Speak to Production Head: +91 7942546295
                  </a>
                </div>
              </div>

              <div className="lg:col-span-6 bg-slate-800/80 rounded-2xl p-8 border border-slate-700 shadow-xl space-y-6">
                <h3 className="font-extrabold text-lg text-white">Direct Factory Consultation</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Have an existing shop or upcoming retail commercial space? Enter your measurements into our automated designer or contact our factory engineers directly.
                </p>

                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-700">
                    <span className="text-2xl font-black text-brand-400 block font-mono">15,000+</span>
                    <span className="text-xs text-slate-400 mt-1 block">Racks Installed</span>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-700">
                    <span className="text-2xl font-black text-brand-400 block font-mono">1,200+</span>
                    <span className="text-xs text-slate-400 mt-1 block">Retail Shops Planned</span>
                  </div>
                </div>

                <div className="pt-2">
                  <Link
                    href="/designer"
                    className="w-full py-3 bg-white hover:bg-slate-100 text-slate-900 font-extrabold text-xs rounded-xl flex items-center justify-center transition-colors shadow-md"
                  >
                    <Layers className="w-4 h-4 mr-2 text-brand-600" />
                    <span>Start Planning Your Store Online (Free)</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
