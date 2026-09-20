import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Package, AlertTriangle, TrendingUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export default function Dashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  // Get quick stats
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const { count: totalStocks } = await supabase.from('stocks').select('*', { count: 'exact', head: true });
      const { count: lowStock } = await supabase.from('stocks').select('*', { count: 'exact', head: true }).lt('quantity', 5);
      return {
        total: totalStocks || 0,
        lowStock: lowStock || 0
      };
    }
  });

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/portal/stoklar?q=${encodeURIComponent(searchTerm)}`);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>Hoş Geldiniz,</h2>
        <p className="text-muted">Stok durumunuzu ve yedek parçalarınızı buradan yönetebilirsiniz.</p>
      </div>

      {/* Quick Search */}
      <div className="glass-panel mb-6" style={{ padding: '2rem' }}>
        <h3 className="mb-4 text-center">Hızlı Parça Arama</h3>
        <form onSubmit={handleSearch} className="flex gap-2" style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} size={20} />
            <input 
              type="text" 
              className="form-input" 
              style={{ paddingLeft: '2.75rem', fontSize: '1.1rem' }}
              placeholder="Parça kodu, adı veya raf yeri ile arayın..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary">
            Ara
          </button>
        </form>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
        
        <div className="glass-panel p-4" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ background: 'rgba(249, 115, 22, 0.1)', padding: '1rem', borderRadius: 'var(--radius-lg)' }}>
            <Package size={32} className="text-primary" />
          </div>
          <div>
            <p className="form-label" style={{ marginBottom: '0.25rem' }}>Toplam Parça Çeşidi</p>
            <h3 style={{ fontSize: '2rem', margin: 0 }}>{stats?.total || 0}</h3>
          </div>
        </div>

        <div className="glass-panel p-4" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '1rem', borderRadius: 'var(--radius-lg)' }}>
            <AlertTriangle size={32} color="var(--color-danger)" />
          </div>
          <div>
            <p className="form-label" style={{ marginBottom: '0.25rem' }}>Kritik Stok Uyarısı</p>
            <h3 style={{ fontSize: '2rem', margin: 0, color: 'var(--color-danger)' }}>{stats?.lowStock || 0}</h3>
          </div>
        </div>

        <div className="glass-panel p-4" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '1rem', borderRadius: 'var(--radius-lg)' }}>
            <TrendingUp size={32} color="var(--color-success)" />
          </div>
          <div>
            <p className="form-label" style={{ marginBottom: '0.25rem' }}>Sistem Durumu</p>
            <h3 style={{ fontSize: '1.5rem', margin: 0, color: 'var(--color-success)' }}>Çevrimiçi</h3>
          </div>
        </div>

      </div>
    </div>
  );
}
