import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Save, X, ArrowLeft, RefreshCw, Camera, ListPlus, Trash2 } from 'lucide-react';
import CreatableSelect from 'react-select/creatable';
import BarcodeScannerModal from '../components/BarcodeScannerModal';


  const DropdownList = ({ items, onSelect }) => (
    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', zIndex: 50, marginTop: '4px', boxShadow: 'var(--shadow-lg)', maxHeight: '200px', overflowY: 'auto' }}>
      {items.length === 0 ? (
        <div style={{ padding: '0.75rem 1rem', color: 'var(--color-text-muted)' }}>Bulunamadı. Enter'a basarak yeni kaydedebilirsiniz.</div>
      ) : (
        items.map(item => (
          <div 
            key={item.id} 
            style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--color-border)', cursor: 'pointer' }}
            className="hover:bg-[rgba(255,255,255,0.05)]"
            onClick={() => onSelect(item)}
            onMouseDown={(e) => e.preventDefault()} // to prevent onBlur from firing first
          >
            <div className="font-bold text-primary">{item.part_name}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', display: 'flex', gap: '1rem' }}>
               <span>Kod: {item.part_code}</span>
               {item.barcode && <span>Barkod: {item.barcode}</span>}
            </div>
          </div>
        ))
      )}
    </div>
  );

