# Marbot Masjid

Game 3D santai untuk anak (bahasa Indonesia, dengan opsi English): kamu adalah **marbot**, penjaga masjid desa.
Rawat kambing, domba, dan sapi kurban menjelang Idul Adha, dan bangun masjid gaya Demak sedikit demi sedikit
supaya jamaah berdatangan.

*A cozy 3D village-masjid game for kids: care for the Eid al-Adha animals and build up the village mosque.*

- **Main sekarang / Play:** https://thomihalim-maker.github.io/test/ (setelah GitHub Pages aktif, lihat panduan deploy)
- Dibuat dengan [three.js](https://threejs.org) r170, ES modules murni tanpa bundler. Semua grafis dan suara
  dibuat secara prosedural, jadi game bisa dimainkan **offline** (PWA) dan dibungkus jadi aplikasi **Android** (Capacitor).

## Mulai cepat / Quick start

```bash
cd game
npm run serve        # source version  -> http://localhost:8123
npm run build        # production build -> game/dist/ (Node 22+, no npm install needed)
npm run serve:dist   # test the build   -> http://localhost:8124
```

## Dokumentasi

- [game/DEPLOY.md](game/DEPLOY.md) — build, GitHub Pages, Netlify/Vercel/itch.io, Android (APK/AAB), versi, data save.
- [game/README_AGENTS.md](game/README_AGENTS.md) — struktur modul dan API internal game.
- CI: [.github/workflows/deploy-pages.yml](.github/workflows/deploy-pages.yml) (deploy `main` ke Pages),
  [.github/workflows/ci.yml](.github/workflows/ci.yml) (cek build untuk pull request).

## Struktur

```
game/
  index.html, boot.js        page + loading screen / error handling / service worker registration
  src/                       game modules (world, masjid, animals, characters, ui, ...)
  vendor/                    three.js r170 (only the imported files are shipped)
  icons/, manifest.webmanifest, sw.js   PWA
  capacitor.config.json      Android wrapper config
  tools/                     build, verify, smoke test, screenshots, icon generator
```

Lisensi pihak ketiga: three.js (MIT), font Nunito (SIL Open Font License, `game/src/ui/fonts/OFL.txt`).
