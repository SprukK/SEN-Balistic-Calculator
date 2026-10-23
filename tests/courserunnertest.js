// Course runner test (V1.27.0, CORE-16 part 2): PRS and Big bore layouts run a dope card's
// course on Home — targets with dial/wind equal to Home's own solution, tap a target, per-target
// wind from bearings, Hit/Miss calls that advance through targets and stages, stage timer,
// hits, long targets beyond Home's default range, restart resumes, course switch resets,
// no course → guidance, imperial, escaping.
// Usage: node courserunnertest.js <app.html>   (needs jsdom; see README.md)
const {JSDOM}=require('jsdom'),fs=require('fs');
const FILE=process.argv[2];
const SK='sen_platform_v1';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let pass=0,fail=0;
const chk=(n,ok,extra)=>{console.log((ok?'  PASS  ':'  FAIL  ')+n+(extra?'   '+extra:''));ok?pass++:fail++;};
const all=[];
async function open(ls){
  const dom=new JSDOM(fs.readFileSync(FILE,'utf8'),{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',
    beforeParse(w){w.alert=()=>{};w.confirm=()=>true;if(ls)w.localStorage.setItem(SK,ls);
      w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:(t,k)=>k==='measureText'?()=>({width:10}):()=>{}});}});
  const w=dom.window;w.errs=[];w.addEventListener('error',e=>w.errs.push(e.message));
  await wait(700);all.push(w);return w;
}
const J=(w,e)=>JSON.parse(w.eval('JSON.stringify('+e+')'));
const $=(w,id)=>w.document.getElementById(id);
const rows=w=>[...w.document.querySelectorAll('#cs-targets .cs-row')].map(r=>({cur:r.classList.contains('cs-cur'),info:r.querySelector('.cs-info').textContent,dial:r.querySelector('.cs-dial').textContent,wind:r.querySelector('.cs-wind').textContent,calls:r.querySelector('.cs-calls').textContent}));
const solve=(w,range,rel)=>J(w,`(()=>{const tr=homeTraj(${range}+25),z=zeroConds(),s=solveShot(tr.pts,nearestPt,z.range,${range},0,S.wind.speed,${rel},S.mv,0.1,z.wSpd,z.wDir);return[(s.clElev>=0?'↑':'↓')+Math.abs(s.clElev).toFixed(0),(s.clWind>=0?'→':'←')+Math.abs(s.clWind).toFixed(0)];})()`);

