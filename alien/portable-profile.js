(function(root){
  'use strict';
  const checksum=text=>{let n=2166136261;for(const c of text)n=Math.imul(n^c.charCodeAt(0),16777619);return(n>>>0).toString(36);};
  function encode(slug,entries){const text=JSON.stringify(entries),raw=typeof Buffer!=='undefined'?Buffer.from(text).toString('base64'):btoa(unescape(encodeURIComponent(text))),p=`UGP1.${slug}.${raw.replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}`;return p+'.'+checksum(p);}
  function decode(slug,input){try{if(typeof input!=='string'||input.length>500000)return null;let code=input.trim();if(code.includes('#'))code=new URLSearchParams(code.slice(code.indexOf('#')+1)).get('profile')||'';const p=code.split('.');if(p.length!==4||p[0]!=='UGP1'||p[1]!==slug||checksum(p.slice(0,3).join('.'))!==p[3])return null;const raw=p[2].replace(/-/g,'+').replace(/_/g,'/'),text=typeof Buffer!=='undefined'?Buffer.from(raw,'base64').toString('utf8'):decodeURIComponent(escape(atob(raw))),data=JSON.parse(text);if(!data||typeof data!=='object'||Array.isArray(data)||Object.keys(data).length>10||!Object.entries(data).every(([k,v])=>/^[a-z0-9_.-]{1,100}$/i.test(k)&&typeof v==='string'&&v.length<300000))return null;return data;}catch(_){return null;}}
  if(typeof module!=='undefined'){module.exports={encode,decode};return;}
  const slug=document.body.dataset.ugGame,hash=new URLSearchParams(location.hash.slice(1)),loaded=decode(slug,hash.get('profile'));
  let entries=Object.assign(Object.create(null),loaded||{}),timer;
  function persist(){try{const p=new URLSearchParams(location.hash.slice(1)),code=encode(slug,entries);if(code.length>500000)return;p.set('profile',code);history.replaceState(null,'',location.pathname+location.search+'#'+p);}catch(_){}}
  root.UmmahProfile={
    getItem(key){if(Object.hasOwn(entries,key))return entries[key];if(loaded)return null;try{const value=root.localStorage.getItem(key);if(value!==null){entries[key]=value;persist();}return value;}catch(_){return null;}},
    setItem(key,value){entries[key]=String(value);clearTimeout(timer);timer=setTimeout(persist,150);},
    removeItem(key){delete entries[key];persist();},
    code:()=>encode(slug,entries)
  };
  function mount(){
    const selectors={'dune-arcanum':'.site-header,.chamber-top',photon:'.home > .brand,.page-header,.game-header',swipe:'.header-tools,.round-tools','find-the-animal':'.header-actions,.play-stats'},hosts=[...document.querySelectorAll(selectors[slug]||'.header-tools,.header-actions,.site-header nav')];if(!hosts.length){const header=document.querySelector('header');if(header)hosts.push(header);}if(!hosts.length)return;const host=hosts[0];
    const button=document.createElement('button');button.type='button';button.textContent='Save code';button.className='ug-profile-open';button.setAttribute('aria-label','Copy or load portable game progress');button.onkeydown=e=>{if(e.key===' '||e.key==='Enter')e.stopPropagation();};host.append(button);
    const dialog=document.createElement('dialog');dialog.className='ug-profile-dialog';dialog.setAttribute('aria-labelledby','ug-profile-title');
    dialog.innerHTML='<h2 id="ug-profile-title">Take your game with you</h2><p>Bookmark this page or copy the code. Progress stays in this tab and its link. An older device save is read once when available.</p><label for="ug-profile-input">Portable game code</label><textarea id="ug-profile-input" rows="7" spellcheck="false"></textarea><div><button type="button" data-profile-copy>Copy code</button><button type="button" data-profile-load>Load code</button><button type="button" data-profile-close>Done</button></div><p role="status" data-profile-status></p>';
    document.body.append(dialog);const input=dialog.querySelector('textarea'),status=dialog.querySelector('[data-profile-status]');
    button.onclick=()=>{persist();input.value=root.UmmahProfile.code();status.textContent='';window.dispatchEvent(new Event('blur'));document.dispatchEvent(new Event('ummah:pause'));dialog.showModal();};
    for(const extra of hosts.slice(1)){const copy=button.cloneNode(true);copy.onclick=button.onclick;copy.onkeydown=button.onkeydown;extra.append(copy);}
    dialog.querySelector('[data-profile-close]').onclick=()=>{dialog.close();button.focus();};
    dialog.querySelector('[data-profile-copy]').onclick=async()=>{persist();try{await navigator.clipboard.writeText(input.value);status.textContent='Code copied. Keep it somewhere safe.';}catch(_){input.select();status.textContent='Select and copy the code.';}};
    dialog.querySelector('[data-profile-load]').onclick=()=>{const data=decode(slug,input.value);if(!data){status.textContent='This code is incomplete or belongs to another game.';return;}entries=Object.assign(Object.create(null),data);persist();location.reload();};
  }
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',mount,{once:true}):mount();
  addEventListener('pagehide',persist);document.addEventListener('visibilitychange',()=>{if(document.hidden)persist();});
}(typeof window==='undefined'?globalThis:window));
