# Marbot Masjid — Panduan Deploy

> **English summary** is at the bottom of this file.

Marbot Masjid adalah game web statis: HTML + ES modules + three.js r170, tanpa bundler dan tanpa server.
Semua aset dibuat secara prosedural, jadi game **bisa dimainkan offline** (PWA dengan service worker) dan
bisa dibungkus menjadi aplikasi **Android** dengan Capacitor.

| Perintah (di folder `game/`) | Fungsi |
|---|---|
| `npm run serve` | Menjalankan versi sumber (source) di http://localhost:8123 |
| `npm run build` | Membuat build produksi di `game/dist/` lalu memeriksanya (`verify`) |
| `npm run serve:dist` | Menjalankan hasil build di http://localhost:8124 |
| `npm run smoke` | Uji end-to-end hasil build di Chromium headless (butuh Playwright) |
| `npm run icons` | Membuat ulang ikon aplikasi di `game/icons/` (butuh Playwright) |
| `npm run cap:add` / `cap:sync` / `cap:open` | Proyek Android (Capacitor) |

Build **tidak butuh `npm install`**: `tools/build.mjs` dan `tools/verify-dist.mjs` hanya memakai modul bawaan Node.js (Node 22+).
`npm install` hanya diperlukan untuk Capacitor (Android).

---

## 1. Menjalankan secara lokal

```bash
cd game
npm run serve            # atau: python3 -m http.server 8123
```

Buka http://localhost:8123. Game **harus** dibuka lewat `http://`, bukan langsung dari file (`file://`),
karena browser memblokir ES modules dari file lokal.

Versi sumber tidak memasang service worker (versinya `dev`), jadi perubahan kode langsung terlihat setelah reload.

## 2. Build produksi

```bash
cd game
npm run build            # = node tools/build.mjs && node tools/verify-dist.mjs
npm run serve:dist       # cek hasilnya di http://localhost:8124
```

Isi `game/dist/`:

- `index.html` — dengan layar loading, pesan jika WebGL tidak didukung, panel error, tag PWA/Open Graph,
  `<link rel="modulepreload">` untuk semua modul (memuat lebih cepat), dan nomor versi.
- `boot.js` — loader, penanganan error, registrasi service worker, tombol back Android.
- `src/**` — kode game apa adanya (tidak di-minify supaya tetap mudah dibaca), **tanpa** halaman tes (`*.html`) dan file `_*`.
- `vendor/**` — **hanya** file three.js yang benar-benar di-import (13 dari 134 file, ±1,3 MB dari ±8,7 MB).
  Daftar ini dihitung otomatis dari import graph, jadi addon baru yang di-import di `src/` ikut terbawa.
- `icons/`, `manifest.webmanifest`, `sw.js` (daftar precache lengkap + nama cache berversi), `version.json`, `.nojekyll`.
- `LICENSES.txt` (lisensi MIT three.js + rujukan ke lisensi font Nunito) dan `privacy.html` (kebijakan privasi, ID/EN).
- File di `src/` yang ikut hanya `.js`, `.css`, `.woff2`, `.txt`, `.json`, plus file lain yang benar-benar dirujuk kode
  (`new URL('x.png', import.meta.url)` atau `url()` di CSS). Gambar referensi/coretan yang ditaruh di `src/` tidak ikut
  ter-deploy; build menulis catatan `note: ... is not shipped` untuk file seperti itu.

Semua URL relatif, jadi `dist/` bisa ditaruh di root domain maupun di sub-folder (mis. `https://user.github.io/test/`).

**Versi**: `version` di `package.json` + hash commit git pendek, mis. `1.0.0+4d8b5b0`. Versi tampil di pojok layar loading,
di `<meta name="marbot-version">`, di `window.MARBOT_VERSION`, dan di `dist/version.json`.
Nama cache service worker juga memuat hash isi build, jadi setiap perubahan file pasti memicu update.

Variabel opsional saat build:

- `SITE_URL=https://thomihalim-maker.github.io/test/` — membuat `og:image`/`og:url` absolut (pratinjau link di WhatsApp dll.).
  Workflow GitHub Pages mengisinya otomatis.
- `MARBOT_VERSION=1.2.0-beta` — mengganti label versi.

`tools/verify-dist.mjs` memeriksa tanpa browser bahwa setiap import modul, target import map, ikon manifest,
dan entri precache ada di dalam `dist/`, semua path relatif, tidak ada import dari internet, dan semua file JS lolos cek sintaks.

## 3. Deploy ke GitHub Pages (otomatis)

Workflow: `.github/workflows/deploy-pages.yml`.

