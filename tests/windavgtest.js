// Wind average window test (V1.28.0, CALC-20): the app averages the Calypso's INSTANT readings
// itself over a chosen window (the unit's own :WU average is ignored). Vector mean of the wind
// arrows — known cases (steady, 350°/10° wrap, opposite winds cancel, calm readings carry no
// weight), an independent reproduction on random data, window boundaries, fill and gap flags,
// selector + custom minutes + clamping + persistence, reset, unit switch, the session (Home live
// avg vs instant, Wind tab live, "Use wind → session", fixed-bearing mount), no HTML sinks.
// Usage: node windavgtest.js <app.html>   (needs jsdom; see README.md)
const {JSDOM}=require('jsdom'),fs=require('fs');
const FILE=process.argv[2];
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let pass=0,fail=0;
const chk=(n,ok,extra)=>{console.log((ok?'  PASS  ':'  FAIL  ')+n+(extra?'   '+extra:''));ok?pass++:fail++;};
const T1=':DU,1668647648,A7',T2=':DU,1802347072,AF';
// Simulated Calypso (same behaviour as calypsotest.js): only its own :DU unlocks it.
function unit(name,accept){
  const u={name,writes:[],unlocked:false,ls:{},addEventListener(t,f){(this.ls[t]=this.ls[t]||[]).push(f)},fire(t){(this.ls[t]||[]).forEach(f=>f())}};
  const fff2={uuid:'0000fff2-0000-1000-8000-00805f9b34fb',properties:{notify:true},ls:[],addEventListener(t,f){this.ls.push(f)},async startNotifications(){},
    emit(bytes){const v=new DataView(new Uint8Array(bytes).buffer);this.ls.forEach(f=>f({target:{value:v}}))}};
  const em=s=>setTimeout(()=>fff2.emit(Array.from(Buffer.from(s))),15);
  const fff1={uuid:'0000fff1-0000-1000-8000-00805f9b34fb',properties:{write:true,writeWithoutResponse:true},
    async writeValueWithoutResponse(b){const s=Buffer.from(b).toString().replace(/\r/g,'');u.writes.push(s);
      if(s.startsWith(':DU')){if(s===accept){u.unlocked=true;em(':AK\r');}else em(':NA\r');}
      else if(s.startsWith(':CC'))em(':CC,6,0,----,B6\r');else em(':AK\r');}};
  const server={async getPrimaryServices(){return[]},async getPrimaryService(id){if(id===0x180F)throw new Error('none');return{getCharacteristics:async()=>[fff1,fff2]};}};
  u.gatt={connected:false,async connect(){this.connected=true;return server},disconnect(){this.connected=false;u.fire('gattserverdisconnected')}};
  u.fff2=fff2;return u;
}
const all=[];
async function open(dev,ls){
  const dom=new JSDOM(fs.readFileSync(FILE,'utf8'),{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',
    beforeParse(w){w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:(t,k)=>k==='measureText'?()=>({width:10}):()=>{}});
      Object.defineProperty(w.navigator,'bluetooth',{value:{requestDevice:async()=>w.nextDev||dev}});w.alert=()=>{};w.confirm=()=>true;
      if(ls)w.localStorage.setItem('sen_platform_v1',ls);}});
  const w=dom.window;w.errs=[];w.addEventListener('error',e=>w.errs.push(e.message));await wait(700);all.push(w);return w;
}
const J=(w,e)=>JSON.parse(w.eval('JSON.stringify('+e+')'));
const txt=(w,id)=>w.document.getElementById(id).textContent;
const near=(a,b,t=1e-9)=>Math.abs(a-b)<=t;
// Fill the app's buffer with readings [s,d] spaced dtS seconds apart, ending now.
const fill=(w,rd,dtS=1)=>w.eval(`wavgBuf=[];{const now=Date.now(),r=${JSON.stringify(rd)};r.forEach((p,i)=>wavgPush(now-(r.length-1-i)*${dtS*1000},p[0],p[1]));}`);
const avg=(w,win)=>J(w,`windAvg(${win},Date.now())`);
const wu=(inst,avgF,dir)=>`:WU,2,${inst},${avgF},${dir},5F\r`;
async function send(w,u,line){u.fff2.emit(Array.from(Buffer.from(line)));await wait(30);}

