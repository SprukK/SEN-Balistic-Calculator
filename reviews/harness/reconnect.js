// Review harness: reconnect the same Calypso (Chrome reuses characteristic objects) and count listeners / effects.
const {JSDOM}=require('jsdom'),fs=require('fs');const wait=ms=>new Promise(r=>setTimeout(r,ms));
const src=fs.readFileSync('/home/claude/sen-balistic-calculator/tests/calypsotest.js','utf8');
eval(src.slice(src.indexOf('function unit('),src.indexOf('async function open(')));
(async()=>{const u=unit('WDOT-B1F9A6',':DU,1668647648,A7',80);
const dom=new JSDOM(fs.readFileSync('/home/claude/sen-balistic-calculator/index.html','utf8'),{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',
  beforeParse(w){w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:(t,k)=>k==='measureText'?()=>({width:10}):()=>{}});
    Object.defineProperty(w.navigator,'bluetooth',{value:{requestDevice:async()=>u}});w.alert=()=>{};w.scrollTo=()=>{};}});
const w=dom.window;await wait(700);
let renders=0;const orig=w.calRender;w.eval('window.__n=0;const __cr=calRender;calRender=function(){window.__n++;return __cr.apply(this,arguments)}');
for(let i=0;i<3;i++){await w.eval('calAdd()');await wait(300);u.gatt.disconnect();await wait(100);}
await w.eval('calAdd()');await wait(300);
w.eval('window.__n=0');u.fff2.emit(Array.from(Buffer.from(':WU,2,5.0,5.0,90.0,5F\r')));await wait(50);
console.log('after 4 connects of the same unit: FFF2 listeners',u.fff2.ls.length,'| gattserverdisconnected listeners',(u.ls.gattserverdisconnected||[]).length,'| calRender calls for ONE :WU',w.__n,'| CALS',w.eval('CALS.length'));
process.exit(0);})();