(async()=>{
console.log('=== COURSE RUNNER TEST: '+FILE+' ===');
const w=await open();
w.eval(`Bus.setRifle(DB.rifles[0].id);Bus.setProj(DB.projectiles.find(p=>/Queen/.test(p.name)&&p.bcg7>0).id);Bus.setWx('cur',DB.weathers[0].id);Bus.setWx('zero',DB.weathers[0].id);S.mv=255;Bus.setWind(3,90,'manual');Bus.notify();`);

// 1. PRS layout, no course yet.
w.eval(`useLayout(APP.layouts.find(l=>l.name==='PRS').id)`);await wait(30);
chk('PRS layout shows the course runner first',!$(w,'home-course').classList.contains('mod-off')&&[...$(w,'page-home').children].filter(e=>!e.classList.contains('mod-off')&&/^home-(course|dash)$/.test(e.id)).map(e=>e.id).join()==='home-course,home-dash');
chk('no dope card → guidance to build a course in Dope',/No course yet — build one in the Dope tab/.test($(w,'cs-stage').textContent));

// 2. Build a course: stage 1 = T1 100 m, T2 150 m (bearing 180, 2 shots, 60 mm, kneeling, 90 s); stage 2 = 300 m.
w.eval(`newDope();const c=DB.dopeCards[0];c.name='Club PRS';const st=c.stages[0];st.name='Barricade';st.time=90;
  st.dists=[{id:'a',range:100,angle:0,wind:0,wdir:90,label:'T1',brg:null,size:null,pos:'',shots:1},{id:'b',range:150,angle:0,wind:0,wdir:90,label:'T2',brg:180,size:60,pos:'kneel',shots:2}];
  c.stages.push({id:'s2',name:'Long',notes:'',time:null,dists:[{id:'c',range:300,angle:0,wind:0,wdir:90,label:'<img src=x id=pwn>',brg:null,size:null,pos:'',shots:1}]});saveDB();
  courseSelect(c.id);`);await wait(30);
let R=rows(w);
chk('stage header + targets listed, first target current, session distance = 100 m',$(w,'cs-stage').textContent==='Stage 1 of 2 · Barricade'&&R.length===2&&R[0].cur&&w.eval('S.dist_m')===100,JSON.stringify(R));
const s1=solve(w,100,90);
chk('T1 dial/wind = Home solution (session wind 3 m/s, 90°)',R[0].dial===s1[0]&&R[0].wind===s1[1],R[0].dial+' '+R[0].wind+' vs '+s1);
chk('…and equals Home\'s big elevation cell',$(w,'home-elev').textContent===R[0].dial);
chk('target info: label, range, size, position',R[1].info==='T2 · 150 m · 60 mm · Kneeling',R[1].info);

// 3. Per-target wind from bearings: wind FROM 270° compass; T2 bearing 180 → rel 90 (full cross); T1 no bearing → session angle.
w.eval(`S.wind.from=270;S.wind.dir=0;Bus.notify()`);await wait(20);R=rows(w);
const t2=solve(w,150,90),t1=solve(w,100,0);
chk('T2 (bearing 180°) gets full crosswind from the compass wind, T1 keeps the session angle (headwind → 0)',R[1].wind===t2[1]&&R[0].wind===t1[1]&&t1[1]==='→0',R.map(r=>r.wind).join());
w.eval(`S.wind.from=null;S.wind.dir=90;Bus.notify()`);await wait(20);

// 4. Tap a target → session distance follows.
w.document.querySelectorAll('#cs-targets .cs-row')[1].click();await wait(20);
chk('tap T2 → it is current, session distance 150 m, Home solution follows',rows(w)[1].cur&&w.eval('S.dist_m')===150&&$(w,'home-elev').textContent===rows(w)[1].dial);

// 5. Calls advance through shots, targets and stages.
w.eval('courseGo(0)');const btn=t=>[...w.document.querySelectorAll('#home-course .cs-calls button')].find(b=>b.textContent===t);
btn('Hit').click();await wait(20);
chk('Hit on T1 (1 shot) → ✓ and moves to T2',rows(w)[0].calls==='✓'&&rows(w)[1].cur&&rows(w)[1].calls==='··');
btn('Miss').click();await wait(20);
chk('Miss on T2 (2 shots) → ✗·, stays on T2',rows(w)[1].calls==='✗·'&&rows(w)[1].cur);
btn('Hit').click();await wait(20);R=rows(w);
chk('second shot → stage 2, its target current, distance 300 m',$(w,'cs-stage').textContent==='Stage 2 of 2 · Long'&&R.length===1&&R[0].cur&&w.eval('S.dist_m')===300);
const s3=solve(w,300,90);
chk('300 m target solves (beyond Home\'s default 150 m range)',R[0].dial===s3[0]&&R[0].dial!=='—',R[0].dial);
chk('hits so far: 2 / 3',/^Hits 2 \/ 3/.test($(w,'cs-score').textContent),$(w,'cs-score').textContent);
chk('target label rendered as text (no HTML)',!w.document.getElementById('pwn')&&/<img/.test(R[0].info));

// 6. Stage timer (stage 1 has 90 s).
w.eval('courseStageGo(-1)');await wait(20);
let fake=w.Date.now();const real=w.Date.now;w.Date.now=()=>fake;
$(w,'cs-tbtn').click();fake+=30000;w.eval('renderCourseTimer()');
chk('stage timer 1:30 counts down (1:00 after 30 s)',$(w,'cs-timer').textContent==='1:00'&&$(w,'cs-tbtn').textContent==='Reset');
w.Date.now=real;$(w,'cs-tbtn').click();
w.eval('courseStageGo(1)');await wait(20);
chk('stage without a time limit hides the timer',$(w,'cs-tbtn').style.display==='none'&&$(w,'cs-timer').textContent==='');

// 7. Restart resumes; switching course resets.
w.eval('saveDB()');await wait(30);
const r=await open(w.localStorage.getItem(SK));await wait(50);
chk('restart: same layout, stage 2, calls kept',/^PRS/.test($(r,'home-layout-name').textContent)&&$(r,'cs-stage').textContent==='Stage 2 of 2 · Long'&&J(r,'APP.run.calls.b').join()==='m,h');
r.eval(`newDope();DB.dopeCards[1].name='Other';saveDB();courseSelect(DB.dopeCards[1].id)`);await wait(20);
chk('selecting another course resets stage, target and calls',J(r,'APP.run.si')===0&&J(r,'Object.keys(APP.run.calls).length')===0&&$(r,'cs-card').value===J(r,'DB.dopeCards[1].id'));

// 8. Big bore layout uses the same runner; imperial.
w.eval(`useLayout(APP.layouts.find(l=>l.name==='Big bore').id);setUnit('range','yd');setUnit('tsize','in')`);await wait(30);
chk('Big bore layout runs the course too; ranges and sizes in yd / in',!$(w,'home-course').classList.contains('mod-off')&&/ yd/.test(rows(w)[0].info)&&!/\d m\b/.test($(w,'cs-targets').textContent),rows(w)[0].info);

const errs=all.flatMap(x=>x.errs);
chk('ZERO uncaught errors',errs.length===0,errs.slice(0,3).join(' / '));
console.log('\nPASS '+pass+'   FAIL '+fail);
process.exit(fail?1:0);
})().catch(e=>{console.error('TEST CRASH:',e);process.exit(1);});
