// Share test (V1.20.0, CORE-02): bundle contents, code round-trip and checksum, codes inside
// messages and links, QR encoder↔decoder compatibility, receiving into a second install with
// the scope choice, link-on-launch import, damaged codes, escaping.
// Usage: node sharetest.js <app.html>   (needs jsdom; see README.md)
const {JSDOM}=require('jsdom'),fs=require('fs');
const FILE=process.argv[2];
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let pass=0,fail=0;
const chk=(n,ok,extra)=>{console.log((ok?'  PASS  ':'  FAIL  ')+n+(extra?'   '+extra:''));ok?pass++:fail++;};
const all=[];

async function install(url='https://x.test/'){
  const dom=new JSDOM(fs.readFileSync(FILE,'utf8'),{runScripts:'dangerously',pretendToBeVisual:true,url,
    beforeParse(w){
      w.alerts=[];w.alert=m=>w.alerts.push(String(m));
      for(const k of ['CompressionStream','DecompressionStream','ReadableStream','TextEncoder','TextDecoder'])w[k]=globalThis[k];
      w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:(t,k)=>k==='measureText'?()=>({width:10}):()=>{}});
    }});
  const w=dom.window;w.errs=[];w.addEventListener('error',e=>w.errs.push(e.message));
  w.addEventListener('unhandledrejection',e=>w.errs.push('rejection: '+(e.reason&&e.reason.message)));
  await wait(700);all.push(w);return w;
}
const J=(w,expr)=>JSON.parse(w.eval('JSON.stringify('+expr+')'));
const modalOpen=w=>w.document.getElementById('modal').classList.contains('open');
const clickText=(w,txt)=>{const b=[...w.document.querySelectorAll('#mbox button')].find(x=>x.textContent.trim()===txt);if(!b)throw new Error('no button '+txt);b.click();};

