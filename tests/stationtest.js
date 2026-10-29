// Wind stations test (V2.2.0, CORE-17 step 2): placing Calypsos as stations and Home using them.
// Two simulated units (own :DU tokens, GATT overlap rejected, as in multicaltest.js) stream at once.
// Checks: guidance with no range; + Add station picks free connected units; the station name replaces the
// BLE name on the Calypso card; readings → crosswind/headwind relative to the line of fire (mark at the
// target, on and off the line; mark at north with the target bearing); Home's solution equals solveShot
// with windField() built independently in the test (blend and nearest); "Session unit only", live wind off,
// one live station and a lost station all fall back to the single session wind exactly; distance typed in
// yards stores metres; rows are not rebuilt while typing; export → import round trip with sanitising;
// restart; text only (no HTML sinks).
// Usage: node stationtest.js <app.html>   (needs jsdom; see README.md)
const {JSDOM}=require('jsdom'),fs=require('fs');
const FILE=process.argv[2];
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let pass=0,fail=0;
const chk=(n,ok,extra)=>{console.log((ok?'  PASS  ':'  FAIL  ')+n+(extra?'   '+extra:''));ok?pass++:fail++;};
const T1=':DU,1668647648,A7',T2=':DU,1802347072,AF';
function unit(name,accept,batt,id){
  const u={name,id,writes:[],unlocked:false,busy:false,collisions:0,ls:{},addEventListener(t,f){(this.ls[t]=this.ls[t]||[]).push(f)},fire(t){(this.ls[t]||[]).forEach(f=>f())}};
  const notifier=()=>({ls:[],addEventListener(t,f){this.ls.push(f)},async startNotifications(){},emit(bytes){const v=new DataView(new Uint8Array(bytes).buffer);this.ls.forEach(f=>f({target:{value:v}}))}});
  const fff2=Object.assign(notifier(),{uuid:'0000fff2-0000-1000-8000-00805f9b34fb',properties:{notify:true}});
  const em=s=>setTimeout(()=>fff2.emit(Array.from(Buffer.from(s))),15);
  const gatt=async fn=>{if(u.busy){u.collisions++;throw new Error('GATT operation already in progress.');}u.busy=true;try{await wait(5);return await fn();}finally{u.busy=false;}};
  const fff1={uuid:'0000fff1-0000-1000-8000-00805f9b34fb',properties:{write:true,writeWithoutResponse:true},
    writeValueWithoutResponse(b){return gatt(async()=>{const s=Buffer.from(b).toString().replace(/\r/g,'');u.writes.push(s);
      if(s.startsWith(':DU')){if(accept&&s===accept){u.unlocked=true;em(':AK\r');}else em(':NA\r');}
      else if(s.startsWith(':CC'))em(u.unlocked?':CC,6,0,----,B6\r':':NA\r');else em(':AK\r');});}};
  const b2a19=Object.assign(notifier(),{properties:{read:true,notify:true},readValue(){return gatt(async()=>new DataView(new Uint8Array([batt]).buffer));}});
  const server={async getPrimaryServices(){return[]},
    async getPrimaryService(sid){if(sid===0x180F)return{getCharacteristic:async()=>b2a19};return{getCharacteristics:async()=>[fff1,fff2]};}};
  u.gatt={connected:false,async connect(){this.connected=true;return server},disconnect(){this.connected=false;u.fire('gattserverdisconnected')}};
  u.fff2=fff2;return u;
}
const queue=[];
let prompts=[];
const dom=new JSDOM(fs.readFileSync(FILE,'utf8'),{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',
  beforeParse(w){w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:(t,k)=>k==='measureText'?()=>({width:10}):()=>{}});
    Object.defineProperty(w.navigator,'bluetooth',{value:{requestDevice:async()=>queue.shift()}});w.alert=()=>{};w.confirm=()=>true;w.prompt=(q,d)=>prompts.length?prompts.shift():d;}});
