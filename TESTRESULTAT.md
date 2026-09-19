# Testresultat – Fiste guiden REV32

Kontrollert lokalt før pakking:

- `node -c server.js`: OK
- `node -c public/app.js`: OK
- `npm run verify`: OK
- `npm test`: 31/31 bestått
- lokal `/api/health`: OK, rapporterer REV32 + HSI-splitt + habitatlag + dybdeprofil + hardt fredningsfilter + 3D terrengstøtte

Eksterne sanntidskilder kan ikke sluttverifiseres fra byggemiljøet. Koden faller derfor tilbake uten å stoppe analysen dersom habitat-, marine- eller dybdetjenester er midlertidig utilgjengelige. Confidence/datagrunnlag reduseres tilsvarende.

- REV32 frontend: 3D-kartvalget, lazy MapLibre-lasting, raster-dem, Kartverket WMS-dybdelag, sone/GPS-synk og fallback til 2D er kontrollert i kode/test.
- Faktisk WebGL-rendering, Mapterhorn-terrain og eksterne kartfliser må sluttverifiseres i nettleseren etter Render-deploy fordi byggemiljøet ikke har nettleser/WebGL med ekstern nettverkstilgang.
