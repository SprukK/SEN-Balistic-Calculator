// Minimal DOM stub — enough to execute the app script headlessly and reach the physics core.
const store={};
function mkEl(id){
  const el={id,value:'',textContent:'',innerHTML:'',style:{setProperty(){},},dataset:{},
    classList:{_s:new Set(),add(c){this._s.add(c)},remove(c){this._s.delete(c)},
      toggle(c,f){f?this._s.add(c):this._s.delete(c)},contains(c){return this._s.has(c)}},
    appendChild(){},removeChild(){},setAttribute(){},getAttribute(){return null},
    addEventListener(){},querySelector(){return null},querySelectorAll(){return []},
    getContext(){return {clearRect(){},fillRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fill(){},fillText(){},setTransform(){},scale(){},arc(){},closePath(){},save(){},restore(){},setLineDash(){},clip(){},rect(){},measureText(){return{width:10}},createLinearGradient(){return{addColorStop(){}}},translate(){},rotate(){}}},
    width:300,height:240,checked:false,disabled:false,files:[],click(){},focus(){},remove(){}};
  el.parentNode=el; return el;
}
const els={};
global.document={
  getElementById(id){return els[id]||(els[id]=mkEl(id));},
  querySelector(){return null},querySelectorAll(){return []},
  createElement(t){return mkEl('new-'+t)},
  addEventListener(){},
  body:mkEl('body'),
  documentElement:mkEl('html'),
  activeElement:null,
  get activeElementSafe(){return null}
};
global.document.documentElement.style={setProperty(){}};
global.localStorage={getItem(k){return store[k]??null},setItem(k,v){store[k]=String(v)},removeItem(k){delete store[k]}};
global.window={scrollTo(){},addEventListener(){},matchMedia(){return{matches:false,addEventListener(){}}},devicePixelRatio:1};
global.navigator={bluetooth:undefined,wakeLock:undefined,serviceWorker:undefined,userAgent:'node'};
global.location={protocol:'file:',reload(){}};
global.alert=()=>{};global.confirm=()=>false;global.prompt=()=>null;
global.requestAnimationFrame=f=>setTimeout(f,0);
global.getComputedStyle=()=>({getPropertyValue:()=>''});
global.Blob=class{constructor(){}};global.URL={createObjectURL(){return''},revokeObjectURL(){}};
global.FileReader=class{readAsText(){}};
