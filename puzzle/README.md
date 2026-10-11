# Bintang Kecil

A crayon-style puzzle game for preschoolers on phones, tablets, PC and the web. Ibu, Ayah and baby Bintang
star in 3 levels: shape matching (*Siap Tidur*), colour sorting (*Warna-warni*) and a family-photo jigsaw (*Foto Keluarga*).
Plain ES modules plus canvas 2D. All art is drawn in code and all audio is synthesized with WebAudio, so the game ships no asset files besides one font.

## Run the source
Serve the folder with any static server (for example `npx serve .`) and open `index.html`.
Useful query parameters: `?scene=level1&unlock`, `&mute`, `&speed=2`.

## Builds
```bash
npm install
npm run build:web                                   # dist/web/index.html: one self-contained file (works on any host or from disk)
node tools/build-pc-lite.mjs                        # dist/BintangKecil-lite-{windows,mac,linux}.zip (~1 MB each, Neutralino, uses the OS web view)
npm run build:pc                                    # dist/BintangKecil-{windows,linux}-x64.zip (~100 MB each, Electron, bundles Chromium)
```
- **Windows lite build:** needs WebView2, which comes preinstalled on Windows 10 and 11.
- **Linux lite build:** needs `libwebkit2gtk-4.0`.
- **macOS:** the app is unsigned, so open it the first time with right-click → Open.

## Development
See `CONTRACT.md` for the engine API and which builder owns which file.
Take phone-size screenshots with `node tools/shot.mjs shots/x.png "scene=level2&unlock" 3000`.
