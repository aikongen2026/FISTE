# Testresultat – Fiste guiden REV34

Kontrollert lokalt før pakking:

- `node -c server.js`: OK
- `node -c public/app.js`: OK
- `npm run verify`: OK
- `npm test`: 33/33 bestått
- lokal `/api/health`: OK, rapporterer REV34 + HSI-splitt + habitatlag + dybdeprofil + hardt fredningsfilter + 3D terrengstøtte + 3D bunnstøtte

Eksterne sanntidskilder kan ikke sluttverifiseres fra byggemiljøet. Koden faller derfor tilbake uten å stoppe analysen dersom habitat-, marine- eller dybdetjenester er midlertidig utilgjengelige. Confidence/datagrunnlag reduseres tilsvarende.

- REV34 frontend: 3D-kartvalget, lazy MapLibre-lasting, raster-dem, Kartverket WMS-dybdelag, sone/GPS-synk og fallback til 2D er kontrollert i kode/test.
- Faktisk WebGL-rendering, Mapterhorn-terrain og eksterne kartfliser må sluttverifiseres i nettleseren etter Render-deploy fordi byggemiljøet ikke har nettleser/WebGL med ekstern nettverkstilgang.

- REV34 3D-bunn: WCS-proxy, lazy Plotly/GeoTIFF-lasting, dybdeskala, overflate/kurver og synk av de 10 anbefalte punktene er kontrollert i kode/test.
- Ekstern EMODnet WCS og faktisk WebGL/Plotly-rendering må sluttverifiseres etter Render-deploy; byggemiljøet har ikke ekstern nettverkstilgang.
