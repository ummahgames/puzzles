(function(root,factory){
  if(typeof module!=='undefined')module.exports=factory;
  else factory(root.MiniEngine,root.LegacyMiniEngine);
}(typeof window==='undefined'?globalThis:window,function(E,legacy){
  'use strict';
  // A checkpoint contains only mutable fields. Boards, clues, and all display text
  // are recreated from the chosen rules version, never accepted from an import.
  const int=(n,min=0,max=1000000000)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
  const num=(n,min=-1000000,max=1000000)=>typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max;
  const bool=v=>typeof v==='boolean', text=v=>typeof v==='string'&&v.length<=1000;
  const one=(...values)=>v=>values.includes(v);
  const nullable=check=>v=>v===null||check(v);
  const list=(check,max=100,min=0)=>v=>Array.isArray(v)&&v.length>=min&&v.length<=max&&v.every(check);
  const record=spec=>v=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===Object.keys(spec).length&&Object.entries(spec).every(([k,check])=>Object.hasOwn(v,k)&&check(v[k]));
  const number=v=>int(v), signed=v=>int(v,-1000000000), cell=v=>int(v,0,99), dir=v=>int(v,0,3), cells=list(cell), dirs=list(dir,4,1), log=list(text,40);
  const pairs=list(list(cell,100),100), tiles=list(nullable(v=>int(v,0,8)),100);
  const fitting=nullable(one('shield','ward','repair','scout'));
  const common={moves:number,won:bool,message:text};
  const fields={
    'patchwork-parade':{placed:list(record({piece:cell,cells}),10),selected:cell,rotation:dir},
    'puddle-engineers':{ports:list(dirs,100,1),water:cells},
    'who-made-that-sound':{round:cell,visual:bool,heard:bool},
    'sandcastle-helpers':{placed:list(record({piece:cell,cells}),10),selected:signed,rotation:dir},
    'picnic-pairs':{open:cells,matched:cells,mismatch:bool},
    'cloud-shepherd':{clouds:list(record({pos:cell,mass:v=>int(v,1,6)}),6,1),selected:cell},
    'mosaic-courtyard':{tiles},
    'carpet-unroll':{rolled:cells,cover:v=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length<=100&&Object.entries(v).every(([k,n])=>/^\d+$/.test(k)&&cell(+k)&&cell(n))},
    'pantry-shuffle':{items:null,selected:cell},
    'bookworm-caravan':{trace:cells,delivered:list(text,3)},
    'match-to-mend':{tiles,collected:list(number,3,3)},
    'market-crates':{crates:null,selected:cell},
    'lantern-links':{paths:pairs,selected:cell},
    'button-burrows':{tiles:list(dirs,100,1),selected:nullable(cell),lit:cells},
    'recipe-riddles':{guest:cell,chosen:cells,served:pairs},
    'folded-worlds':{stacks:v=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length>0&&Object.keys(v).length<=100&&Object.entries(v).every(([k,a])=>/^-?\d{1,3},-?\d{1,3}$/.test(k)&&list(record({pass:bool,start:bool,goal:bool}),100,1)(a)),route:list(text,100)},
    'orchard-guardians':{towers:list(record({pos:cell,kind:one('bell','snack'),range:number,cooldown:number}),35),selected:one('bell','snack'),budget:number,wave:number,visitors:list(record({step:number,happy:number,clock:number,speed:number,home:bool,preference:one('either','bell','snack')}),100),tick:number,running:bool,helped:number,lost:number,finished:bool},
    'caravan-breakthrough':{lane:v=>int(v,0,1),order:list(one('shield','tinker','scout'),3),events:log,arrived:cell},
    'the-moving-castle':{slots:list(fitting,5,5),selected:one('shield','ward','repair','scout'),budget:number,health:signed,leg:cell,log},
    'bannerfield':{turn:number,selected:cell,units:null,enemies:null,captured:cells,contributors:cells},
    'harbor-hide-and-seek':{ships:pairs,seen:cells,mode:one('survey','place','curtain'),custom:pairs,placementStart:nullable(cell),marks:cells,marking:bool},
    'clockwork-champions':{units:null,selected:cell,lost:bool},
    'companions-of-the-grove':{friends:null,rivals:null,selected:cell,move:one('gust','root','shell','bloom'),turn:number,log},
    'lantern-company':{turn:number,selected:cell,units:null,enemies:null,carrying:nullable(cell),guarding:bool,rescuedBy:cells},
    'tiny-siege-workshop':{plan:list(one('climb','dig','guard','bridge'),8),crossed:cell},
    'garden-guilds':{turn:number,selected:cell,units:null,enemies:null,claimed:cells,shade:cells,contributors:cells},
    'oasis-council':{land:list(nullable(one('water','garden','home','park')),25,25),selected:one('water','garden','home','park'),budget:number,water:cells},
    'forecast-fighters':{player:cell,rival:cell,score:number,enemyScore:number,round:number,queue:list(one('advance','shove','sidestep','guard','claim'),2)},
    'the-borrowed-minute':{player:cell,echo:cell,recording:bool,tape:cells,turn:number},
    'shadow-architects':{objects:null,selected:cell,lit:cells},
    'pocket-post-office':{program:list(one('forward','left','right','pick','deliver'),24),trace:cells,cart:cell,facing:dir,carrying:bool,pc:number,executing:bool},
    'museum-of-impossible-rooms':{tiles:list(dirs,9,9),selected:cell,lit:cells},
    'bridgewrights':{edges:list(record({a:cell,b:cell,locked:bool}),100),budget:number,selected:nullable(cell),stress:list(v=>num(v),100)},
    'constellation-switchyard':{switches:list(v=>int(v,0,1),3,3),current:cell,node:cell,delivered:cells,path:cells},
    'the-honest-the-mistaken-and-the-mixed-up':{selected:nullable(cell),notes:cells},
    'gravity-suitcase':{items:null,selected:cell,compressed:bool},
    'pocket-conservatory':{features:list(nullable(one('water','shade','log','flower','stem')),25,25),selected:one('water','shade','log','flower','stem'),budget:number},
    'cloud-habitat':{arrows:list(dir,20,20),flights:pairs},
    'the-traveling-repair-shop':{tiles},
    'one-small-island':{tiles:list(nullable(one('path','home','garden','park')),25,25),selected:one('path','home','garden','park'),turns:cell,score:nullable(record({homes:cells,roads:cells,parks:number}))},
    'storybook-stagehands':{selected:one('cloth','fan','drum','lamp','cutout','flags','stars'),slots:list(nullable(one('cloth','fan','drum','lamp','cutout','flags','stars')),3,3),cues:list(one('cloth','fan','drum','lamp','cutout','flags','stars'),3),performed:bool},
    'suitcase-planet':{tiles:list(one('grass','water','bridge'),20,20),selected:nullable(cell),visited:cells},
    'the-neighborhood-feast':{guests:null,selected:cell,supply:list(number,3,3)},
    'rooftop-ribbon-run':{x:number,jump:cell,sail:cell,duck:bool,glide:bool,bumps:number,ribbons:number},
    'beetle-ball':{players:list(cell,2,2),ball:cell,rival:cell,phase:number,selected:cell,curled:bool},
    'wobble-wagon':{load:list(record({id:cell,col:v=>int(v,0,2),weight:number}),4),selected:cell,leg:cell,phase:one('pack','drive'),speed:cell,spills:number},
    'two-ends-of-a-scarf':{people:list(cell,2,2),selected:cell,gateOpen:bool},
    'please-describe-the-monster':{built:record({eyes:v=>int(v,1,3),ears:v=>int(v,0,2),feet:v=>int(v,2,4),color:dir}),phase:one('study','build','compare')},
    'stardust-sanctuary':{fairies:null,food:list(record({x:v=>num(v,0,600),y:v=>num(v,0,350),life:cell,target:nullable(cell)}),10),stars:list(record({id:number,x:v=>num(v,0,600),y:v=>num(v,0,350),value:number}),24),gloom:list(record({id:number,x:v=>num(v,0,600),y:v=>num(v,0,350),calm:cell}),3),nectar:number,stardust:number,tick:number,nextStar:number,nextGloom:number,plants:cell,ward:bool,upgraded:bool,selected:cell}
  };
  const variable={items:['pos','width'],crates:['pos'],units:['pos','form','energy','range'],enemies:['pos'],friends:['hp','guard'],rivals:['hp','stun'],objects:['pos','dir'],guests:['plate']};
  function same(a,b){return JSON.stringify(a)===JSON.stringify(b);}
  function objectArray(key,value,base){
    if(!Array.isArray(value)||value.length!==base.length)return false;
    return value.every((v,i)=>{
      const original=base[i];if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).length!==Object.keys(original).length)return false;
      return Object.keys(original).every(k=>{
        if(!(variable[key]||[]).includes(k))return same(v[k],original[k]);
        if(k==='pos')return v[k]===null||cell(v[k]);
        if(k==='form')return ['walker','rover'].includes(v[k]);
        if(k==='plate')return list(number,3,3)(v[k]);
        if(k==='dir')return [-1,1].includes(v[k]);
        return int(v[k],0,99);
      });
    });
  }
  function fairies(value){return list(record({id:cell,name:one('Luma','Moss','Pip','Wisp','Fern','Aura'),kind:dir,x:v=>num(v,0,600),y:v=>num(v,0,350),dx:v=>num(v,-20,20),dy:v=>num(v,-20,20),hunger:v=>int(v,0,12),growth:number,adult:bool,sleeping:bool}),6,2)(value);}
  function schema(slug,base){
    const result={...common};
    for(const [key,validator]of Object.entries(fields[slug]))if(Object.hasOwn(base,key))result[key]=validator|| (key==='fairies'?fairies:v=>objectArray(key,v,base[key]));
    return result;
  }
  function safeState(slug,s){
    const size=s.w*s.h||s.n||100;
    for(const key of ['items','crates','units','enemies','objects','clouds'])if(s[key]?.some(v=>v.pos!==null&&(!int(v.pos,0,size-1))))return false;
    const selectedSize=s.pieces?.length||s.clouds?.length||s.items?.length||s.crates?.length||s.pairs?.length||s.friends?.length||s.units?.length||s.guests?.length||s.fairies?.length||s.weights?.length||s.people?.length||s.players?.length||s.objects?.length;
    if(typeof s.selected==='number'&&selectedSize&&(s.selected<0?slug!=='sandcastle-helpers'||!s.won:s.selected>=selectedSize))return false;
    if(s.tiles&&s.w&&s.h&&s.tiles.length!==size)return false;
    if(s.ports&&s.ports.length!==size)return false;
    if(s.paths&&s.pairs&&s.paths.length!==s.pairs.length)return false;
    if(s.round!==undefined&&slug==='who-made-that-sound'&&s.round>s.sequence.length)return false;
    if(Number.isInteger(s.guest)&&s.guest>s.guests.length)return false;
    if(s.leg!==undefined&&s.leg>(s.events?.length||s.road?.length||100))return false;
    if(s.current!==undefined&&s.current>s.trains.length)return false;
    if(s.placed&&(!s.placed.every(p=>p.piece<s.pieces.length&&p.cells.every(c=>c<size))||new Set(s.placed.flatMap(p=>p.cells)).size!==s.placed.flatMap(p=>p.cells).length))return false;
    if(s.edges?.some(e=>e.a>=s.nodes.length||e.b>=s.nodes.length||e.a===e.b))return false;
    return true;
  }
  function checksum(s){let h=2166136261;for(const c of s)h=Math.imul(h^c.charCodeAt(0),16777619);return(h>>>0).toString(36).toUpperCase();}
  function encode(text){return(typeof Buffer!=='undefined'?Buffer.from(text,'utf8').toString('base64'):btoa(unescape(encodeURIComponent(text)))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
  function decode(text){const raw=text.replace(/-/g,'+').replace(/_/g,'/');return typeof Buffer!=='undefined'?Buffer.from(raw,'base64').toString('utf8'):decodeURIComponent(escape(atob(raw)));}
  const templates=new Map();
  function template(rules,slug,level,generated){
    const key=rules+':'+slug+':'+level+(generated?':'+generated.version+':'+generated.number+':'+generated.difficulty:'');
    if(!templates.has(key)){
      const value=generated?E.generate(slug,generated.number,generated.difficulty):(rules===1?legacy:E).create(slug,level);
      if(templates.size>=64)templates.delete(templates.keys().next().value);
      templates.set(key,value);
    }
    return templates.get(key);
  }
  E.checkpoint=function(slug,mask,state){
    const rules=state._rules===1?1:2,base=template(rules,slug,state.level,state._generated),spec=schema(slug,base),data={};
    for(const key of Object.keys(spec))data[key]=state[key];
    if(data.food)data.food=data.food.map(v=>({...v,target:v.target??null}));
    if(data.visitors)data.visitors=data.visitors.map(v=>({...v,preference:v.preference||'either'}));
    // Bounded display logs are not gameplay state.
    if(data.log)data.log=data.log.slice(-40);if(data.events)data.events=data.events.slice(-40);
    const generated=state._generated,payload=`${generated?'UG4':'UG3'}.${slug}.${encode(JSON.stringify(generated?[rules,mask,state.level,data,generated]:[rules,mask,state.level,data]))}`;
    return payload+'.'+checksum(payload);
  };
  E.restore=function(slug,input){try{
    if(typeof input!=='string')return null;
    let code=input.trim();if(code.includes('#'))code=new URLSearchParams(code.slice(code.indexOf('#')+1)).get('save')||'';
    if(code.startsWith('UG1.')){const mask=E.decode(slug,code);if(mask===null)return null;const level=E.range(8).find(i=>!(mask&(1<<i)))??7;return{mask,level,state:E.create(slug,level),actions:[]};}
    if(code.startsWith('UG2.')){const restored=legacy?.unpack(slug,code);if(restored)restored.state._rules=1;return restored;}
    if(code.length>65000)return null;
    const p=code.split('.');if(p.length!==4||!['UG3','UG4'].includes(p[0])||p[1]!==slug||checksum(p.slice(0,3).join('.'))!==p[3])return null;
    const envelope=JSON.parse(decode(p[2]));if(!Array.isArray(envelope)||envelope.length!==(p[0]==='UG4'?5:4))return null;
    const [rules,mask,level,data,generated]=envelope;
    if(p[0]==='UG4'&&(!E.procedural?.valid(generated)||!E.procedural.supported.includes(slug)||rules!==2||generated.difficulty!==level))return null;
    if(p[0]==='UG3'&&generated!==undefined)return null;
    if(![1,2].includes(rules)||!int(mask,0,255)||!int(level,0,7)||!data||typeof data!=='object')return null;
    const base=E.clone(template(rules,slug,level,generated)),spec=schema(slug,base);
    if(Object.keys(data).length!==Object.keys(spec).length||!Object.entries(spec).every(([k,check])=>check(data[k])))return null;
    const state={...base,...data,_rules:rules};if(!safeState(slug,state))return null;
    return{mask,level,state,actions:[]};
  }catch(_){return null;}};
  E.legacy=legacy;
  return E;
}));
