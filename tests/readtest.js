// "What the shooter reads" test (V2.16.5, review release R4).
// B-01 stale / lost Calypso wind · B-07 strict :WU · B-08 one handler per unit after reconnects · B-14 DataView offset ·
// P-03 truing air from the session · P-06 velocity exactly at d (independent reference, tests/p06ref.py) ·
// P-13 banded truing refuses rising velocities · P-12 pressure kind · P-04 + W-05 Holds marks and estimated reticle ·
// W-03 + W-10 no silent Mil-Grid, new reticles estimated · P-10 no Infinity / NaN in dope · B-03 decimal commas.
// Calypso units are the calypsotest simulator (own :DU only, chunked FFF2, reused objects on reconnect, as Chrome).
// Usage: node readtest.js <app.html>   (needs jsdom + fake-indexeddb; see README.md)
const {JSDOM,VirtualConsole}=require('jsdom'),fs=require('fs');
const {IDBFactory,IDBKeyRange}=require('fake-indexeddb');
const FILE=process.argv[2];
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let pass=0,fail=0;
const chk=(n,ok,extra)=>{console.log((ok?'  PASS  ':'  FAIL  ')+n+(extra?'   '+extra:''));ok?pass++:fail++;};
const all=[];
const T2=':DU,1802347072,AF';
// P-06 reference: independent Python point-mass (tests/p06ref.py) — BC 0.128, 280 m/s, Everyday Default (ρ, a below)
const REF={rho:1.1515933740516333,aS:343.2367605312694,v:{'12.5':277.80336719085716,'18.3':276.7938411592137,'22.86':276.00442007899767,'27.43':275.2170168680244,'45.72':272.1004414939055}};

function unit(name,accept){
  const u={name,writes:[],unlocked:false,ls:{},addEventListener(t,f){(this.ls[t]=this.ls[t]||[]).push(f)},fire(t){(this.ls[t]||[]).forEach(f=>f())}};
  const notifier=()=>({ls:[],addEventListener(t,f){this.ls.push(f)},async startNotifications(){},emit(bytes){const v=new DataView(new Uint8Array(bytes).buffer);this.ls.forEach(f=>f({target:{value:v}}))},
    emitView(v){this.ls.forEach(f=>f({target:{value:v}}))}});
  const fff2=Object.assign(notifier(),{uuid:'0000fff2-0000-1000-8000-00805f9b34fb',properties:{notify:true}});
  const em=s=>setTimeout(()=>fff2.emit(Array.from(Buffer.from(s))),15);
  const fff1={uuid:'0000fff1-0000-1000-8000-00805f9b34fb',properties:{write:true,writeWithoutResponse:true},
    async writeValueWithoutResponse(b){const s=Buffer.from(b).toString().replace(/\r/g,'');u.writes.push(s);
      if(s.startsWith(':DU')){if(accept&&s===accept){u.unlocked=true;em(':AK\r');}else em(':NA\r');}
      else if(s.startsWith(':CC'))em(u.unlocked?':CC,6,0,----,B6\r':':NA\r');else em(':AK\r');}};
  const server={async getPrimaryServices(){return[]},async getPrimaryService(id){if(id===0x180F)throw new Error('no battery');return{getCharacteristics:async()=>[fff1,fff2]};}};
  u.gatt={connected:false,async connect(){this.connected=true;return server},disconnect(){this.connected=false;u.fire('gattserverdisconnected')}};
  u.fff2=fff2;
  // a sentence the way the unit sends it: ASCII, CR-terminated, in notifications of up to 20 bytes
  u.send=s=>{const b=Array.from(Buffer.from(s+'\r'));for(let i=0;i<b.length;i+=20)fff2.emit(b.slice(i,i+20));};
  return u;
}
async function open({dev,idb,quiet}={}){
  const dom=new JSDOM(fs.readFileSync(FILE,'utf8'),{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',...(quiet?{virtualConsole:new VirtualConsole()}:{}),
    beforeParse(w){if(idb){w.indexedDB=idb;w.IDBKeyRange=IDBKeyRange;}
      Object.defineProperty(w,'innerWidth',{configurable:true,value:412});Object.defineProperty(w,'innerHeight',{configurable:true,value:915});
      if(dev)Object.defineProperty(w.navigator,'bluetooth',{value:{requestDevice:async()=>dev}});
      w.alerts=[];w.alert=m=>w.alerts.push(String(m));w.confirm=()=>true;w.scrollTo=()=>{};w.print=()=>{};
      w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:(t,k)=>k==='measureText'?()=>({width:10}):()=>{}});}});
  const w=dom.window;w.errs=[];w.addEventListener('error',e=>w.errs.push(e.message));await wait(700);all.push(w);return w;
}
const J=(w,e)=>JSON.parse(w.eval('JSON.stringify('+e+')'));
const $=(w,id)=>w.document.getElementById(id);
const SESSION="Bus.setRifle(DB.rifles.find(r=>/\\.25/.test(r.name)).id);Bus.setProj(DB.projectiles.find(p=>/^Altaros ATP Queen \\.25$/.test(p.name)).id);Bus.setWx('cur',DB.weathers[0].id);Bus.setWx('zero',DB.weathers[0].id);";
const toast=w=>($(w,'sen-toast')||{}).textContent||'';

