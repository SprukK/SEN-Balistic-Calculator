// Shot strip + leftovers test (V2.11.0 r7).
// Strips on Trajectory, Shot solver (with cant) and Wind (distance + angle); the old duplicated inputs and
// the Solve / Recompute / Compute buttons hidden but still in the DOM; hold + drag on a strip moves the
// session distance and the solver re-solves (= solveShot, = Home); angle / cant sheets write Home's fields
// and the solver mirrors them (entering the solver takes the whole shot from the session); the wind sheet
// sets a manual session wind and pauses live wind first; Holds follows the session; pressure shown to
// 0.1 hPa while the session keeps the exact value; one two-line session bar replaces the chips.
// Usage: node striptest.js <app.html>   (needs jsdom; see README.md)
const {JSDOM}=require('jsdom'),fs=require('fs');
const FILE=process.argv[2];
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let pass=0,fail=0;
const chk=(n,ok,extra)=>{console.log((ok?'  PASS  ':'  FAIL  ')+n+(extra?'   '+extra:''));ok?pass++:fail++;};
(async()=>{
console.log('=== SHOT STRIP TEST: '+FILE+' ===');
const dom=new JSDOM(fs.readFileSync(FILE,'utf8'),{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',
  beforeParse(w){Object.defineProperty(w,'innerWidth',{configurable:true,value:412});Object.defineProperty(w,'innerHeight',{configurable:true,value:915});
    w.alert=()=>{};w.confirm=()=>true;w.scrollTo=()=>{};
    w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:(t,k)=>k==='measureText'?()=>({width:10}):()=>{}});}});
const w=dom.window;w.errs=[];w.addEventListener('error',e=>w.errs.push(e.message));await wait(700);
const $=id=>w.document.getElementById(id),J=e=>JSON.parse(w.eval('JSON.stringify('+e+')'));
const pe=(el,type,x,y)=>{const e=new w.MouseEvent(type,{bubbles:true,cancelable:true,clientX:x,clientY:y,button:0});Object.defineProperty(e,'pointerId',{value:1});el.dispatchEvent(e);};
async function holdDrag(el,dx,dy){let x=200,y=400;pe(el,'pointerdown',x,y);await wait(420);const n=Math.max(Math.abs(dx),Math.abs(dy))/2;
  for(let i=0;i<n;i++){x+=dx/n;y+=dy/n;pe(el,'pointermove',x,y);await wait(16);}pe(el,'pointerup',x,y);await wait(400);}
