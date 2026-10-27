/* The earlier editions keep their controls and receive their own illustrated worlds. */
(function(){
  'use strict';
  const slug=document.body.dataset.ugGame,A=window.MiniArtwork,I=window.MiniIdentities,p=I?.profiles[slug];if(!p)return;
  document.body.classList.add('illustrated-edition');document.body.dataset.identity=slug;document.body.dataset.world=p.world;document.body.style.setProperty('--illustration-accent',A.themes[slug][2]);
  const targets={
    'little-delivery-wagon':'#homeScreen .hero-scene',
    'sleepy-creature-hotel':'#homeScreen .hotel-art',
    'find-the-animal':'#homeScreen .hero-art',
    photon:'#home .orbit-art',
    'dune-arcanum':'#menuView .hero-art',
    alien:'#app .hero-space',
    pearls:'#screen .menu-content',
    swipe:'#panel .hero'
  };
  function decorate(){
    const host=document.querySelector(targets[slug]);if(!host||host.querySelector('[data-identity-scene]'))return;
    const art=document.createElement('div');art.className='legacy-world-art';art.dataset.identityScene=slug;art.setAttribute('aria-hidden','true');art.innerHTML=A.scene(slug);
    if(['pearls','swipe'].includes(slug))host.prepend(art);else host.replaceChildren(art);
  }
  decorate();
  // Dynamic menu editions recreate only their menu subtree when navigation changes.
  const dynamic=document.querySelector({alien:'#app','dune-arcanum':'#menuView',pearls:'#screen',swipe:'#panel'}[slug]||'#homeScreen');
  if(dynamic)new MutationObserver(decorate).observe(dynamic,{childList:true,subtree:true});
}());
