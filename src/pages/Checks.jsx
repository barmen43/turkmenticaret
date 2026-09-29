import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { CreditCard, Search, Trash2, CheckCircle, Eye } from 'lucide-react';
import dayjs from 'dayjs';
import CheckDetailModal from '../components/CheckDetailModal';

export default function Checks() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Portföyde'); // 'Portföyde', 'Cirolandı', 'Tümü'
  const [selectedCheck, setSelectedCheck] = useState(null);

  const { data: checks, isLoading, refetch } = useQuery({
    queryKey: ['checks', statusFilter, searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('checks')
        .select('*')
        .order('due_date', { ascending: true });

      if (statusFilter !== 'Tümü') {
        query = query.eq('status', statusFilter);
      }

      const { data: checksData, error } = await query;
      if (error) throw error;

      // Fetch accounts to map names manually to avoid foreign key naming issues
      const { data: accountsData } = await supabase.from('accounts').select('id, name');
      
      const mappedData = checksData.map(check => ({
        ...check,
        received_from: { name: accountsData?.find(a => a.id === check.received_from)?.name },
        given_to: { name: accountsData?.find(a => a.id === check.given_to)?.name }
      }));
      
      // Client-side search for simplicity
      if (searchTerm) {
        const lowerSearch = searchTerm.toLowerCase();
        return mappedData.filter(c => 
          (c.check_number && c.check_number.toLowerCase().includes(lowerSearch)) ||
          (c.bank_name && c.bank_name.toLowerCase().includes(lowerSearch)) ||
          (c.owner_name && c.owner_name.toLowerCase().includes(lowerSearch))
        );
      }
      return mappedData;
    }
  });

  const handleMarkAsCashed = async (id, amount, received_from_id) => {
    if (window.confirm('Bu çeki TAHSİL EDİLDİ (parası bankaya/kasaya girdi) olarak işaretlemek istiyor musunuz?')) {
      const { error } = await supabase.from('checks').update({ status: 'Tahsil Edildi' }).eq('id', id);
      if (!error) refetch();
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bu evrak kaydını tamamen silmek istediğinize emin misiniz? (Cari hareketler etkilenmez, manuel düzeltmeniz gerekebilir)')) {
      const { error } = await supabase.from('checks').delete().eq('id', id);
      if (!error) refetch();
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h2 style={{ fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CreditCard size={28} className="text-primary" />
          Çek ve Senet Portföyü
        </h2>
      </div>

      <div className="glass-panel mb-6 flex gap-4" style={{ padding: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
          <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} size={20} />
          <input 
            type="text" 
            className="form-input" 
            style={{ paddingLeft: '2.75rem' }}
            placeholder="Çek no, banka veya keşideci ara..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select 
          className="form-input" 
          style={{ width: '200px' }}
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="Portföyde">Sadece Cüzdandakiler</option>
          <option value="Cirolandı">Cirolananlar</option>
          <option value="Tahsil Edildi">Tahsil Edilenler</option>
          <option value="Tümü">Tümünü Göster</option>
        </select>
      </div>

      <div className="table-container">
        {isLoading ? (
          <div className="text-center" style={{ padding: '3rem' }}>Yükleniyor...</div>
        ) : checks && checks.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Evrak Türü / No</th>
                <th>Banka / Keşideci</th>
                <th>Kimden Alındı?</th>
                <th>Kime Verildi?</th>
                <th>Vade Tarihi</th>
                <th style={{ textAlign: 'right' }}>Tutar</th>
                <th>Durum</th>
                <th>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {checks.map(check => {
                const isOverdue = dayjs().isAfter(dayjs(check.due_date), 'day') && check.status === 'Portföyde';
                return (
                  <tr 
                    key={check.id} 
                    style={{ backgroundColor: isOverdue ? 'rgba(239, 68, 68, 0.05)' : 'transparent', cursor: 'pointer' }}
                    onClick={() => setSelectedCheck(check)}
                  >
                    <td>
                      <div className="font-bold">{check.type}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{check.check_number || '-'}</div>
                    </td>
                    <td>
                      <div>{check.bank_name || '-'}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{check.owner_name || '-'}</div>
                    </td>
                    <td>{check.received_from?.name || '-'}</td>
                    <td>{check.given_to?.name || '-'}</td>
                    <td>
                      <div style={{ color: isOverdue ? 'var(--color-danger)' : 'inherit', fontWeight: isOverdue ? 'bold' : 'normal' }}>
                        {dayjs(check.due_date).format('DD.MM.YYYY')}
                      </div>
                      {isOverdue && <div style={{ fontSize: '0.7rem', color: 'var(--color-danger)' }}>Gecikmiş</div>}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                      ₺{Number(check.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </td>
                    <td>
                      <span className={`badge ${check.status === 'Portföyde' ? 'badge-warning' : check.status === 'Tahsil Edildi' || check.status === 'Ödendi' ? 'badge-success' : 'badge-secondary'}`} style={{ border: '1px solid var(--color-border)' }}>
                        {check.status}
                      </span>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-2">
                        <button className="btn btn-secondary" style={{ padding: '0.3rem', borderRadius: 'var(--radius-sm)' }} onClick={() => setSelectedCheck(check)} title="Detay Görüntüle">
                          <Eye size={14} />
                        </button>
                        {check.status === 'Portföyde' && (
                          <button className="btn btn-secondary" style={{ padding: '0.3rem', borderRadius: 'var(--radius-sm)' }} onClick={() => handleMarkAsCashed(check.id)} title="Tahsil Edildi İşaretle">
                            <CheckCircle size={14} className="text-success" />
                          </button>
                        )}
                        <button className="btn btn-danger" style={{ padding: '0.3rem', borderRadius: 'var(--radius-sm)' }} onClick={() => handleDelete(check.id)} title="Kaydı Sil">
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
          <div className="text-center" style={{ padding: '4rem', color: 'var(--color-text-muted)' }}>
            Bu filtreye uygun çek/senet bulunamadı.
          </div>
        )}
      </div>

      {selectedCheck && (
        <CheckDetailModal check={selectedCheck} onClose={() => setSelectedCheck(null)} />
      )}
    </div>
  );
}
