const {JSDOM}=require('jsdom'),fs=require('fs'),zlib=require('zlib');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const crcT=(()=>{const t=[];for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t.push(c>>>0);}return t;})();
const crc=b=>{let c=0xFFFFFFFF;for(const x of b)c=crcT[(c^x)&0xFF]^(c>>>8);return((c^0xFFFFFFFF)>>>0).toString(16).padStart(8,'0');};
const code=obj=>{const j=Buffer.from(JSON.stringify(obj));return 'SEN1:'+crc(j)+'.'+zlib.deflateRawSync(j).toString('base64url');};
(async()=>{
const proj={id:'x"><img src=x onerror="window.__ran=1">',name:'Free BC 0.200 slug',cal:'.25',mfg:'Shared',type:'slug',diam:6.35,mass:60,oal:12.9,bcg7:0.2,bcg1:0.4,c:0,ff:1};
const c=code({schema:{projectiles:1},projectiles:[proj]});
console.log('code length',c.length);
const dom=new JSDOM(fs.readFileSync('/home/claude/repo/index.html','utf8'),{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/index.html#import='+c,
  beforeParse(w){w.alerts=[];w.alert=m=>w.alerts.push(String(m));w.confirm=()=>true;w.scrollTo=()=>{};
    for(const k of ['DecompressionStream','CompressionStream','ReadableStream','TextEncoder','TextDecoder'])w[k]=globalThis[k];
    w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:(t,k)=>k==='measureText'?()=>({width:10}):()=>{}});}});
const w=dom.window;await wait(1200);
console.log('alerts:',JSON.stringify(w.alerts));
console.log('review modal open:',w.document.getElementById('modal').classList.contains('open'));
console.log('imported:',w.eval('JSON.stringify(DB.projectiles.filter(p=>/Free BC/.test(p.name)).map(p=>p.id))'));
w.eval("gotoPage('profiles');renderProfiles()");await wait(50);
console.log('img element in profile list:',!!w.document.querySelector('#pl-projs img[onerror]'));
// decompression bomb: 50 MB of zeros
const big=Buffer.alloc(50e6,32);const bomb='SEN1:'+crc(big)+'.'+zlib.deflateRawSync(big,{level:9}).toString('base64url');
console.log('bomb code length',bomb.length,'chars → inflates to',big.length,'bytes (no size cap in decodeShare)');
process.exit(0);})();
