---
title: User Guide
category: User Documentation
order: 4
last_updated: 2026-08-12
owner: Product Team
---

# User Guide — LocInsight

> **Tujuan**: Panduan penggunaan setiap menu di LocInsight untuk user baru maupun manajemen.
>
> **Purpose**: How-to guide for every menu in LocInsight.

## Quick Start

1. **Buka app**: https://locinsights.bayhaqy.my.id
2. **Pilih bahasa**: Klik flag 🇬🇧/🇮🇩 di kanan atas
3. **Install sebagai app** (opsional): Klik "Install App" prompt → Add to Home Screen
4. **Mulai dari Dashboard** untuk overview, atau pilih menu di sidebar kiri

---

## Menu 1: Dashboard 📊

**Apa**: Overview high-level metrics untuk seluruh Bali.

**Cara pakai**:
- Lihat kartu statistik: total kelurahan, total stores, total malls
- Lihat top 10 opportunities (kelurahan dengan composite score tertinggi)
- Klik salah satu kelurahan → otomatis navigasi ke Deep Analysis

**Untuk manajemen**: Dashboard cocok untuk eksekutif yang ingin quick glance.

---

## Menu 2: Map Explorer 🗺️

**Apa**: Peta interaktif Bali dengan semua data points.

**Cara pakai**:
- **Single click** pada titik merah (kelurahan) → pilih kelurahan, lihat panel analisis di kanan
- **Double-click di mana saja** (tidak harus di titik merah) → analisis kelurahan terdekat + tampilkan popup verdict (cocok/tidak cocok)
- Toggle layer di kanan atas:
  - `Show opportunities` — titik kelurahan berwarna sesuai composite score
  - `Show stores` — ikon toko MAP/MAA
  - `Show malls` — ikon mal
  - `Show competitors` — titik kompetitor
  - `Show POIs` — ikon POI
  - `Choropleth: Demographics` — peta warna demografi (population, income, tourism, dll)
- **Use My Location** (tombol GPS kanan atas) → center map ke lokasi GPS Anda
- **Clear selection** (tombol merah) → hapus pilihan, tampilkan semua data di tabel
- Tabel "All Indicators — Combined Table" di bawah menunjukkan semua kelurahan + filter + sort + export CSV

**Tips**:
- Double-click di area kosong akan otomatis pilih kelurahan terdekat (tidak ada batas jarak)
- Popup hasil double-click auto-clear setelah 6 detik
- Kolom tabel bisa di-filter per-kolom (klik kotak filter di bawah header)

**Untuk manajemen**: Tunjukkan peta ini saat meeting untuk visual context.

---

## Menu 3: Opportunities 🎯

**Apa**: Ranking kelurahan berdasarkan composite score.

**Cara pakai**:
- Sort by composite score, revenue potential, market share, dll
- Filter by tier (1/2/3) atau recommendation (high_priority, priority, monitor, avoid)
- Filter by kabupaten
- Klik kelurahan → navigasi ke Deep Analysis

---

## Menu 4: Deep Analysis 🔍

**Apa**: Analisis mendalam untuk satu kelurahan terpilih.

**Cara pakai**:
- Pilih kelurahan dari dropdown atau dari Map/Opportunities
- Lihat:
  - Composite score breakdown per faktor (population, income, tourism, dll)
  - Map area dengan trade-area radius 2 km
  - Stores + competitors + malls + POI dalam trade area
  - Market share estimation (Huff model)
  - Revenue projection (GBR ML model)
  - Cannibalization risk
  - Recommendation + reasoning

**Untuk manajemen**: Halaman ini adalah "decision support" untuk go/no-go expansion.

---

## Menu 5: Brands 🏪

**Apa**: Katalog brand MAP/MAA + lokasi gerai.

**Cara pakai**:
- Filter by parent (MAP/MAA) atau category (F&B, sports, fashion, dll)
- Klik brand → lihat semua gerai brand tersebut di Bali
- Lihat coverage map: area dengan gerai brand vs area tanpa gerai (white space)

---

