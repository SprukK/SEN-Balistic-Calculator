// Multi-Calypso + SenBle test (V2.0.0, CORE-07): the transport layer and any number of Calypsos at once.
// Simulated units accept only their own :DU token (as the real ones do) and reject overlapping GATT
// operations (as Web Bluetooth does). Two units connect, unlock with their own codes and stream together,
// each with its own wind buffer and battery; the "feeds session" unit drives the session wind and can be
// switched; keepalive goes to both; overlapping writes are queued; a locked third unit sits alongside;
// disconnecting the session unit hands over to the other; text only.
// Usage: node multicaltest.js <app.html>   (needs jsdom; see README.md)
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
    async getPrimaryService(sid){if(sid===0x180F){if(batt==null)throw new Error('none');return{getCharacteristic:async()=>b2a19};}return{getCharacteristics:async()=>[fff1,fff2]};}};
  u.gatt={connected:false,async connect(){this.connected=true;return server},disconnect(){this.connected=false;u.fire('gattserverdisconnected')}};
  u.fff2=fff2;u.fff1=fff1;u.batt=b2a19;return u;
}
const queue=[];
const dom=new JSDOM(fs.readFileSync(FILE,'utf8'),{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',
  beforeParse(w){w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:(t,k)=>k==='measureText'?()=>({width:10}):()=>{}});
    Object.defineProperty(w.navigator,'bluetooth',{value:{requestDevice:async()=>queue.shift()}});w.alert=()=>{};}});
const w=dom.window;w.errs=[];w.addEventListener('error',e=>w.errs.push(e.message));
const J=e=>JSON.parse(w.eval('JSON.stringify('+e+')'));
const txt=id=>w.document.getElementById(id).textContent;
const rows=()=>[...w.document.querySelectorAll('#cal-units .cal-unit')].map(r=>r.textContent);
const wu=(s,d)=>`:WU,2,${s},9.9,${d},5F\r`;
async function stream(u,line,n=3){for(let i=0;i<n;i++){u.fff2.emit(Array.from(Buffer.from(line)));await wait(40);}}

