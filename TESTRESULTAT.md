# Testresultat REV36

- `node --check public/app.js`: OK
- `node --check server.js`: OK
- `npm test`: OK – 34/34 tester bestått
- `npm run verify`: OK – REV 36 serveres fra `/public`
- Mobil 3D-bunn: egen Canvas-renderer, ingen Plotly-avhengighet
- 3D-bunnpanel: ligger under hovedkartet og har eksplisitt mobile hidden/visningsregler

Merk: eksterne Kartverket-/kartflis-API-er kan ikke fullintegrasjonstestes i dette isolerte byggemiljøet fordi utgående DNS er blokkert.
