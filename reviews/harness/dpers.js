const {JSDOM}=require('jsdom'),fs=require('fs');const {IDBFactory,IDBKeyRange}=require('fake-indexeddb');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function open(idb){const dom=new JSDOM(fs.readFileSync('/home/claude/repo/index.html','utf8'),{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',
  beforeParse(w){w.indexedDB=idb;w.IDBKeyRange=IDBKeyRange;w.alert=()=>{};w.confirm=()=>true;w.scrollTo=()=>{};w.console.error=(...a)=>{w.__ce=(w.__ce||[]).concat(a.map(String))};
    w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:(t,k)=>k==='measureText'?()=>({width:10}):()=>{}});}});
  const w=dom.window;w.errs=[];w.addEventListener('error',e=>w.errs.push(e.message));await wait(800);return w;}
(async()=>{const idb=new IDBFactory();const a=await open(idb);
 a.eval(`importData({units:{range:'parsec'}})`);await wait(50);try{a.eval("impPrefs('take');finishImport(IMP)");}catch(e){console.log('import threw:',e.message);}await wait(300);a.close();
 const b=await open(idb);console.log('next start: UNITS.range =',b.eval('UNITS.range'),'| boot error:',JSON.stringify((b.__ce||[]).join(' ').slice(0,140)),'| Home solution cell:',JSON.stringify(b.document.getElementById('home-elev').textContent));
 process.exit(0);})();
