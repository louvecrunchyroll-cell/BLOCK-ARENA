'use strict';

const QUEST_REWARDS_XP = [250, 450, 1_500, 3_500, 5_500, 8_000, 10_000, 12_500, 15_000, 20_000];
const QUEST_DEFINITIONS = [
  {
    id: 'gamesPlayed',
    title: 'JOUER DES PARTIES',
    stat: 'gamesPlayed',
    thresholds: [1, 5, 10, 20, 30, 40, 50, 65, 80, 100],
    objective: value => `Jouer ${value} ${value === 1 ? 'partie' : 'parties'}`
  },
  {
    id: 'linesCleared',
    title: 'RÉALISER DES LIGNES',
    stat: 'linesCleared',
    thresholds: [1, 10, 25, 50, 100, 200, 350, 500, 750, 1_000],
    objective: value => `Réaliser ${value.toLocaleString('fr-FR')} ${value === 1 ? 'ligne' : 'lignes'}`
  },
  {
    id: 'piecesPlaced',
    title: 'PLACER DES FORMES',
    stat: 'piecesPlaced',
    thresholds: [10, 50, 100, 250, 500, 1_000, 2_000, 3_500, 5_000, 10_000],
    objective: value => `Placer ${value.toLocaleString('fr-FR')} formes`
  },
  {
    id: 'friendsAdded',
    title: 'AJOUTER DES AMIS',
    stat: 'friendsAdded',
    thresholds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    objective: value => `Ajouter ${value} ${value === 1 ? 'ami' : 'amis'}`
  },
  {
    id: 'xpBoostsActivated',
    title: 'ACTIVER DES BOOST XP',
    stat: 'xpBoostsActivated',
    thresholds: [1, 2, 3, 5, 7, 10, 13, 16, 20, 25],
    objective: value => `Activer ${value} Boost XP`
  },
  {
    id: 'giftsSent',
    title: 'OFFRIR DES CADEAUX',
    stat: 'giftsSent',
    thresholds: [1, 2, 3, 5, 7, 10, 15, 20, 30, 50],
    objective: value => `Offrir ${value} ${value === 1 ? 'cadeau' : 'cadeaux'}`
  },
  {
    id: 'bestSingleGameLines',
    title: 'RECORD DE LIGNES EN UNE SEULE PARTIE',
    stat: 'bestSingleGameLines',
    thresholds: [1, 3, 5, 8, 12, 16, 20, 30, 40, 50],
    objective: value => `Réaliser ${value} ${value === 1 ? 'ligne' : 'lignes'} dans une partie`
  }
];

const QUEST_STAT_FIELDS = QUEST_DEFINITIONS.map(quest => quest.stat);

function createEmptyQuestProgress() {
  const statistics = Object.fromEntries(QUEST_STAT_FIELDS.map(field => [field, 0]));
  const completedSteps = Object.fromEntries(QUEST_DEFINITIONS.map(quest => [quest.id, []]));
  return {
    schemaVersion: 1,
    statistics,
    completedSteps,
    rewardedSteps: Object.fromEntries(QUEST_DEFINITIONS.map(quest => [quest.id, []])),
    friendUids: [],
    totalXpAwarded: 0
  };
}

