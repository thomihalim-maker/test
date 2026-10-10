# Marbot Masjid: prompts for asset reference images

These prompts produce **reference images for img2threejs**: one asset per image, centered, on a plain light background, from a clear angle. They are tuned for Nano Banana Pro (and work in ChatGPT Images too).

**How to use**
1. Upload `marbot-ref.png` (the player character) as **Image 1** with every prompt. It locks the art style so every asset looks like it belongs in the same game.
2. Copy the **STYLE LOCK** block, then the asset block below it.
3. Generate 2–4 variations, pick the best one, and send it to Claude together with the asset name.

**Tips for good img2threejs results**
- One object per image. No people around props, no background scenery.
- Characters: T-pose or A-pose, front view, full body including the feet.
- Props and buildings: three-quarter view (about 30°) so the depth is visible, the whole object in frame.
- Soft, even lighting with no hard shadows hiding the shape.

---

## STYLE LOCK (paste first, every time)

```
Use Image 1 ONLY as the art-style reference: match its stylized 3D look exactly —
soft clay / vinyl-toy materials, rounded chunky forms, gentle subsurface glow,
friendly chibi proportions, clean readable silhouettes, warm soft studio lighting
from upper front, subtle ambient occlusion, matte surfaces with soft highlights.
Do not copy the boy from Image 1 unless asked; use it only for style, scale language,
material quality and color harmony.

Setting of the game: a cozy Indonesian (Javanese) village mosque, kid-friendly,
Animal Crossing / Pokopia–level charm.

Presentation: a single isolated asset, centered, entire object fully in frame with
generous margin, plain seamless light grey studio background (#E8E8E8), soft contact
shadow under the object only. Production-ready 3D model reference for a game.
Aspect ratio 3:4, 2K.
```

---

## A. Characters (jamaah and NPCs)

> For all characters add: **"Full body, standing in a relaxed T-pose facing the camera, feet visible, neutral friendly expression."**
> Respectful dress: modest clothing, hijab fully covering hair, ears and neck for women and girls.

### A1. Pak Haji (the elder imam)
```
SUBJECT: a kind elderly Indonesian grandfather, same chibi proportions as Image 1
(big round head about 45% of height), short neat white beard and white moustache,
gentle smiling eyes with smile wrinkles, round glasses, white kopiah haji (white
knitted skullcap), long white baju koko / gamis to the knees, a folded maroon sajadah
draped over one shoulder, dark brown sarong underneath, brown leather sandals,
holding a wooden tasbih in one hand.
```

### A2. Ibu (mother wearing a hijab)
```
SUBJECT: a cheerful young Indonesian mother, chibi proportions like Image 1,
soft round face with rosy cheeks and a warm smile, a dusty-rose square hijab neatly
pinned under the chin covering hair, ears and neck, long flowing sage-green gamis
dress to the ankles with a little cream embroidery at the cuffs, carrying a small
woven rattan bag, beige flat shoes.
```

### A3. Anak perempuan (girl wearing a hijab)
```
SUBJECT: a small Indonesian girl about 6 years old, even rounder head and bigger eyes
than Image 1, a sunny-yellow instant hijab with a tiny flower brooch covering hair,
ears and neck, lilac long-sleeve tunic over a long patterned skirt with small
batik flowers, pink sandals, holding a small folded prayer mat to her chest.
```

### A4. Kakek tani (old farmer)
```
SUBJECT: a skinny cheerful old village farmer, chibi proportions, tanned skin,
grey stubble, a wide conical bamboo caping hat, faded indigo lurik striped shirt with
rolled-up sleeves, brown checked sarong tied up to the knees, bare feet with a little
dried mud, a small hoe resting on one shoulder.
```

### A5. Anak laki-laki (playful boy)
```
SUBJECT: a playful Indonesian boy about 7 years old, chibi proportions slightly younger
than Image 1, spiky black hair, gap-tooth grin, a small knitted white kopiah, a bright
orange t-shirt with a tiny star patch, knee-length navy shorts, rubber sandals,
holding a woven rattan sepak takraw ball.
```

