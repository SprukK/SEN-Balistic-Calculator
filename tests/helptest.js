// Help text + unit presets test (V2.11.0 r5).
// Help: the static explanations are marked .hlp (21), never a live result, warning or empty state; each
// gets one ⓘ (in its panel title, or a "How this works" button when outside a panel); closed by default;
// a tap opens that panel only and is remembered across a restart; Settings "Always show" opens all;
// a Settings re-render keeps one ⓘ per panel. Units: Metric / Imperial presets set every quantity except
// angular and locked ones; a secondary equal to the new primary turns off (as setUnit); custom detected
// and described against the closer preset; the per-unit table's selects drive setUnit / setSec; the
// answer on Home in imperial equals the solver.
// Usage: node helptest.js <app.html>   (needs jsdom; see README.md)
const {JSDOM}=require('jsdom'),fs=require('fs');
const FILE=process.argv[2];
const SK='sen_platform_v1';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let pass=0,fail=0;
const chk=(n,ok,extra)=>{console.log((ok?'  PASS  ':'  FAIL  ')+n+(extra?'   '+extra:''));ok?pass++:fail++;};
async function open(ls){
  const dom=new JSDOM(fs.readFileSync(FILE,'utf8'),{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',
    beforeParse(w){Object.defineProperty(w,'innerWidth',{configurable:true,value:412});Object.defineProperty(w,'innerHeight',{configurable:true,value:915});
      w.alert=()=>{};w.confirm=()=>true;w.scrollTo=()=>{};if(ls)w.localStorage.setItem(SK,ls);
      w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:(t,k)=>k==='measureText'?()=>({width:10}):()=>{}});}});
  const w=dom.window;w.errs=[];w.addEventListener('error',e=>w.errs.push(e.message));await wait(700);return w;
}
(async()=>{
console.log('=== HELP + UNIT PRESETS TEST: '+FILE+' ===');
const w=await open();
const $=id=>w.document.getElementById(id);
const J=e=>JSON.parse(w.eval('JSON.stringify('+e+')'));
w.eval(`Bus.setRifle(DB.rifles.find(r=>/\\.25/.test(r.name)).id);Bus.setProj(DB.projectiles.find(p=>/^Altaros ATP Queen/.test(p.name)).id);
  Bus.setWx('cur',DB.weathers[0].id);Bus.setWx('zero',DB.weathers[0].id);S.mv=255;S.dist_m=100;Bus.notify();gotoPage('settings')`);await wait(40);

// 1. Help marking
const hlp=[...w.document.querySelectorAll('.hlp')];
chk('21 static explanations marked as help (r8: + bottom bar, r11: + colours)',hlp.length===21,String(hlp.length));
const live=['home-status','rf-src-home','cal-mount-note','td-ctx','tr-atmo-note','sv-travel-note','wd-mode-note','home-turret-note','screen-info','store-info','fx-sum','bn-empty','ch-hint','u-sum'];
chk('live results, status lines, empty states and hints are never help',live.every(id=>!$(id)||!$(id).classList.contains('hlp')),live.filter(id=>$(id)&&$(id).classList.contains('hlp')).join());
chk('warnings are never help',[...w.document.querySelectorAll('.flag.warn,.flag.bad')].every(e=>!e.classList.contains('hlp')));
const boxes=hlp.map(n=>n.closest('.panel')||n);const uniq=[...new Set(boxes)];
chk('one ⓘ per panel holding help (in its title) or a "How this works" button for help outside a panel',uniq.every(b=>b._hb&&(b.classList.contains('panel')?b.querySelectorAll(':scope .help-btn').length===1:b._hb.classList.contains('solo')&&/How this works/.test(b._hb.textContent))));
chk('closed by default',uniq.every(b=>!b.classList.contains('help-open')&&b._hb.getAttribute('aria-expanded')==='false')&&!w.document.documentElement.classList.contains('help-all'));
const css=fs.readFileSync(FILE,'utf8');
chk('CSS hides help in closed panels unless "Always show"',/html:not\(\.help-all\) \.panel:not\(\.help-open\) \.hlp,html:not\(\.help-all\) \.hlp\.solo:not\(\.help-open\)\{display:none\}/.test(css));

// 2. Open one panel; remembered
const sens=[...w.document.querySelectorAll('#page-sensors .panel')].find(p=>p.querySelector('.hlp'));
sens._hb.click();await wait(20);
chk('tap ⓘ → that panel opens, the others stay closed',sens.classList.contains('help-open')&&sens._hb.getAttribute('aria-expanded')==='true'&&uniq.filter(b=>b.classList.contains('help-open')).length===1);
w.eval('saveDB()');await wait(50);
const r=await open(w.localStorage.getItem(SK));
const rs=[...r.document.querySelectorAll('#page-sensors .panel')].find(p=>p.querySelector('.hlp'));
chk('…remembered after a restart',rs.classList.contains('help-open')&&[...r.document.querySelectorAll('.panel.help-open,.hlp.solo.help-open')].length===1);
sens._hb.click();await wait(20);chk('tap again → closed',!sens.classList.contains('help-open'));

// 3. Always show; Settings re-render
w.eval(`setApp('helpAll',true)`);await wait(20);
chk('Settings "Always show" → every help text shown (help-all), the ⓘ hidden by CSS',w.document.documentElement.classList.contains('help-all')&&/html\.help-all \.help-btn\{display:none\}/.test(css)&&/on/.test([...$('help-mode').children][1].className));
w.eval(`setApp('helpAll',false)`);w.eval('renderSettings();renderSettings()');await wait(20);
const sp=[...$('settings-body').querySelectorAll('.panel')].filter(p=>p.querySelector('.hlp'));
chk('after Settings re-renders: still one ⓘ per panel',sp.length===5&&sp.every(p=>p.querySelectorAll('.help-btn').length===1),sp.map(p=>p.querySelectorAll('.help-btn').length).join());

// 4. Unit presets
chk('fresh install: Metric preset active, per-unit table folded',w.eval('unitPreset()')==='metric'&&/on/.test([...$('u-preset').children][0].className)&&!$('u-custom').open&&/^Metric · angular MRAD$/.test($('u-sum').textContent),$('u-sum').textContent);
w.eval(`setSec('range','yd');setUnit('ang','moa')`);
[...$('u-preset').children][1].click();await wait(20);
const imp=J('UNITS');
chk('Imperial: every quantity in imperial units',imp.range==='yd'&&imp.zrange==='yd'&&imp.drop==='in'&&imp.sight==='in'&&imp.vel==='fps'&&imp.wind==='mph'&&imp.temp==='f'&&imp.pres==='inhg'&&imp.energy==='ftlb'&&imp.bullet==='in'&&imp.tsize==='in'&&imp.alt==='ft'&&imp.regp==='psi',JSON.stringify(imp));
chk('…angular (scope) and the locked twist unit untouched',imp.ang==='moa'&&imp.twist===w.eval("UNITS.twist")&&w.eval("QDEF.twist.locked")===true);
chk('…a secondary equal to the new primary turns off (setUnit rule)',J('SUNITS.range')==='off');
chk('…Imperial highlighted, summary says so',/on/.test([...$('u-preset').children][1].className)&&$('u-sum').textContent==='Imperial · angular MOA');
const sel=[...$('u-custom').querySelectorAll('select')].find(s=>/^Range — primary/.test(s.getAttribute('aria-label')));
sel.value='m';sel.dispatchEvent(new w.Event('change'));await wait(20);
chk('table select changes one unit → Custom, described against the closer preset, table open',w.eval('UNITS.range')==='m'&&w.eval('unitPreset()')===null&&$('u-sum').textContent==='Custom · imperial except range Meters · angular MOA'&&$('u-custom').open&&/on/.test([...$('u-preset').children][2].className),$('u-sum').textContent);
const sec=[...$('u-custom').querySelectorAll('select')].find(s=>/^Wind speed — secondary/.test(s.getAttribute('aria-label')));
chk('secondary select offers "—" and the other units, not the primary',[...sec.options].map(o=>o.value).join()==='off,ms,kn');
sec.value='ms';sec.dispatchEvent(new w.Event('change'));await wait(20);
chk('…and sets the secondary unit',w.eval("SUNITS.wind")==='ms');
w.eval(`setUnit('range','yd');gotoPage('home');renderQuick()`);await wait(20);
const want=J(`(()=>{const tr=homeTraj(),z=zeroConds(),sc=rifleScope(getRifle()),s=solveShot(tr.pts,nearestPt,z.range,S.dist_m,0,S.wind.speed,S.wind.dir,S.mv,sc?.clickStepMrad||0.1,z.wSpd,z.wDir);return (s.clElev>=0?'↑':'↓')+Math.abs(s.clElev).toFixed(0);})()`);
chk('imperial: Home answer = solver, distance shown in yd',$('fa-elev').textContent===want&&$('fd-unit').textContent==='yd',$('fa-elev').textContent+' / '+want);
w.eval(`setUnitPreset('metric')`);
chk('Metric again: back to the metric set, angular kept',w.eval('unitPreset()')==='metric'&&w.eval('UNITS.ang')==='moa');
chk('no uncaught errors',w.errs.length===0,w.errs.join(' | '));
console.log('\nPASS '+pass+'   FAIL '+fail);
process.exit(fail?1:0);
})().catch(e=>{console.error('TEST CRASH:',e);process.exit(1);});
