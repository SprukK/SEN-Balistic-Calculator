// Device row test (V2.11.0 r2): Weather · Range · Chrono pills on the Field layout.
// Uses connected-device stand-ins (the real connect paths are covered by calypsotest, multicaltest,
// rangefindertest and labradartest) and feeds them through the app's real handlers: calypsoParse for
// :WU wind, rfFrame for rangings, lrShot for LabRadar shots. Checks the four pill states, tap = pause /
// resume all (live wind / rangefinder fill / shot string), the last value kept as manual, per-device
// pause from the hold popup (a paused Calypso drops out of the stations like a stale one; a paused session
// unit holds its wind; a paused rangefinder fills nothing; a paused LabRadar adds no shot), MV only with
// "Use MV → session", Android back closing sheets / pages / double-back on Home, text only, no errors.
// Usage: node devicetest.js <app.html>   (needs jsdom; see README.md)
const {JSDOM}=require('jsdom'),fs=require('fs');
const FILE=process.argv[2];
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let pass=0,fail=0;
const chk=(n,ok,extra)=>{console.log((ok?'  PASS  ':'  FAIL  ')+n+(extra?'   '+extra:''));ok?pass++:fail++;};
async function open(){
  const dom=new JSDOM(fs.readFileSync(FILE,'utf8'),{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',
    beforeParse(w){Object.defineProperty(w,'innerWidth',{configurable:true,value:412});Object.defineProperty(w,'innerHeight',{configurable:true,value:915});
      w.alert=()=>{};w.confirm=()=>true;w.scrollTo=()=>{};
      w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:(t,k)=>k==='measureText'?()=>({width:10}):()=>{}});}});
  const w=dom.window;w.errs=[];w.addEventListener('error',e=>w.errs.push(e.message));await wait(700);return w;
}
(async()=>{
console.log('=== DEVICE ROW TEST: '+FILE+' ===');
const w=await open();
const J=e=>JSON.parse(w.eval('JSON.stringify('+e+')'));
const $=id=>w.document.getElementById(id);
const pe=(el,type)=>{const e=new w.MouseEvent(type,{bubbles:true,cancelable:true,clientX:100,clientY:100,button:0});Object.defineProperty(e,'pointerId',{value:1});el.dispatchEvent(e);};
const tap=async el=>{pe(el,'pointerdown');await wait(40);pe(el,'pointerup');el.dispatchEvent(new w.MouseEvent('click',{bubbles:true,detail:1}));await wait(30);};
const hold=async el=>{pe(el,'pointerdown');await wait(420);pe(el,'pointerup');el.dispatchEvent(new w.MouseEvent('click',{bubbles:true,detail:1}));await wait(30);};
const pill=k=>({cls:['live','man'].filter(c=>$('dev-'+k).classList.contains(c)).join()||'off',v:$('dev-'+k+'-v').textContent});
const sheetOpen=()=>$('sheet').classList.contains('open');
const h3=()=>(w.document.querySelector('#sbox h3')||{}).textContent;
const rowBtn=name=>[...w.document.querySelectorAll('#sbox .devrow')].find(r=>r.textContent.includes(name)).querySelector('button');

w.eval(`Bus.setRifle(DB.rifles.find(r=>/\\.25/.test(r.name)).id);Bus.setProj(DB.projectiles.find(p=>/^Altaros ATP Queen/.test(p.name)).id);
  Bus.setWx('cur',DB.weathers[0].id);Bus.setWx('zero',DB.weathers[0].id);S.mv=255;S.dist_m=100;Bus.notify();`);await wait(30);

// 0. Field is the default; the old Home is "Classic"
chk('fresh install: Field layout first as "Default" and in use, the old Home is "Classic"',J('APP.layouts.map(l=>l.name)').join()==='Default,Classic,Benchrest 50 m,Benchrest 100 m,PRS,Big bore'&&J('activeLayout().name')==='Default'&&w.eval('APP.fieldDefault')===true,J('APP.layouts.map(l=>l.name)').join());
const vis=[...$('page-home').children].filter(e=>e.id&&!e.classList.contains('mod-off')&&!['home-layout-bar','home-setup'].includes(e.id)).map(e=>e.id).join();
chk('Field shows the device row under Distance',vis==='home-summary,home-answer,home-distance,home-devices,home-dash,home-turret-panel',vis);

// 1. Nothing connected
chk('nothing connected: three outline pills saying "connect"',['wx','rf','ch'].every(k=>pill(k).cls==='off'&&pill(k).v==='connect'));
await tap($('dev-wx'));
chk('tap Weather with nothing connected → its popup with Connect and Station setup',sheetOpen()&&h3()==='Weather sensors'&&/Connect Calypso/.test($('sbox').textContent)&&/Station setup/.test($('sbox').textContent));
w.eval('closeSheet()');

// 2. Two Calypsos (stand-ins for connected units), readings through calypsoParse
w.eval(`const mk=(id,name)=>({link:{id,name,connected:()=>true,disconnect(){},dev:{gatt:{connected:true}}},status:'live',spd:0,dir:0,lastWu:0,batt:80,reply:null,rx:'',buf:[],ka:null,fff1:null,locked:false});
  CALS.push(mk('idA','WDOT-AAAA01'),mk('idB','WDOT-BBBB02'));calPrimaryId='idA';calSyncPrimary();
  calypsoParse(':WU,0,3.0,2.9,90',CALS[0]);calypsoParse(':WU,0,1.0,1.0,270',CALS[1]);`);await wait(20);
chk('Calypsos connected, live wind off → Weather pill dashed "MAN"',pill('wx').cls==='man'&&/^MAN/.test(pill('wx').v),JSON.stringify(pill('wx')));
await tap($('dev-wx'));
chk('tap → live wind on: session wind from the session unit, pill live "3.0 m/s · 2/2"',w.eval('homeLive')===true&&J('S.wind.source')==='calypso'&&Math.abs(w.eval('S.wind.speed')-3)<0.11&&pill('wx').cls==='live'&&pill('wx').v==='3.0 m/s · 2/2',JSON.stringify(pill('wx'))+' '+w.eval('S.wind.speed'));
const spd=w.eval('S.wind.speed');
await tap($('dev-wx'));
chk('tap → paused: live wind off, last wind kept as manual, pill MAN',w.eval('homeLive')===false&&J('S.wind.source')==='manual'&&w.eval('S.wind.speed')===spd&&pill('wx').cls==='man');
w.eval(`calypsoParse(':WU,0,6.0,6.0,90',CALS[0])`);await wait(20);
chk('…new readings do not move the session wind while paused',w.eval('S.wind.speed')===spd);
await tap($('dev-wx'));
chk('tap → resumed: session wind follows the unit again',pill('wx').cls==='live'&&J('S.wind.source')==='calypso'&&w.eval('S.wind.speed')>spd);

// 3. Hold popup, per-unit pause; stations
w.eval(`stnAdd();stnAdd();const r=stnRange();stnSet(r.stations[0].id,'dist','10');stnSet(r.stations[1].id,'dist','90');`);await wait(20);
await hold($('dev-wx'));
const rows=[...w.document.querySelectorAll('#sbox .devrow')].map(r=>r.textContent);
chk('hold → popup lists both units, the session unit tagged',sheetOpen()&&h3()==='Weather sensors'&&rows.length===2&&/feeds session/.test(rows[0])&&/station/.test(rows[1]),rows.join(' | '));
chk('…a hold does not also act as a tap (still live)',pill('wx').cls==='live');
rowBtn('WDOT-BBBB02').click();await wait(20);
chk('pause the second unit: pill live "1/2", it drops out of the stations as "paused"',J('CALS[1].paused')===true&&/1\/2$/.test(pill('wx').v)&&J('stnState(S.dist_m).rows.map(q=>q.why)').join()===',paused',J('stnState(S.dist_m).rows.map(q=>q.why)').join());
const single=J(`(()=>{const tr=homeTraj(),z=zeroConds(),sc=rifleScope(getRifle()),s=solveShot(tr.pts,nearestPt,z.range,S.dist_m,0,S.wind.speed,S.wind.dir,S.mv,sc?.clickStepMrad||0.1,z.wSpd,z.wDir);return (s.clWind>=0?'→':'←')+Math.abs(s.clWind).toFixed(0);})()`);
w.eval('renderQuick()');
chk('…one live station left → Home = the single session wind (solveShot)',w.eval('stnField(S.dist_m)')===null&&$('fa-wind').textContent===single,single+' vs '+$('fa-wind').textContent);
rowBtn('WDOT-AAAA01').click();await wait(20);
const held=w.eval('S.wind.speed');w.eval(`calypsoParse(':WU,0,9.0,9.0,90',CALS[0])`);await wait(20);
chk('pause the session unit: wind held as manual, new readings ignored',J('S.wind.source')==='manual'&&w.eval('S.wind.speed')===held&&pill('wx').cls==='man');
rowBtn('WDOT-AAAA01').click();await wait(20);
chk('resume it: wind follows the unit again',J('S.wind.source')==='calypso'&&w.eval('S.wind.speed')>held);
w.eval('closeSheet()');
await tap($('dev-wx'));await tap($('dev-wx'));
chk('pause-all then resume-all clears per-unit pauses',J('CALS.map(d=>!!d.paused)').join()==='false,false'&&pill('wx').v.endsWith('2/2'));

// 4. Rangefinder through rfFrame
w.eval(`RFS.push({link:{id:'r1',name:'TITAN 3K',connected:()=>true,disconnect(){}},last:null,n:0,gone:false,batt:90});rfRender();`);await wait(20);
chk('rangefinder connected, filling on → Range pill live "ready"',pill('rf').cls==='live'&&pill('rf').v==='ready');
w.eval(`rfFrame(RFS[0],new Uint8Array([0xF5,0x05,0xC5,0x02]))`);await wait(20);   // 147.7 m, +2°
chk('a ranging fills the session and shows on the pill and Distance',Math.abs(w.eval('S.dist_m')-147.7)<1e-9&&pill('rf').v==='147.7 m'&&$('fd-src').textContent==='⊙ TITAN 3K',pill('rf').v);
await tap($('dev-rf'));
chk('tap → filling off (Main\'s switch), pill MAN',w.eval('APP.rfFill')===false&&pill('rf').cls==='man');
w.eval(`rfFrame(RFS[0],new Uint8Array([0xF5,0x07,0xD0,0x00]))`);await wait(20);  // 200.0 m
chk('…a ranging while paused fills nothing',Math.abs(w.eval('S.dist_m')-147.7)<1e-9);
await tap($('dev-rf'));
await hold($('dev-rf'));rowBtn('TITAN 3K').click();await wait(20);
w.eval(`rfFrame(RFS[0],new Uint8Array([0xF5,0x07,0xD0,0x00]))`);await wait(20);
chk('per-device pause from the popup: the unit fills nothing, pill MAN',J('RFS[0].paused')===true&&Math.abs(w.eval('S.dist_m')-147.7)<1e-9&&pill('rf').cls==='man');
rowBtn('TITAN 3K').click();await wait(20);w.eval(`rfFrame(RFS[0],new Uint8Array([0xF5,0x07,0xD0,0x00]))`);await wait(20);
chk('…resumed: the next ranging fills again',Math.abs(w.eval('S.dist_m')-200)<1e-9&&pill('rf').cls==='live');
w.eval('closeSheet()');

// 5. LabRadar through lrShot
w.eval(`LR={link:{id:'lr1',name:'LBR-0042',connected:()=>true,disconnect(){}},key:'accepted',armed:true,series:3,batt:4,last:null,lastRx:Date.now(),poll:null,seq:0,buf:[]};lrRender();`);await wait(20);
chk('LabRadar connected → Chrono pill live "ready"',pill('ch').cls==='live'&&pill('ch').v==='ready');
const mv0=w.eval('S.mv');
w.eval('lrShot(LR,281.4);lrShot(LR,282.0);lrShot(LR,281.6);lrRender()');await wait(20);
chk('shots join the string, the pill shows the last one, session MV untouched',J('chClean(APP.chronoStr).shots.length')===3&&pill('ch').v==='281.6 m/s'&&w.eval('S.mv')===mv0,pill('ch').v);
await tap($('dev-ch'));w.eval('lrShot(LR,290.0)');await wait(20);
chk('tap → paused: a shot is shown but not added to the string',pill('ch').cls==='man'&&J('chClean(APP.chronoStr).shots.length')===3&&w.eval('LR.last.v')===290);
await tap($('dev-ch'));
await hold($('dev-ch'));
chk('hold → popup with the string (MV · ES · SD) and "Use MV → session"',h3()==='Chronographs'&&/Shot string: 3 shots · MV 281\.\d m\/s · ES 0\.6 m\/s/.test($('sbox').textContent)&&/Use MV → session/.test($('sbox').textContent),$('sbox').textContent.slice(0,160));
[...w.document.querySelectorAll('#sbox button')].find(b=>b.textContent==='Use MV → session').click();await wait(20);
chk('…MV reaches the session only by that tap',Math.abs(w.eval('S.mv')-281.67)<0.05&&J('S.src.mv')==='chrono'&&!sheetOpen(),w.eval('S.mv'));

// 6. Android back button (r3): guards only from a real gesture; a back press never adds one
const back=async()=>{w.dispatchEvent(new w.PopStateEvent('popstate',{state:null}));await wait(20);};
const gesture=async()=>{w.document.body.dispatchEvent(new w.MouseEvent('pointerup',{bubbles:true}));await wait(10);};
w.eval(`window._push=0;window._go=[];history.pushState=function(){_push++;};history.go=function(n){_go.push(n);};backDepth=0;backAct=false;pageStack.length=0;gotoPage('home');closeSheet();`);
w.eval(`openSummarySheet();gotoPage('traj');gotoPage('home');closeSheet();pageStack.length=0;`);
chk('no guard without a gesture (sheet opened, pages changed from code — the r2 bug)',w.eval('_push')===0&&w.eval('backDepth')===0);
await gesture();
chk('a tap arms three guards',w.eval('_push')===3&&w.eval('backDepth')===3);
w.eval(`openSummarySheet()`);await back();
chk('back closes an open sheet, adds no guard',!sheetOpen()&&w.eval('curPage()')==='home'&&w.eval('_push')===3&&w.eval('backDepth')===2);
await gesture();chk('the next tap tops the guards up again',w.eval('_push')===4&&w.eval('backDepth')===3);
w.eval(`gotoPage('traj');gotoPage('settings')`);await back();
chk('back returns to the previous page (Settings → Trajectory)',w.eval('curPage()')==='traj'&&$('hdr-page').textContent==='Advanced · Trajectory');
await back();chk('…then Home',w.eval('curPage()')==='home');
await back();
chk('back on Home: "Press back again to close", all guards used, nothing pushed',/Press back again/.test($('sen-toast').textContent)&&$('sen-toast').classList.contains('on')&&w.eval('backDepth')===0&&w.eval('_push')===4&&w.eval('_go.length')===0);
await gesture();await back();
chk('toast with spare guards left: they are dropped in one history.go(−2), so the next press exits',w.eval('JSON.stringify(_go)')==='[-2]'&&w.eval('backDepth')===0);
await back();
chk('…the popstate of that history.go is ignored (no toast loop, no page change)',w.eval('backDrain')===0&&w.eval('curPage()')==='home'&&w.eval('_go.length')===1);
w.eval(`gotoPage('settings')`);
chk('r4: the temporary back-button diagnostic is gone from Settings',!$('back-diag'));
w.eval(`gotoPage('home')`);

// 6b. Pull-to-refresh blocked only while a device is connected
w.eval('devSync()');
chk('devices connected → pull-to-refresh blocked (no-ptr)',w.document.documentElement.classList.contains('no-ptr')&&/overscroll-behavior-y:contain/.test(fs.readFileSync(FILE,'utf8')));
w.eval(`window._saved=[CALS.slice(),RFS.slice(),LR];CALS.length=0;RFS.length=0;LR=null;devSync()`);
chk('no device → pull-to-refresh allowed again',!w.document.documentElement.classList.contains('no-ptr'));
w.eval(`CALS.push(..._saved[0]);RFS.push(..._saved[1]);LR=_saved[2];calSyncPrimary();devSync()`);   // later checks use the units

// 7. Text only, no errors
w.eval(`CALS[0].link.name='<img src=x id=pwn>';calRender();devSheet('wx')`);
chk('device names are text, never HTML',!w.document.getElementById('pwn')&&/<img/.test($('sbox').textContent));
chk('no uncaught errors',w.errs.length===0,w.errs.join(' | '));
console.log('\nPASS '+pass+'   FAIL '+fail);
process.exit(fail?1:0);
})().catch(e=>{console.error('TEST CRASH:',e);process.exit(1);});
