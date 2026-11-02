import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Wallet, ArrowUpCircle, ArrowDownCircle, Banknote, CreditCard, Building2, Plus, Trash2, Calendar, Filter, Search } from 'lucide-react';
import dayjs from 'dayjs';
import SaleDetailModal from '../components/SaleDetailModal';

export default function CashRegister() {
  const queryClient = useQueryClient();

  // Tarih ve kanal filtreleri (Varsayılan son 30 gün)
  const [startDate, setStartDate] = useState(dayjs().subtract(30, 'day').format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [methodFilter, setMethodFilter] = useState('Tümü');
  const [directionFilter, setDirectionFilter] = useState('Tümü');
  const [searchTerm, setSearchTerm] = useState('');

  // Manuel Gelir / Gider Form State
  const [entryType, setEntryType] = useState('Çıkış'); // 'Giriş' | 'Çıkış'
  const [entryMethod, setEntryMethod] = useState('Nakit');
  const [entryCategory, setEntryCategory] = useState('Dükkan Gideri / Fatura');
  const [entryAmount, setEntryAmount] = useState('');
  const [entryDescription, setEntryDescription] = useState('');
  const [savingEntry, setSavingEntry] = useState(false);

  const [selectedSalePrefix, setSelectedSalePrefix] = useState(null);

  const expenseCategories = [
    'Dükkan Gideri / Fatura',
    'Kargo / Nakliye',
    'Personel / Yemek',
    'Kira / Aidat',
    'Vergi / Muhasebe',
    'Diğer Gider'
  ];

  const incomeCategories = [
    'Kasa Açılış / Devir',
    'Ek Gelir / Komisyon',
    'Diğer Giriş'
  ];

  const { data: cashData, isLoading, refetch } = useQuery({
    queryKey: ['cash-register-data'],
    staleTime: 0,
    refetchOnMount: 'always',
    queryFn: async () => {
      const [salesRes, txRes, accRes, checksRes] = await Promise.all([
        supabase.from('sales').select('*').order('created_at', { ascending: false }),
        supabase.from('transactions').select('*').order('transaction_date', { ascending: false }),
        supabase.from('accounts').select('id, name, account_type'),
        supabase.from('checks').select('*').in('status', ['Tahsil Edildi', 'Ödendi'])
      ]);

      if (salesRes.error) throw salesRes.error;
      if (txRes.error) throw txRes.error;

      const accountsMap = {};
      (accRes.data || []).forEach(a => {
        accountsMap[a.id] = a;
      });

      const movements = [];

      // 1. POS Peşin Satışlar ve Peşin İadeler
      for (const s of (salesRes.data || [])) {
        const pm = s.payment_method || '';
        // Veresiye satış veya Cari iade kasaya anında para sokmaz/çıkarmaz
        if (pm === 'Cari Hesaba Yaz' || pm === 'İade - Cari Hesaptan Düş') continue;

        const rawAmount = Number(s.total_amount) || 0;
        const isReturn = rawAmount < 0 || pm.startsWith('İade');
        const absAmount = Math.abs(rawAmount);
        if (absAmount <= 0) continue;

        let normalizedMethod = 'Nakit';
        if (pm.includes('Kredi Kartı')) normalizedMethod = 'Kredi Kartı';
        else if (pm.includes('Havale')) normalizedMethod = 'Havale';

        const accName = s.account_id && accountsMap[s.account_id] ? accountsMap[s.account_id].name : 'Perakende Müşteri';

        movements.push({
          id: `sale-${s.id}`,
          rawId: s.id,
          source: 'sale',
          salePrefix: s.id.slice(0, 8),
          date: s.created_at,
          direction: isReturn ? 'Çıkış' : 'Giriş',
          method: normalizedMethod,
          category: isReturn ? 'Ürün İadesi' : 'POS Peşin Satış',
          party: accName,
          description: `${isReturn ? 'İade' : 'Peşin Satış'} (Fiş: ${s.id.slice(0, 8)})`,
          amount: absAmount
        });
      }

      // 2. Cari Tahsilatlar, Tedarikçi Ödemeleri ve Manuel Kasa Hareketleri
      for (const tx of (txRes.data || [])) {
        const desc = (tx.description || '').split(' ||ITEMS:')[0];

        // Veresiye satış, veresiye iade, veresiye mal alımı ve çek cirolama kasadan nakit/banka çıkışı değildir
        if (
          desc.includes('(Veresiye Satış)') ||
          desc.includes('(Veresiye İade)') ||
          desc.startsWith('Ürün Girişi') ||
          desc.startsWith('Ciro:')
        ) {
          continue;
        }

        const acc = tx.account_id ? accountsMap[tx.account_id] : null;

        // Manuel Kasa Giriş / Çıkış kaydı (account_id null veya __KASA__ hesabına bağlı)
        if (!acc || acc.name === '__KASA_HAREKETLERI__') {
          const isIncome = tx.transaction_type === 'Alacak';
          movements.push({
            id: `tx-${tx.id}`,
            rawId: tx.id,
            source: 'manual_tx',
            date: tx.transaction_date || tx.created_at,
            direction: isIncome ? 'Giriş' : 'Çıkış',
            method: tx.payment_method || 'Nakit',
            category: isIncome ? 'Kasa Girişi' : 'Kasa Gideri',
            party: 'Kasa İşlemi',
            description: desc || (isIncome ? 'Manuel Kasa Girişi' : 'Manuel Kasa Çıkışı'),
            amount: Number(tx.amount) || 0
          });
          continue;
        }

        // Müşteri hareketleri: Alacak = Müşteri bize ödeme yaptı (Tahsilat -> Giriş)
        if (acc.account_type === 'Müşteri') {
          if (tx.transaction_type === 'Alacak') {
            // Eğer çek alındıysa ve henüz tahsil edilmediyse kasaya nakit girmez
            if (tx.payment_method === 'Çek') continue;
            movements.push({
              id: `tx-${tx.id}`,
              rawId: tx.id,
              source: 'account_tx',
              date: tx.transaction_date || tx.created_at,
              direction: 'Giriş',
              method: tx.payment_method || 'Nakit',
              category: 'Müşteri Tahsilatı',
              party: acc.name,
              description: desc || 'Cari Tahsilat',
              amount: Number(tx.amount) || 0
            });
          }
        }
        // Tedarikçi hareketleri: Borç = Tedarikçiye ödeme yaptık (Ödeme -> Çıkış)
        else if (acc.account_type === 'Tedarikçi') {
          if (tx.transaction_type === 'Borç') {
            if (tx.payment_method === 'Çek') continue;
            movements.push({
              id: `tx-${tx.id}`,
              rawId: tx.id,
              source: 'account_tx',
              date: tx.transaction_date || tx.created_at,
              direction: 'Çıkış',
              method: tx.payment_method || 'Nakit',
              category: 'Tedarikçi Ödemesi',
              party: acc.name,
              description: desc || 'Toptancıya Ödeme',
              amount: Number(tx.amount) || 0
            });
          }
        }
      }

      // 3. Tahsil Edilen Çekler
      for (const chk of (checksRes.data || [])) {
        if (chk.status === 'Tahsil Edildi') {
          const fromAcc = chk.received_from && accountsMap[chk.received_from] ? accountsMap[chk.received_from].name : (chk.owner_name || 'Müşteri');
          movements.push({
            id: `chk-${chk.id}`,
            rawId: chk.id,
            source: 'check',
            date: chk.due_date || chk.created_at,
            direction: 'Giriş',
            method: 'Havale',
            category: 'Çek Tahsilatı',
            party: fromAcc,
            description: `Çek Tahsilatı: ${chk.bank_name || ''} ${chk.check_number || ''}`,
            amount: Number(chk.amount) || 0
          });
        }
      }

      movements.sort((a, b) => new Date(b.date) - new Date(a.date));
      return movements;
    }
  });

  // Seçilen tarih ve filtrelere göre hareketler
  const filteredMovements = useMemo(() => {
    if (!cashData) return [];
    const start = startDate ? dayjs(startDate).startOf('day') : null;
    const end = endDate ? dayjs(endDate).endOf('day') : null;
    const q = searchTerm.trim().toLowerCase();

    return cashData.filter(m => {
      const mDate = dayjs(m.date);
      if (start && mDate.isBefore(start)) return false;
      if (end && mDate.isAfter(end)) return false;
      if (methodFilter !== 'Tümü' && m.method !== methodFilter) return false;
      if (directionFilter !== 'Tümü' && m.direction !== directionFilter) return false;
      if (q) {
        const hay = `${m.description} ${m.party} ${m.category}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [cashData, startDate, endDate, methodFilter, directionFilter, searchTerm]);

  // Özet İstatistikler (Filtrelenen Dönem İçin)
  const summary = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    let cashNet = 0;
    let cardNet = 0;
    let bankNet = 0;

    for (const m of filteredMovements) {
      const amt = Number(m.amount) || 0;
      if (m.direction === 'Giriş') {
        totalIn += amt;
        if (m.method === 'Nakit') cashNet += amt;
        else if (m.method === 'Kredi Kartı') cardNet += amt;
        else if (m.method === 'Havale') bankNet += amt;
      } else {
        totalOut += amt;
        if (m.method === 'Nakit') cashNet -= amt;
        else if (m.method === 'Kredi Kartı') cardNet -= amt;
        else if (m.method === 'Havale') bankNet -= amt;
      }
    }

    return {
      totalIn,
      totalOut,
      netBalance: totalIn - totalOut,
      cashNet,
      cardNet,
      bankNet
    };
  }, [filteredMovements]);

  const handleAddManualEntry = async (e) => {
    e.preventDefault();
    if (!entryAmount || Number(entryAmount) <= 0) {
      alert('Lütfen geçerli bir tutar girin.');
      return;
    }

    setSavingEntry(true);
    try {
      const txType = entryType === 'Giriş' ? 'Alacak' : 'Borç';
      const fullDesc = `[${entryCategory}] ${entryDescription || (entryType === 'Giriş' ? 'Kasa Girişi' : 'Kasa Gideri')}`;

      const { error } = await supabase.from('transactions').insert([{
        account_id: null,
        transaction_type: txType,
        amount: Number(entryAmount),
        payment_method: entryMethod,
        transaction_date: new Date().toISOString(),
        description: fullDesc
      }]);

      if (error) throw error;

      setEntryAmount('');
      setEntryDescription('');
      await queryClient.invalidateQueries({ queryKey: ['cash-register-data'] });
      refetch();
    } catch (err) {
      console.error('Kasa kaydı hatası:', err);
      alert('Kayıt sırasında hata oluştu: ' + (err.message || err));
    } finally {
      setSavingEntry(false);
    }
  };

  const handleDeleteManualTx = async (rawId) => {
    if (window.confirm('Bu kasa hareketini silmek istediğinize emin misiniz?')) {
      const { error } = await supabase.from('transactions').delete().eq('id', rawId);
      if (!error) {
        refetch();
      }
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-6" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Wallet size={28} className="text-primary" />
            Kasa & Gelir / Gider Yönetimi
          </h2>
          <p className="text-muted" style={{ margin: '0.25rem 0 0 0' }}>
            Peşin satışlar, müşteri tahsilatları, tedarikçi ödemeleri ve dükkan giderlerinizi tek ekrandan takip edin.
          </p>
        </div>

        {/* Hızlı Tarih Kısayolları */}
        <div className="flex gap-2">
          <button 
            type="button" 
            className="btn btn-secondary" 
            style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}
            onClick={() => {
              const today = dayjs().format('YYYY-MM-DD');
              setStartDate(today);
              setEndDate(today);
            }}
          >
            Bugün
          </button>
          <button 
            type="button" 
            className="btn btn-secondary" 
            style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}
            onClick={() => {
              setStartDate(dayjs().subtract(7, 'day').format('YYYY-MM-DD'));
              setEndDate(dayjs().format('YYYY-MM-DD'));
            }}
          >
            Son 7 Gün
          </button>
          <button 
            type="button" 
            className="btn btn-secondary" 
            style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}
            onClick={() => {
              setStartDate(dayjs().subtract(30, 'day').format('YYYY-MM-DD'));
              setEndDate(dayjs().format('YYYY-MM-DD'));
            }}
          >
            Son 30 Gün
          </button>
          <button 
            type="button" 
            className="btn btn-secondary" 
            style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}
            onClick={() => {
              setStartDate('');
              setEndDate('');
            }}
          >
            Tüm Zamanlar
          </button>
        </div>
      </div>

      {/* Üst Özet Kartları */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <div className="glass-panel p-4" style={{ padding: '1.35rem', display: 'flex', alignItems: 'center', gap: '1rem', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
          <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '0.85rem', borderRadius: 'var(--radius-lg)' }}>
            <ArrowDownCircle size={28} color="var(--color-success)" />
          </div>
          <div>
            <p className="form-label" style={{ marginBottom: '0.2rem', fontSize: '0.8rem' }}>Toplam Kasa Girişi</p>
            <h3 style={{ fontSize: '1.45rem', margin: 0, color: 'var(--color-success)' }}>
              ₺{summary.totalIn.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
          </div>
        </div>

        <div className="glass-panel p-4" style={{ padding: '1.35rem', display: 'flex', alignItems: 'center', gap: '1rem', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '0.85rem', borderRadius: 'var(--radius-lg)' }}>
            <ArrowUpCircle size={28} color="var(--color-danger)" />
          </div>
          <div>
            <p className="form-label" style={{ marginBottom: '0.2rem', fontSize: '0.8rem' }}>Toplam Kasa Çıkışı</p>
            <h3 style={{ fontSize: '1.45rem', margin: 0, color: 'var(--color-danger)' }}>
              ₺{summary.totalOut.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
          </div>
        </div>

        <div className="glass-panel p-4" style={{ padding: '1.35rem', display: 'flex', alignItems: 'center', gap: '1rem', border: '1px solid rgba(249, 115, 22, 0.4)' }}>
          <div style={{ background: 'rgba(249, 115, 22, 0.15)', padding: '0.85rem', borderRadius: 'var(--radius-lg)' }}>
            <Wallet size={28} className="text-primary" />
          </div>
          <div>
            <p className="form-label" style={{ marginBottom: '0.2rem', fontSize: '0.8rem' }}>Net Kasa Bakiyesi</p>
            <h3 style={{ fontSize: '1.45rem', margin: 0, color: summary.netBalance >= 0 ? 'var(--color-primary)' : 'var(--color-danger)' }}>
              ₺{summary.netBalance.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
          </div>
        </div>

        <div className="glass-panel p-4" style={{ padding: '1.35rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '0.85rem', borderRadius: 'var(--radius-lg)' }}>
            <Banknote size={28} color="#10b981" />
          </div>
          <div>
            <p className="form-label" style={{ marginBottom: '0.2rem', fontSize: '0.8rem' }}>Nakit Kasa (Net)</p>
            <h3 style={{ fontSize: '1.35rem', margin: 0 }}>
              ₺{summary.cashNet.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
          </div>
        </div>

        <div className="glass-panel p-4" style={{ padding: '1.35rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '0.85rem', borderRadius: 'var(--radius-lg)' }}>
            <CreditCard size={28} color="#3b82f6" />
          </div>
          <div>
            <p className="form-label" style={{ marginBottom: '0.2rem', fontSize: '0.8rem' }}>POS / K.Kartı + Banka</p>
            <h3 style={{ fontSize: '1.35rem', margin: 0, color: '#3b82f6' }}>
              ₺{(summary.cardNet + summary.bankNet).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
          </div>
        </div>
      </div>

      {/* Orta Alan: Manuel Gelir/Gider Ekleme & Filtreler */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        
        {/* Sol: Hızlı Gelir / Gider Girişi */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 className="text-primary mb-4" style={{ fontSize: '1.2rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
            Hızlı Kasa Giriş / Gider Kaydı
          </h3>
          <form onSubmit={handleAddManualEntry}>
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                className={`btn ${entryType === 'Çıkış' ? 'btn-primary' : 'btn-secondary'}`}
                style={{
                  flex: 1,
                  backgroundColor: entryType === 'Çıkış' ? 'var(--color-danger)' : undefined,
                  borderColor: entryType === 'Çıkış' ? 'var(--color-danger)' : undefined
                }}
                onClick={() => {
                  setEntryType('Çıkış');
                  setEntryCategory(expenseCategories[0]);
                }}
              >
                Gider / Para Çıkışı (-)
              </button>
              <button
                type="button"
                className={`btn ${entryType === 'Giriş' ? 'btn-primary' : 'btn-secondary'}`}
                style={{
                  flex: 1,
                  backgroundColor: entryType === 'Giriş' ? 'var(--color-success)' : undefined,
                  borderColor: entryType === 'Giriş' ? 'var(--color-success)' : undefined
                }}
                onClick={() => {
                  setEntryType('Giriş');
                  setEntryCategory(incomeCategories[0]);
                }}
              >
                Gelir / Para Girişi (+)
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Kategori</label>
                <select
                  className="form-input"
                  value={entryCategory}
                  onChange={e => setEntryCategory(e.target.value)}
                >
                  {(entryType === 'Çıkış' ? expenseCategories : incomeCategories).map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Ödeme Kanalı</label>
                <select
                  className="form-input"
                  value={entryMethod}
                  onChange={e => setEntryMethod(e.target.value)}
                >
                  <option value="Nakit">Nakit Kasa</option>
                  <option value="Kredi Kartı">Kredi Kartı</option>
                  <option value="Havale">Banka / Havale</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Tutar (₺) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="form-input"
                  placeholder="0.00"
                  value={entryAmount}
                  onChange={e => setEntryAmount(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Açıklama</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Örn: Elektrik faturası, kargo ücreti..."
                  value={entryDescription}
                  onChange={e => setEntryDescription(e.target.value)}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={savingEntry}>
              <Plus size={18} />
              {savingEntry ? 'Kaydediliyor...' : (entryType === 'Çıkış' ? 'Gideri Kasadan Düş' : 'Geliri Kasaya Ekle')}
            </button>
          </form>
        </div>

        {/* Sağ: Tarih ve Hareket Filtreleri */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 className="text-primary mb-4" style={{ fontSize: '1.2rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Filter size={18} /> Kasa Hareketlerini Filtrele
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Başlangıç Tarihi</label>
                <input
                  type="date"
                  className="form-input"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Bitiş Tarihi</label>
                <input
                  type="date"
                  className="form-input"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Ödeme Kanalı</label>
                <select className="form-input" value={methodFilter} onChange={e => setMethodFilter(e.target.value)}>
                  <option value="Tümü">Tüm Kanallar</option>
                  <option value="Nakit">Sadece Nakit</option>
                  <option value="Kredi Kartı">Sadece Kredi Kartı</option>
                  <option value="Havale">Sadece Banka / Havale</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">İşlem Yönü</label>
                <select className="form-input" value={directionFilter} onChange={e => setDirectionFilter(e.target.value)}>
                  <option value="Tümü">Giriş ve Çıkışlar</option>
                  <option value="Giriş">Sadece Para Girişleri (+)</option>
                  <option value="Çıkış">Sadece Para Çıkışları (-)</option>
                </select>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Arama</label>
              <div style={{ position: 'relative' }}>
                <Search size={18} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '2.5rem' }}
                  placeholder="Açıklama, müşteri/tedarikçi veya kategori ara..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Kasa Hareketleri Tablosu */}
      <h3 className="mb-4" style={{ fontSize: '1.4rem' }}>
        Kasa Hareketleri Dökümü ({filteredMovements.length} İşlem)
      </h3>

      <div className="table-container">
        {isLoading ? (
          <div className="text-center" style={{ padding: '3rem' }}>Kasa hareketleri yükleniyor...</div>
        ) : filteredMovements.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Tür / Kategori</th>
                <th>İlgili Kişi / Cari</th>
                <th>Açıklama</th>
                <th>Kanal</th>
                <th style={{ textAlign: 'right' }}>Giren (+)</th>
                <th style={{ textAlign: 'right' }}>Çıkan (-)</th>
                <th style={{ width: '70px', textAlign: 'center' }}>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {filteredMovements.map(m => (
                <tr
                  key={m.id}
                  onClick={() => {
                    if (m.salePrefix) setSelectedSalePrefix(m.salePrefix);
                  }}
                  style={{ cursor: m.salePrefix ? 'pointer' : 'default' }}
                  title={m.salePrefix ? 'Satış fiş detayını görmek için tıklayın' : undefined}
                >
                  <td>{dayjs(m.date).format('DD.MM.YYYY HH:mm')}</td>
                  <td>
                    <span className={`badge ${m.direction === 'Giriş' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.75rem' }}>
                      {m.category}
                    </span>
                  </td>
                  <td className="font-bold">{m.party}</td>
                  <td>{m.description}</td>
                  <td>
                    <span className="badge" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--color-border)' }}>
                      {m.method}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold', color: m.direction === 'Giriş' ? 'var(--color-success)' : 'inherit' }}>
                    {m.direction === 'Giriş' ? `+₺${Number(m.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}` : '-'}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold', color: m.direction === 'Çıkış' ? 'var(--color-danger)' : 'inherit' }}>
                    {m.direction === 'Çıkış' ? `-₺${Number(m.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}` : '-'}
                  </td>
                  <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                    {m.salePrefix && (
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '0.3rem', borderRadius: 'var(--radius-sm)' }}
                        onClick={() => setSelectedSalePrefix(m.salePrefix)}
                        title="Fiş Detayını Gör"
                      >
                        <Search size={14} className="text-primary" />
                      </button>
                    )}
                    {m.source === 'manual_tx' && (
                      <button
                        className="btn btn-danger"
                        style={{ padding: '0.3rem', borderRadius: 'var(--radius-sm)' }}
                        onClick={() => handleDeleteManualTx(m.rawId)}
                        title="Kaydı Sil"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-center" style={{ padding: '3rem', color: 'var(--color-text-muted)' }}>
            Seçilen tarih ve filtrelere uygun kasa hareketi bulunamadı.
          </div>
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

