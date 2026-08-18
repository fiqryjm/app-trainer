import './globals.css';
import { ReactNode } from 'react';
import Link from 'next/link';
import { Providers } from './providers';

export const metadata = { title: 'FJM Instructor Database' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <body className="bg-slate-50 text-slate-900">
        <Providers>
          <div className="flex min-h-screen">
            <aside className="w-56 bg-slate-900 text-white p-4 flex flex-col gap-2">
              <h1 className="font-bold text-lg mb-4">FJM Trainer</h1>
              <Link href="/" className="py-2 px-3 rounded hover:bg-slate-800">Dashboard</Link>
              <Link href="/instructors" className="py-2 px-3 rounded hover:bg-slate-800">Instruktur</Link>
              <Link href="/match" className="py-2 px-3 rounded hover:bg-slate-800">Cari Instruktur (AI)</Link>
            </aside>
            <main className="flex-1 p-6 overflow-auto">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
