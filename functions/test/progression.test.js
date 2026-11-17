'use strict';

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const {
  MAX_LEVEL, MAX_XP, XP_PER_PIECE, thresholds, getProgression, getXpForLines,
  getXpForPiece, getUnclaimedBattlePassCreditLevels, getUnclaimedBattlePassItemRewards,
  addBattlePassCreditRewards, getBattlePassRewardPlan, BATTLE_PASS_SKIN_REWARDS,
  BATTLE_PASS_LOADING_SCREEN_REWARDS, BATTLE_PASS_MUSIC_REWARDS,
  BATTLE_PASS_XP_BOOST_REWARDS, XP_BOOST_LEVELS, BATTLE_PASS_CREDIT_REWARD_LEVELS,
  XP_BOOST_DURATION_MS,
  XP_BOOST_BONUS, getXpBoostedAward, getXpBoostRemainingMs
} = require('../src/progression');

test('keeps the requested first three thresholds', () => {
  assert.equal(thresholds[2], 300);
  assert.equal(thresholds[3], 900);
  assert.equal(thresholds[4], 2_400);
});

test('Firestore rule XP thresholds match every Battle Pass item and credit reward level', () => {
  const rules = readFileSync(path.join(__dirname, '../../firestore.rules'), 'utf8');
  const helper = rules.match(/function battlePassXpThreshold\(level\) \{([\s\S]*?)\n    \}/);
  assert.ok(helper, 'the Firestore threshold helper exists');
  const actual = [...helper[1].matchAll(/level == (\d+) \? (\d+)/g)]
    .map(([, level, xp]) => [Number(level), Number(xp)]);
  const rewardLevels = [...new Set([
    ...BATTLE_PASS_CREDIT_REWARD_LEVELS,
    ...BATTLE_PASS_SKIN_REWARDS.map(reward => reward.level),
    ...BATTLE_PASS_LOADING_SCREEN_REWARDS.map(reward => reward.level),
    ...BATTLE_PASS_MUSIC_REWARDS.map(reward => reward.level),
    ...XP_BOOST_LEVELS
  ])].sort((left, right) => left - right);
  assert.deepEqual(actual, rewardLevels.map(level => [level, thresholds[level]]));
});

test('Firestore rules match each loading-screen Battle Pass reward and image', () => {
  const rules = readFileSync(path.join(__dirname, '../../firestore.rules'), 'utf8');
  const app = readFileSync(path.join(__dirname, '../../tetris_app.js'), 'utf8');
  const levelHelper = rules.match(
    /function battlePassLoadingScreenLevel\(itemId\) \{([\s\S]*?)\n    \}/
  );
  const imageHelper = rules.match(
    /function battlePassLoadingScreenImage\(itemId\) \{([\s\S]*?)\n    \}/
  );
  assert.ok(levelHelper, 'the loading-screen level helper exists');
  assert.ok(imageHelper, 'the loading-screen image helper exists');
  assert.deepEqual(
    [...levelHelper[1].matchAll(/itemId == '([^']+)' \? (\d+)/g)]
      .map(([, itemId, level]) => [itemId, Number(level)]),
    BATTLE_PASS_LOADING_SCREEN_REWARDS.map(reward => [reward.itemId, reward.level])
  );
  for (const reward of BATTLE_PASS_LOADING_SCREEN_REWARDS) {
    assert.ok(imageHelper[1].includes(reward.imageUrl));
    assert.ok(app.includes(
      `level: ${reward.level}, itemId: '${reward.itemId}', name: '${reward.name}', image: '${reward.imageUrl}'`
    ));
    readFileSync(path.join(
      __dirname, '../..', decodeURIComponent(reward.imageUrl.slice(1))
    ));
  }
});

