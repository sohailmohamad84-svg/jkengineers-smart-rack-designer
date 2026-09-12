import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'JK Engineers Works | Smart Shop Rack Designer & Manufacturer Mumbai',
  description:
    'Design your shop layout in minutes. Leading manufacturer of Supermarket Display Racks, Center Gondolas, Grocery Racks, Pharmacy Shelving, and Custom Commercial Shop Fixtures in Mumbai, Maharashtra, India.',
  keywords: [
    'Supermarket rack manufacturer Mumbai',
    'Supermarket racks',
    'Grocery store racks',
    'Medical store racks',
    'Pharmacy racks',
    'Garment store racks',
    'Display racks',
    'Shop rack manufacturer',
    'JK Engineers Works',
  ],
  authors: [{ name: 'JK Engineers Works Mumbai' }],
  openGraph: {
    title: 'JK Engineers Works | Smart Shop Rack Designer Platform',
    description: 'Enter your shop dimensions, choose your business, set your budget, and get a customized 2D rack layout with material estimate.',
    url: 'https://jkengineersworks.in',
    siteName: 'JK Engineers Works',
    locale: 'en_IN',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-screen flex flex-col font-sans antialiased bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}