const w=dom.window;w.errs=[];w.addEventListener('error',e=>w.errs.push(e.message));
const J=e=>JSON.parse(w.eval('JSON.stringify('+e+')'));
const $=id=>w.document.getElementById(id);
const wu=(s,d)=>`:WU,2,${s},9.9,${d},5F\r`;
const emit=(u,line)=>u.fff2.emit(Array.from(Buffer.from(line)));
async function both(a,b,n=3){for(let i=0;i<n;i++){emit(A,wu(a[0],a[1]));emit(B,wu(b[0],b[1]));await wait(40);}}
const lives=()=>[...w.document.querySelectorAll('#stn-list .stn-live')].map(e=>e.textContent);
const setNum=(el,v)=>{el.value=v;el.dispatchEvent(new w.Event('input'));el.dispatchEvent(new w.Event('change'));};
let A,B;
// Home's last solution (solveShot wrapped) vs the same call with a field built here.
const lastHome=()=>J('__last');
const expect=(st,mode)=>J(`(()=>{const tr=homeTraj(courseMaxRange()),z=zeroConds();const s=solveShot(tr.pts,nearestPt,z.range,S.dist_m,0,S.wind.speed,S.wind.dir,S.mv,(rifleScope(getRifle())||{}).clickStepMrad||0.1,z.wSpd,z.wDir,${st?`windField(${JSON.stringify(st)},'${mode}')`:'null'},0);return{e:s.mrElev,w:s.mrWind}})()`);
const same=(a,b)=>a&&b&&a.e===b.e&&a.w===b.w;

