// Formula panel test (V1.25.0, CORE-06): the self-check runs at boot, every formula has an
// equation, source, use and anchors, every anchor passes in this build, the estimates are the
// flagged ones, no theoretical SEN design is used as an anchor, a broken formula raises the
// warning on every screen and turns its card red, and nothing is written as HTML.
// Usage: node formulatest.js <app.html>   (needs jsdom; see README.md)
const {JSDOM}=require('jsdom'),fs=require('fs');
const FILE=process.argv[2];
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let pass=0,fail=0;
const chk=(n,ok,extra)=>{console.log((ok?'  PASS  ':'  FAIL  ')+n+(extra?'   '+extra:''));ok?pass++:fail++;};
const EST=['McGyro gyroscopic stability (McCoy 1986)','Spin drift (Litz)','G1 ≈ G7 / 0.509','MV spread → vertical spread','MV–temperature model'];

(async()=>{
console.log('=== FORMULA PANEL TEST: '+FILE+' ===');
const dom=new JSDOM(fs.readFileSync(FILE,'utf8'),{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',
  beforeParse(w){w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:(t,k)=>k==='measureText'?()=>({width:10}):()=>{}});}});
const w=dom.window,d=w.document;w.errs=[];w.addEventListener('error',e=>w.errs.push(e.message));
await wait(800);
const J=e=>JSON.parse(w.eval('JSON.stringify('+e+')'));

// 1. Boot self-check.
const boot=J('fxLast.map(r=>r.res.map(x=>x.ok))').flat();
chk('self-check ran at boot, every boot anchor passes, no warning shown',boot.length>=30&&boot.every(Boolean)&&d.getElementById('fx-alarm').style.display==='none',boot.length+' anchors');
chk('the slow truing round trip is left out of the boot run',J('fxLast.find(r=>r.f.name===\'BC truing (bisection)\').res.length')===0);

// 2. Reachable from More; renders every formula.
w.eval('openMore()');
const more=[...d.querySelectorAll('#sbox .navsheet button')];
chk('More lists Formulas',more.some(b=>b.dataset.page==='formulas'),more.map(b=>b.dataset.page).join(','));
more.find(b=>b.dataset.page==='formulas').click();await wait(50);
const n=J('FORMULAS.length'),total=J('FORMULAS.reduce((s,f)=>s+f.anchors.length,0)');
chk('page open: one card per formula + "Not modelled"',d.getElementById('page-formulas').classList.contains('active')&&d.querySelectorAll('#fx-list .fx-card').length===n+1);
chk('summary: every anchor passes, computed live',new RegExp('^'+total+' of '+total+' anchors pass').test(d.getElementById('fx-sum').textContent),d.getElementById('fx-sum').textContent);
chk('no ✗ anywhere, no red card',d.querySelectorAll('#fx-list .fx-no').length===0&&d.querySelectorAll('#fx-list .fx-bad').length===0);

// 3. Registry content rules.
const F=J("FORMULAS.map(f=>({name:f.name,status:f.status,eq:f.eq,src:f.src,used:f.used,n:f.anchors.length,labels:f.anchors.map(a=>a.l)}))");
chk('every formula has equation, source, use and at least one anchor',F.every(f=>f.eq&&f.src&&f.used&&f.n>0&&/^(ok|est)$/.test(f.status)));
chk('exactly the five estimates are flagged EST',JSON.stringify(F.filter(f=>f.status==='est').map(f=>f.name))===JSON.stringify(EST),F.filter(f=>f.status==='est').map(f=>f.name).join(', '));
chk('no theoretical SEN design used as an anchor',!F.flatMap(f=>f.labels).some(l=>/\bSEN\b|LRAI|LR-\d/.test(l)));
chk('V1.30.0: no C lookup from theoretical designs; nothing mentions SEN design constants',!F.some(f=>/C lookup/.test(f.name))&&!F.some(f=>/2\.699|3\.822|1\.877|2\.283/.test(f.eq+f.src)));
chk('Miller anchors are Berger\'s own results (Queen 1.18, King 1.07/1.48/1.67)',['1.18','1.07','1.48','1.67'].every(v=>J("FORMULAS.find(f=>/^Miller twist rule/.test(f.name)).anchors.map(a=>a.want.toFixed(2))").includes(v)));

// 4. A broken formula raises the warning on every screen and turns its card red.
w.eval('window.__ad=airDensity;airDensity=()=>1.0;fxCheck()');
const al=d.getElementById('fx-alarm');
chk('broken air density → warning names it and says not to trust the dope',al.style.display===''&&/Moist-air density/.test(al.textContent)&&/don't trust the dope/.test(al.textContent),al.textContent);
chk('…and the trajectory anchors fail with it',/RK4 point-mass trajectory/.test(al.textContent));
w.eval("gotoPage('dope')");
chk('…warning stays visible on another tab',al.style.display===''&&!al.closest('.page'));
w.eval("gotoPage('formulas')");
chk('…its card is red with ✗',[...d.querySelectorAll('#fx-list .fx-bad .fx-name')].some(e=>e.textContent==='Moist-air density (Magnus)')&&d.querySelectorAll('#fx-list .fx-no').length>0);
w.eval('airDensity=window.__ad;G7T[26][1]=0.5;fxCheck()');
chk('a corrupted drag-table value is caught',/G7 \/ G1 drag tables/.test(al.textContent),al.textContent);
w.eval('G7T[26][1]=0.3803;fxCheck()');
chk('restored → warning cleared',al.style.display==='none');

// 5. Text only, never HTML.
w.eval("FORMULAS[0].name='<img src=x id=pwn>';renderFormulas();FORMULAS[0].name='Moist-air density (Magnus)'");
chk('formula text is rendered as text (no HTML injection)',!d.getElementById('pwn')&&/<img/.test(d.querySelector('#fx-list .fx-name').textContent));

chk('ZERO uncaught errors',w.errs.length===0,w.errs.slice(0,3).join(' / '));
console.log('\nPASS '+pass+'   FAIL '+fail);
process.exit(fail?1:0);
})().catch(e=>{console.error('TEST CRASH:',e);process.exit(1);});
