# Fiste guiden REV41

Mobilførst kartapp for sjø- og ferskvannsfiske. REV41 beholder det som fungerte i REV40,
men løfter ferskvannskartet og rydder opp i feil-/statusmeldinger.

## Ferskvannskart og NVE
Ferskvannsdybde bruker NVE Innsjødatabase2 og kobles nå sikkert til riktig innsjø:

1. Mål-/referansevannet identifiseres først i NVE Innsjødatabase (lag 5).
2. Appen sjekker om akkurat samme `vatnLnr` har dybdekartmetadata i lag 4.
3. Bare da hentes DybdeKurve (lag 2) og DybdePunkt (lag 1) for samme vann-ID.

Dette hindrer at dybder fra et nabovann blir lagt oppå feil innsjø. Dybdekurver og
målepunkter pagineres. Oppmålingsmetadata brukes til kvalitetsmerking.

Når NVE har målinger, tegnes et mer DepthScout-lignende fiskekart med:
- blå dybdeband/fylt batymetri under kotene
- tydelige NVE-dybdekoter
- utvalgte dybdetall direkte på kartet
- datakvalitet/oppmålingsstatus
- samme måledata videre inn i ferskvanns-3D

Når NVE ikke har oppmålt dybde for vannet, viser appen detaljert topo og en kort
informasjonstekst. Den lager ikke falske dybdekoter eller låner data fra nabovann.

Store norske innsjøer bruker dessuten NVE-innsjøpolygon som førstevalg ved generering
av sikre fiskesoner, med OSM som fallback. Det reduserer unødvendige eksterne feil og
0-soner ved svak OSM-respons.

## BiteGuide
BiteGuide er uavhengig av brukerens slukboks. Den beregner først en idealprofil for
valgt punkt (type, farge, størrelse/vekt, måldybde og presentasjon) ut fra art,
lys/vær, dybde og struktur. Deretter matches brukerens egne fotograferte sluker mot
den profilen. Egne fangstlogger kan påvirke rangeringen forsiktig når det finnes nok
relevante observasjoner.

## Ryddigere status og feil
REV41 skiller mellom normal mangel på data og reelle feil:
- «ingen oppmålt NVE-dybde» er informasjon, ikke en stor feilmelding
- båtrampefeil gjentas ikke i varselboksen
- identiske advarsler dedupliseres
- appen skriver bare OFFLINE når nettleseren faktisk er offline
- sonelasting prøves på nytt før lagret analyse brukes

## Oppdatering
Dobbeltklikk `1-OPPDATER-OG-APNE-FISTE.bat`. AutoDeploy V2 leser revisjonen fra
`package.json`, pusher til det konfigurerte GitHub-repoet og venter på Render.
Normalt trenger du ikke åpne GitHub eller Render manuelt.
