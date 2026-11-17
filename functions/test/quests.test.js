'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {
  QUEST_DEFINITIONS,
  QUEST_REWARDS_XP,
  applyQuestProgress,
  createEmptyQuestProgress
} = require('../src/quests');

test('defines all 70 progressive steps with the exact XP rewards', () => {
  assert.equal(QUEST_DEFINITIONS.length, 7);
  assert.equal(QUEST_DEFINITIONS.reduce((total, quest) =>
    total + quest.thresholds.length, 0), 70);
  assert.deepEqual(QUEST_REWARDS_XP, [
    250, 450, 1_500, 3_500, 5_500, 8_000, 10_000, 12_500, 15_000, 20_000
  ]);
  assert.equal(QUEST_REWARDS_XP.reduce((total, xp) => total + xp, 0), 76_700);
  assert.equal(QUEST_REWARDS_XP.reduce((total, xp) => total + xp * 7, 0), 536_900);
  assert.deepEqual(QUEST_DEFINITIONS.map(quest => quest.thresholds), [
    [1, 5, 10, 20, 30, 40, 50, 65, 80, 100],
    [1, 10, 25, 50, 100, 200, 350, 500, 750, 1_000],
    [10, 50, 100, 250, 500, 1_000, 2_000, 3_500, 5_000, 10_000],
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    [1, 2, 3, 5, 7, 10, 13, 16, 20, 25],
    [1, 2, 3, 5, 7, 10, 15, 20, 30, 50],
    [1, 3, 5, 8, 12, 16, 20, 30, 40, 50]
  ]);
});

test('grants every reached step exactly once, including multiple thresholds in one event', () => {
  let state = createEmptyQuestProgress();
  let totalRewardXp = 0;
  let totalCompleted = 0;
  for (let index = 0; index < 10; index++) {
    const friendProgress = applyQuestProgress(state, { friendUid: `friend-${index}` });
    state = friendProgress.progress;
    totalRewardXp += friendProgress.rewardXp;
    totalCompleted += friendProgress.newlyCompleted.length;
  }
  const allOtherQuests = applyQuestProgress(state, {
    gamesPlayed: 100,
    linesCleared: 1_000,
    piecesPlaced: 10_000,
    xpBoostsActivated: 25,
    giftsSent: 50,
    bestSingleGameLines: 50,
  });

  state = allOtherQuests.progress;
  totalRewardXp += allOtherQuests.rewardXp;
  totalCompleted += allOtherQuests.newlyCompleted.length;
  assert.equal(totalCompleted, 70);
  assert.equal(totalRewardXp, 536_900);
  assert.deepEqual(state.completedSteps.gamesPlayed, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.deepEqual(state.completedSteps.bestSingleGameLines, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.equal(state.totalXpAwarded, 536_900);

  const duplicate = applyQuestProgress(state, {
    gamesPlayed: 0,
    linesCleared: 0,
    piecesPlaced: 0,
    xpBoostsActivated: 0,
    giftsSent: 0,
    bestSingleGameLines: 0,
    friendUid: 'friend-1'
  });
  assert.equal(duplicate.rewardXp, 0);
  assert.deepEqual(duplicate.newlyCompleted, []);
});

test('cumulative line totals progress across games while the single-game record uses max', () => {
  const first = applyQuestProgress(createEmptyQuestProgress(), {
    gamesPlayed: 1, linesCleared: 25, piecesPlaced: 3, bestSingleGameLines: 3
  });
  assert.equal(first.progress.statistics.linesCleared, 25);
  assert.equal(first.progress.statistics.bestSingleGameLines, 3);
  assert.deepEqual(first.progress.completedSteps.linesCleared, [1, 2, 3]);
  assert.deepEqual(first.progress.completedSteps.bestSingleGameLines, [1, 2]);

  const second = applyQuestProgress(first.progress, {
    gamesPlayed: 1, linesCleared: 25, piecesPlaced: 4, bestSingleGameLines: 2
  });
  assert.equal(second.progress.statistics.linesCleared, 50);
  assert.equal(second.progress.statistics.bestSingleGameLines, 3);
  assert.deepEqual(second.progress.completedSteps.linesCleared, [1, 2, 3, 4]);
  assert.deepEqual(second.progress.completedSteps.bestSingleGameLines, [1, 2]);
});

test('counts accepted friends once per unique UID and caps only at the final threshold', () => {
  let state = createEmptyQuestProgress();
  for (let index = 0; index < 10; index++) {
    state = applyQuestProgress(state, { friendUid: `friend-${index}` }).progress;
  }
  const duplicate = applyQuestProgress(state, { friendUid: 'friend-4' });
  assert.equal(duplicate.progress.statistics.friendsAdded, 10);
  assert.deepEqual(duplicate.newlyCompleted, []);
  assert.deepEqual(duplicate.progress.completedSteps.friendsAdded, [
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10
  ]);
});

test('rejects invalid stored history and event values instead of resetting quest data', () => {
  const state = createEmptyQuestProgress();
  state.completedSteps.gamesPlayed = [1];
  assert.throws(() => applyQuestProgress(state, { gamesPlayed: 1 }), /Invalid stored quest rewards/);
  assert.throws(() => applyQuestProgress(createEmptyQuestProgress(), { piecesPlaced: -1 }), /Invalid quest event count/);
});
