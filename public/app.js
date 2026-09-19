const uiStateKey='fiste-guiden-ui-state-v3';
function readUiState(){try{return JSON.parse(localStorage.getItem(uiStateKey)||'{}')||{};}catch{return {};}}
function saveUiState(){try{const c=map.getCenter();localStorage.setItem(uiStateKey,JSON.stringify({fishType:$('fishType')?.value||'',fishGoal:$('fishGoal')?.value||'numbers',baseRadius:$('baseRadius')?.value||'500',mapStyle:$('mapStyle')?.value||'topo',center:[c.lat,c.lng],zoom:map.getZoom(),basePoint}));}catch{}}
const savedUiState=readUiState();
const initialCenter=Array.isArray(savedUiState.center)&&savedUiState.center.length===2?savedUiState.center:[59.21,10.93];
const initialZoom=Number.isFinite(savedUiState.zoom)?savedUiState.zoom:12;
const map = L.map('map', { zoomControl: true }).setView(initialCenter, initialZoom);
const standardLayer=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map);
const topoLayer=L.tileLayer('https://cache.kartverket.no/v1/wmts/1.0.0/topo/default/webmercator/{z}/{y}/{x}.png',{maxZoom:19,updateWhenIdle:true,keepBuffer:1,attribution:'© Kartverket (CC BY 4.0)'});
const topoRasterLayer=L.tileLayer('https://cache.kartverket.no/v1/wmts/1.0.0/toporaster/default/webmercator/{z}/{y}/{x}.png',{maxZoom:19,updateWhenIdle:true,keepBuffer:1,attribution:'© Kartverket (CC BY 4.0)'});
const terrainLayer=L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,updateWhenIdle:true,keepBuffer:1,attribution:'Tiles © Esri'});
const satelliteLayer=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,attribution:'Tiles © Esri'});
const hybridLabelsLayer=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,attribution:'Labels © Esri'});
const seaChartLayer=L.tileLayer.wms('https://wms.geonorge.no/skwms1/wms.sjokartraster2',{layers:'all',styles:'',format:'image/png',transparent:false,version:'1.3.0',tileSize:512,updateWhenIdle:true,updateWhenZooming:false,keepBuffer:1,maxZoom:18,attribution:'© Kartverket · sjøkart raster'});
const detailedDepthLayer=L.tileLayer.wms('https://wms.geonorge.no/skwms1/wms.dybdedata2',{layers:'Dybdedata2',styles:'',format:'image/png',transparent:true,version:'1.3.0',tileSize:512,updateWhenIdle:true,updateWhenZooming:false,keepBuffer:1,opacity:.94,maxZoom:18,attribution:'© Kartverket · Sjøkart Dybdedata'});
const nveDepthLayer = L.tileLayer.wms('https://kart.nve.no/enterprise/services/Innsjodatabase2/MapServer/WMSServer', { layers: 'DybdeKurve,DybdePunkt', format: 'image/png', transparent: true, version: '1.3.0', maxZoom: 18, attribution: 'Kilde: <a href="https://data.norge.no/nb/datasets/a797219c-8378-3914-9bde-1ae4db09e370/dybdekart" target="_blank" rel="noopener">NVE – Innsjødatabase/Dybdekart</a>' });
let seaChartTileErrors=0,depthTileErrors=0;
seaChartLayer.on('tileerror',()=>{ if(++seaChartTileErrors===3 && $('mapStyle')?.value==='chart') $('warnings').textContent='Kartverkets sjøkart bruker litt tid eller mangler en kartflis. Standardkartet ligger under og blir stående synlig mens sjøkartet lastes.'; });
detailedDepthLayer.on('tileerror',()=>{ if(++depthTileErrors===3 && $('mapStyle')?.value==='fishing') $('warnings').textContent='Kartverkets dybdedata bruker litt tid eller mangler en kartflis. Grunnkartet beholdes under, så kartet blir ikke svart.'; });
seaChartLayer.on('tileload',()=>{seaChartTileErrors=0;}); detailedDepthLayer.on('tileload',()=>{depthTileErrors=0;});

