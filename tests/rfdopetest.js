// Dope card filled from the rangefinder (V2.12.0, CALC-22).
// Simulated Element Titan 3K (Nordic UART, one 4-byte F5 frame per ranging, as rangefindertest.js).
// Checks: the Dope page switch; On with no card → a new card from the session holding one empty "Ranged" stage;
// each ranging adds a target (distance 0.1 m, signed angle, LOS as sent) named T1, T2…; a ranging within 1 m of
// the last row within 30 s updates it (scan mode), later or farther adds a row; a paused unit adds nothing; the
// session distance still fills, and the card fills with the session switch off; Off stops it; a deleted card turns
// it off. Ranged stage: no wind inputs, columns Range · Ang · Drop · Elev · Windage; elevation = solver at zero
// wind; windage = spin drift only (Litz, the Shot solver's formula and Sg), EST in the note; pellet → "—".
// Wind stages unchanged. Print, export / import keep the stage kind. No errors.
// Usage: node rfdopetest.js <app.html>   (needs jsdom; see README.md)
const {JSDOM}=require('jsdom'),fs=require('fs');
const FILE=process.argv[2];
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let pass=0,fail=0;
const chk=(n,ok,extra)=>{console.log((ok?'  PASS  ':'  FAIL  ')+n+(extra?'   '+extra:''));ok?pass++:fail++;};
const NUS='6e400001-b5a3-f393-e0a9-e50e24dcca9e',TX='6e400003-b5a3-f393-e0a9-e50e24dcca9e',RX='6e400002-b5a3-f393-e0a9-e50e24dcca9e';
const frame=(m,deg)=>{const d=Math.round(m*10);return[0xf5,d>>8,d&255,deg&255];};
function unit(name){
  const u={name,id:'id'+name,writes:0,busy:false,ls:{},addEventListener(t,f){(this.ls[t]=this.ls[t]||[]).push(f)},fire(t){(this.ls[t]||[]).forEach(f=>f())}};
  const gatt=async fn=>{if(u.busy)throw new Error('GATT operation already in progress.');u.busy=true;try{await wait(5);return await fn();}finally{u.busy=false;}};
  const tx={uuid:TX,properties:{notify:true},ls:[],addEventListener(t,f){this.ls.push(f)},startNotifications(){return gatt(async()=>{})},
    emit(b){const v=new DataView(new Uint8Array(b).buffer);this.ls.forEach(f=>f({target:{value:v}}))}};
  const rx={uuid:RX,properties:{write:true},writeValue(){u.writes++;return gatt(async()=>{})},writeValueWithoutResponse(){u.writes++;return gatt(async()=>{})}};
  const server={async getPrimaryServices(){return[]},async getPrimaryService(sid){if(sid===0x180F)throw new Error('no battery service');
    if(String(sid).toLowerCase()!==NUS)throw new Error('service not found');return{getCharacteristics:async()=>[rx,tx]};}};
  u.gatt={connected:false,async connect(){this.connected=true;return server},disconnect(){this.connected=false;u.fire('gattserverdisconnected')}};
  u.range=(m,deg)=>tx.emit(frame(m,deg));return u;
}
const queue=[];
const dom=new JSDOM(fs.readFileSync(FILE,'utf8'),{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',
  beforeParse(w){Object.defineProperty(w,'innerWidth',{configurable:true,value:412});Object.defineProperty(w,'innerHeight',{configurable:true,value:915});
    w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:(t,k)=>k==='measureText'?()=>({width:10}):()=>{}});w.scrollTo=()=>{};w.print=()=>{};
    Object.defineProperty(w.navigator,'bluetooth',{value:{requestDevice:async()=>{const d=queue.shift();if(!d){const e=new Error('User cancelled');e.name='NotFoundError';throw e;}return d;}}});
    w.alert=()=>{};w.confirm=()=>true;}});
