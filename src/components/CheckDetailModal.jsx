import React from 'react';
import { X, CreditCard, User, Truck, Calendar, DollarSign, Building } from 'lucide-react';
import dayjs from 'dayjs';

export default function CheckDetailModal({ check, onClose }) {
  if (!check) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div className="modal-content animate-fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px', width: '100%', margin: '1rem', background: 'var(--color-surface)', color: 'var(--color-text)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)' }}>
        
        <div className="modal-header" style={{ borderBottom: '1px solid var(--color-border)', padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CreditCard className="text-primary" size={24} />
            Evrak Detayı
          </h3>
          <button onClick={onClose} className="modal-close" style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>

        <div className="modal-body" style={{ padding: '1.5rem' }}>
          {/* Durum Rozeti */}
          <div className="mb-6 flex justify-between items-center">
            <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Güncel Durum:</span>
            <span className={`badge ${check.status === 'Portföyde' ? 'badge-warning' : check.status === 'Tahsil Edildi' || check.status === 'Ödendi' ? 'badge-success' : 'badge-secondary'}`} style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}>
              {check.status}
            </span>
          </div>

          {/* Temel Bilgiler */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
            <div className="flex justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
              <span className="flex items-center gap-2" style={{ color: 'var(--color-text-muted)' }}><CreditCard size={16} /> Evrak Türü</span>
              <span className="font-bold">{check.type}</span>
            </div>
            <div className="flex justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
              <span className="flex items-center gap-2" style={{ color: 'var(--color-text-muted)' }}>Evrak / Çek No</span>
              <span>{check.check_number || '-'}</span>
            </div>
            <div className="flex justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
              <span className="flex items-center gap-2" style={{ color: 'var(--color-text-muted)' }}><Building size={16} /> Banka Adı</span>
              <span>{check.bank_name || '-'}</span>
            </div>
            <div className="flex justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
              <span className="flex items-center gap-2" style={{ color: 'var(--color-text-muted)' }}><User size={16} /> Keşideci (Asıl Borçlu)</span>
              <span>{check.owner_name || '-'}</span>
            </div>
            <div className="flex justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
              <span className="flex items-center gap-2" style={{ color: 'var(--color-text-muted)' }}><Calendar size={16} /> Vade Tarihi</span>
              <span className="font-bold">{dayjs(check.due_date).format('DD.MM.YYYY')}</span>
            </div>
            <div className="flex justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
              <span className="flex items-center gap-2" style={{ color: 'var(--color-text-muted)' }}><DollarSign size={16} /> Tutar</span>
              <span className="font-bold text-primary" style={{ fontSize: '1.2rem' }}>₺{Number(check.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* Cari Hareket Geçmişi Özeti */}
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
            <h4 style={{ margin: '0 0 1rem 0', color: 'var(--color-secondary)' }}>Evrakın Yolculuğu</h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Giriş */}
              {check.received_from?.name ? (
                <div className="flex items-start gap-3">
                  <div style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#86efac', padding: '0.5rem', borderRadius: '50%' }}>
                    <User size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Müşteriden Alındı (Giriş)</div>
                    <div className="font-bold">{check.received_from.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{dayjs(check.created_at).format('DD.MM.YYYY HH:mm')}</div>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <div style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#86efac', padding: '0.5rem', borderRadius: '50%' }}>
                    <User size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Giriş</div>
                    <div className="font-bold">Kendi Evrakımız / Dışarıdan</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{dayjs(check.created_at).format('DD.MM.YYYY HH:mm')}</div>
                  </div>
                </div>
              )}

              {/* Çıkış */}
              {check.status === 'Cirolandı' && check.given_to?.name && (
                <div className="flex items-start gap-3 relative" style={{ paddingTop: '0.5rem' }}>
                  {/* Connecting Line */}
                  <div style={{ position: 'absolute', left: '15px', top: '-15px', bottom: '25px', width: '2px', background: 'var(--color-border)', zIndex: 0 }}></div>
                  
                  <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#fca5a5', padding: '0.5rem', borderRadius: '50%', zIndex: 1 }}>
                    <Truck size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Tedarikçiye Cirolandı (Çıkış)</div>
                    <div className="font-bold">{check.given_to.name}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
