import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { X, ShoppingBag, Printer } from 'lucide-react';
import dayjs from 'dayjs';
import { printReceipt } from '../lib/printReceipt';

export default function SaleDetailModal({ saleIdPrefix, onClose }) {
  // 1. Önce siparişi bul
  const { data: sale, isLoading: loadingSale } = useQuery({
    queryKey: ['sale', saleIdPrefix],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200); // Son 200 satışı çek, içinde bizim prefix'i ara
      if (error) throw error;
      
      const foundSale = data.find(s => s.id.startsWith(saleIdPrefix));
      if (!foundSale) throw new Error("Sipariş bulunamadı");
      
      return foundSale;
    }
  });

  // 2. Siparişin içindeki ürünleri (sale_items) bul
  const { data: saleItems, isLoading: loadingItems } = useQuery({
    queryKey: ['sale_items', sale?.id],
    enabled: !!sale?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sale_items')
        .select('*')
        .eq('sale_id', sale.id);
      if (error) throw error;
      return data;
    }
  });

  // 3. Ürün isimlerini eşleştirmek için stokları çek
  const { data: stocksList } = useQuery({
    queryKey: ['stocks_for_modal'],
    queryFn: async () => {
      const { data, error } = await supabase.from('stocks').select('id, part_name, part_code, barcode');
      if (error) throw error;
      return data;
    }
  });

  const handlePrint = () => {
    if (!sale || !saleItems || !stocksList) return;

    // printReceipt fonksiyonuna veriyi uygun formatta hazırla
    const itemsData = saleItems.map(item => {
      const s = stocksList.find(st => st.id === item.stock_id) || {};
      return {
        name: s.part_name || 'Bilinmeyen Ürün',
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price
      };
    });

    const receiptData = {
      ...sale,
      customerName: sale.account_id ? 'Kayıtlı Müşteri' : 'Perakende'
    };

    printReceipt(receiptData, itemsData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className="modal-header flex justify-between items-center">
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShoppingBag className="text-primary" /> Fiş / Satış Detayı
          </h3>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn btn-secondary" onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0.75rem' }}>
              <Printer size={18} /> Yazdır
            </button>
            <button className="modal-close" onClick={onClose}><X size={24} /></button>
          </div>
        </div>
        
        <div className="modal-body">
          {loadingSale ? (
            <div className="text-center py-4">Sipariş bilgileri yükleniyor...</div>
          ) : !sale ? (
            <div className="text-center py-4 text-danger">Sipariş kaydı bulunamadı.</div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Sipariş Kodu</div>
                  <div className="font-bold">{sale.id.split('-')[0]}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Tarih</div>
                  <div className="font-bold">{dayjs(sale.created_at).format('DD.MM.YYYY HH:mm')}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Müşteri ID</div>
                  <div className="font-bold text-primary">{sale.account_id ? 'Kayıtlı Müşteri' : 'Perakende Müşteri'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Ödeme Yöntemi</div>
                  <div className="font-bold">{sale.payment_method}</div>
                </div>
              </div>

              <h4 className="mb-2">Satılan Ürünler (Kalemler)</h4>
              
              {loadingItems ? (
                <div className="text-center py-4">Ürünler yükleniyor...</div>
              ) : (
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Ürün Adı / Kodu</th>
                        <th style={{ textAlign: 'center' }}>Adet</th>
                        <th style={{ textAlign: 'right' }}>Birim Fiyat</th>
                        <th style={{ textAlign: 'right' }}>Toplam</th>
                      </tr>
                    </thead>
                    <tbody>
                      {saleItems?.map(item => {
                        const s = stocksList?.find(st => st.id === item.stock_id) || {};
                        return (
                        <tr key={item.id}>
                          <td>
                            <div className="font-bold">{s.part_name || 'Bilinmeyen Ürün'}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{s.part_code || s.barcode || '-'}</div>
                          </td>
                          <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                          <td style={{ textAlign: 'right' }}>₺{Number(item.unit_price).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
                          <td style={{ textAlign: 'right', fontWeight: 'bold' }}>₺{Number(item.total_price).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
                        </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan="3" style={{ textAlign: 'right', fontWeight: 'bold' }}>Genel Toplam:</td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--color-success)' }}>
                          ₺{Number(sale.total_amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
