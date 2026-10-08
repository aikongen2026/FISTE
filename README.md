# Fiste guiden REV42

REV42 bygger videre på REV41 og oppgraderer BiteGuide + «Sluk fra min boks» til et komplett totrinnssystem.

## Nytt
- BiteGuide beregner først ideal agntype, farge, størrelse, dybde og presentasjon uavhengig av brukerens beholdning.
- Tre referansevalg med bilder: Beste nå / Mer naturlig / Mer synlig. Referansebildene er ikke brukerens egne sluker.
- 98 individuelt fotograferte sluker er analysert og lagt inn i egen database.
- Hard sperre mellom ferskvann og saltvann i automatisk anbefaling.
- Egnethetsprior per art: ørret, sjøørret, abbor, gjedde, makrell og relevante sjøagn for sei.
- Match bruker lys, skydekke, vind, nedbør, antatt vannklarhet, dybde, struktur, vann-/sjøtemperatur der tilgjengelig, tidevann og målart.
- Alternativer velges som taktisk forskjellige valg, ikke tilfeldig rotasjon.
- Fangstloggen kan fortsatt gi en liten lokal bonus, men først etter minst tre turer og to relevante fangster.
- NVE/Kartverket-kart, 3D, Live GPS og REV41-feilretting beholdes.

## Automatisk deploy
Kjør `1-OPPDATER-OG-APNE-FISTE.bat`. Scriptet oppdaterer repoet `aikongen2026/FISTE`, pusher endringene, venter på Render og åpner `https://fiste.onrender.com` når REV42 er live. Første gang kan Git Credential Manager be om GitHub-innlogging.

Å bare åpne `fiste.onrender.com` laster siste versjon som allerede er deployet; nettleseren kan ikke laste opp denne ZIP-en til GitHub av seg selv.
