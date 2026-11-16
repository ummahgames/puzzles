(function(root){
  'use strict';
  const $=id=>document.getElementById(id);
  function render(E,s,perform){
    const board=$('board'),hex=s.geometry==='hex',vectors=E.puddle.vectors(s),count=vectors.length,wet=new Set(s.water),report=E.puddle.inspect(s),grid=board.querySelector('.grid');
    board.classList.add('rainworks-v2');board.classList.toggle('raining',s.water.length>0);grid.className='grid rain-grid '+(hex?'hex-grid':'square-grid');
    const width=100+86.6025*(s.w-1+(s.h-1)/2),height=100+75*(s.h-1);
    if(hex)grid.style.aspectRatio=`${width}/${height}`;
    const names=hex?['east','southeast','southwest','west','northwest','northeast']:['north','east','south','west'];
    const vector=d=>hex?[Math.cos(d*Math.PI/3),Math.sin(d*Math.PI/3)]:vectors[d];
    const point=(d,r)=>{const [dx,dy]=vector(d);return [50+dx*r,50+dy*r];};
    const arrow=(d)=>{const [x,y]=point(d,40),[dx,dy]=vector(d);return `<path d="M50 50L${x} ${y}m${-dx*9-dy*5} ${-dy*9+dx*5}L${x} ${y}l${-dx*9+dy*5} ${-dy*9-dx*5}" class="flow-arrow"/>`;};
    [...grid.children].forEach((b,i)=>{
      const source=i===s.source,exits=s.exits.filter(e=>e.cell===i),fixed=s.fixed.includes(i),flower=s.pots.includes(i),coin=s.coins.includes(i),gem=s.gems.includes(i);
      b.disabled=fixed;b.className='cell rain-tile'+(fixed?' fixed':'')+(wet.has(i)?' wet':'')+(source?' inlet-tile':'')+(exits.length?' drain-tile':'')+(report.leaks.includes(i)&&wet.has(i)?' leaking':'');
      if(hex){b.style.width=10000/width+'%';b.style.height=10000/height+'%';b.style.left=86.6025*(i%s.w+Math.floor(i/s.w)/2)/width*100+'%';b.style.top=75*Math.floor(i/s.w)/height*100+'%';}
      const path=s.ports[i].map(d=>`M50 50L${point(d,hex?43.3:50).join(' ')}`).join(' '),polygon=E.range(6).map(n=>{const t=(30+n*60)*Math.PI/180;return `${50+49*Math.cos(t)},${50+49*Math.sin(t)}`;}).join(' ');
      let svg=`<svg viewBox="0 0 100 100" aria-hidden="true">${hex?`<polygon points="${polygon}" class="hex-ground"/>`:''}<path class="gutter-shadow" d="${path}"/><path class="gutter-bed" d="${path}"/>${wet.has(i)?`<path class="water-stream" d="${path}"/>`:''}`;
      if(source){const [x,y]=point(s.inlet,hex?43:49);svg+=`<path class="inlet-guide" d="M${x} ${y}L50 50"/><circle cx="${x}" cy="${y}" r="7" class="inlet-mouth"/>`;const [dx,dy]=vector(s.inlet);svg+=`<path class="flow-arrow" d="M${50+dx*32} ${50+dy*32}L50 50l${dx*10-dy*6} ${dy*10+dx*6}M50 50l${dx*10+dy*6} ${dy*10-dx*6}"/>`;}
      for(const e of exits)svg+=arrow(e.dir);svg+='</svg>';
      b.innerHTML=svg+(source?'<span class="rain-source"><span aria-hidden="true">🌧</span><strong>RAIN IN</strong></span>':'')+(exits.length?'<span class="rain-drain">DRAIN '+(report.exits.includes(i)&&wet.has(i)?'✓':'↗')+'</span>':'')+(fixed?'<span class="rain-lock" aria-hidden="true">🔒</span>':'')+(flower?`<span class="rain-flower ${wet.has(i)?'watered':''}" aria-hidden="true">${wet.has(i)?'🌻':'🌷'}</span>`:'')+(coin?'<span class="rain-treasure coin" aria-hidden="true">●</span>':'')+(gem?'<span class="rain-treasure gem" aria-hidden="true">◆</span>':'');
      if(source&&hex){const marker=b.querySelector('.rain-source');marker.style.left='28.5%';marker.style.bottom='87%';}
      b.setAttribute('aria-label',`Row ${Math.floor(i/s.w)+1}, column ${i%s.w+1}. ${source?'Rain enters from '+names[s.inlet]+'. ':''}${exits.length?'Drain facing '+exits.map(e=>names[e.dir]).join(', ')+'. ':''}${flower?'Flower '+(wet.has(i)?'watered':'dry')+'. ':''}${coin?'Coin, 25 bonus points. ':''}${gem?'Optional gem, 100 bonus points. ':''}Openings ${s.ports[i].map(d=>names[d]).join(', ')}. ${fixed?'Fixed tile.':'Rotate '+(hex?'60':'90')+' degrees.'}`);
    });
    const tier=s._generated.difficulty<2?'Easy':s._generated.difficulty<6?'Medium':s._generated.difficulty===6?'Hard':'Expert';
    $('playTitle').textContent=`Rain garden · Level ${s._generated.number}`;$('chapter').textContent=`${tier} · ${s.w} × ${s.h} · ${hex?'Hexagons · 60° turns':'Squares · 90° turns'}`;
    const objective=s.objective?`Use ${s.objective.kind==='min'?'at most':'at least'} ${s.objective.target} wet tiles.`:'Water every flower and reach a marked drain.';
    $('tip').textContent=objective;$('lesson').textContent=`Rain enters at the blue dotted inlet beneath RAIN IN. Turn pipes ${hex?'60':'90'} degrees to connect matching openings. ${s.fixed.length?'The inlet and drain tiles are locked. ':''}Water every flower, reach at least one marked boundary drain, and leave no wet pipe openings spilling into the field. ${objective} Gold coins add 25 points; optional purple gems add 100. Try a different route to collect more. Next level gradually grows the garden.`;
    $('helpText').textContent=$('lesson').textContent;
    if(!s.message)$('status').textContent=`Turn a gutter ${hex?'60':'90'} degrees. Follow the blue inlet arrow to a gold drain.`;
    const bank=s.totalScore,coins=s.coins.filter(p=>wet.has(p)).length,gems=s.gems.filter(p=>wet.has(p)).length;
    $('readout').textContent=`🌷 ${s.pots.filter(p=>wet.has(p)).length}/${s.pots.length} flowers · ⇥ ${report.exits.length} drains used · ${s.water.length} wet tiles · ● ${coins}/${s.coins.length} coins · ◆ ${gems}/${s.gems.length} gems · ${s.score} points · Total earned: ${bank}`;
    const legend=document.createElement('p');legend.className='rain-legend';legend.textContent='Blue dotted arrow: rain inlet · Gold arrows: safe drains · 🔒 fixed · ● coin +25 · ◆ optional gem +100';$('readout').append(legend);
    if(s.won)$('resultText').textContent=s.message+` Total earned: ${bank} points across gardens.`;
  }
  root.MiniPuddleUI={render};
}(window));
