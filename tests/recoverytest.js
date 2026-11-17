// Start-up recovery test (V2.16.1, review release R1): a damaged store must never stop the app from starting.
// U-01 damaged Home layouts · W-02/W-08 course card or stage without content · D-05 units and app settings
// checked on import ("Take theirs") and at load · D-01 a trued BC is never converted again at a restart ·
// TR-01 (V2.16.2) Velocity truing applies only to the projectile it was solved for.
// Every case restarts the app on the same IndexedDB (fake-indexeddb), as storagetest.js does.
// Usage: node recoverytest.js <app.html>   (needs jsdom + fake-indexeddb; see README.md)
const {JSDOM,VirtualConsole}=require('jsdom'),fs=require('fs');
const {IDBFactory,IDBKeyRange}=require('fake-indexeddb');
const FILE=process.argv[2];
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let pass=0,fail=0;
const chk=(n,ok,extra)=>{console.log((ok?'  PASS  ':'  FAIL  ')+n+(extra?'   '+extra:''));ok?pass++:fail++;};
const all=[];
async function open(idb,quiet){
  const dom=new JSDOM(fs.readFileSync(FILE,'utf8'),{runScripts:'dangerously',...(quiet?{virtualConsole:new VirtualConsole()}:{}),pretendToBeVisual:true,url:'https://x.test/',
    beforeParse(w){w.indexedDB=idb;w.IDBKeyRange=IDBKeyRange;
      Object.defineProperty(w,'innerWidth',{configurable:true,value:412});Object.defineProperty(w,'innerHeight',{configurable:true,value:915});
      w.alert=()=>{};w.confirm=()=>true;w.bootErr=[];
      const ce=w.console.error.bind(w.console);w.console.error=(...a)=>{w.bootErr.push(a.map(x=>x&&x.message||String(x)).join(' '));};
      w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:(t,k)=>k==='measureText'?()=>({width:10}):()=>{}});}});
  const w=dom.window;w.errs=[];w.addEventListener('error',e=>w.errs.push(e.message));
  await wait(700);all.push(w);return w;
}
const J=(w,e)=>JSON.parse(w.eval('JSON.stringify('+e+')'));
const $=(w,id)=>w.document.getElementById(id);
const booted=w=>!w.bootErr.some(e=>/boot failed/.test(e))&&w.errs.length===0;
const homeRenders=w=>{try{w.eval('renderQuick()');return booted(w)&&w.document.querySelectorAll('#page-home > .panel:not(.mod-off)').length>0;}catch(e){return false;}};
const toast=w=>($(w,'sen-toast')||{}).textContent||'';
// a store set up by a first run: session on the Queen, then `js` damages it and saves
async function store(js){
  const idb=new IDBFactory(),w=await open(idb,true);   // quiet: the damage below is meant to break this first run
  w.eval(`Bus.setRifle(DB.rifles[0].id);Bus.setProj(DB.projectiles.find(p=>/Queen/.test(p.name)&&p.bcg7>0).id);Bus.setWx('cur',DB.weathers[0].id);Bus.setWx('zero',DB.weathers[0].id);Bus.notify();saveDB();`);
  await wait(100);
  const before=J(w,'APP.layouts');
  w.eval(js+';saveDB()');await wait(150);
  const out=J(w,'window._out||null');w.close();   // the damaged first run stops here; only restarts are judged
  return {idb,before,out};
}

