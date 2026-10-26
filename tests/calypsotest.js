// Calypso connect test (V1.27.1, LAB-02 port): per-unit :DU unlock token, fallback through known
// tokens, locked unit message, battery from 0x2A19 instead of :GK field 2, live wind after unlock.
// Simulated units behave like the real ones (HCI snoop + probe logs, 2026-10-26): only their own
// :DU is :AK'd; :CC and the :WU stream stay locked (:NA) until then.
// Usage: node calypsotest.js <app.html>   (needs jsdom; see README.md)
const {JSDOM}=require('jsdom'),fs=require('fs');
const FILE=process.argv[2];
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let pass=0,fail=0;
const chk=(n,ok,extra)=>{console.log((ok?'  PASS  ':'  FAIL  ')+n+(extra?'   '+extra:''));ok?pass++:fail++;};
const T1=':DU,1668647648,A7',T2=':DU,1802347072,AF';

function unit(name,accept,batt){
  const u={name,writes:[],unlocked:false,ls:{},addEventListener(t,f){(this.ls[t]=this.ls[t]||[]).push(f)},fire(t){(this.ls[t]||[]).forEach(f=>f())}};
  const notifier=()=>({ls:[],addEventListener(t,f){this.ls.push(f)},async startNotifications(){},emit(bytes){const v=new DataView(new Uint8Array(bytes).buffer);this.ls.forEach(f=>f({target:{value:v}}))}});
  const fff2=Object.assign(notifier(),{uuid:'0000fff2-0000-1000-8000-00805f9b34fb',properties:{notify:true}});
  const em=s=>setTimeout(()=>fff2.emit(Array.from(Buffer.from(s))),15);
  const fff1={uuid:'0000fff1-0000-1000-8000-00805f9b34fb',properties:{write:true,writeWithoutResponse:true},
    async writeValueWithoutResponse(b){const s=Buffer.from(b).toString().replace(/\r/g,'');u.writes.push(s);
      if(s.startsWith(':DU')){if(accept&&s===accept){u.unlocked=true;em(':AK\r');}else em(':NA\r');}
      else if(s.startsWith(':CC'))em(u.unlocked?':CC,6,0,----,B6\r':':NA\r');
      else if(s.startsWith(':GK')){em(':GK,1117338552\r');setTimeout(()=>fff2.emit(Array.from(Buffer.from(',BD\r'))),30);}
      else if(s.startsWith(':VR'))em(':VR,001.023, Apr 29 2025,DB\r');
      else em(':AK\r');}};
  const b2a19=Object.assign(notifier(),{properties:{read:true,notify:true},async readValue(){return new DataView(new Uint8Array([batt]).buffer)}});
  const server={async getPrimaryServices(){return[]},
    async getPrimaryService(id){if(id===0x180F){if(batt==null)throw new Error('no battery service');return{getCharacteristic:async()=>b2a19};}
      return{getCharacteristics:async()=>[fff1,fff2]};}};
  u.gatt={connected:false,async connect(){this.connected=true;return server},disconnect(){this.connected=false;u.fire('gattserverdisconnected')}};
  u.fff2=fff2;u.batt=b2a19;
  return u;
}
async function open(dev){
  const dom=new JSDOM(fs.readFileSync(FILE,'utf8'),{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',
    beforeParse(w){
      w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:(t,k)=>k==='measureText'?()=>({width:10}):()=>{}});
      Object.defineProperty(w.navigator,'bluetooth',{value:{requestDevice:async()=>dev}});
      w.alert=()=>{};
    }});
  const w=dom.window;w.errs=[];w.addEventListener('error',e=>w.errs.push(e.message));
  await wait(700);return w;
}
const txt=(w,id)=>w.document.getElementById(id).textContent;
const du=u=>u.writes.filter(s=>s.startsWith(':DU'));
async function connect(u){const w=await open(u);await w.eval('toggleBLE()');await wait(200);return w;}
async function stream(w,u,line,n=3){for(let i=0;i<n;i++){if(u.unlocked)u.fff2.emit(Array.from(Buffer.from(line)));await wait(60);}}

