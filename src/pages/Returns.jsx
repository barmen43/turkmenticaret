import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { ShoppingCart, Search, Trash2, User, CreditCard, Banknote, FileText, CheckCircle, Plus, Minus, Printer } from 'lucide-react';
import BarcodeScannerModal from '../components/BarcodeScannerModal';
import { printReceipt } from '../lib/printReceipt';

export default function Returns() {
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedCustomerName, setSelectedCustomerName] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [showVeresiyeSearch, setShowVeresiyeSearch] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
  const [lastSale, setLastSale] = useState(null); // Son satışı hafızada tut
  
  const queryClient = useQueryClient();

  const barcodeInputRef = useRef(null);

  // Focus barcode input on mount and keep it focused for physical scanners
  useEffect(() => {
    if (barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, []);

  const { data: stocks } = useQuery({
    queryKey: ['stocks_returns'],
    queryFn: async () => {
      const { data, error } = await supabase.from('stocks').select('*').order('part_name');
      if (error) throw error;
      return data;
    }
  });

  const { data: customers } = useQuery({
    queryKey: ['customers_returns'],
    queryFn: async () => {
      const { data, error } = await supabase.from('accounts').select('id, name').order('name');
      if (error) throw error;
      return data;
    }
  });

  // Calculate Totals
  const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.cartQuantity), 0);

  // Add to cart logic
  
  const addToCart = async (product) => {
    setSearchTerm('');
    if (barcodeInputRef.current) barcodeInputRef.current.focus();

    // Fetch the last sale for this product to show in the cart
    const { data: lastSaleItems } = await supabase
      .from('sale_items')
      .select('unit_price, sales(created_at, payment_method)')
      .eq('stock_id', product.id)
      .order('id', { ascending: false })
      .limit(1);
    
    const lastSaleInfo = lastSaleItems && lastSaleItems.length > 0 ? lastSaleItems[0] : null;

    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, cartQuantity: item.cartQuantity + 1 } : item);
      }
      return [...prev, { ...product, cartQuantity: 1, lastSaleInfo }];
    });
  };


  const handleBarcodeSubmit = (e, overrideSearchTerm = null) => {
    if (e) e.preventDefault();
    const cleanSearch = (overrideSearchTerm !== null ? overrideSearchTerm : searchTerm).trim();
    if (!cleanSearch || !stocks) return;
    
    // 1. Tam barkod eşleşmesi ara
    const exactMatch = stocks.find(s => s.barcode === cleanSearch);
    
    if (exactMatch) {
      addToCart(exactMatch);
    } else {
      // 2. Tam barkod yoksa, isme veya eksik barkoda göre filtrele
      const currentResults = stocks.filter(s => 
        (s.part_name && s.part_name.toLowerCase().includes(cleanSearch.toLowerCase())) || 
        (s.part_code && s.part_code.toLowerCase().includes(cleanSearch.toLowerCase())) || 
        (s.barcode && s.barcode.includes(cleanSearch)) ||
        (s.original_part_number && s.original_part_number.includes(cleanSearch))
      );

      if (currentResults.length === 1) {
        addToCart(currentResults[0]);
      } else if (currentResults.length > 1) {
        setNotification({ show: true, message: 'Birden fazla ürün bulundu! Açılır listeden seçin.', type: 'error' });
        setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 3000);
      } else {
        setNotification({ show: true, message: 'Aradığınız kritere uygun ürün bulunamadı!', type: 'error' });
        setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 3000);
        setSearchTerm('');
      }
    }
  };

  const updateQuantity = (id, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQ = item.cartQuantity + delta;
        return newQ > 0 ? { ...item, cartQuantity: newQ } : item;
      }
      return item;
    }));
  };

  const removeFromCart = (id) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const handleCheckout = async (method, customerId = null) => {
    if (cart.length === 0) {
      setNotification({ show: true, message: 'Sepet boş!', type: 'error' });
      setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 3000);
      return;
    }
    
    if (method === 'İade - Cari Hesaptan Düş' && !customerId) {
      setNotification({ show: true, message: 'Cari hesaptan düşmek için müşteri/tedarikçi seçmelisiniz!', type: 'error' });
      setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 3000);
      return;
    }

    setLoading(true);
    try {
      // Satış (iade) kaydı oluştur. Satış tutarını negatif tutarak iade olduğunu belli edebiliriz veya sadece isminden belli olur.
      // Sadece isminden belli olması dashboard vb. uyumluluğu için daha kolay olabilir, ama biz iade olduğu için total_amount'u eksi yapalım.
      const { data: saleData, error: saleError } = await supabase
        .from('sales')
        .insert([{
          account_id: customerId || null,
          total_amount: -totalAmount,
          payment_method: method
        }])
        .select()
        .single();

      if (saleError) throw saleError;

      // 2. Satılan Ürünleri (sale_items) kaydet ve Stokları Düş
      const saleItems = cart.map(item => ({
        sale_id: saleData.id,
        stock_id: item.id,
        quantity: item.cartQuantity,
        unit_price: item.price,
        total_price: item.price * item.cartQuantity
      }));

      const { error: itemsError } = await supabase.from('sale_items').insert(saleItems);
      if (itemsError) throw itemsError;

      // Son satışı fiş yazdırmak için state'e at
      const customer = customerId ? customers?.find(c => c.id === customerId) : null;
      setLastSale({
        sale: {
          ...saleData,
          customerName: customer ? customer.name : 'Perakende Müşteri'
        },
        items: cart.map(item => ({
          name: item.part_name,
          quantity: item.cartQuantity,
          unit_price: item.price,
          total_price: item.price * item.cartQuantity
        }))
      });

      // Stok düşme (her ürün için)
      for (const item of cart) {
        await supabase
          .from('stocks')
          .update({ quantity: Number(item.quantity) + Number(item.cartQuantity) })
          .eq('id', item.id);
      }

      // 3. Eğer Cari Hesaba yazılıyorsa, işlemlere borç kaydet
      if (method === 'İade - Cari Hesaptan Düş' && customerId) {
        const { error: txError } = await supabase.from('transactions').insert([{
          account_id: customerId,
          transaction_type: 'Alacak', // İade ettiğimiz için cari hesaba alacak kaydediyoruz (bize olan borcu düşüyor)
          amount: totalAmount,
          payment_method: 'Nakit', // Veritabanı kısıtlamasına uyması için
          transaction_date: new Date().toISOString(),
          description: `İade: ${saleData.id.slice(0,8)} (Veresiye İade)`
        }]);
        if (txError) throw txError;
      }

      // Başarı bildirimi
      setNotification({ show: true, message: 'İade başarıyla tamamlandı! Stoklar güncellendi.', type: 'success' });
      setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 3000);

      // Cache'i temizle ki Cari Detay'a gidince anında güncel veriyi çeksin
      queryClient.invalidateQueries({ queryKey: ['transactions'] });

      setCart([]);
      setSelectedCustomerId('');
      setSelectedCustomerName('');
      setCustomerSearch('');
      setShowVeresiyeSearch(false);
    } catch (error) {
      console.error("SATIS HATASI:", error);
      setNotification({ show: true, message: 'HATA: ' + error.message, type: 'error' });
      setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 5000);
    } finally {
      setLoading(false);
      if (barcodeInputRef.current) barcodeInputRef.current.focus();
    }
  };

  // Ürün arama sonuçları
  const searchResults = searchTerm ? stocks?.filter(s => 
    (s.part_name && s.part_name.toLowerCase().includes(searchTerm.toLowerCase())) || 
    (s.part_code && s.part_code.toLowerCase().includes(searchTerm.toLowerCase())) || 
    (s.barcode && s.barcode.includes(searchTerm)) ||
    (s.original_part_number && s.original_part_number.includes(searchTerm))
  ).slice(0, 5) : [];

  return (
    <div className="animate-fade-in flex flex-col" style={{ minHeight: 'calc(100vh - 6rem)', gap: '1rem', position: 'relative' }}>
      
      {/* On-screen Notification */}
      {notification.show && (
        <div style={{
          position: 'absolute', top: '1rem', left: '50%', transform: 'translateX(-50%)',
          background: notification.type === 'error' ? 'var(--color-danger)' : 'var(--color-success)',
          color: '#fff', padding: '1rem 2rem', borderRadius: 'var(--radius-lg)', zIndex: 100,
          boxShadow: 'var(--shadow-lg)', fontWeight: 'bold', fontSize: '1.2rem',
          animation: 'fade-in 0.3s ease-out'
        }}>
          {notification.message}
        </div>
      )}

      {/* Üst Alan: Arama ve Barkod */}
      <div className="glass-panel p-4 flex flex-wrap gap-4 items-center">
        <form onSubmit={handleBarcodeSubmit} style={{ flex: '1 1 300px', position: 'relative' }}>
          <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} size={20} />
          <input 
            ref={barcodeInputRef}
            type="text" 
            className="form-input" 
            style={{ paddingLeft: '2.75rem', fontSize: '1.2rem', padding: '1rem 1rem 1rem 3rem' }}
            placeholder="Barkod okutun, stok adı veya parça kodu yazın..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {/* Arama Sonuçları Dropdown */}
          {searchTerm && searchResults && searchResults.length > 0 && !stocks?.find(s => s.barcode === searchTerm) && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', zIndex: 10, marginTop: '4px', boxShadow: 'var(--shadow-lg)' }}>
              {searchResults.map(item => (
                <div 
                  key={item.id} 
                  style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}
                  onClick={() => addToCart(item)}
                  className="hover:bg-[rgba(255,255,255,0.05)]"
                >
                  <div>
                    <div className="font-bold">{item.part_name} <span style={{ color: 'var(--color-primary)', fontSize: '0.9rem' }}>({item.part_code})</span></div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Stok: {item.quantity} | Barkod: {item.barcode || '-'}</div>
                  </div>
                  <div className="font-bold text-primary">₺{Number(item.price).toFixed(2)}</div>
                </div>
              ))}
            </div>
          )}
        </form>
        <button type="button" className="btn btn-secondary" style={{ padding: '1rem' }} onClick={() => setIsScanning(true)}>
          Kameradan Okut
        </button>
      </div>

      <div className="pos-grid">
        {/* Sol Taraf: Sepet Listesi */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: '400px' }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShoppingCart className="text-primary" />
            <h3 style={{ margin: 0 }}>Sepetiniz</h3>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center" style={{ color: 'var(--color-text-muted)' }}>
                <ShoppingCart size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                <p>İade sepeti henüz boş. Barkod okutun veya ürün arayın.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {cart.map(item => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                    <div style={{ flex: 1 }}>
                      
                      <div className="font-bold">{item.part_name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Birim Fiyat: ₺{Number(item.price).toFixed(2)}</div>
                      {item.lastSaleInfo && item.lastSaleInfo.sales && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-primary)', marginTop: '0.2rem' }}>
                          Son Satış: {new Date(item.lastSaleInfo.sales.created_at).toLocaleDateString('tr-TR')} - {item.lastSaleInfo.sales.payment_method} (₺{Number(item.lastSaleInfo.unit_price).toFixed(2)})
                        </div>
                      )}

                    </div>
                    
                    {/* Miktar Kontrolleri */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginRight: '2rem' }}>
                      <button className="btn btn-secondary" style={{ padding: '0.3rem', borderRadius: '50%' }} onClick={() => updateQuantity(item.id, -1)}>
                        <Minus size={16} />
                      </button>
                      <span style={{ fontSize: '1.2rem', fontWeight: 'bold', width: '2rem', textAlign: 'center' }}>{item.cartQuantity}</span>
                      <button className="btn btn-secondary" style={{ padding: '0.3rem', borderRadius: '50%' }} onClick={() => updateQuantity(item.id, 1)}>
                        <Plus size={16} />
                      </button>
                    </div>

                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', width: '100px', textAlign: 'right', color: 'var(--color-primary)' }}>
                      ₺{(item.price * item.cartQuantity).toFixed(2)}
                    </div>
                    
                    <button className="btn btn-danger" style={{ padding: '0.5rem', marginLeft: '1rem', borderRadius: 'var(--radius-md)' }} onClick={() => removeFromCart(item.id)}>
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sağ Taraf: Ödeme ve Cari Bilgileri */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
          
          {/* Toplam Tutar (En Üstte) */}
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--color-border)', background: 'rgba(0,0,0,0.2)', textAlign: 'center' }}>
            <div style={{ fontSize: '1.2rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>İade Edilecek Toplam Tutar</div>
            <div style={{ fontSize: '3rem', fontWeight: 'bold', color: 'var(--color-success)', lineHeight: 1 }}>
              ₺{totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full text-center" style={{ color: 'var(--color-text-muted)' }}>
                <div className="animate-spin mb-4"><CheckCircle size={48} /></div>
                <p style={{ fontSize: '1.2rem' }}>Satış Onaylanıyor...</p>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
                  <label className="form-label" style={{ fontSize: '1.1rem', margin: 0 }}>İadeyi Tamamla (İade Türü Seçiniz)</label>
                  {lastSale && (
                    <button 
                      className="btn btn-primary" 
                      onClick={() => printReceipt(lastSale.sale, lastSale.items)}
                      style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', animation: 'fade-in 0.3s' }}
                    >
                      <Printer size={18} /> Son İade Fişini Yazdır
                    </button>
                  )}
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <button 
                    type="button" 
                    className="btn btn-secondary hover:btn-primary"
                    style={{ padding: '1.5rem 1rem', fontSize: '1.1rem', backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
                    onClick={() => handleCheckout('İade - Nakit')}
                    disabled={cart.length === 0}
                  >
                    <Banknote size={24} /> Nakit İade
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-secondary hover:btn-primary"
                    style={{ padding: '1.5rem 1rem', fontSize: '1.1rem', backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
                    onClick={() => handleCheckout('İade - Kredi Kartı')}
                    disabled={cart.length === 0}
                  >
                    <CreditCard size={24} /> K.Kartı İptali
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-secondary hover:btn-primary"
                    style={{ padding: '1.5rem 1rem', fontSize: '1.1rem', backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
                    onClick={() => handleCheckout('İade - Havale')}
                    disabled={cart.length === 0}
                  >
                    <FileText size={24} /> Havale İadesi
                  </button>
                  <button 
                    type="button" 
                    className={`btn ${showVeresiyeSearch ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ 
                      padding: '1.5rem 1rem', fontSize: '1.1rem', 
                      backgroundColor: showVeresiyeSearch ? 'rgba(239, 68, 68, 0.2)' : 'var(--color-surface)', 
                      borderColor: showVeresiyeSearch ? 'var(--color-danger)' : 'var(--color-border)',
                      color: showVeresiyeSearch ? '#fca5a5' : undefined 
                    }}
                    onClick={() => setShowVeresiyeSearch(!showVeresiyeSearch)}
                    disabled={cart.length === 0}
                  >
                    <User size={24} /> Cari'den Düş
                  </button>
                </div>

                {/* Veresiye Seçildiyse Müşteri Arama */}
                {showVeresiyeSearch && (
                  <div className="animate-fade-in" style={{ marginTop: '1rem', background: 'rgba(239, 68, 68, 0.05)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                    <label className="form-label text-danger flex items-center gap-2 mb-2"><User size={18} /> Kimin Hesabından Düşülecek? (Müşteri/Tedarikçi Seçin)</label>
                    
                    <div style={{ position: 'relative' }}>
                      <Search style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} size={16} />
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="Müşteri adı yazın..." 
                        value={customerSearch}
                        onChange={e => setCustomerSearch(e.target.value)}
                        style={{ paddingLeft: '2.5rem', borderColor: 'rgba(239, 68, 68, 0.5)' }}
                        autoFocus
                      />
                      
                      {customerSearch && (
                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', zIndex: 10, marginTop: '4px', boxShadow: 'var(--shadow-lg)', maxHeight: '150px', overflowY: 'auto' }}>
                          {customers?.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase())).map(c => (
                            <div 
                              key={c.id} 
                              style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', cursor: 'pointer', fontWeight: 'bold' }}
                              className="hover:bg-[rgba(239,68,68,0.2)] text-primary"
                              onClick={() => handleCheckout('İade - Cari Hesaptan Düş', c.id)}
                            >
                              {c.name} <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', fontWeight: 'normal' }}>- Seç ve İadeyi Tamamla</span>
                            </div>
                          ))}
                          {customers?.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase())).length === 0 && (
                            <div style={{ padding: '0.75rem 1rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>
                              Müşteri bulunamadı.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

          </div>
        </div>
      </div>

      {isScanning && (
        <BarcodeScannerModal 
          onScan={(code) => {
            setSearchTerm(code);
            setIsScanning(false);
            // Kapanma anında hemen sorguyu tetikle
            handleBarcodeSubmit(null, code);
          }}
          onClose={() => setIsScanning(false)} 
        />
      )}
    </div>
  );
}
