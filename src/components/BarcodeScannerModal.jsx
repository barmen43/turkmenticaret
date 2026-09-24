import React, { useEffect, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, Camera } from 'lucide-react';

export default function BarcodeScannerModal({ onClose, onScan }) {
  const [error, setError] = useState('');
  const [isStarted, setIsStarted] = useState(false);
  
  useEffect(() => {
    let html5QrCode;

    const startScanner = async () => {
      html5QrCode = new Html5Qrcode("reader");
      
      try {
        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 15,
            formatsToSupport: [
              Html5QrcodeSupportedFormats.EAN_13,
              Html5QrcodeSupportedFormats.EAN_8,
              Html5QrcodeSupportedFormats.CODE_128,
              Html5QrcodeSupportedFormats.CODE_39,
              Html5QrcodeSupportedFormats.UPC_A,
              Html5QrcodeSupportedFormats.UPC_E,
              Html5QrcodeSupportedFormats.QR_CODE
            ]
          },
          (decodedText, decodedResult) => {
            // Başarılı okuma
            html5QrCode.stop().then(() => {
              onScan(decodedText);
              onClose();
            }).catch(err => {
              // Hata olursa da yine de kapat
              onScan(decodedText);
              onClose();
            });
          },
          (errorMessage) => {
            // Sürekli tarama hatalarını yoksay
          }
        );
        setIsStarted(true);
      } catch (err) {
        console.error("Kamera başlatılamadı:", err);
        setError("Kamera başlatılamadı. Lütfen tarayıcınızın kamera izni verdiğinden emin olun.");
      }
    };

    startScanner();

    return () => {
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch(console.error);
      }
    };
  }, [onClose, onScan]);

  return (
    <div className="modal-overlay" style={{ zIndex: 9999 }}>
      <div className="modal-content" style={{ maxWidth: '400px', width: '100%', margin: '1rem', background: '#fff', color: '#000', overflow: 'hidden' }}>
        <div className="modal-header" style={{ borderBottom: '1px solid #eee', background: '#f9f9f9', color: '#333' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#333', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Camera size={20} />
            Barkod Okut
          </h3>
          <button className="modal-close" onClick={onClose} style={{ color: '#333' }}>
            <X size={24} />
          </button>
        </div>
        
        <div className="modal-body" style={{ padding: '0', background: '#000', minHeight: '300px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {error ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#ff4444', background: '#fff' }}>
              {error}
            </div>
          ) : (
            <div style={{ position: 'relative', width: '100%' }}>
              <div id="reader" style={{ width: '100%', border: 'none' }}></div>
              {!isStarted && !error && (
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'white', textAlign: 'center' }}>
                  Kamera açılıyor...
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
