const {JSDOM}=require('jsdom'),fs=require('fs');
const file=process.argv[2];
const dom=new JSDOM(fs.readFileSync(file,'utf8'),{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/'});
const w=dom.window,d=w.document;
// canvas + wakeLock aren't implemented in jsdom; stub just enough
w.HTMLCanvasElement.prototype.getContext=()=>({clearRect(){},fillRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fill(){},fillText(){},setLineDash(){},save(){},restore(){},arc(){},closePath(){},measureText:()=>({width:10}),translate(){},scale(){},setTransform(){},rect(){},clip(){}});
let errs=[];w.addEventListener('error',e=>errs.push(e.message));
const origErr=w.console.error;w.console.error=(...a)=>errs.push(a.join(' '));

const click=el=>{const ev=new w.MouseEvent('click',{bubbles:true,cancelable:true});el.dispatchEvent(ev);};
const $=s=>d.querySelector(s), $$=s=>[...d.querySelectorAll(s)];
let pass=0,fail=0;
const chk=(n,ok,extra)=>{console.log((ok?'  PASS  ':'  FAIL  ')+n+(extra?'   '+extra:''));ok?pass++:fail++;};

setTimeout(()=>{
console.log('=== REAL-DOM CLICK TEST: '+file+' ===');
const bar=$$('#nav button');
console.log('  bottom bar buttons:',bar.map(b=>b.textContent.replace(/[^\x20-\x7e]/g,'').trim()).join(' | '));

// 1. the reported bug: click More
const more=$('#nav-more');
chk('#nav-more exists',!!more);
const before=errs.length;
click(more);
chk('clicking More throws nothing',errs.length===before,errs.slice(before).join(' / '));
const sheetOpen=$('#sheet').classList.contains('open');
chk('More opens the sheet',sheetOpen);
const items=$$('#sbox .navsheet button');
chk('More sheet lists 9 pages (V2.6.0: + Design Bench)',items.length===9,items.map(b=>b.dataset.page).join(','));

// 2. every More item navigates
let navFails=[];
for(const id of ['stab','bench','truing','holds','profiles','sensors','settings']){
  click($('#nav-more'));
  const b=$$('#sbox .navsheet button').find(x=>x.dataset.page===id);
  if(!b){navFails.push(id+':missing');continue;}
  const e0=errs.length; click(b);
  if(errs.length!==e0)navFails.push(id+':threw');
  else if(!$('#page-'+id).classList.contains('active'))navFails.push(id+':not-active');
  else if(!$('#nav-more').classList.contains('on'))navFails.push(id+':more-not-lit');
}
chk('all 6 More pages navigate + light More',navFails.length===0,navFails.join(' '));
chk('sheet closes after choosing',!$('#sheet').classList.contains('open'));

// 3. bottom-bar tabs still work
let barFails=[];
for(const b of $$('#nav button[data-page]')){
  const e0=errs.length; click(b);
  if(errs.length!==e0)barFails.push(b.dataset.page+':threw');
  else if(!$('#page-'+b.dataset.page).classList.contains('active'))barFails.push(b.dataset.page+':not-active');
}
chk('all 5 bar tabs navigate',barFails.length===0,barFails.join(' '));
chk('More unlit on a bar page',!$('#nav-more').classList.contains('on'));

// 4. act-bar chips open pickers
click($$('#nav button[data-page]').find(b=>b.dataset.page==='home'));
let chipFails=[];
const chips=$$('#actbar .actchip');
chk('act bar renders 6 chips',chips.length===6);
for(let i=0;i<chips.length;i++){
  const e0=errs.length; click($$('#actbar .actchip')[i]);
  if(errs.length!==e0)chipFails.push(i+':threw');
  const s=$('#sheet').classList.contains('open');
  if(!s&&i!==4)chipFails.push(i+':no-sheet');   // chip 4 = Wind, routes to the Wind tab by design
  if(s)click($('#sheet'));
}
chk('all act-bar chips respond',chipFails.length===0,chipFails.join(' '));

// 5. Home disclosures
click($$('#nav button[data-page]').find(b=>b.dataset.page==='home'));
chk('turret panel is a disclosure',$('#home-turret-panel').tagName==='DETAILS');
chk('manual wind is a disclosure',$('#home-manwind').tagName==='DETAILS');
chk('disclosure summaries populated',!!$('#ht-sum').textContent&&!!$('#hm-sum').textContent,
  JSON.stringify($('#ht-sum').textContent)+' / '+JSON.stringify($('#hm-sum').textContent));

console.log('');
chk('ZERO uncaught errors in whole run',errs.length===0,errs.slice(0,3).join(' / '));
console.log('\nPASS '+pass+'   FAIL '+fail);
process.exit(fail?1:0);
},600);
