require('./harness.js');
const fs=require('fs'),vm=require('vm');
const file=process.argv[2]||'./check.js';
try{ vm.runInThisContext(fs.readFileSync(file,'utf8')); }catch(e){ console.log('BOOT ERROR:',e.message); }
let pass=0,fail=0;
const chk=(n,got,want,tol)=>{const ok=tol===undefined?got===want:Math.abs(got-want)<=tol;
  console.log((ok?'  PASS  ':'  FAIL  ')+n+'   got='+(typeof got==='number'?got.toFixed(5):got));ok?pass++:fail++;};

console.log('=== STANDING REGRESSION ANCHORS ===');
chk('rho(20/1010/65) = 1.1934',      airDensity(20,1010,65), 1.1934, 5e-4);
chk('sos(20) = 343.24',              sos(20), 343.24, 0.02);
chk('SD Queen .25 = 0.137',          calcSD(60,6.35), 0.137, 5e-4);
chk("Sg Queen 1:20in = 1.43 (Berger 853fps/10C/986hPa)", calcSg(60,6.35,12.9,20*25.4,853*0.3048,2.283,10,986), 1.43, 0.005);
chk("Sg King 1:20in = 1.07",         calcSg(66,6.35,13.9,20*25.4,853*0.3048,1.886,10,986), 1.07, 0.005);
chk('Sg LRAI-35 1:16" = 1.719',      calcSg(212.4,8.89,25,16*25.4,691*0.3048,3.822,-5,1013), 1.719, 0.02);
chk('toMOA identity = 1.0000',       toMOA(100,100)/3.43775, 1.0000, 1e-4);
chk('clickMrad(0.25 MOA) = 0.0727',  clickMrad(0.25,'moa'), 0.0727, 5e-4);
chk('toMrad(100mm@100m) = 1.0',      toMrad(100,100), 1.0, 1e-9);
chk('bcEffSg(1, Sg1.5) = 1.0',       bcEffSg(1,1.5), 1.0, 1e-9);

console.log('\n=== TRAJECTORY ANCHORS ===');
const env={rho:airDensity(20,1010,65),aS:sos(20),bc7:0.128,bc1:0.245};
const pts=rk4traj(255,0.128,60,50,200,0.044,env.rho,env.aS,1,'g7',0.245,null,env);
const at=r=>pts.find(p=>Math.abs(p.range-r)<1e-6);
chk('drop @ zero(50m) = 0.000 mm',   at(50).drop, 0.000, 5e-3);
const ptsFar=rk4traj(240,0.15,60,50,800,0.044,env.rho,env.aS,25,'g7',0.25,null,env);
chk('800 m run completes',           ptsFar[ptsFar.length-1].range, 800, 1e-6);
chk('800 m drop = 69.79 m (py-ballisticcalc)', ptsFar[ptsFar.length-1].drop/1000, -69.79, 0.10);  // V1.24.2: was 76.76 (4/π drag)
const sol=solveShot(pts,nearestPt,50,100,0,0,90,255,0.0727,0,90);
chk('solve @100 returns solution',   sol?1:0, 1);
chk('dial @ zero range = 0 mrad',    solveShot(pts,nearestPt,50,50,0,0,90,255,0.1,0,90).mrElev, 0, 1e-6);

console.log('\n=== V1.24.2 DRAG (§20A: standard tables + independent solvers) ===');
const atR=(p,r)=>p.find(q=>Math.abs(q.range-r)<1e-6);
// Standard tables: ballistics-engine data/*.csv (BRL/McCoy) = py-ballisticcalc drag_tables.py
chk('G1 Cd M0.50 = 0.2032',           interp(G1T,0.50), 0.2032, 1e-9);
chk('G1 Cd M0.75 = 0.2313',           interp(G1T,0.75), 0.2313, 1e-9);
chk('G1 Cd M1.00 = 0.4805',           interp(G1T,1.00), 0.4805, 1e-9);
chk('G7 Cd M1.00 = 0.3803',           interp(G7T,1.00), 0.3803, 1e-9);
chk('G7 Cd M1.50 = 0.3440',           interp(G7T,1.50), 0.3440, 1e-9);
chk('G7 Cd M2.00 = 0.2980',           interp(G7T,2.00), 0.2980, 1e-9);
// py-ballisticcalc 3.1.1, identical inputs (20 °C / 1010 hPa / 65 %, sight 44 mm, zero 50 m)
const q7=rk4traj(260,0.128,60,50,200,0.044,env.rho,env.aS,1,'g7',0.245,null);
chk('Queen G7 0.128 @260: v200 = 229.40 m/s (pbc)', atR(q7,200).v, 229.40, 0.05);
chk('Queen G7 0.128 @260: drop200 = -2288.6 mm (pbc)', atR(q7,200).drop, -2288.6, 2);
const k1=rk4traj(260,0,66,50,200,0.044,env.rho,env.aS,1,'g1',0.250,null);
chk('King G1 0.250 @260: v200 = 231.19 m/s (pbc)', atR(k1,200).v, 231.19, 0.05);
chk('King G1 0.250 @260: drop200 = -2277.3 mm (pbc)', atR(k1,200).drop, -2277.3, 2);
// Owner's Element Ballistics table (Jul 2026): Queen G1 0.245, 285 m/s, sight 70 mm, zero 100 m, 27.5 °C / 1011 hPa / 53 %
const el=rk4traj(285,0,60,100,1000,0.070,airDensity(27.5,1011,53),sos(27.5),1,'g1',0.245,null);
chk('Element: drop500 = 1533.8 cm (±0.5%)', -atR(el,500).drop/10, 1533.8, 7.7);
chk('Element: drop1000 = 8636.8 cm (±0.5%)', -atR(el,1000).drop/10, 8636.8, 43.2);
chk('Element: v1000 = 165 m/s (±1)', atR(el,1000).v, 165, 1);

console.log('\n=== V1.16.0 NEW BEHAVIOUR ===');
chk('trajReason defined',            typeof trajReason, 'string');
chk('runTraj accepts silent arg',    runTraj.length, 1);
chk('autoTraj is a function',        typeof autoTraj, 'function');
chk('refreshActivePage is a fn',     typeof refreshActivePage, 'function');
chk('trajFail is a function',        typeof trajFail, 'function');
console.log('\nPASS '+pass+'   FAIL '+fail);
process.exit(fail?1:0);
