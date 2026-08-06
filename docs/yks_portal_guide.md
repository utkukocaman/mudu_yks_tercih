# 📘 YKS Veri Analitiği Portalı (2015-2025) Kullanım ve Mimari Rehberi

**Proje Klasörü:** `projects/yks_analytics_portal/`  
**Sürüm:** v1.0.0 (5S Standart Yapısı)

---

## 📁 5S Proje Dizin Yapısı

```
projects/yks_analytics_portal/
├── docs/                      # Proje dökümantasyonu ve kullanım rehberleri
│   └── yks_portal_guide.md
├── designs/                   # Tasarım varlıkları ve stil şablonları
│   ├── industrial/            # 3D & Fiziksel ürün tasarım modelleri
│   └── ui_ux/                 # UI/UX CSS tokenları ve arayüz şablonları
├── src/                       # Kaynak kodlar (HTML, CSS, JS)
│   ├── index.html
│   ├── styles.css
│   ├── app.js
│   └── yks_data.js
├── ai/                        # Veri analizi prompt kütükleri ve LLM testleri
└── workflow_state.json        # Ajanlar arası iş akışı takip dosyası
```

---

## ⚡ Yerel Sunucu Çalıştırma

Projenin `src/` klasöründeki dosyaları canlı çalıştırmak için terminal üzerinden şu komutu çalıştırabilirsiniz:

```bash
cd "d:\Antigravity Projects\Byakuya\projects\yks_analytics_portal\src"
python -m http.server 8080
```

Tarayıcı adresi: **http://localhost:8080**
