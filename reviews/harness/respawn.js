const {JSDOM}=require('jsdom'),fs=require('fs');const {IDBFactory,IDBKeyRange}=require('fake-indexeddb');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function open(idb){const dom=new JSDOM(fs.readFileSync('/home/claude/repo/index.html','utf8'),{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',
  beforeParse(w){w.indexedDB=idb;w.IDBKeyRange=IDBKeyRange;w.alert=()=>{};w.confirm=()=>true;w.scrollTo=()=>{};
    w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:(t,k)=>k==='measureText'?()=>({width:10}):()=>{}});}});
  const w=dom.window;await wait(800);return w;}
(async()=>{const idb=new IDBFactory();const a=await open(idb);
 const n0=a.eval('DB.projectiles.length'),s0=a.eval('DB.scopes.length');
 a.eval("confirmDelete('p',DB.projectiles.find(p=>/ZAN Standard HP .177 10gr/.test(p.name)).id);confirmDelete('s',DB.scopes.find(s=>s.sku==='SCFF-31').id)");await wait(300);
 const n1=a.eval('DB.projectiles.length'),s1=a.eval('DB.scopes.length');a.close();
 const b=await open(idb);console.log('projectiles',n0,'→ after delete',n1,'→ after restart',b.eval('DB.projectiles.length'),'| scopes',s0,'→',s1,'→',b.eval('DB.scopes.length'));process.exit(0);})();
