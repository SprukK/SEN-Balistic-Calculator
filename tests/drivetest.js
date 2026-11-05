// Google Drive connector test (V2.13.0, CORE-26).
// A simulated Google sign-in (Google Identity Services token model: callback with access_token / expires_in /
// scope, error_callback, hasGrantedAllScopes, revoke) and a simulated Drive v3 (files list with q, folders,
// multipart upload, alt=media download, 401 for a wrong or expired token, 403 storageQuotaExceeded, network
// failure). Checks: Settings panel; Connect asks only for drive.file + openid + email with the built-in client
// ID, shows the account; the app's folder and sub-folders are created once and found again (ids lost or
// folder trashed); Back up now = the export format without Drive state; Save to Drive for a profile (⋯ menu),
// a dope card (JSON + printable HTML), a shot string (CSV + JSON), a wind snapshot (CSV + JSON); offline →
// queued, kept across a restart, sent when back online; expired token → kept, "Send now" signs in again and
// sends; Drive full → kept with the reason; Drive access not ticked → refused; restore → normal import; the
// export file never carries Drive state; disconnect revokes and drops the queue; client ID override; no
// innerHTML sinks for Drive names; no errors.
// Usage: node drivetest.js <app.html>   (needs jsdom + fake-indexeddb; see README.md)
const {JSDOM}=require('jsdom'),fs=require('fs');
const {IDBFactory,IDBKeyRange}=require('fake-indexeddb');
const FILE=process.argv[2];
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let pass=0,fail=0;
const chk=(n,ok,extra)=>{console.log((ok?'  PASS  ':'  FAIL  ')+n+(extra?'   '+extra:''));ok?pass++:fail++;};
const CID='635178064179-33q8eiq1eboviigkdmg5r7ikgvb5mq6m.apps.googleusercontent.com';
const FOLDER='application/vnd.google-apps.folder';

