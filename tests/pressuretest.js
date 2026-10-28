// Pressure-type test (V1.31.1): the owner's Garmin shows sea-level pressure (QNH) and the seeded defaults
// came from it. Upgrade from the previous release: seeded weather profiles → sea level at their altitude
// (note updated), user profiles → station with a note to check, rifle zero → sea level at 300 m; zero and
// current densities follow; rifle form type + altitude round-trip; fresh install seeds sea level; worst
// case at 0 m unchanged; runs once.
// Usage: node pressuretest.js <new.html> <previous-release.html>   (needs jsdom; see README.md)
const {JSDOM}=require('jsdom'),fs=require('fs');
const [NEW,OLD]=process.argv.slice(2);
const SK='sen_platform_v1';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let pass=0,fail=0;
const chk=(n,ok,extra)=>{console.log((ok?'  PASS  ':'  FAIL  ')+n+(extra?'   '+extra:''));ok?pass++:fail++;};
const all=[];
async function open(file,ls){
  const dom=new JSDOM(fs.readFileSync(file,'utf8'),{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',
    beforeParse(w){w.alerts=[];w.alert=m=>w.alerts.push(String(m));w.confirm=()=>true;if(ls)w.localStorage.setItem(SK,ls);
      w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:(t,k)=>k==='measureText'?()=>({width:10}):()=>{}});}});
  const w=dom.window;w.errs=[];w.addEventListener('error',e=>w.errs.push(e.message));await wait(700);all.push(w);return w;
}
const J=(w,e)=>JSON.parse(w.eval('JSON.stringify('+e+')'));
const st=(q,h)=>q*Math.pow(1-2.25577e-5*h,5.25588);

(async()=>{
console.log('=== PRESSURE TYPE TEST: '+NEW+' ===');
const o=await open(OLD);
o.eval(`DB.weathers.push({id:'my',name:'My range',temp:12,pres:990,rh:70,alt:450,notes:''});saveDB();`);await wait(50);
const w=await open(NEW,o.localStorage.getItem(SK));
const wx=n=>J(w,`DB.weathers.find(x=>x.name==='${n}')`);
const ed=wx('Everyday Default (20°C)');
chk('upgrade: seeded profiles → sea level (QNH); Everyday note now states ρ 1.1516',['Everyday Default (20°C)','Summer Hot (30°C)','Winter Local (0°C)','Global Worst-Case (sea level)'].every(n=>wx(n).presType==='sea')&&/ρ 1\.1516/.test(ed.notes)&&!/1\.1934/.test(ed.notes),ed.notes);
chk('upgrade: a user profile → station, with a note to check',wx('My range').presType==='station'&&/choose Sea level \(QNH\)/.test(wx('My range').notes));
chk('upgrade: rifle zero → sea level at 300 m',J(w,'DB.rifles.every(r=>r.zPresType===\'sea\'&&r.zAlt===300)'));
chk('Everyday Default: station 974.8 hPa, ρ 1.1516 kg/m³',Math.abs(J(w,`wxPres(DB.weathers.find(x=>x.name==='Everyday Default (20°C)'))`)-974.8)<0.05&&Math.abs(J(w,`airDensity(20,wxPres(DB.weathers.find(x=>x.name==='Everyday Default (20°C)')),65)`)-1.1516)<5e-5);
chk('Global worst case (0 m) unchanged: 1013 hPa',J(w,`wxPres(DB.weathers.find(x=>/Worst/.test(x.name)))`)===1013);
w.eval(`Bus.setRifle(DB.rifles[0].id);Bus.setWx('cur',DB.weathers.find(x=>/^Everyday/.test(x.name)).id);Bus.notify();`);await wait(20);
chk('zero conditions use the rifle\'s sea-level pressure converted at 300 m',Math.abs(J(w,'zeroConds().pres')-st(J(w,'DB.rifles[0].zPres'),300))<1e-9,String(J(w,'zeroConds().pres')));
chk('current conditions: S.cp = 974.8',Math.abs(J(w,'S.cp')-st(1010,298))<1e-9,String(J(w,'S.cp')));
// Rifle form round trip.
w.eval(`openRifleForm(DB.rifles[0].id)`);
chk('rifle form shows type + altitude',w.document.getElementById('rf-zptype').value==='sea'&&+w.document.getElementById('rf-zalt').value===300);
w.document.getElementById('rf-zptype').value='station';w.document.getElementById('rf-zpres').value='975';w.eval(`saveRifle('${J(w,'DB.rifles[0].id')}')`);
chk('rifle saved as station 975 → zero pressure 975 as-is',J(w,'DB.rifles[0].zPresType')==='station'&&J(w,'zeroConds(DB.rifles[0]).pres')===975);
// Runs once.
w.eval('saveDB()');await wait(30);
const r=await open(NEW,w.localStorage.getItem(SK));
chk('restart: nothing re-migrated (user choice kept, no second note)',J(r,'DB.rifles[0].zPresType')==='station'&&(J(r,`DB.weathers.find(x=>x.name==='My range').notes`).match(/V1\.31\.1/g)||[]).length===1);
// Fresh install.
const f=await open(NEW);
chk('fresh install: seeds are sea level, new weather defaults to sea level',J(f,"DB.weathers.every(x=>x.presType==='sea')")&&(f.eval('openWxForm()'),f.document.getElementById('wf-ptype').value==='sea'));
const errs=all.slice(1).flatMap(x=>x.errs);chk('ZERO uncaught errors',errs.length===0,errs.slice(0,3).join(' / '));
console.log('\nPASS '+pass+'   FAIL '+fail);process.exit(fail?1:0);
})().catch(e=>{console.error('TEST CRASH:',e);process.exit(1);});
