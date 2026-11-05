// Inner screen: left and right side of Home chosen per layout (V2.15.0).
// When a layout has its own inner-screen order, each module has a side. Checks: "Give the inner screen its own
// order" starts with today's split (reticle, turret, conditions on the right); a stored inner order without sides
// (V2.11–V2.14) gets the same split; the editor shows Left side / Right side lists, → / ← moves a module to the
// bottom of the other side, ▲▼ and drag stay within a side; the right pane on Home holds exactly the right side's
// modules in order (off ones hidden); nothing on the right → Home is one full-width column (no pane, no divider,
// no "Solution" button); other pages keep the standard Solution pane; a layout without an inner order keeps the
// standard pane; the outer screen is untouched; restart keeps it; stored sides are sanitised. No errors.
// Usage: node splittest.js <app.html>   (needs jsdom; see README.md)
const {JSDOM}=require('jsdom'),fs=require('fs');
const FILE=process.argv[2];
const SK='sen_platform_v1';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let pass=0,fail=0;
const chk=(n,ok,extra)=>{console.log((ok?'  PASS  ':'  FAIL  ')+n+(extra?'   '+extra:''));ok?pass++:fail++;};
async function open(ls,W=780,H=720){
  const dom=new JSDOM(fs.readFileSync(FILE,'utf8'),{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',
    beforeParse(w){Object.defineProperty(w,'innerWidth',{configurable:true,value:W});Object.defineProperty(w,'innerHeight',{configurable:true,value:H});
      w.matchMedia=q=>({matches:/coarse/.test(q),addEventListener(){},removeEventListener(){}});
      w.alert=()=>{};w.confirm=()=>true;w.scrollTo=()=>{};if(ls)w.localStorage.setItem(SK,ls);
      w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:(t,k)=>k==='measureText'?()=>({width:10}):()=>{}});}});
  const w=dom.window;w.errs=[];w.addEventListener('error',e=>w.errs.push(e.message));await wait(700);return w;
}
(async()=>{
console.log('=== INNER SCREEN SIDES TEST: '+FILE+' ===');
let w=await open();
const $=id=>w.document.getElementById(id),J=e=>JSON.parse(w.eval('JSON.stringify('+e+')'));
const rail=()=>[...$('sol-rail').children].map(e=>e.id).filter(id=>id&&!['rail-head','pane-sw'].includes(id)&&!$(id).classList.contains('mod-off'));
const home=()=>[...$('page-home').children].filter(e=>e.id&&!e.classList.contains('mod-off')&&!['home-layout-bar','home-setup'].includes(e.id)).map(e=>e.id);
w.eval(`Bus.setRifle(DB.rifles.find(x=>/\\.25/.test(x.name)).id);Bus.setProj(DB.projectiles.find(p=>/^Altaros ATP Queen/.test(p.name)).id);Bus.setWx('cur',DB.weathers[0].id);Bus.setWx('zero',DB.weathers[0].id);Bus.notify();gotoPage('home')`);await wait(30);
chk('two panes on the inner screen; Default layout, no inner order: standard right pane (reticle, turret)',w.eval('twoPane')&&w.eval('paneShown')==='rail'&&rail().join()==='home-dash,home-turret-panel',rail().join());
const std=rail().join(),stdHome=home().join();

// give the inner screen its own order
w.eval(`layoutEditId=activeLayout().id;layEditScreen='inner';gotoPage('layouts')`);await wait(20);
$('lay-own').click();await wait(30);
chk('"Give the inner screen its own order": sides set, reticle / turret / conditions on the right, the rest left',J("activeLayout().modsInner.filter(m=>m.side==='r').map(m=>m.id)").join()==='solution,turret,cond'&&J("activeLayout().modsInner.every(m=>m.side==='l'||m.side==='r')"));
const sideRows=k=>[...$('lay-side-'+k).querySelectorAll('.lay-mod')].map(r=>r.dataset.mod);
chk('editor: "Left side" and "Right side" lists',/Left side/.test($('lay-edit').textContent)&&/Right side/.test($('lay-edit').textContent)&&sideRows('r').join()==='solution,turret,cond'&&sideRows('l').length===J('Object.keys(HOME_MODS).length')-3);
w.eval(`gotoPage('home')`);await wait(30);
chk('Home on the inner screen: same split as before (no visible change)',rail().join()===std&&home().join()===stdHome,rail().join()+' | '+home().join());

// move Answer and Distance to the right
w.eval(`gotoPage('layouts')`);await wait(10);
const mv=id=>{const b=[...$('lay-edit').querySelectorAll('.lay-mod')].find(r=>r.dataset.mod===id).querySelector('.lay-side');b.click();};
mv('answer');await wait(10);mv('distance');await wait(10);
chk('→ moves a module to the bottom of the right side',sideRows('r').join()==='solution,turret,cond,answer,distance'&&!sideRows('l').includes('answer'),sideRows('r').join());
chk('…the row on the right shows ← to move it back',[...$('lay-side-r').querySelectorAll('.lay-mod')].every(r=>r.querySelector('.lay-side').textContent==='←'));
// ▲ within the right side
const upBtn=id=>[...$('lay-side-r').querySelectorAll('.lay-mod')].find(r=>r.dataset.mod===id).querySelectorAll('button')[1];
upBtn('answer').click();await wait(10);upBtn('answer').click();await wait(10);upBtn('answer').click();await wait(10);
chk('▲ moves within its side only (Answer to the top of the right side)',sideRows('r').join()==='answer,solution,turret,cond,distance'&&[...$('lay-side-r').querySelectorAll('.lay-mod')][0].querySelectorAll('button')[1].disabled,sideRows('r').join());
w.eval(`gotoPage('home')`);await wait(30);
chk('Home right pane = the right side, in its order (off modules hidden: conditions is off in Default)',rail().join()==='home-answer,home-dash,home-turret-panel,home-distance',rail().join());
chk('…and they are no longer in the left column',!home().includes('home-answer')&&!home().includes('home-distance')&&home().includes('home-summary'),home().join());
chk('…reticle hides its own clicks while Answer is on',$('home-dash').classList.contains('ans-on'));

// drag within a side keeps the other side
w.eval(`gotoPage('layouts')`);await wait(10);
const rows=[...$('lay-side-r').querySelectorAll('.lay-mod')];
rows.forEach(r=>{r.getBoundingClientRect=()=>({top:100+56*[...r.parentNode.children].indexOf(r),height:56,bottom:156+56*[...r.parentNode.children].indexOf(r),left:0,right:400,width:400});});
$('lay-side-r').getBoundingClientRect=()=>({top:100,bottom:100+56*rows.length,height:56*rows.length,left:0,right:400,width:400});
const grip=rows.find(r=>r.dataset.mod==='distance').querySelector('.lay-grip');
const pe=(el,type,y)=>{const e=new w.MouseEvent(type,{bubbles:true,cancelable:true,clientX:20,clientY:y,button:0});Object.defineProperty(e,'pointerId',{value:4});el.dispatchEvent(e);};
const leftBefore=J("activeLayout().modsInner.filter(m=>m.side==='l').map(m=>m.id)").join();
pe(grip,'pointerdown',100+56*4+28);pe(grip,'pointermove',100+10);pe(grip,'pointerup',110);await wait(320);
chk('drag within the right side: Distance to its top; the left side untouched',J("activeLayout().modsInner.filter(m=>m.side==='r').map(m=>m.id)").join()==='distance,answer,solution,turret,cond'&&J("activeLayout().modsInner.filter(m=>m.side==='l').map(m=>m.id)").join()===leftBefore&&J('activeLayout().modsInner.length')===J('Object.keys(HOME_MODS).length'));

// other pages keep the standard Solution pane
w.eval(`gotoPage('traj')`);await wait(30);
chk('other pages (Trajectory) keep the standard Solution pane',w.eval('paneShown')==='rail'&&rail().join()===std,rail().join());
w.eval(`gotoPage('home')`);await wait(30);
chk('back on Home: its own right side again',rail().join()==='home-distance,home-answer,home-dash,home-turret-panel',rail().join());

// restart keeps it; outer screen untouched
w.eval('saveDB()');await wait(60);const ls=w.localStorage.getItem(SK);
const r=await open(ls);r.eval(`gotoPage('home')`);await wait(30);
const rrail=[...r.document.getElementById('sol-rail').children].map(e=>e.id).filter(id=>id&&!['rail-head','pane-sw'].includes(id)&&!r.document.getElementById(id).classList.contains('mod-off'));
chk('restart: sides and order kept',rrail.join()==='home-distance,home-answer,home-dash,home-turret-panel',rrail.join());
const o=await open(ls,412,915);
const ohome=[...o.document.getElementById('page-home').children].filter(e=>e.id&&!e.classList.contains('mod-off')&&!['home-layout-bar','home-setup'].includes(e.id)).map(e=>e.id);
const oexp=JSON.parse(o.eval("JSON.stringify(activeLayout().mods.filter(m=>m.on).map(m=>HOME_MODS[m.id].el))"));
chk('outer screen (412 px): one column in the outer order, untouched',!o.eval('twoPane')&&ohome.join()===oexp.join()&&oexp.includes('home-answer')&&oexp.includes('home-dash'),ohome.join());

// nothing on the right
w.eval(`gotoPage('layouts')`);await wait(10);
for(const id of ['distance','answer','solution','turret','cond']){mv(id);await wait(10);}
chk('all moved back left: the right list says Home uses the full width',sideRows('r').length===0&&/Nothing on the right/.test($('lay-side-r').textContent));
w.eval(`gotoPage('home')`);await wait(30);
chk('…Home on the inner screen is one full-width column: no pane, no Solution button',w.eval('paneShown')==='none'&&w.document.documentElement.classList.contains('pane-none')&&$('pane-show').style.display==='none'&&home().includes('home-dash')&&home().includes('home-answer'));
w.eval(`gotoPage('solver')`);await wait(30);
chk('…the Solver still has its Solution pane',w.eval('paneShown')==='rail'&&rail().join()===std);

// legacy + sanitising
const g=J(`normLayout({id:'x',name:'n',mods:[],modsInner:[{id:'answer',on:1},{id:'cond',on:1},{id:'evil',side:'r'},{id:'turret',on:1,side:'x'},{id:'timer',on:1,side:'r'}]})`);
const side=id=>g.modsInner.find(m=>m.id===id).side;
chk('stored inner order without sides (V2.11–V2.14): reticle / turret / conditions right, others left; bad side → default; own side kept',side('answer')==='l'&&side('cond')==='r'&&side('turret')==='r'&&side('solution')==='r'&&side('timer')==='r'&&g.modsInner.length===J('Object.keys(HOME_MODS).length'));
chk('the outer order carries no side',!J(`normLayout({id:'y',name:'n',mods:[{id:'answer',on:1,side:'r'}]})`).mods.some(m=>'side' in m));
w.eval(`const L=activeLayout();delete L.modsInner;layoutChanged(L);gotoPage('home')`);await wait(30);
chk('"Same as outer screen" (no inner order): standard pane again',rail().join()===std,rail().join());
chk('no uncaught errors',w.errs.length===0&&r.errs.length===0&&o.errs.length===0,w.errs.concat(r.errs,o.errs).join(' | '));
console.log('\nPASS '+pass+'   FAIL '+fail);
process.exit(fail?1:0);
})().catch(e=>{console.error('TEST CRASH:',e);process.exit(1);});
