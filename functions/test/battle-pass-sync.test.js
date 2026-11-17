'use strict';

const assert = require('node:assert/strict');
const Module = require('node:module');
const test = require('node:test');
const { thresholds } = require('../src/progression');

function copy(value) {
  if (Array.isArray(value)) return value.map(copy);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, copy(item)]));
  }
  return value;
}

class MemoryFirestore {
  constructor() {
    this.documents = new Map();
    this.nextDocumentId = 0;
  }

  doc(path) {
    return {
      path,
      id: path.slice(path.lastIndexOf('/') + 1),
      get: async () => {
        const document = this.documents.get(path);
        return { exists: Boolean(document), data: () => document };
      }
    };
  }

  collection(path) {
    return {
      doc: id => this.doc(
        `${path}/${id || `generated-document-${++this.nextDocumentId}`}`
      )
    };
  }

  async runTransaction(callback) {
    const writes = [];
    const transaction = {
      get: async reference => {
        const document = this.documents.get(reference.path);
        return {
          exists: Boolean(document),
          data: () => copy(document),
          ref: reference
        };
      },
      create: (reference, data) => writes.push({
        type: 'create', reference, data: copy(data)
      }),
      set: (reference, data, options) => writes.push({
        type: 'set', reference, data: copy(data), options
      }),
      update: (reference, data) => writes.push({
        type: 'update', reference, data: copy(data)
      })
    };
    const result = await callback(transaction);
    for (const write of writes) {
      const current = this.documents.get(write.reference.path);
      if (write.type === 'create' && current) throw new Error('Already exists');
      if (write.type === 'update' && !current) throw new Error('Missing document');
      this.documents.set(write.reference.path, write.type === 'set' && write.options?.merge
        ? { ...current, ...write.data }
        : { ...current, ...write.data });
    }
    return result;
  }
}

function loadFunctionsWithFirestore(firestore) {
  const originalLoad = Module._load;
  const https = {
    onCall: (_options, handler) => Object.assign(handler, { run: handler }),
    HttpsError: class HttpsError extends Error {
      constructor(code, message) {
        super(message);
        this.code = code;
      }
    }
  };
  const firestoreAdmin = {
    FieldPath: { documentId: () => '__name__' },
    FieldValue: { serverTimestamp: () => '__server_timestamp__' },
    Timestamp: { fromMillis: value => ({ toMillis: () => value }) },
    getFirestore: () => firestore
  };

  Module._load = function load(request, parent, isMain) {
    if (request === 'firebase-functions/v2/https') return https;
    if (request === 'firebase-functions/v2/firestore') {
      return {
        onDocumentCreated: (_options, handler) => handler,
        onDocumentWritten: (_options, handler) => handler
      };
    }
    if (request === 'firebase-admin/app') return { initializeApp: () => ({}) };
    if (request === 'firebase-admin/firestore') return firestoreAdmin;
    return originalLoad.call(this, request, parent, isMain);
  };
  const indexPath = require.resolve('../src/index');
  delete require.cache[indexPath];
  try {
    return require(indexPath);
  } finally {
    Module._load = originalLoad;
  }
}

