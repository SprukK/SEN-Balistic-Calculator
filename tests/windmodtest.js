// Wind module test (V2.3.0, CORE-17 step 3): the wind as its own Home layout module.
// Registered and off in every template (stored layouts get it appended, off); turned on it shows the
// top-down lane and one row per station. Single wind: one row, drift = solveShot's. Two placed stations
// (simulated Calypsos): rows per station with crosswind L/R, head/tail, and drift shares that add up
// exactly to the field's drift, which equals solveShot with a windField built here; windage row = Home's
// clicks; lane draws the shooter, target, stations, arrows and names; units follow Settings; text only.
// Usage: node windmodtest.js <app.html>   (needs jsdom; see README.md)
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
const dom=new JSDOM(fs.readFileSync(FILE,'utf8'),{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',
  beforeParse(w){w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:(t,k)=>k==='measureText'?()=>({width:10}):()=>{}});
    Object.defineProperty(w.navigator,'bluetooth',{value:{requestDevice:async()=>queue.shift()}});w.alert=()=>{};w.confirm=()=>true;w.prompt=(q,d)=>d;}});
const w=dom.window;w.errs=[];w.addEventListener('error',e=>w.errs.push(e.message));
const J=e=>JSON.parse(w.eval('JSON.stringify('+e+')'));
const $=id=>w.document.getElementById(id);
const wu=(s,d)=>`:WU,2,${s},9.9,${d},5F\r`;
const emit=(u,line)=>u.fff2.emit(Array.from(Buffer.from(line)));
const rows=()=>[...w.document.querySelectorAll('#wm-body tr')].map(r=>[...r.children].map(c=>c.textContent));
const num=t=>parseFloat(String(t).replace(/[^0-9.\-]/g,''));
const SOLVE=f=>`(()=>{const tr=homeTraj(courseMaxRange()),z=zeroConds(),sc=rifleScope(getRifle());return solveShot(tr.pts,nearestPt,z.range,S.dist_m,0,S.wind.speed,S.wind.dir,S.mv,sc?.clickStepMrad||0.1,z.wSpd,z.wDir,${f})})()`;

