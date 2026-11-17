'use strict';

const MAX_LEVEL = 100;
const MAX_XP = 1_000_000;
const XP_PER_LINE = 10;
const XP_PER_PIECE = [4, 1, 3, 2, 2, 3, 3];
const BATTLE_PASS_CREDIT_REWARD_EVERY = 4;
const BATTLE_PASS_CREDIT_REWARD_AMOUNT = 100;
const BATTLE_PASS_CREDIT_REWARD_LEVELS = [
  4, 8, 12, 16, 19, 24, 28, 32, 36, 39, 44, 48, 52,
  56, 59, 64, 68, 72, 76, 79, 84, 88, 92, 96, 100
];
const LEGACY_BATTLE_PASS_CREDIT_REWARD_LEVELS = Array.from(
  { length: MAX_LEVEL / BATTLE_PASS_CREDIT_REWARD_EVERY },
  (_, index) => (index + 1) * BATTLE_PASS_CREDIT_REWARD_EVERY
);
const XP_BOOST_REWARD_LEVELS = [
  [3, 3], [7, 7], [13, 13], [18, 18], [23, 23], [27, 28],
  [33, 33], [38, 38], [43, 43], [47, 48], [53, 53], [58, 58],
  [63, 63], [67, 68], [73, 73], [78, 78], [83, 83], [87, 88],
  [93, 93], [97, 100], [98, 98]
];
const XP_BOOST_LEVELS = XP_BOOST_REWARD_LEVELS.map(([level]) => level);
const XP_BOOST_DURATION_MS = 20 * 60 * 1000;
const XP_BOOST_BONUS = 5;
const XP_BOOST_IMAGE =
  '/boost%20xp/Embl%C3%A8me%20XP%20dor%C3%A9%20X2%20n%C3%A9on.png';
