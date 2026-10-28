// Home layout test (V1.26.0, CORE-16): seeded layouts, Default identical to the previous Home,
// switching (sheet), Benchrest 50/100 m modules with real numbers, chrono → vertical spread, card
// timer, the editor (rename, reorder, on/off, settings, duplicate, delete, new from template),
// persistence, the fold rail, imperial units, escaping, garbage layouts normalised.
// Usage: node homelayouttest.js <app.html> <previous-release.html>   (needs jsdom; see README.md)
const {JSDOM}=require('jsdom'),fs=require('fs');
const [NEW,OLD]=process.argv.slice(2);
const SK='sen_platform_v1';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let pass=0,fail=0;
const chk=(n,ok,extra)=>{console.log((ok?'  PASS  ':'  FAIL  ')+n+(extra?'   '+extra:''));ok?pass++:fail++;};
const all=[];
function setScreen(w,W,H){Object.defineProperty(w,'innerWidth',{configurable:true,value:W});Object.defineProperty(w,'innerHeight',{configurable:true,value:H});
  w.matchMedia=q=>({matches:/coarse/.test(q),addEventListener(){},removeEventListener(){}});}
async function open(file,ls,screen=[390,866]){
  const dom=new JSDOM(fs.readFileSync(file,'utf8'),{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',
    beforeParse(w){w.alert=()=>{};w.confirm=()=>true;if(ls)w.localStorage.setItem(SK,ls);setScreen(w,...screen);
      w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:(t,k)=>k==='measureText'?()=>({width:10}):()=>{}});}});
  const w=dom.window;w.errs=[];w.addEventListener('error',e=>w.errs.push(e.message));
  await wait(700);all.push(w);return w;
}
const J=(w,e)=>JSON.parse(w.eval('JSON.stringify('+e+')'));
const $=(w,id)=>w.document.getElementById(id);
const txt=(w,id)=>$(w,id).textContent;
const session=w=>w.eval(`Bus.setRifle(DB.rifles[0].id);Bus.setProj(DB.projectiles.find(p=>/Queen/.test(p.name)&&p.bcg7>0).id);Bus.setWx('cur',DB.weathers[0].id);Bus.setWx('zero',DB.weathers[0].id);S.mv=255;Bus.setWind(3,90,'manual');Bus.notify();`);
const visibleHome=w=>[...$(w,'page-home').children].filter(e=>e.id&&!e.classList.contains('mod-off')&&e.id!=='home-layout-bar'&&e.id!=='home-setup').map(e=>e.id);
const MODS=['home-dash','home-rail-panel','home-turret-panel','home-livebar','home-tgt','home-manwind','home-cond'];

