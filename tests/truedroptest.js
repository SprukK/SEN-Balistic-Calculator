// Drop-truing test (V1.33.0 + V1.34.0 multi-distance, CALC-04): True BC from impacts on the Truing tab, on the live session.
// A dial produced by the app's own model for a known BC comes back as that BC (mrad, clicks, MOA, with a
// group offset), the result shows profile BC, needed dial and sensitivity, Apply stores it as a trued BC
// and Home then uses it without the Sg penalty and hits the entered dial; velocity-trued BCs also skip
// the penalty; impossible dial → reason, no Apply; no session → guidance; text only.
// Usage: node truedroptest.js <app.html>   (needs jsdom; see README.md)
const {JSDOM}=require('jsdom'),fs=require('fs');
const FILE=process.argv[2];
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let pass=0,fail=0;
const chk=(n,ok,extra)=>{console.log((ok?'  PASS  ':'  FAIL  ')+n+(extra?'   '+extra:''));ok?pass++:fail++;};
const all=[];
async function open(){
  const dom=new JSDOM(fs.readFileSync(FILE,'utf8'),{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',
    beforeParse(w){w.alerts=[];w.alert=m=>w.alerts.push(String(m));w.confirm=()=>true;
      w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:(t,k)=>k==='measureText'?()=>({width:10}):()=>{}});}});
  const w=dom.window;w.errs=[];w.addEventListener('error',e=>w.errs.push(e.message));await wait(700);all.push(w);return w;
}
const J=(w,e)=>JSON.parse(w.eval('JSON.stringify('+e+')'));
const $=(w,id)=>w.document.getElementById(id);
const set=(w,id,v)=>{$(w,id).value=String(v);};
// Row inputs (V1.34.0): row i, key d|a|dial|off.
const rowIn=(w,i,k)=>w.document.querySelectorAll('#td-rows .td-row')[i].querySelector('[data-k="'+k+'"]');
const setRow=(w,i,k,v)=>{rowIn(w,i,k).value=String(v);};

