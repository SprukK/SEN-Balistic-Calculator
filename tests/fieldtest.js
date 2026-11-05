// Field screen test (V2.11.0 r1): the "Field" Home layout — session summary, answer, distance.
// Answer = the solver (metric and yards), status line carried over, summary sheet = the chip pickers,
// distance tap → number sheet whose unit switch IS Settings → Range, hold + drag (±1 sideways, ±10 up/down,
// dominant axis, clamps, yards), a move before the hold does nothing, pointercancel keeps the value,
// one-time hint, §20E manual mark after a ranging, angle sheet, header page name, layout-sheet active
// button readable, text only (no HTML sinks).
// Usage: node fieldtest.js <app.html>   (needs jsdom; see README.md)
const {JSDOM}=require('jsdom'),fs=require('fs');
const FILE=process.argv[2];
const SK='sen_platform_v1';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let pass=0,fail=0;
const chk=(n,ok,extra)=>{console.log((ok?'  PASS  ':'  FAIL  ')+n+(extra?'   '+extra:''));ok?pass++:fail++;};
async function open(ls){
  const dom=new JSDOM(fs.readFileSync(FILE,'utf8'),{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',
    beforeParse(w){Object.defineProperty(w,'innerWidth',{configurable:true,value:412});Object.defineProperty(w,'innerHeight',{configurable:true,value:915});   // phone screen (jsdom's default is a two-pane wide screen)
      w.alert=()=>{};w.confirm=()=>true;w.scrollTo=()=>{};if(ls)w.localStorage.setItem(SK,ls);
      w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:(t,k)=>k==='measureText'?()=>({width:10}):()=>{}});}});
  const w=dom.window;w.errs=[];w.addEventListener('error',e=>w.errs.push(e.message));await wait(700);return w;
}
const J=(w,e)=>JSON.parse(w.eval('JSON.stringify('+e+')'));
const $=(w,id)=>w.document.getElementById(id);
const txt=(w,id)=>$(w,id).textContent;
// pointer events as Chrome sends them for a finger (pointerId 1, button 0)
const pe=(w,el,type,x,y)=>{const e=new w.MouseEvent(type,{bubbles:true,cancelable:true,clientX:x,clientY:y,button:0});
  Object.defineProperty(e,'pointerId',{value:1});Object.defineProperty(e,'pointerType',{value:'touch'});el.dispatchEvent(e);return e;};
const tap=async(w,el)=>{pe(w,el,'pointerdown',0,0);await wait(40);pe(w,el,'pointerup',0,0);el.dispatchEvent(new w.MouseEvent('click',{bubbles:true,detail:1}));await wait(30);};
// hold, then move along a path of [dx,dy] (screen pixels, y down) in 2 px steps every 16 ms (slow, no acceleration)
async function holdDrag(w,el,path,cancel){
  let x=200,y=400;pe(w,el,'pointerdown',x,y);await wait(420);
  for(const [dx,dy] of path){const n=Math.max(Math.abs(dx),Math.abs(dy))/2;
    for(let i=0;i<n;i++){x+=dx/n;y+=dy/n;pe(w,el,'pointermove',x,y);await wait(16);}}
  pe(w,el,cancel?'pointercancel':'pointerup',x,y);await wait(60);
}