test('Firestore rules match each music Battle Pass reward and its media files', () => {
  const rules = readFileSync(path.join(__dirname, '../../firestore.rules'), 'utf8');
  const app = readFileSync(path.join(__dirname, '../../tetris_app.js'), 'utf8');
  const levelHelper = rules.match(
    /function battlePassMusicLevel\(itemId\) \{([\s\S]*?)\n    \}/
  );
  const audioHelper = rules.match(
    /function battlePassMusicAudioUrl\(itemId\) \{([\s\S]*?)\n    \}/
  );
  assert.ok(levelHelper, 'the music level helper exists');
  assert.ok(audioHelper, 'the music audio helper exists');
  assert.deepEqual(
    [...levelHelper[1].matchAll(/itemId == '([^']+)' \? (\d+)/g)]
      .map(([, itemId, level]) => [itemId, Number(level)]),
    BATTLE_PASS_MUSIC_REWARDS.map(reward => [reward.itemId, reward.level])
  );
  assert.deepEqual(
    BATTLE_PASS_MUSIC_REWARDS.map(reward => Math.ceil(reward.level / 5)),
    [1, 2, 3, 4, 5, 6, 7, 8, 9]
  );
  for (const reward of BATTLE_PASS_MUSIC_REWARDS) {
    assert.ok(audioHelper[1].includes(reward.audioUrl));
    assert.ok(app.includes(
      `level: ${reward.level}, itemId: '${reward.itemId}', name: '${reward.name}', audioUrl: '${reward.audioUrl}'`
    ));
    readFileSync(path.join(
      __dirname, '../..', decodeURIComponent(reward.audioUrl.slice(1))
    ));
    readFileSync(path.join(
      __dirname, '../..', decodeURIComponent(reward.imageUrl.slice(1))
    ));
  }
  assert.match(app, /\.\.\.\(reward\.audioUrl \? \{ audioUrl: reward\.audioUrl \} : \{\}\)/);
});

test('Firestore direct-game rule derives the same XP threshold for every player level', () => {
  const rules = readFileSync(path.join(__dirname, '../../firestore.rules'), 'utf8');
  assert.match(rules, /function progressionXpThreshold\(level\)/);
  assert.match(rules, /function progressionLevelMatches\(xp, level\)/);
  for (let level = 1; level <= MAX_LEVEL; level++) {
    const threshold = level < 2 ? 0
      : level === 2 ? 300
        : level === 3 ? 900
          : level === 4 ? 2_400
            : 2_400 + 1_604 * (level - 4) +
              185 * (level - 5) * (level - 4) / 2 +
              Math.floor((level - 4) / 6);
    assert.equal(threshold, thresholds[level], `level ${level}`);
  }
});

test('Firestore rules use the expected item ID and level for all 20 skins', () => {
  const rules = readFileSync(path.join(__dirname, '../../firestore.rules'), 'utf8');
  const helper = rules.match(/function battlePassSkinLevel\(itemId\) \{([\s\S]*?)\n    \}/);
  assert.ok(helper, 'the Firestore skin level helper exists');
  const actual = [...helper[1].matchAll(/itemId == '([^']+)' \? (\d+)/g)]
    .map(([, itemId, level]) => [itemId, Number(level)]);
  assert.deepEqual(actual, BATTLE_PASS_SKIN_REWARDS.map(reward =>
    [reward.itemId, reward.level]
  ));
});

test('uses a strictly increasing curve and reaches level 100 at exactly one million XP', () => {
  for (let level = 2; level < MAX_LEVEL; level++) {
    assert.ok(thresholds[level + 1] > thresholds[level]);
  }
  assert.equal(thresholds[MAX_LEVEL], MAX_XP);
});

test('crosses levels 1 to 2, 2 to 3, 3 to 4, and 99 to 100 at exact boundaries', () => {
  assert.equal(getProgression(299).level, 1);
  assert.equal(getProgression(300).level, 2);
  assert.equal(getProgression(899).level, 2);
  assert.equal(getProgression(900).level, 3);
  assert.equal(getProgression(2_399).level, 3);
  assert.equal(getProgression(2_400).level, 4);
  assert.equal(getProgression(thresholds[100] - 1).level, 99);
  assert.equal(getProgression(thresholds[100]).level, 100);
});

test('reports current-level XP and caps the displayed progression at level 100', () => {
  assert.deepEqual(getProgression(450), {
    xp: 450, level: 2, xpIntoLevel: 150, xpForNextLevel: 600, xpToNextLevel: 450
  });
  assert.deepEqual(getProgression(2_400), {
    xp: 2_400, level: 4, xpIntoLevel: 0, xpForNextLevel: thresholds[5] - thresholds[4],
    xpToNextLevel: thresholds[5] - thresholds[4]
  });
  assert.equal(getProgression(1_100_000).xp, MAX_XP);
  assert.equal(getProgression(MAX_XP).level, MAX_LEVEL);
});

