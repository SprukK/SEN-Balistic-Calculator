// Wind & heading test (V1.21.0, CORE-13 + CORE-14): Calypso orientation modes, wind kept as a
// compass vector, target-bearing changes, wrap-around, shared Home/Solver bearing, persistence,
// phone-compass capture (Android absolute orientation, iPhone permission path, no sensor).
// Usage: node windtest.js <app.html>   (needs jsdom; see README.md)
const {JSDOM}=require('jsdom'),fs=require('fs');
const FILE=process.argv[2];
const SK='sen_platform_v1';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let pass=0,fail=0;
const chk=(n,ok,extra)=>{console.log((ok?'  PASS  ':'  FAIL  ')+n+(extra?'   '+extra:''));ok?pass++:fail++;};
const all=[];

async function open({ls,setup}={}){
  const dom=new JSDOM(fs.readFileSync(FILE,'utf8'),{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',
    beforeParse(w){
      if(ls)w.localStorage.setItem(SK,ls);
      w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:(t,k)=>k==='measureText'?()=>({width:10}):()=>{}});
      if(setup)setup(w);
    }});
  const w=dom.window;w.errs=[];w.addEventListener('error',e=>w.errs.push(e.message));
  await wait(700);all.push(w);return w;
}
const J=(w,e)=>JSON.parse(w.eval('JSON.stringify('+e+')'));
const wind=w=>J(w,'S.wind');
const calypso=(w,dir,spd=5)=>w.eval(`bleLastDir=${dir};calypsoToSession(${spd})`);
const typeIn=(w,id,v)=>{const e=w.document.getElementById(id);e.value=String(v);e.dispatchEvent(new w.Event('input'));};
function orient(w,type,props){const e=new w.Event(type);for(const k in props)Object.defineProperty(e,k,{value:props[k]});w.dispatchEvent(e);}

