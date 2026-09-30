import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, Camera } from 'lucide-react';

export default function BarcodeScannerModal({ onClose, onScan }) {
  const [error, setError] = useState('');
  const [isStarted, setIsStarted] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const scannerRef = useRef(null);
  const startPromiseRef = useRef(null);
  
  useEffect(() => {
    let isMounted = true;
    let html5QrCode = null;

    // React Strict Mode'un neden olduğu anlık çift yüklemeyi atlatmak için
    // başlatmayı kısa bir süre geciktiriyoruz.
    const initTimeout = setTimeout(() => {
      if (!isMounted) return;

      // Her ihtimale karşı içini temizleyelim
      const readerElement = document.getElementById("reader");
      if (readerElement) {
        readerElement.innerHTML = '';
      }

      html5QrCode = new Html5Qrcode("reader");
      scannerRef.current = html5QrCode;

      const startScanner = async () => {
        try {
          startPromiseRef.current = html5QrCode.start(
            { facingMode: "environment" },
            {
              fps: 30,
              qrbox: { width: 250, height: 150 },
              aspectRatio: 1.0,
              // Removed advanced zoom constraints because they cause OverconstrainedError 
              // on many devices, forcing a fallback to the front camera.
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
            (decodedText) => {
              if (isMounted) {
                handleScanSuccess(decodedText);
              }
            },
            (errorMessage) => {}
          );

          await startPromiseRef.current;
          
          if (isMounted) {
            setIsStarted(true);
          }
        } catch (err) {
          if (isMounted) {
            console.error("Kamera başlatılamadı:", err);
            setError("Kamera başlatılamadı. Lütfen tarayıcınızın kamera izni verdiğinden emin olun.");
          }
        }
      };

      startScanner();
    }, 150);

    return () => {
      isMounted = false;
      clearTimeout(initTimeout);

      if (startPromiseRef.current && html5QrCode) {
        startPromiseRef.current.then(() => {
          if (html5QrCode.isScanning) {
            html5QrCode.stop().then(() => {
              html5QrCode.clear();
            }).catch(() => {});
          } else {
            html5QrCode.clear();
          }
        }).catch(() => {});
      } else if (html5QrCode) {
        try { html5QrCode.clear(); } catch(e) {}
      }
    };
  }, []);

  const handleScanSuccess = (decodedText) => {
    if (isClosing) return;
    setIsClosing(true);
    
    // Okuma başarılı olunca hemen sesi/titreşimi verdirmek iyi olabilir
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(100);
    }

    const forceClose = setTimeout(() => {
      onScan(decodedText);
      onClose();
    }, 500);

    if (scannerRef.current && scannerRef.current.isScanning) {
      scannerRef.current.stop().then(() => {
        clearTimeout(forceClose);
        onScan(decodedText);
        onClose();
      }).catch(() => {
        clearTimeout(forceClose);
        onScan(decodedText);
        onClose();
      });
    } else {
      clearTimeout(forceClose);
      onScan(decodedText);
      onClose();
    }
  };

  const handleManualClose = () => {
    if (isClosing) return;
    setIsClosing(true);

    const forceClose = setTimeout(() => onClose(), 500);

    if (scannerRef.current && scannerRef.current.isScanning) {
      scannerRef.current.stop().then(() => {
        clearTimeout(forceClose);
        onClose();
      }).catch(() => {
        clearTimeout(forceClose);
        onClose();
      });
    } else {
      clearTimeout(forceClose);
      onClose();
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 9999 }}>
      <div className="modal-content" style={{ maxWidth: '400px', width: '100%', margin: '1rem', background: '#fff', color: '#000', overflow: 'hidden' }}>
        <div className="modal-header" style={{ borderBottom: '1px solid #eee', background: '#f9f9f9', color: '#333' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#333', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Camera size={20} />
            Barkod Okut
          </h3>
          <button className="modal-close" onClick={handleManualClose} style={{ color: '#333' }} disabled={isClosing}>
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
              <div id="reader" style={{ width: '100%', border: 'none', opacity: isClosing ? 0.5 : 1 }}></div>
              {(!isStarted || isClosing) && !error && (
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'white', textAlign: 'center', background: 'rgba(0,0,0,0.5)', padding: '0.5rem 1rem', borderRadius: '4px' }}>
                  {isClosing ? 'Kapatılıyor...' : 'Kamera açılıyor...'}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
