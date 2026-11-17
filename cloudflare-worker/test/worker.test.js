import test from 'node:test';
import assert from 'node:assert/strict';
import {
  fromFirestoreFields, getBattlePassRewardRecovery,
  getBattlePassSkinRecovery, getBattlePassSkinRepair, getUpdatedBattlePass, isAppCheckRequired,
  parseServiceAccount, startGameSession, submitGameResult, toFirestoreValue,
  validateDisplayName
} from '../src/index.js';
import {
  BATTLE_PASS_ITEM_REWARDS, thresholds
} from '../../functions/src/progression.js';
import { generateKeyPairSync } from 'node:crypto';

function installFirestoreFetchMock(t, initialDocuments = {}) {
  const documents = new Map(Object.entries(initialDocuments));
  const root = '/v1/projects/tetris-862ae/databases/(default)/documents';
  const originalFetch = globalThis.fetch;
  const keyPair = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const privateKey = keyPair.privateKey.export({ type: 'pkcs8', format: 'pem' });
  const env = {
    FIREBASE_PROJECT_ID: 'tetris-862ae',
    FIREBASE_SERVICE_ACCOUNT_JSON: JSON.stringify({
      project_id: 'tetris-862ae',
      client_email: 'worker-test@example.invalid',
      private_key: privateKey
    })
  };

  globalThis.fetch = async (input, options = {}) => {
    const url = new URL(input);
    if (url.hostname === 'oauth2.googleapis.com') {
      return new Response(JSON.stringify({ access_token: 'test-token', expires_in: 3600 }));
    }
    if (url.pathname.endsWith(':beginTransaction')) {
      return new Response(JSON.stringify({ transaction: 'test-transaction' }));
    }
    if (url.pathname.endsWith(':rollback')) return new Response('{}');
    if (url.pathname.endsWith(':commit')) {
      const { writes = [] } = JSON.parse(options.body || '{}');
      for (const write of writes) {
        const name = write.update?.name;
        if (!name) continue;
        const path = decodeURIComponent(name.split('/documents/')[1]);
        const previous = documents.get(path) || {};
        const updated = fromFirestoreFields(write.update.fields || {});
        const fields = write.updateMask?.fieldPaths || Object.keys(updated);
        documents.set(path, {
          ...previous,
          ...Object.fromEntries(fields.map(field => [field, updated[field]]))
        });
      }
      return new Response('{}');
    }
    if (url.pathname.includes('/documents/')) {
      const path = decodeURIComponent(url.pathname.split('/documents/')[1]);
      const document = documents.get(path);
      if (!document) return new Response('{}', { status: 404 });
      return new Response(JSON.stringify({
        name: `projects/tetris-862ae/databases/(default)/documents/${path}`,
        updateTime: '2026-11-10T00:00:00.000Z',
        fields: Object.fromEntries(
          Object.entries(document).map(([field, value]) => [field, toFirestoreValue(value)])
        )
      }));
    }
    throw new Error(`Unexpected mocked request: ${url.href}`);
  };
  t.after(() => { globalThis.fetch = originalFetch; });
  return { documents, env };
}

test('encodes and decodes Firestore profile values without changing nested data', () => {
  const profile = {
    xp: 45,
    level: 1,
    battlePass: { seasonId: 'season-1', level: 1 },
    statistics: { gamesPlayed: 3, bestScore: 200 },
    createdAt: new Date('2026-11-02T00:00:00.000Z'),
    locked: false,
    optional: null
  };
  const firestoreFields = Object.fromEntries(
    Object.entries(profile).map(([key, value]) => [key, toFirestoreValue(value)])
  );
  const decoded = fromFirestoreFields(firestoreFields);

  assert.deepEqual(decoded, profile);
});

test('accepts only game pseudo values supported by the profile rules', () => {
  assert.equal(validateDisplayName('Player_42'), true);
  assert.equal(validateDisplayName('Étoile-7'), true);
  assert.equal(validateDisplayName('ab'), false);
  assert.equal(validateDisplayName('name with spaces'), false);
  assert.equal(validateDisplayName(`${'a'.repeat(25)}`), false);
});

