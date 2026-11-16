(function(root,factory){
  if(typeof module!=='undefined')module.exports=factory;
  else root.MiniPuddleChallenges=factory;
}(typeof window==='undefined'?globalThis:window,function(E){
  'use strict';
  const slug='puddle-engineers',G=E.engines[slug],oldAct=G.act,oldFlow=G.flow;
  const vectors=s=>s.geometry==='hex'?[[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1]]:E.directions;
  const opposite=(s,d)=>(d+vectors(s).length/2)%vectors(s).length;
  function neighbor(s,p,d){const [dx,dy]=vectors(s)[d],x=p%s.w+dx,y=Math.floor(p/s.w)+dy;return x<0||y<0||x>=s.w||y>=s.h?-1:y*s.w+x;}
  function flow(s){const seen=new Set(),q=s.ports[s.source].includes(s.inlet)?[s.source]:[];for(let k=0;k<q.length;k++){const p=q[k];if(seen.has(p))continue;seen.add(p);for(const d of s.ports[p]){const n=neighbor(s,p,d);if(n>=0&&s.ports[n].includes(opposite(s,d)))q.push(n);}}return seen;}
  function inspect(s){const water=[...flow(s)],exits=[],leaks=[];for(const p of water)for(const d of s.ports[p]){const n=neighbor(s,p,d);if(n<0){if(p===s.source&&d===s.inlet)continue;if(s.exits.some(e=>e.cell===p&&e.dir===d))exits.push(p);else leaks.push(p);}else if(!s.ports[n].includes(opposite(s,d)))leaks.push(p);}return{water,exits:[...new Set(exits)],leaks:[...new Set(leaks)]};}
  function score(s){const wet=new Set(s.water);return 100+s.pots.length*50+s.coins.filter(p=>wet.has(p)).length*25+s.gems.filter(p=>wet.has(p)).length*100;}
  G.act=function(s,a){if(s.edition!==2)return oldAct(s,a);if(a.type==='cell'){if(s.fixed.includes(a.index))return s;s.ports[a.index]=s.ports[a.index].map(d=>(d+1)%vectors(s).length);s.water=[];s.message='';s.score=0;}if(a.type==='run'){const result=inspect(s);s.water=result.water;const dry=s.pots.filter(p=>!s.water.includes(p)).length,badCount=s.objective&&(s.objective.kind==='min'?s.water.length>s.objective.target:s.water.length<s.objective.target);s.won=!dry&&result.exits.length>0&&!result.leaks.length&&!badCount;s.score=s.won?score(s):0;if(s.won){const key=s._generated.number+':'+s._generated.difficulty,previous=s.rewards.find(r=>r.key===key);if(previous){s.totalScore+=Math.max(0,s.score-previous.points);previous.points=Math.max(previous.points,s.score);}else{s.totalScore+=s.score;s.rewards.push({key,points:s.score});if(s.rewards.length>100)s.rewards.shift();}}s.message=s.won?`Every flower watered, water safely drained! ${s.score} points · ${s.coins.filter(p=>s.water.includes(p)).length} coins · ${s.gems.filter(p=>s.water.includes(p)).length} gems.`:!s.water.length?'Align the first gutter with the blue rain inlet.':dry?`${dry} flowers still dry. Follow the blue water.`:result.leaks.length?'Water is spilling from an open pipe. Connect every wet opening to another pipe or a marked drain.':!result.exits.length?'Reach at least one marked boundary drain.':`Try again: use ${s.objective.kind==='min'?'at most':'at least'} ${s.objective.target} wet tiles; you used ${s.water.length}.`; }return s;};
  G.flow=s=>s.edition===2?flow(s):oldFlow(s);
  G.valid=(s,a)=>a.type==='run'||a.type==='cell'&&Number.isInteger(a.index)&&a.index>=0&&a.index<s.w*s.h&&!(s.edition===2&&s.fixed.includes(a.index));
  function generate(number,difficulty){
    number=E.procedural.canonical(number);if(!Number.isInteger(difficulty)||difficulty<0||difficulty>7)throw Error('Choose a supported difficulty.');
    const stage=Number(BigInt(number)>12n?11n:BigInt(number)-1n),growth=Math.min(2,Math.floor(stage/3)),tier=difficulty<2?0:difficulty<6?1:difficulty===6?2:3;
    let hash=2166136261;for(const ch of `puddle-2:${number}:${difficulty}`)hash=Math.imul(hash^ch.charCodeAt(0),16777619);const rng=E.seeded(hash),pick=a=>a[Math.floor(rng()*a.length)],shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
    const hex=tier===3||tier===2&&stage>=3,w=Math.min(7,3+tier+growth),h=Math.max(3,w-(stage%3===1?1:0));
    for(let attempt=0;attempt<80;attempt++){
      const s={level:difficulty,moves:0,won:false,message:'',edition:2,w,h,geometry:hex?'hex':'square',source:Math.floor(rng()*w),inlet:hex?4:0,ports:[],correct:[],pots:[],fixed:[],water:[],coins:[],gems:[],score:0,rewards:[],totalScore:0,objective:null,solution:[],_generated:{number,difficulty,version:2}};
      const dirs=E.range(vectors(s).length),boundary=p=>dirs.filter(d=>neighbor(s,p,d)<0),network=new Set([s.source]),edges=new Map([[s.source,[s.inlet]]]);
      // Build a simple boundary-to-boundary trunk, then add branches which also drain.
      function route(start,min){const seen=new Set(network),walk=[start];let budget=2500;function search(p){if(--budget<0)return false;if(walk.length>=min&&p!==s.source&&boundary(p).length)return true;for(const d of shuffle(dirs)){const n=neighbor(s,p,d);if(n<0||seen.has(n))continue;seen.add(n);walk.push(n);if(search(n))return true;walk.pop();seen.delete(n);}return false;}return search(start)?walk.slice():null;}
      function add(path){for(let j=0;j<path.length;j++){const p=path[j];network.add(p);if(!edges.has(p))edges.set(p,[]);if(j){const prev=path[j-1],d=dirs.find(d=>neighbor(s,prev,d)===p);edges.get(prev).push(d);edges.get(p).push(opposite(s,d));}}const last=path.at(-1),out=pick(boundary(last));edges.get(last).push(out);return{cell:last,dir:out};}
      const trunk=route(s.source,Math.min(w*h-1,w+tier+growth+1));if(!trunk)continue;s.exits=[add(trunk)];
      for(let b=0;b<(tier?Math.min(3,tier+Math.floor(stage/4)):0);b++){const candidates=shuffle([...network].filter(p=>p!==s.source&&edges.get(p).length<3));for(const p of candidates){const branch=route(p,3);if(branch){s.exits.push(add(branch));break;}}}
      const ordered=[...network],flowerCount=Math.min(ordered.length-2,1+tier+Math.floor(stage/2));s.pots=shuffle(ordered.filter(p=>p!==s.source)).slice(0,flowerCount);
      if(tier<2)s.fixed=[s.source,...s.exits.map(e=>e.cell)];
      // Hard boards advertise several legal drains; any used exit must face off-board.
      if(tier>=2)for(const p of shuffle(E.range(w*h).filter(p=>p!==s.source&&boundary(p).length&&!s.exits.some(e=>e.cell===p))).slice(0,3))s.exits.push({cell:p,dir:pick(boundary(p))});
      s.correct=E.range(w*h).map(p=>edges.get(p)||shuffle(dirs).slice(0,tier>=2&&rng()<.25?3:2));
      s.coins=shuffle(ordered.filter(p=>!s.pots.includes(p)&&p!==s.source)).slice(0,2+tier);
      s.gems=shuffle(ordered.filter(p=>p!==s.source&&!s.coins.includes(p)&&!s.pots.includes(p))).slice(0,1+tier); // Optional detours, never required for a win.
      if(tier>=2&&stage%3!==0)s.objective={kind:stage%3===1?'min':'max',target:network.size};
      s.ports=s.correct.map((ports,index)=>{const turns=s.fixed.includes(index)?0:1+Math.floor(rng()*(dirs.length-1));for(let k=0;k<(dirs.length-turns)%dirs.length;k++)s.solution.push({type:'cell',index});return ports.map(d=>(d+turns)%dirs.length);});s.solution.push({type:'run'});
      const proof=E.clone(s);for(const a of s.solution)G.act(proof,a);if(!proof.won)continue;
      if(inspect(s).water.length&&E.act(slug,s,{type:'run'}).won)continue;
      return s;
    }throw Error('Could not build this garden. Try another level number.');
  }
  E.puddle={generate,inspect,score,neighbor,vectors,opposite};return E.puddle;
}));
