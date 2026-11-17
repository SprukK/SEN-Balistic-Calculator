// Review harness: real Chromium at the Magic V5 screen widths; every page × text size → sideways scroll,
// small tap targets, unlabeled inputs, console errors. Also fold/unfold with a sheet open and a focused input.
const {chromium}=require('playwright'),path=require('path');
const FILE='file://'+path.resolve('/home/claude/repo/index.html');
const PAGES=process.argv[2].split(',');
(async()=>{
const b=await chromium.launch();const errs=[];
const setup=async p=>{await p.evaluate(()=>{Bus.setRifle(DB.rifles.find(r=>/\.25/.test(r.name)).id);Bus.setProj(DB.projectiles.find(p=>/^Altaros ATP Queen/.test(p.name)).id);Bus.setWx('cur',DB.weathers[0].id);Bus.setWx('zero',DB.weathers[0].id);Bus.notify();});};
for(const [name,vp] of [['outer',{width:412,height:915}],['inner',{width:780,height:900}]]){
  const ctx=await b.newContext({viewport:vp,hasTouch:true,isMobile:true,deviceScaleFactor:2.6});const p=await ctx.newPage();
  p.on('pageerror',e=>errs.push(name+': '+e.message));p.on('console',m=>{if(m.type()==='error')errs.push(name+' console: '+m.text().slice(0,120));});
  await p.goto(FILE);await p.waitForTimeout(900);await setup(p);
  for(const fs of ['m','xl']){
    for(const pg of PAGES){
      await p.evaluate(([f,g])=>{setApp('fontScale',f);gotoPage(g);},[fs,pg]);await p.waitForTimeout(250);
      const r=await p.evaluate(()=>{
        const de=document.documentElement,over=de.scrollWidth-de.clientWidth;
        const vis=e=>{const s=getComputedStyle(e),b=e.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&b.width>0&&b.height>0&&e.closest('.page.active,#sol-rail,.navbar,#actbar,header,.hdr');};
        const small=[...document.querySelectorAll('button,select,input:not([type=hidden]),a[href],[onclick]')].filter(vis).filter(e=>{const b=e.getBoundingClientRect();return b.height<40||b.width<40;})
          .map(e=>(e.id||e.className||e.tagName).toString().slice(0,24)+' '+Math.round(e.getBoundingClientRect().width)+'×'+Math.round(e.getBoundingClientRect().height));
        const unl=[...document.querySelectorAll('.page.active input:not([type=hidden]),.page.active select')].filter(vis).filter(e=>!(e.labels&&e.labels.length)&&!e.getAttribute('aria-label')&&!e.getAttribute('aria-labelledby')&&!e.title).map(e=>e.id||e.name||e.type);
        const wide=[...document.querySelectorAll('.page.active *')].filter(e=>e.getBoundingClientRect().right>de.clientWidth+1&&!e.closest('.tablebox,[style*="overflow"]')&&getComputedStyle(e).position!=='fixed').slice(0,3).map(e=>(e.id||e.className||e.tagName).toString().slice(0,30));
        return{over,small:small.length,smallEx:small.slice(0,4),unl,wide};});
      console.log(`${name} ${fs.padEnd(2)} ${pg.padEnd(9)} sideways ${String(r.over).padStart(3)}px | <40px targets ${String(r.small).padStart(3)} ${JSON.stringify(r.smallEx)} | unlabeled ${JSON.stringify(r.unl.slice(0,6))}${r.unl.length>6?'+'+(r.unl.length-6):''}${r.wide.length?' | overflowing '+JSON.stringify(r.wide):''}`);
    }
  }
  await ctx.close();
}
console.log('ERRORS',JSON.stringify(errs.slice(0,8)));await b.close();})();