test('does not require App Check on Worker calls; Firebase Auth remains the identity check', () => {
  const env = { REQUIRE_APP_CHECK: 'true' };
  for (const path of [
    '/battle-pass/sync',
    '/game/start',
    '/game/submit',
    '/profile/create',
    '/progression/sync'
  ]) {
    assert.equal(isAppCheckRequired(path, env), false);
  }
  assert.equal(isAppCheckRequired('/game/start', {}), false);
});

test('reports malformed service-account secrets without echoing their contents', () => {
  const secret = 'firebase de test - not a JSON service account';
  assert.throws(
    () => parseServiceAccount({
      FIREBASE_PROJECT_ID: 'tetris-862ae',
      FIREBASE_SERVICE_ACCOUNT_JSON: secret
    }),
    error => {
      assert.match(error.message, /JSON complet du compte de service Firebase/);
      assert.equal(error.message.includes(secret), false);
      return true;
    }
  );
  assert.throws(
    () => parseServiceAccount({
      FIREBASE_PROJECT_ID: 'tetris-862ae',
      FIREBASE_SERVICE_ACCOUNT_JSON: JSON.stringify({
        project_id: 'another-project',
        client_email: 'worker@example.invalid',
        private_key: 'private-key'
      })
    }),
    /compte de service JSON valide du projet Firebase configuré/
  );
});

test('repairs legacy skin documents without replacing their other data or unlock timestamp', () => {
  const legacyUnlockedAt = new Date('2025-01-01T00:00:00.000Z');
  const now = new Date('2026-11-07T00:00:00.000Z');
  const repair = getBattlePassSkinRepair(
    BATTLE_PASS_ITEM_REWARDS[0],
    {
      type: 'cosmetic',
      name: 'Red Bull',
      source: 'legacy-battle-pass',
      unlockedAt: legacyUnlockedAt,
      customData: { preserved: true }
    },
    now
  );

  assert.deepEqual(repair, {
    level: 5,
    itemId: 'redbull',
    type: 'skin',
    seasonId: 'season-1'
  });
  assert.equal(repair.unlockedAt, undefined);
  assert.deepEqual(repair.customData, undefined);
  assert.deepEqual(
    getBattlePassSkinRepair(
      BATTLE_PASS_ITEM_REWARDS[0],
      {
        level: 5,
        itemId: 'redbull',
        type: 'skin',
        name: 'Red Bull',
        source: 'battle-pass',
        seasonId: 'season-1',
        unlockedAt: legacyUnlockedAt
      },
      now
    ),
    {}
  );
});

test('repairs Battle Pass loading-screen documents with their expected category and image', () => {
  const reward = BATTLE_PASS_ITEM_REWARDS.find(
    item => item.type === 'loading-screen'
  );
  const now = new Date('2026-11-07T00:00:00.000Z');
  const repair = getBattlePassSkinRepair(reward, {
    itemId: reward.itemId,
    type: 'skin',
    source: 'battle-pass',
    seasonId: 'season-1'
  }, now);
  assert.deepEqual(repair, {
    level: reward.level,
    type: 'loading-screen',
    name: reward.name,
    unlockedAt: now,
    category: 'loading-screen',
    imageUrl: reward.imageUrl
  });
});

test('repairing an XP boost preserves its consumed quantity', () => {
  const reward = BATTLE_PASS_ITEM_REWARDS.find(
    item => item.type === 'xp-boost'
  );
  const existingData = {
    itemId: reward.itemId,
    type: 'skin',
    usedQuantity: 1
  };
  const repair = getBattlePassSkinRepair(reward, existingData);
  assert.equal(repair.type, 'xp-boost');
  assert.equal(repair.usedQuantity, undefined);
  assert.equal(existingData.usedQuantity, 1);
});

