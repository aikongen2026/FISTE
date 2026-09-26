# Testresultat – Fiste guiden REV41

Kontrollert 26.09.2026.

- `node --check server.js`: OK
- `node --check public/app.js`: OK
- `npm test`: **53/53 tester OK**
- `npm run verify`: OK – REV 41 serveres fra `/public`
- Lokal serverstart: OK
- `/api/health`: OK – `v17-rev41`, `REV 41`

Testene dekker blant annet:
- NVE lag 5 → lag 4 → lag 2/1 med samme `vatnLnr`
- at dybder fra nabovann ikke brukes
- NVE-innsjøpolygon som ferskvannsgeometri
- fylt batymetri og dybdeetiketter
- deduplisering av varselmeldinger
- at manglende NVE-dybde er informasjon og ikke feil
- at lagret analyse bare merkes OFFLINE når `navigator.onLine` faktisk er false
- BiteGuide og egne slukbilder beholdt
- AutoDeploy-oppsett beholdt

NVE-kontroll:
- Offisielle NVE-lag og feltskjema er kontrollert mot Innsjødatabase2.
- Eksterne NVE-kall kan ikke kjøres full ende-til-ende i testcontaineren uten
  internettilgang. Request-/behandlingslogikken er derfor testet lokalt mot det
  verifiserte tjenesteskjemaet.
