import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { HelmetProvider } from 'react-helmet-async';
import { queryClient, asyncStoragePersister } from './lib/queryClient';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import PublicLayout from './components/PublicLayout';
import Home from './pages/public/Home';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Stocks from './pages/Stocks';
import StockForm from './pages/StockForm';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HelmetProvider>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister: asyncStoragePersister, maxAge: 1000 * 60 * 60 * 24 * 7 }}
      >
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              {/* Public Website Routes */}
              <Route path="/" element={<PublicLayout />}>
                <Route index element={<Home />} />
              </Route>

              {/* Hidden Admin Login */}
              <Route path="/portal-giris" element={<Login />} />
              
              {/* Protected Admin Routes (moved to /portal) */}
              <Route path="/portal" element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }>
                <Route index element={<Dashboard />} />
                <Route path="stoklar" element={<Stocks />} />
                <Route path="yeni-stok" element={<StockForm />} />
                <Route path="stok-duzenle/:id" element={<StockForm />} />
              </Route>
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </PersistQueryClientProvider>
    </HelmetProvider>
  </StrictMode>,
);
