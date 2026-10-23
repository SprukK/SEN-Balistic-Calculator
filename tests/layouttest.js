// Layout test (V1.24.0, CORE-04): screen classification by shape, two-pane inner-screen layout
// with the live solution rail (reticle + elevation/windage, turret panel, conditions), live
// updates on other tabs, fold/unfold round trip restoring the exact original order, every tab
// still navigable, Settings screen info.
// Usage: node layouttest.js <app.html>   (needs jsdom; see README.md)
const {JSDOM}=require('jsdom'),fs=require('fs');
const FILE=process.argv[2];
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let pass=0,fail=0;
const chk=(n,ok,extra)=>{console.log((ok?'  PASS  ':'  FAIL  ')+n+(extra?'   '+extra:''));ok?pass++:fail++;};
const OUTER=[390,866],INNER=[784,724],INNER_ROT=[724,784];

function setScreen(w,[W,H],coarse=true){
  Object.defineProperty(w,'innerWidth',{configurable:true,value:W});
  Object.defineProperty(w,'innerHeight',{configurable:true,value:H});
  w.matchMedia=q=>({matches:/pointer:\s*coarse/.test(q)?coarse:false,addEventListener(){},removeEventListener(){}});
}
async function open(screen){
  const dom=new JSDOM(fs.readFileSync(FILE,'utf8'),{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',
    beforeParse(w){setScreen(w,screen);w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:(t,k)=>k==='measureText'?()=>({width:10}):()=>{}});}});
  const w=dom.window;w.errs=[];w.addEventListener('error',e=>w.errs.push(e.message));
  await wait(700);
  w.eval(`Bus.setRifle(DB.rifles[0].id);Bus.setProj(DB.projectiles.find(p=>/Queen/.test(p.name)).id);Bus.setWx('cur',DB.weathers[0].id);Bus.setWx('zero',DB.weathers[0].id);S.dist_m=150;Bus.notify();`);
  await wait(50);return w;
}
const resize=async(w,screen,coarse)=>{setScreen(w,screen,coarse);w.dispatchEvent(new w.Event('resize'));await wait(200);};
const homeOrder=w=>[...w.document.getElementById('page-home').children].map(e=>e.id||e.className).join(',');
const railIds=w=>[...w.document.getElementById('sol-rail').children].map(e=>e.id).filter(Boolean).join(',');
const isFold=w=>w.document.documentElement.classList.contains('fold');

(async()=>{
console.log('=== LAYOUT TEST: '+FILE+' ===');
const w=await open(OUTER);

// 1. Classification by shape.
const cases=[[[390,866],true,'phone'],[[784,724],true,'inner'],[[724,784],true,'inner'],[[1440,900],false,'wide'],[[1024,768],true,'wide'],[[800,800],false,'wide']];
const wrong=cases.filter(([[W,H],c,want])=>w.eval(`layoutMode(${W},${H},${c})`)!==want);
chk('outer phone, inner fold (both orientations), desktop, landscape tablet, mouse square',wrong.length===0,JSON.stringify(wrong));

// 2. Outer screen: phone layout exactly as before.
const original=homeOrder(w);
chk('outer screen: no fold class, rail empty, Home intact',!isFold(w)&&railIds(w)==='rail-head'&&!!w.document.querySelector('#page-home #home-dash'));

// 3. Unfold → two panes with the rail.
await resize(w,INNER);
chk('inner screen: fold layout on',isFold(w)&&w.eval('layout')==='inner');
chk('rail holds reticle/solution, turret panel, conditions — in that order',railIds(w)==='rail-head,home-dash,home-turret-panel,home-cond',railIds(w));
chk('each moved block exists exactly once',['home-dash','home-turret-panel','home-cond','home-elev','home-wind','ht-sum','home-windspd'].every(id=>w.document.querySelectorAll('#'+id).length===1));
chk('shot inputs stay on the Home tab (left pane)',!!w.document.querySelector('#page-home #home-dist'));

// 4. The rail stays live on other tabs.
w.eval("gotoPage('wind')");
const before=w.document.getElementById('home-wind').textContent;
w.eval("Bus.setWind(7,90,'manual')");await wait(30);
chk('wind changed on the Wind tab → rail windage updates',w.document.getElementById('home-wind').textContent!==before&&/→/.test(w.document.getElementById('home-wind').textContent),before+' → '+w.document.getElementById('home-wind').textContent);
w.eval("gotoPage('traj');S.dist_m=200;Bus.notify()");await wait(30);
chk('distance changed on another tab → rail header follows',/Solution · 200 m/.test(w.document.getElementById('rail-head').textContent),w.document.getElementById('rail-head').textContent);
w.eval("setTurretMode('manual');turretStep('e',5)");await wait(20);
chk('turret panel works from the rail',/5/.test(w.document.getElementById('ht-elev-val').textContent),w.document.getElementById('ht-elev-val').textContent);
w.eval("turretReset();setTurretMode('match')");

// 5. Every tab still works in two-pane mode.
let bad=[];for(const p of ['home','traj','solver','wind','dope','stab','truing','holds','profiles','sensors','formulas','settings']){const e0=w.errs.length;w.eval(`gotoPage('${p}')`);if(w.errs.length!==e0||!w.document.getElementById('page-'+p).classList.contains('active'))bad.push(p);}
w.eval("openMore()");const more=w.document.querySelectorAll('#sbox .navsheet button').length;w.eval('closeSheet()');
chk('all 12 tabs and the More sheet work with the rail',bad.length===0&&more===7,bad.join(','));

// 6. Rotation keeps the layout; folding back restores the exact original order.
await resize(w,INNER_ROT);
chk('rotated inner screen stays two-pane',isFold(w)&&railIds(w)==='rail-head,home-dash,home-turret-panel,home-cond');
await resize(w,OUTER);
chk('fold back: phone layout, rail empty',!isFold(w)&&railIds(w)==='rail-head');
chk('Home blocks back in their exact original order',homeOrder(w)===original,homeOrder(w));
chk('no placeholder markers left',w.document.querySelectorAll('[data-rail-home]').length===0);
await resize(w,INNER);await resize(w,OUTER);await resize(w,INNER);
chk('repeated fold/unfold: still exactly one of each block',['home-dash','home-turret-panel','home-cond'].every(id=>w.document.querySelectorAll('#'+id).length===1)&&railIds(w)==='rail-head,home-dash,home-turret-panel,home-cond');

// 7. Settings reports what was detected.
w.eval("gotoPage('settings')");
chk('Settings shows screen size and detected layout',/784 × 724 CSS px · touch · layout: fold inner screen/.test(w.document.getElementById('screen-info').textContent),w.document.getElementById('screen-info').textContent);

// 8. Booting directly on the inner screen.
const w2=await open(INNER);
chk('app opened unfolded starts in two-pane layout',isFold(w2)&&railIds(w2)==='rail-head,home-dash,home-turret-panel,home-cond');

const errs=[...w.errs,...w2.errs];
chk('ZERO uncaught errors',errs.length===0,errs.slice(0,3).join(' / '));
console.log('\nPASS '+pass+'   FAIL '+fail);
process.exit(fail?1:0);
})().catch(e=>{console.error('TEST CRASH:',e);process.exit(1);});