(async()=>{
console.log('=== WIND & HEADING TEST: '+FILE+' ===');
const w=await open();

// 1. Default mode is unchanged: the Calypso reading IS the angle to the line of fire.
chk('default Calypso mode is "the target"',w.eval('APP.calMount==null'));
calypso(w,90);
chk('target mode, no bearing: angle = Calypso reading (as before)',wind(w).dir===90&&wind(w).from===null);
w.eval("setTargetBearing(200,'manual')");calypso(w,90);
chk('target mode with bearing: angle unchanged, compass FROM stored',wind(w).dir===90&&wind(w).from===290,JSON.stringify(wind(w)));

// 2. Fixed bearing: FROM = reading + mark bearing; angle = FROM − target bearing.
w.eval("setCalMount(0)");w.eval("setTargetBearing(90,'manual')");calypso(w,180);
chk('mark north, wind from south, facing east → 90° (from the RIGHT)',wind(w).from===180&&wind(w).dir===90);
w.eval("setTargetBearing(180,'manual')");
chk('new target due south → headwind 0°, same wind',wind(w).dir===0&&wind(w).from===180);
w.eval("setTargetBearing(0,'manual')");
chk('new target due north → tailwind 180°',wind(w).dir===180);
w.eval("setTargetBearing(270,'manual')");
chk('new target due west → 270° (from the LEFT)',wind(w).dir===270);

// 3. Wrap-around through north.
w.eval("setCalMount(350)");w.eval("setTargetBearing(340,'manual')");calypso(w,20);
chk('mark 350° + reading 20° → FROM 10°; target 340° → 30°',wind(w).from===10&&wind(w).dir===30);

// 4. Fixed bearing without a target bearing: no wrong wind is pushed.
w.eval("setTargetBearing(null,'manual')");const before=wind(w);calypso(w,123);
chk('fixed bearing + no target bearing → wind not changed, user told why',JSON.stringify(wind(w))===JSON.stringify(before)&&/Set the target bearing/.test(w.document.getElementById('cal-mount-note').textContent));
w.eval("setCalMount(null)");

// 5. Home compass entry still gives the V1.15.0 anchor and now stores FROM.
w.eval("homeLive=false;windMode='manual'");
typeIn(w,'hm-tbrg',180);typeIn(w,'hm-wspd',4);typeIn(w,'hm-wbrg',270);
await wait(400);
chk('Home: facing 180°, wind from 270° → 90° rel, FROM 270° (V1.15.0 anchor)',wind(w).dir===90&&wind(w).from===270&&wind(w).speed===4);

// 6. One bearing shared by Home and Solver.
chk('Home bearing appears in Solver azimuth',w.document.getElementById('sv-az').value==='180');
w.eval("gotoPage('solver')");typeIn(w,'sv-az',45);
chk('Solver azimuth updates the Home bearing',w.document.getElementById('hm-tbrg').value==='45'&&w.eval('S.tgtBrg')===45);
chk('…and re-derives the wind angle (270−45 = 225°)',wind(w).dir===225);
chk('target bearing is never locked by live wind',(w.eval("homeLive=true;homeManWindLock();homeLive=false;document.getElementById('hm-tbrg').disabled"))===false);

// 7. Persistence across restarts.
w.eval("setCalMount(15)");w.eval('saveDB()');
const w2=await open({ls:w.localStorage.getItem(SK)});
chk('target bearing and Calypso mark bearing survive a restart',w2.eval('S.tgtBrg')===45&&w2.eval('APP.calMount')===15&&w2.document.getElementById('hm-tbrg').value==='45');

// 8. Phone compass — Android absolute orientation (heading = 360 − alpha), averaged.
const a=await open({setup:x=>{x.ondeviceorientationabsolute=null;}});
const pa=a.eval('captureTargetBearing()');
await wait(100);[328,330,332].forEach(alpha=>orient(a,'deviceorientationabsolute',{absolute:true,alpha}));
await pa;
chk('Android: alpha≈330 → bearing 30°, marked as phone compass',a.eval('S.tgtBrg')===30&&/phone compass/.test(a.document.getElementById('tb-src').textContent));
const pn=a.eval('readCompass(300)');await wait(50);[359,1].forEach(h=>orient(a,'deviceorientationabsolute',{absolute:true,alpha:360-h}));
chk('averaging across north gives 0°, not 180°',(await pn)===0);

// 9. iPhone: permission requested, webkitCompassHeading used; refusal leaves the bearing alone.
const ios=await open({setup:x=>{x.DeviceOrientationEvent=class{};x.DeviceOrientationEvent.requestPermission=async()=>x.__perm;x.__perm='granted';}});
const pi=ios.eval('captureTargetBearing()');await wait(100);orient(ios,'deviceorientation',{webkitCompassHeading:45});await pi;
chk('iPhone: permission granted → heading 45°',ios.eval('S.tgtBrg')===45);
ios.eval("__perm='denied'");await ios.eval('captureTargetBearing()');
chk('iPhone: permission refused → bearing kept, reason shown',ios.eval('S.tgtBrg')===45&&/refused/.test(ios.document.getElementById('tb-src').textContent));

// 10. No compass at all.
const nc=await open();await nc.eval('captureTargetBearing()');
chk('no compass → clear message, bearing unchanged',nc.eval('S.tgtBrg')===null&&/No compass reading/.test(nc.document.getElementById('tb-src').textContent));

// 11. Calypso mark captured from the phone compass.
const cm=await open({setup:x=>{x.ondeviceorientationabsolute=null;}});
const pc=cm.eval('captureCalMount()');await wait(100);orient(cm,'deviceorientationabsolute',{absolute:true,alpha:270});await pc;
chk('Calypso mark bearing captured (alpha 270 → 90°), fixed mode on',cm.eval('APP.calMount')===90&&cm.document.getElementById('cal-m-fix').classList.contains('on'));

const errs=all.flatMap(x=>x.errs);
chk('ZERO uncaught errors',errs.length===0,errs.slice(0,3).join(' / '));
console.log('\nPASS '+pass+'   FAIL '+fail);
process.exit(fail?1:0);
})().catch(e=>{console.error('TEST CRASH:',e);process.exit(1);});
