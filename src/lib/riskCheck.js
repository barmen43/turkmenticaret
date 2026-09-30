import { supabase } from './supabase';
import dayjs from 'dayjs';

export async function checkCustomerRisk(customerId, newSaleAmount = 0) {
  // 1. Get customer info
  const { data: account, error: accError } = await supabase
    .from('accounts')
    .select('risk_limit, default_due_days')
    .eq('id', customerId)
    .single();

  if (accError) throw accError;

  // 2. Get transactions
  const { data: txs, error: txError } = await supabase
    .from('transactions')
    .select('amount, transaction_type, due_date, transaction_date')
    .eq('account_id', customerId)
    .order('transaction_date', { ascending: true });

  if (txError) throw txError;

  let totalDebt = 0;
  let totalPaid = 0;
  const debts = [];

  for (const tx of txs || []) {
    if (tx.transaction_type === 'Borç') {
      totalDebt += Number(tx.amount);
      // Calculate due_date if not present (using default_due_days from account)
      let dd = tx.due_date;
      if (!dd) {
        dd = dayjs(tx.transaction_date).add(account.default_due_days || 0, 'day').format('YYYY-MM-DD');
      }
      debts.push({
        amount: Number(tx.amount),
        due_date: dd
      });
    } else if (tx.transaction_type === 'Alacak') {
      totalPaid += Number(tx.amount);
    }
  }

  const currentBalance = totalDebt - totalPaid;
  const newBalance = currentBalance + newSaleAmount;
  
  const riskLimit = Number(account.risk_limit || 0);
  const exceedsLimit = riskLimit > 0 && newBalance > riskLimit;

  // FIFO check for overdue
  let remainingPaid = totalPaid;
  let hasOverdue = false;
  let maxOverdueDays = 0;
  const today = dayjs().startOf('day');

  for (const debt of debts) {
    if (remainingPaid >= debt.amount) {
      remainingPaid -= debt.amount;
    } else {
      // This debt is partially or fully unpaid
      const unpaidAmount = debt.amount - remainingPaid;
      remainingPaid = 0; // Exhausted

      if (unpaidAmount > 0.01) {
        const dueDateObj = dayjs(debt.due_date).startOf('day');
        const diffDays = today.diff(dueDateObj, 'day');
        
        if (diffDays >= 15) {
          hasOverdue = true;
          if (diffDays > maxOverdueDays) maxOverdueDays = diffDays;
        }
      }
    }
  }

  return {
    exceedsLimit,
    isOverdue: hasOverdue,
    limit: riskLimit,
    balance: currentBalance,
    newBalance,
    maxOverdueDays
  };
}
