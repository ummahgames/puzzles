(function(){'use strict';
  const C=window.LanternCore,$=id=>document.getElementById(id),NS='http://www.w3.org/2000/svg';
  const colors=['#ffbe55','#72d9d2','#ee8eb4','#a9b3ff','#a9d36e','#ff916f','#e1bcff','#f0e994','#83bdff'];
  const names=['Amber','Jade','Rose','Periwinkle','Fern','Coral','Lilac','Lemon','Sky'];
  const lantern=(color)=>`<svg viewBox="0 0 16 20" shape-rendering="crispEdges" aria-hidden="true"><path fill="#101b2c" d="M6 0h4v1h1v3h2v2h1v11h-2v2H4v-2H2V6h1V4h2V1h1z"/><path fill="#7b8b9b" d="M6 1h4v1H6zM5 2h1v3H5zM10 2h1v3h-1zM3 5h10v2H3zM4 17h8v1H4z"/><path fill="${color}" d="M4 7h8v9H4z"/><path fill="#fff3c4" class="flame" d="M7 8h2v2h1v4H9v1H6v-4h1z"/><path fill="#101b2c" opacity=".5" d="M5 7h1v9H5zM10 7h1v9h-1z"/></svg>`;
  let prefs=C.preferences(),board,state,history=[],dragging=false,pointerId=null,lastPoint=null,focusIndex=0,keyboardDrawing=false,showHint=false,hintTimer=null,completionTimer=null,sound=false,audio,connectedBefore=0,keyboardSnapshot=null;
  let buttons=[],routeNodes=[],legendButtons=[],hintNodes=[];
  const freshSeed=()=>{const a=new Uint32Array(2);crypto.getRandomValues(a);return a.join('-');};
  const snapshot=()=>JSON.stringify(state);
  function remember(before){if(before!==snapshot()){history.push(before);if(history.length>100)history.shift();}}
  function finishKeyboard(){if(keyboardSnapshot!==null)remember(keyboardSnapshot);keyboardSnapshot=null;keyboardDrawing=false;}
  function commitStroke(){if(!dragging)return;dragging=false;if(pointerId!==null&&$('garden').hasPointerCapture(pointerId))$('garden').releasePointerCapture(pointerId);pointerId=null;lastPoint=null;if(strokeBefore!==null)remember(strokeBefore);strokeBefore=null;}
  let strokeBefore=null;
  function syncPrefs(){for(const key of ['difficulty','size','pairs'])$(key).value=String(prefs[key]);preview();}
  function preview(){const s=C.settings(prefs);$('preview').textContent=`Evening ${prefs.level} · ${s.size} × ${s.size} tiles · ${s.pairs} pairs${prefs.size===0?' · Grows every four evenings':''}`;}
  function persist(){try{window.history.replaceState(null,'',location.pathname+location.search+'#garden='+C.encode(prefs));}catch(_){}}
  function setFocus(i,focus=true){buttons[focusIndex]?.setAttribute('tabindex','-1');focusIndex=i;buttons[i].tabIndex=0;if(focus)buttons[i].focus({preventScroll:true});}
  function status(text){$('status').textContent=text;}
  function tone(win=false){if(!sound)return;try{audio||=new(window.AudioContext||window.webkitAudioContext)();audio.resume();(win?[523,659,784,1047]:[660,880]).forEach((f,i)=>{const o=audio.createOscillator(),g=audio.createGain(),t=audio.currentTime+i*.1;o.type='triangle';o.frequency.value=f;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.05,t+.015);g.gain.exponentialRampToValueAtTime(.001,t+.3);o.connect(g).connect(audio.destination);o.start(t);o.stop(t+.32);});}catch(_){}}
  function svg(tag,attrs){const el=document.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs))el.setAttribute(k,v);return el;}
  const points=p=>p.map(i=>`${i%board.size+.5},${Math.floor(i/board.size)+.5}`).join(' ');
  function build(){
    const n=board.size;$('garden').style.setProperty('--n',n);$('routes').setAttribute('viewBox',`0 0 ${n} ${n}`);$('routes').replaceChildren();$('cells').replaceChildren();$('legend').replaceChildren();buttons=[];routeNodes=[];legendButtons=[];hintNodes=[];
    for(let k=0;k<board.pairs.length;k++){
      const g=svg('g',{'stroke':colors[k],fill:'none','stroke-linejoin':'miter','stroke-linecap':'square'}),shadow=svg('polyline',{'stroke':'#050e1e','stroke-width':'.43'}),line=svg('polyline',{'stroke-width':'.28',class:'ribbon'}),spark=svg('polyline',{'stroke-width':'.055',stroke:'#fff7da',class:'spark','stroke-dasharray':'.07 .6'});g.append(shadow,line,spark);$('routes').append(g);routeNodes.push({g,shadow,line,spark});
      const b=document.createElement('button');b.className='pair';b.style.setProperty('--pair',colors[k]);b.innerHTML=lantern(colors[k])+`<span>${String(k+1).padStart(2,'0')} <strong>${names[k]}</strong></span><span class="pair-check" aria-hidden="true">○</span>`;b.onclick=()=>{finishKeyboard();const before=snapshot();C.begin(board,state,board.pairs[k][0]);remember(before);setFocus(board.pairs[k][0]);paint();status(`Drawing ${names[k]} ${k+1}. Use arrows or tap neighboring tiles.`);keyboardDrawing=true;keyboardSnapshot=snapshot();};$('legend').append(b);legendButtons.push(b);
    }
    for(let i=0;i<n*n;i++){
      const b=document.createElement('button'),k=board.pairs.findIndex(p=>p.includes(i));b.className='tile'+(k>=0?' endpoint':'');b.dataset.cell=String(i);b.tabIndex=-1;if(k>=0){b.style.setProperty('--pair',colors[k]);b.innerHTML=lantern(colors[k])+`<span class="number">${k+1}</span>`;b.dataset.pair=k;}
      b.addEventListener('click',e=>{if(e.detail===0){activate(i);}});$('cells').append(b);buttons.push(b);
    }
    for(const p of board.solution){const k=hintNodes.length,h=svg('polyline',{points:points(p),stroke:colors[k],'stroke-width':'.09',fill:'none','stroke-dasharray':'.15 .16',class:'hint-route',hidden:'true'});$('routes').append(h);hintNodes.push(h);}
    setFocus(board.pairs[0][0],false);$('chapter').textContent=`Evening ${prefs.level} / ${prefs.difficulty}`;$('playTitle').textContent=['The firefly garden','Moonlit stepping stones','The starling orchard','The midnight courtyard'][(prefs.level-1)%4];$('pairCount').textContent=`${board.pairs.length} pairs to bring home`;
    $('garden').classList.remove('garden-arrive');void $('garden').offsetWidth;$('garden').classList.add('garden-arrive');
  }
  function paint(){
    const p=C.progress(board,state),used=new Map();state.paths.forEach((path,k)=>path.forEach(i=>used.set(i,k)));
    routeNodes.forEach(({g,shadow,line,spark},k)=>{const path=state.paths[k],pts=points(path),complete=path.length>1&&board.pairs[k].includes(path.at(-1));for(const node of [shadow,line,spark])node.setAttribute('points',pts);g.classList.toggle('connected',complete);g.classList.toggle('active',state.active===k);legendButtons[k].classList.toggle('connected',complete);legendButtons[k].classList.toggle('selected',state.active===k);legendButtons[k].setAttribute('aria-label',`${names[k]} pair ${k+1}, ${complete?'connected':'not connected'}. Select to draw.`);legendButtons[k].querySelector('.pair-check').textContent=complete?'✓':'○';});
    buttons.forEach((b,i)=>{const k=used.get(i),e=board.pairs.findIndex(pair=>pair.includes(i));b.classList.toggle('painted',k!==undefined);b.classList.toggle('head',state.active>=0&&state.paths[state.active].at(-1)===i);b.style.setProperty('--path-color',k!==undefined?colors[k]:'transparent');b.setAttribute('aria-label',`Row ${Math.floor(i/board.size)+1}, column ${i%board.size+1}: ${e>=0?`${names[e]} lantern ${e+1}`:k!==undefined?`${names[k]} path ${k+1}`:'empty tile'}`);});
    $('filled').textContent=`${p.connected}/${board.pairs.length} linked`;$('meter').style.width=`${p.filled/board.size**2*100}%`;$('coverage').textContent=`${p.filled} of ${board.size**2} tiles glowing`;$('undo').disabled=!history.length&&keyboardSnapshot===null;$('restart').disabled=!state.paths.some(path=>path.length);
    $('garden').classList.toggle('garden-won',p.won);$('fresh').textContent=p.won?'Next evening →':'New layout ↻';
    if(p.connected>connectedBefore){tone(p.won);if(!p.won)status(`${p.connected} pair${p.connected===1?'':'s'} glowing. ${board.size**2-p.filled} tiles left to fill.`);}connectedBefore=p.connected;
    if(p.connected===board.pairs.length&&!p.won)status(`Every pair is linked. Fill the ${board.size**2-p.filled} remaining tiles to light the whole garden.`);
    if(p.won&&!completionTimer&&!$('result').open){hideHint();commitStroke();finishKeyboard();status('Every lantern is linked. Every tile is glowing!');completionTimer=setTimeout(function offer(){completionTimer=null;if($('play').hidden||!C.progress(board,state).won)return;if(document.querySelector('dialog[open]')){completionTimer=setTimeout(offer,250);return;}$('resultText').textContent=`Evening ${prefs.level}: ${board.size} × ${board.size}, ${board.pairs.length} pairs, one bright garden. A freshly generated evening is waiting whenever you are.`;$('result').showModal();},document.body.classList.contains('quiet')?30:850);}
  }
  function hideHint(){clearTimeout(hintTimer);showHint=false;for(const node of hintNodes)node.style.display='none';$('hint').textContent='Peek at a solution';}
  function start(){commitStroke();finishKeyboard();clearTimeout(completionTimer);completionTimer=null;hideHint();board=C.generate(prefs,freshSeed());state=C.create(board);history=[];connectedBefore=0;$('result').close();$('home').hidden=true;$('play').hidden=false;$('resume').hidden=false;build();paint();status('Drag from either lantern to its twin. Fill every tile.');persist();$('playTitle').focus({preventScroll:true});window.scrollTo(0,0);}
  function home(){commitStroke();finishKeyboard();hideHint();clearTimeout(completionTimer);completionTimer=null;$('result').close();$('play').hidden=true;$('home').hidden=false;syncPrefs();window.scrollTo(0,0);}
  function undo(){commitStroke();finishKeyboard();clearTimeout(completionTimer);completionTimer=null;if(history.length){state=JSON.parse(history.pop());state.active=-1;connectedBefore=C.progress(board,state).connected;hideHint();paint();status('Last stroke lifted. Try another path.');}}
  function activate(i){if(C.progress(board,state).won)return;finishKeyboard();const before=snapshot();const end=board.pairs.findIndex(p=>p.includes(i));if(end>=0&&(state.active<0||end!==state.active||!C.step(board,state,i))){C.begin(board,state,i);}else if(end<0){if(!C.step(board,state,i))C.begin(board,state,i);}remember(before);setFocus(i);keyboardDrawing=state.active>=0;keyboardSnapshot=snapshot();paint();}
  function point(e){const r=$('garden').getBoundingClientRect();return {x:(e.clientX-r.left)/r.width*board.size,y:(e.clientY-r.top)/r.height*board.size};}
  const inside=p=>p.x>=0&&p.y>=0&&p.x<board.size&&p.y<board.size;
  $('garden').addEventListener('pointerdown',e=>{
    if(e.button!==0||dragging||C.progress(board,state).won)return;const p=point(e);if(!inside(p))return;e.preventDefault();finishKeyboard();hideHint();strokeBefore=snapshot();const i=Math.floor(p.y)*board.size+Math.floor(p.x),end=board.pairs.findIndex(pair=>pair.includes(i));
    if(end>=0){if(!(state.active===end&&C.step(board,state,i)))C.begin(board,state,i);}else if(!C.step(board,state,i))C.begin(board,state,i);
    dragging=true;pointerId=e.pointerId;lastPoint=p;$('garden').setPointerCapture(pointerId);setFocus(i);paint();
  });
  $('garden').addEventListener('pointermove',e=>{if(!dragging||e.pointerId!==pointerId)return;e.preventDefault();const events=e.getCoalescedEvents?.()||[];if(!events.length)events.push(e);let changed=false;for(const event of events){const p=point(event);if(!inside(p)){lastPoint=null;continue;}if(lastPoint){for(const i of C.trace(lastPoint,p,board.size)){if(C.step(board,state,i)){changed=true;setFocus(i,false);}else if(state.paths[state.active]?.at(-1)!==i)break;}}lastPoint=p;}if(changed)paint();});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])$('garden').addEventListener(event,()=>{commitStroke();if(state)paint();});
  window.addEventListener('blur',()=>{commitStroke();finishKeyboard();});
  $('cells').addEventListener('keydown',e=>{
    const delta={ArrowUp:-board.size,ArrowDown:board.size,ArrowLeft:-1,ArrowRight:1}[e.key];if(delta!==undefined){e.preventDefault();const next=focusIndex+delta;if(next<0||next>=buttons.length||!C.adjacent(focusIndex,next,board.size))return;if(keyboardDrawing&&state.active>=0&&!C.progress(board,state).won){keyboardSnapshot??=snapshot();if(!C.step(board,state,next)){status('That way is blocked. Retrace your path, or press Escape to choose another lantern.');return;}}setFocus(next);paint();}else if(e.key==='Escape'){e.preventDefault();finishKeyboard();state.active=-1;paint();status('Pencil lifted. Use arrows to find another lantern.');}else if(e.key.toLowerCase()==='z'){e.preventDefault();undo();}
  });
  $('begin').onclick=start;$('resume').onclick=()=>{if(!board)return start();$('home').hidden=true;$('play').hidden=false;paint();};$('menu').onclick=home;$('homeLink').onclick=home;$('fresh').onclick=()=>{if(C.progress(board,state).won){prefs.level=Math.min(999999,prefs.level+1);syncPrefs();}start();};$('undo').onclick=undo;
  $('restart').onclick=()=>{commitStroke();finishKeyboard();const before=snapshot();state=C.create(board);remember(before);connectedBefore=0;hideHint();paint();status('Same garden, a fresh start.');};
  $('hint').onclick=()=>{if(showHint){hideHint();status('Solution hidden. Your own paths are unchanged.');return;}showHint=true;for(const node of hintNodes){node.removeAttribute('hidden');node.style.display='';}$('hint').textContent='Hide the solution';status('Dotted trails show one verified solution for 10 seconds. Your paths stay in place.');hintTimer=setTimeout(()=>{hideHint();status('Your turn. Try following one lantern’s trail.');},10000);};
  $('next').onclick=()=>{prefs.level=Math.min(999999,prefs.level+1);syncPrefs();start();};$('finish').onclick=home;
  for(const key of ['difficulty','size','pairs'])$(key).onchange=()=>{prefs=C.preferences({...prefs,[key]:$(key).value,level:1});$('resume').hidden=true;preview();persist();};
  $('help').onclick=()=>{commitStroke();finishKeyboard();$('helpDialog').showModal();};
  $('save').onclick=()=>{commitStroke();finishKeyboard();$('saveInput').value=C.encode(prefs);$('saveStatus').textContent='';$('saveDialog').showModal();};
  $('copy').onclick=async()=>{try{await navigator.clipboard.writeText($('saveInput').value);$('saveStatus').textContent='Garden code copied.';}catch(_){$('saveInput').select();$('saveStatus').textContent='Select and copy the code to keep it.';}};
  $('load').onclick=()=>{const restored=C.decode($('saveInput').value.trim());if(!restored){$('saveStatus').textContent='Use a Lantern Links code beginning LL2. Older campaign codes use the previous game rules.';return;}prefs=restored;syncPrefs();$('saveDialog').close();start();};
  for(const b of document.querySelectorAll('[data-close]'))b.onclick=()=>$(b.dataset.close).close();
  $('sound').onclick=()=>{sound=!sound;$('sound').textContent=sound?'Sound on':'Sound off';$('sound').setAttribute('aria-pressed',String(sound));if(sound)tone();};
  $('reduceMotion').checked=matchMedia('(prefers-reduced-motion: reduce)').matches;$('reduceMotion').onchange=()=>document.body.classList.toggle('quiet',$('reduceMotion').checked);$('reduceMotion').onchange();
  if(location.protocol==='file:')$('shelfLink').href='../../ummahgames.github.io/index.html';
  $('menuArt').innerHTML=window.MiniArtwork.scene('lantern-links');for(const node of document.querySelectorAll('.brand-lantern,.win-lantern'))node.innerHTML=lantern(colors[0]);
  const saved=C.decode(location.hash.startsWith('#garden=')?location.hash.slice(8):'');if(saved)prefs=saved;syncPrefs();if(saved)start();
})();