(async()=>{
console.log('=== SHARE TEST: '+FILE+' ===');
const A=await install();
A.eval(`
  DB.reticles.push({id:'rt-custom',name:'CUSTOM RET',fp:'FFP',dotMrad:0.1,hashes:[1,2],windHashes:[1],verified:false,notes:''});
  DB.scopes.push({id:'sc-custom',name:'CUSTOM SCOPE',sku:'X1',adjUnit:'mil',click:0.1,elev:30,wind:16,cpr:100,magMin:5,magMax:30,reticleId:'rt-custom',source:'test',notes:''});
  const vct=DB.scopes.find(s=>s.reticleId==='vct34ffp');
  DB.rifles.push({...DB.rifles[0],id:'rf-share',name:'SHARE RIFLE',scopeId:'sc-custom',fav:true});
  DB.rifles.push({...DB.rifles[0],id:'rf-seed',name:'SEED RET RIFLE',scopeId:vct.id});
  saveDB();`);

// 1–2. Bundle contents
const b1=J(A,"shareBundle('r','rf-share')");
chk('rifle share includes its scope and custom reticle',b1.rifles.length===1&&b1.scopes[0].id==='sc-custom'&&b1.reticles[0].id==='rt-custom');
chk('rifle share is marked and schema-stamped, favourite removed',b1.share==='rifle'&&!!b1.schema&&!('fav' in b1.rifles[0]));
const b2=J(A,"shareBundle('r','rf-seed')");
chk('built-in reticle is referenced, not sent',!b2.reticles&&b2.scopes.length===1);

// 3. Round trip
const code=await A.eval("encodeShare(shareBundle('r','rf-share'))");
const back=await A.eval(`decodeShare(${JSON.stringify(code)}).then(d=>JSON.stringify(d))`);
chk('code has the SEN1 format',/^SEN1:[0-9a-f]{8}\.[A-Za-z0-9_-]+$/.test(code));
chk('decode returns exactly what was encoded',back===JSON.stringify(b1));
const seedCode=await A.eval("encodeShare(shareBundle('r','rf-seed'))");
chk('typical rifle share stays short',seedCode.length<800,'rifle+scope '+seedCode.length+' chars, with custom reticle '+code.length);

// 4. Code found inside a chat message or a link
const msg='Hey, try my setup: https://x.test/#import='+code+' — cheers';
chk('code is found inside a message with a link',await A.eval(`decodeShare(${JSON.stringify(msg)}).then(d=>d.rifles[0].name)`)==='SHARE RIFLE');

// 5. Damaged codes are refused
const flip=code.slice(0,-3)+(code.slice(-3,-2)==='A'?'B':'A')+code.slice(-2);
const err=async c=>A.eval(`decodeShare(${JSON.stringify(c)}).then(()=>'ok',e=>e.message)`);
chk('altered code refused',/damaged/.test(await err(flip)));
chk('truncated code refused',/damaged/.test(await err(code.slice(0,code.length-10))));
chk('text without a code refused',/No SEN share code/.test(await err('hello')));

// 6. Share sheet + QR encoder/decoder agree on the link
await A.eval("openShare('r','rf-share')");
chk('share sheet shows a QR code',!!A.document.querySelector('#share-qr svg'));
chk('share sheet text is the share code',A.document.getElementById('share-code').value===code);
const link=A.eval(`shareLink(${JSON.stringify(code)})`);
const decoded=A.eval(`(()=>{const q=qrcode(0,'M');q.addData(${JSON.stringify(link)});q.make();
  const n=q.getModuleCount(),sc=4,m=4,W=(n+2*m)*sc,d=new Uint8ClampedArray(W*W*4).fill(255);
  for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(q.isDark(r,c))for(let y=0;y<sc;y++)for(let x=0;x<sc;x++){const i=(((r+m)*sc+y)*W+(c+m)*sc+x)*4;d[i]=d[i+1]=d[i+2]=0;}
  const res=jsQR(d,W,W);return res?res.data:null;})()`);
chk('QR decodes back to the share link (encoder ↔ decoder)',decoded===link);
A.eval('closeModal()');

// 7. Receive into another install, keep their scope
const B=await install();
await B.eval(`receiveShare(${JSON.stringify(code)})`);
chk('rifle share opens the review with a scope choice',modalOpen(B)&&!!B.document.querySelector('#mbox select'));
clickText(B,'Import');
const rB=J(B,"DB.rifles.find(r=>r.name==='SHARE RIFLE')");
const scB=J(B,"DB.scopes.find(s=>s.name==='CUSTOM SCOPE')");
chk('receiver gets the rifle on the sender scope',!!rB&&!!scB&&rB.scopeId===scB.id);
chk('receiver gets the custom reticle',J(B,"DB.reticles.some(r=>r.name==='CUSTOM RET')"));

// 8. Receive into a third install, put it on my own scope
const C=await install();
const myScope=J(C,'DB.scopes[0]');
await C.eval(`receiveShare(${JSON.stringify(code)})`);
const sel=C.document.querySelector('#mbox select');sel.value=myScope.id;sel.dispatchEvent(new C.Event('change'));
clickText(C,'Import');
chk('rifle uses my chosen scope',J(C,"DB.rifles.find(r=>r.name==='SHARE RIFLE').scopeId")===myScope.id);
chk('their scope and reticle are not added',!J(C,"DB.scopes.some(s=>s.name==='CUSTOM SCOPE')||DB.reticles.some(r=>r.name==='CUSTOM RET')"));

// 9. A new projectile imports without a review
A.eval("DB.projectiles.push({id:'pj-x',name:'SHARED SLUG',cal:'.25',mfg:'SEN',type:'slug',diam:6.35,mass:40,oal:12,bcg7:0.1,bcg1:0.2,c:0,ff:0,notes:''})");
const pcode=await A.eval("encodeShare(shareBundle('p','pj-x'))");
await B.eval(`receiveShare(${JSON.stringify(pcode)})`);
chk('new projectile imports straight away',!modalOpen(B)&&J(B,"DB.projectiles.some(p=>p.name==='SHARED SLUG')"));

// 10. Opening the app from a share link
const D=await install('https://x.test/#import='+code);
await wait(200);
chk('launch from link opens the import review',modalOpen(D)&&/Review import/.test(D.document.getElementById('mbox').textContent));
chk('link code removed from the address bar',D.location.hash==='');

// 11. Damaged code through the receive sheet
const nB=J(B,'DB.rifles.length');
B.eval('openReceive()');B.document.getElementById('recv-text').value=flip;clickText(B,'Import');await wait(100);
chk('receive sheet explains a damaged code, imports nothing',/damaged/.test(B.document.getElementById('recv-msg').textContent)&&J(B,'DB.rifles.length')===nB);
B.eval('closeModal()');

// 12. Names are escaped in the share sheet
A.eval(`DB.rifles.push({...DB.rifles[0],id:'rf-evil',name:'<img src=x onerror=window.pwned=1>'})`);
await A.eval("openShare('r','rf-evil')");
chk('no element injected via a name',A.document.querySelector('#mbox img')===null&&!A.pwned);

const errs=all.flatMap(x=>x.errs);
chk('ZERO uncaught errors',errs.length===0,errs.slice(0,3).join(' / '));
console.log('\nPASS '+pass+'   FAIL '+fail);
process.exit(fail?1:0);
})().catch(e=>{console.error('TEST CRASH:',e);process.exit(1);});
