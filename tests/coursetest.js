// Course test (V1.23.0, CORE-12): dope cards schema v2 — upgrade of real previous-release cards,
// solution inputs untouched (dope bit-identical until the V1.24.2 drag fix), the headwind (0°) fix, import upgrade + sanitising, target-detail editing
// (label, bearing, size with units, position, shots), stage time limit, compass capture,
// printed card, persistence.
// Usage: node coursetest.js <new.html> <previous-release.html>   (needs jsdom; see README.md)
const {JSDOM}=require('jsdom'),fs=require('fs');
const [NEW,OLD]=process.argv.slice(2);
const SK='sen_platform_v1';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let pass=0,fail=0;
const chk=(n,ok,extra)=>{console.log((ok?'  PASS  ':'  FAIL  ')+n+(extra?'   '+extra:''));ok?pass++:fail++;};
const all=[];
async function open(file,{ls,setup}={}){
  const dom=new JSDOM(fs.readFileSync(file,'utf8'),{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',
    beforeParse(w){w.alerts=[];w.alert=m=>w.alerts.push(String(m));w.print=()=>{};if(ls)w.localStorage.setItem(SK,ls);
      w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:(t,k)=>k==='measureText'?()=>({width:10}):()=>{}});if(setup)setup(w);}});
  const w=dom.window;w.errs=[];w.addEventListener('error',e=>w.errs.push(e.message));
  await wait(700);all.push(w);return w;
}
const J=(w,e)=>JSON.parse(w.eval('JSON.stringify('+e+')'));
const cells=w=>J(w,"DB.dopeCards[0].stages.flatMap(s=>s.dists.map(d=>['dc-rc-','dc-re-','dc-rw-'].map(p=>document.getElementById(p+d.id).textContent).join('|')))");
const card=w=>J(w,'DB.dopeCards[0]');

