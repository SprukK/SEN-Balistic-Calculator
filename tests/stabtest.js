// Stability test (V1.30.0): built-in Miller twist rule (= Berger's calculator) replaces the per-calibre
// C table. Upgrade from the previous release clears the C values the app handed out (Queen 2.283 from a
// wrong-length Berger run, King 1.886, and the theoretical SEN design constants 1.877 / 2.699 / 3.822)
// and keeps a user's own C; import clears them too. Home's Sg and BC penalty follow Miller; pellets get
// no Sg; L/D < 2.0 not computed; hollow-point flag; C override; real .30 slugs get a Miller Sg.
// Usage: node stabtest.js <new.html> <previous-release.html>   (needs jsdom; see README.md)
const {JSDOM}=require('jsdom'),fs=require('fs');
const [NEW,OLD]=process.argv.slice(2);
const SK='sen_platform_v1';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let pass=0,fail=0;
const chk=(n,ok,extra)=>{console.log((ok?'  PASS  ':'  FAIL  ')+n+(extra?'   '+extra:''));ok?pass++:fail++;};
const all=[];
async function open(file,ls){
  const dom=new JSDOM(fs.readFileSync(file,'utf8'),{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',
    beforeParse(w){w.alerts=[];w.alert=m=>w.alerts.push(String(m));w.confirm=()=>true;if(ls)w.localStorage.setItem(SK,ls);
      w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:(t,k)=>k==='measureText'?()=>({width:10}):()=>{}});}});
  const w=dom.window;w.errs=[];w.addEventListener('error',e=>w.errs.push(e.message));
  await wait(700);all.push(w);return w;
}
const J=(w,e)=>JSON.parse(w.eval('JSON.stringify('+e+')'));
const proj=(w,re)=>J(w,`DB.projectiles.find(p=>${re}.test(p.name))`);
const txt=(w,id)=>w.document.getElementById(id).textContent;