## Menu 6: Mall Network 🏢

**Apa**: Network mal + tenant analysis.

**Cara pakai**:
- Klik mal → lihat detail (GLA, visitor estimate, anchor tenants)
- Lihat tenant list per mal
- Identifikasi mal dengan brand gap (mal yang belum ada brand MAP tertentu)

---

## Menu 7: Competitor Intel 🛡️

**Apa**: Intelligence kompetitor.

**Cara pakai**:
- Lihat density map kompetitor per kelurahan
- Filter by brand kompetitor (Indomaret, Alfamart, Starbucks, dll)
- "Scrape more" → navigasi ke Scraper untuk tarik data OSM terbaru

---

## Menu 8: A/B Simulator ⚖️

**Apa**: Simulasi A/B test antara 2 lokasi atau 2 asumsi.

**Cara pakai**:
- Pilih kelurahan A dan kelurahan B (atau same kelurahan dengan asumsi berbeda)
- Set assumptions (population override, traffic adjustment, dll)
- Klik "Run simulation" → lihat perbandingan revenue, market share, ROI

---

## Menu 9: ML/AI Engine 🧠

**Apa**: Train dan inference model ML (Gradient-Boosted Regression).

**Cara pakai**:
- **Predict tab**: Pilih kelurahan → lihat prediksi revenue dari model GBR
- **Train tab**: Re-train model dengan data terbaru (butuh 30-60 detik)
- **Clusters tab**: Lihat hasil clustering kelurahan (k-means, 6 clusters)
- **Feature importance**: Lihat fitur mana yang paling berpengaruh

**Catatan**: Model ML dilatih dari output heuristic engine + log-normal noise. Prediksi adalah **directional guidance**, bukan forecast presisi.

---

## Menu 10: Mall Tenants 🏬

**Apa**: Analisis tenant per mal.

**Cara pakai**:
- Pilih mal → lihat semua tenant
- Filter by category
- Identifikasi brand gap (category yang belum ada di mal tersebut)

---

## Menu 11: Reports 📄

**Apa**: Generate report PDF/CSV untuk meeting/audit.

**Cara pakai**:
- Pilih report type (executive summary, detailed analysis, data export)
- Set date range
- Klik "Generate" → download

---

## Menu 12: Data Manager 🗃️

**Apa**: Manajemen data master (CRUD).

**Cara pakai**:
- Pilih tabel (stores, malls, brands, kelurahan, dll)
- View as table or card
- Add new row (klik "+ Add")
- Edit row (klik pencil icon)
- Delete row (klik trash icon)
- Filter + sort + search
- Export to CSV/Excel

**Untuk admin**: Hanya user dengan akses admin yang bisa edit data.

---

## Menu 13: Data Scraper 🔎

**Apa**: Scrape data gerai dari OpenStreetMap.

**Cara pakai**:
- Pilih mode: `keyword` (free-text search) atau `brand` (sweep 27 kompetitor)
- Set location filter:
  - All Bali, atau
  - Pilih Kabupaten → Kecamatan → Kelurahan (cascading dropdown)
- Klik "Start scrape" → tunggu hasil
- Review hasil di panel kanan:
  - Setiap row ada badge klasifikasi (MAP/MAA/competitor/unknown)
  - Multi-select rows yang ingin disimpan
  - Klik "Save selected" → data masuk ke staging table
- Review di Data Manager → approve → pindah ke master table

**Catatan**: Scraping memakai OpenStreetMap Overpass API (free, rate-limited). Untuk batch besar, gunakan di jam off-peak.

---

## Menu 14: Methodology 📚

**Apa**: Penjelasan metodologi scoring (faktor, bobot, formula).

**Sudah ada di Documentation → Calculations & Formulas** (menu ini bisa dianggap ringkasan).

---

## Menu 15: About ℹ️

**Apa**: Informasi app, versi, kontak developer, download APK.

---

## Menu 16: Settings ⚙️

**Apa**: Konfigurasi scoring weights + bahasa + AI chat.

