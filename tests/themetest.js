// Colours test (V2.11.0 r11): eight user colours, the rest derived.
// Off by default: no theme style, the reticle and chart in their original colours. A custom set: tokens from
// the eight, quiet text pushed to ≥ 4.5 : 1, text on accent black or white by contrast, high-contrast variant,
// reticle and chart in the theme's colours, meta theme-color, warnings for unreadable colours and for
// warning / danger colours that look alike, always-readable Reset, saved / sanitised / reset. Physics untouched.
// Usage: node themetest.js <app.html>   (needs jsdom; see README.md)
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
console.log('=== COLOURS TEST: '+FILE+' ===');
const w=await open();
const $=id=>w.document.getElementById(id),J=e=>JSON.parse(w.eval('JSON.stringify('+e+')'));
w.eval(`Bus.setRifle(DB.rifles.find(r=>/\\.25/.test(r.name)).id);Bus.setProj(DB.projectiles.find(p=>/^Altaros ATP Queen/.test(p.name)).id);Bus.setWx('cur',DB.weathers[0].id);S.dist_m=150;Bus.setWind(3,90,'manual');Bus.notify();`);await wait(30);
const ret=()=>$('home-reticle').innerHTML;
const elevBefore=$('home-elev').textContent;

// 1. Default: nothing changes
chk('default: no theme, empty theme style, meta theme-color unchanged',w.eval('themeOn()')===false&&$('theme-style').textContent===''&&w.document.querySelector('meta[name="theme-color"]').getAttribute('content')==='#0a0b0e');
chk('…reticle in its original colours (glass #0a0c0f, lines 230,228,222)',/fill="#0a0c0f"/.test(ret())&&/rgba\(230,228,222,\.92\)/.test(ret()));
const css=fs.readFileSync(FILE,'utf8');
chk('stylesheet tints follow the tokens (identical by default: color-mix of the same colour)',/color-mix\(in srgb,var\(--accent\) 16%,transparent\)/.test(css)&&!/rgba\(114,180,194,\.16\)/.test(css.split('</style>')[0].split(':root{')[1].split('}').slice(1).join('}')));

// 2. Editor
w.eval(`gotoPage('settings')`);await wait(20);
const ins=[...$('theme-panel').querySelectorAll('input[type=color]')];
chk('Settings → Colours: eight pickers with their hex values',ins.length===8&&ins.map(i=>i.id.slice(3)).join()==='bg,panel,text,accent,gold,warn,red,green'&&$('th-hex-accent').textContent==='#72b4c2');
const setC=(k,v,ev)=>{const i=$('th-'+k);i.value=v;i.dispatchEvent(new w.Event(ev||'change'));};
setC('accent','#f2a33a','input');
chk('picking a colour previews live (theme on, --accent in the theme style)',w.eval('themeOn()')===true&&/:root:not\(\.hc\)\{[^}]*--accent:#f2a33a/.test($('theme-style').textContent));
setC('accent','#f2a33a');setC('bg','#101418');setC('panel','#1a2026');setC('text','#eef2f4');await wait(20);
const st=$('theme-style').textContent;
const tok=k=>(st.match(new RegExp(':root:not\\(\\.hc\\)\\{[^}]*'+k+':([^;}]+)'))||[])[1];
chk('derived tokens from the eight (panel shades, borders, tints, quiet text)',tok('--bg2')==='#1a2026'&&/^#/.test(tok('--bg3'))&&/^rgba\(/.test(tok('--border'))&&/^rgba\(242,163,58,0\.14\)$/.test(tok('--src-auto')),[tok('--bg3'),tok('--border'),tok('--src-auto')].join(' '));
chk('quiet text reads at ≥ 4.5 : 1 on the panels',w.eval(`contrast('${tok('--text3')}','#1a2026')`)>=4.5,String(w.eval(`contrast('${tok('--text3')}','#1a2026')`).toFixed(2)));
chk('text on the orange accent: dark (best contrast)',tok('--on-accent')==='#0a0b0e');
setC('accent','#2a3fa8');await wait(10);
chk('…on a dark blue accent: white',(($('theme-style').textContent.match(/:root:not\(\.hc\)\{[^}]*--on-accent:([^;}]+)/)||[])[1])==='#ffffff');
setC('accent','#f2a33a');
chk('a high-contrast variant is written too (brighter text, stronger borders)',/html\.hc\{[^}]*--border:rgba\([^)]*,0\.26\)/.test($('theme-style').textContent));
chk('browser bar colour follows the background',w.document.querySelector('meta[name="theme-color"]').getAttribute('content')==='#101418');

