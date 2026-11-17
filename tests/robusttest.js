// Robustness test (V2.16.6, review release R5): storage and workflow items with restarts on a shared store.
// D-08 stale localStorage fallback · D-10 unreadable snapshot kept · D-17 deleted catalog items stay deleted ·
// D-18 legacy zero pressure keeps its kind · U-03 no idle observer loop · W-07 delete warns and lists the cards,
// Trajectory needs a rifle · W-11 stage timer resumes after a restart · W-12 duplicate names refused + form notes ·
// W-13 printed card says station + print date · W-14 empty card MV shown as required.
// (U-02 is in domtest.js; B-05 / B-09 / B-11 / B-13 in labradartest.js; D-11 – D-13 in swtest.js.)
// Usage: node robusttest.js <app.html>   (needs jsdom + fake-indexeddb; see README.md)
const {JSDOM,VirtualConsole}=require('jsdom'),fs=require('fs');
const {IDBFactory,IDBKeyRange}=require('fake-indexeddb');
const FILE=process.argv[2];
const SK='sen_platform_v1',MIG='sen_platform_migrated';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let pass=0,fail=0;
const chk=(n,ok,extra)=>{console.log((ok?'  PASS  ':'  FAIL  ')+n+(extra?'   '+extra:''));ok?pass++:fail++;};
const all=[];
async function open({idb,ls,quiet,width}={}){
  const dom=new JSDOM(fs.readFileSync(FILE,'utf8'),{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',...(quiet?{virtualConsole:new VirtualConsole()}:{}),
    beforeParse(w){if(idb){w.indexedDB=idb;w.IDBKeyRange=IDBKeyRange;}
      if(ls)for(const[k,v]of Object.entries(ls))w.localStorage.setItem(k,v);
      Object.defineProperty(w,'innerWidth',{configurable:true,value:width||412});Object.defineProperty(w,'innerHeight',{configurable:true,value:915});
      w.alerts=[];w.alert=m=>w.alerts.push(String(m));w.confirms=[];w.confirm=m=>{w.confirms.push(String(m));return true;};w.scrollTo=()=>{};w.print=()=>{};
      w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:(t,k)=>k==='measureText'?()=>({width:10}):()=>{}});}});
  const w=dom.window;w.errs=[];w.addEventListener('error',e=>w.errs.push(e.message));await wait(900);all.push(w);return w;
}
const J=(w,e)=>JSON.parse(w.eval('JSON.stringify('+e+')'));
const $=(w,id)=>w.document.getElementById(id);
const warn=w=>$(w,'store-warn').style.display!=='none'?$(w,'store-warn').textContent:'';
const idbOp=(idb,fn)=>new Promise((res,rej)=>{const r=idb.open('sen_main',1);r.onupgradeneeded=()=>r.result.createObjectStore('kv');
  r.onsuccess=()=>{const tx=r.result.transaction('kv','readwrite'),q=fn(tx.objectStore('kv'));tx.oncomplete=()=>{r.result.close();res(q.result);};tx.onerror=()=>rej(tx.error);};r.onerror=()=>rej(r.error);});
// an IndexedDB that fails to open `n` times (then, if given, hands over to a real one)
const flaky=(n,real)=>{let calls=0;return{get calls(){return calls;},open(...a){calls++;if(calls>n&&real)return real.open(...a);const r={};setTimeout(()=>{r.error=new Error('simulated open failure');r.onerror&&r.onerror();},0);return r;}};};
const SESSION="Bus.setRifle(DB.rifles.find(r=>/\\.25/.test(r.name)).id);Bus.setProj(DB.projectiles.find(p=>/^Altaros ATP Queen \\.25$/.test(p.name)).id);Bus.setWx('cur',DB.weathers[0].id);Bus.setWx('zero',DB.weathers[0].id);";