(async()=>{
console.log('=== FIELD SCREEN TEST: '+FILE+' ===');
const w=await open();
w.eval(`Bus.setRifle(DB.rifles.find(r=>/\\.25/.test(r.name)).id);Bus.setProj(DB.projectiles.find(p=>/^Altaros ATP Queen/.test(p.name)).id);
  Bus.setWx('cur',DB.weathers[0].id);Bus.setWx('zero',DB.weathers[0].id);S.mv=255;Bus.setWind(3,90,'manual');S.dist_m=100;Bus.notify();`);await wait(40);

// 1. Field layout seeded once, at the end; its modules
chk('Field layout (named "Default") is seeded once, first and in use',J(w,"APP.layouts.filter(l=>l.tpl==='field').length")===1&&J(w,'APP.layouts[0].name')==='Default'&&J(w,'activeLayout().name')==='Default'&&w.eval('APP.fieldDefault')===true);
w.eval(`useLayout(APP.layouts.find(l=>l.tpl==='default').id)`);await wait(40);
chk('Classic (the pre-r1 Home) shows no Field module',J(w,'activeLayout().name')==='Classic'&&['home-summary','home-answer','home-distance','home-devices'].every(id=>$(w,id).classList.contains('mod-off'))&&!$(w,'home-dash').classList.contains('ans-on'));
w.eval(`useLayout(APP.layouts.find(l=>l.tpl==='field').id)`);await wait(40);
const vis=[...$(w,'page-home').children].filter(e=>e.id&&!e.classList.contains('mod-off')&&!['home-layout-bar','home-setup'].includes(e.id)).map(e=>e.id).join();
chk('Field shows summary · answer · distance · devices · reticle · turret, in that order',vis==='home-summary,home-answer,home-distance,home-devices,home-dash,home-turret-panel',vis);
chk('reticle module hides its own clicks when Answer is on',$(w,'home-dash').classList.contains('ans-on'));
const w2=await open(w.localStorage.getItem(SK));
Object.defineProperty(w2,'innerWidth',{configurable:true,value:780});Object.defineProperty(w2,'innerHeight',{configurable:true,value:720});w2.eval('applyLayout()');await wait(40);
const rail=[...w2.document.getElementById('sol-rail').children].map(e=>e.id).filter(Boolean).join();
chk('inner screen (780 px): reticle + turret in the second pane, summary / answer / distance on the left',/home-dash/.test(rail)&&!!w2.document.querySelector('#page-home #home-answer:not(.mod-off)')&&!!w2.document.querySelector('#page-home #home-distance:not(.mod-off)'),rail);

// r1 → r2 upgrade: a store from r1 (Default in use, Field last, no device row) → Field first, in use, devices under Distance
const old=JSON.parse(w.localStorage.getItem(SK)||'null');
if(old&&old.app2){const a2=old.app2,F=a2.layouts.find(l=>l.tpl==='field');a2.layouts=a2.layouts.filter(l=>l!==F).map(l=>l.tpl==='default'?{...l,name:'Default'}:l);
  F.mods=F.mods.filter(m=>m.id!=='devices').concat([{id:'devices',on:false}]);F.name='Field';a2.layouts.push(F);a2.layoutId=a2.layouts[0].id;delete a2.fieldDefault;a2.fieldSeeded=true;
  const u=await open(JSON.stringify(old));
  chk('sandbox r1 store upgraded: Field first, renamed Default, in use, devices under Distance, old Default renamed Classic',J(u,'APP.layouts.map(l=>l.name)').join()==='Default,Classic,Benchrest 50 m,Benchrest 100 m,PRS,Big bore'&&J(u,'activeLayout().name')==='Default'&&J(u,"activeLayout().mods.filter(m=>m.on).map(m=>m.id)").join()==='summary,answer,distance,devices,solution,turret',J(u,"activeLayout().mods.filter(m=>m.on).map(m=>m.id)").join());
}else chk('r1 store upgraded (store not readable in this run)',false);
// 2. Answer = solver, metric and yards; status carried over
const solved=()=>J(w,`(()=>{const tr=homeTraj(),z=zeroConds(),sc=rifleScope(getRifle()),s=solveShot(tr.pts,nearestPt,z.range,S.dist_m,0,S.wind.speed,S.wind.dir,S.mv,sc?.clickStepMrad||0.1,z.wSpd,z.wDir);
  return[(s.clElev>=0?'↑':'↓')+Math.abs(s.clElev).toFixed(0),(s.clWind>=0?'→':'←')+Math.abs(s.clWind).toFixed(0)];})()`);
let same=true,seen=[];
for(const d of [50,100,150]){w.eval(`S.dist_m=${d};Bus.notify();renderQuick()`);await wait(20);const s=solved();seen.push(d+':'+txt(w,'fa-elev')+'/'+txt(w,'fa-wind'));
  same=same&&txt(w,'fa-elev')===s[0]&&txt(w,'fa-wind')===s[1]&&txt(w,'fa-elev')===txt(w,'home-elev');}
chk('answer = solveShot at 50 / 100 / 150 m',same,seen.join(' '));
chk('answer keeps the mrad line and the status / warning line',txt(w,'fa-elev-u')===txt(w,'home-elev-u')&&txt(w,'fa-status')===txt(w,'home-status')&&/Sg/.test(txt(w,'fa-status')),txt(w,'fa-status'));
w.eval(`setUnit('range','yd')`);w.eval(`S.dist_m=137.16;Bus.notify();renderQuick()`);await wait(20);
chk('in yards: distance shows 150 yd, answer still = solver',txt(w,'fd-val')==='150'&&txt(w,'fd-unit')==='yd'&&txt(w,'fa-elev')===solved()[0]);
w.eval(`setUnit('range','m')`);w.eval(`S.dist_m=100;Bus.notify();renderQuick()`);await wait(20);

// 3. Summary line and its sheet
chk('summary: rifle · projectile · MV · temperature',/RTI Mora \.25.*Altaros ATP Queen.*255\.0 m\/s.*°C/.test(txt(w,'fsum-txt')),txt(w,'fsum-txt'));
$(w,'fsum-btn').click();await wait(20);
const rows=[...w.document.querySelectorAll('#sbox .flist button')].map(b=>b.querySelector('.fk').textContent);
chk('summary sheet lists the six session pickers',rows.join()==='Rifle,Projectile,MV,Weather,Wind,Distance',rows.join());
w.document.querySelectorAll('#sbox .flist button')[1].click();await wait(20);
chk('…Projectile row opens the projectile picker',/Projectile/.test(w.document.querySelector('#sbox h3').textContent)&&!!$(w,'sh-search'));
w.eval('closeSheet()');

// 4. Tap → number sheet; its unit switch is Settings → Range
await tap(w,$(w,'fd-btn'));
const segs=()=>[...w.document.querySelectorAll('#sh-dist-units button')].map(b=>b.textContent+(b.classList.contains('on')?'*':''));
chk('tap opens the distance sheet with the Settings unit switch (m active)',$(w,'sheet').classList.contains('open')&&segs().join()==='m*,yd,ft',segs().join());
[...w.document.querySelectorAll('#sh-dist-units button')].find(b=>b.textContent==='yd').click();await wait(20);
chk('switching to yd changes Settings → Range itself, sheet shows yd',w.eval('UNITS.range')==='yd'&&segs().join()==='m,yd*,ft'&&$(w,'sh-num').value==='100');
const ni=$(w,'sh-num');Object.getOwnPropertyDescriptor(w.HTMLInputElement.prototype,'value').set.call(ni,'200');ni.dispatchEvent(new w.Event('input'));
ni.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter'}));await wait(20);
chk('Enter sets 200 yd → stored 182.88 m, shown 200 yd, sheet closed',Math.abs(w.eval('S.dist_m')-182.88)<1e-6&&txt(w,'fd-val')==='200'&&txt(w,'fd-unit')==='yd'&&!$(w,'sheet').classList.contains('open'),w.eval('S.dist_m'));
w.eval(`setUnit('range','m');S.dist_m=100;Bus.notify();renderQuick()`);await wait(20);

// 5. Hold + drag
const fd=$(w,'fd-btn');
chk('one-time hint shown before the first drag',$(w,'fd-tip').style.display!=='none');
await holdDrag(w,fd,[[60,0]]);
chk('hold + drag right 60 px → +5 m (1 per 12 px)',w.eval('S.dist_m')===105,w.eval('S.dist_m'));
chk('…answer followed the drag',txt(w,'fa-elev')===solved()[0]&&txt(w,'fd-val')==='105');
chk('…hint hidden after the first drag and remembered',$(w,'fd-tip').style.display==='none'&&w.eval('APP.fdTipSeen')===true);
await holdDrag(w,fd,[[0,-80]]);
chk('drag up 80 px → +50 m (10 per 16 px)',w.eval('S.dist_m')===155,w.eval('S.dist_m'));
await holdDrag(w,fd,[[0,48]]);
chk('drag down 48 px → −30 m',w.eval('S.dist_m')===125,w.eval('S.dist_m'));
await holdDrag(w,fd,[[36,-6]]);
chk('mostly-sideways drag with a little lift → +3 m, never a jump of 10',w.eval('S.dist_m')===128,w.eval('S.dist_m'));
w.eval('S.dist_m=3;Bus.notify();renderQuick()');await holdDrag(w,fd,[[-100,0]]);
chk('clamped at 1 m',w.eval('S.dist_m')===1);
w.eval('S.dist_m=1495;Bus.notify();renderQuick()');await holdDrag(w,fd,[[0,-64]]);
chk('clamped at 1500 m',w.eval('S.dist_m')===1500);
w.eval(`setUnit('range','yd');S.dist_m=100;Bus.notify();renderQuick()`);await wait(20);
await holdDrag(w,fd,[[24,0]]);
chk('in yards: 109 yd + 2 → 111 yd stored as metres',Math.abs(w.eval('S.dist_m')-111*0.9144)<1e-9&&txt(w,'fd-val')==='111',w.eval('S.dist_m'));
w.eval(`setUnit('range','m');S.dist_m=100;Bus.notify();renderQuick()`);await wait(20);
// a move before the hold is a scroll attempt: nothing happens
pe(w,fd,'pointerdown',200,400);await wait(60);for(let i=1;i<=6;i++){pe(w,fd,'pointermove',200,400-i*5);await wait(16);}
await wait(400);pe(w,fd,'pointerup',200,370);fd.dispatchEvent(new w.MouseEvent('click',{bubbles:true,detail:1}));await wait(30);
chk('a move before the hold changes nothing and opens no sheet',w.eval('S.dist_m')===100&&!$(w,'sheet').classList.contains('open')&&!$(w,'home-distance').classList.contains('grab'));
await holdDrag(w,fd,[[24,0]],true);
chk('pointercancel ends the drag, keeps the value',w.eval('S.dist_m')===102&&!$(w,'home-distance').classList.contains('grab'));
chk('a click after a drag does not open the sheet',(fd.dispatchEvent(new w.MouseEvent('click',{bubbles:true,detail:1})),!$(w,'sheet').classList.contains('open')));

// 6. §20E — after a ranging, a dragged / typed distance is marked manual
w.eval(`rfFilled={m:102,deg:0,name:'TITAN 3K',t:Date.now()};renderQuick()`);
chk('distance from the rangefinder shows its source',txt(w,'fd-src')==='⊙ TITAN 3K'&&!$(w,'fd-src').classList.contains('man'));
await holdDrag(w,fd,[[12,0]]);
chk('…after a drag it is marked manual',txt(w,'fd-src')==='✎ manual'&&$(w,'fd-src').classList.contains('man'));

// 7. Angle sheet
await wait(350);   // the click right after a long press is swallowed for 300 ms
$(w,'fd-angle').click();await wait(20);
const ai=$(w,'sh-angle');ai.value='20';ai.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter'}));await wait(20);
chk('angle sheet sets Home angle 20°, answer re-solved',$(w,'home-angle').value==='20'&&txt(w,'fd-angle')==='Angle 20°'&&txt(w,'fa-elev')===txt(w,'home-elev'));

// 7b. On-screen keyboard: sheets sit above it (--kb = window height − visual viewport height)
{const dom2=new JSDOM(fs.readFileSync(FILE,'utf8'),{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',
  beforeParse(v){Object.defineProperty(v,'innerWidth',{configurable:true,value:412});Object.defineProperty(v,'innerHeight',{configurable:true,value:915});v.alert=()=>{};v.scrollTo=()=>{};
    const vv=new v.EventTarget();vv.height=915;vv.offsetTop=0;v.visualViewport=vv;
    v.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:(t,k)=>k==='measureText'?()=>({width:10}):()=>{}});}});
 const k=dom2.window;await wait(700);
 const kb0=k.document.documentElement.style.getPropertyValue('--kb');
 k.visualViewport.height=515;k.visualViewport.dispatchEvent(new k.Event('resize'));
 const kb1=k.document.documentElement.style.getPropertyValue('--kb');
 k.visualViewport.height=915;k.visualViewport.dispatchEvent(new k.Event('resize'));
 chk('keyboard open (visual viewport 400 px shorter) → sheets lifted by 400 px, back to 0 when it closes',kb0==='0px'&&kb1==='400px'&&k.document.documentElement.style.getPropertyValue('--kb')==='0px',kb0+' → '+kb1);
 const css=fs.readFileSync(FILE,'utf8');
 chk('…the sheet box sits on --kb and its height leaves room for it',/\.sbox\{bottom:var\(--kb,0px\);max-height:calc\(84vh - var\(--kb,0px\)\)\}/.test(css));}

