(function (root) {
  'use strict';
  const clone = value => JSON.parse(JSON.stringify(value));
  const directions = [[0,-1],[1,0],[0,1],[-1,0]];
  const opposite = d => (d + 2) % 4;
  const adjacent = (a,b,w) => Math.abs(a%w-b%w)+Math.abs(Math.floor(a/w)-Math.floor(b/w))===1;
  const engines = {};
  const range = n => Array.from({length:n},(_,i)=>i);
  function seeded(seed) { let n=seed>>>0; return () => { n=(Math.imul(n,1664525)+1013904223)>>>0; return n/4294967296; }; }
  function shuffled(items,seed) { const a=items.slice(),rng=seeded(seed); for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a; }
  function connected(w,h,pass,start) {const seen=new Set([start]),queue=[start];for(let k=0;k<queue.length;k++)for(let i=0;i<w*h;i++)if(!seen.has(i)&&pass(i)&&adjacent(queue[k],i,w)){seen.add(i);queue.push(i);}return seen;}
  function base(level) { return {level, moves:0, won:false, message:''}; }

  // Rotatable gutters: water enters through the top and follows matching ports.
  const waterPaths=[
    [0,1,2,6,10,14,15],[1,5,4,8,9,10,14,15],[0,4,5,6,2,3,7,11,15],
    [3,2,1,5,9,8,12,13,14,15],[0,1,5,4,8,12,13,9,10,11,15],
    [2,1,0,4,8,9,5,6,7,11,15],[1,2,3,7,6,5,9,8,12,13,14,15],
    [0,4,8,12,13,9,5,1,2,3,7,6,10,14,15]
  ];
  function dirBetween(a,b,w){return b===a-w?0:b===a+1?1:b===a+w?2:3;}
  function waterFlow(s){const seen=new Set(),q=[];if(s.ports[s.source].includes(0))q.push(s.source);while(q.length){const p=q.shift();if(seen.has(p))continue;seen.add(p);for(const d of s.ports[p]){const [dx,dy]=directions[d],x=p%s.w+dx,y=Math.floor(p/s.w)+dy;if(x>=0&&x<s.w&&y>=0&&y<s.h){const n=y*s.w+x;if(s.ports[n].includes(opposite(d)))q.push(n);}}}return seen;}
  engines['puddle-engineers']={
    create(level){const p=waterPaths[level],s={...base(level),w:4,h:4,source:p[0],pots:[p[p.length-1]],ports:[],water:[],solution:[]};const rng=seeded(100+level);for(let i=0;i<16;i++)s.ports.push(rng()<.5?[0,2]:[0,1]);p.forEach((cell,i)=>{s.ports[cell]=[i===0?0:dirBetween(cell,p[i-1],4),i===p.length-1?2:dirBetween(cell,p[i+1],4)];});s.correct=clone(s.ports);for(let i=0;i<16;i++){const turns=Math.floor(rng()*4);s.ports[i]=s.ports[i].map(d=>(d+turns)%4);for(let t=0;t<(4-turns)%4;t++)s.solution.push({type:'cell',index:i});}if(level>2)s.pots.push(p[Math.floor(p.length*.6)]);return s;},
    act(s,a){if(a.type==='cell'){s.ports[a.index]=s.ports[a.index].map(d=>(d+1)%4);s.water=[];}if(a.type==='run'){s.water=[...waterFlow(s)];s.won=s.pots.every(p=>s.water.includes(p));s.message=s.won?'Every flower has a drink!':'Some pots are still dry. Follow the blue water and turn a gutter.';}return s;},flow:waterFlow
  };

  // Shape placement with an actual supported castle silhouette and a crab tunnel.
  const castlePlans=[
    {w:4,h:3,holes:[9,10],pieces:[[[0,0],[0,1],[0,2]],[[0,0],[0,1],[0,2]],[[0,0],[1,0]]],spots:[[0,0],[3,0],[1,0]]},
    {w:5,h:3,holes:[11,12,13],pieces:[[[0,0],[0,1],[0,2]],[[0,0],[0,1],[0,2]],[[0,0],[1,0],[2,0]]],spots:[[0,0],[4,0],[1,0]]},
    {w:5,h:4,holes:[16,17,18],pieces:[[[0,0],[0,1],[0,2],[0,3]],[[0,0],[0,1],[0,2],[0,3]],[[0,0],[1,0],[2,0]],[[0,0],[1,0],[2,0]]],spots:[[0,0],[4,0],[1,0],[1,1]]},
    {w:6,h:4,holes:[20,21],pieces:[[[0,0],[1,0],[0,1],[1,1],[0,2],[1,2],[0,3],[1,3]],[[0,0],[1,0],[0,1],[1,1],[0,2],[1,2],[0,3],[1,3]],[[0,0],[1,0]],[[0,0],[1,0]]],spots:[[0,0],[4,0],[2,0],[2,1]]}
  ];
  function rotated(shape,r){let p=shape.map(x=>x.slice());for(let i=0;i<r;i++)p=p.map(([x,y])=>[-y,x]);const mx=Math.min(...p.map(x=>x[0])),my=Math.min(...p.map(x=>x[1]));return p.map(([x,y])=>[x-mx,y-my]);}
  function castleCells(s,i,x,y){return rotated(s.pieces[i],s.rotation).map(([dx,dy])=>[x+dx,y+dy]);}
  engines['sandcastle-helpers']={
    create(level){const plan=clone(castlePlans[level%4]),target=[];plan.pieces.forEach((shape,i)=>shape.forEach(([x,y])=>target.push((y+plan.spots[i][1])*plan.w+x+plan.spots[i][0])));if(level>=4)plan.pieces=plan.pieces.map(p=>rotated(p,1));return {...base(level),...plan,target,placed:[],selected:0,rotation:0,solution:plan.spots.map(([x,y],piece)=>({type:'place',piece,x,y,rotation:level>=4?3:0})),turning:level>=4};},
    act(s,a){if(a.type==='select'){s.selected=a.index;s.rotation=0;}if(a.type==='rotate'&&s.turning)s.rotation=(s.rotation+1)%4;if(a.type==='cell'||a.type==='place'){if(a.type==='place'){s.selected=a.piece;s.rotation=a.rotation||0;}const x=a.type==='cell'?a.index%s.w:a.x,y=a.type==='cell'?Math.floor(a.index/s.w):a.y;if(s.placed.some(p=>p.piece===s.selected)){s.message='That block is already in the castle. Undo to move it.';return s;}const cells=castleCells(s,s.selected,x,y);const valid=cells.every(([cx,cy])=>cx>=0&&cx<s.w&&cy>=0&&cy<s.h&&s.target.includes(cy*s.w+cx)&&!s.placed.some(p=>p.cells.includes(cy*s.w+cx)));if(!valid){s.message='Try the stitched outline. Keep the crab tunnel clear.';return s;}s.placed.push({piece:s.selected,cells:cells.map(([cx,cy])=>cy*s.w+cx)});s.selected=s.pieces.findIndex((_,i)=>!s.placed.some(p=>p.piece===i));s.rotation=0;s.won=s.placed.length===s.pieces.length;s.message=s.won?'A castle with a clear crab tunnel. Wave to the parade!':'A lovely fit. Choose the next sand block.';}return s;},rotated
  };

  const pairs=[['🌱','🌻','seed and flower'],['🐔','🥚','hen and egg'],['🧤','🧤','two mittens'],['🫖','☕','teapot and cup'],['🐝','🍯','bee and honey'],['☔','🌧','umbrella and rain'],['🔑','🔒','key and lock'],['📨','📫','letter and mailbox'],['🧦','🧦','two socks'],['🐑','🧶','sheep and wool'],['🪥','🦷','brush and tooth'],['🐇','🥕','rabbit and carrot']];
  engines['picnic-pairs']={
    create(level){const n=3+Math.floor(level/2);return {...base(level),cards:shuffled(pairs.slice(level%4,level%4+n).flatMap((p,id)=>p.slice(0,2).map(face=>({face,id,clue:p[2]}))),level+71),open:[],matched:[],mismatch:false,solution:[]};},
    act(s,a){if(a.type==='cell'){const i=a.index;if(s.matched.includes(i)||s.open.includes(i))return s;if(s.mismatch){s.open=[];s.mismatch=false;}s.open.push(i);if(s.open.length===2){const [x,y]=s.open;if(s.cards[x].id===s.cards[y].id){s.matched.push(x,y);s.message=`Together: ${s.cards[x].clue}.`;s.open=[];}else{s.mismatch=true;s.message='Remember these pictures. Choose another blanket when you’re ready.';}}s.won=s.matched.length===s.cards.length;}return s;}
  };

  engines['cloud-shepherd']={
    create(level){const w=5,h=4,clouds=level<2?[{pos:0,mass:1},{pos:4,mass:1}]:level<5?[{pos:0,mass:2},{pos:4,mass:1}]:[{pos:2,mass:3}],targets=level<2?[{pos:15+level,mass:1},{pos:19-level,mass:1}]:level<5?[{pos:17+level%2,mass:3}]:[{pos:15+(level%2),mass:1},{pos:19,mass:2}];return {...base(level),w,h,clouds,targets,rocks:level===0?[]:level===7?[6,7,12]:[7,12],selected:0,solution:[]};},
    act(s,a){if(a.type==='cell'){const i=s.clouds.findIndex(c=>c.pos===a.index);if(i>=0)s.selected=i;}if(a.type==='move'){const c=s.clouds[s.selected];if(!c)return s;const [dx,dy]=directions[a.dir],x=c.pos%s.w+dx,y=Math.floor(c.pos/s.w)+dy,n=y*s.w+x;if(x<0||x>=s.w||y<0||y>=s.h||s.rocks.includes(n))return s;const other=s.clouds.findIndex((v,i)=>i!==s.selected&&v.pos===n);if(other>=0){s.clouds[other].mass+=c.mass;s.clouds.splice(s.selected,1);s.selected=s.clouds.findIndex(v=>v.pos===n);}else c.pos=n;}if(a.type==='split'){const c=s.clouds[s.selected];if(!c||c.mass<2)return s;const n=c.pos+1;if(c.pos%s.w===s.w-1||s.rocks.includes(n)||s.clouds.some(v=>v.pos===n)){s.message='Leave a space to the right to split this cloud.';return s;}c.mass--;s.clouds.push({pos:n,mass:1});}s.won=s.clouds.length===s.targets.length&&s.targets.every(t=>s.clouds.some(c=>c.pos===t.pos&&c.mass===t.mass));return s;}
  };

  function shiftGrid(grid,w,index,axis,amount){const a=grid.slice(),cells=range(w).map(i=>axis==='row'?index*w+i:i*w+index);cells.forEach((cell,i)=>{a[cells[(i+amount+w)%w]]=grid[cell];});return a;}
  engines['mosaic-courtyard']={
    create(level){const w=level<3?3:4,target=range(w*w).map(i=>(Math.floor(i/w)+i%w*2)%5),s={...base(level),w,h:w,target,tiles:target.slice(),solution:[]};const rng=seeded(80+level);for(let i=0;i<3+level;i++){const axis=rng()<.5?'row':'col',index=Math.floor(rng()*w);s.tiles=shiftGrid(s.tiles,w,index,axis,1);s.solution.unshift({type:'shift',axis,index,amount:-1});}return s;},
    act(s,a){if(a.type==='shift')s.tiles=shiftGrid(s.tiles,s.w,a.index,a.axis,a.amount);s.won=s.tiles.every((t,i)=>t===s.target[i]);return s;}
  };

  // Rugs stop at an occupied tile. Order changes the length of their rollout.
  engines['carpet-unroll']={
    create(level){const w=4+level%3,h=3+Math.floor(level/4),rugs=[];for(let y=0;y<h;y++)rugs.push({pos:y*w,dir:1,max:w-1,color:y});let floor=range(w*h);if(level>1){const col=1+level%2;rugs[0]={pos:col,dir:2,max:h,color:0};floor=floor.filter(i=>i>=w||i===col);}const blocked=range(w*h).filter(i=>!floor.includes(i));return {...base(level),w,h,rugs,blocked,floor,rolled:[],cover:{},solution:(level>1?range(h).slice(1).concat(0):range(h)).map(index=>({type:'rug',index}))};},
    act(s,a){if(a.type!=='rug'||s.rolled.includes(a.index))return s;const r=s.rugs[a.index];let x=r.pos%s.w,y=Math.floor(r.pos/s.w);const cells=[r.pos];if(s.cover[r.pos]!==undefined){s.message='This rug is covered. Undo the last rollout.';return s;}for(let k=0;k<r.max;k++){x+=directions[r.dir][0];y+=directions[r.dir][1];if(x<0||x>=s.w||y<0||y>=s.h)break;const n=y*s.w+x;if(s.cover[n]!==undefined||s.rugs.some((v,i)=>i!==a.index&&v.pos===n))break;cells.push(n);}cells.forEach(n=>s.cover[n]=a.index);s.rolled.push(a.index);s.won=s.floor.every(n=>s.cover[n]!==undefined);s.message=s.won?'Every floor tile has a cozy carpet.':`${cells.length} squares covered. ${s.floor.length-Object.keys(s.cover).length} still bare.`;return s;}
  };

  const wordSets=[['CAT','SUN','MAP'],['BEE','CUP','HAT'],['BOOK','MOON','TREE'],['RAIN','BOAT','STAR'],['BREAD','PLANT','CLOUD'],['RIVER','SHELL','LIGHT'],['GARDEN','BRIDGE','PLANET'],['CARPET','CASTLE','FLOWER']];
  const clues={CAT:'🐱',SUN:'☀',MAP:'🗺',BEE:'🐝',CUP:'☕',HAT:'🎩',BOOK:'📖',MOON:'🌙',TREE:'🌳',RAIN:'🌧',BOAT:'⛵',STAR:'⭐',BREAD:'🥖',PLANT:'🌱',CLOUD:'☁',RIVER:'〰',SHELL:'🐚',LIGHT:'💡',GARDEN:'🌷',BRIDGE:'🌉',PLANET:'🪐',CARPET:'▤',CASTLE:'🏰',FLOWER:'🌻'};
  engines['bookworm-caravan']={
    create(level){const words=wordSets[level],w=Math.max(...words.map(x=>x.length)),tiles=[],routes=[];words.forEach((word,row)=>{const letters=word.padEnd(w,'E').split('');if((row+level)%2)letters.reverse();tiles.push(...letters);routes.push(range(word.length).map(i=>row*w+((row+level)%2?w-1-i:i)));});return {...base(level),w,h:3,tiles,words,clues,trace:[],delivered:[],routes,solution:[]};},
    act(s,a){if(a.type==='hint')s.message=`The library needs ${s.words.find(w=>!s.delivered.includes(w))}. Look along a row, in either direction.`;if(a.type==='cell'){if(s.trace.includes(a.index)){s.trace=s.trace.slice(0,s.trace.indexOf(a.index)+1);return s;}const last=s.trace[s.trace.length-1];if(last!==undefined&&!adjacent(last,a.index,s.w)){s.message='Choose a neighboring letter, or clear your word.';return s;}s.trace.push(a.index);}if(a.type==='clear')s.trace=[];if(a.type==='submit'){const word=s.trace.map(i=>s.tiles[i]).join('');if(s.words.includes(word)&&!s.delivered.includes(word)){s.delivered.push(word);s.message=`${word} is safely in the library!`;}else s.message='Look at the picture clues and try a word the library needs.';s.trace=[];s.won=s.delivered.length===s.words.length;}return s;}
  };

  engines['button-burrows']={
    create(level){const w=level<3?3:4,path=[];for(let y=0;y<w;y++)for(let x=0;x<w;x++)path.push(y*w+(y%2?w-1-x:x));const tiles=range(w*w).map(()=>[]);path.forEach((p,i)=>tiles[p]=[i?dirBetween(p,path[i-1],w):3,i<path.length-1?dirBetween(p,path[i+1],w):1]);const s={...base(level),w,h:w,tiles,start:path[0],end:path[path.length-1],selected:null,lit:[],solution:[]},rng=seeded(53+level);for(let j=0;j<4+level*2;j++){const a=Math.floor(rng()*tiles.length),choices=range(tiles.length).filter(b=>adjacent(a,b,w)),b=choices[Math.floor(rng()*choices.length)];[s.tiles[a],s.tiles[b]]=[s.tiles[b],s.tiles[a]];s.solution.unshift({type:'swap',a,b});}return s;},
    act(s,a){if(a.type==='cell'){if(s.selected===null)s.selected=a.index;else{if(adjacent(s.selected,a.index,s.w)){[s.tiles[s.selected],s.tiles[a.index]]=[s.tiles[a.index],s.tiles[s.selected]];s.selected=null;}else{s.selected=a.index;s.message='Choose a button next to this one to swap.';}}}if(a.type==='swap'){if(adjacent(a.a,a.b,s.w))[s.tiles[a.a],s.tiles[a.b]]=[s.tiles[a.b],s.tiles[a.a]];}if(a.type==='run'){const fake={w:s.w,h:s.h,ports:s.tiles,source:s.start}; // Explicit left-hand entrance, then ordinary reciprocal ports.
      const seen=new Set(),q=s.tiles[s.start].includes(3)?[s.start]:[];while(q.length){const p=q.shift();if(seen.has(p))continue;seen.add(p);s.tiles[p].forEach(d=>{const [dx,dy]=directions[d],x=p%s.w+dx,y=Math.floor(p/s.w)+dy,n=y*s.w+x;if(x>=0&&x<s.w&&y>=0&&y<s.h&&s.tiles[n].includes(opposite(d)))q.push(n);});}s.lit=[...seen];s.won=seen.has(s.end)&&s.tiles[s.end].includes(1);s.message=s.won?'The whole burrow is homeward bound.':'The traveler stopped at a disconnected stitch. Swap nearby buttons.';}return s;}
  };

  // Folding retains stacks; the last overlaid tile is the visible walking surface.
  function fold(s,axis,k,side){const stacks={};Object.entries(s.stacks).forEach(([key,stack])=>{let [x,y]=key.split(',').map(Number),v=axis==='x'?x:y;const moving=side==='low'?v<k:v>=k;if(!moving){stacks[`${x},${y}`]=stack.slice();}});Object.entries(s.stacks).forEach(([key,stack])=>{let [x,y]=key.split(',').map(Number),v=axis==='x'?x:y;const moving=side==='low'?v<k:v>=k;if(moving){if(axis==='x')x=2*k-1-x;else y=2*k-1-y;const key2=`${x},${y}`;stacks[key2]=(stacks[key2]||[]).concat(stack.slice().reverse());}});s.stacks=stacks;}
  function paperRoute(s){const top=Object.entries(s.stacks).map(([key,stack])=>({key,tile:stack[stack.length-1]})),start=top.find(x=>x.tile.start),goal=top.find(x=>x.tile.goal);if(!start||!goal)return [];const q=[[start.key]],seen=new Set([start.key]);for(let n=0;n<q.length;n++){const p=q[n],key=p[p.length-1];if(key===goal.key)return p;const [x,y]=key.split(',').map(Number);for(const [dx,dy]of directions){const next=`${x+dx},${y+dy}`;if(!seen.has(next)&&top.some(t=>t.key===next&&t.tile.pass)){seen.add(next);q.push(p.concat(next));}}}return [];}
  engines['folded-worlds']={
    create(level){const w=level<4?4+Math.floor(level/2):6+Math.floor((level-4)/2),h=level<4?4:6,stacks={};
      for(let y=0;y<h;y++)for(let x=0;x<w;x++){
        if(level<4)stacks[`${x},${y}`]=[{pass:y===0||y===2&&x!==Math.floor(w/2),start:y===2&&x===0,goal:y===2&&x===w-1}];
        else if(y===0&&x<=3||y===2||y===5&&x>=3)stacks[`${x},${y}`]=[{pass:y!==2||x!==2&&x!==w-2,start:y===2&&x===0,goal:y===5&&x===w-1}];
      }
      const solution=[{type:'fold',axis:'y',k:1,side:'low'}];if(level>=4)solution.push({type:'fold',axis:'y',k:4,side:'high'});
      const s={...base(level),w,h,stacks,route:[],solution};if(level%2){const st={};Object.entries(stacks).forEach(([key,v])=>{const [x,y]=key.split(',');st[`${y},${x}`]=v;});s.stacks=st;s.w=h;s.h=w;s.solution=solution.map(a=>({...a,axis:'x'}));}return s;},
    act(s,a){if(a.type==='fold'){const values=Object.keys(s.stacks).map(key=>Number(key.split(',')[a.axis==='x'?0:1]));if(a.k<=Math.min(...values)||a.k>Math.max(...values)){s.message='That crease no longer crosses the paper. Try another crease or undo.';return s;}fold(s,a.axis,a.k,a.side);s.route=[];}if(a.type==='run'){s.route=paperRoute(s);s.won=s.route.length>0;s.message=s.won?'The paper path reaches home.':'The traveler needs a connected top surface, with both homes still visible.';}return s;},route:paperRoute
  };

  // Tower defense resolves finite waves in deterministic steps. Towers sing or feed;
  // each visitor leaves after three happiness points, with no projectiles or combat.
  const orchardPath=[14,15,16,17,18,19,20];
  function orchardStep(s){const wave=s.wave,visitors=s.visitors;for(const t of s.towers)if(t.cooldown>0)t.cooldown--;for(const v of visitors){if(v.home)continue;const pos=orchardPath[Math.min(v.step,6)];for(const t of s.towers){if(t.cooldown===0&&Math.abs(t.pos%7-pos%7)+Math.abs(Math.floor(t.pos/7)-2)<=t.range){v.happy+=t.kind==='snack'?2:1;t.cooldown=t.kind==='snack'?3:2;}}if(v.happy>=3){v.home=true;s.helped++;continue;}v.clock++;if(v.clock>=v.speed){v.clock=0;v.step++;if(v.step>=7){v.home=true;s.lost++;}}}if(s.tick<2+wave*2&&s.tick%2===0)s.visitors.push({step:0,happy:0,clock:0,speed:2+(wave%2),home:false});s.tick++;if(s.tick>=2+wave*2&&s.visitors.every(v=>v.home)){s.running=false;s.wave++;if(s.wave>s.waves){s.won=s.lost<=s.allowance;s.finished=true;s.message=s.won?'The harvest is safe, and every visitor had a welcome.':'A few too many apples left the orchard. Undo or retry your plan.';}else s.message='A quiet moment. Rearrange posts or welcome the next visitors.';}}
  engines['orchard-guardians']={
    create(level){return {...base(level),w:7,h:5,path:orchardPath,towers:[],selected:'bell',budget:7+Math.floor(level/2),wave:1,waves:3+Math.floor(level/3),visitors:[],tick:0,running:false,helped:0,lost:0,allowance:1,finished:false,solution:[{pos:9,kind:'snack'},{pos:10,kind:'bell'},{pos:11,kind:'snack'}].map(t=>({type:'build',...t}))};},
    act(s,a){if(s.running){if(a.type==='step')orchardStep(s);return s;}if(s.finished)return s;if(a.type==='select')s.selected=a.kind;if(a.type==='cell'||a.type==='build'){const pos=a.type==='cell'?a.index:a.pos,kind=a.kind||s.selected,cost=kind==='snack'?3:1;if(s.path.includes(pos)||s.towers.some(t=>t.pos===pos)||s.budget<cost)return s;s.towers.push({pos,kind,range:kind==='bell'?2:1,cooldown:0});s.budget-=cost;}if(a.type==='run'){s.running=true;s.tick=0;s.visitors=[];s.towers.forEach(t=>t.cooldown=0);s.message='Visitors are coming. Bell posts sing; snack baskets offer a rest.';}return s;},step:orchardStep
  };

  const defenseTypes=['wind','gate','bell'];
  function caravanRun(s){let disabled=new Set(),events=[],arrived=0;for(const role of s.order){let health=s.level>3?7:5;const match={shield:'wind',tinker:'gate',scout:'bell'}[role];for(const type of s.routes[s.lane]){if(disabled.has(type)){events.push(`${role}: the ${type} post is already quiet.`);continue;}if(type===match){disabled.add(type);events.push(`${role} quiets the ${type} post for the whole caravan.`);}else{health-=2;events.push(`${role} passes ${type}, with ${Math.max(health,0)} energy left.`);}if(health<=0)break;}if(health>0)arrived++;}s.events=events;s.arrived=arrived;s.won=arrived===3;s.message=s.won?'All three supply wagons reached the destination.':'The crew needs a different departure order or route. Try again.';}
  engines['caravan-breakthrough']={
    create(level){const permutations=[[0,1,2],[1,0,2],[2,1,0],[0,2,1],[1,2,0],[2,0,1],[0,1,2],[1,0,2]],types=permutations[level].map(i=>defenseTypes[i]),route=types.flatMap((t,i)=>Array(1+(i===0?1:0)+(level>3&&i===1?1:0)+(level>5&&i===0?1:0)).fill(t));return {...base(level),routes:[route,route.slice().reverse()],lane:0,order:[],roles:['shield','tinker','scout'],events:[],arrived:0,solution:types.map(role=>({type:'role',role:{wind:'shield',gate:'tinker',bell:'scout'}[role]}))};},
    act(s,a){if(a.type==='lane'){s.lane=a.index;s.events=[];}if(a.type==='role'&&!s.order.includes(a.role)&&s.order.length<3)s.order.push(a.role);if(a.type==='clear'){s.order=[];s.events=[];}if(a.type==='run'){if(s.order.length<3){s.message='Choose all three crew members in their departure order.';return s;}caravanRun(s);}return s;},run:caravanRun
  };

  // Small deterministic tactical match: walkers push; rovers travel two squares.
  function tacticalMoves(s,i){const u=s.units[i],moves=[];if(!u)return moves;for(let d=0;d<4;d++)for(let n=1;n<=(u.form==='rover'?2:1);n++){const [dx,dy]=directions[d],x=u.pos%s.w+dx*n,y=Math.floor(u.pos/s.w)+dy*n,p=y*s.w+x;if(x<0||x>=s.w||y<0||y>=s.h||s.blocks.includes(p)||s.units.some(v=>v.pos===p))break;moves.push(p);}return moves;}
  function enemyTurn(s){const enemy=s.units.find(u=>u.team==='enemy');if(!enemy)return;const ally=s.units.find(u=>u.team==='ally'&&adjacent(u.pos,enemy.pos,s.w));if(ally){const dx=ally.pos%s.w-enemy.pos%s.w,dy=Math.floor(ally.pos/s.w)-Math.floor(enemy.pos/s.w),x=ally.pos%s.w+dx,y=Math.floor(ally.pos/s.w)+dy,p=y*s.w+x;if(x>=0&&x<s.w&&y>=0&&y<s.h&&!s.blocks.includes(p)&&!s.units.some(u=>u.pos===p))ally.pos=p;return;}const i=s.units.indexOf(enemy),choices=tacticalMoves(s,i);choices.sort((a,b)=>Math.abs(a%s.w-s.home%s.w)+Math.abs(Math.floor(a/s.w)-Math.floor(s.home/s.w))-(Math.abs(b%s.w-s.home%s.w)+Math.abs(Math.floor(b/s.w)-Math.floor(s.home/s.w))));if(choices.length)enemy.pos=choices[0];if(enemy.pos===s.home){s.lost=true;s.message='The guardian reached your workshop. Undo and try another formation.';}}
  engines['clockwork-champions']={
    create(level){const blocks=[[11,13],[6,18],[8,16],[6,13],[11,18],[8,13],[6,8,18],[6,8,16]][level];return {...base(level),w:5,h:5,blocks,home:22,goal:2,units:[{team:'ally',pos:20,form:level<2?'rover':'walker'},{team:'ally',pos:24,form:'walker'},{team:'enemy',pos:7+level%2*5,form:'walker'}],selected:0,lost:false};},
    act(s,a){if(s.lost||s.won)return s;if(a.type==='select'){s.selected=a.index;return s;}const u=s.units[s.selected];let turn=false;if(a.type==='transform'){u.form=u.form==='rover'?'walker':'rover';turn=true;}if(a.type==='cell'){const own=s.units.findIndex(v=>v.pos===a.index&&v.team==='ally');if(own>=0){s.selected=own;return s;}if(tacticalMoves(s,s.selected).includes(a.index)){u.pos=a.index;turn=true;}else if(u.form==='walker'&&adjacent(u.pos,a.index,s.w)){const e=s.units.find(v=>v.pos===a.index&&v.team==='enemy');if(e){const dx=e.pos%s.w-u.pos%s.w,dy=Math.floor(e.pos/s.w)-Math.floor(u.pos/s.w),x=e.pos%s.w+dx,y=Math.floor(e.pos/s.w)+dy,p=y*s.w+x;if(x>=0&&x<s.w&&y>=0&&y<s.h&&!s.blocks.includes(p)&&!s.units.some(v=>v.pos===p)){e.pos=p;turn=true;}}}}if(turn){s.won=s.units.some(v=>v.team==='ally'&&v.pos===s.goal);if(!s.won)enemyTurn(s);}return s;},moves:tacticalMoves
  };

  engines['the-borrowed-minute']={
    create(level){const w=5,h=5,plate=[15,5,10,0,16,6,11,1][level],gate=12,blocks=[2,7,17,22],start=20,goal=4;return {...base(level),w,h,plate,gate,blocks,start,goal,player:start,echo:start,recording:true,tape:[],turn:0,limit:10+level,solution:[]};},
    act(s,a){if(a.type==='rewind'){if(!s.tape.length){s.message='Record a few steps to the round plate first.';return s;}s.recording=false;s.player=s.start;s.echo=s.start;s.turn=0;s.message='Your echo repeats the recording once per step, then waits.';return s;}if(a.type==='move'||a.type==='wait'){if(!s.recording){s.echo=s.tape[Math.min(s.turn,s.tape.length-1)];s.turn++;}let next=s.player;if(a.type==='move'){const [dx,dy]=directions[a.dir],x=s.player%s.w+dx,y=Math.floor(s.player/s.w)+dy,p=y*s.w+x;if(x>=0&&x<s.w&&y>=0&&y<s.h&&!s.blocks.includes(p)&&(p!==s.gate||s.echo===s.plate))next=p;}s.player=next;if(s.recording){if(s.tape.length<s.limit)s.tape.push(s.player);else s.message='The recording is full. Rewind to meet your echo.';}s.won=!s.recording&&s.player===s.goal;}return s;}
  };

  const shadowPlans=[{n:9,holes:[2,3,4],shapes:[3]},{n:10,holes:[1,2,5,6],shapes:[2,2]},{n:12,holes:[2,3,4,7,8],shapes:[3,2]},{n:12,holes:[1,2,4,5,8,9],shapes:[2,2,2]},{n:13,holes:[2,3,4,6,7,10],shapes:[3,2,1]},{n:13,holes:[1,2,5,6,7,10,11],shapes:[2,3,2]},{n:14,holes:[2,3,5,6,7,10,11,12],shapes:[2,3,3]},{n:14,holes:[1,2,3,5,6,9,10,12],shapes:[3,2,2,1]}];
  function shadows(s){const cover=new Set();for(const p of s.objects)if(p.pos!==null)for(let k=0;k<p.length;k++){const x=p.pos+k*p.dir;if(x>=0&&x<s.n)cover.add(x);}return cover;}
  engines['shadow-architects']={
    create(level){const p=clone(shadowPlans[level]);return {...base(level),...p,objects:p.shapes.map((length,i)=>({length,dir:i%2?-1:1,pos:null})),selected:0,lit:[],solution:[]};},
    act(s,a){if(a.type==='select')s.selected=a.index;if(a.type==='rotate')s.objects[s.selected].dir*=-1;if(a.type==='cell'){if(s.objects.some((o,i)=>i!==s.selected&&o.pos===a.index)){s.message='An object already occupies that shelf slot.';return s;}s.objects[s.selected].pos=a.index;s.lit=[];}if(a.type==='run'){const cover=shadows(s);s.lit=[...cover];const garden=[...cover].some(x=>!s.holes.includes(x));s.won=s.holes.every(x=>cover.has(x))&&!garden;s.message=s.won?'The shadows make a perfect bridge to the little house.':garden?'A shadow covers a planted tile. Move or turn an object.':'Some gaps still need a shadow.';}return s;},shadows
  };

  // A planar axial truss solved with a stiffness matrix and a moving vertical load.
  function solveLinear(A,b){const n=b.length,M=A.map((r,i)=>r.concat(b[i]));for(let c=0;c<n;c++){let p=c;for(let r=c+1;r<n;r++)if(Math.abs(M[r][c])>Math.abs(M[p][c]))p=r;if(Math.abs(M[p][c])<1e-8)return null;[M[c],M[p]]=[M[p],M[c]];const v=M[c][c];for(let j=c;j<=n;j++)M[c][j]/=v;for(let r=0;r<n;r++)if(r!==c){const v=M[r][c];for(let j=c;j<=n;j++)M[r][j]-=v*M[c][j];}}return M.map(r=>r[n]);}
  function truss(s,loadNode){const used=new Set(s.edges.flatMap(e=>[e.a,e.b]));if(!used.has(loadNode))return{stable:false,stress:[],reason:'The load has no connected deck.'};const free=[];for(const i of used)if(!s.supports.includes(i))free.push(i*2,i*2+1);const index=new Map(free.map((d,i)=>[d,i])),K=free.map(()=>Array(free.length).fill(0)),F=free.map(()=>0);if(index.has(loadNode*2+1))F[index.get(loadNode*2+1)]=s.load;for(const e of s.edges){const a=s.nodes[e.a],b=s.nodes[e.b],dx=b.x-a.x,dy=b.y-a.y,L=Math.hypot(dx,dy),c=dx/L,t=dy/L,v=[-c,-t,c,t],d=[e.a*2,e.a*2+1,e.b*2,e.b*2+1];for(let i=0;i<4;i++)for(let j=0;j<4;j++)if(index.has(d[i])&&index.has(d[j]))K[index.get(d[i])][index.get(d[j])]+=v[i]*v[j]*100/L;}const u=solveLinear(K,F);if(!u)return{stable:false,stress:[],reason:'A loose joint can fold. Add triangles.'};const stress=s.edges.map(e=>{const a=s.nodes[e.a],b=s.nodes[e.b],dx=b.x-a.x,dy=b.y-a.y,L=Math.hypot(dx,dy),dis=d=>index.has(d)?u[index.get(d)]:0;return Math.abs(((dis(e.b*2)-dis(e.a*2))*dx/L+(dis(e.b*2+1)-dis(e.a*2+1))*dy/L)*100/L);});return{stable:stress.every(v=>v<=s.capacity),stress,displacements:u,reason:'A beam is carrying too much. Try triangles and shorter spans.'};}
  engines['bridgewrights']={
    create(level){const span=3+level%3,nodes=range(span+1).map(x=>({x,y:1})).concat(range(span).map(x=>({x:x+.5,y:0}))),edges=range(span).map(i=>({a:i,b:i+1,locked:true})),solution=[];for(let i=0;i<span;i++){solution.push({type:'beam',a:i,b:span+1+i},{type:'beam',a:i+1,b:span+1+i});if(i<span-1)solution.push({type:'beam',a:span+1+i,b:span+2+i});}return {...base(level),span,nodes,edges,supports:[0,span],load:2+Math.floor(level/3),capacity:15,budget:solution.length,selected:null,stress:[],solution};},
    act(s,a){if(a.type==='node'){if(s.selected===null)s.selected=a.index;else{const from=s.selected;s.selected=null;return engines.bridgewrights.act(s,{type:'beam',a:from,b:a.index});}}if(a.type==='beam'){if(a.a===a.b||s.edges.some(e=>(e.a===a.a&&e.b===a.b)||(e.b===a.a&&e.a===a.b)))return s;const p=s.nodes[a.a],q=s.nodes[a.b];if(Math.hypot(p.x-q.x,p.y-q.y)>1.5||s.budget<=0){s.message='Use nearby joints. Long beams need an intermediate support.';return s;}s.edges.push({a:a.a,b:a.b,locked:false});s.budget--;s.stress=[];}if(a.type==='run'){const deck=range(s.span).every(i=>s.edges.some(e=>e.a===i&&e.b===i+1||e.b===i&&e.a===i+1));const tests=range(s.span-1).map(i=>truss(s,i+1));s.won=deck&&tests.every(t=>t.stable);s.stress=s.edges.map((_,i)=>Math.max(0,...tests.map(t=>t.stress[i]||0)));s.message=s.won?'The whole caravan crossed a stable bridge!':tests.find(t=>!t.stable)?.reason||'The deck needs a continuous path.';}return s;},truss
  };

  function create(slug,level){if(!engines[slug]||!Number.isInteger(level)||level<0||level>7)throw Error('Unknown game or level');return engines[slug].create(level);}
  function validAction(slug,s,a){
    if(!a||typeof a!=='object'||Array.isArray(a))return false;
    if(engines[slug]?.valid)return engines[slug].valid(s,a);
    const int=(v,n)=>Number.isInteger(v)&&v>=0&&v<n;
    const type=a.type;
    if(type==='run')return true;
    if(type==='cell'){const size=s.w*s.h||s.cards?.length||s.n;return int(a.index,size);}
    if(type==='move')return int(a.dir,4)&&['cloud-shepherd','the-borrowed-minute'].includes(slug);
    if(type==='select')return slug==='orchard-guardians'?['bell','snack'].includes(a.kind):int(a.index,s.pieces?.length||s.objects?.length||2);
    if(type==='shift')return ['row','col'].includes(a.axis)&&int(a.index,s.w)&&[-1,1].includes(a.amount);
    if(type==='swap')return int(a.a,s.w*s.h)&&int(a.b,s.w*s.h);
    if(type==='rug')return int(a.index,s.rugs?.length||0);
    if(type==='place')return int(a.piece,s.pieces?.length||0)&&int(a.x,s.w)&&int(a.y,s.h)&&(a.rotation===undefined||int(a.rotation,4));
    if(type==='fold')return ['x','y'].includes(a.axis)&&int(a.k,a.axis==='x'?s.w:s.h)&&a.k>0&&['low','high'].includes(a.side);
    if(type==='build')return int(a.pos,35)&&['bell','snack'].includes(a.kind);
    if(type==='lane')return int(a.index,2);
    if(type==='role')return ['shield','tinker','scout'].includes(a.role);
    if(type==='node')return int(a.index,s.nodes?.length||0);
    if(type==='beam')return int(a.a,s.nodes?.length||0)&&int(a.b,s.nodes?.length||0);
    return ['rotate','split','clear','submit','hint','transform','rewind','wait','step'].includes(type);
  }
  function act(slug,state,action){const s=clone(state);if(s.won||!validAction(slug,s,action))return s;engines[slug].act(s,action);s.moves++;return s;}
  function checksum(s){let h=2166136261;for(const c of s)h=Math.imul(h^c.charCodeAt(0),16777619);return(h>>>0).toString(36).toUpperCase();}
  function encode(slug,mask){if(!engines[slug]||!Number.isInteger(mask)||mask<0||mask>255)throw Error('Invalid progress');const p=`UG1.${slug}.${mask.toString(36)}`;return`${p}.${checksum(p)}`;}
  function decode(slug,code){if(typeof code!=='string'||code.length>150)return null;const a=code.trim().split('.');if(a.length!==4||a[0]!=='UG1'||a[1]!==slug||!/^[0-9a-z]{1,2}$/.test(a[2]))return null;const mask=parseInt(a[2],36);return mask<=255&&checksum(a.slice(0,3).join('.'))===a[3]?mask:null;}
  function pack(slug,mask,level,actions){const text=JSON.stringify([mask,level,actions]);const raw=typeof Buffer!=='undefined'?Buffer.from(text).toString('base64'):btoa(text);const p=`UG2.${slug}.${raw.replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}`;return`${p}.${checksum(p)}`;}
  function unpack(slug,code){try{if(typeof code!=='string'||code.length>65000)return null;const p=code.trim().split('.');if(p.length!==4||p[0]!=='UG2'||p[1]!==slug||checksum(p.slice(0,3).join('.'))!==p[3])return null;const raw=p[2].replace(/-/g,'+').replace(/_/g,'/');const [mask,level,actions]=JSON.parse(typeof Buffer!=='undefined'?Buffer.from(raw,'base64').toString():atob(raw));if(!Number.isInteger(mask)||mask<0||mask>255||!Number.isInteger(level)||level<0||level>7||!Array.isArray(actions)||actions.length>800)return null;let state=create(slug,level);for(const a of actions){if(!validAction(slug,state,a))return null;state=act(slug,state,a);}return{mask,level,actions,state};}catch(_){return null;}}
  const api={engines,create,act,clone,encode,decode,pack,unpack,validAction,directions,adjacent,range,seeded};if(typeof module!=='undefined'){module.exports=api;require('./legacy-expansion-engine.js')(api);}root.LegacyMiniEngine=api;
}(typeof window==='undefined'?globalThis:window));
