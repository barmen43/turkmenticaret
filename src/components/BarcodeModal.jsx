import React, { useRef, useState } from 'react';
import { X, Printer } from 'lucide-react';
import Barcode from 'react-barcode';
import { useReactToPrint } from 'react-to-print';

export default function BarcodeModal({ stock, onClose }) {
  const componentRef = useRef();
  
  // Sbarco T4De+ için genel etiket boyutları (milimetre cinsinden)
  // Örneğin 80x40mm, 50x30mm, vs.
  const [labelSize, setLabelSize] = useState('50x30');

  const isReceipt = labelSize === '80mm-receipt';

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `${stock.part_code}-yazdir`,
    pageStyle: `
      @page {
        size: ${isReceipt ? '80mm auto' : `${labelSize.split('x')[0]}mm ${labelSize.split('x')[1]}mm`};
        margin: 0;
      }
      @media print {
        body { margin: 0; padding: 0; }
        .print-container {
          width: ${isReceipt ? '80mm' : `${labelSize.split('x')[0]}mm`} !important;
          height: ${isReceipt ? 'auto' : `${labelSize.split('x')[1]}mm`} !important;
          overflow: hidden;
          display: flex !important;
          flex-direction: column !important;
          ${isReceipt ? '' : 'justify-content: center !important;'}
          align-items: center !important;
          page-break-after: always;
          font-family: sans-serif;
        }
      }
    `,
  });

  if (!stock) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h3 style={{ margin: 0, fontSize: '1.4rem' }}>Barkod Yazdır</h3>
          <button className="modal-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>
        
        <div className="modal-body">
          <div className="form-group mb-4">
            <label className="form-label">Etiket Boyutu (Genişlik x Yükseklik)</label>
            <select 
              className="form-input" 
              value={labelSize} 
              onChange={(e) => setLabelSize(e.target.value)}
              style={{ backgroundColor: 'var(--color-bg)' }}
            >
              <option value="40x20">40x20 mm (Etiket)</option>
              <option value="50x30">50x30 mm (Standart Etiket)</option>
              <option value="60x40">60x40 mm (Etiket)</option>
              <option value="80x40">80x40 mm (Etiket)</option>
              <option value="100x50">100x50 mm (Etiket)</option>
              <option value="80mm-receipt">80 mm (Zywell / Termal Fiş)</option>
            </select>
          </div>

          <div style={{ 
            backgroundColor: '#ffffff', 
            padding: '1rem', 
            borderRadius: 'var(--radius-md)', 
            marginBottom: '1.5rem',
            display: 'flex',
            justifyContent: 'center'
          }}>
            {/* Bu div yazdırılacak olan alandır */}
            <div 
              ref={componentRef} 
              className="print-container"
              style={{
                width: isReceipt ? '80mm' : `${labelSize.split('x')[0]}mm`,
                height: isReceipt ? 'auto' : `${labelSize.split('x')[1]}mm`,
                backgroundColor: 'white',
                color: 'black',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: isReceipt ? 'flex-start' : 'center',
                alignItems: 'center',
                padding: isReceipt ? '15mm 5mm 5mm 5mm' : '2mm',
                boxSizing: 'border-box',
                border: '1px dashed #ccc' // Görsel referans için, yazıcıda normalde sınır olmaz
              }}
            >
              {isReceipt ? (
                // 80mm Zywell Fiş Tasarımı
                <div style={{ width: '100%', textAlign: 'center', paddingBottom: '10mm' }}>
                  <h2 style={{ margin: '0 0 10px 0', fontSize: '18px', borderBottom: '1px solid black', paddingBottom: '5px' }}>TÜRKMEN TİCARET</h2>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', margin: '10px 0', textTransform: 'uppercase' }}>
                    {stock.brand ? `${stock.brand} - ` : ''}{stock.part_name}
                  </div>
                  <div style={{ fontSize: '12px', marginBottom: '15px' }}>
                    <strong>Parça Kodu:</strong> {stock.part_code}
                    {stock.original_part_number && <div><strong>Orijinal No:</strong> {stock.original_part_number}</div>}
                    {stock.vehicle_brand && <div><strong>Araç:</strong> {stock.vehicle_brand}</div>}
                    {stock.shelf_location && <div><strong>Raf:</strong> {stock.shelf_location}</div>}
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
                    <Barcode 
                      value={stock.part_code || stock.barcode || 'NO-CODE'} 
                      width={1.5} 
                      height={40} 
                      fontSize={14}
                      margin={0}
                      displayValue={true}
                    />
                  </div>

                  <div style={{ fontSize: '16px', fontWeight: 'bold', marginTop: '10px', borderTop: '1px dashed black', paddingTop: '10px' }}>
                    Fiyat: ₺{stock.price ? stock.price.toLocaleString('tr-TR') : '0,00'}
                  </div>
                  <div style={{ fontSize: '10px', marginTop: '15px', color: '#555' }}>
                    Yazdırılma: {new Date().toLocaleString('tr-TR')}
                  </div>
                </div>
              ) : (
                // Standart Sbarco Etiket Tasarımı
                <>
                  <div style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '2px', textAlign: 'center', width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {stock.brand ? `${stock.brand} - ` : ''}{stock.part_name}
                  </div>
                  
                  <Barcode 
                    value={stock.part_code || stock.barcode || 'NO-CODE'} 
                    width={1.2} 
                    height={labelSize.split('x')[1] > 30 ? 40 : 25} 
                    fontSize={12}
                    margin={0}
                    displayValue={true}
                  />

                  {stock.shelf_location && (
                    <div style={{ fontSize: '10px', marginTop: '2px', fontWeight: 'bold' }}>
                      Raf: {stock.shelf_location}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button className="btn btn-secondary" onClick={onClose}>İptal</button>
            <button className="btn btn-primary" onClick={handlePrint}>
              <Printer size={18} />
              <span>Yazdır</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
