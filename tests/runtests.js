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

console.log('\n=== V2.1.0 WIND FIELD WITH HEAD/TAILWIND (CORE-17 step 1, §20A: py-ballisticcalc 3.1.1 per-zone Wind) ===');
// Queen G7 0.128 @ 260 m/s, zero 50 m (calm), sight 44 mm, 20 °C / 1010 hPa / 65 %. Stations {x, cross, head(+ = tail)};
// pbc zones: nearest = boundary halfway, blend = 1 m zones at the blended vector. Values: [drop, windage] mm.
const hq=rk4traj(260,0.128,60,50,250,0.044,env.rho,env.aS,1,'g7',0.245,null);
const WS=(st,m,d)=>{const s=solveShot(hq,nearestPt,50,d,0,0,90,260,0.1,0,90,windField(st,m));return[-s.mrElev*d,s.windDriftMm];};
const MIX=[{x:10,cross:2.82842712474619,head:-2.8284271247461903},{x:120,cross:-1.026060429977006,head:2.8190778623577253}];
const HT=[{x:10,cross:0,head:-6},{x:120,cross:0,head:6}],CH=[{x:10,cross:0,head:0},{x:150,cross:0,head:-8}];
for(const [n,st,m,d,dw,ww] of [['4 m/s from 45° @10 m → 3 m/s from 200° @120 m',MIX,'nearest',100,-343.16,29.74],['… nearest',MIX,'nearest',200,-2290.39,54.19],
  ['… blend',MIX,'blend',100,-342.99,24.77],['… blend',MIX,'blend',200,-2289.77,48.66],
  ['6 m/s head @10 m → 6 m/s tail @120 m, nearest',HT,'nearest',100,-343.96,0],['… nearest',HT,'nearest',200,-2292.54,0],['… blend',HT,'blend',200,-2291.13,0],
  ['calm @10 m → 8 m/s head @150 m, nearest',CH,'nearest',200,-2295.30,0],['… blend',CH,'blend',200,-2296.42,0]]){
  const r=WS(st,m,d);chk(n+' '+m+' @'+d+' m: drop '+dw+' mm (pbc)',r[0],dw,d>150?0.3:0.1);if(ww)chk(n+' '+m+' @'+d+' m: windage '+ww+' mm (pbc)',r[1],ww,d>150?0.5:0.2);}
{const one=solveShot(hq,nearestPt,50,150,0,0,90,260,0.1,0,90,windField([{x:30,cross:0,head:-6}],'blend')),cst=solveShot(hq,nearestPt,50,150,0,6,0,260,0.1,0,90);
 chk('one station = the single-wind path, bit-identical (6 m/s headwind, 150 m)', one.mrElev===cst.mrElev&&one.tp.tof===cst.tp.tof?1:0, 1);}
chk('a wind field never touches the zero pass (same zero angle)', hq.recalc(0,windField(HT,'blend').head,0,'t').za===hq.za?1:0, 1);

console.log('\n=== V1.33.0 BC FROM IMPACTS (§20A: py-ballisticcalc 3.1.1 dial for a known BC, recovered) ===');
// pbc: Queen geometry, G7 BC b, 260 m/s, zero 50 m, sight 44 mm, 20 °C / 1010 hPa / 65 %; dial = −height/R.
const TD=(d,need)=>trueBCdrop(bc=>{const p=rk4traj(260,bc,60,50,d+25,0.044,env.rho,env.aS,1,'g7',0.245,null);return solveShot(p,nearestPt,50,d,0,0,90,260,0.1,0,90).mrElev;},need).bc;
chk('pbc dial 7.42095 mrad @150 m → BC 0.110', TD(150,7.42095), 0.110, 0.0005);
chk('pbc dial 3.46512 mrad @100 m → BC 0.110', TD(100,3.46512), 0.110, 0.0010);
chk('pbc dial 11.33227 mrad @200 m → BC 0.140', TD(200,11.33227), 0.140, 0.0005);
{const own=(()=>{const p=rk4traj(260,0.123,60,50,175,0.044,env.rho,env.aS,1,'g7',0.245,null);return solveShot(p,nearestPt,50,150,0,0,90,260,0.1,0,90).mrElev;})();
 chk('round trip: own dial for BC 0.123 @150 m → 0.123', TD(150,own), 0.123, 1e-6);}
chk('impossible dial (more drop than BC 0.01) → no BC, reason', trueBCdrop(()=>1,5).bc===null&&/more elevation/.test(trueBCdrop(bc=>10-bc,20).flag)?1:0, 1);

