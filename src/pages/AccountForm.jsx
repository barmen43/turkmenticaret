import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Save, X, ArrowLeft, Users, Truck } from 'lucide-react';

export default function AccountForm() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isEditing = !!id;
  const passedType = searchParams.get('type') === 'musteri' ? 'Müşteri' : searchParams.get('type') === 'tedarikci' ? 'Tedarikçi' : 'Müşteri';

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    account_type: passedType,
    contact_name: '',
    phone: '',
    email: '',
    tax_office: '',
    tax_number: '',
    address: '',
    notes: ''
  });

  useEffect(() => {
    if (isEditing) {
      loadAccount();
    }
  }, [id]);

  const loadAccount = async () => {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      if (data) {
        setFormData(data);
      }
    } catch (err) {
      console.error("Hata:", err);
      alert("Cari bilgileri yüklenirken bir hata oluştu.");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isEditing) {
        const { error } = await supabase
          .from('accounts')
          .update({ ...formData, updated_at: new Date() })
          .eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('accounts')
          .insert([formData]);
        if (error) throw error;
      }

      navigate(formData.account_type === 'Müşteri' ? '/portal/musteriler' : '/portal/tedarikciler');
    } catch (err) {
      console.error("Kaydetme hatası:", err);
      alert("Cari kaydedilirken bir hata oluştu. " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const Icon = formData.account_type === 'Müşteri' ? Users : Truck;

  return (
    <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={() => navigate(-1)} 
          className="btn btn-secondary"
          style={{ padding: '0.5rem' }}
          title="Geri"
        >
          <ArrowLeft size={20} />
        </button>
        <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Icon size={28} className="text-primary" />
          {isEditing ? 'Cari Düzenle' : `Yeni ${formData.account_type} Ekle`}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: '2rem' }}>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
          {/* Sol Kolon */}
          <div>
            <h3 className="text-primary mb-4" style={{ fontSize: '1.1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
              Temel Bilgiler
            </h3>
            
            <div className="form-group">
              <label className="form-label">Cari Türü *</label>
              <select name="account_type" value={formData.account_type} onChange={handleChange} className="form-input" required>
                <option value="Müşteri">Müşteri</option>
                <option value="Tedarikçi">Tedarikçi</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Cari Unvanı / Firma Adı *</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} className="form-input" required />
            </div>

            <div className="form-group">
              <label className="form-label">Yetkili Kişi</label>
              <input type="text" name="contact_name" value={formData.contact_name} onChange={handleChange} className="form-input" />
            </div>

            <div className="form-group">
              <label className="form-label">Telefon</label>
              <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="form-input" />
            </div>

            <div className="form-group">
              <label className="form-label">E-posta</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} className="form-input" />
            </div>
          </div>

          {/* Sağ Kolon */}
          <div>
            <h3 className="text-primary mb-4" style={{ fontSize: '1.1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
              Fatura ve Adres Bilgileri
            </h3>
            
            <div className="form-group">
              <label className="form-label">Vergi Dairesi</label>
              <input type="text" name="tax_office" value={formData.tax_office} onChange={handleChange} className="form-input" />
            </div>

            <div className="form-group">
              <label className="form-label">Vergi / T.C. Kimlik Numarası</label>
              <input type="text" name="tax_number" value={formData.tax_number} onChange={handleChange} className="form-input" />
            </div>

            <div className="form-group">
              <label className="form-label">Açık Adres</label>
              <textarea name="address" value={formData.address} onChange={handleChange} className="form-input" rows="3"></textarea>
            </div>

            <div className="form-group">
              <label className="form-label">Notlar</label>
              <textarea name="notes" value={formData.notes} onChange={handleChange} className="form-input" rows="2"></textarea>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4 mt-4" style={{ paddingTop: '1.5rem', borderTop: '1px solid var(--color-border)' }}>
          <button type="button" onClick={() => navigate(-1)} className="btn btn-secondary">
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
