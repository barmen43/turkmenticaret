import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import { X, TrendingUp, TrendingDown, Percent, CheckCircle2, AlertTriangle, RefreshCw, ArrowRight } from 'lucide-react';

export default function BulkPriceUpdateModal({ isOpen, onClose, onSuccess }) {
  const [brands, setBrands] = useState([]);
  const [loadingBrands, setLoadingBrands] = useState(true);
  
  // Form State
  const [selectedBrand, setSelectedBrand] = useState('');
  const [direction, setDirection] = useState('increase'); // 'increase' | 'decrease'
  const [percent, setPercent] = useState('10');
  const [priceTarget, setPriceTarget] = useState('sale'); // 'sale' | 'buying' | 'both'
  const [rounding, setRounding] = useState('round_5'); // 'exact' | 'round_int' | 'round_5' | 'round_10'
  
  // Matching stocks & preview
  const [matchingStocks, setMatchingStocks] = useState([]);
  const [loadingStocks, setLoadingStocks] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [statusMessage, setStatusMessage] = useState(null);

  // Load distinct brands on open
  useEffect(() => {
    if (!isOpen) return;

    const fetchBrands = async () => {
      setLoadingBrands(true);
      try {
        // Fetch brands from both brands table and stocks table
        const [brandsRes, stocksRes] = await Promise.all([
          supabase.from('brands').select('name').order('name'),
          supabase.from('stocks').select('brand').eq('is_active', true)
        ]);

        const brandSet = new Set();
        if (brandsRes.data) {
          brandsRes.data.forEach(b => {
            if (b.name && b.name.trim()) brandSet.add(b.name.trim());
          });
        }
        if (stocksRes.data) {
          stocksRes.data.forEach(s => {
            if (s.brand && s.brand.trim()) brandSet.add(s.brand.trim());
          });
        }

        const sortedBrands = Array.from(brandSet).sort((a, b) => a.localeCompare(b, 'tr'));
        setBrands(sortedBrands);
        if (sortedBrands.length > 0 && !selectedBrand) {
          setSelectedBrand(sortedBrands[0]);
        }
      } catch (err) {
        console.error('Markalar yüklenirken hata:', err);
      } finally {
        setLoadingBrands(false);
      }
    };

    fetchBrands();
  }, [isOpen]);

  // Fetch stocks for selected brand whenever selectedBrand changes
  useEffect(() => {
    if (!isOpen || !selectedBrand) {
      setMatchingStocks([]);
      return;
    }

    const fetchMatchingStocks = async () => {
      setLoadingStocks(true);
      try {
        let query = supabase
          .from('stocks')
          .select('id, part_code, part_name, brand, price, buying_price')
          .eq('is_active', true);

        if (selectedBrand === '__ALL__') {
          // Tüm markalar
        } else {
          // Case/whitespace tolerant search for selected brand
          query = query.or(`brand.ilike.%${selectedBrand}%,brand.eq.${selectedBrand}`);
        }

        const { data, error } = await query.order('part_code');
        if (error) throw error;
        setMatchingStocks(data || []);
      } catch (err) {
        console.error('Stoklar çekilemedi:', err);
      } finally {
        setLoadingStocks(false);
      }
    };

    fetchMatchingStocks();
  }, [isOpen, selectedBrand]);

  // Helper to calculate new price
  const calcNewPrice = (oldPrice) => {
    const val = Number(oldPrice) || 0;
    if (val <= 0) return 0;

    const pct = parseFloat(percent) || 0;
    const factor = direction === 'increase' ? (1 + pct / 100) : (1 - pct / 100);
    let calculated = val * factor;
    if (calculated < 0) calculated = 0;

    if (rounding === 'exact') {
      return Math.round(calculated * 100) / 100;
    } else if (rounding === 'round_int') {
      return Math.ceil(calculated);
    } else if (rounding === 'round_5') {
      return Math.round(calculated / 5) * 5;
    } else if (rounding === 'round_10') {
      return Math.round(calculated / 10) * 10;
    }
    return Math.round(calculated * 100) / 100;
  };

  // Preview samples (first 4 items with non-zero price)
  const previewItems = useMemo(() => {
    const withPrice = matchingStocks.filter(s => Number(s.price) > 0 || Number(s.buying_price) > 0);
    const source = withPrice.length > 0 ? withPrice : matchingStocks;
    return source.slice(0, 4);
  }, [matchingStocks]);

  // Execute bulk update
  const handleApplyUpdate = async () => {
    const pct = parseFloat(percent);
    if (!pct || pct <= 0) {
      alert('Lütfen geçerli bir yüzde oranı girin.');
      return;
    }

    if (matchingStocks.length === 0) {
      alert('Güncellenecek ürün bulunamadı.');
      return;
    }

    const brandName = selectedBrand === '__ALL__' ? 'TÜM' : selectedBrand;
    const confirmText = `${brandName} markasına ait ${matchingStocks.length} adet parçanın fiyatı %${pct} ${direction === 'increase' ? 'ARTIRILACAK' : 'İNDİRİLECEK'}.\n\nBu işlemi onaylıyor musunuz?`;
    
    if (!window.confirm(confirmText)) return;

    setUpdating(true);
    setProgress({ current: 0, total: matchingStocks.length });
    setStatusMessage(null);

    try {
      let updatedCount = 0;
      const chunkSize = 15; // Parallel batches

      for (let i = 0; i < matchingStocks.length; i += chunkSize) {
        const chunk = matchingStocks.slice(i, i + chunkSize);

        await Promise.all(chunk.map(async (item) => {
          const updatePayload = {
            updated_at: new Date().toISOString()
          };

          if (priceTarget === 'sale' || priceTarget === 'both') {
            if (Number(item.price) > 0) {
              updatePayload.price = calcNewPrice(item.price);
            }
          }

          if (priceTarget === 'buying' || priceTarget === 'both') {
            if (Number(item.buying_price) > 0) {
              updatePayload.buying_price = calcNewPrice(item.buying_price);
            }
          }

          if (Object.keys(updatePayload).length > 1) {
            const { error } = await supabase
              .from('stocks')
              .update(updatePayload)
              .eq('id', item.id);
            if (error) throw error;
          }
        }));

        updatedCount += chunk.length;
        setProgress({ current: updatedCount, total: matchingStocks.length });
      }

      setStatusMessage({
        type: 'success',
        text: `Başarılı! ${matchingStocks.length} adet parçanın fiyatı güncellendi.`
      });

      if (onSuccess) onSuccess();

      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (err) {
      console.error('Toplu güncelleme hatası:', err);
      setStatusMessage({
        type: 'error',
        text: 'Güncelleme yapılırken bir hata oluştu: ' + (err.message || err)
      });
    } finally {
      setUpdating(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-overlay" onClick={updating ? undefined : onClose} style={{ zIndex: 99999 }}>
      <div 
        className="modal-content animate-fade-in" 
        onClick={(e) => e.stopPropagation()} 
        style={{ maxWidth: '640px', width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div className="modal-header" style={{ flexShrink: 0 }}>
          <div className="flex items-center gap-3">
            <div style={{ backgroundColor: 'rgba(255, 107, 0, 0.15)', padding: '0.6rem', borderRadius: 'var(--radius-md)' }}>
              <Percent size={24} className="text-primary" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.3rem' }}>Markaya Göre Toplu Fiyat Güncelle</h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                Enflasyon ve kur geçişlerinde seçilen markanın tüm fiyatlarını tek seferde güncelleyin.
              </p>
            </div>
          </div>
          {!updating && (
            <button className="modal-close" onClick={onClose}>
              <X size={22} />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          
          {/* Status Message */}
          {statusMessage && (
            <div 
              style={{ 
                padding: '0.8rem 1rem', 
                borderRadius: 'var(--radius-md)', 
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: statusMessage.type === 'success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: statusMessage.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)',
                border: `1px solid ${statusMessage.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)'}`
              }}
            >
              {statusMessage.type === 'success' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* 1. Marka Seçimi */}
          <div className="form-group mb-4">
            <label className="form-label font-bold" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>1. Marka Seçin *</span>
              {loadingStocks ? (
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Hesaplanıyor...</span>
              ) : (
                <span className="text-primary" style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>
                  {matchingStocks.length} adet ürün bulundu
                </span>
              )}
            </label>
            <select 
              value={selectedBrand} 
              onChange={(e) => setSelectedBrand(e.target.value)} 
              className="form-input"
              disabled={updating || loadingBrands}
              style={{ fontSize: '1.05rem', fontWeight: 'bold' }}
            >
              {loadingBrands ? (
                <option value="">Markalar yükleniyor...</option>
              ) : (
                <>
                  <option value="__ALL__">⚡ TÜM MARKALAR (Tüm Aktif Stoklar)</option>
                  {brands.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </>
              )}
            </select>
          </div>

          {/* 2. İşlem Yönü & Yüzde Oranı */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div className="form-group">
              <label className="form-label font-bold">2. İşlem Yönü</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={`btn ${direction === 'increase' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{
                    flex: 1,
                    backgroundColor: direction === 'increase' ? 'var(--color-danger)' : undefined,
                    borderColor: direction === 'increase' ? 'var(--color-danger)' : undefined,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                  onClick={() => setDirection('increase')}
                  disabled={updating}
                >
                  <TrendingUp size={16} />
                  Fiyat Artışı (Zam)
                </button>
                <button
                  type="button"
                  className={`btn ${direction === 'decrease' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{
                    flex: 1,
                    backgroundColor: direction === 'decrease' ? 'var(--color-success)' : undefined,
                    borderColor: direction === 'decrease' ? 'var(--color-success)' : undefined,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                  onClick={() => setDirection('decrease')}
                  disabled={updating}
                >
                  <TrendingDown size={16} />
                  İndirim
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label font-bold">3. Yüzde Oranı (%) *</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="number"
                  step="0.5"
                  min="0.1"
                  max="1000"
                  value={percent}
                  onChange={(e) => setPercent(e.target.value)}
                  className="form-input"
                  placeholder="Örn: 15"
                  disabled={updating}
                  style={{ fontSize: '1.1rem', fontWeight: 'bold', paddingRight: '2.5rem' }}
                />
                <span style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', fontWeight: 'bold', color: 'var(--color-text-muted)' }}>
                  %
                </span>
              </div>
            </div>
          </div>

          {/* Hızlı Yüzde Butonları */}
          <div className="flex gap-2 mb-4" style={{ flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', alignSelf: 'center' }}>Hızlı Oranlar:</span>
            {['5', '10', '15', '20', '25', '30'].map(p => (
              <button
                key={p}
                type="button"
                className="btn btn-secondary"
                style={{
                  padding: '0.2rem 0.6rem',
                  fontSize: '0.85rem',
                  backgroundColor: percent === p ? 'var(--color-primary)' : undefined,
                  color: percent === p ? '#fff' : undefined
                }}
                onClick={() => setPercent(p)}
                disabled={updating}
              >
                %{p}
              </button>
            ))}
          </div>

          {/* 3. Hangi Fiyata Uygulanacak? */}
          <div className="form-group mb-4">
            <label className="form-label font-bold">4. Hangi Fiyat Alanı Güncellenecek?</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
              <button
                type="button"
                className={`btn ${priceTarget === 'sale' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.85rem', padding: '0.5rem' }}
                onClick={() => setPriceTarget('sale')}
                disabled={updating}
              >
                Yalnızca Satış Fiyatı
              </button>
              <button
                type="button"
                className={`btn ${priceTarget === 'buying' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.85rem', padding: '0.5rem' }}
                onClick={() => setPriceTarget('buying')}
                disabled={updating}
              >
                Yalnızca Alış Fiyatı
              </button>
              <button
                type="button"
                className={`btn ${priceTarget === 'both' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.85rem', padding: '0.5rem' }}
                onClick={() => setPriceTarget('both')}
                disabled={updating}
              >
                Hem Alış Hem Satış
              </button>
            </div>
          </div>

          {/* 4. Kuruş Yuvarlama Kuralı */}
          <div className="form-group mb-4">
            <label className="form-label font-bold">5. Fiyat Yuvarlama Kuralı</label>
            <select
              value={rounding}
              onChange={(e) => setRounding(e.target.value)}
              className="form-input"
              disabled={updating}
            >
              <option value="round_5">🎯 En yakın 5 ₺'ye yuvarla (Örn: 452 ₺ ➔ 455 ₺) [Tavsiye Edilen]</option>
              <option value="round_10">🎯 En yakın 10 ₺'ye yuvarla (Örn: 452 ₺ ➔ 450 ₺)</option>
              <option value="round_int">⬆️ Tam TL'ye yukarı yuvarla (Örn: 452.30 ₺ ➔ 453 ₺)</option>
              <option value="exact">🪙 Kuruşlu bırak (2 basamak, Örn: 452.55 ₺)</option>
            </select>
          </div>

          {/* 5. Canlı Önizleme */}
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', marginBottom: '1.5rem' }}>
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-primary" style={{ fontSize: '0.9rem' }}>
                🔍 Örnek Fiyat Değişim Önizlemesi (İlk {previewItems.length} Ürün):
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                {direction === 'increase' ? `+%${percent} Zam` : `-%${percent} İndirim`}
              </span>
            </div>

            {previewItems.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {previewItems.map(item => {
                  const basePrice = priceTarget === 'buying' ? (item.buying_price || 0) : (item.price || 0);
                  const newPrice = calcNewPrice(basePrice);
                  const diff = newPrice - basePrice;

                  return (
                    <div 
                      key={item.id} 
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        fontSize: '0.85rem',
                        padding: '0.4rem 0.6rem',
                        background: 'rgba(0,0,0,0.2)',
                        borderRadius: 'var(--radius-sm)'
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0, paddingRight: '1rem' }}>
                        <div className="font-bold" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.part_code} <span style={{ color: 'var(--color-text-muted)', fontWeight: 'normal' }}>- {item.part_name}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2" style={{ whiteSpace: 'nowrap' }}>
                        <span style={{ textDecoration: 'line-through', color: 'var(--color-text-muted)' }}>
                          ₺{Number(basePrice).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                        </span>
                        <ArrowRight size={14} className="text-primary" />
                        <span style={{ fontWeight: 'bold', color: direction === 'increase' ? 'var(--color-danger)' : 'var(--color-success)' }}>
                          ₺{Number(newPrice).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                        </span>
                        <span 
                          style={{ 
                            fontSize: '0.75rem', 
                            padding: '0.1rem 0.4rem', 
                            borderRadius: '4px',
                            backgroundColor: direction === 'increase' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                            color: direction === 'increase' ? 'var(--color-danger)' : 'var(--color-success)'
                          }}
                        >
                          {diff >= 0 ? `+₺${diff.toLocaleString('tr-TR')}` : `-₺${Math.abs(diff).toLocaleString('tr-TR')}`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                Bu markaya ait fiyatlandırılmış parça bulunamadı.
              </div>
            )}
          </div>

          {/* Progress Bar (when updating) */}
          {updating && (
            <div style={{ marginBottom: '1.5rem' }}>
              <div className="flex justify-between mb-1" style={{ fontSize: '0.85rem' }}>
                <span>Fiyatlar güncelleniyor...</span>
                <span className="font-bold">{progress.current} / {progress.total} (%{Math.round((progress.current / (progress.total || 1)) * 100)})</span>
              </div>
              <div style={{ height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                <div 
                  style={{ 
                    height: '100%', 
                    background: 'var(--color-primary)', 
                    width: `${Math.round((progress.current / (progress.total || 1)) * 100)}%`,
                    transition: 'width 0.2s ease'
                  }} 
                />
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="modal-footer flex justify-between items-center" style={{ borderTop: '1px solid var(--color-border)', padding: '1rem 1.5rem', flexShrink: 0, background: 'rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            ⚠️ İşlem geri alınamaz. Lütfen oranları kontrol edin.
          </div>

          <div className="flex gap-2">
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={onClose}
              disabled={updating}
            >
              İptal
            </button>
            <button 
              type="button" 
              className="btn btn-primary" 
              onClick={handleApplyUpdate}
              disabled={updating || matchingStocks.length === 0 || !percent || parseFloat(percent) <= 0}
              style={{ minWidth: '180px' }}
            >
              {updating ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  Güncelleniyor...
                </>
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  {matchingStocks.length} Parçayı Güncelle
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
}