(async()=>{
console.log('=== MULTI-CALYPSO + SenBle TEST: '+FILE+' ===');
await wait(700);
const A=unit('WDOT-B1F9A6',T1,64,'idA'),B=unit('WDOT-E2896A',T2,87,'idB'),C=unit('WDOT-0A0A0A',null,50,'idC');
queue.push(A);await w.eval('toggleBLE()');await wait(250);
await stream(A,wu(3.0,90));
chk('unit A: own token, live, feeds the session',J('CALS.length')===1&&A.writes.filter(s=>s.startsWith(':DU')).join()===T1&&/feeds session/.test(rows()[0])&&J('bleLastSpd')===3);
chk('"+ Connect another Calypso" offered once a unit is connected',w.document.getElementById('cal-add').style.display==='');
queue.push(B);const addB=w.eval('calAdd()');await wait(100);
chk('V2.0.1: while B activates, the status line still shows the session unit A',txt('ble-status-text')==='Connected: WDOT-B1F9A6',txt('ble-status-text'));
await addB;await wait(150);
await stream(B,wu(5.0,270),4);await stream(A,wu(3.2,92),2);
chk('unit B: own token, both units listed and live together',J('CALS.length')===2&&B.writes.filter(s=>s.startsWith(':DU')).join()===T2&&rows().length===2&&rows().every(r=>!/signal lost|activating/.test(r)),rows().join(' | '));
chk('session wind still from A (B streams alongside)',J('bleLastSpd')===3.2&&J('bleLastDir')===92&&/WDOT-B1F9A6.*feeds session/.test(rows()[0])&&!/feeds session/.test(rows()[1]));
chk('each unit keeps its own wind buffer',J('CALS[0].buf.length')===5&&J('CALS[1].buf.length')===4&&J('wavgBuf===CALS[0].buf'));
chk('battery per unit (A 64 %, B 87 %)',/64%/.test(rows()[0])&&/87%/.test(rows()[1]),rows().join(' | '));
// Switch the session unit.
const opt0=w.document.querySelector('#ble-avg-win option'),optH=w.document.querySelector('#home-avg-win option');
await stream(A,wu(3.2,92),3);await stream(B,wu(5.0,270),3);
chk('V2.0.1: readings don\'t rebuild the average-window pickers (no flicker)',opt0&&optH&&w.document.querySelector('#ble-avg-win option')===opt0&&w.document.querySelector('#home-avg-win option')===optH);
w.document.querySelectorAll('#cal-units input[type=radio]')[1].click();await wait(20);
chk('V2.0.1: status line follows the radio to B',txt('ble-status-text')==='Connected: WDOT-E2896A'&&txt('ble-service-list')==='',txt('ble-status-text'));
w.eval('setWavgWin(900)');
chk('V2.0.1: changing the window still updates both pickers',w.document.getElementById('ble-avg-win').value==='900'&&w.document.getElementById('home-avg-win').value==='900');
w.eval("Bus.setWind(0,0,'manual');useBLEWind()");
chk('radio → B feeds the session: Sensors shows B, session wind = B\'s average',J('calPrimaryId')==='idB'&&J('wavgBuf===CALS[1].buf')&&J('S.wind.speed')>4.9&&J('S.wind.dir')===270&&parseFloat(txt('ble-speed'))===5,J('S.wind'));
// Keepalive to both, overlapping writes queued.
const ccA=A.writes.filter(s=>s.startsWith(':CC')).length,ccB=B.writes.filter(s=>s.startsWith(':CC')).length;
await wait(10300);
chk('keepalive :CC every 10 s to both units',A.writes.filter(s=>s.startsWith(':CC')).length>ccA&&B.writes.filter(s=>s.startsWith(':CC')).length>ccB);
await w.eval(`(async()=>{const d=CALS[0];await Promise.all([1,2,3,4].map(i=>d.link.write(d.fff1,calypsoBytes(':VR'))));})()`);await wait(50);
chk('SenBle queues overlapping GATT operations (device never sees two at once)',A.collisions===0&&B.collisions===0&&A.writes.filter(s=>s===':VR').length>=5,'collisions '+A.collisions+'/'+B.collisions);
// Locked third unit alongside.
queue.push(C);await w.eval('calAdd()');await wait(2000);
chk('a locked unit is listed as locked; session unit unaffected',rows().length===3&&/locked/.test(rows()[2])&&J('calPrimaryId')==='idB'&&!C.writes.some(s=>s.startsWith(':CC')),rows()[2]);
// Disconnect the session unit → hand over.
B.gatt.disconnect();await wait(30);
chk('session unit disconnects → the other live unit takes over',J('CALS.length')===2&&J('calPrimaryId')==='idA'&&/Connected: WDOT-B1F9A6/.test(txt('ble-status-text'))&&J('wavgBuf===CALS[0].buf'));
C.gatt.disconnect();A.gatt.disconnect();await wait(30);
chk('all disconnected → empty list, status Disconnected, live panel hidden',J('CALS.length')===0&&txt('ble-status-text')==='Disconnected'&&w.document.getElementById('ble-live-wrap').style.display==='none'&&rows().length===0);
const html=fs.readFileSync(FILE,'utf8'),seg=html.slice(html.indexOf('CORE-07 (V2.0.0)'),html.indexOf('const lab2='));
chk('no innerHTML in SenBle / Calypso driver',seg.length>2000&&!/innerHTML/.test(seg));
chk('no navigator.bluetooth outside SenBle',(()=>{const a=html.indexOf('const SenBle={'),b=html.indexOf('\n};',a);return a>0&&!/navigator\.bluetooth/.test(html.slice(0,a).replace(/\/\*[\s\S]*?\*\//g,'')+html.slice(b));})());
chk('ZERO uncaught errors',w.errs.length===0,w.errs.slice(0,3).join(' / '));
console.log('\nPASS '+pass+'   FAIL '+fail);process.exit(fail?1:0);
})().catch(e=>{console.error('TEST CRASH:',e);process.exit(1);});
