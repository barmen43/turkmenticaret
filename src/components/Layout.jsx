import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Package, Search, PlusCircle, LayoutDashboard } from 'lucide-react';

export default function Layout() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

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
    { path: '/portal/stoklar', label: 'Stok Listesi', icon: Package },
    { path: '/portal/yeni-stok', label: 'Yeni Parça Ekle', icon: PlusCircle },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column' }}>
      {/* Header */}
      <header className="glass-panel" style={{ margin: '1rem', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: 'var(--radius-xl)' }}>
        <div className="flex items-center gap-2">
          <div style={{ background: 'var(--color-primary)', padding: '0.5rem', borderRadius: '50%' }}>
            <Package size={24} color="white" />
          </div>
          <h1 style={{ fontSize: '1.25rem', margin: 0 }}>Türkmen Ticaret</h1>
        </div>
        
        <nav className="flex items-center gap-4" style={{ display: 'none' /* hidden on mobile, handle later */ }}>
          {navItems.map(item => (
            <button 
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`btn ${location.pathname === item.path ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.5rem 1rem' }}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </nav>

        <button onClick={handleLogout} className="btn btn-danger" style={{ padding: '0.5rem 1rem' }}>
          <LogOut size={18} />
          <span>Çıkış</span>
        </button>
      </header>

      {/* Mobile Nav */}
      <div className="flex items-center justify-center gap-2 mb-4" style={{ padding: '0 1rem', overflowX: 'auto', whiteSpace: 'nowrap' }}>
         {navItems.map(item => (
            <button 
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`btn ${location.pathname === item.path ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.5rem 1rem', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem' }}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </button>
          ))}
      </div>

      {/* Main Content */}
      <main className="container animate-fade-in" style={{ flex: 1, paddingBottom: '2rem' }}>
        <Outlet />
      </main>
    </div>
  );
}
