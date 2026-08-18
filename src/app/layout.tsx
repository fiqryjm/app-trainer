import './globals.css';
import { ReactNode } from 'react';
import Link from 'next/link';
import { Providers } from './providers';

export const metadata = {
  title: 'FJM Instructor Database',
  description: 'Sistem manajemen instruktur dan pencocokan kebutuhan training berbasis AI untuk PT Fiqry Jaya Manunggal',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <body>
        <Providers>
          <div style={{ display: 'flex', minHeight: '100vh' }}>
            {/* Sidebar */}
            <aside className="sidebar">
              <div className="sidebar-logo">
                <div className="sidebar-logo-icon">🎯</div>
                <h1>FJM Trainer</h1>
                <p>Instructor Database</p>
              </div>

              <nav className="sidebar-nav">
                <div className="sidebar-label">Menu Utama</div>
                <Link href="/" className="sidebar-link">
                  <span>📊</span> Dashboard
                </Link>
                <Link href="/instructors" className="sidebar-link">
                  <span>👥</span> Instruktur
                </Link>

                <div className="sidebar-label">AI Tools</div>
                <Link href="/match" className="sidebar-link">
                  <span>🤖</span> Cari Instruktur (AI)
                </Link>
              </nav>

              <div className="sidebar-footer">
                <div style={{ fontWeight: 600, color: '#64748b', marginBottom: 2 }}>PT Fiqry Jaya Manunggal</div>
                <div>Training & Consulting</div>
              </div>
            </aside>

            {/* Main */}
            <main className="main-content">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
