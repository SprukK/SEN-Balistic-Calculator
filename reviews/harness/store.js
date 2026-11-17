const {JSDOM}=require('jsdom'),fs=require('fs');
const {IDBFactory,IDBKeyRange}=require('fake-indexeddb');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const FILE='/home/claude/repo/index.html',SK='sen_platform_v1';
async function open({idb,ls,breakIdb}={}){
  const dom=new JSDOM(fs.readFileSync(FILE,'utf8'),{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',
    beforeParse(w){if(idb){w.indexedDB=breakIdb?{open(){throw new Error('UnknownError: transient')}}:idb;w.IDBKeyRange=IDBKeyRange;}
      if(ls!=null)w.localStorage.setItem(SK,ls);w.alerts=[];w.alert=m=>w.alerts.push(String(m));w.confirm=()=>true;w.scrollTo=()=>{};
      w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:(t,k)=>k==='measureText'?()=>({width:10}):()=>{}});}});
  const w=dom.window;w.errs=[];w.addEventListener('error',e=>w.errs.push(e.message));await wait(800);return w;
}
const J=(w,e)=>JSON.parse(w.eval('JSON.stringify('+e+')'));
const P=(...a)=>console.log(...a);
const sess=`Bus.setRifle(DB.rifles.find(r=>/\\.25/.test(r.name)).id);Bus.setProj(DB.projectiles.find(p=>/^Altaros ATP Queen/.test(p.name)).id);Bus.setWx('cur',DB.weathers[0].id);Bus.setWx('zero',DB.weathers[0].id);S.mv=255;S.dist_m=200;Bus.notify();`;
(async()=>{
// 1. trued BC across a restart
{const idb=new IDBFactory();const a=await open({idb});a.eval(sess);await wait(100);
 a.eval("(()=>{const p=getProj();p.bcg7=0.119;p.bcTrued='drops·g7·2026-11-17·150m';p.bcBands=null;Bus.pullFromProfiles(['bc']);saveDB();Bus.notify()})()");await wait(300);
 const dialA=a.document.getElementById('home-elev-u').textContent;a.close();
 const b=await open({idb});b.eval("gotoPage('home');renderQuick()");await wait(100);
 P('1 trued G7 0.119 (as tdApply stores it, no bcConv) → after restart bcg7',J(b,'getProj().bcg7'),'bcConv',J(b,'getProj().bcConv'),'| Home @200 before',dialA,'after',b.document.getElementById('home-elev-u').textContent);
 b.close();const c=await open({idb});P('  third start bcg7',J(c,'getProj().bcg7'));c.close();}
// 1b. banded
{const idb=new IDBFactory();const a=await open({idb});a.eval(sess);
 a.eval("(()=>{const p=getProj();p.bcBands={drag:'g7',bands:[{vHi:255,vLo:240,bc:0.12},{vHi:240,vLo:220,bc:0.11}]};p.bcg7=0.12;p.bcTrued='banded·g7·2026-11-17';saveDB()})()");await wait(200);a.close();
 const b=await open({idb});P('1b banded bands after restart',JSON.stringify(J(b,'getProj().bcBands.bands.map(x=>x.bc)')));b.close();}
// 2. two tabs
{const idb=new IDBFactory();const a=await open({idb}),b=await open({idb});
 a.eval("DB.rifles.push({...DB.rifles[0],id:'tabA',name:'ADDED IN TAB A'});saveDB()");await wait(200);
 b.eval("DB.weathers.push({...DB.weathers[0],id:'tabB',name:'ADDED IN TAB B'});saveDB()");await wait(200);a.close();b.close();
 const c=await open({idb});P('2 two tabs: rifle from A kept',J(c,"DB.rifles.some(r=>r.id==='tabA')"),'| weather from B kept',J(c,"DB.weathers.some(r=>r.id==='tabB')"));c.close();}
// 3. IDB fails transiently at boot → stale localStorage
{const idb=new IDBFactory();const lsOld=JSON.stringify({rifles:[{id:'old',name:'OLD RIFLE FROM 2025',cal:'.25',twist:508,sight:44,mv:250,zero:50,scopeId:''}],projectiles:[],weathers:[],scopes:[],reticles:[],dopeCards:[],schema:{rifles:1}});
 const a=await open({idb,ls:lsOld});P('3 first IDB boot migrated LS → engine IDB:',J(a,'!!_idb'));
 a.eval("DB.rifles.push({...DB.rifles[0],id:'new',name:'RIFLE ADDED LATER'});saveDB()");await wait(200);const lsAfter=a.localStorage.getItem(SK);a.close();
 const b=await open({idb,ls:lsAfter,breakIdb:true});P('  IDB throws on next boot → engine',J(b,'_idb?"idb":"localStorage"'),'| rifles shown',JSON.stringify(J(b,'DB.rifles.map(r=>r.name)').slice(0,4)),'| warning shown:',JSON.stringify(b.document.getElementById('store-warn').textContent));
 b.eval("DB.rifles.push({...DB.rifles[0],id:'fb',name:'EDIT DURING FALLBACK'});saveDB()");await wait(100);const lsFb=b.localStorage.getItem(SK);b.close();
 const c=await open({idb,ls:lsFb});P('  IDB back → edit made during fallback kept:',J(c,"DB.rifles.some(r=>r.id==='fb')"),'| later rifle kept:',J(c,"DB.rifles.some(r=>r.id==='new')"));c.close();}
// 4. corrupt stored JSON
{const idb=new IDBFactory();const a=await open({idb});a.eval("DB.rifles.push({...DB.rifles[0],id:'keep',name:'MY RIFLE'});saveDB()");await wait(200);a.close();
 await new Promise(r=>{const q=idb.open('sen_main',1);q.onsuccess=()=>{const db=q.result;const g=db.transaction('kv').objectStore('kv').get('db');g.onsuccess=()=>{const raw=g.result;const t=db.transaction('kv','readwrite');t.objectStore('kv').put(raw.slice(0,raw.length-40),'db');t.oncomplete=()=>{db.close();r();};};};});
 const b=await open({idb});P('4 truncated snapshot → warning:',JSON.stringify(b.document.getElementById('store-warn').textContent.slice(0,80)));
 await wait(5500);b.close();
 const raw=await new Promise(r=>{const q=idb.open('sen_main',1);q.onsuccess=()=>{const g=q.result.transaction('kv').objectStore('kv').get('db');g.onsuccess=()=>{q.result.close();r(g.result);};};});
 let ok=true;try{JSON.parse(raw);}catch(e){ok=false;}P('  stored copy after that session: parses',ok,'| MY RIFLE still there',ok&&JSON.parse(raw).rifles.some(r=>r.id==='keep'),'| stored length',raw.length);}
process.exit(0);})();
