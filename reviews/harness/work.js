// Review harness for segment 5 workflows.
const {JSDOM}=require('jsdom'),fs=require('fs');const {IDBFactory,IDBKeyRange}=require('fake-indexeddb');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function open(idb){const dom=new JSDOM(fs.readFileSync('/home/claude/repo/index.html','utf8'),{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',
  beforeParse(w){if(idb){w.indexedDB=idb;w.IDBKeyRange=IDBKeyRange;}w.alerts=[];w.alert=m=>w.alerts.push(String(m));w.confirm=()=>true;w.scrollTo=()=>{};w.print=()=>{};w.innerWidth=412;w.innerHeight=915;
    w.console.error=(...a)=>{(w.__ce=w.__ce||[]).push(a.map(String).join(' '))};
    w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:(t,k)=>k==='measureText'?()=>({width:10}):()=>{}});}});
  const w=dom.window;w.errs=[];w.addEventListener('error',e=>w.errs.push(e.message));await wait(800);return w;}
const P=(...a)=>console.log(...a);
const SESS=`Bus.setRifle(DB.rifles.find(r=>/\\.25/.test(r.name)).id);Bus.setProj(DB.projectiles.find(p=>/^Altaros ATP Queen/.test(p.name)).id);Bus.setWx('cur',DB.weathers[0].id);Bus.setWx('zero',DB.weathers[0].id);S.dist_m=150;Bus.notify();gotoPage('home')`;
(async()=>{
const idb=new IDBFactory();let w=await open(idb);const J=e=>JSON.parse(w.eval('JSON.stringify('+e+')'));const $=id=>w.document.getElementById(id);
w.eval(SESS);await wait(300);
const home=()=>$('home-elev').textContent+' '+$('home-elev-u').textContent;
// 1. edit the ACTIVE projectile's BC / rifle MV in their forms
const h0=home();
w.eval("openProjForm(getProj().id)");$('pf-bcg7').value='0.100';w.eval("saveProj(getProj().id)");await wait(300);
P('1a edit active projectile G7 0.128→0.100 in the form → S.bc',J('S.bc'),'src',J('S.src.bc'),'| Home',h0,'→',home(),'| profile',J('getProj().bcg7'));
w.eval("openRifleForm(getRifle().id)");$('rf-mv').value='280';w.eval("saveRifle(getRifle().id)");await wait(300);
P('1b edit active rifle MV 255→280 in the form → S.mv',J('S.mv'),'src',J('S.src.mv'),'| profile',J('getRifle().mv'));
w.eval("openWxForm(DB.weathers[0].id)");$('wf-temp').value='0';w.eval("saveWx(DB.weathers[0].id)");await wait(300);
P('1c edit active weather 20→0 °C → S.ct',J('S.ct'),'src',J('S.src.ct'),'| profile',J('DB.weathers[0].temp'));
// 2. scope with reticleId null saved through the form
const sid=J("DB.scopes.find(s=>s.sku==='SCFF-31').id");P('2  SCFF-31 reticleId before',J(`DB.scopes.find(s=>s.id==='${sid}').reticleId`));
w.eval(`openScopeForm('${sid}')`);P('   form reticle select shows',JSON.stringify($('sc-reticle').selectedOptions[0].textContent),'| has a "none" option:',[...$('sc-reticle').options].some(o=>o.value===''));
w.eval(`saveScope('${sid}')`);await wait(100);P('   after Save without touching the reticle → reticleId',J(`DB.scopes.find(s=>s.id==='${sid}').reticleId`));
// 3. new reticle default
w.eval('openReticleForm()');P('3  new reticle form: Verified? defaults to',JSON.stringify($('rt-ver').selectedOptions[0].textContent));w.eval('closeModal()');
// 4. Holds with the seeded estimated reticle (SCFF-70 → VEC-MBR2, verified:false)
w.eval("(()=>{const r=getRifle();r.scopeId=DB.scopes.find(s=>s.sku==='SCFF-70').id;Bus.notify();gotoPage('holds')})()");await wait(200);
P('4  Holds on SCFF-70 (VEC-MBR2, ladder ESTIMATED): flags',JSON.stringify($('hd-flags').textContent),'| 100 m row mark',JSON.stringify([...$('hd-tbody').querySelectorAll('tr')].find(t=>/^100/.test(t.children[0].textContent))?.children[3].textContent));
w.eval("gotoPage('home')");await wait(100);P('   Home caption',JSON.stringify($('home-reticle-cap').textContent));
w.eval("(()=>{const r=getRifle();r.scopeId=DB.scopes.find(s=>s.sku==='SCFF-30').id;Bus.notify()})()");
// 5. manual overrides across a restart
w.eval("S.mv=281.4;S.src.mv='chrono';S.bc=0.119;S.src.bc='manual';saveDB()");await wait(300);w.close();
w=await open(idb);await wait(200);
P('5  after restart: S.mv',w.eval('S.mv'),'src',w.eval('S.src.mv'),'| S.bc',w.eval('S.bc'),'src',w.eval('S.src.bc'));
// 6. delete a rifle used by a dope card; course card without stages
w.eval(SESS);await wait(200);w.eval("newDope()");const cid=w.eval('currentDopeId');w.eval("calcDope()");
const rid=w.eval('getRifle().id');w.eval(`confirmDelete('r','${rid}')`);await wait(200);
P('6a deleted the rifle the card uses: alerts',JSON.stringify(w.alerts.slice(-1)),'| card rifleId still',w.eval(`DB.dopeCards.find(c=>c.id==='${cid}').rifleId===${JSON.stringify(rid)}`),'| Solver/Trajectory still compute with no rifle:',w.eval('runTraj(true)'),'| Home',JSON.stringify($('home-elev').textContent));
w.eval(`(()=>{const c=DB.dopeCards.find(c=>c.id==='${cid}');c.stages=[];APP.run={cardId:c.id,si:0,ti:0,calls:{},start:null};})()`);
w.eval(`useLayout(APP.layouts.find(l=>l.tpl==='prs').id)`);w.eval(SESS.replace(/\.25/,'.30'));await wait(300);
P('6b course runner on a card with no stages → page errors',JSON.stringify(w.errs.slice(-1)),JSON.stringify((w.__ce||[]).slice(-1)));
process.exit(0);})();
