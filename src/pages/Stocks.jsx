import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Search, Edit, Trash2, Plus, AlertCircle, Box, RefreshCw, X, HelpCircle, Printer, Camera } from 'lucide-react';
import BarcodeModal from '../components/BarcodeModal';
import BarcodeScannerModal from '../components/BarcodeScannerModal';

// Basit Levenshtein mesafesi algoritması ile benzerlik hesaplama
const getSimilarity = (s1, s2) => {
  s1 = s1.toLowerCase();
  s2 = s2.toLowerCase();
  if (s1 === s2) return 1.0;
  
  const len1 = s1.length;
  const len2 = s2.length;
  if (len1 === 0 || len2 === 0) return 0.0;

  const costs = new Array(len2 + 1);
  for (let i = 0; i <= len1; i++) {
    let lastValue = i;
    for (let j = 0; j <= len2; j++) {
      if (i === 0) {
        costs[j] = j;
      } else {
        if (j > 0) {
          let newValue = costs[j - 1];
          if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
    }
    if (i > 0) costs[len2] = lastValue;
  }
  
  const distance = costs[len2];
  const maxLen = Math.max(len1, len2);
  return (maxLen - distance) / maxLen;
};

// Fuzzy arama ile alternatif öneriler oluşturma
const getSuggestions = (searchTerm, allStocks) => {
  if (!searchTerm || !allStocks || allStocks.length === 0) return [];
  
  const normalizedSearch = searchTerm.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (normalizedSearch.length < 3) return [];

  const scoredStocks = allStocks.map(stock => {
    let bestScore = 0;
    
    // Parça kodunu boşluksuz ve sembolsüz karşılaştır
    const code = (stock.part_code || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (code) {
       if (code === normalizedSearch) bestScore = 1.0;
       else if (code.includes(normalizedSearch) || normalizedSearch.includes(code)) bestScore = Math.max(bestScore, 0.8);
       else bestScore = Math.max(bestScore, getSimilarity(normalizedSearch, code));
    }

    // Parça adındaki her bir kelime ile karşılaştır
    const nameWords = (stock.part_name || '').toLowerCase().split(/[\s-]+/);
    for (const word of nameWords) {
       const cleanWord = word.replace(/[^a-z0-9]/g, '');
       if (cleanWord.length > 2) {
          if (cleanWord === normalizedSearch) bestScore = Math.max(bestScore, 0.9);
          else bestScore = Math.max(bestScore, getSimilarity(normalizedSearch, cleanWord));
       }
    }

    return { stock, score: bestScore };
  });

  return scoredStocks
    .filter(s => s.score > 0.6) // Benzerlik eşiği (0.6 ve üzeri kabul edilir)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4) // En iyi 4 öneriyi al
    .map(s => s.stock);
};
export default function Stocks() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const navigate = useNavigate();

  // Alternatives Modal State
  const [alternativesModalOpen, setAlternativesModalOpen] = useState(false);
  const [selectedPart, setSelectedPart] = useState(null);
  const [alternatives, setAlternatives] = useState([]);
  const [isLoadingAlternatives, setIsLoadingAlternatives] = useState(false);

  // Barcode Modal State
  const [barcodeModalOpen, setBarcodeModalOpen] = useState(false);
  const [selectedStockForBarcode, setSelectedStockForBarcode] = useState(null);

  // Scanner Modal State
  const [scannerOpen, setScannerOpen] = useState(false);

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
        // Arama terimini boşluklara göre bölüp her bir kelime için ayrı bir .or() filtresi ekliyoruz.
        // Boşluk hatalarını tolere etmek için harf ve sayılar arasına otomatik boşluk ekleyebiliriz (örn. ANKA38001 -> ANKA 38001)
        const normalizedQ = q.replace(/([a-zA-Z])(\d)/g, '$1 $2').replace(/(\d)([a-zA-Z])/g, '$1 $2');
        const words = normalizedQ.split(/[\s-]+/).filter(word => word.trim().length > 0);
        
        words.forEach(word => {
          query = query.or(`part_code.ilike.%${word}%,part_name.ilike.%${word}%,shelf_location.ilike.%${word}%,barcode.ilike.%${word}%,brand.ilike.%${word}%,vehicle_brand.ilike.%${word}%,original_part_number.ilike.%${word}%`);
        });
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Eğer sonuç bulunamazsa öneriler için tüm veriyi çek (yalnızca sonuç yoksa çalışır)
  const { data: suggestions, isLoading: isLoadingSuggestions } = useQuery({
    queryKey: ['stock-suggestions', searchParams.get('q')],
    enabled: !!searchParams.get('q') && stocks?.length === 0,
    queryFn: async () => {
      const q = searchParams.get('q');
      // Öneri yapmak için sadece temel bilgileri çekiyoruz (performans için)
      const { data, error } = await supabase.from('stocks').select('id, part_code, part_name, brand').limit(3000);
      if (error) throw error;
      
      return getSuggestions(q, data);
    }
  });

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    if (searchTerm.trim()) {
      setSearchParams({ q: searchTerm.trim() });
    } else {
      setSearchParams({});
    }
  };

  const handleScan = (scannedCode) => {
    setSearchTerm(scannedCode);
    setSearchParams({ q: scannedCode });
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

  const handleViewAlternatives = async (stock) => {
    if (!stock.original_part_number) return;
    
    setSelectedPart(stock);
    setAlternativesModalOpen(true);
    setIsLoadingAlternatives(true);

    const { data, error } = await supabase
      .from('stocks')
      .select('*')
      .eq('original_part_number', stock.original_part_number)
      .neq('id', stock.id)
      .order('price', { ascending: true });

    if (!error && data) {
      setAlternatives(data);
    } else {
      setAlternatives([]);
    }
    
    setIsLoadingAlternatives(false);
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
          <div style={{ position: 'relative', flex: 1, display: 'flex' }}>
            <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} size={20} />
            <input 
              type="text" 
              className="form-input" 
              style={{ paddingLeft: '2.75rem', borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
              placeholder="Parça kodu, adı, raf yeri veya barkod ile detaylı arama..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button 
              type="button" 
              className="btn btn-secondary" 
              style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0, borderLeft: 'none', padding: '0 1rem' }}
              onClick={() => setScannerOpen(true)}
              title="Kamerayla Barkod Okut"
            >
              <Camera size={20} />
            </button>
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
                    {stock.category && <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'inline-block', marginRight: '0.5rem' }}>{stock.category}</div>}
                    {stock.brand && <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'inline-block', marginRight: '0.5rem' }}>{stock.brand}</div>}
                    {stock.vehicle_brand && <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'inline-block', marginRight: '0.5rem' }}>Araç: {stock.vehicle_brand}</div>}
                    {stock.original_part_number && <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'inline-block' }}>Orijinal No: {stock.original_part_number}</div>}
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
                        onClick={() => {
                          setSelectedStockForBarcode(stock);
                          setBarcodeModalOpen(true);
                        }}
                        title="Barkod Yazdır"
                      >
                        <Printer size={16} />
                      </button>
                      {stock.original_part_number && (
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)' }}
                          onClick={() => handleViewAlternatives(stock)}
                          title="Alternatifleri Gör"
                        >
                          <RefreshCw size={16} color="var(--color-primary)" />
                        </button>
                      )}
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
            <p style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Aramanıza uygun stok bulunamadı.</p>
            
            {/* Bunu mu demek istediniz? (Öneriler) */}
            {isLoadingSuggestions && (
              <div style={{ fontSize: '0.9rem', opacity: 0.7 }}>Alternatif ürünler aranıyor...</div>
            )}
            {!isLoadingSuggestions && suggestions && suggestions.length > 0 && (
              <div className="suggestions-container" style={{ 
                marginTop: '1.5rem', 
                padding: '1.5rem', 
                background: 'rgba(var(--color-primary-rgb), 0.05)', 
                borderRadius: 'var(--radius-lg)',
                border: '1px solid rgba(var(--color-primary-rgb), 0.1)',
                display: 'inline-block',
                textAlign: 'left',
                maxWidth: '600px',
                width: '100%'
              }}>
                <div className="flex items-center gap-2 mb-3 text-primary font-bold">
                  <HelpCircle size={18} />
                  <span>Bunu mu demek istediniz?</span>
                </div>
                <div className="flex flex-col gap-2">
                  {suggestions.map(s => (
                    <button 
                      key={s.id}
                      onClick={() => setSearchParams({ q: s.part_code })}
                      className="btn"
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        background: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                        padding: '0.75rem 1rem',
                        textAlign: 'left',
                        width: '100%'
                      }}
                    >
                      <div>
                        <span className="font-bold text-primary mr-2">{s.part_code}</span>
                        <span>{s.part_name}</span>
                      </div>
                      {s.brand && <span className="text-muted" style={{ fontSize: '0.8rem' }}>{s.brand}</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Alternatives Modal */}
      {alternativesModalOpen && (
        <div className="modal-overlay" onClick={() => setAlternativesModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ margin: 0, fontSize: '1.4rem' }}>Alternatif Parçalar</h3>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                  Orijinal No: <span className="font-bold text-primary">{selectedPart?.original_part_number}</span>
                </p>
              </div>
              <button className="modal-close" onClick={() => setAlternativesModalOpen(false)}>
                <X size={24} />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="mb-4" style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-md)' }}>
                <strong>Seçili Parça:</strong> {selectedPart?.part_name} ({selectedPart?.brand || 'Markasız'}) - {selectedPart?.part_type} - ₺{selectedPart?.price.toLocaleString('tr-TR')}
              </div>

              {isLoadingAlternatives ? (
                <div className="text-center py-4">Alternatifler aranıyor...</div>
              ) : alternatives.length > 0 ? (
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Marka / Tür</th>
                        <th>Parça Adı</th>
                        <th>Raf Yeri</th>
                        <th>Stok</th>
                        <th>Fiyat</th>
                      </tr>
                    </thead>
                    <tbody>
                      {alternatives.map(alt => (
                        <tr key={alt.id}>
                          <td>
                            <div className="font-bold">{alt.brand || '-'}</div>
                            <span className={`badge ${alt.part_type === 'Orijinal' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.65rem' }}>
                              {alt.part_type}
                            </span>
                          </td>
                          <td>
                            <div style={{ fontWeight: 500 }}>{alt.part_name}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Kodu: {alt.part_code}</div>
                          </td>
                          <td>{alt.shelf_location || '-'}</td>
                          <td>
                            <div className="flex items-center gap-2">
                              <span style={{ fontWeight: 'bold' }}>{alt.quantity}</span>
                              {alt.quantity <= alt.min_stock_warning && <AlertCircle size={14} color="var(--color-danger)" />}
                            </div>
                          </td>
                          <td className="font-bold text-primary">₺{alt.price.toLocaleString('tr-TR')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center" style={{ padding: '2rem', color: 'var(--color-text-muted)' }}>
                  <Box size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
                  <p>Bu orijinal numaraya sahip başka bir alternatif parça bulunamadı.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Barcode Print Modal */}
      {barcodeModalOpen && selectedStockForBarcode && (
        <BarcodeModal 
          stock={selectedStockForBarcode} 
          onClose={() => {
            setBarcodeModalOpen(false);
            setSelectedStockForBarcode(null);
          }} 
        />
      )}

      {/* Barcode Scanner Modal */}
      {scannerOpen && (
        <BarcodeScannerModal 
          onClose={() => setScannerOpen(false)}
          onScan={handleScan}
        />
      )}
    </div>
  );
}
