// Flight test (V1.31.0): shot angle and head/tailwind solved inside the trajectory, sea-level (QNH)
// pressure converted to station pressure. Real page in jsdom: Home with an angle and with a headwind
// equals solveShot on the re-solved trajectory (and differs from the old Rifleman's rule), pure crosswind
// unchanged, dope cards per-target angle, weather form QNH type (needs altitude, converts, survives
// restart and import, shown as QNH), Solver page note.
// Usage: node flighttest.js <app.html>   (needs jsdom; see README.md)
const {JSDOM}=require('jsdom'),fs=require('fs');
const FILE=process.argv[2];
const SK='sen_platform_v1';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let pass=0,fail=0;
const chk=(n,ok,extra)=>{console.log((ok?'  PASS  ':'  FAIL  ')+n+(extra?'   '+extra:''));ok?pass++:fail++;};
const all=[];
async function open(ls){
  const dom=new JSDOM(fs.readFileSync(FILE,'utf8'),{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',
    beforeParse(w){w.alerts=[];w.alert=m=>w.alerts.push(String(m));w.confirm=()=>true;if(ls)w.localStorage.setItem(SK,ls);
      w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:(t,k)=>k==='measureText'?()=>({width:10}):()=>{}});}});
  const w=dom.window;w.errs=[];w.addEventListener('error',e=>w.errs.push(e.message));await wait(700);all.push(w);return w;
}
const J=(w,e)=>JSON.parse(w.eval('JSON.stringify('+e+')'));
const txt=(w,id)=>w.document.getElementById(id).textContent;
const typeIn=(w,id,v)=>{const e=w.document.getElementById(id);e.value=String(v);e.dispatchEvent(new w.Event('input'));};