(async()=>{
console.log('=== ROBUSTNESS TEST: '+FILE+' ===');

// 1. D-08: the old localStorage copy is never shown as current without saying so, and never saved over.
{const pre=await open({quiet:true});pre.eval("DB.rifles=[{...DB.rifles[0],id:'rold',name:'OLD RIFLE FROM 2025'}]");const legacy=pre.eval('snapshotJSON()');pre.close();
 const idb=new IDBFactory();
 const a=await open({idb,ls:{[SK]:legacy}});
 const mig=a.localStorage.getItem(MIG);
 chk('D-08 migration from localStorage verified → marker written in Main\'s namespace',!!mig&&/^\d{4}-\d\d-\d\d$/.test(mig)&&J(a,"DB.rifles.some(r=>r.name==='OLD RIFLE FROM 2025')"),mig);
 a.eval("DB.rifles.push({...DB.rifles[0],id:'rnew',name:'NEW RIFLE'});saveDB()");await wait(150);a.close();
 const bad=flaky(9),b=await open({idb:bad,ls:{[SK]:legacy,[MIG]:mig}});
 chk('D-08 IndexedDB fails to open → retried once (2 attempts) before the fallback',bad.calls===2,bad.calls+' attempts');
 chk('D-08 fallback with the marker: warning says old copy and not saved',/old copy/.test(warn(b))&&/NOT saved/.test(warn(b)),warn(b).slice(0,120));
 b.eval("DB.rifles.push({...DB.rifles[0],id:'rb',name:'EDIT IN BAD SESSION'});saveDB()");await wait(100);
 chk('D-08 … and saving writes nothing (localStorage copy unchanged)',b.localStorage.getItem(SK)===legacy);
 b.eval('storeOk()');chk('D-08 … the warning stays after a good save attempt (storeOk does not clear it), no Dismiss',/old copy/.test(warn(b))&&!/Dismiss/.test(warn(b)));
 b.close();
 const c=await open({idb,ls:{[SK]:legacy,[MIG]:mig}});
 chk('D-08 next good start: IndexedDB data is current (NEW RIFLE), no warning',J(c,"DB.rifles.some(r=>r.name==='NEW RIFLE')")&&warn(c)==='');
 c.close();
 const once=flaky(1,idb),d=await open({idb:once,ls:{[SK]:legacy,[MIG]:mig}});
 chk('D-08 a single transient open failure: the retry opens IndexedDB, current data, no warning',once.calls===2&&J(d,'!!_idb')&&J(d,"DB.rifles.some(r=>r.name==='NEW RIFLE')")&&warn(d)==='');
 d.close();
 const nomark=await open({idb:flaky(9),ls:{[SK]:legacy}});
 chk('D-08 no IndexedDB and no marker (never migrated): localStorage stays the working store, as before',warn(nomark)===''&&(nomark.eval("DB.rifles.push({...DB.rifles[0],id:'rl',name:'LS ONLY'});saveDB()"),/LS ONLY/.test(nomark.localStorage.getItem(SK))));
 nomark.close();
 // installs migrated before V2.16.6 have no marker yet: the first good start adds it
 const idb2=new IDBFactory();await idbOp(idb2,st=>st.put(legacy,'db'));
 const e=await open({idb:idb2,ls:{[SK]:legacy}});
 chk('D-08 an install migrated before V2.16.6 gets the marker at its next good start',!!e.localStorage.getItem(MIG));e.close();}

// 2. D-10: an unreadable snapshot is copied aside before seeding, and the warning stays.
{const idb=new IDBFactory();const broken='{"rifles":[{"name":"MY RIFLE","id":"r1"';await idbOp(idb,st=>st.put(broken,'db'));
 const a=await open({idb,quiet:true});await wait(300);
 const keys=await idbOp(idb,st=>st.getAllKeys());const kept=keys.find(k=>/^db-unreadable-/.test(k));
 chk('D-10 the unreadable text is kept under db-unreadable-<time>',!!kept&&(await idbOp(idb,st=>st.get(kept)))===broken,String(kept));
 chk('D-10 the app still starts (defaults), and the warning is still shown after the seeding saves',J(a,'DB.rifles.length')>0&&/could not be read/.test(warn(a))&&/was kept/.test(warn(a)),warn(a).slice(0,90));
 const btn=[...$(a,'store-warn').querySelectorAll('button')].find(b=>b.textContent==='Dismiss');btn&&btn.click();
 chk('D-10 Dismiss hides it',!!btn&&warn(a)==='');a.close();}

// 3. D-17: catalog seeds once per catalog version.
{const idb=new IDBFactory();const a=await open({idb});
 const np=J(a,'DB.projectiles.length'),ns=J(a,'DB.scopes.length');
 chk('D-17 a fresh store gets both catalogs and the flag',np>100&&ns>=20&&JSON.stringify(J(a,'APP.seeded'))==='{"scopes":1,"proj":1}',np+' projectiles · '+ns+' scopes · '+JSON.stringify(J(a,'APP.seeded')));
 a.eval("DB.projectiles=DB.projectiles.filter(p=>p.name!=='ZAN BR50 Pellet .30 47gr');DB.scopes=DB.scopes.filter(s=>s.sku!=='SCFF-63');saveDB()");await wait(150);a.close();
 const b=await open({idb});
 chk('D-17 a deleted catalog projectile and scope stay deleted after a restart',J(b,'DB.projectiles.length')===np-1&&J(b,'DB.scopes.length')===ns-1&&!J(b,"DB.scopes.some(s=>s.sku==='SCFF-63')"));
 b.eval("delete APP.seeded;DB.scopes=DB.scopes.filter(s=>s.sku!=='SCFF-64');saveDB()");await wait(150);b.close();   // a store from before V2.16.6
 const c=await open({idb});
 chk('D-17 an existing store from before V2.16.6 is only flagged: a deletion made before the update stays',J(c,"DB.scopes.some(s=>s.sku==='SCFF-64')")===false&&J(c,'APP.seeded.scopes')===1&&J(c,'APP.seeded.proj')===1);c.close();}

// 4. D-18: a legacy rifle (no zero fields) zeroed in a station-type weather keeps station pressure.
{const idb=new IDBFactory();const a=await open({idb});
 a.eval("DB.weathers.push({id:'wst',name:'Club range (station)',temp:12,pres:975,presType:'station',rh:60,alt:420});S.zeroWxId='wst';const r=DB.rifles[0];r.id='rleg';['zTemp','zPres','zRH','zPresType','zAlt'].forEach(k=>delete r[k]);saveDB()");await wait(150);a.close();
 const b=await open({idb});
 const r=J(b,"DB.rifles.find(x=>x.id==='rleg')");
 chk('D-18 zero pressure 975 stays station (not converted again as sea level at 300 m)',r.zPres===975&&r.zPresType==='station'&&Math.abs(J(b,"zeroConds(DB.rifles.find(x=>x.id==='rleg')).pres")-975)<1e-9,JSON.stringify({p:r.zPres,t:r.zPresType,alt:r.zAlt}));
 b.eval("DB.weathers.push({id:'wsea',name:'Garmin QNH',temp:12,pres:1015,presType:'sea',rh:60,alt:420});S.zeroWxId='wsea';const r=DB.rifles[0];r.id='rleg2';['zTemp','zPres','zRH','zPresType','zAlt'].forEach(k=>delete r[k]);saveDB()");await wait(150);b.close();
 const c=await open({idb});const r2=J(c,"DB.rifles.find(x=>x.id==='rleg2')");
 chk('D-18 a sea-level zero weather keeps sea level and its own altitude (420 m, not 300)',r2.zPresType==='sea'&&r2.zAlt===420);c.close();}

// 5. U-03: idle, the pane-empty observer does not keep re-running itself.
{const w=await open({width:780});w.eval("gotoPage('stab')");await wait(400);
 w.eval('window._pe=0;const _f=paneEmptySync;paneEmptySync=function(){window._pe++;return _f.apply(this,arguments);}');await wait(2000);
 chk('U-03 idle 2 s on a page with a results pane → paneEmptySync runs at most twice',J(w,'window._pe')<=2,J(w,'window._pe')+' runs');}

// 6. W-07 + W-11 + W-12 + W-13 + W-14 on one store.
{const idb=new IDBFactory();const w=await open({idb});
 w.eval(SESSION+"Bus.notify();newDope();const c=getCard();c.name='Match card A';c.mv=255;c.stages=[{id:'st1',name:'S1',time:60,dists:[{id:'t1',label:'T1',range:50,angle:0,shots:1}]}];saveDB()");
 const rid=J(w,'S.rifleId');w.confirms.length=0;w.eval(`confirmDelete('r','${rid}')`);
 chk('W-07 deleting a rifle a card uses: the confirmation names the card and says it needs another rifle',/Used by 1 dope card: "Match card A"/.test(w.confirms[0]||'')&&/another rifle/.test(w.confirms[0]||''),(w.confirms[0]||'').replace(/\n/g,' ').slice(0,140));
 w.eval("gotoPage('advanced');runTraj(true)");
 chk('W-07 with the active rifle deleted, Trajectory says to select a rifle',J(w,'lastTraj')===null&&/Select a rifle/.test(J(w,'trajReason')||''),J(w,'trajReason'));
 w.eval('solve()');chk('W-07 … and so does the Shot solver',/Select a rifle/.test($(w,'sv-outs').textContent));
 // W-14
 w.eval("getCard().mv=null;saveDB();gotoPage('dope');loadDope()");
 chk('W-14 a card with no MV shows the field empty and marked required (not a silent 255)',$(w,'dc-mv').value===''&&$(w,'dc-mv').classList.contains('need')&&$(w,'dc-mv').placeholder==='required');
 w.alerts.length=0;w.eval('calcDope()');chk('W-14 Compute asks for the MV',/MV — it is required/.test(w.alerts[0]||''));
 // W-13
 w.eval("DB.rifles.push({...DB.rifles[0],id:'r25b',name:'Spare .25',cal:'.25',twist:508});"+SESSION+"Bus.notify();const c=getCard();c.rifleId=S.rifleId;c.mv=255;saveDB()");const ph=w.eval('dopePrintHTML(getCard())')||'';
 chk('W-13 the printed card says station after the zero pressure and carries the print date',/hPa station/.test(ph)&&/Printed \d{4}-\d\d-\d\d \d\d:\d\d/.test(ph),(ph.match(/Zero atmos[^<]*/)||[''])[0]);
 // W-11: a running stage timer survives a restart
 w.eval("APP.run={cardId:getCard().id,si:0,ti:0,calls:{},start:Date.now()-5000};saveDB()");await wait(150);w.close();
 const b=await open({idb});
 chk('W-11 after a restart the stage timer is running again',J(b,'courseIv!==null'));
 b.eval("APP.run.start=Date.now()-120000;courseIv&&clearInterval(courseIv);courseIv=null;courseResume()");
 chk('W-11 a timer whose time is up is not restarted',J(b,'courseIv===null'));
 // W-12
 const nm=J(b,'DB.projectiles[0].name'),n0=J(b,'DB.projectiles.length');
 b.eval("openProjForm()");$(b,'pf-name').value=nm;b.alerts.length=0;b.eval("saveProj('')");
 chk('W-12 a new projectile with an existing name is refused with the reason',J(b,'DB.projectiles.length')===n0&&/already exists/.test(b.alerts[0]||''),b.alerts[0]);
 b.eval('closeModal()');const pid=J(b,'DB.projectiles[0].id');b.eval(`openProjForm('${pid}')`);b.alerts.length=0;b.eval(`saveProj('${pid}')`);
 chk('W-12 editing a profile and keeping its own name still saves',!(b.alerts[0]||'').includes('already exists'));
 b.eval("openProjForm()");const set=(id,v)=>{$(b,id).value=v;$(b,id).dispatchEvent(new b.Event('input',{bubbles:true}));};
 b.document.getElementById('pf-cal').value='.25';set('pf-oal','23');set('pf-diam','7.62');
 chk('W-12 projectile form notes: OAL over the magazine limit, diameter off the .25 tag',/magazine limit \(22 mm\)/.test($(b,'pf-flags').textContent)&&/\.25 nominal \(6\.35 mm\)/.test($(b,'pf-flags').textContent),$(b,'pf-flags').textContent);
 set('pf-oal','12');set('pf-diam','6.36');chk('W-12 … and none for a normal .25 slug',$(b,'pf-flags').style.display==='none');
 b.eval('closeModal();openRifleForm()');b.document.getElementById('rf-cal').value='.25';$(b,'rf-cal').dispatchEvent(new b.Event('change',{bubbles:true}));$(b,'rf-twist').value='16';$(b,'rf-twist').dispatchEvent(new b.Event('input',{bubbles:true}));
 chk('W-12 rifle form: a .25 at 1:16″ notes the stock Mora 1:20″ barrel',/stock Mora \.25 barrel \(1:20″\)/.test($(b,'rf-flags').textContent),$(b,'rf-flags').textContent);
 $(b,'rf-twist').value='20';$(b,'rf-twist').dispatchEvent(new b.Event('input',{bubbles:true}));chk('W-12 … no note at the stock twist',$(b,'rf-flags').style.display==='none');
 b.eval('closeModal()');}

const errs=all.flatMap(x=>x.errs);chk('ZERO uncaught errors',errs.length===0,errs.slice(0,3).join(' / '));
all.forEach(x=>{try{x.close();}catch(e){}});
console.log(`\nRESULT: PASS ${pass} / FAIL ${fail}`);
process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
