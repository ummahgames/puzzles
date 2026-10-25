(function(root,factory){if(typeof module!=='undefined')module.exports=factory;else factory(root.MiniEngine);}(typeof window==='undefined'?globalThis:window,function(E){
  'use strict';
  const G=E.engines,R=E.range,C=E.clone,adj=E.adjacent;
  function wrap(slug,create,act,valid){const previous=G[slug];G[slug]={...previous,create:level=>create?create(previous.create(level),level):previous.create(level),act:(s,a)=>act?act(s,a,previous):previous.act(s,a)};if(valid)G[slug].valid=(s,a)=>valid(s,a)||!!previous.valid?.(s,a);}
  const cellMove=(p,d,w,h)=>{const [dx,dy]=E.directions[d],x=p%w+dx,y=Math.floor(p/w)+dy;return x<0||y<0||x>=w||y>=h?-1:y*w+x;};
  const idx=(n,max)=>Number.isInteger(n)&&n>=0&&n<max;
  // Placed pieces and beams can be edited directly, keeping experimentation cheap.
  for(const slug of ['patchwork-parade','sandcastle-helpers'])wrap(slug,null,(s,a,old)=>{
    if(a.type==='cell'){const p=s.placed.find(p=>p.cells.includes(a.index));if(p){s.placed=s.placed.filter(v=>v!==p);s.selected=p.piece;s.rotation=0;s.message='Lifted that piece. Turn it or choose a new place.';return;}}
    old.act(s,a);
  });
  wrap('gravity-suitcase',s=>s,(s,a,old)=>{if(a.type==='compress'&&s.items[0].pos===null){s.compressed=!s.compressed;s.items[0].width=s.compressed?1:2+Math.floor(s.level%4/2);return;}old.act(s,a);});
  wrap('beetle-ball',null,(s,a,old)=>{
    if(a.type!=='move'||!s.curled){old.act(s,a);return;}
    // A curled roll is two substeps, but entering the nest ends it immediately.
    const phase=s.phase,rival=s.rival;s.curled=false;old.act(s,a);if(!s.won){s.phase=phase;s.rival=rival;old.act(s,a);}s.curled=true;
  });
  wrap('suitcase-planet',null,(s,a,old)=>{if(a.type==='cell'&&(a.index===s.home||s.residents.includes(a.index))){s.selected=null;s.message='Campsites stay on dry land. Move the landscape around them.';return;}old.act(s,a);});
  wrap('who-made-that-sound',(s,level)=>{s.sequence=R(3+Math.floor(level/2)).map(i=>s.choices[(i+level)%s.choices.length]);s.solution=s.sequence.map(index=>({type:'answer',index}));return s;});
  wrap('picnic-pairs',(s,level)=>{
    if(level<2){const faces=['🍎','🧤','🌻','☕'];s.cards.forEach(card=>{card.face=faces[card.id];card.clue=['two apples','two mittens','two flowers','two cups'][card.id];});}return s;
  });
  wrap('bookworm-caravan',(s,level)=>{
    if(level<2)return s;
    const w=4,h=6,tiles=R(w*h).map(i=>'AEIOSTNR'[(i+level)%8]),routes=[];
    s.words.forEach((word,n)=>{let path=[0,1,2,3,7,6,5,4].slice(0,word.length).map(i=>i+n*8);if((level+n)%2)path=path.map(i=>Math.floor(i/w)*w+w-1-i%w);routes.push(path);path.forEach((p,i)=>tiles[p]=word[i]);});
    return{...s,w,h,tiles,routes};
  });
  // Use the actual shortest distance, not the length of a random walk, to choose
  // pantry goals. Only 240 two-item placements exist on this small shelf.
  wrap('pantry-shuffle',(s,level)=>{
    const initial=C(s),queue=[{items:C(s.items),route:[]}],seen=new Set([s.items.map(v=>v.pos).join(',')]);
    for(let k=0;k<queue.length;k++)for(let i=0;i<2;i++)for(let d=0;d<4;d++){
      const test={...C(initial),items:C(queue[k].items),selected:i};G['pantry-shuffle'].act(test,{type:'move',dir:d});const key=test.items.map(v=>v.pos).join(',');if(!seen.has(key)){seen.add(key);queue.push({items:test.items,route:queue[k].route.concat({type:'select',index:i},{type:'move',dir:d})});}
    }
    const target=queue[Math.min(queue.length-1,Math.floor((queue.length-1)*(.25+level*.09)))];s.goals=target.items.map(v=>v.pos);s.solution=target.route;return s;
  });
  wrap('bridgewrights',null,(s,a,old)=>{
    if(a.type==='beam'){const found=s.edges.findIndex(e=>!e.locked&&((e.a===a.a&&e.b===a.b)||(e.b===a.a&&e.a===a.b)));if(found>=0){s.edges.splice(found,1);s.budget++;s.stress=[];s.message='Beam lifted. Its building piece is available again.';return;}}
    if(a.type==='node'&&s.selected!==null){const from=s.selected;s.selected=null;G.bridgewrights.act(s,{type:'beam',a:from,b:a.index});return;}
    old.act(s,a);
  });
  wrap('harbor-hide-and-seek',s=>({...s,marks:[],marking:false}),(s,a,old)=>{
    if(a.type==='marking'){s.marking=!s.marking;return;}
    if(a.type==='cell'&&s.mode==='place'&&s.custom.length>=s.shipLengths.length){s.message='Both boats are ready. Hide the harbor before handing over.';return;}
    if(a.type==='cell'&&s.mode==='survey'&&s.marking){if(!s.seen.includes(a.index))s.marks=s.marks.includes(a.index)?s.marks.filter(i=>i!==a.index):s.marks.concat(a.index);return;}
    if(a.type==='custom')s.marks=[];
    old.act(s,a);
  },(s,a)=>a.type==='marking');
  // Keep the first matching lesson, then introduce smaller interleaved groups.
  wrap('match-to-mend',(s,level)=>{
    if(level===0)return s;
    const w=4,h=4+Math.floor(level/3),rng=E.seeded(1700+level);s.w=w;s.h=h;
    // Every row is made of pairs: clearing a whole material never strands a
    // singleton, while the varying pair order creates falling and merging.
    s.tiles=R(h).flatMap(y=>{const a=(y+level)%3,b=(a+1+Math.floor(rng()*2))%3;return[a,a,b,b];});
    s.needed=[0,1,2].map(kind=>s.tiles.filter(v=>v===kind).length);return s;
  });
  const orchardPaths=[
    [14,15,16,17,18,19,20],[20,19,18,17,16,15,14],
    [7,8,9,16,23,24,25,26,27],[0,7,14,15,16,17,10,3],
    [28,21,14,15,16,9,2,3,4],[6,13,20,19,18,25,32,31,30],
    [0,1,2,9,16,23,30,31,32,33,34],[28,29,30,23,16,17,18,11,4,5,6]
  ];
  function orchardTick(s){
    s.towers.forEach(t=>t.cooldown=Math.max(0,t.cooldown-1));
    const count=2+s.wave;
    if(s.tick<count*3&&s.tick%3===0)s.visitors.push({step:0,happy:0,clock:0,speed:2+(s.wave%2),home:false,preference:s.level<2?'either':(s.tick/3+s.wave+s.level)%2?'bell':'snack'});
    for(const v of s.visitors){if(v.home)continue;const pos=s.path[Math.min(v.step,s.path.length-1)];for(const t of s.towers){if(!t.cooldown&&(v.preference==='either'||v.preference===t.kind)&&Math.abs(t.pos%7-pos%7)+Math.abs(Math.floor(t.pos/7)-Math.floor(pos/7))<=t.range){v.happy+=t.kind==='snack'?2:1;t.cooldown=2;}}if(v.happy>=3){v.home=true;s.helped++;continue;}if(++v.clock>=v.speed){v.clock=0;if(++v.step>=s.path.length){v.home=true;s.lost++;}}}
    s.tick++;if(s.tick>=count*3&&s.visitors.every(v=>v.home)){s.running=false;s.wave++;if(s.wave>s.waves){s.finished=true;s.won=s.lost<=s.allowance;s.message=s.won?'The harvest is safe. Every visitor found a welcome.':'A few visitors missed their favorite stop. Undo or adjust your plan.';}else s.message='At camp: lift or add posts before the next visitors arrive.';}
  }
  wrap('orchard-guardians',(s,level)=>({...s,path:orchardPaths[level],budget:10+Math.floor(level/2),waves:2+Math.floor(level/3),solution:[]}), (s,a)=>{
    if(s.running){if(a.type==='step')orchardTick(s);return;}if(s.finished)return;
    if(a.type==='select')s.selected=a.kind;
    if(a.type==='cell'||a.type==='build'){const pos=a.index??a.pos,found=s.towers.findIndex(t=>t.pos===pos);if(found>=0){const [t]=s.towers.splice(found,1);s.budget+=t.kind==='snack'?3:1;s.message='Post lifted and its pieces returned.';return;}const kind=a.kind||s.selected,cost=kind==='snack'?3:1;if(s.path.includes(pos)||s.budget<cost){s.message=s.path.includes(pos)?'Keep the visitor path clear.':'Not enough pieces. Lift a post to try a new plan.';return;}s.towers.push({pos,kind,range:kind==='snack'?1:2,cooldown:0});s.budget-=cost;}
    if(a.type==='run'){s.running=true;s.tick=0;s.visitors=[];s.towers.forEach(t=>t.cooldown=0);s.message=s.level<2?'Welcome the visitors.':'Some visitors prefer bells, others prefer snacks. Watch their symbols.';}
  });
  // Weather has distinct counters. Repairs are limited to one point per leg;
  // later storms cannot be covered by the original static three-piece setup.
  wrap('the-moving-castle',(s,level)=>{
    s.events=R(4+Math.floor(level/2)).map((_,i)=>({side:(i+level)%2,kind:['rain','gale','fog'][(i+level)%3],force:level<2?3:4+Math.floor(level/3)}));s.health=s.maxHealth=level<2?9:6;s.solution=[];
    const fit={rain:'ward',gale:'shield',fog:'scout'};
    const slots=Array(5).fill(null);
    for(const e of s.events){const desired=Array(5).fill(null),front=e.side===0?0:3;desired[front]=fit[e.kind];desired[front+1]=fit[e.kind];desired[2]='repair';for(let i=0;i<5;i++)if(slots[i]!==desired[i]){if(slots[i])s.solution.push({type:'cell',index:i});if(desired[i])s.solution.push({type:'equip',index:i,item:desired[i]});slots[i]=desired[i];}s.solution.push({type:'run'});}return s;
  },(s,a,old)=>{
    if(a.type!=='run'){old.act(s,a);return;}if(s.health<=0||s.leg>=s.events.length){s.message='The castle is resting. Undo to adjust the last camp.';return;}
    const e=s.events[s.leg],side=e.side===0?[0,1]:[3,4],counter={rain:'ward',gale:'shield',fog:'scout'}[e.kind],protection=side.filter(i=>s.slots[i]===counter).length*3,repair=s.slots.includes('repair')?1:0,damage=Math.max(0,e.force-protection);
    s.health=Math.min(s.maxHealth,s.health-damage+repair);s.log.push(`${e.kind} from ${e.side===0?'front':'rear'}: ${damage} wear, ${repair} repaired.`);s.log=s.log.slice(-12);s.leg++;s.won=s.health>0&&s.leg===s.events.length;s.message=s.won?'The castle reached its quiet harbor.':s.health<=0?'A sheltered stop is needed. Undo and change the fittings.':'At camp: check the next forecast and refit before setting off.';
  });
  // Teach teamwork with role-specific destinations in the later missions.
  for(const slug of ['bannerfield','garden-guilds'])wrap(slug,(s,level)=>({...s,contributors:[],limit:s.limit+24}), (s,a,old)=>{
    const before=s.turn;old.act(s,a);if(s.turn===before)return;
    const objectives=slug==='bannerfield'?s.flags:s.sun,visited=slug==='bannerfield'?'captured':'claimed';
    if(s.level>=2||s.teamwork){
      s[visited]=s[visited].filter(p=>s.contributors.includes(objectives.indexOf(p)));
      objectives.forEach((p,i)=>{const unit=i%s.units.length;if(s.units[unit].pos===p){if(!s[visited].includes(p))s[visited].push(p);if(!s.contributors.includes(i))s.contributors.push(i);}});
      s.won=s[visited].length===objectives.length;s.message=s.won?'Every teammate has brought their part of the garden to life.':`${s[visited].length}/${objectives.length} destinations visited by their matching teammate; ${s.limit-s.turn} turns left.`;
    }
  });
  wrap('lantern-company',s=>({...s,guarding:false,rescuedBy:[]}),(s,a,old)=>{
    if(a.type==='guard'){s.guarding=true;s.message='Sami watches the patrol. The next encounter costs no energy.';return;}
    if(a.type==='handoff'){
      if(s.carrying!==null&&s.selected!==s.carrying&&adj(s.units[s.carrying].pos,s.units[s.selected].pos,5)){s.carrying=s.selected;if(!s.rescuedBy.includes(s.selected))s.rescuedBy.push(s.selected);s.won=s.units[s.selected].pos===s.home&&(!s.teamwork&&s.level<4||s.selected===1&&s.rescuedBy.includes(0));s.message=s.won?'The traveler is safely home. The company rests.':'The traveler joins '+s.units[s.selected].name+'. Return to camp.';}else s.message='Bring the next escort beside the traveler, select that escort, then hand over.';return;
    }
    const energies=s.units.map(v=>v.energy);old.act(s,a);
    if(s.carrying!==null&&!s.rescuedBy.includes(s.carrying))s.rescuedBy.push(s.carrying);
    if(s.guarding&&s.units.some((u,i)=>u.energy<energies[i])){s.units.forEach((u,i)=>u.energy=energies[i]);s.guarding=false;}
    s.units[0].range=s.units[0].energy<=2?1:2;
    if(s.level>=4||s.teamwork){s.won=s.carrying===1&&s.rescuedBy.includes(0)&&s.units[1].pos===s.home;if(!s.won&&s.carrying!==null)s.message='Nura finds the traveler; hand over to Sami beside her, then bring Sami to camp.';}
  },(s,a)=>['guard','handoff'].includes(a.type));
  // Rivals answer the acting companion, making shields, roots and switching
  // useful. Elemental resistance prevents one repeated move solving everything.
  wrap('companions-of-the-grove',null,(s,a,old)=>{
    if(!['target','run'].includes(a.type)){old.act(s,a);return;}
    const hero=s.friends[s.selected],target=s.rivals[a.index??s.rivals.findIndex(v=>v.hp>0)];if(hero.hp<=0||!target||target.hp<=0){s.message='Choose an awake friend and rival.';return;}
    const beats=(a,b)=>a==='wind'&&b==='leaf'||a==='leaf'&&b==='stone'||a==='stone'&&b==='wind';
    if(s.move==='bloom')hero.hp=Math.min(hero.max,hero.hp+4);
    else if(s.move==='shell')hero.guard=3;
    else{const damage=s.move==='root'?2:beats(hero.type,target.type)?4:beats(target.type,hero.type)?1:3;target.hp=Math.max(0,target.hp-damage);if(s.move==='root')target.stun=1;}
    s.turn++;s.won=s.rivals.every(v=>v.hp<=0);s.log.push(`${hero.name}: ${s.move} → ${target.name}.`);s.log=s.log.slice(-12);if(s.won){s.message='Both teams bow. The grove is peaceful.';return;}
    const rival=s.rivals.find(v=>v.hp>0);if(rival.stun){rival.stun--;s.message='Roots delay the rival. Plan the next turn.';return;}
    const damage=beats(rival.type,hero.type)?4:2;hero.hp=Math.max(0,hero.hp-Math.max(0,damage-hero.guard));hero.guard=0;s.message=s.friends.every(v=>v.hp<=0)?'Everyone is resting. Undo to try a different combination.':`Next: ${rival.name} answers the acting friend with ${damage} energy of gentle pressure. A shield blocks 3.`;
  });
  // The post office has one execution function for full-run and single-step.
  wrap('pocket-post-office',s=>({...s,pc:0,executing:false}),(s,a,old)=>{
    if(a.type==='remove'&&idx(a.index,s.program.length)){s.program.splice(a.index,1);s.executing=false;s.pc=0;return;}
    if(a.type==='command'||a.type==='clear'){old.act(s,a);s.executing=false;s.pc=0;return;}
    if(!['step','run'].includes(a.type))return;
    if(!s.executing||a.type==='run'){s.cart=s.start;s.facing=0;s.carrying=false;s.trace=[s.cart];s.pc=0;s.executing=true;}
    const count=a.type==='step'?1:s.program.length;
    for(let i=0;i<count&&s.pc<s.program.length;i++){
      const c=s.program[s.pc++];if(c==='left')s.facing=(s.facing+3)%4;if(c==='right')s.facing=(s.facing+1)%4;
      if(c==='forward'){const n=cellMove(s.cart,s.facing,s.w,s.h);if(n<0||s.blocks.includes(n)){s.message=`Instruction ${s.pc} meets a wall. Remove or change it, then run again.`;s.executing=false;return;}s.cart=n;s.trace.push(n);}
      if(c==='pick'&&s.cart===s.parcel)s.carrying=true;
      if(c==='deliver'&&s.cart===s.destination&&s.carrying){s.won=true;s.message='The parcel is delivered. Well programmed!';return;}
    }
    s.message=s.pc===s.program.length?'Program finished. Check the pickup and delivery instructions.':`Next instruction: ${s.pc+1}.`;if(s.pc===s.program.length)s.executing=false;
  },(s,a)=>a.type==='step'||a.type==='remove'&&idx(a.index,s.program.length));
  wrap('the-honest-the-mistaken-and-the-mixed-up',(s)=>{
    const a=s.answer,threshold=a<2?2:1,decoy=R(s.w).find(i=>i!==a&&i%2!==a%2&&idx(i-s.direction,s.w));
    s.statements=[{speaker:'The honest gardener',text:`The house number is ${a%2?'even':'odd'}.`},{speaker:'The mistaken guide',text:`It is ${a<2?'right':'left'} of house ${threshold+1}. I always swap left and right!`},{speaker:'The mixed-up postkeeper',text:`Yesterday it was at either house ${a-s.direction+1} or house ${decoy-s.direction+1}. It moved one house ${s.direction>0?'right':'left'} overnight.`}];
    s.solution=[{type:'cell',index:a},{type:'run'}];return s;
  });
  wrap('folded-worlds',(original,level)=>{
    if(level<4)return original;
    const w=6+level%2,h=6,actions=[{type:'fold',axis:'x',k:2,side:'low'},{type:'fold',axis:'y',k:2,side:'low'},{type:'fold',axis:'x',k:5,side:'high'}];
    const temp={...original,w,h,stacks:{}};for(let y=0;y<h;y++)for(let x=0;x<w;x++)temp.stacks[`${x},${y}`]=[{pass:true,start:false,goal:false,origin:`${x},${y}`}];
    actions.forEach(a=>G['folded-worlds'].act(temp,a));const tops=Object.entries(temp.stacks).map(([pos,stack])=>({pos,origin:stack.at(-1).origin})),pass=new Set(tops.map(t=>t.origin));
    for(const start of tops)for(const goal of tops){if(start===goal)continue;const state={...original,w,h,stacks:{},route:[],solution:actions};for(let y=0;y<h;y++)for(let x=0;x<w;x++){const key=`${x},${y}`;state.stacks[key]=[{pass:pass.has(key),start:key===start.origin,goal:key===goal.origin}];}
      let test=C(state);if(G['folded-worlds'].route(test).length)continue;let early=false;for(let i=0;i<actions.length;i++){G['folded-worlds'].act(test,actions[i]);if(i<actions.length-1&&G['folded-worlds'].route(test).length)early=true;}if(!early&&G['folded-worlds'].route(test).length){if(level%4>=2){const stacks={};for(const [key,v]of Object.entries(state.stacks)){const [x,y]=key.split(',');stacks[`${y},${x}`]=v;}state.stacks=stacks;[state.w,state.h]=[state.h,state.w];state.solution=actions.map(a=>({...a,axis:a.axis==='x'?'y':'x'}));}return state;}
    }
    return original;
  });
  // Nectar assigned to a fairy cannot be stolen by another resident. Purchases
  // remain visible even in manual stepping mode.
  wrap('stardust-sanctuary',s=>s,(s,a,old)=>{
    if(a.type==='feed'){const f=s.fairies[a.index??s.selected];if(s.nectar<1||s.food.length>=10){old.act(s,a);return;}s.food.push({x:f.x,y:f.y,life:6,target:f.id});s.nectar--;return;}
    if(a.type==='offer'){old.act(s,a);if(s.food.length)s.food.at(-1).target=null;return;}
    if(a.type==='step'){
      const assigned=s.food.filter(v=>v.target!==null&&v.target!==undefined),free=s.food.filter(v=>v.target===null||v.target===undefined);
      // Assigned meals are consumed directly before the ordinary garden step.
      for(const food of assigned){const f=s.fairies.find(v=>v.id===food.target);if(!f)continue;f.hunger=Math.min(12,f.hunger+(s.upgraded?7:5));f.growth++;f.adult=f.growth>=2;f.sleeping=false;}
      s.food=free;old.act(s,a);s.fairies.forEach(f=>f.sleeping=f.hunger===0);return;
    }
    const previousResidents=s.fairies.length;old.act(s,a);
    if(s.fairies.length>previousResidents){const i=s.fairies.length-1,f=s.fairies[i];f.x=90+(i%4)*140;f.y=90+Math.floor(i/4)*130;}
    if(['gather','collect'].includes(a.type)){s.won=s.stardust>=s.goal&&s.fairies.filter(f=>f.adult).length>=s.adults;if(s.won)s.message='The moonflower opens. Your fairies settle into a sparkling night.';}
  });
  function repairTap(s,index){
    const cells=s.mode==='weave'?R(s.w*s.h).filter(i=>Math.floor(i/s.w)===Math.floor(index/s.w)||i%s.w===index%s.w):s.mode==='clock'?[index,(index+1)%(s.w*s.h)]:[index];
    cells.forEach(i=>s.tiles[i]=(s.tiles[i]+1)%(s.mode==='weave'?2:3));
  }
  wrap('the-traveling-repair-shop',(s,level)=>{
    if(s.mode==='music')return s;
    s.tiles=R(s.w*s.h).map(()=>0);const rng=E.seeded(4000+level),solution=R(3+level).map(()=>({type:'cell',index:Math.floor(rng()*s.tiles.length)}));solution.forEach(a=>repairTap(s,a.index));s.target=s.tiles.slice();s.tiles.fill(0);s.solution=solution.concat({type:'run'});return s;
  },(s,a,old)=>{if(a.type==='cell')repairTap(s,a.index);else old.act(s,a);});
  wrap('the-neighborhood-feast',(s,level)=>{
    if(level<4)return s;
    // Flexible guests accept one of two staples plus fruit. Exact guests still
    // need their own foods, making the shared supply a planning constraint.
    s.guests[0].flexible=true;s.guests[0].wishes=[0,2];s.supply=[0,0,0];s.guests.forEach(g=>g.wishes.forEach(i=>s.supply[i]++));s.supply[1]++;
    s.solution=s.guests.flatMap((g,index)=>[{type:'select',index},...g.wishes.map(index=>({type:'ingredient',index}))]).concat({type:'run'});return s;
  },(s,a,old)=>{if(a.type==='return'){const g=s.guests[s.selected];if(g.plate[a.index]>0){g.plate[a.index]--;s.supply[a.index]++;}return;}if(a.type==='run'){s.won=s.guests.every(g=>g.plate.reduce((a,b)=>a+b,0)===g.wishes.length&&(g.flexible?g.plate[2]>=1&&g.plate[0]+g.plate[1]>=1:g.wishes.every(i=>g.plate[i]>=1)));s.message=s.won?'Everyone has a welcoming plate. The feast begins.':'Check each wish; the flexible guest accepts rice or beans with fruit.';return;}old.act(s,a);},(s,a)=>a.type==='return'&&idx(a.index,3));
  function carefulBalance(s){const total=s.load.reduce((n,c)=>n+c.weight,0)||1,center=s.load.reduce((n,c)=>n+(c.col-1)*c.weight,0)/total,height=Math.max(1,...R(3).map(col=>s.load.filter(c=>c.col===col).length));return Math.abs(center+s.road[s.leg]*height*.25)<=(s.level<2?1:.7);}
  wrap('wobble-wagon',null,(s,a,old)=>{
    if(a.type==='cell'&&s.phase==='pack'&&s.load.some(v=>v.id===s.selected)){s.load=s.load.filter(v=>v.id!==s.selected);s.message='Crate lifted. Choose its new column.';return;}
    if(a.type==='drive'&&s.phase==='drive'){if(s.leg>=s.road.length)return;s.speed=1;if(!carefulBalance(s)){s.spills++;s.message='The load leans too far on this slope. Undo the departure and balance the cargo.';return;}s.leg++;s.won=s.leg===s.road.length;s.message=s.won?'Every parcel arrives safely.':'A steady crossing. The next slope is ready.';return;}old.act(s,a);
  });
  G['wobble-wagon'].balanced=carefulBalance;
  wrap('cloud-habitat',(s,level)=>{
    const transform=i=>{let x=i%5,y=Math.floor(i/5);if(level%4>=2)x=4-x;if(level>=4)y=3-y;return y*5+x;};s.paths=s.paths.map(path=>path.map(transform));s.creatures=s.paths.map((path,i)=>({start:path[0],home:path.at(-1),chime:path[Math.min(2,path.length-2)],icon:['🍃','💧','🎵'][i]}));
    s.solution=[];s.paths.forEach(path=>path.slice(0,-1).forEach((p,i)=>{const n=path[i+1],d=n===p-5?0:n===p+1?1:n===p+5?2:3;s.solution.push(...R((d-s.arrows[p]+4)%4).map(()=>({type:'cell',index:p})));}));s.solution.push({type:'run'});return s;
  });
  // Enumerated feature values must match the actual builder controls.
  const monsterValid=G['please-describe-the-monster'].valid;
  G['please-describe-the-monster'].valid=(s,a)=>a.type==='feature'?({eyes:[1,2,3],ears:[0,1,2],feet:[2,3,4],color:[0,1,2,3]}[a.feature]||[]).includes(a.value):monsterValid(s,a);
  return E;
}));
