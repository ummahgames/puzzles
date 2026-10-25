(function(root){
  'use strict';
  const $=id=>document.getElementById(id), symbols={bell:'bell post',snack:'snack basket',water:'water',grass:'grass',bridge:'bridge',garden:'garden',home:'home',park:'park',path:'path',shade:'shade',flower:'flowers',log:'log',stem:'stems'};
  const make=(label,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=fn;return b;};
  let fold={axis:'y',k:1,side:'low'},audio,held=false,linkDrawing=false,linkLast=-1;
  document.addEventListener('pointerdown',()=>held=true,true);
  for(const event of ['pointerup','pointercancel'])document.addEventListener(event,()=>{held=false;linkDrawing=false;},true);
  window.addEventListener('blur',()=>held=false);
  function previewClear(){document.querySelectorAll('.preview-good,.preview-bad,.range-preview').forEach(e=>e.classList.remove('preview-good','preview-bad','range-preview'));}
  function sync(E,slug,s,perform){
    const board=$('board'),tools=$('tools'),readout=$('readout');
    $('readInstruction').onclick=()=>{
      const synthesis=window.speechSynthesis,voice=synthesis?.getVoices().find(v=>v.localService&&v.lang.startsWith('en'));
      if(!voice){$('status').textContent='No local reading voice is available. The pictures and written instructions are still here.';return;}
      synthesis.cancel();const line=new SpeechSynthesisUtterance($('tip').textContent+' '+$('lesson').textContent);line.voice=voice;synthesis.speak(line);
    };

    const cells=[...board.querySelectorAll('button.cell')],w=s.w||s.n||4;
    // A semantic label describes the game state rather than exposing an emoji.
    cells.forEach((b,position)=>{
      const action=b.dataset.action?JSON.parse(b.dataset.action):null,index=action?.index??Number(b.dataset.focus?.split(':')[1]??position);
      let description=b.getAttribute('aria-label')||'',entity;
      if(s.blocks?.includes(index)||s.rocks?.includes(index))description='blocked rock';
      if(s.tiles&&typeof s.tiles[index]==='string')description=symbols[s.tiles[index]]||s.tiles[index];
      if(s.features)description=symbols[s.features[index]]||'empty habitat space';
      if(s.land)description=symbols[s.land[index]]||'empty building space';
      if(s.items&&(entity=s.items.find(v=>v.pos===index)))description=entity.name+(entity.roll?' — rolls to the next obstacle':'');
      if(s.crates&&(entity=s.crates.find(v=>E.engines[slug].cells(s,v).includes(index))))description=`Crate ${s.crates.indexOf(entity)+1}, ${entity.w} by ${entity.h}`;
      if(s.goals?.includes(index)&&slug==='market-crates')description+=`, destination for crate ${s.goals.indexOf(index)+1}`;
      if(s.units&&(entity=s.units.find(v=>v.pos===index)))description=(entity.name||entity.team+' '+entity.form)+(entity.energy!==undefined?`, energy ${entity.energy}`:'');
      if(s.residents&&(entity=s.residents.find(v=>v.pos===index)))description=entity.name+', needs '+entity.needs.join(' and ');
      if(s.clouds&&(entity=s.clouds.find(v=>v.pos===index)))description=`Cloud with ${entity.mass} puffs`;
      if(s.targets&&(entity=s.targets.find(v=>v.pos===index)))description+=`, target: ${entity.mass} puffs`;
      if(slug==='button-burrows')description='Tunnel openings '+s.tiles[index].map(d=>['up','right','down','left'][d]).join(' and ')+(s.start===index?', entrance':'')+(s.end===index?', home':'');
      if(s.ports)description='Gutter opening '+s.ports[index].map(d=>['up','right','down','left'][d]).join(' and ')+(s.source===index?', rain source':'')+(s.pots.includes(index)?', thirsty flower':'');
      if(slug==='museum-of-impossible-rooms')description='Room doors '+s.tiles[index].map(d=>['up','right','down','left'][d]).join(' and ')+(s.exhibits.includes(index)?', exhibit':'')+(index===s.mirror?', turns counterclockwise':'');
      if(slug==='cloud-habitat')description='Current flows '+['up','right','down','left'][s.arrows[index]];
      const objectives=s.flags||s.sun;
      if(objectives?.includes(index)&&(s.level>=2||s.teamwork)&&s._rules!==1){const owner=s.units[objectives.indexOf(index)%s.units.length];b.insertAdjacentHTML('beforeend',`<small class="objective-owner">${owner.icon}</small>`);description+=`, destination for ${owner.name}`;}
      b.setAttribute('aria-label',`Row ${Math.floor(index/w)+1}, column ${index%w+1}: ${description}`);
      if(['button-burrows','museum-of-impossible-rooms','suitcase-planet'].includes(slug))b.setAttribute('aria-pressed',String(s.selected===index));
      if(s.water?.includes(index)||s.lit?.includes(index)||s.trace?.includes(index)){b.classList.add('visited-cell');b.style.setProperty('--visit-order',s.water?.indexOf(index)??s.lit?.indexOf(index)??0);}
      if(['patchwork-parade','sandcastle-helpers','market-crates','gravity-suitcase','orchard-guardians','carpet-unroll'].includes(slug)){
        const show=()=>{
          previewClear();let positions=[],valid=true;
          if(s.pieces&&s.selected>=0){const rotate=E.engines[slug].rotate||E.engines[slug].rotated,shape=rotate(s.pieces[s.selected],s.rotation);positions=shape.map(([x,y])=>({x:index%w+x,y:Math.floor(index/w)+y}));valid=positions.every(p=>p.x<w&&p.y<s.h&&s.target.includes(p.y*w+p.x)&&!s.placed.some(v=>v.cells.includes(p.y*w+p.x)));positions=positions.map(p=>p.y*w+p.x);}
          if(slug==='orchard-guardians'){const range=s.selected==='bell'?2:1;positions=E.range(w*s.h).filter(i=>Math.abs(i%w-index%w)+Math.abs(Math.floor(i/w)-Math.floor(index/w))<=range);valid=!s.path.includes(index)&&!s.running;}
          if(slug==='carpet-unroll'){
            const r=s.rugs.find(v=>v.pos===index);if(r&&s.cover[index]===undefined){positions=[index];let p=index;for(let step=0;step<r.max;step++){const [dx,dy]=E.directions[r.dir],x=p%w+dx,y=Math.floor(p/w)+dy,n=y*w+x;if(x<0||x>=w||y<0||y>=s.h||s.cover[n]!==undefined||s.rugs.some(v=>v!==r&&v.pos===n))break;positions.push(n);p=n;}}
          }
          if(slug==='gravity-suitcase'){const temp=E.act(slug,s,{type:'cell',index}),item=temp.items[temp.selected];if(item.pos!==null)positions=E.range(item.width).map(dx=>item.pos+dx);}
          positions.forEach(p=>cells[p]?.classList.add(valid?'preview-good':'preview-bad'));
        };
        b.addEventListener('pointerenter',show);b.addEventListener('focus',show);b.addEventListener('pointerleave',previewClear);b.addEventListener('blur',previewClear);
      }
    });
    board.querySelectorAll('.wet,.walk').forEach((e,i)=>{e.style.setProperty('--visit-order',i);e.classList.add('visited-cell');});
    tools.querySelectorAll('.direction').forEach(b=>{const d=['↑','→','↓','←'].indexOf(b.textContent);b.setAttribute('aria-label',['Move up','Move right','Move down','Move left'][d]||b.textContent);if(d>=0&&!s.won)b.disabled=E.act(slug,s,{type:'move',dir:d}).moves===s.moves;});
    if(slug==='mosaic-courtyard'){
      board.querySelectorAll('.mosaic-row').forEach((row,y)=>row.querySelectorAll('button').forEach((b,i)=>b.setAttribute('aria-label',`Slide row ${y+1} ${i===0?'left':'right'}`)));
      board.querySelectorAll('.column-tools>div').forEach((col,x)=>col.querySelectorAll('button').forEach((b,i)=>b.setAttribute('aria-label',`Slide column ${x+1} ${i===0?'up':'down'}`)));
    }
    if(s._rules===1){const p=document.createElement('p');p.className='control-hint';p.textContent='An earlier-edition save is restored with its original rules. Finish this level or restart to use the current edition.';readout.append(p);}

    if(s.won){tools.querySelectorAll('button').forEach(b=>b.disabled=true);$('run').disabled=true;}
    tools.querySelectorAll('[data-action]').forEach(b=>{try{if(!E.validAction(slug,s,JSON.parse(b.dataset.action)))b.disabled=true;}catch(_){}});
    // Keep mobile controls in view ahead of instructions.
    $('run').setAttribute('aria-describedby','status');
    if(slug==='orchard-guardians'&&!s.running&&!s.finished){const p=document.createElement('p');p.textContent='Tap a built post to lift it and recover its cost. Hover or focus a garden square to preview range.';p.className='control-hint';readout.append(p);}
    if(slug==='shadow-architects'){
      const cover=E.engines[slug].shadows(s);const p=document.createElement('p');p.textContent=`Live shadow: ${s.holes.filter(i=>cover.has(i)).length}/${s.holes.length} gaps covered; ${[...cover].filter(i=>!s.holes.includes(i)).length} planted spaces shaded.`;readout.append(p);
    }
    if(slug==='the-borrowed-minute'){
      const p=document.createElement('p');p.className='recording-timeline';p.textContent=(s.recording?'Recording: ':'Echo playback: ')+s.tape.map((p,i)=>`${!s.recording&&i===Math.min(s.turn,s.tape.length-1)?'▶ ':''}${Math.floor(p/5)+1},${p%5+1}`).join(' → ');readout.append(p);
    }
    if(slug==='recipe-riddles'){
      const list=document.createElement('ul');list.className='ingredient-key';s.ingredients.forEach(v=>{const li=document.createElement('li');li.textContent=v.name+': '+Object.keys(v).filter(k=>!['name','icon'].includes(k)&&v[k]===true).join(', ');list.append(li);});readout.append(list);
    }
    if(slug==='pocket-conservatory'){
      s.residents.forEach(r=>{const missing=r.needs.filter(need=>!s.features.some((v,i)=>v===need&&E.adjacent(i,r.pos,s.w)));const p=document.createElement('p');p.className=missing.length?'resident-need':'resident-happy';p.textContent=r.name+': '+(missing.length?'needs '+missing.join(' and '):'settled and happy ✓');readout.append(p);});
    }
    if(slug==='one-small-island'){
      const result=E.engines[slug].score(s);const p=document.createElement('p');p.textContent=`Connected homes: ${result.homes.length}/${s.needsHomes}; public parks: ${result.parks}; placements remaining: ${s.turns}.`;readout.append(p);
    }
    if(slug==='cloud-habitat'&&s.flights.length){s.flights.forEach((path,i)=>{const c=s.creatures[i],p=document.createElement('p');p.textContent=`${c.icon} ${path.includes(c.chime)?'Chime visited':'Chime missing'}; ${path.at(-1)===c.home?'home reached':'stops at row '+(Math.floor(path.at(-1)/s.w)+1)+', column '+(path.at(-1)%s.w+1)}.`;readout.append(p);});}
    if(slug==='lantern-links'){

      board.onpointerdown=e=>{const b=e.target.closest('.cell');if(!b)return;linkDrawing=true;linkLast=Number(JSON.parse(b.dataset.action).index);};
      board.onpointermove=e=>{if(!linkDrawing||!e.buttons)return;const b=document.elementFromPoint(e.clientX,e.clientY)?.closest('.cell');if(!b||!board.contains(b))return;const i=Number(JSON.parse(b.dataset.action).index);if(i!==linkLast){linkLast=i;perform({type:'cell',index:i});}};
      board.onpointerup=()=>linkDrawing=false;board.onpointercancel=()=>linkDrawing=false;
    }
    if(slug==='two-ends-of-a-scarf'){
      const p=document.createElement('div');p.className='scarf-indicator';p.setAttribute('role','img');p.setAttribute('aria-label','The scarf counts horizontal and vertical squares; it can pass behind rocks.');p.textContent='A ═══ 🧣 ═══ B · horizontal + vertical distance';readout.append(p);
    }
    if(slug==='the-traveling-repair-shop'){
      const help=document.createElement('p');help.textContent=s._rules===1?'Match each independent setting to the repair diagram.':s.mode==='weave'?'A shuttle flips the whole row and column. Plan how the threads cross.':s.mode==='clock'?'A clock setting turns this dial and the next dial. Match the linked mechanism.':'Set the note pins, then listen to your music box.';readout.append(help);
      if(s.mode==='music')tools.append(make('Listen to the note pins',()=>melody(s.tiles)));
    }
    if(slug==='wobble-wagon'&&s.phase==='drive'){
      tools.querySelectorAll('button').forEach(b=>{if(/quicker|Quick crossing|Slow & steady/.test(b.textContent))b.hidden=true;});
      const p=document.createElement('p');p.textContent='The wagon travels at a careful pace. Balance the load before departure.';readout.append(p);
    }
    if(slug==='rooftop-ribbon-run'&&s.bumps&&s.jump===0){const p=document.createElement('p');p.textContent='Tip: stand up before jumping. Duck stays on until you choose Stand up.';readout.append(p);}
  }
  function foldControls(s,perform){
    const controls=document.createElement('div');controls.className='fold-chooser';
    const axis=document.createElement('select');axis.setAttribute('aria-label','Fold direction');for(const [v,t]of [['y','Horizontal fold'],['x','Vertical fold']]){const o=document.createElement('option');o.value=v;o.textContent=t;axis.append(o);}axis.value=fold.axis;
    const crease=document.createElement('select');crease.setAttribute('aria-label','Choose crease');
    const refresh=()=>{crease.replaceChildren();const n=fold.axis==='x'?s.w:s.h;fold.k=Math.min(Math.max(1,fold.k),n-1);for(let i=1;i<n;i++){const o=document.createElement('option');o.value=i;o.textContent='Crease '+i;crease.append(o);}crease.value=String(fold.k);};refresh();
    axis.onchange=()=>{fold.axis=axis.value;refresh();};crease.onchange=()=>fold.k=Number(crease.value);
    controls.append(axis,crease,make('Fold start side',()=>perform({type:'fold',axis:fold.axis,k:fold.k,side:'low'})),make('Fold end side',()=>perform({type:'fold',axis:fold.axis,k:fold.k,side:'high'})));$('tools').append(controls);
  }
  function melody(notes){try{audio||=new(window.AudioContext||window.webkitAudioContext)();audio.resume();notes.slice(0,15).forEach((n,i)=>{const o=audio.createOscillator(),g=audio.createGain(),t=audio.currentTime+i*.18;o.frequency.value=[523,659,784][n%3];g.gain.setValueAtTime(.001,t);g.gain.exponentialRampToValueAtTime(.07,t+.01);g.gain.exponentialRampToValueAtTime(.001,t+.16);o.connect(g).connect(audio.destination);o.start(t);o.stop(t+.18);});}catch(_){$('status').textContent='Sound is unavailable. The note symbols show the same sequence.';}}
  function result(slug,s){const icon=$('result').querySelector('.result-icon');icon.replaceChildren();icon.textContent=slug==='match-to-mend'?s.object:slug==='pocket-conservatory'?'🦋 🌷':slug==='storybook-stagehands'?'🎭':slug==='stardust-sanctuary'?'🌙 🧚':'✦';if(slug==='storybook-stagehands'){const stage=document.createElement('div');stage.className='stage-performance';s.scene.cues.forEach((cue,i)=>{const span=document.createElement('span');span.textContent={fan:'🌬',drum:'🥁',cloth:'🌊',lamp:'💡',cutout:'🌙',flags:'⚑',stars:'✦'}[cue];span.style.setProperty('--cue',i);stage.append(span);});icon.append(stage);}}
  root.MiniPlay={sync,foldControls,result,interacting:()=>held};
}(window));
