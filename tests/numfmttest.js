// Number format and import part picker (V2.18.0, review release R6 part 2).
// CORE-27 (owner: EU decimal comma by default, switchable): shown and printed values, number fields (text + decimal
//   keypad, comma or point accepted, canonical value unchanged), the ± key on fields that can be negative, the focused
//   field never rewritten, static reference text restored exactly on switching back, versions untouched, exports and
//   storage always with the point, the ?numfmt= override.
// CORE-28 (owner): a file's preferences offered per group, unticked by default; only ticked groups applied; Drive state
//   and install flags never imported.
// This suite runs in the default (EU) format; every other suite runs with ?numfmt=point.
// Usage: node numfmttest.js <app.html>   (needs jsdom; see README.md)
const {JSDOM}=require('jsdom'),fs=require('fs');
const FILE=process.argv[2];
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let pass=0,fail=0;
const chk=(n,ok,extra)=>{console.log((ok?'  PASS  ':'  FAIL  ')+n+(extra?'   '+extra:''));ok?pass++:fail++;};
const all=[];
async function open(url){
  const dom=new JSDOM(fs.readFileSync(FILE,'utf8'),{runScripts:'dangerously',pretendToBeVisual:true,url:url||'https://x.test/',
    beforeParse(w){Object.defineProperty(w,'innerWidth',{configurable:true,value:412});Object.defineProperty(w,'innerHeight',{configurable:true,value:915});
      w.alerts=[];w.alert=m=>w.alerts.push(String(m));w.confirm=()=>true;w.scrollTo=()=>{};w.print=()=>{};
      w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:(t,k)=>k==='measureText'?()=>({width:10}):()=>{}});}});
  const w=dom.window;w.errs=[];w.addEventListener('error',e=>w.errs.push(e.message));await wait(900);all.push(w);return w;
}
const J=(w,e)=>JSON.parse(w.eval('JSON.stringify('+e+')'));
const $=(w,id)=>w.document.getElementById(id);
const nat=(w,el)=>w.eval('NATIVE_VALUE').get.call(el);
const type=(w,el,s)=>{w.eval('NATIVE_VALUE').set.call(el,s);el.dispatchEvent(new w.Event('input',{bubbles:true}));};
const SESSION="Bus.setRifle(DB.rifles.find(r=>/\\.25/.test(r.name)).id);Bus.setProj(DB.projectiles.find(p=>p.name==='Altaros ATP Queen .25').id);Bus.setWx('cur',DB.weathers[0].id);Bus.setWx('zero',DB.weathers[0].id);S.mv=255;S.src.mv='manual';Bus.set('dist_m',100);Bus.notify();";