(async()=>{
console.log('=== COURSE TEST: '+NEW+' ===');

// 1. A real card made by the previous release: two stages, mixed winds (no 0° direction).
const o=await open(OLD);
o.eval(`Bus.setRifle(DB.rifles[0].id);Bus.setProj(DB.projectiles.find(p=>/Queen/.test(p.name)).id);Bus.setWx('cur',DB.weathers[0].id);
  newDope();const c=DB.dopeCards[0];
  c.stages[0].dists[1].wind=4;c.stages[0].dists[1].wdir=90;c.stages[0].dists[2].wind=3;c.stages[0].dists[2].wdir=300;c.stages[0].dists[0].angle=10;
  addStage();c.stages[1].dists[0].range=175;c.stages[1].dists[0].wind=5;c.stages[1].dists[0].wdir=45;
  saveDB();loadDope();calcDope();`);
const oldCells=cells(o),legacy=o.localStorage.getItem(SK);
chk('previous release computed a 4-target card',oldCells.length===4&&oldCells.every(x=>!/—\|—\|—/.test(x)),oldCells.join(' / '));

// 2. The new build upgrades it and computes bit-identical dope.
const w=await open(NEW,{ls:legacy});
const c=card(w);
chk('stored v1 card upgraded: labels T1–T3 / T1, shots 1, no bearing/size/position, no time',
  c.stages[0].dists.map(d=>d.label).join()==='T1,T2,T3'&&c.stages[1].dists[0].label==='T1'&&
  c.stages.every(s=>s.time===null&&s.dists.every(d=>d.shots===1&&d.brg===null&&d.size===null&&d.pos==='')));
w.eval("gotoPage('dope');document.getElementById('dc-sel').value=DB.dopeCards[0].id;loadDope();calcDope()");await wait(30);
// V1.24.2 changed the drag engine on purpose (standard G1 table + π/4), so dope is no longer
// bit-identical to the previous release. What the upgrade must guarantee: every solution input is
// untouched, and every target still computes.
const inputs=x=>JSON.stringify(J(x,'DB.dopeCards[0].stages.map(s=>s.dists.map(d=>[d.range,d.angle,d.wind,d.wdir]))'));
chk('upgrade leaves every solution input identical (range, angle, wind, direction)',inputs(w)===inputs(o),inputs(w));
chk('every target computes dope after the upgrade',cells(w).length===4&&cells(w).every(x=>!/—\|—\|—/.test(x)),cells(w).join(' / ')+'  (previous release: '+oldCells.join(' / ')+')');

// 3. Headwind fix: 0° is a headwind, not a crosswind from the right.
const fix=async file=>{const x=await open(file,{ls:legacy});x.eval(`gotoPage('dope');const d=DB.dopeCards[0].stages[0].dists[1];d.wind=5;d.wdir=0;document.getElementById('dc-sel').value=DB.dopeCards[0].id;loadDope();calcDope()`);await wait(20);return x.eval(`document.getElementById('dc-rw-'+DB.dopeCards[0].stages[0].dists[1].id).textContent`);};
const oldHw=await fix(OLD),newHw=await fix(NEW);
chk('5 m/s at 0° (headwind) → no windage now',newHw==='→0',newHw);
chk('…the previous release turned it into a crosswind',oldHw!=='→0',oldHw);
chk('the editor shows 0°, not 90°',w.eval(`(()=>{const d=DB.dopeCards[0].stages[0].dists[1];d.wdir=0;renderStages();return document.querySelector('#dr-'+d.id+' input[data-q="-"]:nth-of-type(1)')&&[...document.querySelectorAll('#dr-'+d.id+' input')][3].value})()`)==='0');

// 4. Imports: v1 files upgrade; v2 fields kept; junk sanitised.
w.eval(`importData({schema:{dopeCards:1},dopeCards:[{id:'imp1',name:'OLD FILE',mv:280,zero:50,notes:'',stages:[{id:'s',name:'S',notes:'',dists:[{id:'d1',range:60,angle:0,wind:0,wdir:90},{id:'d2',range:80,angle:0,wind:0,wdir:90}]}]}]})`);
const imp1=J(w,"DB.dopeCards.find(c=>c.name==='OLD FILE')");
chk('v1 file imports upgraded (T1/T2, shots 1, time null)',imp1&&imp1.stages[0].dists.map(d=>d.label).join()==='T1,T2'&&imp1.stages[0].time===null&&imp1.stages[0].dists[0].shots===1);
w.eval(`importData({dopeCards:[{id:'imp2',name:'NEW FILE',mv:280,zero:50,notes:'',stages:[{id:'s',name:'S',notes:'',time:120,x:1,
  dists:[{id:'a',range:40,angle:0,wind:0,wdir:90,label:'Rabbit',brg:370,size:25,pos:'kneel',shots:2},{id:'b',range:30,angle:0,wind:0,wdir:90,label:'',brg:'n',size:-4,pos:'flying',shots:-3,evil:'<x>'}]}]}]})`);
const imp2=J(w,"DB.dopeCards.find(c=>c.name==='NEW FILE')"),[ta,tb]=imp2?imp2.stages[0].dists:[{},{}];
chk('v2 fields kept (Rabbit, 10°, 25 mm, kneeling, 2 shots, 120 s)',ta.label==='Rabbit'&&ta.brg===10&&ta.size===25&&ta.pos==='kneel'&&ta.shots===2&&imp2.stages[0].time===120);
chk('junk sanitised (label→T2, bad bearing/size/position/shots dropped, unknown keys gone)',tb.label==='T2'&&tb.brg===null&&tb.size===null&&tb.pos===''&&tb.shots===1&&!('evil' in tb)&&!('x' in imp2.stages[0]));
w.eval(`importData(${JSON.stringify({dopeCards:[card(w)]})})`);
chk('re-importing own v2 card: recognised as identical',/1 already identical/.test(w.alerts[w.alerts.length-1]||''),w.alerts[w.alerts.length-1]);

// 5. Editing target details and the stage time limit in the UI.
w.eval(`gotoPage('dope');document.getElementById('dc-sel').value=DB.dopeCards[0].id;loadDope()`);await wait(30);
const d0=J(w,'DB.dopeCards[0].stages[0].dists[0].id');
const det=w.document.getElementById('dd-'+d0);
chk('target details hidden until ⋯ is tapped',det.style.display==='none');
w.eval(`toggleDistDetail('${d0}')`);chk('⋯ opens them',det.style.display==='');
const ins=det.querySelectorAll('input'),sel=det.querySelector('select');
const fire=(el,v)=>{el.value=v;el.dispatchEvent(new w.Event('change',{bubbles:true}));};
fire(ins[0],'Steel 1');fire(ins[1],'95');fire(sel,'stand');fire(ins[3],'3');
w.eval("setUnit('tsize','in')");await wait(30);
const sizeIn=w.document.getElementById('dd-'+d0).querySelectorAll('input')[2];
w.eval("NATIVE_VALUE.set.call(document.getElementById('dd-"+d0+"').querySelectorAll('input')[2],'2')");sizeIn.dispatchEvent(new w.Event('input',{bubbles:true}));sizeIn.dispatchEvent(new w.Event('change',{bubbles:true}));
const t0=J(w,'DB.dopeCards[0].stages[0].dists[0]');
chk('label, bearing, position, shots stored',t0.label==='Steel 1'&&t0.brg===95&&t0.pos==='stand'&&t0.shots===3,JSON.stringify(t0));
chk('size typed as 2 in stored as 50.8 mm',Math.abs(t0.size-50.8)<1e-9,String(t0.size));
chk('size label follows the unit setting',/\bin\b/.test(sizeIn.closest('.fld').querySelector('label').textContent));
w.eval("setUnit('tsize','mm')");
fire(w.document.querySelector('.st-time'),'120');
chk('stage time limit stored',J(w,'DB.dopeCards[0].stages[0].time')===120);

// 6. Compass capture for a target bearing.
const cw=await open(NEW,{ls:w.localStorage.getItem(SK),setup:x=>{x.ondeviceorientationabsolute=null;}});
cw.eval(`gotoPage('dope');document.getElementById('dc-sel').value=DB.dopeCards[0].id;loadDope()`);
const did=J(cw,'DB.dopeCards[0].stages[0].dists[1].id');
const pc=cw.eval(`captureDistBearing(DB.dopeCards[0].stages[0].id,'${did}')`);await wait(100);
const ev=new cw.Event('deviceorientationabsolute');Object.defineProperty(ev,'absolute',{value:true});Object.defineProperty(ev,'alpha',{value:300});cw.dispatchEvent(ev);
await pc;
chk('📍 captures the target bearing (alpha 300 → 60°) and keeps details open',J(cw,'DB.dopeCards[0].stages[0].dists[1].brg')===60&&cw.document.getElementById('dd-'+did).style.display==='');

// 7. Printed card shows the new information.
w.eval('saveDB();calcDope();printDope()');
const pr=w.document.getElementById('print-content').textContent;
chk('print shows label, position, size, shots, bearing and stage time',/Steel 1/.test(pr)&&/Standing · 51 mm · 3× · 95°/.test(pr)&&/⏱ 120 s/.test(pr),pr.slice(0,300));

// 8. Survives a restart.
const r=await open(NEW,{ls:w.localStorage.getItem(SK)});
const rt=J(r,'DB.dopeCards[0]');
chk('target details and stage time survive a restart',rt.stages[0].dists[0].label==='Steel 1'&&rt.stages[0].time===120&&Math.abs(rt.stages[0].dists[0].size-50.8)<1e-9);

const errs=all.flatMap(x=>x.errs);
chk('ZERO uncaught errors',errs.length===0,errs.slice(0,3).join(' / '));
console.log('\nPASS '+pass+'   FAIL '+fail);
process.exit(fail?1:0);
})().catch(e=>{console.error('TEST CRASH:',e);process.exit(1);});