// 7c. Divider between the panes (inner screen): drag 30–70 %, double-tap reset, remembered
{const d2=new JSDOM(fs.readFileSync(FILE,'utf8'),{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',
  beforeParse(v){Object.defineProperty(v,'innerWidth',{configurable:true,value:780});Object.defineProperty(v,'innerHeight',{configurable:true,value:720});v.alert=()=>{};v.scrollTo=()=>{};
    v.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:(t,k)=>k==='measureText'?()=>({width:10}):()=>{}});}});
 const v=d2.window;await wait(700);const root=v.document.documentElement,dv=v.document.getElementById('pane-div');
 const p=(type,x)=>{const e=new v.MouseEvent(type,{bubbles:true,cancelable:true,clientX:x,clientY:300,button:0});Object.defineProperty(e,'pointerId',{value:7});dv.dispatchEvent(e);};
 chk('inner screen: two panes and a divider, default widths until moved',root.classList.contains('fold')&&!!dv&&!root.classList.contains('split'));
 p('pointerdown',460);p('pointermove',390);
 chk('drag to the middle → right pane 50 % live, while dragging',v.eval('APP.railW')===0.5&&root.classList.contains('split')&&root.style.getPropertyValue('--rail-w')==='50.00vw'&&dv.classList.contains('drag'));
 p('pointermove',740);const lo=v.eval('APP.railW');p('pointermove',20);const hi=v.eval('APP.railW');p('pointerup',20);
 chk('clamped to 30 % … 70 %',lo===0.3&&hi===0.7&&!dv.classList.contains('drag'),lo+' / '+hi);
 v.eval('saveDB()');await wait(50);
 const d3=new JSDOM(fs.readFileSync(FILE,'utf8'),{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',
   beforeParse(x){Object.defineProperty(x,'innerWidth',{configurable:true,value:780});Object.defineProperty(x,'innerHeight',{configurable:true,value:720});x.alert=()=>{};x.scrollTo=()=>{};
     x.localStorage.setItem(SK,v.localStorage.getItem(SK));x.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:(t,k)=>k==='measureText'?()=>({width:10}):()=>{}});}});
 await wait(700);
 chk('width remembered after a restart',d3.window.document.documentElement.style.getPropertyValue('--rail-w')==='70.00vw');
 p('pointerdown',200);p('pointerup',200);await wait(60);p('pointerdown',200);p('pointerup',200);
 chk('double-tap resets to the default split',v.eval('APP.railW')===undefined&&!root.classList.contains('split')&&root.style.getPropertyValue('--rail-w')==='');
 chk('…the CSS uses --rail-w for both the rail and the left pane',/html\.fold\.split body\{padding-right:calc\(var\(--rail-w\) \+ 18px\)\}/.test(fs.readFileSync(FILE,'utf8')));}

