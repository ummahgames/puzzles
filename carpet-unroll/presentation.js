(function(root){
  'use strict';
  const $=id=>document.getElementById(id),A=root.MiniArtwork,I=root.MiniIdentities;
  let session=null,drag=null,ghost=null,cloudFrame=new Map(),cloudStage=null;
  function freshNumber(){const data=new Uint32Array(1);if(root.crypto?.getRandomValues){root.crypto.getRandomValues(data);return String(data[0]+1);}return String(Date.now());}
  function menu(E,meta,controls){
    const theme=A.themes[meta.slug];if(theme){document.body.dataset.material=theme[0];document.body.style.setProperty('--world',theme[1]);document.body.style.setProperty('--accent',theme[2]);document.body.style.setProperty('--world-ink',theme[3]);$('menuArt').innerHTML=A.scene(meta.slug);}
    $('number').textContent=theme?.[4]||'Ready when you are';$('begin').textContent='Start playing →';$('menuHelp').onclick=()=>$('help').click();$('menuSettings').onclick=()=>$('settingsDialog').showModal();$('reduceMotion').checked=matchMedia('(prefers-reduced-motion: reduce)').matches;$('reduceMotion').onchange=()=>document.body.classList.toggle('reduce-motion',$('reduceMotion').checked);
    $('resume').onclick=()=>{$('home').hidden=true;$('play').hidden=false;controls.resume?.();$('playTitle').focus({preventScroll:true});};
    $('begin').onclick=()=>{const d=Number($('quickDifficulty').value);if(E.procedural?.supported.includes(meta.slug))controls.fresh(E.generate(meta.slug,freshNumber(),d,['carpet-unroll','picnic-pairs'].includes(meta.slug)?2:1));else controls.start(d);};
    if(meta.slug==='picnic-pairs'){$('advancedPlay').hidden=true;$('quickDifficulty').replaceChildren();for(const [value,label]of [[0,'Easy · 3 identical pairs'],[3,'Medium · 4 related pairs'],[7,'Hard · 6 related pairs']]){const option=document.createElement('option');option.value=String(value);option.textContent=label;$('quickDifficulty').append(option);}$('quickDifficulty').value='0';$('heroDescription').textContent='Choose your difficulty, turn over the picnic cards, and find each pair. A fresh blanket every time.';}
    $('finishLevels').textContent='Game menu';
    identityMenu(meta);
    return controls;
  }
  function started(){if($('resume'))$('resume').hidden=false;}
  function makeSprite(node,name,extra=''){node.innerHTML=A.sprite(name,extra);}
  function decorate(E,slug,s,perform){
    session={E,slug,s,perform};
    const board=$('board'),tools=$('tools');
    if(s._generated){$('playTitle').textContent=A.themes[slug]?.[4]||'Your next puzzle';$('chapter').textContent=(s._generated.difficulty<2?'Easy':s._generated.difficulty<6?'Medium':'Hard')+' · '+(slug==='picnic-pairs'?'Memory game':'Fresh puzzle');}
    const caption=document.querySelector('.scene-caption');if(caption&&!caption.querySelector('.scene-vignette')){const art=document.createElement('div');art.className='scene-vignette';art.innerHTML=A.scene(slug);caption.prepend(art);}
    // Replace simple emoji tokens with consistent, original illustrated sprites.
    for(const node of board.querySelectorAll('.cell,.choice-card,.paper-cell,.guest-face')){
      const text=node.textContent.trim(),name=A.aliases[text];if(name&&!node.querySelector('svg')){node.setAttribute('aria-label',node.getAttribute('aria-label')||text);makeSprite(node,name);node.classList.add('sprite-cell');}
    }
    if(Array.isArray(s.units))board.querySelectorAll('.cell').forEach((b,i)=>{
      const unit=s.units.find(u=>u.pos===i)||s.enemies?.find(u=>u.pos===i);if(!unit)return;const name=['garden-guilds'].includes(slug)?'beetle':['clockwork-champions'].includes(slug)?'robot':'person';
      b.innerHTML=A.sprite(name)+`<small class="entity-badge">${unit.form||unit.name||unit.team||''}${unit.energy!==undefined?' · '+unit.energy:''}</small>`;b.classList.add('illustrated-unit');
    });
    if(slug==='patchwork-parade'){
      tools.classList.add('patch-tray');
      for(const b of tools.querySelectorAll('[data-action]')){
        const a=JSON.parse(b.dataset.action);if(a.type!=='select')continue;const i=a.index,placed=s.placed.some(p=>p.piece===i),shape=E.engines[slug].rotate(s.pieces[i],s.selected===i?s.rotation:0);b.dataset.patchPiece=String(i);b.classList.add('patch-piece');b.classList.toggle('piece-placed',placed);b.setAttribute('aria-label',`Patch ${i+1}, ${placed?'already placed; tap it on the board to lift':shape.length+' fabric squares; drag onto the outline or select then tap'}`);b.innerHTML=shapeSVG(shape,i)+`<span>Patch ${i+1}${placed?' ✓':''}</span>`;
      }
      board.querySelectorAll('.cell').forEach((b,i)=>{b.dataset.cellIndex=String(i);const piece=s.placed.find(p=>p.cells.includes(i));if(piece){b.dataset.patchPiece=String(piece.piece);b.textContent='';b.style.setProperty('--patch-color',palette[piece.piece%palette.length]);}});
      $('tip').textContent='Drag a fabric shape into the outline. Turn it with R or ↻.';$('lesson').textContent='Drag any square of a fabric piece to the outline. A green preview means it fits. Use Turn patch or R to rotate. Tap a placed patch to lift it. You can also select a patch, then click or keyboard-focus a square and press Enter. Fill the outline and send your animal to the parade.';
    }
    if(slug==='puddle-engineers'){
      const distance=new Map(),q=[];if(s.water.includes(s.source)){q.push(s.source);distance.set(s.source,0);}for(let j=0;j<q.length;j++){const p=q[j];for(const d of s.ports[p]){const [dx,dy]=E.directions[d],x=p%s.w+dx,y=Math.floor(p/s.w)+dy,n=y*s.w+x;if(x>=0&&x<s.w&&y>=0&&y<s.h&&s.water.includes(n)&&s.ports[n].includes((d+2)%4)&&!distance.has(n)){distance.set(n,distance.get(p)+1);q.push(n);}}}
      board.querySelectorAll('.cell').forEach((b,i)=>{b.style.setProperty('--flow-delay',(distance.get(i)||0)*150+'ms');b.classList.toggle('flowing',distance.has(i));const svg=b.querySelector('svg');const flowPath=s.ports[i].map(d=>{const [dx,dy]=E.directions[d],x=i%s.w+dx,y=Math.floor(i/s.w)+dy,upstream=i===s.source?d===0:distance.get(y*s.w+x)<distance.get(i),edge=`${40+dx*42} ${40+dy*42}`;return upstream?`M${edge}L40 40`:`M40 40L${edge}`;}).join(' ');if(svg){svg.innerHTML=`<path class="gutter-shadow" d="${s.ports[i].map(d=>`M40 40L${40+E.directions[d][0]*42} ${40+E.directions[d][1]*42}`).join(' ')}"/><path class="gutter-bed" d="${s.ports[i].map(d=>`M40 40L${40+E.directions[d][0]*42} ${40+E.directions[d][1]*42}`).join(' ')}"/>`+(distance.has(i)?`<path class="water-stream" d="${flowPath}"/><path class="water-sparkle" d="${flowPath}"/>`:'');}
        b.querySelectorAll('.marker').forEach(m=>{m.innerHTML=A.sprite(i===s.source?'cloud':'flower');if(s.pots.includes(i))m.classList.add(distance.has(i)?'bloomed':'thirsty');});
      });board.classList.toggle('raining',s.water.length>0);
    }
    if(slug==='cloud-shepherd')board.querySelectorAll('.cell').forEach((b,i)=>{const c=s.clouds.find(v=>v.pos===i),t=s.targets.find(v=>v.pos===i);if(c){b.innerHTML=A.sprite('cloud','cloud-puff')+`<strong class="puff-count">${c.mass}</strong>`;b.classList.add('cloud-occupied');}else if(s.rocks.includes(i))makeSprite(b,'mountain');else if(t)b.textContent='';if(t){const label=document.createElement('small');label.className='cloud-goal-count';label.textContent='Goal '+t.mass;b.append(label);}});
    if(slug==='cloud-shepherd'){
      const stage=s._generated?.number||s.level,newFrame=new Map();if(stage!==cloudStage||!s.moves)cloudFrame.clear();cloudStage=stage;
      board.querySelectorAll('.cloud-occupied').forEach(b=>{const index=[...board.querySelectorAll('.cell')].indexOf(b),c=s.clouds.find(c=>c.pos===index),node=b.querySelector('.cloud-puff'),rect=b.getBoundingClientRect(),old=cloudFrame.get(s.clouds.indexOf(c));if(old&&old.mass===c.mass&&node.animate&&!$('reduceMotion').checked){node.animate([{transform:`translate(${old.x-rect.x}px,${old.y-rect.y}px)`},{transform:'translate(0,0)'}],{duration:230,easing:'ease-out'});}newFrame.set(s.clouds.indexOf(c),{x:rect.x,y:rect.y,mass:c.mass});});cloudFrame=newFrame;
    }
    if(slug==='carpet-unroll'){
      board.querySelectorAll('.cell').forEach((b,i)=>{const rug=s.rugs.findIndex(r=>r.pos===i),covered=s.cover[i];if(covered!==undefined){b.classList.add('woven-tile');b.style.setProperty('--rug-color',palette[covered%palette.length]);b.textContent='';}if(rug>=0&&!s.rolled.includes(rug)){b.innerHTML=A.sprite('rug')+`<strong class="rug-label">${rug+1} ${['↑','→','↓','←'][s.rugs[rug].dir]}</strong>`;b.classList.add('rug-anchor');}if(s.blocked.includes(i)){b.textContent='';b.classList.add('room-obstacle');}});
      if(s._generated?.version===2){$('tip').textContent='Plan the crossings. Each rug stops the next one.';const p=document.createElement('p');p.className='control-hint';p.textContent=`${s.rugs.length} rugs · ${s.floor.filter(i=>s.cover[i]===undefined).length} bare floor tiles. Hover or focus a rolled rug to preview its path. Wrong order? Undo and try another crossing.`;$('readout').append(p);}
    }
    if(slug==='picnic-pairs'){if(s._generated)$('quickDifficulty').value=String(s._generated.difficulty<2?0:s._generated.difficulty<6?3:7);$('chapter').textContent='A fresh picnic';$('playTitle').textContent='Find the picnic pairs';$('next').textContent='New picnic →';board.querySelectorAll('.cell').forEach(b=>{if(!b.classList.contains('flipped'))b.innerHTML=A.sprite('basket');});}
    identitySync(E,slug,s);
  }
  function identityMenu(meta){
    const identity=I?.profiles[meta.slug];if(!identity)return;
    document.body.dataset.identity=meta.slug;document.body.dataset.world=identity.world;document.body.dataset.interface=identity.layout;document.body.dataset.medium=identity.medium;
    $('begin').textContent=identity.start+' →';$('begin').setAttribute('aria-label',identity.start);$('heroDescription').textContent=identity.intro;$('number').textContent=identity.place;
    document.querySelector('.brand-mark').innerHTML=A.sprite(identity.emblem);
    $('helpTitle').textContent=identity.place;
    const footer=document.querySelector('.shell>p.footnote');if(footer)footer.textContent=identity.note;
    const aside=document.querySelector('.sidebar');if(aside&&!aside.querySelector('.identity-panel')){
      const panel=document.createElement('section');panel.className='identity-panel';panel.setAttribute('aria-label',identity.place);
      const emblem=document.createElement('div');emblem.className='identity-emblem';emblem.innerHTML=A.sprite(identity.emblem);
      const name=document.createElement('h2');name.textContent=identity.place;
      const metric=document.createElement('p');metric.id='identityMetric';metric.className='identity-metric';metric.setAttribute('aria-live','off');
      panel.append(emblem,name,metric);aside.prepend(panel);
    }
  }
  function identitySync(E,slug,s){
    const identity=I?.profiles[slug];if(!identity)return;
    $('undo').textContent=identity.undo;$('restart').textContent=identity.restart;
    if(s._generated){$('playTitle').textContent=identity.place;$('chapter').textContent=(s._generated.difficulty<2?'Easy':s._generated.difficulty<6?'Medium':'Hard')+' · '+metaNoun(identity.layout);}
    const metric=I.metrics(slug,s,E),target=$('identityMetric');if(target&&metric){const label=document.createElement('span'),value=document.createElement('strong');label.textContent=metric.label;value.textContent=metric.value;target.replaceChildren(label,value);}
    const caption=document.querySelector('.scene-caption');if(caption)caption.dataset.world=identity.world;
    const board=$('board');
    // Each pixel edition has a real sprite vocabulary in its playable board.
    const cells=[...board.querySelectorAll('.cell')];
    const put=(i,name,badge)=>{const node=cells[i];if(!node)return;node.innerHTML=A.sprite(name)+(badge?'<small class="entity-badge">'+badge+'</small>':'');node.classList.add('identity-actor');};
    if(slug==='pantry-shuffle')s.items.forEach(v=>put(v.pos,v.name==='Apple'?'apple':v.roll?'apple':'crate'));
    if(slug==='pocket-post-office'){put(s.destination,'house');if(!s.carrying)put(s.parcel,'crate');put(s.cart,'cart',['↑','→','↓','←'][s.facing]);}
    if(slug==='beetle-ball'){s.players.forEach((pos,i)=>put(pos,'beetle',String(i+1)));put(s.ball,'seed');put(s.rival,'beetle','R');}
    if(slug==='the-borrowed-minute'){put(s.player,'person');if(!s.recording&&s.echo!==null){put(s.echo,'person');cells[s.echo]?.classList.add('echo-sprite');}}
    if(slug==='garden-guilds'){s.units.forEach((u,i)=>put(u.pos,['leaf','beetle','snail'][i],u.name));}
    if(slug==='pocket-conservatory')s.residents.forEach(r=>put(r.pos,({'Snail':'snail','Beetle':'beetle','Butterfly':'butterfly'})[r.name]||'leaf'));
    if(slug==='companions-of-the-grove')board.querySelectorAll('.creature').forEach((node,i)=>{const character=i<s.rivals.length?s.rivals[i]:s.friends[i-s.rivals.length],label=node.textContent;node.setAttribute('aria-label',label);node.innerHTML=A.sprite(({leaf:'mossling',wind:'breezeling',stone:'pebbling'})[character.type]||'mossling')+`<span>${label.replace(character.icon,'').trim()}</span>`;});
    if(slug==='constellation-switchyard'){
      const svg=board.querySelector('.rail-scene svg');if(svg){const coords=[[300,35],[300,105],[180,190],[420,190],[75,295],[230,295],[370,295],[525,295]],pos=coords[s.node];svg.insertAdjacentHTML('beforeend',`<g class="pixel-train" transform="translate(${pos[0]-22} ${pos[1]-24}) scale(.5)">${I.pixelSprite('train',A,slug).replace(/^<svg[^>]*>|<\/svg>$/g,'')}</g>`);}
    }
    if(identity.medium==='dimensional'){
      // Extruded, individually clickable floor tiles retain their original DOM controls.
      board.querySelectorAll('.grid').forEach(g=>{if(!g.classList.contains('target-preview'))g.classList.add('raised-world');});
      cells.forEach(node=>node.classList.add('raised-tile'));
      if(slug==='oasis-council'||slug==='one-small-island'){const tiles=s.land||s.tiles;tiles.forEach((kind,i)=>{if(kind){const name={water:'water',garden:'seed',home:'house',park:'tree',path:null}[kind];if(name)put(i,name);}});}
    }
    if(slug==='two-ends-of-a-scarf'){s.people.forEach((pos,i)=>put(pos,'person',i===0?'A':'B'));}
    const phase=s.won?'complete':s.phase||s.mode||'playing';board.dataset.phase=phase;
  }
  function metaNoun(layout){return({editorial:'Workshop',fieldbook:'Field notes',poster:'Out and about',playful:'Playtime',airy:'Open sky',gallery:'Studio',homely:'At the workbench',storybook:'Story adventure',nocturne:'After dark',recipe:'Today’s service',expedition:'On expedition',tactical:'Field mission',nautical:'On the chart',technical:'At the controls',sport:'Match day',casebook:'Case open',travel:'On the road',botanical:'In the habitat',architectural:'Planning table',theatrical:'Backstage'})[layout]||'Ready to play';}

  const palette=['#c47354','#588d88','#c6a14d','#9476a7','#879b59','#bd7489','#6f92b0'];
  function shapeSVG(shape,piece){const w=Math.max(...shape.map(v=>v[0]))+1,h=Math.max(...shape.map(v=>v[1]))+1;return `<svg class="patch-shape" viewBox="0 0 ${w*30} ${h*30}" aria-hidden="true">${shape.map(([x,y])=>`<g data-patch-x="${x}" data-patch-y="${y}"><rect x="${x*30+1}" y="${y*30+1}" width="28" height="28" rx="3" fill="${palette[piece%palette.length]}"/><rect x="${x*30+4}" y="${y*30+4}" width="22" height="22" rx="2" fill="none" stroke="#fff4d8" stroke-width="1" stroke-dasharray="3 2"/><path d="m${x*30+9} ${y*30+15} 6-6 6 6-6 6Z" fill="#fff2"/></g>`).join('')}</svg>`;}
  function clearPreview(){document.querySelectorAll('.drop-valid,.drop-invalid').forEach(b=>b.classList.remove('drop-valid','drop-invalid'));}
  function finishDrag(){clearPreview();ghost?.remove();ghost=null;drag=null;document.body.classList.remove('patch-dragging');}
  document.addEventListener('pointerdown',event=>{
    if(session?.slug!=='patchwork-parade'||event.button!==0||session.s.won||document.querySelector('dialog[open]'))return;const origin=event.target.closest('[data-patch-piece]');if(!origin)return;const piece=Number(origin.dataset.patchPiece),s=session.s,placed=s.placed.find(p=>p.piece===piece);if(placed&&origin.closest('#tools'))return;
    const rotate=session.E.engines[session.slug].rotate,normalized=placed?placed.cells.map(i=>[i%s.w-Math.min(...placed.cells.map(p=>p%s.w)),Math.floor(i/s.w)-Math.min(...placed.cells.map(p=>Math.floor(p/s.w)))]):null,rotation=placed?[0,1,2,3].find(r=>rotate(s.pieces[piece],r).every(([x,y])=>normalized.some(([px,py])=>px===x&&py===y))):s.selected===piece?s.rotation:0;
    const square=event.target.closest('[data-patch-x]'),index=Number(origin.dataset.cellIndex),shape=rotate(s.pieces[piece],rotation);
    // Keep the grabbed square under the pointer, including rotated board pieces.
    let offset=[Number(square?.dataset.patchX||0),Number(square?.dataset.patchY||0)];if(placed){const minX=Math.min(...placed.cells.map(i=>i%s.w)),minY=Math.min(...placed.cells.map(i=>Math.floor(i/s.w)));offset=[index%s.w-minX,Math.floor(index/s.w)-minY];}
    drag={piece,rotation,shape,offset,from:placed?index:null,x:event.clientX,y:event.clientY,moved:false,pointer:event.pointerId,target:-1,valid:false};
  });
  document.addEventListener('pointermove',event=>{
    if(!drag||event.pointerId!==drag.pointer)return;if(!drag.moved&&Math.hypot(event.clientX-drag.x,event.clientY-drag.y)<6)return;event.preventDefault();drag.moved=true;document.body.classList.add('patch-dragging');if(!ghost){ghost=document.createElement('div');ghost.className='drag-ghost';ghost.innerHTML=shapeSVG(drag.shape,drag.piece);document.body.append(ghost);}
    const {s}=session,cells=[...$('board').querySelectorAll('.cell')],unit=cells[0].getBoundingClientRect().width;ghost.style.width=(Math.max(...drag.shape.map(p=>p[0]))+1)*unit+'px';ghost.style.left=event.clientX-drag.offset[0]*unit-unit/2+'px';ghost.style.top=event.clientY-drag.offset[1]*unit-unit/2+'px';
    clearPreview();const hovered=document.elementFromPoint(event.clientX,event.clientY)?.closest('#board .cell');if(!hovered){drag.valid=false;return;}const i=Number(hovered.dataset.cellIndex),x=i%s.w-drag.offset[0],y=Math.floor(i/s.w)-drag.offset[1],points=drag.shape.map(([dx,dy])=>[x+dx,y+dy]);drag.valid=points.every(([px,py])=>px>=0&&py>=0&&px<s.w&&py<s.h&&s.target.includes(py*s.w+px)&&!s.placed.some(p=>p.piece!==drag.piece&&p.cells.includes(py*s.w+px)));drag.target=y*s.w+x;points.forEach(([px,py])=>{if(px>=0&&px<s.w&&py>=0&&py<s.h)cells[py*s.w+px]?.classList.add(drag.valid?'drop-valid':'drop-invalid');});
  },{passive:false});
  document.addEventListener('pointerup',event=>{
    if(!drag||event.pointerId!==drag.pointer)return;const d=drag;if(d.moved){event.preventDefault();const suppress=e=>{e.preventDefault();e.stopImmediatePropagation();};document.addEventListener('click',suppress,{once:true,capture:true});setTimeout(()=>document.removeEventListener('click',suppress,true),100);if(d.valid){const {perform,s}=session;finishDrag();if(d.from!==null)perform({type:'cell',index:d.from});perform({type:'select',index:d.piece});for(let i=0;i<d.rotation;i++)perform({type:'rotate'});perform({type:'cell',index:d.target});}else{$('status').textContent='That shape needs a clear space inside the outline. Try turning it.';finishDrag();}}else finishDrag();
  });
  document.addEventListener('pointercancel',finishDrag);root.addEventListener('blur',finishDrag);
  document.addEventListener('keydown',event=>{if(session?.slug!=='patchwork-parade'||$('play').hidden||document.querySelector('dialog[open]')||event.target.matches('input,textarea,select'))return;if(event.key==='Escape'){finishDrag();return;}if(event.key.toLowerCase()==='r'&&!drag){event.preventDefault();session.perform({type:'rotate'});}});
  function result(slug,s){const identity=I?.profiles[slug];if(identity){$('resultTitle').textContent=identity.complete;$('next').textContent=identity.next+' →';}if(!s._generated)return;if(!identity){$('resultTitle').textContent=slug==='picnic-pairs'?'All pairs found!':'You did it!';$('next').textContent=slug==='picnic-pairs'?'New picnic →':'New puzzle →';}const icon=$('result').querySelector('.result-icon');if(icon)icon.innerHTML=A.sprite(slug==='puddle-engineers'?'flower':slug==='picnic-pairs'?'basket':'star');}
  root.MiniPresentation={menu,decorate,started,shapeSVG,result};
}(window));
