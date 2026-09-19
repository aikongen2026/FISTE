## Nytt i REV33 – 3D bunn
- Nytt kartvalg **3D bunn / dybder** for sjø.
- Henter EMODnet Bathymetry-raster først når 3D-bunn åpnes, så vanlig appstart forblir rask.
- Interaktiv roterbar bunnmodell med dybdekurver, dybdeskala og Fistes 10 beste punkter som flagg/etiketter over modellen.
- **Ovenfra**, **3D skrå** og **Oppdater bunn** ligger i et lite kart-HUD.
- Dybden er modellert bathymetri og er ikke ekkolodd eller navigasjonsgrunnlag.
- Ferskvann bruker fortsatt 3D terreng og NVE-dybdekart der NVE har publisert data.

# Fiste guiden REV33 – smart, kompakt analyse

REV33 bygger direkte på REV31 og beholder den raske Mistra-inspirerte arbeidsflyten: kart først, valgt sone øverst, 10 beste steder, Live GPS og faktiske slukbilder fra brukerens egen slukboks.

## Nytt i REV33

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

Marine naturtypekart har ufullstendig geografisk dekning. REV33 rapporterer derfor egen confidence/datadekning og bruker ikke manglende registrering som et negativt bevis.

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
4. Render Auto-Deploy bygger REV33.
5. Scriptet venter på `/api/health` og åpner appen når REV33 er live.

Første gang kan Git/GitHub be om innlogging.

## One-click oppdatering - FIX
`1-OPPDATER-OG-APNE-FISTE.bat` installerer nå Git for Windows automatisk ved behov. Den prøver først Windows Package Manager (winget), og bruker offisiell Git for Windows-installasjon som reserve. Etter installasjon fortsetter samme kjøring til GitHub og Render.
