// Chrono session analysis test (V2.6.0, CALC-07): shot string typed in the display unit or imported from a
// Garmin Xero CSV → n, mean, ES, SD (sample) of the kept shots; tap to exclude; Xero summary cross-check;
// "Use" → session MV; vertical spread table = session trajectory re-run at other MVs with the launch angle
// fixed (flight.mv), independently checked against the first-order formula; flight.mv omitted / equal MV is
// bit-identical; yards rows; guidance without a session; restart; garbage cleaned; text only.
// Usage: node chronotest.js <app.html>   (needs jsdom; see README.md)
const {JSDOM}=require('jsdom'),fs=require('fs');
const FILE=process.argv[2];
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let pass=0,fail=0;
const chk=(n,ok,extra)=>{console.log((ok?'  PASS  ':'  FAIL  ')+n+(extra?'   '+extra:''));ok?pass++:fail++;};
const dom=new JSDOM(fs.readFileSync(FILE,'utf8'),{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',
  beforeParse(w){w.alert=()=>{};w.confirm=()=>true;w.scrollTo=()=>{};
    w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:(t,k)=>k==='measureText'?()=>({width:10}):()=>{}});}});
const w=dom.window;w.errs=[];w.addEventListener('error',e=>w.errs.push(e.message));
const J=e=>JSON.parse(w.eval('JSON.stringify('+e+')'));
const $=id=>w.document.getElementById(id);
const res=()=>$('ch-res').textContent;
// The owner's Xero export (screenshot 2026-10-29), 48 shots in fps.
const FPS=[282.3,283.0,283.0,281.5,283.2,282.2,283.6,282.8,280.4,281.7,280.7,279.3,280.1,280.5,278.6,280.0,279.5,279.4,279.2,280.3,279.4,280.0,283.6,280.6,279.8,280.6,280.7,280.6,277.7,281.6,279.4,279.1,281.0,280.8,280.0,279.6,283.1,279.3,281.8,278.9,279.8,279.5,279.9,281.1,279.3,280.9,280.5,279.1];
function xeroCsv(shots,{dl=',',unit='FPS',dec='.',avg='280.6',sd='1.4',es='5.9'}={}){
  const n=x=>String(x.toFixed(1)).replace('.',dec),q=s=>'"'+s+'"';
  const mean=shots.reduce((a,b)=>a+b,0)/shots.length;
  const L=[['Air Rifle Pellet','','','','','',''],['#','SPEED ('+unit+')','Δ AVG ('+unit+')','KE (FT-LB)','POWER FACTOR (KGR⋅FT/S)','TIME','SHOT NOTES']];
  shots.forEach((v,i)=>L.push([String(i+1),n(v),n(v-mean),'','','1:40:'+String(i).padStart(2,'0')+' PM','']));
  L.push(['-'],['AVERAGE SPEED',avg.replace('.',dec)],['STD DEV',sd.replace('.',dec)],['SPREAD',es.replace('.',dec)],['SESSION NOTE',''],['-'],['DATE',q('February 15, 2024 at 1:40 PM')],['All shots included in the calculations']);
  return '﻿'+L.map(r=>r.join(dl)).join('\r\n');
}
const mean=a=>a.reduce((x,y)=>x+y,0)/a.length;
const sdS=a=>{const m=mean(a);return Math.sqrt(a.reduce((s,x)=>s+(x-m)**2,0)/(a.length-1));};
(async()=>{
console.log('=== CHRONO SESSION TEST: '+FILE+' ===');
await wait(700);
// ── solver: flight.mv ─────────────────────────────────────────────────────────────────────────────
const ident=J(`(()=>{const e=FX_ENV(),a=rk4traj(255,0.128,60,50,150,0.044,e.rho,e.aS,1,'g7',0.245,null),b=rk4traj(255,0.128,60,50,150,0.044,e.rho,e.aS,1,'g7',0.245,null,undefined,{mv:255});return a.every((p,i)=>p.drop===b[i].drop&&p.tof===b[i].tof&&p.v===b[i].v)&&a.za===b.za})()`);
chk('flight.mv = the zero MV → trajectory bit-identical to no flight object',ident);
const pbc=J(`[fxMvSpread(2.5,50),fxMvSpread(2.5,100),fxMvSpread(2.5,150),fxMvSpread(1.4,100)]`),want=[7.537,30.743,70.577,17.214];
chk('fixed-angle MV spread = py-ballisticcalc 3.1.1 (Queen, zero 50 m @255: ±2.5 at 50/100/150 m, ±1.4 at 100 m) within 0.05 mm',pbc.every((v,i)=>Math.abs(v-want[i])<=0.05),pbc.map(x=>x.toFixed(3)).join(' / '));
const za=J(`(()=>{const e=FX_ENV();return[rk4traj(255,0.128,60,50,150,0.044,e.rho,e.aS,1,'g7',0.245,null).za,rk4traj(255,0.128,60,50,150,0.044,e.rho,e.aS,1,'g7',0.245,null,undefined,{mv:260}).za]})()`);
chk('another flight MV keeps the zero angle (rifle sighted in at the session MV)',za[0]===za[1]);
// ── typed string (m/s) ────────────────────────────────────────────────────────────────────────────
w.eval(`const r=DB.rifles.find(x=>/\\.25/.test(x.name));Bus.setRifle(r.id);Bus.setProj(DB.projectiles.find(p=>/^Altaros ATP Queen/.test(p.name)).id);Bus.setWx('cur',DB.weathers[0].id);S.mv=280;S.dist_m=100;Bus.notify();`);
w.eval(`gotoPage('sensors')`);
chk('Sensors: shot-string box, Read / Import Xero CSV / Clear',!!$('ch-str')&&/Read shots/.test($('page-sensors').textContent)&&/Import Xero CSV/.test($('page-sensors').textContent)&&$('ch-file').accept.includes('.csv'));
chk('hint follows the velocity unit (m/s)',/Velocities in m\/s/.test($('ch-hint').textContent));
const MS=[279.8,281.2,280.4,279.1,282.0,280.9];
$('ch-str').value=MS.join(', ');w.eval('chReadString()');
const st=J('chStats(chKept(chClean(APP.chronoStr)))');
chk('typed string read: 6 shots, mean / ES / SD (n−1) = independent',st.n===6&&Math.abs(st.mean-mean(MS))<1e-12&&Math.abs(st.es-2.9)<1e-9&&Math.abs(st.sd-sdS(MS))<1e-12,JSON.stringify(st));
chk('stats shown with units, under 10 shots noted',/Shots6/.test(res())&&/Mean280\.6 m\/s/.test(res())&&/ES2\.9 m\/s/.test(res())&&/SD1\.0 m\/s/.test(res())&&/target is over 10 shots/.test(res()),res().slice(0,160));
chk('one chip per shot, all kept',$('ch-res').querySelectorAll('.chshot').length===6&&[...$('ch-res').querySelectorAll('.chshot')].every(b=>b.getAttribute('aria-pressed')==='true'));
$('ch-str').value='280.1 28o.5';w.eval('chReadString()');
chk('a bad token → warning naming it, the stored string unchanged',/"28o\.5" is not a velocity/.test($('ch-msg').textContent)&&J('APP.chronoStr.shots.length')===6);
// ── table ─────────────────────────────────────────────────────────────────────────────────────────
const rows=[...$('ch-res').querySelectorAll('table tr')].map(r=>[...r.children].map(c=>c.textContent));
chk('table rows at 25 / 50 / 75 / 100 m (session distance 100 m)',rows.slice(1).map(r=>r[0]).join()==='25 m,50 m,75 m,100 m',rows.map(r=>r[0]).join());
const v=J(`chVert(chStats(chKept(chClean(APP.chronoStr))))`);
const fo=J(`(()=>{const t=homeTraj(0).pts,s=chStats(chKept(chClean(APP.chronoStr)));return[25,50,75,100].map(d=>{const p=nearestPt(t,d);return[G*p.tof*p.tof*s.sd/S.mv*1000,G*p.tof*p.tof*s.es/S.mv*1000];});})()`);
// First-order g·t²·ΔV/V₀ ignores that a faster shot also meets more drag, so it reads a few % high (pbc: 31.5 vs
// 30.7 mm at 100 m); the exact values are pinned to py-ballisticcalc above. Here: same size, never above it.
chk('±1 SD and ES rows: within 5 % of the first-order g·t²·ΔV/V₀ (independent) and not above it',v.rows.every((r,i)=>r.sd/fo[i][0]>0.95&&r.sd<=fo[i][0]&&r.es/fo[i][1]>0.95&&r.es<=fo[i][1]),v.rows.map((r,i)=>r.es.toFixed(2)+'/'+fo[i][1].toFixed(2)).join(' '));
chk('spread grows with distance; ES row > ±1 SD row',v.rows.every((r,i)=>i===0||r.es>v.rows[i-1].es)&&v.rows.every(r=>r.es>r.sd));
chk('table cells show the drop unit',/^±\d+\.\d mm$/.test(rows[2][1])&&/^\d+\.\d mm$/.test(rows[2][2]),rows[2].join(' | '));
chk('note: zero held at the session MV, MV only',/Zero held at the session MV 280\.0 m\/s/.test(res())&&/MV only/.test(res()));
// ── Use ───────────────────────────────────────────────────────────────────────────────────────────
[...$('ch-res').querySelectorAll('button')].find(b=>/Use mean/.test(b.textContent)).click();await wait(20);
chk('Use → session MV = mean (from chrono), ES/SD stored for Home',Math.abs(J('S.mv')-Math.round(mean(MS)*1000)/1000)<1e-9&&J('S.src.mv')==='chrono'&&Math.abs(J('APP.chrono.es')-2.9)<1e-9&&Math.abs(J('APP.chrono.sd')-Math.round(sdS(MS)*1000)/1000)<1e-9);
chk('after Use: no "session MV differs" hint',!/Session MV is/.test(res()));
// ── Xero CSV (paste and file) ────────────────────────────────────────────────────────────────────
$('ch-str').value=xeroCsv(FPS);w.eval('chReadString()');
const x=J('chClean(APP.chronoStr)'),xs=J('chStats(chKept(chClean(APP.chronoStr)))');
chk('pasted Xero CSV: 48 shots, fps → m/s exactly, name and quoted date',x.shots.length===48&&x.shots.every((s,i)=>Math.abs(s-FPS[i]*0.3048)<1e-12)&&x.name==='Air Rifle Pellet'&&x.date==='February 15, 2024 at 1:40 PM'&&x.src==='xero'&&x.unit==='fps');
chk('Xero stats = Python statistics (mean 280.604167, SD 1.426640, ES 5.9 fps)',Math.abs(xs.mean/0.3048-280.604167)<1e-6&&Math.abs(xs.sd/0.3048-1.426640)<1e-6&&Math.abs(xs.es/0.3048-5.9)<1e-9);
chk('Xero summary matches → info flag',/Xero summary \(all shots\) matches/.test(res()),res().match(/Xero summary[^.]*/)?.[0]);
chk('source line: Xero CSV · name · date · 48 shots',/Xero CSV · Air Rifle Pellet · February 15, 2024 at 1:40 PM · 48 shots/.test(res()));
chk('session MV differs from the string → hint',/Session MV is 280\.6 m\/s; this string averages 85\.5 m\/s/.test(res()),res().match(/Session MV is[^.]*\.[^.]*\./)?.[0]);
w.eval('chClear()');
chk('Clear empties the box and the result',$('ch-str').value===''&&res()===''&&J('APP.chronoStr')===null);
const file=new w.File([xeroCsv(FPS)],'xero.csv',{type:'text/csv'});
w.chImportFile({files:[file],value:'x'});await wait(80);
chk('file import: same 48 shots; the box shows them in the display unit',J('APP.chronoStr.shots.length')===48&&$('ch-str').value.split(' ').length===48&&$('ch-str').value.startsWith('86.0 86.3'),$('ch-str').value.slice(0,20));
const semi=xeroCsv(FPS.map(f=>f*0.3048),{dl:';',unit:'M/S',dec:',',avg:'85.5',sd:'0.4',es:'1.8'});
$('ch-str').value=semi;w.eval('chReadString()');
const s2=J('chClean(APP.chronoStr)');
chk('semicolon + decimal-comma variant with SPEED (M/S) is read',s2.shots.length===48&&s2.unit==='ms'&&Math.abs(s2.shots[0]-+(282.3*0.3048).toFixed(1))<1e-9);
$('ch-str').value=xeroCsv(FPS.filter((_,i)=>i!==28));   // slowest shot missing: ES 5.0 vs the summary's 5.9
w.eval('chReadString()');
chk('summary that does not match the shots (file left one out) → warning',/Xero summary differs/.test(res()));
$('ch-str').value='#,SPEED (KMH)\n1,300';w.eval('chReadString()');
chk('unknown speed unit refused',/Unknown speed unit "KMH"/.test($('ch-msg').textContent));
$('ch-str').value='a,b\n1,2';w.eval('chReadString()');
chk('plain numbers that are not a Xero file stay typed numbers ("a" refused)',/"a" is not a velocity/.test($('ch-msg').textContent));
// ── exclusion ─────────────────────────────────────────────────────────────────────────────────────
$('ch-str').value=xeroCsv(FPS);w.eval('chReadString()');
$('ch-res').querySelectorAll('.chshot')[28].click();   // shot 29: 277.7 fps, the slowest
const ex=J('chStats(chKept(chClean(APP.chronoStr)))'),kept=FPS.filter((_,i)=>i!==28);
chk('tap shot 29 → excluded: 47 shots, ES 5.0 fps, SD = independent',ex.n===47&&Math.abs(ex.es/0.3048-5.0)<1e-9&&Math.abs(ex.sd/0.3048-sdS(kept))<1e-9);
const chip=$('ch-res').querySelectorAll('.chshot')[28];
chk('excluded chip struck through, aria-pressed false; source line counts it',chip.classList.contains('off')&&chip.getAttribute('aria-pressed')==='false'&&/1 excluded/.test(res()));
chk('with exclusions the Xero summary is shown as "all shots", not as a mismatch',/Xero summary \(all shots\) matches/.test(res()));
chip.click();
chk('tap again → back in (48 shots)',J('chStats(chKept(chClean(APP.chronoStr))).n')===48);
$('ch-str').value='85 86';w.eval('chReadString()');
$('ch-res').querySelectorAll('.chshot')[0].click();$('ch-res').querySelectorAll('.chshot')[1].click();
chk('the last kept shot cannot be excluded',J('chStats(chKept(chClean(APP.chronoStr))).n')===1);
chk('one shot → table asks for at least 2',/Needs at least 2 shots/.test(res()));
// ── imperial ──────────────────────────────────────────────────────────────────────────────────────
w.eval(`setUnit('vel','fps');setUnit('range','yd');gotoPage('sensors')`);
chk('hint in fps',/Velocities in fps/.test($('ch-hint').textContent));
$('ch-str').value='280 281 279.5';w.eval('chReadString()');
chk('typed in fps → stored in m/s',J('APP.chronoStr.shots').every((s,i)=>Math.abs(s-[280,281,279.5][i]*0.3048)<1e-12));
const yr=[...$('ch-res').querySelectorAll('table tr')].slice(1).map(r=>r.firstChild.textContent);
const dYd=J('S.dist_m')/0.9144;
chk('rows at 25 yd steps out to the session distance',yr.slice(0,4).join()==='25 yd,50 yd,75 yd,100 yd'&&yr.length>=4,yr.join()+' (session '+dYd.toFixed(1)+' yd)');
chk('first row at exactly 22.86 m',Math.abs(J('chVert(chStats(chKept(chClean(APP.chronoStr)))).rows[0].d')-22.86)<1e-9);
w.eval(`setUnit('vel','ms');setUnit('range','m');gotoPage('sensors')`);
// ── no session ────────────────────────────────────────────────────────────────────────────────────
w.eval(`S.projId=null;Bus.notify();`);await wait(20);
chk('no projectile → guidance instead of a table',/Needs a rifle, projectile, MV and current weather/.test(res())&&!$('ch-res').querySelector('table'));
w.eval(`Bus.setProj(DB.projectiles.find(p=>/^Altaros ATP Queen/.test(p.name)).id);Bus.notify();`);await wait(20);
chk('Bus change re-renders the open page (table back)',!!$('ch-res').querySelector('table'));
// ── restart + garbage ─────────────────────────────────────────────────────────────────────────────
$('ch-str').value=xeroCsv(FPS);w.eval('chReadString()');$('ch-res').querySelectorAll('.chshot')[3].click();
const snap=w.eval('snapshotJSON()');
w.eval(`APP.chronoStr=null;applySnapshot(JSON.parse(${JSON.stringify(snap)}));chRender();`);
chk('restart: shots, exclusion, Xero summary survive',J('APP.chronoStr.shots.length')===48&&J('APP.chronoStr.off').join()==='3'&&J('APP.chronoStr.xero.avg')>0&&$('ch-res').querySelectorAll('.chshot.off').length===1);
w.eval(`APP.chronoStr={shots:['<img src=x onerror=alert(1)>',1e9,-5,85,NaN,86],off:[0,1,'x',9],name:'<b>bold</b>'.repeat(20),date:{x:1},src:'evil',unit:'kmh',xero:{avg:'a',sd:-1,es:0.3}};chRender();`);
const g=J('chClean(APP.chronoStr)');
chk('garbage (from an import) cleaned: numbers only, exclusions that would leave nothing dropped, strings capped, unknown src/unit → defaults',g.shots.join()==='85,86'&&g.off.length===0&&g.name.length===60&&g.date===''&&g.src==='typed'&&g.unit==='ms'&&JSON.stringify(g.xero)==='{"es":0.3}');
chk('…and at least one shot kept when every shot is marked excluded',J('chStats(chKept(chClean(APP.chronoStr))).n')===2);
chk('text only: no element injected from the name',!$('ch-res').querySelector('b b, img')&&/<b>bold<\/b>/.test(res()));
const src=w.eval(`[chClean,chParseTyped,chParseXero,chCsvRows,chMsg,chSet,chReadString,chImportFile,chClear,chToggle,chUse,chVert,chRender].map(String).join('')`);
chk('no HTML sinks in the CALC-07 code',!/innerHTML|insertAdjacentHTML|outerHTML|document\.write/.test(src));
chk('ZERO uncaught errors',w.errs.length===0,w.errs.join(' | '));
console.log(`\nPASS ${pass}   FAIL ${fail}`);process.exit(fail?1:0);
})();
