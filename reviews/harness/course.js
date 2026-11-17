const {JSDOM}=require('jsdom'),fs=require('fs');const {IDBFactory,IDBKeyRange}=require('fake-indexeddb');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function open(idb){const dom=new JSDOM(fs.readFileSync('/home/claude/repo/index.html','utf8'),{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',
  beforeParse(w){w.indexedDB=idb;w.IDBKeyRange=IDBKeyRange;w.alert=()=>{};w.confirm=()=>true;w.scrollTo=()=>{};w.console.error=(...a)=>{(w.__ce=w.__ce||[]).push(a.map(String).join(' '))};
    w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:(t,k)=>k==='measureText'?()=>({width:10}):()=>{}});}});
  const w=dom.window;w.errs=[];w.addEventListener('error',e=>w.errs.push(e.message));await wait(800);return w;}
(async()=>{const idb=new IDBFactory();const a=await open(idb);
 a.eval(`Bus.setRifle(DB.rifles.find(r=>/\\.25/.test(r.name)).id);Bus.setProj(DB.projectiles.find(p=>/^Altaros ATP Queen/.test(p.name)).id);Bus.setWx('cur',DB.weathers[0].id);Bus.notify();`);
 a.eval(`useLayout(APP.layouts.find(l=>l.tpl==='prs').id)`);await wait(100);
 a.eval(`newDope();const c=getCard();courseSelect(c.id);`);await wait(100);
 // user deletes the only stage of the card used by the course
 try{a.eval(`delStage(getCard().stages[0].id)`);}catch(e){console.log('delStage threw:',e.message);}
 await wait(200);a.eval('saveDBFlush();saveDB()');await wait(300);a.close();
 const b=await open(idb);console.log('restart with the PRS layout and a course card without stages → boot:',JSON.stringify((b.__ce||[]).join(' ').slice(0,140)||'ok'),'| Home elev',JSON.stringify(b.document.getElementById('home-elev').textContent));
 // stage without targets
 const c2=await open(new IDBFactory());c2.eval(`Bus.setRifle(DB.rifles.find(r=>/\\.25/.test(r.name)).id);Bus.setProj(DB.projectiles.find(p=>/^Altaros ATP Queen/.test(p.name)).id);Bus.setWx('cur',DB.weathers[0].id);Bus.notify();useLayout(APP.layouts.find(l=>l.tpl==='prs').id);newDope();const c=getCard();c.stages[0].dists=[];courseSelect(c.id);`);
 try{c2.eval('courseCall(true)');console.log('Hit on a stage with no targets: ok');}catch(e){console.log('Hit on a stage with no targets threw:',e.message);}
 process.exit(0);})();