(async()=>{
console.log('=== DROP TRUING TEST: '+FILE+' ===');
const w=await open();
// No session yet.
w.eval(`gotoPage('truing')`);await wait(20);setRow(w,0,'d',150);setRow(w,0,'dial',7);set(w,'td-unit','mrad');w.eval('tdSolve()');
chk('no session → guidance, no result',/Select a rifle, projectile and weather/.test($(w,'td-result').textContent));
w.eval(`Bus.setRifle(DB.rifles.find(r=>/\\.25/.test(r.name)).id);Bus.setProj(DB.projectiles.find(p=>/^Altaros ATP Queen/.test(p.name)).id);Bus.setWx('cur',DB.weathers[0].id);Bus.setWx('zero',DB.weathers[0].id);S.mv=280;Bus.notify();`);await wait(30);
const dialFor=bc=>J(w,`(()=>{const tr=homeTraj(175,${bc}),z=zeroConds();return solveShot(tr.pts,nearestPt,z.range,150,0,0,90,S.mv,0.1,z.wSpd,z.wDir).mrElev})()`);
const need=dialFor(0.115);
const result=()=>J(w,'tdLast&&tdLast.bc');
setRow(w,0,'dial',need.toFixed(4));w.eval('tdSolve()');
chk('dial (mrad) the model needs for BC 0.115 at 150 m → trued 0.115',Math.abs(result()-0.115)<2e-4,String(result()));
chk('result shows trued BC ± range, profile BC with %, MV sensitivity',/Trued BC G7/.test($(w,'td-result').textContent)&&/% trued vs profile/.test($(w,'td-result').textContent)&&/Range \(for ±½ click on every row\)/.test($(w,'td-result').textContent)&&/MV \+1 m\/s → BC/.test($(w,'td-result').textContent));
const click=J(w,'rifleScope(getRifle())?.clickStepMrad||0.1');
set(w,'td-unit','click');setRow(w,0,'dial',(need/click).toFixed(4));w.eval('tdSolve()');
chk('same dial in clicks → same BC',Math.abs(result()-0.115)<2e-4);
set(w,'td-unit','moa');setRow(w,0,'dial',(need/0.290888).toFixed(4));w.eval('tdSolve()');
chk('same dial in MOA → same BC',Math.abs(result()-0.115)<2e-4);
set(w,'td-unit','mrad');setRow(w,0,'dial',(need+0.2).toFixed(4));setRow(w,0,'off',30);w.eval('tdSolve()');
chk('dial 0.2 mrad too high with the group 30 mm high at 150 m → same BC',Math.abs(result()-0.115)<2e-4,String(result()));
setRow(w,0,'off',0);setRow(w,0,'dial',need.toFixed(4));w.eval('tdSolve()');
// Apply.
[...$(w,'td-result').querySelectorAll('button')].find(b=>/^Apply to/.test(b.textContent)).click();await wait(30);
const p=J(w,'getProj()');
chk('Apply stores a trued BC with its source',Math.abs(p.bcg7-0.115)<1e-4&&/^drops·g7·\d{4}-\d\d-\d\d·150m$/.test(p.bcTrued),p.bcTrued);
const tr=J(w,'(()=>{const t=homeTraj(175);return{sgP:t.sgP,sg:t.sg}})()');
chk('Home: trued BC used as-is (no Sg penalty), Sg still known',tr.sgP===1&&tr.sg>0&&tr.sg<1.5,JSON.stringify(tr));
const homeDial=J(w,`(()=>{const tr=homeTraj(175),z=zeroConds();return solveShot(tr.pts,nearestPt,z.range,150,0,0,90,S.mv,0.1,z.wSpd,z.wDir).mrElev})()`);
chk('Home now needs the entered dial at 150 m',Math.abs(homeDial-need)<0.01,homeDial+' vs '+need);
// Velocity-trued BC also skips the penalty.
w.eval(`const q=getProj();q.bcTrued='single·g7·2026-10-28';Bus.notify()`);
chk('velocity-trued G7 BC → no penalty either',J(w,'homeTraj(175).sgP')===1);
w.eval(`getProj().bcTrued='single·g1·2026-10-28';Bus.notify()`);
chk('trued for G1 only → G7 session still gets the penalty',J(w,'homeTraj(175).sgP')<1);
// Multi-distance (V1.34.0): three distances from the model's own dials for BC 0.115 → best fit 0.115, residuals ~0, tighter range.
w.eval(`getProj().bcTrued=null;getProj().bcg7=0.128;Bus.pullFromProfiles(['bc']);Bus.notify()`);
const dial2=(bc,d)=>J(w,`(()=>{const tr=homeTraj(${d}+25,${bc}),z=zeroConds();return solveShot(tr.pts,nearestPt,z.range,${d},0,0,90,S.mv,0.1,z.wSpd,z.wDir).mrElev})()`);
setRow(w,0,'d',150);setRow(w,0,'dial',dial2(0.115,150).toFixed(4));setRow(w,0,'off',0);w.eval('tdSolve()');
const band1=+(/± ([\d.]+) \(½ click\)/.exec($(w,'td-result').textContent)||[])[1];
w.eval('tdAddRow()');w.eval('tdAddRow()');await wait(20);
chk('+ Add distance adds rows at +50 m steps',w.document.querySelectorAll('#td-rows .td-row').length===3&&rowIn(w,1,'d').value==='200'&&rowIn(w,2,'d').value==='250',[...w.document.querySelectorAll('#td-rows [data-k="d"]')].map(e=>e.value).join());
setRow(w,1,'dial',dial2(0.115,200).toFixed(4));setRow(w,2,'dial',dial2(0.115,250).toFixed(4));w.eval('tdSolve()');
const band3=+(/± ([\d.]+) \(½ click\)/.exec($(w,'td-result').textContent)||[])[1];
chk('3 distances → best fit 0.115, table per distance, fit RMS ≈ 0',Math.abs(result()-0.115)<2e-4&&w.document.querySelectorAll('#td-result table tr').length===4&&/fit RMS 0\.00\d mrad/.test($(w,'td-result').textContent),String(result()));
chk('3 distances give a tighter ±½-click range than one ('+band1+' → '+band3+')',band3>0&&band3<band1*0.75);
setRow(w,2,'dial',(dial2(0.115,250)+0.6).toFixed(4));w.eval('tdSolve()');
chk('one row 6 clicks off → disagreement warning, range taken from the scatter',/disagree by more than a click/.test($(w,'td-result').textContent)&&/\(scatter\)/.test($(w,'td-result').textContent)&&/from the scatter between distances/.test($(w,'td-result').textContent));
[...$(w,'td-result').querySelectorAll('button')].find(b=>/^Apply to/.test(b.textContent)).click();await wait(20);
chk('Apply records all distances in the source',/·150\+200\+250m$/.test(J(w,'getProj().bcTrued')),J(w,'getProj().bcTrued'));
[...w.document.querySelectorAll('#td-rows .td-row')][2].querySelector('button').click();await wait(10);
chk('✕ removes a row',w.document.querySelectorAll('#td-rows .td-row').length===2);
w.eval(`while(document.querySelectorAll('#td-rows .td-row').length>1)document.querySelector('#td-rows .td-row button').click()`);
// Impossible.
setRow(w,0,'dial',80);w.eval('tdSolve()');
chk('impossible dial → reason, no Apply button',/No BC fits: needs more elevation/.test($(w,'td-result').textContent)&&!$(w,'td-result').querySelector('button'));
chk('no innerHTML in the drop-truing code',(()=>{const h=fs.readFileSync(FILE,'utf8');const a=h.indexOf('function tdContext'),b=h.indexOf('function openProjForm');return a>0&&!/innerHTML/.test(h.slice(a,b));})());
const errs=all.flatMap(x=>x.errs);chk('ZERO uncaught errors',errs.length===0,errs.slice(0,3).join(' / '));
console.log('\nPASS '+pass+'   FAIL '+fail);process.exit(fail?1:0);
})().catch(e=>{console.error('TEST CRASH:',e);process.exit(1);});
