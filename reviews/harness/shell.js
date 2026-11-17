// Review harness: back button / Escape with a modal open; corrupt layout and shell prefs at boot.
const {JSDOM}=require('jsdom'),fs=require('fs');const {IDBFactory,IDBKeyRange}=require('fake-indexeddb');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function open(idb,{w:W=412,h:H=915}={}){const dom=new JSDOM(fs.readFileSync('/home/claude/repo/index.html','utf8'),{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',
  beforeParse(w){if(idb){w.indexedDB=idb;w.IDBKeyRange=IDBKeyRange;}w.alert=()=>{};w.confirm=()=>true;w.scrollTo=()=>{};w.innerWidth=W;w.innerHeight=H;w.console.error=(...a)=>{(w.__ce=w.__ce||[]).push(a.map(String).join(' '))};
    w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:(t,k)=>k==='measureText'?()=>({width:10}):()=>{}});}});
  const w=dom.window;w.errs=[];w.addEventListener('error',e=>w.errs.push(e.message));await wait(800);return w;}
const P=(...a)=>console.log(...a);
(async()=>{
let w=await open();const $=id=>w.document.getElementById(id);
w.eval("gotoPage('settings');gotoPage('profiles');openRifleForm(DB.rifles[0].id)");await wait(50);
w.eval('onBack()');await wait(50);
P('1 rifle form open + Android back → page now',w.eval('curPage()'),'| modal still open:',$('modal').classList.contains('open'));
w.eval("closeModal();gotoPage('profiles');openRifleForm(DB.rifles[0].id)");w.document.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape'}));await wait(20);
P('2 Escape with the form open → modal still open:',$('modal').classList.contains('open'));
P('3 dialog semantics: modal role',$('modal').getAttribute('role')||$('mbox').getAttribute('role'),'aria-modal',$('modal').getAttribute('aria-modal'),'| sheet role',$('sheet').getAttribute('role')||$('sbox').getAttribute('role'));
w.eval('closeModal()');
// focus after opening a sheet
w.eval("gotoPage('home');pickSheet('rifle')");await wait(30);P('4 focus after opening a sheet:',w.document.activeElement&&(w.document.activeElement.id||w.document.activeElement.tagName));
// corrupt shell prefs at boot
const idb=new IDBFactory();let a=await open(idb);a.eval(`APP.layouts=[{id:'x',name:null,mods:'oops',modsInner:[{id:'nosuch',on:1,side:'q'}]},null,42];APP.layoutId='nope';APP.navTabs={a:1};APP.panes='bad';APP.railW='wide';APP.fontScale='huge';APP.retMag=-5;APP.theme={bg:'red'};APP.truTab=7;saveDB()`);await wait(300);a.close();
let b=await open(idb,{w:780,h:900});
P('5 corrupt layouts/nav/panes/fontScale at boot → boot error:',JSON.stringify((b.__ce||[]).join(' | ').slice(0,200)),'| page errors',JSON.stringify(b.errs.slice(0,2)),'| Home elev cell',JSON.stringify(b.document.getElementById('home-elev').textContent),'| layouts now',b.eval('JSON.stringify((APP.layouts||[]).map(l=>l&&l.name).slice(0,3))'));
process.exit(0);})();
