# Fiste guiden – REV 27

## ENKEL OPPLASTING

1. Pakk ut ZIP-filen.
2. Åpne GitHub-repoet `FISTE` → **Add file → Upload files**.
3. Dra **alt innholdet inni denne mappen** inn i GitHub-vinduet.
4. Trykk **Commit changes**.
5. I Render: **Manual Deploy → Deploy latest commit** hvis den ikke starter automatisk.
6. Kontroller `https://fiste.onrender.com/api/health` – den skal vise **REV 27**.

Du trenger ikke slette gamle løse filer i repo-roten først. REV27 ignorerer dem og serverer kun `/public`.

---

Mobilklar PWA som foreslår fiskesoner i sjø og ferskvann i Norge.

## REV 27 – LIVE GPS for dørging – avstandsfilter, base-toggle og alle sjøarter samtidig

### LIVE GPS
- Ny **● Live**-knapp følger GPS-posisjonen kontinuerlig mens appen er åpen.
- Kartet panorerer automatisk med båten, tegner sporlinje og viser fart, GPS-nøyaktighet og kurs når enheten leverer det.
- Fiskesonene oppdateres automatisk ca. hvert 20. sekund eller etter ca. 60 m forflytning.
- Maks avstand bruker LIVE-posisjonen som dynamisk base, slik at søkeområdet flytter seg med deg.
- Skjermen holdes våken der nettleseren støtter Wake Lock. Mobilens operativsystem kan fortsatt begrense GPS i bakgrunnen når appen ikke er synlig.


REV 27 bygger videre på REV25 og retter arbeidsflyten rundt kart og base. Viktigste nytt:

- **250 m / 500 m / 1 km / 2 km søker nå rundt selve basen**, uavhengig av hvilket kartutsnitt du hadde før. Kartet zoomer automatisk til valgt radius, og en grønn sirkel viser nøyaktig søkeområde.
- **Base er nå en av/på-knapp:** trykk «Sett base» for å sette den, og trykk samme knapp igjen for å fjerne basen. Når basen fjernes settes avstandsfilteret til «Ingen grense».
- Ny fisketype **«Ingen – vis alle sjøarter»** viser sjøørret, makrell og sei samtidig.
- I flerartsmodus er **sjøørret rød, makrell blå og sei grønn** på kartet. Høyrepanelet forklarer fargene og hver anbefalt sone merkes med aktuell art og artstilpasset slukvalg.
- Flerartsvisningen forsvinner automatisk så snart du velger én konkret fisketype igjen.
- Kandidatpunktene varieres mellom sjøørret, makrell og sei, slik at flerartsmodus ikke bare legger tre farger oppå nøyaktig samme fire steder.

Øvrige funksjoner videreført:

- **Sjøtemperatur, bølgehøyde, bølgeretning og bølgeperiode** fra Open-Meteo Marine.
- **Havstrøm og strømretning** samt modellert **tidevanns-/havnivåtrend** og neste beregnede høy-/lavvann.
- **Lufttrykk og 3-timers trykktrend** fra MET Norway.
- **Månefase** vises, men gis bevisst bare svak vekt i fiskescore.
- Marine forhold påvirker nå artsmodellen for sjøørret, makrell og sei. Dårlige forhold kan gi negative poeng; UI viser derfor både + og - korrekt.
- Nytt **Vind/strøm-kartlag** med retning og styrke på kartet.
- **Personlig rangering:** etter minst tre registrerte turer kan egne data gi inntil +6 poeng basert på tidsrom, tidligere vellykket sluk og vær som ligner egne fangster. Dette skjer kun lokalt i nettleseren.
- Når en anbefalt sone åpnes fylles fangstloggen automatisk med sted og anbefalt sluk fra din egen slukboks.
- Fangstloggen lagrer også lufttrykk, sjøtemperatur, bølger, strøm og tidevannsstatus når data finnes.
- **GPX-eksport** av fangst-/turpunkter og **JSON-backup** av hele fangstloggen.
- Eget **Båtramper-lag** henter registrerte slipper/båtramper fra OpenStreetMap i synlig kartutsnitt.
- **Offline siste analyse:** siste vellykkede analyse lagres lokalt og kan vises uten nett dersom du fortsatt er i samme område (maks 35 km fra lagret sentrum).
- **NVE HydAPI-støtte:** i ferskvannsmodus kan nærmeste aktive målestasjon vise vannstand, vannføring og vanntemperatur når serveren har miljøvariabelen `NVE_API_KEY`. Uten nøkkel feiler appen kontrollert og forklarer hva som mangler.
- PWA-cache, API health og ressurser er oppdatert til REV 27.

### Viktig om marine data

Tidevann og havstrøm fra Open-Meteo Marine er modellverdier. Oppløsning og nøyaktighet nær land er begrenset, så dataene brukes som fiskefaglig støtte og **aldri som navigasjonsgrunnlag**.

