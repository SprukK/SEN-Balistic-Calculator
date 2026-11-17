const {chromium}=require('playwright'),path=require('path');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:412,height:915},isMobile:true,hasTouch:true});const p=await ctx.newPage();
await p.goto('file://'+path.resolve('/home/claude/repo/index.html'));await p.waitForTimeout(1200);
for(const mode of ['normal','high']){
const r=await p.evaluate(async(mode)=>{setApp('contrast',mode);Bus.setRifle(DB.rifles.find(r=>/\.25/.test(r.name)).id);Bus.setProj(DB.projectiles.find(p=>/^Altaros ATP Queen/.test(p.name)).id);Bus.setWx('cur',DB.weathers[0].id);Bus.setWx('zero',DB.weathers[0].id);Bus.notify();gotoPage('home');
  await new Promise(r=>setTimeout(r,300));
  const rgb=s=>{const m=s.match(/[\d.]+/g).map(Number);return{r:m[0],g:m[1],b:m[2],a:m[3]==null?1:m[3]};};
  const L=c=>{const f=v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);};return 0.2126*f(c.r)+0.7152*f(c.g)+0.0722*f(c.b);};
  const bgOf=e=>{for(let x=e;x;x=x.parentElement){const c=rgb(getComputedStyle(x).backgroundColor);if(c.a>0.5)return c;}return rgb(getComputedStyle(document.body).backgroundColor);};
  const out={};
  const pick=[['solution elev','#home-elev'],['elev sub','#home-elev-u'],['status line','#home-status'],['note','.page.active .note'],['field label','.page.active .fld label'],['card label .sl','.page.active .sl'],['card unit .su','.page.active .su'],['nav label','.navbar button'],['flag info','.flag.info'],['flag warn','.flag.warn']];
  for(const [k,s] of pick){const e=document.querySelector(s);if(!e){out[k]='n/a';continue;}const cs=getComputedStyle(e),fg=rgb(cs.color),bg=bgOf(e);const l1=L(fg),l2=L(bg);out[k]=((Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05)).toFixed(1)+':1 @'+cs.fontSize;}
  return out;},mode);
console.log(mode.padEnd(7),JSON.stringify(r));}
await b.close();})();
