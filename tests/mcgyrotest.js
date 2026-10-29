// McGyro test (V2.5.0, BENCH-03 step 2): McCoy's 1986 McGyro next to Miller.
// 1) The port reproduces the original program: mcgyro-fixture.json holds all 880 printed rows (40 shapes ×
//    22 launch Mach numbers) of McCoy's BASIC run UNCHANGED in pcbasic 2.0.8 (single precision, 2 decimals).
// 2) Projectile shape fields: saved, validated, imported through the whitelist; profiles without them work.
// 3) Stability tab: Get-from-active fills the shape; McGyro Sg and twists equal the port; Miller shown at
//    standard air; range-test-candidate flag when the models disagree; pellet / no shape / Mach > 0.95 guidance;
//    shape lengths follow the Settings unit; Home still uses Miller.
// Usage: node mcgyrotest.js <app.html>   (needs jsdom; see README.md)
const {JSDOM}=require('jsdom'),fs=require('fs');
const FILE=process.argv[2];
const FIX=JSON.parse(fs.readFileSync(__dirname+'/mcgyro-fixture.json','utf8'));
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let pass=0,fail=0;
const chk=(n,ok,extra)=>{console.log((ok?'  PASS  ':'  FAIL  ')+n+(extra?'   '+extra:''));ok?pass++:fail++;};
const dom=new JSDOM(fs.readFileSync(FILE,'utf8'),{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',
  beforeParse(w){w.alert=m=>{w.__alert=m;};w.confirm=()=>true;w.scrollTo=()=>{};w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:(t,k)=>k==='measureText'?()=>({width:10}):()=>{}});}});
const w=dom.window;w.errs=[];w.addEventListener('error',e=>w.errs.push(e.message));
const J=e=>JSON.parse(w.eval('JSON.stringify('+e+')'));
const $=id=>w.document.getElementById(id);
const txt=id=>$(id).textContent;

