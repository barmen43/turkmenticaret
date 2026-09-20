import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Search, Edit, Trash2, Plus, AlertCircle, Box } from 'lucide-react';

export default function Stocks() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const navigate = useNavigate();

  // Sync search input with URL if URL changes
  useEffect(() => {
    setSearchTerm(searchParams.get('q') || '');
  }, [searchParams]);

  // Fetch stocks with React Query for offline caching
  const { data: stocks, isLoading, isError } = useQuery({
    queryKey: ['stocks', searchParams.get('q')],
    queryFn: async () => {
      const q = searchParams.get('q');
      let query = supabase.from('stocks').select('*').order('created_at', { ascending: false });

      if (q) {
        // Use full text search or ilike for partial matching
        // Trigram index supports ilike perfectly
        query = query.or(`part_code.ilike.%${q}%,part_name.ilike.%${q}%,shelf_location.ilike.%${q}%,barcode.ilike.%${q}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      setSearchParams({ q: searchTerm.trim() });
    } else {
      setSearchParams({});
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bu stoğu silmek istediğinize emin misiniz?')) {
      const { error } = await supabase.from('stocks').delete().eq('id', id);
      if (!error) {
        // Refetch or invalidate query ideally, but for now we'll just reload or rely on real-time
        window.location.reload();
      }
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 style={{ fontSize: '1.8rem' }}>Stok Listesi</h2>
        <button className="btn btn-primary" onClick={() => navigate('/portal/yeni-stok')}>
          <Plus size={18} />
          <span>Yeni Parça Ekle</span>
        </button>
      </div>

      <div className="glass-panel mb-6" style={{ padding: '1.5rem' }}>
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div style={{ position: 'relative', flex: 1 }}>
            <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} size={20} />
            <input 
              type="text" 
              className="form-input" 
              style={{ paddingLeft: '2.75rem' }}
              placeholder="Parça kodu, adı, raf yeri veya barkod ile detaylı arama..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-secondary">
            Filtrele
          </button>
        </form>
      </div>

      <div className="table-container">
        {isLoading ? (
          <div className="text-center" style={{ padding: '3rem' }}>Yükleniyor... (Çevrimdışı iseniz önbellekten getiriliyor)</div>
        ) : isError ? (
          <div className="text-center text-danger" style={{ padding: '3rem' }}>Veriler alınırken bir hata oluştu.</div>
        ) : stocks && stocks.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Raf Yeri</th>
                <th>Parça Kodu</th>
                <th>Parça Adı</th>
                <th>Tür</th>
                <th>Miktar</th>
                <th>Fiyat</th>
                <th style={{ textAlign: 'right' }}>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {stocks.map((stock) => (
                <tr key={stock.id}>
                  <td>
                    {stock.shelf_location ? (
                      <span className="shelf-tag">{stock.shelf_location}</span>
                    ) : (
                      <span className="text-muted">-</span>
                    )}
                  </td>
                  <td className="font-bold text-primary">{stock.part_code}</td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{stock.part_name}</div>
                    {stock.category && <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{stock.category}</div>}
                  </td>
                  <td>
                    <span className={`badge ${stock.part_type === 'Orijinal' ? 'badge-success' : 'badge-warning'}`}>
                      {stock.part_type}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{stock.quantity}</span>
                      {stock.quantity <= stock.min_stock_warning && (
                        <AlertCircle size={16} color="var(--color-danger)" title="Kritik Stok Seviyesi" />
                      )}
                    </div>
                  </td>
                  <td style={{ fontWeight: 600 }}>₺{stock.price.toLocaleString('tr-TR')}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="flex justify-end gap-2">
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)' }}
                        onClick={() => navigate(`/portal/stok-duzenle/${stock.id}`)}
                        title="Düzenle"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        className="btn btn-danger" 
                        style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)' }}
                        onClick={() => handleDelete(stock.id)}
                        title="Sil"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-center" style={{ padding: '4rem', color: 'var(--color-text-muted)' }}>
            <Box size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
            <p>Aramanıza uygun stok bulunamadı.</p>
          </div>
        )}
      </div>
    </div>
  );
}