const BATTLE_PASS_SKIN_REWARDS = [
  { level: 5, itemId: 'redbull', type: 'skin', name: 'Red Bull' },
  ...Array.from({ length: 19 }, (_, index) => {
    const skinNumber = index + 2;
    return {
      level: skinNumber === 20 ? 99 : skinNumber * 5,
      itemId: `skin-${String(skinNumber).padStart(2, '0')}`,
      type: 'skin',
      name: `Skin ${skinNumber}`
    };
  })
];
const BATTLE_PASS_LOADING_SCREEN_REWARDS = [
  {
    level: 2,
    itemId: 'loading-screen-bp-01',
    type: 'loading-screen',
    category: 'loading-screen',
    name: 'Tétris néon sous un ciel cosmique',
    imageUrl: '/Batll%20Pass%20ecran%20chargement/T%C3%A9tris%20n%C3%A9on%20sous%20un%20ciel%20cosmique.png'
  },
  {
    level: 6,
    itemId: 'loading-screen-bp-02',
    type: 'loading-screen',
    category: 'loading-screen',
    name: 'Trône néon aux blocs violets',
    imageUrl: '/Batll%20Pass%20ecran%20chargement/Tr%C3%B4ne%20n%C3%A9on%20aux%20blocs%20violets.png'
  },
  {
    level: 11,
    itemId: 'loading-screen-bp-03',
    type: 'loading-screen',
    category: 'loading-screen',
    name: 'Tempête néon et vortex de Tétris',
    imageUrl: '/Batll%20Pass%20ecran%20chargement/Temp%C3%AAte%20n%C3%A9on%20et%20vortex%20de%20T%C3%A9tris.png'
  },
  {
    level: 17,
    itemId: 'loading-screen-bp-04',
    type: 'loading-screen',
    category: 'loading-screen',
    name: 'Numéro 93 en style course grunge',
    imageUrl: '/Batll%20Pass%20ecran%20chargement/Num%C3%A9ro%2093%20en%20style%20course%20grunge.png'
  },
  {
    level: 21,
    itemId: 'loading-screen-bp-05',
    type: 'loading-screen',
    category: 'loading-screen',
    name: 'Forêt enchantée aux blocs néon',
    imageUrl: '/Batll%20Pass%20ecran%20chargement/For%C3%AAt%20enchant%C3%A9e%20aux%20blocs%20n%C3%A9on.png'
  },
  {
    level: 26,
    itemId: 'loading-screen-bp-06',
    type: 'loading-screen',
    category: 'loading-screen',
    name: 'Collage lumineux de blocs Tetris',
    imageUrl: '/Batll%20Pass%20ecran%20chargement/Collage%20lumineux%20de%20blocs%20Tetris.png'
  },
  {
    level: 31,
    itemId: 'loading-screen-bp-07',
    type: 'loading-screen',
    category: 'loading-screen',
    name: 'Coffret de Saint-Valentin dans les nuages',
    imageUrl: '/Batll%20Pass%20ecran%20chargement/Coffret%20de%20Saint-Valentin%20dans%20les%20nuages.png'
  },
  {
    level: 37,
    itemId: 'loading-screen-bp-08',
    type: 'loading-screen',
    category: 'loading-screen',
    name: 'Blocs Tetris métalliques Red Bull',
    imageUrl: '/Batll%20Pass%20ecran%20chargement/Blocs%20Tetris%20m%C3%A9talliques%20Red%20Bull.png'
  },
  {
    level: 41,
    itemId: 'loading-screen-bp-09',
    type: 'loading-screen',
    category: 'loading-screen',
    name: 'Arcade Tetris festif et coloré',
    imageUrl: '/Batll%20Pass%20ecran%20chargement/Arcade%20Tetris%20festif%20et%20color%C3%A9.png'
  }
];
const BATTLE_PASS_MUSIC_REWARDS = [
  {
    level: 1, itemId: 'music-bp-01', type: 'music', category: 'music',
    name: 'High Score', audioUrl: '/Batll%20Pass%20musique/17-high-scoremp3.mp3',
    imageUrl: '/Batll%20Pass%20musique/Ic%C3%B4ne%20n%C3%A9on%20de%20notes%20musicales.png'
  },
  {
    level: 9, itemId: 'music-bp-02', type: 'music', category: 'music',
    name: 'Pixel Rush', audioUrl: '/Batll%20Pass%20musique/19-sfx.mp3',
    imageUrl: '/Batll%20Pass%20musique/Ic%C3%B4ne%20n%C3%A9on%20de%20notes%20musicales.png'
  },
  {
    level: 14, itemId: 'music-bp-03', type: 'music', category: 'music',
    name: 'Neon Sprint', audioUrl: '/Batll%20Pass%20musique/20-sfx.mp3',
    imageUrl: '/Batll%20Pass%20musique/Ic%C3%B4ne%20n%C3%A9on%20de%20notes%20musicales.png'
  },
  {
    level: 16, itemId: 'music-bp-04', type: 'music', category: 'music',
    name: 'Arcade Pulse', audioUrl: '/Batll%20Pass%20musique/23-sfx.mp3',
    imageUrl: '/Batll%20Pass%20musique/Ic%C3%B4ne%20n%C3%A9on%20de%20notes%20musicales.png'
  },
  {
    level: 22, itemId: 'music-bp-05', type: 'music', category: 'music',
    name: 'Last Drop', audioUrl: '/Batll%20Pass%20musique/33-sfx.mp3',
    imageUrl: '/Batll%20Pass%20musique/Ic%C3%B4ne%20n%C3%A9on%20de%20notes%20musicales.png'
  },
  {
    level: 29, itemId: 'music-bp-06', type: 'music', category: 'music',
    name: 'Terre Calme', audioUrl: '/Batll%20Pass%20musique/harmonious-earth_88300.mp3',
    imageUrl: '/Batll%20Pass%20musique/Ic%C3%B4ne%20n%C3%A9on%20de%20notes%20musicales.png'
  },
  {
    level: 34, itemId: 'music-bp-07', type: 'music', category: 'music',
    name: 'Nouvel Élan', audioUrl: '/Batll%20Pass%20musique/inspiring-business-vibes_88287.mp3',
    imageUrl: '/Batll%20Pass%20musique/Ic%C3%B4ne%20n%C3%A9on%20de%20notes%20musicales.png'
  },
  {
    level: 39, itemId: 'music-bp-08', type: 'music', category: 'music',
    name: 'Optimisme', audioUrl: '/Batll%20Pass%20musique/optimistic-professionalism_88726.mp3',
    imageUrl: '/Batll%20Pass%20musique/Ic%C3%B4ne%20n%C3%A9on%20de%20notes%20musicales.png'
  },
  {
    level: 42, itemId: 'music-bp-09', type: 'music', category: 'music',
    name: 'Triomphe', audioUrl: '/Batll%20Pass%20musique/path-to-triumph_88293.mp3',
    imageUrl: '/Batll%20Pass%20musique/Ic%C3%B4ne%20n%C3%A9on%20de%20notes%20musicales.png'
  }
];
const BATTLE_PASS_XP_BOOST_REWARDS = XP_BOOST_REWARD_LEVELS.map(([level, itemLevel]) => ({
  level,
  itemId: `xp-boost-level-${itemLevel}`,
  type: 'xp-boost',
  category: 'xp-boost',
  name: 'Boost XP +5',
  durationMs: XP_BOOST_DURATION_MS,
  bonusXp: XP_BOOST_BONUS,
  imageUrl: XP_BOOST_IMAGE,
  quantity: 1,
  usedQuantity: 0
}));
const BATTLE_PASS_ITEM_REWARDS = [
  ...BATTLE_PASS_SKIN_REWARDS,
  ...BATTLE_PASS_XP_BOOST_REWARDS,
  ...BATTLE_PASS_LOADING_SCREEN_REWARDS,
  ...BATTLE_PASS_MUSIC_REWARDS
];