(async()=>{
console.log('=== WHAT THE SHOOTER READS TEST: '+FILE+' ===');

// 1. B-01: stale and lost wind (simulated unit #2, live wind on Home).
{const u=unit('WDOT-E2896A',T2),w=await open({dev:u});
 w.eval(SESSION+'Bus.notify();');await w.eval('toggleBLE()');await wait(250);
 w.eval('if(!homeLive)toggleHomeLive()');u.send(':WU,2,5.0,5.0,90.0,5F');await wait(1100);   // one ticker pass
  chk('B-01 streaming: session wind from the Calypso, pill live',J(w,'S.wind.source')==='calypso'&&Math.abs(J(w,'S.wind.speed')-5)<0.01&&$(w,'dev-wx').classList.contains('live'));
 const wind0=J(w,'[S.wind.speed,S.wind.dir]');
 w.eval('calPrimary().lastWu=Date.now()-5000');await wait(1150);   // the unit stays connected but goes silent
 chk('B-01 silent 5 s: Home and the Weather pill say "wind N s old", wind value unchanged, no packet needed',/⚠ wind [5-7] s old/.test($(w,'home-status').textContent)&&$(w,'dev-wx').classList.contains('old')&&/wind [5-7] s old/.test($(w,'dev-wx-v').textContent)&&J(w,'S.wind.source')==='calypso'&&JSON.stringify(J(w,'[S.wind.speed,S.wind.dir]'))===JSON.stringify(wind0),$(w,'dev-wx-v').textContent);
 chk('B-01 silent: Sensors row "signal lost", live bar "not live"',/signal lost/.test($(w,'cal-units').textContent)&&/not live/.test($(w,'home-live-state').textContent),$(w,'home-live-state').textContent);
 w.eval('useBLEWind()');chk('B-01 "Use wind" never takes a stale average',JSON.stringify(J(w,'[S.wind.speed,S.wind.dir]'))===JSON.stringify(wind0));
 w.eval('calPrimary().lastWu=Date.now()-31000');await wait(1150);
 chk('B-01 silent 31 s: session wind becomes manual with the same value, with a note',J(w,'S.wind.source')==='manual'&&JSON.stringify(J(w,'[S.wind.speed,S.wind.dir]'))===JSON.stringify(wind0)&&/silent for 3[12] s — wind kept as manual/.test(toast(w)),toast(w));
 u.send(':WU,2,6.0,6.0,90.0,5F');await wait(80);
 chk('B-01 the unit streams again → live again (Home takes the window average: 5 and 6 → 5.5)',J(w,'S.wind.source')==='calypso'&&Math.abs(J(w,'S.wind.speed')-5.5)<0.01&&!/wind \d+ s old/.test($(w,'home-status').textContent));
 u.gatt.disconnect();await wait(60);
 chk('B-01 disconnect → manual at once, with a note',J(w,'S.wind.source')==='manual'&&/disconnected — wind kept as manual/.test(toast(w)),toast(w));
 chk('B-01 the 1 s ticker stops when no Calypso is connected',J(w,'windTick')===null);}

// 2. B-07 / B-08 / B-14 on the simulated unit.
{const u=unit('WDOT-E2896A',T2),w=await open({dev:u});
 for(let i=0;i<4;i++){if(i)u.gatt.disconnect();await w.eval('toggleBLE()');await wait(250);}
 w.eval('window._n=0;const _p=calypsoParse;calypsoParse=function(...a){window._n++;return _p(...a);}');
 u.send(':WU,2,4.0,4.0,90.0,5F');await wait(60);
 chk('B-08 same unit connected 4 times → one handler per sentence, one disconnect listener',J(w,'window._n')===1&&u.ls.gattserverdisconnected.length===1,'parse calls '+J(w,'window._n')+' · listeners '+u.ls.gattserverdisconnected.length);
 chk('B-07 a sentence split across 20-byte notifications still parses',J(w,'calPrimary().spd')===4&&J(w,'calPrimary().dir')===90);
 const last=J(w,'calPrimary().lastWu'),buf=J(w,'calPrimary().buf.length');await wait(20);
 for(const bad of [':WU,2,5.0,5.0,90.0,12:WU,2,1.0,1.0,45.0,5F',':WU,2,-3.0,1.0,90.0,5F',':WU,2,3.0,3.0,400,5F',':WU,2,nan,inf,abc,5F',':WU,2,3.0,3.0'])u.send(bad);await wait(60);
 chk('B-07 run-together, negative, 400°, junk and short sentences ignored — lastWu and the average untouched',J(w,'calPrimary().lastWu')===last&&J(w,'calPrimary().buf.length')===buf&&J(w,'calPrimary().spd')===4);
 const b=Buffer.from('xyz:WU,2,7.5,7.0,180.0,5F\rqq');u.fff2.emitView(new DataView(b.buffer.slice(b.byteOffset,b.byteOffset+b.length),3,b.length-5));await wait(40);
 chk('B-14 a DataView with an offset is read from its own bytes',J(w,'calPrimary().spd')===7.5&&J(w,'calPrimary().dir')===180);}

// 3. P-03 / P-13 / P-06 / P-12 truing and pressure.
{const w=await open();
 w.eval("gotoPage('truing');setTruTab('vel')");await wait(20);
 chk('P-03 no session → truing air fields blank, pressure labelled station',$(w,'tu-temp').value===''&&$(w,'tu-pres').value===''&&/Pressure hPa \(station\)/.test($(w,'tu-pres').parentElement.textContent));
 w.eval("document.getElementById('tu-mv').value=280;tuPoints=[{d:23,v:276}];tuSolve()");
 chk('P-03 blank air → refused (not read as 0 hPa)',/station pressure/.test(w.alerts.pop()||'')&&$(w,'tu-result').style.display==='none');
 w.eval(SESSION+"Bus.notify();gotoPage('home');gotoPage('truing')");await wait(20);
 chk('P-03 session on Everyday Default → 20 °C · 974.8 hPa station · 65 %',$(w,'tu-temp').value==='20.0'&&$(w,'tu-pres').value==='974.8'&&$(w,'tu-rh').value==='65',[$(w,'tu-temp').value,$(w,'tu-pres').value,$(w,'tu-rh').value].join(' / '));
 w.eval("document.getElementById('tu-pres').value='990';gotoPage('home');gotoPage('truing')");
 chk('P-03 a typed pressure is kept on the next visit',$(w,'tu-pres').value==='990');
 w.eval("document.getElementById('tu-pres').value='974.8';document.getElementById('tu-mv').value=280;document.getElementById('tu-drag').value='g7';tuPoints=[{d:23,v:274.6},{d:50,v:275.0}];tuSolve()");
 chk('P-13 a velocity that rises from one point to the next is refused, no result',/not lower than at/.test(w.alerts.pop()||'')&&$(w,'tu-result').style.display==='none');
 const bcs=Object.entries(REF.v).map(([d,v])=>J(w,`trueBCsingle(280,60,${d},${v},${REF.rho},${REF.aS},'g7').bc`));
 chk('P-06 BC 0.128 from independent velocities at 12.5 / 18.3 / 22.86 / 27.43 / 45.72 m → 0.128 ± 2e-4',bcs.every(b=>Math.abs(b-0.128)<2e-4),bcs.map(b=>b.toFixed(5)).join(' / '));
 chk('P-06 the model velocity at 22.86 m lands on the reference (within 0.01 m/s)',Math.abs(J(w,`velAtDist(280,0.128,60,22.86,${REF.rho},${REF.aS},'g7')`)-REF.v['22.86'])<0.01);
 chk('P-12 labels: current and Stability pressure say station',/Cur pres hPa \(station\)/.test($(w,'tr-cp').parentElement.textContent)&&/Pressure hPa \(station\)/.test($(w,'st-pres').parentElement.textContent));
 chk('P-12 sea-level pressure without an altitude gives no pressure; altitude 0 stays valid',J(w,"wxPres({pres:1010,presType:'sea'})===undefined&&wxPres({pres:1010,presType:'sea',alt:null})===undefined&&wxPres({pres:1013,presType:'sea',alt:0})===1013"));
 w.alerts.length=0;w.eval("importData({schema:{weathers:1},weathers:[{id:'q1',name:'QNH no alt',temp:10,pres:1010,presType:'sea',rh:50},{id:'q2',name:'QNH at 0 m',temp:10,pres:1010,presType:'sea',rh:50,alt:0}]})");await wait(30);
 chk('P-12 import: sea-level without altitude refused with the reason; altitude 0 imported',!J(w,"DB.weathers.some(x=>x.name==='QNH no alt')")&&J(w,"DB.weathers.some(x=>x.name==='QNH at 0 m')")&&/QNH no alt": sea-level \(QNH\) pressure without an altitude/.test(w.alerts.join('\n')));}

// 4. P-04 + W-05 Holds; W-03 + W-10 reticles.
{const w=await open();
 w.eval(SESSION+"S.mv=255;S.src.mv='manual';Bus.notify();gotoPage('holds');document.getElementById('hd-from').value=25;document.getElementById('hd-to').value=100;document.getElementById('hd-step').value=25;renderHolds()");
 const rows=[...w.document.querySelectorAll('#hd-tbody tr')].map(r=>[...r.children].map(c=>c.textContent));
 const r100=rows.find(r=>/^100/.test(r[0])),r25=rows.find(r=>/^25/.test(r[0]));
 chk('P-04 Queen, 50 m zero, VCT-34: 100 m (↑3.59) → "4 mrad line −0.41"; 25 m → "above center"',r100&&/3\.59/.test(r100[1])&&r100[3]==='4 mrad line −0.41'&&r25&&r25[3]==='above center',JSON.stringify([r100&&r100[3],r25&&r25[3]]));
 chk('W-05 verified reticle (VCT-34) → no estimated warning',!/estimated/.test($(w,'hd-flags').textContent));
 w.eval('printHolds()');const ph=$(w,'print-content');const pr=[...ph.querySelectorAll('tbody tr')].map(r=>[...r.children].map(c=>c.textContent));
 chk('P-04 printed sheet: 100 m → 4, 25 m → above',pr.find(r=>/^100/.test(r[0]))[2]==='4'&&pr.find(r=>/^25/.test(r[0]))[2]==='above');
 w.eval("getRifle().scopeId=DB.scopes.find(s=>s.sku==='SCFF-70').id;renderHolds();printHolds()");
 chk('W-05 estimated reticle (VEC-MBR2) → warning on Holds and "(estimated)" on the printed sheet',/subtensions are estimated/.test($(w,'hd-flags').textContent)&&/Reticle \(estimated\)/.test($(w,'print-content').textContent));
 const sc=J(w,"DB.scopes.find(s=>s.sku==='SCFF-31').id");
 w.eval(`openScopeForm('${sc}')`);
 chk('W-03 scope form: "No reticle (dial only)" first and selected for SCFF-31',$(w,'sc-reticle').options[0].textContent==='No reticle (dial only)'&&$(w,'sc-reticle').value==='');
 w.eval(`saveScope('${sc}')`);chk('W-03 SCFF-31 saved untouched keeps no reticle',J(w,`DB.scopes.find(s=>s.id==='${sc}').reticleId`)===null);
 w.eval(`getRifle().scopeId='${sc}';gotoPage('home');renderQuick()`);
 chk('W-03 Home caption: no verified reticle',/no verified reticle/.test($(w,'home-reticle-cap').textContent),$(w,'home-reticle-cap').textContent);
 w.eval(`openScopeForm('${sc}');document.getElementById('sc-reticle').value='milgrid';saveScope('${sc}')`);
 chk('W-03 picking Mil-Grid on purpose still works',J(w,`DB.scopes.find(s=>s.id==='${sc}').reticleId`)==='milgrid');
 w.eval('openScopeForm()');chk('W-03 a new scope defaults to no reticle',$(w,'sc-reticle').value==='');
 w.eval('closeModal();openReticleForm()');chk('W-10 a new reticle defaults to estimated',$(w,'rt-ver').value==='0');w.eval('closeModal()');}

// 5. W-03 migration: once per store, only silent Mil-Grids on catalog scopes without a verified reticle.
{const idb=new IDBFactory(),a=await open({idb,quiet:true});
 a.eval(`APP.retMig1=false;const s=n=>DB.scopes.find(x=>x.sku===n);s('SCFF-47').reticleId='milgrid';s('SCFF-48').reticleId='milgrid';s('SCFF-48').notes='I use the grid';saveDB()`);await wait(150);a.close();
 const b=await open({idb});
 chk('W-03 migration: a silent Mil-Grid on SCFF-47 → no reticle with a note; SCFF-48 (notes mention a grid) untouched; SCFF-30 keeps VCT-34',
   J(b,"(s=>s('SCFF-47').reticleId===null&&/reticle reset to none/.test(s('SCFF-47').notes)&&s('SCFF-48').reticleId==='milgrid'&&s('SCFF-30').reticleId==='vct34ffp')(n=>DB.scopes.find(x=>x.sku===n))"));
 b.eval("DB.scopes.find(x=>x.sku==='SCFF-47').reticleId='milgrid';saveDB()");await wait(150);b.close();
 const c=await open({idb});chk('W-03 migration runs once: Mil-Grid chosen afterwards stays',J(c,"DB.scopes.find(x=>x.sku==='SCFF-47').reticleId")==='milgrid');}

// 6. P-10: no Infinity / NaN reaches a dope cell.
{const w=await open();
 w.eval(SESSION+"Bus.notify();gotoPage('home');S.dist_m=0;renderQuick()");
 const cells=['home-elev','home-elev-u','home-wind','home-wind-u'].map(id=>$(w,id).textContent).join(' ');
 chk('P-10 Home with distance 0 → no Infinity / NaN',!/Infinity|NaN/.test(cells),cells);
 chk('P-10 solveShot with a NaN angle, Infinity wind or distance 0 → null',J(w,"(()=>{const tr=homeTraj(),z=zeroConds();const f=(d,a,ws)=>solveShot(tr.pts,nearestPt,z.range,d,a,ws,90,S.mv,0.1,z.wSpd,z.wDir);return f(100,NaN,0)===null&&f(100,0,Infinity)===null&&f(0,0,0)===null&&f(100,0,0)!==null})()"));
 w.eval("gotoPage('stab');document.getElementById('st-pres').value='';calcStab()");
 chk('P-10 Stability with the pressure emptied → result cleared, no Infinity',!/Infinity|NaN/.test($(w,'st-outs').textContent)&&/station pressure/.test($(w,'st-outs').textContent),$(w,'st-outs').textContent);}

// 7. B-03: decimal commas in typed shot strings.
{const w=await open();
 const parse=t=>J(w,'chParseTyped('+JSON.stringify(t)+')');
 const a=parse('280,5 281,2 279,8'),b=parse('280,281,279'),c=parse('280,5,281'),d=parse('280.5, 281.2; 279.8');
 chk('B-03 "280,5 281,2 279,8" → 3 shots, mean 280.50',a.shots&&a.shots.length===3&&Math.abs(a.shots.reduce((x,y)=>x+y,0)/3-280.5)<1e-9);
 chk('B-03 "280,281,279" → 3 shots',b.shots&&b.shots.join()==='280,281,279');
 chk('B-03 "280,5,281" (ambiguous) → refused by the 30 % median check',!!c.err&&/more than 30 %/.test(c.err),c.err);
 chk('B-03 "280.5, 281.2; 279.8" → 3 shots',d.shots&&d.shots.join()==='280.5,281.2,279.8');}

const errs=all.flatMap(x=>x.errs);chk('ZERO uncaught errors',errs.length===0,errs.slice(0,3).join(' / '));
all.forEach(x=>x.close());
console.log(`\nRESULT: PASS ${pass} / FAIL ${fail}`);
process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
