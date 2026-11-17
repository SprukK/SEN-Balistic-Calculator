// Trued-state test (V2.16.4, review release R3): trued BCs and profile values reach the dope.
// P-01 velocity truing re-pulls the session BC · W-01 edits of the active profile reach the session (manual values stay) ·
// P-02 + D-07 trued state through export / import, pre-V1.24.2 exports converted once · P-05 a typed BC ends the trued state ·
// P-07 a manual or trial BC is not overridden by bands · W-04 hand-set session values survive a restart ·
// D-06 import ranges and choices (limits set by the owner's own export, T-1). Known answers from the Physics review.
// Usage: node truedstatetest.js <app.html>   (needs jsdom + fake-indexeddb; see README.md)
const {JSDOM,VirtualConsole}=require('jsdom'),fs=require('fs');
const {IDBFactory,IDBKeyRange}=require('fake-indexeddb');
const FILE=process.argv[2];
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let pass=0,fail=0;
const chk=(n,ok,extra)=>{console.log((ok?'  PASS  ':'  FAIL  ')+n+(extra?'   '+extra:''));ok?pass++:fail++;};
const all=[];
async function open(idb,quiet){
  const dom=new JSDOM(fs.readFileSync(FILE,'utf8'),{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',...(quiet?{virtualConsole:new VirtualConsole()}:{}),
    beforeParse(w){if(idb){w.indexedDB=idb;w.IDBKeyRange=IDBKeyRange;}
      Object.defineProperty(w,'innerWidth',{configurable:true,value:412});Object.defineProperty(w,'innerHeight',{configurable:true,value:915});
      w.alerts=[];w.alert=m=>w.alerts.push(String(m));w.confirm=()=>true;w.scrollTo=()=>{};
      w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:(t,k)=>k==='measureText'?()=>({width:10}):()=>{}});}});
  const w=dom.window;w.errs=[];w.addEventListener('error',e=>w.errs.push(e.message));await wait(700);all.push(w);return w;
}
const J=(w,e)=>JSON.parse(w.eval('JSON.stringify('+e+')'));
const $=(w,id)=>w.document.getElementById(id);
// the review's session: .25 Mora, Everyday Default as current and zero air, 50 m zero
const SESSION="Bus.setRifle(DB.rifles.find(r=>/\\.25/.test(r.name)).id);Bus.setWx('cur',DB.weathers[0].id);Bus.setWx('zero',DB.weathers[0].id);";
const QUEEN="DB.projectiles.find(p=>/^Altaros ATP Queen \\.25$/.test(p.name))";
const dial200=w=>J(w,"(()=>{const tr=homeTraj(225),z=zeroConds();return +solveShot(tr.pts,nearestPt,z.range,200,0,0,90,S.mv,0.1,z.wSpd,z.wDir).mrElev.toFixed(2)})()");
const drop200=w=>J(w,"+nearestPt(homeTraj(225).pts,200).drop.toFixed(2)");
const exportOf=(w,expr,app)=>J(w,`({projectiles:[${expr}].map(p=>JSON.parse(JSON.stringify(p))),schema:SCHEMA,app:${JSON.stringify(app)}})`);
const importAndTake=async(w,file)=>{w.eval('importData('+JSON.stringify(file)+')');await wait(40);
  if($(w,'modal').classList.contains('open'))[...w.document.querySelectorAll('#mbox button')].find(b=>b.textContent==='Import').click();await wait(40);};