function getXpBoostedAward(baseXp, active = true) {
  if (!Number.isSafeInteger(baseXp) || baseXp < 0) {
    throw new TypeError('Invalid base XP award.');
  }
  return baseXp + (active && baseXp > 0 ? XP_BOOST_BONUS : 0);
}

function getXpBoostRemainingMs(state, now = Date.now()) {
  if (!state?.activeBoostId) return 0;
  if (state.activeExpiresAt?.toMillis) {
    return Math.max(0, Math.min(
      state.activeRemainingMs || XP_BOOST_DURATION_MS,
      state.activeExpiresAt.toMillis() - now
    ));
  }
  return Number.isSafeInteger(state.activeRemainingMs)
    ? Math.max(0, Math.min(state.activeRemainingMs, XP_BOOST_DURATION_MS)) : 0;
}

const thresholds = [0, 0, 300, 900, 2_400];
// The 96 remaining costs rise by about 185 XP each and sum exactly to the level-100 target.
for (let level = 5; level <= MAX_LEVEL; level++) {
  const index = level - 5;
  const adjustment = Math.floor((index + 1) * 16 / 96) - Math.floor(index * 16 / 96);
  thresholds[level] = thresholds[level - 1] + 1_604 + 185 * index + adjustment;
}

function getProgression(totalXp) {
  const xp = Math.max(0, Math.min(MAX_XP, Math.floor(Number(totalXp) || 0)));
  let level = 1;
  while (level < MAX_LEVEL && xp >= thresholds[level + 1]) level++;
  const xpForNextLevel = level === MAX_LEVEL ? 0 : thresholds[level + 1] - thresholds[level];
  return {
    xp,
    level,
    xpIntoLevel: level === MAX_LEVEL ? 0 : xp - thresholds[level],
    xpForNextLevel,
    xpToNextLevel: level === MAX_LEVEL ? 0 : thresholds[level + 1] - xp
  };
}

function getXpForLines(lines) {
  if (!Number.isInteger(lines) || lines < 0) throw new TypeError('Invalid cleared-line count.');
  return lines * XP_PER_LINE;
}

function getXpForPiece(shapeIndex) {
  if (!Number.isInteger(shapeIndex) || shapeIndex < 0 || shapeIndex >= XP_PER_PIECE.length) {
    throw new TypeError('Invalid Tetris piece.');
  }
  return XP_PER_PIECE[shapeIndex];
}

