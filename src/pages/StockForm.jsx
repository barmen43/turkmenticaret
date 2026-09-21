import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Save, X, ArrowLeft } from 'lucide-react';
import CreatableSelect from 'react-select/creatable';

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
  const [error, setError] = useState('');
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
    part_type: 'Orijinal'
  });

  useEffect(() => {
    if (isEditing) {
      loadStock();
    }
    loadOptions();
  }, [id]);

  const loadOptions = async () => {
    setIsLoadingOptions(true);
    
    const [catRes, opnRes, brandRes, vbRes] = await Promise.all([
      supabase.from('categories').select('name').order('name'),
      supabase.from('original_part_numbers').select('name').order('name'),
      supabase.from('brands').select('name').order('name'),
      supabase.from('vehicle_brands').select('name').order('name')
    ]);

    if (!catRes.error && catRes.data) setCategories(catRes.data.map(c => ({ value: c.name, label: c.name })));
    if (!opnRes.error && opnRes.data) setOriginalPartNumbers(opnRes.data.map(c => ({ value: c.name, label: c.name })));
    if (!brandRes.error && brandRes.data) setBrands(brandRes.data.map(c => ({ value: c.name, label: c.name })));
    if (!vbRes.error && vbRes.data) setVehicleBrands(vbRes.data.map(c => ({ value: c.name, label: c.name })));

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
        part_type: data.part_type || 'Orijinal'
      });
    }
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isEditing) {
        const { error: updateError } = await supabase
          .from('stocks')
          .update({ ...formData, updated_at: new Date().toISOString() })
          .eq('id', id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('stocks')
          .insert([formData]);
        if (insertError) throw insertError;
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
            
            <div className="form-group">
              <label className="form-label">Parça Kodu *</label>
              <input type="text" name="part_code" value={formData.part_code} onChange={handleChange} className="form-input" required />
            </div>

            <div className="form-group">
              <label className="form-label">Parça Adı *</label>
              <input type="text" name="part_name" value={formData.part_name} onChange={handleChange} className="form-input" required />
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
                <input type="number" name="quantity" value={formData.quantity} onChange={handleChange} className="form-input" required min="0" />
              </div>
              <div className="form-group">
                <label className="form-label">Min. Stok Uyarısı</label>
                <input type="number" name="min_stock_warning" value={formData.min_stock_warning} onChange={handleChange} className="form-input" min="0" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Birim Fiyatı (₺) *</label>
              <input type="number" name="price" value={formData.price} onChange={handleChange} className="form-input" required min="0" step="0.01" />
            </div>

            <div className="form-group">
              <label className="form-label">Raf Yeri (Örn: A-12-B)</label>
              <input type="text" name="shelf_location" value={formData.shelf_location} onChange={handleChange} className="form-input" style={{ fontFamily: 'monospace', fontSize: '1.1rem' }} />
            </div>

            <div className="form-group">
              <label className="form-label">Barkod</label>
              <input type="text" name="barcode" value={formData.barcode} onChange={handleChange} className="form-input" />
            </div>

            <div className="form-group">
              <label className="form-label">Tedarikçi Firma</label>
              <input type="text" name="supplier" value={formData.supplier} onChange={handleChange} className="form-input" />
            </div>
          </div>
          
        </div>

        <div className="flex justify-end gap-4 mt-6" style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem' }}>
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
    </div>
  );
}