Workflow ini hanya men-deploy **branch default** repo (yang tertulis di Settings → General → *Default branch*).
Environment `github-pages` yang dibuat otomatis oleh GitHub juga hanya menerima deploy dari branch default.

> **Kondisi repo saat ini:** belum ada branch `main`, dan branch default-nya `claude/magical-maxwell-x1c0hw`
> (branch kerja lama). GitHub Pages juga belum aktif. Jadi lakukan pengaturan di bawah ini dulu.

**Pengaturan sekali saja:**

1. Buat branch `main` dari branch yang berisi versi game terbaru (mis. `claude/fervent-pasteur-ul6vkk`):
   di GitHub buka tab **Code → Branches → New branch**, nama `main`, sumber branch tersebut
   (atau di komputer: `git push origin claude/fervent-pasteur-ul6vkk:main`).
2. **Settings → General → Default branch** → klik ikon panah ⇄ → pilih **`main`** → *Update*.
3. **Settings → Pages → Build and deployment → Source** → pilih **GitHub Actions**.
4. Deploy pertama: tab **Actions** → **Deploy game to GitHub Pages** → **Run workflow** (branch `main`).

Setelah itu, setiap **push/merge ke `main`** yang mengubah file game (`game/**`, kecuali dokumen `*.md`, alat
pengembang di `game/tools/` selain `build.mjs`/`modgraph.mjs`, halaman tes, dan `capacitor.config.json`) akan:
checkout → setup Node 22 → `node tools/build.mjs` → verifikasi → upload `game/dist` → deploy.
Push yang hanya mengubah README/dokumen tidak membuat versi baru, jadi pemain tidak perlu mengunduh ulang game.

Alamat game: **https://thomihalim-maker.github.io/test/**
Cek versi yang sedang online: https://thomihalim-maker.github.io/test/version.json
(file ini selalu diambil dari jaringan, tidak dari cache service worker).

Push ke branch lain (mis. `claude/...`) memang memicu workflow, tapi job-nya langsung dilewati (*skipped*);
gabungkan (merge) ke `main` dulu. Jika suatu saat branch default diganti, branch default yang baru-lah yang di-deploy.
Pull request menjalankan `.github/workflows/ci.yml` (build + verifikasi) dan menyediakan hasil build sebagai artifact
`marbot-masjid-dist` yang bisa diunduh.

Custom domain (opsional): isi di Settings → Pages → Custom domain. Tidak ada yang perlu diubah di kode karena semua path relatif.

## 4. Hosting statis lain

Semua hosting statis bisa dipakai; tidak perlu header khusus.

- **Netlify**: buka https://app.netlify.com/drop lalu seret folder `game/dist`.
  Atau hubungkan repo dengan *Base directory* `game`, *Build command* `node tools/build.mjs`, *Publish directory* `game/dist`.
- **Vercel**: `npx vercel deploy game/dist --prod`, atau project dengan *Root Directory* `game`,
  *Build Command* `node tools/build.mjs`, *Output Directory* `dist`, *Framework* "Other".
- **Cloudflare Pages**: sama seperti Netlify (build `node tools/build.mjs`, output `dist`, root `game`).
  Cloudflare mengalihkan `/index.html` ke `/` (308); service worker sudah menangani pengalihan ini.
- **itch.io**:
  1. `npm run build`, lalu zip **isi** folder `dist` (bukan foldernya), sehingga `index.html` ada di root zip:
     `cd game/dist && zip -r ../marbot-masjid-web.zip .`
  2. Di itch.io: *Kind of project* → **HTML**, upload zip, centang **This file will be played in the browser**.
  3. Embed: 1280×720, centang **Mobile friendly** dan **Fullscreen button**.

Saran cache (opsional): `sw.js` dan `index.html` sebaiknya tidak di-cache lama oleh CDN
(`Cache-Control: no-cache`) supaya update cepat sampai. GitHub Pages sudah memakai cache pendek (10 menit).

## 5. Android (APK/AAB) dengan Capacitor

`capacitor.config.json` sudah siap (`appId: id.marbotmasjid.game`, `appName: Marbot Masjid`, `webDir: dist`).
Paket Capacitor 8 sudah tercatat di `devDependencies`, tapi **belum di-install** di repo ini.

