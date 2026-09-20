# Türkmenler Ticaret - Web Sitesi ve Stok Yönetim Sistemi

Bu proje, Türkmenler Ticaret için geliştirilmiş modern, hızlı ve güvenli bir kurumsal web sitesi ile kapalı devre bir yedek parça stok takip portalını içermektedir.

## 🚀 Proje Özeti (Aşama 1 - Tamamlananlar)

Bugün (20 Eylül 2026) yapılan çalışmalar ve canlıya alınan özellikler şunlardır:

### 1. Kurumsal Ön Yüz (Landing Page)
*   **Ana Sayfa (/)**: Müşterilerin ziyaret edeceği, otomotiv temalı, premium tasarımlı (Glassmorphism) kurumsal sayfa oluşturuldu.
*   **SEO Optimizasyonu**: `react-helmet-async` kütüphanesi ile sayfa başlıkları ve meta etiketleri arama motorlarına uygun (Kütahya, yedek parça, orijinal, muadil) hale getirildi.
*   **Animasyonlar**: Ziyaretçi sayfayı aşağı kaydırdıkça çalışan pürüzsüz `framer-motion` animasyonları eklendi.
*   **İletişim & Harita**: İşletme iletişim bilgileri (Asım Bey) ve interaktif Google Haritalar entegrasyonu tamamlandı.

### 2. Kapalı Devre Stok Paneli (Portal)
*   **Güvenli Giriş**: Sisteme sadece yetkili personelin erişebilmesi için URL tamamen gizlendi (`/portal-giris`) ve Supabase Authentication ile şifrelendi.
*   **Gelişmiş Arama (Trigram)**: Eski sistemdeki (Vega) arama sorunları çözüldü. Büyük/küçük harf duyarsız, parça adı, raf yeri veya barkod okutarak anında arama altyapısı kuruldu.
*   **PWA ve Çevrimdışı (Offline) Desteği**: İnternet bağlantısının koptuğu veya yavaşladığı durumlarda bile sistemin çalışmaya devam etmesi için `Tanstack Query`, `localforage` ve `Vite PWA` ile çevrimdışı okuma özelliği (Offline-first caching) getirildi.
*   **Dinamik Kategori Sistemi**: "Select & Create" (react-select) yapısı kurularak, sistemde olmayan yeni kategorilerin form üzerinden yazılır yazılmaz otomatik veritabanına eklenmesi sağlandı.
*   **Veritabanı Altyapısı**: Tüm tablolar (stoklar, kategoriler) ve güvenlik kuralları (Row Level Security) Supabase üzerinde `setup.sql` dosyası ile ayağa kaldırıldı.

### 3. Canlıya Alma (Deployment)
*   Proje kodları GitHub'a (`barmen43/turkmenticaret`) aktarıldı.
*   Vercel üzerinden `CI/CD` (Otomatik Dağıtım) kurgulandı.
*   React Router (SPA) için alt sayfa yenilemelerinde (F5) `404` hatasını önleyen `vercel.json` kuralı eklendi.
*   Supabase ortam değişkenleri (Environment Variables) güvenli bir şekilde Vercel'e tanımlandı ve site sorunsuz şekilde canlıya alındı.

## 🛠️ Kullanılan Teknolojiler
*   **Frontend Framework:** React + Vite
*   **Stilleme (Styling):** Özel yapım Vanilla CSS (Premium Dark Theme)
*   **Backend & Veritabanı:** Supabase (PostgreSQL, Auth)
*   **Animasyonlar:** Framer Motion
*   **State & Offline Cache:** TanStack React Query + LocalForage
*   **İkonlar:** Lucide React

---

*Türkmenler Ticaret için özelleştirilmiş ve ölçeklenmeye hazır olarak kodlanmıştır.*
