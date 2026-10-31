// Rangefinder test (V2.9.0, CALC-09; graduation of the Element driver from Lab V1.7.0, LAB-04).
// Simulated Element Titan 3K / Helix 1.5K behave like the real units: Nordic UART, one 4-byte F5 frame per
// ranging (replaying the owner's confirmed rangings 25.0 / 5.9 / 42.9 / 39.8 / 1134.5 m at −1 / −13 / +31 / +5 /
// +5°), overlapping GATT operations rejected as Web Bluetooth does, a unit without a battery service.
// Checks: the chooser asks for the Element names + the NUS service; each ranging fills the session distance
// (Home, Trajectory, Solver, act bar) and both shot-angle inputs, the Solver re-solves; the source line says
// "from Titan 3K" and turns to "typed" on override; the switch Off keeps the ranging out of the session and
// survives a restart; imperial display; junk frames ignored; two units at once; disconnect + reconnect without a
// reload; nothing is ever written to a rangefinder; no HTML sinks.
// Usage: node rangefindertest.js <app.html>   (needs jsdom; see README.md)
const {JSDOM}=require('jsdom'),fs=require('fs');
const FILE=process.argv[2];
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let pass=0,fail=0;
const chk=(n,ok,extra)=>{console.log((ok?'  PASS  ':'  FAIL  ')+n+(extra?'   '+extra:''));ok?pass++:fail++;};
const NUS='6e400001-b5a3-f393-e0a9-e50e24dcca9e',TX='6e400003-b5a3-f393-e0a9-e50e24dcca9e',RX='6e400002-b5a3-f393-e0a9-e50e24dcca9e';
const hex=s=>s.split(' ').map(x=>parseInt(x,16));
function unit(name,id,batt){
  const u={name,id,writes:0,busy:false,collisions:0,ls:{},addEventListener(t,f){(this.ls[t]=this.ls[t]||[]).push(f)},fire(t){(this.ls[t]||[]).forEach(f=>f())}};
  const gatt=async fn=>{if(u.busy){u.collisions++;throw new Error('GATT operation already in progress.');}u.busy=true;try{await wait(5);return await fn();}finally{u.busy=false;}};
  const tx={uuid:TX,properties:{notify:true},ls:[],addEventListener(t,f){this.ls.push(f)},startNotifications(){return gatt(async()=>{})},
    emit(bytes){const v=new DataView(new Uint8Array(bytes).buffer);this.ls.forEach(f=>f({target:{value:v}}))}};
  const rx={uuid:RX,properties:{write:true,writeWithoutResponse:true},writeValueWithoutResponse(){u.writes++;return gatt(async()=>{})},writeValue(){u.writes++;return gatt(async()=>{})}};
  const bc={properties:{read:true,notify:false},readValue(){return gatt(async()=>new DataView(new Uint8Array([batt]).buffer))}};
  const server={async getPrimaryServices(){return[]},
    async getPrimaryService(sid){if(sid===0x180F){if(batt==null)throw new Error('no battery service');return{getCharacteristic:async()=>bc};}
      if(String(sid).toLowerCase()!==NUS)throw new Error('service not found');return{getCharacteristics:async()=>[rx,tx]};}};
  u.gatt={connected:false,async connect(){this.connected=true;return server},disconnect(){this.connected=false;u.fire('gattserverdisconnected')}};
  u.tx=tx;u.range=f=>tx.emit(hex(f));return u;
}
let queue=[],lastOpts=null;
const dom=new JSDOM(fs.readFileSync(FILE,'utf8'),{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',
  beforeParse(w){Object.defineProperty(w,'innerWidth',{configurable:true,value:412});Object.defineProperty(w,'innerHeight',{configurable:true,value:915});
    w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:(t,k)=>k==='measureText'?()=>({width:10}):()=>{}});w.scrollTo=()=>{};
    Object.defineProperty(w.navigator,'bluetooth',{value:{requestDevice:async o=>{lastOpts=o;const d=queue.shift();if(!d){const e=new Error('User cancelled');e.name='NotFoundError';throw e;}return d;}}});w.alert=()=>{};w.confirm=()=>true;}});