**Cara pakai**:
- **Scoring weights**: Slider untuk 6 faktor (population, income, tourism, accessibility, competition, density). Total harus 100%. Perubahan langsung mempengaruhi composite score di seluruh app.
- **Language**: EN/ID toggle
- **AI Chat**: Set ZAI API key untuk AI chat (opsional)

---

## Menu 17: Documentation 📖

**Apa**: Dokumentasi lengkap (halaman ini).

**Cara pakai**:
- **Sidebar kiri**: Navigasi antar dokumen
- **Search bar**: Cari kata di semua dokumen
- **Table of Contents (TOC)**: Navigasi cepat antar section di dokumen saat ini
- **Edit mode**: Klik "Edit" untuk mengedit markdown langsung (lihat panduan di bawah)
- **Export**: Klik "Print/PDF" untuk export dokumen ke PDF

### Editing Documentation

1. Klik tombol "Edit" di kanan atas
2. Editor markdown terbuka (split-pane: editor kiri, preview kanan)
3. Edit konten markdown
4. Klik "Save" → simpan ke localStorage (draft)
5. Klik "Publish" → simpan ke API (perlu admin access)
6. Klik "Cancel" → batalkan perubahan

**Format markdown yang didukung**: GitHub-Flavored Markdown (GFM)
- Headings (#, ##, ###)
- Bold (**text**), italic (*text*), strikethrough (~~text~~)
- Lists (-, 1.)
- Links ([text](url))
- Images (![alt](url))
- Tables (| col1 | col2 |)
- Code blocks (```lang ... ```)
- Blockquotes (> text)
- Horizontal rule (---)

---

## FAQ

### Q: Seberapa akurat composite score?
**A**: Composite score adalah **estimasi** berdasarkan 6 faktor dengan bobot yang dapat dikonfigurasi. Akurasi ±15% dibanding actual store performance. Untuk validasi, bandingkan dengan store performance MAP yang sudah ada.

### Q: Apakah data kompetitor real-time?
**A**: Data kompetitor di-scrape dari OpenStreetMap Overpass API on-demand. Setiap kali Anda klik "Scrape" di Data Scraper, data terbaru diambil. OSM data di-update oleh komunitas global, jadi mungkin ada delay 1-7 hari dari perubahan sebenarnya di lapangan.

### Q: Bisakah saya export semua data untuk audit?
**A**: Ya. Setiap tabel di Data Manager dan Map Explorer punya tombol "Export CSV". Untuk export massal (semua tabel sekaligus), hubungi https://bayhaqy.my.id.

### Q: Bagaimana cara melaporkan data yang salah?
**A**: Email https://bayhaqy.my.id dengan subject `[DATA CORRECTION]` dan sertakan: nama tabel, ID record, field yang salah, nilai yang benar, sumber verifikasi.

### Q: Bisakah scoring weights diubah permanen?
**A**: Ya, di Settings page. Perubahan tersimpan di database dan berlaku untuk semua user. Hanya admin yang bisa ubah weights.

### Q: Berapa sering data di-refresh?
**A**: Lihat tab "Data Sources" untuk refresh cadence setiap dataset. Singkatnya:
- Static data (Bali admin, brands, malls, POI): Annual/quarterly
- Live data (competitor stores): On-demand via Scraper
- ML model: On-demand via ML Engine

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + K` | Focus search (di Documentation) |
| `Esc` | Close editor / cancel search |
| `?` | Show this help (di Map Explorer) |

---

## Mobile Usage

LocInsight adalah PWA (Progressive Web App). Cara install di Android:
1. Buka https://locinsights.bayhaqy.my.id di Chrome Android
2. Menu (⋮) → "Install app"
3. LocInsight muncul di app drawer, full-screen

Atau download APK langsung: https://locinsights.bayhaqy.my.id/locinsights.apk

---

## Untuk Bantuan / For Support

- **Website**: https://bayhaqy.my.id
- **Data questions**: https://bayhaqy.my.id
- **Developer**: Achmad Bayhaqy — https://bayhaqy.my.id
