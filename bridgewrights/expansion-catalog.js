(function(root){'use strict';
  const rows=[
    [3,'patchwork-parade','Patchwork Parade','🧵','#ac5f79','Stitch a little celebration.','Fit fabric pieces into animal floats, turn the patches, and send your creation into a parade.'],
    [5,'who-made-that-sound','Who Made That Sound?','🔔','#5b8b79','A little listen. A little discovery.','Listen to friendly neighborhood sounds and discover their sources, with visual clues available.'],
    [11,'pantry-shuffle','Pantry Shuffle','🍯','#b67d40','Make room for a little goodness.','Slide rolling fruit and steady flour sacks around pantry shelves to assemble a recipe.'],
    [13,'match-to-mend','Match to Mend','🪁','#b56b56','Little matches make lovely repairs.','Clear connected groups of materials, let the pieces fall, and repair a neighbor’s treasured object.'],
    [14,'market-crates','Market Crates','🥕','#72934d','A place for every market basket.','Maneuver differently shaped produce crates into their marked market bays.'],
    [15,'lantern-links','Lantern Links','🏮','#a96379','Light a path through the evening.','Connect matching lanterns with winding paths that cannot cross.'],
    [17,'recipe-riddles','Recipe Riddles','🥣','#b87c45','A pinch of thought. A happy guest.','Read a creature’s meal clues and choose ingredients that satisfy all its wishes.'],
    [21,'the-moving-castle','The Moving Castle','🏰','#7d719b','A cozy castle with places to go.','Arrange defenses on a walking castle and guide it through a finite journey of weather and clockwork obstacles.'],
    [22,'bannerfield','Bannerfield','⚑','#66848e','Small teams. Thoughtful moves.','Guide a small squad around a guarded battlefield to capture its banners.'],
    [23,'harbor-hide-and-seek','Harbor Hide-and-Seek','⛵','#498aa3','A quiet harbor full of clues.','Survey a hidden fleet using row and column clues, or let a friend hide the boats.'],
    [25,'companions-of-the-grove','Companions of the Grove','🍃','#638b65','Three friends. A world of teamwork.','Choose moves for a small creature team in gentle turn-based battles.'],
    [26,'lantern-company','Lantern Company','🏮','#88734e','Bring every little light home.','Lead named adventurers through rescue missions on compact tactical maps.'],
    [27,'tiny-siege-workshop','Tiny Siege Workshop','🪜','#947449','A clever crew finds a way.','Assign climbers, diggers, guardians, and builders to a fortress’s obstacles.'],
    [28,'garden-guilds','Garden Guilds','🐞','#7e965b','A little room in the sunshine.','Use beetles, snails, and grasshoppers to claim sunlit patches in a garden board game.'],
    [29,'oasis-council','Oasis Council','🌴','#558a83','Share the water. Grow a village.','Connect water channels, orchards, and homes to build a thriving small oasis.'],
    [30,'forecast-fighters','Forecast Fighters','🌦','#737faf','Read the sky. Plan two steps ahead.','Queue two actions, predict your opponent, and contest the center of a changing arena.'],
    [33,'pocket-post-office','Pocket Post Office','📮','#b36363','Give a tiny cart a thoughtful plan.','Program turns, pickups, and deliveries through a pocket-sized postal route.'],
    [36,'constellation-switchyard','Constellation Switchyard','🚂','#596f98','A clear track through the stars.','Set rail switches and advance star trains one step at a time to their platforms.'],
    [37,'the-honest-the-mistaken-and-the-mixed-up','The Honest, the Mistaken, and the Mixed-Up','🕵','#8f7e5c','Every witness has a point of view.','Translate truthful, reversed, and yesterday-based clues to solve a village mystery.'],
    [38,'gravity-suitcase','Gravity Suitcase','🧳','#98735f','Pack with a little care.','Drop, compress, and settle unusual luggage while keeping fragile souvenirs supported.'],
    [39,'pocket-conservatory','Pocket Conservatory','🌿','#648d68','Make a little world feel at home.','Arrange moisture, shade, and plants around a miniature habitat’s resident creatures.'],
    [40,'cloud-habitat','Cloud Habitat','☁','#6b9fb0','A soft place for the wind to land.','Arrange air currents so wind creatures visit their chimes and find their cloud nests.'],
    [41,'the-traveling-repair-shop','The Traveling Repair Shop','🛠','#ad8057','Old treasures. New little stories.','Repair music boxes, woven baskets, and clocks for visitors along a traveling workshop’s journey.'],
    [42,'one-small-island','One Small Island','🏝','#548e84','Twelve turns. One little community.','Place homes, gardens, paths, and public spaces to complete a finite island settlement.'],
    [43,'storybook-stagehands','Storybook Stagehands','🎭','#9b697e','A little backstage wonder.','Arrange props and cue an imaginative miniature play.'],
    [44,'suitcase-planet','Suitcase Planet','🌎','#5d8d7b','A whole little world in one suitcase.','Move landscape panels to connect isolated neighbors in a tiny diorama.'],
    [45,'the-neighborhood-feast','The Neighborhood Feast','🍲','#b17d50','A place and a plate for everyone.','Share finite ingredients between guests while respecting their food preferences.'],
    [46,'rooftop-ribbon-run','Rooftop Ribbon Run','🪁','#638ba5','A little ribbon on the breeze.','Jump, duck, and glide through finite rooftop delivery courses.'],
    [47,'beetle-ball','Beetle Ball','🐞','#8c9951','A big match for very little players.','Push a seed past a patrolling rival and into the nest in a small garden sport.'],
    [48,'wobble-wagon','Wobble Wagon','🛒','#b88547','Stack it. Steady it. Bring it home.','Balance an awkward load, then choose your pace along a bumpy delivery road.'],
    [49,'two-ends-of-a-scarf','Two Ends of a Scarf','🧣','#a76f7c','A little closer. A little further.','Guide two scarf-linked friends through switches and shared paths.'],
    [50,'please-describe-the-monster','Please Describe the Monster','👾','#8873ad','Quite a creature you have there.','Describe a secret silly creature, rebuild it with a partner, then compare the two.'],
    [51,'stardust-sanctuary','Stardust Sanctuary','🧚','#8778b9','Nectar, moonlight, and tiny wings.','Raise mystical fairies, gather stardust, grow helpful plants, and soothe passing gloom clouds.']
  ];
  const games=rows.map(([number,slug,title,icon,color,tagline,description])=>({number,slug,title,icon,color,tagline,description,expansion:true}));
  if(typeof module!=='undefined')module.exports=games;root.MiniExpansionCatalog=games;
}(typeof window==='undefined'?globalThis:window));