test('syncBattlePassRewards recovers eligible rewards once and preserves existing items', async () => {
  const firestore = new MemoryFirestore();
  const uid = 'reward-sync-player';
  const playerPath = `players/${uid}`;
  firestore.documents.set(playerPath, {
    xp: thresholds[100],
    level: 100,
    credits: 475,
    battlePass: { seasonId: 'season-1', level: 100 },
    statistics: { gamesPlayed: 12, bestScore: 900 }
  });
  firestore.documents.set(`players/${uid}/battlePassSeasons/season-1`, {
    seasonId: 'season-1',
    creditRewardLevels: [4, 8]
  });
  firestore.documents.set(`players/${uid}/inventory/skin-10`, {
    itemId: 'skin-10',
    type: 'skin',
    legacyField: 'keep skin data'
  });
  firestore.documents.set(`players/${uid}/inventory/xp-boost-level-3`, {
    itemId: 'xp-boost-level-3',
    type: 'xp-boost',
    category: 'xp-boost',
    level: 3,
    durationMs: 20 * 60 * 1000,
    bonusXp: 5,
    quantity: 1,
    usedQuantity: 0,
    legacyField: 'keep boost data'
  });
  firestore.documents.set(`players/${uid}/inventory/owned-music`, {
    itemId: 'owned-music', type: 'music', legacyField: 'keep music'
  });
  firestore.documents.set(`players/${uid}/inventory/owned-loading-screen`, {
    itemId: 'owned-loading-screen',
    type: 'loading-screen',
    legacyField: 'keep loading screen'
  });

  const functions = loadFunctionsWithFirestore(firestore);
  const request = { auth: { uid }, data: {} };
  const first = await functions.syncBattlePassRewards.run(request);
  assert.equal(first.creditsGranted, 2_300);
  assert.equal(first.rewardsGranted.length, 57);
  assert.equal(
    firestore.documents.get(`players/${uid}/inventory/loading-screen-bp-09`).imageUrl,
    '/Batll%20Pass%20ecran%20chargement/Arcade%20Tetris%20festif%20et%20color%C3%A9.png'
  );
  assert.equal(
    firestore.documents.get(`players/${uid}/inventory/music-bp-09`).audioUrl,
    '/Batll%20Pass%20musique/path-to-triumph_88293.mp3'
  );
  assert.equal(
    firestore.documents.get(`players/${uid}/inventory/music-bp-09`).imageUrl,
    '/Batll%20Pass%20musique/Ic%C3%B4ne%20n%C3%A9on%20de%20notes%20musicales.png'
  );
  assert.equal(firestore.documents.get(playerPath).credits, 2_775);
  assert.deepEqual(firestore.documents.get(playerPath).battlePass, {
    seasonId: 'season-1', level: 100
  });
  assert.equal(firestore.documents.get(
    `players/${uid}/inventory/skin-10`
  ).legacyField, 'keep skin data');
  assert.equal(firestore.documents.get(
    `players/${uid}/inventory/xp-boost-level-3`
  ).legacyField, 'keep boost data');
  assert.equal(firestore.documents.get(
    `players/${uid}/inventory/owned-music`
  ).legacyField, 'keep music');
  assert.equal(firestore.documents.get(
    `players/${uid}/inventory/owned-loading-screen`
  ).legacyField, 'keep loading screen');
  assert.equal(firestore.documents.get(
    `players/${uid}/inventory/xp-boost-level-100`
  ).durationMs, 20 * 60 * 1000);
  assert.equal(firestore.documents.get(
    `players/${uid}/inventory/xp-boost-level-7`
  ).level, 7);

  const second = await functions.syncBattlePassRewards.run(request);
  assert.equal(second.creditsGranted, 0);
  assert.deepEqual(second.rewardsGranted, []);
  assert.equal(firestore.documents.get(playerPath).credits, 2_775);
  assert.equal(firestore.documents.get(
    `players/${uid}/inventory/xp-boost-level-3`
  ).legacyField, 'keep boost data');
});

test('accepted-friend quest rewards are server-confirmed and idempotent', async () => {
  const firestore = new MemoryFirestore();
  const uid = 'quest-friend-owner';
  const friendUid = 'quest-friend';
  const playerPath = `players/${uid}`;
  firestore.documents.set(playerPath, {
    xp: 200,
    level: 1,
    battlePass: { seasonId: 'season-1', level: 1 }
  });
  firestore.documents.set(`players/${friendUid}/friends/${uid}`, { createdAt: new Date() });

  const functions = loadFunctionsWithFirestore(firestore);
  const event = {
    params: { uid, friendUid },
    data: { data: () => ({ createdAt: new Date() }) }
  };
  await functions.recordAcceptedFriendQuest(event);

  const quest = firestore.documents.get(`players/${uid}/quests/progress`);
  assert.equal(quest.statistics.friendsAdded, 1);
  assert.deepEqual(quest.completedSteps.friendsAdded, [1]);
  assert.deepEqual(quest.rewardedSteps.friendsAdded, [1]);
  assert.equal(firestore.documents.get(playerPath).xp, 450);
  assert.equal(firestore.documents.get(playerPath).level, 2);
  assert.equal(firestore.documents.get(playerPath).battlePass.level, 2);

  await functions.recordAcceptedFriendQuest(event);
  assert.equal(firestore.documents.get(playerPath).xp, 450);

  await functions.recordAcceptedFriendQuest({
    params: { uid, friendUid: 'unaccepted-friend' },
    data: { data: () => ({ createdAt: new Date() }) }
  });
  assert.equal(firestore.documents.get(playerPath).xp, 450);
});

