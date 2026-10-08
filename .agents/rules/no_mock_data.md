# No Mock Data Rule

- Asla testlerde veya uygulama akışlarında sahte (mock) veri kullanmayın. 
- Playwright veya benzeri E2E testleri yazarken `page.route` veya benzeri ağ isteklerini kesecek/mocklayacak yapılar kullanmaktan kesinlikle kaçının.
- Testlerin gerçek veritabanı uç noktalarına hit etmesini ve uygulamanın canlı sistem üzerinden doğrulanmasını sağlayın.
- Kullanıcı izni olmadan veya açıkça talep edilmeden asla test amacıyla sahte sunucu, sahte JWT veya sahte veri listesi döndüren yapılar kurmayın.
