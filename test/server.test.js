const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const app=require('../server');
const pkg=require('../package.json');
const root=path.join(__dirname,'..','public');

test('REV43 exports core scoring and environment helpers',()=>{
  for(const name of ['computeScore','environmentalScoreAdjustments','moonInfo','deriveMarineSummary','validateZoneRequest','createServer','weather','marine','hydrology','boatRamps']) assert.equal(typeof app[name],'function',name);
  assert.equal(pkg.appRevision,43);
});

test('score is bounded and reacts to marine conditions',()=>{
  const base={fishType:'sjoorret',wind:4,windDirection:220,cloud:70,temp:10,tempTrend:-.5,pressureTrend:0,coastQuality:.72,exposure:.65,hour:7,depthMeters:4,moonIllumination:.5};
  const good=app.computeScore({...base,seaTemp:11,waveHeight:.45,currentVelocity:.8,tideTrend3h:.12});
  const poor=app.computeScore({...base,seaTemp:21,waveHeight:2.2,currentVelocity:5,tideTrend3h:0});
  assert.ok(good.score>=0&&good.score<=100);
  assert.ok(poor.score>=0&&poor.score<=100);
  assert.ok(good.score>poor.score);
  assert.equal(good.breakdown.sjoetemperatur,4);
  assert.equal(good.breakdown.tidevann,3);
});

test('pressure adjustment is species-safe and low weight',()=>{
  const falling=app.environmentalScoreAdjustments('orret',{pressureTrend:-2,moonIllumination:.5});
  const rising=app.environmentalScoreAdjustments('orret',{pressureTrend:5,moonIllumination:.5});
  assert.ok(falling.lufttrykk>rising.lufttrykk);
  assert.ok(Math.abs(falling.maane)<=1);
});

test('moon helper returns a bounded phase and illumination',()=>{
  const moon=app.moonInfo(new Date('2026-09-05T20:00:00Z'));
  assert.ok(moon.phase>=0&&moon.phase<=1);
  assert.ok(moon.illumination>=0&&moon.illumination<=1);
  assert.match(moon.weight,/svak/i);
});

test('marine summary derives tide trend and extrema',()=>{
  const json={current:{time:'2026-09-05T12:00',sea_surface_temperature:15.2,wave_height:.4,wave_direction:240,wave_period:4.8,sea_level_height_msl:.12,ocean_current_velocity:.7,ocean_current_direction:80},hourly:{time:['2026-09-05T11:00','2026-09-05T12:00','2026-09-05T13:00','2026-09-05T14:00','2026-09-05T15:00','2026-09-05T16:00','2026-09-05T17:00'],sea_level_height_msl:[.05,.12,.2,.29,.36,.31,.2]}};
  const marine=app.deriveMarineSummary(json);
  assert.equal(marine.seaTemp,15.2);
  assert.equal(marine.tideState,'stigende');
  assert.ok(marine.tideTrend3h>0);
  assert.equal(marine.nextHigh.time,'2026-09-05T15:00');
  assert.match(marine.caveat,/navigasjon/i);
});

test('zone request validation still protects Norwegian bounds',()=>{
  assert.deepEqual(app.validateZoneRequest('9.9,58.9,10.2,59.2','13'),{west:9.9,south:58.9,east:10.2,north:59.2,zoom:13});
  assert.throws(()=>app.validateZoneRequest('3,57,32,72','13'),/stort/i);
});

test('REV43 base radius creates a search box centered on base',()=>{
  const b=app.searchBoundsForBase(59.2,10.9,250,12);
  assert.equal(b.zoom,16);
  assert.ok(b.west<10.9&&b.east>10.9&&b.south<59.2&&b.north>59.2);
  const centerLat=(b.south+b.north)/2,centerLon=(b.west+b.east)/2;
  assert.ok(Math.abs(centerLat-59.2)<1e-9);assert.ok(Math.abs(centerLon-10.9)<1e-9);
  const oneKm=app.searchBoundsForBase(59.2,10.9,1000,12);
  assert.equal(oneKm.zoom,14);assert.ok((oneKm.east-oneKm.west)>(b.east-b.west));
});

test('REV43 accepts all-sea selection without treating it as a single species',()=>{
  assert.equal(app.normalizeFishSelection('all'),'all');
  assert.equal(app.normalizeFishSelection('makrell'),'makrell');
  assert.throws(()=>app.normalizeFishType('all'),/Ugyldig/);
});

test('health reports REV43, marine support and NVE configuration state',async t=>{
  const server=app.createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>server.close());
  const health=await fetch(`http://127.0.0.1:${server.address().port}/api/health`).then(r=>r.json());
  assert.equal(health.ok,true);assert.equal(health.version,'v19-rev43');assert.equal(health.revision,'REV 43');assert.equal(health.marine,true);assert.equal(typeof health.nveHydApiConfigured,'boolean');
});

