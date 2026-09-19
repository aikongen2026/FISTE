# Fiste guiden REV36 – mobilfikset 3D

REV36 retter mobilvisningen av 3D og flytter **3D bunnkart** ut av kartflaten. Bunnkartet ligger nå som en nedtrekksseksjon rett under hovedkartet. Det normale kartet forblir synlig, og 3D-bunnen rendres lokalt i Canvas uten Plotly-avhengighet.

## Viktigste endringer i REV36
- 3D bunnkart ligger under kartet som en `<details>`-nedtrekksmeny.
- Mobilvennlig Canvas-rendering: dra for rotasjon, to fingre for zoom, egen nullstill-knapp.
- Mindre bunnrutenett på mobil for raskere og mer stabil lasting.
- 3D topo har WebGL-sjekk og to CDN-fallbacks for MapLibre.
- Terrengmodellen bruker Terrarium DEM og vanlig Kartverket topo/dybde som kartlag.
- Gammel lagret `bathy3d`-kartmodus migreres automatisk til detaljert topo + nytt bunnpanel.
- Service-worker/cache og deploykontroller er oppdatert til REV36.

---

## REV35 – 3D-bunn kartfiks
- Retter hovedfeilen i REV33: høyder over havet blir ikke lenger gjort om til falske dybder med absoluttverdi.
- GeoTIFF-ens faktiske geografiske avgrensning brukes, slik at 3D-modellen ligger på samme sted som 2D-kartet.
- Lengdegrad/breddegrad omregnes til lokale meter før 3D-rendering, slik at kystlinje og bunn ikke strekkes feil.
- Sjøbunn, landterreng og vannflate rendres separat for en FjordSpot-lignende 3D-presentasjon.
- Hotspots og referansepunkt plasseres i samme koordinatsystem som bunnmodellen.
- Status viser faktisk kilderaster (~115 m for EMODnet) i stedet for å kalle frontend-resampling for datagrunnlag.

## Nytt i REV35 – 3D bunn
- Nytt kartvalg **3D bunn / dybder** for sjø.
- Henter EMODnet Bathymetry-raster først når 3D-bunn åpnes, så vanlig appstart forblir rask.
- Interaktiv roterbar bunnmodell med dybdekurver, dybdeskala og Fistes 10 beste punkter som flagg/etiketter over modellen.
- **Ovenfra**, **3D skrå** og **Oppdater bunn** ligger i et lite kart-HUD.
- Dybden er modellert bathymetri og er ikke ekkolodd eller navigasjonsgrunnlag.
- Ferskvann bruker fortsatt 3D terreng og NVE-dybdekart der NVE har publisert data.

# Fiste guiden REV35 – smart, kompakt analyse

REV35 bygger direkte på REV31 og beholder den raske Mistra-inspirerte arbeidsflyten: kart først, valgt sone øverst, 10 beste steder, Live GPS og faktiske slukbilder fra brukerens egen slukboks.

## Nytt i REV35

- Nytt kartvalg **3D topo / terreng**. MapLibre lastes først når 3D velges, slik at vanlig 2D-kart fortsatt starter like raskt.
- 3D-visningen bruker terreng-Dem og Kartverket-topografi, med skrå/roterbar kameravisning.
- De 10 anbefalte sonene, valgt punkt, kastretning, referansepunkt og Live GPS-spor synkroniseres til 3D-kartet.
- I saltvann legges Kartverkets dybdedata som et halvtransparent kartlag over 3D-visningen. Dette er dybdekoter/kartdata, ikke en ekte lokal 3D-ekkoloddmodell.
- Kjent regional fredningsgrense og historisk sjøørretlag synkroniseres også til 3D-visningen.
- Knappene **2D ovenfra** og **3D skrå** gjør det raskt å veksle kameravinkel uten å forlate 3D-kartet.
- Normal Leaflet-analyse kjører fortsatt under panseret; 3D er en visning og endrer ikke scoremotoren.

