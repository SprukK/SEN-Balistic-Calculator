// Units test (V1.22.0, CORE-15): conversion round trips, every number input classified,
// fields convert on unit change and return exactly, typing in display units stores metric,
// form saves don't drift, physics identical in any display unit, dual units incl. Home,
// and no hard-coded metric value left anywhere on any page.
// Usage: node unittest.js <app.html>   (needs jsdom; see README.md)
const {JSDOM}=require('jsdom'),fs=require('fs');
const FILE=process.argv[2];
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let pass=0,fail=0;
const chk=(n,ok,extra)=>{console.log((ok?'  PASS  ':'  FAIL  ')+n+(extra?'   '+extra:''));ok?pass++:fail++;};
const IMPERIAL={range:'yd',zrange:'yd',drop:'in',ang:'moa',sight:'in',vel:'fps',wind:'mph',temp:'f',pres:'inhg',energy:'ftlb',bullet:'in',alt:'ft',regp:'psi'};
const PAGES=['home','traj','solver','wind','dope','stab','truing','holds','profiles','sensors','settings'];

async function open(){
  const dom=new JSDOM(fs.readFileSync(FILE,'utf8'),{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',
    beforeParse(w){w.alert=()=>{};w.confirm=()=>true;w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:(t,k)=>k==='measureText'?()=>({width:10}):()=>{}});}});
  const w=dom.window;w.errs=[];w.addEventListener('error',e=>w.errs.push(e.message));
  await wait(700);
  w.eval(`Bus.setRifle(DB.rifles[0].id);Bus.setProj(DB.projectiles.find(p=>/Queen/.test(p.name)).id);Bus.setWx('cur',DB.weathers[0].id);Bus.setWx('zero',DB.weathers[0].id);S.dist_m=150;Bus.setWind(4,90,'manual');runTraj(true);`);
  await wait(50);return w;
}
const $=(w,id)=>w.document.getElementById(id);
const shown=(w,id)=>w.eval(`NATIVE_VALUE.get.call(document.getElementById('${id}'))`);
const type=(w,id,txt)=>{const e=$(w,id);w.eval(`NATIVE_VALUE.set.call(document.getElementById('${id}'),${JSON.stringify(txt)})`);e.dispatchEvent(new w.Event('input',{bubbles:true}));};
const setAll=(w,map)=>{for(const[k,u]of Object.entries(map))w.eval(`setUnit('${k}','${u}')`);};
const labelOf=(w,id)=>$(w,id).closest('.fld').querySelector('label').textContent;
function visibleText(w){
  const out=[],walk=n=>{if(n.nodeType===3){out.push(n.data);return;}if(n.nodeType!==1||/^(SCRIPT|STYLE|TEXTAREA|OPTION)$/.test(n.tagName)||n.id==='st-twist-tbl')return;n.childNodes.forEach(walk);};
  walk(w.document.body);
  // profile names are the user's own text (e.g. "Everyday Default (20°C)") — not unit output
  let t=out.join(' ');const names=JSON.parse(w.eval('JSON.stringify(["rifles","projectiles","weathers","scopes","reticles","dopeCards"].flatMap(k=>DB[k].map(x=>x.name)))'));
  names.sort((a,b)=>b.length-a.length).forEach(n=>{t=t.split(n).join(' ');});return t;
}

