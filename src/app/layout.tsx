import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NITPy Hostel Amenities',
  description: 'Kitchen & TV Room slot reservation system for NIT Puducherry',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-zinc-950 text-zinc-100 min-h-screen antialiased selection:bg-zinc-800 selection:text-zinc-100">
        <main className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
          {children}
        </main>
      </body>
    </html>
  );
}