- Deler analysen i **Habitat**, **Akkurat nå**, **Total** og **Datagrunnlag %**.
- Habitat og vær/sjøforhold blandes ikke lenger sammen til én utydelig score.
- Alle ekstra forklaringer ligger i **nedtrekksmenyer** i valgt sone, slik at høyrepanelet fortsatt er ryddig.
- Beregner kyststruktur og en rask dybdegradient. Bratte marbakker og tydelige dybdekanter får egen strukturverdi.
- **Detaljert modellert dybdeprofil** hentes først når menyen «Dybde og struktur» åpnes. Det holder hovedanalysen raskere.
- Dybde merkes som **modellert** når den kommer fra EMODnet. Appen later ikke som dette er lokal ekkoloddmåling.
- Marine naturtyper brukes som skjulte analysefaktorer når offentlige tjenester svarer:
  - større tareskogsforekomster
  - ålegras
  - skjellsand
  - bløtbunn
  - gyteområder
  - oppvekst-/beiteområder
- Dataene hentes fra Miljødirektoratets Marine naturtyper (HB19) og Fiskeridirektoratets kystnære fiskeridata.
- Fravær av registrert naturtype brukes ikke som bevis på at naturtypen ikke finnes. Datadekningen vises separat.
- Kjent helårsfredning i det innlastede regionale regelsettet er **hardfilter** og kommer ikke inn i topp 10.
- 10 beste punkter velges nå fra en større billig forhåndsvurdering før de dyrere dybde-/habitatoppslagene kjøres.
- REV29 sitt harde sjøørretfilter er beholdt, så gjedde-/ferskvannsagn slipper ikke inn i sjøørretlisten.
- Personlig fangstlæring og Live GPS er beholdt.

## Høyrepanelet

Det som alltid vises:

- Total score
- Habitat-score
- Nå-score
- Datagrunnlag %
- førstevalg fra egen slukboks med bilde
- tre alternative sluker med bilder
- kort fisketeknikk

Resten ligger lukket som standard:

1. Hvorfor akkurat her
2. Dybde og struktur
3. Habitat i området
4. Fredning og regler
5. Datagrunnlag

## Viktig om dybde og habitat

EMODnet-profilen er modellert og har grov oppløsning. Den skal brukes til fiskestruktur, ikke navigasjon. Kartverket sitt dybdekart/sjøkart er fortsatt tilgjengelig som kartlag der tjenesten dekker området.

Marine naturtypekart har ufullstendig geografisk dekning. REV35 rapporterer derfor egen confidence/datadekning og bruker ikke manglende registrering som et negativt bevis.

## Datakilder brukt i analysen

- MET Norway – vær
- Open-Meteo Marine – sjøtemperatur, bølger, strøm og tidevannsmodell der tilgjengelig
- EMODnet Bathymetry – modellert dybde og profil
- OpenStreetMap – vannmaske/kystgeometri
- Miljødirektoratet – Marine naturtyper (HB19)
- Fiskeridirektoratet – kystnære fiskeridata, blant annet gyte- og oppvekstområder
- Lokalt innlastet regionalt forskriftslag for kjente helårsforbud

## Deploy

Den enkleste måten er fortsatt:

1. Pakk ut ZIP-en.
2. Dobbeltklikk `1-OPPDATER-OG-APNE-FISTE.bat`.
3. Scriptet synkroniserer til `aikongen2026/FISTE`.
4. Render Auto-Deploy bygger REV35.
5. Scriptet venter på `/api/health` og åpner appen når REV35 er live.

Første gang kan Git/GitHub be om innlogging.

## One-click oppdatering - FIX
`1-OPPDATER-OG-APNE-FISTE.bat` installerer nå Git for Windows automatisk ved behov. Den prøver først Windows Package Manager (winget), og bruker offisiell Git for Windows-installasjon som reserve. Etter installasjon fortsetter samme kjøring til GitHub og Render.


## REV35 – 3D bunn
3D-bunnen hentes som et JSON-rutenett fra Kartverkets åpne høyde- og dybdedata-API. Nettleseren trenger ikke lenger å tolke GeoTIFF fra EMODnet. Dette gjør 3D-visningen mer robust og bruker samme offisielle norske høyde-/dybdekilde for sjø og land. Dybdene er kun til planlegging, ikke navigasjon.
