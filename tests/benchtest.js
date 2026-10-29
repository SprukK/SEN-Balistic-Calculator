// Design Bench test (V2.6.0, BENCH-01 + BENCH-02): More → Design Bench; designs (new with starting values,
// rename, duplicate, delete, pick); geometry typed into the form → mass, SD, OAL, CG equal to independent
// values (closed forms / scipy, and a separate midpoint integration written here); drawing to scale with
// cavities and CG; OAL magazine / single-shot flags; boat-tail angle; geometry errors (meplat, hollow point,
// cavities meeting, wall break-through); alloy (Pb–Sb ideal mixing, custom); inches in → mm stored and no
// metric length left on the page; restart; export → import with sanitising; designs never reach the
// calculator (§10A); text only.
// Usage: node benchtest.js <app.html>   (needs jsdom; see README.md)
const {JSDOM}=require('jsdom'),fs=require('fs');
const FILE=process.argv[2];
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let pass=0,fail=0;
const chk=(n,ok,extra)=>{console.log((ok?'  PASS  ':'  FAIL  ')+n+(extra?'   '+extra:''));ok?pass++:fail++;};
let prompts=[];
function open(){
  const dom=new JSDOM(fs.readFileSync(FILE,'utf8'),{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',
    beforeParse(w){w.alert=()=>{};w.confirm=()=>true;w.scrollTo=()=>{};w.prompt=(q,d)=>prompts.length?prompts.shift():d;
      w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:(t,k)=>k==='measureText'?()=>({width:10}):()=>{}});}});
  const w=dom.window;w.errs=[];w.addEventListener('error',e=>w.errs.push(e.message));return w;
}
// Independent check: midpoint rule on the same shape, written from the textbook geometry (not the app's code).
function indepMass(g){
  const rb=g.diam/2,rm=g.meplat/2,Ln=g.noseL,Lt=g.btL,rbs=g.baseD/2,Lb=g.bearL,L=Lt+Lb+Ln;
  const RT=(Ln*Ln+(rb-rm)**2)/(2*(rb-rm)),yc=rb-RT;               // tangent ogive, centre below the nose start
  const r=x=>x<Lt?rbs+(rb-rbs)*x/Lt:x<Lt+Lb?rb:yc+Math.sqrt(RT*RT-(x-Lt-Lb)**2);
  const a=g.bcD/2,h=g.bcDep,Rs=(a*a+h*h)/(2*h);                    // dish base cavity
  const c=x=>Math.max(x<h?Math.sqrt(Rs*Rs-(Rs-h+x)**2):0,L-x<g.hpDep?g.hpD/2:0);
  const N=400000,dx=L/N;let V=0,M=0;
  for(let i=0;i<N;i++){const x=(i+0.5)*dx,A=Math.PI*(r(x)**2-c(x)**2)*dx;V+=A;M+=x*A;}
  return{V,cg:M/V,gr:V/1000*11.34/0.06479891};
}
(async()=>{
console.log('=== DESIGN BENCH TEST: '+FILE+' ===');
let w=open();await wait(700);
const J=e=>JSON.parse(w.eval('JSON.stringify('+e+')'));
const $=id=>w.document.getElementById(id);
const txt=id=>$(id).textContent;
const type=(id,v)=>{const el=$(id);Object.getOwnPropertyDescriptor(w.HTMLInputElement.prototype,'value').set.call(el,String(v));el.dispatchEvent(new w.Event('input',{bubbles:true}));};
const pick=(id,v)=>{$(id).value=v;$(id).dispatchEvent(new w.Event('change',{bubbles:true}));};
// ── navigation + empty state ──────────────────────────────────────────────────────────────────────
w.eval('openMore()');
const nb=[...w.document.querySelectorAll('#sbox .navsheet button')].find(b=>b.dataset.page==='bench');
chk('More lists "Design Bench · geometry · mass · SD"',!!nb&&/Design Bench/.test(nb.textContent)&&/geometry · mass · SD/.test(nb.textContent));
nb.click();await wait(20);
chk('opens the Bench page, More stays lit',$('page-bench').classList.contains('active')&&$('nav-more').classList.contains('on'));
chk('empty: guidance shown, form hidden, rename/duplicate/delete disabled',$('bn-empty').style.display===''&&$('bn-form').style.display==='none'&&['bn-ren','bn-dup','bn-del'].every(id=>$(id).disabled));
// ── new design ────────────────────────────────────────────────────────────────────────────────────
prompts=['Queen check'];[...$('page-bench').querySelectorAll('button')].find(b=>/New design/.test(b.textContent)).click();await wait(20);
chk('+ New design: stored, selected, starting values in the form',J('DB.designs.length')===1&&J('DB.designs[0].name')==='Queen check'&&$('bn-sel').value===J('APP.benchId')&&$('bn-diam').value==='6.35'&&$('bn-nose').value==='3.5'&&$('bn-form').style.display==='');
chk('outputs and drawing appear',$('bn-outs').querySelectorAll('.sc').length===4&&!!$('bn-draw').querySelector('svg'));
// ── the full test shape typed into the form (same shape as the Formulas anchor) ───────────────────
const S={diam:6.35,bearL:6,noseL:5.5,rtr:1,meplat:1.5,btL:2,baseD:5,hpD:1,hpDep:2,bcD:4.5,bcDep:0.3};
type('bn-bear',6);type('bn-nose',5.5);type('bn-mep',1.5);type('bn-btl',2);type('bn-base',5);type('bn-hpd',1);type('bn-hpdep',2);pick('bn-hpshape','cyl');type('bn-bcd',4.5);type('bn-bcdep',0.3);pick('bn-bcshape','dish');
const d=J('DB.designs[0]'),m=J('(()=>{const x=benchMass(benchCur());return{gr:x.gr,cg:x.cg,sd:x.sd,oal:x.oal,V:x.V}})()'),ind=indepMass(S);
chk('typed values stored in the design (mm)',Object.entries(S).every(([k,v])=>d[k]===v)&&d.hpShape==='cyl'&&d.bcShape==='dish');
chk('mass = scipy 60.759160 gr and = independent midpoint integration',Math.abs(m.gr-60.759160)<1e-4&&Math.abs(m.gr-ind.gr)<1e-4,m.gr.toFixed(6)+' / '+ind.gr.toFixed(6));
chk('CG = scipy 6.015521 mm = independent',Math.abs(m.cg-6.015521)<1e-5&&Math.abs(m.cg-ind.cg)<1e-5,m.cg.toFixed(6));
chk('SD = mass/(7000·d_in²) (§9H): 0.13888',Math.abs(m.sd-60.759160/(7000*0.25*0.25))<1e-6);
const cards=[...$('bn-outs').querySelectorAll('.sc')].map(c=>c.textContent);
chk('cards: 60.76 gr · SD 0.1389 lb/in² (97.6 kg/m²) · OAL 13.50 mm L/D 2.13 · CG 6.02 mm (44.6 %)',/^Mass60\.76 gr3\.937 g · 0\.3472 cm³ × 11\.340 g\/cm³$/.test(cards[0])&&/^SD \(§9H\)0\.1389lb\/in² · 97\.6 kg\/m²$/.test(cards[1])&&/^OAL13\.50 mmL\/D 2\.13$/.test(cards[2])&&/^CG from base6\.02 mm44\.6 % of OAL$/.test(cards[3]),cards.join(' | '));
// ── drawing ───────────────────────────────────────────────────────────────────────────────────────
const svg=$('bn-draw').querySelector('svg');
chk('drawing: body, two cavities, CG marker, OAL/nose/Ø/base dimensions',svg.querySelectorAll('[data-part=body]').length===1&&svg.querySelectorAll('[data-part=cavity]').length===2&&!!svg.querySelector('[data-part=cg]')&&['oal','nose','diam','base'].every(k=>svg.querySelector('[data-dim='+k+']')));
chk('dimension labels in the display unit',/OAL 13\.50 mm/.test(svg.textContent)&&/nose 5\.50 mm/.test(svg.textContent)&&/Ø 6\.35 mm/.test(svg.textContent)&&/base Ø 5\.00 mm · 18\.6°/.test(svg.textContent),svg.textContent);
const ol=svg.querySelector('[data-dim=oal] line'),cgx=+svg.querySelector('[data-part=cg]').getAttribute('d').match(/^M([\d.]+)/)[1];
const x0=+ol.getAttribute('x1'),x1=+ol.getAttribute('x2');
chk('to scale: CG marker at CG/OAL of the length',Math.abs((cgx-x0)/(x1-x0)-m.cg/m.oal)<1e-3);
const body=svg.querySelector('[data-part=body]').getAttribute('d'),ys=[...body.matchAll(/[ML]([\d.]+) ([\d.]+)/g)].map(a=>+a[2]);
const hgt=Math.max(...ys)-Math.min(...ys);
chk('to scale: body height / length = Ø / OAL',Math.abs(hgt/(x1-x0)-6.35/13.5)<2e-3,(hgt/(x1-x0)).toFixed(4));
// ── flags ─────────────────────────────────────────────────────────────────────────────────────────
const fl=()=>txt('bn-flags');
chk('theoretical-design banner (§10A)',/theoretical until made and measured/.test(fl()));
chk('OAL 13.50 mm fits the magazine; boat tail 18.6° → §12C warning',/OAL 13\.50 mm fits the magazine \(≤ 22\.00 mm\)/.test(fl())&&[...$('bn-flags').querySelectorAll('.flag.warn')].some(f=>/Boat-tail angle 18\.6°/.test(f.textContent)));
chk('McGyro calibre values listed',/length 2\.126 cal · nose 0\.866 cal · Rt\/R 1\.00 · meplat 0\.236 cal · base 0\.787 cal · density 11\.34/.test(fl()),fl().match(/For McGyro.*/)?.[0]);
type('bn-bear',15);chk('OAL 22.5 mm → over the magazine limit, single-shot only',/OAL 22\.50 mm is over the 22\.00 mm magazine limit — single-shot only \(≤ 25\.00 mm\)/.test(fl()));
type('bn-bear',18);chk('OAL 25.5 mm → over the single-shot limit',/OAL 25\.50 mm is over the Mora's 25\.00 mm single-shot limit/.test(fl()));
type('bn-bear',6);
// ── geometry errors ───────────────────────────────────────────────────────────────────────────────
const err=()=>$('bn-flags').querySelector('.flag.warn')?.textContent||'';
type('bn-mep',6.35);chk('meplat = body Ø → error, no outputs, no drawing',/meplat must be smaller/.test(err())&&$('bn-outs').children.length===0&&!$('bn-draw').querySelector('svg'));
type('bn-mep',1.5);type('bn-hpd',1.6);chk('hollow point wider than the meplat → error',/hollow point is wider than the meplat/.test(err()));
type('bn-hpd',1);type('bn-hpdep',13.3);chk('hollow point meeting the base cavity → error',/meet/.test(err()));
type('bn-bcd',0);type('bn-nose',1);type('bn-mep',5);type('bn-base',4.5);type('bn-hpd',4.8);type('bn-hpdep',8.8);   // Ø 4.8 hole, base Ø 4.5: the wall runs out near the base
chk('hollow point reaching into the boat tail breaks the wall → error with the position',/breaks through the wall at 0\.\d\d mm from the base/.test(err()),err());
type('bn-nose',5.5);type('bn-mep',1.5);type('bn-base',5);type('bn-hpd',1);type('bn-hpdep',2);type('bn-bcd',4.5);
chk('back to the test shape → same mass',Math.abs(J('benchMass(benchCur()).gr')-60.759160)<1e-4);
// ── alloy ─────────────────────────────────────────────────────────────────────────────────────────
chk('Sb % and custom density rows hidden for pure lead',$('bn-sbrow').style.display==='none'&&$('bn-densrow').style.display==='none');
pick('bn-alloy','sb');type('bn-sb',6);
const rho6=1/(0.94/11.34+0.06/6.697);
chk('Pb–Sb 6 %: density by ideal mixing (10.887), mass scales exactly by ρ',Math.abs(J('benchMass(benchCur()).rho')-rho6)<1e-12&&Math.abs(J('benchMass(benchCur()).gr')-60.759160*rho6/11.34)<1e-4&&/ideal mixing: 10\.887 g\/cm³/.test(fl())&&$('bn-sbrow').style.display==='');
pick('bn-alloy','custom');type('bn-dens',11);
chk('custom density 11.0 → mass scales',Math.abs(J('benchMass(benchCur()).gr')-60.759160*11/11.34)<1e-4&&$('bn-densrow').style.display==='');
type('bn-dens','');chk('custom with no density → asks for it',/Enter the alloy density/.test(err()));
pick('bn-alloy','pb');
// ── designs list ──────────────────────────────────────────────────────────────────────────────────
w.eval('benchDup()');chk('Duplicate → copy selected, same shape',J('DB.designs.length')===2&&J('benchCur().name')==='Queen check copy'&&J('benchCur().noseL')===5.5&&J('DB.designs[0].id')!==J('DB.designs[1].id'));
prompts=['Copy B'];w.eval('benchRename()');chk('Rename',J('benchCur().name')==='Copy B'&&[...$('bn-sel').options].some(o=>o.textContent==='Copy B'));
type('bn-nose',4);pick('bn-sel',J('DB.designs[0].id'));
chk('Pick the first again → its own values in the form (copy edited separately)',$('bn-nose').value==='5.5'&&J('DB.designs[1].noseL')===4);
pick('bn-sel',J('DB.designs[1].id'));w.eval('benchDelete()');chk('Delete → first design selected',J('DB.designs.length')===1&&J('benchCur().name')==='Queen check');
// ── inches ────────────────────────────────────────────────────────────────────────────────────────
w.eval(`setUnit('bullet','in');gotoPage('bench')`);
const shown=id=>Object.getOwnPropertyDescriptor(w.HTMLInputElement.prototype,'value').get.call($(id));
chk('inputs show inches (stored value stays mm), label in inches',shown('bn-diam')==='0.25'&&$('bn-diam').value==='6.35'&&/Body Ø in/.test($('bn-diam').closest('.fld').textContent),shown('bn-diam'));
type('bn-nose',0.25);chk('typing 0.25 in stores 6.35 mm',J('benchCur().noseL')===6.35);
const pageTxt=$('page-bench').textContent;
chk('no metric length left on the page (cards, flags, drawing in inches)',!/\d mm\b/.test(pageTxt)&&/OAL 0\.\d{3} in/.test(pageTxt),(pageTxt.match(/[\d.]+ mm/g)||[]).join(','));
type('bn-nose',5.5/25.4);w.eval(`setUnit('bullet','mm');gotoPage('bench')`);
// ── restart + import ──────────────────────────────────────────────────────────────────────────────
const snap=w.eval('snapshotJSON()');
w.eval(`DB.designs=[];applySnapshot(JSON.parse(${JSON.stringify(snap)}));benchRender();`);
chk('restart: design and selection survive',J('DB.designs.length')===1&&J('benchCur().name')==='Queen check'&&$('bn-nose').value==='5.5');
const exp=JSON.parse(snap);
exp.designs.push({id:'x1',name:'<img src=x onerror=alert(1)>',diam:1e9,bearL:-4,noseL:'5',rtr:7,hpShape:'<b>',bcShape:'cone',alloy:'gold',sb:50,evil:'y'});
exp.designs.push({id:'x2',name:'no diameter',bearL:5});
chk('first install: ZERO uncaught errors',w.errs.length===0,w.errs.join(' | '));
w=open();await wait(700);
const J2=e=>JSON.parse(w.eval('JSON.stringify('+e+')'));
w.eval(`window.__p=planImport(${JSON.stringify(exp)});applyImport(window.__p);`);await wait(30);
const imp=J2('DB.designs');
chk('import into a fresh install: valid designs come in, one without a diameter is rejected',imp.length===2&&J2('window.__p.rejected.some(r=>/Design "no diameter": missing diam/.test(r))'),JSON.stringify(J2('window.__p.rejected')));
const bad=imp.find(x=>x.id==='x1');
chk('garbage cleaned: Ø clamped to 20 mm, negative length → 0, string number dropped, Rt/R → 1, unknown shape/alloy → defaults, % capped, unknown field gone',bad.diam===20&&bad.bearL===0&&bad.noseL===null&&bad.rtr===1&&bad.hpShape==='cyl'&&bad.bcShape==='cone'&&bad.alloy==='pb'&&bad.sb===12&&!('evil' in bad),JSON.stringify(bad));
w.eval(`APP.benchId='x1';gotoPage('bench')`);
chk('text only: the name shows as text, no element injected',!$2(w,'page-bench').querySelector('img')&&[...$2(w,'bn-sel').options].some(o=>o.textContent==='<img src=x onerror=alert(1)>'));
// ── §10A: designs never reach the calculator ──────────────────────────────────────────────────────
chk('designs are not projectiles: none in DB.projectiles or the Home projectile sheet',!J2('DB.projectiles').some(p=>/Queen check|<img/.test(p.name))&&(w.eval(`pickSheet('proj')`),!/Queen check/.test(w.document.getElementById('sbox').textContent)));
const src=w.eval(`[designClean,alloyDensity,cavR,benchGeom,benchMass,benchDraw,benchNew,benchRename,benchDup,benchDelete,benchPick,benchInput,benchRender,benchCalc].map(String).join('')`);
chk('no HTML sinks in the Bench code',!/innerHTML|insertAdjacentHTML|outerHTML|document\.write/.test(src));
chk('ZERO uncaught errors',w.errs.length===0,w.errs.join(' | '));
console.log(`\nPASS ${pass}   FAIL ${fail}`);process.exit(fail?1:0);
function $2(win,id){return win.document.getElementById(id);}
})().catch(e=>{console.error('TEST CRASH:',e);process.exit(1);});
