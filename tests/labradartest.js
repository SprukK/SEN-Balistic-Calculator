// LabRadar LX live test (V2.10.0; driver graduated from Lab V1.7.0). A simulated LabRadar behaves like the real
// unit: it checks the CRC of every frame Main writes (CRC written here independently: MSB-first form of the
// reflected CCITT CRC), ignores commands before the enable byte, rejects overlapping GATT operations as Web
// Bluetooth does, accepts only the real app key, answers status polls (battery, armed flag) and splits long
// frames into 20-byte notifications. It replays the owner's real shot frames (30 Oct: 998.29 / 997.86 / 999.69
// ft/s; 31 Oct live: 1004.7 fps) and the unit-button arm / stop events.
// Checks: chooser, start sequence order, key accepted → status poll every 10 s, battery + armed + series shown,
// each shot's V0 appended live to the CALC-07 shot string (typed string replaced, LabRadar string continued),
// mass / PF / V@d never used, bad-CRC frame dropped, key refused → no poll + message, disconnect stops the poll,
// silent link flagged, ZERO commands other than 06 / 1A / 01, no HTML sinks.
// Usage: node labradartest.js <app.html>   (needs jsdom; see README.md)
const {JSDOM}=require('jsdom'),fs=require('fs');
const FILE=process.argv[2];
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let pass=0,fail=0;
const chk=(n,ok,extra)=>{console.log((ok?'  PASS  ':'  FAIL  ')+n+(extra?'   '+extra:''));ok?pass++:fail++;};
const hex=s=>s.replace(/\s/g,'').match(/../g).map(x=>parseInt(x,16));
const SVC='da2b84f1-6279-48de-bdc0-afbea0226079',CMD='bf03260c-7205-4c25-af43-93b1c299d159',EVT='18cda784-4bd3-4370-85bb-bfed91ec86af',EN='a87988b9-694c-479c-900e-95dfa6c00a24';
const rev=(x,n)=>{let r=0;for(let i=0;i<n;i++)if(x&(1<<i))r|=1<<(n-1-i);return r;};
function crcRef(bytes){let c=rev(0xBEEF,16);for(const b of bytes){c^=rev(b,8)<<8;for(let i=0;i<8;i++)c=(c&0x8000)?((c<<1)^0x1021)&0xffff:(c<<1)&0xffff;}return rev(c,16)^0xffff;}
const KEY=hex('72d564ce01f0e26a7b323b6c9c30a20a865b444908815e509c653c7f3b897f6f1134126c750d7ff1798577a156a02e2bf985523fa2a3c8e6a288f0e109524fe9');
const SHOTS=['012000000000004241c80000bf800000bf800000bf800000bf800000439823a043874f86bf800000bf800000bf800000bf80000041b3b4523fd1d8443cf548db3c7831810000390100012497',
  '012000000000004241c80000bf800000bf800000bf800000bf8000004398130c43877e2fbf800000bf800000bf800000bf80000041b3f24a3fd1d8443cfa10383c7c9aca00003902000160ea',
  '012000000000004241c80000bf800000bf800000bf800000bf80000043985a7343885483bf800000bf800000bf800000bf80000041b50ef03fd1d8443d03d11e3c84245e0000390300019f8f',
  '012000000000004241c80000bf800000bf800000bf800000bf800000439 91ea5 4388894d bf800000bf800000bf800000bf800000 41b5550c 3fd1d844 3cff4658 3c7f6d41 0000390400 01b8ee'].map(hex);