function getUnclaimedBattlePassCreditLevels(level, claimedLevels = []) {
  if (!Number.isSafeInteger(level) || level < 1 || level > MAX_LEVEL) {
    throw new TypeError('Invalid Battle Pass level.');
  }
  const validHistoryLevels = new Set([
    ...BATTLE_PASS_CREDIT_REWARD_LEVELS,
    ...LEGACY_BATTLE_PASS_CREDIT_REWARD_LEVELS
  ]);
  if (!Array.isArray(claimedLevels) ||
      claimedLevels.some(claimedLevel => !validHistoryLevels.has(claimedLevel))) {
    throw new TypeError('Invalid Battle Pass credit reward history.');
  }
  const claimed = new Set(claimedLevels);
  for (const [legacyLevel, currentLevel] of [[20, 19], [40, 39], [60, 59], [80, 79]]) {
    if (claimed.has(legacyLevel)) claimed.add(currentLevel);
  }
  const unclaimed = [];
  for (const rewardLevel of BATTLE_PASS_CREDIT_REWARD_LEVELS) {
    if (rewardLevel > level) continue;
    if (!claimed.has(rewardLevel)) unclaimed.push(rewardLevel);
  }
  return unclaimed;
}

function getUnclaimedBattlePassItemRewards(level, ownedItemIds = []) {
  if (!Number.isSafeInteger(level) || level < 1 || level > MAX_LEVEL) {
    throw new TypeError('Invalid Battle Pass level.');
  }
  if (!Array.isArray(ownedItemIds) || ownedItemIds.some(itemId => typeof itemId !== 'string')) {
    throw new TypeError('Invalid Battle Pass item ownership.');
  }
  const owned = new Set(ownedItemIds);
  return BATTLE_PASS_ITEM_REWARDS
    .filter(reward => reward.level <= level && !owned.has(reward.itemId))
    .map(reward => ({ ...reward }));
}

function addBattlePassCreditRewards(currentCredits, rewardCount) {
  if (!Number.isSafeInteger(currentCredits) || currentCredits < 0 ||
      !Number.isSafeInteger(rewardCount) || rewardCount < 0 ||
      rewardCount > Math.floor(MAX_LEVEL / BATTLE_PASS_CREDIT_REWARD_EVERY)) {
    throw new TypeError('Invalid Battle Pass credit reward balance.');
  }
  const updatedCredits = currentCredits + rewardCount * BATTLE_PASS_CREDIT_REWARD_AMOUNT;
  if (!Number.isSafeInteger(updatedCredits)) {
    throw new TypeError('Battle Pass credit reward balance exceeds the supported limit.');
  }
  return updatedCredits;
}

function getBattlePassRewardPlan(level, currentCredits, claimedCreditLevels = [], ownedItemIds = []) {
  const creditLevels = getUnclaimedBattlePassCreditLevels(level, claimedCreditLevels);
  const itemRewards = getUnclaimedBattlePassItemRewards(level, ownedItemIds);
  const creditsGranted = creditLevels.length * BATTLE_PASS_CREDIT_REWARD_AMOUNT;
  return {
    creditsGranted,
    credits: creditsGranted > 0
      ? addBattlePassCreditRewards(currentCredits, creditLevels.length)
      : currentCredits,
    claimedCreditLevels: [...new Set([...claimedCreditLevels, ...creditLevels])].sort((a, b) => a - b),
    itemRewards
  };
}

module.exports = {
  MAX_LEVEL, MAX_XP, XP_PER_LINE, XP_PER_PIECE, thresholds,
  BATTLE_PASS_CREDIT_REWARD_EVERY, BATTLE_PASS_CREDIT_REWARD_AMOUNT,
  BATTLE_PASS_CREDIT_REWARD_LEVELS, LEGACY_BATTLE_PASS_CREDIT_REWARD_LEVELS,
  XP_BOOST_LEVELS, XP_BOOST_DURATION_MS, XP_BOOST_BONUS, XP_BOOST_IMAGE,
  BATTLE_PASS_SKIN_REWARDS, BATTLE_PASS_XP_BOOST_REWARDS,
  BATTLE_PASS_LOADING_SCREEN_REWARDS, BATTLE_PASS_MUSIC_REWARDS,
  BATTLE_PASS_ITEM_REWARDS,
  getUnclaimedBattlePassItemRewards,
  getProgression, getXpForLines, getXpForPiece, getXpBoostedAward, getXpBoostRemainingMs,
  getUnclaimedBattlePassCreditLevels,
  addBattlePassCreditRewards, getBattlePassRewardPlan
};
