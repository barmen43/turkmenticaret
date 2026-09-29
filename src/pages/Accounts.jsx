import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Search, Plus, Edit, Trash2, BookOpen, Users, Truck } from 'lucide-react';

export default function Accounts() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  // Determine the account type based on the URL path
  const isCustomers = location.pathname.includes('musteriler');
  const accountType = isCustomers ? 'Müşteri' : 'Tedarikçi';
  const title = isCustomers ? 'Müşteriler (Cari)' : 'Tedarikçiler';
  const Icon = isCustomers ? Users : Truck;

  const { data: accounts, isLoading, isError, refetch } = useQuery({
    queryKey: ['accounts', accountType, searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('accounts')
        .select('*')
        .eq('account_type', accountType)
        .order('name', { ascending: true });

      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,contact_name.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Calculate balances (ideally this is done via a SQL View or RPC for performance, but we'll do it here for now)
      // For each account, fetch sum of transactions
      const accountsWithBalance = await Promise.all(data.map(async (acc) => {
        const { data: txData } = await supabase
          .from('transactions')
          .select('amount, transaction_type')
          .eq('account_id', acc.id);
        
        let balance = 0;
        if (txData) {
          txData.forEach(tx => {
            if (tx.transaction_type === 'Borç') balance -= Number(tx.amount);
            if (tx.transaction_type === 'Alacak') balance += Number(tx.amount);
          });
        }
        return { ...acc, balance };
      }));

      return accountsWithBalance;
    }
  });

  const handleDelete = async (id, name) => {
    if (window.confirm(`${name} isimli kaydı silmek istediğinize emin misiniz? (Tüm hareketler de silinir!)`)) {
      await supabase.from('accounts').delete().eq('id', id);
      refetch();
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 style={{ fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Icon size={28} className="text-primary" />
          {title}
        </h2>
        <button 
          className="btn btn-primary" 
          onClick={() => navigate(`/portal/cari-ekle?type=${isCustomers ? 'musteri' : 'tedarikci'}`)}
        >
          <Plus size={18} />
          <span className="hide-on-mobile">Yeni {isCustomers ? 'Müşteri' : 'Tedarikçi'} Ekle</span>
        </button>
      </div>

      <div className="glass-panel mb-6" style={{ padding: '1.5rem' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} size={20} />
          <input 
            type="text" 
            className="form-input" 
            style={{ paddingLeft: '2.75rem' }}
            placeholder="İsim, yetkili veya telefon ile ara..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="table-container">
        {isLoading ? (
          <div className="text-center" style={{ padding: '3rem' }}>Yükleniyor...</div>
        ) : isError ? (
          <div className="text-center text-danger" style={{ padding: '3rem' }}>Veriler alınırken hata oluştu.</div>
        ) : accounts && accounts.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Cari Unvanı</th>
                <th className="hide-on-mobile">Yetkili / Telefon</th>
                <th style={{ textAlign: 'right' }}>Bakiye</th>
                <th style={{ textAlign: 'right' }}>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map(acc => (
                <tr key={acc.id} onClick={() => navigate(`/portal/cari-detay/${acc.id}`)} style={{ cursor: 'pointer' }}>
                  <td>
                    <div className="font-bold text-primary">{acc.name}</div>
                    {acc.tax_number && <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>VN: {acc.tax_number}</div>}
                  </td>
                  <td className="hide-on-mobile">
                    <div>{acc.contact_name || '-'}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{acc.phone || '-'}</div>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                    <span className={acc.balance < 0 ? 'text-danger' : acc.balance > 0 ? 'text-success' : ''}>
                      {acc.balance < 0 ? 'Borçlu: ' : acc.balance > 0 ? 'Alacaklı: ' : ''}
                      ₺{Math.abs(acc.balance).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-2">
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)' }}
                        onClick={() => navigate(`/portal/cari-detay/${acc.id}`)}
                        title="Hesap Detayı"
                      >
                        <BookOpen size={16} color="var(--color-primary)" />
                      </button>
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)' }}
                        onClick={() => navigate(`/portal/cari-duzenle/${acc.id}`)}
                        title="Düzenle"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        className="btn btn-danger" 
                        style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)' }}
                        onClick={() => handleDelete(acc.id, acc.name)}
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
            Kayıt bulunamadı.
          </div>
        )}
      </div>
    </div>
  );
}