test('item recovery derives eligibility from Firestore XP and preserves other player values', () => {
  const player = {
    xp: thresholds[5],
    level: 1,
    credits: 675,
    battlePass: { seasonId: 'season-1', level: 1 }
  };
  assert.deepEqual(
    getBattlePassSkinRecovery({ ...player, xp: thresholds[4] }, []),
    {
      level: 4,
      itemRewards: BATTLE_PASS_ITEM_REWARDS.filter(reward => reward.level <= 4)
    }
  );
  assert.deepEqual(
    getBattlePassSkinRecovery(player, []),
    {
      level: 5,
      itemRewards: BATTLE_PASS_ITEM_REWARDS.filter(reward => reward.level <= 5)
    }
  );
  assert.deepEqual(
    getBattlePassSkinRecovery(player, ['redbull']),
    {
      level: 5,
      itemRewards: BATTLE_PASS_ITEM_REWARDS.filter(
        reward => reward.level <= 5 && reward.itemId !== 'redbull'
      )
    }
  );
  assert.equal(player.level, 1);
  assert.equal(player.credits, 675);
  assert.equal(player.battlePass.level, 1);
  assert.throws(() => getBattlePassSkinRecovery({ ...player, xp: -1 }, []));
  assert.throws(() => getBattlePassSkinRecovery({ ...player, battlePass: [] }, []));
});

test('item recovery unlocks each Battle Pass item at its exact threshold, never before, and only once', () => {
  const player = { xp: 0, credits: 375, level: 1 };
  for (const skin of BATTLE_PASS_ITEM_REWARDS) {
    const below = getBattlePassSkinRecovery(
      { ...player, xp: thresholds[skin.level - 1] }, []
    );
    assert.equal(below.itemRewards.some(reward => reward.itemId === skin.itemId), false);

    const reached = getBattlePassSkinRecovery(
      { ...player, xp: thresholds[skin.level] }, []
    );
    assert.equal(reached.itemRewards.some(reward => reward.itemId === skin.itemId), true);

    const alreadyOwned = getBattlePassSkinRecovery(
      { ...player, xp: thresholds[skin.level] }, [skin.itemId]
    );
    assert.equal(alreadyOwned.itemRewards.some(reward => reward.itemId === skin.itemId), false);
  }
  assert.equal(player.credits, 375);
  assert.equal(player.level, 1);
});

test('preserves existing Battle Pass seasons and never decreases its level', () => {
  assert.deepEqual(
    getUpdatedBattlePass({ seasonId: 'season-old', level: 8, claimed: ['reward-1'] }, 4),
    { seasonId: 'season-old', level: 8, claimed: ['reward-1'] }
  );
  assert.deepEqual(
    getUpdatedBattlePass({ seasonId: 'season-1', level: 8 }, 4),
    { seasonId: 'season-1', level: 8 }
  );
  assert.deepEqual(
    getUpdatedBattlePass({ seasonId: 'season-1', level: 8 }, 9),
    { seasonId: 'season-1', level: 9 }
  );
});

