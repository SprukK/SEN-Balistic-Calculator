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
const hPa=+$('st-pres').value,SH='{L:12.9/6.35,Ln:3.2/6.35,rtr:1,db:1,dm:0,rho:11.34}',TW=`${twIn}/(6.35/25.4)`;
const std=J(`(()=>{const M=${mv}/sos(15);return mcgyro(12.9/6.35,3.2/6.35,1,1,0,11.34,${TW},M)})()`);
// "your air", computed here from the raw port: Sg × ρ_std/ρ with Mach at the local speed of sound (dry air)
const air=J(`(()=>{const M=${mv}/sos(${tC}),r=mcgyro(12.9/6.35,3.2/6.35,1,1,0,11.34,${TW},M),k=airDensity(15,1013.25,0)/airDensity(${tC},${hPa},0);return{sg:r.sg*k,n15:r.n15*Math.sqrt(k)}})()`);
const exp=std;
chk('Get from active fills nose / Rt/R / meplat / base / density',+$('st-nose').value===3.2&&+$('st-rtr').value===1&&+$('st-mep').value===0&&+$('st-base').value===6.35&&+$('st-dens').value===11.34);
chk('McGyro, standard air = raw port at Mach MV / speed of sound at 15 °C',card(0)&&card(0).querySelector('.sv').textContent===std.sg.toFixed(2)&&/15 °C · 1013 hPa · M 0\.\d\d/.test(card(0).textContent),card(0)&&card(0).textContent);
chk('McGyro, your air = raw port × ρ_std/ρ at the local Mach (Kolbe-confirmed scaling)',card(2)&&card(2).querySelector('.sv').textContent===air.sg.toFixed(2)&&/McGyro, your air/.test(card(2).textContent),card(2)&&card(2).textContent);
const milStd=J(`calcSg(60,6.35,12.9,${twIn}*25.4,${mv},millerC(6.35,12.9).c,15,1013.25)`);
chk('Miller shown at standard air (15 °C, 1013 hPa) for a like-for-like comparison',card(1).querySelector('.sv').textContent===milStd.toFixed(2),card(1).textContent);
chk('McGyro twists for Sg 1.5 and 1.7 at your air',card(3).querySelector('.sv').textContent==='1:'+(air.n15*0.25).toFixed(1)+'″'&&card(4).querySelector('.sv').textContent==='1:'+(air.n15*Math.sqrt(1.5/1.7)*0.25).toFixed(1)+'″');
const fl=txt('st-mcg-flags'),dis=Math.abs(exp.sg-milStd)/milStd>0.15&&Math.min(exp.sg,milStd)<1.5;
chk('disagreement verdict matches the numbers ('+exp.sg.toFixed(2)+' vs '+milStd.toFixed(2)+')',dis?/Range-test candidate/.test(fl):/not a deciding test/.test(fl),fl);
chk('estimate + standard-air / Kolbe note always shown',/Estimate \(McCoy ±5 %\)/.test(fl)&&/Standard air = 15 °C, 1013 hPa, dry/.test(fl)&&/Kolbe/.test(fl));
// Kolbe cross-check (owner's runs, graph readings ±0.02): 59 °F and 86 °F, 29.92 inHg, dry, 1:20″
const K=(fps,tc)=>J(`mcgyroAir(MCG_KOLBE,80,${fps}*0.3048,${tc},1013.25,0).sg`);
chk('Kolbe 59 °F: 560/1000/1250/2000/4000 fps ≈ 1.76/1.43/1.93/2.02/2.12',[[560,1.76],[1000,1.43],[1250,1.93],[2000,2.02],[4000,2.12]].every(([v,k])=>Math.abs(K(v,15)-k)<=0.02),[560,1000,1250,2000,4000].map(v=>K(v,15).toFixed(3)).join(' '));
chk('Kolbe 86 °F: 560/1000/1250/2000/4000 fps ≈ 1.86/1.55/2.03/2.12/2.22 (density-scaled; unscaled would miss by ~5 %)',[[560,1.86],[1000,1.55],[1250,2.03],[2000,2.12],[4000,2.22]].every(([v,k])=>Math.abs(K(v,30)-k)<=0.02)&&Math.abs(J(`mcgyro(2.03,0.5,1,1,0,11.34,80,2000*0.3048/sos(30)).sg`)-2.12)>0.08,[560,1000,1250,2000,4000].map(v=>K(v,30).toFixed(3)).join(' '));
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
// Dimension drawings wherever projectile dimensions are entered.
const dia=sel=>{const h=w.document.querySelector(sel);const s=h&&h.querySelector('svg');return s?[...s.querySelectorAll('g[data-f]')].map(g=>[g.getAttribute('data-f'),g.getAttribute('opacity'),g.textContent]):null;};
const on=d=>d.filter(x=>x[1]==='1').map(x=>x[0]).sort().join(',');
chk('BC tab geometry: drawing with Diameter + Length highlighted',(d=>d&&on(d)==='diam,oal'&&d.length===6)(dia('#page-truing .projdia')),JSON.stringify(dia('#page-truing .projdia')));
chk('Stability inputs: drawing with Diameter + Length highlighted',(d=>d&&on(d)==='diam,oal')(dia('#page-stab .panel .projdia')));
chk('McGyro panel: drawing with nose length, Rt/R, meplat, base highlighted',(d=>d&&on(d)==='base,mep,nose,rtr')(dia('#st-mcg .projdia')),JSON.stringify(dia('#st-mcg .projdia')));
w.eval(`openProjForm(DB.projectiles[0].id)`);
const pfd=dia('#mbox .projdia');
chk('projectile form: drawing with all six fields highlighted and labelled',pfd&&pfd.length===6&&pfd.every(x=>x[1]==='1')&&['Diameter','Length (OAL)','Nose length','Meplat Ø','Base Ø','Nose shape Rt/R'].every(l=>pfd.some(x=>x[2].startsWith(l))),JSON.stringify(pfd));
chk('drawings are built as SVG elements (no HTML strings)',!/<svg/.test(w.eval(`openProjForm.toString()`))&&w.document.querySelector('#mbox .projdia svg').namespaceURI==='http://www.w3.org/2000/svg');
w.eval('closeModal()');
chk('no uncaught errors',w.errs.length===0,w.errs.join(' | '));
console.log('\nPASS '+pass+'   FAIL '+fail);
process.exit(fail?1:0);
})();