const $ = id => document.getElementById(id);
const zoneLayer = L.layerGroup().addTo(map);
const navigationLayer = L.layerGroup().addTo(map);
const sourceSpotLayer = L.layerGroup().addTo(map);
const restrictionLayer = L.layerGroup().addTo(map);
const conditionLayer = L.layerGroup().addTo(map);
const boatRampLayer = L.layerGroup().addTo(map);
const mapContainerObserver = new ResizeObserver(() => map.invalidateSize({ pan: false }));
mapContainerObserver.observe(document.querySelector('.map-wrap'));
window.addEventListener('load', () => setTimeout(() => map.invalidateSize({ pan: false }), 0));
let timer;
let controller;
let locationMarker;
let baseMarker;
let baseRadiusCircle;
let basePoint=savedUiState.basePoint&&Number.isFinite(savedUiState.basePoint.lat)&&Number.isFinite(savedUiState.basePoint.lon)?savedUiState.basePoint:null;
// REV27 LIVE GPS: kontinuerlig posisjonsfolging for dorging og forflytning.
const liveTrackLayer=L.polyline([],{color:'#38d477',weight:4,opacity:.9,lineCap:'round',lineJoin:'round'}).addTo(map);
let liveWatchId=null;
let liveActive=false;
let livePosition=null;
let liveLocationMarker=null;
let liveAccuracyCircle=null;
let liveTrackPoints=[];
let liveLastFix=null;
let liveLastAnalysisAt=0;
let liveLastAnalysisPoint=null;
let liveWakeLock=null;
function currentAnalysisBase(){ return liveActive&&livePosition?{lat:livePosition.lat,lon:livePosition.lon}:basePoint; }
function liveDistanceMeters(a,b){ return a&&b?distanceKm(a,b)*1000:Infinity; }
function liveSpeedKmh(coords,timestamp,lat,lon){
  if(Number.isFinite(coords.speed)&&coords.speed>=0) return coords.speed*3.6;
  if(liveLastFix&&Number.isFinite(liveLastFix.timestamp)&&timestamp>liveLastFix.timestamp){
    const moved=liveDistanceMeters({lat:liveLastFix.lat,lon:liveLastFix.lon},{lat,lon});
    const seconds=(timestamp-liveLastFix.timestamp)/1000;
    if(seconds>0&&Number.isFinite(moved)) return Math.min(80,(moved/seconds)*3.6);
  }
  return null;
}
function renderLiveHud(){
  const hud=$('liveHud'),text=$('liveHudText');
  if(!hud||!text) return;
  hud.hidden=!liveActive;
  if(!liveActive) return;
  if(!livePosition){text.textContent='Venter på GPS-signal …';return;}
  const speed=Number.isFinite(livePosition.speedKmh)?`${livePosition.speedKmh.toFixed(1).replace('.',',')} km/t`:'fart –';
  const accuracy=Number.isFinite(livePosition.accuracy)?`±${Math.round(livePosition.accuracy)} m`:'nøyaktighet –';
  const heading=Number.isFinite(livePosition.heading)?` · kurs ${Math.round(livePosition.heading)}°`:'';
  text.textContent=`${speed} · ${accuracy}${heading}`;
}
function setLiveButton(){
  const button=$('live');
  if(!button) return;
  button.classList.toggle('live-active',liveActive);
  button.setAttribute('aria-pressed',String(liveActive));
  button.textContent=liveActive?'● LIVE PÅ':'● Live';
}
async function acquireLiveWakeLock(){
  if(!liveActive||document.visibilityState!=='visible'||!('wakeLock' in navigator)) return;
  try{liveWakeLock=await navigator.wakeLock.request('screen');liveWakeLock.addEventListener?.('release',()=>{liveWakeLock=null;},{once:true});}catch{}
}
async function releaseLiveWakeLock(){
  try{await liveWakeLock?.release();}catch{}
  liveWakeLock=null;
}
function updateLiveMapPosition(position){
  if(!liveActive) return;
  const {latitude,longitude,accuracy,heading}=position.coords||{};
  if(!Number.isFinite(latitude)||!Number.isFinite(longitude)) return;
  const timestamp=Number(position.timestamp)||Date.now();
  const speedKmh=liveSpeedKmh(position.coords||{},timestamp,latitude,longitude);
  livePosition={lat:latitude,lon:longitude,accuracy:Number.isFinite(accuracy)?accuracy:null,heading:Number.isFinite(heading)?heading:null,speedKmh,timestamp};
  const latlng=L.latLng(latitude,longitude);
  if(!liveLocationMarker){
    liveLocationMarker=L.circleMarker(latlng,{radius:9,color:'#fff',weight:3,fillColor:'#38d477',fillOpacity:1,pane:'markerPane'}).addTo(map).bindTooltip('LIVE-posisjon',{direction:'top'});
  }else liveLocationMarker.setLatLng(latlng);
  if(Number.isFinite(accuracy)){
    if(!liveAccuracyCircle) liveAccuracyCircle=L.circle(latlng,{radius:accuracy,color:'#38d477',weight:1,fillColor:'#38d477',fillOpacity:.08,interactive:false}).addTo(map);
    else liveAccuracyCircle.setLatLng(latlng).setRadius(accuracy);
  }
  const lastTrack=liveTrackPoints[liveTrackPoints.length-1];
  if(!lastTrack||liveDistanceMeters({lat:lastTrack.lat,lon:lastTrack.lng},{lat:latitude,lon:longitude})>=3){
    liveTrackPoints.push(latlng);
    if(liveTrackPoints.length>1500) liveTrackPoints.shift();
    liveTrackLayer.setLatLngs(liveTrackPoints);
  }
  updateBaseRadiusCircle();
  renderLiveHud();
  sync3DReferenceAndLive();
  if(is3DMode()&&threeDMap){threeDProgrammaticMove=true;threeDMap.easeTo({center:[longitude,latitude],zoom:Math.max(15,threeDMap.getZoom()),pitch:62,duration:liveLastFix?320:500});threeDSyncing=true;map.setView(latlng,Math.max(15,map.getZoom()),{animate:false});setTimeout(()=>{threeDSyncing=false;},0);}
  else if(!liveLastFix) map.setView(latlng,Math.max(15,map.getZoom()),{animate:true});
  else map.panTo(latlng,{animate:true,duration:.35,noMoveStart:true});
  const now=Date.now();
  const movedSinceAnalysis=liveLastAnalysisPoint?liveDistanceMeters(liveLastAnalysisPoint,{lat:latitude,lon:longitude}):Infinity;
  if(!liveLastAnalysisAt||now-liveLastAnalysisAt>=20000||movedSinceAnalysis>=60){
    liveLastAnalysisAt=now;
    liveLastAnalysisPoint={lat:latitude,lon:longitude};
    loadZones({immediate:true});
  }
  liveLastFix={lat:latitude,lon:longitude,timestamp};
  setState('ready',`LIVE GPS · ${Number.isFinite(speedKmh)?speedKmh.toFixed(1).replace('.',',')+' km/t · ':''}${Number.isFinite(accuracy)?'±'+Math.round(accuracy)+' m · ':''}kartet følger posisjonen`);
}
function handleLiveGpsError(error){
  if(error?.code===1){stopLiveMode({message:false});setState('error','LIVE GPS fikk ikke tilgang til posisjon. Tillat posisjon for dette nettstedet og prøv igjen.');return;}
  setState('locating','LIVE GPS: venter på bedre GPS-signal …');
  const text=$('liveHudText'); if(text) text.textContent='GPS-signal midlertidig utilgjengelig …';
}
function startLiveMode(){
  if(liveActive){stopLiveMode();return;}
  if(!navigator.geolocation){setState('error','Denne nettleseren støtter ikke kontinuerlig GPS.');return;}
  liveActive=true;
  livePosition=null;
  liveLastFix=null;
  liveLastAnalysisAt=0;
  liveLastAnalysisPoint=null;
  liveTrackPoints=[];
  liveTrackLayer.setLatLngs([]);
  setLiveButton();
  renderLiveHud();
  setState('locating','LIVE GPS starter … kartet vil følge deg kontinuerlig.');
  acquireLiveWakeLock();
  liveWatchId=navigator.geolocation.watchPosition(updateLiveMapPosition,handleLiveGpsError,{enableHighAccuracy:true,maximumAge:1000,timeout:20000});
}
function stopLiveMode({message=true}={}){
  if(liveWatchId!==null&&navigator.geolocation) navigator.geolocation.clearWatch(liveWatchId);
  liveWatchId=null;
  liveActive=false;
  livePosition=null;
  liveLastFix=null;
  liveLastAnalysisAt=0;
  liveLastAnalysisPoint=null;
  if(liveAccuracyCircle){liveAccuracyCircle.remove();liveAccuracyCircle=null;}
  if(liveLocationMarker){liveLocationMarker.remove();liveLocationMarker=null;}
  updateBaseRadiusCircle();
  sync3DReferenceAndLive();
  setLiveButton();
  renderLiveHud();
  releaseLiveWakeLock();
  if(message) setState('ready','LIVE GPS stoppet. Sporlinjen blir stående på kartet til Live startes igjen.');
}
let latestZones=[];
let selectedZoneId=null;
// REV34: optional lazy-loaded MapLibre 3D terrain view. Leaflet remains the analysis engine;
// the two maps are synchronized so 3D never changes the scoring logic or Live GPS behavior.
let threeDMap=null;
let threeDReady=false;
let threeDLoadPromise=null;
let threeDActive=false;
let threeDSyncing=false;
let threeDProgrammaticMove=false;
let threeDErrorCount=0;
const THREE_D_LIB_VERSION='6.10.0';
function is3DMode(){return threeDActive&&$('mapStyle')?.value==='3d';}
function ensureMapLibre(){
  if(window.maplibregl) return Promise.resolve(window.maplibregl);
  if(threeDLoadPromise) return threeDLoadPromise;
  threeDLoadPromise=new Promise((resolve,reject)=>{
    if(!document.querySelector('link[data-maplibre]')){
      const link=document.createElement('link');link.rel='stylesheet';link.dataset.maplibre='1';link.href=`https://unpkg.com/maplibre-gl@${THREE_D_LIB_VERSION}/dist/maplibre-gl.css`;document.head.appendChild(link);
    }
    const existing=document.querySelector('script[data-maplibre]');
    if(existing){existing.addEventListener('load',()=>resolve(window.maplibregl),{once:true});existing.addEventListener('error',()=>reject(new Error('MapLibre kunne ikke lastes')), {once:true});return;}
    const script=document.createElement('script');script.src=`https://unpkg.com/maplibre-gl@${THREE_D_LIB_VERSION}/dist/maplibre-gl.js`;script.async=true;script.dataset.maplibre='1';script.onload=()=>window.maplibregl?resolve(window.maplibregl):reject(new Error('MapLibre mangler etter lasting'));script.onerror=()=>reject(new Error('MapLibre kunne ikke lastes fra CDN'));document.head.appendChild(script);
  });
  return threeDLoadPromise;
}
function threeDStyleSpec(){
  const freshwater=freshwaterFishTypes.has($('fishType')?.value);
  return {version:8,glyphs:'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',sources:{
    topo:{type:'raster',tiles:['https://cache.kartverket.no/v1/wmts/1.0.0/toporaster/default/webmercator/{z}/{y}/{x}.png'],tileSize:256,maxzoom:19,attribution:'© Kartverket (CC BY 4.0)'},
    terrain:{type:'raster-dem',url:'https://tiles.mapterhorn.com/tilejson.json',tileSize:256},
    depthwms:{type:'raster',tiles:['https://wms.geonorge.no/skwms1/wms.dybdedata2?service=WMS&request=GetMap&version=1.1.1&layers=Dybdedata2&styles=&format=image/png&transparent=true&srs=EPSG:3857&bbox={bbox-epsg-3857}&width=256&height=256'],tileSize:256,maxzoom:18,attribution:'© Kartverket · dybdedata'}
  },layers:[
    {id:'topo-raster',type:'raster',source:'topo',paint:{'raster-opacity':1}},
    {id:'terrain-hillshade',type:'hillshade',source:'terrain',paint:{'hillshade-exaggeration':0.42,'hillshade-shadow-color':'#27352f','hillshade-highlight-color':'#f7fbf6','hillshade-accent-color':'#556b60'}},
    {id:'depth-overlay',type:'raster',source:'depthwms',layout:{visibility:freshwater?'none':'visible'},paint:{'raster-opacity':0.78}}
  ]};
}
function emptyFeatureCollection(){return {type:'FeatureCollection',features:[]};}
function ensure3DDataLayers(){
  if(!threeDMap||!(threeDMap.isStyleLoaded?.()||threeDReady)) return;
  const addSource=(id)=>{if(!threeDMap.getSource(id))threeDMap.addSource(id,{type:'geojson',data:emptyFeatureCollection()});};
  addSource('fiste-zones');addSource('fiste-casts');addSource('fiste-reference');addSource('fiste-live-track');addSource('fiste-restrictions');addSource('fiste-source-spots');
  if(!threeDMap.getLayer('fiste-restrictions')) threeDMap.addLayer({id:'fiste-restrictions',type:'line',source:'fiste-restrictions',paint:{'line-color':'#ff3b30','line-width':6,'line-opacity':0.9,'line-dasharray':[2,1.4]}});
  if(!threeDMap.getLayer('fiste-source-spots')) threeDMap.addLayer({id:'fiste-source-spots',type:'circle',source:'fiste-source-spots',paint:{'circle-radius':8,'circle-color':['get','color'],'circle-opacity':0.45,'circle-stroke-color':['get','color'],'circle-stroke-width':2}});
  if(!threeDMap.getLayer('fiste-casts')) threeDMap.addLayer({id:'fiste-casts',type:'line',source:'fiste-casts',paint:{'line-color':'#ff9f1c','line-width':4,'line-opacity':0.9}});
  if(!threeDMap.getLayer('fiste-live-track')) threeDMap.addLayer({id:'fiste-live-track',type:'line',source:'fiste-live-track',paint:{'line-color':'#38d477','line-width':4,'line-opacity':0.95}});
  if(!threeDMap.getLayer('fiste-zone-halo')) threeDMap.addLayer({id:'fiste-zone-halo',type:'circle',source:'fiste-zones',paint:{'circle-radius':['case',['==',['get','selected'],1],18,14],'circle-color':['get','color'],'circle-opacity':0.20,'circle-stroke-color':['case',['==',['get','selected'],1],'#ffffff','#0b241d'],'circle-stroke-width':['case',['==',['get','selected'],1],4,2]}});
  if(!threeDMap.getLayer('fiste-zone-points')) threeDMap.addLayer({id:'fiste-zone-points',type:'circle',source:'fiste-zones',paint:{'circle-radius':7,'circle-color':['get','color'],'circle-stroke-color':'#10251f','circle-stroke-width':2}});
  if(!threeDMap.getLayer('fiste-zone-labels')) threeDMap.addLayer({id:'fiste-zone-labels',type:'symbol',source:'fiste-zones',layout:{'text-field':['get','label'],'text-size':12,'text-font':['Open Sans Bold'],'text-offset':[0,1.55],'text-anchor':'top','text-allow-overlap':true},paint:{'text-color':'#ffffff','text-halo-color':'#071b16','text-halo-width':2}});
  if(!threeDMap.getLayer('fiste-reference')) threeDMap.addLayer({id:'fiste-reference',type:'circle',source:'fiste-reference',paint:{'circle-radius':['case',['==',['get','kind'],'live'],9,7],'circle-color':['case',['==',['get','kind'],'live'],'#38d477','#f2c94c'],'circle-stroke-color':'#ffffff','circle-stroke-width':2}});
}
function threeDFeatureColor(zone){const fish=zone.fishType||$('fishType')?.value;return $('fishType')?.value==='all'?(speciesColors[fish]||scoreColor(zone.score)):scoreColor(zone.score);}
function sync3DZones(){
  if(!threeDMap||!threeDReady) return;
  ensure3DDataLayers();
  const zoneSource=threeDMap.getSource('fiste-zones'),castSource=threeDMap.getSource('fiste-casts');
  if(!zoneSource||!castSource)return;
  const features=latestZones.map((zone,index)=>({type:'Feature',geometry:{type:'Point',coordinates:[zone.marker.lon,zone.marker.lat]},properties:{id:zone.id,rank:index+1,score:Math.round(zone.score||0),selected:zone.id===selectedZoneId?1:0,color:threeDFeatureColor(zone),label:`${index+1}${Number.isFinite(zone.depth?.meters)?' · '+zone.depth.meters.toFixed(1)+' m':''}`}}));
  zoneSource.setData({type:'FeatureCollection',features});
  const castFeatures=latestZones.slice(0,3).filter(zone=>Number.isFinite(zone.castBearing)).map((zone,index)=>{const length=index===0?90:60,rad=zone.castBearing*Math.PI/180,dLat=(Math.sin(rad)*length)/110540,dLon=(Math.cos(rad)*length)/(111320*Math.max(.2,Math.cos(zone.marker.lat*Math.PI/180)));return {type:'Feature',geometry:{type:'LineString',coordinates:[[zone.marker.lon,zone.marker.lat],[zone.marker.lon+dLon,zone.marker.lat+dLat]]},properties:{id:zone.id}};});
  castSource.setData({type:'FeatureCollection',features:castFeatures});
}
function sync3DReferenceAndLive(){
  if(!threeDMap||!threeDReady) return;
  ensure3DDataLayers();
  const ref=threeDMap.getSource('fiste-reference'),track=threeDMap.getSource('fiste-live-track');
  const point=liveActive&&livePosition?{lon:livePosition.lon,lat:livePosition.lat,kind:'live'}:basePoint?{lon:basePoint.lon,lat:basePoint.lat,kind:'base'}:null;
  ref?.setData({type:'FeatureCollection',features:point?[{type:'Feature',geometry:{type:'Point',coordinates:[point.lon,point.lat]},properties:{kind:point.kind}}]:[]});
  track?.setData({type:'FeatureCollection',features:liveTrackPoints.length>1?[{type:'Feature',geometry:{type:'LineString',coordinates:liveTrackPoints.map(p=>[p.lng,p.lat])},properties:{}}]:[]});
}
function sync3DReferenceLayers(){
  if(!threeDMap||!threeDReady)return;
  ensure3DDataLayers();
  const freshwater=freshwaterFishTypes.has($('fishType')?.value);
  const restrictionFeatures=[];
  if(showRestrictions&&!freshwater&&restrictionData){
    for(const zone of restrictionData.zones.filter(item=>item.renderBoundary&&Array.isArray(item.outerBoundary)&&item.outerBoundary.length>=2)){
      restrictionFeatures.push({type:'Feature',geometry:{type:'LineString',coordinates:zone.outerBoundary.map(point=>[point.lon,point.lat])},properties:{name:zone.name||'Fredningsgrense'}});
    }
  }
  threeDMap.getSource('fiste-restrictions')?.setData({type:'FeatureCollection',features:restrictionFeatures});
  const spotFeatures=[];
  if(showSourceSpots&&$('fishType')?.value==='sjoorret'&&sourceSpotData){
    for(const spot of sourceSpotData.spots||[]) spotFeatures.push({type:'Feature',geometry:{type:'Point',coordinates:[spot.lon,spot.lat]},properties:{name:spot.name||'',color:spot.status==='restricted'?'#ff5d55':'#f2c94c'}});
  }
  threeDMap.getSource('fiste-source-spots')?.setData({type:'FeatureCollection',features:spotFeatures});
}
function sync3DWaterMode(){
  if(!threeDMap||!threeDReady||!threeDMap.getLayer('depth-overlay'))return;
  const freshwater=freshwaterFishTypes.has($('fishType')?.value);
  try{threeDMap.setLayoutProperty('depth-overlay','visibility',freshwater?'none':'visible');}catch{}
}
function focusMapOnZone(zone,zoom=15){
  if(!zone?.marker)return;
  if(is3DMode()&&threeDMap){threeDProgrammaticMove=true;threeDMap.easeTo({center:[zone.marker.lon,zone.marker.lat],zoom:Math.max(threeDMap.getZoom(),zoom),pitch:62,bearing:threeDMap.getBearing(),duration:550});}
  else map.setView([zone.marker.lat,zone.marker.lon],Math.max(map.getZoom(),zoom),{animate:true});
}
function syncLeafletFrom3D({reload=true}={}){
  if(!threeDMap||!threeDActive)return;
  const c=threeDMap.getCenter(),z=Math.max(3,Math.min(19,threeDMap.getZoom()));
  threeDSyncing=true;map.setView([c.lat,c.lng],z,{animate:false});setTimeout(()=>{threeDSyncing=false;},0);
  saveUiState();if(reload)loadZones();
}
async function enable3DMap(){
  threeDActive=true;
  const wrap=document.querySelector('.map-wrap'),container=$('map3d'),hud=$('threeDHud');
  wrap?.classList.add('three-d-active');if(container)container.hidden=false;if(hud)hud.hidden=false;
  const notice=document.querySelector('.map-notice');if(notice)notice.textContent='Laster 3D topo … 10 beste punkter, GPS-spor og dybdeetiketter vises også i 3D.';
  try{
    const lib=await ensureMapLibre();
    if(!threeDActive||$('mapStyle')?.value!=='3d')return;
    if(!threeDMap){
      const c=map.getCenter();
      threeDMap=new lib.Map({container:'map3d',style:threeDStyleSpec(),center:[c.lng,c.lat],zoom:map.getZoom(),pitch:62,bearing:-18,maxPitch:78,renderWorldCopies:false,attributionControl:true});
      threeDMap.addControl(new lib.NavigationControl({visualizePitch:true}),'top-right');
      threeDMap.on('load',()=>{threeDReady=true;try{threeDMap.setTerrain({source:'terrain',exaggeration:1.35});}catch{}ensure3DDataLayers();sync3DZones();syncBathyZones();sync3DReferenceAndLive();sync3DReferenceLayers();sync3DWaterMode();
        const zoneLayers=['fiste-zone-halo','fiste-zone-points','fiste-zone-labels'];
        threeDMap.on('click',event=>{const layers=zoneLayers.filter(id=>threeDMap.getLayer(id));const hit=layers.length?threeDMap.queryRenderedFeatures(event.point,{layers})[0]:null;if(hit?.properties?.id){selectZone(hit.properties.id,{scroll:true});return;}setBasePoint(L.latLng(event.lngLat.lat,event.lngLat.lng),{label:'Kartklikk 3D',focus:false});setState('ready','3D-kartklikk satt som referansepunkt. Oppdaterer 10 beste soner …');});
        zoneLayers.forEach(id=>{threeDMap.on('mouseenter',id,()=>{threeDMap.getCanvas().style.cursor='pointer';});threeDMap.on('mouseleave',id,()=>{threeDMap.getCanvas().style.cursor='';});});
        const n=document.querySelector('.map-notice');if(n)n.textContent='3D topo: roter kartet for å lese terreng og kanter. Dybdekoter vises i sjø; de er ikke en 3D-ekkoloddmodell.';
      });
      threeDMap.on('moveend',()=>{const reload=!threeDProgrammaticMove;threeDProgrammaticMove=false;syncLeafletFrom3D({reload});});
      threeDMap.on('error',event=>{threeDErrorCount++;if(threeDErrorCount===2){const w=$('warnings');if(w)w.textContent='3D-terreng eller et kartlag svarte ikke. 2D-kartene fungerer fortsatt; prøv 3D igjen litt senere.';}});
    }else{
      const c=map.getCenter();threeDProgrammaticMove=true;threeDMap.jumpTo({center:[c.lng,c.lat],zoom:map.getZoom(),pitch:62});threeDMap.resize();sync3DZones();syncBathyZones();sync3DReferenceAndLive();sync3DReferenceLayers();sync3DWaterMode();
    }
  }catch(error){
    threeDActive=false;wrap?.classList.remove('three-d-active');if(container)container.hidden=true;if(hud)hud.hidden=true;$('mapStyle').value='topo';topoLayer.addTo(map);const w=$('warnings');if(w)w.textContent=`3D-kart kunne ikke startes: ${error.message}. Detaljert topo vises i stedet.`;saveUiState();
  }
}
function disable3DMap(){
  threeDActive=false;document.querySelector('.map-wrap')?.classList.remove('three-d-active');if($('map3d'))$('map3d').hidden=true;if($('threeDHud'))$('threeDHud').hidden=true;const notice=document.querySelector('.map-notice');if(notice)notice.textContent='Klikk i kartet = nytt referansepunkt. De 10 beste sonene oppdateres automatisk.';setTimeout(()=>map.invalidateSize({pan:false}),0);
}

