# Fiste guiden REV38 – mobil, BiteGuide og bedre 3D

REV38 bygger videre på REV37 som stabil base, men er ryddet for telefonbruk slik at kartet får mest mulig plass.

## Mobiloppsett
- Filtre og kartvalg ligger i én nedtrekksmeny på telefon.
- Kartet er hovedflaten og er ca. 64–67 % av skjermhøyden på mobil.
- 10 beste punkter er lukket som standard.
- Vær, kartlag/regler og fangstlogg ligger samlet under **Mer**.
- Valgt punkt viser bare kort sammendrag først. Detaljer åpnes ved behov.
- Karttrykk på nummererte punkter velger punktet uten å hoppe nedover siden.

## BiteGuide per punkt
Når et anbefalt punkt velges får det en egen nedtrekksmeny med:
- BiteScore 0–100
- BiteTime for de neste timene
- beste tidspunkt i prognosevinduet
- anbefalt sluktype
- anbefalt farge
- anbefalt størrelse/vekt
- anbefalt innsveiving/presentasjon

BiteGuide bruker Fiste sine egne vær-/habitatdata og den eksisterende slukmotoren. Den kopierer ikke data fra Fishbrain. BiteScore er en veiledende forholdsscore, ikke fangstsannsynlighet.

## Dine slukbilder er beholdt
`public/data/user-lures.json` og de eksisterende lure-bildemappene er beholdt. Førstevalg og alternativer vises fortsatt med bilder fra brukerens slukboks.

## Bedre 3D-bunn
- Høyere, men fortsatt mobilvennlig rutenett.
- Lett glatting av overflaten for mindre blokkete 3D.
- Dybdekonturer tegnes over 3D-overflaten for bedre lesbarhet.
- Sjø bruker Kartverkets høyde-/dybdedata.
- Ferskvann forsøker NVE Innsjødatabase/Dybdekart og bygger 3D fra faktiske dybdekurver og dybdepunkter der data finnes.
- Hvis NVE ikke har oppmålte dybdedata for vannet, lager appen ikke falske dybder.

## Kilder
Kartverket, MET Norway, NVE, OpenStreetMap og eksisterende marine kilder fra REV37. Eksterne dybdedata er veiledende og skal ikke brukes til navigasjon.

## Start / deploy
Bruk samme én-klikk deploy som tidligere via `1-OPPDATER-OG-APNE-FISTE.bat`.
