import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Clock } from 'lucide-react';

export default function OverdueCustomers() {
  const navigate = useNavigate();

  const { data: customerData, isLoading } = useQuery({
    queryKey: ['overdue-customers'],
    queryFn: async () => {
      // 1. Fetch all customers
      const { data: accounts } = await supabase.from('accounts').select('id, name, default_due_days, risk_limit').eq('account_type', 'Müşteri');
      
      // 2. Fetch all transactions for customers
      const { data: txs } = await supabase.from('transactions')
        .select('account_id, amount, transaction_type, due_date, transaction_date')
        .order('transaction_date', { ascending: true });

      const dueTodayList = [];
      const overdueList = [];
      const today = dayjs().startOf('day');

      for (const account of accounts || []) {
        let totalDebt = 0;
        let totalPaid = 0;
        const debts = [];

        const accTxs = txs?.filter(t => t.account_id === account.id) || [];

        for (const tx of accTxs) {
          if (tx.transaction_type === 'Borç') {
            totalDebt += Number(tx.amount);
            let dd = tx.due_date;
            if (!dd) {
              dd = dayjs(tx.transaction_date).add(account.default_due_days || 0, 'day').format('YYYY-MM-DD');
            }
            debts.push({ amount: Number(tx.amount), due_date: dd });
          } else if (tx.transaction_type === 'Alacak') {
            totalPaid += Number(tx.amount);
          }
        }

        const balance = totalDebt - totalPaid;
        
        if (balance > 0.01) {
          let remainingPaid = totalPaid;
          let maxOverdueDays = -9999;
          let minDueDays = 9999;
          
          for (const debt of debts) {
            if (remainingPaid >= debt.amount) {
              remainingPaid -= debt.amount;
            } else {
              const unpaidAmount = debt.amount - remainingPaid;
              remainingPaid = 0;
              if (unpaidAmount > 0.01) {
                const dueDateObj = dayjs(debt.due_date).startOf('day');
                const diffDays = today.diff(dueDateObj, 'day'); // positive if overdue (past date)
                
                if (diffDays > maxOverdueDays) maxOverdueDays = diffDays;
                if (diffDays < minDueDays && diffDays >= 0) minDueDays = diffDays;
              }
            }
          }

          // Classification
          // If maxOverdueDays >= 15 -> Vadesi Geçenler (Severe)
          // If 0 <= maxOverdueDays < 15 -> Vadesi Gelenler (Due recently)
          
          if (maxOverdueDays >= 15) {
            overdueList.push({ ...account, balance, overdueDays: maxOverdueDays });
          } else if (maxOverdueDays >= 0) {
            dueTodayList.push({ ...account, balance, overdueDays: maxOverdueDays });
          }
        }
      }

      return { dueTodayList, overdueList };
    }
  });

  if (isLoading) return <div>Yükleniyor...</div>;

  const { dueTodayList = [], overdueList = [] } = customerData || {};

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginTop: '2rem' }}>
      
      {/* Vadesi Gelenler */}
      <div className="glass-panel p-4" style={{ border: '1px solid rgba(249, 115, 22, 0.3)' }}>
        <h3 className="mb-4 flex items-center gap-2" style={{ color: 'var(--color-primary)' }}>
          <Clock size={20} /> Vadesi Gelenler (0-14 Gün)
        </h3>
        {dueTodayList.length > 0 ? (
          <table className="data-table" style={{ fontSize: '0.9rem' }}>
            <thead>
              <tr>
                <th>Müşteri</th>
                <th className="right">Bakiye</th>
                <th className="right">Durum</th>
              </tr>
            </thead>
            <tbody>
              {dueTodayList.map(c => (
                <tr key={c.id} onClick={() => navigate(`/portal/cari/${c.id}`)} style={{ cursor: 'pointer' }} className="hover:bg-white/5">
                  <td>{c.name}</td>
                  <td className="right bold">₺{c.balance.toLocaleString()}</td>
                  <td className="right text-primary">{c.overdueDays === 0 ? 'Bugün' : `${c.overdueDays} gün gecikti`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-muted text-center" style={{ padding: '2rem 0' }}>Vadesi gelen ödeme bulunmuyor.</p>
        )}
      </div>

      {/* Vadesi Geçenler */}
      <div className="glass-panel p-4" style={{ border: '1px solid rgba(239, 68, 68, 0.4)' }}>
        <h3 className="mb-4 flex items-center gap-2 text-danger">
          <AlertCircle size={20} /> Vadesi Geçenler (15+ Gün)
        </h3>
        {overdueList.length > 0 ? (
          <table className="data-table" style={{ fontSize: '0.9rem' }}>
            <thead>
              <tr>
                <th>Müşteri</th>
                <th className="right">Bakiye</th>
                <th className="right">Gecikme</th>
              </tr>
            </thead>
            <tbody>
              {overdueList.map(c => (
                <tr key={c.id} onClick={() => navigate(`/portal/cari/${c.id}`)} style={{ cursor: 'pointer' }} className="hover:bg-[rgba(239,68,68,0.1)]">
                  <td>{c.name}</td>
                  <td className="right bold">₺{c.balance.toLocaleString()}</td>
                  <td className="right text-danger font-bold">{c.overdueDays} Gün!</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-muted text-center" style={{ padding: '2rem 0' }}>Vadesi geçmiş ödeme bulunmuyor.</p>
        )}
      </div>

    </div>
  );
}
