// Render test (V1.24.1): real-browser layout checks that jsdom cannot do (jsdom draws nothing).
// Headless Chromium on the outer screen and the unfolded inner screen, at every text size:
// the bottom nav stays pinned to the screen while the page scrolls, the solution rail fits the
// screen and scrolls on its own (independently of the left pane), a sheet opened after scrolling
// is on screen, high-contrast lifts main text to white, the Settings screen line follows a fold.
// Usage: node rendertest.js <app.html>   (needs playwright + Chromium; see README.md)
const {chromium}=require('playwright'),path=require('path');
const FILE='file://'+path.resolve(process.argv[2]);
let pass=0,fail=0;
const chk=(n,ok,extra)=>{console.log((ok?'  PASS  ':'  FAIL  ')+n+(extra?'   '+extra:''));ok?pass++:fail++;};
const OUTER={width:415,height:843},INNER={width:840,height:910};

(async()=>{
console.log('=== RENDER TEST: '+FILE+' ===');
const b=await chromium.launch(process.env.CHROMIUM?{executablePath:process.env.CHROMIUM}:{});
const errs=[];
const open=async vp=>{
  const ctx=await b.newContext({viewport:vp,hasTouch:true,isMobile:true,deviceScaleFactor:2.6});
  const p=await ctx.newPage();p.on('pageerror',e=>errs.push(e.message));
  await p.goto(FILE);await p.waitForTimeout(1000);return p;
};
const box=(p,sel)=>p.evaluate(s=>{const r=document.querySelector(s).getBoundingClientRect();return{top:Math.round(r.top),bottom:Math.round(r.bottom)};},sel);

for(const [name,vp] of [['outer',OUTER],['inner',INNER]]){
  for(const fs of ['m','l','xl']){
    const p=await open(vp),tag=name+' · text '+fs;
    await p.evaluate(f=>{setApp('fontScale',f);gotoPage('settings');},fs);await p.waitForTimeout(150);
    await p.evaluate(()=>scrollTo(0,800));await p.waitForTimeout(100);
    const sy=await p.evaluate(()=>scrollY),nav=await box(p,'.navbar');
    chk(tag+': page scrolls, bottom nav stays pinned to the screen bottom',sy>=700&&Math.abs(nav.bottom-vp.height)<=1&&nav.top>0,JSON.stringify({scrollY:sy,nav}));
    if(name==='inner'){
      const rail=await box(p,'#sol-rail');
      const r=await p.evaluate(()=>{const e=document.getElementById('sol-rail');return{sh:e.scrollHeight,ch:e.clientHeight};});
      chk(tag+': rail fits the screen above the nav (not page-long)',rail.top===0&&rail.bottom<=nav.top+1&&r.ch<vp.height,JSON.stringify({rail,...r}));
      const ind=await p.evaluate(async()=>{const e=document.getElementById('sol-rail'),y0=scrollY;e.scrollTop=e.scrollHeight;
        await new Promise(r=>setTimeout(r,50));const t=e.scrollTop;scrollTo(0,0);await new Promise(r=>setTimeout(r,50));
        return{railMoved:t>0,pageAfterRail:y0,pageNow:scrollY,railKept:e.scrollTop===t};});
      chk(tag+': rail and left pane scroll independently',r.sh>r.ch&&ind.railMoved&&ind.railKept&&ind.pageNow===0,JSON.stringify(ind));
    }
    await p.evaluate(()=>{scrollTo(0,800);openMore();});await p.waitForTimeout(150);
    const sb=await box(p,'#sbox');
    chk(tag+': More sheet opened after scrolling is on screen',sb.bottom<=vp.height+1&&sb.top>=0,JSON.stringify(sb));
    await p.context().close();
  }
}

// High contrast lifts main text to white; no page-wide filter left.
const p=await open(INNER);
const css=await p.evaluate(()=>{const g=()=>getComputedStyle(document.documentElement).getPropertyValue('--text').trim();const n=g();setApp('contrast','high');const h=g();setApp('contrast','normal');
  return{n,h,filter:getComputedStyle(document.body).filter,slider:!!document.querySelector('#settings-body input[type=range]')};});
chk('high contrast: main text #f5f3ee → #ffffff; no body filter; no brightness slider',css.n==='#f5f3ee'&&css.h==='#ffffff'&&css.filter==='none'&&!css.slider,JSON.stringify(css));

// Settings screen line follows fold/unfold without leaving the page.
await p.evaluate(()=>gotoPage('settings'));
await p.setViewportSize(OUTER);await p.waitForTimeout(400);
const t1=await p.textContent('#screen-info');
await p.setViewportSize(INNER);await p.waitForTimeout(400);
const t2=await p.textContent('#screen-info');
chk('Settings screen line updates on fold and unfold',/415 × 843 .*phone/.test(t1)&&/840 × 910 .*fold inner/.test(t2),t1+' | '+t2);

chk('ZERO uncaught errors',errs.length===0,errs.slice(0,3).join(' / '));
await b.close();
console.log('\nPASS '+pass+'   FAIL '+fail);
process.exit(fail?1:0);
})().catch(e=>{console.error('TEST CRASH:',e);process.exit(1);});
