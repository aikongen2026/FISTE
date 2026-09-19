const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const app=require('../server');
const pkg=require('../package.json');
const root=path.join(__dirname,'..','public');

test('REV32 exports core scoring and environment helpers',()=>{
  for(const name of ['computeScore','environmentalScoreAdjustments','moonInfo','deriveMarineSummary','validateZoneRequest','createServer','weather','marine','hydrology','boatRamps']) assert.equal(typeof app[name],'function',name);
  assert.equal(pkg.appRevision,32);
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

test('REV32 base radius creates a search box centered on base',()=>{
  const b=app.searchBoundsForBase(59.2,10.9,250,12);
  assert.equal(b.zoom,16);
  assert.ok(b.west<10.9&&b.east>10.9&&b.south<59.2&&b.north>59.2);
  const centerLat=(b.south+b.north)/2,centerLon=(b.west+b.east)/2;
  assert.ok(Math.abs(centerLat-59.2)<1e-9);assert.ok(Math.abs(centerLon-10.9)<1e-9);
  const oneKm=app.searchBoundsForBase(59.2,10.9,1000,12);
  assert.equal(oneKm.zoom,14);assert.ok((oneKm.east-oneKm.west)>(b.east-b.west));
});

test('REV32 accepts all-sea selection without treating it as a single species',()=>{
  assert.equal(app.normalizeFishSelection('all'),'all');
  assert.equal(app.normalizeFishSelection('makrell'),'makrell');
  assert.throws(()=>app.normalizeFishType('all'),/Ugyldig/);
});

test('health reports REV32, marine support and NVE configuration state',async t=>{
  const server=app.createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>server.close());
  const health=await fetch(`http://127.0.0.1:${server.address().port}/api/health`).then(r=>r.json());
  assert.equal(health.ok,true);assert.equal(health.version,'v12-rev32');assert.equal(health.revision,'REV 32');assert.equal(health.marine,true);assert.equal(typeof health.nveHydApiConfigured,'boolean');
});

test('PWA shell exposes marine, NVE, catch export and owned-lure helpers',()=>{
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const js=fs.readFileSync(path.join(root,'app.js'),'utf8');
  assert.match(html,/REV 32/);assert.match(html,/multiSpeciesCard/);assert.match(html,/Ingen – vis alle sjøarter/);assert.match(html,/marineCard/);assert.match(html,/hydrologyCard/);assert.match(html,/conditionToggle/);assert.match(html,/boatRampToggle/);assert.match(html,/exportGpx/);assert.match(html,/ownedLures/);
  assert.match(js,/applyPersonalRanking/);assert.match(js,/clearBasePoint/);assert.match(js,/focusBaseRadius/);assert.match(js,/speciesColors/);assert.match(js,/exportCatchGpx/);assert.match(js,/analysisCacheKey/);assert.match(js,/renderConditionVectors/);assert.match(js,/loadBoatRamps/);assert.match(js,/loadHydrologyAtCenter/);assert.match(html,/id="live"/);assert.match(html,/liveHud/);assert.match(js,/watchPosition/);assert.match(js,/currentAnalysisBase/);assert.match(js,/liveTrackLayer/);
});

test('asset versions and service worker cache are REV32',()=>{
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
  assert.match(html,/app\.js\?v=32\.0/);assert.match(html,/fishing-insights\.js\?v=32\.0/);assert.match(html,/style\.css\?v=32\.0/);
  assert.match(sw,/fiste-guiden-rev32/);assert.doesNotMatch(sw,/rev22/);assert.match(sw,/\/api\//);
});


test('REV32 detailed fishing map uses Kartverket depth WMS and no EMODnet color overlay',()=>{
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

test('REV32 personal lure box contains many individual photographed candidates',()=>{
  const data=JSON.parse(fs.readFileSync(path.join(root,'data','user-lures.json'),'utf8'));
  assert.ok(data.lures.length>=45);assert.equal(data.lures.filter(item=>item.species.includes('sjoorret')).length,25);assert.ok(data.lures.every(item=>item.image&&item.species&&item.waterTypes));
  const rec=app.recommendLure({fishType:'sjoorret',hour:19,cloud:65,wind:4,temp:13,exposure:.6,coastQuality:.8,depthMeters:4,lat:59.2,lon:10.9});
  assert.ok(rec.alternatives.length>=4);assert.notEqual(rec.alternatives[0].image,rec.image);
});

test('REV32 LIVE GPS implementation follows position and refreshes analysis',()=>{
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



test('REV32 separates habitat, live conditions and confidence',()=>{
  const live=app.computeLiveScore({fishType:'sjoorret',wind:4,cloud:75,hour:7,exposure:.7,seaTemp:11,waveHeight:.4,currentVelocity:.5,tideTrend3h:.08,pressureTrend:-1});
  const habitat=app.computeHabitatScore({fishType:'sjoorret',coastQuality:.85,depth:{meters:4},structure:{available:true,label:'Tydelig dybdekant',score:90},habitat:{serviceAvailable:true,eelgrass:true,kelp:false,shellSand:true,softBottom:false,spawningArea:false,nurseryArea:true},goal:'numbers'});
  const confidence=app.buildAnalysisConfidence({weather:{wind:4,windDirection:220,cloud:75,temp:10},marine:{seaTemp:11,waveHeight:.4,currentVelocity:.5,tideTrend3h:.08},depth:{meters:4,source:'EMODnet'},structure:{available:true,label:'Tydelig dybdekant'},habitat:{serviceCoveragePercent:100},waterType:'saltwater'});
  assert.ok(live.score>=0&&live.score<=100);assert.ok(habitat.score>=0&&habitat.score<=100);assert.equal(confidence.confidence,100);
  assert.ok(habitat.factors.some(x=>x.key==='naturtype'));
});

test('REV32 depth structure distinguishes steep from flat profiles',()=>{
  const steep=app.classifyQuickStructure(2,10,280),flat=app.classifyQuickStructure(3,3.5,280);
  assert.equal(steep.available,true);assert.ok(steep.score>flat.score);assert.match(steep.label,/kant|marbakke/i);
  const profile=app.classifyDepthProfile([{distanceM:0,meters:2},{distanceM:75,meters:3},{distanceM:150,meters:6},{distanceM:300,meters:10}]);
  assert.equal(profile.available,true);assert.ok(profile.maxSlopeMPer100>0);
});

test('REV32 hard restriction status is exposed separately from fish score',()=>{
  const clear=app.legalStatusForPoint(59.4,10.6);assert.equal(typeof clear.blocked,'boolean');assert.match(clear.status,/forbud|kjent/i);
});

test('REV32 selected card keeps advanced analysis in dropdowns',()=>{
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const js=fs.readFileSync(path.join(root,'app.js'),'utf8');
  const css=fs.readFileSync(path.join(root,'style.css'),'utf8');
  assert.match(js,/analysisScoreStripHtml/);assert.match(js,/Hvorfor akkurat her/);assert.match(js,/Dybde og struktur/);assert.match(js,/Habitat i området/);assert.match(js,/Fredning og regler/);assert.match(js,/Datagrunnlag/);assert.match(js,/api\/depth-profile/);
  assert.match(css,/analysis-score-strip/);assert.match(css,/zone-detail/);assert.match(css,/depth-profile/);
  assert.match(html,/REV 32/);
});

test('REV32 health advertises HSI split, habitat layers and depth profiles',async t=>{
  const server=app.createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>server.close());
  const health=await fetch(`http://127.0.0.1:${server.address().port}/api/health`).then(r=>r.json());
  assert.equal(health.hsiSplit,true);assert.equal(health.habitatLayers,true);assert.equal(health.depthProfiles,true);assert.equal(health.hardRestrictionFilter,true);
});

test('REV32 sea-trout gate excludes predator and freshwater-only lures from primary and alternatives',()=>{
  const banned=new Set(['own01-05','own07-01','own07-02','own07-03','own07-04','own07-05','own07-06','own13-01','own13-02','own13-03','own13-04','own13-05','own13-06','own13-07','own13-08','own11-01','own11-02','own11-03']);
  const catalog=JSON.parse(fs.readFileSync(path.join(root,'data','user-lures.json'),'utf8')).lures;
  const imageToId=new Map(catalog.map(x=>[x.image,x.id]));
  for(const hour of [5,8,12,16,20,23]) for(const cloud of [5,35,70,95]) for(const wind of [1,4,8,12]) for(const depthMeters of [1,3,7,15,30]){
    const rec=app.recommendLure({fishType:'sjoorret',hour,cloud,wind,temp:10,exposure:wind>=8?.85:.35,coastQuality:.8,depthMeters,lat:59.1+hour/1000,lon:10.8+cloud/10000});
    const ids=[rec.image,...rec.alternatives.map(x=>x.image)].map(img=>imageToId.get(img));
    assert.ok(ids.every(Boolean));
    assert.ok(ids.every(id=>!banned.has(id)),`Banned sea-trout lure leaked: ${ids.join(',')}`);
    assert.ok(ids.every(id=>catalog.find(x=>x.id===id).species.includes('sjoorret')));
  }
});

test('REV32 red-white predator wobbler is pike-only in owned catalogue',()=>{
  const catalog=JSON.parse(fs.readFileSync(path.join(root,'data','user-lures.json'),'utf8')).lures;
  const lure=catalog.find(x=>x.id==='own01-05');
  assert.deepEqual(lure.species,['gjedde']);
  assert.deepEqual(lure.waterTypes,['freshwater']);
});


test('REV32 freshwater fallback handles successful empty OSM polygon results without trusting land',()=>{
  const source=fs.readFileSync(path.join(__dirname,'..','server.js'),'utf8');
  assert.match(source,/if\(!freshwaterAreas\.length\)/);
  assert.match(source,/fallbackFreshwater/);
  assert.match(source,/await isWater\(point\.lat,point\.lon,zoom\)/);
  assert.match(source,/nearCoastInfo\(point\.lat,point\.lon,width,height,zoom\)/);
});


test('REV32 adds lazy 3D topo without replacing the Leaflet analysis engine',()=>{
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const js=fs.readFileSync(path.join(root,'app.js'),'utf8');
  const css=fs.readFileSync(path.join(root,'style.css'),'utf8');
  assert.match(html,/value="3d">3D topo \/ terreng/);
  assert.match(html,/id="map3d"/);assert.match(html,/threeDTopView/);assert.match(html,/threeDPitchView/);
  assert.match(js,/ensureMapLibre/);assert.match(js,/maplibre-gl@/);assert.match(js,/raster-dem/);assert.match(js,/setTerrain/);assert.match(js,/tiles\.mapterhorn\.com/);
  assert.match(js,/bbox=\{bbox-epsg-3857\}/);assert.match(js,/wms\.dybdedata2/);assert.match(js,/syncLeafletFrom3D/);assert.match(js,/sync3DZones/);assert.match(js,/sync3DReferenceAndLive/);
  assert.match(css,/three-d-active/);assert.match(css,/#map3d/);assert.match(css,/three-d-hud/);
});

test('REV32 health advertises 3D terrain support',async t=>{
  const server=app.createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>server.close());
  const health=await fetch(`http://127.0.0.1:${server.address().port}/api/health`).then(r=>r.json());
  assert.equal(health.terrain3d,true);assert.equal(health.version,'v12-rev32');assert.equal(health.revision,'REV 32');
});