(async()=>{
console.log('=== McGYRO TEST: '+FILE+' ===');
await wait(700);
// 1. Port vs original program.
let rows=0,exact=0,worst=0;const bad=[];
for(const c of FIX.cases){const i=c.in;
  for(const [M,sgP,nP] of c.rows){rows++;
    const r=J(`mcgyro(${i.L},${i.Ln},${i.rtr},${i.db},${i.dm},${i.rho},${i.twist},${M})`);
    const dn=Math.abs(r.n15-(+nP)),ds=Math.abs(r.sg-(+sgP)),e=Math.max(dn,ds);worst=Math.max(worst,e);
    if(r.n15.toFixed(2)===(+nP).toFixed(2)&&r.sg.toFixed(2)===(+sgP).toFixed(2))exact++;
    if(e>0.0101)bad.push([c.in,M,sgP,nP,r]);}}
chk('port reproduces all '+rows+' printed rows of the original BASIC within print resolution (±0.01)',rows===880&&bad.length===0,'worst '+worst.toFixed(4)+(bad.length?' · '+JSON.stringify(bad[0]):''));
chk('…and prints identically in ≥ 99 % of rows (rest: single- vs double-precision rounding at the 3rd decimal)',exact/rows>=0.99,exact+' / '+rows);
chk('subsonic, transonic and supersonic branches all covered by the fixture',[0.5,0.95,1.0,1.1,5.0].every(M=>FIX.cases[0].rows.some(r=>r[0]===M)));
chk('Sg = 1.5·(N15/twist)² and N15 is the twist for Sg 1.5',Math.abs(J('mcgyro(2.03,0.5,1,1,0,11.34,mcgyro(2.03,0.5,1,1,0,11.34,80,0.8).n15,0.8).sg')-1.5)<1e-12);
chk('no result for impossible input (meplat ≥ 1 cal, zero length)',J('mcgyro(2,0.5,1,1,1,11.34,80,0.8)')===null&&J('mcgyro(0,0.5,1,1,0,11.34,80,0.8)')===null);
// 2. Profile fields.
w.eval(`openProjForm('')`);
const set=(id,v)=>{$(id).value=v;};
set('pf-name','Test slug A');set('pf-diam','6.35');set('pf-mass','60');set('pf-oal','12.9');set('pf-nose','3.2');set('pf-rtr','1');set('pf-mep','0');set('pf-base','6.35');
w.eval(`saveProj('')`);
const pa=J(`DB.projectiles.find(p=>p.name==='Test slug A')`);
chk('projectile form saves the shape (nose, Rt/R, meplat, base); empty density stays empty (= lead)',pa&&pa.noseL===3.2&&pa.rtr===1&&pa.meplat===0&&pa.baseD===6.35&&pa.dens===null,JSON.stringify(pa&&{n:pa.noseL,r:pa.rtr,m:pa.meplat,b:pa.baseD,d:pa.dens}));
w.eval(`openProjForm('')`);set('pf-name','Bad');set('pf-diam','6.35');set('pf-mass','60');set('pf-oal','12.9');set('pf-mep','7');w.__alert='';w.eval(`saveProj('')`);
chk('validation: meplat wider than the diameter is refused',/Meplat/.test(w.__alert)&&!J(`DB.projectiles.some(p=>p.name==='Bad')`),w.__alert);w.eval('closeModal()');
chk('existing profiles without shape: mcgyroShape → null, nothing else changes',J(`mcgyroShape(DB.projectiles.find(p=>/^Altaros ATP Queen/.test(p.name)))`)===null);
w.eval(`importData({projectiles:[{name:'Imp',diam:6.35,mass:60,oal:12.9,noseL:3,rtr:0.5,meplat:1,baseD:6,dens:11,evil:'<b>'}]})`);
const pi=J(`DB.projectiles.find(p=>p.name==='Imp')`);
chk('import keeps the shape fields through the whitelist, drops unknown keys',pi&&pi.noseL===3&&pi.rtr===0.5&&pi.meplat===1&&pi.baseD===6&&pi.dens===11&&!('evil' in pi));
// 3. Stability tab.
w.eval(`Bus.setRifle(DB.rifles.find(x=>/\\.25/.test(x.name)).id);Bus.setProj(DB.projectiles.find(p=>p.name==='Test slug A').id);Bus.setWx('cur',DB.weathers[0].id);S.mv=274;gotoPage('stab');stabFromActive()`);await wait(20);
const card=i=>[...$('st-mcg-outs').children][i];
const tC=+$('st-temp').value,mv=+$('st-mv').value,twIn=+$('st-twist').value;
const exp=J(`(()=>{const M=${mv}/sos(${tC});return mcgyro(12.9/6.35,3.2/6.35,1,1,0,11.34,${twIn}/(6.35/25.4),M)})()`);
chk('Get from active fills nose / Rt/R / meplat / base / density',+$('st-nose').value===3.2&&+$('st-rtr').value===1&&+$('st-mep').value===0&&+$('st-base').value===6.35&&+$('st-dens').value===11.34);
chk('McGyro Sg card = port at the launch Mach (MV / speed of sound)',card(0)&&card(0).querySelector('.sv').textContent===exp.sg.toFixed(2)&&/Mach 0\.\d\d/.test(card(0).textContent),card(0)&&card(0).textContent);
const milStd=J(`calcSg(60,6.35,12.9,${twIn}*25.4,${mv},millerC(6.35,12.9).c,15,1013.25)`);
chk('Miller shown at standard air (15 °C, 1013 hPa) for a like-for-like comparison',card(1).querySelector('.sv').textContent===milStd.toFixed(2),card(1).textContent);
chk('McGyro twists for Sg 1.5 and 1.7',card(2).querySelector('.sv').textContent==='1:'+(exp.n15*0.25).toFixed(1)+'″'&&card(3).querySelector('.sv').textContent==='1:'+(exp.n15*Math.sqrt(1.5/1.7)*0.25).toFixed(1)+'″');
const fl=txt('st-mcg-flags'),dis=Math.abs(exp.sg-milStd)/milStd>0.15&&Math.min(exp.sg,milStd)<1.5;
chk('disagreement verdict matches the numbers ('+exp.sg.toFixed(2)+' vs '+milStd.toFixed(2)+')',dis?/Range-test candidate/.test(fl):/not a deciding test/.test(fl),fl);
chk('estimate + reference-atmosphere caveat always shown',/Estimate \(McCoy ±5 %\)/.test(fl)&&/Reference atmosphere/.test(fl));
const sgBefore=J('homeTraj().sg');
chk('Stability tab Miller result unchanged by the McGyro panel (st-outs still Miller)',/Miller C = /.test(txt('st-cmode')));
$('st-mv').value='340';w.eval('calcStab()');
chk('launch Mach > 0.95 → no McGyro number, says why',$('st-mcg-outs').children.length===0&&/above 0\.95/.test(txt('st-mcg-flags')));
$('st-mv').value=String(mv);$('st-nose').value='';w.eval('calcStab()');
chk('no shape → guidance, no number',$('st-mcg-outs').children.length===0&&/Enter nose length/.test(txt('st-mcg-flags')));
w.eval(`stabKind.pellet=true;calcStab();stabKind.pellet=false`);
chk('pellet → no McGyro Sg',/drag-stabilised/.test(txt('st-mcg-flags')));
w.eval(`UNITS.bullet='in';refreshUnits();stabFromActive()`);
chk('shape lengths follow the Settings unit (3.2 mm → 0.126 in shown)',Math.abs(+w.eval(`NATIVE_VALUE.get.call(document.getElementById('st-nose'))`)-0.126)<0.001&&+$('st-nose').value===3.2);
w.eval(`UNITS.bullet='mm';refreshUnits()`);
chk('Home still uses Miller (session Sg unchanged by shape fields)',J('homeTraj().sg')===sgBefore&&Math.abs(sgBefore-J(`calcSg(60,6.35,12.9,DB.rifles.find(x=>/\\.25/.test(x.name)).twist,S.mv,millerC(6.35,12.9).c,${tC},+document.getElementById('st-pres').value)`))<0.05,String(sgBefore));
chk('no uncaught errors',w.errs.length===0,w.errs.join(' | '));
console.log('\nPASS '+pass+'   FAIL '+fail);
process.exit(fail?1:0);
})();
