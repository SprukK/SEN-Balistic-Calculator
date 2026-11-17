// Low-impact fixes (V2.18.1, review release R7) that need a page:
// P-16 a pellet gets no Sg on the Stability tab even with a typed C; a dope card whose rifle is gone uses the fallback
//      zero conditions, never the active rifle's · D-19 data from a newer SEN schema is shown read-only, never saved ·
// B-10 a GATT operation that never settles is cut off (10 s, owner ruling) and the device queue moves on ·
// B-17 on iPhone / iPad the Bluetooth Connect buttons become a one-line note.
// (P-14 / P-15 / P-18 and the physics test gaps are in runtests.js; D-20 in drivetest.js.)
// Usage: node lowtest.js <app.html>   (needs jsdom + fake-indexeddb; see README.md)
const {JSDOM}=require('jsdom'),fs=require('fs');
const {IDBFactory,IDBKeyRange}=require('fake-indexeddb');
const FILE=process.argv[2];
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let pass=0,fail=0;
const chk=(n,ok,extra)=>{console.log((ok?'  PASS  ':'  FAIL  ')+n+(extra?'   '+extra:''));ok?pass++:fail++;};
const all=[];
const T2=':DU,1802347072,AF';
function unit(name,accept){   // the calypsotest / readtest simulator: own :DU only, chunked FFF2
  const u={name,writes:[],unlocked:false,ls:{},addEventListener(t,f){(this.ls[t]=this.ls[t]||[]).push(f)},fire(t){(this.ls[t]||[]).forEach(f=>f())}};
  const fff2={uuid:'0000fff2-0000-1000-8000-00805f9b34fb',properties:{notify:true},ls:[],addEventListener(t,f){this.ls.push(f)},async startNotifications(){},
    emit(bytes){const v=new DataView(new Uint8Array(bytes).buffer);this.ls.forEach(f=>f({target:{value:v}}))}};
  const em=s=>setTimeout(()=>fff2.emit(Array.from(Buffer.from(s))),15);
  const fff1={uuid:'0000fff1-0000-1000-8000-00805f9b34fb',properties:{write:true,writeWithoutResponse:true},
    async writeValueWithoutResponse(b){const s=Buffer.from(b).toString().replace(/\r/g,'');
      u.writes.push(s);
      if(s.startsWith(':DU')){if(accept&&s===accept){u.unlocked=true;em(':AK\r');}else em(':NA\r');}
      else if(s.startsWith(':CC'))em(u.unlocked?':CC,6,0,----,B6\r':':NA\r');else em(':AK\r');}};
  const server={async getPrimaryServices(){return[]},async getPrimaryService(id){if(id===0x180F)throw new Error('no battery');return{getCharacteristics:async()=>[fff1,fff2]};}};
  u.gatt={connected:false,async connect(){this.connected=true;return server},disconnect(){this.connected=false;u.fire('gattserverdisconnected')}};
  return u;
}
async function open({idb,dev,ios,fastGatt}={}){
  const dom=new JSDOM(fs.readFileSync(FILE,'utf8'),{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/?numfmt=point',
    beforeParse(w){if(idb){w.indexedDB=idb;w.IDBKeyRange=IDBKeyRange;}
      Object.defineProperty(w,'innerWidth',{configurable:true,value:412});Object.defineProperty(w,'innerHeight',{configurable:true,value:915});
      if(dev)Object.defineProperty(w.navigator,'bluetooth',{value:{requestDevice:async()=>dev}});
      if(ios)Object.defineProperty(w.navigator,'userAgent',{configurable:true,get:()=>'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'});
      if(fastGatt){const st=w.setTimeout.bind(w);w.setTimeout=(f,ms,...a)=>st(f,ms===10000?120:ms,...a);}   // the 10 s GATT limit, shortened for the test
      w.alerts=[];w.alert=m=>w.alerts.push(String(m));w.confirm=()=>true;w.scrollTo=()=>{};w.print=()=>{};
      w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:(t,k)=>k==='measureText'?()=>({width:10}):()=>{}});}});
  const w=dom.window;w.errs=[];w.addEventListener('error',e=>w.errs.push(e.message));await wait(900);all.push(w);return w;
}
const J=(w,e)=>JSON.parse(w.eval('JSON.stringify('+e+')'));
const $=(w,id)=>w.document.getElementById(id);
const warn=w=>$(w,'store-warn').style.display!=='none'?$(w,'store-warn').textContent:'';
const idbPut=(idb,k,v)=>new Promise((res,rej)=>{const r=idb.open('sen_main',1);r.onupgradeneeded=()=>r.result.createObjectStore('kv');
  r.onsuccess=()=>{const tx=r.result.transaction('kv','readwrite');tx.objectStore('kv').put(v,k);tx.oncomplete=()=>{r.result.close();res();};tx.onerror=()=>rej(tx.error);};});
const idbGet=(idb,k)=>new Promise((res,rej)=>{const r=idb.open('sen_main',1);r.onupgradeneeded=()=>r.result.createObjectStore('kv');
  r.onsuccess=()=>{const tx=r.result.transaction('kv','readonly'),q=tx.objectStore('kv').get(k);tx.oncomplete=()=>{r.result.close();res(q.result);};};});