(async()=>{
console.log('=== WIND MODULE TEST: '+FILE+' ===');
await wait(700);
chk('module registered: "Wind along the lane (stations)"',J("HOME_MODS.wind&&HOME_MODS.wind.el")==='home-windmod');
chk('off in every template and every seeded layout (Homes unchanged)',J("Object.values(LAYOUT_TPL).every(t=>!t.on.includes('wind'))")&&J("APP.layouts.every(l=>l.mods.some(m=>m.id==='wind'&&!m.on))")&&$('home-windmod').classList.contains('mod-off'));
w.eval(`gotoPage('layouts');layoutEditId=APP.layoutId;renderLayouts()`);await wait(20);
{const row=[...w.document.querySelectorAll('#page-layouts .lay-modname')].find(e=>e.textContent==='Wind along the lane (stations)');
chk('Layouts editor lists it with an On/Off switch',row&&row.parentElement.querySelector('button:last-child').textContent==='Off');}
w.eval(`gotoPage('home');activeLayout().mods.find(m=>m.id==='wind').on=true;saveDB();applyHomeLayout()`);
w.eval(`Bus.setRifle(DB.rifles.find(x=>/\\.25/.test(x.name)).id);Bus.setProj(DB.projectiles.find(p=>/^Altaros ATP Queen/.test(p.name)).id);Bus.setWx('cur',DB.weathers[0].id);Bus.set('dist_m',150);Bus.setWind(4,90,'manual')`);await wait(20);
chk('turned on: shown on Home',!$('home-windmod').classList.contains('mod-off'));
let r=rows(),s1=J(`(s=>({d:s.windDriftMm,c:s.clWind}))(${SOLVE('null')})`);
chk('single wind: one row (cross R 4.0, no head/tail) + windage row',r.length===2&&r[0][0]==='Whole flight'&&r[0][1]==='R 4.0'&&r[0][2]==='0'&&$('wm-src').textContent==='single wind · manual',JSON.stringify(r));
chk('single wind: drift = solveShot drift, windage = Home clicks',Math.abs(num(r[0][3])-s1.d)<0.06&&r[0][3].startsWith('→')&&r[1][3]===(s1.c>=0?'→':'←')+Math.abs(s1.c).toFixed(1)+' clk'&&$('home-wind').textContent===(s1.c>=0?'→':'←')+Math.abs(s1.c).toFixed(0),JSON.stringify([r,s1]));
chk('lane: line of fire, you, target, one session arrow, target distance label',w.document.querySelectorAll('#wm-lane line').length===2&&w.document.querySelectorAll('#wm-lane circle').length===2&&/150 m/.test($('wm-lane').textContent));
// Two stations.
const A=unit('WDOT-B1F9A6',T1,64,'idA'),B=unit('WDOT-E2896A',T2,87,'idB');
queue.push(A);await w.eval('calAdd()');await wait(200);queue.push(B);await w.eval('calAdd()');await wait(200);
w.eval(`stnAdd();stnAdd();const t=stnRange().stations;Object.assign(t[0],{nick:'Line',dist:10});Object.assign(t[1],{nick:'Far left',dist:120,ang:-20});stnChanged();toggleHomeLive()`);
for(let i=0;i<3;i++){emit(A,wu(4,90));emit(B,wu(3,240));await wait(40);}
await wait(30);
r=rows();
const st=J('stnState(150).live.map(q=>({x:q.x,cross:q.cross,head:q.head}))');
const tot=J(`${SOLVE('windField('+JSON.stringify(st)+",'blend')")}.windDriftMm`);
const shares=J(`windShares(stnField(150),stnState(150)).map(f=>${SOLVE('f')}.windDriftMm)`);
chk('stations: "2 stations · blend", one row per station + windage',$('wm-src').textContent==='2 stations · blend'&&r.length===3&&/^Line · 10 m$/.test(r[0][0])&&/^Far left · 113 m$/.test(r[1][0]),JSON.stringify(r));
chk('rows: Line R 4.0 / no head-tail; Far left crosswind L and its head/tail part with the right sign',r[0][1]==='R 4.0'&&r[0][2]==='0'&&/^L /.test(r[1][1])&&r[1][2]===(st[1].head>0?'tail ':'head ')+Math.abs(st[1].head).toFixed(1),JSON.stringify([r,st]));
chk('shares add up exactly to the field drift (linearity)',Math.abs(shares[0]+shares[1]-tot)<1e-9&&shares[0]>0&&shares[1]<0,JSON.stringify([shares,tot]));
chk('shown shares = computed shares; no % when the shares push opposite ways',Math.abs(num(r[0][3])-shares[0])<0.06&&Math.abs(num(r[1][3].split(' ')[0])-Math.abs(shares[1]))<0.06&&!/%/.test(r[0][3]+r[1][3]),JSON.stringify(r));
const c2=J(`${SOLVE("windField("+JSON.stringify(st)+",'blend')")}.clWind`);
chk('windage row = Home with the same stations',r[2][3]===(c2>=0?'→':'←')+Math.abs(c2).toFixed(1)+' clk'&&$('home-wind').textContent===(c2>=0?'→':'←')+Math.abs(c2).toFixed(0),r[2][3]+' / '+c2);
const texts=[...w.document.querySelectorAll('#wm-lane text')].map(t=>t.textContent);
chk('lane: two stations with arrows and their names',w.document.querySelectorAll('#wm-lane circle').length===3&&texts.includes('Line')&&texts.includes('Far left')&&w.document.querySelectorAll('#wm-lane path').length===3);
const ys=[...w.document.querySelectorAll('#wm-lane circle')].map(c=>+c.getAttribute('cy'));
chk('lane: a station left of the line is drawn above it (top view, firing to the right)',ys[2]<ys[0],JSON.stringify(ys));
w.document.getElementById('stn-m-near').click();await wait(20);emit(A,wu(4,90));await wait(30);
chk('nearest: header follows',$('wm-src').textContent==='2 stations · nearest');
w.eval(`UNITS.wind='mph';UNITS.drop='in';refreshUnits();renderQuick()`);
r=rows();
chk('units follow Settings (mph, inches)',r[0][1]==='R 8.9'&&/in/.test(w.document.querySelector('#home-windmod thead').textContent)&&/mph/.test(w.document.querySelector('#home-windmod thead').textContent),JSON.stringify(r[0]));
w.eval(`UNITS.wind='ms';UNITS.drop='mm';refreshUnits()`);
w.eval(`stnRange().stations[0].nick='<img src=x onerror="window.__x=1">';stnChanged()`);emit(A,wu(4,90));await wait(30);
chk('names render as text (no HTML sinks)',!w.document.querySelector('#home-windmod img')&&/<img/.test(rows()[0][0])&&!J('window.__x||0'));
B.gatt.disconnect();await wait(30);emit(A,wu(4,90));await wait(30);
chk('one station left → single session wind, note explains',/^single wind · session unit/.test($('wm-src').textContent)&&/Needs two live stations/.test($('wm-note').textContent),$('wm-src').textContent);
chk('no uncaught errors',w.errs.length===0,w.errs.join(' | '));
console.log('\nPASS '+pass+'   FAIL '+fail);
process.exit(fail?1:0);
})();
