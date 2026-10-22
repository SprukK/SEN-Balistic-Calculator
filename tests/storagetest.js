// Storage test (V1.18.0, CORE-10 + CORE-01): IndexedDB persistence, first-run migration from
// localStorage, rollback safety, fallback, schema guard, save-failure warning, factory reset.
// Usage: node storagetest.js <new.html> <previous-release.html>
// Needs jsdom + fake-indexeddb (test-only; install outside the repo, see README.md).
const {JSDOM}=require('jsdom'),fs=require('fs');
const {IDBFactory,IDBKeyRange}=require('fake-indexeddb');
const [NEW,OLD]=process.argv.slice(2);
const SK='sen_platform_v1';
const IPHONE='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let pass=0,fail=0;
const chk=(n,ok,extra)=>{console.log((ok?'  PASS  ':'  FAIL  ')+n+(extra?'   '+extra:''));ok?pass++:fail++;};

async function open(file,{idb,ls,ua}={}){
  const opts={runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',
    beforeParse(w){
      if(idb){w.indexedDB=idb;w.IDBKeyRange=IDBKeyRange;}
      if(ls!=null)w.localStorage.setItem(SK,ls);
      if(ua)Object.defineProperty(w.navigator,'userAgent',{get:()=>ua});
      w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:(t,k)=>k==='measureText'?()=>({width:10}):()=>{}});
    }};
  const dom=new JSDOM(fs.readFileSync(file,'utf8'),opts);
  const w=dom.window;w.errs=[];w.addEventListener('error',e=>w.errs.push(e.message));
  await wait(700);
  return w;
}
const idbGet=(idb,key)=>new Promise((res,rej)=>{const r=idb.open('sen_main',1);
  r.onupgradeneeded=()=>r.result.createObjectStore('kv');
  r.onsuccess=()=>{const q=r.result.transaction('kv','readonly').objectStore('kv').get(key);q.onsuccess=()=>{r.result.close();res(q.result);};q.onerror=()=>rej(q.error);};
  r.onerror=()=>rej(r.error);});
const rifleNames=raw=>JSON.parse(raw).rifles.map(r=>r.name);

(async()=>{
console.log('=== STORAGE TEST: '+NEW+' ===');

// A. Real legacy data: the previous release writes its snapshot to localStorage.
const old=await open(OLD);
old.eval("DB.rifles.push({...DB.rifles[0],id:'r-test',name:'TEST RIFLE'});saveDB();");
const legacy=old.localStorage.getItem(SK);
chk('previous release wrote a localStorage snapshot with TEST RIFLE',!!legacy&&rifleNames(legacy).includes('TEST RIFLE'));

// B. First launch of the new version migrates it into IndexedDB.
const idb=new IDBFactory();
const w1=await open(NEW,{idb,ls:legacy});
chk('engine is IndexedDB',w1.eval('!!_idb'));
chk('migrated data is loaded (TEST RIFLE present)',w1.eval("DB.rifles.some(r=>r.name==='TEST RIFLE')"));
const stored=await idbGet(idb,'db');
chk('IndexedDB holds the snapshot',!!stored&&rifleNames(stored).includes('TEST RIFLE'));
chk('snapshot carries the schema stamp',!!stored&&JSON.stringify(JSON.parse(stored).schema)===JSON.stringify(w1.eval('SCHEMA')));
chk('localStorage copy untouched (rollback safety)',w1.localStorage.getItem(SK)===legacy);

// C. Later saves go to IndexedDB only; a reload reads IndexedDB, not localStorage.
w1.eval("DB.rifles.push({...DB.rifles[0],id:'r-two',name:'SECOND'});saveDB();");
await wait(150);
chk('save reached IndexedDB',rifleNames(await idbGet(idb,'db')).includes('SECOND'));
chk('save did not touch localStorage',w1.localStorage.getItem(SK)===legacy);
const w2=await open(NEW,{idb,ls:legacy});
chk('reload reads IndexedDB (SECOND present)',w2.eval("DB.rifles.some(r=>r.name==='SECOND')"));

// D. No IndexedDB → localStorage fallback keeps working.
const w3=await open(NEW,{ls:legacy});
chk('fallback engine is localStorage',w3.eval('_idb===null'));
w3.eval("DB.rifles.push({...DB.rifles[0],id:'r-fb',name:'FALLBACK'});saveDB();");
chk('fallback save lands in localStorage',rifleNames(w3.localStorage.getItem(SK)).includes('FALLBACK'));

// E. Schema guard for imports.
chk('newer-schema file is flagged',JSON.stringify(w1.eval("schemaNewerThanApp({schema:{rifles:99}})"))==='["rifles"]');
chk('legacy file without schema passes',w1.eval("schemaNewerThanApp({rifles:[]}).length")===0);

// F. A failed save is shown, and cleared by the next good save.
w1.eval("window._realIdb=_idb;_idb={transaction(){throw new Error('quota exceeded')}};");
let threw=false;try{w1.eval('saveDB()');}catch(e){threw=true;}
await wait(50);
const banner=w1.document.getElementById('store-warn');
chk('failed save shows the warning',!threw&&banner.style.display!=='none'&&/NOT saved/.test(banner.textContent),JSON.stringify(banner.textContent));
w1.eval('_idb=window._realIdb;saveDB();');await wait(150);
chk('next good save hides the warning',banner.style.display==='none');

// G. Factory reset clears both stores (otherwise the migration would resurrect old data).
await w1.eval('clearAllData()');await wait(50);
chk('reset clears IndexedDB',(await idbGet(idb,'db'))===undefined);
chk('reset clears localStorage',w1.localStorage.getItem(SK)===null);

// H. iOS install hint: hidden elsewhere, shown in iPhone Safari, dismiss persists.
chk('iOS hint hidden on non-iOS',w2.document.getElementById('ios-hint').style.display==='none');
const w4=await open(NEW,{idb:new IDBFactory(),ua:IPHONE});
const hint=w4.document.getElementById('ios-hint');
chk('iOS hint shown in iPhone Safari',hint.style.display!=='none');
w4.eval('dismissIosHint()');
chk('dismiss hides it and is remembered',hint.style.display==='none'&&w4.eval('APP.iosHintOff===true'));

// I. Settings shows the storage panel without errors.
w2.eval("gotoPage('settings')");await wait(50);
chk('settings shows the Data storage panel',/Engine: IndexedDB/.test(w2.document.getElementById('settings-body').textContent));

const errs=[w1,w2,w3,w4].flatMap(w=>w.errs);
chk('ZERO uncaught errors',errs.length===0,errs.slice(0,3).join(' / '));
console.log('\nPASS '+pass+'   FAIL '+fail);
process.exit(fail?1:0);
})().catch(e=>{console.error('TEST CRASH:',e);process.exit(1);});