(async()=>{
console.log('=== HOME LAYOUT TEST: '+NEW+' ===');
// 1. Fresh install: seeded layouts; Default = the previous release's Home.
const o=await open(OLD),w=await open(NEW);
chk('five layouts seeded, Default in use',J(w,'APP.layouts.map(l=>l.name)').join()==='Default,Benchrest 50 m,Benchrest 100 m,PRS,Big bore'&&J(w,'activeLayout().name')==='Default'&&/^Default ▾$/.test(txt(w,'home-layout-name')));
const oldOrder=[...$(o,'page-home').children].map(e=>e.id).filter(id=>MODS.includes(id)||id==='home-setup');
const newOrder=[...$(w,'page-home').children].map(e=>e.id).filter(id=>MODS.includes(id)||id==='home-setup');
chk('Default: same blocks in the same order as the previous release',JSON.stringify(oldOrder)===JSON.stringify(newOrder),newOrder.join(','));
chk('Default: benchrest modules hidden, nothing else hidden',['home-windoff','home-windtable','home-chrono','home-timer','home-course'].every(id=>$(w,id).classList.contains('mod-off'))&&MODS.every(id=>!$(w,id).classList.contains('mod-off')));

// 2. Switch to Benchrest 50 m from the Home sheet.
session(w);await wait(30);
w.eval('openLayoutSheet()');const opt=[...w.document.querySelectorAll('#sbox .navsheet button')];
chk('sheet lists every layout + Manage',opt.map(b=>b.textContent).join('|')==='Default|Benchrest 50 m|Benchrest 100 m|PRS|Big bore|Manage layouts ›');
opt[1].click();await wait(30);
chk('switch sets the fixed distance (50 m) and the name',w.eval('S.dist_m')===50&&txt(w,'home-layout-name')==='Benchrest 50 m ▾');
chk('Benchrest modules shown in template order, turret/bearing/rail hidden',visibleHome(w).join()==='home-dash,home-windoff,home-windtable,home-chrono,home-timer,home-livebar,home-manwind,home-cond,home-inputs',visibleHome(w).join());

// 3. Wind modules are the solver's own numbers on Home's trajectory (physics anchored in runtests).
const want=(w,ws)=>J(w,`(()=>{const tr=homeTraj(),z=zeroConds();return [${ws}].map(v=>{const s=solveShot(tr.pts,nearestPt,z.range,S.dist_m,0,v,90,S.mv,0.1,z.wSpd,z.wDir);return[Math.abs(s.windNetMm).toFixed(1),Math.abs(s.clWind).toFixed(1)];});})()`);
const w3=want(w,'3')[0];
chk('wind offset now = solver: →'+w3[1]+' clicks, '+w3[0]+' mm right (3 m/s from 90° at 50 m)',txt(w,'wo-clk')==='→'+w3[1]&&txt(w,'wo-mm').startsWith(w3[0]+' mm right · 3.0 m/s from 90° rel')&&+w3[0]>9.4&&+w3[0]<10.2,txt(w,'wo-clk')+' | '+txt(w,'wo-mm'));
const rows=[...w.document.querySelectorAll('#wt-body tr')].map(r=>[...r.children].map(c=>c.textContent));
const tbl=want(w,'1,2,3,4,5');
chk('wind table 1–5 m/s = solver (mm and clicks)',rows[0].slice(1).join()==='1.0 m/s,2.0 m/s,3.0 m/s,4.0 m/s,5.0 m/s'&&rows[1].slice(1).join()===tbl.map(x=>x[0]).join()&&rows[2].slice(1).join()===tbl.map(x=>x[1]).join(),JSON.stringify(rows));

// 4. Benchrest 100 m.
w.eval(`useLayout(APP.layouts[2].id)`);await wait(30);
const t100=[...w.document.querySelectorAll('#wt-body tr')][1].children[1].textContent;
chk('100 m: dial ↑36, ~13.2 mm per m/s = solver (V1.30.0 Miller Sg penalty; V1.31.1 defaults read as QNH)',txt(w,'home-elev')==='↑36'&&t100===want(w,'1')[0][0]&&Math.abs(+t100-13.2)<0.4,txt(w,'home-elev')+' '+t100);

// 5. Chrono → vertical spread (EST formula, pbc-anchored).
w.eval(`document.getElementById('ch-mv').value=255;document.getElementById('ch-es').value=5;document.getElementById('ch-sd').value=1.2;useChronoMV()`);
w.eval(`useLayout(APP.layouts[1].id)`);await wait(30);
chk('chrono: ES 5 at 50 m ≈ 7.6 mm vertical (pbc 7.54 at the unpenalised BC; V1.30.0 Miller Sg penalty, V1.31.1 QNH defaults)',/^ES 5\.0 m\/s ≈ 7\.6 mm vertical spread at 50 m$/.test(txt(w,'cr-vert'))&&txt(w,'cr-sd')==='1.2 m/s',txt(w,'cr-vert'));

// 6. Card timer.
const realNow=w.Date.now;let fake=realNow();w.Date.now=()=>fake;
w.eval('timerStart()');fake+=61000;w.eval('renderTimer()');
w.eval('timerShot(1);timerShot(1);timerShot(1);timerShot(-1)');
chk('timer: 20:00 card counts down (18:59), shots 2 of 25',txt(w,'tm-left')==='18:59'&&txt(w,'tm-shots')==='2 of 25'&&txt(w,'tm-head')==='Card · 20:00');
w.eval('timerStart()');chk('second tap resets',txt(w,'tm-left')==='20:00'&&txt(w,'tm-shots')==='0 of 25');
w.Date.now=realNow;

// 7. Editor.
w.eval("gotoPage('layouts')");await wait(20);
const rowsL=[...w.document.querySelectorAll('#lay-list .lay-row')];
chk('Layouts page lists all five, the active one marked',rowsL.length===5&&/in use/.test(rowsL[1].textContent));
[...rowsL[1].querySelectorAll('button')].find(b=>b.textContent==='Edit').click();await wait(20);
const nm=$(w,'lay-name-in');nm.value='Polzela league';nm.dispatchEvent(new w.Event('input'));
chk('rename shows on Home at once',txt(w,'home-layout-name')==='Polzela league ▾');
const modRow=id=>w.document.querySelector('#lay-edit .lay-mod[data-mod="'+id+'"]');
modRow('chrono').querySelector('button[aria-label^="Move"]').click();await wait(20);
chk('▲ moves Chrono above the wind table on Home',visibleHome(w).indexOf('home-chrono')<visibleHome(w).indexOf('home-windtable'),visibleHome(w).join());
[...modRow('turret').querySelectorAll('button')].pop().click();await wait(20);
chk('Off → On shows the turret panel',!$(w,'home-turret-panel').classList.contains('mod-off'));
const ins=w.document.querySelectorAll('#lay-edit input[type=number]');
w.eval(`(()=>{const i=document.querySelectorAll('#lay-edit input[type=number]');i[1].value=15;i[1].dispatchEvent(new Event('change'));})()`);await wait(20);
chk('timer setting → Card · 15:00',txt(w,'tm-head')==='Card · 15:00');
chk('fixed-distance and timer fields are classified for the unit layer',ins[0].dataset.q==='range'&&ins[1].dataset.q==='-'&&ins[2].dataset.q==='-');
[...w.document.querySelectorAll('#lay-list .lay-row')][1].querySelector('button:nth-of-type(2)').click();await wait(20);
chk('Duplicate adds "… copy" right after and opens it',J(w,'APP.layouts.map(l=>l.name)')[2]==='Polzela league copy'&&$(w,'lay-name-in').value==='Polzela league copy');
w.eval("newLayout('blank')");
chk('New from Blank: only solution + inputs on',J(w,"APP.layouts[APP.layouts.length-1].mods.filter(m=>m.on).map(m=>m.id)").join()==='solution,inputs');
const before=J(w,'APP.layouts.length');w.eval(`delLayout(APP.layouts[APP.layouts.length-1].id)`);
chk('Delete removes it',J(w,'APP.layouts.length')===before-1);
w.eval(`APP.layouts.slice(1).forEach(l=>delLayout(l.id))`);
const lastBtns=[...w.document.querySelectorAll('#lay-list .lay-row button')].map(b=>b.textContent);
chk('the last layout cannot be deleted',J(w,'APP.layouts.length')===1&&!lastBtns.includes('Delete'),lastBtns.join());

// 8. Persistence + boot applies the active layout.
w.eval("newLayout('br100');useLayout(APP.layouts[1].id);saveDB()");await wait(50);
const r=await open(NEW,w.localStorage.getItem(SK));
chk('restart: layouts, active layout and Home order restored',J(r,'APP.layouts.map(l=>l.name)').join()==='Default,Benchrest 100 m'&&txt(r,'home-layout-name')==='Benchrest 100 m ▾'&&visibleHome(r)[1]==='home-windoff');
chk('restart: chrono values kept',J(r,'APP.chrono.es')===5);

// 9. Fold rail with a layout.
const f=await open(NEW,w.localStorage.getItem(SK),[784,724]);
const railIds=()=>[...$(f,'sol-rail').children].map(e=>e.id).filter(Boolean).join();
chk('unfolded: rail holds solution, turret, conditions; turret stays hidden',railIds()==='rail-head,home-dash,home-turret-panel,home-cond'&&$(f,'home-turret-panel').classList.contains('mod-off'));
f.eval('useLayout(APP.layouts[0].id)');await wait(30);
chk('switching while unfolded: no duplicates, turret shown again in the rail',['home-dash','home-turret-panel','home-cond','home-windoff'].every(id=>f.document.querySelectorAll('#'+id).length===1)&&!$(f,'home-turret-panel').classList.contains('mod-off'));
setScreen(f,390,866);f.dispatchEvent(new f.Event('resize'));await wait(200);
chk('fold back: Home in the Default layout order',[...$(f,'page-home').children].map(e=>e.id).filter(id=>MODS.includes(id)).join()===MODS.join(),[...$(f,'page-home').children].map(e=>e.id).join());

// 10. Imperial, escaping, garbage.
w.eval("useLayout(APP.layouts[1].id);['range','drop','wind','vel'].forEach((k,i)=>setUnit(k,['yd','in','mph','fps'][i]))");await wait(30);
const imp=txt(w,'wo-mm')+txt(w,'cr-vert')+$(w,'wt-body').textContent;
chk('imperial: Benchrest modules show in / mph / yd, table steps 1–5 mph, no metric',!/\d\s?(mm|m\/s|m)\b/.test(imp)&&/ in right/.test(txt(w,'wo-mm'))&&[...$(w,'wt-body').firstChild.children].slice(1).map(c=>c.textContent).join()==='1.0 mph,2.0 mph,3.0 mph,4.0 mph,5.0 mph',imp.slice(0,160));
w.eval(`activeLayout().name='<img src=x id=pwn>';applyHomeLayout();gotoPage('layouts');openLayoutSheet()`);
chk('layout names are text, never HTML',!w.document.getElementById('pwn')&&/<img/.test(txt(w,'home-layout-name')));
w.eval('closeSheet()');
const g=J(w,`normLayout({id:5,name:'x'.repeat(99),mods:[{id:'evil'},{id:'chrono',on:1},{id:'chrono',on:0},null],set:{dist:-3,timerMin:'a',shots:1e9}})`);
chk('garbage layout normalised (known modules once each, sane settings)',g.mods.length===13&&g.mods[0].id==='chrono'&&g.mods[0].on===true&&g.name.length===40&&g.set.dist===null&&g.set.timerMin===20&&g.set.shots===999&&typeof g.id==='string');

const errs=all.flatMap(x=>x.errs);
chk('ZERO uncaught errors',errs.length===0,errs.slice(0,3).join(' / '));
console.log('\nPASS '+pass+'   FAIL '+fail);
process.exit(fail?1:0);
})().catch(e=>{console.error('TEST CRASH:',e);process.exit(1);});
