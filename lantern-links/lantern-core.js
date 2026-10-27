/* Lantern Links: constructive, bounded garden generation and input rules. */
(function(root){'use strict';
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const presets={
    easy:{label:'Easy',size:2,pairs:1,maxSize:3,pairGrowth:0,bendRatio:.2},
    medium:{label:'Medium',size:3,pairs:2,maxSize:4,pairGrowth:1,bendRatio:.4},
    hard:{label:'Hard',size:4,pairs:3,maxSize:5,pairGrowth:1,bendRatio:.6},
    expert:{label:'Expert',size:5,pairs:5,maxSize:9,pairGrowth:1,bendRatio:.8}
  };
  const legacyDifficulty={gentle:'easy',thoughtful:'medium',tricky:'hard'};
  function preferences(raw={}){
    const difficulty=Object.hasOwn(presets,raw.difficulty)?raw.difficulty:(Object.hasOwn(legacyDifficulty,raw.difficulty)?legacyDifficulty[raw.difficulty]:'easy');
    return {difficulty,size:Number.isInteger(+raw.size)?+raw.size===0?0:clamp(+raw.size,2,9):0,pairs:Number.isInteger(+raw.pairs)?+raw.pairs===0?0:clamp(+raw.pairs,1,9):0,level:Number.isSafeInteger(+raw.level)?clamp(+raw.level,1,999999):1};
  }
  function settings(raw){
    const p=preferences(raw),preset=presets[p.difficulty],growth=Math.min(preset.maxSize-preset.size,Math.floor((p.level-1)/4)),size=p.size||preset.size+growth,pairs=Math.min(p.pairs||preset.pairs+Math.max(0,size-preset.size)*preset.pairGrowth,Math.floor(size*size/3));
    return {...p,size,pairs};
  }
  function random(seed){let n=2166136261;for(const c of String(seed))n=Math.imul(n^c.charCodeAt(0),16777619);return()=>{n+=0x6D2B79F5;let t=n;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
  const adjacent=(a,b,n)=>Number.isInteger(a)&&Number.isInteger(b)&&Math.abs(a%n-b%n)+Math.abs(Math.floor(a/n)-Math.floor(b/n))===1;
  function turns(path,n){let t=0;for(let i=2;i<path.length;i++)if(path[i]-path[i-1]!==path[i-1]-path[i-2])t++;return t;}
  function validate(board,paths=board?.solution){if(!board||!Number.isInteger(board.size)||board.size<2||board.size>9||!Array.isArray(paths)||!Array.isArray(board.pairs)||paths.length!==board.pairs.length)return false;const used=new Set();for(let k=0;k<paths.length;k++){const p=paths[k],ends=board.pairs[k];if(!Array.isArray(ends)||ends.length!==2||!Array.isArray(p)||p.length<2||!((p[0]===ends[0]&&p.at(-1)===ends[1])||(p[0]===ends[1]&&p.at(-1)===ends[0])))return false;for(let j=0;j<p.length;j++){const i=p[j];if(!Number.isInteger(i)||i<0||i>=board.size**2||used.has(i)||(j&&!adjacent(p[j-1],i,board.size)))return false;used.add(i);}}return used.size===board.size**2;}
  function generate(raw={},seed=Date.now()){
    const config=settings(raw),n=config.size,k=config.pairs,rng=random(seed);let best=null,bestScore=-Infinity;
    // Start with a Hamiltonian snake. A backbite reverses one end of the walk,
    // preserving adjacency, uniqueness, and full coverage while mixing its shape.
    for(let attempt=0;attempt<18;attempt++){
      let walk=Array.from({length:n*n},(_,i)=>Math.floor(i/n)*n+(Math.floor(i/n)%2?n-1-i%n:i%n));
      for(let m=0;m<n*n*24;m++){
        if(rng()<.5)walk.reverse();const head=walk[0],neighbors=[head-n,head+n,head-1,head+1].filter(i=>i>=0&&i<n*n&&adjacent(head,i,n)),neighbor=neighbors[Math.floor(rng()*neighbors.length)],at=walk.indexOf(neighbor);
        if(at>1)walk=walk.slice(0,at).reverse().concat(walk.slice(at));
      }
      const lengths=Array(k).fill(3);for(let remaining=n*n-3*k;remaining>0;remaining--)lengths[Math.floor(rng()*k)]++;
      let offset=0;const paths=lengths.map(length=>{const path=walk.slice(offset,offset+=length);return rng()<.5?path.reverse():path;});
      const bendCount=paths.reduce((sum,p)=>sum+turns(p,n),0),shortcuts=paths.filter(p=>adjacent(p[0],p.at(-1),n)).length;
      const target=(n*n-2*k)*presets[config.difficulty].bendRatio,score=-Math.abs(bendCount-target)-shortcuts*6;if(score>bestScore){bestScore=score;best=paths;}
    }
    const board={...config,seed:String(seed),pairs:best.map(p=>[p[0],p.at(-1)]),solution:best,turns:best.reduce((sum,p)=>sum+turns(p,n),0)};
    // This independent certificate check runs for EVERY offered board.
    if(!validate(board))throw Error('Garden solution certificate failed');return board;
  }
  function create(board){return {paths:board.pairs.map(()=>[]),active:-1,moves:0};}
  function endpoint(board,i){return board.pairs.findIndex(p=>p.includes(i));}
  function begin(board,state,i){const k=endpoint(board,i);if(k>=0){state.active=k;state.paths[k]=[i];return true;}const owner=state.paths.findIndex(p=>p.includes(i));if(owner>=0){state.active=owner;state.paths[owner]=state.paths[owner].slice(0,state.paths[owner].indexOf(i)+1);return true;}return false;}
  function step(board,state,i){const k=state.active;if(k<0||!Number.isInteger(i)||i<0||i>=board.size**2)return false;const path=state.paths[k],at=path.indexOf(i);if(at>=0){if(at===path.length-1)return false;path.splice(at+1);state.moves++;return true;}
    if(!path.length||!adjacent(path.at(-1),i,board.size))return false;
    if(path.length>1&&board.pairs[k].includes(path.at(-1)))return false;
    if(endpoint(board,i)>=0&&endpoint(board,i)!==k)return false;
    if(state.paths.some((p,j)=>j!==k&&p.includes(i)))return false;
    path.push(i);state.moves++;return true;
  }
  function progress(board,state){let connected=0;for(let k=0;k<state.paths.length;k++){const p=state.paths[k];if(p.length>1&&board.pairs[k].includes(p[0])&&board.pairs[k].includes(p.at(-1)))connected++;}const filled=new Set(state.paths.flat()).size;return {connected,filled,won:connected===board.pairs.length&&filled===board.size**2&&validate(board,state.paths)};}
  // Intersect a fast pointer segment with every crossed grid boundary. Diagonal
  // ties have a deterministic staircase order; rules still reject blocked cells.
  function trace(from,to,n){const cells=[],dx=to.x-from.x,dy=to.y-from.y;let x=Math.floor(from.x),y=Math.floor(from.y),tx=dx>0?(x+1-from.x)/dx:dx<0?(x-from.x)/dx:Infinity,ty=dy>0?(y+1-from.y)/dy:dy<0?(y-from.y)/dy:Infinity;const endX=Math.floor(to.x),endY=Math.floor(to.y);for(let steps=0;steps<n*4&&(x!==endX||y!==endY);steps++){if(tx<=ty){x+=Math.sign(dx);tx+=1/Math.abs(dx);}else{y+=Math.sign(dy);ty+=1/Math.abs(dy);}if(x<0||x>=n||y<0||y>=n)break;cells.push(y*n+x);}return cells;}
  function encode(raw){const p=preferences(raw);return 'LL3.'+[p.difficulty,p.size,p.pairs,p.level].join('.');}
  function decode(code){
    if(typeof code!=='string'||code.length>80||code.trim()!==code)return null;
    if(!/^LL3\.(easy|medium|hard|expert)\.(0|[2-9])\.(0|[1-9])\.([1-9][0-9]{0,5})$/.test(code)&&!/^LL2\.(gentle|thoughtful|tricky)\.(0|[4-9])\.(0|[3-9])\.([1-9][0-9]{0,5})$/.test(code))return null;
    const [,difficulty,size,pairs,level]=code.split('.');return preferences({difficulty,size,pairs,level});
  }
  const api={presets,preferences,settings,generate,validate,turns,adjacent,create,begin,step,progress,trace,encode,decode};if(typeof module!=='undefined')module.exports=api;root.LanternCore=api;
})(typeof window!=='undefined'?window:globalThis);