// REV34: corrected 3D bathymetry. Signed elevation is preserved (sea < 0, land >= 0),
// the GeoTIFF's own geographic bounds are used, and lon/lat is converted to local metres so the
// rendered coastline/bottom has the same physical proportions as the 2D map.
let bathyActive=false;
let bathyLoadToken=0;
let bathyPlotReady=false;
let bathyLastGrid=null;
let bathyGeoTiffPromise=null;
let bathyPlotlyPromise=null;
function isBathy3DMode(){return bathyActive&&$('mapStyle')?.value==='bathy3d';}
function loadScriptOnce(src,key){
  return new Promise((resolve,reject)=>{
    if(window[key]) return resolve(window[key]);
    const existing=document.querySelector(`script[data-lib="${key}"]`);
    if(existing){existing.addEventListener('load',()=>resolve(window[key]),{once:true});existing.addEventListener('error',()=>reject(new Error(`${key} kunne ikke lastes`)),{once:true});return;}
    const s=document.createElement('script');s.src=src;s.async=true;s.dataset.lib=key;s.onload=()=>resolve(window[key]);s.onerror=()=>reject(new Error(`${key} kunne ikke lastes`));document.head.appendChild(s);
  });
}
function ensurePlotly(){return bathyPlotlyPromise||(bathyPlotlyPromise=loadScriptOnce('https://cdn.plot.ly/plotly-2.35.2.min.js','Plotly'));}
function ensureGeoTiff(){
  if(bathyGeoTiffPromise) return bathyGeoTiffPromise;
  bathyGeoTiffPromise=import('https://cdn.jsdelivr.net/npm/geotiff@2.1.3/+esm');
  return bathyGeoTiffPromise;
}
function bathyBounds(){
  const b=map.getBounds();let west=b.getWest(),east=b.getEast(),south=b.getSouth(),north=b.getNorth();
  const c=map.getCenter(),maxSpan=.16;
  if(east-west>maxSpan){west=c.lng-maxSpan/2;east=c.lng+maxSpan/2;}
  if(north-south>maxSpan){south=c.lat-maxSpan/2;north=c.lat+maxSpan/2;}
  return {west,south,east,north,centerLat:c.lat,centerLon:c.lng};
}
function bathyCamera(kind='pitch'){
  if(!window.Plotly||!bathyPlotReady)return;
  const camera=kind==='top'?{eye:{x:0,y:0,z:2.35},up:{x:0,y:1,z:0}}:{eye:{x:1.55,y:-1.85,z:1.12},up:{x:0,y:0,z:1}};
  window.Plotly.relayout('bathy3d',{'scene.camera':camera});
}
function bathyCellFromElevation(raw,noData){
  if(!Number.isFinite(raw)||Math.abs(raw)>=12000||(Number.isFinite(noData)&&Math.abs(raw-noData)<=1e-6)) return {elevation:null,depth:null,isSea:false,isLand:false};
  // EMODnet DTM is elevation relative to sea level: negative below water, positive on land.
  if(raw<-.05) return {elevation:raw,depth:-raw,isSea:true,isLand:false};
  return {elevation:Math.max(0,raw),depth:null,isSea:false,isLand:true};
}
function bathyLocalFrame(grid){
  const centerLat=(grid.south+grid.north)/2,centerLon=(grid.west+grid.east)/2;
  const metresPerLon=111320*Math.cos(centerLat*Math.PI/180),metresPerLat=110540;
  return {
    centerLat,centerLon,metresPerLon,metresPerLat,
    xForLon:lon=>(lon-centerLon)*metresPerLon,
    yForLat:lat=>(lat-centerLat)*metresPerLat
  };
}
function bathyGridValueAt(grid,lon,lat){
  if(lon<grid.west||lon>grid.east||lat<grid.south||lat>grid.north)return null;
  const col=Math.max(0,Math.min(grid.width-1,Math.round((lon-grid.west)/(grid.east-grid.west)*Math.max(1,grid.width-1))));
  const row=Math.max(0,Math.min(grid.height-1,Math.round((grid.north-lat)/(grid.north-grid.south)*Math.max(1,grid.height-1))));
  return grid.elevations?.[row]?.[col]??null;
}
async function fetchBathymetryGrid(){
  const requested=bathyBounds(),zoom=Math.max(10,Math.min(18,Math.round(map.getZoom())));
  const url=`/api/bathymetry-raster?bbox=${encodeURIComponent([requested.west,requested.south,requested.east,requested.north].join(','))}&zoom=${zoom}`;
  const [GeoTIFF,response]=await Promise.all([ensureGeoTiff(),fetch(url)]);
  if(!response.ok){let message='Kunne ikke hente 3D-bunn';try{const j=await response.json();message=j.error||message;}catch{}throw new Error(message);}
  const sourceResolution=Number(response.headers.get('X-Fiste-Source-Resolution-M'))||115;
  const sampling=Number(response.headers.get('X-Fiste-Sampling-M'))||null;
  const source=response.headers.get('X-Fiste-Bathymetry-Source')||'EMODnet Bathymetry DTM';
  const arrayBuffer=await response.arrayBuffer();
  const tiff=await GeoTIFF.fromArrayBuffer(arrayBuffer),image=await tiff.getImage();
  const width=image.getWidth(),height=image.getHeight(),rasters=await image.readRasters(),data=rasters[0];
  const noData=Number(image.getGDALNoData());
  let west=requested.west,south=requested.south,east=requested.east,north=requested.north;
  try{
    const bb=image.getBoundingBox?.();
    if(Array.isArray(bb)&&bb.length===4&&bb.every(Number.isFinite)){
      west=Math.min(bb[0],bb[2]);east=Math.max(bb[0],bb[2]);south=Math.min(bb[1],bb[3]);north=Math.max(bb[1],bb[3]);
    }
  }catch{}
  const elevations=[],depths=[];let maxDepth=0,maxLand=0,validSea=0,validLand=0;
  for(let y=0;y<height;y++){
    const elevationRow=[],depthRow=[];
    for(let x=0;x<width;x++){
      const cell=bathyCellFromElevation(Number(data[y*width+x]),noData);
      elevationRow.push(cell.elevation);depthRow.push(cell.depth);
      if(cell.isSea){maxDepth=Math.max(maxDepth,cell.depth);validSea++;}
      if(cell.isLand){maxLand=Math.max(maxLand,cell.elevation);validLand++;}
    }
    elevations.push(elevationRow);depths.push(depthRow);
  }
  if(validSea<Math.max(20,width*height*.025))throw new Error('For lite sjødybdedata i dette utsnittet. Flytt kartet mot sjøen eller zoom nærmere.');
  return {west,south,east,north,width,height,elevations,depths,maxDepth,maxLand,validSea,validLand,sourceResolution,sampling,source};
}
function buildBathyPlot(grid){
  const frame=bathyLocalFrame(grid);
  const lonForCol=i=>grid.west+(grid.east-grid.west)*i/Math.max(1,grid.width-1);
  const latForRow=i=>grid.north-(grid.north-grid.south)*i/Math.max(1,grid.height-1);
  const x=Array.from({length:grid.width},(_,i)=>frame.xForLon(lonForCol(i)));
  const y=Array.from({length:grid.height},(_,i)=>frame.yForLat(latForRow(i)));
  const seabed=[],seaColor=[],land=[],landColor=[],water=[];
  const depthCap=Math.max(10,Math.min(180,Math.ceil(grid.maxDepth/10)*10));
  const landCap=Math.max(12,Math.min(140,Math.ceil(Math.min(grid.maxLand||0,140)/10)*10||20));
  for(let r=0;r<grid.height;r++){
    const sr=[],scr=[],lr=[],lcr=[],wr=[];
    for(let c=0;c<grid.width;c++){
      const elevation=grid.elevations[r][c],depth=grid.depths[r][c],sea=Number.isFinite(depth);
      sr.push(sea?elevation:null);scr.push(sea?Math.min(depth,depthCap):null);
      lr.push(!sea&&Number.isFinite(elevation)?Math.min(elevation,landCap):null);lcr.push(!sea&&Number.isFinite(elevation)?Math.min(elevation,landCap):null);
      wr.push(sea?0:null);
    }
    seabed.push(sr);seaColor.push(scr);land.push(lr);landColor.push(lcr);water.push(wr);
  }
  const seaScale=[[0,'#a9eef2'],[.12,'#7cdae8'],[.32,'#42b4d4'],[.58,'#1c79b0'],[.8,'#0b4f86'],[1,'#062f5d']];
  const landScale=[[0,'#29463a'],[.35,'#203b31'],[.7,'#172f28'],[1,'#10251f']];
  const bottom={type:'surface',x,y,z:seabed,surfacecolor:seaColor,cmin:0,cmax:depthCap,colorscale:seaScale,showscale:false,connectgaps:false,hovertemplate:'Dybde: %{customdata:.1f} m<extra></extra>',customdata:grid.depths,lighting:{ambient:.56,diffuse:.9,roughness:.78,specular:.16,fresnel:.08},lightposition:{x:-1600,y:-1200,z:1700},contours:{z:{show:true,usecolormap:false,color:'rgba(210,248,255,.44)',width:1,project:{z:true}}}};
  const landSurface={type:'surface',x,y,z:land,surfacecolor:landColor,cmin:0,cmax:landCap,colorscale:landScale,showscale:false,connectgaps:false,hovertemplate:'Terreng: %{z:.0f} moh.<extra></extra>',lighting:{ambient:.48,diffuse:.94,roughness:.92,specular:.06},lightposition:{x:-1600,y:-1200,z:1700}};
  const waterSurface={type:'surface',x,y,z:water,showscale:false,opacity:.22,connectgaps:false,hoverinfo:'skip',colorscale:[[0,'#7adce8'],[1,'#7adce8']]};
  const zones=latestZones.filter(v=>v?.marker&&v.marker.lon>=grid.west&&v.marker.lon<=grid.east&&v.marker.lat>=grid.south&&v.marker.lat<=grid.north).slice(0,10);
  const zoneTrace={type:'scatter3d',mode:'markers+text',x:zones.map(v=>frame.xForLon(v.marker.lon)),y:zones.map(v=>frame.yForLat(v.marker.lat)),z:zones.map(v=>Math.max(.8,(bathyGridValueAt(grid,v.marker.lon,v.marker.lat)||0)+1.2)),text:zones.map((v,i)=>`🚩 ${i+1} · ${Math.round(v.score)}`),textposition:'top center',textfont:{color:'#fff',size:12},marker:{size:7,color:zones.map(v=>threeDFeatureColor(v)),line:{color:'#fff',width:1.5}},customdata:zones.map(v=>v.id),hovertext:zones.map((v,i)=>`#${i+1} ${v.name||v.fishLabel||'Fiskeplass'} · ${Math.round(v.score)}/100`),hoverinfo:'text'};
  const center=map.getCenter();
  const centerInBounds=center.lng>=grid.west&&center.lng<=grid.east&&center.lat>=grid.south&&center.lat<=grid.north;
  const referenceTrace={type:'scatter3d',mode:'markers',x:centerInBounds?[frame.xForLon(center.lng)]:[],y:centerInBounds?[frame.yForLat(center.lat)]:[],z:centerInBounds?[Math.max(1,(bathyGridValueAt(grid,center.lng,center.lat)||0)+1.8)]:[],marker:{size:8,color:'#ef4444',symbol:'circle',line:{color:'#fff',width:2}},hovertext:['Kartets referansepunkt'],hoverinfo:'text'};
  const widthM=Math.max(1,Math.abs(x[x.length-1]-x[0])),heightM=Math.max(1,Math.abs(y[0]-y[y.length-1]));
  const maxXY=Math.max(widthM,heightM),verticalSpan=Math.max(depthCap+landCap,20);
  const requestedExaggeration=Math.max(1.2,Math.min(4.5,(maxXY/verticalSpan)*.12));
  const zRatio=Math.max(.18,Math.min(.70,(verticalSpan*requestedExaggeration)/maxXY));
  const verticalExaggeration=zRatio*maxXY/verticalSpan;
  const layout={paper_bgcolor:'#10231e',plot_bgcolor:'#10231e',margin:{l:0,r:0,t:0,b:0},showlegend:false,uirevision:'fiste-bathy-rev34',scene:{bgcolor:'#10231e',xaxis:{visible:false},yaxis:{visible:false},zaxis:{title:'Høyde / dybde (m)',color:'#d7eee4',gridcolor:'rgba(255,255,255,.10)',zerolinecolor:'rgba(255,255,255,.35)',range:[-depthCap*1.08,landCap*1.08]},aspectmode:'manual',aspectratio:{x:widthM/maxXY,y:heightM/maxXY,z:zRatio},camera:{eye:{x:1.55,y:-1.85,z:1.12},up:{x:0,y:0,z:1}}},hoverlabel:{bgcolor:'#071b16',bordercolor:'#38d477',font:{color:'#fff'}}};
  $('bathyDepthMax').textContent=`${depthCap} m+`;
  return {data:[bottom,landSurface,waterSurface,zoneTrace,referenceTrace],layout,verticalExaggeration};
}
async function refreshBathy3D(){
  if(!bathyActive)return;const token=++bathyLoadToken,status=$('bathyStatus');if(status)status.textContent='Henter riktig bunngeometri …';
  try{
    const [Plotly,grid]=await Promise.all([ensurePlotly(),fetchBathymetryGrid()]);if(token!==bathyLoadToken||!bathyActive)return;
    bathyLastGrid=grid;const plot=buildBathyPlot(grid);const el=$('bathy3d');await Plotly.react(el,plot.data,plot.layout,{displaylogo:false,responsive:true,scrollZoom:true,modeBarButtonsToRemove:['toImage','sendDataToCloud','lasso3d','select2d']});
    if(el&&!el._fisteClickBound&&typeof el.on==='function'){el.on('plotly_click',event=>{const id=event?.points?.[0]?.customdata;if(id)selectZone(id,{scroll:true});});el._fisteClickBound=true;}
    bathyPlotReady=true;
    const pointCount=latestZones.filter(v=>v?.marker&&v.marker.lon>=grid.west&&v.marker.lon<=grid.east&&v.marker.lat>=grid.south&&v.marker.lat<=grid.north).slice(0,10).length;
    if(status)status.textContent=`Korrigert bunn · kilde ca. ${grid.sourceResolution} m · ${pointCount} punkt`;
    const notice=document.querySelector('.map-notice');if(notice)notice.textContent=`3D bunn: sjø/land er skilt korrekt, kartet bruker samme geografiske utsnitt som 2D-kartet og X/Y vises i meter. Vertikal overdrivelse ca. ${plot.verticalExaggeration.toFixed(1)}×.`;
  }catch(error){if(token!==bathyLoadToken)return;if(status)status.textContent='3D bunn kunne ikke lastes';const w=$('warnings');if(w)w.textContent=`3D bunn: ${error.message} Vanlige 2D- og 3D-topokart fungerer fortsatt.`;}
}
async function enableBathy3D(){
  const freshwater=freshwaterFishTypes.has($('fishType')?.value);
  if(freshwater){$('mapStyle').value='3d';enable3DMap();const w=$('warnings');if(w)w.textContent='3D bunn er foreløpig for sjø. På ferskvann brukes 3D terreng; NVE-dybdekart vises der NVE har publisert data.';saveUiState();return;}
  bathyActive=true;disable3DMap();document.querySelector('.map-wrap')?.classList.add('bathy-d-active');$('bathy3d').hidden=false;$('bathyHud').hidden=false;await refreshBathy3D();saveUiState();
}
function disableBathy3D(){
  bathyActive=false;bathyLoadToken++;document.querySelector('.map-wrap')?.classList.remove('bathy-d-active');if($('bathy3d'))$('bathy3d').hidden=true;if($('bathyHud'))$('bathyHud').hidden=true;setTimeout(()=>map.invalidateSize({pan:false}),0);
}
function syncBathyZones(){if(isBathy3DMode()&&bathyPlotReady&&bathyLastGrid&&window.Plotly){const plot=buildBathyPlot(bathyLastGrid);window.Plotly.react('bathy3d',plot.data,plot.layout,{displaylogo:false,responsive:true,scrollZoom:true,modeBarButtonsToRemove:['toImage','sendDataToCloud','lasso3d','select2d']});}}

const labels = { vind:'Vind', skydekke:'Skydekke', kyst:'Kyst', vannkant:'Vannkant', eksponering:'Eksponering', temperatur:'Temperatur', lufttemperatur:'Lufttemperatur', tidspunkt:'Tidspunkt', dybde:'Dybde', storfisk:'Stor fisk', lufttrykk:'Lufttrykk', sjoetemperatur:'Sjøtemp', boelger:'Bølger', havstroem:'Havstrøm', tidevann:'Tidevann', maane:'Måne', personlig:'Mine fangster', habitat:'Habitat', forhold:'Nå' };
const freshwaterFishTypes = new Set(['orret','abbor','gjedde']);
const catchStorageKey='fiste-guiden-catch-log-v1';
const analysisCacheKey='fiste-guiden-last-analysis-v34';
const fishLabels={all:'Alle sjøarter',sjoorret:'Sjøørret',makrell:'Makrell',sei:'Sei',orret:'Ørret (ferskvann)',abbor:'Abbor',gjedde:'Gjedde'};
const speciesColors={sjoorret:'#ef4444',makrell:'#3b82f6',sei:'#22c55e'};
let latestWeather=null;
let latestMarine=null;
let latestMoon=null;
let latestHydrology=null;
let showConditionVectors=false;
let showBoatRamps=false;
let sourceSpotData=null;
let restrictionData=null;
let showSourceSpots=true;
let showRestrictions=true;
const lureViewer = $('lureViewer');
const lureViewerImage = $('lureViewerImage');
const lureViewerCaption = $('lureViewerCaption');

