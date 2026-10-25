(function(root,factory){
  if(typeof module!=='undefined')module.exports=factory;
  else root.MiniSpecialized=factory;
}(typeof window==='undefined'?globalThis:window,function(E,generators){
  'use strict';
  // These generators use the real reducers when searching. Keep edition-1 output
  // stable: numbered saves reconstruct their immutable missions from this file.
  const G=E.engines,C=E.clone,R=E.range;
  const distance=(a,b,w)=>Math.abs(a%w-b%w)+Math.abs(Math.floor(a/w)-Math.floor(b/w));
  const step=(p,d,w,h)=>{const [dx,dy]=E.directions[d],x=p%w+dx,y=Math.floor(p/w)+dy;return x<0||y<0||x>=w||y>=h?-1:y*w+x;};
  function search(initial,key,expand,goal,limit=4000){
    const queue=[{state:initial,parent:-1,actions:[]}],seen=new Set([key(initial)]);
    for(let head=0;head<queue.length;head++){
      const entry=queue[head];
      if(goal(entry.state)){const result=[];for(let i=head;i>0;i=queue[i].parent)result.unshift(...queue[i].actions);return result;}
      for(const [state,actions]of expand(entry.state)){
        const id=key(state);if(seen.has(id)||queue.length>=limit)continue;
        seen.add(id);queue.push({state,parent:head,actions});
      }
    }
    return null;
  }
  function replay(slug,s,actions){const state=C(s);for(const a of actions)G[slug].act(state,a);return state;}
  function route(start,goal,w,h,blocks){
    return search({pos:start},s=>s.pos,s=>R(4).flatMap(dir=>{const pos=step(s.pos,dir,w,h);return pos<0||blocks.includes(pos)?[]:[[{pos},[{type:'move',dir}]]];}),s=>s.pos===goal,w*h);
  }
  function teamCopy(s){
    const copy={...s,units:s.units.map(u=>({...u}))};
    for(const field of ['enemies','captured','claimed','contributors','shade','rescuedBy'])if(s[field])copy[field]=s[field].map(v=>typeof v==='object'?{...v}:v);
    return copy;
  }
  function patrolPeriod(s){return s.enemies.reduce((n,e)=>n*e.route.length,1);}
  function teamKey(s){return[s.units.map(u=>[u.pos,u.energy,u.range]),s.enemies.map(e=>e.pos),s.turn%patrolPeriod(s),s.captured||s.claimed,s.contributors,s.carrying,s.rescuedBy].join('|');}
  function teamRoute(slug,s,index,goal,limit=2500){
    return search(s,teamKey,current=>{
      if(current.turn>=current.limit)return[];
      const actions=G[slug].moves(current,index).map(pos=>[{type:'select',index},{type:'cell',index:pos}]);
      actions.push([{type:'wait'}]);
      return actions.map(plan=>{const next=teamCopy(current);for(const a of plan)G[slug].act(next,a);return[next,plan];});
    },goal,limit);
  }
  function patrol(c,forbidden){
    const candidates=[];
    for(let y=0;y<4;y++)for(let x=0;x<4;x++){
      const square=[y*5+x,y*5+x+1,(y+1)*5+x+1,(y+1)*5+x];
      if(!square.some(p=>forbidden.includes(p)))candidates.push(square);
    }
    if(!candidates.length)return[];
    let p=c.pick(candidates);if(c.rng()<.5)p=p.slice().reverse();const offset=c.integer(0,3);p=p.slice(offset).concat(p.slice(0,offset));return[{pos:p[0],route:p}];
  }
  function teamMission(slug,s,c){
    const garden=slug==='garden-guilds',count=garden?3:2;
    for(let attempt=0;attempt<17;attempt++){
      const candidate=C(s);candidate.teamwork=true;candidate.limit=64;
      candidate.units.forEach((u,i)=>{u.pos=c.shuffle(R(10).map(n=>n+15)).find(p=>!candidate.units.slice(0,i).some(v=>v.pos===p));});
      if(attempt===16)candidate.units.forEach((u,i)=>u.pos=[20,24,22][i]);
      const starts=candidate.units.map(u=>u.pos),goals=attempt===16?(garden?[0,2,4]:[0,4]):c.shuffle(R(15)).slice(0,count);
      candidate[garden?'sun':'flags']=goals;candidate.enemies=patrol(c,starts.concat(goals));
      const reserved=starts.concat(goals,candidate.enemies.flatMap(e=>e.route));
      candidate.blocks=attempt===16?[]:c.shuffle(R(25).filter(p=>!reserved.includes(p))).slice(0,1+Math.floor(c.difficulty/2));
      if(attempt===16)candidate.enemies=[];
      let current=C(candidate),solution=[];
      for(let index=0;index<count;index++){
        const plan=teamRoute(slug,current,index,state=>(state.captured||state.claimed).includes(goals[index])&&state.contributors.includes(index));
        if(!plan){solution=null;break;}solution.push(...plan);current=replay(slug,current,plan);
      }
      if(solution&&current.won){candidate.limit=current.turn+(c.difficulty<3?12:c.difficulty<6?7:3);candidate.solution=solution;return candidate;}
    }
    throw Error('Could not arrange a cooperative mission. Choose another number.');
  }
  generators.bannerfield=(s,c)=>teamMission('bannerfield',s,c);
  generators['garden-guilds']=(s,c)=>teamMission('garden-guilds',s,c);

  generators['lantern-company']=(s,c)=>{
    for(let attempt=0;attempt<17;attempt++){
      const candidate=C(s);candidate.teamwork=true;candidate.limit=64;
      const positions=c.shuffle([15,16,17,18,19,20,21,22,23,24]);
      candidate.units.forEach((u,i)=>{u.pos=positions[i];});candidate.home=c.pick([20,21,22,23,24]);candidate.rescue=c.pick(R(10));
      if(attempt===16){candidate.units.forEach((u,i)=>u.pos=[20,24,22][i]);candidate.home=20;candidate.rescue=c.pick([0,1,2,3,4]);}
      const starts=candidate.units.map(u=>u.pos);candidate.enemies=patrol(c,starts.concat(candidate.rescue));
      const reserved=starts.concat(candidate.rescue,candidate.home,candidate.enemies.flatMap(e=>e.route));
      candidate.blocks=attempt===16?[]:c.shuffle(R(25).filter(p=>!reserved.includes(p))).slice(0,1+Math.floor(c.difficulty/2));
      if(attempt===16)candidate.enemies=[];
      candidate.story='A traveler waits by the '+c.pick(['moonlit library','windmill garden','quiet bridge','hilltop orchard','cloud observatory'])+'. Nura finds the traveler; Sami brings them to the marked camp.';
      let current=C(candidate),solution=[];
      const walk=(index,goal)=>{const plan=teamRoute('lantern-company',current,index,goal);if(!plan)return false;solution.push(...plan);current=replay('lantern-company',current,plan);return true;};
      if(!walk(0,n=>n.carrying===0))continue;
      if(!walk(1,n=>E.adjacent(n.units[0].pos,n.units[1].pos,5)))continue;
      const handoff=[{type:'select',index:1},{type:'handoff'}];solution.push(...handoff);current=replay('lantern-company',current,handoff);
      if(!walk(1,n=>n.won)||!current.won)continue;
      candidate.solution=solution;delete candidate.limit;return candidate;
    }
    throw Error('Could not arrange a safe lantern handoff. Choose another number.');
  };

  function clockworkRoute(s){
    if(!s.units.filter(u=>u.team==='ally').some(u=>route(u.pos,s.goal,5,5,s.blocks)))return null;
    return search(s,n=>n.units.map(u=>u.pos+u.form[0]).join('|'),current=>{
      if(current.lost||current.won)return[];
      const options=[];
      for(let index=0;index<2;index++){
        const targets=G['clockwork-champions'].moves(current,index).slice(),enemy=current.units.find(u=>u.team==='enemy');
        if(E.adjacent(current.units[index].pos,enemy.pos,5))targets.push(enemy.pos);
        const plans=targets.map(pos=>[{type:'select',index},{type:'cell',index:pos}]);plans.push([{type:'select',index},{type:'transform'}]);
        for(const actions of plans){const next=teamCopy(current);for(const a of actions)G['clockwork-champions'].act(next,a);if(!next.lost)options.push([next,actions]);}
      }
      return options;
    },n=>n.won,5000);
  }
  generators['clockwork-champions']=(s,c)=>{
    for(let attempt=0;attempt<12;attempt++){
      const candidate=C(s);candidate.home=c.integer(20,24);candidate.goal=c.integer(0,4);
      const starts=c.shuffle([20,21,22,23,24].filter(p=>p!==candidate.home)).slice(0,2);
      candidate.units[0].pos=starts[0];candidate.units[1].pos=starts[1];candidate.units[2].pos=c.pick(R(10).map(i=>i+5));
      candidate.units[0].form=c.pick(['walker','rover']);candidate.units[1].form='walker';
      const reserved=starts.concat(candidate.home,candidate.goal,candidate.units[2].pos);
      candidate.blocks=c.shuffle(R(25).filter(p=>!reserved.includes(p))).slice(0,1+Math.floor(c.difficulty/2));
      const solution=clockworkRoute(candidate);if(solution){candidate.solution=solution;return candidate;}
    }
    // A protected side lane bounds fallback search while still varying the mission.
    const candidate=C(s);candidate.home=24;candidate.goal=c.pick([0,1,2]);candidate.units[0]={team:'ally',pos:20,form:'rover'};candidate.units[1]={team:'ally',pos:23,form:'walker'};candidate.units[2]={team:'enemy',pos:9,form:'walker'};candidate.blocks=[4,8,14,19];candidate.solution=clockworkRoute(candidate);if(!candidate.solution)throw Error('Could not solve the clockwork formation.');return candidate;
  };

  function forecastRoute(s){
    const pairs=s.actions.flatMap(a=>s.actions.map(b=>[a,b])),period=s.forecast.length/2;
    return search(s,n=>[n.player,n.rival,n.score,n.enemyScore,n.round%period].join('|'),current=>{
      if(current.round>=current.limit)return[];
      return pairs.flatMap(pair=>{const next={...current,queue:pair.slice()};G['forecast-fighters'].act(next,{type:'run'});return next.enemyScore>=s.target?[]:[[next,pair.map(skill=>({type:'order',skill})).concat({type:'run'})]];});
    },n=>n.won&&n.enemyScore<s.target,3500);
  }
  generators['forecast-fighters']=(s,c)=>{
    for(let attempt=0;attempt<16;attempt++){
      const candidate=C(s);candidate.player=c.integer(0,2);candidate.rival=c.integer(4,6);candidate.target=1+Math.floor(c.difficulty/3);candidate.limit=16;
      candidate.forecast=c.shuffle(['advance','shove','sidestep','guard','claim','guard'].concat(c.difficulty>=3?['advance','claim']:[]));
      const solution=forecastRoute(candidate);if(solution){candidate.solution=solution;candidate.limit=solution.length/3+(c.difficulty<3?6:c.difficulty<6?4:2);return candidate;}
    }
    const candidate=C(s);candidate.target=1+Math.floor(c.difficulty/3);candidate.limit=16;candidate.solution=forecastRoute(candidate);if(!candidate.solution)throw Error('Could not arrange a fair forecast.');return candidate;
  };

  function scarfRoute(candidate){return search(candidate,n=>n.people.join(',')+'|'+n.gateOpen,current=>[0,1].flatMap(index=>R(4).map(dir=>{const next={...current,people:current.people.slice()},actions=[{type:'select',index},{type:'move',dir}];for(const a of actions)G['two-ends-of-a-scarf'].act(next,a);return[next,actions];})),n=>n.won,900);}
  generators['two-ends-of-a-scarf']=(s,c)=>{
    for(let attempt=0;attempt<24;attempt++){
      const candidate=C(s),left=R(20).filter(p=>p%5<2),right=R(20).filter(p=>p%5>2);
      candidate.length=c.difficulty<3?5:c.difficulty<6?4:3;candidate.people=c.shuffle(left).slice(0,2);candidate.goals=c.shuffle(right).slice(0,2);
      if(distance(...candidate.people,5)>candidate.length||distance(...candidate.goals,5)>candidate.length)continue;
      candidate.plate=c.pick(left.filter(p=>!candidate.people.includes(p)));candidate.gate=c.integer(0,3)*5+2;candidate.gateOpen=false;
      const reserved=candidate.people.concat(candidate.goals,candidate.plate),barrier=R(4).map(y=>y*5+2).filter(p=>p!==candidate.gate);
      candidate.blocks=barrier.concat(c.shuffle(left.concat(right).filter(p=>!reserved.includes(p))).slice(0,c.difficulty>=3?1:0));
      if(c.rng()<.5){const mirror=p=>Math.floor(p/5)*5+4-p%5;candidate.people=candidate.people.map(mirror);candidate.goals=candidate.goals.map(mirror);candidate.blocks=candidate.blocks.map(mirror);candidate.plate=mirror(candidate.plate);candidate.gate=mirror(candidate.gate);}
      const solution=scarfRoute(candidate);
      if(solution){candidate.solution=solution;return candidate;}
    }
    const candidate={...C(s),people:[15,16],goals:[3,4],plate:10,gate:12,gateOpen:false,blocks:[2,7,17],length:c.difficulty<3?5:c.difficulty<6?4:3};candidate.solution=scarfRoute(candidate);if(!candidate.solution)throw Error('Could not weave a reachable scarf route.');return candidate;
  };

  function echoRoute(candidate,difficulty){
    const recording=route(candidate.start,candidate.plate,5,5,candidate.blocks.concat(candidate.gate));if(!recording?.length)return null;
    candidate.limit=recording.length+(difficulty<3?4:1);
    const recorded=replay('the-borrowed-minute',candidate,recording.concat({type:'rewind'}));
    const playback=search(recorded,n=>[n.player,Math.min(n.turn,n.tape.length)].join('|'),current=>R(5).flatMap(d=>{const actions=[d===4?{type:'wait'}:{type:'move',dir:d}],next={...current,tape:current.tape.slice()};G['the-borrowed-minute'].act(next,actions[0]);return d<4&&next.player===current.player?[]:[[next,actions]];}),n=>n.won,250);
    return !playback||difficulty>=3&&!playback.some(a=>a.type==='wait')?null:recording.concat({type:'rewind'},playback);
  }
  generators['the-borrowed-minute']=(s,c)=>{
    for(let attempt=0;attempt<24;attempt++){
      const candidate=C(s),left=R(25).filter(p=>p%5<2);candidate.start=c.pick(left.filter(p=>p>=15));candidate.player=candidate.echo=candidate.start;
      candidate.plate=c.pick(left.filter(p=>p<10));candidate.gate=c.integer(2,4)*5+2;candidate.goal=c.pick(R(25).filter(p=>p%5>2));
      const reserved=[candidate.start,candidate.plate,candidate.goal],barrier=R(5).map(y=>y*5+2).filter(p=>p!==candidate.gate);
      candidate.blocks=barrier.concat(c.shuffle(R(25).filter(p=>p%5!==2&&!reserved.includes(p))).slice(0,c.difficulty>=3?1:0));
      const solution=echoRoute(candidate,c.difficulty);if(solution){candidate.solution=solution;return candidate;}
    }
    const candidate={...C(s),start:20,player:20,echo:20,plate:c.difficulty>=3?1:c.pick([0,1]),gate:22,goal:c.pick([3,4,8,9]),blocks:[2,7,12,17]};candidate.solution=echoRoute(candidate,c.difficulty);if(!candidate.solution)throw Error('Could not synchronize the echo route.');return candidate;
  };

  function ballRoute(s){
    // Reverse pushing reachability rules out seeds that can never leave a corner.
    const reachable=new Set([s.goal]),queue=[s.goal];for(let i=0;i<queue.length;i++)for(let d=0;d<4;d++){const p=step(queue[i],d,7,5),behind=p<0?-1:step(p,d,7,5);if(p>=0&&behind>=0&&!s.blocks.includes(p)&&!s.blocks.includes(behind)&&!reachable.has(p)){reachable.add(p);queue.push(p);}}
    if(!reachable.has(s.ball))return null;
    return search(s,n=>[n.players,n.ball,n.rival,n.phase%4].join('|'),current=>{
      const options=[];
      for(let index=0;index<2;index++)for(let dir=0;dir<4;dir++){
        const next={...current,players:current.players.slice()},actions=[{type:'select',index},{type:'move',dir}];for(const a of actions)G['beetle-ball'].act(next,a);if(reachable.has(next.ball)&&(next.players[index]!==current.players[index]||next.ball!==current.ball))options.push([next,actions]);
      }
      const next={...current,players:current.players.slice()};G['beetle-ball'].act(next,{type:'wait'});options.push([next,[{type:'wait'}]]);return options;
    },n=>n.won,4000);
  }
  generators['beetle-ball']=(s,c)=>{
    for(let attempt=0;attempt<12;attempt++){
      const candidate=C(s);candidate.goal=c.pick(R(35));candidate.ball=c.pick(R(21).map(i=>i+7).filter(p=>p%7>0&&p%7<6&&p!==candidate.goal&&p!==12));
      candidate.players=c.shuffle(R(35).filter(p=>p!==candidate.ball&&p!==candidate.goal&&p!==12)).slice(0,2);candidate.rival=12;candidate.phase=0;
      const reserved=candidate.players.concat(candidate.goal,candidate.ball,12,19,26);candidate.blocks=c.shuffle(R(35).filter(p=>!reserved.includes(p))).slice(0,1+Math.floor(c.difficulty/2));
      const solution=ballRoute(candidate);if(solution){candidate.solution=solution;return candidate;}
    }
    const candidate=C(s),row=c.pick([0,4]),right=c.rng()<.5,d=right?1:-1,start=row*7+(right?1:5);candidate.players=[start-d,row===0?28:0];candidate.ball=start;candidate.goal=start+d*c.integer(2,4);candidate.rival=12;candidate.phase=0;
    const lane=R(7).map(i=>row*7+i);candidate.blocks=c.shuffle(R(35).filter(p=>!lane.includes(p)&&!candidate.players.includes(p)&&![12,19,26].includes(p))).slice(0,2+Math.floor(c.difficulty/2));candidate.solution=R(distance(candidate.ball,candidate.goal,7)).flatMap(()=>[{type:'select',index:0},{type:'move',dir:right?1:3}]);return candidate;
  };

  generators['storybook-stagehands']=(s,c)=>{
    const openings=['cloth','fan','lamp'],middles=['drum','cutout','flags'],closings=['stars','lamp','flags','cloth'];
    const first=c.pick(openings),second=c.pick(middles.filter(p=>p!==first)),last=c.pick(closings.filter(p=>p!==first&&p!==second)),cues=[first,second,last],props=c.shuffle(cues),zones=c.shuffle([0,1,2]);
    const place=c.pick(['cloud harbor','moonlit orchard','woodland market','hilltop library','floating garden','little lighthouse']),mood=c.pick(['A quiet','A breezy','A sparkling','A moonlit','A cheerful','A misty']);
    const endings={stars:'festival under the stars',lamp:'lantern welcome',flags:'neighborhood parade',cloth:'curtain call'};
    const beats={cloth:'Unfold the scenery for the waiting friends.',fan:'Send a gentle breeze through the scene.',lamp:'Light a warm lantern beside the path.',drum:'Call the neighbors with a soft drum rhythm.',cutout:'Bring the paper traveler onto the stage.',flags:'Raise the welcoming festival banners.',stars:'Let the stars appear above the gathering.'};
    s.scene={name:mood+' '+endings[last],props,zones,cues,story:'At the '+place+', the friends prepare a '+endings[last]+'. Follow the three story beats in order.',beats:cues.map(prop=>({prop,text:beats[prop]}))};
    s.solution=props.flatMap((item,i)=>[{type:'item',item},{type:'cell',index:zones[i]}]).concat(cues.map(skill=>({type:'order',skill})),{type:'run'});return s;
  };

  generators['folded-worlds']=(s,c)=>{
    for(let attempt=0;attempt<64;attempt++){
      const w=c.integer(6,8),h=c.integer(6,8),count=c.difficulty<3?2:c.difficulty<6?3:4,temp={...C(s),w,h,stacks:{},solution:[]};
      for(let y=0;y<h;y++)for(let x=0;x<w;x++)temp.stacks[x+','+y]=[{pass:true,start:false,goal:false,origin:x+','+y}];
      const faces=c.shuffle([{axis:'x',side:'low'},{axis:'x',side:'high'},{axis:'y',side:'low'},{axis:'y',side:'high'}]).slice(0,count),folds=[];
      for(const face of faces){const values=Object.keys(temp.stacks).map(key=>Number(key.split(',')[face.axis==='x'?0:1])),min=Math.min(...values),max=Math.max(...values),width=max-min+1,strip=c.integer(1,Math.min(2,Math.floor((width-1)/2))),k=face.side==='low'?min+strip:max-strip+1,action={type:'fold',...face,k};folds.push(action);G['folded-worlds'].act(temp,action);}
      const keys=Object.keys(temp.stacks),xs=keys.map(k=>+k.split(',')[0]),ys=keys.map(k=>+k.split(',')[1]),xmin=Math.min(...xs),xmax=Math.max(...xs),ymin=Math.min(...ys),ymax=Math.max(...ys),reverseX=c.rng()<.5,reverseY=c.rng()<.5;
      let x=reverseX?xmax:xmin,y=reverseY?ymax:ymin;const goalX=reverseX?xmin:xmax,goalY=reverseY?ymin:ymax,path=[x+','+y];
      while(x!==goalX||y!==goalY){if(x!==goalX&&(y===goalY||c.rng()<.5))x+=reverseX?-1:1;else y+=reverseY?-1:1;path.push(x+','+y);}
      const origins=path.map(p=>temp.stacks[p].at(-1).origin),pass=new Set(origins),candidate={...C(s),w,h,stacks:{},route:[]};
      for(let row=0;row<h;row++)for(let col=0;col<w;col++){const key=col+','+row;candidate.stacks[key]=[{pass:pass.has(key),start:key===origins[0],goal:key===origins.at(-1)}];}
      let current=C(candidate),early=G['folded-worlds'].route(current).length>0;
      for(let i=0;i<folds.length;i++){G['folded-worlds'].act(current,folds[i]);if(i<folds.length-1&&G['folded-worlds'].route(current).length)early=true;}
      if(early||!G['folded-worlds'].route(current).length)continue;
      if(folds.some((_,omit)=>{let test=C(candidate);folds.forEach((a,i)=>{if(i!==omit)G['folded-worlds'].act(test,a);});return G['folded-worlds'].route(test).length>0;}))continue;
      candidate.solution=folds.concat({type:'run'});return candidate;
    }
    // Keep seams separated so later folds do not hide an earlier fold's effect.
    const count=c.difficulty<3?2:c.difficulty<6?3:4,folds=[{type:'fold',axis:'x',k:1,side:'low'},{type:'fold',axis:'y',k:1,side:'low'},{type:'fold',axis:'x',k:7,side:'high'},{type:'fold',axis:'y',k:7,side:'high'}].slice(0,count),temp={...C(s),w:8,h:8,stacks:{}};
    for(let y=0;y<8;y++)for(let x=0;x<8;x++)temp.stacks[x+','+y]=[{pass:true,start:false,goal:false,origin:x+','+y}];
    folds.forEach(a=>G['folded-worlds'].act(temp,a));
    const positions=['1,3','2,3','3,3','3,2','3,1'];
    if(count>=3)positions.push('4,1','5,1','6,1','6,2','6,3','6,4');
    if(count>=4)positions.push('5,4','4,4','4,5','4,6');
    const origins=positions.map(p=>temp.stacks[p].at(-1).origin),pass=new Set(origins),candidate={...C(s),w:8,h:8,stacks:{},route:[],solution:folds.concat({type:'run'})};
    for(let y=0;y<8;y++)for(let x=0;x<8;x++){const key=x+','+y;candidate.stacks[key]=[{pass:pass.has(key),start:key===origins[0],goal:key===origins.at(-1)}];}
    return candidate;
  };
  return generators;
}));