(async()=>{
console.log('=== FLIGHT TEST: '+FILE+' ===');
const w=await open();
w.eval(`Bus.setRifle(DB.rifles[0].id);Bus.setProj(DB.projectiles.find(p=>/^Altaros ATP Queen/.test(p.name)).id);Bus.setWx('cur',DB.weathers[0].id);Bus.setWx('zero',DB.weathers[0].id);S.mv=280;Bus.set('dist_m',100);Bus.setWind(0,90,'manual');Bus.notify();`);await wait(30);
const sol=(a,ws,dir)=>J(w,`(()=>{const tr=homeTraj(),z=zeroConds(),s=solveShot(tr.pts,nearestPt,z.range,100,${a},${ws},${dir},S.mv,0.1,z.wSpd,z.wDir);return{e:(s.clElev>=0?'↑':'↓')+Math.abs(s.clElev).toFixed(0),mr:s.mrElev,sl:s.sloped,old:(-nearestPt(tr.pts,100).drop*Math.cos(${a}*Math.PI/180))/100};})()`);
const level=txt(w,'home-elev');
// 1. Angle on Home.
typeIn(w,'home-angle',30);await wait(30);
const s30=sol(30,0,90);
chk('Home 30° uphill: dial = re-solved trajectory, not the old Rifleman\'s rule',txt(w,'home-elev')===s30.e&&s30.sl&&Math.abs(s30.mr-s30.old)>0.3,txt(w,'home-elev')+' new '+s30.mr.toFixed(3)+' vs old '+s30.old.toFixed(3)+' mrad');
typeIn(w,'home-angle',0);await wait(30);
chk('back to level: same dial as before',txt(w,'home-elev')===level);
// 2. Headwind / crosswind.
w.eval(`Bus.setWind(5,0,'manual');Bus.notify()`);await wait(30);
const h=sol(0,5,0);
chk('Home 5 m/s headwind: more elevation than calm, = re-solved trajectory',txt(w,'home-elev')===h.e&&h.sl&&h.mr>J(w,`(()=>{const tr=homeTraj(),z=zeroConds();return solveShot(tr.pts,nearestPt,z.range,100,0,0,90,S.mv,0.1,z.wSpd,z.wDir).mrElev})()`),txt(w,'home-elev'));
w.eval(`Bus.setWind(5,90,'manual');Bus.notify()`);await wait(30);
chk('pure crosswind: elevation unchanged from calm, no re-solve',txt(w,'home-elev')===level&&!sol(0,5,90).sl);
w.eval(`Bus.setWind(0,90,'manual');Bus.notify()`);
// 3. Dope card: per-target angle.
w.eval(`newDope();const c=DB.dopeCards[0];c.stages[0].dists=[{id:'a',range:100,angle:0,wind:0,wdir:90,label:'',brg:null,size:null,pos:'',shots:1},{id:'b',range:100,angle:30,wind:0,wdir:90,label:'',brg:null,size:null,pos:'',shots:1}];saveDB();`);
const dc=J(w,`(()=>{const c=DB.dopeCards[0],tr=computeCardTraj(c);const z=zeroConds(tr.r,c.zero);return c.stages[0].dists.map(d=>solveShot(tr.pts,nearestPt,z.range,d.range,d.angle,0,90,c.mv,tr.click,z.wSpd,z.wDir).mrElev)})()`);
chk('dope card: the 30° target gets the sloped solution, the level one is unchanged',Math.abs(dc[1]-s30.mr)<0.05&&Math.abs(dc[0]-dc[1])>0.5,JSON.stringify(dc));
// 4. Weather: QNH.
w.eval(`openWxForm()`);
const f=(id,v)=>{w.document.getElementById(id).value=String(v);};
f('wf-name','Ljubljana QNH');f('wf-temp',20);f('wf-pres',1013);f('wf-ptype','sea');f('wf-rh',65);f('wf-alt',0);
w.eval(`saveWx('')`);
chk('sea-level pressure without altitude is refused with a reason',!J(w,`DB.weathers.some(x=>x.name==='Ljubljana QNH')`)&&/needs the altitude/.test(w.alerts.slice(-1)[0]||''));
f('wf-alt',300);w.eval(`saveWx('')`);
const q=J(w,`DB.weathers.find(x=>x.name==='Ljubljana QNH')`);
chk('saved as sea-level type, the entered 1013 kept as entered',q&&q.presType==='sea'&&q.pres===1013&&q.alt===300);
w.eval(`Bus.setWx('cur','${q.id}');Bus.notify()`);await wait(30);
chk('current conditions use station pressure 977.5 hPa',Math.abs(J(w,'S.cp')-1013*Math.pow(1-2.25577e-5*300,5.25588))<1e-9,String(J(w,'S.cp')));
w.eval(`renderProfiles()`);
chk('profile list marks it QNH',/1013 hPa QNH/.test(w.document.getElementById('pl-wx').textContent),w.document.getElementById('pl-wx').textContent.slice(0,200));
w.eval('saveDB()');await wait(30);
const r=await open(w.localStorage.getItem(SK));
chk('survives a restart',J(r,`DB.weathers.find(x=>x.name==='Ljubljana QNH').presType`)==='sea');
r.eval(`importData(${JSON.stringify({weathers:[{id:'x1',name:'Imported QNH',temp:10,pres:1020,presType:'sea',rh:50,alt:400,notes:''}]})})`);await wait(20);
chk('import keeps the pressure type',J(r,`DB.weathers.find(x=>x.name==='Imported QNH')?.presType`)==='sea');
// 5. Solver page note.
chk('Solver note no longer claims the Rifleman\'s rule',!/Angle uses Rifleman/.test(w.document.body.innerHTML)&&/re-solved along the slope/.test(w.document.body.textContent));
const errs=all.flatMap(x=>x.errs);chk('ZERO uncaught errors',errs.length===0,errs.slice(0,3).join(' / '));
console.log('\nPASS '+pass+'   FAIL '+fail);process.exit(fail?1:0);
})().catch(e=>{console.error('TEST CRASH:',e);process.exit(1);});
