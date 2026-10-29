// "Same as zero" test (V2.1.0): a virtual current-conditions profile built from the rifle's zero conditions.
// Offered first in the Home weather sheet, the Trajectory select and the dope-card select; picking it sets
// temperature, station pressure, humidity and the session wind from the rifle's zero conditions; dial at the
// zero range is 0 and the windage there is 0; editing the rifle's zero flows in; switching rifle follows;
// dope cards use their own rifle's zero; survives a restart; never stored as a weather profile.
// Usage: node samezerotest.js <app.html>   (needs jsdom; see README.md)
const {JSDOM}=require('jsdom'),fs=require('fs');
const FILE=process.argv[2];
const SK='sen_platform_v1';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let pass=0,fail=0;
const chk=(n,ok,extra)=>{console.log((ok?'  PASS  ':'  FAIL  ')+n+(extra?'   '+extra:''));ok?pass++:fail++;};
const all=[];
async function open(ls){
  const dom=new JSDOM(fs.readFileSync(FILE,'utf8'),{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',
    beforeParse(w){w.alert=()=>{};w.confirm=()=>true;if(ls)w.localStorage.setItem(SK,ls);
      w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:(t,k)=>k==='measureText'?()=>({width:10}):()=>{}});}});
  const w=dom.window;w.errs=[];w.addEventListener('error',e=>w.errs.push(e.message));await wait(700);all.push(w);return w;
}
const J=(w,e)=>JSON.parse(w.eval('JSON.stringify('+e+')'));
const txt=(w,id)=>w.document.getElementById(id).textContent;

(async()=>{
console.log('=== SAME AS ZERO TEST: '+FILE+' ===');
const w=await open();
w.eval(`const r=DB.rifles.find(x=>/\\.25/.test(x.name));Object.assign(r,{zTemp:12,zPres:1015,zPresType:'sea',zAlt:300,zRH:70,zwSpd:2,zwDir:90});
  Bus.setRifle(r.id);Bus.setProj(DB.projectiles.find(p=>/^Altaros ATP Queen/.test(p.name)).id);Bus.setWx('cur',DB.weathers[0].id);S.mv=280;Bus.notify();`);await wait(30);
w.eval(`pickSheet('wx')`);
const items=[...w.document.querySelectorAll('.sitem')].map(b=>b.textContent);
chk('Home weather sheet offers "Same as zero" first, with the zero values',/^Same as zero \(rifle's zero conditions\)/.test(items[0])&&/12\.0 °C/.test(items[0])&&/station/.test(items[0])&&/wind 2\.0 m\/s @ 90°/.test(items[0]),items[0]);
w.document.querySelectorAll('.sitem')[0].click();await wait(30);
const st=(q,h)=>q*Math.pow(1-2.25577e-5*h,5.25588);
chk('picked: session air = zero air (12 °C, 1015 hPa QNH at 300 m → station, 70 %)',J(w,'S.curWxId')==='@zero'&&J(w,'S.ct')===12&&Math.abs(J(w,'S.cp')-st(1015,300))<1e-9&&J(w,'S.crh')===70);
chk('picked: session wind = zero wind (2 m/s at 90°)',J(w,'S.wind.speed')===2&&J(w,'S.wind.dir')===90&&J(w,"S.wind.source")==='zero');
chk('weather chip shows "Same as zero"',/Same as zero/.test(w.document.body.textContent));
const atZero=J(w,`(()=>{const tr=homeTraj(),z=zeroConds(),s=solveShot(tr.pts,nearestPt,z.range,z.range,0,S.wind.speed,S.wind.dir,S.mv,0.1,z.wSpd,z.wDir);return[s.mrElev,s.mrWind]})()`);
chk('at the zero range: dial 0 and windage 0 (same air, same wind)',Math.abs(atZero[0])<1e-9&&Math.abs(atZero[1])<1e-9,JSON.stringify(atZero));
chk('Trajectory select lists it and has it selected',w.document.getElementById('tr-cwx').value==='@zero'&&[...w.document.getElementById('tr-cwx').options].some(o=>/Same as zero/.test(o.textContent)));
// Edit the rifle's zero → flows in.
w.eval(`openRifleForm(S.rifleId)`);w.document.getElementById('rf-ztemp').value='5';w.eval(`saveRifle(S.rifleId)`);await wait(20);
chk('editing the rifle\'s zero temperature updates the session (5 °C)',J(w,'S.ct')===5);
// Dope card with its own rifle.
w.eval(`newDope()`);
chk('a new dope card keeps "Same as zero" and its select lists it',J(w,'DB.dopeCards[0].cwxId')==='@zero'&&[...w.document.getElementById('dc-cwx').options].some(o=>o.value==='@zero'));
w.eval(`const r2=DB.rifles.find(x=>/\\.30/.test(x.name));Object.assign(r2,{zTemp:-3,zPres:990,zPresType:'station',zAlt:0,zRH:40,zwSpd:0,zwDir:90});DB.dopeCards[0].rifleId=r2.id;`);
chk('dope card for another rifle uses that rifle\'s zero conditions',J(w,`getWx('@zero',DB.rifles.find(x=>x.id===DB.dopeCards[0].rifleId)).temp`)===-3&&J(w,`getWx('@zero',DB.rifles.find(x=>x.id===DB.dopeCards[0].rifleId)).pres`)===990);
chk('never stored as a weather profile',!J(w,"DB.weathers.some(x=>x.id==='@zero'||/Same as zero/.test(x.name))"));
w.eval('saveDB()');await wait(30);
const r=await open(w.localStorage.getItem(SK));
chk('restart: still "Same as zero", values from the rifle',J(r,'S.curWxId')==='@zero'&&J(r,'getWx(S.curWxId).temp')===5);
r.eval(`Bus.setWx('cur',DB.weathers[0].id)`);
chk('switching back to a normal profile takes that profile\'s air',J(r,'S.ct')===J(r,'DB.weathers[0].temp')&&J(r,'S.curWxId')===J(r,'DB.weathers[0].id'));
const errs=all.flatMap(x=>x.errs);chk('ZERO uncaught errors',errs.length===0,errs.slice(0,3).join(' / '));
console.log('\nPASS '+pass+'   FAIL '+fail);process.exit(fail?1:0);
})().catch(e=>{console.error('TEST CRASH:',e);process.exit(1);});