**Yang dibutuhkan:** Node.js 22+, [Android Studio](https://developer.android.com/studio) versi terbaru
(sudah termasuk Android SDK dan JDK 21), dan HP Android (mode developer + USB debugging) atau emulator.

Langkah pertama kali:

```bash
cd game
npm install              # memasang @capacitor/core, @capacitor/cli, @capacitor/android
npm run cap:add          # build web + membuat folder game/android/
npm run cap:open         # membuka proyek di Android Studio
```

Di Android Studio:

1. Tunggu *Gradle sync* selesai.
2. Pilih perangkat/emulator lalu klik **Run ▶** untuk mencoba.
3. Ikon aplikasi: klik kanan `app/res` → **New → Image Asset** → *Launcher Icons (Adaptive and Legacy)*,
   pilih `game/icons/icon-maskable-512.png` sebagai *Foreground* (atau jalankan `npx @capacitor/assets generate`
   jika paket itu dipasang).
4. Rilis: **Build → Generate Signed App Bundle / APK** → pilih **Android App Bundle (AAB)** untuk Play Store
   (atau **APK** untuk dibagikan langsung) → buat *keystore* baru dan **simpan baik-baik** (jangan di-commit;
   sudah ada di `.gitignore`) → pilih *release*.
5. Upload AAB ke Google Play Console. Karena target pemainnya anak-anak, isi bagian *Target audience and content*
   (program *Families*). Game ini tidak memakai internet, iklan, akun, maupun mengumpulkan data, sehingga
   formulir *Data safety* dapat diisi "tidak ada data yang dikumpulkan".
   **Wajib untuk aplikasi anak: URL kebijakan privasi** (*App content → Privacy policy*). Build sudah menyertakan
   `privacy.html`, jadi setelah GitHub Pages aktif pakai: https://thomihalim-maker.github.io/test/privacy.html
   (periksa isinya dulu dan tambahkan kontak pengembang jika perlu; saat ini kontaknya halaman *Issues* repo).
6. Lisensi pihak ketiga ada di `LICENSES.txt` (ikut di dalam APK/AAB dan di situs web).

Setiap kali kode game berubah:

```bash
npm run cap:sync         # build web + salin ke android/
```

lalu Run/Build ulang di Android Studio. Folder `game/android/` sebaiknya di-commit (hasil build-nya sudah di-ignore).

Catatan Android:

- Di dalam aplikasi, file game dibaca langsung dari APK, jadi service worker sengaja **tidak** dipasang.
- **Debug di HP**: build *debug* dari Android Studio bisa diperiksa lewat `chrome://inspect` di Chrome desktop
  (bawaan Capacitor). Build *release* tidak bisa, dan itu memang disengaja.
- **Tombol Back** (opsional): `npm install @capacitor/app && npm run cap:sync`. Setelah itu tombol Back menutup panel
  yang terbuka, dan menekan Back dua kali akan meminimalkan aplikasi. Tanpa plugin ini, Back langsung keluar
  (progres tetap tersimpan karena game menyimpan saat aplikasi disembunyikan).
- Orientasi bebas (portrait/landscape). Untuk mengunci, tambahkan `android:screenOrientation="sensorLandscape"`
  pada `<activity>` di `android/app/src/main/AndroidManifest.xml`.
- Versi aplikasi Android diatur di `android/app/build.gradle` (`versionCode` harus naik setiap rilis, `versionName` mis. `1.0.1`).

## 6. Memperbarui versi

1. Naikkan `version` di `game/package.json` (mis. `1.0.0` → `1.0.1`).
2. Commit, lalu merge/push ke `main` (branch default) → GitHub Pages ter-deploy otomatis.
3. Pemain yang sudah pernah membuka game akan melihat pesan kecil **"Versi baru tersedia — Muat ulang"**.
   Jika diabaikan, versi baru aktif otomatis saat game dibuka lagi berikutnya.
   (Versi lama tidak pernah dicampur dengan versi baru di tengah permainan.)
4. Android: `npm run cap:sync`, naikkan `versionCode`/`versionName`, build AAB baru.

## 7. Di mana data simpanan (save) disimpan?

- Progres disimpan di **`localStorage`** browser dengan kunci **`marbot.save`** (otomatis tiap 10 detik,
  saat tab/aplikasi disembunyikan, dan saat halaman ditutup/di-reload).
- `localStorage` terikat pada **origin** (domain). Pindah domain (mis. dari GitHub Pages ke Netlify) berarti mulai dari awal.
  Di GitHub Pages, origin-nya `https://thomihalim-maker.github.io` (dipakai bersama proyek Pages lain milik akun yang sama;
  kunci `marbot.save` cukup unik).
- Menghapus data situs/riwayat browser, atau *Clear data*/uninstall aplikasi Android, juga menghapus progres.
- Tombol **Hapus Progres** di Pengaturan game menghapus kunci tersebut lalu memuat ulang game. Setelah save dihapus,
  halaman itu tidak akan menulisnya lagi (sebelumnya save lama tertulis kembali saat reload; `boot.js` dan `main.js`
  kini mencegahnya).
- **iPhone/iPad (Safari)**: Safari bisa menghapus data situs yang tidak dibuka selama 7 hari. Supaya progres aman,
  sarankan pemain memakai **Bagikan → Tambah ke Layar Utama** (*Add to Home Screen*) dan bermain dari ikon itu.
  Di browser lain game meminta penyimpanan permanen (`navigator.storage.persist()`) setelah game siap;
  Chrome dan Safari memutuskan sendiri tanpa pertanyaan, di Firefox hanya untuk aplikasi yang sudah dipasang (agar tidak muncul pop-up izin).
- Service worker hanya menyimpan file game (cache `marbot-<versi>-<hash>`), **bukan** data save.

## 8. Parameter URL untuk developer

Contoh: `?cam=...`, `?hour=18`, `?stage=3`, `?crowd`, `?demo`, `?panel=...`, `?show=...`, `?skip`, `?q=low`.
Parameter debug tetap tersedia di build produksi, tetapi **aman**: parameter debug yang dibaca game
(`act anim at autowalk cam carry crowd decor demo dist event fill freeze grow hint hour hourspeed hungry introhold joy
lineup night nt panel pen phase pitch pose prayer show skip slots stage tab warp weather yaw`, plus `?dev`)
menyalakan **mode sandbox**: progres tidak ditulis ke (dan tidak dihapus dari) `localStorage`, dan pojok atas layar
menampilkan label kecil **"Mode uji — progres tidak disimpan"**. Jadi link seperti `?demo` tidak mengubah save asli pemain.

Semua parameter lain berjalan normal dan progres tetap tersimpan: parameter pemain (`q`, `quality`, `lang`, `nosw`,
`fixeddpr`) dan parameter apa pun yang tidak dikenal, termasuk tambahan dari link yang dibagikan
(`utm_*`, `fbclid`, `gclid`, `igshid`/`igsh`, `si`, `ref`, `ttclid`, `msclkid`, `mibextid`, ...).

Daftar parameter debug dihitung otomatis saat build: `tools/build.mjs` memindai `src/` untuk `.get('x')` / `.has('x')`
pada `URLSearchParams` dan menambahkannya ke `dist/boot.js` (`verify` memastikan tidak ada yang terlewat).
Untuk versi sumber (`npm run serve`), tambahkan parameter debug baru ke `DEBUG_PARAMS` di `boot.js`.

Parameter khusus build:

- `?nosw` — sebelum game dimuat: melepas service worker game ini dan menghapus cache-nya, lalu memuat ulang langsung
  dari server tanpa service worker (berguna jika versi lama "nyangkut", termasuk versi yang macet saat loading).
  Buka sekali saja; kunjungan berikutnya tanpa `?nosw` memasang versi terbaru lagi. Save tidak terhapus.
- `?nogl` — menampilkan pesan "WebGL 2 tidak tersedia" (untuk menguji tampilan fallback).
- `?lang=en` / `?lang=id` — bahasa layar loading.

Service worker, cache, dan tombol "Muat ulang tanpa cache" hanya menyentuh milik game ini (scope `/test/`);
proyek GitHub Pages lain di domain `thomihalim-maker.github.io` tidak ikut terhapus.

`window.__ctx` tetap tersedia untuk debugging. Game ini single-player dan offline, jadi tidak ada data rahasia di dalamnya.

## 9. Masalah umum

- **Layar putih / panel "Terjadi kesalahan"**: panel menampilkan pesan error beserta file dan barisnya (bisa diseleksi
  dan disalin, atau di-screenshot dari HP). Tombol **Muat ulang** lebih dulu mengaktifkan versi baru yang sudah
  terunduh (jika ada); **Muat ulang tanpa cache** melepas service worker dan menghapus cache game tanpa menghapus save.
  Modul game yang gagal dimuat (mis. `ui/ui`) kini juga dilaporkan lewat bilah kecil "Terjadi kesalahan — muat ulang".
- **Loading lambat**: jika panel error muncul karena loading lama tetapi game ternyata berhasil jalan, panel itu
  hilang sendiri dan diganti bilah kecil.
- **Masih versi lama**: tutup semua tab game lalu buka lagi, atau buka sekali dengan `?nosw`.
- **404 di GitHub Pages**: pastikan Settings → Pages → Source = *GitHub Actions* dan workflow di tab Actions berhasil.
- **Pesan WebGL 2 tidak tersedia**: perangkat/browser terlalu lama atau akselerasi hardware dimatikan. three.js r170 membutuhkan WebGL 2.

## 10. Catatan untuk developer / agent

- Gunakan **import relatif** (`./x.js`, `../state.js`) atau `three` / `three/addons/...`. Path absolut (`/src/...`)
  akan gagal di sub-path dan ditolak oleh `verify`.
- File runtime baru cukup diletakkan di dalam `src/` (otomatis ikut ter-build). File runtime baru di luar `src/`
  harus ditambahkan di `tools/build.mjs`.
- Modul baru di daftar `order` di `src/main.js` otomatis ikut di-preload, di-precache, dan diverifikasi.
- `main.js` mengirim event `game:progress` dan `game:ready` untuk layar loading; keduanya aman jika tidak ada yang mendengarkan.
- `tools/build-play.sh` (snapshot untuk artifact claude.ai, three.js dari jsDelivr) tetap berfungsi dan terpisah dari build ini.
  Hasilnya sekarang di `game/play-dist/` (di-ignore git), bukan di dalam `dist/`, supaya tidak ikut ter-deploy.
- `tools/shot.mjs` menunggu layar loading selesai dulu (maks. 180 dtk), baru menunggu `waitMs`.
  Label sandbox tidak muncul di screenshot otomatis (`navigator.webdriver`).
- Label versi di layar judul (`v1.0` di `src/ui/ui.js`) masih ditulis manual; sebaiknya diganti `window.MARBOT_VERSION`
  oleh pemilik `src/ui` (nilainya `dev` di versi sumber).
- Lisensi pihak ketiga: `LICENSES.txt` (three.js MIT), font Nunito (SIL OFL, `src/ui/fonts/OFL.txt`). Keduanya ikut di `dist/`.

---

## English summary

- **Run locally:** `cd game && npm run serve` → http://localhost:8123 (must be served over http, not `file://`).
- **Build:** `npm run build` → `game/dist/` (no `npm install` needed; Node 22+ built-ins only). Keeps source readable,
  copies only the 13 three.js files actually imported, injects a version (`package.json` version + git sha) into the page,
  `version.json` and the service-worker cache name, adds `modulepreload` links, and verifies every import/precache entry statically.
  Optional `SITE_URL` makes Open Graph URLs absolute.
- **PWA / offline:** `manifest.webmanifest`, generated icons (`npm run icons`), and `sw.js` precaching the whole build.
  Updates install in the background and are applied when the player taps "Versi baru tersedia — Muat ulang" or on the next launch.
- **GitHub Pages:** the workflow deploys the repository's **default branch** only (the auto-created `github-pages`
  environment accepts nothing else). Today the repo has no `main` and its default branch is an old agent branch, so once:
  create `main` from the current game branch, make it the default (*Settings → General → Default branch*), set
  *Settings → Pages → Source: GitHub Actions*, then *Actions → Deploy game to GitHub Pages → Run workflow*.
  After that every push to `main` that touches the shipped game (not docs/tools) deploys to
  https://thomihalim-maker.github.io/test/. PRs run build + verify (`ci.yml`).