// 3. Reticle and chart follow
w.eval(`gotoPage('home');renderQuick()`);await wait(20);
chk('reticle: glass, dot and lines in the theme colours',!/fill="#0a0c0f"/.test(ret())&&/rgba\(242,163,58,0\.95\)/.test(ret())&&/rgba\(238,242,244,0\.92\)/.test(ret()));
chk('chart line takes the accent',w.eval("tc('chLine')")==='#f2a33a');
chk('numbers unchanged by colours (same clicks)',$('home-elev').textContent===elevBefore,$('home-elev').textContent);

// 4. Checks
w.eval(`gotoPage('settings')`);await wait(20);
chk('readable set (and the built-in warning / danger pair) passes: "✓ Readable and the warnings stand out"',/Readable and the warnings stand out/.test($('th-checks').textContent));
setC('text','#3a3f44');setC('red','#ff7b5a');setC('warn','#ff7a59');await wait(20);
const msgs=$('th-checks').textContent;
chk('unreadable text → warning with the ratio',/Text reads at 1\.\d : 1/.test(msgs),msgs);
setC('green','#20302a');await wait(10);
chk('a signal colour under 3 : 1 is flagged too',/OK reads at 1\.\d : 1 on the background — under 3 : 1/.test($('th-checks').textContent),$('th-checks').textContent);
chk('warning ≈ danger → "look almost the same"',/Warning and Danger look almost the same/.test(msgs));
chk('…the rows involved are marked',$('th-row-text').classList.contains('th-bad')&&$('th-row-warn').classList.contains('th-bad'));
chk('Reset keeps fixed, readable colours',/\.th-reset\{color:#f5f3ee!important;background:#20252f!important/.test(css)&&$('theme-panel').querySelector('.th-reset'));

// 5. Saved, sanitised, reset
w.eval('saveDB()');await wait(50);
const r=await open(w.localStorage.getItem(SK));
chk('saved: restarts with the same colours',r.eval('themeOn()')===true&&r.eval('APP.theme.accent')==='#f2a33a'&&/--accent:#f2a33a/.test(r.document.getElementById('theme-style').textContent));
chk('garbage sanitised (bad hex → that colour\'s default, unknown keys dropped)',JSON.stringify(w.eval(`JSON.stringify(themeClean({bg:'red',accent:'#ABCDEF',evil:'x'}))`))===JSON.stringify(JSON.stringify({bg:'#0a0b0e',panel:'#12151b',text:'#f5f3ee',accent:'#abcdef',gold:'#caa869',warn:'#e07a5f',red:'#d4574e',green:'#7ab87a'})));
w.eval(`gotoPage('settings')`);$('theme-panel').querySelector('.th-reset').click();await wait(20);
chk('Reset → default colours, theme style empty, reticle original',w.eval('themeOn()')===false&&$('theme-style').textContent===''&&(w.eval(`gotoPage('home');renderQuick()`),/fill="#0a0c0f"/.test(ret())));
chk('no uncaught errors',w.errs.length===0&&r.errs.length===0,w.errs.concat(r.errs).join(' | '));
console.log('\nPASS '+pass+'   FAIL '+fail);
process.exit(fail?1:0);
})().catch(e=>{console.error('TEST CRASH:',e);process.exit(1);});
