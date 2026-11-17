const {JSDOM}=require('jsdom'),fs=require('fs');const {IDBFactory,IDBKeyRange}=require('fake-indexeddb');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function open(idb){const dom=new JSDOM(fs.readFileSync('/home/claude/repo/index.html','utf8'),{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',
  beforeParse(w){w.indexedDB=idb;w.IDBKeyRange=IDBKeyRange;w.alert=()=>{};w.confirm=()=>true;w.scrollTo=()=>{};w.console.error=(...a)=>{(w.__ce=w.__ce||[]).push(a.map(String).join(' '))};
    w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:(t,k)=>k==='measureText'?()=>({width:10}):()=>{}});}});
  const w=dom.window;await wait(800);return w;}
const cases={layoutsNullEntry:"APP.layouts=[...APP.layouts,null]",layoutsNumber:"APP.layouts=[...APP.layouts,42]",layoutModsString:"APP.layouts[0].mods='oops'",layoutUnknownMod:"APP.layouts[0].mods=[{id:'nosuch',on:true}]",modsInnerJunk:"APP.layouts[0].modsInner=[{id:'nosuch',on:1,side:'q'}]",layoutIdMissing:"APP.layoutId='nope'",navTabsObj:"APP.navTabs={a:1}",panesStr:"APP.panes='bad'",railWStr:"APP.railW='wide'",fontScale:"APP.fontScale='huge'",retMag:"APP.retMag=-5",theme:"APP.theme={bg:'red'}",truTab:"APP.truTab=7",homeLayoutsNotArray:"APP.layouts='x'"};
(async()=>{for(const [k,c] of Object.entries(cases)){const idb=new IDBFactory();const a=await open(idb);a.eval(c+';saveDB()');await wait(250);a.close();const b=await open(idb);
 const err=(b.__ce||[]).join(' ').slice(0,110);console.log(k.padEnd(20),err?'BOOT FAILED: '+err:'boots ok · home elev '+JSON.stringify(b.document.getElementById('home-elev').textContent));b.close();}process.exit(0);})();
