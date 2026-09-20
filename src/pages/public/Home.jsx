import React from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Phone, MapPin, Settings, Wrench, ShieldCheck } from 'lucide-react';

export default function Home() {
  const fadeInUp = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2 }
    }
  };

  return (
    <>
      <Helmet>
        <title>Türkmenler Ticaret | Oto Yedek Parça ve Güvenilir Hizmet</title>
        <meta name="description" content="Orijinal ve muadil oto yedek parça çözümleri. Türkmenler Ticaret olarak motor, mekanik, kaporta ve tüm araç parçaları ihtiyaçlarınızda Kütahya'da hizmetinizdeyiz." />
        <meta name="keywords" content="oto yedek parça, türkmenler ticaret, kütahya yedek parça, orjinal yedek parça, muadil parça" />
      </Helmet>

      {/* Hero Section */}
      <section style={{ position: 'relative', padding: '6rem 2rem', overflow: 'hidden', minHeight: '80vh', display: 'flex', alignItems: 'center' }}>
        {/* Background glow effects */}
        <div style={{ position: 'absolute', top: '10%', left: '-10%', width: '50%', height: '50%', background: 'radial-gradient(circle, rgba(249,115,22,0.15) 0%, rgba(0,0,0,0) 70%)', zIndex: -1 }}></div>
        <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '50%', height: '50%', background: 'radial-gradient(circle, rgba(197,198,199,0.1) 0%, rgba(0,0,0,0) 70%)', zIndex: -1 }}></div>
        
        <div className="container">
          <motion.div 
            initial="hidden" 
            animate="visible" 
            variants={staggerContainer}
            style={{ maxWidth: '800px' }}
          >
            <motion.h1 variants={fadeInUp} style={{ fontSize: '3.5rem', lineHeight: '1.2', marginBottom: '1.5rem' }}>
              Aracınız İçin <span className="text-primary">Doğru Parça</span>,<br/>Güvenilir Hizmet.
            </motion.h1>
            <motion.p variants={fadeInUp} className="text-muted" style={{ fontSize: '1.25rem', marginBottom: '2.5rem', maxWidth: '600px' }}>
              Türkmenler Ticaret olarak yılların tecrübesiyle, tüm marka ve model araçlarınız için orijinal ve garantili muadil yedek parça temin ediyoruz.
            </motion.p>
            <motion.div variants={fadeInUp} className="flex gap-4">
              <a href="#iletisim" className="btn btn-primary" style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>Bizimle İletişime Geçin</a>
              <a href="#hizmetler" className="btn btn-secondary" style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>Hizmetlerimiz</a>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features / Services Section */}
      <section id="hizmetler" style={{ padding: '5rem 0', background: 'rgba(31,40,51,0.3)' }}>
        <div className="container">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp} className="text-center mb-6">
              <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Neden Bizi Seçmelisiniz?</h2>
              <p className="text-muted" style={{ maxWidth: '600px', margin: '0 auto' }}>Sektördeki tecrübemiz ve geniş stok ağımızla aracınızın ihtiyaçlarını anında çözüyoruz.</p>
            </motion.div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginTop: '4rem' }}>
              <motion.div variants={fadeInUp} className="glass-panel p-4" style={{ padding: '2rem', textAlign: 'center' }}>
                <div style={{ background: 'rgba(249, 115, 22, 0.1)', padding: '1.5rem', borderRadius: '50%', display: 'inline-block', marginBottom: '1.5rem' }}>
                  <ShieldCheck size={40} className="text-primary" />
                </div>
                <h3 style={{ marginBottom: '1rem', fontSize: '1.5rem' }}>Garantili Parçalar</h3>
                <p className="text-muted">Hem orijinal hem de birinci sınıf muadil parçalarımızla uzun ömürlü kullanım garantisi sunuyoruz.</p>
              </motion.div>

              <motion.div variants={fadeInUp} className="glass-panel p-4" style={{ padding: '2rem', textAlign: 'center' }}>
                <div style={{ background: 'rgba(249, 115, 22, 0.1)', padding: '1.5rem', borderRadius: '50%', display: 'inline-block', marginBottom: '1.5rem' }}>
                  <Settings size={40} className="text-primary" />
                </div>
                <h3 style={{ marginBottom: '1rem', fontSize: '1.5rem' }}>Geniş Stok Ağı</h3>
                <p className="text-muted">Aradığınız parçayı bekletmeden teslim edebilmek için sürekli güncellenen güçlü bir stok altyapımız var.</p>
              </motion.div>

              <motion.div variants={fadeInUp} className="glass-panel p-4" style={{ padding: '2rem', textAlign: 'center' }}>
                <div style={{ background: 'rgba(249, 115, 22, 0.1)', padding: '1.5rem', borderRadius: '50%', display: 'inline-block', marginBottom: '1.5rem' }}>
                  <Wrench size={40} className="text-primary" />
                </div>
                <h3 style={{ marginBottom: '1rem', fontSize: '1.5rem' }}>Uzman Destek</h3>
                <p className="text-muted">Doğru parça seçimi konusunda deneyimli ekibimizle teknik destek ve danışmanlık sağlıyoruz.</p>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="iletisim" style={{ padding: '6rem 0' }}>
        <div className="container">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={staggerContainer}
            className="glass-panel" 
            style={{ padding: '0', display: 'flex', flexWrap: 'wrap', overflow: 'hidden' }}
          >
            {/* Contact Info */}
            <div style={{ flex: '1 1 400px', padding: '4rem', background: 'var(--color-surface)' }}>
              <motion.h2 variants={fadeInUp} style={{ fontSize: '2.5rem', marginBottom: '2rem' }}>İletişim Bilgileri</motion.h2>
              <motion.p variants={fadeInUp} className="text-muted mb-6">Parça sorgulamak veya stok durumu öğrenmek için bize hemen ulaşabilirsiniz.</motion.p>
              
              <motion.div variants={fadeInUp} className="flex items-center gap-4 mb-6">
                <div style={{ background: 'rgba(249, 115, 22, 0.1)', padding: '1rem', borderRadius: '50%' }}>
                  <Phone size={24} className="text-primary" />
                </div>
                <div>
                  <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Müşteri Temsilcisi (Asım Bey)</p>
                  <a href="tel:+905336786579" style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--color-text)' }}>+90 533 678 65 79</a>
                </div>
              </motion.div>

              <motion.div variants={fadeInUp} className="flex items-center gap-4">
                <div style={{ background: 'rgba(249, 115, 22, 0.1)', padding: '1rem', borderRadius: '50%' }}>
                  <MapPin size={24} className="text-primary" />
                </div>
                <div>
                  <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Adres</p>
                  <p style={{ fontSize: '1.1rem', fontWeight: '500' }}>Tavşanlı, Kütahya, Türkiye</p>
                </div>
              </motion.div>
            </div>

            {/* Google Map */}
            <div style={{ flex: '1 1 400px', minHeight: '400px', position: 'relative' }}>
              <iframe 
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3092.3654522923985!2d29.594492876690497!3d39.79296837154564!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x14c94750a2646d45%3A0x9e8aece2487797e0!2zVMO8cmttZW5sZXIgVGljYXJldA!5e0!3m2!1str!2str!4v1700000000000!5m2!1str!2str" 
                width="100%" 
                height="100%" 
                style={{ border: 0, position: 'absolute', top: 0, left: 0, filter: 'invert(90%) hue-rotate(180deg)' }} 
                allowFullScreen="" 
                loading="lazy" 
                referrerPolicy="no-referrer-when-downgrade"
                title="Türkmenler Ticaret Konum"
              ></iframe>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
}
