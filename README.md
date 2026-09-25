# Fiste guiden REV39 – mobil, automatisk NVE og BiteGuide

REV39 bygger videre på den stabile mobilutgaven og holder kartet i fokus.

## Kartmenyen er ryddet
Bare disse kartvalgene står igjen:
- **Fiskekart – dybder** – standardvalget. Sjø bruker Kartverkets dybdedata; ferskvann kobler automatisk inn NVE-dybder der de finnes.
- **Detaljert topo**
- **3D bunn / terreng** – i ferskvann brukes NVE-bunn direkte når oppmålte data finnes.
- **Satellitt**
- **Kartverket sjøkart** – skjules automatisk for ferskvannsarter.

Turkart, Terrengskygge, Standardkart og Hybrid er fjernet.

## Automatisk ferskvann
Når Ørret, Abbor eller Gjedde velges:
- appen går til Fiskekart som arbeidskart når arten skiftes,
- NVE Innsjødatabase brukes automatisk,
- DybdeKurve og DybdePunkt tegnes direkte fra NVE REST,
- dybde og undervannsstruktur brukes i artsrangeringen når data finnes,
- kartet sier tydelig fra hvis vannet ikke har oppmålte NVE-dybder.

Appen lager ikke falske dybdekoter for vann uten oppmåling.

## Artskobling
NVE-dybde inngår i den eksisterende habitatmodellen:
- Ørret favoriserer passende mellomdybde og tydelige dybdekanter.
- Abbor favoriserer grunn/mellomdyp struktur.
- Gjedde favoriserer grunnere kanter.
Vær, vannkant og tidspunkt brukes fortsatt sammen med dybden.

## BiteGuide og slukbilder
Brukerens eksisterende slukbilder og slukboks er beholdt. Hvert valgt punkt har BiteGuide med BiteScore, BiteTime, sluktype, farge, størrelse/vekt og presentasjon.

## 3D-bunn
- tettere mobilrutenett,
- to glattepass for mindre blokkete flate,
- dybdekonturer over 3D-flaten,
- NVE-bunn i ferskvann der måledata finnes,
- Kartverket i sjø.

## Start / deploy
Kjør `1-OPPDATER-OG-APNE-FISTE.bat` som før.
