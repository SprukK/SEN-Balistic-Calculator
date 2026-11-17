// Injection test (V2.16.3, review release R2): shared data can never put live markup or script into the app.
// D-02 id rule (import + at every start) · D-03 escaped text fields · D-04 share codes always open the review ·
// D-14 duplicate ids in one file · D-15 prototype-named links · D-16 size limits · W-09 scope-file import.
// Payloads from the Data-Security review: html  x"'><i data-xss="k"></i>  ·  attr  x" data-xss="k  ·  js  x',window.__p('k'),'
// Usage: node injectiontest.js <app.html>   (needs jsdom + fake-indexeddb; see README.md)
const {JSDOM,VirtualConsole}=require('jsdom'),fs=require('fs'),zlib=require('zlib');
const {IDBFactory,IDBKeyRange}=require('fake-indexeddb');
const FILE=process.argv[2];
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let pass=0,fail=0;
const chk=(n,ok,extra)=>{console.log((ok?'  PASS  ':'  FAIL  ')+n+(extra?'   '+extra:''));ok?pass++:fail++;};
const all=[];
async function open({idb,url,quiet}={}){
  const dom=new JSDOM(fs.readFileSync(FILE,'utf8'),{runScripts:'dangerously',pretendToBeVisual:true,url:url||'https://x.test/index.html',...(quiet?{virtualConsole:new VirtualConsole()}:{}),
    beforeParse(w){if(idb){w.indexedDB=idb;w.IDBKeyRange=IDBKeyRange;}
      Object.defineProperty(w,'innerWidth',{configurable:true,value:412});Object.defineProperty(w,'innerHeight',{configurable:true,value:915});
      w.alerts=[];w.alert=m=>w.alerts.push(String(m));w.confirms=[];w.confirm=m=>{w.confirms.push(String(m));return true;};w.scrollTo=()=>{};w.print=()=>{};
      w.__hit=new Set();w.__p=k=>w.__hit.add(k);
      for(const k of ['CompressionStream','DecompressionStream','ReadableStream','TextEncoder','TextDecoder'])w[k]=globalThis[k];
      w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:(t,k)=>k==='measureText'?()=>({width:10}):()=>{}});}});
  const w=dom.window;w.errs=[];w.addEventListener('error',e=>w.errs.push(e.message));
  await wait(url&&url.includes('#import=')?1200:700);all.push(w);return w;
}
const J=(w,e)=>JSON.parse(w.eval('JSON.stringify('+e+')'));
const $=(w,id)=>w.document.getElementById(id);
const ID_RE=/^[A-Za-z0-9_-]{1,40}$/;
const crcT=(()=>{const t=[];for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t.push(c>>>0);}return t;})();
const crc=b=>{let c=0xFFFFFFFF;for(const x of b)c=crcT[(c^x)&0xFF]^(c>>>8);return((c^0xFFFFFFFF)>>>0).toString(16).padStart(8,'0');};
const share=obj=>{const j=Buffer.from(JSON.stringify(obj));return 'SEN1:'+crc(j)+'.'+zlib.deflateRawSync(j).toString('base64url');};