(async()=>{
console.log('=== CALYPSO CONNECT TEST: '+FILE+' ===');

// 1. Unit #2 (was: connects, no wind) — own token only, live wind, battery from 2A19 not 'BD'.
let u=unit('WDOT-E2896A',T2,87),w=await connect(u);
chk('unit #2: sends only its own :DU token',du(u).join('|')===T2,du(u).join('|'));
chk('unit #2: rest of handshake follows the unlock in order',u.writes.join('|')===[T2,':GK',':PS,1,1,9F',':WU,5',':WU,6',':VR',':CC,6,86'].join('|'),u.writes.join('|'));
await stream(w,u,':WU,2,4.2,3.8,177.0,5F\r');
chk('unit #2: live wind on the Sensors card',txt(w,'ble-dir-val')==='177°'&&parseFloat(txt(w,'ble-speed'))===4.2,txt(w,'ble-speed')+' '+txt(w,'ble-dir-val'));
chk('unit #2: battery from 0x2A19 (87%), not :GK field 2 ("BD")',txt(w,'ble-batt')==='87%',txt(w,'ble-batt'));
u.batt.emit([86]);
chk('unit #2: battery notifications update the card',txt(w,'ble-batt')==='86%');
chk('unit #2: status connected, not locked',/Connected: WDOT-E2896A$/.test(txt(w,'ble-status-text')),txt(w,'ble-status-text'));
chk('unit #2: no uncaught errors',w.errs.length===0,w.errs.join('; '));
w.close();

// 2. Unit #1 — unchanged behaviour: its own (original) token, wind as before.
u=unit('WDOT-B1F9A6',T1,64);w=await connect(u);
chk('unit #1: sends only its own (original) token',du(u).join('|')===T1);
await stream(w,u,':WU,2,3.4,3.1,270.0,5F\r');
chk('unit #1: live wind as before',txt(w,'ble-dir-val')==='270°');
w.close();

// 3. Unlisted unit that takes a known token: fallback unlocks it.
u=unit('WDOT-123456',T2,50);w=await connect(u);
chk('unlisted unit: tries known tokens until :AK',du(u).join('|')===T1+'|'+T2,du(u).join('|'));
await stream(w,u,':WU,2,1.0,1.0,90.0,5F\r');
chk('unlisted unit: streams after fallback unlock',txt(w,'ble-dir-val')==='90°');
w.close();

// 4. No known token works: stop, say why, no handshake or keepalive spam.
u=unit('WDOT-FFFFFF',null,50);w=await connect(u);
chk('locked unit: every known token tried once',du(u).length===2&&!u.unlocked);
chk('locked unit: no handshake or keepalive sent',u.writes.every(s=>s.startsWith(':DU')),u.writes.join('|'));
chk('locked unit: status says locked, with the capture hint',/locked$/.test(txt(w,'ble-status-text'))&&/isn't unlocked for SEN yet/.test(txt(w,'ble-service-list')));
await wait(10300);
chk('locked unit: still no keepalive after 10 s',u.writes.every(s=>s.startsWith(':DU')));
w.eval('toggleBLE()');await wait(50);
chk('locked unit: Disconnect still works',txt(w,'ble-status-text')==='Disconnected');
w.close();

// 5. No battery service: wind still works, battery shows a dash.
u=unit('WDOT-B1F9A6',T1,null);w=await connect(u);
await stream(w,u,':WU,2,2.0,2.0,45.0,5F\r');
chk('no battery service: wind still live, battery "—"',txt(w,'ble-dir-val')==='45°'&&txt(w,'ble-batt')==='—',txt(w,'ble-batt'));
chk('no uncaught errors in any run',w.errs.length===0,w.errs.join('; '));
w.close();

console.log(`\nPASS ${pass}   FAIL ${fail}`);process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
