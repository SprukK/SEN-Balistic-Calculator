// Warnings, truing sensitivity, two windows and the course summary (V2.17.0, review release R6).
// P-08 Sg < 1.0 warned on every dope screen, dope kept, no penalty on a trued BC (known answer: King, −5 °C,
//      1013 hPa, 229 m/s, 1:20″ → Sg 0.938, reproduced with Miller's formula by hand);
// P-09 diabolo (pellet above M 0.80, always) and transonic (slug touching M 0.8–1.2, hidden by the setting) warnings
//      on Home, Trajectory, Solver, Holds and dope cards — keyed on the projectile type, not the drag model;
// P-11 velocity-truing sensitivity per 1 m/s, against the independent reference tests/p11ref.py;
// D-09 two windows on one store: the second writer is refused with a reload banner, the first window's data kept;
// CALC-27 course summary after the last target of the last stage, with go-back.
// Usage: node warntest.js <app.html>   (needs jsdom + fake-indexeddb; see README.md)
const {JSDOM}=require('jsdom'),fs=require('fs');
const {IDBFactory,IDBKeyRange}=require('fake-indexeddb');
const FILE=process.argv[2];
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let pass=0,fail=0;
const chk=(n,ok,extra)=>{console.log((ok?'  PASS  ':'  FAIL  ')+n+(extra?'   '+extra:''));ok?pass++:fail++;};
const all=[];
// p11ref.py output (BC 0.128, 280 m/s, Everyday Default, 23 m)
const P11={V23:275.97907602283794,vd:{'-1':0.10220595882432149,'-0.3':0.11900818274551994,'0.3':0.13844174627305877,'1':0.17087090895343154},
  v0:{'-1':0.16987725449244095,'-0.3':0.1381997292264841,'0.3':0.11921659365715334,'1':0.10280380934993474}};
async function open({idb,chan}={}){
  const dom=new JSDOM(fs.readFileSync(FILE,'utf8'),{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/?numfmt=point',
    beforeParse(w){if(idb){w.indexedDB=idb;w.IDBKeyRange=IDBKeyRange;}if(chan)w.BroadcastChannel=BroadcastChannel;
      Object.defineProperty(w,'innerWidth',{configurable:true,value:412});Object.defineProperty(w,'innerHeight',{configurable:true,value:915});
      w.alerts=[];w.alert=m=>w.alerts.push(String(m));w.confirm=()=>true;w.scrollTo=()=>{};w.print=()=>{};
      w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:(t,k)=>k==='measureText'?()=>({width:10}):()=>{}});}});
  const w=dom.window;w.errs=[];w.addEventListener('error',e=>w.errs.push(e.message));await wait(900);all.push(w);return w;
}
const J=(w,e)=>JSON.parse(w.eval('JSON.stringify('+e+')'));
const $=(w,id)=>w.document.getElementById(id);
const warn=w=>$(w,'store-warn').style.display!=='none'?$(w,'store-warn').textContent:'';
const setup=(proj,mv,wx)=>`Bus.setRifle(DB.rifles.find(r=>/\\.25/.test(r.name)).id);Bus.setProj(DB.projectiles.find(p=>p.name===${JSON.stringify(proj)}).id);`+
  (wx?`DB.weathers.push(${JSON.stringify(wx)});Bus.setWx('cur','${wx.id}');Bus.setWx('zero',DB.weathers[0].id);`:`Bus.setWx('cur',DB.weathers[0].id);Bus.setWx('zero',DB.weathers[0].id);`)+
  `S.mv=${mv};S.src.mv='manual';Bus.notify();`;
const screens=(w,dist)=>{   // text of every dope screen at the session, target `dist`
  w.eval(`Bus.set('dist_m',${dist});gotoPage('home');renderQuick()`);const home=$(w,'home-status').textContent;
  w.eval("gotoPage('advanced');runTraj(true);renderTraj&&renderTraj()");const traj=$(w,'tr-flags').textContent;
  w.eval(`document.getElementById('sv-tdist').value=${dist};solve()`);const solver=$(w,'sv-flags').textContent;
  w.eval(`gotoPage('holds');document.getElementById('hd-from').value=25;document.getElementById('hd-to').value=${dist};document.getElementById('hd-step').value=25;renderHolds()`);const holds=$(w,'hd-flags').textContent;
  w.eval(`gotoPage('dope');newDope();const c=getCard();c.mv=S.mv;c.stages=[{id:'s1',name:'S1',time:null,dists:[{id:'t1',label:'T1',range:${dist},angle:0,shots:1}]}];saveDB();loadDope();calcDope()`);
  const card=$(w,'dc-note').textContent,print=w.eval('dopePrintHTML(getCard())')||'';
  return{home,traj,solver,holds,card,print};
};

