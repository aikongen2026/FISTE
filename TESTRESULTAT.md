# Testresultat – Fiste guiden REV40

Kontrollert 26.09.2026.

- `node --check server.js`: OK
- `node --check public/app.js`: OK
- `npm test`: **49/49 tester OK**
- `npm run verify`: OK – REV 40 serveres fra `/public`
- Lokal server: OK
- `/api/health`: OK
  - `version: v16-rev40`
  - `revision: REV 40`
  - `biteGuideIndependent: true`
  - `smartOwnedLureMatching: true`
  - `nveMeasuredLakeLayer: true`
  - `nvePagination: true`

NVE-kontroll:
- Offisielle NVE-lag og feltskjema ble kontrollert mot Innsjødatabase2 MapServer.
- Kode/test kontrollerer bruk av lag 3 (målte vann), lag 2 (DybdeKurve), lag 1
  (DybdePunkt), lag 4 (metadata), paginering og ærlig manglende-data-flyt.
- Eksterne NVE-kall kan ikke kjøres ende-til-ende i den lokale testcontaineren uten
  internettilgang; derfor er selve request-/behandlingslogikken testet lokalt mot
  tjenestens verifiserte skjema.

Slukvariasjon kontrollert med 162 sjøørret-scenarier (lys, skydekke, vind,
dybde og struktur): **10 forskjellige primærsluker** fra brukerens faktiske bilder ble
valgt. Variasjonen kommer fra forholdsmatchen; tilfeldig rotasjon brukes ikke.
