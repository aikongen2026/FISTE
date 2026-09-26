# Fiste guiden REV40

Mobilførst kartapp for sjø- og ferskvannsfiske. REV40 beholder layouten fra REV39,
men retter sluklogikken og NVE-koblingen.

## BiteGuide
BiteGuide er uavhengig av brukerens slukboks. Den beregner en idealprofil for valgt
punkt (type, farge, størrelse/vekt, måldybde og presentasjon) ut fra art, lys/vær,
dybde/struktur og kildekontrollert veiledning. Deretter matches brukerens egne
fotograferte sluker mot denne profilen.

Det kopieres ikke proprietære fangstdata fra Fishbrain/DepthScout. Appen bruker den
samme nyttige arbeidsmåten (forhold + art + struktur), mens konkrete regler er lagt
på åpne/offentlige veiledninger og dokumenterte produktdata. Brukerens egen fangstlogg
kan gi et lite lokalt løft når det finnes nok relevante observasjoner.

## NVE
Ferskvannsdybde bruker NVE Innsjødatabase2. Appen krever at vannet finnes i NVE sitt
lag for innsjøer ved dybdemåling før den lager dybdekart/3D. Dybdekurver og punkter
paginers, og metadata om oppmåling vises som kvalitetsnivå. Manglende data gir et
ærlig «ingen oppmålt dybde» i stedet for modellert fantomidybde.

## Oppdatering
Dobbeltklikk `1-OPPDATER-OG-APNE-FISTE.bat`. AutoDeploy V2 leser revisjonen fra
`package.json`, pusher til det konfigurerte GitHub-repoet og venter på Render.
Normalt trenger du ikke åpne GitHub eller Render manuelt.