let lureViewerHistoryActive=false;
function openLureViewer(src, caption='Anbefalt sluk') {
  if(!lureViewer.open){ history.pushState({lureViewer:true},''); lureViewerHistoryActive=true; }
  lureViewerImage.src = src;
  lureViewerImage.alt = caption;
  lureViewerCaption.textContent = caption;
  if (typeof lureViewer.showModal === 'function') lureViewer.showModal();
  else lureViewer.setAttribute('open', '');
}


function formatDistance(m){ if(!Number.isFinite(m)) return 'Avstand ikke satt'; return m<1000?`${Math.round(m)} m`:`${(m/1000).toFixed(1).replace('.',',')} km`; }
function radiusBounds(point,radiusM){
  const radius=Math.max(150,Number(radiusM)||0);
  const latPad=radius/110540;
  const lonPad=radius/(111320*Math.max(.2,Math.cos(point.lat*Math.PI/180)));
  return L.latLngBounds([point.lat-latPad,point.lon-lonPad],[point.lat+latPad,point.lon+lonPad]);
}
function updateBaseRadiusCircle(){
  if(baseRadiusCircle){baseRadiusCircle.remove();baseRadiusCircle=null;}
  const radius=Number($('baseRadius').value)||0;
  const analysisBase=currentAnalysisBase();
  if(!analysisBase||!radius) return;
  baseRadiusCircle=L.circle([analysisBase.lat,analysisBase.lon],{radius,color:'#38d477',weight:2,dashArray:'7 7',fillColor:'#38d477',fillOpacity:.045,interactive:false}).addTo(map);
}
function focusBaseRadius(){
  const radius=Number($('baseRadius').value)||0;
  const analysisBase=currentAnalysisBase();
  if(!analysisBase||!radius) return;
  updateBaseRadiusCircle();
  map.fitBounds(radiusBounds(analysisBase,radius*1.08),{padding:[28,28],maxZoom:radius<=250?16:radius<=500?15:radius<=1000?14:13});
}
function clearBasePoint(){
  basePoint=null;
  if(baseMarker){baseMarker.remove();baseMarker=null;}
  if(baseRadiusCircle){baseRadiusCircle.remove();baseRadiusCircle=null;}
  $('baseRadius').value='0';
  $('setBase').textContent='⌖ Sett base';
  $('setBase').classList.remove('base-active');
  $('setBase').setAttribute('aria-pressed','false');
  navigationLayer.clearLayers();
  sync3DReferenceAndLive();
  saveUiState();
  setState('ready','Base fjernet · avstandsfilter er slått av.');
  loadZones({immediate:true});
}
function setBasePoint(latlng,{label='Base',focus=true}={}){
  basePoint={lat:Number(latlng.lat),lon:Number(latlng.lng)};
  if(baseMarker) baseMarker.remove();
  baseMarker=L.circleMarker([basePoint.lat,basePoint.lon],{radius:7,color:'#fff',weight:2,fillColor:'#f2c94c',fillOpacity:.95}).addTo(map).bindTooltip(label,{direction:'top'});
  $('setBase').textContent='✓ Base satt · fjern';
  $('setBase').classList.add('base-active');
  $('setBase').setAttribute('aria-pressed','true');
  saveUiState();
  updateBaseRadiusCircle();
  sync3DReferenceAndLive();
  if(focus) focusBaseRadius();
  loadZones({immediate:true});
}
function drawNavigation(zones=[]){
  navigationLayer.clearLayers();
  if(!zones.length) return;
  const best=zones[0];
  const analysisBase=currentAnalysisBase();
  if(analysisBase&&Number.isFinite(best.distanceM)){
    L.polyline([[analysisBase.lat,analysisBase.lon],[best.marker.lat,best.marker.lon]],{color:'#38d477',weight:4,dashArray:'8 8',opacity:.9}).addTo(navigationLayer);
  }
  zones.slice(0,3).forEach((zone,index)=>{
    if(!Number.isFinite(zone.castBearing)) return;
    const length=index===0?85:55, rad=zone.castBearing*Math.PI/180;
    const dLat=(Math.sin(rad)*length)/110540;
    const dLon=(Math.cos(rad)*length)/(111320*Math.cos(zone.marker.lat*Math.PI/180));
    L.polyline([[zone.marker.lat,zone.marker.lon],[zone.marker.lat+dLat,zone.marker.lon+dLon]],{color:index===0?'#ff9f1c':'#f2c94c',weight:index===0?5:3,opacity:.95}).bindTooltip(index===0?'Kast langs kanten':'Kastretning',{permanent:false}).addTo(navigationLayer);
  });
}
function renderBestNow(zones=[]){
  const holder=$('bestNow');
  $('goalBadge').textContent=$('fishType').value==='all'?'Alle sjøarter':($('fishGoal').value==='big'?'STOR FISK':'Mest fisk');
  if(!zones.length){ holder.innerHTML='<p class="muted">Ingen anbefalt sone innen valgt utsnitt/avstand. Øk radius eller flytt kartet litt.</p>'; return; }
  const zone=zones[0], lure=zone.lure||{}, w=lure.wobbler||{};
  const big=$('fishGoal').value==='big';
  const allMode=$('fishType').value==='all';
  const zoneFish=zone.fishType||$('fishType').value;
  const zoneFishLabel=zone.fishLabel||fishLabels[zoneFish]||'';
  holder.innerHTML=`<div class="best-now-grid"><div class="best-now-score"><strong>${zone.score}</strong><span>/100</span></div><div><span class="best-now-kicker">${big&&!allMode?'🏆 STOR FISK':'🎯 BEST MATCH'} · ${escapeHtml(zoneFishLabel)}</span><h3>${escapeHtml(zone.waterName||zone.name)}</h3><p>${escapeHtml(zone.reason||'')}</p></div></div><div class="best-now-facts"><article><span>${liveActive?'Avstand fra deg':'Avstand fra base'}</span><b>${formatDistance(zone.distanceM)}</b></article><article><span>Bruk nå</span><b>${escapeHtml(lure.type||'Anbefalt agn')} · ${escapeHtml(lure.weight||'')}</b></article><article><span>Farge</span><b>${escapeHtml(lure.color||'')}</b></article>${zone.personalAdjustment?`<article><span>Mine fangstdata</span><b>+${zone.personalAdjustment} poeng</b></article>`:''}</div><div class="best-now-actions"><button type="button" id="goBest">VIS PÅ KART</button><span>Orange linje = praktisk kastretning langs vannkanten.</span></div>`;
  $('goBest')?.addEventListener('click',()=>{ focusMapOnZone(zone,16); selectZone(zone.id,{scroll:true}); });
}