console.log('\n=== V1.32.0 CANT (§20A: py-ballisticcalc 3.1.1 cant_angle, level dial applied) ===');
// Queen G7 0.128 @ 260 m/s, zero 50 m, sight 44 mm, 20 °C / 1010 hPa / 65 %; pbc relative_angle = the level correction.
const cq=rk4traj(260,0.128,60,50,250,0.044,env.rho,env.aS,1,'g7',0.245,null);
const CS=(d,c)=>solveShot(cq,nearestPt,50,d,0,0,90,260,0.1,0,90,null,c);
for(const [d,c,xw,yw] of [[100,5,65.97,-2.9],[100,-5,-65.97,-2.9],[100,10,131.44,-11.52],[200,5,275.55,-12.51],[50,5,16.14,-0.7]]){
  chk('cant '+c+'° at '+d+' m: '+xw+' mm sideways (pbc)', CS(d,c).cantX, xw, 0.1);
  chk('cant '+c+'° at '+d+' m: '+yw+' mm low (pbc'+(d>=200?'; second-order flight-time effect ±0.6':'')+')', CS(d,c).cantY, yw, d>=200?0.6:0.1);}
chk('no cant → no shift, dial unchanged', CS(100,0).cantX===0&&CS(100,0).mrElev===CS(100,5).mrElev?1:0, 1);
chk('1° sensitivity at 100 m ≈ 13.2 mm', CS(100,0).cantPerDeg, 756.93*Math.sin(Math.PI/180), 0.05);

console.log('\n=== V1.31.0 SHOT ANGLE + HEAD/TAILWIND IN THE INTEGRATION, STATION PRESSURE (§20A) ===');
// py-ballisticcalc 3.1.1, Queen G7 0.128 @ 260 m/s, zero 50 m (level), 20 °C / 1010 hPa / 65 %, sight height 0
// (pbc places the sight vertically above the bore on a slope; the app keeps it perpendicular to the bore —
// rigid scope — so the two differ by h·(1−cos look); with h = 0 they must agree). Values: drop from the LOS, mm.
const s0=rk4traj(260,0.128,60,50,250,0.044*0,env.rho,env.aS,1,'g7',0.245,null);
const dropAt=(d,ang,w,dir)=>-solveShot(s0,nearestPt,50,d,ang,w,dir,260,0.1,0,90).mrElev*d;
for(const [lk,d,want] of [[15,100,-362.84],[15,200,-2335.27],[30,100,-288.67],[30,200,-2035.55],[-20,100,-338.10],[-20,200,-2202.00]])
  chk('look '+lk+'°, slant '+d+' m: drop '+want+' mm (pbc)', dropAt(d,lk,0,90), want, d>150?1.0:0.2);
chk('5 m/s headwind (0°), 100 m: -387.99 mm (pbc)', dropAt(100,0,5,0), -387.99, 0.2);
chk('5 m/s headwind (0°), 200 m: -2434.64 mm (pbc)', dropAt(200,0,5,0), -2434.64, 1.0);
chk('look 30° + 5 m/s tailwind (180°), 200 m: -2149.73 mm (pbc)', dropAt(200,30,5,180), -2149.73, 1.0);
chk('pure crosswind (90°) and level: no re-solve, identical to before', solveShot(s0,nearestPt,50,150,0,5,90,260,0.1,0,90).sloped?1:0, 0);
chk('sight 44 mm, look 30°, 100 m: app − pbc (−238.64) = −h·(1−cos30°) = −5.9 mm (rigid scope vs pbc\'s vertical offset)', -solveShot(q7,nearestPt,50,100,30,0,90,260,0.1,0,90).mrElev*100-(-238.64), -44*(1-Math.cos(Math.PI/6)), 0.3);
chk('ISA: 1013.25 hPa QNH at 1000 m = 898.76 hPa station', stationPres(1013.25,1000), 898.76, 0.05);
chk('ISA: 1013 hPa QNH at 300 m = 977.5 hPa station', stationPres(1013,300), 1013*Math.pow(1-2.25577e-5*300,5.25588), 1e-9);
chk('weather profile: sea-level type converts, station type unchanged', wxPres({pres:1013,presType:'sea',alt:300})<978&&wxPres({pres:1013,alt:300})===1013?1:0, 1);

console.log('\n=== V2.5.0 McGYRO (McCoy 1986, §20A: original BASIC run unchanged in pcbasic; full grid in mcgyrotest.js) ===');
chk('McGyro N15 M0.5 (L2.03 Ln0.5 Rt/R1 flat lead 80 cal) = 86.47', mcgyro(2.03,0.5,1,1,0,11.34,80,0.5).n15, 86.47, 0.005);
chk('McGyro N15 M0.9 = 77.73', mcgyro(2.03,0.5,1,1,0,11.34,80,0.9).n15, 77.73, 0.005);
chk('McGyro Sg M0.8 = 1.55', mcgyro(2.03,0.5,1,1,0,11.34,80,0.8).sg, 1.55, 0.005);
chk('McGyro transonic M1.0 Sg = 2.07 (branch check)', mcgyro(2.03,0.5,1,1,0,11.34,80,1.0).sg, 2.07, 0.005);

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