(async()=>{
console.log('=== WIND AVERAGE WINDOW TEST: '+FILE+' ===');
const w=await open(unit('WDOT-B1F9A6',T1));

// 1. Averaging maths — known cases.
fill(w,Array(60).fill([3,90]));let a=avg(w,60);
chk('steady 3 m/s from 90° for 60 s → 3 m/s at 90°, steadiness 100 %, lull = gust = 3',near(a.spd,3)&&a.dir===90&&near(a.steady,1)&&a.min===3&&a.max===3&&a.n===60,JSON.stringify(a));
fill(w,[[4,350],[4,10]]);a=avg(w,60);
chk('350° and 10° → 0° (not 180°); speed 4·cos 10° = 3.939',a.dir===0&&near(a.spd,4*Math.cos(10*Math.PI/180)),JSON.stringify(a));
fill(w,[[3,90],[3,270]]);a=avg(w,60);
chk('equal opposite winds cancel: speed 0, no direction, steadiness 0, mean speed still 3',near(a.spd,0,1e-12)&&a.dir===null&&near(a.steady,0,1e-12)&&near(a.mean,3),JSON.stringify(a));
fill(w,[...Array(20).fill(0).map((_,i)=>[0.1,i*18]),...Array(10).fill([5,180])]);a=avg(w,60);
chk('calm readings with the vane pointing anywhere carry no weight: 0.1 m/s × 20 all round + 5 m/s × 10 from 180° → 180°',a.dir===180&&near(a.spd,50/30,1e-9),JSON.stringify(a));
// left/right swing around a head wind: crosswinds cancel, the head component stays
fill(w,[[4,60],[4,120]]);a=avg(w,60);
chk('wind swinging 60° ↔ 120° → 90°, speed 4·cos 30° = 3.464, steadiness 86.6 %',a.dir===90&&near(a.spd,4*Math.cos(Math.PI/6))&&near(a.steady,Math.cos(Math.PI/6)),JSON.stringify(a));

// 2. Independent reproduction on random data (computed here with separate code).
let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
const R=Array.from({length:900},()=>[+(rnd()*8).toFixed(1),Math.floor(rnd()*360)]);
fill(w,R);a=avg(w,900);
let sx=0,sy=0,ss=0;R.forEach(([s,d])=>{sx+=s*Math.sin(d/57.29577951308232+Math.PI/2);sy+=s*Math.cos(d/57.29577951308232-Math.PI/2);ss+=s;});
const ix=sx/R.length,iy=sy/R.length,ispd=Math.sqrt(ix*ix+iy*iy);let idir=Math.atan2(iy,ix)*180/Math.PI;if(idir<0)idir+=360;
chk('900 random readings: speed, direction, mean, min, max match an independent computation',near(a.spd,ispd,1e-12)&&a.dir===Math.round(idir)%360&&near(a.mean,ss/R.length,1e-12)&&a.min===Math.min(...R.map(r=>r[0]))&&a.max===Math.max(...R.map(r=>r[0])),a.spd+' vs '+ispd+', '+a.dir+' vs '+idir);

// 3. Window boundaries, fill, gaps.
fill(w,[...Array(240).fill([6,0]),...Array(60).fill([2,90])]);   // 5 min: first 4 min 6 m/s from 0°, last minute 2 m/s from 90°
a=avg(w,60);const a5=avg(w,300);
chk('1 min window sees only the last minute (2 m/s at 90°); 5 min window sees all 300 readings',a.n===60&&near(a.spd,2)&&a.dir===90&&a5.n===300&&a5.max===6,a.n+' '+a5.n);
fill(w,Array(100).fill([3,0]));a=avg(w,900);
chk('15 min window with 100 s of readings → fill 99 s, flagged as filling',near(a.fill,99,0.5)&&(w.eval('APP.windAvgS=900;wavgRender()'),/1:39 of 15:00 \(filling\)/.test(txt(w,'ble-avg-stats'))),txt(w,'ble-avg-stats'));
fill(w,Array(30).fill([3,0]),10);a=avg(w,900);
chk('readings 10 s apart → gap flagged (> 5 s)',near(a.gap,10,0.5)&&/⚠ gap 10 s/.test((w.eval('wavgRender()'),txt(w,'ble-avg-stats'))),txt(w,'ble-avg-stats'));
fill(w,Array(30).fill([3,0]));chk('readings 1 s apart → no gap flag',!/gap/.test((w.eval('wavgRender()'),txt(w,'ble-avg-stats'))));
chk('readings older than 2 h are dropped from the buffer',(w.eval('wavgBuf=[];wavgPush(Date.now()-7300e3,1,0);wavgPush(Date.now(),2,0)'),J(w,'wavgBuf.length'))===1);

// 4. Selector, custom minutes, clamping, persistence.
w.eval('APP.windAvgS=60;wavgRender()');
const opts=id=>[...w.document.getElementById(id).options].map(o=>o.textContent).join('|');
chk('both selectors list 10 s · 1 · 5 · 15 · 30 · 60 min; Home shows 1 min',opts('home-avg-win')==='10 s|1 min|5 min|15 min|30 min|60 min'&&opts('ble-avg-win')===opts('home-avg-win')&&w.document.getElementById('home-avg-win').value==='60');
const sel=w.document.getElementById('home-avg-win');sel.value='900';sel.dispatchEvent(new w.Event('change'));
chk('choosing 15 min on Home → saved, Sensors selector follows',J(w,'APP.windAvgS')===900&&w.document.getElementById('ble-avg-win').value==='900');
const cm=w.document.getElementById('ble-avg-min');cm.value='7';cm.dispatchEvent(new w.Event('change'));
chk('custom 7 min → 420 s, added to both lists',J(w,'APP.windAvgS')===420&&/\|7 min\|/.test(opts('home-avg-win'))&&w.document.getElementById('home-avg-win').value==='420');
chk('garbage window values are clamped (text or 0 → default 60 s, 5 s → 10 s, 1e9 → 2 h)',['x',0,5,1e9].map(v=>w.eval(`APP.windAvgS=${JSON.stringify(v)};wavgWin()`)).join()==='60,60,10,7200');
w.eval('setWavgWin(1800)');await wait(30);
const r2=await open(unit('WDOT-B1F9A6',T1),w.localStorage.getItem('sen_platform_v1'));
chk('window survives a restart (30 min)',J(r2,'APP.windAvgS')===1800&&r2.document.getElementById('home-avg-win').value==='1800');

// 5. Live stream: own average from INSTANT readings, the unit's average field ignored.
const u=unit('WDOT-B1F9A6',T1),L=await open(u);await L.eval('toggleBLE()');await wait(250);
L.eval('setWavgWin(60)');
for(const [s,d] of [[2,80],[4,100],[3,90]])await send(L,u,wu(s,9.9,d));
L.eval('toggleHomeLive()');await wait(20);
let sw=J(L,'S.wind');
// independent: 2@80, 4@100, 3@90 → x̄,ȳ by hand
{const P=[[2,80],[4,100],[3,90]],x=P.reduce((t,[s,d])=>t+s*Math.cos(d*Math.PI/180),0)/3,y=P.reduce((t,[s,d])=>t+s*Math.sin(d*Math.PI/180),0)/3;
chk('Home live avg: session = vector mean of the instant readings (2.972 m/s at 92°), not the unit\'s 9.9 average field',near(sw.speed,Math.hypot(x,y),1e-12)&&sw.dir===Math.round(Math.atan2(y,x)*180/Math.PI),JSON.stringify(sw)+' vs '+Math.hypot(x,y));}
chk('Home live state names the window',/LIVE from Calypso ⊙ \(avg 1 min\)/.test(txt(L,'home-live-state')),txt(L,'home-live-state'));
await send(L,u,wu(6,9.9,120));sw=J(L,'S.wind');
const ex=J(L,'windAvg(60,Date.now())');
chk('each new reading updates the session average (direction averaged too, not the last vane reading 120°)',near(sw.speed,ex.spd,1e-9)&&sw.dir===ex.dir&&sw.dir!==120,JSON.stringify(sw));
L.eval("setHomeWindSrc('inst')");sw=J(L,'S.wind');
chk('instant mode: session = last instant speed and direction (6 m/s at 120°)',sw.speed===6&&sw.dir===120&&/\(instant\)/.test(txt(L,'home-live-state')),JSON.stringify(sw));
L.eval("setHomeWindSrc('avg');toggleHomeLive();Bus.setWind(0,0,'manual');useBLEWind()");sw=J(L,'S.wind');
chk('"Use wind → session" takes the windowed average',near(sw.speed,ex.spd,1e-9)&&sw.dir===ex.dir);
L.eval("setWindMode('live')");sw=J(L,'S.wind');
chk('Wind tab live mode uses the windowed average (field shows it)',near(sw.speed,ex.spd,1e-9)&&L.document.getElementById('wd-spd').value===ex.spd.toFixed(1));
L.eval("setWindMode('manual');setTargetBearing(200,'manual');setCalMount(30);useBLEWind()");sw=J(L,'S.wind');
chk('fixed-bearing mount: wind from = averaged direction + mount bearing',sw.from===(ex.dir+30)%360,JSON.stringify(sw));
chk('Sensors card shows the average line with lull/gust and steadiness',/^Average 1 min: .* · lull .* \/ gust .* · steadiness \d+ %/.test(txt(L,'ble-avg-stats')),txt(L,'ble-avg-stats'));
L.eval('wavgReset()');chk('Reset average empties the window',J(L,'wavgBuf.length')===0&&/waiting for readings/.test(txt(L,'ble-avg-stats')));
await send(L,u,wu(1,1,10));L.eval('wavgUnit="WDOT-OTHER"');await send(L,u,wu(2,2,20));
chk('readings from another unit start a fresh window',J(L,'wavgBuf.length')===1&&J(L,'wavgBuf[0].s')===2);

// 6. Safety.
const html=fs.readFileSync(FILE,'utf8'),eng=html.slice(html.indexOf('CALC-20 (V1.28.0)'),html.indexOf('function calypsoParse'));
chk('no innerHTML in the averaging code',eng.length>500&&!/innerHTML/.test(eng));
const errs=all.flatMap(x=>x.errs);chk('ZERO uncaught errors',errs.length===0,errs.slice(0,3).join(' / '));
console.log('\nPASS '+pass+'   FAIL '+fail);process.exit(fail?1:0);
})().catch(e=>{console.error('TEST CRASH:',e);process.exit(1);});
