(function (root, factory) {
  const content = factory();
  if (typeof module === 'object' && module.exports) module.exports = content;
  else root.PhotonContent = content;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const chapters = [
    { name: 'Dawn', subtitle: 'Learn the language of light', color: '#70e4f2', names: ['First light', 'Around the bend', 'Return address', 'Stored sunlight', 'Chain reaction', 'Dawn chorus'] },
    { name: 'Prism', subtitle: 'Find a different angle', color: '#b6a4ff', names: ['Refraction', 'The long way home', 'Glass garden', 'Parallel worlds', 'Crossed paths', 'Prism heart'] },
    { name: 'Eclipse', subtitle: 'Every shield has another side', color: '#ffd38a', names: ['Shadow line', 'Open flank', 'Amber vault', 'Night bloom', 'Two sides', 'Eclipse engine'] },
    { name: 'Nova', subtitle: 'Turn a spark into a constellation', color: '#ff93b1', names: ['Afterglow', 'Light bridge', 'Supercluster', 'Event horizon', 'Last orbit', 'A new star'] },
  ];
  const rewards = {
    photon: { icon: '+', name: 'Photon', description: '+1 photon, starting next volley.', color: '#70e4f2' },
    overcharge: { icon: '↑', name: 'Overcharge', description: '+1 damage for every photon next volley.', color: '#ff93b1' },
    big: { icon: '○', name: 'Wide beam', description: 'Larger photons next volley. Small gaps may close.', color: '#a8ecc4' },
    pierce: { icon: '»', name: 'Phase shift', description: 'Each photon passes through its first two block contacts next volley.', color: '#b6a4ff' },
    laser: { icon: 'ϟ', name: 'Laser', description: 'A piercing beam fires first, with up to four wall banks.', color: '#ffd38a' },
  };
  const upgrades = [
    { id: 'swarm', icon: '✦', name: 'Constellation', description: '+2 photons to every future volley.', cap: 60 },
    { id: 'power', icon: '↑', name: 'Brighter light', description: '+1 base damage. Maximum base damage: 4.', cap: 4 },
    { id: 'bank', icon: '⌁', name: 'Bank interest', description: '+1 damage after every two banks, up to this upgrade’s tier.', cap: 3 },
    { id: 'blast', icon: '◎', name: 'Bloom', description: '+1 damage to explosive and core chain reactions.', cap: 3 },
    { id: 'reserve', icon: '◇', name: 'Second sunrise', description: 'Catch a fatal descent once, clearing threatened rows. Up to two reserves.', cap: 2 },
    { id: 'capacity', icon: '▥', name: 'Light reservoir', description: 'Store one more charge of each consumable. Maximum capacity: 5.', cap: 5 },
  ];
  // Every campaign wave is an explicit eight-cell pattern; . is an open lane.
  // p photon, o overcharge, x pierce, l laser, w wide, b explosive,
  // s shield (protected top), c a two-column core, # ordinary.
  const layouts = [
    ['..p..#..', '.#..#...'],
    ['..##p...', '.#...#..', '..#.#...'],
    ['.#..p.#.', '#..#..#.', '..#..#..'],
    ['..o##...', '.#..p.#.', '#..##...'],
    ['..#b#p..', '.#..#...', '..#b#...'],
    ['.#p..#..', '..#b#...', '#..x..#.', '..#cc...'],
    ['..p..#..', '.#..#.#.', '..#x#...', '#...#...'],
    ['.#...p#.', '..#.#...', '#..w..#.', '..##....'],
    ['.p#..#..', '..#b#...', '#..#..#.', '.#..o#..'],
    ['..#p#...', '#..#..#.', '.x..b...', '..##..#.'],
    ['.#..p.#.', '..#w#...', '#...#..#', '.#b#....', '..#..#..'],
    ['.p..#...', '..#x#...', '#..b..#.', '.#..l#..', '..#cc...'],
    ['..p.s...', '.#..#.#.', '#..x..#.', '..s..#..'],
    ['.p..s.#.', '..#b#...', '#..#..#.', '.x..s...'],
    ['..sp#...', '#..l..#.', '.#b#....', '..s..#..', '.#..#...'],
    ['.p#..s..', '..b#b...', '#..o..#.', '.#..s.#.', '..#x#...'],
    ['..p.s...', '.s..#.#.', '#..w..#.', '..#b#...', '.#..s...'],
    ['.p..s.#.', '..#b#...', '#..x..#.', '.s..l...', '..#cc...'],
    ['..p.b...', '#..s..#.', '.#o.#...', '..b#b...', '.#..#...'],
    ['.p#..#..', '..s.x...', '#..b..#.', '.#..l.#.', '..#w#...'],
    ['..sp#...', '.b#..#b.', '#..o..#.', '..s.x...', '.#b#....'],
    ['.p..s.#.', '..#b#...', '#..l..#.', '.s..x...', '..b#b...', '.#..#...'],
    ['..p.s...', '#..w..#.', '.b#..#b.', '..s.o...', '#..x..#.', '.#b#....'],
    ['.p..s.#.', '..b#b...', '#..l..#.', '.s..x...', '..o#o...', '.#cc.#..'],
  ];
  const lessons = [
    'Aim at a crystal, then fire. All photons share your aim. Surviving crystals descend after the volley.',
    'Try banking off a side wall. A photon inside a pocket can hit several crystals before returning.',
    'The first photon to return chooses your next launch position. Watch the small return marker.',
    'Pickups are stored for the next volley. Overcharge adds one damage to every photon in that volley.',
    'Bloom crystals explode into their neighbors. Clear five crystals in one volley to charge a Nova pulse.',
    'The wide heart sends a chain reaction across the board when it breaks. Clear every wave to finish.',
  ];
  const stages = layouts.map((patterns, index) => {
    const chapter = Math.floor(index / 6), local = index % 6;
    return {
      id: index, chapter, title: chapters[chapter].names[local],
      photons: 3 + chapter + (local >= 4 ? 1 : 0), damage: chapter >= 3 ? 2 : 1,
      openingRows: chapter >= 2 ? 3 : chapter === 1 ? 2 : 1,
      openingOffset: chapter >= 2 ? 3 : 0,
      par: Math.max(2, patterns.length + (chapter >= 2 ? 2 : 0)),
      challenge: local % 2 ? 'Bank at least 8 times during the stage.' : 'Complete the stage without recalling a volley.',
      challengeType: local % 2 ? 'banks' : 'recall',
      lesson: chapter === 0 ? lessons[local] : chapter === 1 ? 'Prism rails reflect light and remain in place. They do not need to be destroyed.' : chapter === 2 ? 'Amber shields resist hits on their top edge. Bank around to strike another face.' : 'Link blooms and hearts. Five clears in a volley charge +1 damage for the next volley.',
      waves: patterns.map((pattern, wave) => {
        const cells = [];
        for (let column = 0; column < 8; column++) {
          const symbol = pattern[column];
          if (!symbol || symbol === '.') continue;
          if (symbol === 'c' && pattern[column - 1] === 'c') continue;
          const type = symbol === 'b' ? 'bomb' : symbol === 's' ? 'shield' : symbol === 'c' ? 'core' : 'normal';
          const hp = type === 'core' ? 6 + chapter * 4 : 1 + chapter * 2 + (wave > 1 ? 1 : 0) + (type === 'shield' ? 1 : 0);
          const reward = ({ p: 'photon', o: 'overcharge', x: 'pierce', l: 'laser', w: 'big' })[symbol] || null;
          cells.push({ column, type, hp, reward, wide: type === 'core' });
        }
        return cells;
      }),
      // Rails live below the danger line, so descending crystals never overlap them.
      rails: chapter > 0 ? (local % 2 ? [{ column: 1, row: 18, flip: true }, { column: 6, row: 18, flip: false }] : [{ column: 3, row: 18, flip: false }]) : [],
    };
  });
  const survivalPatterns = ['##..###.', '.###..##', '#.#..#.#', '..####..', '#..##..#', '.##.##..', '##.#..#.', '.#..###.'];
  function validate() {
    if (stages.length !== 24) throw new Error('Campaign must contain 24 stages.');
    for (const stage of stages) {
      if (stage.waves.length < 1 || stage.waves.length > 8) throw new Error('Invalid wave schedule.');
      for (const wave of stage.waves) {
        const occupied = new Set();
        for (const cell of wave) {
          if (!Number.isInteger(cell.column) || cell.column < 0 || cell.column + (cell.wide ? 1 : 0) > 7 || !Number.isInteger(cell.hp) || cell.hp < 1 || cell.hp > 100) throw new Error('Invalid campaign cell.');
          for (let col = cell.column; col <= cell.column + (cell.wide ? 1 : 0); col++) {
            if (occupied.has(col)) throw new Error('Overlapping campaign cells.');
            occupied.add(col);
          }
          if (cell.reward && !rewards[cell.reward]) throw new Error('Unknown reward.');
        }
      }
    }
    return true;
  }
  validate();
  return { chapters, stages, rewards, upgrades, survivalPatterns, validate };
});