test('a server-replayed game atomically saves quest XP and cannot reward twice', async () => {
  const firestore = new MemoryFirestore();
  const uid = 'quest-game-owner';
  const sessionId = 'quest-game-session-0001';
  const playerPath = `players/${uid}`;
  firestore.documents.set(playerPath, {
    xp: 0,
    level: 1,
    credits: 0,
    battlePass: { seasonId: 'season-1', level: 1 },
    bestSingleGameLines: 0,
    lines: 0,
    statistics: { gamesPlayed: 0, bestScore: 0 }
  });
  firestore.documents.set(`gameSessions/${sessionId}`, {
    uid,
    seed: 123,
    createdAt: { toDate: () => new Date(Date.now() - 1_000) },
    xpBoostDurationMs: 0,
    pausedTotalMs: 0,
    submittedAt: null
  });

  const functions = loadFunctionsWithFirestore(firestore);
  const request = {
    auth: { uid },
    data: { sessionId, actions: ['quit'], actionOffsetsMs: [0] }
  };
  const first = await functions.submitGameResult.run(request);
  assert.equal(first.xp, 250);
  assert.equal(first.questXpAwarded, 250);
  assert.equal(firestore.documents.get(playerPath).xp, 250);
  assert.equal(firestore.documents.get(`players/${uid}/quests/progress`)
    .statistics.gamesPlayed, 1);
  assert.deepEqual(firestore.documents.get(`players/${uid}/quests/progress`)
    .completedSteps.gamesPlayed, [1]);

  const duplicate = await functions.submitGameResult.run(request);
  assert.equal(duplicate.alreadySubmitted, true);
  assert.equal(firestore.documents.get(playerPath).xp, 250);
  assert.equal(firestore.documents.get(`players/${uid}/quests/progress`)
    .statistics.gamesPlayed, 1);
});

test('selecting a boost does not count; consuming it in a game counts once', async () => {
  const firestore = new MemoryFirestore();
  const uid = 'quest-boost-owner';
  const itemId = 'xp-boost-level-3';
  const playerPath = `players/${uid}`;
  firestore.documents.set(playerPath, {
    xp: 0,
    level: 1,
    credits: 0,
    battlePass: { seasonId: 'season-1', level: 1 }
  });
  firestore.documents.set(`players/${uid}/inventory/${itemId}`, {
    itemId,
    type: 'xp-boost',
    category: 'xp-boost',
    level: 3,
    durationMs: 20 * 60 * 1000,
    bonusXp: 5,
    quantity: 1,
    usedQuantity: 0
  });

  const functions = loadFunctionsWithFirestore(firestore);
  const auth = { uid };
  await functions.selectXpBoost.run({ auth, data: { itemId } });
  assert.equal(firestore.documents.has(`players/${uid}/quests/progress`), false);

  await functions.startGameSession.run({ auth, data: {} });
  assert.equal(firestore.documents.get(`players/${uid}/quests/progress`)
    .statistics.xpBoostsActivated, 1);
  assert.equal(firestore.documents.get(playerPath).xp, 250);
  assert.equal(firestore.documents.get(`players/${uid}/inventory/${itemId}`)
    .usedQuantity, 1);

  await functions.startGameSession.run({ auth, data: {} });
  assert.equal(firestore.documents.get(`players/${uid}/quests/progress`)
    .statistics.xpBoostsActivated, 1);
  assert.equal(firestore.documents.get(playerPath).xp, 250);
  assert.equal(firestore.documents.get(`players/${uid}/inventory/${itemId}`)
    .usedQuantity, 1);
});
