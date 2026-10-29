// Stations everywhere test (V2.4.0, CORE-17 follow-up): per-station average window, the course runner and
// the Solver on the live wind stations.
// Per-station window: a station on 10 s averages only the last 10 s of its own unit while another follows
// the session window; saved, sanitised on import. Course runner: each target gets the station field turned
// to its own bearing — reproduced here from plane geometry (positions and marks rotated by the bearing
// difference, north marks fixed) and fed to solveShot independently; same bearing = Home's field exactly;
// live wind off → single wind. Solver: "Live wind stations" uses the field (= solveShot with an independent
// windField), says so, falls back to its inputs with fewer than two live stations.
// Usage: node stationusetest.js <app.html>   (needs jsdom; see README.md)
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
  beforeParse(w){w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:(t,k)=>k==='measureText'?()=>({width:10}):()=>{}});w.scrollTo=()=>{};
    Object.defineProperty(w.navigator,'bluetooth',{value:{requestDevice:async()=>queue.shift()}});w.alert=()=>{};w.confirm=()=>true;w.prompt=(q,d)=>d;}});
const w=dom.window;w.errs=[];w.addEventListener('error',e=>w.errs.push(e.message));
const J=e=>JSON.parse(w.eval('JSON.stringify('+e+')'));
const $=id=>w.document.getElementById(id);
const wu=(s,d)=>`:WU,2,${s},9.9,${d},5F\r`;
const emit=(u,line)=>u.fff2.emit(Array.from(Buffer.from(line)));
const R=Math.PI/180,n360=a=>((a%360)+360)%360;
// Independent geometry (this file, not the app): station → {x, cross, head} for a shot on bearing b.
function geo(t,r,s,D0,base,b){
  const turn=(b!=null&&base!=null)?b-base:0,a=(t.ang||0)*R;
  const x0=t.dist*Math.cos(a),y0=t.dist*Math.sin(a);
  const m=t.mount==='north'?n360(-b):n360(Math.atan2(-y0,D0-x0)/R-turn);
  const th=(r+m)*R;return{x:t.dist*Math.cos(((t.ang||0)-turn)*R),cross:s*Math.sin(th),head:-s*Math.cos(th)};
}
const SOLVE=(D,f,brgRel)=>`(()=>{const tr=homeTraj(courseMaxRange()),z=zeroConds();const s=solveShot(tr.pts,nearestPt,z.range,${D},0,S.wind.speed,${brgRel??'S.wind.dir'},S.mv,(rifleScope(getRifle())||{}).clickStepMrad||0.1,z.wSpd,z.wDir,${f});return{e:s.mrElev,w:s.mrWind}})()`;

