# Türkmen Ticaret - Proje Geliştirme Notları

Bu dosya, projenin yapısını ve geçmişte alınan kritik tasarım kararlarını sisteme (yapay zekaya) ve geliştiricilere hatırlatmak için oluşturulmuştur. Lütfen projede değişiklik yaparken buradaki kuralları ve mimariyi göz önünde bulundurun.

## 1. Veritabanı ve Satış Akışı (POS)
* Hızlı Satış (`POS.jsx`) ekranında bir satış yapıldığında sistem sırasıyla şu işlemleri asenkron olarak gerçekleştirir:
  1. `sales` tablosuna genel satış bilgisini kaydeder.
  2. `sale_items` tablosuna satılan ürünlerin kalem kalem detayını kaydeder.
  3. `stocks` tablosuna gidip satılan adet kadar stoğu **eksiltir**.
  4. (Kritik) Eğer müşteri seçilmiş ve "Veresiye" butonuna tıklanmışsa, müşterinin cari hesabına işlemek üzere `transactions` tablosuna `transaction_type: 'Borç'` olarak kayıt atar. Eğer "Nakit" vb. seçilirse cariye yazılmaz, sadece kasaya işlenir.

## 2. Supabase ve İlişkisel Sorgu (Join) Kısıtlamaları
* Proje geliştirme aşamasında, tablolar SQL ile manuel eklendiği için Supabase'in "Foreign Key (Yabancı Anahtar)" ilişkilerini anında algılayamaması (schema cache) kaynaklı 404 hataları yaşanmıştır.
* **Kritik Kural:** Supabase JS üzerinden veri çekerken `.select('*, accounts(name)')` gibi **bağımlı (join) sorgular kullanmaktan kaçınılmalıdır**. Bunun yerine, tablolar bağımsız olarak çekilip (örneğin `sale_items` ayrı, `stocks` ayrı) React içerisinde (client-side) JavaScript fonksiyonları (örn: `.find()`) ile eşleştirilmelidir. (`SaleDetailModal.jsx` bu şekilde kurgulanmıştır.)

## 3. UUID Filtreleme Problemi
* Supabase (PostgreSQL) üzerinden UUID veri tiplerinde `.ilike()` fonksiyonu operatör hatasına (`PGRST116`) yol açmaktadır. 
* Siparişleri kısmi bir UUID (örneğin ilk 8 hanesi) ile bulmak gerektiğinde SQL tabanlı filtreleme yerine; veriler düz çekilmeli (`.limit(200)` gibi) ve arama işlemi JS tarafında `data.find(s => s.id.startsWith(prefix))` şeklinde yapılmalıdır.

## 4. Önbellek (Cache) Yönetimi
* Uygulama genelinde veri çekme işlemi için `@tanstack/react-query` kullanılmaktadır.
* POS üzerinden satış yapıldığında Cari sayfasının anında güncellenmesi için satışın hemen ardından `queryClient.invalidateQueries({ queryKey: ['transactions'] })` tetiklenerek önbellek zorla temizlenmelidir. Aksi takdirde tarayıcı eski verileri göstermekte ısrarcı olur.

## 5. 80mm Termal Yazıcı ve Fiş Çıktısı
* `src/lib/printReceipt.js` dosyası içerisinde gizli bir `<iframe>` üzerinden çalışan ve mevcut CSS/DOM yapısını bozmayan profesyonel bir fiş yazdırma modülü bulunmaktadır.
* Fişin başına gelecek firma logosu statik olarak `public/logo.png` yolundan beslenir. Eğer logo yoksa sadece şirket ismi yazdırılır. Logoyu değiştirmek için public klasöründeki dosyayı değiştirmek yeterlidir.
