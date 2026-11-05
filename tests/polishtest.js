// Polish test (V2.11.0 r10): Truing sub-tabs, empty right-pane hint, wide-table hint, profile ⋯ menu,
// flatter panels.
// Truing: four tools tagged, one shown at a time (also in the right pane), remembered, Velocity first by default.
// Empty pane: shows what will appear, per page / tool; hides once a result is there. Tables: a table wider than
// its box gets the fade + "swipe" hint (inside the box), gone at the right end. Profiles: ☆ stays, the other
// four actions move into a ⋯ sheet that runs the original buttons; tapping the name edits. Panels: sections,
// results stay cards. Text only, no errors.
// Usage: node polishtest.js <app.html>   (needs jsdom; see README.md)
const {JSDOM}=require('jsdom'),fs=require('fs');
const FILE=process.argv[2];
const SK='sen_platform_v1';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let pass=0,fail=0;
const chk=(n,ok,extra)=>{console.log((ok?'  PASS  ':'  FAIL  ')+n+(extra?'   '+extra:''));ok?pass++:fail++;};
async function open(ls,W=412,H=915){
  const dom=new JSDOM(fs.readFileSync(FILE,'utf8'),{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',
    beforeParse(w){Object.defineProperty(w,'innerWidth',{configurable:true,value:W});Object.defineProperty(w,'innerHeight',{configurable:true,value:H});
      w.alert=()=>{};w.confirm=()=>true;w.scrollTo=()=>{};w.prompt=(q,d)=>d||'Test';if(ls)w.localStorage.setItem(SK,ls);
      w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:(t,k)=>k==='measureText'?()=>({width:10}):()=>{}});}});
  const w=dom.window;w.errs=[];w.addEventListener('error',e=>w.errs.push(e.message));await wait(700);return w;
}
(async()=>{
console.log('=== POLISH TEST: '+FILE+' ===');
const css=fs.readFileSync(FILE,'utf8');
const w=await open();
const $=id=>w.document.getElementById(id);
w.eval(`Bus.setRifle(DB.rifles.find(r=>/\\.25/.test(r.name)).id);Bus.setProj(DB.projectiles.find(p=>/^Altaros ATP Queen/.test(p.name)).id);Bus.setWx('cur',DB.weathers[0].id);Bus.notify();`);await wait(30);

// 1. Truing sub-tabs
w.eval(`gotoPage('truing')`);await wait(30);
const groups=k=>[...w.document.querySelectorAll('body [data-tt="'+k+'"]')].map(e=>e.id||e.className.split(' ')[0]);
chk('four Truing tools tagged: Velocity, Impacts, BC / SD, MV–temp',groups('vel').length===2&&groups('imp').length===2&&groups('bc').length===3&&groups('mvt').length===3,['vel','imp','bc','mvt'].map(k=>k+':'+groups(k).join('+')).join(' '));
chk('Velocity first by default, its tab selected',w.document.documentElement.dataset.tt==='vel'&&w.document.querySelector('.trtabs button.on').dataset.trt==='vel');
chk('CSS shows only the chosen tool (page and right pane)',/html\[data-tt="vel"\] \[data-tt\]:not\(\[data-tt="vel"\]\)/.test(css)&&/html\[data-tt="mvt"\] \[data-tt\]:not\(\[data-tt="mvt"\]\)\{display:none!important\}/.test(css));
[...w.document.querySelectorAll('.trtabs button')].find(b=>b.dataset.trt==='imp').click();await wait(20);
chk('tap Impacts → that tool, remembered',w.document.documentElement.dataset.tt==='imp'&&w.eval('APP.truTab')==='imp');
w.eval('saveDB()');await wait(50);
const r=await open(w.localStorage.getItem(SK));r.eval(`gotoPage('truing')`);await wait(20);
chk('…after a restart Truing opens on Impacts',r.document.documentElement.dataset.tt==='imp');
w.eval(`setTruTab('nonsense')`);chk('unknown tab → Velocity',w.document.documentElement.dataset.tt==='vel');

// 2. Empty right pane (inner screen)
const f=await open(null,780,720);
f.eval(`gotoPage('bench')`);await wait(150);
const pe=()=>f.document.querySelector('#sol-rail .pane-empty');
chk('inner screen, Bench without a design: the right pane says what will appear',f.eval('paneShown')==='page'&&!pe().hidden&&/drawing, mass, SD/.test(pe().textContent),pe().textContent);
f.eval(`benchNew&&benchNew()`);await wait(250);
chk('…a design: the hint goes',pe().hidden===true);
f.eval(`gotoPage('truing');setTruTab('vel')`);await wait(250);
chk('Truing Velocity before solving: its own hint',!pe().hidden&&/measured velocity downrange/.test(pe().textContent),pe().textContent);
f.eval(`setTruTab('bc')`);await wait(250);
chk('…BC / SD shows its result card, no hint',pe().hidden===true);
chk('the hint has no id (Main tests list the pane by id)',!pe().id);

// 3. Wide-table hint
w.eval(`gotoPage('traj')`);await wait(30);
const tb=w.document.querySelector('#page-traj .tablebox');
Object.defineProperty(tb,'scrollWidth',{configurable:true,get:()=>600});Object.defineProperty(tb,'clientWidth',{configurable:true,get:()=>360});
w.eval('tblHints()');
const hint=tb.querySelector(':scope > .xs-hint');
chk('a table wider than its box: fade + "swipe" hint inside the box',tb.classList.contains('xs')&&!tb.classList.contains('xs-end')&&hint&&!hint.hidden&&/Swipe/.test(hint.textContent));
tb.scrollLeft=240;tb.dispatchEvent(new w.Event('scroll'));
chk('…scrolled to the right end: fade and hint gone',tb.classList.contains('xs-end')&&hint.hidden===true);
Object.defineProperty(tb,'scrollWidth',{configurable:true,get:()=>360});tb.scrollLeft=0;w.eval('tblHints()');
chk('…a table that fits: no fade, no hint',!tb.classList.contains('xs')&&hint.hidden===true);
chk('fade is a mask on the right edge',/\.tablebox\.xs:not\(\.xs-end\)[^{]*\{-webkit-mask-image:linear-gradient\(to right/.test(css));

// 4. Profile ⋯ menu
w.eval(`gotoPage('profiles')`);await wait(30);w.eval('profMenus()');
const row=w.document.querySelector('#pl-rifles .pitem'),vis=[...row.querySelectorAll('.pacts button')].filter(b=>!b.classList.contains('dup-hide')).map(b=>b.textContent);
chk('profile row: ☆ and ⋯ visible, Edit / Clone / Share / ✕ moved behind ⋯',vis.join()==='☆,⋯'&&['[data-e]','[data-c]','[data-sh]','[data-d]'].every(s=>row.querySelector(s).classList.contains('dup-hide')),vis.join());
row.querySelector('.pmenu').click();await wait(20);
chk('⋯ → sheet titled with the profile: Edit, Clone, Share, Delete',/RTI Mora \.25/.test(w.document.querySelector('#sbox h3').textContent)&&[...w.document.querySelectorAll('#sbox .flist button')].map(b=>b.textContent).join()==='Edit,Clone,Share,Delete');
const n0=w.eval('DB.rifles.length');[...w.document.querySelectorAll('#sbox .flist button')].find(b=>b.textContent==='Clone').click();await wait(30);
chk('…Clone runs the original action (one more rifle) and closes the sheet',w.eval('DB.rifles.length')===n0+1&&!$('sheet').classList.contains('open'));
w.eval('profMenus()');
let opened=null;w.eval('window._of=openRifleForm;openRifleForm=id=>{window._opened=id;}');
w.document.querySelector('#pl-rifles .pitem .pitem-open').click();
chk('tapping the name opens Edit for that profile',typeof w.eval('window._opened')==='string');
w.eval('openRifleForm=window._of');
chk('re-render keeps one ⋯ per row',[...w.document.querySelectorAll('#pl-rifles .pitem')].every(p=>p.querySelectorAll('.pmenu').length===1));

// 5. Flatter panels
chk('panels are sections (no box), results stay cards',/\.panel\{background:transparent;border:none;border-top:1px solid var\(--border2\);border-radius:0/.test(css)&&!/\.outcard\{background:transparent/.test(css));
w.eval(`DB.rifles[0].name='<img src=x id=pwn>';renderProfiles();bindProfActs();profMenus();document.querySelector('#pl-rifles .pmenu').click()`);
chk('menu title is text, never HTML',!w.document.getElementById('pwn'));
chk('no uncaught errors',w.errs.length===0&&f.errs.length===0,w.errs.concat(f.errs).join(' | '));
console.log('\nPASS '+pass+'   FAIL '+fail);
process.exit(fail?1:0);
})().catch(e=>{console.error('TEST CRASH:',e);process.exit(1);});
