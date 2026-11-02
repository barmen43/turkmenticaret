import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Package, AlertTriangle, TrendingUp, TrendingDown, Wallet, Banknote, Users, Truck, Calendar, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { supabase } from '../lib/supabase';
import OverdueCustomers from '../components/OverdueCustomers';

export default function Dashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isLowStockModalOpen, setIsLowStockModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');

  // En Çok / En Az Satanlar Modal State ('top' | 'bottom' | null)
  const [salesRankModalMode, setSalesRankModalMode] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const navigate = useNavigate();

  // Get quick stats
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats-v3'],
    staleTime: 0,
    refetchOnMount: 'always',
    queryFn: async () => {
      const [stocksRes, accountsRes, txRes] = await Promise.all([
        supabase.from('stocks').select('*').eq('is_active', true),
        supabase.from('accounts').select('id, account_type'),
        supabase.from('transactions').select('account_id, amount, transaction_type')
      ]);

      if (stocksRes.error) throw stocksRes.error;

      const list = stocksRes.data || [];
      let lowStockCount = 0;
      let totalBuyingValue = 0;
      let totalSaleValue = 0;

      for (const item of list) {
        const qty = Number(item.quantity) || 0;
        if (qty < 5) lowStockCount++;
        if (qty > 0) {
          totalBuyingValue += qty * (Number(item.buying_price) || 0);
          totalSaleValue += qty * (Number(item.price) || 0);
        }
      }

      // Cari (Müşteri Alacak & Tedarikçi Borç) hesaplaması
      const balanceByAccount = {};
      if (txRes.data) {
        for (const tx of txRes.data) {
          if (!balanceByAccount[tx.account_id]) balanceByAccount[tx.account_id] = 0;
          if (tx.transaction_type === 'Borç') balanceByAccount[tx.account_id] -= Number(tx.amount) || 0;
          if (tx.transaction_type === 'Alacak') balanceByAccount[tx.account_id] += Number(tx.amount) || 0;
        }
      }

      let totalReceivables = 0; // Müşterilerden toplam veresiye alacağımız
      let totalSupplierDebt = 0; // Tedarikçilere olan toplam borcumuz

      if (accountsRes.data) {
        for (const acc of accountsRes.data) {
          const bal = balanceByAccount[acc.id] || 0;
          if (acc.account_type === 'Müşteri' && bal < 0) {
            totalReceivables += Math.abs(bal);
          } else if (acc.account_type === 'Tedarikçi' && bal > 0) {
            totalSupplierDebt += bal;
          }
        }
      }

      return {
        total: list.length,
        lowStock: lowStockCount,
        totalBuyingValue,
        totalSaleValue,
        totalReceivables,
        totalSupplierDebt
      };
    }
  });

  // Get low stock items
  const { data: lowStockItems, isLoading: isLoadingLowStock } = useQuery({
    queryKey: ['low-stock-items'],
    queryFn: async () => {
      const { data, error } = await supabase.from('stocks').select('*').eq('is_active', true).lt('quantity', 5).order('quantity', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: isLowStockModalOpen
  });

  // En Çok / En Az Satan 20 Ürün Sorgusu (Tarih filtresi seçilmezse son 30 gün)
  const { data: salesRankData, isLoading: isLoadingSalesRank } = useQuery({
    queryKey: ['sales-rank-items', salesRankModalMode, startDate, endDate],
    enabled: Boolean(salesRankModalMode),
    staleTime: 0,
    queryFn: async () => {
      const effectiveStart = startDate 
        ? dayjs(startDate).startOf('day').toISOString() 
        : dayjs().subtract(30, 'day').startOf('day').toISOString();
      const effectiveEnd = endDate 
        ? dayjs(endDate).endOf('day').toISOString() 
        : dayjs().endOf('day').toISOString();

      const [stocksRes, salesRes] = await Promise.all([
        supabase.from('stocks').select('id, part_code, part_name, brand, category, quantity, price').eq('is_active', true),
        supabase
          .from('sales')
          .select('id, created_at')
          .gte('created_at', effectiveStart)
          .lte('created_at', effectiveEnd)
      ]);

      if (stocksRes.error) throw stocksRes.error;
      if (salesRes.error) throw salesRes.error;

      const allStocks = stocksRes.data || [];
      const salesInPeriod = salesRes.data || [];
      const saleIds = salesInPeriod.map(s => s.id);

      let saleItems = [];
      if (saleIds.length > 0) {
        const { data: itemsData, error: itemsErr } = await supabase
          .from('sale_items')
          .select('stock_id, quantity, total_price')
          .in('sale_id', saleIds);
        if (!itemsErr && itemsData) {
          saleItems = itemsData;
        }
      }

      const soldMap = {};
      for (const si of saleItems) {
        if (!si.stock_id) continue;
        if (!soldMap[si.stock_id]) {
          soldMap[si.stock_id] = { soldQuantity: 0, totalRevenue: 0 };
        }
        soldMap[si.stock_id].soldQuantity += Number(si.quantity) || 0;
        soldMap[si.stock_id].totalRevenue += Number(si.total_price) || 0;
      }

      const merged = allStocks.map(st => ({
        ...st,
        soldQuantity: soldMap[st.id]?.soldQuantity || 0,
        totalRevenue: soldMap[st.id]?.totalRevenue || 0
      }));

      if (salesRankModalMode === 'top') {
        return merged
          .filter(item => item.soldQuantity > 0)
          .sort((a, b) => b.soldQuantity - a.soldQuantity || b.totalRevenue - a.totalRevenue)
          .slice(0, 20);
      } else {
        return merged
          .sort((a, b) => a.soldQuantity - b.soldQuantity || a.totalRevenue - b.totalRevenue)
          .slice(0, 20);
      }
    }
  });

  const availableCategories = lowStockItems 
    ? [...new Set(lowStockItems.map(item => item.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'tr'))
    : [];

  const availableBrands = lowStockItems 
    ? [...new Set(lowStockItems.map(item => item.brand).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'tr'))
    : [];

  const filteredLowStockItems = lowStockItems?.filter(item => {
    const matchCategory = !selectedCategory || item.category === selectedCategory;
    const matchBrand = !selectedBrand || item.brand === selectedBrand;
    return matchCategory && matchBrand;
  }) || [];

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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '1.5rem' }}>
        
        <div className="glass-panel p-4" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ background: 'rgba(249, 115, 22, 0.1)', padding: '1rem', borderRadius: 'var(--radius-lg)' }}>
            <Package size={30} className="text-primary" />
          </div>
          <div>
            <p className="form-label" style={{ marginBottom: '0.25rem' }}>Toplam Parça Çeşidi</p>
            <h3 style={{ fontSize: '1.8rem', margin: 0 }}>{stats?.total || 0}</h3>
          </div>
        </div>

        <div 
          className="glass-panel p-4" 
          style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem', cursor: 'pointer', transition: 'transform 0.2s', border: '1px solid rgba(239, 68, 68, 0.3)' }}
          onClick={() => setIsLowStockModalOpen(true)}
          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '1rem', borderRadius: 'var(--radius-lg)' }}>
            <AlertTriangle size={30} color="var(--color-danger)" />
          </div>
          <div>
            <p className="form-label" style={{ marginBottom: '0.25rem' }}>Kritik Stok Uyarısı</p>
            <h3 style={{ fontSize: '1.8rem', margin: 0, color: 'var(--color-danger)' }}>{stats?.lowStock || 0}</h3>
          </div>
        </div>

        <div className="glass-panel p-4" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '1rem', borderRadius: 'var(--radius-lg)' }}>
            <Wallet size={30} color="#3b82f6" />
          </div>
          <div>
            <p className="form-label" style={{ marginBottom: '0.25rem' }}>Stok Alış Değeri</p>
            <h3 style={{ fontSize: '1.55rem', margin: 0, color: '#3b82f6' }}>
              ₺{(stats?.totalBuyingValue || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
          </div>
        </div>

        <div className="glass-panel p-4" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '1rem', borderRadius: 'var(--radius-lg)' }}>
            <Banknote size={30} color="var(--color-success)" />
          </div>
          <div>
            <p className="form-label" style={{ marginBottom: '0.25rem' }}>Stok Satış Değeri</p>
            <h3 style={{ fontSize: '1.55rem', margin: 0, color: 'var(--color-success)' }}>
              ₺{(stats?.totalSaleValue || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
          </div>
        </div>

        <div 
          className="glass-panel p-4" 
          style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem', cursor: 'pointer', transition: 'transform 0.2s' }}
          onClick={() => navigate('/portal/musteriler')}
          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          title="Müşteriler sayfasına git"
        >
          <div style={{ background: 'rgba(234, 179, 8, 0.1)', padding: '1rem', borderRadius: 'var(--radius-lg)' }}>
            <Users size={30} color="#eab308" />
          </div>
          <div>
            <p className="form-label" style={{ marginBottom: '0.25rem' }}>Toplam Alacak (Veresiye)</p>
            <h3 style={{ fontSize: '1.55rem', margin: 0, color: '#eab308' }}>
              ₺{(stats?.totalReceivables || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
          </div>
        </div>

        <div 
          className="glass-panel p-4" 
          style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem', cursor: 'pointer', transition: 'transform 0.2s' }}
          onClick={() => navigate('/portal/tedarikciler')}
          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          title="Tedarikçiler sayfasına git"
        >
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '1rem', borderRadius: 'var(--radius-lg)' }}>
            <Truck size={30} color="var(--color-danger)" />
          </div>
          <div>
            <p className="form-label" style={{ marginBottom: '0.25rem' }}>Tedarikçiye Toplam Borç</p>
            <h3 style={{ fontSize: '1.55rem', margin: 0, color: 'var(--color-danger)' }}>
              ₺{(stats?.totalSupplierDebt || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
          </div>
        </div>

        <div 
          className="glass-panel p-4" 
          style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem', cursor: 'pointer', transition: 'transform 0.2s', border: '1px solid rgba(34, 197, 94, 0.3)' }}
          onClick={() => setSalesRankModalMode('top')}
          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          title="En çok satan 20 ürünü görüntüle"
        >
          <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '1rem', borderRadius: 'var(--radius-lg)' }}>
            <TrendingUp size={30} color="var(--color-success)" />
          </div>
          <div>
            <p className="form-label" style={{ marginBottom: '0.25rem' }}>En Çok Satanlar</p>
            <h3 style={{ fontSize: '1.25rem', margin: 0, color: 'var(--color-success)' }}>İlk 20 Ürün</h3>
          </div>
        </div>

        <div 
          className="glass-panel p-4" 
          style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem', cursor: 'pointer', transition: 'transform 0.2s', border: '1px solid rgba(249, 115, 22, 0.3)' }}
          onClick={() => setSalesRankModalMode('bottom')}
          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          title="En az satan 20 ürünü görüntüle"
        >
          <div style={{ background: 'rgba(249, 115, 22, 0.1)', padding: '1rem', borderRadius: 'var(--radius-lg)' }}>
            <TrendingDown size={30} className="text-primary" />
          </div>
          <div>
            <p className="form-label" style={{ marginBottom: '0.25rem' }}>En Az Satanlar</p>
            <h3 style={{ fontSize: '1.25rem', margin: 0, color: 'var(--color-primary)' }}>Son 20 Ürün</h3>
          </div>
        </div>

        <div className="glass-panel p-4" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '1rem', borderRadius: 'var(--radius-lg)' }}>
            <TrendingUp size={30} color="var(--color-success)" />
          </div>
          <div>
            <p className="form-label" style={{ marginBottom: '0.25rem' }}>Sistem Durumu</p>
            <h3 style={{ fontSize: '1.4rem', margin: 0, color: 'var(--color-success)' }}>Çevrimiçi</h3>
          </div>
        </div>

      </div>

      <OverdueCustomers />

      {/* Low Stock Modal */}
      {isLowStockModalOpen && (
        <div className="modal-overlay" onClick={() => setIsLowStockModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-danger)' }}>
                <AlertTriangle size={24} /> Kritik Stok Seviyesindeki Ürünler
              </h3>
              <button className="modal-close" onClick={() => setIsLowStockModalOpen(false)}>
                <X size={24} />
              </button>
            </div>
            <div className="modal-body">
              {!isLoadingLowStock && lowStockItems && lowStockItems.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', alignItems: 'flex-end' }}>
                  <div style={{ flex: '1 1 200px' }}>
                    <label className="form-label" style={{ fontSize: '0.85rem', marginBottom: '0.35rem' }}>Kategoriye Göre Filtrele</label>
                    <select 
                      className="form-input" 
                      value={selectedCategory} 
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      style={{ padding: '0.5rem 0.75rem' }}
                    >
                      <option value="">Tüm Kategoriler ({lowStockItems.length})</option>
                      {availableCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ flex: '1 1 200px' }}>
                    <label className="form-label" style={{ fontSize: '0.85rem', marginBottom: '0.35rem' }}>Markaya Göre Filtrele</label>
                    <select 
                      className="form-input" 
                      value={selectedBrand} 
                      onChange={(e) => setSelectedBrand(e.target.value)}
                      style={{ padding: '0.5rem 0.75rem' }}
                    >
                      <option value="">Tüm Markalar</option>
                      {availableBrands.map(brand => (
                        <option key={brand} value={brand}>{brand}</option>
                      ))}
                    </select>
                  </div>

                  {(selectedCategory || selectedBrand) && (
                    <button 
                      type="button" 
                      className="btn btn-secondary" 
                      onClick={() => { setSelectedCategory(''); setSelectedBrand(''); }}
                      style={{ padding: '0.55rem 1rem', fontSize: '0.9rem' }}
                    >
                      Filtreyi Temizle
                    </button>
                  )}
                </div>
              )}

              {isLoadingLowStock ? (
                <p className="text-center text-muted">Yükleniyor...</p>
              ) : filteredLowStockItems.length > 0 ? (
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Parça Kodu</th>
                        <th>Parça Adı</th>
                        <th>Kategori</th>
                        <th>Marka</th>
                        <th>Miktar</th>
                        <th>Raf</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLowStockItems.map(item => (
                        <tr key={item.id}>
                          <td className="font-bold">{item.part_code}</td>
                          <td>{item.part_name}</td>
                          <td>{item.category || '-'}</td>
                          <td>{item.brand || '-'}</td>
                          <td>
                            <span className="badge badge-danger" style={{ fontSize: '0.9rem' }}>{item.quantity}</span>
                          </td>
                          <td>{item.shelf_location || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center text-muted" style={{ padding: '2rem 0' }}>
                  {lowStockItems && lowStockItems.length > 0 
                    ? 'Seçilen filtreye uygun kritik stok ürünü bulunamadı.' 
                    : 'Kritik stok seviyesinde ürün bulunmamaktadır.'}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* En Çok / En Az Satan 20 Ürün Modalı */}
      {salesRankModalMode && (
        <div className="modal-overlay" onClick={() => setSalesRankModalMode(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '850px' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: salesRankModalMode === 'top' ? 'var(--color-success)' : 'var(--color-primary)' }}>
                {salesRankModalMode === 'top' ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                {salesRankModalMode === 'top' ? 'En Çok Satan 20 Ürün' : 'En Az Satan 20 Ürün'}
              </h3>
              <button className="modal-close" onClick={() => setSalesRankModalMode(null)}>
                <X size={24} />
              </button>
            </div>
            <div className="modal-body">
              {/* Tarih Filtresi */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', alignItems: 'flex-end' }}>
                <div style={{ flex: '1 1 170px' }}>
                  <label className="form-label" style={{ fontSize: '0.85rem', marginBottom: '0.35rem' }}>Başlangıç Tarihi</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={startDate} 
                    onChange={(e) => setStartDate(e.target.value)}
                    style={{ padding: '0.5rem 0.75rem' }}
                  />
                </div>
                <div style={{ flex: '1 1 170px' }}>
                  <label className="form-label" style={{ fontSize: '0.85rem', marginBottom: '0.35rem' }}>Bitiş Tarihi</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={endDate} 
                    onChange={(e) => setEndDate(e.target.value)}
                    style={{ padding: '0.5rem 0.75rem' }}
                  />
                </div>
                {(startDate || endDate) ? (
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => { setStartDate(''); setEndDate(''); }}
                    style={{ padding: '0.55rem 1rem', fontSize: '0.9rem' }}
                  >
                    Son 30 Güne Dön
                  </button>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--color-text-muted)', padding: '0.55rem 0.5rem' }}>
                    <Calendar size={16} className="text-primary" />
                    <span>Varsayılan olarak <strong>son 30 günlük</strong> satış verileri gösteriliyor.</span>
                  </div>
                )}
              </div>

              {isLoadingSalesRank ? (
                <p className="text-center text-muted" style={{ padding: '2rem 0' }}>Satış verileri analiz ediliyor...</p>
              ) : salesRankData && salesRankData.length > 0 ? (
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ width: '40px' }}>#</th>
                        <th>Parça Kodu</th>
                        <th>Parça Adı</th>
                        <th>Marka</th>
                        <th style={{ textAlign: 'center' }}>Satılan Adet</th>
                        <th style={{ textAlign: 'right' }}>Satış Tutarı (Ciro)</th>
                        <th style={{ textAlign: 'center' }}>Kalan Stok</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salesRankData.map((item, idx) => (
                        <tr key={item.id}>
                          <td className="text-muted font-bold">{idx + 1}</td>
                          <td className="font-bold">{item.part_code}</td>
                          <td>{item.part_name}</td>
                          <td>{item.brand || '-'}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span className={`badge ${item.soldQuantity > 0 ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.9rem' }}>
                              {item.soldQuantity} Adet
                            </span>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                            ₺{Number(item.totalRevenue).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center text-muted" style={{ padding: '2rem 0' }}>
                  Seçilen tarih aralığında satış kaydı bulunamadı.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