// a file whose every id, link and text field carries the payload
function payloadFile(P){
  const ids={sc:P('scope.id'),rt:P('reticle.id'),rf:P('rifle.id'),pj:P('proj.id'),wx:P('wx.id'),dc:P('card.id'),st:P('stage.id'),ds:P('dist.id'),rg:P('range.id'),de:P('design.id')};
  return {schema:{rifles:1,projectiles:1,weathers:1,scopes:1,reticles:1,dopeCards:2},
    reticles:[{id:ids.rt,name:P('reticle.name'),fp:'FFP',dotMrad:0.1,hashes:[1,2,3],windHashes:[1,2],treeRows:[1,2],verified:false,confNote:P('reticle.confNote'),notes:P('reticle.notes')}],
    scopes:[{id:ids.sc,name:P('scope.name'),sku:P('scope.sku'),adjUnit:'mil',click:0.1,elev:26,wind:16,cpr:100,magMin:5,magMax:30,reticleId:ids.rt,source:P('scope.source'),notes:P('scope.notes')}],
    rifles:[{id:ids.rf,name:P('rifle.name'),cal:P('rifle.cal'),twist:508,twistDir:'right',blen:700,sight:44,mv:255,zero:50,notes:P('rifle.notes'),scopeId:ids.sc,railOn:false,railMrad:0,railUnit:'mil',downClicks:P('rifle.downClicks'),zwSpd:0,zwDir:90,zTemp:20,zPres:1010,zPresType:'sea',zAlt:300,zRH:65,reg1:P('rifle.reg1'),reg2:P('rifle.reg2'),ssj:false,regDelta:P('rifle.regDelta'),dwell:P('rifle.dwell')}],
    projectiles:[{id:ids.pj,name:P('proj.name'),cal:P('proj.cal'),mfg:P('proj.mfg'),type:'slug',diam:6.35,mass:60,oal:12.9,bcg7:0.128,bcg1:0.245,c:0,ff:1.07,notes:P('proj.notes')},
      {id:P('proj2.id'),name:P('proj2.name'),cal:'.25',mfg:'x',type:'slug',diam:6.35,mass:50,oal:12,bcg7:0,bcg1:0,c:0,ff:1,notes:''}],   // BC pending → Holds message
    weathers:[{id:ids.wx,name:P('wx.name'),temp:20,pres:975,presType:'station',rh:65,alt:298,notes:P('wx.notes')}],
    dopeCards:[{id:ids.dc,name:P('card.name'),rifleId:ids.rf,projId:ids.pj,cwxId:ids.wx,mv:255,zero:50,notes:P('card.notes'),stages:[{id:ids.st,name:P('stage.name'),notes:P('stage.notes'),dists:[{id:ids.ds,range:100,angle:0,wind:0,wdir:90,label:P('dist.label')}]}]}],
    ranges:[{id:ids.rg,name:P('range.name'),notes:P('range.notes'),mode:'blend',stations:[{id:P('station.id'),nick:P('station.nick'),unit:P('station.unit'),dist:50,ang:0}]}],
    designs:[{id:ids.de,name:P('design.name'),notes:P('design.notes'),diam:6.35,bearL:8}]};
}
// render every screen that shows imported data; collect live markers and fire every inline handler (js mode)
async function sweep(w,mode){
  const live=new Set();
  const step=async(name,code)=>{try{w.eval(code);}catch(e){live.add('threw @'+name+': '+e.message);}await wait(40);
    w.document.querySelectorAll('[data-xss]').forEach(e=>live.add(e.getAttribute('data-xss')+' @'+name));
    if(mode==='js')w.document.querySelectorAll('*').forEach(e=>{for(const a of e.getAttributeNames())if(/^on/.test(a)&&/__p\(/.test(e.getAttribute(a))){try{e[a]&&e[a].call(e,new w.Event('x'));}catch(x){}}});
    [...w.__hit].forEach(k=>live.add(k+' (handler ran) @'+name));w.__hit.clear();};
  const id=(t,re)=>JSON.stringify(J(w,`(DB.${t}.find(x=>/^${re}/.test(x.name))||{}).id`));
  const RF=id('rifles','rifle\\.name'),PJ=id('projectiles','proj\\.name'),P2=id('projectiles','proj2\\.name'),WX=id('weathers','wx\\.name'),SC=id('scopes','scope\\.name'),RT=id('reticles','reticle\\.name'),DC=id('dopeCards','card\\.name'),RG=id('ranges','range\\.name'),DE=id('designs','design\\.name');
  await step('session',`Bus.setRifle(${RF});Bus.setProj(${PJ});Bus.setWx('cur',${WX});Bus.setWx('zero',${WX});Bus.notify()`);
  await step('home',`gotoPage('home');renderQuick();renderActBar()`);
  for(const k of ['rifle','proj','wx'])await step('sheet:'+k,`pickSheet('${k}')`);
  await step('closeSheet',`closeSheet()`);
  await step('trajectory',`gotoPage('traj');runTraj(true)`);
  await step('profiles',`gotoPage('profiles');renderProfiles();['rifles','projs','scopes','reticles','wx'].forEach(s=>{try{setProfSub(s)}catch(e){}})`);
  await step('form:rifle',`openRifleForm(${RF})`);await step('form:proj',`openProjForm(${PJ})`);await step('form:scope',`openScopeForm(${SC})`);await step('form:reticle',`openReticleForm(${RT})`);await step('form:wx',`openWxForm(${WX})`);
  await step('closeModal',`closeModal()`);
  for(const t of [['r',RF],['p',PJ],['s',SC],['w',WX]])await step('share:'+t[0],`openShare('${t[0]}',${t[1]})`);
  await wait(200);await step('after-share',`closeModal()`);
  await step('dope',`gotoPage('dope');document.getElementById('dc-sel').value=${DC};loadDope();calcDope()`);
  await step('truing',`gotoPage('truing')`);await step('stab',`gotoPage('stab')`);await step('solver',`gotoPage('solver')`);await step('wind',`gotoPage('wind')`);
  await step('holds',`gotoPage('holds')`);await step('holds-bc-pending',`Bus.setProj(${P2});Bus.notify();gotoPage('holds');renderHolds()`);
  await step('bench',`APP.benchId=${DE};gotoPage('bench')`);await step('sensors',`APP.rangeId=${RG};gotoPage('sensors');stnRender()`);
  await step('settings',`gotoPage('settings')`);await step('layouts',`gotoPage('layouts')`);
  return [...live];
}

(async()=>{
console.log('=== INJECTION TEST: '+FILE+' ===');

// 1. D-02 + D-03: every id, link and text field, three payload modes.
for(const mode of ['html','attr','js']){
  const P=k=>mode==='html'?`${k}"'><i data-xss="${k}"></i>`:mode==='attr'?`${k}" data-xss="${k}`:`${k}',window.__p('${k}'),'`;
  const w=await open();
  w.eval('importData('+JSON.stringify(payloadFile(P))+')');await wait(100);
  const st=J(w,`(()=>{const f=(t,k)=>DB[t].find(x=>x.name.startsWith(k+'.name'));const rf=f('rifles','rifle'),sc=f('scopes','scope'),rt=f('reticles','reticle'),pj=f('projectiles','proj'),wx=f('weathers','wx'),dc=f('dopeCards','card'),rg=f('ranges','range');
    return{ids:Object.keys(DB).filter(t=>Array.isArray(DB[t])).flatMap(t=>DB[t].map(x=>x.id)).concat(dc.stages.flatMap(s=>[s.id,...s.dists.map(d=>d.id)]),rg.stations.map(s=>s.id)),
      links:rf.scopeId===sc.id&&sc.reticleId===rt.id&&dc.rifleId===rf.id&&dc.projId===pj.id&&dc.cwxId===wx.id};})()`);
  chk(`[${mode}] every stored id follows the id rule`,st.ids.every(x=>ID_RE.test(x)),st.ids.filter(x=>!ID_RE.test(x)).join(' | '));
  chk(`[${mode}] links between the imported records kept (rifle→scope→reticle, card→rifle/projectile/weather)`,st.links);
  const live=await sweep(w,mode);
  chk(`[${mode}] no live markup, no handler ran, nothing threw — on every screen`,live.length===0&&w.errs.length===0,live.concat(w.errs).slice(0,6).join(' ; '));
}

// 1b. V2.16.4 D-06: a payload in a choice field (twist direction, units, pressure type …) refuses the record with the reason.
{const w=await open();const P=`x"'><i data-xss="enum"></i>`;
 w.eval(`importData(${JSON.stringify({schema:{rifles:1},rifles:[{id:'enumrifle',name:'Enum rifle',twist:508,sight:44,mv:255,zero:50,twistDir:P}]})})`);await wait(30);
 chk('D-06 payload in a choice field → record refused with the reason, nothing live',!J(w,"DB.rifles.some(r=>r.name==='Enum rifle')")&&/Enum rifle": twistDir .* is not one of right \/ left \/ smooth/.test(w.alerts.join('\n'))&&w.document.querySelectorAll('[data-xss]').length===0,w.alerts.join(' ').slice(-120));}

// 2. D-03: a form saves typed markup as literal text.
{const w=await open();w.eval("openProjForm(DB.projectiles[0].id);document.getElementById('pf-name').value='<b>Bold</b>';saveProj(DB.projectiles[0].id)");await wait(50);
 w.eval("openProjForm(DB.projectiles[0].id)");await wait(30);
 chk('D-03 a name typed with <b> is stored and shown as literal text',J(w,'DB.projectiles[0].name')==='<b>Bold</b>'&&$(w,'pf-name').value==='<b>Bold</b>'&&![...$(w,'mbox').querySelectorAll('b')].some(b=>b.textContent==='Bold'));}

// 3. A normal export → import round trip keeps every id and link.
{const a=await open();
 a.eval(`DB.rifles.push({...DB.rifles[0],id:'rt-rifle_1',name:'RT rifle',scopeId:DB.scopes[0].id});DB.projectiles.push({...DB.projectiles[0],id:'rt-proj_1',name:'RT proj'});
   DB.weathers.push({...DB.weathers[0],id:'rt-wx_1',name:'RT wx'});newDope();const c=DB.dopeCards[DB.dopeCards.length-1];c.id='rt-card_1';c.name='RT card';c.rifleId='rt-rifle_1';c.projId='rt-proj_1';c.cwxId='@zero';`);
 const exp=J(a,'({...DB,schema:SCHEMA})');   // data only: preferences would open the review (two installs differ in layout ids)
 const b=await open();b.eval('importData('+JSON.stringify(exp)+')');await wait(50);
 if(b.document.getElementById('modal').classList.contains('open'))[...b.document.querySelectorAll('#mbox button')].find(x=>x.textContent==='Import').click();   // seeded profiles clash between installs
 await wait(50);
 const c=J(b,"DB.dopeCards.find(x=>x.name==='RT card')");
 chk('round trip: own ids kept, card links intact, Same-as-zero kept',J(b,"['rt-rifle_1','rt-proj_1'].every(id=>DB.rifles.concat(DB.projectiles).some(x=>x.id===id))&&DB.weathers.some(x=>x.id==='rt-wx_1')")&&c&&c.id==='rt-card_1'&&c.rifleId==='rt-rifle_1'&&c.projId==='rt-proj_1'&&c.cwxId==='@zero',JSON.stringify(c&&{id:c.id,r:c.rifleId,p:c.projId,w:c.cwxId}));}

// 4. D-14 + D-15: duplicate ids in one file; prototype-named links.
{const w=await open();
 w.eval(`importData({schema:{projectiles:1},projectiles:[{id:'dup',name:'Dup A',cal:'.25',type:'slug',diam:6.35,mass:60,bcg7:0.1,bcg1:0.2},{id:'dup',name:'Dup B',cal:'.25',type:'slug',diam:6.35,mass:61,bcg7:0.1,bcg1:0.2}]})`);await wait(30);
 const ids=J(w,"DB.projectiles.filter(p=>/^Dup /.test(p.name)).map(p=>p.id)");
 chk('D-14 two records with one id in a file → two distinct ids',ids.length===2&&ids[0]!==ids[1],ids.join(','));
 w.eval(`importData({schema:{dopeCards:2},dopeCards:[{id:'protocard',name:'Proto card',rifleId:'__proto__',projId:'constructor',cwxId:'toString',mv:255,zero:50,notes:'',stages:[]}]})`);await wait(30);
 const c=J(w,"(()=>{const c=DB.dopeCards.find(x=>x.name==='Proto card');return{r:typeof c.rifleId,p:typeof c.projId,w:typeof c.cwxId,rv:c.rifleId}})()");
 chk('D-15 links named __proto__ / constructor / toString stay plain text, never an object or function',c.r==='string'&&c.p==='string'&&c.w==='string'&&c.rv==='__proto__',JSON.stringify(c));}

// 5. D-04: a link with only new items opens the review; nothing is added until Import; Cancel adds nothing.
{const proj={id:'link-proj',name:'Linked slug',cal:'.25',mfg:'Shared',type:'slug',diam:6.35,mass:60,oal:12.9,bcg7:0.11,bcg1:0.2,c:0,ff:1};
 const code=share({schema:{projectiles:1},projectiles:[proj]});
 const w=await open({url:'https://x.test/index.html#import='+code});
 const has=()=>J(w,"DB.projectiles.some(p=>p.name==='Linked slug')");
 chk('D-04 link with only new items → review sheet open, nothing added yet',$(w,'modal').classList.contains('open')&&/1 new item/.test($(w,'mbox').textContent)&&!has());
 [...w.document.querySelectorAll('#mbox button')].find(b=>b.textContent==='Import').click();await wait(30);
 chk('D-04 Import adds it',has());
 const w2=await open({url:'https://x.test/index.html#import='+code});
 [...w2.document.querySelectorAll('#mbox button')].find(b=>b.textContent==='Cancel').click();await wait(30);
 chk('D-04 Cancel adds nothing',!J(w2,"DB.projectiles.some(p=>p.name==='Linked slug')"));
 const w3=await open();w3.eval('receiveShare('+JSON.stringify('try this: '+code)+')');await wait(300);
 chk('D-04 a pasted code opens the review too',$(w3,'modal').classList.contains('open')&&/1 new item/.test($(w3,'mbox').textContent)&&!J(w3,"DB.projectiles.some(p=>p.name==='Linked slug')"));
 const w4=await open();w4.eval(`importData({schema:{projectiles:1},projectiles:[${JSON.stringify({...proj,id:'file-proj',name:'File slug'})}]})`);await wait(30);
 chk('D-04 file import of only new items is unchanged (added at once)',J(w4,"DB.projectiles.some(p=>p.name==='File slug')")&&!$(w4,'modal').classList.contains('open'));}

// 6. D-16: size limits.
{const w=await open();
 const big=Buffer.alloc(50e6,32);const bomb='SEN1:'+crc(big)+'.'+zlib.deflateRawSync(big,{level:9}).toString('base64url');
 const t0=Date.now();const r=await w.eval('decodeShare('+JSON.stringify(bomb)+').then(()=>"accepted",e=>e.message)');const dt=Date.now()-t0;
 chk('D-16 50 MB decompression bomb refused within a second',/more than 1 MB|too large/.test(r)&&dt<1000,r+' · '+dt+' ms · code '+bomb.length+' chars');
 const huge='SEN1:00000000.'+'A'.repeat(70000);const r2=await w.eval('decodeShare('+JSON.stringify(huge)+').then(()=>"accepted",e=>e.message)');
 chk('D-16 share code over 64 kB refused before decoding',/over 64 kB/.test(r2),r2);
 const ok=await w.eval('decodeShare('+JSON.stringify(share({schema:{projectiles:1},projectiles:[{id:'a',name:'n',diam:6.35,mass:60}]}))+').then(d=>d.projectiles[0].name,e=>e.message)');
 chk('D-16 a normal share still decodes',ok==='n',ok);
 w.eval("window._fr=0;const F=window.FileReader;window.FileReader=function(){window._fr++;return new F();};importAll({files:[{size:11*1024*1024,name:'big.json'}],value:'x'})");
 chk('D-16 import file over 10 MB refused before reading',J(w,'window._fr')===0&&/larger than 10 MB/.test(w.alerts[w.alerts.length-1]||''));
 w.alerts.length=0;w.eval(`importData({schema:{reticles:1},reticles:[{id:'manyhash',name:'Many hashes',fp:'FFP',dotMrad:0.1,hashes:Array.from({length:65},(_, i)=>i/10),verified:false}]})`);await wait(30);
 chk('D-16 a reticle with more than 64 hash marks is refused with the reason',!J(w,"DB.reticles.some(r=>r.name==='Many hashes')")&&/Many hashes": hash marks missing or more than 64/.test(w.alerts.join('\n'))&&w.errs.length===0,w.alerts.join(' ').slice(0,160));}

// 7. D-02 at start: a store already holding bad ids boots clean, with its links repaired.
{const idb=new IDBFactory(),a=await open({idb,quiet:true});
 const bad='x"><i data-xss="stored"></i>';
 a.eval(`const r=DB.rifles[0],p=DB.projectiles.find(x=>/Queen/.test(x.name)&&x.bcg7>0);r.id=${JSON.stringify(bad)};p.id=${JSON.stringify(bad+'p')};
   S.rifleId=r.id;S.projId=p.id;newDope();const c=DB.dopeCards[DB.dopeCards.length-1];c.name='Stored card';c.rifleId=r.id;c.projId=p.id;c.stages[0].id=${JSON.stringify(bad+'s')};saveDB();`);
 await wait(150);a.close();
 const b=await open({idb});
 const s=J(b,"(()=>{const c=DB.dopeCards.find(x=>x.name==='Stored card'),r=DB.rifles.find(x=>x.id===S.rifleId),p=DB.projectiles.find(x=>x.id===S.projId);return{r:S.rifleId,p:S.projId,rOk:!!r,pQ:p&&/Queen/.test(p.name),cr:c.rifleId===S.rifleId,cp:c.projId===S.projId,st:c.stages[0].id}})()");
 const ok=[s.r,s.p,s.st].every(x=>ID_RE.test(x));
 chk('D-02 at start: bad stored ids replaced; session, card links follow',ok&&s.rOk&&s.pQ&&s.cr&&s.cp,JSON.stringify(s));
 b.eval("gotoPage('profiles');renderProfiles();gotoPage('dope');document.getElementById('dc-sel').value=DB.dopeCards.find(x=>x.name==='Stored card').id;loadDope()");await wait(40);
 chk('D-02 at start: no live markup from the old ids',b.document.querySelectorAll('[data-xss]').length===0&&b.errs.length===0);
 const c2=await open({idb});chk('D-02 at start: idempotent (next start keeps the same ids)',J(c2,'S.rifleId')===s.r);}

// 8. W-09: scope file goes through the sanitiser; preview in the scope's unit; magnification imported.
{const w=await open();
 const P=k=>`${k}"'><i data-xss="${k}"></i>`;
 const file={senScopeImport:1,scope:{name:P('sf.name'),sku:P('sf.sku'),adjUnit:'moa',click:0.25,elev:60,wind:60,cpr:60,magMin:4,magMax:24,source:P('sf.source'),notes:P('sf.notes'),reticleId:P('sf.ret')},
   reticle:{id:P('sf.rid'),name:P('sf.rname'),fp:'SFP',dotMrad:0.1,hashes:[1,2],windHashes:[1],treeRows:[],verified:false,extra:'<script>x</script>'}};
 w._file=new w.File([JSON.stringify(file)],'scope.json',{type:'application/json'});
 w.eval('onScopeImport({files:[window._file],value:"x"})');await wait(200);
 const sc=J(w,"DB.scopes.find(s=>/sf\\.name/.test(s.name))"),rt=sc&&J(w,`DB.reticles.find(r=>r.id===${JSON.stringify(sc.reticleId)})`);
 const pv=w.confirms[w.confirms.length-1]||'';
 chk('W-09 preview shows the click in the scope unit (MOA) and the magnification',/Click: 0\.25 MOA/.test(pv)&&!/mrad/.test(pv.split('Reticle')[0])&&/4–24×/.test(pv),pv.split('\n').slice(2,5).join(' / '));
 chk('W-09 scope imported with magnification; bundled reticle sanitised (id rule, no unknown fields)',!!sc&&sc.magMin===4&&sc.magMax===24&&rt&&ID_RE.test(rt.id)&&!('extra' in rt));
 w.eval(`gotoPage('profiles');renderProfiles();['scopes','reticles'].forEach(s=>{try{setProfSub(s)}catch(e){}});openScopeForm(${JSON.stringify(sc.id)});`);await wait(40);
 w.eval(`closeModal();DB.rifles[0].scopeId=${JSON.stringify(sc.id)};Bus.setRifle(DB.rifles[0].id);Bus.notify();gotoPage('home');renderQuick()`);await wait(40);
 chk('W-09 no live markup from the scope file (Profiles, scope form, Home caption)',w.document.querySelectorAll('[data-xss]').length===0&&w.errs.length===0,w.errs.join('; '));
 w._bad=new w.File([JSON.stringify({senScopeImport:1,scope:{name:'No click',elev:20}})],'bad.json');
 w.eval('onScopeImport({files:[window._bad],value:"x"})');await wait(200);
 chk('W-09 a scope without a click is refused with the reason',/Scope: missing click/.test(w.alerts[w.alerts.length-1]||''),w.alerts[w.alerts.length-1]);}

all.forEach(x=>x.close());
console.log(`\nRESULT: PASS ${pass} / FAIL ${fail}`);
process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