function scoreColor(score) { return score >= 82 ? '#38d477' : score >= 68 ? '#b8df45' : '#f2c94c'; }
function setState(state, text) {
  $('appState').dataset.state = state;
  $('status').textContent = text;
  $('retry').hidden = state !== 'error';
}
function formatValue(value, suffix='') { return Number.isFinite(value) ? `${value}${suffix}` : '–'; }
function formatSourceTime(value) {
  if (!value) return 'ukjent tidspunkt';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'ukjent tidspunkt' : date.toLocaleString('no-NO',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
}
function signed(value,digits=1,suffix='') {
  if(!Number.isFinite(value)) return '–';
  return `${value>0?'+':''}${Number(value).toFixed(digits)}${suffix}`;
}
function compass(degrees) {
  if(!Number.isFinite(degrees)) return '–';
  const dirs=['N','NØ','Ø','SØ','S','SV','V','NV'];
  return `${dirs[Math.round((((degrees%360)+360)%360)/45)%8]} · ${Math.round(degrees)}°`;
}
function renderWeather(weather) {
  if (!weather) {
    $('weatherGrid').innerHTML = '<p class="muted span-all">Værdata er ikke tilgjengelig akkurat nå.</p>';
    return;
  }
  const trend = Number.isFinite(weather.tempTrend) ? `${weather.tempTrend > 0 ? '+' : ''}${weather.tempTrend}° / 3 t` : '–';
  const pressureTrend=Number.isFinite(weather.pressureTrend)?signed(weather.pressureTrend,1,' hPa / 3 t'):'–';
  $('weatherGrid').innerHTML = [
    ['Vind', formatValue(weather.wind, ' m/s')],
    ['Retning', compass(weather.windDirection)],
    ['Skydekke', formatValue(Math.round(weather.cloud), '%')],
    ['Nedbør', formatValue(weather.precipitation, ' mm/t')],
    ['Temperatur', formatValue(weather.temp, '°C')],
    ['Temptrend', trend],
    ['Lufttrykk', Number.isFinite(weather.pressure)?`${Math.round(weather.pressure)} hPa`:'–'],
    ['Trykktrend', pressureTrend],
    ['Kilde', weather.source || 'MET Norway']
  ].map(([label,value]) => `<div class="weather-item"><span>${label}</span><strong>${value}</strong></div>`).join('');
}
function formatMarineTime(point) {
  if(!point?.time) return '–';
  const d=new Date(point.time);return Number.isNaN(d.getTime())?'–':`${d.toLocaleTimeString('no-NO',{hour:'2-digit',minute:'2-digit'})} · ${Number.isFinite(point.level)?point.level.toFixed(2)+' m':''}`;
}
function renderMarine(marine,moon) {
  const card=$('marineCard');
  const freshwater=freshwaterFishTypes.has($('fishType').value);
  card.hidden=freshwater||!Object.hasOwn(fishLabels,$('fishType').value);
  if(card.hidden) return;
  if(!marine){$('marineGrid').innerHTML='<p class="muted span-all">Marine modelldata er ikke tilgjengelig akkurat nå.</p>';$('marineCaveat').textContent='Score beregnes videre uten marine tillegg.';return;}
  const tide=marine.tideState?`${marine.tideState[0].toUpperCase()+marine.tideState.slice(1)} · ${signed(marine.tideTrend3h,2,' m / 3 t')}`:'–';
  $('marineGrid').innerHTML=[
    ['Sjøtemperatur',Number.isFinite(marine.seaTemp)?`${marine.seaTemp.toFixed(1)} °C`:'–'],
    ['Bølger',Number.isFinite(marine.waveHeight)?`${marine.waveHeight.toFixed(2)} m · ${Number.isFinite(marine.wavePeriod)?marine.wavePeriod.toFixed(1)+' s':'–'}`:'–'],
    ['Bølgeretning',compass(marine.waveDirection)],
    ['Havstrøm',Number.isFinite(marine.currentVelocity)?`${marine.currentVelocity.toFixed(2)} km/t`:'–'],
    ['Strømretning',compass(marine.currentDirection)],
    ['Tidevann',tide],
    ['Neste høyvann',formatMarineTime(marine.nextHigh)],
    ['Neste lavvann',formatMarineTime(marine.nextLow)],
    ['Måne',moon?`${moon.label} · ${moon.illuminationPct}%`:'–']
  ].map(([label,value])=>`<div class="weather-item"><span>${label}</span><strong>${escapeHtml(value)}</strong></div>`).join('');
  $('marineCaveat').innerHTML=`<b>Kilde:</b> ${escapeHtml(marine.source||'Open-Meteo Marine')} · ${formatSourceTime(marine.observedAt)}<br>${escapeHtml(marine.caveat||'Marine data er modellverdier og skal ikke brukes til navigasjon.')} Månefase har bare svak vekt i fiskescore.`;
}
function renderHydrology(data) {
  latestHydrology=data||null;
  const card=$('hydrologyCard');
  const freshwater=freshwaterFishTypes.has($('fishType').value);
  card.hidden=!freshwater;
  if(card.hidden) return;
  if(!data?.available){$('hydrologyGrid').innerHTML=`<p class="muted span-all">${escapeHtml(data?.reason||'NVE-data er ikke tilgjengelig akkurat nå.')}</p>`;$('hydrologyCaveat').textContent=data?.setup||'';return;}
  const row=(item,suffix)=>item&&Number.isFinite(item.value)?`${item.value} ${suffix}`:'–';
  $('hydrologyGrid').innerHTML=[
    ['Målestasjon',data.stationName||data.stationId||'–'],
    ['Avstand',Number.isFinite(data.distanceM)?formatDistance(data.distanceM):'–'],
    ['Vannstand',row(data.stage,'m')],
    ['Vannføring',row(data.discharge,'m³/s')],
    ['Vanntemperatur',row(data.waterTemp,'°C')]
  ].map(([label,value])=>`<div class="weather-item"><span>${label}</span><strong>${escapeHtml(value)}</strong></div>`).join('');
  $('hydrologyCaveat').innerHTML=`<b>Kilde:</b> NVE HydAPI. ${escapeHtml(data.caveat||'Bruk målestasjonen som referanse og kontroller lokalt vassdrag.')}`;
}
function renderConditionVectors() {
  conditionLayer.clearLayers();
  if(!showConditionVectors||freshwaterFishTypes.has($('fishType').value)||!latestWeather) return;
  const center=map.getCenter();
  const windHeading=Number.isFinite(latestWeather.windDirection)?(latestWeather.windDirection+180)%360:null;
  const currentHeading=Number.isFinite(latestMarine?.currentDirection)?latestMarine.currentDirection:null;
  const make=(kind,label,heading,value,offset)=>{
    if(!Number.isFinite(heading)) return;
    const icon=L.divIcon({className:`condition-vector ${kind}`,html:`<div><span style="transform:rotate(${heading}deg)">➤</span><b>${escapeHtml(label)}</b><small>${escapeHtml(value)}</small></div>`,iconSize:[106,52],iconAnchor:[53,26]});
    L.marker([center.lat+offset,center.lng],{icon,interactive:false}).addTo(conditionLayer);
  };
  const span=Math.max(.001,map.getBounds().getNorth()-map.getBounds().getSouth());
  make('wind','Vind',windHeading,Number.isFinite(latestWeather.wind)?`${latestWeather.wind} m/s`:'',span*.07);
  make('current','Strøm',currentHeading,Number.isFinite(latestMarine?.currentVelocity)?`${latestMarine.currentVelocity.toFixed(2)} km/t`:'',-span*.07);
}
async function loadBoatRamps() {
  boatRampLayer.clearLayers();
  if(!showBoatRamps) return;
  const bounds=map.getBounds();
  const bbox=[bounds.getWest(),bounds.getSouth(),bounds.getEast(),bounds.getNorth()].join(',');
  try{
    const response=await fetch(`/api/ramps?bbox=${encodeURIComponent(bbox)}&zoom=${map.getZoom()}`,{cache:'no-store'});
    const data=await response.json();if(!response.ok)throw new Error(data.error||'Båtrampedata feilet');
    for(const ramp of data.ramps||[]){
      const access=ramp.access?`<br>Adgang: ${escapeHtml(ramp.access)}`:'';
      const fee=ramp.fee?` · avgift: ${escapeHtml(ramp.fee)}`:'';
      L.circleMarker([ramp.lat,ramp.lon],{radius:7,color:'#051d27',weight:2,fillColor:'#72d7ff',fillOpacity:1}).bindTooltip(ramp.name||'Båtrampe',{sticky:true}).bindPopup(`<b>${escapeHtml(ramp.name||'Båtrampe / slip')}</b>${access}${fee}<br><small>Kilde: OpenStreetMap – kontroller adgang og lokale forhold før bruk.</small>`).addTo(boatRampLayer);
    }
    if(!(data.ramps||[]).length){const warning=$('warnings');warning.textContent=`${warning.textContent} Ingen OSM-registrerte båtramper i dette utsnittet.`.trim();}
  }catch(error){const warning=$('warnings');warning.textContent=`${warning.textContent} Båtrampelaget kunne ikke lastes.`.trim();}
}
async function loadHydrologyAtCenter() {
  if(!freshwaterFishTypes.has($('fishType').value)) return;
  const c=map.getCenter();
  try{const response=await fetch(`/api/hydrology?lat=${c.lat.toFixed(5)}&lon=${c.lng.toFixed(5)}`,{cache:'no-store'});const data=await response.json();renderHydrology(response.ok?data:{available:false,reason:data.error||'NVE-data kunne ikke lastes.'});}
  catch{renderHydrology({available:false,reason:'NVE-data kunne ikke lastes mens du er offline.'});}
}

function escapeHtml(value) {
  return String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
}
function formatClock(value) {
  const date=new Date(value);
  return Number.isNaN(date.getTime())?'–':date.toLocaleTimeString('no-NO',{hour:'2-digit',minute:'2-digit'});
}
function renderBestTimes(advice={}) {
  if(!advice.available||!Array.isArray(advice.windows)||!advice.windows.length) {
    $('bestTimes').innerHTML=`<p class="muted">${escapeHtml(advice.message||'Dagens tidsprognose er ikke tilgjengelig akkurat nå.')}</p><small class="best-times-source">${escapeHtml(advice.source||'MET Norway')}</small>`;
    return;
  }
  const calculated=advice.generatedAt?` · beregnet ${formatSourceTime(advice.generatedAt)}`:'';
  $('bestTimes').innerHTML=`<div class="time-windows">${advice.windows.map((window,index)=>`<article class="time-window" data-rank="${index+1}"><div><span>${index===0?'Beste vindu':`Alternativ ${index+1}`}</span><b>${formatClock(window.start)}–${formatClock(window.end)}</b></div><strong>${escapeHtml(window.label)} · ${Number(window.score)||0}/100</strong><small>${escapeHtml(window.reason)}</small></article>`).join('')}</div><p class="best-times-disclaimer">${escapeHtml(advice.disclaimer||'Veiledende anbefaling – ingen garanti for fangst.')}</p><small class="best-times-source">Kilde: ${escapeHtml(advice.source||'MET Norway')}${calculated}</small>`;
}
function localDateTimeValue(date=new Date()) {
  return new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16);
}
function readCatchEntries() {
  try {
    const parsed=JSON.parse(localStorage.getItem(catchStorageKey)||'[]');
    return Array.isArray(parsed)?parsed.filter(entry=>entry&&typeof entry==='object').slice(0,200):[];
  } catch {
    $('catchStatus').textContent='Kunne ikke lese den lokale fangstloggen. Nye poster kan fortsatt lagres.';
    return [];
  }
}
function writeCatchEntries(entries) {
  try { localStorage.setItem(catchStorageKey,JSON.stringify(entries.slice(0,200))); return true; }
  catch { $('catchStatus').textContent='Kunne ikke lagre lokalt. Kontroller at nettleserlagring er tillatt.'; return false; }
}
function catchWeatherText(weather) {
  weather=weather||{};
  const parts=[];
  if(Number.isFinite(weather.wind)) parts.push(`${weather.wind} m/s`);
  if(Number.isFinite(weather.cloud)) parts.push(`${Math.round(weather.cloud)} % skydekke`);
  if(Number.isFinite(weather.precipitation)) parts.push(`${weather.precipitation} mm/t nedbør`);
  if(Number.isFinite(weather.temp)) parts.push(`${weather.temp} °C`);
  if(Number.isFinite(weather.tempTrend)) parts.push(`${weather.tempTrend>0?'+':''}${weather.tempTrend} °C / 3 t`);
  if(Number.isFinite(weather.pressure)) parts.push(`${Math.round(weather.pressure)} hPa`);
  if(Number.isFinite(weather.seaTemp)) parts.push(`${weather.seaTemp.toFixed(1)} °C sjø`);
  if(Number.isFinite(weather.waveHeight)) parts.push(`${weather.waveHeight.toFixed(2)} m bølger`);
  if(weather.tideState) parts.push(`${weather.tideState} vann`);
  return parts.join(' · ');
}
function renderFishingInsights(entries=readCatchEntries(),fish=$('fishType').value) {
  if(fish==='all') return;
  const api=globalThis.FishingInsights;
  if(!api) {
    $('speciesGuide').innerHTML='<p class="muted">Artsguiden er midlertidig utilgjengelig.</p>';
    $('catchInsights').innerHTML='<p class="muted">Fangstmønstre er midlertidig utilgjengelige.</p>';
    return;
  }
  const guide=api.getSpeciesGuide(fish);
  $('speciesGuide').innerHTML=`<div class="species-guide-head"><div><span>Valgt art</span><h3>${escapeHtml(guide.name)}</h3></div><b>${escapeHtml(guide.season)}</b></div><div class="species-guide-grid"><article><span>Hvor</span><p>${escapeHtml(guide.habitat)}</p></article><article><span>Hvordan</span><p>${escapeHtml(guide.presentation)}</p></article><article><span>Vannsøyle</span><p>${escapeHtml(guide.waterColumn)}</p></article></div><p class="species-caution"><b>Husk:</b> ${escapeHtml(guide.caution)}</p>`;
  const insight=api.buildCatchInsights(entries,fish);
  const weather=catchWeatherText(insight.caughtWeather);
  const bestTime=insight.bestTime?`${escapeHtml(insight.bestTime.label)} · ${escapeHtml(insight.bestTime.range)} · ${insight.bestTime.rate} % fangstrate`:'Trenger minst to turer i samme tidsrom';
  const topLure=insight.topLure?`${escapeHtml(insight.topLure.label)} · ${insight.topLure.count} fangst${insight.topLure.count===1?'':'er'}`:'Ikke nok registrerte fangster';
  $('catchInsights').innerHTML=`<div class="insight-heading"><div><span>Mine data for ${escapeHtml(guide.name)}</span><h3>${escapeHtml(insight.confidence)}</h3></div><small>${escapeHtml(insight.message)}</small></div><div class="insight-metrics"><article><span>Turer</span><b>${insight.sessions}</b></article><article><span>Fangster</span><b>${insight.catches}</b></article><article><span>Fangstrate</span><b>${insight.catchRate} %</b></article></div><div class="pattern-list"><p><span>Beste tidsrom</span><b>${bestTime}</b></p><p><span>Mest vellykket agn</span><b>${topLure}</b></p><p><span>Gjennomsnittsvær ved fangst</span><b>${weather?escapeHtml(weather):'Ikke nok værdata'}</b></p></div>`;
}
function renderCatchEntries(entries=readCatchEntries()) {
  renderFishingInsights(entries);
  if(!entries.length) {
    $('catchEntries').innerHTML='<div class="empty catch-empty"><b>Ingen turer registrert ennå</b><span>Registrer både fangst og turer uten fangst. Det gir et ærligere erfaringsgrunnlag.</span></div>';
    return;
  }
  $('catchEntries').innerHTML=entries.map(entry=>{
    const date=new Date(entry.time);
    const when=Number.isNaN(date.getTime())?'Ukjent tid':date.toLocaleString('no-NO',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
    const metrics=[entry.length?`${escapeHtml(entry.length)} cm`:null,entry.weight?`${escapeHtml(entry.weight)} kg`:null].filter(Boolean).join(' · ');
    const weather=catchWeatherText(entry.weather);
    return `<article class="catch-entry" data-catch-id="${escapeHtml(entry.id)}"><div class="catch-entry-head"><div><span class="catch-result ${entry.result==='fangst'?'caught':'blank'}">${entry.result==='fangst'?'Fangst':'Ingen fangst'}</span><b>${escapeHtml(fishLabels[entry.fish]||entry.fish||'Ukjent art')}</b></div><button type="button" class="delete-catch secondary" data-delete-catch="${escapeHtml(entry.id)}" aria-label="Slett loggpost">Slett</button></div><time datetime="${escapeHtml(entry.time)}">${escapeHtml(when)}</time><p><b>${escapeHtml(entry.place||'Ukjent sted')}</b>${metrics?` · ${metrics}`:''}</p>${entry.lure?`<p>Sluk/agn: ${escapeHtml(entry.lure)}</p>`:''}${weather?`<small>Registrert vær: ${escapeHtml(weather)}</small>`:''}${entry.note?`<blockquote>${escapeHtml(entry.note)}</blockquote>`:''}</article>`;
  }).join('');
}
function setCatchDefaults() {
  $('catchTime').value=localDateTimeValue();
  if($('fishType').value!=='all') $('catchFish').value=$('fishType').value;
}
function initCatchLog() {
  setCatchDefaults();
  renderCatchEntries();
  $('catchForm').addEventListener('submit',event=>{
    event.preventDefault();
    const form=new FormData(event.currentTarget);
    const center=map.getCenter();
    const rawTime=String(form.get('time')||'');
    const parsedTime=new Date(rawTime);
    if(!rawTime||Number.isNaN(parsedTime.getTime())) { $('catchStatus').textContent='Velg gyldig dato og tidspunkt.'; return; }
    const entry={
      id:globalThis.crypto?.randomUUID?.()||`catch-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      createdAt:new Date().toISOString(),result:String(form.get('result')||'ingen-fangst'),time:parsedTime.toISOString(),fish:String(form.get('fish')||$('fishType').value),
      place:String(form.get('place')||'').trim()||`Kartposisjon ${center.lat.toFixed(4)}, ${center.lng.toFixed(4)}`,
      length:String(form.get('length')||'').trim(),weight:String(form.get('weight')||'').trim(),lure:String(form.get('lure')||'').trim().slice(0,120),note:String(form.get('note')||'').trim().slice(0,500),
      mapCenter:{lat:Number(center.lat.toFixed(5)),lon:Number(center.lng.toFixed(5))},weather:latestWeather?{wind:latestWeather.wind,cloud:latestWeather.cloud,precipitation:latestWeather.precipitation,temp:latestWeather.temp,tempTrend:latestWeather.tempTrend,pressure:latestWeather.pressure,pressureTrend:latestWeather.pressureTrend,seaTemp:latestMarine?.seaTemp??null,waveHeight:latestMarine?.waveHeight??null,currentVelocity:latestMarine?.currentVelocity??null,tideState:latestMarine?.tideState??null,tideTrend3h:latestMarine?.tideTrend3h??null,moonPhase:latestMoon?.label??null,observedAt:latestWeather.observedAt}:null
    };
    const entries=[entry,...readCatchEntries()];
    if(!writeCatchEntries(entries)) return;
    event.currentTarget.reset(); setCatchDefaults(); renderCatchEntries(entries);
    $('catchStatus').textContent='Loggpost lagret lokalt på denne enheten.';
  });
  $('catchEntries').addEventListener('click',event=>{
    const button=event.target.closest?.('[data-delete-catch]'); if(!button) return;
    if(!confirm('Slette denne loggposten?')) return;
    const entries=readCatchEntries().filter(entry=>entry.id!==button.dataset.deleteCatch);
    if(writeCatchEntries(entries)){renderCatchEntries(entries);$('catchStatus').textContent='Loggpost slettet.';}
  });
}
function breakdownHtml(breakdown={}) {
  return Object.entries(breakdown).map(([key,value]) => `<span class="factor">${labels[key] || key}: <b>${Number(value)>0?'+':''}${value}</b></span>`).join('');
}
function strongestFactorsHtml(breakdown={}) {
  return Object.entries(breakdown).sort((a,b)=>Math.abs(b[1])-Math.abs(a[1])).slice(0,3).map(([key,value])=>`<span>${labels[key]||key} <b>${Number(value)>0?'+':''}${value}</b></span>`).join('');
}
function dataQualityHtml(quality={}) {
  const level=quality.level || 'Begrenset';
  const weather=quality.weather || {}, depth=quality.depth || {}, coast=quality.coast || {};
  const inlandDepth=String(depth.source || '').toLowerCase().includes('innland');
  const depthText=depth.available ? `${depth.source || 'EMODnet'} · estimert · ca. ${depth.resolutionM || 125} m oppløsning` : inlandDepth ? 'Innlandsdybde er ikke tilgjengelig – vurder lokalt dybdekart og synlige grunner' : 'Dybde mangler – slukvalget er et konservativt startvalg';
  return `<div class="data-quality" data-level="${level.toLowerCase()}"><div><span>Datagrunnlag</span><b>${level}</b></div><small>${quality.summary || 'Kildestatus ukjent'}</small><details><summary>Kilder og usikkerhet</summary><ul><li><b>${weather.kind || 'Værmodell'}:</b> ${weather.source || 'MET Norway'} · ${formatSourceTime(weather.updatedAt)}</li><li><b>${coast.kind || 'Beregnet analyse'}:</b> ${coast.source || 'OSM-vannmaske og kystgeometri'}</li><li><b>Dybde:</b> ${depthText}</li></ul></details></div>`;
}
function renderSources(weather,stats={}) {
  const modelTime=formatSourceTime(weather?.observedAt);
  const analysisTime=formatSourceTime(stats.generatedAt);
  const freshwater=stats.waterType === 'freshwater';
  $('analysisSources').innerHTML=`<b>Værmodell:</b> ${weather?.source || 'MET Norway'} · ${modelTime}<br><b>Analyse:</b> ${analysisTime} · ${freshwater ? 'OSM-vannmaske · valgfritt NVE-dybdekart der NVE har publisert kurver/punkter; ingen innlandsdybde antas' : `OSM-kystgeometri · EMODnet-dybde/struktur · Open-Meteo Marine · habitatdekning ${Number.isFinite(stats.habitatCoveragePercent)?stats.habitatCoveragePercent+' %':'–'}`}`;
}

function applyMapStyle() {
  const style=$('mapStyle').value;
  const freshwater=freshwaterFishTypes.has($('fishType').value);
  for(const layer of [standardLayer,topoLayer,topoRasterLayer,terrainLayer,satelliteLayer,hybridLabelsLayer,seaChartLayer,detailedDepthLayer]) if(map.hasLayer(layer)) map.removeLayer(layer);
  if(style==='3d'){
    disableBathy3D();topoRasterLayer.addTo(map); // warm 2D fallback while the lazy 3D renderer starts
    enable3DMap();saveUiState();return;
  }
  if(style==='bathy3d'){
    disable3DMap();standardLayer.addTo(map);enableBathy3D();saveUiState();return;
  }
  disable3DMap();disableBathy3D();
  if(style==='fishing'&&!freshwater){standardLayer.addTo(map);detailedDepthLayer.addTo(map);}
  else if(style==='chart'&&!freshwater){standardLayer.addTo(map);seaChartLayer.addTo(map);}
  else if(style==='topo') topoLayer.addTo(map);
  else if(style==='toporaster') topoRasterLayer.addTo(map);
  else if(style==='terrain'){topoLayer.addTo(map);terrainLayer.setOpacity(.38).addTo(map);}
  else if(style==='satellite'||style==='hybrid') satelliteLayer.addTo(map);
  else standardLayer.addTo(map);
  if(style==='hybrid') hybridLabelsLayer.addTo(map);
  saveUiState();
}

function updateMapLegend(){
  const legend=$('mapLegend');
  if(!legend) return;
  if($('fishType').value==='all'){
    legend.innerHTML='<span><i class="species-sjoorret"></i> sjøørret</span><span><i class="species-makrell"></i> makrell</span><span><i class="species-sei"></i> sei</span><span><i class="no-fishing"></i> helårsforbud</span>';
  }else{
    legend.innerHTML='<span><i class="best"></i> svært høy</span><span><i class="high"></i> høy</span><span><i class="moderate"></i> moderat</span><span><i class="source-spot"></i> historisk omtalt</span><span><i class="no-fishing"></i> helårsforbud</span>';
  }
}

function updateWaterModeUI() {
  const fishType=$('fishType').value;
  const hasSelection=Object.hasOwn(fishLabels,fishType);
  const allMode=fishType==='all';
  const freshwater=freshwaterFishTypes.has(fishType);
  if($('mapStyle').value==='marine-depth') $('mapStyle').value=freshwater?'standard':'fishing';
  $('multiSpeciesCard').hidden=!allMode;
  $('insightsCard').hidden=allMode;
  $('fishGoal').disabled=allMode;
  if(allMode) $('fishGoal').value='numbers';
  if(freshwater&&['fishing','chart'].includes($('mapStyle').value)) $('mapStyle').value='standard';
  $('nveDepthToggle').hidden=!freshwater;
  $('conditionToggle').hidden=!hasSelection||freshwater;
  $('marineCard').hidden=!hasSelection||freshwater;
  $('hydrologyCard').hidden=!freshwater;
  if(!freshwater&&map.hasLayer(nveDepthLayer)) map.removeLayer(nveDepthLayer);
  if(!freshwater){$('nveDepthToggle').setAttribute('aria-pressed','false');$('nveDepthToggle').classList.remove('depth-active');}
  if(freshwater){showConditionVectors=false;$('conditionToggle').setAttribute('aria-pressed','false');$('conditionToggle').classList.remove('layer-active');conditionLayer.clearLayers();}
  $('sourceSpotToggle').hidden=fishType!=='sjoorret';
  $('restrictionToggle').hidden=!hasSelection||freshwater;
  $('analysisMode').textContent=!hasSelection?'Velg fisketype for analyse':allMode?'Alle sjøarter · MET Norway · Kartverket':freshwater ? 'Ferskvann · MET Norway · OSM' : 'Sjøanalyse · MET Norway · Kartverket';
  $('mask').textContent=!hasSelection?'Velg fisketype for å starte analysen.':allMode?'Kontrollerer sjø og kyst for tre arter …':freshwater ? 'Kontrollerer innsjø/elv og vannkant …' : 'Kontrollerer sjø og kyst …';
  updateMapLegend();
  applyMapStyle();
  renderReferenceLayers();
  sync3DWaterMode();
  return freshwater;
}

function sourceSpotPopup(spot,source={}) {
  const restricted=spot.status==='restricted';
  return `<article class="source-map-popup ${restricted?'restricted':''}"><span>${restricted?'Historisk omtale – ikke anbefaling':'Historisk omtalt sjøørretområde'}</span><h3>${escapeHtml(spot.name)}</h3>${restricted?`<p class="legal-warning"><b>Alt fiske forbudt hele året</b><br>${escapeHtml(spot.legalNote||spot.safety)}</p>`:''}<p>${escapeHtml(spot.summary)}</p><p><b>Kjennetegn:</b> ${escapeHtml((spot.features||[]).join(' · '))}</p><p><b>Sikkerhet/adkomst:</b> ${escapeHtml(spot.safety)}</p>${!restricted&&spot.legalNote?`<p class="legal-caution"><b>Nær fredningssone:</b> ${escapeHtml(spot.legalNote)}</p>`:''}<small>Gul/rød sirkel er en omtrentlig områdeindikator, ikke en eiendoms-, frednings- eller fangstgrense. ${escapeHtml(spot.disclaimer)}</small><div class="map-popup-sources"><a href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">Rosareke – erfaringskilde</a><a href="${escapeHtml(spot.coordinateSourceUrl)}" target="_blank" rel="noopener noreferrer">Kartverket – stedsnavn/koordinat</a></div></article>`;
}

function restrictionPopup(zone,regulation={}) {
  return `<article class="source-map-popup restricted"><span>Gjeldende fredningsgrense</span><h3>${escapeHtml(zone.name)}</h3><p class="legal-warning"><b>Alt fiske forbudt hele året</b><br>${escapeHtml(zone.legalText)}</p><p><b>Rød linje:</b> koordinatfestet yttergrense · ${escapeHtml(zone.sourceRef)} · oppgitt lengde ${escapeHtml(zone.lengthM)} m.</p><small>Linjen er yttergrensen, ikke hele flaten. Ved tvil gjelder ajourført Lovdata og offisielt kartvedlegg.</small><div class="map-popup-sources"><a href="${escapeHtml(regulation.url)}" target="_blank" rel="noopener noreferrer">Lovdata ${escapeHtml(regulation.id||'')}</a></div></article>`;
}

function renderReferenceLayers() {
  sourceSpotLayer.clearLayers();
  restrictionLayer.clearLayers();
  const fishType=$('fishType').value;
  if(showSourceSpots&&fishType==='sjoorret'&&sourceSpotData) {
    for(const spot of sourceSpotData.spots) {
      const restricted=spot.status==='restricted';
      L.circle([spot.lat,spot.lon],{radius:spot.radiusM,color:restricted?'#ff5d55':'#f2c94c',weight:restricted?3:2,dashArray:restricted?'7 5':'5 5',fillColor:restricted?'#ff5d55':'#f2c94c',fillOpacity:restricted?.12:.08})
        .bindTooltip(spot.name,{sticky:true,className:restricted?'restricted-source-tip':'source-spot-tip'})
        .bindPopup(sourceSpotPopup(spot,sourceSpotData.source),{maxWidth:360,className:'source-leaflet-popup'}).addTo(sourceSpotLayer);
    }
  }
  if(showRestrictions&&!freshwaterFishTypes.has(fishType)&&restrictionData) {
    for(const zone of restrictionData.zones.filter(item=>item.renderBoundary)) {
      L.polyline(zone.outerBoundary.map(point=>[point.lat,point.lon]),{color:'#ff3b30',weight:6,opacity:.95,dashArray:'12 7',lineCap:'round'})
        .bindTooltip(`Helårsforbud · ${zone.name}`,{sticky:true,className:'restriction-tip'})
        .bindPopup(restrictionPopup(zone,restrictionData.regulation),{maxWidth:360,className:'source-leaflet-popup'}).addTo(restrictionLayer);
    }
  }
  sync3DReferenceLayers();
}

async function loadReferenceLayers() {
  try {
    const [spotsResponse,restrictionsResponse]=await Promise.all([
      fetch('/data/kirkoy-seatrout-spots.json',{cache:'no-cache'}),
      fetch('/data/fishing-restrictions-2024.json',{cache:'no-cache'})
    ]);
    if(!spotsResponse.ok||!restrictionsResponse.ok) throw new Error('Kildelag kunne ikke lastes');
    [sourceSpotData,restrictionData]=await Promise.all([spotsResponse.json(),restrictionsResponse.json()]);
    renderReferenceLayers();
  } catch(error) {
    const warning=$('warnings');
    warning.textContent=`${warning.textContent} Kildelag for Kirkøy/fredningsgrenser er midlertidig utilgjengelig.`.trim();
  }
}
function alternativeLuresHtml(alternatives=[]){
  if(!Array.isArray(alternatives)||!alternatives.length) return '';
  return `<div class="lure-alternatives"><div class="alt-head"><b>BYTT TIL DISSE HVIS DET ER DØDT</b><span>${alternatives.length} reelle alternativer fra din slukboks</span></div><div class="alt-lure-grid">${alternatives.map((alt,index)=>`<article class="alt-lure"><span class="alt-rank">${index+2}</span><img class="zoomable-lure" src="${escapeHtml(alt.image||'')}" alt="${escapeHtml(alt.name||'Alternativ sluk')}" loading="lazy" tabindex="0" role="button"><div><b>${escapeHtml(alt.name||alt.type||'Alternativ')}</b><small>${escapeHtml(alt.color||'')} · match ${Number.isFinite(alt.matchScore)?alt.matchScore:'–'}/100</small></div></article>`).join('')}</div></div>`;
}
function popupAlternativeLuresHtml(alternatives=[]){
  if(!Array.isArray(alternatives)||!alternatives.length) return '';
  return `<div class="popup-alternatives"><b>Alternativer:</b>${alternatives.slice(0,3).map(alt=>`<span>${escapeHtml(alt.name||alt.type||'Sluk')} · ${escapeHtml(alt.color||'')}</span>`).join('')}</div>`;
}
function genericCombinationsHtml(){ return ''; }
function sourceBackedLureHtml(){ return ''; }
function presentationTacticsHtml(lure={}) {
  const presentation=lure.presentation||{};
  const fly=lure.dropperFly||{};
  if(!presentation.band&&!fly.pattern) return '';
  return `<div class="presentation-tactics"><article><span>Slukhøyde i vannet</span><b>${presentation.band||'Søk trinnvis i vannsøylen'}</b><small>${presentation.method||''}<br><em>${presentation.basis||''}</em></small></article><article class="dropper-fly" data-recommended="${fly.recommended?'yes':'no'}"><span>Opphengerflue · ${fly.recommended?'Ja':'Nei'}</span>${fly.image?`<img class="dropper-fly-image zoomable-lure" src="${fly.image}" alt="Illustrasjon av ${fly.pattern} – ${fly.color}" loading="lazy" tabindex="0" role="button">`:''}<b>${fly.pattern||'Ikke anbefalt'}${fly.color&&fly.color!=='Ikke aktuelt'?` · ${fly.color}`:''}</b><small>${fly.distance||''}<br>${fly.reason||''}<br><em>${fly.rulesNote||''}</em></small></article></div>`;
}
function waterEnvironmentHtml(environment={}) {
  if(!environment.label) return '';
  return `<div class="water-environment"><b>${escapeHtml(environment.label)} · ${escapeHtml(environment.classification||'')}</b><span>${escapeHtml(environment.basis||'')}</span><small>${escapeHtml(environment.caveat||'')}</small></div>`;
}
function lureHtml(lure={}) {
  const depth = lure.depth || {};
  return `<div class="lure-cell"><div class="lure-main"><img class="lure-photo zoomable-lure" src="${escapeHtml(lure.image || '')}" alt="${escapeHtml(lure.name || 'Anbefalt sluk fra din samling')}" loading="lazy" tabindex="0" role="button"><div><span class="lure-label">BEST NÅ · KUN FRA DIN EGEN SLUKBOKS</span><b>${escapeHtml(lure.name || lure.type || 'Valgt sluk')}</b><span class="lure-color">◉ ${escapeHtml(lure.color || '')}</span><span class="depth-note">${escapeHtml(lure.type||'')} · ${escapeHtml(lure.weight||'')}</span><span class="depth-note">Dybde: ${escapeHtml(depth.label || 'ukjent')}</span></div></div><small>${escapeHtml(lure.reason || 'Tilpass innsveivingen etter forholdene.')}</small>${alternativeLuresHtml(lure.alternatives)}${waterEnvironmentHtml(lure.waterEnvironment)}${presentationTacticsHtml(lure)}</div>`;
}
function compactPopupHtml(zone,index) {
  const lure=zone.lure || {};
  const presentation=lure.presentation||{};
  const fly=lure.dropperFly||{};
  return `<div class="compact-popup"><div class="compact-popup-head"><span>${$('fishType').value==='all'?escapeHtml(zone.fishLabel||'Sjøart')+' · ':''}Sone ${index+1}</span><b>${zone.name}</b></div><div class="popup-score"><span>Fiskeforhold</span><b>${zone.score}/100</b><small>Veiledende rangering – ikke fangstsannsynlighet</small></div><div class="popup-factors">${strongestFactorsHtml(zone.breakdown)}</div><div class="popup-quality"><span>Datagrunnlag</span><b>${zone.dataQuality?.level || 'Begrenset'}</b><small>${zone.dataQuality?.summary || 'Kildestatus ukjent'}</small></div><div class="popup-primary"><img class="popup-lure-thumb zoomable-lure" src="${lure.image || '/lures/blue-silver-shallow.jpg'}" alt="${lure.name || 'Anbefalt sluk'} – ${lure.color || 'Sølv/blå'}" tabindex="0" role="button"><div><span>Ditt bildevalg · ${escapeHtml(lure.waterEnvironment?.label||'riktig vannmiljø')}</span><b>${lure.name ? `${lure.name} · ` : ''}${lure.type || 'Smal kystsluk'} · ${lure.weight || '18–22 g'}</b><small>${lure.color || 'Sølv/blå'}${lure.inventoryNote?`<br>På bildet: ${escapeHtml(lure.inventoryNote)}`:''}</small></div></div>${popupAlternativeLuresHtml(lure.alternatives)}<div class="popup-tactics"><b>Slukhøyde:</b> ${presentation.band||'Søk trinnvis'}<br><b>Opphengerflue:</b> ${fly.recommended?'Ja':'Nei'}${fly.recommended&&fly.color?` · ${fly.color}`:''}</div><button type="button" class="popup-details" data-zone="${zone.id}">Vis alle detaljer i listen</button></div>`;
}
function lureText(zone={}) { const lure=zone.lure||{}; return [lure.name,lure.type,lure.color,lure.weight].filter(Boolean).join(' '); }
function tokenOverlap(a,b) {
  const tokens=value=>new Set(String(value||'').toLocaleLowerCase('no-NO').replace(/[^a-z0-9æøå]+/gi,' ').split(/\s+/).filter(word=>word.length>=3));
  const left=tokens(a),right=tokens(b);let count=0;for(const token of left)if(right.has(token))count++;return count;
}
function applyPersonalRanking(zones=[]) {
  const api=globalThis.FishingInsights;
  const fish=$('fishType').value;
  if(!api||fish==='all') return zones;
  const insight=api.buildCatchInsights(readCatchEntries(),fish);
  return zones.map(zone=>{
    const modelScore=Number(zone.score)||0;
    if(insight.sessions<3) return {...zone,modelScore,personalAdjustment:0};
    let adjustment=0;
    const band=api.timeBand(new Date());
    if(insight.bestTime?.id===band.id) adjustment+=2;
    const overlap=insight.topLure?tokenOverlap(insight.topLure.label,lureText(zone)):0;
    if(overlap) adjustment+=Math.min(3,overlap);
    let weatherFit=0;
    if(Number.isFinite(insight.caughtWeather?.wind)&&Number.isFinite(latestWeather?.wind)&&Math.abs(insight.caughtWeather.wind-latestWeather.wind)<=2) weatherFit++;
    if(Number.isFinite(insight.caughtWeather?.cloud)&&Number.isFinite(latestWeather?.cloud)&&Math.abs(insight.caughtWeather.cloud-latestWeather.cloud)<=20) weatherFit++;
    if(Number.isFinite(insight.caughtWeather?.temp)&&Number.isFinite(latestWeather?.temp)&&Math.abs(insight.caughtWeather.temp-latestWeather.temp)<=3) weatherFit++;
    adjustment+=Math.min(2,weatherFit);
    adjustment=Math.min(6,adjustment);
    const adjusted=Math.min(100,modelScore+adjustment);return {...zone,modelScore,personalAdjustment:adjustment,score:adjusted,analysis:zone.analysis?{...zone.analysis,total:adjusted,personalAdjustment:adjustment}:zone.analysis,breakdown:adjustment?{...zone.breakdown,personlig:adjustment}:zone.breakdown};
  }).sort((a,b)=>b.score-a.score||b.modelScore-a.modelScore);
}
function downloadTextFile(name,text,type) {
  const blob=new Blob([text],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function exportCatchGpx() {
  const entries=readCatchEntries().filter(entry=>Number.isFinite(entry.mapCenter?.lat)&&Number.isFinite(entry.mapCenter?.lon));
  if(!entries.length){$('catchStatus').textContent='Ingen loggposter med kartposisjon å eksportere.';return;}
  const xmlEscape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
  const waypoints=entries.map(entry=>`<wpt lat="${entry.mapCenter.lat}" lon="${entry.mapCenter.lon}"><time>${xmlEscape(entry.time)}</time><name>${xmlEscape(entry.place||fishLabels[entry.fish]||'Fisketur')}</name><desc>${xmlEscape(`${entry.result==='fangst'?'Fangst':'Ingen fangst'} · ${fishLabels[entry.fish]||entry.fish}${entry.lure?' · '+entry.lure:''}`)}</desc><type>${entry.result==='fangst'?'catch':'session'}</type></wpt>`).join('');
  downloadTextFile(`fiste-guiden-fangster-${new Date().toISOString().slice(0,10)}.gpx`,`<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="Fiste guiden REV34" xmlns="http://www.topografix.com/GPX/1/1">${waypoints}</gpx>`,'application/gpx+xml');
  $('catchStatus').textContent=`Eksporterte ${entries.length} posisjoner som GPX.`;
}
function exportCatchJson() { const entries=readCatchEntries();downloadTextFile(`fiste-guiden-backup-${new Date().toISOString().slice(0,10)}.json`,JSON.stringify({version:1,exportedAt:new Date().toISOString(),entries},null,2),'application/json');$('catchStatus').textContent=`Backup med ${entries.length} loggposter er eksportert.`; }
function cacheAnalysis(data) { try{const c=map.getCenter();localStorage.setItem(analysisCacheKey,JSON.stringify({savedAt:new Date().toISOString(),fish:$('fishType').value,center:{lat:c.lat,lon:c.lng},data}));}catch{} }
function distanceKm(a,b){if(!a||!b)return Infinity;const R=6371,toRad=Math.PI/180,dLat=(b.lat-a.lat)*toRad,dLon=(b.lon-a.lon)*toRad,h=Math.sin(dLat/2)**2+Math.cos(a.lat*toRad)*Math.cos(b.lat*toRad)*Math.sin(dLon/2)**2;return 2*R*Math.asin(Math.min(1,Math.sqrt(h)));}
function readCachedAnalysis() { try{const cached=JSON.parse(localStorage.getItem(analysisCacheKey)||'null');if(!cached?.data||cached.fish!==$('fishType').value)return null;if(distanceKm(cached.center,map.getCenter())>35)return null;return cached;}catch{return null;} }
function applyAnalysisData(data,{cached=false}={}) {
  latestWeather=data.weather||null;latestMarine=data.marine||null;latestMoon=data.moon||null;
  renderWeather(latestWeather);renderMarine(latestMarine,latestMoon);renderSources(latestWeather,data.stats||{});renderBestTimes(data.bestTimes||{});renderZones(data.zones||[]);renderConditionVectors();
  $('mask').textContent=data.stats?.waterMaskAvailable===false?'Vannmasken er midlertidig utilgjengelig.':`Aktiv · ${data.stats?.tested??0} kandidater kontrollert · ${data.stats?.rejected??0} forkastet`;
  const warning=(data.warnings||[]).join(' ');$('warnings').textContent=cached?`OFFLINE: viser siste lagrede analyse fra ${formatSourceTime(data.stats?.generatedAt)}. ${warning}`.trim():warning;
}
function leanAlternativeLures(alternatives=[]){
  if(!Array.isArray(alternatives)||!alternatives.length)return '';
  return `<div class="lean-alt-grid">${alternatives.slice(0,3).map(alt=>`<article><img class="zoomable-lure" src="${escapeHtml(alt.image||'')}" alt="${escapeHtml(alt.name||alt.type||'Alternativ sluk')}" loading="lazy" tabindex="0"><div><b>${escapeHtml(alt.name||alt.type||'Alternativ')}</b><small>${escapeHtml(alt.color||'')}</small></div></article>`).join('')}</div>`;
}

const depthProfileCache=new Map();
function analysisScoreStripHtml(zone={}){
  const analysis=zone.analysis||{};
  const total=Number.isFinite(analysis.total)?analysis.total:Math.round(zone.score||0);
  const habitat=Number.isFinite(analysis.habitat)?analysis.habitat:null;
  const now=Number.isFinite(analysis.now)?analysis.now:null;
  const confidence=Number.isFinite(analysis.confidence)?analysis.confidence:zone.dataQuality?.confidence;
  return `<div class="analysis-score-strip"><span><small>TOTAL</small><b>${Math.round(total)}/100</b></span>${habitat!==null?`<span><small>HABITAT</small><b>${Math.round(habitat)}</b></span>`:''}${now!==null?`<span><small>NÅ</small><b>${Math.round(now)}</b></span>`:''}${Number.isFinite(confidence)?`<span><small>DATA</small><b>${Math.round(confidence)}%</b></span>`:''}</div>`;
}
function factorRowsHtml(factors=[]){
  if(!Array.isArray(factors)||!factors.length) return '<p class="muted">Ingen detaljer tilgjengelig for denne delen.</p>';
  return `<div class="analysis-factor-list">${factors.slice().sort((a,b)=>(b.weight||0)-(a.weight||0)).map(f=>`<div><span>${escapeHtml(f.label||f.key||'Faktor')}</span><i><em style="width:${Math.max(0,Math.min(100,Number(f.score)||0))}%"></em></i><b>${Math.round(Number(f.score)||0)}</b></div>`).join('')}</div>`;
}
function habitatDetailHtml(habitat={}){
  if(!habitat?.serviceAvailable) return '<p class="muted">Marine naturtypedata var ikke tilgjengelig i denne analysen. Sonen rangeres fortsatt på dybde, kyststruktur og liveforhold.</p>';
  const signals=Array.isArray(habitat.signals)?habitat.signals:[];
  return `<div class="habitat-pills">${signals.length?signals.map(x=>`<span>${escapeHtml(x)}</span>`).join(''):'<span>Ingen registrert naturtype akkurat på punktet</span>'}</div><p class="detail-caveat">Kildedekning ${Math.round(habitat.serviceCoveragePercent||0)} %. Manglende registrering betyr ikke at naturtypen ikke finnes fysisk.</p>`;
}
function legalDetailHtml(legal={}){
  const blocked=Boolean(legal.blocked);
  return `<div class="legal-status ${blocked?'blocked':'clear'}"><b>${blocked?'⛔ '+escapeHtml(legal.status||'Fiskeforbud'):'✓ '+escapeHtml(legal.status||'Ingen kjent hard sperre')}</b>${legal.name?`<span>${escapeHtml(legal.name)}</span>`:''}<p>${escapeHtml(legal.caveat||'Kontroller alltid lokale regler før fiske.')}</p>${legal.url?`<a href="${escapeHtml(legal.url)}" target="_blank" rel="noopener noreferrer">Åpne forskriften</a>`:''}</div>`;
}
function confidenceDetailHtml(zone={}){
  const quality=zone.dataQuality||{},components=quality.components||zone.analysis?.confidenceComponents||[];
  return `<p class="confidence-lead"><b>${Math.round(quality.confidence??zone.analysis?.confidence??0)} %</b> · ${escapeHtml(quality.level||'Begrenset')}</p>${factorRowsHtml(components.map(c=>({label:c.label,score:c.score,weight:c.weight})))}<p class="detail-caveat">Scoren og datadekningen er to forskjellige ting. Høy fiskescore med lav datadekning skal tolkes mer forsiktig.</p>`;
}
function quickStructureHtml(zone={}){
  const s=zone.structure||{},d=zone.depth||{};
  const depth=Number.isFinite(d.meters)?`${d.meters.toFixed(1).replace('.',',')} m`:'ukjent';
  const slope=Number.isFinite(s.slopeMPer100)?`${s.slopeMPer100.toFixed(1).replace('.',',')} m / 100 m`:'ikke beregnet';
  return `<div class="structure-summary"><span><small>Dybde ved punkt</small><b>${depth}</b></span><span><small>Struktur</small><b>${escapeHtml(s.label||'Ikke beregnet')}</b></span><span><small>Helning</small><b>${slope}</b></span></div><div class="depth-profile-slot" data-depth-profile><p class="muted">Åpne menyen for å hente detaljert modellert tverrprofil.</p></div>`;
}
function depthProfileSvgHtml(data={}){
  const samples=(data.samples||[]).filter(s=>Number.isFinite(s.meters)&&Number.isFinite(s.distanceM));
  if(samples.length<2) return `<p class="muted">For få dybdedata til å lage profil.</p><p class="detail-caveat">${escapeHtml(data.caveat||'')}</p>`;
  const maxD=Math.max(1,...samples.map(s=>s.meters)),maxX=Math.max(1,...samples.map(s=>s.distanceM));
  const points=samples.map(s=>`${18+(s.distanceM/maxX)*304},${16+(s.meters/maxD)*66}`).join(' ');
  const labels=samples.map(s=>`<text x="${18+(s.distanceM/maxX)*304}" y="96" text-anchor="middle">${s.distanceM}m</text>`).join('');
  const dots=samples.map(s=>`<g><circle cx="${18+(s.distanceM/maxX)*304}" cy="${16+(s.meters/maxD)*66}" r="3"></circle><text x="${18+(s.distanceM/maxX)*304}" y="${Math.max(11,12+(s.meters/maxD)*66)}" text-anchor="middle">${s.meters.toFixed(1)}</text></g>`).join('');
  return `<div class="depth-profile"><div class="depth-profile-head"><b>${escapeHtml(data.label||'Dybdeprofil')}</b><span>${escapeHtml(data.kind||'Modellert')} · ca. ${Number(data.resolutionM)||125} m</span></div><svg viewBox="0 0 340 104" role="img" aria-label="Modellert dybdeprofil"><line x1="18" y1="16" x2="322" y2="16" class="profile-surface"></line><polyline points="${points}" class="profile-line"></polyline>${dots}${labels}</svg><p class="detail-caveat">${escapeHtml(data.caveat||'')}</p></div>`;
}
async function loadDepthProfileForZone(zone,slot){
  if(!slot||slot.dataset.loaded==='yes') return;
  if(!zone?.structure?.profileAvailable||!Number.isFinite(zone.structure.coastNormal)){slot.innerHTML='<p class="muted">Detaljert dybdeprofil er ikke tilgjengelig for dette punktet.</p>';slot.dataset.loaded='yes';return;}
  slot.innerHTML='<p class="muted">Henter modellert dybdeprofil …</p>';
  const key=`${zone.marker.lat.toFixed(5)}:${zone.marker.lon.toFixed(5)}:${Math.round(zone.structure.coastNormal)}`;
  try{
    let data=depthProfileCache.get(key);
    if(!data){const params=new URLSearchParams({lat:String(zone.marker.lat),lon:String(zone.marker.lon),coastNormal:String(zone.structure.coastNormal)});const response=await fetch(`/api/depth-profile?${params}`,{cache:'no-store'});data=await response.json();if(!response.ok)throw new Error(data.error||'Profilen kunne ikke hentes');depthProfileCache.set(key,data);}
    slot.innerHTML=depthProfileSvgHtml(data);slot.dataset.loaded='yes';
  }catch(error){slot.innerHTML=`<p class="muted">Dybdeprofil utilgjengelig: ${escapeHtml(error.message||String(error))}</p>`;}
}
function analysisDetailsHtml(zone={}){
  const analysis=zone.analysis||{},habitat=zone.habitat||{},legal=zone.legal||{};
  return `<div class="selected-detail-stack"><details class="zone-detail"><summary><span>Hvorfor akkurat her</span><small>Habitat + forhold</small></summary><div class="detail-columns"><section><b>Habitat</b>${factorRowsHtml(analysis.habitatFactors||[])}</section><section><b>Akkurat nå</b>${factorRowsHtml(analysis.liveFactors||[])}</section></div></details><details class="zone-detail depth-detail"><summary><span>Dybde og struktur</span><small>${escapeHtml(zone.structure?.label||'profil')}</small></summary>${quickStructureHtml(zone)}</details><details class="zone-detail"><summary><span>Habitat i området</span><small>${(habitat.signals||[]).length?`${habitat.signals.length} treff`:'skjult analyse'}</small></summary>${habitatDetailHtml(habitat)}</details><details class="zone-detail"><summary><span>Fredning og regler</span><small>${legal.blocked?'SPERRET':'kontroll'}</small></summary>${legalDetailHtml(legal)}</details><details class="zone-detail"><summary><span>Datagrunnlag</span><small>${Math.round(zone.dataQuality?.confidence??analysis.confidence??0)} %</small></summary>${confidenceDetailHtml(zone)}</details></div>`;
}
function renderSelectedZone(zone){
  const holder=$('selectedZone');if(!holder)return;
  if(!zone){holder.innerHTML='<span class="card-label">ANBEFALT SONE</span><h2>Ingen sikker sone i utsnittet</h2><p class="muted">Flytt kartet eller zoom litt ut.</p>';return;}
  const lure=zone.lure||{},presentation=lure.presentation||{},fly=lure.dropperFly||{};
  const fish=zone.fishType||$('fishType').value,fishLabel=zone.fishLabel||fishLabels[fish]||fish;
  const number=Math.max(1,latestZones.findIndex(x=>x.id===zone.id)+1);
  const distance=Number.isFinite(zone.distanceM)?formatDistance(zone.distanceM):'Ingen avstandsgrense';
  const summary=zone.analysis?.summary||zone.reason||'';
  holder.innerHTML=`<div class="selected-title-row"><div><span class="card-label">#${number} · ${escapeHtml(fishLabel)}</span><h2>${escapeHtml(zone.waterName||zone.name||'Anbefalt sone')}</h2></div><strong class="score-badge">${Math.round(zone.score||0)}/100</strong></div>${analysisScoreStripHtml(zone)}<div class="selected-chips"><span>${escapeHtml(zone.name||'')}</span><span>${escapeHtml(distance)}</span></div><p class="selected-reason">${escapeHtml(summary)}</p><div class="lean-lure"><img class="zoomable-lure" src="${escapeHtml(lure.image||'')}" alt="${escapeHtml(lure.name||lure.type||'Anbefalt sluk')}" tabindex="0"><div><span>FØRSTEVALG FRA DIN SLUKBOKS</span><b>${escapeHtml(lure.name||lure.type||'Anbefalt agn')}</b><small>${escapeHtml([lure.color,lure.weight].filter(Boolean).join(' · '))}</small><p>${escapeHtml(lure.reason||'')}</p></div></div>${leanAlternativeLures(lure.alternatives)}<div class="quick-advice"><b>Fisk slik</b><p>${escapeHtml(presentation.method||presentation.band||'Fisk av sonen systematisk og varier tempo og dybde.')}</p>${fly.recommended?`<small>Opphengerflue: ${escapeHtml(fly.pattern||'Ja')}${fly.color?' · '+escapeHtml(fly.color):''}</small>`:''}</div>${analysisDetailsHtml(zone)}<button class="secondary selected-map-button" type="button" id="selectedGo">Vis valgt sone på kartet</button>`;
  $('selectedGo')?.addEventListener('click',()=>focusMapOnZone(zone,15));
  const depthDetails=holder.querySelector('.depth-detail');
  depthDetails?.addEventListener('toggle',()=>{if(depthDetails.open)loadDepthProfileForZone(zone,depthDetails.querySelector('[data-depth-profile]'));});
}
function selectZone(zoneId,{scroll=false}={}) {
  selectedZoneId=zoneId;
  document.querySelectorAll('.zone-row').forEach(row=>row.classList.toggle('selected',row.dataset.zone===zoneId));
  zoneLayer.eachLayer(layer=>{if(!layer._zoneId||typeof layer.setStyle!=='function')return;layer.setStyle({weight:layer._zoneId===zoneId?4:2,fillOpacity:(layer._zoneId===zoneId ? .48 : .24)});});
  const selected=latestZones.find(zone=>zone.id===zoneId);
  renderSelectedZone(selected||null);
  if(selected&&!$('catchPlace').value) $('catchPlace').value=selected?.waterName||selected?.name||'';
  if(selected&&!$('catchLure').value) $('catchLure').value=lureText(selected);
  if(selected?.fishType&&$('fishType').value==='all') $('catchFish').value=selected.fishType;
  sync3DZones();
  if(scroll){const target=$('selectedZoneCard');if(window.innerWidth<1000)target?.scrollIntoView({behavior:'smooth',block:'start'});else $('results')?.scrollTo({top:0,behavior:'smooth'});}
}
function renderZones(zones) {
  zones=applyPersonalRanking(zones).slice(0,10);latestZones=zones;zoneLayer.clearLayers();drawNavigation(zones);$('zoneCount').textContent=`${zones.length} soner`;
  if(!zones.length){renderSelectedZone(null);sync3DZones();const radius=Number($('baseRadius').value)||0;$('zones').innerHTML=currentAnalysisBase()&&radius?`<div class="empty"><b>Ingen sone innen ${escapeHtml(formatDistance(radius))}</b><span>Klikk et nytt referansepunkt eller øk avstanden.</span></div>`:'<div class="empty"><b>Ingen sikre soner i utsnittet</b><span>Flytt kartet litt eller zoom nærmere vann.</span></div>';return;}
  const allMode=$('fishType').value==='all';
  $('zones').innerHTML=zones.map((zone,index)=>{const fish=zone.fishType||$('fishType').value,fishBadge=allMode?`<span class="species-badge species-badge-${fish}">${escapeHtml(zone.fishLabel||fishLabels[fish]||fish)}</span>`:'';return `<button type="button" class="zone-row lean-zone-row" data-zone="${zone.id}"><span class="zone-rank">${index+1}</span><span class="lean-zone-copy"><b>${escapeHtml(zone.waterName||`Sone ${index+1}`)}</b><small>${escapeHtml(zone.name||'')}</small>${fishBadge}</span><span class="lean-zone-lure">${zone.lure?.image?`<img src="${escapeHtml(zone.lure.image)}" alt="" loading="lazy">`:''}<small>${escapeHtml(zone.lure?.name||zone.lure?.type||'')}</small></span><strong>${Math.round(zone.score||0)}</strong></button>`;}).join('');
  zones.forEach((zone,index)=>{const fish=zone.fishType||$('fishType').value,mapColor=allMode?(speciesColors[fish]||scoreColor(zone.score)):scoreColor(zone.score);const marker=L.circleMarker([zone.marker.lat,zone.marker.lon],{radius:7,color:'#10251f',weight:2,fillColor:mapColor,fillOpacity:1,opacity:1}).bindTooltip(String(index+1),{permanent:true,direction:'center',className:`zone-number ${allMode?`zone-number-${fish}`:''}`});const layer=Array.isArray(zone.polygon)&&zone.polygon.length>=3?L.polygon(zone.polygon,{color:mapColor,weight:2,fillColor:mapColor,fillOpacity:.24,opacity:.96}):L.circleMarker([zone.marker.lat,zone.marker.lon],{radius:15,color:mapColor,weight:2,fillColor:mapColor,fillOpacity:.10,opacity:.96});layer._zoneId=zone.id;marker._zoneId=zone.id;layer.on('click',e=>{if(e.originalEvent)L.DomEvent.stopPropagation(e.originalEvent);selectZone(zone.id,{scroll:true});});marker.on('click',e=>{if(e.originalEvent)L.DomEvent.stopPropagation(e.originalEvent);selectZone(zone.id,{scroll:true});});layer.addTo(zoneLayer);marker.addTo(zoneLayer);document.querySelector(`[data-zone="${zone.id}"]`)?.addEventListener('click',()=>{selectZone(zone.id,{scroll:true});focusMapOnZone(zone,15);});});
  if(!zones.some(z=>z.id===selectedZoneId))selectedZoneId=zones[0].id;selectZone(selectedZoneId);sync3DZones();sync3DReferenceAndLive();
}
async function loadZones({ immediate=false }={}) {
  if(!Object.hasOwn(fishLabels,$('fishType').value)) {
    clearTimeout(timer); controller?.abort(); zoneLayer.clearLayers();
    $('zones').innerHTML='<div class="empty"><b>Velg fisketype</b><span>Velg art i nedtrekksmenyen for å starte kartanalysen.</span></div>';
    $('mask').textContent='Velg fisketype for å starte analysen.';
    setState('ready','Velg fisketype for å starte.');
    return;
  }
  clearTimeout(timer);
  timer = setTimeout(async () => {
    controller?.abort(); controller = new AbortController();
    const bounds = map.getBounds();
    const bbox = [bounds.getWest(),bounds.getSouth(),bounds.getEast(),bounds.getNorth()].join(',');
    const allMode=$('fishType').value==='all';
    const freshwater=freshwaterFishTypes.has($('fishType').value);
    setState('loading',allMode?'Analyserer sjøørret, makrell og sei samtidig …':freshwater ? 'Analyserer vannkant, vind og ferskvannsforhold …' : 'Analyserer kyst, vind og sjøforhold …');
    $('zones').setAttribute('aria-busy','true');
    try {
      const searchParams = new URLSearchParams({ bbox, zoom:String(map.getZoom()), limit:'10' });
      searchParams.set('fish', $('fishType').value);
      searchParams.set('goal',$('fishGoal').value);
      const radius=Number($('baseRadius').value)||0;
      const analysisBase=currentAnalysisBase();
      if(analysisBase){searchParams.set('baseLat',String(analysisBase.lat));searchParams.set('baseLon',String(analysisBase.lon));if(radius)searchParams.set('radiusM',String(radius));}
      const response = await fetch(`/api/zones?${searchParams}`, { cache:'no-store', signal:controller.signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `API-feil ${response.status}`);
      applyAnalysisData(data);cacheAnalysis(data);
      if(freshwater) loadHydrologyAtCenter(); else renderHydrology(null);
      setState('ready',`Oppdatert ${new Date().toLocaleTimeString('no-NO',{hour:'2-digit',minute:'2-digit'})} · ${(data.zones || []).length} soner`);
    } catch (error) {
      if (error.name === 'AbortError') return;
      const offline = !navigator.onLine;
      const cached=readCachedAnalysis();
      if(cached){applyAnalysisData(cached.data,{cached:true});setState('ready',`Offline · siste lagrede analyse ${formatSourceTime(cached.savedAt)}`);}
      else{setState('error',offline ? 'Du er offline og har ingen lagret analyse for dette området.' : `Kunne ikke oppdatere: ${error.message}`);$('zones').innerHTML = `<div class="empty error"><b>${offline ? 'Ingen nettforbindelse' : 'Analysen feilet'}</b><span>Prøv igjen. Kartet kan fortsatt brukes.</span></div>`;}
    } finally { $('zones').setAttribute('aria-busy','false'); }
  }, immediate ? 0 : 550);
}
// ResizeObserver/invalidateSize can emit moveend without user interaction.
// Listening to dragend instead prevents a render → resize → reload feedback loop.
map.on('click',event=>{setBasePoint(event.latlng,{label:'Kartklikk',focus:false});setState('ready','Kartklikk satt som referansepunkt. Oppdaterer 10 beste soner …');});
map.on('dragend zoomend', () => {if(threeDSyncing)return;saveUiState();renderConditionVectors();if(showBoatRamps)loadBoatRamps();loadZones();});
$('locate').addEventListener('click', () => { setState('locating','Finner posisjonen din …'); map.locate({ setView:true, maxZoom:14, enableHighAccuracy:true }); });
$('live').addEventListener('click',startLiveMode);
$('retry').addEventListener('click', () => loadZones({immediate:true}));
$('fishType').addEventListener('change', () => { if($('fishType').value!=='all') $('catchFish').value=$('fishType').value; saveUiState(); renderFishingInsights(); updateWaterModeUI(); loadZones({immediate:true}); });
$('fishGoal').addEventListener('change',()=>{saveUiState();loadZones({immediate:true});});
$('baseRadius').addEventListener('change',()=>{saveUiState();updateBaseRadiusCircle();if(basePoint&&Number($('baseRadius').value)>0)focusBaseRadius();loadZones({immediate:true});});
$('setBase').addEventListener('click',()=>{if(basePoint)clearBasePoint();else setBasePoint(map.getCenter(),{label:'Valgt base'});});
$('mapStyle').addEventListener('change',()=>{applyMapStyle();saveUiState();});
$('threeDTopView')?.addEventListener('click',()=>{if(threeDMap)threeDMap.easeTo({pitch:0,bearing:0,duration:450});});
$('bathyTopView')?.addEventListener('click',()=>bathyCamera('top'));
$('bathyPitchView')?.addEventListener('click',()=>bathyCamera('pitch'));
$('bathyRefresh')?.addEventListener('click',()=>refreshBathy3D());
$('threeDPitchView')?.addEventListener('click',()=>{if(threeDMap)threeDMap.easeTo({pitch:62,bearing:-18,duration:450});});
$('sourceSpotToggle').addEventListener('click',()=>{showSourceSpots=!showSourceSpots;$('sourceSpotToggle').setAttribute('aria-pressed',String(showSourceSpots));$('sourceSpotToggle').classList.toggle('layer-active',showSourceSpots);$('sourceSpotToggle').textContent=showSourceSpots?'Kirkøy-steder':'Vis Kirkøy-steder';renderReferenceLayers();});
$('restrictionToggle').addEventListener('click',()=>{showRestrictions=!showRestrictions;$('restrictionToggle').setAttribute('aria-pressed',String(showRestrictions));$('restrictionToggle').classList.toggle('restriction-active',showRestrictions);$('restrictionToggle').textContent=showRestrictions?'Fredningsgrenser':'Vis fredningsgrenser';renderReferenceLayers();});
$('nveDepthToggle').addEventListener('click',()=>{const enable=!map.hasLayer(nveDepthLayer);if(enable)nveDepthLayer.addTo(map);else map.removeLayer(nveDepthLayer);$('nveDepthToggle').setAttribute('aria-pressed',String(enable));$('nveDepthToggle').classList.toggle('depth-active',enable);$('nveDepthToggle').textContent=enable?'Skjul NVE-dybde':'NVE dybdekart';});
$('conditionToggle').addEventListener('click',()=>{showConditionVectors=!showConditionVectors;$('conditionToggle').setAttribute('aria-pressed',String(showConditionVectors));$('conditionToggle').classList.toggle('layer-active',showConditionVectors);$('conditionToggle').textContent=showConditionVectors?'Skjul vind/strøm':'Vind/strøm';renderConditionVectors();});
$('boatRampToggle').addEventListener('click',()=>{showBoatRamps=!showBoatRamps;$('boatRampToggle').setAttribute('aria-pressed',String(showBoatRamps));$('boatRampToggle').classList.toggle('layer-active',showBoatRamps);$('boatRampToggle').textContent=showBoatRamps?'Skjul båtramper':'Båtramper';if(showBoatRamps)loadBoatRamps();else boatRampLayer.clearLayers();});
$('closeLureViewer').addEventListener('click', () => { lureViewer.close(); if(lureViewerHistoryActive){lureViewerHistoryActive=false;history.back();} });
lureViewer.addEventListener('click', event => { if (event.target === lureViewer){ lureViewer.close(); if(lureViewerHistoryActive){lureViewerHistoryActive=false;history.back();} } });
window.addEventListener('popstate',()=>{ if(lureViewer.open){lureViewerHistoryActive=false;lureViewer.close();} });
document.addEventListener('click', event => { const image=event.target.closest?.('.zoomable-lure'); if (!image) return; event.preventDefault(); event.stopPropagation(); openLureViewer(image.currentSrc || image.src, image.alt); }, true);
document.addEventListener('click', event => { const button=event.target.closest?.('.popup-details'); if(!button) return; event.preventDefault(); const zoneId=button.dataset.zone; map.closePopup(); selectZone(zoneId,{scroll:true}); });
document.addEventListener('keydown', event => { const image=event.target.closest?.('.zoomable-lure'); if (image && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); openLureViewer(image.currentSrc || image.src, image.alt); } });
map.on('locationfound', event => { if (locationMarker) locationMarker.remove(); locationMarker=L.circleMarker(event.latlng,{radius:7,color:'#fff',weight:2,fillColor:'#38d477',fillOpacity:1}).addTo(map).bindPopup('Din posisjon').openPopup(); setBasePoint(event.latlng,{label:'Base: din posisjon',focus:false}); if(is3DMode()&&threeDMap){threeDProgrammaticMove=true;threeDMap.easeTo({center:[event.latlng.lng,event.latlng.lat],zoom:Math.max(14,threeDMap.getZoom()),pitch:62,duration:500});} sync3DReferenceAndLive(); $('setBase').textContent='✓ Base = GPS · fjern'; setState('ready','Posisjon funnet. Bruker den som base og oppdaterer soner …'); });
map.on('locationerror', () => setState('error','Kunne ikke hente posisjonen. Tillat posisjon eller flytt kartet manuelt.'));
window.addEventListener('online', () => loadZones({immediate:true}));
window.addEventListener('offline', () => {const cached=readCachedAnalysis();setState(cached?'ready':'error',cached?'Du er offline. Siste lagrede analyse er tilgjengelig.':'Du er offline. Kartskallet virker; lagret analyse vises når den finnes.');});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&liveActive) acquireLiveWakeLock();});
window.addEventListener('pagehide',()=>{if(liveWatchId!==null&&navigator.geolocation) navigator.geolocation.clearWatch(liveWatchId); releaseLiveWakeLock();});
async function loadOwnedLureNames(){try{const response=await fetch('/data/owned-lure-names.json',{cache:'force-cache'});const data=await response.json();$('ownedLures').innerHTML=(data.lures||[]).map(item=>`<option value="${escapeHtml(item.name||item.type||'')}"></option>`).join('');}catch{}}
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js?v=34.0', { updateViaCache: 'none' }).catch(() => {}));
loadOwnedLureNames();
if(savedUiState.fishType&&Object.hasOwn(fishLabels,savedUiState.fishType)) $('fishType').value=savedUiState.fishType;
if(['numbers','big'].includes(savedUiState.fishGoal)) $('fishGoal').value=savedUiState.fishGoal;
if(['0','250','500','1000','2000'].includes(String(savedUiState.baseRadius))) $('baseRadius').value=String(savedUiState.baseRadius);
if(savedUiState.mapStyle==='marine-depth') $('mapStyle').value='fishing';
else if(['standard','topo','toporaster','terrain','satellite','hybrid','fishing','chart','3d','bathy3d'].includes(savedUiState.mapStyle)) $('mapStyle').value=savedUiState.mapStyle;
if(basePoint){baseMarker=L.circleMarker([basePoint.lat,basePoint.lon],{radius:7,color:'#fff',weight:2,fillColor:'#f2c94c',fillOpacity:.95}).addTo(map).bindTooltip('Lagret referansepunkt',{direction:'top'});$('setBase').textContent='✓ Base satt · fjern';$('setBase').classList.add('base-active');$('setBase').setAttribute('aria-pressed','true');updateBaseRadiusCircle();}
initCatchLog();
$('exportGpx')?.addEventListener('click',exportCatchGpx);
$('exportJson')?.addEventListener('click',exportCatchJson);
setLiveButton();
renderLiveHud();
updateWaterModeUI();
loadReferenceLayers();
loadZones({immediate:true});
