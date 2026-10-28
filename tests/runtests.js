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
// V1.30.0: built-in Miller (C = 30·d²). Anchors = Berger's twist-rate calculator, 853 fps / 50 °F / 978 ft (≈ 980 hPa).
chk("Miller C .25 = 30·0.25² = 1.875", millerC(6.35,12.9).c, 1.875, 1e-12);
chk("Sg Queen 0.508in 1:20in = 1.18 (Berger, 2026-10-28)", calcSg(60,6.35,12.9,20*25.4,853*0.3048,millerC(6.35,12.9).c,10,980), 1.18, 0.005);
chk("Sg King 0.547in 1:20in = 1.07 (Berger)", calcSg(66,6.35,13.9,20*25.4,853*0.3048,millerC(6.35,13.9).c,10,980), 1.07, 0.005);
chk("Sg King 1:16in = 1.67 (Berger)", calcSg(66,6.35,13.9,16*25.4,853*0.3048,millerC(6.35,13.9).c,10,980), 1.67, 0.005);
chk("BC penalty at Sg 1.18 ≈ Berger 0.221/0.245", bcEffSg(1,1.18), 0.221/0.245, 0.01);
chk("L/D < 2.0 → Sg not computed", millerC(6.35,10.58).valid?1:0, 0);
chk("pellet → Sg not computed", projC({type:'pellet',diam:5.5,oal:6,c:0}).valid?1:0, 0);
chk("profile C overrides Miller", projC({type:'slug',diam:6.35,oal:12.9,c:2.0}).c, 2.0, 0);
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

console.log('\n=== V1.29.1 RK4 POSITION UPDATE (§20A vs py-ballisticcalc 3.1.1) ===');
// Fails on ≤ V1.29.0 (position advanced with the start-of-step velocity): TOF 0.396957, drift 37.026.
chk('Queen G7 0.128 @260: TOF100 = 0.397025 s (pbc)', atR(q7,100).tof, 0.397025, 2e-5);
chk('King G1 0.250 @260: TOF200 = 0.817182 s (pbc)', atR(k1,200).tof, 0.817182, 4e-5);
chk('lag-rule drift 3 m/s @100 = 37.221 mm (pbc)', windDrift(atR(q7,100).tof,100,260,3), 37.221, 0.03);
chk('lag-rule drift 3 m/s @200 = 151.601 mm (pbc)', windDrift(atR(q7,200).tof,200,260,3), 151.601, 0.08);

console.log('\n=== V1.29.0 WIND CHANGING ALONG THE FLIGHT (CORE-17 core, §20A vs py-ballisticcalc 3.1.1) ===');
// Queen G7 0.128 @ 260 m/s, zero 50 m, sight 44 mm, 20 °C / 1010 hPa / 65 %. pbc: per-zone Wind(until_distance),
// drift = windage with wind − without; blend = 1 m zones at the blended value (pbc skips zones shorter than its step).
const wq=rk4traj(260,0.128,60,50,200,0.044,env.rho,env.aS,1,'g7',0.245,null);
const WF=(st,mode,d)=>windDriftField(wq,d,crossField(st,mode));
chk('uniform 3 m/s @100 = 37.221 mm (pbc)',   WF([{x:0,cross:3}],'nearest',100), 37.221, 0.10);
chk('uniform 3 m/s @200 = 151.601 mm (pbc)',  WF([{x:0,cross:3}],'nearest',200), 151.601, 0.25);
const ZC=[['nearest 10 m +4 / 120 m −2',[{x:10,cross:4},{x:120,cross:-2}],'nearest',40.606,61.945],
          ['nearest 10 m 0 / 60 m +3',[{x:10,cross:0},{x:60,cross:3}],'nearest',15.742,104.015],
          ['nearest 10 m +3 / 150 m 0',[{x:10,cross:3},{x:150,cross:0}],'nearest',35.761,95.870],
          ['blend 10 m +4 / 120 m −2',[{x:10,cross:4},{x:120,cross:-2}],'blend',33.175,54.321],
          ['blend 10 m 0 / 60 m +3',[{x:10,cross:0},{x:60,cross:3}],'blend',16.509,104.768]];
for(const [n,st,m,r1,r2] of ZC){chk(n+' @100 = '+r1+' mm (pbc ±0.5)',WF(st,m,100),r1,0.5);chk(n+' @200 = '+r2+' mm (pbc ±1.5)',WF(st,m,200),r2,1.5);}
const f2=crossField([{x:120,cross:-2},{x:10,cross:4}],'blend');
chk('crossField: unsorted input, blend midpoint 65 m = +1', f2(65), 1, 1e-12);
chk('crossField: nearest switches halfway (64.9 → +4, 65.1 → −2)', crossField([{x:10,cross:4},{x:120,cross:-2}],'nearest')(64.9)*10+crossField([{x:10,cross:4},{x:120,cross:-2}],'nearest')(65.1), 38, 1e-12);
chk('equal stations = uniform field (bit-identical)', WF([{x:10,cross:2.5},{x:90,cross:2.5}],'blend',150)===WF([{x:0,cross:2.5}],'nearest',150)?1:0, 1);
chk('mirrored stations → exactly opposite drift', WF([{x:10,cross:4},{x:120,cross:-2}],'nearest',200)+WF([{x:10,cross:-4},{x:120,cross:2}],'nearest',200), 0, 1e-12);
const nearHalf=WF([{x:0,cross:3},{x:99.9,cross:3},{x:100.1,cross:0},{x:200,cross:0}],'nearest',200),farHalf=WF([{x:0,cross:0},{x:99.9,cross:0},{x:100.1,cross:3},{x:200,cross:3}],'nearest',200);
chk('3 m/s over the first 100 m drifts more than over the last 100 m, and the halves add up to uniform (200 m)', nearHalf>farHalf&&Math.abs(nearHalf+farHalf-WF([{x:0,cross:3}],'nearest',200))<1e-9?1:0, 1);
chk('beyond the trajectory → null', windDriftField(wq,250,()=>3), null);
const s1=solveShot(wq,nearestPt,50,150,0,3,90,260,0.1,0,90),s2=solveShot(wq,nearestPt,50,150,0,3,90,260,0.1,0,90,undefined);
chk('solveShot without stations unchanged (lag rule)', s1.windDriftMm===windDrift(nearestPt(wq,150).tof,150,260,3)&&s2.windDriftMm===s1.windDriftMm?1:0, 1);
chk('solveShot with a field uses it', solveShot(wq,nearestPt,50,150,0,3,90,260,0.1,0,90,crossField([{x:10,cross:4},{x:120,cross:-2}],'nearest')).windDriftMm, WF([{x:10,cross:4},{x:120,cross:-2}],'nearest',150), 1e-12);

console.log('\n=== V1.16.0 NEW BEHAVIOUR ===');
chk('trajReason defined',            typeof trajReason, 'string');
chk('runTraj accepts silent arg',    runTraj.length, 1);
chk('autoTraj is a function',        typeof autoTraj, 'function');
chk('refreshActivePage is a fn',     typeof refreshActivePage, 'function');
chk('trajFail is a function',        typeof trajFail, 'function');
console.log('\nPASS '+pass+'   FAIL '+fail);
process.exit(fail?1:0);
