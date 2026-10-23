// Service-worker test (V1.25.1, CORE-09): Main and the Lab app share one CacheStorage on
// sprukk.github.io. Activating a new Main release must delete only Main's own old caches
// (sen-ballistics-*, legacy sen-calc-*) and never the Lab probe's (sen-ble-probe-*, sen-lab-*)
// or anything else. Runs the real sw.js in a sandbox with a simulated CacheStorage.
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
  location:{origin:'https://sprukk.github.io'},URL,fetch:async()=>{throw new Error('offline');}
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
console.log('\nPASS '+pass+'   FAIL '+fail);
process.exit(fail?1:0);
})().catch(e=>{console.error('TEST CRASH:',e);process.exit(1);});
