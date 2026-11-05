// Type + tap-size test (V2.11.0 r4), real Chromium via Playwright.
// On the outer (412 × 915) and inner (780 × 720) screens, on every page with a session set:
// every visible text ≥ 12 px (reticle SVG excluded); every button, input, select and disclosure row
// ≥ 48 px tall — except the "from profile" source chips (.srcbtn), whose invisible hit area must be
// ≥ 44 px; inputs ≥ 16 px text; no sideways page scroll; no errors. Also with Large text.
// Usage: node typetest.js <app.html>   (Playwright: see README.md, as rendertest.js)
const {chromium}=require('playwright'),path=require('path');
const FILE='file://'+path.resolve(process.argv[2]);
const PAGES=['home','traj','solver','wind','dope','stab','bench','truing','holds','profiles','sensors','layouts','formulas','settings'];
let pass=0,fail=0;
const chk=(n,ok,extra)=>{console.log((ok?'  PASS  ':'  FAIL  ')+n+(extra?'   '+extra:''));ok?pass++:fail++;};
(async()=>{
console.log('=== TYPE + TAP SIZE TEST: '+FILE+' ===');
const b=await chromium.launch(process.env.CHROMIUM?{executablePath:process.env.CHROMIUM}:{});
for(const [name,w,h,fs] of [['outer',412,915,'m'],['inner',780,720,'m'],['outer · Large text',412,915,'l']]){
  const ctx=await b.newContext({viewport:{width:w,height:h},hasTouch:true,isMobile:true});const p=await ctx.newPage();
  const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto(FILE);await p.waitForTimeout(1000);
  await p.evaluate(f=>{setApp('fontScale',f);Bus.setRifle(DB.rifles[0].id);Bus.setProj(DB.projectiles.find(x=>/Queen/.test(x.name)).id);Bus.setWx('cur',DB.weathers[0].id);},fs);
  const small=[],lowTap=[],lowChip=[],lowInput=[],side=[];
  for(const pg of PAGES){
    await p.evaluate(x=>gotoPage(x),pg);await p.waitForTimeout(200);
    const m=await p.evaluate(()=>{
      const z=parseFloat(getComputedStyle(document.body).zoom)||1;
      const scopes=[document.querySelector('.page.active'),document.getElementById('sol-rail')].filter(Boolean);
      const vis=e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(e).visibility!=='hidden';};
      const all=scopes.flatMap(s=>[...s.querySelectorAll('*')]).filter(vis);
      const tag=e=>e.tagName.toLowerCase()+(e.id?'#'+e.id:'')+' "'+e.textContent.trim().slice(0,20)+'"';
      const small=all.filter(e=>!e.closest('svg')&&[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())&&parseFloat(getComputedStyle(e).fontSize)*z<12).map(e=>tag(e)+' '+getComputedStyle(e).fontSize);
      const ctl=all.filter(e=>e.matches('button,input:not([type=hidden]):not([type=file]),select,textarea,summary'));
      const lowTap=ctl.filter(e=>!e.classList.contains('srcbtn')&&e.getBoundingClientRect().height<48*z-0.5).map(e=>tag(e)+' h'+Math.round(e.getBoundingClientRect().height));
      const lowChip=ctl.filter(e=>e.classList.contains('srcbtn')).filter(e=>{const a=getComputedStyle(e,'::after');const ext=-parseFloat(a.top)-parseFloat(a.bottom);return e.getBoundingClientRect().height+ext*z<44*z-0.5;}).map(tag);
      const lowInput=all.filter(e=>e.matches('input,select,textarea')).filter(e=>parseFloat(getComputedStyle(e).fontSize)<16).map(tag);
      return{small,lowTap,lowChip,lowInput,sw:document.documentElement.scrollWidth};});
    m.small.forEach(x=>small.push(pg+': '+x));m.lowTap.forEach(x=>lowTap.push(pg+': '+x));m.lowChip.forEach(x=>lowChip.push(pg+': '+x));m.lowInput.forEach(x=>lowInput.push(pg+': '+x));
    if(m.sw>w)side.push(pg+' '+m.sw);
  }
  chk(name+': all text ≥ 12 px',small.length===0,small.slice(0,4).join(' | '));
  chk(name+': buttons, inputs, selects, disclosure rows ≥ 48 px',lowTap.length===0,lowTap.slice(0,4).join(' | '));
  chk(name+': "from profile" chips have a ≥ 44 px hit area',lowChip.length===0,lowChip.slice(0,4).join(' | '));
  chk(name+': input text ≥ 16 px',lowInput.length===0,lowInput.slice(0,4).join(' | '));
  chk(name+': no sideways page scroll on any page',side.length===0,side.join(', '));
  chk(name+': no errors',errs.length===0,errs.join(' | '));
  await ctx.close();
}
await b.close();
console.log('\nPASS '+pass+'   FAIL '+fail);
process.exit(fail?1:0);
})().catch(e=>{console.error('TEST CRASH:',e);process.exit(1);});