const w=dom.window;w.errs=[];w.addEventListener('error',e=>w.errs.push(e.message));
const J=e=>JSON.parse(w.eval('JSON.stringify('+e+')'));
const $=id=>w.document.getElementById(id);
const txt=id=>$(id).textContent;
let now=Date.UTC(2026,10,5,10,40,0);
(async()=>{
console.log('=== RANGEFINDER DOPE CARD TEST: '+FILE+' ===');
await wait(700);
w.Date.now=()=>now;
w.eval(`Bus.setRifle(DB.rifles.find(x=>/\\.25/.test(x.name)).id);Bus.setProj(DB.projectiles.find(p=>/^Altaros ATP Queen/.test(p.name)).id);
  Bus.setWx('cur',DB.weathers[0].id);Bus.setWx('zero',DB.weathers[0].id);S.mv=280;Bus.notify();gotoPage('dope')`);await wait(30);
const seg=()=>[...$('dc-rf-seg').children];
chk('Dope page: "Fill from rangefinder" Off, with what it does',seg().map(b=>b.textContent).join()==='Off,On'&&seg()[0].classList.contains('on')&&/new "Ranged" stage/.test(txt('dc-rf-status'))&&/spin drift only/.test(txt('dc-rf-status')),txt('dc-rf-status'));
const n0=J('DB.dopeCards.length');
seg()[1].click();await wait(30);
const card=()=>J('DB.dopeCards.find(c=>c.id===dopeRf.cardId)');
let c=card();
chk('On with no card open → a new card from the session, one empty ranged stage, opened',J('DB.dopeCards.length')===n0+1&&/^Ranged \d+ Nov \d\d:\d\d$/.test(c.name)&&c.stages.length===1&&c.stages[0].rf===true&&c.stages[0].dists.length===0&&/^Ranged · \d\d:\d\d$/.test(c.stages[0].name)&&J('currentDopeId')===c.id&&c.mv===280,c.name);
chk('…status: no rangefinder connected',/no rangefinder connected/.test(txt('dc-rf-status'))&&seg()[1].classList.contains('on'));

// connect a Titan
const T=unit('Titan 3K');queue.push(T);await w.eval('rfAdd()');await wait(80);
chk('…connected: status asks for a ranging',/· 0 targets · range a target$/.test(txt('dc-rf-status')),txt('dc-rf-status'));
T.range(25.0,-1);await wait(30);c=card();
chk('a ranging adds T1: 25.0 m, −1°, no wind',c.stages[0].dists.length===1&&c.stages[0].dists[0].range===25&&c.stages[0].dists[0].angle===-1&&c.stages[0].dists[0].wind===0&&c.stages[0].dists[0].label==='T1');
chk('…the session distance still fills (CALC-09 unchanged)',J('S.dist_m')===25);
now+=2000;T.range(25.4,-1);now+=2000;T.range(25.6,-2);await wait(30);c=card();
chk('scan mode: rangings within 1 m in 30 s update T1 (25.6 m, −2°), no new rows',c.stages[0].dists.length===1&&c.stages[0].dists[0].range===25.6&&c.stages[0].dists[0].angle===-2);
now+=3000;T.range(42.9,31);await wait(20);now+=3000;T.range(100.0,2);await wait(30);c=card();
chk('farther rangings add T2 42.9 m +31°, T3 100.0 m +2°',c.stages[0].dists.map(d=>d.label+':'+d.range+':'+d.angle).join()==='T1:25.6:-2,T2:42.9:31,T3:100:2');
now+=31000;T.range(100.4,2);await wait(30);c=card();
chk('the same distance more than 30 s later is a new target (T4)',c.stages[0].dists.length===4&&c.stages[0].dists[3].range===100.4);
w.eval('DB.dopeCards.find(c=>c.id===dopeRf.cardId).stages[0].dists[3].label="Gong"');now+=1000;T.range(100.8,3);await wait(30);c=card();
chk('…an update keeps a renamed label',c.stages[0].dists[3].label==='Gong'&&c.stages[0].dists[3].range===100.8&&c.stages[0].dists.length===4);
chk('status counts the targets',/· 4 targets · range a target$/.test(txt('dc-rf-status')),txt('dc-rf-status'));

// ranged stage table
const st=w.document.querySelector('#dc-stages .stage');
const th=[...st.querySelectorAll('thead th')].map(x=>x.textContent.trim().split(' ')[0]).filter(Boolean);
chk('ranged stage: badge, columns Range · Ang° · Drop · Elev · Windage, no wind inputs',/⊙ ranged/.test(st.textContent)&&th.join()==='Range,Ang°,Drop,Elev,Windage'&&!st.querySelector('input[data-q="wind"]')&&st.querySelectorAll('tbody tr[id^="dr-"]').length===4,th.join());
const want=J(`(()=>{const c=DB.dopeCards.find(c=>c.id===dopeRf.cardId),tr=computeCardTraj(c),z=tr.z;return c.stages[0].dists.map(d=>{
  const s=solveShot(tr.pts,nearestPt,z.range,d.range,d.angle,0,90,c.mv,tr.click,z.wSpd,z.wDir),sd=spinFromZero_mm(tr.sg,s.tp.tof,d.range,tr.sgZ,tr.pts.zeroTof,z.range,tr.twistDir),mr=s.mrWind-sd/d.range;
  return {id:d.id,drop:U.drop(s.tp.drop),el:(s.clElev>=0?'↑':'↓')+Math.abs(s.clElev).toFixed(0),wd:Math.round(Math.abs(mr/tr.click))===0?'0':(mr>=0?'→':'←')+Math.round(Math.abs(mr/tr.click)),sd,tof:s.tp.tof};});})()`);
const got=want.map(x=>[txt('dc-rc-'+x.id),txt('dc-re-'+x.id),txt('dc-rw-'+x.id)].join('|'));
chk('results filled live: drop and elevation = solver at zero wind, windage = −(spin drift from the zero) / range in clicks',got.join()===want.map(x=>[x.drop,x.el,x.wd].join('|')).join(),got.join()+' vs '+want.map(x=>[x.drop,x.el,x.wd].join('|')).join());
chk('from the zero: beyond the 50 m zero the drift is right (right twist) and grows → correction left; inside the zero it is slightly left',want.slice(2).every(x=>x.sd>0)&&want[3].sd>want[2].sd&&want[0].sd<0&&want[1].sd<0&&/^←[1-9]/.test(want[3].wd),want.map(x=>x.sd.toFixed(1)+' mm').join());
const atZero=J(`(()=>{const c=DB.dopeCards.find(c=>c.id===dopeRf.cardId),tr=computeCardTraj(c),z=tr.z,s=solveShot(tr.pts,nearestPt,z.range,z.range,0,0,90,c.mv,tr.click,z.wSpd,z.wDir);return spinFromZero_mm(tr.sg,s.tp.tof,z.range,tr.sgZ,tr.pts.zeroTof,z.range,tr.twistDir);})()`);
chk('…a target at the zero range has no spin windage (the zero absorbed it; matched air)',Math.abs(atZero)<0.05,atZero+' mm');
const sgS=J('sessionSg()'),sgC=J('computeCardTraj(DB.dopeCards.find(c=>c.id===dopeRf.cardId)).sg');
chk('card Sg = the Shot solver\'s session Sg (same rifle, projectile, MV, air) → same spin drift as the solver',sgS&&Math.abs(sgS.sg-sgC)<1e-12,sgS&&sgS.sg+' / '+sgC);
{const T3=want[2];w.eval(`APP.solverSpin=true;APP.solverCor=false;APP.solverAJ=false;S.dist_m=100;Bus.notify();gotoPage('solver')`);await wait(40);
 const f=[...w.document.querySelectorAll('#page-solver .flag')].map(x=>x.textContent).find(t=>/Spin drift from the zero/.test(t))||'';
 const m=f.match(/dial (-?[\d.]+) mrad/);
 chk('Shot solver at 100 m: "Spin drift from the zero", same drift as the card row T3 (100 m)',m&&Math.abs(+m[1]-(-T3.sd/100))<0.006,f);
 w.eval(`APP.solverSpin=false;gotoPage('dope')`);await wait(20);}
chk('Litz formula anchor unchanged: Sg 1.5, 1.0 s → 85.725 mm',Math.abs(w.eval("spinDrift_mm(1.5,1.0,'right')")-85.725)<1e-9);
chk('note: no wind, spin drift only, EST, Sg shown',/Ranged stages: no wind — windage = spin drift only, measured from the zero \(Litz, EST/.test(txt('dc-note'))&&/at Sg \d\.\d\d\./.test(txt('dc-note')),txt('dc-note'));

// pause, session switch, off
w.eval('RFS[0].paused=true;rfRender()');
chk('paused rangefinder: status says nothing is added',/rangefinder paused — nothing is added/.test(txt('dc-rf-status')));
now+=60000;T.range(150,0);await wait(30);
chk('…and a ranging adds nothing',card().stages[0].dists.length===4);
w.eval('RFS[0].paused=false;rfSetFill(false);gotoPage("dope")');await wait(20);
const dist0=J('S.dist_m');now+=60000;T.range(150,0);await wait(30);
chk('session fill switched off: the card still fills (T5 150 m), the session distance doesn\'t',card().stages[0].dists.length===5&&J('S.dist_m')===dist0);
w.eval('rfSetFill(true)');
seg()[0].click();await wait(20);
now+=60000;const before=J('DB.dopeCards.map(c=>c.stages.map(s=>s.dists.length).join("/")).join()');T.range(200,1);await wait(30);
chk('Off: rangings add nothing to any card',J('DB.dopeCards.map(c=>c.stages.map(s=>s.dists.length).join("/")).join()')===before&&J('dopeRf')===null&&seg()[0].classList.contains('on'));

// On with a card open → new ranged stage in it; wind stages unchanged
const cid=J('currentDopeId');seg()[1].click();await wait(20);
chk('On with a card open → a second ranged stage in that card',J('DB.dopeCards.find(c=>c.id===currentDopeId).stages.length')===2&&J('dopeRf.cardId')===cid);
w.eval(`newDope()`);await wait(20);
const wc=J('getCard()');
w.eval(`calcDope()`);await wait(20);
const wst=w.document.querySelectorAll('#dc-stages .stage')[0];
const ww=J(`(()=>{const c=getCard(),tr=computeCardTraj(c),z=tr.z;return c.stages[0].dists.map(d=>{const s=solveShot(tr.pts,nearestPt,z.range,d.range,d.angle||0,d.wind||0,d.wdir??90,c.mv,tr.click,z.wSpd,z.wDir);return (d.wind?(s.clWind>=0?'→':'←')+Math.abs(s.clWind).toFixed(0):'—');});})()`);
chk('a wind card is unchanged: wind inputs, "Wind cl" column, windage "—" at zero wind (no spin drift added)',!!wst.querySelector('input[data-q="wind"]')&&/Wind cl/.test(wst.textContent)&&!/⊙ ranged/.test(wst.textContent)&&wc.stages[0].dists.map(d=>txt('dc-rw-'+d.id)).join()===ww.join()&&ww.every(x=>x==='—')&&!('rf' in wc.stages[0]),ww.join());
chk('…the card being filled is still the first one (status names it)',J('dopeRf.cardId')===cid&&new RegExp('in "'+J('DB.dopeCards.find(c=>c.id==="'+cid+'").name')+'"').test(txt('dc-rf-status')));

// print + export / import
w.eval(`document.getElementById('dc-sel').value='${cid}';loadDope();calcDope();printDope()`);await wait(20);
const ph=$('print-content').textContent;
chk('print: ranged stage has "Wind clk (spin only, EST)" and no wind column; T1 printed',/Wind clk \(spin only, EST\)/.test(ph)&&/T1/.test(ph)&&/Gong/.test(ph));
const rec=J(`sanitiseRecord('dopeCards',JSON.parse(JSON.stringify(DB.dopeCards.find(c=>c.id==='${cid}')))).rec`);
const recW=J(`sanitiseRecord('dopeCards',JSON.parse(JSON.stringify(DB.dopeCards.find(c=>c.id==='${wc.id}')))).rec`);
chk('export / import keeps the ranged stage kind; wind cards get no new key',rec.stages[0].rf===true&&rec.stages[0].dists.length===5&&!('rf' in recW.stages[0]));
const evil=J(`sanitiseRecord('dopeCards',{name:'x',stages:[{id:'a',name:'s',rf:'yes',dists:[]}]}).rec`);
chk('…a non-boolean rf is dropped on import',!('rf' in evil.stages[0]));

// pellet → no spin drift
w.eval(`(()=>{const c=DB.dopeCards.find(c=>c.id==='${cid}');const p=DB.projectiles.find(p=>p.type==='pellet'&&(p.bcg1>0||p.bcg7>0));c.projId=p.id;saveDB();loadDope();calcDope();})()`);await wait(20);
const c2=J(`DB.dopeCards.find(c=>c.id==='${cid}')`);
chk('pellet: windage "—", note says spin drift not computed (pellet)',c2.stages[0].dists.every(d=>txt('dc-rw-'+d.id)==='—')&&/spin drift not computed \(pellet\)/.test(txt('dc-note')),txt('dc-note'));

// deleted card while filling
w.eval(`deleteDope()`);await wait(20);now+=60000;T.range(300,0);await wait(30);
chk('card deleted while filling → switch turns off, nothing breaks',J('dopeRf')===null&&seg()[0].classList.contains('on'));
chk('nothing was ever written to the rangefinder',T.writes===0);
chk('no uncaught errors',w.errs.length===0,w.errs.join(' | '));
console.log('\nPASS '+pass+'   FAIL '+fail);
process.exit(fail?1:0);
})().catch(e=>{console.error('TEST CRASH:',e);process.exit(1);});