const FPS=[998.29,997.86,999.69,1004.7];
function labradar(id,acceptKey){
  const u={name:'LLXA001Y6EP',id,cmds:[],bad:0,enabled:false,busy:false,collisions:0,battery:27,armed:0,ls:{},
    addEventListener(t,f){(this.ls[t]=this.ls[t]||[]).push(f)},fire(t){(this.ls[t]||[]).forEach(f=>f())}};
  const gatt=async fn=>{if(u.busy){u.collisions++;throw new Error('GATT operation already in progress.');}u.busy=true;try{await wait(5);return await fn();}finally{u.busy=false;}};
  const evt={uuid:EVT,properties:{notify:true,indicate:true,read:true},ls:[],addEventListener(t,f){this.ls.push(f)},startNotifications(){return gatt(async()=>{})},
    emit(bytes){const v=new DataView(new Uint8Array(bytes).buffer);this.ls.forEach(f=>f({target:{value:v}}))}};
  const frame=(cmd,seq,p)=>{const f=[1,cmd,seq>>8,seq&255,0,0,(p.length>>8)&255,p.length&255,...p];const c=crcRef(f);return[...f,c>>8,c&255];};
  const send=f=>setTimeout(()=>{for(let i=0;i<f.length;i+=20)evt.emit(f.slice(i,i+20));},10);
  const cmd={uuid:CMD,properties:{write:true},writeValue(b){return gatt(async()=>{const a=Array.from(new Uint8Array(b.buffer||b));
    if(a[0]!==1||crcRef(a.slice(0,-2))!==((a[a.length-2]<<8)|a[a.length-1])){u.bad++;return;}
    const c=a[1],seq=(a[2]<<8)|a[3],p=a.slice(8,-2);u.cmds.push(c);if(!u.enabled)return;
    if(c===0x06)send(frame(0x86,seq,hex('00000000000000000104032001000020')));
    if(c===0x1a){const ok=acceptKey&&p.length===64&&p.every((x,i)=>x===KEY[i]);send(frame(0x9a,seq,[ok?0:1]));if(ok)setTimeout(()=>send(frame(0x27,0,[0,0x39])),20);}
    if(c===0x01){const st=new Array(26).fill(0);st[1]=u.battery;st[3]=u.armed;send(frame(0x81,seq,st));}});}};
  const en={uuid:EN,properties:{read:true,write:true},writeValue(b){return gatt(async()=>{const a=Array.from(new Uint8Array(b.buffer||b));if(a.length===1&&a[0]===1)u.enabled=true;});}};
  const server={async getPrimaryServices(){return[]},async getPrimaryService(s){if(String(s).toLowerCase()!==SVC)throw new Error('not found');return{getCharacteristics:async()=>[cmd,evt,en]};}};
  u.gatt={connected:false,async connect(){this.connected=true;return server},disconnect(){this.connected=false;u.fire('gattserverdisconnected')}};
  u.event=(c,p)=>send(frame(c,0,p));u.raw=f=>send(f);return u;
}
let queue=[],lastOpts=null;
function open(){
  const dom=new JSDOM(fs.readFileSync(FILE,'utf8'),{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',
    beforeParse(w){Object.defineProperty(w,'innerWidth',{configurable:true,value:412});Object.defineProperty(w,'innerHeight',{configurable:true,value:915});
      w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:(t,k)=>k==='measureText'?()=>({width:10}):()=>{}});w.scrollTo=()=>{};
      Object.defineProperty(w.navigator,'bluetooth',{value:{requestDevice:async o=>{lastOpts=o;const d=queue.shift();if(!d){const e=new Error('cancelled');e.name='NotFoundError';throw e;}return d;}}});w.alert=()=>{};w.confirm=()=>true;}});
  const w=dom.window;w.errs=[];w.addEventListener('error',e=>w.errs.push(e.message));return w;
}
(async()=>{
console.log('=== LABRADAR LIVE TEST: '+FILE+' ===');
const w=open();await wait(700);
const J=e=>JSON.parse(w.eval('JSON.stringify('+e+')'));
const $=id=>w.document.getElementById(id),txt=id=>$(id).textContent;
w.eval(`Bus.setRifle(DB.rifles.find(x=>/\\.25/.test(x.name)).id);Bus.setProj(DB.projectiles.find(p=>/^Altaros ATP Queen/.test(p.name)).id);Bus.setWx('cur',DB.weathers[0].id);Bus.setWx('zero',DB.weathers[0].id);Bus.notify();gotoPage('sensors');`);
chk('Sensors: LabRadar panel above the shot string, not connected',!!$('lr-panel')&&txt('lr-status')==='Not connected'&&$('lr-panel').compareDocumentPosition($('ch-str'))&4);
// a typed string already there
$('ch-str').value='280.1 281.2';w.eval('chReadString()');
const L=labradar('idL',true);queue.push(L);await w.eval('lrConnect()');await wait(300);
chk('chooser: LLX name prefix + LabRadar service',lastOpts.filters.some(f=>f.namePrefix==='LLX')&&lastOpts.filters.some(f=>f.services&&f.services.includes(SVC))&&lastOpts.optionalServices.includes(SVC));
chk('start sequence: enable byte first, then 06, 1A (real key), then status 01; every frame CRC-valid, no collisions',L.enabled&&L.cmds.slice(0,3).join()==='6,26,1'&&L.bad===0&&L.collisions===0,L.cmds.join(',')+' bad '+L.bad+' coll '+L.collisions);
chk('status: key accepted, series 57, battery 27 %, radar stopped',/app key accepted/.test(txt('lr-status'))&&txt('lr-ser')==='series 57'&&txt('lr-batt')==='27'&&txt('lr-arm')==='stopped'&&/Ready: arm the LabRadar/.test(txt('lr-note')),txt('lr-status')+' | '+txt('lr-note'));
L.event(0x25,[1]);await wait(60);
chk('unit-button arm (event 25 01) → armed',txt('lr-arm')==='armed');
for(const f of SHOTS.slice(0,3)){L.raw(f);await wait(60);}
const c=()=>J('chClean(APP.chronoStr)');
const ms=fps=>Math.round(fps*0.3048*100)/100;
chk('three real shots: V0 appended live; the typed string replaced by a LabRadar string',c().src==='labradar'&&c().shots.length===3&&c().shots.every((v,i)=>Math.abs(v-FPS[i]*0.3048)<0.005),JSON.stringify(c().shots));
chk('…string named after the unit and series, today\'s date',/^LabRadar LLXA001Y6EP · series 57$/.test(c().name)&&c().date===new Date().toISOString().slice(0,10));
chk('…shot string results show "LabRadar live · 3 shots", mean / ES / SD',/LabRadar live/.test(txt('ch-res'))&&/3 shots/.test(txt('ch-res'))&&/Mean/.test(txt('ch-res')));
chk('…last V0 tile 304.7 m/s, textarea follows',txt('lr-v0')==='304.7'&&$('ch-str').value.split(' ').length===3,txt('lr-v0'));
chk('only V0 kept: no mass, PF or V@25 anywhere in the stored string',!/1\.639|25\.3|22\.4|270\.6|887/.test(JSON.stringify(J('APP.chronoStr'))));
const broken=SHOTS[3].slice();broken[30]^=0xff;L.raw(broken);await wait(60);
chk('a shot frame with a broken CRC is dropped',c().shots.length===3);
L.raw(SHOTS[3]);await wait(60);
chk('31 Oct live shot: 1004.7 fps = 306.23 m/s appended (4 shots)',c().shots.length===4&&Math.abs(c().shots[3]-306.24)<0.01,String(c().shots[3]));
L.event(0x25,[0]);await wait(60);
chk('unit-button stop (event 25 00) → stopped',txt('lr-arm')==='stopped');
// status poll every 10 s, battery + armed from 0x81
L.battery=20;L.armed=1;
const n01=L.cmds.filter(x=>x===1).length;
await w.eval('new Promise(r=>setTimeout(r,10100))');await wait(80);
chk('status poll every 10 s: battery 20 %, armed flag from 0x81',L.cmds.filter(x=>x===1).length===n01+1&&txt('lr-batt')==='20'&&txt('lr-arm')==='armed');
chk('the app sends only 06 / 1A / 01',L.cmds.every(x=>[6,26,1].includes(x)));
// exclude + use mean still work on a LabRadar string
w.eval('chToggle(0)');
chk('CALC-07 tools work on it: exclude shot 1 → 3 kept',/1 excluded/.test(txt('ch-res')));
// disconnect → poll stops, reconnect continues the same LabRadar string
L.gatt.disconnect();await wait(30);
chk('disconnect: status Disconnected, poll stopped',txt('lr-status')==='Disconnected'&&J('LR.poll')===null);
queue.push(L);await w.eval('lrConnect()');await wait(300);L.raw(SHOTS[0]);await wait(60);
chk('reconnect without reload: same LabRadar string continued (5 shots)',c().shots.length===5&&c().src==='labradar',c().shots.length+' '+c().src);
// silent link
w.eval('LR.lastRx=Date.now()-30000;lrRender()');
chk('no reply for 30 s → "link silent" shown',/link silent/.test(txt('lr-note')),txt('lr-note'));
// key refused
const w2=open();await wait(700);
const R=labradar('idR',false);queue.push(R);await w2.eval('lrConnect()');await wait(300);
const t2=id=>w2.document.getElementById(id).textContent;
chk('a unit that refuses the key: "refused" shown, message, no status poll',/app key refused/.test(t2('lr-status'))&&/refused the app key/.test(t2('lr-note'))&&!R.cmds.includes(1),t2('lr-status'));
await w2.eval('lrConnect()');await wait(30);
chk('chooser cancelled → nothing breaks',w2.errs.length===0);
const src=w.eval('[lrCrc,lrFrame,lrTake,lrV0,lrSend,lrToggle,lrConnect,lrRx,lrShot,lrStop,lrOnDisconnect,lrUi,lrRender].map(String).join("")');
chk('no HTML sinks in the driver',!/innerHTML|insertAdjacentHTML|outerHTML|document\.write/.test(src));
w.eval('LR&&LR.link.disconnect()');w2.eval('LR&&LR.link.disconnect()');
const errs=[...w.errs,...w2.errs];
chk('ZERO uncaught errors',errs.length===0,errs.join(' | '));
console.log(`\nPASS ${pass}   FAIL ${fail}`);process.exit(fail?1:0);
})().catch(e=>{console.error('TEST CRASH:',e);process.exit(1);});
