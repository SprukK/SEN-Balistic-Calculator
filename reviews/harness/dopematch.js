const {JSDOM}=require('jsdom'),fs=require('fs');const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const dom=new JSDOM(fs.readFileSync('/home/claude/repo/index.html','utf8'),{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',
  beforeParse(w){w.alert=()=>{};w.confirm=()=>true;w.scrollTo=()=>{};w.print=()=>{};w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:(t,k)=>k==='measureText'?()=>({width:10}):()=>{}});}});
const w=dom.window;await wait(800);
const r=w.eval(`(()=>{Bus.setRifle(DB.rifles.find(r=>/\\.25/.test(r.name)).id);Bus.setProj(DB.projectiles.find(p=>/^Altaros ATP Queen/.test(p.name)).id);Bus.setWx('cur',DB.weathers[0].id);Bus.setWx('zero',DB.weathers[0].id);Bus.notify();
  newDope();const c=getCard();const out=[];
  const tr=computeCardTraj(c),z=tr.z;
  for(const d of c.stages[0].dists){const card=solveShot(tr.pts,nearestPt,z.range,d.range,0,0,90,c.mv,tr.click,z.wSpd,z.wDir);
    const h=homeTraj(d.range+25),hz=zeroConds(),home=solveShot(h.pts,nearestPt,hz.range,d.range,0,0,90,S.mv,h.click&&rifleScope(getRifle()).clickStepMrad,hz.wSpd,hz.wDir);
    out.push(d.range+' m: card '+card.mrElev.toFixed(4)+' mrad ('+card.clElev.toFixed(1)+' clk) · Home '+home.mrElev.toFixed(4)+' mrad');}
  const html=dopePrintHTML(c);return out.join(' | ')+' || print header: '+html.replace(/<[^>]+>/g,' ').replace(/\\s+/g,' ').slice(0,260);})()`);
console.log(r);process.exit(0);})();
