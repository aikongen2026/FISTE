# Fiste guiden REV42 – testresultat

Dato: 2026-10-08

- `npm test`: **55/55 bestått**
- `npm run verify`: **OK** – REV 42 serveres fra `/public`
- `node --check server.js`: **OK**
- `node --check public/app.js`: **OK**
- Lokal `/api/health`: **v18-rev42 / REV 42**
- Egen slukboks: **98/98 bilder finnes**, ingen manglende bildefiler
- Hard ferskvann/saltvann-gating: testet på matriser for sjøørret/makrell/sei og ørret/abbor/gjedde
- BiteGuide: uavhengig idealprofil + referanseagn med bilder + separat matching mot egen slukboks
- Sjøørret variasjon i testmatrise: **6 forskjellige førstevalg** og **20 forskjellige sluker blant topp 4** uten tilfeldig rotasjon
- Ørret variasjon: **14 forskjellige førstevalg**
- Abbor variasjon: **8 forskjellige førstevalg**
- Gjedde variasjon: **7 forskjellige førstevalg**

Merk: PowerShell AutoDeploy er statisk kontrollert i Linux-miljøet, men selve GitHub-innlogging/push og Render Auto-Deploy kan bare sluttprøves når BAT-filen kjøres på Windows-maskinen med brukerens GitHub-tilgang.
