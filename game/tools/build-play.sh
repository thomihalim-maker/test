#!/bin/sh
# Snapshot the game into $1 (default: play-dist, outside the production dist/) for publishing as a single shareable page.
# play.html is body-only (the host adds the document skeleton) and loads three.js from jsDelivr.
set -e
cd "$(dirname "$0")/.."
OUT=${1:-play-dist}
rm -rf "$OUT"; mkdir -p "$OUT"
cp -r src "$OUT/src"
find "$OUT/src" -name 'test.html' -delete
mkdir -p "$OUT/assets"; cp -r assets/models "$OUT/assets/models"   # sculpted hero (marbot.glb); assets/ref stays out
ln -s "$(pwd)/vendor" "$OUT/vendor"   # local-only, so the snapshot can be smoke-tested with tools/shot.mjs
cp index.html "$OUT/index.html"
cp boot.js manifest.webmanifest "$OUT/"; cp -r icons "$OUT/icons"   # index.html loader + icons (play.html needs neither)
cat > "$OUT/play.html" <<'H'
<title>Marbot Masjid</title>
<link rel="stylesheet" href="src/ui/ui.css">
<script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/"}}</script>
<canvas id="c"></canvas>
<div id="ui"></div>
<script type="module" src="src/main.js"></script>
H
echo "$OUT"
