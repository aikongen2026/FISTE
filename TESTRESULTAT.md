# Testresultat – Fiste guiden REV39

Kjørt etter kart-/ferskvannsoppdateringen:

- `node --check public/app.js`: OK
- `node --check server.js`: OK
- `npm run verify`: OK – REV 39 serveres fra `/public`
- `npm test`: **42/42 tester bestått**
- Lokal server startet: OK
- `/api/health`: OK
  - `version: v15-rev39`
  - `revision: REV 39`
  - `freshwaterDepthOverlay: true`
  - `freshwaterSpeciesDepthRanking: true`
  - `freshwaterBathymetry3d: true`
  - `biteGuide: true`
- `/api/freshwater-depth-overlay` inputvalidering: OK (ugyldig bbox gir HTTP 400)

Spesifikke regresjonstester:
- De fire fjernede kartlagene finnes ikke lenger i kartmenyen.
- NVE REST-overlay er koblet automatisk til ferskvanns-Fiskekart.
- NVE dybdekurver og dybdepunkter brukes av serverintegrasjonen.
- Ferskvannsarter bruker NVE-dybde/struktur i habitatmodellen når data finnes.
- Gamle sjø-/sluk-/BiteGuide-/Live GPS-funksjoner består fortsatt testene.

Begrensning i testmiljøet:
- Sandkassen har ikke utgående DNS/internett i kode-runtime, så en full live HTTP-røyk-test mot NVE kan ikke kjøres herfra. NVE-tjenestene og lag-IDene er kontrollert mot NVEs offentlige tjenestekatalog, og integrasjonen har egen feilhåndtering hvis ekstern tjeneste er utilgjengelig.