(async()=>{
console.log('=== TRUED STATE TEST: '+FILE+' ===');

// 1. Known answers (Physics review): Queen trued G7 0.119, 255 m/s → 11.97 mrad at 200 m; as a maker BC (penalty) 12.09.
{const w=await open();
 w.eval(SESSION+`const q=${QUEEN};Bus.setProj(q.id);S.mv=255;S.src.mv='manual';q.bcg7=0.119;q.bcTrued='single·g7·2026-11-17';q.bcConv='native';Bus.pullFromProfiles(['bc']);Bus.notify();`);
 const trued=dial200(w);
 w.eval(`${QUEEN}.bcTrued=null;Bus.pullFromProfiles(['bc'])`);const maker=dial200(w);
 chk('known answer: trued 0.119 → 11.97 mrad at 200 m; the same number as a maker BC (Sg penalty) → 12.09',trued===11.97&&maker===12.09,trued+' / '+maker);}

// 2. P-02: the trued state survives export → import → restart (single and banded); malformed bands are dropped.
{const a=await open();
 a.eval(`const q=${QUEEN};DB.projectiles.push({...JSON.parse(JSON.stringify(q)),id:'qt-single',name:'Queen trued',bcg7:0.119,bcTrued:'drops·g7·2026-11-17·150m',bcConv:'native',bcBands:null});
   DB.projectiles.push({...JSON.parse(JSON.stringify(q)),id:'qt-band',name:'Queen banded',bcg7:0.12,bcTrued:'banded·g7·2026-11-17',bcConv:'native',bcBands:{drag:'g7',bands:[{vHi:280,vLo:240,bc:0.12},{vHi:240,vLo:200,bc:0.11}]}});
   DB.projectiles.push({...JSON.parse(JSON.stringify(q)),id:'qt-bad',name:'Queen bad bands',bcg7:0.12,bcTrued:'banded·g7·2026-11-17',bcConv:'native',bcBands:{drag:'g7',bands:[{vHi:200,vLo:240,bc:0.12}]}});`);
 const file=exportOf(a,"...DB.projectiles.filter(p=>/^qt-/.test(p.id))",'SEN Ballistics V2.16.4');
 const idb=new IDBFactory(),b=await open(idb);await importAndTake(b,file);
 b.eval(SESSION+"Bus.setProj('qt-single');S.mv=255;S.src.mv='manual';Bus.notify();saveDB();");await wait(150);
 const p1=J(b,"DB.projectiles.find(p=>p.id==='qt-single')");
 chk('P-02 trued BC imported with its state (bcTrued, bcConv native) → Home 11.97 mrad, no penalty',p1.bcTrued==='drops·g7·2026-11-17·150m'&&p1.bcConv==='native'&&dial200(b)===11.97&&J(b,'homeTraj(225).sgP')===1,String(dial200(b)));
 const bnd=J(b,"DB.projectiles.find(p=>p.id==='qt-band').bcBands");
 chk('P-02 banded BC imported field by field',JSON.stringify(bnd)===JSON.stringify({drag:'g7',bands:[{vHi:280,vLo:240,bc:0.12},{vHi:240,vLo:200,bc:0.11}]}));
 chk('P-02 malformed bands (vHi < vLo) are dropped, the projectile is kept',J(b,"(p=>!!p&&!p.bcBands)(DB.projectiles.find(p=>p.id==='qt-bad'))"));
 b.close();const c=await open(idb);
 chk('P-02 after a restart: still trued, still 0.119, still 11.97 mrad (not converted again — D-01 + bcConv)',J(c,"(p=>p.bcg7===0.119&&p.bcConv==='native')(DB.projectiles.find(p=>p.id==='qt-single'))")&&dial200(c)===11.97,String(dial200(c)));}

// 3. D-07: a pre-V1.24.2 export is converted once; a current one is not.
{const rec={id:'old-q',name:'Old trued Queen',cal:'.25',mfg:'Altaros',type:'slug',diam:6.35,mass:60,oal:12.9,bcg7:0.163,bcg1:0.245,c:0,ff:1.07,notes:'',bcTrued:'single·g7·2026-10-20'};
 const g1={...rec,id:'old-g1',name:'Old trued G1',bcg1:0.31,bcTrued:'single·g1·2026-10-20'};
 const idb=new IDBFactory(),w=await open(idb);
 await importAndTake(w,{schema:{projectiles:1},app:'SEN Ballistics V1.24.1',projectiles:[rec,g1]});
 await importAndTake(w,{schema:{projectiles:1},app:'SEN Ballistics V2.16.3',projectiles:[{...rec,id:'new-q',name:'New trued Queen'}]});
 const r=J(w,"['old-q','old-g1','new-q'].map(id=>(p=>({g7:p.bcg7,g1:p.bcg1,t:p.bcTrued,c:p.bcConv,n:p.notes}))(DB.projectiles.find(p=>p.id===id)))");
 chk('D-07 V1.24.1 export, trued G7 0.163 → 0.128, still trued, converted once',r[0].g7===0.128&&r[0].t==='single·g7·2026-10-20'&&r[0].c==='V1.24.2 ×π/4',JSON.stringify(r[0]));
 chk('D-07 V1.24.1 export, trued G1 → pending with the old value in the notes',r[1].g1===0&&/G1 BC 0.31 trued before V1.24.2/.test(r[1].n)&&r[1].c==='V1.24.2 re-true');
 chk('D-07 the same record from a V2.16.3 export → unchanged 0.163, native',r[2].g7===0.163&&r[2].c==='native');
 await wait(150);w.close();const w2=await open(idb);
 chk('D-07 neither changes at the next start',JSON.stringify(J(w2,"['old-q','new-q'].map(id=>DB.projectiles.find(p=>p.id===id).bcg7)"))==='[0.128,0.163]');}

// 4. P-01: Velocity truing on the session projectile → the session flies the trued BC.
{const w=await open();
 w.eval(SESSION+`Bus.setProj(${QUEEN}.id);S.mv=280;S.bc=0.2;S.src.bc='manual';Bus.notify();gotoPage('truing');setTruTab('vel');`);await wait(20);
 w.eval("document.getElementById('tu-mv').value=280;document.getElementById('tu-drag').value='g7';tuPoints=[{d:23,v:276}];tuSolve();tuApply();");
 chk('P-01 after Velocity truing the session BC = the trued profile BC, source profile (a typed BC is replaced)',J(w,'S.bc')===J(w,'getProj().bcg7')&&J(w,'S.src.bc')==='profile'&&J(w,'getProj().bcg7')!==0.2,String(J(w,'S.bc')));}

// 5. W-01: editing the active profile reaches the session; hand-set values stay.
{const w=await open();
 w.eval(SESSION+`Bus.setProj(${QUEEN}.id);Bus.notify();`);
 const save=(form,id,sets,saveFn)=>w.eval(`${form}(${JSON.stringify(id)});${Object.entries(sets).map(([k,v])=>`document.getElementById('${k}').value='${v}';`).join('')}${saveFn}(${JSON.stringify(id)})`);
 const pid=J(w,'S.projId'),rid=J(w,'S.rifleId'),wid=J(w,'S.curWxId');
 const d0=dial200(w);
 save('openProjForm',pid,{'pf-bcg7':'0.100'},'saveProj');
 chk('W-01 active projectile BC 0.128 → 0.100: session follows, Home dial changes',J(w,'S.bc')===0.1&&J(w,'S.src.bc')==='profile'&&dial200(w)!==d0);
 w.eval("S.bc=0.15;S.src.bc='manual'");save('openProjForm',pid,{'pf-bcg7':'0.110'},'saveProj');
 chk('W-01 a typed (manual) session BC stays when the profile is edited',J(w,'S.bc')===0.15&&J(w,'S.src.bc')==='manual');
 save('openRifleForm',rid,{'rf-mv':'280'},'saveRifle');
 chk('W-01 active rifle MV 255 → 280: session MV follows',J(w,'S.mv')===280);
 save('openWxForm',wid,{'wf-temp':'0'},'saveWx');
 chk('W-01 active weather 20 → 0 °C: session temperature follows',J(w,'S.ct')===0);}

// 6. P-05: a typed BC ends the trued state; other edits keep it.
{const w=await open();
 w.eval(SESSION+`const q=${QUEEN};Bus.setProj(q.id);S.mv=255;q.bcg7=0.119;q.bcTrued='single·g7·2026-11-17';q.bcConv='native';q.bcBands={drag:'g7',bands:[{vHi:280,vLo:240,bc:0.12},{vHi:240,vLo:200,bc:0.11}]};Bus.pullFromProfiles(['bc']);Bus.notify();`);
 w.eval(`openProjForm(S.projId);document.getElementById('pf-name').value='Queen renamed';saveProj(S.projId)`);
 chk('P-05 editing the name only keeps the trued state and the bands',J(w,"(p=>p.bcTrued==='single·g7·2026-11-17'&&!!p.bcBands)(getProj())"));
 w.eval(`openProjForm(S.projId);document.getElementById('pf-bcg7').value='0.128';saveProj(S.projId)`);
 const p=J(w,'getProj()');
 chk('P-05 typing a new BC clears bcTrued and the bands, with a note; the Sg penalty applies again',!p.bcTrued&&!p.bcBands&&/trued BC replaced by a typed value/.test(p.notes)&&J(w,'homeTraj(225).sgP')<1,JSON.stringify({t:p.bcTrued,sgP:J(w,'homeTraj(225).sgP')}));}

// 7. P-07: bands vs a manual or trial BC.
{const w=await open();
 w.eval(SESSION+`const q=${QUEEN};Bus.setProj(q.id);S.mv=280;S.src.mv='manual';q.bcg7=0.12;q.bcTrued='banded·g7·2026-11-17';q.bcConv='native';q.bcBands={drag:'g7',bands:[{vHi:280,vLo:240,bc:0.12},{vHi:240,vLo:200,bc:0.11}]};Bus.pullFromProfiles(['bc']);Bus.notify();`);
 const banded=drop200(w);w.eval(`getProj().bcg7=0.2;Bus.pullFromProfiles(['bc'])`);const banded2=drop200(w);
 w.eval(`S.bc=0.2;S.src.bc='manual'`);const manual=drop200(w);
 chk('P-07 manual BC 0.200 on a banded profile → drop at 200 m −1874.69 mm (review: no bands), bands not applied',manual===-1874.69,String(manual));
 chk('P-07 profile BC with bands → bands decide, whatever the fallback BC (−1966.64 mm for 0.120 / 0.110 at 280→240→200 m/s)',banded===banded2&&banded===-1966.64,banded+' / '+banded2);
 w.eval(`getProj().bcg7=0.12;Bus.pullFromProfiles(['bc']);gotoPage('truing');setTruTab('imp')`);await wait(20);
 const need=J(w,"(()=>{const tr=homeTraj(175,0.115),z=zeroConds();return solveShot(tr.pts,nearestPt,z.range,150,0,0,90,S.mv,0.1,z.wSpd,z.wDir).mrElev})()");
 const row=k=>w.document.querySelector('#td-rows .td-row [data-k="'+k+'"]');row('d').value='150';row('dial').value=need.toFixed(4);$(w,'td-unit').value='mrad';w.eval('tdSolve()');
 chk('P-07 drop truing on a banded projectile returns a BC (0.115), not "No BC fits"',Math.abs(J(w,'tdLast&&tdLast.bc')-0.115)<2e-4&&!/No BC fits/.test($(w,'td-result').textContent),String(J(w,'tdLast&&tdLast.bc')));}

// 8. W-04: hand-set session values survive a restart with their source; profile values are re-read.
{const idb=new IDBFactory(),a=await open(idb);
 a.eval(SESSION+`Bus.setProj(${QUEEN}.id);S.mv=281.4;S.src.mv='chrono';S.bc=0.119;S.src.bc='manual';Bus.notify();saveDB();`);await wait(150);
 a.eval("DB.weathers[0].temp=5;saveDB()");await wait(150);a.close();
 const b=await open(idb);
 chk('W-04 chrono MV 281.4 and manual BC 0.119 kept with their sources',J(b,'[S.mv,S.src.mv,S.bc,S.src.bc].join()')==='281.4,chrono,0.119,manual',J(b,'[S.mv,S.src.mv,S.bc,S.src.bc].join()'));
 chk('W-04 a profile-sourced field follows the edited profile (temperature 20 → 5 °C)',J(b,'S.ct')===5&&J(b,'S.src.ct')==='profile');
 chk('W-04 one line says what was kept',/MV 281.4 m\/s \(chrono\), BC 0.119 \(typed\) kept from last session/.test(($(b,'sen-toast')||{}).textContent||''),($(b,'sen-toast')||{}).textContent);
 b.eval("S.src.mv='<b>';S.mv='x';saveDB()");await wait(150);b.close();
 const c=await open(idb);
 chk('W-04 a damaged stored source or value falls back to the profile',J(c,'S.src.mv')==='profile'&&J(c,'S.mv')===J(c,'getRifle().mv')&&c.errs.length===0);}

// 9. D-06: one refusal per rule, with the reason.
{const w=await open();
 const base={rifles:{id:'r6',name:'R6',twist:508,sight:44,mv:255,zero:50},weathers:{id:'w6',name:'W6',temp:20,pres:975,rh:65,alt:298},scopes:{id:'s6',name:'S6',click:0.1,elev:26,wind:16},
   projectiles:{id:'p6',name:'P6',type:'slug',diam:6.35,mass:60,bcg7:0.12,bcg1:0.24},reticles:{id:'t6',name:'T6',fp:'FFP',dotMrad:0.1,hashes:[1,2]},
   dopeCards:{id:'c6',name:'C6',mv:255,zero:50,stages:[{id:'st6',name:'S',dists:[{id:'d6',range:100,angle:0,wind:0,wdir:90}]}]}};
 const cases=[['rifles',{zPres:0},/zPres 0 outside \(0, 1100\]/],['rifles',{twist:0.001},null],['rifles',{mv:999},/mv 999 outside/],['rifles',{zPresType:'moon'},/zPresType "moon" is not one of sea \/ station/],
   ['weathers',{rh:900},/rh 900 outside \[0, 100\]/],['weathers',{temp:-90},/temp -90 outside/],['scopes',{click:1e-9},null],['scopes',{click:9},/click 9 outside/],['scopes',{adjUnit:'furlong'},/adjUnit/],
   ['projectiles',{type:'banana'},/type "banana" is not one of slug \/ pellet/],['projectiles',{bcg7:3},/bcg7 3 outside \[0, 2\]/],['reticles',{fp:'XYZ'},/fp "XYZ"/],['reticles',{hashes:[1,200]},/reticle marks outside 0–100 mrad/],
   ['dopeCards',{stages:[{id:'st7',name:'S',dists:[{id:'d7',range:0,angle:0,wind:0,wdir:90}]}]},/target distance 0 outside/],['dopeCards',{stages:[{id:'st8',name:'S',dists:[{id:'d8',range:100,angle:120,wind:0,wdir:90}]}]},/target angle 120/]];
 const bad=[];
 for(const [t,patch,re] of cases){w.alerts.length=0;const rec={...base[t],...patch,name:base[t].name+JSON.stringify(patch).slice(0,30)};
   w.eval('importData('+JSON.stringify({schema:{rifles:1,projectiles:1,weathers:1,scopes:1,reticles:1,dopeCards:2},[t]:[rec]})+')');await wait(10);
   const txt=w.alerts.join('\n'),refused=!J(w,`DB.${t}.some(x=>x.name===${JSON.stringify(rec.name)})`)&&/Not imported \(invalid\)/.test(txt);
   if(!refused||(re&&!re.test(txt)))bad.push(t+' '+JSON.stringify(patch)+' → '+(txt.split('invalid):')[1]||'imported').trim().slice(0,90));}
 chk('D-06 every out-of-range number and unknown choice refuses its record with the reason (15 cases)',bad.length===0,bad.join(' | '));
 // values the owner's own export holds (T-1) — must all import
 w.alerts.length=0;
 const own={schema:{rifles:1,projectiles:1,weathers:1,scopes:1,reticles:1,dopeCards:2},
   rifles:[{id:'o-r',name:'Own rifle',twist:508,blen:700,sight:44,mv:255,zero:50,notes:'',scopeId:'o-s',railOn:false,railMrad:0,railUnit:'mil',downClicks:'',zwSpd:0,zwDir:90,zTemp:20,zPres:1010,zRH:65,reg1:'',reg2:'',ssj:false,regDelta:'',dwell:'',zPresType:'sea',zAlt:300}],
   projectiles:[{id:'o-p1',name:'Own pending',cal:'.457',type:'slug',mfg:'AEA',diam:11.61,mass:335,oal:0,bcg7:0,bcg1:0,c:0,ff:0,notes:''},
     {id:'o-p2',name:'Own pellet',cal:'.25',mfg:'AEA',type:'pellet',diam:6.35,mass:29.5,oal:0,c:0,bcg7:0.1,bcg1:0.2,ff:1.07,notes:'',noseL:null,rtr:null,meplat:null,baseD:null,dens:null}],
   weathers:[{id:'o-w',name:'Own worst case',temp:-5,pres:1013,rh:80,alt:0,notes:'',presType:'sea'}],
   scopes:[{id:'o-s',name:'Own capped',sku:'SCOC-37',adjUnit:'moa',click:0.5,elev:140,wind:140,cpr:0,magMin:1,magMax:8,reticleId:null,source:'',notes:''},
     {id:'o-s2',name:'Own Tauron',sku:'SCFF-66',adjUnit:'mil',click:0.1,elev:17.5,wind:16,cpr:0,magMin:5,magMax:30,reticleId:null,source:'',notes:''}],
   dopeCards:[{id:'o-c1',name:'Dup card',rifleId:'o-r',projId:'o-p2',cwxId:'o-w',mv:255,zero:50,notes:'',stages:[{id:'o-st1',name:'Ranged',notes:'',time:null,rf:true,dists:[]}]},
     {id:'o-c2',name:'Dup card',rifleId:'o-r',projId:'o-p2',cwxId:'o-w',mv:255,zero:50,notes:'',stages:[{id:'o-st2',name:'Stage 1',notes:'',time:null,dists:[{id:'o-d',range:50,angle:0,wind:0,wdir:90,label:'T1',brg:120,size:15,pos:'stand',shots:2}]}]}]};
 await importAndTake(w,own);
 const got=J(w,"['o-r','o-p1','o-p2','o-w','o-s','o-s2'].map(id=>DB.rifles.concat(DB.projectiles,DB.weathers,DB.scopes).some(x=>x.id===id)).concat(DB.dopeCards.filter(c=>/^Dup card/.test(c.name)).length===2)");
 chk('D-06 values from the owner\'s export (T-1) import: BC/OAL/ff 0, null shape, cpr 0, 17.5 / 140 travel, −5 °C at 0 m, empty strings, empty ranged stage, duplicate names',got.every(Boolean)&&!/Not imported/.test(w.alerts.join('\n')),JSON.stringify(got)+' '+(w.alerts.join(' ').split('invalid):')[1]||''));}

const errs=all.flatMap(x=>x.errs);chk('ZERO uncaught errors',errs.length===0,errs.slice(0,3).join(' / '));
all.forEach(x=>x.close());
console.log(`\nRESULT: PASS ${pass} / FAIL ${fail}`);
process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
