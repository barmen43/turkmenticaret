import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { ArrowLeft, BookOpen, Plus, Trash2, Search } from 'lucide-react';
import dayjs from 'dayjs';
import SaleDetailModal from '../components/SaleDetailModal';

export default function AccountDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

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

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return alert('Lütfen geçerli bir tutar girin.');

    setLoadingTx(true);
    try {
      // 1. Transaction Ekle
      const { error: txError } = await supabase.from('transactions').insert([{
        account_id: id,
        transaction_type: transactionType,
        amount: Number(amount),
        payment_method: paymentMethod.includes('Çek') ? 'Çek' : paymentMethod,
        due_date: dueDate || null,
        description: description || (transactionType === 'Borç' ? 'Satış / Borçlandırma' : 'Tahsilat / Ödeme')
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
          type: checkType === 'Müşteri Çeki' ? 'Kendi Çekimiz' : 'Kendi Senedimiz',
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
      refetchTxs();
      alert('İşlem başarıyla kaydedildi.');
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
      if (!error) refetchTxs();
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
            <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Güncel Bakiye</div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold' }} className={balance < 0 ? 'text-danger' : balance > 0 ? 'text-success' : ''}>
              {balance < 0 ? 'Borçlu: ' : balance > 0 ? 'Alacaklı: ' : ''}
              ₺{Math.abs(balance).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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

        {/* Sağ Taraf: Yeni İşlem Ekleme */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h3 className="text-primary mb-4" style={{ fontSize: '1.2rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>Yeni İşlem (Para Giriş/Çıkışı)</h3>
          
          <form onSubmit={handleAddTransaction}>
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

            <div className="form-group">
              <label className="form-label">Ödeme / İşlem Türü</label>
              <select value={paymentMethod} onChange={e => {
                setPaymentMethod(e.target.value);
                // Çek cirolama seçilirse amount alanını readonly yapmak için
                if (e.target.value !== 'Çek Cirolama') setAmount('');
              }} className="form-input">
                <option value="Nakit">Nakit / Cari İşlem</option>
                <option value="Havale">Havale / EFT</option>
                <option value="Kredi Kartı">Kredi Kartı</option>
                {account.account_type === 'Müşteri' && (
                  <option value="Yeni Çek/Senet Alındı">Yeni Çek/Senet Alındı</option>
                )}
                {account.account_type === 'Tedarikçi' && (
                  <option value="Çek Cirolama">Cüzdandan Çek/Senet Cirola (Ödeme)</option>
                )}
                {account.account_type === 'Tedarikçi' && (
                  <option value="Kendi Çekimiz">Kendi Çek/Senedimizi Verdik (Ödeme)</option>
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
              <label className="form-label">Tutar (₺) *</label>
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
              <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="form-input" placeholder={transactionType === 'Borç' ? 'Fatura no, alınan mal...' : 'Nakit, Havale...'} />
            </div>

            <button type="submit" className="btn btn-primary mt-4" style={{ width: '100%' }} disabled={loadingTx || (paymentMethod === 'Çek Cirolama' && !selectedCheckId)}>
              <Plus size={18} />
              {loadingTx ? 'Kaydediliyor...' : 'İşlemi Kaydet'}
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
                <th style={{ textAlign: 'right' }}>Borç (Çıkan)</th>
                <th style={{ textAlign: 'right' }}>Alacak (Giren)</th>
                <th className="sticky-right" style={{ width: '80px', textAlign: 'center', backgroundColor: '#181e25' }}>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map(tx => (
                <tr key={tx.id}>
                  <td>{dayjs(tx.transaction_date).format('DD.MM.YYYY')}</td>
                  <td>{tx.description}</td>
                  <td style={{ textAlign: 'right', color: tx.transaction_type === 'Borç' ? 'var(--color-danger)' : 'inherit' }}>
                    {tx.transaction_type === 'Borç' ? `₺${Number(tx.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}` : '-'}
                  </td>
                  <td style={{ textAlign: 'right', color: tx.transaction_type === 'Alacak' ? 'var(--color-success)' : 'inherit' }}>
                    {tx.transaction_type === 'Alacak' ? `₺${Number(tx.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}` : '-'}
                  </td>
                  <td className="sticky-right" style={{ textAlign: 'right' }}>
                    <div className="flex justify-end gap-2">
                      {tx.description && tx.description.includes('Sipariş: ') && (
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '0.3rem', borderRadius: 'var(--radius-sm)' }} 
                          onClick={() => setSelectedSalePrefix(tx.description.match(/Sipariş: ([a-f0-9\-]{8})/)?.[1])} 
                          title="Fiş / Satış Detayını Gör"
                        >
                          <Search size={14} className="text-primary" />
                        </button>
                      )}
                      <button className="btn btn-danger" style={{ padding: '0.3rem', borderRadius: 'var(--radius-sm)' }} onClick={() => handleDeleteTransaction(tx.id)} title="Sil">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
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
    </div>
  );
}
