// Aerodynamic jump test (V2.8.0, CALC-06): Solver › Advanced corrections › "Aerodynamic jump (Litz EST ⚠)".
// Off = solution unchanged; on: Litz Y = 0.01·Sg − 0.0024·L + 0.032 MOA/mph recomputed independently here,
// wind from the right → impact HIGH (dial down), from the left → LOW, same size; left twist reverses; the
// jump already in the zero (zero-session crosswind) is subtracted; station wind at the firing line is used
// when stations are on; pellets / smooth bore / Sg < 1 not computed; imperial units; survives a restart.
// Usage: node ajtest.js <app.html>   (needs jsdom; see README.md)
const {JSDOM}=require('jsdom'),fs=require('fs');
const FILE=process.argv[2];
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let pass=0,fail=0;
const chk=(n,ok,extra)=>{console.log((ok?'  PASS  ':'  FAIL  ')+n+(extra?'   '+extra:''));ok?pass++:fail++;};
const dom=new JSDOM(fs.readFileSync(FILE,'utf8'),{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',
  beforeParse(w){Object.defineProperty(w,'innerWidth',{configurable:true,value:412});Object.defineProperty(w,'innerHeight',{configurable:true,value:915});
    w.alert=()=>{};w.confirm=()=>true;w.scrollTo=()=>{};
    w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:(t,k)=>k==='measureText'?()=>({width:10}):()=>{}});}});
