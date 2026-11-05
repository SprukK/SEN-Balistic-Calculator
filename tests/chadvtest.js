// Chrono Advanced + Chrono Graph Home modules, shot-string notes (V2.16.0).
// Checks: two new Home modules, off in every template, usable on either side of the inner screen; Chrono
// Advanced lists every shot newest first with Shot #, m/s, fps, running SD of the kept shots (sample, n−1,
// reproduced here independently) with its change, and the arrival time (LabRadar live; typed strings "—");
// excluded shots marked and skipped by the running SD; a new shot appears at once; the Graph draws one bar per
// shot around the mean, eases to the targets (and jumps with reduced motion); times stay with their shots
// when the string is cleaned; notes are saved, survive a restart and are cleared with the string. No errors.
// Usage: node chadvtest.js <app.html>   (needs jsdom; see README.md)
const {JSDOM}=require('jsdom'),fs=require('fs');
const FILE=process.argv[2];
const SK='sen_platform_v1';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let pass=0,fail=0;
const chk=(n,ok,extra)=>{console.log((ok?'  PASS  ':'  FAIL  ')+n+(extra?'   '+extra:''));ok?pass++:fail++;};
async function open(ls,reduce){
  const dom=new JSDOM(fs.readFileSync(FILE,'utf8'),{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',
    beforeParse(w){Object.defineProperty(w,'innerWidth',{configurable:true,value:412});Object.defineProperty(w,'innerHeight',{configurable:true,value:915});
      w.matchMedia=q=>({matches:/coarse/.test(q)||(reduce&&/reduce/.test(q)),addEventListener(){},removeEventListener(){}});
      w.alert=()=>{};w.confirm=()=>true;w.scrollTo=()=>{};if(ls)w.localStorage.setItem(SK,ls);
      w.draws=0;w.HTMLCanvasElement.prototype.getContext=function(){const cv=this;return new Proxy({},{get:(t,k)=>k==='measureText'?()=>({width:10}):k==='fillRect'?()=>{if(cv.id==='chg-canvas')w.draws++;}:()=>{}});};}});
  const w=dom.window;w.errs=[];w.addEventListener('error',e=>w.errs.push(e.message));await wait(700);return w;
}
const sdN1=a=>{const n=a.length,m=a.reduce((x,y)=>x+y,0)/n;return Math.sqrt(a.reduce((x,v)=>x+(v-m)**2,0)/(n-1));};
(async()=>{
console.log('=== CHRONO ADVANCED + GRAPH TEST: '+FILE+' ===');
let w=await open();
const $=id=>w.document.getElementById(id),J=e=>JSON.parse(w.eval('JSON.stringify('+e+')'));
chk('two new Home modules: Chrono Advanced, Chrono Graph',!!J("HOME_MODS.chronoadv")&&!!J("HOME_MODS.chronograph")&&!!$('home-chronoadv')&&!!$('home-chronograph'));
chk('…off in every template and every stored layout',J("APP.layouts.every(L=>L.mods.filter(m=>m.id==='chronoadv'||m.id==='chronograph').every(m=>!m.on))")&&J("Object.keys(LAYOUT_TPL).every(t=>!LAYOUT_TPL[t].on.includes('chronoadv')&&!LAYOUT_TPL[t].on.includes('chronograph'))"));
w.eval(`const L=activeLayout();L.mods.forEach(m=>{if(m.id==='chronoadv'||m.id==='chronograph')m.on=true;});layoutChanged(L);gotoPage('home')`);await wait(30);
chk('turned on: both shown on Home; no string → says where shots come from',!$('home-chronoadv').classList.contains('mod-off')&&!$('home-chronograph').classList.contains('mod-off')&&/No shot string yet/.test($('cha-sum').textContent)&&$('cha-body').children.length===0);

// LabRadar live shots with arrival times
let now=Date.UTC(2026,10,5,19,0,5);w.Date.now=()=>now;
const LRD={link:{name:'LLXA001Y6EP'},paused:false,series:57};w.LRD=LRD;
const shots=[280.10,281.40,279.80,282.00,280.60];
for(const v of shots){now+=7000;w.eval(`lrShot(LRD,${v})`);await wait(5);}
const rows=()=>[...$('cha-body').children].map(tr=>[...tr.children].map(td=>td.textContent));
const R=rows();
chk('every shot listed, newest on top',R.length===5&&R[0][0]==='5'&&R[4][0]==='1'&&$('cha-body').children[0].classList.contains('cha-new'));
chk('columns: Shot #, m/s, fps (both always), running SD (Δ), time',[...$('home-chronoadv').querySelectorAll('th')].map(t=>t.textContent).join()==='#,m/s,fps,SD m/s (Δ),Time'&&R[4][1]==='280.10'&&R[4][2]===(280.10/0.3048).toFixed(1));
const exp=shots.map((_,i)=>i?sdN1(shots.slice(0,i+1)):null);
chk('running SD = sample SD of the shots so far (reproduced here); first shot "—"',R[4][3]==='—'&&[1,2,3,4].every(i=>R[4-i][3].startsWith(exp[i].toFixed(2))),R.map(r=>r[3]).join(' | '));
chk('…with its change from the previous shot\'s SD (↑ / ↓)',[2,3,4].every(i=>{const d=exp[i]-exp[i-1],t=R[4-i][3];return t.includes((d>0?'↑':'↓')+Math.abs(d).toFixed(2));})&&!/[↑↓]/.test(R[3][3]));
const hh=t=>{const d=new Date(t);return [d.getHours(),d.getMinutes(),d.getSeconds()].map(n=>String(n).padStart(2,'0')).join(':');};
chk('arrival time of each LabRadar shot (HH:MM:SS)',R[4][4]===hh(Date.UTC(2026,10,5,19,0,12))&&R[0][4]===hh(Date.UTC(2026,10,5,19,0,40)),R.map(r=>r[4]).join());
chk('summary: kept, mean (m/s + fps), ES, SD',new RegExp('^5 kept of 5 · mean '+(shots.reduce((a,b)=>a+b)/5).toFixed(1)+' m/s').test($('cha-sum').textContent)&&$('cha-sum').textContent.includes('SD '+sdN1(shots).toFixed(2)),$('cha-sum').textContent);
// exclude shot 4
w.eval('chToggle(3)');await wait(10);
const R2=rows(),k2=[280.10,281.40,279.80,280.60];
chk('excluded shot marked; running SD skips it',$('cha-body').children[1].classList.contains('cha-off')&&R2[1][3]==='excluded'&&R2[0][3].startsWith(sdN1(k2).toFixed(2))&&R2[1][4]!=='—',R2.map(r=>r[3]).join(' | '));
w.eval('chToggle(3)');await wait(10);

// graph
chk('graph: one bar per shot, label with mean / ES / SD',J('CHG.h.length')===5&&/^5 shots · mean/.test($('chg-lab').textContent));
await wait(1200);
const mean=shots.reduce((a,b)=>a+b)/5,dev=shots.map(v=>v-mean);
chk('…bars ease to each shot\'s distance from the mean; scale = largest deviation + 15 %',J('CHG.h').every((h,i)=>Math.abs(h-dev[i])<0.01)&&Math.abs(J('CHG.scale')-Math.max(...dev.map(Math.abs))*1.15)<0.01);
const before=J('CHG.h.length');now+=7000;w.eval('lrShot(LRD,284.0)');await wait(20);
const grow=J('CHG.h[5]'),mean2=(shots.reduce((a,b)=>a+b)+284)/6;
chk('a new shot: listed at once and its bar grows from the mean line (animated)',rows()[0][1]==='284.00'&&J('CHG.h.length')===before+1&&Math.abs(grow)<Math.abs(284-mean2)&&Math.abs(grow)>=0);
await wait(1200);
chk('…and reaches its height; the scale follows',Math.abs(J('CHG.h[5]')-(284-mean2))<0.01&&Math.abs(J('CHG.scale')-Math.max(...[...shots,284].map(v=>Math.abs(v-mean2)))*1.15)<0.01);
chk('graph is drawn on its canvas',w.draws>0);

// reduced motion
const ls0=(w.eval('saveDB()'),await wait(60),w.localStorage.getItem(SK));
const m=await open(ls0,true);
chk('reduced motion: bars at their height at once',(()=>{const h=JSON.parse(m.eval('JSON.stringify(CHG.h)')),c=JSON.parse(m.eval('JSON.stringify(chClean(APP.chronoStr))')),mm=c.shots.reduce((a,b)=>a+b)/c.shots.length;return h.length===6&&h.every((x,i)=>Math.abs(x-(c.shots[i]-mm))<1e-9);})());

// times kept with their shots; typed strings have none
const cl=J(`chClean({shots:[280,'bad',281,-5,282],times:[1000,2000,3000,4000,'x']})`);
chk('cleaning the string keeps each time with its shot',cl.shots.join()==='280,281,282'&&cl.times[0]===1000&&cl.times[1]===3000&&cl.times[2]===null);
w.eval(`chSet({shots:[280.1,281.2],off:[],src:'typed'})`);await wait(10);
chk('typed string: time "—"',rows().every(r=>r[4]==='—'));

// notes
w.eval(`gotoPage('sensors')`);const ta=$('ch-notes');ta.value='Queen lot 7 · 160 bar · 18 °C';ta.dispatchEvent(new w.Event('input'));await wait(10);
chk('notes field on Sensors → Chronograph saves as you type',J('APP.chNotes')==='Queen lot 7 · 160 bar · 18 °C');
w.eval('saveDB()');await wait(60);
const r=await open(w.localStorage.getItem(SK));
chk('…kept after a restart',r.document.getElementById('ch-notes').value==='Queen lot 7 · 160 bar · 18 °C');
w.eval('chClear()');await wait(10);
chk('Clear starts a new string: notes cleared too',J('APP.chNotes')===''&&$('ch-notes').value===''&&/No shot string yet/.test($('cha-sum').textContent));

// inner screen
chk('both can go on either side of the inner screen',J(`normLayout({id:'x',name:'n',mods:[],modsInner:[{id:'chronograph',on:true,side:'r'},{id:'chronoadv',on:true,side:'l'}]}).modsInner.filter(m=>m.id.startsWith('chrono')&&m.id!=='chrono').map(m=>m.id+':'+m.side)`).join()==='chronograph:r,chronoadv:l');
const src=fs.readFileSync(FILE,'utf8'),blk=src.slice(src.indexOf('V2.16.0 — Chrono Advanced + Chrono Graph'),src.indexOf('CORE-16 (V1.26.0) — HOME LAYOUTS'));
chk('module code: no innerHTML',blk.length>500&&!/innerHTML/.test(blk));
chk('no uncaught errors',w.errs.length===0&&m.errs.length===0&&r.errs.length===0,w.errs.concat(m.errs,r.errs).join(' | '));
console.log('\nPASS '+pass+'   FAIL '+fail);
process.exit(fail?1:0);
})().catch(e=>{console.error('TEST CRASH:',e);process.exit(1);});