// 8. Header, layout sheet, text only, no errors
w.eval(`gotoPage('traj')`);const h1=txt(w,'hdr-page');w.eval(`gotoPage('settings')`);const h2=txt(w,'hdr-page');w.eval(`gotoPage('home')`);
chk('header shows the page name (Trajectory, Settings, Home)',h1==='Advanced · Trajectory'&&h2==='Settings'&&txt(w,'hdr-page')==='Home');
w.eval('openLayoutSheet()');const on=w.document.querySelector('#sbox .navsheet button.on'),cs=w.getComputedStyle(on);
chk('layout sheet: active layout readable (text colour ≠ background)',on.textContent==='Default'&&cs.color!==cs.backgroundColor,cs.color+' on '+cs.backgroundColor);
w.eval('closeSheet()');
w.eval(`getRifle().name='<img src=x id=pwn>';renderQuick();openSummarySheet()`);
chk('summary and its sheet are text, never HTML',!w.document.getElementById('pwn')&&/<img/.test(txt(w,'fsum-txt')));
chk('no uncaught errors',w.errs.length===0,w.errs.join(' | '));

console.log('\nPASS '+pass+'   FAIL '+fail);
process.exit(fail?1:0);
})().catch(e=>{console.error('TEST CRASH:',e);process.exit(1);});
