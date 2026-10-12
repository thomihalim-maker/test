# Mengganti gambar (aset) secara manual

Semua gambar di *Bintang Kecil* digambar oleh kode. Setiap gambar punya **nama file tetap**. Kalau kamu
menaruh file PNG dengan nama itu di folder `assets/custom/`, game akan **memakai gambarmu** sebagai pengganti
gambar bawaan. Kode tidak perlu diubah.

## Langkah singkat

1. **Lihat daftar gambar.** Buka `assets/export/index.html` di browser. Isinya semua gambar yang bisa
   diganti, lengkap dengan nama file, ukuran (lebar×tinggi) dan scene tempat gambar itu dipakai.
   - Folder ini dibuat oleh perintah `node tools/assets.mjs export` (lihat bagian "Perintah"). Kamu juga bisa
     memakai paket zip ekspor yang dikirim lewat chat.
2. **Salin** file yang mau diubah ke `assets/custom/`. **Nama file harus persis sama**, misalnya
   `moon84.png`, `l2-basket_back_red.png` atau `chr3-mom-hijab.png`.
3. **Edit** gambarnya di aplikasi apa saja (Photoshop, Procreate, Krita, Canva, ChatGPT, dan lainnya):
   - **Proporsi** (perbandingan lebar:tinggi) harus tetap sama dengan aslinya, karena gambar akan
     di-*stretch* ke ukuran aslinya. Resolusinya bebas: 2× atau 3× lebih besar justru membuat gambar
     lebih tajam di HP.
   - Bagian yang **transparan** harus tetap transparan (simpan sebagai PNG dengan alpha), supaya posisi
     gambar tidak bergeser.
   - Jangan memotong (crop) atau menggeser isi gambar di dalam kanvasnya. Titik tumpu animasi mengikuti
     posisi aslinya.
4. **Daftarkan** dengan perintah `node tools/assets.mjs sync`. Perintah ini membuat
   `assets/custom/manifest.json` dan menampilkan file mana yang aktif (✓) dan mana yang tidak dikenali (✗).
5. **Jalankan** game seperti biasa (versi source, misalnya `npx serve .`), lalu muat ulang halamannya. Untuk
   versi rilis, jalankan `npm run build:web` (gambarmu ikut tertanam di `dist/web/index.html`), lalu
   `node tools/build-pc-lite.mjs` untuk versi PC.

Untuk **kembali ke gambar bawaan**, hapus file dari `assets/custom/` lalu jalankan `sync` lagi.

## Gambar yang paling berguna untuk diganti

| Nama file | Isi |
|---|---|
| `portrait-photo-510x340.png` | **Foto keluarga yang jadi gambar jigsaw di level 3.** Bisa diganti foto atau gambar apa pun, dengan proporsi 3:2. |
| `portrait-photo-390x280.png` | Foto keluarga di kartu level menu |
| `chr3-mom-*`, `chr3-dad-*`, `chr3-baby-*` | Bagian tubuh karakter: kepala, hijab, rambut, mata, mulut, baju, dan lainnya |
| `l1-*` | Level 1: kamar, jendela, boks bayi, barang-barang, siluet |
| `l2-*` | Level 2: ruang bermain, keranjang, mainan |
| `l3-*` | Level 3: dinding, bingkai, lemari |
| `hill*`, `cloud*`, `moon*`, `star*`, `titlePlate*`, `levelcard*` | Menu dan latar belakang |
| `btn*`, `banner*`, `curtain*` | Tombol, banner "Hebat!", tirai transisi |

## Yang tidak bisa diganti lewat cara ini

- **Lengan dan tangan karakter** digambar langsung setiap frame supaya bisa bergerak luwes, jadi tidak ada
  file PNG-nya. Bagian tubuh lain (kepala, baju, hijab, rambut) bisa diganti.
- **Teks dan huruf** yang ditulis langsung dengan font. Judul "Bintang Kecil" dan "Hebat!" berupa gambar,
  jadi bisa diganti.
- **Partikel kecil** (confetti, bintang) bisa diganti, tapi ukurannya kecil sekali.
- **Suara** dibuat oleh kode, tidak memakai file audio.

## Perintah

```bash
cd puzzle
npm install                              # sekali saja
node tools/assets.mjs export             # semua gambar asli → assets/export/ (+ index.html, catalog.json)
node tools/assets.mjs export --ratio 3   # sama, dengan resolusi lebih tinggi (default 2)
node tools/assets.mjs sync               # daftarkan isi assets/custom/ → manifest.json
npm run build:web                        # build web dengan gambarmu
node tools/build-pc-lite.mjs             # build PC (Windows, Mac, Linux) dengan gambarmu
```

## Cara kerja (untuk developer)

- Semua sprite yang dibuat dengan `key` (`svgSprite`, `canvasSprite`, `makeSprite`) dicatat di
  `spriteRegistry` dan dicek ke `overrides` (lihat `src/engine/raster.js`).
- Nama file = `key` dengan karakter selain huruf, angka, `-` dan `_` diganti `_`, lalu ditambah `.png`.
- `loadOverrides()` berjalan sebelum scene pertama dimuat. Sumbernya `window.__ASSET_OVERRIDES` (build web)
  atau `assets/custom/manifest.json` (versi source). Parameter URL `?noassets` mematikan semua penggantian.
