# Testresultat – Fiste guiden REV30

Kontrollert lokalt før pakking:

- `node -c server.js`: OK
- `node -c public/app.js`: OK
- `npm run verify`: OK
- `npm test`: 28/28 bestått
- lokal `/api/health`: OK, rapporterer REV30 + HSI-splitt + habitatlag + dybdeprofil + hardt fredningsfilter

Eksterne sanntidskilder kan ikke sluttverifiseres fra byggemiljøet. Koden faller derfor tilbake uten å stoppe analysen dersom habitat-, marine- eller dybdetjenester er midlertidig utilgjengelige. Confidence/datagrunnlag reduseres tilsvarende.