### A6. Remaja (teenage boy who helps at the mosque)
```
SUBJECT: a friendly Indonesian teenage boy, taller and slimmer than Image 1 but the same
style, short tidy hair, a teal baju koko with a white collar trim, a tall maroon velvet
peci, a dark grey sarong with a thin gold border, holding a broom made of a bundle of
coconut-leaf ribs (sapu lidi).
```

---

## B. Qurban animals (cute, plushie-like)

> For all animals add: **"Standing pose in side three-quarter view, all four legs visible, calm happy expression, big glossy dark eyes with two catch-lights, no harness."**

### B1. Kambing (goat)
```
SUBJECT: an adorable chibi Indonesian goat (kambing kacang), plushie proportions —
oversized round head, short sturdy legs with dark little hooves, golden-brown coat
with a cream face blaze and cream belly, two short swept-back horns, ears sticking
out sideways, a short tapered muzzle with a tiny pink nose, a small chin beard tuft,
a short upturned tail, a red collar with a little brass bell.
```

### B2. Domba (sheep)
```
SUBJECT: an adorable chibi sheep (domba garut style but cute), a round fluffy
cloud-like body of soft caramel-cream wool in big chunky curls, a smaller tan face
and legs peeking out, tiny curled horns, droopy little ears, rosy cheeks, a teal
collar with a brass bell.
```

### B3. Sapi (cow)
```
SUBJECT: an adorable chibi Bali cow / Holstein mix, plushie proportions, a big round
head with long lashes, a soft pink muzzle with two nostrils, small rounded horns,
black-and-white patches (or golden-brown Bali cow coloring with white socks),
a little tuft at the tail tip, a cowbell on a yellow collar.
```

### B4. Anak domba (baby lamb)
```
SUBJECT: a tiny baby lamb, extra-large head with huge sparkly eyes, a very fluffy
cream wool body like a cotton ball, no horns, wobbly short legs, a pastel blue ribbon
bow on its neck.
```

---

## C. Masjid and buildings (Javanese / Nusantara style)

> For buildings add: **"Three-quarter view from slightly above (about 30° down), the whole building in frame, isolated on the light grey background with no surrounding ground scenery."**
> No Arabic or Quranic text anywhere on the buildings — geometric and floral ornaments only.

### C1. Masjid utama (Demak-style tajug mosque)
```
SUBJECT: a cozy stylized Javanese village mosque inspired by Masjid Agung Demak:
a square hall on a raised white stone plinth with a few front steps, clean whitewash
walls, warm teak window frames with carved lattice (krawangan), a wide open front
veranda on chunky teak columns with stone bases, and a three-tier stacked pyramid
roof (tajug tumpang tiga) with straight slopes, honey-brown wooden shingles (sirap),
short wooden louvered bands between tiers, and a squat brass mustaka finial with a
small crescent on top. Chunky toy-like proportions, soft rounded edges.
```

### C2. Menara (Kudus-style minaret)
```
SUBJECT: a stylized minaret inspired by Menara Kudus: a red-brick square tower with
a stepped temple-like base, deep stepped brick cornices, recessed panels inset with
white-and-blue ceramic plates, topped by an open wooden pavilion with a small hanging
bedug and a two-tier wooden-shingle roof. Chunky, cute, slightly tapered.
```

### C3. Gerbang candi bentar (split gate)
```
SUBJECT: a Javanese split gate (candi bentar): two mirrored stepped red-brick halves
with a walkway between them, small ceramic plate inlays, carved stone caps, short
brick wing walls, potted frangipani at the base. Cute chunky proportions.
```

### C4. Pendopo bedug (drum pavilion)
```
SUBJECT: a small open Javanese joglo pavilion on a stone-and-teak platform, four
teak posts on stone bases, a tall peaked shingle roof over a lower flatter tier,
and inside it a large horizontal bedug drum (wooden barrel, cowhide head, iron rings)
hanging on a carved wooden stand, with a wooden mallet resting nearby.
```