(async()=>{
console.log('=== STABILITY (MILLER) TEST: '+NEW+' ===');
// 1. Previous release: seeded Queen/King carry C; add a user's own C and a design constant.
const o=await open(OLD);
chk('previous release seeded Queen C 2.283 and King C 1.886',proj(o,/^Altaros ATP Queen/).c===2.283&&proj(o,/^Altaros ATP King/).c===1.886);
o.eval(`const b={cal:'.30',mfg:'TEST',type:'slug',diam:7.62,mass:50,oal:17,bcg7:0.1,bcg1:0.2,ff:0,notes:''};
  DB.projectiles.push({...b,id:'t-own',name:'TEST own C',c:2.5},{...b,id:'t-des',name:'TEST design C',c:2.699});saveDB();`);await wait(50);
const w=await open(NEW,o.localStorage.getItem(SK));
// 2. Upgrade.
const q=proj(w,/^Altaros ATP Queen/),k=proj(w,/^Altaros ATP King/);
chk('upgrade: Queen and King C cleared → Miller, with a note',q.c===0&&k.c===0&&/C 2\.283 cleared in V1\.30\.0/.test(q.notes)&&/C 1\.886 cleared/.test(k.notes));
chk('upgrade: design constant 2.699 cleared, user\'s own C 2.5 kept',proj(w,/^TEST design C/).c===0&&proj(w,/^TEST own C/).c===2.5&&!/cleared/.test(proj(w,/^TEST own C/).notes));
// 3. Home: Queen in the Mora 1:20″ at the session MV uses Miller.
w.eval(`Bus.setRifle(DB.rifles.find(r=>/\\.25/.test(r.name)).id);Bus.setProj(DB.projectiles.find(p=>/^Altaros ATP Queen/.test(p.name)).id);Bus.setWx('cur',DB.weathers[0].id);Bus.setWx('zero',DB.weathers[0].id);S.mv=280;Bus.notify();`);await wait(30);
const tr=J(w,'(()=>{const t=homeTraj();return{sg:t.sg,sgP:t.sgP,why:t.cWhy}})()'),wx=J(w,'getWx(S.curWxId)');
const want=J(w,`calcSg(60,6.35,12.9,508,280,30*Math.pow(6.35/25.4,2),${wx.temp},${J(w,'wxPres(getWx(S.curWxId))')})`);
chk('Home: Queen Sg = Miller (C 1.875), BC penalty applied from it',Math.abs(tr.sg-want)<1e-12&&tr.why==='miller'&&Math.abs(tr.sgP-J(w,`bcEffSg(1,${want})`))<1e-12&&tr.sg<1.5,JSON.stringify(tr));
// 4. Import of an old export with C 2.283 → cleared.
const snap=JSON.parse(w.eval('snapshotJSON()'));
w.eval('importData('+JSON.stringify({projectiles:[{...snap.projectiles[0],id:'imp-1',name:'IMPORTED OLD QUEEN',c:2.283}]})+')');await wait(30);
chk('import: a profile carrying the old C 2.283 comes in on Miller',proj(w,/^IMPORTED OLD QUEEN/)?.c===0,JSON.stringify(proj(w,/^IMPORTED OLD QUEEN/)?.c));
// 5. Stability tab.
const set=(id,v)=>{w.document.getElementById(id).value=String(v);};
const stab=(o)=>{w.eval(`stabKind=${JSON.stringify({pellet:!!o.pellet,hp:!!o.hp})}`);set('st-diam',o.d);set('st-mass',o.m);set('st-oal',o.oal);set('st-twist',o.tw);set('st-mv',o.mv);set('st-c',o.c||0);set('st-temp',10);set('st-pres',980);w.eval('calcStab()');};
stab({d:6.35,m:60,oal:12.9,tw:20,mv:853*0.3048});
chk('Stability tab: Queen at Berger\'s conditions → Sg 1.18, "Miller C = 1.875"',/^1\.18$/.test(w.document.querySelector('#st-outs .sv').textContent)&&txt(w,'st-cmode')==='Miller C = 1.875',w.document.querySelector('#st-outs .sv').textContent+' '+txt(w,'st-cmode'));
stab({d:6.35,m:60,oal:12.9,tw:20,mv:853*0.3048,c:2.283});
chk('C override is used and labelled',txt(w,'st-cmode')==='C override = 2.283'&&/^1\.4\d$/.test(w.document.querySelector('#st-outs .sv').textContent));
stab({d:6.35,m:46.93,oal:10.58,tw:20,mv:280});
chk('L/D 1.66 → not computed, reason shown',/not computed/.test(txt(w,'st-outs'))&&/below 2\.0/.test(txt(w,'st-flags')));
stab({d:5.5,m:25,oal:12,tw:16,mv:280,pellet:true});
chk('pellet → no Sg, drag-stabilised note',/not computed/.test(txt(w,'st-outs'))&&/drag-stabilised/.test(txt(w,'st-flags')));
stab({d:7.62,m:50,oal:17,tw:20,mv:280,hp:true});
chk('real .30 hollow point → Miller Sg (C 2.700) with the hollow-point flag',txt(w,'st-cmode')==='Miller C = 2.700'&&/Hollow point/.test(txt(w,'st-flags')));
// 6. Home: pellet in a rifled barrel → no Sg, no penalty, no warning.
w.eval(`DB.projectiles.push({id:'pel',name:'TEST pellet',cal:'.25',mfg:'T',type:'pellet',diam:6.35,mass:25,oal:9,bcg7:0,bcg1:0.03,c:0,ff:0,notes:''});Bus.setProj('pel');Bus.notify();`);await wait(30);
const tp=J(w,'(()=>{const t=homeTraj();return{sg:t.sg,sgP:t.sgP,why:t.cWhy}})()');
chk('Home: pellet → no Sg, no BC penalty, no "not computed" warning',tp.sg==null&&tp.sgP===1&&tp.why==='pellet'&&!/Sg not computed/.test(txt(w,'home-status')),JSON.stringify(tp)+' '+txt(w,'home-status'));
const errs=all.flatMap(x=>x.errs);chk('ZERO uncaught errors',errs.length===0,errs.slice(0,3).join(' / '));
console.log('\nPASS '+pass+'   FAIL '+fail);process.exit(fail?1:0);
})().catch(e=>{console.error('TEST CRASH:',e);process.exit(1);});