const put=(id,v)=>{const i=$(id);Object.getOwnPropertyDescriptor(w.HTMLInputElement.prototype,'value').set.call(i,String(v));i.dispatchEvent(new w.Event('input'));};
const enter=(id,v)=>{const i=$(id);Object.getOwnPropertyDescriptor(w.HTMLInputElement.prototype,'value').set.call(i,String(v));i.dispatchEvent(new w.Event('input'));i.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter'}));};
w.eval(`Bus.setRifle(DB.rifles.find(r=>/\\.25/.test(r.name)).id);Bus.setProj(DB.projectiles.find(p=>/^Altaros ATP Queen/.test(p.name)).id);
  Bus.setWx('cur',DB.weathers[0].id);Bus.setWx('zero',DB.weathers[0].id);S.mv=255;S.dist_m=100;Bus.setWind(2,90,'manual');Bus.notify();runTraj(true);`);await wait(300);
const solverWant=()=>J(`(()=>{const tr=homeTraj(),z=zeroConds(),sc=rifleScope(getRifle()),a=+document.getElementById('home-angle').value||0,c=+document.getElementById('home-cant').value||0,
  s=solveShot(tr.pts,nearestPt,z.range,S.dist_m,a,S.wind.speed,S.wind.dir,S.mv,sc?.clickStepMrad||0.1,z.wSpd,z.wDir,null,c);return (s.clElev>=0?'↑':'↓')+Math.abs(s.clElev).toFixed(0)+'|'+(s.clWind>=0?'→':'←')+Math.abs(s.clWind).toFixed(0);})()`);
const svOut=()=>[...$('sv-outs').querySelectorAll('.sv')].slice(0,2).map(e=>e.textContent).join('|');

// 1. Strips and hidden duplicates
const strip=pg=>w.document.querySelector('#page-'+pg+' .sstrip');
const btns=pg=>[...strip(pg).querySelectorAll('.sstrip-row button')].map(b=>b.className.match(/sd-\w+/)[0]).join();
chk('strips: Trajectory angle + wind, Shot solver angle + wind + cant, Wind page angle only',btns('traj')==='sd-angle,sd-wind'&&btns('solver')==='sd-angle,sd-wind,sd-cant'&&btns('wind')==='sd-angle');
chk('each strip sits right after its page\'s output card',['traj','solver','wind'].every(pg=>strip(pg).previousElementSibling&&strip(pg).previousElementSibling.classList.contains('outcard')));
chk('old distance / angle / wind / cant inputs hidden, still in the DOM',['sv-tdist','sv-angle','sv-wind','sv-wdir','sv-cant','tr-dist'].every(id=>$(id)&&$(id).closest('.dup-hide')));
const hid=t=>[...w.document.querySelectorAll('button')].filter(b=>b.textContent===t).every(b=>b.closest('.dup-hide')||b.classList.contains('dup-hide'));
chk('Solve, Recompute and Compute buttons hidden (results are live); Print stays',hid('Solve')&&hid('Recompute')&&hid('Compute')&&[...w.document.querySelectorAll('#page-holds button')].some(b=>b.textContent==='Print'&&!b.closest('.dup-hide')));
chk('…and the CSS hides .dup-hide',/\.dup-hide\{display:none!important\}/.test(fs.readFileSync(FILE,'utf8')));

// 2. Solver from the session
w.eval(`gotoPage('home');document.getElementById('home-angle').value='10';document.getElementById('home-cant').value='1';renderQuick();gotoPage('solver')`);await wait(30);
chk('entering the solver takes distance, angle, cant and wind from the session',$('sv-tdist').value==='100'&&$('sv-angle').value==='10'&&$('sv-cant').value==='1'&&$('sv-wind').value==='2'&&$('sv-wdir').value==='90');
chk('…solver answer = solveShot with the session shot',svOut()===solverWant(),svOut()+' vs '+solverWant());
await holdDrag(strip('solver').querySelector('.sstrip-d'),0,-32);
chk('hold + drag up on the solver strip → +20 m, solver re-solved, = Home',w.eval('S.dist_m')===120&&$('sv-tdist').value==='120'&&$('sv-dist').textContent==='120 m'&&svOut()===solverWant()&&(w.eval('renderQuick()'),$('home-elev').textContent===solverWant().split('|')[0]),svOut());
chk('…every strip and Home show 120',[...w.document.querySelectorAll('.sd-val')].every(e=>e.textContent==='120')&&$('fd-val').textContent==='120');
strip('solver').querySelector('.sd-angle').click();await wait(20);enter('sh-angle',-5);await wait(20);
chk('angle sheet from the strip: Home angle −5°, solver mirrors and re-solves',$('home-angle').value==='-5'&&$('sv-angle').value==='-5'&&svOut()===solverWant()&&strip('solver').querySelector('.sd-angle').textContent==='Angle -5°');
strip('solver').querySelector('.sd-cant').click();await wait(20);enter('sh-cant',2);await wait(20);
chk('cant sheet: Home cant 2°, solver mirrors',$('home-cant').value==='2'&&$('sv-cant').value==='2'&&svOut()===solverWant()&&/^Cant 2°$/.test(strip('solver').querySelector('.sd-cant').textContent));

// 3. Wind sheet
w.eval(`CALS.push({link:{id:'idA',name:'WDOT-AAAA01',connected:()=>true,disconnect(){},dev:{gatt:{connected:true}}},status:'live',spd:2,dir:90,lastWu:Date.now(),batt:80,reply:null,rx:'',buf:[],ka:null,fff1:null,locked:false});
  calPrimaryId='idA';calSyncPrimary();if(!homeLive)toggleHomeLive();S.wind.source='calypso';`);
strip('solver').querySelector('.sd-wind').click();await wait(20);
chk('wind sheet warns that live wind will pause',/Live wind is on/.test($('sbox').textContent));
put('sh-wdir',270);enter('sh-wspd',3.5);await wait(20);
chk('wind sheet: manual session wind 3.5 m/s from 270°, live wind paused, solver mirrors',w.eval('S.wind.speed')===3.5&&w.eval('S.wind.dir')===270&&J('S.wind.source')==='manual'&&w.eval('homeLive')===false&&$('sv-wind').value==='3.5'&&$('sv-wdir').value==='270'&&svOut()===solverWant());
w.eval(`gotoPage('wind')`);await wait(20);
chk('Wind page shows the same session wind; its strip moves the distance too',$('wd-spd').value==='3.5'&&$('wd-dir').value==='270');
await holdDrag(strip('wind').querySelector('.sstrip-d'),24,0);
chk('…drag on the Wind strip: +2 m, drift recomputed at the new distance',w.eval('S.dist_m')===122&&/122 m/.test($('wd-out-dist').textContent),$('wd-out-dist').textContent);

// 4. Holds follow the session; pressure; session bar
w.eval(`gotoPage('holds')`);await wait(20);const h0=$('page-holds').querySelector('table').textContent;
w.eval(`S.mv=280;Bus.notify()`);await wait(20);
chk('Holds re-render when the session changes (no Compute needed)',$('page-holds').querySelector('table').textContent!==h0);
w.eval(`S.cp=974.8223757801871;syncTrajInputs()`);
chk('pressure shown to 0.1 hPa, the session keeps the exact value',$('tr-cp').value==='974.8'&&w.eval('S.cp')===974.8223757801871);
w.eval('renderActBar()');
const ses=$('ses-txt').textContent;
chk('session bar: rifle · projectile, then MV · temperature · wind · distance',/RTI Mora \.25.*Altaros ATP Queen/.test(ses)&&/280\.0 m\/s · 20\.0 °C · 3\.5 m\/s @ 270° · 122 m/.test(ses),ses);
chk('chips hidden everywhere; session bar hidden on Home only while the Field summary is shown',/#actbar\{display:none\}/.test(fs.readFileSync(FILE,'utf8'))&&/body:has\(#page-home\.active\):has\(#home-summary:not\(\.mod-off\)\) #sesbar\{display:none\}/.test(fs.readFileSync(FILE,'utf8')));
$('sesbar').querySelector('button').click();await wait(20);
chk('tap the session bar → the six session pickers',[...w.document.querySelectorAll('#sbox .flist button .fk')].map(e=>e.textContent).join()==='Rifle,Projectile,MV,Weather,Wind,Distance');
w.eval('closeSheet()');
w.eval(`getRifle().name='<img src=x id=pwn>';renderActBar()`);
chk('session bar is text, never HTML',!$('pwn')&&/<img/.test($('ses-txt').textContent));
chk('no uncaught errors',w.errs.length===0,w.errs.join(' | '));
console.log('\nPASS '+pass+'   FAIL '+fail);
process.exit(fail?1:0);
})().catch(e=>{console.error('TEST CRASH:',e);process.exit(1);});