(async()=>{
console.log('=== UNITS TEST: '+FILE+' ===');
const w=await open();

// 1. Conversion pairs are exact inverses.
const rt=JSON.parse(w.eval(`JSON.stringify(Object.entries(QDEF).flatMap(([q,d])=>Object.keys(d.opts).flatMap(u=>[-12.5,0,1,250,1013.25].map(v=>({q,u,err:Math.abs(d.from[u](d.to[u](v))-v)})))))`));
const worst=rt.reduce((a,b)=>b.err>a.err?b:a);
chk('every unit converts there and back exactly',worst.err<1e-9,`${rt.length} pairs, worst ${worst.err.toExponential(1)} (${worst.q} ${worst.u})`);
chk('exact definitions: 250 m = 273.4033 yd (1 yd = 0.9144 m)',Math.abs(w.eval("QDEF.range.to.yd(250)")-250/0.9144)<1e-12);

// 2. Every number input on every screen and form is classified (unit or deliberately exempt).
const forms=[`openRifleForm(DB.rifles[0].id)`,`openScopeForm(DB.scopes[0].id)`,`openReticleForm(DB.reticles[0].id)`,`openProjForm(DB.projectiles[0].id)`,`openWxForm(DB.weathers[0].id)`,`pickSheet('dist')`,`pickSheet('mv')`];
w.eval('newDope();tuRenderPoints()');await wait(30);
let unclassified=new Set();
const scan=()=>w.eval(`[...document.querySelectorAll('input[type=number]')].filter(e=>!fieldQ(e)).map(e=>e.id||e.outerHTML.slice(0,60))`).forEach(x=>unclassified.add(x));
scan();
for(const f of forms){w.eval(f);await wait(30);scan();w.eval('closeModal();closeSheet()');}
chk('every number input has a unit or an explicit exemption',unclassified.size===0,[...unclassified].join(', '));

// 3. Zero range 250 m → yards shows 273.4 and returns to exactly 250.
w.eval("gotoPage('traj')");w.eval('S.zero_m=250;syncTrajInputs()');
setAll(w,{zrange:'yd'});await wait(20);
chk('250 m zero shows 273.4 in yd',shown(w,'tr-zero')==='273.4',shown(w,'tr-zero'));
chk('its label now says yd',/\byd\b/.test(labelOf(w,'tr-zero'))&&!/\bm\b/.test(labelOf(w,'tr-zero')),labelOf(w,'tr-zero'));
chk('code still reads 250 (metric) from it',$(w,'tr-zero').value==='250');
setAll(w,{zrange:'ft'});setAll(w,{zrange:'yd'});setAll(w,{zrange:'m'});await wait(20);
chk('m → ft → yd → m shows exactly 250 again',shown(w,'tr-zero')==='250');

// 4. Typing in the display unit stores metric.
setAll(w,{range:'yd'});w.eval("gotoPage('home')");await wait(20);
type(w,'home-dist','300');await wait(300);
chk('typing 300 yd on Home sets 274.32 m',Math.abs(w.eval('S.dist_m')-274.32)<1e-6,String(w.eval('S.dist_m')));
setAll(w,{range:'m'});await wait(20);
chk('…and shows 274.32 m when switched back',shown(w,'home-dist')==='274.32');

// 5. Forms: saving without edits never drifts; edits convert.
setAll(w,IMPERIAL);await wait(20);
const before=JSON.parse(w.eval('JSON.stringify(DB.rifles[0])'));
w.eval('openRifleForm(DB.rifles[0].id)');await wait(30);
chk('rifle form shows sight height in inches',/\bin\b/.test(labelOf(w,'rf-sight'))&&shown(w,'rf-sight')===String(+(before.sight/25.4).toFixed(3)),shown(w,'rf-sight'));
w.eval(`saveRifle(DB.rifles[0].id)`);
const after=JSON.parse(w.eval('JSON.stringify(DB.rifles[0])'));
const drift=['mv','sight','zero','zwSpd','zTemp','zPres','blen'].filter(k=>after[k]!==before[k]);
chk('saving an unedited form in imperial changes nothing',drift.length===0,drift.map(k=>k+' '+before[k]+'→'+after[k]).join(', '));
w.eval('openRifleForm(DB.rifles[0].id)');await wait(30);type(w,'rf-sight','2');w.eval(`saveRifle(DB.rifles[0].id)`);
chk('typing 2 in → stored as 50.8 mm',Math.abs(w.eval('DB.rifles[0].sight')-50.8)<1e-9);
w.eval(`DB.rifles[0].sight=${before.sight};saveDB();Bus.setRifle(DB.rifles[0].id)`);

// 6. Physics is identical whatever is displayed.
setAll(w,Object.fromEntries(Object.keys(IMPERIAL).map(k=>[k,w.eval(`QDEF.${k}.canon`)])));
w.eval('runTraj(true)');const metric=w.eval('JSON.stringify({S,pts:lastTraj.pts})');
setAll(w,IMPERIAL);w.eval('runTraj(true)');const imp=w.eval('JSON.stringify({S,pts:lastTraj.pts})');
chk('session and full trajectory bit-identical in metric vs imperial display',metric===imp);

// 7. Dual units, Home included.
w.eval("setApp('dual',true);setSec('range','m');setSec('wind','ms');setSec('zrange','m');setSec('vel','ms')");w.eval("gotoPage('home')");await wait(30);
const sec=$(w,'home-dist').nextElementSibling;
chk('Home distance field shows the secondary unit',!!sec&&/\d+ m$/.test(sec.textContent),sec&&sec.textContent);
chk('Home wind and zero show both units',/mph · .* m\/s/.test($(w,'home-windspd').textContent)&&/yd · .* m/.test($(w,'home-zero').textContent),$(w,'home-windspd').textContent+' | '+$(w,'home-zero').textContent);
w.eval("setApp('dual',false)");await wait(20);
chk('dual off removes the secondary line',$(w,'home-dist').nextElementSibling.textContent==='');

// 8. No hard-coded metric value left on any page in imperial.
w.eval(`DB.dopeCards[0].stages[0].dists[0].wind=3;loadDope();calcDope()`);
w.eval(`tuPoints=[{d:'23',v:'250'}];document.getElementById('tu-mv').value=262;`);
w.eval(`(DB.rifles[0].mvt=[{t:5,v:255},{t:25,v:262}]);`);
const leaks=[];
for(const p of PAGES){w.eval(`gotoPage('${p}')`);await wait(40);
  if(p==='solver')w.eval('solve()');if(p==='holds')w.eval('renderHolds()');if(p==='truing'){w.eval('tuSolve()');w.eval('mvtRender()');}
  await wait(20);
  const t=visibleText(w);
  for(const re of [/\d\s?m\/s(?![a-zA-Z])/g,/\d\s?hPa\b/g,/\d\s?°C(?![a-zA-Z])/g,/\d\s?mm(?![a-zA-Z])/g,/\d\s?m(?![a-zA-Z\/²³])/g]){
    for(const m of t.matchAll(re)){const ctx=t.slice(Math.max(0,m.index-40),m.index+12).replace(/\s+/g,' ');leaks.push(p+': …'+ctx);}
  }
}
const uniq=[...new Set(leaks)];
chk('no metric value shown on any page in imperial',uniq.length===0,uniq.slice(0,6).join(' || '));

chk('ZERO uncaught errors',w.errs.length===0,w.errs.slice(0,3).join(' / '));
console.log('\nPASS '+pass+'   FAIL '+fail);
process.exit(fail?1:0);
})().catch(e=>{console.error('TEST CRASH:',e);process.exit(1);});