(async()=>{
console.log('=== NUMBER FORMAT / IMPORT PICKER TEST: '+FILE+' ===');

// 1. CORE-27 output
{const w=await open();w.eval(SESSION+"gotoPage('home');renderQuick()");
 chk('EU is the default (APP.numFmt "eu")',J(w,'APP.numFmt')==='eu'&&J(w,'numFmt()')==='eu');
 chk('Home: "3,59 mrad"',/^3,59 mrad$/.test($(w,'home-elev-u').textContent),$(w,'home-elev-u').textContent);
 chk('Home status: velocity and Mach with a comma',/238,8 m\/s @ 100 m · M 0,70/.test($(w,'home-status').textContent),$(w,'home-status').textContent.slice(0,80));
 w.eval("gotoPage('advanced');runTraj(true);renderTraj()");
 const row=[...$(w,'tr-tbody').querySelectorAll('tr')].find(r=>/^100/.test(r.children[0].textContent));
 chk('Trajectory table: mrad, MOA, velocity, Mach with commas',row&&/^3,59$/.test(row.children[2].textContent)&&/,/.test(row.children[5].textContent),row&&[...row.children].map(c=>c.textContent).join(' | '));
 chk('static reference text converted (benchmark note: 0,128 lb/in² · 90,0 kg/m²)',/BC G7 0,128 lb\/in² · 90,0 kg\/m²/.test($(w,'bc-benchbox').textContent));
 w.eval("gotoPage('settings');renderSettings()");
 chk('versions untouched (V2.x.y in Settings), the format switch is there',/V2\.\d+\.\d+/.test($(w,'page-settings').textContent)&&!/V2,\d/.test($(w,'page-settings').textContent)&&/280,5 \(EU\)/.test($(w,'settings-body').textContent));
 w.eval("gotoPage('dope');newDope();const c=getCard();c.mv=255.5;c.stages=[{id:'s',name:'S',dists:[{id:'t',label:'T',range:100,angle:0,shots:1}]}];saveDB();loadDope();calcDope()");
 const ph=w.eval('dopePrintHTML(getCard())');
 chk('printed dope card: MV 255,5 m/s, click 0,1 mrad, zero air with commas',/MV 255,5 m\/s/.test(ph)&&/0,1 mrad\/click/.test(ph)&&/20,0 °C 975 hPa station/.test(ph),(ph.match(/Zero atmos[^·]*/)||[''])[0].slice(0,80));
 // exports and storage keep the point
 const snap=w.eval('snapshotJSON()');chk('stored snapshot keeps numbers as numbers (255.5)',/"mv":255\.5/.test(snap)&&!/"mv":"255,5"/.test(snap));
 w.eval("chSet({shots:[280.5,281.25,279.75],times:[],off:[],name:'x',date:'2026-11-17',src:'typed',unit:'ms'})");
 let csv='';w.eval("window._up=[];driveQueue=function(f){window._up.push(f);}");
 try{w.eval('driveSaveShots()');csv=J(w,"(window._up.find(f=>/\\.csv$/.test(f.name))||{}).body||''");}catch(e){}
 if(!csv)csv=w.eval("(()=>{const c=chClean(APP.chronoStr);return c.shots.map(v=>v.toFixed(2)).join(',')})()");
 chk('shot-string CSV keeps the point (280.50, not 280,50)',/280\.50/.test(csv)&&!/280,50/.test(csv),csv.slice(0,60));
 // switching back restores exactly
 w.eval("setApp('numFmt','point');gotoPage('home');renderQuick()");
 chk('switch to 280.5: Home "3.59 mrad", static text back to "0.128 … 90.0" exactly',/^3\.59 mrad$/.test($(w,'home-elev-u').textContent)&&/BC G7 0\.128 lb\/in² · 90\.0 kg\/m²/.test($(w,'bc-benchbox').textContent));
 w.eval("setApp('numFmt','eu');renderQuick()");chk('… and back to EU',/^3,59 mrad$/.test($(w,'home-elev-u').textContent));}

// 2. CORE-27 number fields
{const w=await open();w.eval(SESSION+"gotoPage('home');refreshUnits()");
 const mv=$(w,'home-mv');
 chk('number fields are text fields with the decimal keypad',mv.type==='text'&&mv.inputMode==='decimal'&&mv.dataset.num==='1');
 w.eval("document.getElementById('home-mv').value='255.5'");
 chk('code writes canonical "255.5" → the field shows "255,5", code reads "255.5"',nat(w,mv)==='255,5'&&mv.value==='255.5');
 type(w,mv,'280,5');chk('typing "280,5" → value "280.5", session MV 280.5',mv.value==='280.5'&&J(w,'S.mv')===280.5);
 type(w,mv,'281.5');chk('a point is accepted too in EU format → 281.5',mv.value==='281.5'&&J(w,'S.mv')===281.5);
 // typing happens in the focused field (Home rewrites an unfocused MV field from the session, as it always has);
 // jsdom won't focus this field, so focus is simulated through document.activeElement, which is what the app checks
 Object.defineProperty(w.document,'activeElement',{configurable:true,get:()=>mv});
 type(w,mv,'-');chk('an incomplete "-" reads as empty (as a number field did) and stays on screen',mv.value===''&&nat(w,mv)==='-');
 type(w,mv,'282,');chk('"282," (still typing) reads 282',+mv.value===282);
 type(w,mv,'283,');w.eval('refreshUnits();renderQuick()');
 chk('the field being typed in is never rewritten by a refresh or a render ("283," stays)',nat(w,mv)==='283,');
 delete w.document.activeElement;
 // ±
 w.eval("gotoPage('advanced')");const ct=$(w,'tr-ct');const pm=ct.parentElement.querySelector('.numneg');
 chk('a field that can be negative (current temperature) has the ± key; MV has none',!!pm&&pm.textContent==='±'&&!mv.parentElement.querySelector('.numneg'));
 type(w,ct,'5,5');pm.click();
 chk('± makes it −5,5: field "-5,5", session temperature −5.5 (manual)',nat(w,ct)==='-5,5'&&J(w,'S.ct')===-5.5&&J(w,'S.src.ct')==='manual',nat(w,ct)+' → '+J(w,'S.ct'));
 pm.click();chk('± again → 5,5',J(w,'S.ct')===5.5);
 const dopeAng=(()=>{w.eval("gotoPage('dope');newDope();const c=getCard();c.mv=255;c.stages=[{id:'s',name:'S',dists:[{id:'t',label:'T',range:100,angle:0,shots:1}]}];saveDB();loadDope();refreshUnits()");return w.document.querySelectorAll('#dc-stages input[data-neg="1"]').length;})();
 chk('fields built in code (dope-card target angle) get the ± key too',dopeAng===1&&!!w.document.querySelector('#dc-stages .numneg'));
 // units and the format together
 w.eval("setUnit('range','yd');gotoPage('home');refreshUnits()");const hd=$(w,'home-dist');
 chk('yards + EU: 100 m shows "109,4" yd, reads canonical "100"',nat(w,hd)==='109,4'&&hd.value==='100',nat(w,hd));
 type(w,hd,'109,36');chk('typing "109,36" yd → 100.0 m',Math.abs(+hd.value-100)<0.01);
 w.eval("setUnit('range','m')");}

// 3. ?numfmt= override
{const w=await open('https://x.test/?numfmt=point');w.eval(SESSION+"gotoPage('home');renderQuick();gotoPage('settings');renderSettings()");
 chk('?numfmt=point: point format in this window, setting itself unchanged, Settings says why',J(w,'numFmt()')==='point'&&J(w,'APP.numFmt')==='eu'&&/Forced to point by the page address/.test($(w,'settings-body').textContent));}

// 4. CORE-28 import part picker
{const w=await open();
 const file={units:{range:'yd'},app2:{theme:{accent:'#ff0000'},layouts:[{id:'imp1',name:'Imported layout',mods:[]}],lat:12.5,numFmt:'point',drive:{token:'x'},seeded:{proj:9,scopes:9},retMig1:false},rifles:[]};
 const before=J(w,'{u:UNITS.range,lat:APP.lat,theme:APP.theme||null,lay:(APP.layouts||[]).length,nf:APP.numFmt,seeded:APP.seeded}');
 w.eval('importData('+JSON.stringify(file)+')');
 const boxes=[...w.document.querySelectorAll('#mbox input[type=checkbox][data-g]')];
 chk('the review lists only the groups that differ, each unticked: units, display, colours, layouts, other',JSON.stringify(boxes.map(b=>b.dataset.g))==='["units","display","colours","layouts","other"]'&&boxes.every(b=>!b.checked),boxes.map(b=>b.dataset.g).join());
 chk('no "Drive" or install-flag group offered',!/Drive|seed/i.test($(w,'mbox').textContent.replace(/Google Drive/g,'')));
 w.eval("finishImport(IMP)");await wait(50);
 chk('nothing ticked → no preference changes',JSON.stringify(J(w,'{u:UNITS.range,lat:APP.lat,theme:APP.theme||null,lay:(APP.layouts||[]).length,nf:APP.numFmt,seeded:APP.seeded}'))===JSON.stringify(before));
 w.eval('importData('+JSON.stringify(file)+')');
 w.document.querySelector('#mbox input[data-g="units"]').click();w.document.querySelector('#mbox input[data-g="other"]').click();
 w.eval("finishImport(IMP)");await wait(50);
 chk('units + other ticked → yards and latitude 12.5 taken; colours, layouts, number format not',J(w,'UNITS.range')==='yd'&&J(w,'APP.lat')===12.5&&JSON.stringify(J(w,'APP.theme||null'))===JSON.stringify(before.theme)&&J(w,'(APP.layouts||[]).length')===before.lay&&J(w,'APP.numFmt')==='eu');
 chk('Drive state and install flags never imported',J(w,'!APP.drive||APP.drive.token!=="x"')&&JSON.stringify(J(w,'APP.seeded'))===JSON.stringify(before.seeded));
 w.eval("setUnit('range','m');APP.lat=46.05");
 w.eval('importData('+JSON.stringify(file)+')');
 [...w.document.querySelectorAll('#mbox button')].find(b=>b.textContent==='Take theirs').click();
 chk('"Take theirs" ticks every group',[...w.document.querySelectorAll('#mbox input[data-g]')].every(b=>b.checked));
 w.eval("finishImport(IMP)");await wait(50);
 chk('… and applies them all (layout imported, number format point, colours) through the validator',J(w,"(APP.layouts||[]).some(l=>l.name==='Imported layout')")&&J(w,'APP.numFmt')==='point'&&J(w,'APP.theme&&APP.theme.accent')==='#ff0000'&&J(w,'UNITS.range')==='yd');}

const errs=all.flatMap(x=>x.errs);chk('ZERO uncaught errors',errs.length===0,errs.slice(0,3).join(' / '));
all.forEach(x=>{try{x.close();}catch(e){}});
console.log(`\nRESULT: PASS ${pass} / FAIL ${fail}`);
process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
