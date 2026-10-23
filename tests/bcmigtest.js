// Trued-BC migration test (V1.24.2): BCs trued in the app by the previous release (old drag
// engine) are converted on upgrade — G7 exactly (× π/4), G1 set to pending with the old value kept
// in the notes (no exact conversion: the G1 table itself changed). Physical check: a G7 BC trued by
// the OLD engine and converted equals what the NEW engine trues from the same measurement, and both
// match py-ballisticcalc's BC. Untrued BCs untouched; runs once; G1 re-true blocks with guidance.
// Usage: node bcmigtest.js <new.html> <previous-release.html>   (needs jsdom; see README.md)
const {JSDOM}=require('jsdom'),fs=require('fs');
const [NEW,OLD]=process.argv.slice(2);
const SK='sen_platform_v1';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let pass=0,fail=0;
const chk=(n,ok,extra)=>{console.log((ok?'  PASS  ':'  FAIL  ')+n+(extra?'   '+extra:''));ok?pass++:fail++;};
const all=[];
async function open(file,ls){
  const dom=new JSDOM(fs.readFileSync(file,'utf8'),{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',
    beforeParse(w){w.alert=()=>{};if(ls)w.localStorage.setItem(SK,ls);
      w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:(t,k)=>k==='measureText'?()=>({width:10}):()=>{}});}});
  const w=dom.window;w.errs=[];w.addEventListener('error',e=>w.errs.push(e.message));
  await wait(700);all.push(w);return w;
}
const J=(w,e)=>JSON.parse(w.eval('JSON.stringify('+e+')'));
const proj=(w,n)=>J(w,`DB.projectiles.find(p=>p.name==='${n}')`);
// "Measured" velocities at 100 m = py-ballisticcalc 3.1.1 (20 °C / 1010 hPa / 65 %): Queen G7 0.128 and King G1 0.250 from 260 m/s.
const TRUE7=`trueBCsingle(260,60,100,244.13,airDensity(20,1010,65),sos(20),'g7').bc`;
const TRUE1=`trueBCsingle(260,66,100,244.78,airDensity(20,1010,65),sos(20),'g1').bc`;

(async()=>{
console.log('=== TRUED-BC MIGRATION TEST: '+NEW+' ===');

// 1. The previous release trues and stores BCs with its own (old) engine.
const o=await open(OLD);
const old7=o.eval(TRUE7),old1=o.eval(TRUE1);
o.eval(`const base={cal:'.25',mfg:'TEST',type:'slug',diam:6.35,oal:12.9,c:0,ff:0,notes:''};
  DB.projectiles.push({...base,id:'t7',name:'T7 trued G7',mass:60,bcg7:+(${old7}).toFixed(4),bcg1:0,bcTrued:'single·g7·2026-10-01'});
  DB.projectiles.push({...base,id:'b7',name:'B7 banded G7',mass:60,bcg7:+(${old7}).toFixed(4),bcg1:0,bcTrued:'banded·g7·2026-10-01',
    bcBands:{drag:'g7',bands:[{vHi:260,vLo:244.1,bc:+(${old7}).toFixed(4)},{vHi:244.1,vLo:230,bc:0.2}]}});
  DB.projectiles.push({...base,id:'t1',name:'T1 trued G1',mass:66,oal:13.9,bcg7:0,bcg1:+(${old1}).toFixed(4),bcTrued:'single·g1·2026-10-01',notes:'my note'});
  DB.projectiles.push({...base,id:'u',name:'U maker BC',mass:60,bcg7:0.128,bcg1:0.245});
  saveDB();`);
const ls=o.localStorage.getItem(SK);

// 2. The new build converts them on first launch.
const w=await open(NEW,ls);
const new7=w.eval(TRUE7),new1=w.eval(TRUE1);
const t7=proj(w,'T7 trued G7'),b7=proj(w,'B7 banded G7'),t1=proj(w,'T1 trued G1'),u=proj(w,'U maker BC');
chk('G7 trued BC converted × π/4',t7.bcg7===+(+old7.toFixed(4)*Math.PI/4).toFixed(4)&&/π\/4/.test(t7.bcConv),old7.toFixed(4)+' → '+t7.bcg7);
chk('…equals what the new engine trues from the same measurement (±0.2%)',Math.abs(t7.bcg7/new7-1)<0.002,t7.bcg7+' vs '+new7.toFixed(4));
chk('…and the BC py-ballisticcalc used to make that measurement, 0.128 (±0.5%)',Math.abs(t7.bcg7/0.128-1)<0.005&&Math.abs(new7/0.128-1)<0.005,'new engine trues '+new7.toFixed(4));
chk('banded G7 BCs converted band by band',b7.bcBands.bands.map(b=>b.bc).join()===[+(+old7.toFixed(4)*Math.PI/4).toFixed(4),+(0.2*Math.PI/4).toFixed(4)].join(),JSON.stringify(b7.bcBands.bands));
chk('G1 trued BC → pending (0), old value kept in the notes',t1.bcg1===0&&new RegExp('my note · G1 BC '+(+old1.toFixed(4))+' trued before V1.24.2.*re-true needed').test(t1.notes),t1.notes);
chk('new engine trues the King back to G1 0.250 (±0.5%)',Math.abs(new1/0.250-1)<0.005,new1.toFixed(4)+' (old engine: '+old1.toFixed(4)+')');
chk('maker BCs (never trued) untouched',u.bcg7===0.128&&u.bcg1===0.245&&!u.bcConv);

// 3. A G1 profile needing re-truing blocks the trajectory with truing guidance.
w.eval(`Bus.setRifle(DB.rifles[0].id);Bus.setWx('cur',DB.weathers[0].id);Bus.setWx('zero',DB.weathers[0].id);Bus.setProj('t1');setDrag('g1');runTraj(true)`);await wait(30);
chk('G1 re-true profile: no solution, truing guidance shown',w.eval('lastTraj')===null&&/has no BC yet.*Truing/.test(w.eval('trajReason')),w.eval('trajReason'));
w.eval(`setDrag('g7');Bus.setProj('t7');runTraj(true)`);await wait(30);
chk('converted G7 profile solves',!!w.eval('lastTraj'));

// 4. Runs once: a restart does not convert again.
const r=await open(NEW,w.localStorage.getItem(SK));
chk('restart: no second conversion',proj(r,'T7 trued G7').bcg7===t7.bcg7&&proj(r,'T1 trued G1').notes===t1.notes&&proj(r,'B7 banded G7').bcBands.bands[1].bc===b7.bcBands.bands[1].bc);

const errs=all.flatMap(x=>x.errs);
chk('ZERO uncaught errors',errs.length===0,errs.slice(0,3).join(' / '));
console.log('\nPASS '+pass+'   FAIL '+fail);
process.exit(fail?1:0);
})().catch(e=>{console.error('TEST CRASH:',e);process.exit(1);});
