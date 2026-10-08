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
        <meta name="keywords" content="oto yedek parça, türkmenler ticaret, kütahya yedek parça, orjinal yedek parça, muadil parça, domaniç yedek parça" />
        
        {/* Open Graph / Social Media Sharing Tags */}
        <meta property="og:title" content="Türkmenler Ticaret | Oto Yedek Parça" />
        <meta property="og:description" content="Tüm marka ve model araçlarınız için orijinal ve garantili muadil yedek parça çözümleri." />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="tr_TR" />
        
        {/* Structured Data / Schema Markup for Local SEO */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "AutoPartsStore",
            "name": "Türkmenler Ticaret",
            "image": "https://wa.me/905336786579", // Can be replaced with actual domain logo later
            "telephone": "+905336786579",
            "address": {
              "@type": "PostalAddress",
              "streetAddress": "Hasantepe, Sanayi Caddesi No:8/D",
              "addressLocality": "Domaniç",
              "addressRegion": "Kütahya",
              "postalCode": "43850",
              "addressCountry": "TR"
            },
            "geo": {
              "@type": "GeoCoordinates",
              "latitude": 39.8000, // Placeholder, can be exact later
              "longitude": 29.6000 // Placeholder, can be exact later
            }
          })}
        </script>
      </Helmet>

      {/* Hero Section */}
      <section style={{ position: 'relative', padding: '6rem 2rem', overflow: 'hidden', minHeight: '80vh', display: 'flex', alignItems: 'center' }}>
        {/* Background glow effects */}
        <div style={{ position: 'absolute', top: '10%', left: '-10%', width: '50%', height: '50%', background: 'radial-gradient(circle, rgba(249,115,22,0.15) 0%, rgba(0,0,0,0) 70%)', zIndex: -1 }}></div>
        <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '50%', height: '50%', background: 'radial-gradient(circle, rgba(197,198,199,0.1) 0%, rgba(0,0,0,0) 70%)', zIndex: -1 }}></div>
        
        {/* Animated 3D Elements */}
        <div className="hide-on-mobile">
          <img src="/car.jpg" alt="3D Sports Car" className="animate-float" style={{ position: 'absolute', right: '5%', top: '15%', width: '45%', maxWidth: '650px', borderRadius: '30px', boxShadow: '0 30px 60px rgba(249,115,22,0.4)', zIndex: 0, opacity: 0.95, border: '2px solid rgba(255,255,255,0.1)' }} />
          <img src="/engine.jpg" alt="3D Engine" className="animate-float-reverse" style={{ position: 'absolute', right: '35%', bottom: '5%', width: '25%', maxWidth: '350px', borderRadius: '20px', boxShadow: '0 20px 40px rgba(0,0,0,0.6)', zIndex: 1, border: '2px solid rgba(255,255,255,0.1)' }} />
        </div>
        
        <div className="container" style={{ position: 'relative', zIndex: 2 }}>
          <motion.div 
            initial="hidden" 
            animate="visible" 
            variants={staggerContainer}
            style={{ maxWidth: '600px' }}
          >
            <motion.h1 variants={fadeInUp} style={{ fontSize: '4.5rem', lineHeight: '1.1', marginBottom: '1.5rem', textShadow: '0 4px 20px rgba(0,0,0,0.6)' }}>
              Aracınız İçin <br/><span className="text-primary" style={{ fontSize: '5rem', display: 'inline-block', transform: 'rotate(-2deg)' }}>Doğru Parça</span>
            </motion.h1>
            <motion.p variants={fadeInUp} className="text-muted" style={{ fontSize: '1.25rem', marginBottom: '2.5rem', maxWidth: '500px', background: 'rgba(11,12,16,0.6)', padding: '1.5rem', borderRadius: '15px', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.05)' }}>
              Türkmenler Ticaret olarak yılların tecrübesiyle, tüm marka ve model araçlarınız için orijinal ve garantili muadil yedek parça temin ediyoruz.
            </motion.p>
            <motion.div variants={fadeInUp} className="flex gap-4">
              <a href="https://wa.me/905336786579" target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ padding: '1.2rem 2.5rem', fontSize: '1.2rem', borderRadius: '30px', background: '#25D366', boxShadow: '0 0 15px rgba(37,211,102,0.4)' }}>WhatsApp'tan Ulaşın</a>
              <a href="#hizmetler" className="btn btn-secondary" style={{ padding: '1.2rem 2.5rem', fontSize: '1.2rem', borderRadius: '30px' }}>Neler Yapıyoruz?</a>
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
              <motion.div variants={fadeInUp} className="glass-panel p-4 animate-float" style={{ padding: '2rem', textAlign: 'center', animationDelay: '0s' }}>
                <div style={{ background: 'rgba(249, 115, 22, 0.1)', padding: '1.5rem', borderRadius: '50%', display: 'inline-block', marginBottom: '1.5rem' }}>
                  <ShieldCheck size={40} className="text-primary" />
                </div>
                <h3 style={{ marginBottom: '1rem', fontSize: '1.5rem' }}>Garantili Parçalar</h3>
                <p className="text-muted">Hem orijinal hem de birinci sınıf muadil parçalarımızla uzun ömürlü kullanım garantisi sunuyoruz.</p>
              </motion.div>

              <motion.div variants={fadeInUp} className="glass-panel p-4 animate-float-reverse" style={{ padding: '2rem', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                <img src="/tools.jpg" alt="Tools" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.2, zIndex: 0 }} />
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ background: 'rgba(249, 115, 22, 0.1)', padding: '1.5rem', borderRadius: '50%', display: 'inline-block', marginBottom: '1.5rem', backdropFilter: 'blur(5px)' }}>
                    <Settings size={40} className="text-primary" />
                  </div>
                  <h3 style={{ marginBottom: '1rem', fontSize: '1.5rem' }}>Geniş Stok Ağı</h3>
                  <p className="text-muted" style={{ fontWeight: '500' }}>Aradığınız parçayı bekletmeden teslim edebilmek için sürekli güncellenen güçlü bir stok altyapımız var.</p>
                </div>
              </motion.div>

              <motion.div variants={fadeInUp} className="glass-panel p-4 animate-float" style={{ padding: '2rem', textAlign: 'center', animationDelay: '1s' }}>
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
                  <p style={{ fontSize: '1.1rem', fontWeight: '500' }}>Hasantepe, Sanayi Caddesi No:8/D, 43850 Domaniç/Kütahya</p>
                </div>
              </motion.div>
            </div>

            {/* Google Map */}
            <div style={{ flex: '1 1 400px', minHeight: '400px', position: 'relative' }}>
              <iframe 
                src="https://maps.google.com/maps?q=Hasantepe,+sanayi+caddesi+no:8/D,+43850+Domani%C3%A7/K%C3%BCtahya&t=&z=15&ie=UTF8&iwloc=&output=embed"
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
