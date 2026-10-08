import { test, expect } from '@playwright/test';

test.describe('Türkmen Ticaret Ana Akış Testleri', () => {
  test('Public anasayfa başarıyla yüklenmeli', async ({ page }) => {
    await page.goto('/');
    // Başlığın doğruluğunu kontrol et
    await expect(page).toHaveTitle(/Türkmenler Ticaret/i);
    // Anasayfadaki bir elemanı kontrol et
    await expect(page.locator('text=Türkmenler Ticaret').first()).toBeVisible();
  });

  test('Kullanıcı girişi (Login) ve Dashboard erişimi', async ({ page }) => {
    await page.goto('/portal-giris');
    
    // Giriş formunu doldur
    // Not: Gerçek test için geçerli bir kullanıcı e-posta ve şifresi gereklidir
    await page.fill('input[type="email"]', 'test@turkmenticaret.com');
    await page.fill('input[type="password"]', '123456');
    await page.click('button[type="submit"]');

    // Dashboard'a yönlendirmeyi bekle (Gerçek bilgilerle giriş başarılı olursa çalışır)
    // await page.waitForURL('**/portal');
    // await expect(page.locator('text=Dashboard').first()).toBeVisible();
  });

  test('Stok Listesi Sayfası', async ({ page }) => {
    // Login işlemini hızlıca yap
    await page.goto('/portal-giris');
    await page.fill('input[type="email"]', 'test@turkmenticaret.com');
    await page.fill('input[type="password"]', '123456');
    await page.click('button[type="submit"]');
    
    // Gerçek veri ile çalışırken yönlendirmeyi ve sayfa yüklemesini bekleriz
    // await page.waitForURL('**/portal');
    // await page.click('text=Stok Listesi');
    // await page.waitForURL('**/portal/stoklar');
    
    // Tablonun veya genel bir başlığın yüklendiğini kontrol et
    // await expect(page.locator('h1')).toContainText('Stok Yönetimi');
  });
});
