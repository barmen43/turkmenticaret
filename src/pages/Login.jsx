import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Wrench } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);
      await signIn(email, password);
      navigate('/portal');
    } catch (err) {
      setError('Giriş başarısız. Lütfen bilgilerinizi kontrol edin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center" style={{ minHeight: '100vh', padding: '1rem' }}>
      <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '400px', padding: '2rem' }}>
        <div className="text-center mb-6">
          <div className="flex items-center justify-center mb-4">
            <div style={{ background: 'var(--color-primary)', padding: '1rem', borderRadius: '50%', boxShadow: '0 0 20px rgba(249, 115, 22, 0.4)' }}>
              <Wrench size={32} color="white" />
            </div>
          </div>
          <h2 style={{ marginBottom: '0.5rem' }}>Sistem Girişi</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Yetkili personel paneli</p>
        </div>

        {error && (
          <div className="badge badge-danger mb-4 text-center" style={{ display: 'block', padding: '0.75rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">E-Posta Adresi</label>
            <input
              type="email"
              className="form-input"
              placeholder="ornek@turkmenticaret.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Şifre</label>
            <input
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', marginTop: '1rem' }}
            disabled={loading}
          >
            {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>
      </div>
    </div>
  );
}
