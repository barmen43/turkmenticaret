-- İşlem görmüş stokların tamamen silinmek yerine arşivlenmesini (pasife alınmasını) sağlayan sütun eklentisi.
-- Lütfen bu kodu Supabase panosundaki SQL Editor kısmına yapıştırıp RUN (Çalıştır) butonuna basın.

ALTER TABLE public.stocks ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true NOT NULL;