test('awards 10 XP per server-validated line', () => {
  assert.equal(getXpForLines(1), 10);
  assert.equal(getXpForLines(4), 40);
  assert.throws(() => getXpForLines(-1), /Invalid cleared-line count/);
});

test('awards between 1 and 4 XP for every placed piece', () => {
  for (let index = 0; index < XP_PER_PIECE.length; index++) {
    assert.equal(getXpForPiece(index), XP_PER_PIECE[index]);
    assert.ok(getXpForPiece(index) >= 1 && getXpForPiece(index) <= 4);
  }
  assert.throws(() => getXpForPiece(XP_PER_PIECE.length), /Invalid Tetris piece/);
});

test('adds earned match XP to account progression and derives the Battle Pass level', () => {
  const updated = getProgression(280 + 45);
  assert.equal(updated.xp, 325);
  assert.equal(updated.level, 2);
});

test('grants one 100-credit reward at each configured level through level 100', () => {
  const levels = getUnclaimedBattlePassCreditLevels(100);
  assert.equal(levels.length, 25);
  assert.deepEqual(levels, BATTLE_PASS_CREDIT_REWARD_LEVELS);
  assert.equal(levels.length * 100, 2_500);
});

test('moves overlapping Battle Pass rewards without placing two on one level', () => {
  const allRewardLevels = [
    ...BATTLE_PASS_CREDIT_REWARD_LEVELS,
    ...BATTLE_PASS_SKIN_REWARDS.map(reward => reward.level),
    ...BATTLE_PASS_XP_BOOST_REWARDS.map(reward => reward.level),
    ...BATTLE_PASS_LOADING_SCREEN_REWARDS.map(reward => reward.level)
  ];
  assert.equal(new Set(allRewardLevels).size, allRewardLevels.length);
  assert.equal(BATTLE_PASS_LOADING_SCREEN_REWARDS.length, 9);
  assert.equal(new Set(BATTLE_PASS_LOADING_SCREEN_REWARDS.map(reward =>
    reward.imageUrl)).size, 9);
  assert.equal(BATTLE_PASS_CREDIT_REWARD_LEVELS.includes(19), true);
  assert.equal(BATTLE_PASS_CREDIT_REWARD_LEVELS.includes(20), false);
  assert.equal(BATTLE_PASS_CREDIT_REWARD_LEVELS.includes(28), true);
  assert.equal(BATTLE_PASS_XP_BOOST_REWARDS.some(reward => reward.level === 27), true);
  assert.equal(BATTLE_PASS_XP_BOOST_REWARDS.some(reward => reward.level === 28), false);
  assert.equal(BATTLE_PASS_SKIN_REWARDS.at(-1).level, 99);
  assert.deepEqual(
    getUnclaimedBattlePassCreditLevels(20, [20]),
    [4, 8, 12, 16]
  );
});

test('returns only unclaimed Battle Pass credit reward levels', () => {
  assert.deepEqual(getUnclaimedBattlePassCreditLevels(12, [4, 8]), [12]);
  assert.deepEqual(getUnclaimedBattlePassCreditLevels(8, [4, 8]), []);
  assert.deepEqual(getUnclaimedBattlePassCreditLevels(13, [4, 8]), [12]);
  assert.throws(() => getUnclaimedBattlePassCreditLevels(100, [5]),
    /Invalid Battle Pass credit reward history/);
});

