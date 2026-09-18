# Fiste guiden REV28 – sømløs kartmodus

Bygger på REV27, men bruker samme arbeidsflyt som Mistra-versjonen: kartet først, valgt sone øverst i høyrepanelet, topp 10 i utsnittet og resten i nedtrekk.

## Nytt
- Klikk i kartet setter automatisk referansepunkt; klikk et nytt sted for å flytte det.
- De 10 beste sonene oppdateres automatisk når kartet flyttes/zoomes.
- Klikk sone eller nummer -> sluk, alternativer og fiskeråd vises direkte øverst til høyre.
- Live GPS beholdt.
- Flere Kartverket-kartlag.
- Personlige slukbilder er flyttet ut av den 2,2 MB store JSON-en og til separate bildefiler. API-svar blir derfor vesentlig mindre.
- Service worker forhåndslagrer bare kjernen; tunge bilder caches ved behov.
- Analyse-kandidater redusert fra 180 til 120 uten å redusere topp-listen.

Last opp innholdet i denne mappen til GitHub-repoets rot og deploy som før på Render.
