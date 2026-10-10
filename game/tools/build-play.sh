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
# When publishing, the file list must include assets/models/marbot.glb.js (generated below); GLTFLoader comes from
# jsDelivr through the "three/addons/" import-map prefix (examples/jsm/loaders/GLTFLoader.js). Without the model the
# game silently falls back to the code-built hero.
# Artifact hosting does not serve .glb, so the snapshot ships the model as a JS module holding a data: URL instead
# (GLTFLoader reads data: URLs natively); the production build keeps the real .glb.
node -e "const fs=require('fs');fs.writeFileSync(process.argv[2],'export default \"data:model/gltf-binary;base64,'+fs.readFileSync(process.argv[1]).toString('base64')+'\";\n')" \
  "$OUT/assets/models/marbot.glb" "$OUT/assets/models/marbot.glb.js"
rm "$OUT/assets/models/marbot.glb"
sed -i "s#^export const MARBOT_GLB_URL = .*#export const MARBOT_GLB_URL = (await import('../../assets/models/marbot.glb.js')).default;#" "$OUT/src/characters/marbot_glb.js"
grep -q "marbot.glb.js" "$OUT/src/characters/marbot_glb.js"
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