test('preserves the configured rewards at levels 1, 4, 5, and across multiple levels', () => {
  assert.deepEqual(getUnclaimedBattlePassCreditLevels(1), []);
  assert.deepEqual(getUnclaimedBattlePassItemRewards(1),
    BATTLE_PASS_MUSIC_REWARDS.filter(reward => reward.level <= 1));

  assert.deepEqual(getUnclaimedBattlePassCreditLevels(4), [4]);
  assert.deepEqual(getUnclaimedBattlePassItemRewards(4),
    [
      ...BATTLE_PASS_XP_BOOST_REWARDS.filter(reward => reward.level <= 4),
      ...BATTLE_PASS_LOADING_SCREEN_REWARDS.filter(reward => reward.level <= 4),
      ...BATTLE_PASS_MUSIC_REWARDS.filter(reward => reward.level <= 4)
    ]);

  assert.deepEqual(getUnclaimedBattlePassCreditLevels(5), [4]);
  assert.deepEqual(getUnclaimedBattlePassItemRewards(5), [
    ...BATTLE_PASS_SKIN_REWARDS.filter(reward => reward.level <= 5),
    ...BATTLE_PASS_XP_BOOST_REWARDS.filter(reward => reward.level <= 5),
    ...BATTLE_PASS_LOADING_SCREEN_REWARDS.filter(reward => reward.level <= 5),
    ...BATTLE_PASS_MUSIC_REWARDS.filter(reward => reward.level <= 5)
  ]);

  assert.deepEqual(getUnclaimedBattlePassCreditLevels(13), [4, 8, 12]);
  assert.deepEqual(getUnclaimedBattlePassItemRewards(13), [
    ...BATTLE_PASS_SKIN_REWARDS.filter(reward => reward.level <= 13),
    ...BATTLE_PASS_XP_BOOST_REWARDS.filter(reward => reward.level <= 13),
    ...BATTLE_PASS_LOADING_SCREEN_REWARDS.filter(reward => reward.level <= 13),
    ...BATTLE_PASS_MUSIC_REWARDS.filter(reward => reward.level <= 13)
  ]);
  assert.deepEqual(getUnclaimedBattlePassCreditLevels(13, [4, 8]), [12]);
  assert.deepEqual(getUnclaimedBattlePassItemRewards(13, ['redbull']), [
    ...BATTLE_PASS_SKIN_REWARDS.filter(reward =>
      reward.level <= 13 && reward.itemId !== 'redbull'),
    ...BATTLE_PASS_XP_BOOST_REWARDS.filter(reward => reward.level <= 13),
    ...BATTLE_PASS_LOADING_SCREEN_REWARDS.filter(reward => reward.level <= 13),
    ...BATTLE_PASS_MUSIC_REWARDS.filter(reward => reward.level <= 13)
  ]);
});

test('unlocks all 20 skins at their exact levels and never before them', () => {
  const skins = BATTLE_PASS_SKIN_REWARDS;

  for (const skin of skins) {
    assert.deepEqual(getUnclaimedBattlePassItemRewards(skin.level - 1)
      .filter(reward => reward.type === 'skin'),
      skins.filter(reward => reward.level < skin.level));
    assert.deepEqual(getUnclaimedBattlePassItemRewards(skin.level)
      .filter(reward => reward.type === 'skin'),
      skins.filter(reward => reward.level <= skin.level));
    assert.deepEqual(getUnclaimedBattlePassItemRewards(Math.min(100, skin.level + 1))
      .filter(reward => reward.type === 'skin'),
      skins.filter(reward => reward.level <= skin.level));
  }
  assert.deepEqual(
    getUnclaimedBattlePassItemRewards(100, skins.map(skin => skin.itemId)),
    [
      ...BATTLE_PASS_XP_BOOST_REWARDS,
      ...BATTLE_PASS_LOADING_SCREEN_REWARDS,
      ...BATTLE_PASS_MUSIC_REWARDS
    ]
  );
});

test('grants one idempotent 20-minute +5 XP boost at each requested Battle Pass level', () => {
  assert.deepEqual(BATTLE_PASS_XP_BOOST_REWARDS.map(reward => reward.level), XP_BOOST_LEVELS);
  assert.equal(new Set(BATTLE_PASS_XP_BOOST_REWARDS.map(reward => reward.itemId)).size, 21);
  const levelSevenBoost = BATTLE_PASS_XP_BOOST_REWARDS.find(reward => reward.level === 7);
  assert.equal(levelSevenBoost.itemId, 'xp-boost-level-7');
  assert.ok(!BATTLE_PASS_XP_BOOST_REWARDS.some(reward => reward.level === 8));
  for (const reward of BATTLE_PASS_XP_BOOST_REWARDS) {
    assert.equal(reward.type, 'xp-boost');
    assert.equal(reward.durationMs, XP_BOOST_DURATION_MS);
    assert.equal(reward.bonusXp, XP_BOOST_BONUS);
    assert.equal(reward.quantity, 1);
    assert.equal(reward.usedQuantity, 0);
    assert.ok(reward.imageUrl.includes('Embl%C3%A8me%20XP'));
    assert.ok(!getUnclaimedBattlePassItemRewards(reward.level - 1)
      .some(item => item.itemId === reward.itemId));
    assert.ok(getUnclaimedBattlePassItemRewards(reward.level)
      .some(item => item.itemId === reward.itemId));
  }
  assert.equal(getUnclaimedBattlePassItemRewards(100).length, 59);
  assert.ok(getUnclaimedBattlePassItemRewards(
    100, getUnclaimedBattlePassItemRewards(100).map(reward => reward.itemId)
  ).length === 0);
});