test('recovers all Battle Pass items only through the XP-derived level', () => {
  const playerAtLevel4 = {
    xp: thresholds[4],
    level: 4,
    credits: 25,
    battlePass: { seasonId: 'season-1', level: 4 }
  };
  const belowCreditLevel = getBattlePassRewardRecovery(
    { ...playerAtLevel4, xp: thresholds[3] }, null, [], []
  );
  assert.equal(belowCreditLevel.level, 3);
  assert.deepEqual(
    belowCreditLevel.itemRewards,
    BATTLE_PASS_ITEM_REWARDS.filter(reward => reward.level <= 3)
  );
  assert.equal(belowCreditLevel.creditsGranted, 0);

  const exactCreditLevel = getBattlePassRewardRecovery(
    playerAtLevel4, null, [], []
  );
  assert.equal(exactCreditLevel.creditsGranted, 100);
  assert.equal(exactCreditLevel.credits, 125);
  const markerOnlyCreditHistory = getBattlePassRewardRecovery({
    ...playerAtLevel4,
    credits: 125,
    battlePass: { seasonId: 'season-1', level: 4, lastCreditRewardLevel: '4' }
  }, null, [], []);
  assert.equal(markerOnlyCreditHistory.creditsGranted, 0);
  assert.deepEqual(markerOnlyCreditHistory.creditRewardLevels, [4]);
  const highWaterCreditHistory = getBattlePassRewardRecovery({
    ...playerAtLevel4,
    xp: thresholds[12],
    credits: 325,
    battlePass: { seasonId: 'season-1', level: 13, lastCreditRewardLevel: '12' }
  }, null, [], []);
  assert.equal(highWaterCreditHistory.creditsGranted, 0);
  assert.deepEqual(highWaterCreditHistory.creditRewardLevels, [4, 8, 12]);
  assert.throws(() => getBattlePassRewardRecovery({
    ...playerAtLevel4,
    battlePass: { seasonId: 'season-1', level: 5, lastCreditRewardLevel: '5' }
  }, null, [], []));

  const exactSkinLevel = getBattlePassRewardRecovery(
    { ...playerAtLevel4, xp: thresholds[5] }, null, [], []
  );
  assert.equal(exactSkinLevel.level, 5);
  assert.deepEqual(
    exactSkinLevel.itemRewards,
    BATTLE_PASS_ITEM_REWARDS.filter(reward => reward.level <= 5)
  );
  assert.equal(exactSkinLevel.creditsGranted, 100);

  const exceededSkinLevel = getBattlePassRewardRecovery(
    { ...playerAtLevel4, xp: thresholds[6] }, null, [], []
  );
  assert.equal(exceededSkinLevel.level, 6);
  assert.deepEqual(
    exceededSkinLevel.itemRewards,
    BATTLE_PASS_ITEM_REWARDS.filter(reward => reward.level <= 6)
  );

  for (const skin of BATTLE_PASS_ITEM_REWARDS) {
    const before = getBattlePassRewardRecovery({
      ...playerAtLevel4,
      xp: thresholds[skin.level - 1]
    }, null, [], []);
    assert.equal(before.itemRewards.some(reward => reward.itemId === skin.itemId), false);

    for (const level of [skin.level, Math.min(100, skin.level + 1)]) {
      const after = getBattlePassRewardRecovery({
        ...playerAtLevel4,
        xp: thresholds[level]
      }, null, [], []);
      assert.equal(after.itemRewards.some(reward => reward.itemId === skin.itemId), true);
    }
  }
});

