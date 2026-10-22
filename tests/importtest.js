// Import test (V1.19.0, CORE-03): whitelist sanitisation, rejects, collision review
// (overwrite / copy / skip / apply-to-all / cancel), reference remap, preferences row,
// schema guard, single dope-card shape, escaping in the review sheet.
// Usage: node importtest.js <app.html>   (needs jsdom; see README.md)
const {JSDOM}=require('jsdom'),fs=require('fs');
const FILE=process.argv[2];
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let pass=0,fail=0;
const chk=(n,ok,extra)=>{console.log((ok?'  PASS  ':'  FAIL  ')+n+(extra?'   '+extra:''));ok?pass++:fail++;};

async function fresh(){
  const dom=new JSDOM(fs.readFileSync(FILE,'utf8'),{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',
    beforeParse(w){
      w.alerts=[];w.alert=m=>w.alerts.push(String(m));
      w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:(t,k)=>k==='measureText'?()=>({width:10}):()=>{}});
    }});
  const w=dom.window;w.errs=[];w.addEventListener('error',e=>w.errs.push(e.message));
  await wait(700);
  return w;
}
const J=(w,expr)=>JSON.parse(w.eval('JSON.stringify('+expr+')'));
const run=(w,obj)=>w.eval('importData('+JSON.stringify(obj)+')');
const modalOpen=w=>w.document.getElementById('modal').classList.contains('open');
const clickText=(w,txt)=>{const b=[...w.document.querySelectorAll('#mbox button')].find(x=>x.textContent.trim()===txt);if(!b)throw new Error('no button '+txt);b.click();};
const lastAlert=w=>w.alerts[w.alerts.length-1]||'';
const all=[];

