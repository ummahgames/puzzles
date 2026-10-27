(function (root) {
  'use strict';
  const games = [
    [4, 'puddle-engineers', 'Puddle Engineers', '🌧', '#267d93', 'Turn the gutters. Wake the flowers.', 'Rotate gutters to carry a rain cloud’s water to every thirsty flowerpot.'],
    [7, 'picnic-pairs', 'Picnic Pairs', '🧺', '#a34765', 'A blanket full of little surprises.', 'Turn over picnic blankets and find the things that belong together.'],
    [8, 'cloud-shepherd', 'Cloud Shepherd', '☁', '#397cab', 'Bring a little shape to the sky.', 'Move, merge, and split soft clouds until every outline is filled.'],
    [9, 'mosaic-courtyard', 'Mosaic Courtyard', '✥', '#39776a', 'One tile. A whole new pattern.', 'Slide rows and columns of patterned tiles to restore a courtyard mosaic.'],
    [10, 'carpet-unroll', 'Carpet Unroll', '▤', '#9c5169', 'A room for every little rug.', 'Choose the order to unroll colorful carpets and cover the whole floor.'],
    [12, 'bookworm-caravan', 'Bookworm Caravan', '📚', '#756098', 'Little words travel a long way.', 'Trace neighboring letters to deliver words to the traveling library.'],
    [18, 'folded-worlds', 'Folded Worlds', '◩', '#587995', 'Small folds. Unexpected journeys.', 'Fold a paper landscape to bring paths together, then walk your traveler home.'],
    [19, 'orchard-guardians', 'Orchard Guardians', '🍎', '#527f43', 'Keep the harvest. Make new friends.', 'Place bell posts and snack baskets to send orchard visitors home happy.'],
    [20, 'caravan-breakthrough', 'Caravan Breakthrough', '🐪', '#a26b40', 'Choose your crew. Find your way.', 'Plan a caravan’s departure order and route through a row of clockwork defenses.'],
    [24, 'clockwork-champions', 'Clockwork Champions', '⚙', '#61769e', 'Change your shape. Change the board.', 'Transform a small clockwork team, outmaneuver a guardian, and occupy its workshop.'],
    [31, 'the-borrowed-minute', 'The Borrowed Minute', '⌛', '#81709f', 'Your last steps can lend a hand.', 'Record a path, rewind, and cooperate with your echo to open a way home.'],
    [32, 'shadow-architects', 'Shadow Architects', '◐', '#716858', 'Ordinary things. Extraordinary shadows.', 'Arrange and turn objects so their shadows bridge a traveler’s path.'],
    [35, 'bridgewrights', 'Bridgewrights', '🌉', '#427c84', 'Think in triangles. Cross with care.', 'Join beams into a bridge and test its strength under a moving caravan.']
  ].map(([number, slug, title, icon, color, tagline, description]) => ({number, slug, title, icon, color, tagline, description}));
  games.push(...(typeof module !== 'undefined' ? require('./expansion-catalog.js') : root.MiniExpansionCatalog || []));
  games.sort((a,b)=>a.number-b.number);
  if (typeof module !== 'undefined') module.exports = games;
  root.MiniCatalog = games;
}(typeof window === 'undefined' ? globalThis : window));
