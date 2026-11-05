// Customisation test (V2.11.0 r8): choosable bottom bar, drag to reorder Home modules, and a separate
// module order for the inner (unfolded) screen.
// Bar: default Home · Advanced · Wind · Dope · More (More sheet = the other 9 pages); a slot takes any page,
// choosing one already on the bar swaps them; a page off the bar lights More and is in its sheet (Advanced
// from the sheet reopens its last sub-tab); remembered across a restart; garbage normalised; Default bar.
// Modules: dragging a row by its grip reorders the list and Home; the inner screen follows the outer order
// until it gets its own; its own order and on/off apply only when two-pane; "Same as outer" drops it;
// stored layouts keep it, sanitised. Text only, no errors.
// Usage: node customtest.js <app.html>   (needs jsdom; see README.md)
const {JSDOM}=require('jsdom'),fs=require('fs');
const FILE=process.argv[2];
const SK='sen_platform_v1';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let pass=0,fail=0;
const chk=(n,ok,extra)=>{console.log((ok?'  PASS  ':'  FAIL  ')+n+(extra?'   '+extra:''));ok?pass++:fail++;};
async function open(ls,W=412,H=915){
  const dom=new JSDOM(fs.readFileSync(FILE,'utf8'),{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',
    beforeParse(w){Object.defineProperty(w,'innerWidth',{configurable:true,value:W});Object.defineProperty(w,'innerHeight',{configurable:true,value:H});
      w.alert=()=>{};w.confirm=()=>true;w.scrollTo=()=>{};if(ls)w.localStorage.setItem(SK,ls);
      w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:(t,k)=>k==='measureText'?()=>({width:10}):()=>{}});}});
  const w=dom.window;w.errs=[];w.addEventListener('error',e=>w.errs.push(e.message));await wait(700);return w;
}
(async()=>{
console.log('=== CUSTOMISATION TEST: '+FILE+' ===');
const w=await open();
const $=id=>w.document.getElementById(id),J=e=>JSON.parse(w.eval('JSON.stringify('+e+')'));
const bar=()=>[...$('nav').children].map(b=>b.id==='nav-adv'?'adv':b.id==='nav-more'?'more':b.dataset.page).join();
const sheet=()=>{w.eval('openMore()');const r=[...w.document.querySelectorAll('#sbox .navsheet button')].map(b=>b.dataset.page);w.eval('closeSheet()');return r;};

// 1. Bottom bar
chk('default bar: Home · Advanced · Wind · Dope · More',bar()==='home,adv,wind,dope,more',bar());
chk('…More sheet holds the other 9 pages',sheet().join()==='stab,bench,truing,holds,profiles,sensors,layouts,formulas,settings',sheet().join());
w.eval(`gotoPage('settings')`);
const sel=()=>[...$('nav-panel').querySelectorAll('select')];
chk('Settings → Bottom bar: Home fixed, three slots, More fixed',sel().length===3&&sel().map(s=>s.value).join()==='adv,wind,dope'&&/Home/.test($('nav-panel').textContent)&&/More/.test($('nav-panel').textContent));
const pick=(i,v)=>{const s=sel()[i];s.value=v;s.dispatchEvent(new w.Event('change'));};
pick(2,'holds');await wait(10);
chk('slot 3 → Holds: bar Home · Advanced · Wind · Holds · More',bar()==='home,adv,wind,holds,more',bar());
chk('…Dope moved into the More sheet, Holds out of it',sheet().includes('dope')&&!sheet().includes('holds'));
w.document.querySelector('#nav button[data-page="holds"]').click();
chk('…tap Holds on the bar: Holds page, its tab lit, More not',w.eval('curPage()')==='holds'&&w.document.querySelector('#nav button[data-page="holds"]').classList.contains('on')&&!$('nav-more').classList.contains('on'));
w.eval(`gotoPage('dope')`);chk('…Dope now lights More',$('nav-more').classList.contains('on'));
w.eval(`gotoPage('settings')`);pick(0,'wind');await wait(10);
chk('choosing a page already on the bar swaps the two (Wind ↔ Advanced)',bar()==='home,wind,adv,holds,more',bar());
w.eval(`gotoPage('settings')`);pick(1,'');await wait(10);
chk('a slot set to "—" removes Advanced from the bar',bar()==='home,wind,holds,more'&&!$('nav-adv'),bar());
w.eval(`APP.advLast='solver';gotoPage('traj')`);
chk('…Trajectory then lights More',$('nav-more').classList.contains('on'));
w.eval(`gotoPage('home');openMore()`);const advBtn=[...w.document.querySelectorAll('#sbox .navsheet button')].find(b=>b.dataset.page==='adv');
advBtn.click();
chk('…and Advanced in the More sheet reopens the last sub-tab',w.eval('curPage()')==='traj'||w.eval('curPage()')==='solver');
w.eval('saveDB()');await wait(50);
const r=await open(w.localStorage.getItem(SK));
chk('bar remembered after a restart',[...r.document.getElementById('nav').children].map(b=>b.id==='nav-more'?'more':b.dataset.page).join()==='home,wind,holds,more');
w.eval(`APP.navTabs=['evil','wind','wind',42,'dope','stab','holds'];renderNav()`);
chk('garbage in the stored bar normalised (known pages, once, three at most)',bar()==='home,wind,dope,stab,more',bar());
w.eval(`gotoPage('settings')`);[...$('nav-panel').querySelectorAll('button')].find(b=>b.textContent==='Default bar').click();await wait(10);
chk('Default bar restores Home · Advanced · Wind · Dope',bar()==='home,adv,wind,dope,more'&&J('APP.navTabs')===null);

// 2. Drag to reorder Home modules (grip)
w.eval(`useLayout(APP.layouts.find(l=>l.tpl==='field').id);layoutEditId=activeLayout().id;layEditScreen='outer';gotoPage('layouts')`);await wait(20);
const rows=()=>[...$('lay-edit').querySelectorAll('.lay-mod')];
// give each row a real box (jsdom does no layout): 56 px rows from y = 100
rows().forEach((r,i)=>{r.getBoundingClientRect=()=>({top:100+56*[...r.parentNode.children].indexOf(r),height:56,bottom:156+56*[...r.parentNode.children].indexOf(r),left:0,right:400,width:400});});
const order0=J('activeLayout().mods.map(m=>m.id)');
const grip=rows().find(r=>r.dataset.mod==='devices').querySelector('.lay-grip');
const pe=(el,type,y)=>{const e=new w.MouseEvent(type,{bubbles:true,cancelable:true,clientX:20,clientY:y,button:0});Object.defineProperty(e,'pointerId',{value:3});el.dispatchEvent(e);};
pe(grip,'pointerdown',100+56*3+28);pe(grip,'pointermove',100+56*1+10);pe(grip,'pointermove',100+10);
const lifted=rows().find(r=>r.dataset.mod==='devices').classList.contains('lay-drag'),slid=rows().filter(r=>r.dataset.mod!=='devices').some(r=>r.style.transition.includes('transform'));
pe(grip,'pointerup',110);await wait(20);const settling=rows().find(r=>r.dataset.mod==='devices').classList.contains('lay-settle');await wait(300);
chk('r9 animation: the held row lifts, the rows it passes slide, it settles on release',lifted&&slid&&settling,[lifted,slid,settling].join());
const order1=J('activeLayout().mods.map(m=>m.id)');
chk('drag Devices by its grip to the top → saved first',order1[0]==='devices'&&order1.slice(1).join()===order0.filter(x=>x!=='devices').join(),order1.slice(0,5).join());
const vis=()=>[...$('page-home').children].filter(e=>e.id&&!e.classList.contains('mod-off')&&!['home-layout-bar','home-setup'].includes(e.id)).map(e=>e.id);
chk('…Home shows Devices first',vis()[0]==='home-devices',vis().join());

// 3. Inner screen order
w.eval(`layEditScreen='inner';renderLayoutEditor()`);
chk('inner screen follows the outer order until it gets its own (rows read-only)',!J('Array.isArray(activeLayout().modsInner)')&&rows().every(r=>r.querySelector('.lay-grip').disabled)&&/uses the outer screen/.test($('lay-edit').textContent));
$('lay-own').click();await wait(20);
chk('"Give the inner screen its own order" copies the outer one',J('activeLayout().modsInner.map(m=>m.id)').join()===J('activeLayout().mods.map(m=>m.id)').join()&&!rows()[0].querySelector('.lay-grip').disabled);
w.eval(`const L=activeLayout(),i=L.modsInner.findIndex(m=>m.id==='solution');L.modsInner.unshift(...L.modsInner.splice(i,1));L.modsInner.find(m=>m.id==='devices').on=false;layoutChanged(L);`);
chk('inner order edited; the outer order is untouched',J('activeLayout().modsInner[0].id')==='solution'&&J('activeLayout().mods[0].id')==='devices');
chk('on the outer screen Home keeps the outer order',vis()[0]==='home-devices');
w.eval('saveDB()');await wait(50);
const f=await open(w.localStorage.getItem(SK),780,720);
const fvis=[...f.document.getElementById('page-home').children].filter(e=>e.id&&!e.classList.contains('mod-off')&&!['home-layout-bar','home-setup'].includes(e.id)).map(e=>e.id);
chk('opened unfolded (780 px): Home uses the inner order and on/off (devices off)',f.eval('twoPane')===true&&!fvis.includes('home-devices')&&f.document.getElementById('home-devices').classList.contains('mod-off'),fvis.join());
Object.defineProperty(f,'innerWidth',{configurable:true,value:412});Object.defineProperty(f,'innerHeight',{configurable:true,value:915});f.eval('applyLayout()');await wait(30);
const ovis=[...f.document.getElementById('page-home').children].filter(e=>e.id&&!e.classList.contains('mod-off')&&!['home-layout-bar','home-setup'].includes(e.id)).map(e=>e.id);
chk('fold back to the outer screen: outer order again (Devices first)',ovis[0]==='home-devices',ovis.join());
$('lay-own').click();await wait(20);
chk('"Same as outer screen" drops the inner order',!J('Array.isArray(activeLayout().modsInner)'));
const g=J(`normLayout({id:'x',name:'n',mods:[],modsInner:[{id:'evil'},{id:'answer',on:1},{id:'answer',on:0}]})`);
chk('stored inner order sanitised like the outer one',g.modsInner.length===J('Object.keys(HOME_MODS).length')&&g.modsInner[0].id==='answer'&&g.modsInner[0].on===true);
chk('no uncaught errors',w.errs.length===0&&f.errs.length===0,w.errs.concat(f.errs).join(' | '));
console.log('\nPASS '+pass+'   FAIL '+fail);
process.exit(fail?1:0);
})().catch(e=>{console.error('TEST CRASH:',e);process.exit(1);});