export default function StockForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const selectStyles = {
    control: (baseStyles, state) => ({
      ...baseStyles,
      backgroundColor: 'rgba(0, 0, 0, 0.2)',
      borderColor: state.isFocused ? 'var(--color-primary)' : 'var(--color-border)',
      boxShadow: state.isFocused ? '0 0 0 2px rgba(249, 115, 22, 0.2)' : 'none',
      borderRadius: 'var(--radius-md)',
      padding: '0.2rem',
      color: 'white',
      fontFamily: "'Outfit', sans-serif"
    }),
    menu: (baseStyles) => ({
      ...baseStyles,
      backgroundColor: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      zIndex: 9999
    }),
    option: (baseStyles, { isFocused, isSelected }) => ({
      ...baseStyles,
      backgroundColor: isSelected ? 'var(--color-primary)' : isFocused ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
      color: isSelected ? 'white' : 'var(--color-text)',
      cursor: 'pointer',
    }),
    singleValue: (baseStyles) => ({
      ...baseStyles,
      color: 'var(--color-text)',
    }),
    input: (baseStyles) => ({
      ...baseStyles,
      color: 'var(--color-text)',
    }),
  };

  const [loading, setLoading] = useState(false);
  const [fetchingProduct, setFetchingProduct] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  
  const { data: allStocks } = useQuery({
    queryKey: ['stocks_dropdown'],
    queryFn: async () => {
      const { data } = await supabase.from('stocks').select('*');
      return data || [];
    }
  });
  const [error, setError] = useState('');
  const [draftItems, setDraftItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [originalPartNumbers, setOriginalPartNumbers] = useState([]);
  const [brands, setBrands] = useState([]);
  const [vehicleBrands, setVehicleBrands] = useState([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  
  const [formData, setFormData] = useState({
    part_code: '',
    part_name: '',
    description: '',
    quantity: 0,
    price: 0,
    category: '',
    original_part_number: '',
    brand: '',
    vehicle_brand: '',
    shelf_location: '',
    supplier: '',
    min_stock_warning: 5,
    barcode: '',
    part_type: 'Orijinal',
    buying_price: 0,
    discount: '',
    margin: '',
    kdv_rate: 20,
      discount: '',
    id: null,
    margin: '',
    kdv_rate: 20,
      discount: '',
    id: null
  });

  const [transaction, setTransaction] = useState({
    log_transaction: false,
    supplier_id: '',
    payment_method: 'Veresiye',
    amount: 0,
    check_due_date: ''
  });

  const [suppliers, setSuppliers] = useState([]);

  const [scannerOpen, setScannerOpen] = useState(false);

  useEffect(() => {
    if (isEditing) {
      loadStock();
    }
    loadOptions();
  }, [id]);

  const loadOptions = async () => {
    setIsLoadingOptions(true);
    
    const [catRes, opnRes, brandRes, vbRes, supRes] = await Promise.all([
      supabase.from('categories').select('name').order('name'),
      supabase.from('original_part_numbers').select('name').order('name'),
      supabase.from('brands').select('name').order('name'),
      supabase.from('vehicle_brands').select('name').order('name'),
      supabase.from('accounts').select('id, name').eq('account_type', 'Tedarikçi').order('name')
    ]);

    if (!catRes.error && catRes.data) setCategories(catRes.data.map(c => ({ value: c.name, label: c.name })));
    if (!opnRes.error && opnRes.data) setOriginalPartNumbers(opnRes.data.map(c => ({ value: c.name, label: c.name })));
    if (!brandRes.error && brandRes.data) setBrands(brandRes.data.map(c => ({ value: c.name, label: c.name })));
    if (!vbRes.error && vbRes.data) setVehicleBrands(vbRes.data.map(c => ({ value: c.name, label: c.name })));
    if (!supRes.error && supRes.data) setSuppliers(supRes.data);

    setIsLoadingOptions(false);
  };

  const handleCreateOption = async (inputValue, tableName, stateSetter, fieldName) => {
    setIsLoadingOptions(true);
    const newOption = { value: inputValue, label: inputValue };
    
    // Optimistically add to UI
    stateSetter((prev) => [...prev, newOption]);
    handleChange({ target: { name: fieldName, value: inputValue, type: 'text' } });

    // Insert to DB
    const { error } = await supabase.from(tableName).insert([{ name: inputValue }]);
    if (error) {
      console.error(`${tableName} eklenirken hata oluştu:`, error);
    }
    
    setIsLoadingOptions(false);
  };

  const loadStock = async () => {
    const { data, error } = await supabase.from('stocks').select('*').eq('id', id).single();
    if (error) {
      setError('Stok bilgisi alınamadı.');
    } else if (data) {
      setFormData({
        part_code: data.part_code || '',
        part_name: data.part_name || '',
        description: data.description || '',
        quantity: data.quantity || 0,
        price: data.price || 0,
        category: data.category || '',
        original_part_number: data.original_part_number || '',
        brand: data.brand || '',
        vehicle_brand: data.vehicle_brand || '',
        shelf_location: data.shelf_location || '',
        supplier: data.supplier || '',
        min_stock_warning: data.min_stock_warning || 5,
        barcode: data.barcode || '',
        part_type: data.part_type || 'Orijinal',
        buying_price: data.buying_price || 0
      });
    }
  };

  const handleSelectExisting = (fullData) => {
    setFormData(prev => ({
      ...prev,
      id: fullData.id,
      part_code: fullData.part_code || '',
      part_name: fullData.part_name || '',
      description: fullData.description || '',
      price: fullData.price || 0,
      buying_price: fullData.buying_price || 0,
      category: fullData.category || '',
      original_part_number: fullData.original_part_number || '',
      brand: fullData.brand || '',
      vehicle_brand: fullData.vehicle_brand || '',
      shelf_location: fullData.shelf_location || '',
      supplier: fullData.supplier || '',
      min_stock_warning: fullData.min_stock_warning || 5,
      barcode: fullData.barcode || '',
      quantity: '', 
      margin: '',
      kdv_rate: 20,
      discount: ''
    }));
    setActiveDropdown(null);
  };
  
  const handleCheckDuplicate = async (field, value) => {
     // Kept for compatibility if they press Enter
     setActiveDropdown(null);
  };

  const handleKeyDownCheck = (e, field, value) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCheckDuplicate(field, value);
    }
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    let val = type === 'number' ? (value === '' ? '' : Number(value)) : value;
    
    setFormData(prev => {
      let newState = { ...prev, [name]: val };
      if (name === 'buying_price' && prev.margin) {
         newState.price = Number(val) + (Number(val) * Number(prev.margin) / 100);
      }
      return newState;
    });
  };

  const handleMarginChange = (e) => {
    const marginVal = e.target.value === '' ? '' : Number(e.target.value);
    setFormData(prev => {
      const buying = Number(prev.buying_price) || 0;
      const newPrice = marginVal !== '' ? buying + (buying * marginVal / 100) : prev.price;
      return { ...prev, margin: marginVal, price: newPrice };
    });
  };

  const handleTransactionChange = (e) => {
    const { name, value, type, checked } = e.target;
    setTransaction(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? (value === '' ? '' : Number(value)) : value)
    }));
  };

  const generateBarcode = () => {
    // İç kullanım için 800 ile başlayan 12 haneli rastgele bir barkod numarası oluşturur
    const randomPart = Math.floor(Math.random() * 1000000000).toString().padStart(9, '0');
    setFormData(prev => ({
      ...prev,
      barcode: `800${randomPart}`
    }));
  };

  const handleAddToList = () => {
    if (!formData.part_code || !formData.part_name || formData.quantity <= 0 || formData.price <= 0) {
      alert("Listeye eklemeden önce zorunlu alanları (Parça Kodu, Ürün Adı, Miktar, Satış Fiyatı) doldurmalısınız.");
      return;
    }
    setDraftItems(prev => [...prev, { ...formData }]);
    setFormData(prev => ({
      ...prev,
      part_code: '',
      part_name: '',
      description: '',
      barcode: '',
      quantity: 0,
      price: 0,
      buying_price: 0,
    discount: '',
      id: null,
      margin: '',
      kdv_rate: 20,
      discount: ''
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let stockId = id;

      const payload = { ...formData };
      if (payload.quantity === '') payload.quantity = 0;
      if (payload.price === '') payload.price = 0;
      if (payload.buying_price === '') payload.buying_price = 0;
      if (payload.min_stock_warning === '') payload.min_stock_warning = 0;

      if (isEditing) {
        const { error: updateError } = await supabase
          .from('stocks')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', id);
        if (updateError) throw updateError;
      } else {
        const itemsToSave = [...draftItems];
        if (payload.part_name && payload.part_code) {
          itemsToSave.push(payload);
        }
        
        if (itemsToSave.length === 0) {
          throw new Error("Kaydedilecek ürün bulunamadı!");
        }

        for (let item of itemsToSave) {
          if (item.id) {
             // Var olan ürünü güncelle (stoğu artır)
             const { data: currentStock } = await supabase.from('stocks').select('quantity').eq('id', item.id).single();
             const newQuantity = (currentStock?.quantity || 0) + Number(item.quantity);
             
             const { id: itemId, margin, kdv_rate, ...updateData } = item;
             updateData.quantity = newQuantity;
             updateData.updated_at = new Date().toISOString();
             
             const { error: updErr } = await supabase.from('stocks').update(updateData).eq('id', item.id);
             if (updErr) throw updErr;
          } else {
             // Yeni ürün ekle
             const { id: itemId, margin, kdv_rate, ...insertData } = item;
             const { data: insData, error: insErr } = await supabase.from('stocks').insert([insertData]).select('id').single();
             if (insErr) throw insErr;
             if (!stockId && insData) stockId = insData.id;
          }
        }
      }

      // Muhasebe Kaydı İşlemleri
      if (transaction.log_transaction && transaction.supplier_id && transaction.amount > 0) {
        if (transaction.payment_method === 'Veresiye') {
          // Cari hesaba Alacak yaz
          const { error: txError } = await supabase.from('transactions').insert([{
            account_id: transaction.supplier_id,
            transaction_type: 'Alacak', // Tedarikçiye borçlandık, onun bizden alacağı var
            amount: transaction.amount,
            payment_method: 'Veresiye',
            transaction_date: new Date().toISOString(),
            description: `Ürün Girişi: ${formData.part_code || formData.part_name}`
          }]);
          if (txError) throw txError;
        } 
        else if (transaction.payment_method === 'Çek / Senet') {
          if (!transaction.check_due_date) {
            throw new Error('Çek/Senet için vade tarihi girmelisiniz!');
          }
          // Çek/Senet tablosuna kaydet
          const { error: checkError } = await supabase.from('checks').insert([{
            type: 'Senet', // Varsayılan olarak Senet (veya firma çeki)
            check_number: `STK-${stockId?.slice(0,6) || Math.floor(Math.random()*1000)}`,
            bank_name: '-',
            owner_name: 'Firmamız', // Kendi çekimiz/senedimiz
            due_date: transaction.check_due_date,
            amount: transaction.amount,
            given_to: transaction.supplier_id,
            status: 'Verildi' // Tedarikçiye verildi
          }]);
          if (checkError) throw checkError;
        }
        // Nakit veya K.Kartı seçildiyse doğrudan ödenmiş kabul edilir, ekstra borç kaydı atılmaz.
      }
      
      navigate('/portal/stoklar');
    } catch (err) {
      console.error(err);
      setError('İşlem sırasında bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="flex items-center gap-4 mb-6">
        <button className="btn btn-secondary" onClick={() => navigate(-1)} style={{ padding: '0.5rem' }}>
          <ArrowLeft size={20} />
        </button>
        <h2 style={{ fontSize: '1.8rem', margin: 0 }}>
          {isEditing ? 'Stok Düzenle' : 'Yeni Parça Ekle'}
        </h2>
      </div>

      {error && (
        <div className="badge badge-danger mb-4" style={{ display: 'block', padding: '1rem', fontSize: '1rem' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: '2rem' }}>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          
          {/* Sol Kolon */}
          <div>
            <h3 className="mb-4 text-primary" style={{ fontSize: '1.2rem' }}>Temel Bilgiler</h3>
            
            <div className="form-group" style={{ position: 'relative' }}>
              <label className="form-label flex justify-between items-center">
                <span>Parça Kodu *</span>
              </label>
              <input 
                type="text" 
                name="part_code" 
                value={formData.part_code} 
                onChange={(e) => { handleChange(e); setActiveDropdown('part_code'); }} 
                onFocus={() => setActiveDropdown('part_code')}
                onBlur={() => setTimeout(() => setActiveDropdown(null), 200)}
                className="form-input" 
                required 
                autoComplete="off"
              />
              {activeDropdown === 'part_code' && formData.part_code && allStocks && (
                <DropdownList 
                  items={allStocks.filter(s => s.part_code?.toLowerCase().includes(formData.part_code.toLowerCase())).slice(0, 5)} 
                  onSelect={handleSelectExisting} 
                />
              )}
            </div>

            <div className="form-group" style={{ position: 'relative' }}>
              <label className="form-label flex justify-between items-center">
                <span>Parça Adı *</span>
              </label>
              <input 
                type="text" 
                name="part_name" 
                value={formData.part_name} 
                onChange={(e) => { handleChange(e); setActiveDropdown('part_name'); }} 
                onFocus={() => setActiveDropdown('part_name')}
                onBlur={() => setTimeout(() => setActiveDropdown(null), 200)}
                className="form-input" 
                required={draftItems.length === 0}
                autoComplete="off"
              />
              {activeDropdown === 'part_name' && formData.part_name && allStocks && (
                <DropdownList 
                  items={allStocks.filter(s => s.part_name?.toLowerCase().includes(formData.part_name.toLowerCase())).slice(0, 5)} 
                  onSelect={handleSelectExisting} 
                />
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Kategori</label>
              <CreatableSelect
                isClearable
                isDisabled={isLoadingOptions}
                isLoading={isLoadingOptions}
                onChange={(newValue) => handleChange({ target: { name: 'category', value: newValue ? newValue.value : '', type: 'text' } })}
                onCreateOption={(val) => handleCreateOption(val, 'categories', setCategories, 'category')}
                options={categories}
                value={formData.category ? { value: formData.category, label: formData.category } : null}
                placeholder="Seçiniz veya yazıp Enter'a basınız..."
                formatCreateLabel={(inputValue) => `"${inputValue}" olarak yeni ekle`}
                styles={selectStyles}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Orijinal Parça Numarası</label>
              <CreatableSelect
                isClearable
                isDisabled={isLoadingOptions}
                isLoading={isLoadingOptions}
                onChange={(newValue) => handleChange({ target: { name: 'original_part_number', value: newValue ? newValue.value : '', type: 'text' } })}
                onCreateOption={(val) => handleCreateOption(val, 'original_part_numbers', setOriginalPartNumbers, 'original_part_number')}
                options={originalPartNumbers}
                value={formData.original_part_number ? { value: formData.original_part_number, label: formData.original_part_number } : null}
                placeholder="Seçiniz veya yazıp Enter'a basınız..."
                formatCreateLabel={(inputValue) => `"${inputValue}" olarak yeni ekle`}
                styles={selectStyles}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Marka</label>
              <CreatableSelect
                isClearable
                isDisabled={isLoadingOptions}
                isLoading={isLoadingOptions}
                onChange={(newValue) => handleChange({ target: { name: 'brand', value: newValue ? newValue.value : '', type: 'text' } })}
                onCreateOption={(val) => handleCreateOption(val, 'brands', setBrands, 'brand')}
                options={brands}
                value={formData.brand ? { value: formData.brand, label: formData.brand } : null}
                placeholder="Seçiniz veya yazıp Enter'a basınız..."
                formatCreateLabel={(inputValue) => `"${inputValue}" olarak yeni ekle`}
                styles={selectStyles}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Araç Markası</label>
              <CreatableSelect
                isClearable
                isDisabled={isLoadingOptions}
                isLoading={isLoadingOptions}
                onChange={(newValue) => handleChange({ target: { name: 'vehicle_brand', value: newValue ? newValue.value : '', type: 'text' } })}
                onCreateOption={(val) => handleCreateOption(val, 'vehicle_brands', setVehicleBrands, 'vehicle_brand')}
                options={vehicleBrands}
                value={formData.vehicle_brand ? { value: formData.vehicle_brand, label: formData.vehicle_brand } : null}
                placeholder="Seçiniz veya yazıp Enter'a basınız..."
                formatCreateLabel={(inputValue) => `"${inputValue}" olarak yeni ekle`}
                styles={selectStyles}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Açıklama</label>
              <textarea name="description" value={formData.description} onChange={handleChange} className="form-input" rows="3" style={{ resize: 'vertical' }}></textarea>
            </div>
            
            <div className="form-group">
              <label className="form-label">Tür</label>
              <select name="part_type" value={formData.part_type} onChange={handleChange} className="form-input">
                <option value="Orijinal">Orijinal</option>
                <option value="Muadil">Muadil</option>
              </select>
            </div>
          </div>

          {/* Sağ Kolon */}
          <div>
            <h3 className="mb-4 text-primary" style={{ fontSize: '1.2rem' }}>Envanter & Fiyat</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Miktar *</label>
                <input type="number" name="quantity" value={formData.quantity} onChange={handleChange} className="form-input" required={draftItems.length === 0} min="0" />
              </div>
              <div className="form-group">
                <label className="form-label">Min. Stok Uyarısı</label>
                <input type="number" name="min_stock_warning" value={formData.min_stock_warning} onChange={handleChange} className="form-input" min="0" />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Alış Fiyatı (₺)</label>
                <input type="number" name="buying_price" value={formData.buying_price} onChange={handleChange} className="form-input" min="0" step="0.01" />
              </div>
              <div className="form-group">
                <label className="form-label">İskonto (%)</label>
                <input type="number" name="discount" value={formData.discount} onChange={handleChange} className="form-input" min="0" step="0.01" />
              </div>
              <div className="form-group">
                <label className="form-label">KDV Oranı (%)</label>
                <input type="number" name="kdv_rate" value={formData.kdv_rate} onChange={handleChange} className="form-input" min="0" />
              </div>
              <div className="form-group">
                <label className="form-label text-success">Kâr Marjı (%)</label>
                <input type="number" name="margin" value={formData.margin} onChange={handleMarginChange} className="form-input" min="0" placeholder="Örn: 20" />
              </div>
              <div className="form-group">
                <label className="form-label">Satış Fiyatı (₺) *</label>
                <input type="number" name="price" value={formData.price} onChange={handleChange} className="form-input" required={draftItems.length === 0} min="0" step="0.01" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Raf Yeri (Örn: A-12-B)</label>
              <input type="text" name="shelf_location" value={formData.shelf_location} onChange={handleChange} className="form-input" style={{ fontFamily: 'monospace', fontSize: '1.1rem' }} />
            </div>

            <div className="form-group">
              <label className="form-label flex justify-between items-center">
                <span>Barkod</span>
                <div className="flex gap-2">
                  <button 
                    type="button" 
                    onClick={() => setScannerOpen(true)}
                    className="btn btn-secondary"
                    style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem', borderRadius: 'var(--radius-sm)' }}
                    title="Kamerayla Okut"
                  >
                    <Camera size={14} />
                  </button>
                  <button 
                    type="button" 
                    onClick={generateBarcode}
                    className="btn btn-secondary"
                    style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem', borderRadius: 'var(--radius-sm)' }}
                    title="Otomatik Barkod Oluştur"
                  >
                    <RefreshCw size={12} />
                    <span>Oluştur</span>
                  </button>
                </div>
              </label>
              <input 
                type="text" 
                name="barcode" 
                value={formData.barcode} 
                onChange={handleChange} 
                onBlur={(e) => handleCheckDuplicate('barcode', e.target.value)}
                onKeyDown={(e) => handleKeyDownCheck(e, 'barcode', e.target.value)}
                className="form-input" 
                placeholder="Okutun veya oluşturun..." 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Üretici / Marka (Açıklama Amaçlı)</label>
              <input type="text" name="supplier" value={formData.supplier} onChange={handleChange} className="form-input" placeholder="Örn: Bosch, Valeo..." />
            </div>
          </div>
        </div>
        {!isEditing && draftItems.length > 0 && (
          <div className="glass-panel mt-6 animate-fade-in" style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--color-border)' }}>
            <h3 className="mb-4 text-primary" style={{ fontSize: '1.4rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
              Fatura Özeti ({draftItems.length} Kalem)
            </h3>
            
            <div style={{ overflowX: 'auto', marginBottom: '2rem' }}>
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                    <th style={{ padding: '0.75rem', fontWeight: 'normal' }}>Ürün Adı / Kodu</th>
                    <th style={{ padding: '0.75rem', fontWeight: 'normal' }}>Miktar</th>
                    <th style={{ padding: '0.75rem', fontWeight: 'normal' }}>Birim Alış</th>
                    <th style={{ padding: '0.75rem', fontWeight: 'normal' }}>İskonto</th>
                    <th style={{ padding: '0.75rem', fontWeight: 'normal' }}>KDV</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 'normal' }}>Toplam</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center', width: '50px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {draftItems.map((item, idx) => {
                    const rawSub = (item.quantity || 0) * (item.buying_price || 0);
                    const sub = rawSub - (rawSub * ((item.discount || 0) / 100));
                    const kdv = sub * ((item.kdv_rate || 0) / 100);
                    const total = sub + kdv;
                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '1rem 0.75rem' }}>
                          <div className="font-bold">{item.part_name}</div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{item.part_code}</div>
                        </td>
                        <td style={{ padding: '1rem 0.75rem' }}>{item.quantity} Adet</td>
                        <td style={{ padding: '1rem 0.75rem' }}>₺{Number(item.buying_price).toFixed(2)}</td>
                        <td style={{ padding: '1rem 0.75rem' }}>%{item.discount || 0}</td>
                        <td style={{ padding: '1rem 0.75rem' }}>%{item.kdv_rate || 0}</td>
                        <td style={{ padding: '1rem 0.75rem', textAlign: 'right', fontWeight: 'bold' }}>₺{total.toFixed(2)}</td>
                        <td style={{ padding: '1rem 0.75rem', textAlign: 'center' }}>
                          <button type="button" className="btn btn-secondary" style={{ padding: '0.4rem', color: 'var(--color-danger)' }} onClick={() => setDraftItems(prev => prev.filter((_, i) => i !== idx))}>
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
              <div>
                <h4 style={{ margin: '0 0 1rem 0', color: 'var(--color-text)', fontSize: '1.1rem' }}>Muhasebe / Cari İşlemi</h4>
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <input 
                    type="checkbox" 
                    id="log_tx" 
                    name="log_transaction" 
                    checked={transaction.log_transaction} 
                    onChange={(e) => {
                      handleTransactionChange(e);
                      if (e.target.checked) {
                        const rawCurrent = ((formData.quantity || 0) * (formData.buying_price || 0));
                        const discountedCurrent = rawCurrent - (rawCurrent * ((formData.discount || 0) / 100));
                        const currentAmount = discountedCurrent * (1 + ((formData.kdv_rate || 0) / 100));
                        const draftAmount = draftItems.reduce((sum, item) => {
                      const raw = (item.quantity || 0) * (item.buying_price || 0);
                      const discounted = raw - (raw * ((item.discount || 0) / 100));
                      return sum + (discounted * (1 + ((item.kdv_rate || 0) / 100)));
                    }, 0);
                        setTransaction(prev => ({ ...prev, amount: currentAmount + draftAmount }));
                      }
                    }} 
                    style={{ width: '18px', height: '18px' }} 
                  />
                  <label htmlFor="log_tx" style={{ margin: 0, cursor: 'pointer', fontWeight: 'bold' }}>Bu faturayı muhasebeye (Cari / Çek) işle</label>
                </div>

                {transaction.log_transaction && (
                  <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Tedarikçi Seçin *</label>
                      <select name="supplier_id" value={transaction.supplier_id} onChange={handleTransactionChange} className="form-input" required={transaction.log_transaction}>
                        <option value="">-- Listeden Seçin --</option>
                        {suppliers.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div className="form-group">
                        <label className="form-label">İşlenecek Toplam (₺) *</label>
                        <input type="number" name="amount" value={transaction.amount} onChange={handleTransactionChange} className="form-input" min="0" step="0.01" required={transaction.log_transaction} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Ödeme Tipi *</label>
                        <select name="payment_method" value={transaction.payment_method} onChange={handleTransactionChange} className="form-input">
                          <option value="Veresiye">Veresiye</option>
                          <option value="Çek / Senet">Çek / Senet</option>
                          <option value="Nakit">Nakit</option>
                          <option value="Kredi Kartı">Kredi Kartı</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', color: 'var(--color-text-muted)' }}>
                    <span>Ara Toplam (İndirimsiz):</span>
                    <span>₺{draftItems.reduce((sum, item) => sum + ((item.quantity || 0) * (item.buying_price || 0)), 0).toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', color: 'var(--color-danger)' }}>
                    <span>İskonto Toplamı:</span>
                    <span>- ₺{draftItems.reduce((sum, item) => {
                      const raw = (item.quantity || 0) * (item.buying_price || 0);
                      return sum + (raw * ((item.discount || 0) / 100));
                    }, 0).toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', color: 'var(--color-text-muted)' }}>
                    <span>KDV Toplam:</span>
                    <span>₺{draftItems.reduce((sum, item) => {
                      const raw = (item.quantity || 0) * (item.buying_price || 0);
                      const discounted = raw - (raw * ((item.discount || 0) / 100));
                      return sum + (discounted * ((item.kdv_rate || 0) / 100));
                    }, 0).toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.4rem', fontWeight: 'bold', color: 'var(--color-primary)', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
                    <span>Genel Toplam:</span>
                    <span>₺{draftItems.reduce((sum, item) => {
                      const raw = (item.quantity || 0) * (item.buying_price || 0);
                      const discounted = raw - (raw * ((item.discount || 0) / 100));
                      return sum + (discounted * (1 + ((item.kdv_rate || 0) / 100)));
                    }, 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-4 mt-6" style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem' }}>
          {!isEditing && (
            <button type="button" className="btn btn-secondary" onClick={handleAddToList} style={{ marginRight: 'auto', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'var(--color-danger)' }}>
              <ListPlus size={18} />
              Listeye Ekle (Başka Ürün Gir)
            </button>
          )}
          <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>
            <X size={18} />
            İptal
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            <Save size={18} />
            {loading ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>

      </form>

      {/* Barcode Scanner Modal */}
      {scannerOpen && (
        <BarcodeScannerModal 
          onClose={() => setScannerOpen(false)}
          onScan={(code) => {
            setFormData(prev => ({ ...prev, barcode: code }));
            handleCheckDuplicate('barcode', code);
          }}
        />
      )}
    </div>
  );
}
