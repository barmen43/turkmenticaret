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


export const printCollectionReceipt = (tx, account, currentBalance, options = {}) => {
  const {
    companyName = "TÜRKMEN TİCARET",
    logoUrl = "/logo.png",
  } = options;

  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  document.body.appendChild(iframe);
  
  const absBalance = Math.abs(currentBalance);
  const balanceText = currentBalance > 0 ? (account.account_type === 'Müşteri' ? 'Alacaklı' : 'Borçlu') : 
                     currentBalance < 0 ? (account.account_type === 'Müşteri' ? 'Borçlu' : 'Alacaklı') : 'Bakiye Yok';

  const txTypeLabel = tx.transaction_type === 'Alacak' ? 'Tahsilat Makbuzu' : 'Ödeme Makbuzu';

  const content = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          @page { margin: 0; size: 80mm auto; }
          body { 
            font-family: 'Courier New', Courier, monospace; 
            width: 72mm; 
            margin: 0 auto; 
            padding: 4mm 0; 
            color: black; 
            font-size: 13px; 
            background: white;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .line { border-bottom: 1px dashed black; margin: 8px 0; }
          table { width: 100%; border-collapse: collapse; margin: 5px 0; }
          th, td { text-align: left; padding: 3px 0; }
          .right { text-align: right; }
          img { 
            max-width: 100%; 
            height: auto; 
            max-height: 80px; 
            margin-bottom: 5px; 
            object-fit: contain; 
            filter: grayscale(100%) contrast(200%); /* Termal yazıcılar için yüksek kontrast ve siyah beyaz */
          }
          .title { font-size: 18px; margin: 10px 0; font-weight: bold; text-decoration: underline; }
        </style>
      </head>
      <body>
        <div class="center">
          ${logoUrl ? `<img src="${logoUrl}" alt="Logo" onerror="this.style.display='none'" />` : ''}
          <div class="bold" style="font-size: 18px;">${companyName}</div>
          <div class="title">${txTypeLabel}</div>
        </div>
        
        <div class="line"></div>
        
        <table>
          <tr>
            <td>Tarih:</td>
            <td class="right">${new Date(tx.transaction_date || tx.created_at).toLocaleDateString('tr-TR')}</td>
          </tr>
          <tr>
            <td>İşlem No:</td>
            <td class="right">${tx.id ? tx.id.substring(0, 8) : '-'}</td>
          </tr>
          <tr>
            <td colspan="2" style="padding-top: 8px;">${account.account_type}:</td>
          </tr>
          <tr>
            <td colspan="2" class="bold">${account.name}</td>
          </tr>
        </table>
        
        <div class="line"></div>
        
        <table>
          <tr>
            <td style="font-size: 14px;">TUTAR:</td>
            <td class="right bold" style="font-size: 16px;">₺${Number(tx.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
          </tr>
          <tr>
            <td>Ödeme Tipi:</td>
            <td class="right">${tx.payment_method || 'Belirtilmedi'}</td>
          </tr>
          <tr>
            <td colspan="2" style="padding-top: 5px; font-size: 11px;">Açıklama: ${tx.description || '-'}</td>
          </tr>
        </table>
        
        <div class="line"></div>
        
        <table>
          <tr>
            <td colspan="2" class="center" style="padding-bottom: 5px;">GÜNCEL HESAP DURUMU</td>
          </tr>
          <tr>
            <td class="bold">Kalan Bakiye:</td>
            <td class="right bold">₺${Number(absBalance).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
          </tr>
          <tr>
            <td>Durum:</td>
            <td class="right">${balanceText}</td>
          </tr>
        </table>

        <div class="line"></div>
        
        <div class="center" style="margin-top: 15px; font-size: 11px;">
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
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);
  };
};