(async()=>{
console.log('=== WIND STATIONS TEST: '+FILE+' ===');
await wait(700);
w.eval(`Bus.setRifle(DB.rifles.find(x=>/\\.25/.test(x.name)).id);Bus.setProj(DB.projectiles.find(p=>/^Altaros ATP Queen/.test(p.name)).id);Bus.setWx('cur',DB.weathers[0].id);Bus.set('dist_m',150);
  {const o=solveShot;window.solveShot=function(...a){const s=o(...a);if(new Error().stack.includes('renderQuick'))window.__last=s?{e:s.mrElev,w:s.mrWind,f:!!a[11]}:null;return s;};}`);

chk('no range: guidance, empty list',/Create a range/.test($('stn-summary').textContent)&&lives().length===0&&$('stn-range').options[0].textContent==='— no range yet —');
A=unit('WDOT-B1F9A6',T1,64,'idA');B=unit('WDOT-E2896A',T2,87,'idB');
queue.push(A);await w.eval('calAdd()');await wait(200);queue.push(B);await w.eval('calAdd()');await wait(200);
w.document.querySelector('#stn-panel .btnrow:last-of-type button')||0;
w.eval('stnAdd()');w.eval('stnAdd()');await wait(30);
chk('+ Add station: a range is created and each new station takes a free connected unit',J('DB.ranges.length')===1&&J('stnRange().stations.map(t=>t.unit)').join()==='WDOT-B1F9A6,WDOT-E2896A'&&lives().length===2);
chk('blend is the default; "All placed stations" is on',$('stn-m-blend').classList.contains('on')&&$('stn-use-on').classList.contains('on'));
const dists=()=>[...w.document.querySelectorAll('#stn-list input[type=number]')].filter(e=>e.dataset.q==='range');
chk('no distance yet → flagged, Home stays on the session unit',lives().every(t=>/no distance/.test(t)));
setNum(dists()[0],'10');setNum(dists()[1],'120');
const nm=w.document.querySelector('#stn-list input[type=text]');nm.value='Firing line';nm.dispatchEvent(new w.Event('change'));await wait(20);
chk('station name replaces the BLE name on the Calypso card (BLE name kept after it)',/Firing line \(WDOT-B1F9A6\)/.test($('cal-units').textContent),$('cal-units').textContent.slice(0,80));
await both([4,90],[2,270]);
chk('readings → wind to the line: A cross 4 from the right, B 2 from the left, at 10 m and 120 m',/cross 4\.0 m\/s from the right · no head\/tail · at 10 m/.test(lives()[0])&&/cross 2\.0 m\/s from the left/.test(lives()[1])&&/at 120 m/.test(lives()[1]),lives().join(' | '));
chk('live wind off → Home uses the session unit (summary says so)',/Turn live wind on/.test($('stn-summary').textContent)&&J('stnField(150)')===null);
w.eval('toggleHomeLive()');await both([4,90],[2,270]);
const ST=[{x:10,cross:4,head:0},{x:120,cross:-2,head:0}];
let h=lastHome(),x=expect([{x:10,cross:4,head:-0},{x:120,cross:-2,head:0}],'blend');
const stn=J('stnState(150).live.map(q=>[q.x,q.cross,q.head])');
chk('stations computed: x 10/120 m, cross +4/−2, head ≈ 0',Math.abs(stn[0][0]-10)<1e-12&&Math.abs(stn[1][0]-120)<1e-9&&Math.abs(stn[0][1]-4)<1e-12&&Math.abs(stn[1][1]+2)<1e-12&&Math.abs(stn[0][2])<1e-12,JSON.stringify(stn));
const xf=J(`(()=>{const f=stnField(150);return f&&{n:f.n,m:f.mode,c10:f(10),c65:f(65),c120:f(120)}})()`);
chk('Home gets the field: 2 stations, blend (+4 → +1 at 65 m → −2)',xf&&xf.n===2&&xf.m==='blend'&&Math.abs(xf.c10-4)<1e-12&&Math.abs(xf.c65-1)<1e-9&&Math.abs(xf.c120+2)<1e-12,JSON.stringify(xf));
chk('Home solution = solveShot with windField built independently (blend)',h&&h.f&&Math.abs(h.e-x.e)<1e-12&&Math.abs(h.w-x.w)<1e-12,JSON.stringify([h,x]));
chk('Home conditions say "2 stations · blend" / "along the flight"',$('home-winddir').textContent==='2 stations · blend'&&$('home-cross').textContent==='along the flight');
const single=expect(null);
chk('…and differs from the single session wind (A only)',Math.abs(h.w-single.w)>0.05,JSON.stringify([h.w,single.w]));
w.document.getElementById('stn-m-near').click();await both([4,90],[2,270]);
h=lastHome();x=expect(ST,'nearest');
chk('Nearest: Home = nearest field',$('stn-m-near').classList.contains('on')&&Math.abs(h.e-x.e)<1e-12&&Math.abs(h.w-x.w)<1e-12&&$('home-winddir').textContent==='2 stations · nearest');
w.document.getElementById('stn-use-off').click();await both([4,90],[2,270]);
h=lastHome();
chk('"Session unit only" → exactly the single-wind solution (no field)',h&&!h.f&&same(h,expect(null))&&/session unit only/.test($('stn-summary').textContent));
w.document.getElementById('stn-use-on').click();w.document.getElementById('stn-m-blend').click();
// Head/tail: B turns to a 3 m/s tailwind (from 180° on its mark), off the line at 30° right, mark at the target.
const angs=()=>[...w.document.querySelectorAll('#stn-list input[type=number]')].filter(e=>e.dataset.q==='-');
setNum(angs()[1],'30');w.eval('CALS.forEach(d=>d.buf.length=0)');await both([4,90],[3,180]);
const q=J('stnState(150).live[1]');
const m=Math.atan2(-120*Math.sin(Math.PI/6),150-120*Math.cos(Math.PI/6))*180/Math.PI,th=(180+m+360)%360;
chk('off the line (120 m at 30° right, mark at the 150 m target): position and angle reproduced',Math.abs(q.x-120*Math.cos(Math.PI/6))<1e-9&&Math.abs(q.rel-th)<1e-9&&Math.abs(q.cross-3*Math.sin(th*Math.PI/180))<1e-9&&Math.abs(q.head+3*Math.cos(th*Math.PI/180))<1e-9,JSON.stringify(q));
h=lastHome();x=expect([{x:10,cross:4,head:-4*Math.cos(Math.PI/2)},{x:q.x,cross:q.cross,head:q.head}],'blend');
chk('Home with a tailwind station = independent field incl. head/tail (drop changes too)',Math.abs(h.e-x.e)<1e-12&&Math.abs(h.w-x.w)<1e-12&&Math.abs(h.e-single.e)>1e-4,JSON.stringify([h,x]));
w.eval('toggleHomeLive()');await both([4,90],[3,180]);
chk('V2.4.0 fix: live wind turned off → no station field, Home = single wind',J('stnField(150)')===null&&!lastHome().f&&/Turn live wind on/.test($('stn-summary').textContent));
w.eval('toggleHomeLive()');
// North mount.
setNum(angs()[1],'0');
w.eval(`stnSet(stnRange().stations[1].id,'mount','north');setTargetBearing(null);CALS.forEach(d=>d.buf.length=0)`);await both([4,90],[2,0]);
chk('mark at north without a target bearing → flagged, dropped out',/needs the target bearing/.test(lives()[1])&&J('stnField(150)')===null);
w.eval(`setTargetBearing(270,'manual');CALS.forEach(d=>d.buf.length=0)`);await both([4,90],[2,0]);
const qn=J('stnState(150).live[1]');
chk('mark at north, line 270°: wind from north = 2 m/s from the right',qn&&Math.abs(qn.rel-90)<1e-12&&Math.abs(qn.cross-2)<1e-12&&Math.abs(qn.head)<1e-12,JSON.stringify(qn));
// Stale station → fallback.
for(let i=0;i<9;i++){emit(A,wu(4,90));await wait(400);}
h=lastHome();
chk('B silent > 3 s → "signal lost", one live station → Home = single session wind exactly',/signal lost/.test(lives()[1])&&!h.f&&same(h,expect(null))&&/Needs two live stations/.test($('stn-summary').textContent),lives()[1]);
// Typing is not disturbed by live readings.
const d0=dists()[0];d0.focus();await both([4,90],[2,0]);
chk('rows are not rebuilt while a field has focus',dists()[0]===d0);d0.blur();
// Imperial.
w.eval(`UNITS.range='yd';refreshUnits()`);
chk('distance shown in yards (120 m → 131.2 yd), label follows',dists()[1].value&&Math.abs(+w.eval('NATIVE_VALUE.get.call(document.querySelectorAll("#stn-list input[data-q=range]")[1])')-131.2)<0.05&&/yd/.test(dists()[1].closest('.fld').querySelector('label').textContent));
{const e=dists()[1];w.eval('NATIVE_VALUE').set.call(e,'100');e.dispatchEvent(new w.Event('input'));e.dispatchEvent(new w.Event('change'));}
chk('typing 100 yd stores 91.44 m',Math.abs(J('stnRange().stations[1].dist')-91.44)<1e-9,J('stnRange().stations[1].dist'));
w.eval(`UNITS.range='m';refreshUnits()`);
// Text only.
w.eval(`stnSet(stnRange().stations[0].id,'nick','<img src=x onerror="window.__x=1">')`);await wait(20);
chk('names render as text (no HTML sinks)',!w.document.querySelector('#cal-units img,#stn-list img')&&/<img src=x/.test($('cal-units').textContent)&&!J('window.__x||0'));
// Range management.
prompts=['Ljubljana 300'];w.eval('stnRenameRange()');prompts=['Club range'];w.eval('stnNewRange()');
chk('new range starts empty and becomes active; rename works',J('DB.ranges.map(r=>r.name)').join()==='Ljubljana 300,Club range'&&J('stnRange().stations.length')===0&&$('stn-range').value===J('APP.rangeId'));
w.eval(`stnPickRange(DB.ranges[0].id)`);
chk('switching back restores its stations',J('stnRange().stations.length')===2&&lives().length===2);
// Restart (snapshot round trip).
const snap=w.eval('snapshotJSON()');
w.eval(`applySnapshot(JSON.parse(${JSON.stringify(snap)}));stnRender();`);
chk('restart: ranges, stations and the active range survive',J('DB.ranges.length')===2&&J('stnRange().name')==='Ljubljana 300'&&J('stnRange().stations[1].mount')==='north');
// Export → import into a fresh install, with a tampered station.
const exp=JSON.parse(snap);exp.ranges[0].stations.push({id:'z',nick:'x',unit:'WDOT-1',dist:-5,ang:999,mount:'east',evil:'<b>'});exp.ranges[0].mode='weird';
const w2=new JSDOM(fs.readFileSync(FILE,'utf8'),{runScripts:'dangerously',pretendToBeVisual:true,url:'https://y.test/',beforeParse(v){v.alert=()=>{};v.confirm=()=>true;v.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:(t,k)=>k==='measureText'?()=>({width:10}):()=>{}});}}).window;
await wait(700);
w2.eval(`importData(${JSON.stringify({ranges:exp.ranges,schema:exp.schema})})`);
const imp=JSON.parse(w2.eval('JSON.stringify(DB.ranges)'));
const bad=imp[0]&&imp[0].stations.find(t=>t.id==='z');
chk('import: ranges arrive with their stations',imp.length===2&&imp[0].stations.length===3&&imp[0].stations[1].dist===91.44);
chk('import sanitises: bad distance → none, angle → 0, mount → target, mode → blend, unknown keys dropped',bad&&bad.dist===null&&bad.ang===0&&bad.mount==='target'&&imp[0].mode==='blend'&&!('evil' in bad),JSON.stringify(bad));
chk('exportAll carries the ranges',/"ranges"/.test(w.eval('JSON.stringify({...DB})')));
chk('no uncaught errors',w.errs.length===0&&w2.errs?.length!==1,w.errs.join(' | '));
console.log('\nPASS '+pass+'   FAIL '+fail);
process.exit(fail?1:0);
})();