(async()=>{
console.log('=== WARNINGS / TRUING / TWO WINDOWS / COURSE SUMMARY TEST: '+FILE+' ===');

// 1. P-08: Sg < 1.0
{const w=await open();
 w.eval(setup('Altaros ATP King .25',229,{id:'wk',name:'Worst case (station)',temp:-5,pres:1013,presType:'station',rh:80}));
 const sg=J(w,'sessionSg().sg');
 chk('P-08 known answer: King 66 gr, 1:20″, −5 °C, 1013 hPa, 229 m/s → Sg 0.938 (hand reproduction 0.9377)',Math.abs(sg-0.9377)<0.001,sg.toFixed(4));
 const s=screens(w,100);
 chk('P-08 Home status warns (short)',/Sg 0\.94 < 1 tumble risk/.test(s.home),s.home.slice(0,160));
 chk('P-08 Trajectory, Solver, Holds, dope card and print carry the full warning',['traj','solver','holds','card','print'].every(k=>/Sg 0\.94 (<|&lt;) 1\.0 — Miller predicts a tumble/.test(s[k])),['traj','solver','holds','card','print'].filter(k=>!/Sg 0\.94 (<|&lt;) 1\.0/.test(s[k])).join());
 chk('P-08 the dope is kept (Home shows a solution)',/^[↑↓]\d+$/.test($(w,'home-elev').textContent),$(w,'home-elev').textContent);
 chk('P-08 penalty unchanged: Sg 0.938 → BC ×(0.938/1.5)^0.4',Math.abs(J(w,'homeTraj().sgP')-Math.pow(sg/1.5,0.4))<1e-12);
 w.eval("getProj().bcTrued='drops·g7·2026-11-17';getProj().bcConv='native';Bus.notify()");
 const s2=screens(w,100);
 chk('P-08 a trued BC: warning still shown, no penalty applied',/Sg 0\.94 < 1 tumble risk/.test(s2.home)&&J(w,'homeTraj().sgP')===1);
 chk('P-08 Formulas page says the penalty is extrapolated below 1.0',/extrapolated/.test(J(w,"FORMULAS.find(f=>f.name==='Under-stabilisation BC penalty').eq")));}

// 2. P-09: Mach warnings by projectile type
{const w=await open();
 w.eval(setup('AEA CP .25 — 33.9 gr',290));let s=screens(w,50);
 chk('P-09 pellet 290 m/s (M 0.845): diabolo warning on Home, Trajectory, Solver, Holds, card and print',/diabolo above M 0\.80/.test(s.home)&&['traj','solver','holds','card','print'].every(k=>/Diabolo above Mach 0\.80/.test(s[k])),s.home.slice(0,140));
 w.eval("setApp('transonicWarn',false)");s=screens(w,50);
 chk('P-09 Settings → Transonic warnings off: the diabolo warning still shows',/diabolo above M 0\.80/.test(s.home)&&/Diabolo above Mach 0\.80/.test(s.traj));
 w.eval("setApp('transonicWarn',true)");
 w.eval(setup('Altaros ATP Queen .25',300));s=screens(w,100);
 chk('P-09 Queen 300 m/s (M 0.874): transonic warning on Home, Trajectory, Solver, Holds, card',/transonic/.test(s.home)&&['traj','solver','holds','card'].every(k=>/transonic zone/.test(s[k])),s.home.slice(0,140));
 w.eval("S.drag='g1';Bus.notify()");s=screens(w,100);
 chk('P-09 a slug on G1 gets the transonic warning, never the diabolo one',/transonic/.test(s.home)&&!/iabolo/.test(s.home+s.traj+s.solver+s.holds));
 w.eval("S.drag='g7';Bus.notify()");
 w.eval(setup('Altaros ATP Queen .25',420));s=screens(w,100);
 chk('P-09 Queen 420 m/s (launch M 1.22, slows through the zone): transonic warning',/transonic/.test(s.home)&&/transonic zone/.test(s.traj));
 w.eval(setup('Altaros ATP Queen .25',255));s=screens(w,100);
 chk('P-09 Queen 255 m/s (M 0.74): no Mach warning anywhere',!/transonic|iabolo/.test(s.home+s.traj+s.solver+s.holds+s.card));
 w.eval("setApp('transonicWarn',false)");w.eval(setup('Altaros ATP Queen .25',300));s=screens(w,100);
 chk('P-09 setting off: the slug transonic warning is hidden',!/transonic/.test(s.home+s.traj+s.solver+s.holds+s.card));
 w.eval("setApp('transonicWarn',true)");}

// 3. P-11: velocity-truing sensitivity
{const w=await open();
 w.eval("gotoPage('truing');setTruTab('vel')");await wait(20);
 const pid=J(w,"DB.projectiles.find(p=>p.name==='Altaros ATP Queen .25').id");
 w.eval(`document.getElementById('tu-proj').value='${pid}';document.getElementById('tu-mv').value=280;document.getElementById('tu-drag').value='g7';
   document.getElementById('tu-temp').value=20;document.getElementById('tu-pres').value=String(stationPres(1010,298));document.getElementById('tu-rh').value=65;
   tuPoints=[{d:23,v:${P11.V23}}];tuSolve()`);
 const R=J(w,'tuLastResult');
 chk('P-11 the reference V₂₃ trues back to 0.128',Math.abs(R.bc-0.128)<3e-4,R.bc.toFixed(5));
 const near=(a,b)=>Math.abs(a-b)<1e-3;
 chk('P-11 V @ 23 m ±1 m/s → BC 0.1022 … 0.1709 (p11ref.py)',near(R.sens.vd[0],P11.vd['-1'])&&near(R.sens.vd[1],P11.vd['1']),R.sens.vd.map(x=>x.toFixed(4)).join(' / '));
 chk('P-11 V₀ ±1 m/s → BC 0.1699 … 0.1028 (p11ref.py)',near(R.sens.v0[0],P11.v0['1'])&&near(R.sens.v0[1],P11.v0['-1']),R.sens.v0.map(x=>x.toFixed(4)).join(' / '));
 const rho=J(w,'airDensity(20,stationPres(1010,298),65)'),aS=J(w,'sos(20)'),tb=(v0,vd)=>J(w,`trueBCsingle(${v0},60,23,${vd},${rho},${aS},'g7').bc`);
 chk('P-11 review known answers ±0.3 m/s: V₂₃ → 0.1190 / 0.1384, V₀ → 0.1382 / 0.1192',near(tb(280,P11.V23-0.3),P11.vd['-0.3'])&&near(tb(280,P11.V23+0.3),P11.vd['0.3'])&&near(tb(279.7,P11.V23),P11.v0['-0.3'])&&near(tb(280.3,P11.V23),P11.v0['0.3']),
   [tb(280,P11.V23-0.3),tb(280,P11.V23+0.3),tb(279.7,P11.V23),tb(280.3,P11.V23)].map(x=>x.toFixed(4)).join(' / '));
 chk('P-11 the result says it is a sensitivity, not an uncertainty band',/Sensitivity: V @ 23 m ±1\.0 m\/s → BC 0\.10\d\d … 0\.17\d\d/.test($(w,'tu-result').textContent)&&/sensitivity per 1\.0 m\/s, not an uncertainty band/.test($(w,'tu-result').textContent));}

// 4. D-09: two windows on one store. A window saves once while starting, so the window opened LAST is the
//    current writer; the earlier one must be refused (the review's case: one window's rifle lost to the other's save).
{const idb=new IDBFactory();
 const a=await open({idb}),b=await open({idb});
 b.eval("DB.weathers.push({...DB.weathers[0],id:'wb',name:'FROM WINDOW B'});saveDB()");await wait(150);
 chk('D-09 the newer window saves normally',warn(b)==='');
 a.eval("DB.rifles.push({...DB.rifles[0],id:'ra',name:'FROM WINDOW A'});saveDB()");await wait(150);
 chk('D-09 the older window is refused: banner "changed in another window — reload", with a Reload button',/changed in another window/.test(warn(a))&&!!$(a,'store-warn').querySelector('button')&&$(a,'store-warn').querySelector('button').textContent==='Reload',warn(a).slice(0,90));
 a.eval("DB.rifles.push({...DB.rifles[0],id:'ra2',name:'A AGAIN'});saveDB()");await wait(150);
 b.eval("DB.weathers.push({...DB.weathers[0],id:'wb2',name:'B AGAIN'});saveDB()");await wait(150);
 chk('D-09 the older window saves nothing more; the newer one keeps saving',warn(b)===''&&/changed in another window/.test(warn(a)));
 a.close();b.close();
 const c=await open({idb});
 chk('D-09 after a reload: both of B\'s weathers are there, nothing from the refused window — no silent loss',J(c,"['FROM WINDOW B','B AGAIN'].every(n=>DB.weathers.some(x=>x.name===n))&&!DB.rifles.some(r=>/WINDOW A|A AGAIN/.test(r.name))"));
 c.eval("DB.rifles.push({...DB.rifles[0],id:'rc',name:'AFTER RELOAD'});saveDB()");await wait(150);
 chk('D-09 the reloaded window saves normally',warn(c)===''&&J(c,'myRev')>=3);c.close();
 // BroadcastChannel: the earlier window is told at once, before it tries to save
 const idb2=new IDBFactory(),x=await open({idb:idb2,chan:true});chk('D-09 one window alone: no banner',warn(x)==='');
 const y=await open({idb:idb2,chan:true});await wait(100);
 chk('D-09 BroadcastChannel: opening a second window shows the banner in the first one at once',/changed in another window/.test(warn(x))&&warn(y)==='');
 x.eval('senChan&&senChan.close()');y.eval('senChan&&senChan.close()');x.close();y.close();}

// 5. CALC-27: course summary
{const w=await open();
 w.eval(setup('Altaros ATP Queen .25',255)+`newDope();const c=getCard();c.name='PRS test';c.mv=255;c.stages=[
   {id:'sa',name:'Barricade',time:90,dists:[{id:'ta1',label:'A1',range:50,angle:0,shots:2},{id:'ta2',label:'A2',range:75,angle:0,shots:1}]},
   {id:'sb',name:'Prone',time:null,dists:[{id:'tb1',label:'B1',range:100,angle:0,shots:1}]}];saveDB();courseSelect(c.id)`);
 w.eval("courseTimer();APP.run.start=Date.now()-42000");
 w.eval('courseCall(true);courseCall(false);courseCall(true)');
 chk('CALC-27 stage 1 done → stage 2 (time recorded 42 s)',J(w,'APP.run.si')===1&&Math.abs(J(w,'APP.run.times[0]')-42)<=1&&!J(w,'!!APP.run.done'));
 w.eval('courseCall(false)');w.eval('renderCourse(homeTraj())');
 const box=$(w,'cs-targets').textContent,head=$(w,'cs-stage').textContent,score=$(w,'cs-score').textContent;
 chk('CALC-27 after the last target of the last stage: the summary',J(w,'!!APP.run.done')===true&&/Course finished — PRS test/.test(head));
 chk('CALC-27 hits per stage with the time used (0:42 of 1:30; untimed stage "—")',/Stage 1 · BarricadeHits 2 \/ 3 · time 0:42 of 1:30/.test(box)&&/Stage 2 · ProneHits 0 \/ 1 · time —/.test(box),box.slice(0,160));
 chk('CALC-27 hits per target (A1 ✓✗, A2 ✓, B1 ✗) and the total',/A1 · 50 m✓✗/.test(box)&&/A2 · 75 m✓/.test(box)&&/B1 · 100 m✗/.test(box)&&/Total hits 2 \/ 4 \(50 %\)/.test(score),score);
 chk('CALC-27 Hit / Miss buttons hidden on the summary',w.document.querySelector('#home-course .btnrow.cs-calls').style.display==='none');
 const tgt=[...$(w,'cs-targets').querySelectorAll('button')].find(b=>/^A2/.test(b.textContent));tgt.click();w.eval('renderCourse(homeTraj())');
 chk('CALC-27 tapping a target goes back to it (stage 1, target 2, session distance 75 m)',!J(w,'!!APP.run.done')&&J(w,'APP.run.si')===0&&J(w,'APP.run.ti')===1&&J(w,'S.dist_m')===75&&w.document.querySelector('#home-course .btnrow.cs-calls').style.display==='');
 w.eval('courseNext();courseNext()');w.eval('renderCourse(homeTraj())');
 const st2=[...$(w,'cs-targets').querySelectorAll('button')].find(b=>/^Stage 2/.test(b.textContent));st2&&st2.click();
 chk('CALC-27 … and tapping a stage goes back to its first target',!!st2&&J(w,'APP.run.si')===1&&J(w,'APP.run.ti')===0&&!J(w,'!!APP.run.done'));}

const errs=all.flatMap(x=>x.errs);chk('ZERO uncaught errors',errs.length===0,errs.slice(0,3).join(' / '));
all.forEach(x=>{try{x.close();}catch(e){}});
console.log(`\nRESULT: PASS ${pass} / FAIL ${fail}`);
process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