(async()=>{
console.log('=== LOW-IMPACT FIXES TEST: '+FILE+' ===');

// 1. P-16
{const w=await open();
 w.eval("gotoPage('stab')");
 const set=(id,v)=>{$(w,id).value=v;};
 set('st-diam','6.35');set('st-mass','33.9');set('st-oal','9');set('st-twist','20');set('st-mv','280');set('st-temp','20');set('st-pres','974.8');set('st-c','2.0');
 w.eval("stabKind.pellet=true;calcStab()");
 chk('P-16 pellet with a typed C 2.0 → Sg not computed (drag-stabilised)',/not computed/.test($(w,'st-outs').textContent)&&/drag-stabilised/.test($(w,'st-outs').textContent),$(w,'st-outs').textContent.slice(0,60));
 w.eval("stabKind.pellet=false;calcStab()");
 chk('P-16 … a slug with the same typed C still uses it (override)',!/not computed/.test($(w,'st-outs').textContent)&&J(w,"document.getElementById('st-cmode').textContent").length>0);
 w.eval("Bus.setRifle(DB.rifles.find(r=>/\\.25/.test(r.name)).id);Bus.setProj(DB.projectiles.find(p=>p.name==='Altaros ATP Queen .25').id);Bus.setWx('cur',DB.weathers[0].id);Bus.setWx('zero',DB.weathers[0].id);S.mv=255;Bus.notify();getRifle().zTemp=-10;getRifle().zRH=5;");
 w.eval("newDope();const c=getCard();c.rifleId='gone-rifle';c.mv=255;c.stages=[{id:'s',name:'S',dists:[{id:'t',label:'T',range:100,angle:0,shots:1}]}];");
 const z=J(w,"(()=>{const tr=computeCardTraj(getCard());return tr&&tr.z;})()"),act=J(w,'zeroConds()');
 chk('P-16 a card whose rifle was deleted uses the fallback zero air, not the active rifle\'s (−10 °C / 5 %)',z&&z.temp!==-10&&z.rh!==5&&act.temp===-10,JSON.stringify(z&&{t:z.temp,rh:z.rh}));}

// 2. D-19
{const idb=new IDBFactory();const a=await open({idb});const snap=JSON.parse(a.eval('snapshotJSON()'));a.close();
 snap.schema=Object.assign({},snap.schema,{dopeCards:9});snap.rifles[0].name='FROM A NEWER SEN';const raw=JSON.stringify(snap);await idbPut(idb,'db',raw);
 const b=await open({idb});
 chk('D-19 a snapshot from a newer schema (dopeCards 9): shown, warning names it, read-only',J(b,"DB.rifles[0].name")==='FROM A NEWER SEN'&&/newer SEN version \(dopeCards\)/.test(warn(b))&&J(b,'storeReadOnly')===true,warn(b).slice(0,90));
 b.eval("DB.rifles[0].name='EDITED IN OLD BUILD';saveDB()");await wait(150);
 chk('D-19 … and nothing is written over it',(await idbGet(idb,'db'))===raw);b.close();}

// 3. B-10
{const u=unit('WDOT-E2896A',T2),w=await open({dev:u,fastGatt:true});
 await w.eval('toggleBLE()');await wait(300);
 chk('B-10 setup: unit connected and streaming handshake done',u.unlocked&&J(w,'CALS.length')===1);
 const r=w.eval("(()=>{const d=calPrimary();return d.link.op(()=>new Promise(()=>{})).then(()=>'resolved',e=>e.message);})()");
 const after=w.eval("calPrimary().link.op(()=>Promise.resolve('next ran'))");
 const msg=await r,nx=await after;
 chk('B-10 an operation that never settles is cut off ("timed out (10 s)")',/timed out \(10 s\)/.test(msg),msg);
 chk('B-10 … and the next queued operation still runs',nx==='next ran');
 chk('B-10 the limit is 10 s (owner ruling)',J(w,'GATT_OP_MS')===10000);
 u.gatt.disconnect();await wait(30);}

// 4. B-17
{const w=await open({ios:true});w.eval("gotoPage('sensors')");
 const hidden=['ble-btn','rf-btn','lr-btn'].every(id=>$(w,id).style.display==='none');
 const notes=w.document.querySelectorAll('.ios-ble').length;
 chk('B-17 iPhone: the three Connect buttons are replaced by "enter values by hand" notes',hidden&&notes===3&&/enter values by hand/.test(w.document.querySelector('.ios-ble').textContent));
 chk('B-17 … "+ Connect another Calypso" is gone',!$(w,'cal-add'));
 w.eval("devSheet('wx')");const sh=$(w,'sbox').textContent;
 chk('B-17 the Weather device sheet offers no Connect, says why, keeps Station setup',!/Connect Calypso/.test(sh)&&/enter values by hand/.test(sh)&&/Station setup/.test(sh));
 w.eval('closeSheet()');
 const a=await open();a.eval("gotoPage('sensors')");
 chk('B-17 Android / desktop: Connect buttons unchanged',['ble-btn','rf-btn','lr-btn'].every(id=>$(a,id).style.display!=='none')&&a.document.querySelectorAll('.ios-ble').length===0);}

const errs=all.flatMap(x=>x.errs);chk('ZERO uncaught errors',errs.length===0,errs.slice(0,3).join(' / '));
all.forEach(x=>{try{x.close();}catch(e){}});
console.log(`\nRESULT: PASS ${pass} / FAIL ${fail}`);
process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
