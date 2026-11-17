const {JSDOM}=require('jsdom'),fs=require('fs');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function open(){const dom=new JSDOM(fs.readFileSync('/home/claude/repo/index.html','utf8'),{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',
  beforeParse(w){w.alerts=[];w.alert=m=>w.alerts.push(String(m));w.confirm=()=>true;w.scrollTo=()=>{};
    w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:(t,k)=>k==='measureText'?()=>({width:10}):()=>{}});}});
  const w=dom.window;w.errs=[];w.addEventListener('error',e=>w.errs.push(e.message));await wait(700);return w;}
const J=(w,e)=>JSON.parse(w.eval('JSON.stringify('+e+')'));const P=(...a)=>console.log(...a);
const home=w=>w.document.getElementById('home-elev-u').textContent+' | '+w.document.getElementById('home-status').textContent.slice(0,90);
(async()=>{
let w=await open();
const base=J(w,'DB.rifles[0]'),wx0=J(w,'DB.weathers[0]');
// A. non-physical values via import
const imp=d=>{w.eval('importData('+JSON.stringify(d)+')');};
imp({rifles:[{...base,id:'bad1',name:'Shared rifle zero 0 hPa',zPres:0,zPresType:'station'}],weathers:[{...wx0,id:'badwx',name:'Shared weather RH 900',rh:900,presType:'station',pres:975}]});await wait(100);
w.eval(`Bus.setRifle('bad1');Bus.setProj(DB.projectiles.find(p=>/^Altaros ATP Queen/.test(p.name)).id);Bus.setWx('cur',DB.weathers[0].id);S.mv=255;S.dist_m=100;Bus.notify();gotoPage('home')`);await wait(300);
P('A1 rifle zero pressure 0 hPa (form would refuse: "gt 0") →',home(w));
w.eval(`Bus.setRifle(DB.rifles[0].id);Bus.setWx('cur','badwx');Bus.notify()`);await wait(300);
P('A2 weather RH 900 % (form max 100) →',home(w));
imp({scopes:[{id:'sc0',name:'Shared scope click 1e-9',click:1e-9,adjUnit:'mil',elev:26,wind:16}],rifles:[{...base,id:'r3',name:'rifle on tiny click',scopeId:'sc0',twist:0.001}]});await wait(100);
w.eval(`Bus.setRifle('r3');Bus.setWx('cur',DB.weathers[0].id);Bus.notify()`);await wait(300);
P('A3 scope click 1e-9 mil + twist 0.001 mm →',w.document.getElementById('home-elev').textContent,'|',home(w));
// B. duplicate ids inside one file
imp({projectiles:[{id:'dup',name:'Dup A',diam:6.35,mass:60,type:'slug'},{id:'dup',name:'Dup B',diam:6.35,mass:70,type:'slug'}]});await wait(100);
P('B duplicate ids in one file → records with id "dup":',J(w,"DB.projectiles.filter(p=>p.id==='dup').map(p=>p.name)"));
// C. remapRefs with __proto__ / constructor ids
imp({dopeCards:[{id:'dcp',name:'Proto card',rifleId:'__proto__',projId:'constructor',cwxId:'toString',mv:255,zero:50,notes:'',stages:[]}]});await wait(100);
P('C refs "__proto__"/"constructor"/"toString" → stored types:',JSON.stringify(J(w,"(()=>{const c=DB.dopeCards.find(c=>c.id==='dcp');return [typeof c.rifleId,typeof c.projId,typeof c.cwxId]})()")),'| Object.prototype polluted:',J(w,'({}).polluted===1'));
// D. prefs: take theirs with junk units/app2
const D={units:{range:'parsec',ang:'<b>x</b>',vel:'__proto__'},app2:{homeWindSrc:'avg',windAvgS:-5,lat:'north',theme:'<img>',fontScale:'huge',retMag:'1e9'}};
imp(D);await wait(100);P('D review sheet open for prefs:',w.document.getElementById('modal').classList.contains('open'));
w.eval("impPrefs('take');finishImport(IMP)");await wait(200);
P('  after "Take theirs": UNITS.range',J(w,'UNITS.range'),'| APP.lat',J(w,'APP.lat'),'| errors so far',w.errs.length,'|',w.errs.slice(0,2).join(' ; ').slice(0,160));
try{w.eval("gotoPage('home');renderQuick();gotoPage('settings')");}catch(e){P('  render threw',e.message);}await wait(200);
P('  page errors after render:',w.errs.slice(-3).join(' ; ').slice(0,300));
// E. old export (pre-V1.24.2 engine) with a trued G7 BC
w=await open();imp({app:'SEN Ballistics V1.24.1',schema:{projectiles:1},projectiles:[{id:'oldtrue',name:'Queen trued in V1.23',diam:6.35,mass:60,oal:12.9,type:'slug',bcg7:0.163,bcg1:0,bcTrued:'single·g7·2026-10-10',c:0,ff:1.07}]});await wait(100);
P('E old export trued G7 0.163 (= 0.128 under the new engine) → imported bcg7',J(w,"DB.projectiles.find(p=>p.id==='oldtrue').bcg7"),'bcTrued',J(w,"DB.projectiles.find(p=>p.id==='oldtrue').bcTrued||null"));
// F. oversized string fields accepted
imp({projectiles:[{id:'big',name:'N'.repeat(1999),notes:'x'.repeat(1999),diam:6.35,mass:60,type:'banana',cal:'.25'}],reticles:[{id:'bigret',name:'R',hashes:Array.from({length:200000},(_,i)=>i),windHashes:[]}]});await wait(100);
P('F type "banana" accepted:',J(w,"DB.projectiles.find(p=>p.id==='big').type"),'| reticle hashes kept',J(w,"DB.reticles.find(r=>r.id==='bigret').hashes.length"));
process.exit(0);})();
