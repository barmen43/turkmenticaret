import React from 'react';
import { Outlet } from 'react-router-dom';
import { Package } from 'lucide-react';

export default function PublicLayout() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column' }}>
      {/* Public Header */}
      <header className="glass-panel" style={{ position: 'sticky', top: '1rem', zIndex: 50, margin: '1rem', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: 'var(--radius-xl)' }}>
        <div className="flex items-center gap-2">
          <div style={{ background: 'var(--color-primary)', padding: '0.5rem', borderRadius: '50%' }}>
            <Package size={24} color="white" />
          </div>
          <h1 style={{ fontSize: '1.25rem', margin: 0 }}>Türkmen Ticaret</h1>
        </div>
        
        <nav className="flex items-center gap-6" style={{ display: 'none' /* Will show on desktop */ }}>
          <a href="#hakkimizda" className="text-muted hover-text-primary">Hakkımızda</a>
          <a href="#hizmetler" className="text-muted hover-text-primary">Hizmetlerimiz</a>
          <a href="#iletisim" className="text-muted hover-text-primary">İletişim</a>
        </nav>
      </header>

      {/* Main Public Content */}
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>

      {/* Public Footer */}
      <footer style={{ background: 'var(--color-surface)', borderTop: '1px solid var(--color-border)', padding: '2rem', textAlign: 'center', marginTop: '4rem' }}>
        <div className="container">
          <p className="text-muted mb-2">&copy; {new Date().getFullYear()} Türkmen Ticaret. Tüm hakları saklıdır.</p>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-border)' }}>Oto Yedek Parça & Stok Çözümleri</p>
        </div>
      </footer>
    </div>
  );
}