(async()=>{
console.log('=== START-UP RECOVERY TEST: '+FILE+' ===');

// 1. U-01: a null layout among good ones.
{const {idb,before}=await store('APP.layouts.splice(1,0,null)');
 const w=await open(idb);
 chk('U-01 null layout: boots and Home renders',homeRenders(w),JSON.stringify(w.bootErr.concat(w.errs)));
 chk('U-01 null layout: removed, every good layout kept unchanged',JSON.stringify(J(w,'APP.layouts'))===JSON.stringify(before));
 chk('U-01 null layout: one-line note shown',/A damaged Home layout was removed or reset/.test(toast(w)),toast(w));
 const w2=await open(idb);
 chk('U-01 note shown once (not again at the next start)',booted(w2)&&!/damaged/.test(toast(w2)));}

// 2. U-01: a layout whose module list is a string → reset from its own template, same id and name.
{const {idb,before}=await store("APP.layouts.find(l=>l.tpl==='prs').mods='x'");
 const w=await open(idb);
 chk('U-01 mods string: boots and Home renders',homeRenders(w),JSON.stringify(w.bootErr.concat(w.errs)));
 const L=J(w,"APP.layouts.find(l=>l.tpl==='prs')"),b=before.find(l=>l.tpl==='prs');
 chk('U-01 mods string: same id and name',L.id===b.id&&L.name===b.name);
 chk('U-01 mods string: modules reset from the PRS template',JSON.stringify(L.mods.filter(m=>m.on).map(m=>m.id))===JSON.stringify(J(w,'LAYOUT_TPL.prs.on')));
 chk('U-01 mods string: the other layouts unchanged',JSON.stringify(J(w,"APP.layouts.filter(l=>l.tpl!=='prs')"))===JSON.stringify(before.filter(l=>l.tpl!=='prs')));
 chk('U-01 mods string: note shown',/damaged Home layout/.test(toast(w)));
 w.eval("useLayout(APP.layouts.find(l=>l.tpl==='prs').id)");await wait(30);
 chk('U-01 reset PRS layout in use: course runner shown',!$(w,'home-course').classList.contains('mod-off')&&homeRenders(w));}

// 3. U-01: only junk left (entries, or the whole value) → the fresh-install set, Field as Default.
for(const [name,js] of [['junk entries',"APP.layouts=[null,5,'x',[1]]"],['not a list',"APP.layouts='junk'"]]){
  const {idb}=await store(js);const w=await open(idb);
  const L=J(w,'APP.layouts');
  chk('U-01 '+name+': boots, Home renders',homeRenders(w),JSON.stringify(w.bootErr.concat(w.errs)));
  chk('U-01 '+name+': fresh set — Default (Field) first and in use, then Classic, BR 50, BR 100, PRS, Big bore',
    L.map(l=>l.tpl).join()==='field,default,br50,br100,prs,bigbore'&&L[0].name==='Default'&&J(w,'APP.layoutId')===L[0].id,L.map(l=>l.tpl+':'+l.name).join());
  chk('U-01 '+name+': note shown',/damaged Home layout/.test(toast(w)));
}
{const w=await open(new IDBFactory());chk('fresh install: no damaged-layout note',booted(w)&&!/damaged/.test(toast(w)));}

// 4. W-02: a course card with no stages, PRS layout in use.
{const {idb}=await store("useLayout(APP.layouts.find(l=>l.tpl==='prs').id);newDope();DB.dopeCards[0].stages=[];courseSelect(DB.dopeCards[0].id)");
 const w=await open(idb);
 chk('W-02 card without stages: boots, Home renders',homeRenders(w),JSON.stringify(w.bootErr.concat(w.errs)));
 chk('W-02 message instead of a crash',/This card has no stages — add one in the Dope tab/.test($(w,'cs-stage').textContent)&&$(w,'cs-targets').children.length===0);
 const w2=await open(idb);chk('W-02 survives another restart',homeRenders(w2)&&/no stages/.test($(w2,'cs-stage').textContent));}

// 5. W-08: Hit / Miss on a stage with no targets.
{const {idb}=await store("useLayout(APP.layouts.find(l=>l.tpl==='prs').id);newDope();DB.dopeCards[0].stages=[{id:'s1',name:'Empty',notes:'',time:null,dists:[]}];courseSelect(DB.dopeCards[0].id)");
 const w=await open(idb);
 let threw=null;try{w.eval('courseCall(true);courseCall(false)');}catch(e){threw=e.message;}
 chk('W-08 Hit / Miss on an empty stage do nothing',!threw&&J(w,'APP.run.si')===0&&J(w,'Object.keys(APP.run.calls).length')===0&&/Stage 1 of 1 · Empty/.test($(w,'cs-stage').textContent),threw||'');}

// 6. D-05: invalid units and settings through "Take theirs".
const clickText=(w,txt)=>{const b=[...w.document.querySelectorAll('#mbox button')].find(x=>x.textContent.trim()===txt);if(!b)throw new Error('no button '+txt);b.click();};
for(const [name,file] of [["{units:{range:'parsec'}}",{units:{range:'parsec'}}],
  ['the review payload (units, secondary units, app settings of the wrong type)',{units:{range:'parsec',vel:'__proto__'},sunits:{range:'yd2'},app2:{windAvgS:'x',lat:'north',fontScale:7,layouts:[null],navTabs:'x',theme:5,bogus:1}}]]){
  const idb=new IDBFactory(),w=await open(idb);
  const u0=J(w,'UNITS'),su0=J(w,'SUNITS'),lat0=J(w,'APP.lat'),avg0=J(w,'APP.windAvgS');
  let threw=null;try{w.eval('importData('+JSON.stringify(file)+')');clickText(w,'Take theirs');clickText(w,'Import');}catch(e){threw=e.message;}
  await wait(150);
  chk('D-05 '+name+' + Take theirs: no exception',!threw&&w.errs.length===0,threw||w.errs.join('; '));
  chk('D-05 '+name+': units unchanged',JSON.stringify(J(w,'UNITS'))===JSON.stringify(u0)&&JSON.stringify(J(w,'SUNITS'))===JSON.stringify(su0));
  chk('D-05 '+name+': settings unchanged',J(w,'APP.lat')===lat0&&J(w,'APP.windAvgS')===avg0&&J(w,"APP.bogus===undefined&&APP.layouts.every(l=>l&&Array.isArray(l.mods))"));
  const w2=await open(idb);chk('D-05 '+name+': next start boots',homeRenders(w2),JSON.stringify(w2.bootErr.concat(w2.errs)));
}
// a valid "Take theirs" still applies
{const w=await open(new IDBFactory());w.eval("importData({units:{range:'yd'},sunits:{range:'m'},app2:{lat:12.5}})");clickText(w,'Take theirs');clickText(w,'Import');
 chk('D-05 valid preferences still applied by Take theirs',J(w,'UNITS.range')==='yd'&&J(w,'SUNITS.range')==='m'&&J(w,'APP.lat')===12.5);}

// 7. D-05 at load: a store already holding bad values (bricked by V2.16.0) boots again.
{const {idb}=await store("UNITS.range='parsec';UNITS.vel='x';SUNITS.drop='yd2';APP.windAvgS='x';APP.lat='north'");
 const w=await open(idb);
 chk('D-05 store holding UNITS.range=parsec boots with m',homeRenders(w)&&J(w,'UNITS.range')==='m'&&J(w,'UNITS.vel')==='ms'&&J(w,'SUNITS.drop')==='off',JSON.stringify(w.bootErr.concat(w.errs)));
 chk('D-05 bad settings at load fall back to the defaults',J(w,'APP.windAvgS')===60&&J(w,'APP.lat')===46.05);}

// 8. D-05 keeps every setting the app itself saves.
{const {idb}=await store(`UNITS.range='yd';SUNITS.range='m';APP.lat=40;APP.windAvgS=30;APP.fontScale='l';APP.navTabs=['home','dope','traj'];
   APP.theme={...themeVals()};APP.panes={home:'rail'};APP.help={x:true};APP.calMount=90;APP.calMountSrc='manual';APP.hmTgtBrg=180;APP.retMag=12;
   APP.chNotes='lot 7';APP.run={cardId:null,si:0,ti:0,calls:{},start:null};APP.truTab='imp';APP.advLast='wind';APP.railW=0.4;APP.iosHintOff=true;
   APP.layouts[0].name='Mine';`);
 const w=await open(idb);
 const got=J(w,`[UNITS.range,SUNITS.range,APP.lat,APP.windAvgS,APP.fontScale,APP.navTabs.join(),!!APP.theme,APP.panes.home,APP.help.x,APP.calMount,APP.hmTgtBrg,APP.retMag,APP.chNotes,!!APP.run,APP.truTab,APP.advLast,APP.railW,APP.iosHintOff,APP.layouts[0].name].join('|')`);
 chk('D-05 own settings survive a restart',got==='yd|m|40|30|l|home,dope,traj|true|rail|true|90|180|12|lot 7|true|imp|wind|0.4|true|Mine',got);
 const unknown=J(w,'Object.keys(APP).filter(k=>!appType(k))');
 chk('every APP key the app holds has a type (none dropped at load)',unknown.length===0,unknown.join());}

// 9. D-01: a trued BC is the same after two restarts (drops, single, banded).
{const {idb,out:first}=await store(`const p=DB.projectiles.find(x=>x.id===S.projId);
   tdLast={pid:p.id,drag:'g7',bc:0.119,ds:[100,150]};tdApply();
   const q=DB.projectiles.find(x=>/King/.test(x.name)&&x.id!==p.id)||DB.projectiles.find(x=>x.id!==p.id);tuInit();document.getElementById('tu-proj').value=q.id;
   tuLastResult={drag:'g7',mode:'single',bc:0.125,pid:q.id};tuApply();window._q=q.id;
   const b=DB.projectiles.find(x=>x.id!==p.id&&x.id!==q.id&&x.bcg7>0);document.getElementById('tu-proj').value=b.id;
   tuLastResult={drag:'g7',mode:'banded',bands:[{vHi:280,vLo:240,bc:0.120},{vHi:240,vLo:200,bc:0.110}],pid:b.id};tuApply();
   window._out=[p.id,q.id,b.id];`);
 const ids=first;let w;
 const read=w=>J(w,`${JSON.stringify(ids)}.map(id=>{const p=DB.projectiles.find(x=>x.id===id);return{bc:p.bcg7,conv:p.bcConv,bands:p.bcBands&&p.bcBands.bands.map(b=>b.bc)};})`);
 w=await open(idb);w=await open(idb);const r=read(w);
 chk('D-01 drops-trued BC 0.119 still 0.119 after two restarts',r[0].bc===0.119&&r[0].conv==='native',JSON.stringify(r[0]));
 chk('D-01 single velocity-trued BC 0.125 unchanged',r[1].bc===0.125&&r[1].conv==='native',JSON.stringify(r[1]));
 chk('D-01 banded 0.120 / 0.110 unchanged',r[2].bc===0.12&&JSON.stringify(r[2].bands)==='[0.12,0.11]'&&r[2].conv==='native',JSON.stringify(r[2]));
 chk('D-01 Home still on 0.119 (session re-pulled from the trued profile)',J(w,'S.bc')===0.119);}

// 10. TR-01 (V2.16.2): Velocity truing writes only to the projectile it was solved for.
{const {idb,out:ids}=await store(`const cp=DB.projectiles.find(x=>/AEA CP/.test(x.name)),qn=DB.projectiles.find(x=>/Queen/.test(x.name)&&x.bcg7>0);
   const c={...JSON.parse(JSON.stringify(qn)),id:uid(),name:'Queen copy',fav:false};DB.projectiles.push(c);Bus.setProj(cp.id);window._out=[cp.id,c.id];`);
 const [cpId,cloneId]=ids;let w=await open(idb);
 w.eval("gotoPage('truing');setTruTab('vel')");await wait(30);
 const sel=$(w,'tu-proj');
 chk('TR-01 picker opens on the session projectile, listed first and marked',sel.value===cpId&&/· session$/.test(sel.options[0].textContent)&&sel.options[0].value===cpId&&sel.querySelector('optgroup').label==='Other projectiles');
 const box=$(w,'tu-projbar'),panel=box.nextElementSibling;
 chk('TR-01 picker sits on top, in its own bar above the Velocity form',!!box&&box.contains(sel)&&/BC Truing/.test(panel.textContent)&&!panel.contains(sel));
 const cpBefore=JSON.stringify(J(w,`DB.projectiles.find(x=>x.id==='${cpId}')`));
 w.eval(`const s=document.getElementById('tu-proj');s.value='${cloneId}';s.dispatchEvent(new Event('change'));
   document.getElementById('tu-mv').value=280;document.getElementById('tu-drag').value='g7';tuPoints=[{d:23,v:276}];tuSolve();`);
 chk('TR-01 Apply button names the solved projectile',$(w,'tu-apply-btn').textContent==='Apply to Queen copy');
 w.eval("tuInit()");   // leaving and reopening Truing resets the picker to the session projectile
 chk('TR-01 picker reset to another projectile → result cleared with a hint',J(w,'tuLastResult')===null&&$(w,'tu-result').style.display==='none'&&/Projectile changed/.test($(w,'tu-proj-note').textContent));
 w.eval(`const s=document.getElementById('tu-proj');s.value='${cloneId}';s.dispatchEvent(new Event('change'));document.getElementById('tu-mv').value=280;tuSolve();`);
 const bc=J(w,'+tuLastResult.bc.toFixed(4)');
 w.eval(`document.getElementById('tu-proj').value='${cpId}';tuApply();`);   // picker moved without a change event: Apply still targets the solved one
 await wait(150);w=await open(idb);
 chk('TR-01 the clone got the trued BC (after a restart)',J(w,`DB.projectiles.find(x=>x.id==='${cloneId}').bcg7`)===bc&&/^single·g7/.test(J(w,`DB.projectiles.find(x=>x.id==='${cloneId}').bcTrued`)),String(bc));
 chk('TR-01 the session projectile (AEA CP) is unchanged',JSON.stringify(J(w,`DB.projectiles.find(x=>x.id==='${cpId}')`))===cpBefore);}

all.forEach(x=>x.close());
console.log(`\nRESULT: PASS ${pass} / FAIL ${fail}`);
process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
