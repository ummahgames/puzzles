/* Original local vector sprites and scene compositions. No fonts or remote assets. */
(function(root){
  'use strict';
  const identities=typeof module!=='undefined'?require('./identities.js'):root.MiniIdentities;
  const themes={
    'patchwork-parade':['fabric','#eecf9e','#be604c','#527e7a','A stitch of imagination','spool','fox','flag'],
    'puddle-engineers':['garden','#c8dfad','#267c86','#345d43','The rain garden','cloud','flower','water'],
    'picnic-pairs':['picnic','#f0d7cd','#b7435d','#467358','A picnic to remember','basket','apple','flower'],
    'cloud-shepherd':['sky','#cadff3','#4b709f','#59678e','A sky full of possibilities','cloud','cloud','bird'],
    'mosaic-courtyard':['ceramic','#d6e6db','#227675','#be8b46','The tilemaker’s courtyard','tile','fountain','leaf'],
    'carpet-unroll':['woven','#e5c9b6','#a34f57','#59465f','The weaver’s workshop','rug','spool','lamp'],
    'bookworm-caravan':['paper','#ecdbb8','#785b83','#a16d42','The traveling library','book','wagon','leaf'],
    'button-burrows':['fabric','#dccbb0','#a55d3f','#687448','Beneath the sewing basket','spool','house','flower'],
    'folded-worlds':['paper','#d8e2ec','#587795','#849d67','A world made of paper','mountain','house','bird'],
    'orchard-guardians':['garden','#cbdba3','#527d41','#c66541','Welcome to the orchard','tree','apple','fox'],
    'caravan-breakthrough':['desert','#eed4a2','#ad7340','#6a888a','Along the wind road','mountain','wagon','flag'],
    'clockwork-champions':['clockwork','#bfcbd8','#526c9c','#b88b45','The brass workshop','robot','gear','house'],
    'the-borrowed-minute':['night','#d8d0e6','#79639b','#b19a52','A minute out of time','clock','house','star'],
    'shadow-architects':['shadow','#d7cbb9','#665b64','#b99151','In the lamplight','lamp','house','spool'],
    'bridgewrights':['blueprint','#bfd8dd','#387b88','#a87d52','Across the valley','bridge','wagon','mountain'],
    'who-made-that-sound':['paper','#ecdbad','#ab6746','#60858c','Listen to the neighborhood','bird','house','bell'],
    'pantry-shuffle':['wood','#e9cda7','#9f7144','#779058','A place on the pantry shelf','jar','apple','basket'],
    'match-to-mend':['wood','#dbcdbb','#8b6653','#679791','A little repair studio','gear','spool','house'],
    'market-crates':['wood','#e4c3a0','#ac6750','#647d57','Market day','crate','apple','wagon'],
    'lantern-links':['night','#d7d1e4','#72618f','#c79e4f','Light the evening','lamp','star','house'],
    'the-honest-the-mistaken-and-the-mixed-up':['paper','#e1d6bf','#6a7f75','#bb795a','A neighborhood mystery','house','tree','bird'],
    'recipe-riddles':['picnic','#ead7af','#9e7250','#6e8e60','In the little kitchen','jar','apple','basket'],
    'the-moving-castle':['clockwork','#d2d2bf','#7d7770','#b48558','A castle on the move','house','gear','mountain'],
    'bannerfield':['blueprint','#d4dfbb','#667b55','#c18950','Together across the field','flag','robot','tree'],
    'harbor-hide-and-seek':['ocean','#c2dce1','#3c7f91','#c29b60','Secrets in the harbor','boat','fountain','bird'],
    'companions-of-the-grove':['garden','#c7dab3','#608262','#a47991','Friends of the grove','fox','tree','flower'],
    'lantern-company':['night','#cbd2db','#546c81','#c89d4c','Keep the lanterns glowing','lamp','mountain','flag'],
    'tiny-siege-workshop':['clockwork','#d9cbb5','#986c4e','#75858c','Build a clever way through','gear','bridge','robot'],
    'garden-guilds':['garden','#d6dfa5','#7d9050','#b37c67','The garden belongs to everyone','beetle','flower','leaf'],
    'oasis-council':['desert','#e8d4a3','#ae7c43','#4b9295','Where water makes a home','fountain','house','tree'],
    'forecast-fighters':['sky','#c4d8e1','#628ca2','#b89a54','A friendly change in the weather','cloud','flag','robot'],
    'pocket-post-office':['blueprint','#d6dcd2','#6a8791','#be704e','Special delivery','wagon','house','letter'],
    'museum-of-impossible-rooms':['ceramic','#dfd6bf','#967950','#768b85','A gallery of curious doors','house','tile','lamp'],
    'constellation-switchyard':['night','#cccde3','#626e9f','#bb9248','All aboard the star train','train','star','moon'],
    'gravity-suitcase':['woven','#d9c7ba','#957056','#6f8c8e','Pack a little possibility','crate','jar','rug'],
    'pocket-conservatory':['garden','#c9ddbd','#62875a','#b58e67','Life under glass','leaf','beetle','flower'],
    'cloud-habitat':['sky','#cce3eb','#658da3','#a89dbe','A home on the breeze','cloud','bird','bell'],
    'the-traveling-repair-shop':['wood','#dec6a7','#996e48','#789493','Good things, made good again','gear','spool','clock'],
    'one-small-island':['ocean','#c6dfcd','#5d8c7a','#b59055','A small island, a whole world','boat','tree','house'],
    'storybook-stagehands':['theatre','#d8bdc9','#8f4f67','#b98f47','The curtain is rising','flag','moon','star'],
    'suitcase-planet':['paper','#d6dfbc','#6f8c5f','#7d91b1','Take a whole world with you','mountain','tree','house'],
    'the-neighborhood-feast':['picnic','#eed1b4','#b4704e','#748a54','There is a place for everyone','basket','apple','jar'],
    'rooftop-ribbon-run':['rooftop','#d7d8e5','#7c729a','#c58767','A ribbon across the rooftops','house','flag','bird'],
    'beetle-ball':['garden','#d6dea7','#87954b','#a06945','The tiniest playing field','beetle','leaf','flower'],
    'wobble-wagon':['wood','#e2c9a2','#b77b50','#789260','Precious cargo, bumpy road','wagon','crate','mountain'],
    'two-ends-of-a-scarf':['woven','#ead0ce','#b16d7f','#7e9194','Stay close, go far','rug','house','bird'],
    'please-describe-the-monster':['paper','#e1d5e8','#9975ad','#699d8e','A very particular creature','monster','star','leaf'],
    'stardust-sanctuary':['night','#c3b9db','#74649b','#b4a058','Where moonflowers grow','moon','flower','star'],
    'little-delivery-wagon':['wood','#e9d4b1','#a9754d','#7b9a76','A delivery for every neighbor','wagon','house','letter'],
    'sleepy-creature-hotel':['night','#d3c8df','#8b789e','#b1945d','A soft place to land','house','moon','fox'],
    'find-the-animal':['garden','#d6e3ba','#6e995a','#bc8d60','Peek into the wild','fox','tree','bird'],
    alien:['night','#b9cbd9','#537c90','#8c9f61','A little further into space','robot','star','moon'],
    'dune-arcanum':['desert','#e7d1a1','#ad803d','#678b8b','Patterns in the sand','tile','mountain','star'],
    photon:['night','#c4c5e6','#6561a5','#b584b8','A little light in motion','star','gear','moon'],
    pearls:['ocean','#c5e2e1','#548f9a','#bd9d70','Treasures of the gulf','boat','water','jar'],
    swipe:['picnic','#e8d5bc','#a76a55','#6e995d','A fresh slice of play','apple','leaf','basket']
  };
  const shapes={
    cloud:'<path fill="#f8fcff" d="M10 49C0 32 15 19 28 24 34 2 63 5 67 26 91 18 103 52 81 60H24C16 60 12 56 10 49Z"/><path fill="none" stroke="#b7d5e8" stroke-width="3" d="M22 49q20 9 54-1"/>',
    flower:'<path stroke="#42724d" stroke-width="6" d="M48 80V38"/><path fill="#639755" d="M47 68Q13 70 24 50q23 0 23 18m4-6q27 1 27-21-29 5-27 21"/><g fill="#e99a95"><ellipse cx="48" cy="22" rx="12" ry="17"/><ellipse cx="31" cy="34" rx="17" ry="12"/><ellipse cx="65" cy="34" rx="17" ry="12"/><ellipse cx="39" cy="48" rx="12" ry="16"/><ellipse cx="58" cy="48" rx="12" ry="16"/></g><circle cx="48" cy="35" r="12" fill="#edc56a"/>',
    tree:'<path fill="#896344" d="M42 42h13v43H42z"/><path fill="#5d8a58" d="M48 4 16 42h13L6 64h83L69 42h12Z"/><path stroke="#a4b27a" stroke-width="3" d="m30 53 18 7 21-8M34 34l14 6 15-7" fill="none"/>',
    apple:'<path fill="#ba5b49" d="M48 29C15 11 8 38 16 62 24 86 39 82 48 77c25 17 43-11 36-34-6-19-21-22-36-14"/><path stroke="#6c5137" stroke-width="5" d="m48 30 4-20"/><path fill="#7b9e56" d="M52 20Q64-3 81 10 73 28 52 20"/><path stroke="#e2a281" stroke-width="5" d="M29 37q-8 9-6 19" fill="none"/>',
    house:'<path fill="#e4c6a1" d="M19 40h58v46H19Z"/><path fill="#a76459" d="m8 41 40-32 41 32Z"/><path fill="#6d8790" d="M31 55h13v16H31Z"/><path fill="#926d50" d="M55 58h14v28H55Z"/><path stroke="#f4e8c6" stroke-width="3" d="M37 55v16m-6-8h13"/>',
    fox:'<path fill="#c8834d" d="m20 34-5-30 28 17 18-1L84 3l-1 35q10 35-33 45Q4 73 20 34"/><path fill="#f1dbb8" d="M18 43q17-4 32 23 12-25 34-25-2 35-34 42Q19 73 18 43"/><g fill="#463f3b"><circle cx="34" cy="42" r="3"/><circle cx="66" cy="42" r="3"/><path d="m44 66 13 0-7 9Z"/></g>',
    bird:'<path fill="#6e99a3" d="M21 45Q20 6 53 19q18-3 23 16l15 8-16 5Q65 77 26 66L9 75l4-24Z"/><path fill="#aac4bf" d="M26 42q35-16 30 15-17 17-30-15"/><circle cx="64" cy="31" r="3" fill="#354854"/><path fill="#cc9a54" d="m76 36 16 7-17 4Z"/>',
    beetle:'<path stroke="#645841" stroke-width="4" d="m25 37-17-8m17 24L5 56m20 11L12 81m59-44 16-8M70 53l20 3M70 67l13 14M37 19 31 6m27 13 6-13"/><ellipse fill="#74894e" cx="48" cy="52" rx="29" ry="34"/><path stroke="#d2c582" stroke-width="4" d="M48 23v63"/><circle fill="#566546" cx="48" cy="20" r="15"/><g fill="#eddfac"><circle cx="41" cy="17" r="3"/><circle cx="55" cy="17" r="3"/></g>',
    basket:'<path fill="none" stroke="#a37a47" stroke-width="7" d="M23 43Q22-3 49 8 75 9 74 43"/><path fill="#bd965b" d="m12 37 11 45h52l11-45Z"/><path stroke="#e0bd7e" stroke-width="4" d="M18 49h62M22 62h54M29 39l7 42m13-42v42m18-42-6 42"/>',
    spool:'<path fill="#b48a62" d="M27 15h43v66H27z"/><path fill="#6f9b95" d="M24 27h49v41H24z"/><path stroke="#b5d0c1" stroke-width="3" d="M26 32h45M26 40h45M26 48h45M26 56h45M26 64h45"/><path stroke="#94714f" stroke-width="9" stroke-linecap="round" d="M23 17h53M23 79h53"/>',
    rug:'<path fill="#b26166" d="m16 23 62-8 7 61-63 9Z"/><path fill="none" stroke="#edcb9d" stroke-width="4" d="m23 30 48-7 6 47-48 7Z"/><path fill="#e1b17e" d="m48 33 18 15-14 19-19-15Z"/><path stroke="#c09b70" stroke-width="3" d="m16 25-8 1m9 9-8 1m10 9-8 1m10 9-8 1m10 9-8 1m10 9-8 1m66-56 7-1m-6 12 7-1m-6 12 7-1m-6 12 7-1m-6 12 7-1"/>',
    tile:'<rect x="12" y="12" width="73" height="73" rx="8" fill="#588e8b"/><path fill="none" stroke="#e9d9ac" stroke-width="3" d="M20 20h57v57H20Z"/><path fill="#e4bf6a" d="m48 24 7 16 18 8-18 8-7 17-8-17-16-8 16-8Z"/>',
    lamp:'<path fill="#c8a357" d="M29 29h39l8 44H21Z"/><path fill="#f5dda0" d="M35 37h26l6 28H28Z"/><path stroke="#806c4e" stroke-width="5" fill="none" d="M24 29h48M18 76h61M38 23Q25 0 49 4q24 0 12 19M48 37v28"/>',
    gear:'<path fill="#b9955a" d="m41 8 15 0 3 11 10 5 12-3 8 13-8 9v11l8 9-8 13-12-3-10 5-3 11H41l-3-11-10-5-11 3-8-13 8-9V43l-8-9 8-13 11 3 10-5Z"/><circle cx="48" cy="49" r="21" fill="#dfceaa"/><circle cx="48" cy="49" r="10" fill="#71858a"/>',
    robot:'<path fill="#8197a3" d="M26 40h46v35H26zM32 77h12v13H32m23-13h12v13H55"/><path stroke="#a4814c" stroke-width="7" d="M20 45 13 63m65-18 8 18M49 15V6"/><rect fill="#b8c5c6" x="23" y="14" width="52" height="31" rx="10"/><circle fill="#526977" cx="37" cy="29" r="5"/><circle fill="#526977" cx="61" cy="29" r="5"/><circle fill="#dab666" cx="49" cy="57" r="9"/>',
    wagon:'<path stroke="#876441" stroke-width="6" d="m18 57-8-35H1"/><path fill="#b77558" d="M16 38h67v33H24Z"/><path stroke="#e3ba80" stroke-width="4" d="M25 43v23m13-23v23m13-23v23m13-23v23m13-23v23"/><g fill="#695d52" stroke="#d6b78a" stroke-width="4"><circle cx="31" cy="78" r="11"/><circle cx="71" cy="78" r="11"/></g>',
    crate:'<rect fill="#bb8d54" x="16" y="16" width="65" height="67" rx="4"/><path stroke="#e3bd7c" stroke-width="8" d="M20 25h58M20 74h58m-51-53v58m42-58v58m-41-55 41 51"/>',
    jar:'<path fill="#9cb8b0" d="M27 23h43v13q13 3 13 16v24q0 10-12 10H26q-11 0-11-10V52q0-13 12-16Z"/><rect fill="#a78154" x="23" y="17" width="51" height="13" rx="4"/><rect fill="#f1dfb3" x="22" y="47" width="53" height="27" rx="5"/><path fill="#b77755" d="m48 50 13 12-13 10-12-10Z"/>',
    book:'<path fill="#846781" d="M15 16h62l7 9v58H20L12 72V25Z"/><path fill="#eedcb6" d="M22 22h54v51H22Z"/><path fill="#638c8b" d="M21 13h53v54H21Z"/><path fill="none" stroke="#c9c69a" stroke-width="3" d="M32 27h30M32 37h30M32 47h18"/>',
    moon:'<path fill="#ebd28b" d="M68 6C21 2 9 52 38 78q20 18 47-1C45 84 23 36 68 6Z"/>',
    star:'<path fill="#dfbd65" d="m49 6 12 26 29 5-22 21 5 31-25-15-26 15 5-31L5 37l31-5Z"/><path stroke="#f8e4a6" stroke-width="3" d="m48 24 6 15 16 3" fill="none"/>',
    leaf:'<path fill="#779b61" d="M81 7Q89 86 19 79 4 9 81 7Z"/><path fill="none" stroke="#bbca91" stroke-width="4" d="m13 87 57-66M34 65V37m16 12 25-2"/>',
    water:'<path fill="#65b7ca" d="M48 5C34 30 11 47 20 70c10 29 56 25 60-3C83 47 61 24 48 5Z"/><path fill="none" stroke="#c4e9e8" stroke-width="5" stroke-linecap="round" d="M30 55q-5 15 9 20"/>',
    flag:'<path stroke="#947651" stroke-width="5" d="M24 8v80"/><path fill="#c07c72" d="M27 12q19-13 39 0t25 0v36q-10 12-25 0t-39 0Z"/><path stroke="#ead3a4" stroke-width="3" d="M31 20q16-8 30 1t23 0" fill="none"/>',
    fountain:'<path fill="#829f9f" d="M11 57h77q-3 21-32 24v9H42v-9Q15 78 11 57M39 32h21v25H39Z"/><path fill="none" stroke="#93c7cd" stroke-width="5" d="M48 39V9m0 14q-28-28-28 23m29-22q28-28 28 22"/>',
    bridge:'<path fill="#ac8d63" d="M3 36h91v46H78V65q-11-34-28-4-18-30-30 4v17H3Z"/><path fill="none" stroke="#e4c89a" stroke-width="4" d="M6 36V17m21 19V17m22 19V17m23 19V17m19 19V17M4 21h88"/>',
    mountain:'<path fill="#8099a0" d="m2 83 33-62 17 22L69 8l27 75Z"/><path fill="#eadfc7" d="m24 42 11-21 12 16-9-3-4 8-5-5m30-6L69 8l10 29-9-8-6 8Z"/>',
    letter:'<rect fill="#eedeb9" x="7" y="23" width="82" height="55" rx="5"/><path fill="none" stroke="#bba37e" stroke-width="3" d="m9 25 39 31 39-31M9 76l28-29m50 29L60 48"/><circle cx="49" cy="55" r="9" fill="#bb7266"/>',
    clock:'<circle fill="#b7945f" cx="49" cy="49" r="40"/><circle fill="#f0e4c4" cx="49" cy="49" r="32"/><path fill="none" stroke="#6c7284" stroke-width="4" stroke-linecap="round" d="M49 24v25l17 12M49 19v5M19 49h5m50 0h5M49 74v5"/>',
    boat:'<path fill="#a87851" d="M6 62h85L74 83H25Z"/><path fill="#eee0b8" d="m46 10-31 44h31Zm7 9v35h30Z"/><path stroke="#6d797d" stroke-width="4" d="M49 8v54"/>',
    bell:'<path fill="#d4b06c" d="M26 30q0-20 23-20t23 20v28l12 12H14l12-12Z"/><path stroke="#91734a" stroke-width="4" d="M16 72h67"/><circle fill="#9e7e50" cx="49" cy="79" r="7"/>',
    train:'<path fill="#668e9c" d="M12 35h73v39H12Z"/><path fill="#b9c9bd" d="M22 21h30v30H22Z"/><path fill="#cb9c60" d="M62 12h12v25H62Z"/><g fill="#67717d" stroke="#d7c092" stroke-width="4"><circle cx="28" cy="78" r="12"/><circle cx="66" cy="78" r="12"/></g><path fill="#c9cbd6" d="M67 6q-22-15-27 0-21-8-24 7Q44 23 67 6Z"/>',
    monster:'<path fill="#9c86b2" d="m17 28-6-19 22 10q19-13 37 0L88 6l-6 25q20 47-14 51l2 9H55l-2-9H36l-2 9H19l4-12Q4 64 17 28"/><g fill="#f4eccf"><circle cx="35" cy="39" r="12"/><circle cx="64" cy="39" r="12"/></g><g fill="#4e5269"><circle cx="37" cy="40" r="5"/><circle cx="62" cy="40" r="5"/></g><path fill="none" stroke="#655b76" stroke-width="4" d="M35 62q14 12 28 0"/>'
  };
  Object.assign(shapes,{
    person:'<circle cx="48" cy="24" r="15" fill="#c79570"/><path fill="#698a95" d="M28 44q20-14 40 0l7 30H21Z"/><path stroke="#6c6059" stroke-width="8" d="M36 72v18m25-18v18"/><path fill="#87664c" d="M30 23Q26 1 49 6 71 3 66 23l-9-9-27 9Z"/>',
    mitten:'<path fill="#b8757e" d="M31 82V44q-19 9-20-5 0-8 17-17l10 10V17q0-19 14-9 12-4 17 8 13-3 15 10v34q0 18-18 22Z"/><path fill="#ead7af" d="M29 71h41v15H29Z"/><path stroke="#dfb7ac" stroke-width="3" d="M41 50h29m-26 8h23"/>',
    sock:'<path fill="#709a98" d="M34 6h40v52q0 10-12 16L35 88Q9 95 9 75q0-8 13-15l12-6Z"/><path fill="#e3cb9b" d="M34 7h40v13H34ZM13 68q22 2 23 18Q9 98 9 78Z"/>',
    cup:'<path fill="none" stroke="#99755e" stroke-width="8" d="M68 36q32-6 15 21l-15 4"/><path fill="#e4cfaa" d="M15 28h55v34Q68 80 43 80 20 80 15 62Z"/><ellipse fill="#8a6654" cx="43" cy="29" rx="27" ry="7"/><path fill="none" stroke="#b6aaa0" stroke-width="3" d="M33 17q-10-8 0-14m20 14q-10-8 0-14"/>',
    teapot:'<path fill="#7d9f9d" d="M25 30q25-15 46 0l8 39q-24 22-57 0L8 42h15Z"/><path fill="none" stroke="#7d9f9d" stroke-width="8" d="M74 35q31-8 14 24l-11 6"/><path stroke="#d6c294" stroke-width="7" d="M28 25h40"/><circle fill="#9c7d58" cx="48" cy="18" r="7"/><path fill="#d9c69c" d="m48 38 13 16-13 14-13-14Z"/>',
    seed:'<path fill="#92764e" d="M49 87Q11 71 27 42 42 17 65 34 92 51 49 87Z"/><path stroke="#6a9255" stroke-width="5" d="M48 52V15"/><path fill="#8bad66" d="M48 29Q17 34 16 7q29-3 32 22m2-8Q59-1 83 6 78 31 50 21"/>',
    egg:'<path fill="#efe1bf" stroke="#c7ae86" stroke-width="2" d="M48 6C31 7 13 47 16 66c5 30 60 29 66-1C85 45 66 7 48 6Z"/><path stroke="#fff7de" stroke-width="5" d="M30 49q-6 13-3 21" fill="none"/>',
    hen:'<ellipse fill="#e9dcc0" cx="46" cy="57" rx="33" ry="27"/><path fill="#e9dcc0" d="M55 48V25q3-22 22-9 12 12-6 34Z"/><path fill="#be6c58" d="M59 15q-5-22 4-13l5 9q9-24 12-2l-4 9"/><path fill="#c8a056" d="m81 25 14 9-16 3Z"/><circle fill="#4d5149" cx="74" cy="23" r="3"/><path fill="#bca782" d="M22 51q36-12 32 16-14 18-32-16"/><path stroke="#a7844f" stroke-width="4" d="M37 80v12m20-12v12"/>',
    bee:'<ellipse fill="#e7d8b7" cx="33" cy="24" rx="18" ry="16"/><ellipse fill="#e7d8b7" cx="64" cy="24" rx="18" ry="16"/><ellipse fill="#dab460" cx="48" cy="54" rx="33" ry="25"/><path stroke="#685b4c" stroke-width="10" d="M35 33v42m23-42v42"/><circle fill="#6d6250" cx="78" cy="48" r="14"/><circle fill="#f4e4b9" cx="82" cy="45" r="3"/>',
    honey:'<path fill="#c7a050" d="M29 23h39l9 19q12 45-9 45H28Q8 87 20 42Z"/><path fill="#95734c" d="M24 15h49v13H24Z"/><path fill="#f1d58b" d="M22 47h52v23H22Z"/><path fill="#a47d42" d="m49 50 10 10-10 9-10-9Z"/>',
    umbrella:'<path fill="#a27999" d="M7 46Q17-1 48 7 80 4 91 46q-12-10-23 0-20-12-39 0-10-10-22 0"/><path stroke="#806752" stroke-width="5" d="M48 9v66q0 21-18 9" fill="none"/><path stroke="#c8acc0" stroke-width="3" d="M48 7Q29 18 29 44M48 7q20 12 20 37" fill="none"/>',
    key:'<circle fill="none" stroke="#c7a15f" stroke-width="11" cx="31" cy="28" r="19"/><path fill="none" stroke="#c7a15f" stroke-width="10" d="m44 43 37 37m-10-9-9 9M59 60l-9 9"/>',
    lock:'<path fill="none" stroke="#857e70" stroke-width="9" d="M27 41V28q0-36 43-9v23"/><rect fill="#c2a064" x="15" y="38" width="69" height="49" rx="8"/><circle fill="#78684c" cx="49" cy="57" r="7"/><path stroke="#78684c" stroke-width="6" d="M49 61v13"/>',
    mailbox:'<path fill="#7d9a9b" d="M13 59V32q0-27 32-27 33 0 33 28v26Z"/><path fill="#bac5b1" d="M20 58V32q0-27 25-21v47Z"/><path stroke="#946f4f" stroke-width="8" d="M46 60v32"/><path stroke="#a7665a" stroke-width="5" d="M65 43V11h20v16H66"/>',
    sheep:'<path fill="#e9dfc4" d="M17 53Q-3 33 19 26 17 5 39 16 50 0 65 18 89 9 84 33 99 53 78 63 80 83 59 75 38 90 27 72 7 80 17 53"/><ellipse fill="#7e7a6d" cx="62" cy="46" rx="18" ry="23"/><path stroke="#6a665d" stroke-width="7" d="M29 69v20m39-20v20"/><g fill="#f4e7c5"><circle cx="55" cy="41" r="3"/><circle cx="69" cy="41" r="3"/></g>',
    brush:'<path stroke="#799ba2" stroke-width="11" stroke-linecap="round" d="m24 84 40-68"/><path stroke="#e9dec4" stroke-width="5" d="m56 20 20 11m-24-4 20 11m-24-4 20 11"/>',
    tooth:'<path fill="#f4ebd1" stroke="#c0baa5" stroke-width="2" d="M46 17Q16-6 12 24q-1 29 12 59 12 21 16-11 8-31 18 0 8 33 17 10 15-39 7-61-5-20-36-4Z"/>',
    rabbit:'<path fill="#d0c7b5" d="M28 47Q9-2 25 3q13-2 19 38 3-42 17-38 17 3-2 43 30 13 18 33-25 24-51 0-17-16 2-32Z"/><path stroke="#d1a6a0" stroke-width="5" d="m29 17 8 25m19-25-5 24"/><g fill="#5a605a"><circle cx="35" cy="57" r="3"/><circle cx="59" cy="57" r="3"/></g><path fill="#b58d85" d="m41 69 12 0-6 8Z"/>',
    carrot:'<path fill="#cf8b51" d="M20 86Q13 52 45 23q32-11 31 19Q59 75 20 86Z"/><path fill="#6f9457" d="M62 25Q45 1 60 1l10 19Q79-1 92 5L79 29Z"/><path stroke="#aa6c40" stroke-width="3" d="m38 49 9 7M28 65l9 5"/>'
  });

  Object.assign(shapes,{
    snail:'<path d="M9 75q13-17 63-10V44q0-11 8-8l2 26q21 15 0 22H21Q2 84 9 75Z" fill="#a8b47d"/><circle cx="43" cy="52" r="30" fill="#b59b6d"/><path d="M62 51q0-24-24-20-26 6-19 27 8 21 27 10 16-13 1-23-12-5-15 6 0 10 10 6" fill="none" stroke="#e9d4a1" stroke-width="4"/><path d="m75 44-2-15m9 15 5-15" stroke="#657252" stroke-width="3"/><circle cx="72" cy="28" r="4" fill="#465644"/><circle cx="87" cy="28" r="4" fill="#465644"/>',
    butterfly:'<path d="M45 43Q12-3 7 29 3 51 37 55 4 70 24 84 46 87 46 55M51 43Q83-3 90 29 94 51 58 55 90 70 74 84 52 88 51 55Z" fill="#b899cc"/><path d="M42 44Q17 15 15 32q3 18 26 19m12-7q26-29 29-12-3 18-27 19" fill="#e4d5e6"/><path d="M48 35v38m-2-35-8-14m12 14 8-14" stroke="#5e6178" stroke-width="5" stroke-linecap="round"/>',
    mossling:'<path d="M23 78Q4 57 21 36l3-22 21 10q18-19 30-9l-3 22q22 28-1 41Z" fill="#83a669" stroke="#4e7654" stroke-width="3"/><path d="M39 23Q35 5 57 3 67 18 49 29" fill="#b9c87c"/><g fill="#f3edca"><ellipse cx="35" cy="46" rx="9" ry="12"/><ellipse cx="61" cy="46" rx="9" ry="12"/></g><g fill="#435e4d"><circle cx="38" cy="48" r="4"/><circle cx="58" cy="48" r="4"/></g><path d="M39 66q9 9 18 0" fill="none" stroke="#435e4d" stroke-width="3"/><path d="m25 76-7 12h18m29-12 8 12H55" fill="#4e7654"/>',
    breezeling:'<path d="M17 61Q1 28 32 21 48-9 69 21 98 31 81 61q-5 23-32 20-31 5-32-20Z" fill="#a8d9dc" stroke="#658da9" stroke-width="3"/><path d="M17 50 3 35q-5 33 20 30m57-15 13-15q7 33-20 30" fill="#dbeeed"/><g fill="#4e6484"><circle cx="36" cy="44" r="5"/><circle cx="62" cy="44" r="5"/></g><path d="M36 59q14 14 28 0m-42-38q22 6 24-11" fill="none" stroke="#658da9" stroke-width="3"/><path d="M31 79q-18 19 4 7m28-7q18 19-4 7" fill="none" stroke="#658da9" stroke-width="4"/>',
    pebbling:'<path d="m17 33 23-23 31 9 15 33-8 30-53 2-15-25Z" fill="#aaa2ba" stroke="#6f728b" stroke-width="3"/><path d="m18 33 24-6 31 3 11 24-13 14-42 4-14-14Z" fill="#c9bfd1"/><g fill="#526079"><circle cx="35" cy="48" r="5"/><circle cx="61" cy="48" r="5"/></g><path d="M38 65q11 6 21-2" fill="none" stroke="#6f728b" stroke-width="3"/><path d="m25 82-6 8h20m24-8 8 8H51" fill="#6f728b"/>'
  });

  const aliases={'🐌':'snail','🦋':'butterfly','🪲':'beetle','🐞':'beetle','🧑':'person','☁':'cloud','🌧':'cloud','🌷':'flower','🌻':'flower','🌳':'tree','🌲':'tree','🍎':'apple','⌂':'house','🏠':'house','🦊':'fox','🐦':'bird','🐾':'fox','🐇':'rabbit','🧺':'basket','🧵':'spool','🧶':'spool','▤':'rug','✥':'tile','💡':'lamp','⚙':'gear','🤖':'robot','🪵':'crate','📦':'crate','📚':'book','📖':'book','🌙':'moon','⭐':'star','✦':'star','🌿':'leaf','🍃':'leaf','🌱':'seed','💧':'water','⚑':'flag','🌉':'bridge','▲':'mountain','✉':'letter','📨':'letter','⌛':'clock','⛵':'boat','♧':'bell'};
  Object.assign(aliases,{'🧤':'mitten','🧦':'sock','☕':'cup','🫖':'teapot','🥚':'egg','🐔':'hen','🐝':'bee','🍯':'honey','☔':'umbrella','🔑':'key','🔒':'lock','📫':'mailbox','🐑':'sheep','🪥':'brush','🦷':'tooth','🥕':'carrot'});
  function sprite(name,cls='',slug=typeof document!=='undefined'?(document.body.dataset.game||document.body.dataset.ugGame):''){if(identities?.profiles[slug]?.medium==='pixel'&&identities.pixelPatterns[name])return identities.pixelSprite(name,{themes,shapes},slug).replace('art-sprite pixel-sprite',`art-sprite pixel-sprite ${cls}`);return `<svg class="art-sprite ${cls}" viewBox="0 0 96 96" aria-hidden="true">${shapes[name]||shapes.star}</svg>`;}
  function scene(slug){const individual=identities?.scene(slug,{themes,shapes});if(individual)return individual;const t=themes[slug]||themes['patchwork-parade'],[kind,bg,ink,alt]=t;let backdrop='';
    if(['night','shadow','theatre'].includes(kind))backdrop=`<path fill="${ink}" opacity=".8" d="M0 0h600v360H0Z"/>`+Array.from({length:28},(_,i)=>`<circle cx="${(i*109+37)%600}" cy="${(i*43+15)%250}" r="${i%3+1}" fill="#f6e4b9" opacity=".65"/>`).join('');
    if(['fabric','woven','picnic'].includes(kind))backdrop=Array.from({length:15},(_,i)=>`<path d="M${i*44} 0v360M0 ${i*32}h600" stroke="${ink}" opacity=".12" stroke-width="${kind==='picnic'?14:2}"/>`).join('');
    if(kind==='ceramic')backdrop=Array.from({length:40},(_,i)=>`<path d="m${i%8*80} ${Math.floor(i/8)*80} 36-36 36 36-36 36Z" fill="none" stroke="${ink}" opacity=".14" stroke-width="4"/>`).join('');
    if(['wood','clockwork','blueprint'].includes(kind))backdrop=Array.from({length:13},(_,i)=>`<path d="M0 ${i*30}h600" stroke="${ink}" opacity=".13" stroke-width="${kind==='wood'?4:1}"/>`).join('');
    const hills=['sky','garden','desert','ocean','paper','rooftop'].includes(kind)?`<circle cx="493" cy="66" r="35" fill="#fff3c2" opacity=".8"/><path d="M0 225Q130 90 320 225T600 191V360H0" fill="${alt}" opacity=".25"/><path d="M0 274Q180 180 340 275T600 220V360H0" fill="${alt}" opacity=".35"/>`:'';
    const compositions={fabric:[[65,165,1.3],[255,102,1.9],[474,190,.95]],woven:[[52,145,1.6],[264,114,1.8],[457,175,1.1]],sky:[[42,75,1.6],[230,131,2.1],[470,62,.95]],night:[[77,156,1.6],[273,57,2],[473,213,.75]],wood:[[66,153,1.5],[255,154,1.5],[442,155,1.4]],ceramic:[[66,113,1.3],[228,126,1.95],[445,192,1.2]],ocean:[[52,169,1.45],[250,122,1.8],[468,65,.9]],theatre:[[48,164,1.2],[232,106,2],[457,162,1.25]],blueprint:[[50,164,1.55],[251,140,1.8],[449,190,1.2]]};const positions=compositions[kind]||[[65,174,1.15],[239,104,1.7],[413,174,1.15]];
    return `<svg class="illustrated-scene scene-${kind}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 360" aria-hidden="true"><rect width="600" height="360" fill="${bg}"/>${backdrop}${hills}<ellipse cx="304" cy="301" rx="220" ry="19" fill="${ink}" opacity=".12"/>${t.slice(5).map((name,i)=>`<g class="scene-object object-${i}" transform="translate(${positions[i][0]} ${positions[i][1]}) scale(${positions[i][2]})">${shapes[name]}</g>`).join('')}</svg>`;
  }
  const api={themes,shapes,aliases,sprite,scene};if(typeof module!=='undefined')module.exports=api;root.MiniArtwork=api;
}(typeof window==='undefined'?globalThis:window));
