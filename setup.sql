-- Yedek Parça Stok Takip Uygulaması - Supabase Veritabanı Kurulum Dosyası
-- Lütfen bu dosyayı Supabase panosunda SQL Editor kısmına yapıştırıp RUN (Çalıştır) butonuna basın.

-- 1. Stok tablosunu oluştur
CREATE TABLE IF NOT EXISTS public.stocks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    part_code TEXT NOT NULL,
    part_name TEXT NOT NULL,
    description TEXT,
    quantity INTEGER DEFAULT 0 NOT NULL,
    price NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
    category TEXT,
    shelf_location TEXT,
    supplier TEXT,
    min_stock_warning INTEGER DEFAULT 5 NOT NULL,
    barcode TEXT,
    part_type TEXT DEFAULT 'Orijinal' CHECK (part_type IN ('Orijinal', 'Muadil')),
    parent_part_id UUID REFERENCES public.stocks(id), -- Muadil parçaları orijinal parçaya bağlamak için
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Gelişmiş arama için indeksler (Hızlı arama performansı için)
-- pg_trgm (Trigram) extension'ını aktif edelim, bulanık arama (fuzzy search) için çok faydalıdır
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX idx_stocks_part_code ON public.stocks USING gin (part_code gin_trgm_ops);
CREATE INDEX idx_stocks_part_name ON public.stocks USING gin (part_name gin_trgm_ops);
CREATE INDEX idx_stocks_shelf_location ON public.stocks(shelf_location);
CREATE INDEX idx_stocks_barcode ON public.stocks(barcode);

-- 3. Row Level Security (RLS) Ayarları
-- Bu ayarlar, sadece sisteme giriş yapmış kullanıcıların veri okuyup yazabilmesini sağlar.
ALTER TABLE public.stocks ENABLE ROW LEVEL SECURITY;

-- Okuma (Read) yetkisi (Sadece giriş yapmış kullanıcılar okuyabilir)
CREATE POLICY "Enable read access for authenticated users only"
ON public.stocks FOR SELECT
TO authenticated
USING (true);

-- Ekleme (Insert) yetkisi
CREATE POLICY "Enable insert access for authenticated users only"
ON public.stocks FOR INSERT
TO authenticated
WITH CHECK (true);

-- Güncelleme (Update) yetkisi
CREATE POLICY "Enable update access for authenticated users only"
ON public.stocks FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Silme (Delete) yetkisi
CREATE POLICY "Enable delete access for authenticated users only"
ON public.stocks FOR DELETE
TO authenticated
USING (true);

-- Storage (Resim yüklemek istenirse diye stocks bucket'ı oluşturalım, şimdilik public yapalım)
INSERT INTO storage.buckets (id, name, public) VALUES ('parts', 'parts', true) ON CONFLICT DO NOTHING;

CREATE POLICY "Give users authenticated access to folder 1qaz2wsx" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'parts');
CREATE POLICY "Give users authenticated access to folder 2wsx3edc" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'parts');
CREATE POLICY "Give users authenticated access to folder 3edc4rfv" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'parts');
CREATE POLICY "Give users public access to folder 4rfv5tgb" ON storage.objects FOR SELECT TO public USING (bucket_id = 'parts');

-- 4. Kategoriler Tablosu (Dropdown ve yeni kategori ekleme i�in)
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users only on categories"
ON public.categories FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable insert access for authenticated users only on categories"
ON public.categories FOR INSERT
TO authenticated
WITH CHECK (true);


-- 5. Yeni Alanlar İçin Tablolar (Orijinal Parça Numarası, Marka, Araç Markası)
CREATE TABLE IF NOT EXISTS public.original_part_numbers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.brands (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.vehicle_brands (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.original_part_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_brands ENABLE ROW LEVEL SECURITY;

CREATE POLICY ""Enable read access for authenticated users only on opn"" ON public.original_part_numbers FOR SELECT TO authenticated USING (true);
CREATE POLICY ""Enable insert access for authenticated users only on opn"" ON public.original_part_numbers FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY ""Enable read access for authenticated users only on brands"" ON public.brands FOR SELECT TO authenticated USING (true);
CREATE POLICY ""Enable insert access for authenticated users only on brands"" ON public.brands FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY ""Enable read access for authenticated users only on vb"" ON public.vehicle_brands FOR SELECT TO authenticated USING (true);
CREATE POLICY ""Enable insert access for authenticated users only on vb"" ON public.vehicle_brands FOR INSERT TO authenticated WITH CHECK (true);

-- Mevcut veritabanı için update komutları (Eğer stocks tablosu önceden oluşturulmuşsa)
ALTER TABLE public.stocks ADD COLUMN IF NOT EXISTS original_part_number TEXT;
ALTER TABLE public.stocks ADD COLUMN IF NOT EXISTS brand TEXT;
ALTER TABLE public.stocks ADD COLUMN IF NOT EXISTS vehicle_brand TEXT;

CREATE INDEX IF NOT EXISTS idx_stocks_original_part_number ON public.stocks USING gin (original_part_number gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_stocks_brand ON public.stocks USING gin (brand gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_stocks_vehicle_brand ON public.stocks USING gin (vehicle_brand gin_trgm_ops);
