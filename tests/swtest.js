// Service-worker test (V1.25.1, CORE-09): Main and the Lab app share one CacheStorage on
// sprukk.github.io. Activating a new Main release must delete only Main's own old caches
// (sen-ballistics-*, legacy sen-calc-*) and never the Lab probe's (sen-ble-probe-*, sen-lab-*)
// or anything else. Runs the real sw.js in a sandbox with a simulated CacheStorage.
// V2.16.6 D-11/D-12/D-13: navigation fetch — only OK responses cached, cached copy after 3 s without an answer,
// install bypasses the HTTP cache. Simulated fetch / Cache / Request.
// Usage: node swtest.js <sw.js>
const fs=require('fs'),vm=require('vm');
const FILE=process.argv[2]||'../sw.js';
let pass=0,fail=0;
const chk=(n,ok,extra)=>{console.log((ok?'  PASS  ':'  FAIL  ')+n+(extra?'   '+extra:''));ok?pass++:fail++;};

(async()=>{
console.log('=== SERVICE WORKER TEST: '+FILE+' ===');
const store=new Set(['sen-ballistics-v1.24.2','sen-ballistics-v1.25.0','sen-calc-v3','sen-ble-probe-v1.1.1','sen-lab-v1','other-site-cache']);
const handlers={};
const ctx={
  self:{addEventListener:(t,f)=>{handlers[t]=f;},skipWaiting:()=>{},clients:{claim:()=>Promise.resolve()}},
  caches:{keys:async()=>[...store],delete:async k=>store.delete(k),open:async k=>{store.add(k);return{addAll:async()=>{},put:async()=>{}};},match:async()=>undefined},
  location:{origin:'https://sprukk.github.io'},URL,fetch:async()=>{throw new Error('offline');},Request:class{constructor(u,o){this.url=u;this.cache=(o||{}).cache;}},setTimeout,clearTimeout
};
vm.createContext(ctx);vm.runInContext(fs.readFileSync(FILE,'utf8'),ctx);
const CACHE=vm.runInContext('CACHE',ctx);
chk('install and activate handlers registered',typeof handlers.install==='function'&&typeof handlers.activate==='function');

let wait=null;handlers.install({waitUntil:p=>{wait=p;}});await wait;
chk('install creates the current cache',store.has(CACHE),CACHE);
handlers.activate({waitUntil:p=>{wait=p;}});await wait;
const left=[...store].sort();
chk('old Main caches deleted (incl. legacy sen-calc-*)',!store.has('sen-ballistics-v1.24.2')&&!store.has('sen-ballistics-v1.25.0')&&!store.has('sen-calc-v3'),left.join(', '));
chk('current Main cache kept',store.has(CACHE));
chk('Lab probe caches untouched',store.has('sen-ble-probe-v1.1.1')&&store.has('sen-lab-v1'));
chk('unrelated caches untouched',store.has('other-site-cache'));

// D-11 / D-12 / D-13 — fetch strategy, in a fresh worker with a cache that records what is stored.
{const put=[],added=[],cache=new Map([['https://sprukk.github.io/index.html','CACHED-INDEX']]);let next;
 const h={};const c2={
  self:{addEventListener:(t,f)=>{h[t]=f;},skipWaiting:()=>{},clients:{claim:()=>Promise.resolve()}},
  caches:{keys:async()=>[],delete:async()=>true,open:async()=>({addAll:async l=>{added.push(...l);},put:async(r,res)=>{put.push(res.body);cache.set(r.url,res.body);}}),
    match:async r=>cache.get(typeof r==='string'?'https://sprukk.github.io/'+r.replace(/^\.\//,''):r.url)},
  location:{origin:'https://sprukk.github.io'},URL,Request:class{constructor(u,o){this.url=u;this.cache=(o||{}).cache;}},setTimeout,clearTimeout,
  fetch:()=>next()};
 vm.createContext(c2);vm.runInContext(fs.readFileSync(FILE,'utf8'),c2);
 let w=null;h.install({waitUntil:p=>{w=p;}});await w;
 chk('D-13 install fetches every core file with cache:"reload"',added.length===5&&added.every(r=>r.cache==='reload'),added.map(r=>r.cache).join());
 const res=(ok,body)=>({ok,status:ok?200:404,body,clone(){return this;}});
 const nav=async()=>{let p;const t0=Date.now();h.fetch({request:{method:'GET',url:'https://sprukk.github.io/index.html',mode:'navigate'},respondWith:x=>{p=x;},waitUntil:()=>{}});const r=await p;await new Promise(q=>setTimeout(q,20));return{r,ms:Date.now()-t0};};
 next=async()=>res(false,'404-PAGE');let o=await nav();
 chk('D-11 a 404 reaches the page but is not cached',o.r.body==='404-PAGE'&&!put.includes('404-PAGE')&&cache.get('https://sprukk.github.io/index.html')==='CACHED-INDEX');
 next=async()=>res(true,'NEW-INDEX');o=await nav();
 chk('D-11 an OK response replaces the cached copy',o.r.body==='NEW-INDEX'&&cache.get('https://sprukk.github.io/index.html')==='NEW-INDEX');
 next=async()=>{throw new Error('offline');};o=await nav();
 chk('offline → the cached copy',o.r==='NEW-INDEX');
 next=()=>new Promise(()=>{});o=await nav();
 chk('D-12 a network that never answers → the cached copy after about 3 s',o.r==='NEW-INDEX'&&o.ms>=2900&&o.ms<3600,o.ms+' ms');
 let late;next=()=>new Promise(r=>{late=r;});const p5=nav();await new Promise(q=>setTimeout(q,3200));late(res(true,'LATE-INDEX'));o=await p5;await new Promise(q=>setTimeout(q,30));
 chk('D-12 an answer after the timeout still refreshes the cache for next time',o.r==='NEW-INDEX'&&cache.get('https://sprukk.github.io/index.html')==='LATE-INDEX');
 next=()=>new Promise(r=>setTimeout(()=>r(res(true,'SLOW-INDEX')),500));o=await nav();
 chk('a slow but working network (0.5 s) still wins',o.r.body==='SLOW-INDEX');}
console.log('\nPASS '+pass+'   FAIL '+fail);
process.exit(fail?1:0);
})().catch(e=>{console.error('TEST CRASH:',e);process.exit(1);});
