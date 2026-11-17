// Review harness: a Calypso that stops streaming (still connected), then disconnects. What does the session wind do?
const {JSDOM}=require('jsdom'),fs=require('fs');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const src=fs.readFileSync('/home/claude/sen-balistic-calculator/tests/calypsotest.js','utf8');
eval(src.slice(src.indexOf('function unit('),src.indexOf('async function open(')));   // reuse the repo's simulated unit
(async()=>{
const u=unit('WDOT-B1F9A6',':DU,1668647648,A7',80);
const dom=new JSDOM(fs.readFileSync('/home/claude/sen-balistic-calculator/index.html','utf8'),{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',
  beforeParse(w){w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:(t,k)=>k==='measureText'?()=>({width:10}):()=>{}});
    Object.defineProperty(w.navigator,'bluetooth',{value:{requestDevice:async()=>u}});w.alert=()=>{};w.scrollTo=()=>{};}});
const w=dom.window;await wait(700);
const J=e=>JSON.parse(w.eval('JSON.stringify('+e+')'));const $=id=>w.document.getElementById(id);
w.eval(`Bus.setRifle(DB.rifles.find(r=>/\\.25/.test(r.name)).id);Bus.setProj(DB.projectiles.find(p=>/^Altaros ATP Queen/.test(p.name)).id);Bus.setWx('cur',DB.weathers[0].id);Bus.setWx('zero',DB.weathers[0].id);S.mv=255;S.dist_m=150;Bus.notify();gotoPage('home')`);
await w.eval('toggleBLE()');await wait(300);w.eval('toggleHomeLive()');
const snap=lbl=>{w.eval('renderQuick()');console.log(lbl.padEnd(46),'| S.wind',JSON.stringify(J('S.wind')),'| windage',$('home-wind').textContent,$('home-wind-u').textContent,'| card',JSON.stringify($('ble-poll-ctr').textContent),'| pill',JSON.stringify(($('dev-wx-v')||{}).textContent),'| live bar',JSON.stringify($('home-live-state').textContent));};
for(let i=0;i<5;i++){u.fff2.emit(Array.from(Buffer.from(':WU,2,5.0,5.0,90.0,5F\r')));await wait(200);}
snap('A streaming 5 m/s from 90°');
await wait(8000);
snap('B 8 s later, no :WU (unit silent, still connected)');
w.eval("S.dist_m=150;Bus.notify()");await wait(300);snap('C after an unrelated session change');
u.gatt.disconnect();await wait(300);
snap('D after disconnect');
// split sentence across 20-byte chunks and a lost \r
const s=':WU,2,6.0,6.0,270.0,5F\r';u.gatt.connected=true;
process.exit(0);})();
