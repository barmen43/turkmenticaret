-- Supabase SQL Editor'a yapıştırıp çalıştırın:
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS risk_limit numeric DEFAULT 0;
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS default_due_days integer DEFAULT 0;