- **Netlify / Vercel / Cloudflare / itch.io:** upload `dist/` (for itch.io zip the *contents* of `dist/`, kind "HTML").
- **Android:** `npm install`, `npm run cap:add`, `npm run cap:open`, then Run or *Build → Generate Signed App Bundle* in
  Android Studio; `npm run cap:sync` after each web change. Optional `@capacitor/app` enables back-button handling.
  Play Families needs a privacy-policy URL: use `…/test/privacy.html` (shipped in the build). Licenses: `LICENSES.txt`.
- **Version bump:** edit `version` in `game/package.json`, push to `main`; on Android also bump `versionCode`.
- **Saves:** browser `localStorage`, key `marbot.save`, per origin. *Reset Progress* really deletes it now. iOS Safari
  players should *Add to Home Screen* (Safari may clear site data after 7 days without a visit).
- **URL params:** only the debug switches the game reads (`?cam`, `?stage`, `?demo` …, or `?dev`) start the no-save
  sandbox, with a visible "Test mode" label; tracking params from shared links (`utm_*`, `igshid`, `si`, `fbclid` …) do not.
  `?nosw` drops this game's service worker + caches before the game loads.
- **Smoke test:** `npm run smoke` (Playwright) serves `dist/` under `/test/` with GitHub-Pages-like behaviour and checks boot,
  title → HUD, manifest/icons, service worker control, an offline reload, `version.json`/file navigations, the sandbox rules,
  *Reset Progress*, `?nosw`, the update prompt, the WebGL fallback and the error panel.
  `REDIRECT_INDEX=1 npm run smoke` also simulates Cloudflare's `/index.html` → `/` redirect.