console.log('\n=== V2.6.0 BENCH-01/02: MASS FROM GEOMETRY (closed forms + scipy quad, independent Python) ===');
const bm=g=>benchMass(designClean({diam:6.35,bearL:0,noseL:0,rtr:1,meplat:0,btL:0,alloy:'pb',...g}));
chk('cylinder Ø6.35 × 12.9, lead = 71.494461 gr (π r² L)', bm({bearL:12.9}).gr, 71.494461, 1e-5);
chk('hemisphere Ø6.35 = 67.033177 mm³ (⅔ π r³)', bm({noseL:3.175}).V, 67.033177, 1e-5);
chk('tangent ogive 5.5, meplat 1.5 = 110.317592 mm³ (scipy)', bm({noseL:5.5,meplat:1.5}).V, 110.317592, 1e-5);
chk('secant ogive Rt/R 0.5 = 91.047071 mm³ (scipy)', bm({noseL:5.5,meplat:1.5,rtr:0.5}).V, 91.047071, 1e-5);
chk('cone (Rt/R 0) 5.5, meplat 1.5 = πh/3·(R²+Rr+r²) = 72.535357 mm³', bm({noseL:5.5,meplat:1.5,rtr:0}).V, Math.PI*5.5/3*(3.175**2+3.175*0.75+0.75**2), 1e-6);
chk('boat tail 2 mm, Ø 5.0 → 6.35 = 50.827042 mm³ (frustum)', bm({btL:2,baseD:5}).V, 50.827042, 1e-5);
const full={btL:2,baseD:5,bearL:6,noseL:5.5,meplat:1.5,hpD:1,hpDep:2,hpShape:'cyl',bcD:4.5,bcDep:0.3,bcShape:'dish'};
chk('full test shape = 60.759160 gr (scipy)', bm(full).gr, 60.759160, 1e-5);
chk('… CG = 6.015521 mm from the base (scipy)', bm(full).cg, 6.015521, 1e-5);
chk('… SD = 0.138878 (§9H)', bm(full).sd, 0.138878, 1e-6);
chk('cone cavity = ⅓ of the cylinder cavity (Ø 2 × 3 mm in a 12.9 mm cylinder)', (bm({bearL:12.9}).V-bm({bearL:12.9,bcD:2,bcDep:3,bcShape:'cone'}).V)/(bm({bearL:12.9}).V-bm({bearL:12.9,bcD:2,bcDep:3,bcShape:'cyl'}).V), 1/3, 1e-9);
chk('V2.6.1 ball-end hollow point Ø2 × 3 removes πa²(h−a) + ⅔πa³', bm({bearL:12.9}).V-bm({bearL:12.9,hpD:2,hpDep:3,hpShape:'ball'}).V, Math.PI*2+2/3*Math.PI, 1e-6);
chk('V2.6.1 dish at full depth (Ø2 × 1) = hemisphere ⅔πa³', bm({bearL:12.9}).V-bm({bearL:12.9,hpD:2,hpDep:1,hpShape:'dish'}).V, 2/3*Math.PI, 1e-6);
chk('V2.6.1 dish deeper than its radius → refused (no undercut ball)', bm({bearL:12.9,hpD:2,hpDep:1.5,hpShape:'dish'}).err?1:0, 1);
chk('V2.6.1 ball end shallower than its radius → refused', bm({bearL:12.9,hpD:2,hpDep:0.5,hpShape:'ball'}).err?1:0, 1);
chk('Pb–Sb 4.48 % ≈ measured 10.983 (Papović 2024)', alloyDensity({alloy:'sb',sb:4.48}), 10.983, 0.03);
chk('Pb–Sb 10 % ≈ DIN 1741 GB-PbSb10 10.6', alloyDensity({alloy:'sb',sb:10}), 10.6, 0.02);

console.log('\n=== V2.8.0 CALC-06: AERODYNAMIC JUMP (Litz) ===');
chk('Litz worked example Sg 1.49, L 5.32 = 0.034132 MOA/mph', litzJumpPerMph(1.49,5.32), 0.034132, 1e-9);
chk('… Sg 1.79 = 0.037132 MOA/mph', litzJumpPerMph(1.79,5.32), 0.037132, 1e-9);
chk('ballistics-engine known answer: Sg 1.75, L 4, 10 mph from the right, RH = +0.399 MOA', aeroJumpMoa(1.75,4,10*0.44704,'right'), 0.399, 1e-9);
chk('wind from the left, RH twist → −0.399 (low)', aeroJumpMoa(1.75,4,-10*0.44704,'right'), -0.399, 1e-9);
chk('left twist reverses', aeroJumpMoa(1.75,4,10*0.44704,'left'), -0.399, 1e-9);
chk('Sg below 1 → not computed', aeroJumpMoa(0.95,2,3,'right')===null?1:0, 1);
chk('smooth bore → not computed', aeroJumpMoa(1.5,2,3,'smooth')===null?1:0, 1);

console.log('\n=== V1.16.0 NEW BEHAVIOUR ===');
chk('trajReason defined',            typeof trajReason, 'string');
chk('runTraj accepts silent arg',    runTraj.length, 1);
chk('autoTraj is a function',        typeof autoTraj, 'function');
chk('refreshActivePage is a fn',     typeof refreshActivePage, 'function');
chk('trajFail is a function',        typeof trajFail, 'function');
console.log('\nPASS '+pass+'   FAIL '+fail);
process.exit(fail?1:0);
