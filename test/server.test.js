const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const app=require('../server');
const pkg=require('../package.json');
const root=path.join(__dirname,'..','public');

test('REV25 exports core scoring and environment helpers',()=>{
  for(const name of ['computeScore','environmentalScoreAdjustments','moonInfo','deriveMarineSummary','validateZoneRequest','createServer','weather','marine','hydrology','boatRamps']) assert.equal(typeof app[name],'function',name);
  assert.equal(pkg.appRevision,25);
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

test('health reports REV25, marine support and NVE configuration state',async t=>{
  const server=app.createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>server.close());
  const health=await fetch(`http://127.0.0.1:${server.address().port}/api/health`).then(r=>r.json());
  assert.equal(health.ok,true);assert.equal(health.version,'v11-rev25');assert.equal(health.revision,'REV 25');assert.equal(health.marine,true);assert.equal(typeof health.nveHydApiConfigured,'boolean');
});

test('PWA shell exposes marine, NVE, catch export and owned-lure helpers',()=>{
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const js=fs.readFileSync(path.join(root,'app.js'),'utf8');
  assert.match(html,/REV 25/);assert.match(html,/marineCard/);assert.match(html,/hydrologyCard/);assert.match(html,/conditionToggle/);assert.match(html,/boatRampToggle/);assert.match(html,/exportGpx/);assert.match(html,/ownedLures/);
  assert.match(js,/applyPersonalRanking/);assert.match(js,/exportCatchGpx/);assert.match(js,/analysisCacheKey/);assert.match(js,/renderConditionVectors/);assert.match(js,/loadBoatRamps/);assert.match(js,/loadHydrologyAtCenter/);
});

test('asset versions and service worker cache are REV25',()=>{
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
  assert.match(html,/app\.js\?v=25\.0/);assert.match(html,/fishing-insights\.js\?v=25\.0/);assert.match(html,/style\.css\?v=25\.0/);
  assert.match(sw,/fiste-guiden-rev25/);assert.doesNotMatch(sw,/rev22/);assert.match(sw,/\/api\//);
});


test('REV25 detailed fishing map uses Kartverket depth WMS and no EMODnet color overlay',()=>{
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const js=fs.readFileSync(path.join(root,'app.js'),'utf8');
  assert.match(html,/Fiskekart – detaljerte dybder og skjær/);
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

test('REV25 personal lure box contains many individual photographed candidates',()=>{
  const data=JSON.parse(fs.readFileSync(path.join(root,'data','user-lures.json'),'utf8'));
  assert.ok(data.lures.length>=45);assert.ok(data.lures.filter(item=>item.species.includes('sjoorret')).length>=35);assert.ok(data.lures.every(item=>item.image&&item.species&&item.waterTypes));
  const rec=app.recommendLure({fishType:'sjoorret',hour:19,cloud:65,wind:4,temp:13,exposure:.6,coastQuality:.8,depthMeters:4,lat:59.2,lon:10.9});
  assert.ok(rec.alternatives.length>=4);assert.notEqual(rec.alternatives[0].image,rec.image);
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
