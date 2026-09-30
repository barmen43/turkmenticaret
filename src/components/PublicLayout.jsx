import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Package, Menu, X } from 'lucide-react';

export default function PublicLayout() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column' }}>
      {/* Public Header */}
      <header className="glass-panel" style={{ position: 'sticky', top: '1rem', zIndex: 100, margin: '1rem', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: 'var(--radius-xl)' }}>
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Türkmen Ticaret" style={{ height: '40px', objectFit: 'contain' }} />
        </div>
        
        <nav className="desktop-nav flex items-center gap-6">
          <a href="#hakkimizda" className="text-muted hover-text-primary">Hakkımızda</a>
          <a href="#hizmetler" className="text-muted hover-text-primary">Hizmetlerimiz</a>
          <a href="#iletisim" className="text-muted hover-text-primary">İletişim</a>
        </nav>

        <div className="hamburger-btn">
          <button 
            className="btn btn-secondary" 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            style={{ padding: '0.5rem' }}
          >
            {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* Mobile Nav Dropdown */}
      {isMenuOpen && (
        <div className="hamburger-menu-container glass-panel animate-fade-in" style={{
            position: 'absolute',
            top: '5.5rem',
            left: '1rem',
            right: '1rem',
            padding: '1rem',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            zIndex: 99
        }}>
          <a href="#hakkimizda" onClick={() => setIsMenuOpen(false)} className="text-muted hover-text-primary" style={{ padding: '0.5rem' }}>Hakkımızda</a>
          <a href="#hizmetler" onClick={() => setIsMenuOpen(false)} className="text-muted hover-text-primary" style={{ padding: '0.5rem' }}>Hizmetlerimiz</a>
          <a href="#iletisim" onClick={() => setIsMenuOpen(false)} className="text-muted hover-text-primary" style={{ padding: '0.5rem' }}>İletişim</a>
        </div>
      )}

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