const w=dom.window;w.errs=[];w.addEventListener('error',e=>w.errs.push(e.message));
const J=e=>JSON.parse(w.eval('JSON.stringify('+e+')'));
const $=id=>w.document.getElementById(id);
const flags=()=>$('sv-flags').textContent;
const ajFlag=()=>(flags().match(/Aerodynamic jump[^]*?(?:included above\.(?: Sg is far below the fitted range — treat as rough\.)?|\.)(?=Aerodynamic|Spin|Coriolis|Cant|Angle|MOA scope|$)/)||[''])[0];
const elev=()=>+$('sv-outs').querySelector('.sc.accent .su').textContent.match(/(-?[\d.]+) mrad/)[1];
const setIn=(id,v)=>{$(id).value=String(v);};
// Independent Litz jump (MOA, + = up) for the app's own Sg and L.
const litz=(sg,L,crossFromRight_ms,left)=>(left?-1:1)*(0.01*sg-0.0024*L+0.032)*crossFromRight_ms/0.44704;
(async()=>{
console.log('=== AERODYNAMIC JUMP TEST: '+FILE+' ===');
await wait(700);
w.eval(`const r=DB.rifles.find(x=>/\\.25/.test(x.name));Object.assign(r,{zwSpd:0,zwDir:90});Bus.setRifle(r.id);Bus.setProj(DB.projectiles.find(p=>/^Altaros ATP Queen/.test(p.name)).id);Bus.setWx('cur',DB.weathers[0].id);Bus.setWx('zero',DB.weathers[0].id);S.mv=255;Bus.notify();gotoPage('solver');`);
await wait(50);
const go=(d,ws,wd)=>{setIn('sv-tdist',d);setIn('sv-wind',ws);setIn('sv-wdir',wd);setIn('sv-angle',0);setIn('sv-cant',0);w.eval('runTraj(true);solve()');};
// ── off ───────────────────────────────────────────────────────────────────────────────────────────
go(100,3,90);
chk('switch present, Off by default',!!$('sv-aj-off')&&$('sv-aj-off').classList.contains('on')&&!$('sv-aj-on').classList.contains('on')&&J('APP.solverAJ')===false);
const e0=elev();
chk('off: no jump flag',!/Aerodynamic jump/.test(flags()));
// ── on, wind from the right ───────────────────────────────────────────────────────────────────────
$('sv-aj-on').click();await wait(20);
const sg=J('sessionSg().sg'),L=J('getProj().oal/getProj().diam');
const moaR=litz(sg,L,3,false),mmR=moaR*Math.PI/10800*100*1000;
const fR=ajFlag();
chk('on, 3 m/s from the right: impact HIGH by the independent Litz value (MOA and mm)',/impact HIGH/.test(fR)&&new RegExp('\\('+Math.abs(moaR).toFixed(3)+' MOA\\)').test(fR)&&new RegExp('HIGH '+mmR.toFixed(1)+' mm').test(fR),fR);
chk('…dial down by the same angle and the elevation answer includes it',new RegExp('dial '+(-mmR/100).toFixed(3)+' mrad').test(fR)&&Math.abs((e0-elev())-mmR/100)<0.006,(e0-elev()).toFixed(4)+' vs '+(mmR/100).toFixed(4));
chk('flag states Sg, L, MOA per mph and the estimate warning',new RegExp('Sg '+sg.toFixed(2)).test(fR)&&new RegExp('L '+L.toFixed(2)+' cal').test(fR)&&/MOA per mph/.test(fR)&&/fitted on rifle bullets near Sg 1\.75/.test(fR)&&/treat as rough/.test(fR));
// ── from the left ─────────────────────────────────────────────────────────────────────────────────
go(100,3,270);const fL=ajFlag();
chk('3 m/s from the left: impact LOW, same size',/impact LOW/.test(fL)&&new RegExp('\\('+Math.abs(moaR).toFixed(3)+' MOA\\)').test(fL)&&/muzzle crosswind 3\.0 m\/s from the left/.test(fL),fL);
go(100,3,0);chk('pure headwind: no crosswind → "no jump" line, elevation = off',/Aerodynamic jump: no crosswind at the muzzle \(and none in the zero\) → no jump\./.test(flags()));
// ── 200 m: grows with range ───────────────────────────────────────────────────────────────────────
go(200,3,90);chk('a launch angle: twice the shift at 200 m',new RegExp('HIGH '+(mmR*2).toFixed(1)+' mm').test(ajFlag()),ajFlag());
// ── zero crosswind subtracted ─────────────────────────────────────────────────────────────────────
w.eval(`Object.assign(getRifle(),{zwSpd:3,zwDir:90});`);go(100,3,90);
const z=J('zeroConds()'),sgZ=J(`calcSg(getProj().mass,getProj().diam,getProj().oal,getRifle().twist,S.mv,projC(getProj()).c,${z.temp},${z.pres})`);
const net=litz(sg,L,3,false)-litz(sgZ,L,3,false);
chk('zeroed in the same 3 m/s right wind: only the Sg difference between zero air and current air remains',/minus the zero's 3\.0 m\/s from the right/.test(ajFlag())&&new RegExp('\\('+Math.abs(net).toFixed(3)+' MOA\\)').test(ajFlag()),ajFlag());
w.eval(`Object.assign(getRifle(),{zwSpd:0,zwDir:90});`);
// ── left twist ────────────────────────────────────────────────────────────────────────────────────
w.eval(`getRifle().twistDir='left';Bus.notify();`);go(100,3,90);
chk('left-twist barrel: wind from the right → LOW',/impact LOW/.test(ajFlag()));
w.eval(`getRifle().twistDir='right';Bus.notify();`);
// ── stations: firing-line wind ────────────────────────────────────────────────────────────────────
w.eval(`window.__sf=stnField;stnField=()=>windField([{x:0,cross:2,head:0},{x:100,cross:-4,head:0}],'blend');APP.solverStations=true;`);go(100,0,90);
const moaS=litz(sg,L,2,false);
chk('live stations: the crosswind at the firing line (2 m/s from the right) drives the jump, not the far station',new RegExp('\\('+moaS.toFixed(3)+' MOA\\)').test(ajFlag())&&/impact HIGH/.test(ajFlag()),ajFlag());
w.eval(`stnField=window.__sf;APP.solverStations=false;`);
// ── not computed ──────────────────────────────────────────────────────────────────────────────────
w.eval(`getRifle().twistDir='smooth';Bus.notify();`);go(100,3,90);
chk('smooth bore → not computed',/Aerodynamic jump n\/a — smooth bore/.test(flags()));
w.eval(`getRifle().twistDir='right';Bus.setProj(DB.projectiles.find(p=>p.type==='pellet').id);Bus.notify();`);go(100,3,90);
chk('pellet → not computed',/Aerodynamic jump n\/a — pellet/.test(flags()));
w.eval(`Bus.setProj(DB.projectiles.find(p=>/^Altaros ATP Queen/.test(p.name)).id);Bus.notify();`);
// ── imperial ──────────────────────────────────────────────────────────────────────────────────────
w.eval(`setUnit('wind','mph');setUnit('drop','in');gotoPage('solver')`);go(100,3,90);
chk('imperial: wind in mph, shift in inches',/muzzle crosswind 6\.7 mph from the right/.test(ajFlag())&&/HIGH 0\.\d+ in/.test(ajFlag()),ajFlag());
w.eval(`setUnit('wind','ms');setUnit('drop','mm');`);
// ── restart ───────────────────────────────────────────────────────────────────────────────────────
const snap=w.eval('snapshotJSON()');w.eval(`APP.solverAJ=false;applySnapshot(JSON.parse(${JSON.stringify(snap)}));gotoPage('solver');solve();`);
chk('restart: switch stays On',J('APP.solverAJ')===true&&$('sv-aj-on').classList.contains('on'));
$('sv-aj-off').click();await wait(20);go(100,3,90);
chk('Off again: elevation back to the plain solution',Math.abs(elev()-e0)<1e-9&&!/Aerodynamic jump/.test(flags()));
chk('Formulas: aerodynamic jump listed as an estimate, no longer under "not modelled"',J(`FORMULAS.find(f=>f.name==='Aerodynamic jump (Litz)').status`)==='est'&&!J('FX_NOT_MODELLED').some(x=>/Aerodynamic jump/.test(x)));
chk('ZERO uncaught errors',w.errs.length===0,w.errs.join(' | '));
console.log(`\nPASS ${pass}   FAIL ${fail}`);process.exit(fail?1:0);
})().catch(e=>{console.error('TEST CRASH:',e);process.exit(1);});