test('game worker starts real XP boosts and atomically saves game and quest rewards once', async t => {
  const uid = 'worker-game-owner';
  const boostId = 'xp-boost-level-3';
  const { documents, env } = installFirestoreFetchMock(t, {
    [`players/${uid}`]: {
      xp: 0,
      level: 1,
      credits: 0,
      lines: 0,
      bestSingleGameLines: 0,
      battlePass: { seasonId: 'season-1', level: 1 },
      statistics: { gamesPlayed: 0, bestScore: 0 }
    },
    [`players/${uid}/xpBoostState/current`]: { selectedBoostId: boostId },
    [`players/${uid}/inventory/${boostId}`]: {
      itemId: boostId,
      type: 'xp-boost',
      category: 'xp-boost',
      level: 3,
      durationMs: 20 * 60 * 1000,
      bonusXp: 5,
      quantity: 1,
      usedQuantity: 0
    }
  });

  const session = await startGameSession(env, { sub: uid });
  assert.equal(session.xpBoostId, boostId);
  assert.equal(session.xpBoostDurationMs, 20 * 60 * 1000);
  assert.equal(documents.get(`players/${uid}/inventory/${boostId}`).usedQuantity, 1);
  assert.equal(documents.get(`players/${uid}`).xp, 250);
  assert.equal(
    documents.get(`players/${uid}/quests/progress`).statistics.xpBoostsActivated,
    1
  );

  const request = {
    sessionId: session.sessionId,
    actions: ['quit'],
    actionOffsetsMs: [0]
  };
  const result = await submitGameResult(env, { sub: uid }, request);
  assert.equal(result.ok, true);
  assert.equal(result.xp, 500);
  assert.equal(result.questXpAwarded, 250);
  assert.deepEqual(result.questCompletions, [
    { questId: 'gamesPlayed', step: 1, xp: 250 }
  ]);
  assert.equal(documents.get(`players/${uid}`).xp, 500);
  assert.equal(documents.get(`players/${uid}`).level, 2);
  assert.equal(documents.get(`players/${uid}`).battlePass.level, 2);
  assert.equal(documents.get(`players/${uid}/quests/progress`)
    .statistics.gamesPlayed, 1);
  const boostState = documents.get(`players/${uid}/xpBoostState/current`);
  assert.equal(boostState.activeBoostId, boostId);
  assert.ok(boostState.activeExpiresAt instanceof Date);
  assert.ok(boostState.activeRemainingMs > 0);
  assert.equal(documents.get(`players/${uid}/processedGames/${session.sessionId}`)
    .xpAfter, 500);

  const duplicate = await submitGameResult(env, { sub: uid }, request);
  assert.equal(duplicate.alreadySubmitted, true);
  assert.deepEqual(duplicate.questCompletions, result.questCompletions);
  assert.equal(documents.get(`players/${uid}`).xp, 500);
});

test('game worker does not consume an XP boost that was not selected', async t => {
  const uid = 'worker-game-no-boost-owner';
  const boostId = 'xp-boost-level-3';
  const { documents, env } = installFirestoreFetchMock(t, {
    [`players/${uid}`]: {
      xp: 0,
      level: 1,
      credits: 0,
      battlePass: { seasonId: 'season-1', level: 1 }
    },
    [`players/${uid}/xpBoostState/current`]: { selectedBoostId: null },
    [`players/${uid}/inventory/${boostId}`]: {
      itemId: boostId,
      type: 'xp-boost',
      category: 'xp-boost',
      level: 3,
      durationMs: 20 * 60 * 1000,
      bonusXp: 5,
      quantity: 1,
      usedQuantity: 0
    }
  });

  const session = await startGameSession(env, { sub: uid });
  assert.equal(session.xpBoostId, null);
  assert.equal(session.xpBoostDurationMs, 0);
  assert.equal(documents.get(`players/${uid}/inventory/${boostId}`).usedQuantity, 0);
  assert.equal(documents.has(`players/${uid}/quests/progress`), false);
});

test('catches up all earned rewards once while preserving existing inventory and credits', () => {
  const player = {
    xp: thresholds[100],
    level: 2,
    credits: 275,
    battlePass: { seasonId: 'season-1', level: 2 }
  };
  const firstGrant = getBattlePassRewardRecovery(
    player,
    { seasonId: 'season-1', creditRewardLevels: [4, 8] },
    ['redbull', 'skin-02'],
    [4, 8]
  );
  assert.equal(firstGrant.level, 100);
  assert.equal(firstGrant.creditsGranted, 2_300);
  assert.equal(firstGrant.credits, 2_575);
  assert.equal(firstGrant.creditRewardLevels.length, 25);
  assert.equal(firstGrant.itemRewards.length, 48);

  const repeatedGrant = getBattlePassRewardRecovery(
    { ...player, credits: firstGrant.credits },
    { seasonId: 'season-1', creditRewardLevels: firstGrant.creditRewardLevels },
    BATTLE_PASS_ITEM_REWARDS.map(reward => reward.itemId),
    firstGrant.creditRewardLevels
  );
  assert.equal(repeatedGrant.creditsGranted, 0);
  assert.equal(repeatedGrant.credits, firstGrant.credits);
  assert.deepEqual(repeatedGrant.itemRewards, []);
});
