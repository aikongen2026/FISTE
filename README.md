# Fiste guiden REV44 – Strategy Engine

REV44 bygger anbefalingen i riktig rekkefølge:

1. **Sted og mikrohabitat** – dybde, dybdekant, grunne/odde/bukt, vegetasjon og eksponering.
2. **Fiskens sannsynlige aktivitet** – art, vanntemperatur når tilgjengelig, lys, skydekke og vind.
3. **Presentasjon** – sannsynlig fiskedybde, fart, stopp/vibrasjon og kastbehov.
4. **Idealagn** – agntype, størrelse/profil og synlighetsprofil beregnes uten å se i slukboksen.
5. **Fra min slukboks** – alle 98 fotograferte sluker matches mot idealprofilen med absolutt score.

## Viktige endringer fra REV42

- Artscore kan ikke lenger alene gjøre en allroundsluk til vinner overalt.
- Mikrohabitat og arbeidsdybde teller tungt i slukvalget.
- `Stor fisk` påvirker faktisk ønsket slukprofil og straffer for små profiler når det er relevant.
- Stor/deep minnow klassifiseres fortsatt som minnow; størrelse vurderes separat.
- Spinner, minnow, skjesluk, vibrasjonsagn og casting-metal er separate fysiske strategier.
- Farge vurderes fra det faktiske fargefeltet for fotografert sluk, ikke en stor samling gamle bonus-tagger.
- Ukjent gram/lengde forblir **ukjent** – `null` blir ikke lenger tolket som 0.
- Matchscore er absolutt. Beste sluk kan f.eks. være 76/100 hvis boksen mangler en virkelig god match.
- Hver anbefaling viser delscore for art, type, habitat, dybde, størrelse, lys/sikt og vind samt datatillit.
- Taktiske alternativer velges etter reell forskjell i type, dybde, synlighet og aksjon – aldri tilfeldig rotasjon.
- NVE/Kartverket, BiteGuide-referanseagn, 3D-bunn, fersk/salt-separasjon og de 98 slukbildene er beholdt.

## AutoDeploy

Kjør `1-OPPDATER-OG-APNE-FISTE.bat` etter at ZIP-en er pakket ut. Scriptet synkroniserer mot `aikongen2026/FISTE`, pusher automatisk, venter på Render og åpner `https://fiste.onrender.com` når **REV44** svarer fra `/api/health`.

Første gang på en PC kan Git Credential Manager be om en engangsinnlogging til GitHub. Ingen token ligger i pakken.

## Nytt i REV44 – Sjøørretbekker i Agder

Fiste kan nå hente det offentlige ArcGIS-kartet **Sjøørretbekker i Agder** direkte fra den oppgitte app-id-en. Integrasjonen finner underliggende webkart/featurelag dynamisk i stedet for å låse appen til én gammel FeatureServer-URL.

Når Sjøørret (eller alle sjøarter) er valgt og kartet ligger i Agder, kan laget vise:
- bekkeforløp
- bekkeutløp
- menneskeskapte vandringshindre
- naturlige vandringshindre
- andre vandringshindre
- andre observasjoner

Laget ligger under **Mer → Kartlag og regler → Sjøørretbekker Agder**. Klikk på et objekt for kildeopplysninger og lenke til originalkartet.

Hvis et valgt sjøørretpunkt ligger nær et kartlagt bekkeløp/utløp/hinder, vises dette som egen biologisk kontekst under punktanalysen. Fiste gir bevisst ikke automatisk poengbonus bare fordi et punkt ligger nær en gytebekk eller et utløp; slike områder kan være juridisk sensitive og lokale fredningsregler må kontrolleres.