test('PWA shell exposes marine, NVE, catch export and owned-lure helpers',()=>{
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const js=fs.readFileSync(path.join(root,'app.js'),'utf8');
  assert.match(html,/REV 43/);assert.match(html,/multiSpeciesCard/);assert.match(html,/Ingen – vis alle sjøarter/);assert.match(html,/marineCard/);assert.match(html,/hydrologyCard/);assert.match(html,/conditionToggle/);assert.match(html,/boatRampToggle/);assert.match(html,/exportGpx/);assert.match(html,/ownedLures/);
  assert.match(js,/applyPersonalRanking/);assert.match(js,/clearBasePoint/);assert.match(js,/focusBaseRadius/);assert.match(js,/speciesColors/);assert.match(js,/exportCatchGpx/);assert.match(js,/analysisCacheKey/);assert.match(js,/renderConditionVectors/);assert.match(js,/loadBoatRamps/);assert.match(js,/loadHydrologyAtCenter/);assert.match(html,/id="live"/);assert.match(html,/liveHud/);assert.match(js,/watchPosition/);assert.match(js,/currentAnalysisBase/);assert.match(js,/liveTrackLayer/);
});

test('asset versions and service worker cache are REV43',()=>{
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
  assert.match(html,/app\.js\?v=43\.0/);assert.match(html,/fishing-insights\.js\?v=43\.0/);assert.match(html,/style\.css\?v=43\.0/);
  assert.match(sw,/fiste-guiden-rev43/);assert.doesNotMatch(sw,/rev22/);assert.match(sw,/\/api\//);
});


test('REV43 detailed fishing map uses Kartverket depth WMS and no EMODnet color overlay',()=>{
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const js=fs.readFileSync(path.join(root,'app.js'),'utf8');
  assert.match(html,/Fiskekart – dybder/);
  assert.match(html,/Kartverket sjøkart/);
  assert.match(js,/wms\.dybdedata2/);
  assert.match(js,/layers:'Dybdedata2'/);
  assert.doesNotMatch(js,/mean_multicolour/);
  assert.match(js,/tileSize:512/);
});

test('map reload loop protection remains intact',()=>{
  const js=fs.readFileSync(path.join(root,'app.js'),'utf8');
  assert.doesNotMatch(js,/map\.on\(['"]moveend/);assert.match(js,/map\.on\(['"]dragend zoomend/);assert.match(js,/ResizeObserver/);
});

test('mobile touch targets and new UI styles exist',()=>{
  const css=fs.readFileSync(path.join(root,'style.css'),'utf8');
  assert.match(css,/leaflet-control-zoom a[^}]*44px/s);assert.match(css,/condition-vector/);assert.match(css,/personal-boost/);assert.match(css,/catch-export/);
});

test('catch data remains local and personal ranking has a minimum sample threshold',()=>{
  const js=fs.readFileSync(path.join(root,'app.js'),'utf8');
  assert.match(js,/localStorage\.setItem\(catchStorageKey/);assert.match(js,/insight\.sessions<3/);assert.match(js,/personalAdjustment/);assert.doesNotMatch(js,/fetch\([^\n]*catchStorageKey/);
});

test('REV43 personal lure box contains all 98 analysed photographed lures',()=>{
  const data=JSON.parse(fs.readFileSync(path.join(root,'data','user-lures.json'),'utf8'));
  assert.equal(data.lures.length,98);
  assert.ok(data.lures.every(item=>item.image&&item.species?.length&&item.waterTypes?.length));
  assert.ok(data.lures.every(item=>typeof item.allowFreshwaterAuto==='boolean'&&typeof item.allowSaltwaterAuto==='boolean'));
  assert.ok(data.lures.every(item=>item.speciesPrior&&typeof item.identificationConfidence==='number'));
  assert.equal(new Set(data.lures.map(item=>item.image)).size,98);
  const rec=app.recommendLure({fishType:'sjoorret',hour:19,cloud:65,wind:4,temp:13,exposure:.6,coastQuality:.8,depthMeters:4,lat:59.2,lon:10.9,structureLabel:'Tydelig dybdekant'});
  assert.ok(rec.alternatives.length>=4);assert.notEqual(rec.alternatives[0].image,rec.image);assert.doesNotMatch(rec.weight,/^0(?:[,.]0)? g$/);
});

test('REV43 LIVE GPS implementation follows position and refreshes analysis',()=>{
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const js=fs.readFileSync(path.join(root,'app.js'),'utf8');
  const css=fs.readFileSync(path.join(root,'style.css'),'utf8');
  assert.match(html,/id="live"/);assert.match(html,/liveHudText/);
  assert.match(js,/navigator\.geolocation\.watchPosition/);assert.match(js,/map\.panTo\(latlng/);assert.match(js,/now-liveLastAnalysisAt>=20000/);assert.match(js,/movedSinceAnalysis>=60/);assert.match(js,/currentAnalysisBase\(\)/);
  assert.match(css,/live-hud/);assert.match(css,/live-active/);
});

test('hydrology endpoint fails gracefully when no NVE key is configured',async()=>{
  if(process.env.NVE_API_KEY) return;
  const data=await app.hydrology(59.2,10.9);
  assert.equal(data.available,false);assert.match(data.reason,/NVE_API_KEY/);assert.match(data.setup,/miljøvariabel/i);
});

test('marine scoring breakdown can contain negative contributions without formatting bug',()=>{
  const js=fs.readFileSync(path.join(root,'app.js'),'utf8');
  assert.match(js,/Number\(value\)>0\?'\+':''/);
  const result=app.computeScore({fishType:'sjoorret',wind:12,cloud:10,temp:22,tempTrend:1,pressureTrend:5,coastQuality:.4,exposure:.2,hour:13,seaTemp:22,waveHeight:2,currentVelocity:5,tideTrend3h:0,moonIllumination:.95});
  assert.ok(Object.values(result.breakdown).some(value=>value<0));
});



test('REV43 separates habitat, live conditions and confidence',()=>{
  const live=app.computeLiveScore({fishType:'sjoorret',wind:4,cloud:75,hour:7,exposure:.7,seaTemp:11,waveHeight:.4,currentVelocity:.5,tideTrend3h:.08,pressureTrend:-1});
  const habitat=app.computeHabitatScore({fishType:'sjoorret',coastQuality:.85,depth:{meters:4},structure:{available:true,label:'Tydelig dybdekant',score:90},habitat:{serviceAvailable:true,eelgrass:true,kelp:false,shellSand:true,softBottom:false,spawningArea:false,nurseryArea:true},goal:'numbers'});
  const confidence=app.buildAnalysisConfidence({weather:{wind:4,windDirection:220,cloud:75,temp:10},marine:{seaTemp:11,waveHeight:.4,currentVelocity:.5,tideTrend3h:.08},depth:{meters:4,source:'EMODnet'},structure:{available:true,label:'Tydelig dybdekant'},habitat:{serviceCoveragePercent:100},waterType:'saltwater'});
  assert.ok(live.score>=0&&live.score<=100);assert.ok(habitat.score>=0&&habitat.score<=100);assert.equal(confidence.confidence,100);
  assert.ok(habitat.factors.some(x=>x.key==='naturtype'));
});

test('REV43 depth structure distinguishes steep from flat profiles',()=>{
  const steep=app.classifyQuickStructure(2,10,280),flat=app.classifyQuickStructure(3,3.5,280);
  assert.equal(steep.available,true);assert.ok(steep.score>flat.score);assert.match(steep.label,/kant|marbakke/i);
  const profile=app.classifyDepthProfile([{distanceM:0,meters:2},{distanceM:75,meters:3},{distanceM:150,meters:6},{distanceM:300,meters:10}]);
  assert.equal(profile.available,true);assert.ok(profile.maxSlopeMPer100>0);
});

test('REV43 hard restriction status is exposed separately from fish score',()=>{
  const clear=app.legalStatusForPoint(59.4,10.6);assert.equal(typeof clear.blocked,'boolean');assert.match(clear.status,/forbud|kjent/i);
});

test('REV43 selected card keeps advanced analysis in dropdowns',()=>{
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const js=fs.readFileSync(path.join(root,'app.js'),'utf8');
  const css=fs.readFileSync(path.join(root,'style.css'),'utf8');
  assert.match(js,/biteGuideHtml/);assert.match(js,/Hvorfor akkurat her/);assert.match(js,/Dybde og struktur/);assert.match(js,/Mer analyse/);assert.match(js,/Regler/);assert.match(js,/Datagrunnlag/);assert.match(js,/api\/depth-profile/);
  assert.match(css,/analysis-score-strip/);assert.match(css,/zone-detail/);assert.match(css,/depth-profile/);
  assert.match(html,/REV 43/);
});

test('REV43 health advertises HSI split, habitat layers and depth profiles',async t=>{
  const server=app.createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>server.close());
  const health=await fetch(`http://127.0.0.1:${server.address().port}/api/health`).then(r=>r.json());
  assert.equal(health.hsiSplit,true);assert.equal(health.habitatLayers,true);assert.equal(health.depthProfiles,true);assert.equal(health.hardRestrictionFilter,true);
});

test('REV43 hard water-environment gate keeps freshwater-only lures out of sea recommendations',()=>{
  const catalog=JSON.parse(fs.readFileSync(path.join(root,'data','user-lures.json'),'utf8')).lures;
  const byImage=new Map(catalog.map(x=>[x.image,x]));
  for(const fishType of ['sjoorret','makrell','sei']) for(const hour of [5,12,20]) for(const cloud of [10,70,95]) for(const wind of [1,6,11]) for(const depthMeters of [1,7,25]){
    const rec=app.recommendLure({fishType,hour,cloud,wind,temp:10,exposure:wind>=8?.85:.35,coastQuality:.8,depthMeters,lat:59.1+hour/1000,lon:10.8+cloud/10000,structureLabel:depthMeters>6?'Tydelig dybdekant':'Grunne / undervannsrygg'});
    const lures=[rec,...rec.alternatives].map(x=>byImage.get(x.image));
    assert.ok(lures.every(Boolean));
    assert.ok(lures.every(x=>x.allowSaltwaterAuto&&x.waterTypes.includes('saltwater')),`Freshwater-only lure leaked into ${fishType}: ${lures.map(x=>x.id).join(',')}`);
  }
});

test('REV43 hard water-environment gate keeps saltwater-only lures out of freshwater recommendations',()=>{
  const catalog=JSON.parse(fs.readFileSync(path.join(root,'data','user-lures.json'),'utf8')).lures;
  const byImage=new Map(catalog.map(x=>[x.image,x]));
  for(const fishType of ['orret','abbor','gjedde']) for(const hour of [6,13,21]) for(const cloud of [10,65,95]) for(const wind of [1,5,9]) for(const depthMeters of [1,5,15]){
    const rec=app.recommendLure({fishType,hour,cloud,wind,temp:10,waterTemp:11,exposure:wind>=8?.8:.3,coastQuality:.75,depthMeters,lat:59.4,lon:11.2,structureLabel:depthMeters>5?'Tydelig dybdekant':'Vegetasjon / grunne'});
    const lures=[rec,...rec.alternatives].map(x=>byImage.get(x.image));
    assert.ok(lures.every(Boolean));
    assert.ok(lures.every(x=>x.allowFreshwaterAuto&&x.waterTypes.includes('freshwater')),`Saltwater-only lure leaked into ${fishType}: ${lures.map(x=>x.id).join(',')}`);
  }
});

test('REV43 known large predator wobblers remain pike-primary but are not falsely locked to one species',()=>{
  const catalog=JSON.parse(fs.readFileSync(path.join(root,'data','user-lures.json'),'utf8')).lures;
  for(const id of ['L085','L088']){const lure=catalog.find(x=>x.id===id);assert.equal(lure.primaryCategory,'Ferskvann – Gjedde');assert.equal(lure.waterTypes.includes('freshwater'),true);assert.ok(lure.speciesPrior.gjedde>lure.speciesPrior.orret);}
});


test('REV43 freshwater fallback handles successful empty OSM polygon results without trusting land',()=>{
  const source=fs.readFileSync(path.join(__dirname,'..','server.js'),'utf8');
  assert.match(source,/if\(!freshwaterAreas\.length\)/);
  assert.match(source,/fallbackFreshwater/);
  assert.match(source,/await isWater\(point\.lat,point\.lon,zoom\)/);
  assert.match(source,/nearCoastInfo\(point\.lat,point\.lon,width,height,zoom\)/);
});


test('REV43 adds lazy 3D topo without replacing the Leaflet analysis engine',()=>{
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const js=fs.readFileSync(path.join(root,'app.js'),'utf8');
  const css=fs.readFileSync(path.join(root,'style.css'),'utf8');
  assert.match(html,/value="3d">3D bunn \/ terreng/);
  assert.match(html,/id="map3d"/);assert.match(html,/threeDTopView/);assert.match(html,/threeDPitchView/);
  assert.match(js,/ensureMapLibre/);assert.match(js,/maplibre-gl@/);assert.match(js,/raster-dem/);assert.match(js,/setTerrain/);assert.match(js,/elevation-tiles-prod/);assert.match(js,/encoding:'terrarium'/);
  assert.match(js,/bbox=\{bbox-epsg-3857\}/);assert.match(js,/wms\.dybdedata2/);assert.match(js,/syncLeafletFrom3D/);assert.match(js,/sync3DZones/);assert.match(js,/sync3DReferenceAndLive/);
  assert.match(css,/three-d-active/);assert.match(css,/#map3d/);assert.match(css,/three-d-hud/);
});

test('REV43 health advertises 3D terrain support',async t=>{
  const server=app.createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>server.close());
  const health=await fetch(`http://127.0.0.1:${server.address().port}/api/health`).then(r=>r.json());
  assert.equal(health.terrain3d,true);assert.equal(health.version,'v19-rev43');assert.equal(health.revision,'REV 43');
});


test('REV43 adds mobile-safe 3D bathymetry below the map without Plotly',()=>{
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const js=fs.readFileSync(path.join(root,'app.js'),'utf8');
  const css=fs.readFileSync(path.join(root,'style.css'),'utf8');
  const server=fs.readFileSync(path.join(__dirname,'..','server.js'),'utf8');
  assert.doesNotMatch(html,/value="bathy3d"/);
  assert.match(html,/id="bathyPanel"/);assert.match(html,/id="bathy3d"/);assert.match(html,/id="bathyCanvas"/);assert.match(html,/bathyResetView/);assert.match(html,/bathyDepthMax/);
  assert.match(js,/api\/bathymetry-grid/);assert.match(js,/buildBathyScene/);assert.match(js,/renderBathyCanvas/);assert.match(js,/quality=\$\{quality\}/);
  assert.doesNotMatch(js,/ensurePlotly/);assert.doesNotMatch(js,/cdn\.plot\.ly/);assert.doesNotMatch(js,/geotiff@/);
  assert.match(server,/ws\.geonorge\.no\/hoydedata\/v1\/punkt/);assert.match(server,/punkter:JSON\.stringify/);assert.match(server,/koordsys:'25833'/);assert.match(server,/quality==='mobile'/);
  assert.match(css,/bathy-panel/);assert.match(css,/bathy-canvas-wrap/);assert.match(css,/bathy-empty\[hidden\]/);assert.match(css,/#bathy3d\[hidden\]/);
});

test('REV43 bathymetry projection, mobile grid budget and signed elevation are sane',()=>{
  const [e,n]=app.lonLatToUtm33(10.77,59.18);
  assert.ok(e>250000&&e<270000);assert.ok(n>6500000&&n<6650000);
  const standard=app.bathymetryGridPlan({west:10.70,south:59.13,east:10.84,north:59.23,zoom:13,quality:'standard'});
  const mobile=app.bathymetryGridPlan({west:10.70,south:59.13,east:10.84,north:59.23,zoom:13,quality:'mobile'});
  assert.ok(standard.width>=24&&standard.height>=24);assert.ok(standard.totalPoints<=2400);assert.ok(standard.spacingM>0);
  assert.ok(mobile.width>=20&&mobile.height>=20);assert.ok(mobile.totalPoints<=1500);assert.ok(mobile.totalPoints<standard.totalPoints);assert.equal(mobile.quality,'mobile');
  const sea=app.classifyKartverketHeight({z:-4.2,terreng:'sjø'}),land=app.classifyKartverketHeight({z:12.4,terreng:'terreng'}),bad=app.classifyKartverketHeight({z:null});
  assert.equal(sea.isSea,true);assert.equal(sea.depth,4.2);assert.equal(sea.elevation,-4.2);
  assert.equal(land.isLand,true);assert.equal(land.elevation,12.4);assert.equal(land.depth,null);
  assert.equal(bad.elevation,null);
  const js=fs.readFileSync(path.join(root,'app.js'),'utf8');
  assert.match(js,/function bathyLocalFrame/);assert.match(js,/metresPerLon=111320\*Math\.cos/);assert.match(js,/buildBathyScene/);assert.match(js,/renderBathyCanvas/);
});

test('REV43 health advertises Kartverket 3D bathymetry',async t=>{
  const server=app.createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>server.close());
  const health=await fetch(`http://127.0.0.1:${server.address().port}/api/health`).then(r=>r.json());
  assert.equal(health.bathymetry3d,true);assert.equal(health.freshwaterBathymetry3d,true);assert.equal(health.bathymetrySource,'kartverket-hoydedata+nve-dybdekart');assert.equal(health.biteGuide,true);assert.equal(health.version,'v19-rev43');assert.equal(health.revision,'REV 43');
});


test('REV43 mobile shell keeps map first and folds controls away',()=>{
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const css=fs.readFileSync(path.join(root,'style.css'),'utf8');
  const js=fs.readFileSync(path.join(root,'app.js'),'utf8');
  assert.match(html,/id="filterPanel"/);assert.match(html,/class="filter-panel"/);assert.match(html,/10 beste punkter/);assert.match(html,/class="card compact-panel more-panel"/);
  assert.match(css,/REV43 – mobile-first shell/);assert.match(css,/height:67svh/);assert.match(js,/configureMobilePanels/);assert.match(js,/updateFilterSummary/);
});

test('REV43 BiteGuide is independent from the owned lure box',()=>{
  const owned=app.recommendLure({fishType:'orret',goal:'numbers',hour:6,cloud:70,wind:3,temp:10,exposure:.4,coastQuality:.8,depthMeters:3,lat:59.2,lon:10.9,structureLabel:'Grunne / undervannsrygg'});
  const zone={score:80,analysis:{habitat:86},lure:owned};
  const currentWeather={hourly:[{time:'2026-09-26T06:00',wind:3,cloud:70,temp:10,pressure:1010},{time:'2026-09-26T07:00',wind:4,cloud:75,temp:10,pressure:1010}]};
  const guide=app.buildZoneBiteGuide({zone,currentWeather,fishType:'orret'});
  assert.ok(guide.score>=0&&guide.score<=100);assert.ok(Array.isArray(guide.timeline));
  assert.equal(guide.recommended.type,owned.idealProfile.type);assert.equal(guide.recommended.color,owned.idealProfile.color);assert.equal(guide.recommended.size,owned.idealProfile.size);
  assert.equal(guide.recommended.image,undefined);assert.equal(guide.recommended.name,undefined);assert.notEqual(guide.recommended.type,owned.name);
  assert.ok(guide.references.length>=2);assert.ok(guide.references.every(x=>x.referenceOnly===true&&x.image&&x.title));
  const js=fs.readFileSync(path.join(root,'app.js'),'utf8');assert.match(js,/UAVHENGIG AV DIN SLUKBOKS/);assert.match(js,/Måldybde/);assert.match(js,/Sluk fra min boks/);assert.match(js,/bite-reference/);
});

test('REV43 freshwater 3D uses NVE depth services and honest failure path',()=>{
  const server=fs.readFileSync(path.join(__dirname,'..','server.js'),'utf8');
  const js=fs.readFileSync(path.join(root,'app.js'),'utf8');
  assert.match(server,/Innsjodatabase2\/MapServer\/\$\{layer\}\/query/);assert.match(server,/nveLakeQuery\(5/);assert.match(server,/nveLakeQueryAll\(2/);assert.match(server,/nveLakeQueryAll\(1/);assert.match(server,/nveFreshwaterBathymetryGrid/);
  assert.match(js,/water=\$\{water\}/);assert.match(js,/smoothBathymetryGrid/);assert.match(js,/bathyContourSegments/);
});


test('REV43 map menu removes redundant layers and keeps focused choices',()=>{
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  assert.doesNotMatch(html,/>Turkart</);assert.doesNotMatch(html,/>Terrengskygge</);assert.doesNotMatch(html,/>Standardkart</);assert.doesNotMatch(html,/>Hybrid</);
  for(const label of ['Fiskekart – dybder','Detaljert topo','3D bunn / terreng','Satellitt','Kartverket sjøkart']) assert.match(html,new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
});

test('REV43 freshwater fishing map auto-loads NVE REST depth overlay',()=>{
  const js=fs.readFileSync(path.join(root,'app.js'),'utf8');
  const server=fs.readFileSync(path.join(__dirname,'..','server.js'),'utf8');
  assert.match(js,/loadFreshwaterDepthOverlay/);assert.match(js,/api\/freshwater-depth-overlay/);assert.match(js,/NVE dybdekart/);
  assert.match(server,/freshwaterDepthOverlay/);assert.match(server,/nveLakeQueryAll\(2/);assert.match(server,/nveLakeQueryAll\(1/);
});

test('REV43 freshwater species ranking uses NVE depth and structure when available',()=>{
  const grid={west:10,south:59,east:10.01,north:59.01,width:2,height:2,depths:[[1,8],[2,10]]};
  const depth=app.sampleBathymetryGridDepth(grid,59.005,10.005);assert.ok(Number.isFinite(depth));
  const structure=app.freshwaterStructureFromGrid(grid,59.005,10.005);assert.ok(Number.isFinite(structure.depth));
  const trout=app.computeHabitatScore({fishType:'orret',coastQuality:.8,depth:{meters:5},structure:{available:true,label:'kant',score:88},habitat:{serviceAvailable:false}});
  const pike=app.computeHabitatScore({fishType:'gjedde',coastQuality:.8,depth:{meters:5},structure:{available:true,label:'kant',score:88},habitat:{serviceAvailable:false}});
  assert.ok(trout.score>=0&&trout.score<=100);assert.ok(pike.score>=0&&pike.score<=100);
});

test('REV43 health advertises automatic freshwater map integration',async t=>{
  const server=app.createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>server.close());
  const health=await fetch(`http://127.0.0.1:${server.address().port}/api/health`).then(r=>r.json());
  assert.equal(health.version,'v19-rev43');assert.equal(health.revision,'REV 43');assert.equal(health.freshwaterDepthOverlay,true);assert.equal(health.freshwaterSpeciesDepthRanking,true);
});


test('REV43 evidence profile and own lure selection vary for materially different sea-trout conditions',()=>{
  const shallow=app.recommendLure({fishType:'sjoorret',goal:'numbers',hour:13,cloud:10,wind:2,temp:14,exposure:.2,coastQuality:.85,depthMeters:2,lat:59.18,lon:10.81,structureLabel:'Grunne / undervannsrygg'});
  const edge=app.recommendLure({fishType:'sjoorret',goal:'numbers',hour:15,cloud:85,wind:8,temp:9,exposure:.85,coastQuality:.8,depthMeters:8,lat:59.19,lon:10.82,structureLabel:'Tydelig dybdekant'});
  const deep=app.recommendLure({fishType:'sjoorret',goal:'numbers',hour:10,cloud:45,wind:4,temp:10,exposure:.5,coastQuality:.8,depthMeters:18,lat:59.21,lon:10.84,structureLabel:'Bratt marbakke / kant'});
  assert.notEqual(shallow.idealProfile.type,edge.idealProfile.type);
  assert.notEqual(shallow.idealProfile.targetDepthText,deep.idealProfile.targetDepthText);
  assert.ok(new Set([shallow.id,edge.id,deep.id]).size>=2);
  for(const rec of [shallow,edge,deep]){assert.ok(rec.candidates.length>=3);assert.ok(rec.matchReasons.length>=1);assert.ok(rec.idealProfile.sources.length>=1);}
});

test('REV43 owned-lure ranking changes materially across sea-trout conditions without random rotation',()=>{
  const primaries=new Set(),topChoices=new Set();
  for(const hour of [5,9,13,18,22]) for(const cloud of [5,50,95]) for(const wind of [1,5,10]) for(const depthMeters of [1,4,10,22]) for(const structureLabel of ['Grunne / undervannsrygg','Tydelig dybdekant','Vegetasjon / tangbelte']){
    const rec=app.recommendLure({fishType:'sjoorret',goal:'numbers',hour,cloud,wind,temp:hour<7?7:13,seaTemp:hour<7?8:13,precipitation:cloud>90?2:0,exposure:wind>=8?.9:wind<=2?.2:.55,coastQuality:.82,depthMeters,lat:59.18,lon:10.81,structureLabel});
    primaries.add(rec.id);[rec,...rec.alternatives.slice(0,3)].forEach(item=>topChoices.add(item.id));
  }
  assert.ok(primaries.size>=6,`Expected evidence-driven primary variation, got only ${primaries.size}: ${[...primaries].join(',')}`);
  assert.ok(topChoices.size>=15,`Expected useful tactical alternatives, got only ${topChoices.size}: ${[...topChoices].join(',')}`);
});

test('REV43 big-trout lure choice reacts to freshwater habitat instead of one universal winner',()=>{
  const primary=new Set(),top=new Set();
  for(const hour of [6,13,21]) for(const cloud of [15,65,95]) for(const waterTemp of [5,10,15]) for(const scene of [
    {depthMeters:1.2,structureLabel:'Grunne / undervannsrygg',shorelineShape:'Odde / utstikk'},
    {depthMeters:2.5,structureLabel:'Bukt / innsving',shorelineShape:'Bukt / innsving'},
    {depthMeters:8,structureLabel:'Tydelig dybdekant',shorelineShape:'Jevn vannkant'},
    {depthMeters:3,structureLabel:'Vegetasjon / sivkant',shorelineShape:'Jevn vannkant'}
  ]){
    const rec=app.recommendLure({fishType:'orret',goal:'big',hour,cloud,wind:4,temp:8,waterTemp,precipitation:cloud>90?2:0,exposure:.45,coastQuality:.82,lat:60.1,lon:10.2,waterName:'Testvatnet',lakeAreaKm2:.2,...scene});
    primary.add(rec.id);[rec,...rec.alternatives.slice(0,3)].forEach(x=>top.add(x.id));
  }
  assert.ok(primary.size>=5,`Expected big-trout primary variation, got ${primary.size}: ${[...primary].join(',')}`);
  assert.ok(top.size>=12,`Expected tactical freshwater alternatives, got ${top.size}: ${[...top].join(',')}`);
});

test('REV43 color parsing uses the actual photographed lure color text',()=>{
  assert.ok(app.colorTagsFromText('Grønn/holografisk').includes('green'));
  assert.ok(app.colorTagsFromText('Grønn/holografisk').includes('holographic'));
  assert.ok(app.colorTagsFromText('Rosa/rød med sorte prikker').includes('pink'));
  assert.ok(app.colorTagsFromText('Kobber/oransje').includes('copper'));
});

test('REV43 strategy-first matching is deterministic and does not force the winner to 100',()=>{
  const input={fishType:'orret',goal:'big',hour:21,cloud:78,wind:2.5,temp:7,waterTemp:6,precipitation:0,exposure:.3,coastQuality:.82,depthMeters:1.2,lat:60.2,lon:10.4,structureLabel:'Odde / utstikk',shorelineShape:'Odde / utstikk',waterName:'Testvatnet',lakeAreaKm2:.2};
  const a=app.recommendLure(input),b=app.recommendLure(input);
  assert.equal(a.id,b.id);assert.equal(a.matchScore,b.matchScore);
  assert.ok(a.matchScore<100,`Absolute match should not be auto-normalized to 100, got ${a.matchScore}`);
  assert.ok(a.componentScores&&Number.isFinite(a.componentScores.type)&&Number.isFinite(a.componentScores.habitat));
  assert.ok(Number.isFinite(a.engineConfidence)&&a.engineConfidence>=38&&a.engineConfidence<=100);
});

test('REV43 unknown lure dimensions remain unknown instead of becoming zero',()=>{
  const item=app.lureCatalog.find(x=>x.id==='L003');assert.ok(item);assert.equal(item.weightG,null);
  const p=app.lurePhysicalProfile(item);assert.equal(p.weightG,null);assert.equal(p.lengthCm,null);assert.ok(p.size>0.2);
});

test('REV43 trout strategy changes with microhabitat and big-fish objective',()=>{
  const common={fishType:'orret',hour:12,cloud:45,wind:3,temp:10,waterTemp:10,lowLight:false,coastQuality:.8,waterName:'Testvatnet',lakeAreaKm2:.2};
  const point=app.deriveStrategyProfile({...common,goal:'numbers',depthMeters:1.2,structureLabel:'Grunne / undervannsrygg',shorelineShape:'Odde / utstikk'});
  const edge=app.deriveStrategyProfile({...common,goal:'numbers',depthMeters:8,structureLabel:'Tydelig dybdekant',shorelineShape:'Jevn vannkant'});
  const big=app.deriveStrategyProfile({...common,goal:'big',depthMeters:8,structureLabel:'Tydelig dybdekant',shorelineShape:'Jevn vannkant'});
  assert.notEqual(point.habitatClass,edge.habitatClass);assert.ok(edge.targetDepth>point.targetDepth);assert.ok(big.targetSize>edge.targetSize);
  assert.ok(point.targetTypes.spinner>edge.targetTypes.spinner);assert.ok(edge.targetTypes.minnow>=.95);
});

test('REV43 health exposes explainable strategy engine flags',async t=>{
  const server=app.createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>server.close());
  const health=await fetch(`http://127.0.0.1:${server.address().port}/api/health`).then(r=>r.json());
  assert.equal(health.strategyEngineV3,true);assert.equal(health.absoluteOwnedLureMatch,true);assert.equal(health.explainableLureScore,true);assert.equal(health.shorelineMicrohabitat,true);
});

test('REV43 freshwater guidance points to NJFF freshwater trout and BiteGuide has source basis',()=>{
  const data=JSON.parse(fs.readFileSync(path.join(root,'data','source-backed-lures.json'),'utf8'));
  assert.match(data.guidanceSources.orret.url,/fiske-i-ferskvann\/orret/);
  const rec=app.recommendLure({fishType:'orret',hour:7,cloud:60,wind:3,temp:9,exposure:.4,coastQuality:.8,depthMeters:5,lat:59.5,lon:11.4,structureLabel:'Tydelig dybdekant'});
  assert.ok(rec.idealProfile.sources.some(x=>/NJFF/.test(x.label)));
});

test('REV43 NVE survey-quality mapping distinguishes measured vector from scanned maps',()=>{
  assert.equal(app.nveSurveyQuality({digitaltprodukt:'Vektor fra oppmålte punkter',oppmaltaar:2020}).grade,'A');
  assert.equal(app.nveSurveyQuality({digitaltprodukt:'Vektor fra dig. kart manuelt'}).grade,'B');
  assert.equal(app.nveSurveyQuality({digitaltprodukt:'Skannet fra papirkart'}).grade,'C');
});

test('REV43 NVE resolves the selected lake before attaching depth data and paginates curves/points',()=>{
  const server=fs.readFileSync(path.join(__dirname,'..','server.js'),'utf8');
  assert.match(server,/function resolveNveDepthContext/);assert.match(server,/nveLakeQuery\(5/);assert.match(server,/nveLakeQuery\(4/);assert.match(server,/function nveLakeQueryAll/);assert.match(server,/resultOffset/);
  assert.match(server,/nveLakeQueryAll\(2/);assert.match(server,/nveLakeQueryAll\(1/);assert.match(server,/digitaltprodukt,ekvidistanse_m/);
  assert.match(server,/prevents accidentally borrowing depths from a nearby lake/);
});

test('REV43 health advertises independent BiteGuide and hardened NVE integration',async t=>{
  const server=app.createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>server.close());
  const health=await fetch(`http://127.0.0.1:${server.address().port}/api/health`).then(r=>r.json());
  assert.equal(health.version,'v19-rev43');assert.equal(health.revision,'REV 43');assert.equal(health.biteGuideIndependent,true);assert.equal(health.smartOwnedLureMatching,true);assert.equal(health.ownedLureInventoryV2,true);assert.equal(health.biteGuideReferenceCards,true);assert.equal(health.strictWaterEnvironmentLures,true);assert.equal(health.nveDepthMetadataCheck,true);assert.equal(health.nveLakeGeometryFallback,true);assert.equal(health.nvePagination,true);
});

test('REV43 personal catch history only affects local browser lure matching and stays private',()=>{
  const js=fs.readFileSync(path.join(root,'app.js'),'utf8');
  assert.match(js,/function applyPersonalLureHistory/);assert.match(js,/sessions<3/);assert.match(js,/catches\.length<2/);assert.match(js,/bestCondition-8/);assert.match(js,/Egen fangstlogg støtter dette valget/);
  assert.doesNotMatch(js,/fetch\([^\n]*catchStorageKey/);
});


test('REV43 freshwater map renders filled bathymetry, contour labels and avoids warning spam',()=>{
  const js=fs.readFileSync(path.join(root,'app.js'),'utf8');
  const css=fs.readFileSync(path.join(root,'style.css'),'utf8');
  assert.match(js,/renderFreshwaterDepthRaster/);assert.match(js,/nveDepthBandColor/);assert.match(js,/addNveDepthLabels/);assert.match(js,/NVE OPPMÅLT/);
  assert.match(js,/warningMessages=new Map/);assert.match(js,/new Set\(values\)/);assert.doesNotMatch(js,/warning\.textContent=`\$\{warning\.textContent\}/);
  assert.match(css,/freshwater-depth-raster/);assert.match(css,/nve-depth-label/);assert.match(css,/depth-gradient/);
});

test('REV43 converts NVE lake polygons into analysis-safe freshwater areas',()=>{
  const feature={type:'Feature',properties:{vatnlnr:123,navn:'Testvatnet',dybdekart:'J'},geometry:{type:'Polygon',coordinates:[[[10,59],[10.02,59],[10.02,59.02],[10,59.02],[10,59]]]}};
  const areas=app.nveFeaturesToFreshwaterAreas([feature]);
  assert.equal(areas.length,1);assert.equal(areas[0].name,'Testvatnet');assert.equal(areas[0].lookup,'nve');assert.equal(areas[0].ring.length,5);
  assert.equal(app.freshwaterAtPoint(59.01,10.01,areas).name,'Testvatnet');
});

test('REV43 missing NVE survey is informational rather than a global analysis warning',()=>{
  const server=fs.readFileSync(path.join(__dirname,'..','server.js'),'utf8');
  assert.match(server,/nveDepthServiceFailure/);assert.match(server,/har ikke registrert oppmålt dybdekart/);
  const js=fs.readFileSync(path.join(root,'app.js'),'utf8');
  assert.match(js,/filter\(item=>!\/NVE har ikke registrert oppmålt dybdekart/);
  assert.match(js,/ingen oppmålte NVE-dybder/);
});

test('REV43 cached analysis is only labelled offline when navigator reports offline',()=>{
  const js=fs.readFileSync(path.join(root,'app.js'),'utf8');
  assert.match(js,/navigator\.onLine===false/);assert.match(js,/Ny analyse kunne ikke hentes akkurat nå/);assert.match(js,/Ingen nettforbindelse – viser sist lagrede analyse/);
});