function validateProgress(progress) {
  if (!progress || progress.schemaVersion !== 1 ||
      !progress.statistics || typeof progress.statistics !== 'object' ||
      !progress.completedSteps || typeof progress.completedSteps !== 'object' ||
      !progress.rewardedSteps || typeof progress.rewardedSteps !== 'object' ||
      !Array.isArray(progress.friendUids) || progress.friendUids.length > 10 ||
      new Set(progress.friendUids).size !== progress.friendUids.length ||
      progress.friendUids.some(uid => typeof uid !== 'string' || !uid) ||
      progress.statistics?.friendsAdded !== progress.friendUids.length ||
      !Number.isSafeInteger(progress.totalXpAwarded) || progress.totalXpAwarded < 0) {
    throw new TypeError('Invalid stored quest progress.');
  }
  for (const field of QUEST_STAT_FIELDS) {
    if (!Number.isSafeInteger(progress.statistics[field]) || progress.statistics[field] < 0) {
      throw new TypeError('Invalid stored quest statistics.');
    }
  }
  let expectedRewardTotal = 0;
  for (const quest of QUEST_DEFINITIONS) {
    const completed = progress.completedSteps[quest.id];
    const rewarded = progress.rewardedSteps[quest.id];
    const validSteps = steps => Array.isArray(steps) &&
      steps.every((step, index) => Number.isSafeInteger(step) && step >= 1 &&
        step <= 10 && (index === 0 || step > steps[index - 1]));
    if (!validSteps(completed) || !validSteps(rewarded) ||
        completed.length !== rewarded.length ||
        completed.some((step, index) =>
          step !== rewarded[index] ||
          progress.statistics[quest.stat] < quest.thresholds[step - 1])) {
      throw new TypeError('Invalid stored quest rewards.');
    }
    expectedRewardTotal += completed.reduce((total, step) =>
      total + QUEST_REWARDS_XP[step - 1], 0);
  }
  if (progress.totalXpAwarded !== expectedRewardTotal) {
    throw new TypeError('Invalid stored quest XP total.');
  }
}

function applyQuestProgress(currentProgress, event) {
  const progress = currentProgress
    ? structuredClone(currentProgress) : createEmptyQuestProgress();
  if (currentProgress) validateProgress(progress);
  if (!event || typeof event !== 'object' || Array.isArray(event)) {
    throw new TypeError('Invalid quest event.');
  }
  const changedFields = [
    'gamesPlayed', 'linesCleared', 'piecesPlaced', 'xpBoostsActivated', 'giftsSent'
  ];
  for (const field of changedFields) {
    const increment = event[field] ?? 0;
    if (!Number.isSafeInteger(increment) || increment < 0) {
      throw new TypeError('Invalid quest event count.');
    }
    const updated = progress.statistics[field] + increment;
    if (!Number.isSafeInteger(updated)) throw new TypeError('Quest statistic exceeds safe limits.');
    progress.statistics[field] = updated;
  }
  const bestLines = event.bestSingleGameLines ?? 0;
  if (!Number.isSafeInteger(bestLines) || bestLines < 0) {
    throw new TypeError('Invalid single-game line record.');
  }
  progress.statistics.bestSingleGameLines = Math.max(
    progress.statistics.bestSingleGameLines, bestLines
  );
  if (event.friendUid !== undefined) {
    if (typeof event.friendUid !== 'string' || !event.friendUid) {
      throw new TypeError('Invalid friend quest event.');
    }
    if (!progress.friendUids.includes(event.friendUid) && progress.friendUids.length < 10) {
      progress.friendUids.push(event.friendUid);
      progress.statistics.friendsAdded = progress.friendUids.length;
    }
  }

  const newlyCompleted = [];
  let rewardXp = 0;
  for (const quest of QUEST_DEFINITIONS) {
    const value = progress.statistics[quest.stat];
    for (let index = 0; index < quest.thresholds.length; index++) {
      const step = index + 1;
      if (value < quest.thresholds[index] ||
          progress.completedSteps[quest.id].includes(step)) continue;
      progress.completedSteps[quest.id].push(step);
      progress.rewardedSteps[quest.id].push(step);
      const xp = QUEST_REWARDS_XP[index];
      rewardXp += xp;
      newlyCompleted.push({ questId: quest.id, step, xp });
    }
  }
  if (!Number.isSafeInteger(rewardXp) ||
      !Number.isSafeInteger(progress.totalXpAwarded + rewardXp)) {
    throw new TypeError('Quest XP exceeds safe limits.');
  }
  progress.totalXpAwarded += rewardXp;
  return { progress, newlyCompleted, rewardXp };
}

module.exports = {
  QUEST_DEFINITIONS,
  QUEST_REWARDS_XP,
  QUEST_STAT_FIELDS,
  applyQuestProgress,
  createEmptyQuestProgress
};