// ── simulated Google ──
const G={files:{},n:0,tokens:new Set(),reqs:[],online:true,full:false,grantDrive:true,clientCfg:null,lastReq:null,revoked:[]};
const newToken=()=>{const t='tok'+(++G.n);G.tokens.add(t);return t;};
function gis(w){
  w.google={accounts:{oauth2:{
    initTokenClient(cfg){G.clientCfg=cfg;const c={callback:cfg.callback,error_callback:cfg.error_callback,
      requestAccessToken(o){G.lastReq=o;setTimeout(()=>{if(G.popupClosed){c.error_callback({type:'popup_closed'});return;}
        c.callback({access_token:newToken(),expires_in:3599,token_type:'Bearer',scope:(G.grantDrive?'https://www.googleapis.com/auth/drive.file ':'')+'openid https://www.googleapis.com/auth/userinfo.email'});},5);}};return c;},
    hasGrantedAllScopes(r,...s){return s.every(x=>(r.scope||'').split(' ').includes(x));},
    revoke(t,cb){G.revoked.push(t);G.tokens.delete(t);cb&&cb();}}}};
}
const R=(status,body,text)=>({ok:status>=200&&status<300,status,json:async()=>body,text:async()=>text!=null?text:JSON.stringify(body)});
function parseQ(q){const o={};let m;
  if((m=q.match(/name='((?:[^'\\]|\\.)*)'/)))o.name=m[1].replace(/\\'/g,"'").replace(/\\\\/g,'\\');
  if((m=q.match(/'([^']+)' in parents/)))o.parent=m[1];
  if((m=q.match(/mimeType='([^']+)'/)))o.mime=m[1];
  return o;}
async function fakeFetch(url,opt={}){
  G.reqs.push({url,method:opt.method||'GET'});
  if(!G.online)throw new TypeError('Failed to fetch');
  const auth=(opt.headers||{}).Authorization||'';const tok=auth.replace('Bearer ','');
  if(!G.tokens.has(tok))return R(401,{error:{code:401,message:'Invalid Credentials'}});
  const u=new URL(url);
  if(u.pathname==='/oauth2/v3/userinfo')return R(200,{email:'spruk.k@gmail.com',email_verified:true});
  if(u.pathname==='/drive/v3/files'&&(opt.method||'GET')==='GET'){
    const q=parseQ(u.searchParams.get('q')||'');
    let list=Object.values(G.files).filter(f=>!f.trashed&&(!q.name||f.name===q.name)&&(!q.parent||f.parents.includes(q.parent))&&(!q.mime||f.mimeType===q.mime));
    if(/createdTime desc/.test(u.searchParams.get('orderBy')||''))list=list.sort((a,b)=>b.created-a.created);
    return R(200,{files:list.map(f=>({id:f.id,name:f.name,createdTime:new Date(f.created).toISOString()}))});}
  if(u.pathname==='/drive/v3/files'&&opt.method==='POST'){const m=JSON.parse(opt.body);const id='f'+(++G.n);
    G.files[id]={id,name:m.name,mimeType:m.mimeType,parents:m.parents||['root'],created:Date.now()+G.n,body:''};return R(200,{id});}
  let m;
  if((m=u.pathname.match(/^\/drive\/v3\/files\/([^/]+)$/))){const f=G.files[decodeURIComponent(m[1])];if(!f)return R(404,{error:{code:404,errors:[{reason:'notFound'}]}});
    if(u.searchParams.get('alt')==='media')return R(200,null,f.body);return R(200,{id:f.id,trashed:!!f.trashed});}
  if(u.pathname==='/upload/drive/v3/files'&&opt.method==='POST'){
    if(G.full)return R(403,{error:{code:403,errors:[{reason:'storageQuotaExceeded'}]}});
    const b=(opt.headers['Content-Type'].match(/boundary=(.+)$/)||[])[1];const parts=opt.body.split('--'+b).slice(1,-1).map(p=>p.replace(/^\r\n/,'').split('\r\n\r\n'));
    const meta=JSON.parse(parts[0].slice(1).join('\r\n\r\n').replace(/\r\n$/,'')),body=parts[1].slice(1).join('\r\n\r\n').replace(/\r\n$/,'');
    if(!meta.parents||!G.files[meta.parents[0]])return R(404,{error:{code:404,errors:[{reason:'notFound'}]}});
    const id='f'+(++G.n);G.files[id]={id,name:meta.name,mimeType:meta.mimeType,parents:meta.parents,created:Date.now()+G.n,body,ctype:parts[1][0]};return R(200,{id,name:meta.name});}
  return R(400,{error:{message:'unexpected '+url}});
}
const idb=new IDBFactory();
async function open(ls){
  const dom=new JSDOM(fs.readFileSync(FILE,'utf8'),{runScripts:'dangerously',pretendToBeVisual:true,url:'https://sprukk.github.io/SEN-Balistic-Calculator/',
    beforeParse(w){Object.defineProperty(w,'innerWidth',{configurable:true,value:412});Object.defineProperty(w,'innerHeight',{configurable:true,value:915});
      w.indexedDB=idb;w.IDBKeyRange=IDBKeyRange;w.alerts=[];w.alert=m=>w.alerts.push(String(m));w.confirm=()=>true;w.scrollTo=()=>{};w.print=()=>{};
      w.fetch=fakeFetch;Object.defineProperty(w.navigator,'onLine',{configurable:true,get:()=>G.online});gis(w);if(ls)w.localStorage.setItem('sen_platform_v1',ls);
      w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:(t,k)=>k==='measureText'?()=>({width:10}):()=>{}});}});
  const w=dom.window;w.errs=[];w.addEventListener('error',e=>w.errs.push(e.message));await wait(900);return w;
}
const inDir=(dir)=>{const root=Object.values(G.files).find(f=>f.name==='SEN Ballistics'&&!f.trashed);const d=root&&Object.values(G.files).find(f=>f.name===dir&&f.parents.includes(root.id)&&!f.trashed);
  return d?Object.values(G.files).filter(f=>f.parents.includes(d.id)&&f.mimeType!==FOLDER):[];};