### C5. Tempat wudhu (ablution area)
```
SUBJECT: a cozy outdoor ablution station: a low andesite stone ledge holding three
round terracotta padasan water jars with bamboo spouts, a small square kolam basin
with teal tiles, four bamboo pancuran spouts on a short stone wall, wet stone floor
tiles, a small wooden shoe rack. Under a little hip-roofed limasan shelter with
honey shingles.
```

### C6. Kandang hewan (animal shelter)
```
SUBJECT: a cute rustic animal shelter: a low thatched-roof wooden shed with chunky
bamboo posts, a woven bamboo back wall, straw-covered floor, a wooden feed trough
full of fresh green grass and hay, a wooden water trough, a small hanging lantern,
and colorful triangle bunting along the eave.
```

### C7. Rumah warga (village house)
```
SUBJECT: a small cozy Javanese village house (rumah limasan): woven bamboo (gedek)
walls, terracotta tile roof, a small front veranda with a wooden bench, a teal
wooden door and shuttered windows, potted plants and a bougainvillea bush.
```

---

## D. Props (marbot tools and mosque items)

> For props add: **"Three-quarter view, single prop centered, true-to-game chunky toy proportions."**

### D1. Sapu lidi (coconut-rib broom)
```
SUBJECT: a traditional Indonesian broom made of a bundle of thin coconut-leaf ribs
tied with red string, attached to a long bamboo handle.
```

### D2. Alat pel dan ember (mop and bucket)
```
SUBJECT: a cute mop with a wooden handle and a fluffy white cotton head, leaning in a
round teal plastic bucket half-full of soapy water with a few bubbles.
```

### D3. Bal jerami (hay bale)
```
SUBJECT: a chunky rectangular golden hay bale tied with two twine bands, loose straw
strands poking out, a small wild flower stuck on top.
```

### D4. Ember air (water bucket)
```
SUBJECT: a galvanized metal water bucket with a wooden-grip handle, filled with clear
water, a tiny splash.
```

### D5. Lampu gantung masjid (hanging lantern)
```
SUBJECT: a traditional Javanese brass hanging lantern with a glass chimney, ornate
pierced geometric metalwork, a short brass chain, glowing warm amber.
```

### D6. Sajadah (prayer mat)
```
SUBJECT: a folded and an unrolled prayer mat side by side, deep maroon and green with
a geometric arch motif and a soft fringe, no text.
```

### D7. Mimbar (pulpit)
```
SUBJECT: a small carved teak mimbar with three steps, a domed canopy, carved floral
side panels, and a gentle gold-leaf rail.
```

### D8. Ketupat & umbul-umbul (Idul Adha decorations)
```
SUBJECT: a cluster of woven green palm-leaf ketupat hanging on a string, plus a tall
colorful umbul-umbul banner pole with flowing striped fabric.
```

---

## E. Nature

> For nature add: **"Single isolated plant, whole plant in frame including the base, stylized chunky leaves (not realistic), soft rounded canopy shapes."**

### E1. Pohon kelapa (coconut palm)
```
SUBJECT: a cute stylized coconut palm with a gently curved ringed trunk, a bushy
crown of thick rounded fronds, and a small cluster of green coconuts.
```

### E2. Pohon flamboyan (flame tree)
```
SUBJECT: a stylized flamboyan (flame tree) with a short trunk splitting into dark
branches and a wide umbrella-shaped canopy made of puffy clumps covered in red-orange
blossoms, a few petals fallen at the base.
```

### E3. Pohon pisang (banana plant)
```
SUBJECT: a cute banana plant with big paddle-shaped glossy green leaves (one slightly
torn), a hanging bunch of small yellow-green bananas and a purple banana flower.
```

### E4. Semak bunga (flowering bush)
```
SUBJECT: a round chunky bougainvillea bush with magenta and orange flowers over glossy
leaves, in a terracotta pot.
```

---

## Suggested order (most visual impact first)
1. **B1 Kambing**, then B2–B4 (the animals are the biggest visual weak spot today).
2. **A1 Pak Haji**, A2 Ibu, A3 anak perempuan (main jamaah).
3. **C1 Masjid utama** (one building image is enough to start).
4. The rest as needed.