### NVE HydAPI på Render (valgfritt)

1. Opprett en gratis HydAPI-nøkkel hos NVE.
2. I Render: **Environment → Add Environment Variable**.
3. Key: `NVE_API_KEY`
4. Value: din NVE-nøkkel.
5. Redeploy.

Uten denne nøkkelen fungerer resten av appen normalt; bare live HydAPI-kortet er deaktivert.


## REV 22 – slukvalg varierer per fiskeplass

- Slukmotoren rangerer fortsatt bare agn fra din egen fotograferte slukboks.
- Valget bruker lys, skydekke, vind, eksponering, vannkant, dybde/grunnrisiko og art.
- Nær like gode alternativer fordeles stabilt per sone, slik at appen ikke later som samme sluk er entydig best på alle punkter.
- Sjøørret kan derfor veksle mellom blant annet prikkede/varme skjesluker, kontrastsluker, naturwobblere og blanke sjøsluker etter forholdene.
- Makrell veksler mellom blank metallsluk, naturwobbler og egne allroundagn når de er egnet.


## REV 21 – Beste plass nå og STOR FISK

REV 21 gjør appen mer direkte ute ved vannet:

- **Beste plass akkurat nå** vises som eget hovedkort med score, agn og rask kartknapp.
- **STOR FISK-modus** prioriterer tydelig vannkant/struktur og gir større gjeddeagn når gjedde er valgt.
- **Base + maks avstand** lar deg begrense forslag til 250 m, 500 m, 1 km eller 2 km fra GPS-posisjon eller valgt kartbase.
- **Korteste praktiske retning** vises med stiplet grønn linje fra base til beste sone.
- **Kastretning** vises med orange/gule linjer langs vannkanten for de tre beste sonene.
- API-et støtter nå `goal`, `baseLat`, `baseLon` og `radiusM` på `/api/zones`.
- PWA-cache og ressursversjoner er oppdatert til REV 21.

## Arter

**Sjø:** sjøørret, makrell og sei.
**Ferskvann:** ørret, abbor og gjedde.

Sjøørret er fortsatt standardvalg og beholder den etablerte sjøørretlogikken. Ferskvannsartene har egne poengmodeller, forklaringer og anbefalinger for sluktype, vekt, farge og vobblerstørrelse.

## Datagrunnlag

- MET Norway Locationforecast for vind, vindretning, skydekke, nedbør, lufttemperatur, lufttrykk og 3-timers trender
- OpenStreetMap-vannmaske og beregnet vannkant
- Open-Meteo Marine for sjøtemperatur, bølger, havstrøm og modellert havnivå/tidevann
- Kartverket sjøkart for sjømodus
- EMODnet-dybdeestimat bare i sjømodus
- 17 historisk omtalte sjøørretområder på Kirkøy fra Rosareke, kartfestet som omtrentlige referanseområder – ikke fangstgaranti eller dokumentasjon på lovlig fiske
- Gjeldende helårs fredningssoner fra FOR-2024-05-23-829 vises som et separat rødt kartlag. Én ugyldig koordinat i Lovdatas kildetekst tegnes ikke.

På desktop står header og kart fast mens resultatpanelet har egen vertikal scrolling. På mobil brukes vanlig dokumentscrolling uten et nestet, låst panel.

Neste synlige revisjon opprettes før publisering med `npm run revision:next`. Kommandoen øker den sentrale `appRevision`-verdien og oppdaterer bare synlig badge og README-overskrift.

Appen viser ikke EMODnet som innsjødybde. I ferskvannsmodus kan brukeren slå på et valgfritt WMS-lag fra **NVE Innsjødatabase/Dybdekart** med de publiserte lagene `DybdeKurve` og `DybdePunkt`. NVE har dybdekart for omtrent 600 kartlagte innsjøer; tomt kartlag betyr derfor «ingen publiserte dybdedata her», ikke null meter. Appen beregner ikke et lokalt dybdetall fra WMS-bildet og antar aldri at alle innsjøer har batymetri.