test('adds a fixed +5 XP to each positive XP award, never a multiplier', () => {
  assert.deepEqual([1, 2, 3, 4, 10].map(xp => getXpBoostedAward(xp)), [6, 7, 8, 9, 15]);
  assert.equal(getXpBoostedAward(0), 0);
  assert.equal(getXpBoostedAward(10, false), 10);
  assert.throws(() => getXpBoostedAward(-1), /Invalid base XP award/);
});

test('preserves paused boost time and counts it down only while a game is active', () => {
  const pausedState = {
    activeBoostId: 'xp-boost-level-3',
    activeRemainingMs: 900_000,
    activeExpiresAt: null
  };
  assert.equal(getXpBoostRemainingMs(pausedState, 10_000), 900_000);
  assert.equal(getXpBoostRemainingMs(structuredClone(pausedState), 90_000_000), 900_000);

  const runningState = {
    ...pausedState,
    activeExpiresAt: { toMillis: () => 10_000 + 900_000 }
  };
  assert.equal(getXpBoostRemainingMs(runningState, 10_000), 900_000);
  assert.equal(getXpBoostRemainingMs(runningState, 10_000 + 123_000), 777_000);
  assert.equal(getXpBoostRemainingMs(runningState, 10_000 + 900_000), 0);
});

test('adds Battle Pass rewards to the current spendable balance', () => {
  assert.equal(addBattlePassCreditRewards(325, 1), 425);
  assert.equal(addBattlePassCreditRewards(325, 2), 525);
  assert.throws(() => addBattlePassCreditRewards(-1, 1),
    /Invalid Battle Pass credit reward balance/);
});

test('catches up a level-5 account once without changing its existing credits', () => {
  const firstGrant = getBattlePassRewardPlan(5, 37);
  assert.deepEqual(firstGrant, {
    creditsGranted: 100,
    credits: 137,
    claimedCreditLevels: [4],
    itemRewards: [
      ...BATTLE_PASS_SKIN_REWARDS.filter(reward => reward.level === 5),
      ...BATTLE_PASS_XP_BOOST_REWARDS.filter(reward => reward.level <= 5),
      ...BATTLE_PASS_LOADING_SCREEN_REWARDS.filter(reward => reward.level <= 5),
      ...BATTLE_PASS_MUSIC_REWARDS.filter(reward => reward.level <= 5)
    ]
  });

  const repeatedGrant = getBattlePassRewardPlan(
    5, firstGrant.credits, firstGrant.claimedCreditLevels,
    ['redbull', 'xp-boost-level-3', 'loading-screen-bp-01', 'music-bp-01']
  );
  assert.deepEqual(repeatedGrant, {
    creditsGranted: 0,
    credits: 137,
    claimedCreditLevels: [4],
    itemRewards: []
  });
});

test('catches up all rewards through level 100 without duplicating owned skins or credits', () => {
  const allItems = getUnclaimedBattlePassItemRewards(100);
  assert.equal(allItems.length, 59);
  assert.deepEqual(allItems.filter(item => item.type === 'skin').map(skin => skin.level),
    BATTLE_PASS_SKIN_REWARDS.map(skin => skin.level));

  const firstGrant = getBattlePassRewardPlan(100, 275, [4, 8], ['redbull', 'skin-02']);
  assert.equal(firstGrant.creditsGranted, 2_300);
  assert.equal(firstGrant.credits, 2_575);
  assert.deepEqual(firstGrant.claimedCreditLevels,
    BATTLE_PASS_CREDIT_REWARD_LEVELS);
  assert.equal(firstGrant.itemRewards.length, 57);

  const repeatedGrant = getBattlePassRewardPlan(
    100, firstGrant.credits, firstGrant.claimedCreditLevels,
    allItems.map(item => item.itemId)
  );
  assert.equal(repeatedGrant.creditsGranted, 0);
  assert.equal(repeatedGrant.credits, firstGrant.credits);
  assert.deepEqual(repeatedGrant.itemRewards, []);
});
