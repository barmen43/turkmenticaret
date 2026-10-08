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
        
        <nav className="desktop-nav flex items-center" style={{ gap: '2rem' }}>
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

      {/* WhatsApp Floating Button */}
      <a 
        href="https://wa.me/905336786579" 
        target="_blank" 
        rel="noopener noreferrer"
        style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          background: '#25D366',
          color: 'white',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          boxShadow: '0 4px 15px rgba(37, 211, 102, 0.4)',
          zIndex: 1000,
          transition: 'transform 0.3s ease',
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
          <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.391.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.1.824zm-3.423-14.416c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm.029 18.88c-1.161 0-2.305-.292-3.318-.844l-3.677.964.984-3.595c-.607-1.052-.927-2.246-.926-3.468.001-3.825 3.113-6.937 6.937-6.937 1.856.001 3.598.723 4.907 2.034 1.31 1.311 2.031 3.054 2.03 4.908-.001 3.825-3.113 6.938-6.937 6.938z"/>
        </svg>
      </a>
    </div>
  );
}
