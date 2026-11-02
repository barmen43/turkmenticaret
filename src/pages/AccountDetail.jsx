import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { ArrowLeft, BookOpen, Plus, Trash2, Search, Printer, X, Box } from 'lucide-react';
import dayjs from 'dayjs';
import SaleDetailModal from '../components/SaleDetailModal';
import { printCollectionReceipt } from '../lib/printReceipt';

export default function AccountDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [transactionType, setTransactionType] = useState('Borç');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Nakit');
  
  // Check/Note specific fields
  const [checkType, setCheckType] = useState('Müşteri Çeki');
  const [checkNumber, setCheckNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [dueDate, setDueDate] = useState('');
  
  // Ciro (Endorsement) specific
  const [selectedCheckId, setSelectedCheckId] = useState('');

  const [loadingTx, setLoadingTx] = useState(false);
  const [selectedSalePrefix, setSelectedSalePrefix] = useState(null);
  const [selectedPurchaseTx, setSelectedPurchaseTx] = useState(null);

  const { data: stocksList } = useQuery({
    queryKey: ['stocks_for_purchase_detail'],
    queryFn: async () => {
      const { data } = await supabase.from('stocks').select('*');
      return data || [];
    }
  });

  const { data: account, isLoading: loadingAccount } = useQuery({
    queryKey: ['account', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('accounts').select('*').eq('id', id).single();
      if (error) throw error;
      return data;
    }
  });

  const { data: transactions, isLoading: loadingTxs, refetch: refetchTxs } = useQuery({
    queryKey: ['transactions', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('account_id', id)
        .order('transaction_date', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Fetch portfolio checks for Ciro (if Supplier and Payment Method is Çek Cirolama)
  const { data: portfolioChecks } = useQuery({
    queryKey: ['portfolio_checks'],
    queryFn: async () => {
      const { data, error } = await supabase.from('checks').select('*').eq('status', 'Portföyde');
      if (error) throw error;
      return data;
    },
    enabled: account?.account_type === 'Tedarikçi' && paymentMethod === 'Çek Cirolama'
  });

  const balance = transactions ? transactions.reduce((acc, tx) => {
    if (tx.transaction_type === 'Borç') return acc - Number(tx.amount);
    if (tx.transaction_type === 'Alacak') return acc + Number(tx.amount);
    return acc;
  }, 0) : 0;

  const isSupplier = account?.account_type === 'Tedarikçi';

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return alert('Lütfen geçerli bir tutar girin.');

    setLoadingTx(true);
    try {
      const finalTransactionType = isSupplier ? 'Borç' : transactionType;
      const defaultDesc = isSupplier 
        ? `Toptancıya Ödeme (${paymentMethod})` 
        : (transactionType === 'Borç' ? 'Satış / Borçlandırma' : 'Tahsilat / Ödeme');

      // 1. Transaction Ekle
      const { error: txError } = await supabase.from('transactions').insert([{
        account_id: id,
        transaction_type: finalTransactionType,
        amount: Number(amount),
        payment_method: paymentMethod.includes('Çek') ? 'Çek' : paymentMethod,
        transaction_date: new Date().toISOString(),
        due_date: dueDate || null,
        description: description || defaultDesc
      }]);

      if (txError) throw txError;

      // 2. Çek işlemleri varsa checks tablosunu güncelle
      if (paymentMethod === 'Yeni Çek/Senet Alındı') {
        const { error: checkError } = await supabase.from('checks').insert([{
          check_number: checkNumber,
          bank_name: bankName,
          owner_name: ownerName,
          amount: Number(amount),
          due_date: dueDate,
          type: checkType,
          status: 'Portföyde',
          received_from: id
        }]);
        if (checkError) {
          console.error("Çek kaydedilemedi:", checkError);
          alert("İşlem kaydedildi ancak ÇEK kaydedilemedi! Lütfen eksik bilgi girmeyin.");
        }
      } else if (paymentMethod === 'Kendi Çekimiz') {
        await supabase.from('checks').insert([{
          check_number: checkNumber,
          bank_name: bankName,
          owner_name: 'Kendi Firmamız',
          amount: Number(amount),
          due_date: dueDate,
          type: checkType === 'Müşteri Çeki' ? 'Kendi Çekimiz' : (checkType || 'Kendi Çekimiz'),
          status: 'Cirolandı', // Kendi çekimizi verdiğimizde direkt çıkış yapılmış olur
          given_to: id
        }]);
      } else if (paymentMethod === 'Çek Cirolama' && selectedCheckId) {
        await supabase.from('checks').update({
          status: 'Cirolandı',
          given_to: id
        }).eq('id', selectedCheckId);
      }
      
      setAmount('');
      setDescription('');
      setCheckNumber('');
      setBankName('');
      setOwnerName('');
      setDueDate('');
      setSelectedCheckId('');
      
      // Cache invalidation so accounts list & detail update immediately everywhere
      await queryClient.invalidateQueries({ queryKey: ['transactions'] });
      await queryClient.invalidateQueries({ queryKey: ['accounts'] });
      await queryClient.invalidateQueries({ queryKey: ['account', id] });
      refetchTxs();

      alert(isSupplier ? 'Toptancıya ödeme başarıyla kaydedildi.' : 'İşlem başarıyla kaydedildi.');
    } catch (err) {
      console.error(err);
      alert('İşlem kaydedilirken hata oluştu.');
    } finally {
      setLoadingTx(false);
    }
  };

  const handleDeleteTransaction = async (txId) => {
    if (window.confirm('Bu işlemi silmek istediğinize emin misiniz? Bakiye yeniden hesaplanacaktır.')) {
      const { error } = await supabase.from('transactions').delete().eq('id', txId);
      if (!error) {
        await queryClient.invalidateQueries({ queryKey: ['transactions'] });
        await queryClient.invalidateQueries({ queryKey: ['accounts'] });
        await queryClient.invalidateQueries({ queryKey: ['account', id] });
        refetchTxs();
      }
    }
  };

  if (loadingAccount) return <div className="text-center" style={{ padding: '3rem' }}>Yükleniyor...</div>;
  if (!account) return <div className="text-center text-danger">Hesap bulunamadı!</div>;

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate(-1)} className="btn btn-secondary" style={{ padding: '0.5rem' }}>
          <ArrowLeft size={20} />
        </button>
        <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <BookOpen size={28} className="text-primary" />
          {account.name} - Hesap Detayı
        </h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
        {/* Sol Taraf: Hesap Bilgileri */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h3 className="text-primary mb-4" style={{ fontSize: '1.2rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>Hesap Özeti</h3>
          
          <div className="mb-6">
            <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
              {isSupplier ? 'Kalan Toptancı Borcu' : 'Güncel Bakiye'}
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold' }} className={isSupplier ? (balance > 0 ? 'text-danger' : balance < 0 ? 'text-success' : '') : (balance < 0 ? 'text-danger' : balance > 0 ? 'text-success' : '')}>
              {isSupplier ? (
                balance > 0 ? `Borcumuz: ₺${balance.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` :
                balance < 0 ? `Alacağımız: ₺${Math.abs(balance).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` :
                '₺0,00 (Borç Yok)'
              ) : (
                `${balance < 0 ? 'Borçlu: ' : balance > 0 ? 'Alacaklı: ' : ''}₺${Math.abs(balance).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div><strong>Türü:</strong> {account.account_type}</div>
            <div><strong>Yetkili:</strong> {account.contact_name || '-'}</div>
            <div><strong>Telefon:</strong> {account.phone || '-'}</div>
            <div><strong>Vergi Dairesi:</strong> {account.tax_office || '-'}</div>
            <div><strong>VN/TC:</strong> {account.tax_number || '-'}</div>
            <div><strong>Adres:</strong> {account.address || '-'}</div>
          </div>
        </div>

        {/* Sağ Taraf: Yeni İşlem Ekleme / Toptancıya Ödeme */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h3 className="text-primary mb-4" style={{ fontSize: '1.2rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
            {isSupplier ? 'Toptancıya Ödeme Yap' : 'Yeni İşlem (Para Giriş/Çıkışı)'}
          </h3>
          
          {isSupplier && (
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1.25rem', padding: '0.6rem 0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
              ℹ️ Toptancıya yapılan ödeme türünü ve tutarını giriniz. Kaydedilen ödeme toptancı borcundan düşülür.
            </div>
          )}

          <form onSubmit={handleAddTransaction}>
            {!isSupplier && (
              <div className="form-group">
                <label className="form-label">İşlem Yönü</label>
                <div className="flex gap-2">
                  <button 
                    type="button" 
                    className={`btn ${transactionType === 'Alacak' ? 'btn-primary' : 'btn-secondary'}`} 
                    style={{ flex: 1, backgroundColor: transactionType === 'Alacak' ? 'var(--color-success)' : undefined, borderColor: transactionType === 'Alacak' ? 'var(--color-success)' : undefined }}
                    onClick={() => setTransactionType('Alacak')}
                  >
                    Tahsilat (Bize Ödeme Yaptı)
                  </button>
                  <button 
                    type="button" 
                    className={`btn ${transactionType === 'Borç' ? 'btn-primary' : 'btn-secondary'}`} 
                    style={{ flex: 1, backgroundColor: transactionType === 'Borç' ? 'var(--color-danger)' : undefined, borderColor: transactionType === 'Borç' ? 'var(--color-danger)' : undefined }}
                    onClick={() => setTransactionType('Borç')}
                  >
                    Satış (Bize Borçlandı)
                  </button>
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">
                {isSupplier ? 'Ödeme Türü / Tipi *' : 'Ödeme / İşlem Türü'}
              </label>
              <select 
                value={paymentMethod} 
                onChange={e => {
                  const val = e.target.value;
                  setPaymentMethod(val);
                  if (val === 'Kendi Çekimiz') setCheckType('Kendi Çekimiz');
                  if (val !== 'Çek Cirolama') setAmount('');
                }} 
                className="form-input"
              >
                {isSupplier ? (
                  <>
                    <option value="Nakit">Nakit Ödeme</option>
                    <option value="Havale">Banka / Havale / EFT</option>
                    <option value="Kredi Kartı">Kredi Kartı ile Ödeme</option>
                    <option value="Çek Cirolama">Cüzdandan Çek/Senet Cirola (Ödeme)</option>
                    <option value="Kendi Çekimiz">Kendi Çek/Senedimizi Ver (Ödeme)</option>
                  </>
                ) : (
                  <>
                    <option value="Nakit">Nakit / Cari İşlem</option>
                    <option value="Havale">Havale / EFT</option>
                    <option value="Kredi Kartı">Kredi Kartı</option>
                    <option value="Yeni Çek/Senet Alındı">Yeni Çek/Senet Alındı</option>
                  </>
                )}
              </select>
            </div>

            {paymentMethod === 'Çek Cirolama' && (
              <div className="form-group">
                <label className="form-label">Portföydeki Çeki Seçin</label>
                <select value={selectedCheckId} onChange={e => {
                  setSelectedCheckId(e.target.value);
                  const chk = portfolioChecks?.find(c => c.id === e.target.value);
                  if (chk) {
                    setAmount(chk.amount);
                    setDescription(`Ciro: ${chk.bank_name || ''} ${chk.check_number || ''}`);
                    setDueDate(chk.due_date);
                  }
                }} className="form-input" required>
                  <option value="">-- Çek Seçiniz --</option>
                  {portfolioChecks?.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.type} - {c.bank_name} ({dayjs(c.due_date).format('DD.MM.YY')}) - ₺{Number(c.amount).toLocaleString('tr-TR')}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {(paymentMethod === 'Yeni Çek/Senet Alındı' || paymentMethod === 'Kendi Çekimiz') && (
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', border: '1px solid var(--color-border)' }}>
                <div className="form-group">
                  <label className="form-label">Evrak Tipi</label>
                  <select value={checkType} onChange={e => setCheckType(e.target.value)} className="form-input">
                    {paymentMethod === 'Kendi Çekimiz' ? (
                      <>
                        <option value="Kendi Çekimiz">Kendi Çekimiz</option>
                        <option value="Kendi Senedimiz">Kendi Senedimiz</option>
                      </>
                    ) : (
                      <>
                        <option value="Müşteri Çeki">Müşteri Çeki</option>
                        <option value="Müşteri Senedi">Müşteri Senedi</option>
                      </>
                    )}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Vade Tarihi *</label>
                  <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="form-input" required />
                </div>
                <div className="flex gap-2">
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Banka Adı</label>
                    <input type="text" value={bankName} onChange={e => setBankName(e.target.value)} className="form-input" placeholder="Örn: Garanti" />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Evrak/Çek No</label>
                    <input type="text" value={checkNumber} onChange={e => setCheckNumber(e.target.value)} className="form-input" />
                  </div>
                </div>
                {paymentMethod !== 'Kendi Çekimiz' && (
                  <div className="form-group">
                    <label className="form-label">Keşideci (Asıl Borçlu)</label>
                    <input type="text" value={ownerName} onChange={e => setOwnerName(e.target.value)} className="form-input" placeholder="Müşterinin kendisi ise boş bırakabilirsiniz" />
                  </div>
                )}
              </div>
            )}

            <div className="form-group mt-2">
              <label className="form-label">
                {isSupplier ? 'Ödenen Tutar (₺) *' : 'Tutar (₺) *'}
              </label>
              <input 
                type="number" 
                step="0.01" 
                value={amount} 
                onChange={e => setAmount(e.target.value)} 
                className="form-input" 
                required 
                placeholder="0.00" 
                readOnly={paymentMethod === 'Çek Cirolama'}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Açıklama</label>
              <input 
                type="text" 
                value={description} 
                onChange={e => setDescription(e.target.value)} 
                className="form-input" 
                placeholder={isSupplier ? 'Örn: Cari hesaba mahsuben ödeme, dekont no...' : (transactionType === 'Borç' ? 'Fatura no, alınan mal...' : 'Nakit, Havale...')} 
              />
            </div>

            <button type="submit" className="btn btn-primary mt-4" style={{ width: '100%' }} disabled={loadingTx || (paymentMethod === 'Çek Cirolama' && !selectedCheckId)}>
              <Plus size={18} />
              {loadingTx ? 'Kaydediliyor...' : (isSupplier ? 'Ödemeyi Kaydet' : 'İşlemi Kaydet')}
            </button>
          </form>
        </div>
      </div>

      {/* Hesap Hareketleri Tablosu */}
      <h3 className="mb-4" style={{ fontSize: '1.4rem' }}>Hesap Hareketleri Dökümü</h3>
      <div className="table-container">
        {loadingTxs ? (
          <div className="text-center" style={{ padding: '2rem' }}>Hareketler yükleniyor...</div>
        ) : transactions && transactions.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Açıklama</th>
                <th style={{ textAlign: 'right' }}>{isSupplier ? 'Yapılan Ödeme (Çıkan)' : 'Borç (Çıkan)'}</th>
                <th style={{ textAlign: 'right' }}>{isSupplier ? 'Mal Alımı / Fatura' : 'Alacak (Giren)'}</th>
                <th className="sticky-right" style={{ width: '80px', textAlign: 'center', backgroundColor: '#181e25' }}>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map(tx => {
                const cleanDesc = (tx.description || '').split(' ||ITEMS:')[0];
                const isSaleOrReturn = cleanDesc.includes('Sipariş: ') || cleanDesc.includes('İade: ');
                const isPurchase = cleanDesc.startsWith('Ürün Girişi');
                const isClickable = isSaleOrReturn || isPurchase;

                const handleRowClick = () => {
                  if (isSaleOrReturn) {
                    const match = cleanDesc.match(/(?:Sipariş|İade):\s([a-f0-9\-]{8})/);
                    if (match) setSelectedSalePrefix(match[1]);
                  } else if (isPurchase) {
                    setSelectedPurchaseTx(tx);
                  }
                };

                return (
                <tr 
                  key={tx.id} 
                  onClick={isClickable ? handleRowClick : undefined}
                  style={{ cursor: isClickable ? 'pointer' : 'default' }}
                  title={isClickable ? 'Detayları görmek için tıklayın' : undefined}
                >
                  <td>{dayjs(tx.transaction_date).format('DD.MM.YYYY')}</td>
                  <td>
                    <span style={{ textDecoration: isClickable ? 'underline' : 'none', textDecorationStyle: 'dotted', textUnderlineOffset: '4px' }}>
                      {cleanDesc}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', color: tx.transaction_type === 'Borç' ? 'var(--color-danger)' : 'inherit' }}>
                    {tx.transaction_type === 'Borç' ? `₺${Number(tx.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}` : '-'}
                  </td>
                  <td style={{ textAlign: 'right', color: tx.transaction_type === 'Alacak' ? 'var(--color-success)' : 'inherit' }}>
                    {tx.transaction_type === 'Alacak' ? `₺${Number(tx.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}` : '-'}
                  </td>
                  <td className="sticky-right" style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-2">
                      {isClickable && (
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '0.3rem', borderRadius: 'var(--radius-sm)' }} 
                          onClick={handleRowClick} 
                          title="Fiş / İşlem Detayını Gör"
                        >
                          <Search size={14} className="text-primary" />
                        </button>
                      )}
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '0.3rem', borderRadius: 'var(--radius-sm)' }} 
                        onClick={() => printCollectionReceipt(tx, account, balance)} 
                        title="Makbuz Yazdır"
                      >
                        <Printer size={14} className="text-primary" />
                      </button>
                      <button className="btn btn-danger" style={{ padding: '0.3rem', borderRadius: 'var(--radius-sm)' }} onClick={() => handleDeleteTransaction(tx.id)} title="Sil">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="text-center" style={{ padding: '3rem', color: 'var(--color-text-muted)' }}>Henüz hiçbir hesap hareketi yok.</div>
        )}
      </div>

      {selectedSalePrefix && (
        <SaleDetailModal 
          saleIdPrefix={selectedSalePrefix} 
          onClose={() => setSelectedSalePrefix(null)} 
        />
      )}

      {selectedPurchaseTx && (() => {
        const desc = selectedPurchaseTx.description || '';
        const parts = desc.split(' ||ITEMS:');
        let items = [];
        if (parts[1]) {
          try {
            items = JSON.parse(parts[1]);
          } catch (e) {
            console.error(e);
          }
        } else {
          const afterColon = parts[0].split(':')[1] || '';
          const codes = afterColon.split(',').map(s => s.trim()).filter(Boolean);
          items = codes.map(codeOrSummary => {
            const cleanCode = codeOrSummary.replace(/\s*\(\d+\s*Adet\)$/i, '').trim();
            const found = stocksList?.find(st => 
              st.part_code?.toLowerCase() === cleanCode.toLowerCase() || 
              st.part_name?.toLowerCase() === cleanCode.toLowerCase()
            );
            if (found) {
              return {
                part_code: found.part_code,
                part_name: found.part_name,
                quantity: codes.length === 1 && found.quantity ? found.quantity : '-',
                buying_price: found.buying_price || (codes.length === 1 && found.quantity ? (Number(selectedPurchaseTx.amount) / 1.2) / found.quantity : 0),
                discount: 0,
                kdv_rate: 20,
                total: codes.length === 1 ? Number(selectedPurchaseTx.amount) : null
              };
            }
            return {
              part_code: cleanCode,
              part_name: cleanCode,
              quantity: '-',
              buying_price: 0,
              discount: 0,
              kdv_rate: 0,
              total: null
            };
          });
        }

        return (
          <div className="modal-overlay" onClick={() => setSelectedPurchaseTx(null)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '650px' }}>
              <div className="modal-header flex justify-between items-center">
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Box className="text-primary" /> Alınan Ürünler / Fatura Detayı
                </h3>
                <button className="modal-close" onClick={() => setSelectedPurchaseTx(null)}>
                  <X size={24} />
                </button>
              </div>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Tedarikçi</div>
                    <div className="font-bold text-primary">{account.name}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>İşlem Tarihi</div>
                    <div className="font-bold">{dayjs(selectedPurchaseTx.transaction_date).format('DD.MM.YYYY')}</div>
                  </div>
                </div>

                <h4 className="mb-2">Alınan Kalemler</h4>
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Ürün Adı / Kodu</th>
                        <th style={{ textAlign: 'center' }}>Miktar</th>
                        <th style={{ textAlign: 'right' }}>Birim Alış</th>
                        <th style={{ textAlign: 'center' }}>İsk. / KDV</th>
                        <th style={{ textAlign: 'right' }}>Toplam</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => (
                        <tr key={idx}>
                          <td>
                            <div className="font-bold">{item.part_name}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Kod: {item.part_code || '-'}</div>
                          </td>
                          <td style={{ textAlign: 'center' }}>{item.quantity !== '-' ? `${item.quantity} Adet` : '-'}</td>
                          <td style={{ textAlign: 'right' }}>
                            {item.buying_price ? `₺${Number(item.buying_price).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}` : '-'}
                          </td>
                          <td style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                            {item.total !== null ? `%${item.discount || 0} / %${item.kdv_rate || 0}` : '-'}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                            {item.total !== null 
                              ? `₺${Number(item.total).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}` 
                              : (items.length === 1 ? `₺${Number(selectedPurchaseTx.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}` : '-')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'right', fontWeight: 'bold' }}>Fatura / İşlem Toplamı:</td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--color-success)' }}>
                          ₺{Number(selectedPurchaseTx.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
