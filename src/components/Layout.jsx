import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Package, PlusCircle, LayoutDashboard, Users, Truck, CreditCard, ShoppingCart, Menu, X } from 'lucide-react';

export default function Layout() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/portal-giris');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const navItems = [
    { path: '/portal', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/portal/satis', label: 'HIZLI SATIŞ (POS)', icon: ShoppingCart, highlight: true },
    { path: '/portal/stoklar', label: 'Stok Listesi', icon: Package },
    { path: '/portal/musteriler', label: 'Müşteriler', icon: Users },
    { path: '/portal/tedarikciler', label: 'Tedarikçiler', icon: Truck },
    { path: '/portal/cekler', label: 'Çek/Senet', icon: CreditCard },
    { path: '/portal/yeni-stok', label: 'Yeni Parça Ekle', icon: PlusCircle },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column' }}>
      {/* Header */}
      <header className="glass-panel glass-panel-header" style={{ position: 'relative', margin: '1rem', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: 'var(--radius-xl)', zIndex: 100 }}>
        <div className="flex items-center gap-2">
          <div style={{ background: 'var(--color-primary)', padding: '0.4rem', borderRadius: '50%' }}>
            <Package size={22} color="white" />
          </div>
          <h1 className="mobile-header-title" style={{ fontSize: '1.25rem', margin: 0 }}>Türkmen Ticaret</h1>
        </div>
        
        {/* Desktop Nav */}
        <nav className="desktop-nav flex items-center gap-4">
          {navItems.map(item => (
            <button 
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`btn ${location.pathname === item.path ? 'btn-primary' : (item.highlight ? 'btn-primary' : 'btn-secondary')}`}
              style={{ 
                padding: '0.5rem 1rem', 
                backgroundColor: item.highlight && location.pathname !== item.path ? 'var(--color-success)' : undefined,
                borderColor: item.highlight && location.pathname !== item.path ? 'var(--color-success)' : undefined
              }}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button onClick={handleLogout} className="btn btn-danger" style={{ padding: '0.5rem 1rem' }}>
            <LogOut size={18} />
            <span className="hide-on-mobile">Çıkış</span>
          </button>
          
          {/* Hamburger Toggle */}
          <button 
            className="btn btn-secondary hamburger-btn" 
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
            gap: '0.5rem',
            zIndex: 99
        }}>
          {navItems.map(item => (
            <button 
              key={item.path}
              onClick={() => {
                navigate(item.path);
                setIsMenuOpen(false);
              }}
              className={`btn ${location.pathname === item.path ? 'btn-primary' : (item.highlight ? 'btn-primary' : 'btn-secondary')}`}
              style={{ 
                padding: '0.75rem 1rem', 
                width: '100%',
                justifyContent: 'flex-start',
                backgroundColor: item.highlight && location.pathname !== item.path ? 'var(--color-success)' : undefined,
                borderColor: item.highlight && location.pathname !== item.path ? 'var(--color-success)' : undefined
              }}
            >
              <item.icon size={20} />
              <span style={{ marginLeft: '0.5rem' }}>{item.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Main Content */}
      <main className="container animate-fade-in" style={{ flex: 1, paddingBottom: '2rem' }}>
        <Outlet />
      </main>
    </div>
  );
}
