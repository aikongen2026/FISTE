# Fiste guiden REV45 – testresultat

Sluttkontroll:

- `node --check server.js`: **OK**
- `node --check public/app.js`: **OK**
- `npm test`: **63/63 bestått**
- `npm run verify`: **OK – REV 45 serveres fra /public**
- Slukdatabase: **98/98** poster
- Faktiske slukbilder: **98/98** filer
- Lokal `/api/health`: **v21-rev45 / REV 45**
- AutoDeploy: peker til **aikongen2026/FISTE**, branch `main`, og leser forventet REV dynamisk fra `package.json`

Motor-spesifikke kontroller:

- identisk input gir identisk anbefaling – ingen tilfeldig rotasjon
- beste sluk blir ikke automatisk normalisert til 100/100
- mikrohabitat endrer ørretstrategi mellom odde/grunne, bukt, vegetasjon og dypkant
- `Stor fisk` endrer ønsket slukstørrelse og demper for små profiler
- ukjent slukvekt/lengde forblir ukjent og behandles ikke som 0
- ferskvann/saltvann-hardfilter beholdt
- explainable component scores + separat datatillit er aktivert

REV45-kontroller:

- ArcGIS-lagklassifisering for bekkeløp, utløp og tre typer vandringshinder: **OK**
- ArcGIS punkt-/linjegeometri til GeoJSON: **OK**
- UI-toggle og lokal status uten global feilmeldingsspam: **OK**
- `/api/health` annonserer den nasjonale integrasjonen og korrekt nasjonal app-id: **OK**
- lokal `/api/national-seatrout` utenfor Norge returnerer umiddelbart uten ekstern nettforespørsel: **OK**
- Live ArcGIS-kall kan ikke kjøres ende-til-ende i denne Linux-testcontaineren fordi den ikke har ekstern DNS; runtime-koden bruker den offentlige ArcGIS REST-tjenesten når appen kjører på Render.