(async()=>{
console.log('=== STATIONS EVERYWHERE TEST: '+FILE+' ===');
await wait(700);
w.eval(`Bus.setRifle(DB.rifles.find(x=>/\\.25/.test(x.name)).id);Bus.setProj(DB.projectiles.find(p=>/^Altaros ATP Queen/.test(p.name)).id);Bus.setWx('cur',DB.weathers[0].id);Bus.set('dist_m',150);
  {const o=solveShot;window.__course={};window.solveShot=function(...a){const s=o(...a);if(new Error().stack.includes('renderCourse'))window.__course[a[3]]=s?{e:s.mrElev,w:s.mrWind,f:!!a[11]}:null;return s;};}`);
const A=unit('WDOT-B1F9A6',T1,64,'idA'),B=unit('WDOT-E2896A',T2,87,'idB');
queue.push(A);await w.eval('calAdd()');await wait(200);queue.push(B);await w.eval('calAdd()');await wait(200);
w.eval(`stnAdd();stnAdd();const t=stnRange().stations;Object.assign(t[0],{nick:'Line',dist:10});Object.assign(t[1],{nick:'Far',dist:120,ang:15,mount:'north'});setTargetBearing(270,'manual');stnChanged()`);
// 1. Per-station average window.
const now=Date.now();
w.eval(`CALS[1].buf.length=0;[[50,5,0],[40,5,0],[30,5,0],[8,1,0],[4,1,0],[1,1,0]].forEach(([ago,s,d])=>CALS[1].buf.push({t:${now}-ago*1000,s,d}));CALS[1].lastWu=Date.now();CALS[1].spd=1;CALS[1].dir=0`);
const sOn=()=>J('stnState(150).rows[1].s');
chk('station on the session window (1 min) averages its unit\'s last minute',Math.abs(sOn()-3)<1e-9,sOn());
const av=w.document.querySelectorAll('#stn-list select')[3];
chk('station row has an Average picker, default "Session (1 min)"',av&&av.options[0].textContent==='Session (1 min)'&&av.value==='');
av.value='10';av.dispatchEvent(new w.Event('change'));
chk('station on 10 s averages only its last 10 s; the other station still follows the session window',Math.abs(sOn()-1)<1e-9&&J('stnRange().stations[1].avg')===10&&J('stnRange().stations[0].avg')===null&&J('stnState(150).rows[1].win')===10&&J('stnWin(stnRange().stations[0])')===60);
w.eval('stnLive()');
chk('row text names the window',/^avg 10 s /.test(w.document.querySelectorAll('#stn-list .stn-live')[1].textContent),w.document.querySelectorAll('#stn-list .stn-live')[1].textContent);
chk('import sanitises the window (5 s and 99999 s → session; 300 s kept)',J(`[stnClean({id:'a',avg:5}).avg,stnClean({id:'b',avg:99999}).avg,stnClean({id:'c',avg:300}).avg]`).join()===',,300');
w.eval(`stnSet(stnRange().stations[1].id,'avg','')`);
// 2. Course runner.
w.eval(`newDope();const c=DB.dopeCards[0];c.name='Lane';const st=c.stages[0];st.name='S1';
  st.dists=[{id:'a',range:150,angle:0,wind:0,wdir:90,label:'T1',brg:270,size:null,pos:'',shots:1},{id:'b',range:200,angle:0,wind:0,wdir:90,label:'T2',brg:300,size:null,pos:'',shots:1},{id:'c',range:100,angle:0,wind:0,wdir:90,label:'T3',brg:null,size:null,pos:'',shots:1}];saveDB();
  useLayout(APP.layouts.find(l=>l.name==='PRS').id);courseSelect(c.id);courseGo(0);toggleHomeLive()`);
for(let i=0;i<4;i++){emit(A,wu(4,90));emit(B,wu(3,200));await wait(40);}
w.eval('CALS.forEach(d=>d.buf.length=0)');for(let i=0;i<3;i++){emit(A,wu(4,90));emit(B,wu(3,200));await wait(40);}await wait(30);
const tA={dist:10,ang:0,mount:'target'},tB={dist:120,ang:15,mount:'north'};
const fld=b=>`windField(${JSON.stringify([geo(tA,90,4,150,270,b),geo(tB,200,3,150,270,b)])},'blend')`;
const C=J('__course');
const e1=J(SOLVE(150,fld(270))),e2=J(SOLVE(200,fld(300))),e3=J(SOLVE(100,fld(270)));
chk('T1 (session bearing): course = independent geometry field',C[150]&&C[150].f&&Math.abs(C[150].w-e1.w)<1e-12&&Math.abs(C[150].e-e1.e)<1e-12,JSON.stringify([C[150],e1]));
chk('T2 (bearing 300°, 30° right of the line): field turned to its line = independent geometry',C[200]&&Math.abs(C[200].w-e2.w)<1e-12&&Math.abs(C[200].e-e2.e)<1e-12,JSON.stringify([C[200],e2]));
chk('T3 (no bearing): session line',C[100]&&Math.abs(C[100].w-e3.w)<1e-12);
chk('T1 = Home exactly (same line, same distance)',J(`(()=>{const f=stnField(150);return f.key})()`)===J(`stnField(150,270).key`)&&$('home-wind').textContent===[...w.document.querySelectorAll('#cs-targets .cs-wind')][0].textContent);
const tw=J(`[${JSON.stringify(geo(tA,90,4,150,270,300))},stnState(200,300).live[0]]`);
chk('turning the line moves the station frame (10 m on the line → 8.66 m at 30°) and its mark (θ 60°)',Math.abs(tw[1].x-8.660254)<1e-6&&Math.abs(tw[1].rel-60)<1e-9&&Math.abs(tw[1].cross-tw[0].cross)<1e-12,JSON.stringify(tw[1]));
chk('course note: "wind from 2 stations"',/wind from 2 stations/.test($('cs-score').textContent),$('cs-score').textContent);
w.eval('toggleHomeLive()');w.eval('window.__course={};renderQuick()');
chk('live wind off → course uses the single session wind',J('__course')[150]&&!J('__course')[150].f&&!/stations/.test($('cs-score').textContent));
w.eval('toggleHomeLive()');
// 3. Solver.
w.eval(`gotoPage('solver');runTraj(true)`);await wait(50);
w.document.getElementById('sv-tdist').value='180';w.eval('solve()');
const off=$('sv-outs').textContent;
chk('Solver default: the wind inputs ("The inputs above" on, no note)',$('sv-ws-in').classList.contains('on')&&$('sv-ws-note').textContent==='');
w.document.getElementById('sv-ws-st').click();
const sv=J(`(()=>{const pts=lastTraj.ptsFine,zc=zeroConds(),sc=rifleScope(getRifle()),ck=sc?.clickStepMrad||0.1;const s=solveShot(pts,nearestPt,zc.range,180,0,0,90,lastTraj.mv,ck,zc.wSpd,zc.wDir,${fld(270).replace("'blend'","'blend'")});return (s.mrWind/ck)})()`);
const shown=$('sv-outs').textContent.match(/Windage([→←])(\d+)/);
chk('Solver "Live wind stations": windage = solveShot with the independent field; note says so',shown&&(shown[1]==='→'?1:-1)*+shown[2]===Math.round(sv)*(1)&&/Wind from 2 live stations \(blend\)/.test($('sv-ws-note').textContent)&&APP_on(),JSON.stringify([shown&&shown.slice(1),sv]));
function APP_on(){return J('APP.solverStations')===true&&$('sv-ws-st').classList.contains('on');}
B.gatt.disconnect();await wait(30);w.eval('solve()');
chk('Solver: one live station → its inputs again, note explains',$('sv-outs').textContent===off&&/needs two; using the wind inputs above/.test($('sv-ws-note').textContent),$('sv-ws-note').textContent);
chk('no uncaught errors',w.errs.length===0,w.errs.join(' | '));
console.log('\nPASS '+pass+'   FAIL '+fail);
process.exit(fail?1:0);
})();
