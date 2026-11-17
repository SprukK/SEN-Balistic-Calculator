// Review harness: import records whose every string field carries a marker payload, render the screens,
// and report which markers became live DOM elements (HTML/attribute context) or live JS (handler context).
const {JSDOM}=require('jsdom'),fs=require('fs');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const MODE=process.argv[2]||'html';
async function open(){
  const dom=new JSDOM(fs.readFileSync('/home/claude/repo/index.html','utf8'),{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',
    beforeParse(w){w.alerts=[];w.alert=m=>w.alerts.push(String(m));w.confirm=()=>true;w.scrollTo=()=>{};w.print=()=>{};w.__hit=new Set();w.__p=k=>w.__hit.add(k);
      w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:(t,k)=>k==='measureText'?()=>({width:10}):()=>{}});}});
  const w=dom.window;w.errs=[];w.addEventListener('error',e=>w.errs.push(e.message));await wait(700);return w;
}
// html: breaks out of text and of "-quoted attributes; js: breaks out of a '-quoted JS string inside a handler
const P=k=>MODE==='html'?`${k}"'><i data-xss="${k}"></i>`:MODE==='attr'?`${k}" data-xss="${k}`:`${k}',window.__p('${k}'),'`;
(async()=>{
const w=await open();
const ids={sc:P('scope.id'),rt:P('reticle.id'),rf:P('rifle.id'),pj:P('proj.id'),wx:P('wx.id'),dc:P('card.id'),st:P('stage.id'),ds:P('dist.id'),rg:P('range.id'),de:P('design.id')};
const d={schema:{rifles:1,projectiles:1,weathers:1,scopes:1,reticles:1,dopeCards:2},
 reticles:[{id:ids.rt,name:P('reticle.name'),fp:P('reticle.fp'),renderer:P('reticle.renderer'),dotMrad:0.1,hashes:[1,2,3],windHashes:[1,2],treeRows:[1,2],verified:false,confNote:P('reticle.confNote'),notes:P('reticle.notes')}],
 scopes:[{id:ids.sc,name:P('scope.name'),sku:P('scope.sku'),adjUnit:P('scope.adjUnit'),click:0.1,elev:26,wind:16,cpr:100,magMin:5,magMax:30,reticleId:ids.rt,source:P('scope.source'),notes:P('scope.notes')}],
 rifles:[{id:ids.rf,name:P('rifle.name'),cal:P('rifle.cal'),twist:508,twistDir:P('rifle.twistDir'),blen:700,sight:44,mv:255,zero:50,notes:P('rifle.notes'),scopeId:ids.sc,railOn:false,railMrad:0,railUnit:P('rifle.railUnit'),downClicks:P('rifle.downClicks'),zwSpd:0,zwDir:90,zTemp:20,zPres:1010,zPresType:'sea',zAlt:300,zRH:65,reg1:P('rifle.reg1'),reg2:P('rifle.reg2'),ssj:false,regDelta:P('rifle.regDelta'),dwell:P('rifle.dwell')}],
 projectiles:[{id:ids.pj,name:P('proj.name'),cal:P('proj.cal'),mfg:P('proj.mfg'),type:P('proj.type'),diam:6.35,mass:60,oal:12.9,bcg7:0.128,bcg1:0.245,c:0,ff:1.07,notes:P('proj.notes')}],
 weathers:[{id:ids.wx,name:P('wx.name'),temp:20,pres:975,presType:P('wx.presType'),rh:65,alt:298,notes:P('wx.notes')}],
 dopeCards:[{id:ids.dc,name:P('card.name'),rifleId:ids.rf,projId:ids.pj,cwxId:ids.wx,mv:255,zero:50,notes:P('card.notes'),stages:[{id:ids.st,name:P('stage.name'),notes:P('stage.notes'),dists:[{id:ids.ds,range:100,angle:0,wind:0,wdir:90,label:P('dist.label')}]}]}],
 ranges:[{id:ids.rg,name:P('range.name'),notes:P('range.notes'),mode:'blend',stations:[{id:P('station.id'),nick:P('station.nick'),unit:P('station.unit'),dist:50,ang:0}]}],
 designs:[{id:ids.de,name:P('design.name'),notes:P('design.notes'),diam:6.35,bearL:8}]};
w.eval('importData('+JSON.stringify(d)+')');await wait(150);
const stored=JSON.parse(w.eval('JSON.stringify({r:DB.rifles.map(x=>x.id),p:DB.projectiles.map(x=>x.id),c:DB.dopeCards.map(x=>x.id)})'));
const steps=[];
const step=async(name,code)=>{try{w.eval(code);}catch(e){steps.push(name+' threw '+e.message);}await wait(60);
  w.document.querySelectorAll('[data-xss]').forEach(e=>{if(e.__seen)return;e.__seen=1;let a=e.parentElement,path=[];while(a&&path.length<3){if(a.id)path.push('#'+a.id);a=a.parentElement;}
    const ctx=(e.parentElement?e.parentElement.tagName.toLowerCase():'?');w.__hit.add(e.getAttribute('data-xss')+' @'+name+' in <'+ctx+'> '+path.join(' < '));});
  if(MODE==='js')w.document.querySelectorAll('*').forEach(e=>{for(const a of e.getAttributeNames())if(/^on/.test(a)&&/window\.__p\(/.test(e.getAttribute(a))){try{e[a]&&e[a].call(e,new w.Event('x'));}catch(x){} } });
  [...w.__hit].forEach(k=>{if(!/@/.test(k)){w.__hit.delete(k);w.__hit.add(k+' @'+name+' (handler ran)');}});};
const RF=JSON.stringify(ids.rf),PJ=JSON.stringify(ids.pj),WX=JSON.stringify(ids.wx),SC=JSON.stringify(ids.sc),RT=JSON.stringify(ids.rt),DC=JSON.stringify(ids.dc),RG=JSON.stringify(ids.rg),DE=JSON.stringify(ids.de);
await step('session',`Bus.setRifle(${RF});Bus.setProj(${PJ});Bus.setWx('cur',${WX});Bus.setWx('zero',${WX});Bus.notify()`);
await step('home',`gotoPage('home');renderQuick()`);
await step('actbar',`renderActBar()`);
for(const k of ['rifle','proj','wx'])await step('sheet:'+k,`pickSheet('${k}')`);
await step('closeSheet',`closeSheet()`);
await step('trajectory',`gotoPage('traj');runTraj(true)`);
await step('profiles',`gotoPage('profiles');renderProfiles();setProfSub&&['rifles','projs','scopes','reticles','wx'].forEach(s=>{try{setProfSub(s)}catch(e){}})`);
await step('form:rifle',`openRifleForm(${RF})`);await step('form:proj',`openProjForm(${PJ})`);await step('form:scope',`openScopeForm(${SC})`);await step('form:reticle',`openReticleForm(${RT})`);await step('form:wx',`openWxForm(${WX})`);
await step('closeModal',`closeModal()`);
for(const t of [['r',RF],['p',PJ],['s',SC],['w',WX]])await step('share:'+t[0],`openShare('${t[0]}',${t[1]})`);
await wait(300);await step('after-share',`0`);await step('closeModal2',`closeModal()`);
await step('dope',`gotoPage('dope');{const s=document.getElementById('dc-sel'),o=document.createElement('option');o.value=${DC};s.appendChild(o);s.value=${DC};}loadDope();calcDope()`);
await step('dope-print',`document.getElementById('print-content')&&printDope()`);
await step('stab',`gotoPage('stab')`);await step('truing',`gotoPage('truing')`);await step('holds',`gotoPage('holds')`);await step('solver',`gotoPage('solver')`);await step('wind',`gotoPage('wind')`);
await step('bench',`APP.benchId=${DE};gotoPage('bench')`);await step('sensors',`APP.rangeId=${RG};gotoPage('sensors');stnRender()`);
await step('settings',`gotoPage('settings')`);await step('layouts',`gotoPage('layouts')`);await step('formulas',`gotoPage('formulas')`);
// re-import same file → clash review
await step('import-review',`importData(JSON.parse(JSON.stringify(${JSON.stringify(d)}).replace(/"mass":60/,'"mass":61')))`);
console.log('MODE',MODE,'| stored ids keep payload:',stored.r[stored.r.length-1]===ids.rf,'| steps with errors:',steps.length?steps.join(' ; '):'none');
const hits=[...w.__hit].sort();console.log('LIVE MARKERS ('+hits.length+'):');hits.forEach(h=>console.log('  '+h));
console.log('page errors:',w.errs.slice(0,5).join(' | '));
process.exit(0);})();