Offisielle kilder: [Dybdekart på data.norge.no](https://data.norge.no/nb/datasets/a797219c-8378-3914-9bde-1ae4db09e370/dybdekart), [Innsjødatabase](https://data.norge.no/nb/datasets/e2635327-91fb-32fb-9257-0f1e008244fc/innsjodatabase) og [NVE WMS-dokumentasjon](https://api.nve.no/doc/web-map-service-wms/). Dataene er kildeangitt i kartet og publisert med NLOD-vilkår.

REV 10 bruker 14 oppdaterte OneDrive-bilder av brukerens faktiske sluk, wobblere, spinnere, jigger, bombarda og fluer. Hvert bilderbrett er registrert i `public/data/user-lures.json` med kildefil, SHA-256, artsliste, vannmiljø, agntype, fargeprofil og usikkerhetsmerknad. Appen starter alltid med ett av disse fotograferte agnene. Anbefalt vekt er et situasjonsbasert startområde og må ikke tolkes som avlest vekt på et agn når merking ikke kan leses i bildet.

Saltvannsartene sjøørret, makrell og sei filtreres mot saltvannstaggete bilder. Ferskvannsørret, abbor og gjedde filtreres separat mot ferskvannstaggete bilder før rangering. Enkelte allroundagn kan være dokumentert for begge miljøer, men poengmodellen prioriterer rene sjø- eller ferskvannsbrett når de passer forholdene.

Hver sone viser i tillegg to generiske slukkombinasjoner utenfor det opplastede fotoutvalget, anbefalt slukhøyde i vannsøylen og arts-/forholdsbasert råd om opphengerflue, avstand og farge. De generiske kombinasjonene bruker lokale kopier av ekte Wikimedia Commons-referansefoto. Fotograf, lisens og kildelenke følger hvert bilde, og den maskinlesbare katalogen ligger i `public/lures/open/catalog.json`. Fotoet dokumenterer agntype/form; anbefalt størrelse, vekt og farge står i kortet og kan avvike fra eksemplaret på bildet. Slukhøyden er en praktisk startregel, ikke en målt fiskedybde. Kontroller fiskekort og lokale regler før bruk av ekstra krok eller agn.

REV 08 la til ett eksternt kildekontrollert valg i hvert sonekort. Modellens dokumenterte størrelsesområde, virkemåte eller oppgitte arts-/miljøbruk ble kontrollert mot produsentens produktside. Vær-/stedsmatchen er en sportsfaglig tommelfingerregel, ikke dokumentert fangsteffekt eller fangstgaranti. Den maskinlesbare kildelisten ligger i `public/data/source-backed-lures.json`; bildene er tydelig merkede Wikimedia-referansefoto for sluktypen og er ikke nødvendigvis bilder av den navngitte modellen.

REV 09 utvider katalogen til tolv kildekontrollerte modeller med Sølvkroken BRIS, Morild Inline, Spesial Classic med UV og URO. Hvert modellkort lenker nå både produsentens dokumentasjon og en separat fag-/artskilde: NJFF for sjøørret, ørret, abbor og gjedde, og Havforskningsinstituttet for makrell og sei. NJFF-lenkene presenteres som erfaringsbaserte sportsfiskeråd og HI-lenkene som artsbiologi – ingen av dem fremstilles som kontrollert dokumentasjon på fangsteffekt.

REV 10 krever i tillegg en gyldig norsk produktside for alle eksterne sekundærvalg og merker dem som **«Vanlig alternativ i Norge · sekundærvalg»**. Katalogen har elleve modeller: Abu Garcia Toby, Droppen og Atom, Rapala CountDown, Savage Gear Cannibal Shad og Sandeel samt Sølvkroken BRIS, Morild Inline, Spesial Classic med UV, URO og Stingsilda. Atom Vass og X-Rap Long Cast ble fjernet fordi de eksakte modellene ikke ble funnet i de kontrollerte norske butikkatalogene 7. august 2026. Stingsilda ble lagt til med dokumentasjon fra Sølvkroken og norsk produktside hos Jaktia. Norske forhandlerlenker er kontrollert hos Jaktia, Skitt Fiske og Magasinet.

REV 11 gjør vannmiljøet synlig på hvert eget bildevalg. API-et returnerer `waterEnvironment` med `saltwater` eller `freshwater`, norsk merkelapp, miljøspesifikk/allround-klassifisering, klassifiseringsgrunnlag og miljøtilpasset forbehold. Egne bilder klassifiseres konservativt etter synlig agntype, form og farge; ukjent modell, vekt, krokfinish eller rustbeskyttelse behandles ikke som produsentdokumentasjon. Saltvannskort minner derfor om skylling og kontroll av krok/splittring, mens ferskvannskort minner om fiskekort og lokale regler. Artsfilteret avviser fortsatt bildegrupper som ikke er tagget for riktig vannmiljø.

## Beste tidspunkt i dag

Appen rangerer opptil tre gjenværende tidsvinduer for valgt art. Beregningen bruker MET Norways timeprognose for vind og skydekke sammen med artstilpassede tommelfingerregler for lys/tid på døgnet. Forholdsscoren er ikke fangstsannsynlighet og gir ingen garanti for fangst. Når dagen ikke har flere prognosetimer igjen, opplyser appen dette i stedet for å vise et konstruert tidsvindu.

## Fangstlogg

Fangstloggen kan registrere både fangst og ingen fangst, art, dato/tid, sted, lengde, vekt, sluk/agn, notat og et øyeblikksbilde av været. Nye poster lagrer også nedbør og temperaturtrend når MET Norway leverer feltene. Data lagres bare i nettleserens `localStorage` på den aktuelle enheten og sendes ikke til serveren. Nettleserdata må derfor ikke slettes dersom loggen skal beholdes.

## Artsguide og personlige fangstmønstre

Alle seks arter har en egen veiledende guide for sesong, habitat, presentasjon, vannsøyle og viktige lokale hensyn. Ved artsskifte oppdateres guiden uten at øvrig kartfunksjon endres.

Appen beregner fangstrate, beste tidsrom, mest vellykkede agn og gjennomsnittsvær ved fangst fra den valgte artens lokale fangstlogg. Gjennomsnittsværet kan nå omfatte vind, skydekke, nedbør, temperatur og temperaturtrend. Med færre enn tre turer vises «For lite data» og ingen beste tidsrom eller agn utpekes. Fra tre til ni turer merkes resultatet som et tidlig mønster; først fra ti turer omtales det som et personlig mønster. Også turer uten fangst inngår i fangstraten.

Funksjonene er utviklet selvstendig for Fiste guiden. Ingen eksterne proprietære fangstpunkter, kartdata, apptekster, bilder eller kildekode inngår i modulen.

## Start lokalt

Krever Node.js 20 eller nyere.

```bash
npm ci
npm test
npm start
```

Åpne `http://localhost:3000`.

## API

- `GET /api/health`
- `GET /api/weather?lat=59.05&lon=10.05`
- `GET /api/zones?bbox=10.55,59.78,10.85,59.98&zoom=13&fish=orret`

`fish` kan være `sjoorret`, `makrell`, `sei`, `orret`, `abbor` eller `gjedde`. Manglende verdi beholder sjøørret som standard.

Kartutsnittet må ligge i Norge. Nye analyser krever nett; appskallet kan åpnes offline etter første besøk.

Analysen er veiledende. Kontroller lokale fiskeregler, fiskekort, fredningsbestemmelser, vær og sikkerhet før fiske.

## REV 21 – kart, mobiltilstand og kun egne sluker
- Kartverkets utdaterte `opencache.statkart.no`-URL er erstattet med offisiell `cache.kartverket.no` WMTS for sjøkart.
- EMODnet brukes bare som grovt dybdeestimat i analyse. Det gamle fargelagte `mean_multicolour`-kartet er fjernet fra kartvelgeren. Kartvisningen bruker Kartverkets Sjøkart Dybdedata WMS oppå et alltid synlig grunnkart.
- Valgt art, mål, radius, karttype, kartposisjon, zoom og base lagres lokalt og gjenopprettes etter modal/bak-knapp/reload på mobil.
- Slukmotoren kan kun velge fra brukerens `user-lures.json`. Eksterne referanseagn, generiske alternativer og stock-wobblere er deaktivert i anbefalingen.
- Hvert anbefalt slukbilde er beskåret til ett konkret agn fra brukerens egne fotografier (`public/lures/single/`).
- Artsvekting er skjerpet så ulike arter prioriterer relevante agn i samlingen i stedet for samme standardvalg.


## REV27
- Fiskekart bruker Kartverkets Sjøkart Dybdedata WMS oppå et alltid synlig grunnkart, slik at trege/manglende kartfliser ikke gjør kartet svart.
- Det grove fargelagte EMODnet-kartet er fjernet fra kartvelgeren; EMODnet brukes fortsatt kun som bakgrunnsestimat i analyse der tilgjengelig.
- Eget valg for Kartverket sjøkart raster via WMS.
- 43 sjørelaterte agn fra egne bilder er skilt i individuelle kandidater; total personlig slukboks har 49 kandidater.
- Hver sone returnerer opptil fem alternative sluker i tillegg til BEST NÅ.
- Navionics er ikke aktivert uten Garmin/Navionics developer key; vanlig Boating-abonnement alene gir ikke Web API-rettigheter.

## VIKTIG – riktig GitHub-struktur

Serveren leverer **kun** filer fra `public/`. Ikke legg `index.html`, `app.js`, `style.css`, `sw.js`, `data/` eller `lures/` løst i repo-roten.

REV 27 har en oppstartsjekk som stopper deploy hvis `package.json` sier REV 27 mens `public/index.html`, `public/app.js` eller service worker peker på en eldre revisjon. Dette hindrer at Render sier «deploy succeeded» mens nettsiden egentlig viser gammel kode.

## GitHub nettleseropplasting
Denne EASY-UPLOAD-utgaven er teknisk lik REV27, men de 79 individuelle slukbildene er pakket inn i `public/data/user-lures.json`. Hele prosjektet består derfor av under 100 filer og kan lastes opp i én operasjon i GitHubs nettlesergrensesnitt.