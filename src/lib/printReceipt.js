export const printReceipt = (saleData, itemsData, options = {}) => {
  const {
    companyName = "TÜRKMEN TİCARET",
    logoUrl = "/logo.png", // public klasöründeki logo.png
  } = options;

  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  document.body.appendChild(iframe);
  
  const content = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          @page { margin: 0; size: 80mm auto; }
          body { 
            font-family: 'Courier New', Courier, monospace; 
            width: 72mm; /* 80mm kağıdın yazdırılabilir alanı */
            margin: 0 auto; 
            padding: 4mm 0; 
            color: black; 
            font-size: 12px; 
            background: white;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .line { border-bottom: 1px dashed black; margin: 5px 0; }
          table { width: 100%; border-collapse: collapse; }
          th, td { text-align: left; padding: 2px 0; }
          .right { text-align: right; }
          .product-name { font-size: 11px; margin-bottom: 2px; }
          img { max-width: 100%; height: auto; max-height: 80px; margin-bottom: 5px; object-fit: contain; }
        </style>
      </head>
      <body>
        <div class="center">
          ${logoUrl ? `<img src="${logoUrl}" alt="Logo" onerror="this.style.display='none'" />` : ''}
          <div class="bold" style="font-size: 16px;">${companyName}</div>
          <div style="margin-top: 4px;">Tarih: ${new Date(saleData.created_at).toLocaleString('tr-TR')}</div>
          <div>Fiş No: ${saleData.id.split('-')[0]}</div>
          <div>Müşteri: ${saleData.customerName || 'Perakende'}</div>
        </div>
        
        <div class="line"></div>
        
        <table>
          <thead>
            <tr>
              <th>Ürün</th>
              <th class="right">Tutar</th>
            </tr>
          </thead>
          <tbody>
            ${itemsData.map(item => `
              <tr>
                <td colspan="2" class="product-name">${item.name}</td>
              </tr>
              <tr>
                <td style="padding-bottom: 4px;">${item.quantity}x ₺${Number(item.unit_price).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
                <td class="right" style="padding-bottom: 4px;">₺${Number(item.total_price).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="line"></div>
        
        <table>
          <tr>
            <td class="bold">ARA TOPLAM:</td>
            <td class="right bold">₺${Number(saleData.total_amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
          </tr>
          <tr>
            <td class="bold" style="font-size: 14px;">ÖDENECEK:</td>
            <td class="right bold" style="font-size: 14px;">₺${Number(saleData.total_amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
          </tr>
          <tr>
            <td>ÖDEME TİPİ:</td>
            <td class="right">${saleData.payment_method}</td>
          </tr>
        </table>
        
        <div class="line"></div>
        
        <div class="center" style="margin-top: 10px; font-size: 11px;">
          Mali değeri yoktur. Bilgi fişidir.<br/>
          Bizi tercih ettiğiniz için teşekkür ederiz.
        </div>
      </body>
    </html>
  `;
  
  iframe.contentDocument.write(content);
  iframe.contentDocument.close();
  
  iframe.onload = () => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    // Yazdırma penceresi kapandıktan sonra iframe'i temizle
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);
  };
};