(async()=>{
console.log('=== IMPORT TEST: '+FILE+' ===');

// 1. Own export imports back with nothing to review.
let w=await fresh();all.push(w);
const snap=JSON.parse(w.eval('snapshotJSON()'));
const before=J(w,'{r:DB.rifles.length,p:DB.projectiles.length,s:DB.scopes.length}');
run(w,snap);
chk('own export: no review needed',!modalOpen(w));
chk('own export: nothing added',JSON.stringify(J(w,'{r:DB.rifles.length,p:DB.projectiles.length,s:DB.scopes.length}'))===JSON.stringify(before));
chk('own export: summary counts identical items',/0 new/.test(lastAlert(w))&&/already identical/.test(lastAlert(w)),lastAlert(w).split('\n')[0]);

// 2. Another install's catalog (same content, different ids) is recognised as identical.
const reid={projectiles:snap.projectiles.map((p,i)=>({...p,id:'other'+i}))};
run(w,reid);
chk('same content under other ids: no review, nothing added',!modalOpen(w)&&J(w,'DB.projectiles.length')===before.p);

// 3. Sanitisation: unknown fields dropped, wrong types dropped, nested extras dropped.
const base=snap.rifles[0];
run(w,{rifles:[{...base,id:'nr-1',name:'NEW RIFLE',evil:'<script>',mv:'abc',stages:1}],
       dopeCards:[{id:'dc-1',name:'CARD',rifleId:'nr-1',mv:280,zero:50,notes:'',stages:[{id:'s1',name:'S',notes:'',x:1,dists:[{id:'d1',range:100,angle:0,wind:0,wdir:90,y:2}]}]}]});
const nr=J(w,"DB.rifles.find(r=>r.name==='NEW RIFLE')");
chk('new rifle added',!!nr);
chk('unknown field dropped',nr&&!('evil' in nr));
chk('wrong-type field dropped (mv:"abc")',nr&&!('mv' in nr));
const card=J(w,"DB.dopeCards.find(c=>c.name==='CARD')");
chk('nested unknown fields dropped from dope stages',card&&!('x' in card.stages[0])&&!('y' in card.stages[0].dists[0]));

// 4. Invalid records are rejected and listed, never half-imported.
run(w,{projectiles:[{id:'bad1',name:'NO DIAMETER',mass:30},{id:'bad2',mass:30,diam:6.35}]});
chk('invalid records not added',J(w,"DB.projectiles.some(p=>p.id==='bad1'||p.id==='bad2')")===false);
chk('summary lists the rejects',/NO DIAMETER.*missing diam/s.test(lastAlert(w))&&/no name/.test(lastAlert(w)));

// 5. Same id, changed content → review; Overwrite updates in place and keeps the favourite.
w.eval("DB.rifles[0].fav=true");
const mine=J(w,'DB.rifles[0]');
run(w,{rifles:[{...mine,fav:false,mv:mine.mv+2}]});
chk('changed record opens the review',modalOpen(w));
chk('review shows the difference',/mv .*→/.test(w.document.getElementById('mbox').textContent));
chk('default choice is Save as copy',w.document.querySelector('#mbox .panel .seg button.on').textContent==='Save as copy');
clickText(w,'Overwrite');clickText(w,'Import');
const after=J(w,`DB.rifles.find(r=>r.id==='${mine.id}')`);
chk('overwrite updated the record in place',after.mv===mine.mv+2&&J(w,`DB.rifles.filter(r=>r.name===${JSON.stringify(mine.name)}).length`)===1);
chk('overwrite kept my favourite flag',after.fav===true);

// 6. Save as copy: new id, clone name, and an incoming rifle using that scope follows the copy.
const sc=J(w,'DB.scopes[0]');
const imp6={scopes:[{...sc,elev:sc.elev+5}],rifles:[{...base,id:'nr-6',name:'RIFLE SIX',scopeId:sc.id}]};
run(w,imp6);clickText(w,'Import');
const copy=J(w,`DB.scopes.find(s=>s.name===${JSON.stringify(sc.name+' - [CLONE]')})`);
chk('copy saved under a clone name with a new id',!!copy&&copy.id!==sc.id);
chk('my original scope untouched',J(w,`DB.scopes.find(s=>s.id==='${sc.id}').elev`)===sc.elev);
chk('incoming rifle points at the copy',J(w,"DB.rifles.find(r=>r.name==='RIFLE SIX').scopeId")===copy.id);

// 7. Skip (via apply-to-all): incoming rifle points at MY scope.
run(w,{scopes:[{...sc,elev:sc.elev+9}],rifles:[{...base,id:'nr-7',name:'RIFLE SEVEN',scopeId:sc.id}]});
clickText(w,'All: Skip');clickText(w,'Import');
chk('skip leaves no extra scope',J(w,`DB.scopes.filter(s=>s.name.startsWith(${JSON.stringify(sc.name)})).length`)===2);
chk('incoming rifle points at my scope',J(w,"DB.rifles.find(r=>r.name==='RIFLE SEVEN').scopeId")===sc.id);

// 8. Preferences are a choice, default keep mine.
const unitsBefore=J(w,'UNITS');
run(w,{units:{...unitsBefore,vel:'fps'}});
chk('different preferences open the review',modalOpen(w)&&/Units/.test(w.document.getElementById('mbox').textContent));
clickText(w,'Import');
chk('default keeps my units',J(w,'UNITS.vel')===unitsBefore.vel);
run(w,{units:{...unitsBefore,vel:'fps'}});clickText(w,'Take theirs');clickText(w,'Import');
chk('take theirs applies their units',J(w,'UNITS.vel')==='fps');

// 9. Cancel changes nothing.
const n9=J(w,'DB.rifles.length');
run(w,{rifles:[{...J(w,'DB.rifles[0]'),mv:999},{...base,id:'nr-9',name:'RIFLE NINE'}]});
clickText(w,'Cancel');
chk('cancel imports nothing',J(w,'DB.rifles.length')===n9&&J(w,'DB.rifles[0].mv')!==999);

// 10. Newer schema refused; single dope-card shape accepted.
const n10=J(w,'DB.rifles.length');
run(w,{schema:{rifles:99},rifles:[{...base,id:'nr-10',name:'FUTURE'}]});
chk('newer-schema data refused',J(w,'DB.rifles.length')===n10&&/newer SEN version/.test(lastAlert(w)));
run(w,{dopeCard:{id:'dc-x',name:'SINGLE CARD',mv:280,zero:50,notes:'',stages:[]}});
chk('single dope-card file imports',J(w,"DB.dopeCards.some(c=>c.name==='SINGLE CARD')"));

// 11. Names are escaped in the review sheet.
const evilName='<img src=x onerror=window.pwned=1>';
w.eval(`DB.rifles.push({...DB.rifles[0],id:'ev1',name:${JSON.stringify(evilName)}})`);
run(w,{rifles:[{...J(w,"DB.rifles.find(r=>r.id==='ev1')"),mv:1}]});
chk('no element injected via a name',w.document.querySelector('#mbox img')===null&&!w.pwned);
clickText(w,'Cancel');

const errs=all.flatMap(x=>x.errs);
chk('ZERO uncaught errors',errs.length===0,errs.slice(0,3).join(' / '));
console.log('\nPASS '+pass+'   FAIL '+fail);
process.exit(fail?1:0);
})().catch(e=>{console.error('TEST CRASH:',e);process.exit(1);});