const w=dom.window;w.errs=[];w.addEventListener('error',e=>w.errs.push(e.message));
const J=e=>JSON.parse(w.eval('JSON.stringify('+e+')'));
const $=id=>w.document.getElementById(id);
const txt=id=>$(id).textContent;
const val=id=>$(id).value;
const rows=()=>[...w.document.querySelectorAll('#rf-units .cal-unit')].map(r=>r.textContent);
(async()=>{
console.log('=== RANGEFINDER TEST: '+FILE+' ===');
await wait(700);
w.eval(`Bus.setRifle(DB.rifles.find(x=>/\\.25/.test(x.name)).id);Bus.setProj(DB.projectiles.find(p=>/^Altaros ATP Queen/.test(p.name)).id);Bus.setWx('cur',DB.weathers[0].id);Bus.setWx('zero',DB.weathers[0].id);Bus.notify();`);
chk('Sensors page: rangefinder panel, fill switch On by default, not connected',!!$('rf-panel')&&$('rf-fill-on').classList.contains('on')&&txt('rf-status')==='Not connected');
// ── connect ──────────────────────────────────────────────────────────────────────────────────────
const T=unit('Titan 3K','idT',null);queue.push(T);await w.eval('rfAdd()');await wait(100);
const f=lastOpts.filters;
chk('chooser filters on the Element names and the Nordic UART service',['Titan','Tian','Helix'].every(n=>f.some(x=>x.namePrefix===n))&&f.some(x=>x.services&&x.services.includes(NUS))&&lastOpts.optionalServices.includes(NUS));
chk('connected: unit listed, waiting for a ranging, no battery service → dash',/Titan 3K/.test(rows()[0])&&/waiting for a ranging/.test(rows()[0])&&/—/.test(rows()[0])&&/Connected: Titan 3K/.test(txt('rf-status')),rows()[0]);
// ── rangings fill the session ────────────────────────────────────────────────────────────────────
w.eval(`gotoPage('solver')`);await wait(30);
const before=txt('sv-outs');
T.range('f5 00 fa ff');await wait(30);
chk('25.0 m −1° → session distance 25.0 m, both angle inputs −1',J('S.dist_m')===25&&val('home-angle')==='-1'&&val('sv-angle')==='-1'&&val('sv-tdist')==='25');
chk('…the Solver re-solved for 25 m',txt('sv-outs')!==before&&/25/.test(txt('sv-outs')));
chk('…act bar distance chip and Trajectory distance follow',/25(\.0)? m/.test(txt('actbar'))&&val('tr-dist')==='25');
chk('…source line on the Solver: "from Titan 3K … (LOS)"',/^Distance \+ angle from Titan 3K · \d\d:\d\d:\d\d \(LOS\)$/.test(txt('rf-src-sv')),txt('rf-src-sv'));
for(const fr of ['f5 00 3b f3','f5 01 ad 1f','f5 01 8e 05']){T.range(fr);await wait(20);}
T.range('f5 2c 51 05');await wait(30);
chk('the five confirmed rangings in order; the last one wins: 1134.5 m +5°',J('S.dist_m')===1134.5&&val('sv-angle')==='5'&&J('RFS[0].n')===5);
chk('panel: last ranging line and the unit row',/Last ranging: 1134\.5 m at \+5° from Titan 3K/.test(txt('rf-last'))&&/1134\.5 m · \+5°/.test(rows()[0]),txt('rf-last'));
const negs=[];for(const fr of ['f5 00 3b f3','f5 01 ad 1f']){T.range(fr);await wait(20);negs.push(val('sv-angle'));}
chk('signed angles: −13°, +31°',negs.join()==='-13,31');
T.range('aa 01 02');T.range('f5 00 00 05');T.range('f5 00 64');await wait(20);
chk('junk / zero-distance / short frames ignored (session still 42.9 m)',J('S.dist_m')===42.9&&J('RFS[0].n')===7);
// ── override ─────────────────────────────────────────────────────────────────────────────────────
$('sv-angle').value='3';$('sv-angle').dispatchEvent(new w.Event('input',{bubbles:true}));await wait(20);
chk('typing an angle → source line says typed, keeps the last ranging for reference',/^Distance \/ angle typed — last ranging 42\.9 m at \+31° \(Titan 3K/.test(txt('rf-src-sv'))&&$('rf-src-sv').classList.contains('man'),txt('rf-src-sv'));
T.range('f5 03 e8 02');await wait(20);
chk('the next ranging takes over again (100.0 m +2°)',J('S.dist_m')===100&&val('sv-angle')==='2'&&/^Distance \+ angle from Titan 3K/.test(txt('rf-src-sv')));
w.eval(`gotoPage('home')`);await wait(30);
chk('Home: distance and angle inputs filled, source line shown',val('home-dist')==='100'&&val('home-angle')==='2'&&/from Titan 3K/.test(txt('rf-src-home')));
// ── switch Off ───────────────────────────────────────────────────────────────────────────────────
w.eval(`gotoPage('sensors');rfSetFill(false)`);await wait(20);
T.range('f5 07 d0 00');await wait(20);
chk('switch Off: ranging shown on the panel but the session keeps 100 m',J('S.dist_m')===100&&/200\.0 m at 0°.*not filled: switch is off/.test(txt('rf-last')),txt('rf-last'));
const snap=w.eval('snapshotJSON()');w.eval(`APP.rfFill=true;applySnapshot(JSON.parse(${JSON.stringify(snap)}));rfRender();`);
chk('switch Off survives a restart',J('APP.rfFill')===false&&$('rf-fill-off').classList.contains('on'));
w.eval('rfSetFill(true)');
// ── imperial ─────────────────────────────────────────────────────────────────────────────────────
w.eval(`setUnit('range','yd')`);T.range('f5 03 e8 02');await wait(30);
chk('imperial: 100.0 m shown as 109.4 yd; session stays metres',J('S.dist_m')===100&&/109\.4 yd/.test(txt('rf-last')),txt('rf-last'));
w.eval(`setUnit('range','m')`);
// ── second unit ──────────────────────────────────────────────────────────────────────────────────
const H=unit('Helix 1.5K','idH',72);queue.push(H);await w.eval('rfAdd()');await wait(100);
H.range('f5 00 2e f0');await wait(30);
chk('Helix alongside the Titan: both listed, battery 72 %, its ranging fills (4.6 m −16°)',rows().length===2&&/72%/.test(rows()[1])&&J('S.dist_m')===4.6&&val('home-angle')==='-16'&&/from Helix 1\.5K/.test(txt('rf-last')),rows().join(' | '));
T.range('f5 00 fa ff');await wait(20);
chk('…the Titan still works next to it (25.0 m)',J('S.dist_m')===25);
// ── disconnect / reconnect ───────────────────────────────────────────────────────────────────────
T.gatt.disconnect();await wait(20);
chk('Titan drops: marked disconnected, last ranging kept, Helix unaffected',/Titan 3K.*disconnected/.test(rows()[0])&&/Connected: Helix 1\.5K/.test(txt('rf-status')),rows().join(' | '));
H.range('f5 00 64 01');await wait(20);
chk('…Helix still fills (10.0 m)',J('S.dist_m')===10);
queue.push(T);await w.eval('rfAdd()');await wait(100);T.range('f5 01 2c 00');await wait(20);
chk('Titan reconnects without a reload: one row per unit, 30.0 m fills',rows().length===2&&J('S.dist_m')===30&&rows().filter(r=>/Titan 3K/.test(r)).length===1,rows().join(' | '));
await w.eval('rfAdd()');await wait(30);
chk('chooser cancelled: nothing changes, no error',rows().length===2);
// ── honesty / safety ─────────────────────────────────────────────────────────────────────────────
chk('ZERO writes to either rangefinder; no GATT collisions',T.writes+H.writes===0&&T.collisions+H.collisions===0);
const src=w.eval('[rfParse,rfAdd,rfFrame,rfFill,rfSetFill,rfDrop,rfOnDisconnect,rfStatus,rfRender,rfSrcRender].map(String).join("")');
chk('no HTML sinks in the driver',!/innerHTML|insertAdjacentHTML|outerHTML|document\.write/.test(src));
w.eval(`RFS.forEach(d=>d.link.disconnect())`);
chk('ZERO uncaught errors',w.errs.length===0,w.errs.join(' | '));
console.log(`\nPASS ${pass}   FAIL ${fail}`);process.exit(fail?1:0);
})().catch(e=>{console.error('TEST CRASH:',e);process.exit(1);});