const folders=()=>Object.values(G.files).filter(f=>f.mimeType===FOLDER&&!f.trashed).map(f=>f.name).sort().join();
(async()=>{
console.log('=== GOOGLE DRIVE TEST: '+FILE+' ===');
let w=await open();
const $=id=>w.document.getElementById(id),J=e=>JSON.parse(w.eval('JSON.stringify('+e+')'));
const btn=t=>[...$('drive-panel').querySelectorAll('button')].find(b=>b.textContent.startsWith(t));
w.eval(`Bus.setRifle(DB.rifles.find(x=>/\\.25/.test(x.name)).id);Bus.setProj(DB.projectiles.find(p=>/^Altaros ATP Queen/.test(p.name)).id);Bus.setWx('cur',DB.weathers[0].id);Bus.setWx('zero',DB.weathers[0].id);S.mv=280;Bus.notify();gotoPage('settings')`);await wait(30);
chk('Settings: Google Drive panel, not connected, one Connect button',/Google Drive/.test($('drive-panel').textContent)&&!!btn('Connect Google Drive')&&!btn('Back up now'));
w.eval(`gotoPage('profiles');profMenus();document.querySelector('#pl-rifles .pmenu').click()`);await wait(10);
chk('profile ⋯ menu: Edit, Clone, Share, Save to Drive, Delete',[...w.document.querySelectorAll('#sbox .flist button')].map(b=>b.textContent).join()==='Edit,Clone,Share,Save to Drive,Delete');
[...w.document.querySelectorAll('#sbox .flist button')].find(b=>b.textContent==='Save to Drive').click();await wait(10);
chk('…not connected: says to connect first, nothing queued',/Connect Google Drive first/.test(w.alerts.pop()||'')&&J('drv.queue.length')===0);
w.eval(`gotoPage('settings')`);await wait(10);

// connect
btn('Connect Google Drive').click();await wait(120);
chk('Connect: built-in client ID, only drive.file + openid + email, account picker on first sign-in',G.clientCfg.client_id===CID&&G.clientCfg.scope==='https://www.googleapis.com/auth/drive.file openid email'&&/select_account/.test(G.lastReq.prompt));
chk('…connected as spruk.k@gmail.com, last backup never',/Connected as spruk\.k@gmail\.com/.test($('drive-status').textContent)&&/last backup never/.test($('drive-status').textContent),$('drive-status').textContent);
chk('…the app folder "SEN Ballistics" with Backups created',folders()==='Backups,SEN Ballistics',folders());
chk('…no token, email or folder id in the exported settings',!('drive' in J('appForExport()'))&&J('APP.drive.connected')===true);

// backup
btn('Back up now').click();await wait(120);
const bk=inDir('Backups');
chk('Back up now: one file "SEN backup YYYY-MM-DD HH-MM.json" in Backups',bk.length===1&&/^SEN backup \d{4}-\d\d-\d\d \d\d-\d\d\.json$/.test(bk[0].name)&&bk[0].mimeType==='application/json',bk.map(f=>f.name).join());
const bj=JSON.parse(bk[0].body);
chk('…the export format (profiles, units, settings, schema, app version) without Drive state',Array.isArray(bj.rifles)&&bj.rifles.length===J('DB.rifles.length')&&bj.schema&&bj.units&&bj.app2&&!('drive' in bj.app2)&&/^SEN Ballistics V2\.\d+\.\d+$/.test(bj.app));
chk('…last backup shown, nothing waiting',/last backup \d{4}-\d\d-\d\d \d\d:\d\d/.test($('drive-status').textContent)&&J('drv.queue.length')===0&&/Sent 1 file/.test($('drive-msg').textContent));

// profile, dope, shots, wind
w.eval(`gotoPage('profiles');profMenus();document.querySelector('#pl-rifles .pmenu').click()`);await wait(10);
[...w.document.querySelectorAll('#sbox .flist button')].find(b=>b.textContent==='Save to Drive').click();await wait(120);
const pf=inDir('Profiles');
chk('profile → Profiles/"Rifle — <name>.json", a share bundle with its scope',pf.length===1&&/^Rifle — RTI Mora/.test(pf[0].name)&&JSON.parse(pf[0].body).rifles.length===1&&JSON.parse(pf[0].body).share==='rifle',pf.map(f=>f.name).join());
w.eval(`gotoPage('dope');newDope()`);await wait(20);
w.eval(`driveSaveDope()`);await wait(150);
const dp=inDir('Dope cards');
chk('dope card → JSON (importable) + printable HTML',dp.length===2&&dp.some(f=>/\.json$/.test(f.name)&&JSON.parse(f.body).dopeCard)&&dp.some(f=>/\(print\)\.html$/.test(f.name)&&f.mimeType==='text/html'&&/STAGE 1/.test(f.body)),dp.map(f=>f.name).join());
w.eval(`chSet({shots:[280.1,281.4,279.8,282.0],off:[3],name:'Queen test',src:'typed'})`);
w.eval(`driveSaveShots()`);await wait(150);
const sh=inDir('Shot strings'),csv=(sh.find(f=>/\.csv$/.test(f.name))||{}).body||'';
chk('shot string → CSV (shot, m/s, fps, kept + stats of the kept shots) + JSON',sh.length===2&&/^shot,velocity_ms,velocity_fps,kept\n1,280\.10,919\.0,yes/.test(csv)&&/4,282\.00,925\.2,no/.test(csv)&&/\n3,280\.43,1\.60,/.test(csv),csv.slice(0,160));
w.eval(`driveSaveWind()`);await wait(20);
chk('wind snapshot with no Calypso: says so, nothing queued',/No wind readings/.test(w.alerts.pop()||'')&&J('drv.queue.length')===0);
w.eval(`(()=>{const now=Date.now(),buf=[];for(let i=0;i<30;i++)buf.push({t:now-29000+i*1000,s:3+(i%3)*0.5,d:85+(i%5)});CALS.push({link:{name:'WDOT-B1F9A6',id:'x',connected:()=>true},buf});calPrimaryId='x';})()`);
w.eval(`driveSaveWind()`);await wait(150);
const wd=inDir('Wind'),wcsv=(wd.find(f=>/\.csv$/.test(f.name))||{}).body||'';
const wexp=J(`(()=>{const a=windAvg(wavgWin(),Date.now(),CALS[0].buf);return [a.spd.toFixed(2),a.min.toFixed(2),a.max.toFixed(2)];})()`);
chk('wind snapshot → CSV (unit, window, readings, average, lull/gust, steadiness) + JSON with the session wind',wd.length===2&&/time,unit,session,window_s,readings,avg_ms,avg_dir_deg,mean_ms,lull_ms,gust_ms,steadiness,max_gap_s/.test(wcsv)&&new RegExp('WDOT-B1F9A6,true,\\d+,30,'+(+wexp[0])).test(wcsv)&&JSON.parse(wd.find(f=>/\.json$/.test(f.name)).body).stations[0].gust_ms===+wexp[2],wcsv);
chk('folders created once each',folders()==='Backups,Dope cards,Profiles,SEN Ballistics,Shot strings,Wind',folders());

// offline → queue → restart → online
G.online=false;w.eval(`gotoPage('settings');driveBackupNow()`);await wait(80);
chk('offline: backup queued, says it is sent when back online',J('drv.queue.length')===1&&/waiting — sent when you are back online/.test($('drive-msg').textContent)&&/1 waiting/.test($('drive-status').textContent));
w.eval('saveDB()');await wait(80);const ls=w.localStorage.getItem('sen_platform_v1');
G.online=true;
const w2=await open(ls);w2.eval(`gotoPage('settings')`);await wait(30);
chk('restart: the queue is still there (IndexedDB), still connected, Google asks again on the next upload',w2.eval('drv.queue.length')===1&&/Connected as spruk\.k@gmail\.com · Google asks again/.test(w2.document.getElementById('drive-status').textContent),w2.document.getElementById('drive-status').textContent);
const b2=[...w2.document.querySelectorAll('#drive-panel button')].find(b=>/^Send now \(1\)/.test(b.textContent));
chk('…"Send now (1)" button',!!b2);
const nb0=inDir('Backups').length;b2.click();await wait(150);
chk('…Send now: signs in again (no account picker, login hint), sends, queue empty',G.lastReq.prompt===''&&G.lastReq.login_hint==='spruk.k@gmail.com'&&inDir('Backups').length===nb0+1&&w2.eval('drv.queue.length')===0);
w=w2;

// expired token mid-way, Drive full, scope not granted, popup closed
G.tokens.clear();w.eval('driveBackupNow()');await wait(150);
chk('token expired or revoked at Google → 401: kept in the queue, asks for a tap on Send now',w.eval('drv.queue.length')===1&&/Google session expired — tap "Send now"/.test(w.document.getElementById('drive-msg').textContent),w.document.getElementById('drive-msg').textContent);
[...w.document.querySelectorAll('#drive-panel button')].find(b=>/^Send now/.test(b.textContent)).click();await wait(150);
chk('…"Send now" signs in again and sends it',w.eval('drv.queue.length')===0&&inDir('Backups').length===nb0+2);
G.full=true;w.eval('driveBackupNow()');await wait(150);
chk('Drive full: kept, with the reason',w.eval('drv.queue.length')===1&&/Google Drive is full/.test(w.document.getElementById('drive-msg').textContent));
G.full=false;w.eval(`drv.token=null`);G.grantDrive=false;
[...w.document.querySelectorAll('#drive-panel button')].find(b=>/^Send now/.test(b.textContent)).click();await wait(120);
chk('Drive permission not ticked at Google: refused with a clear message, kept',/Drive access was not ticked/.test(w.document.getElementById('drive-msg').textContent)&&w.eval('drv.queue.length')===1);
G.grantDrive=true;G.popupClosed=true;
[...w.document.querySelectorAll('#drive-panel button')].find(b=>/^Send now/.test(b.textContent)).click();await wait(80);
chk('Google window closed: says so, kept',/Google window closed/.test(w.document.getElementById('drive-msg').textContent)&&w.eval('drv.queue.length')===1);
G.popupClosed=false;
[...w.document.querySelectorAll('#drive-panel button')].find(b=>/^Send now/.test(b.textContent)).click();await wait(150);
chk('…then sent',w.eval('drv.queue.length')===0);

// restore → import
w.eval(`DB.weathers=DB.weathers.slice(0,1);saveDB()`);
w.eval('driveRestoreList()');await wait(200);
const items=[...w.document.querySelectorAll('#sbox .flist button')].map(b=>b.textContent);
chk('Restore: Backups / Profiles / Dope cards JSON, newest first',items.length>=3&&/^Backups · SEN backup/.test(items[0])&&items.some(t=>/^Profiles · Rifle — /.test(t))&&items.some(t=>/^Dope cards · Dope — .*\.json$/.test(t))&&!items.some(t=>/\.html|\.csv/.test(t)),items.join(' | '));
const nW=w.eval('DB.weathers.length');[...w.document.querySelectorAll('#sbox .flist button')][0].click();await wait(200);
chk('…picking a backup runs the normal import (weathers back; settings choice offered or applied)',w.eval('DB.weathers.length')>nW||!!w.document.querySelector('#modal.open, .modal.open, #imp-review'),w.eval('DB.weathers.length')+' / '+nW);
w.eval('closeModal&&closeModal()');

// lost folder ids / trashed folder
const nf=Object.keys(G.files).length;w.eval(`APP.drive.rootId=null;APP.drive.dirs={}`);w.eval('driveBackupNow()');await wait(150);
chk('folder ids lost: the existing folders are found again (no duplicates)',folders()==='Backups,Dope cards,Profiles,SEN Ballistics,Shot strings,Wind'&&Object.keys(G.files).length===nf+1);
Object.values(G.files).filter(f=>f.mimeType===FOLDER).forEach(f=>f.trashed=true);w.eval('driveBackupNow()');await wait(150);
chk('folders moved to the bin: created again, the backup lands in the new Backups',folders()==='Backups,SEN Ballistics'&&inDir('Backups').length===1);

// export file, client ID, disconnect, sinks
const exp=J(`JSON.parse(JSON.stringify({app2:appForExport()}))`);
chk('Export JSON never carries Drive state',!('drive' in exp.app2)&&/app2:appForExport\(\)/.test(fs.readFileSync(FILE,'utf8')));
const ci=w.document.getElementById('drive-client');ci.value='evil.example.com';ci.dispatchEvent(new w.Event('change'));
chk('client ID: a non-Google value is refused, the built-in one stays',/not a Google client ID/.test(w.alerts.pop()||'')&&w.eval('driveClientId()')===CID);
w.document.getElementById('drive-client').value='123-abc.apps.googleusercontent.com';w.document.getElementById('drive-client').dispatchEvent(new w.Event('change'));
chk('…another Google client ID is used (override stored)',w.eval('driveClientId()')==='123-abc.apps.googleusercontent.com');
w.eval(`APP.drive.clientId=undefined;delete APP.drive.clientId;drv.client=null`);
G.online=false;w.eval('driveBackupNow()');await wait(40);G.online=true;
const tok=w.eval('drv.token');[...w.document.querySelectorAll('#drive-panel button')].find(b=>b.textContent==='Disconnect').click();await wait(20);
chk('Disconnect: token revoked at Google, queue dropped, back to Connect',G.revoked.includes(tok)&&w.eval('drv.queue.length')===0&&!!w.document.querySelector('#drive-panel button')&&/Connect Google Drive/.test(w.document.getElementById('drive-panel').textContent)&&!w.eval('APP.drive.email'));
const src=fs.readFileSync(FILE,'utf8'),blk=src.slice(src.indexOf('V2.13.0 CORE-26 — Google Drive connector'),src.indexOf('async function boot(){'));
chk('Drive code: no innerHTML, token never written to storage',!/innerHTML/.test(blk)&&!/localStorage|APP\.drive\.token|cfg\.token/.test(blk));
chk('no uncaught errors',w.errs.length===0,w.errs.join(' | '));
console.log('\nPASS '+pass+'   FAIL '+fail);
process.exit(fail?1:0);
})().catch(e=>{console.error('TEST CRASH:',e);process.exit(1);});
