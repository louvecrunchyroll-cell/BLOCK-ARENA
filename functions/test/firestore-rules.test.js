'use strict';

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { after, before, test } = require('node:test');
const {
  assertFails, assertSucceeds, initializeTestEnvironment
} = require('@firebase/rules-unit-testing');
const {
  doc, getDoc, runTransaction, serverTimestamp, setDoc, Timestamp, updateDoc, writeBatch
} = require('firebase/firestore');
const { thresholds } = require('../src/progression');

const emulatorAvailable = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
let testEnvironment;

before(async () => {
  if (!emulatorAvailable) return;
  testEnvironment = await initializeTestEnvironment({
    projectId: 'demo-block-arena',
    firestore: {
      rules: readFileSync(path.join(__dirname, '../../firestore.rules'), 'utf8')
    }
  });
});

after(async () => {
  if (testEnvironment) await testEnvironment.cleanup();
});

async function seedPlayer(uid, level, credits = 275) {
  await testEnvironment.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), `players/${uid}`), {
      xp: thresholds[level],
      level,
      credits,
      battlePass: { seasonId: 'season-1', level },
      bestSingleGameLines: 0,
      statistics: { gamesPlayed: 0, bestScore: 0 },
      updatedAt: new Date()
    });
  });
}

async function purchaseBloc1(db, uid) {
  const playerRef = doc(db, `players/${uid}`);
  const itemRef = doc(db, `players/${uid}/inventory/loading-screen-bloc-1`);
  return runTransaction(db, async transaction => {
    const [playerSnapshot, itemSnapshot] = await Promise.all([
      transaction.get(playerRef),
      transaction.get(itemRef)
    ]);
    if (itemSnapshot.exists()) throw new Error('Already purchased');
    const credits = playerSnapshot.data().credits;
    transaction.update(playerRef, {
      credits: credits - 300,
      updatedAt: serverTimestamp()
    });
    transaction.set(itemRef, {
      itemId: 'loading-screen-bloc-1',
      name: 'Bloc en formation',
      type: 'loading-screen',
      category: 'loading-screen',
      imageUrl: '/boutique%201/Blocs%20Tetris%20m%C3%A9talliques%20sur%20plan%20quadrill%C3%A9.png',
      source: 'shop',
      price: 300,
      purchasedAt: serverTimestamp()
    });
  });
}

async function submitClientGame(db, uid, gameId, xpAfter, level, awardedXp, gameLines = 1) {
  const playerRef = doc(db, `players/${uid}`);
  const receiptRef = doc(db, `players/${uid}/processedGames/${gameId}`);
  return runTransaction(db, async transaction => {
    const playerSnapshot = await transaction.get(playerRef);
    const player = playerSnapshot.data();
    const lines = player.lines || 0;
    const gamesPlayed = player.statistics.gamesPlayed || 0;
    const bestScore = player.statistics.bestScore || 0;
    transaction.update(playerRef, {
      xp: xpAfter,
      level,
      battlePass: { ...player.battlePass, level },
      lines: lines + gameLines,
      bestSingleGameLines: Math.max(player.bestSingleGameLines || 0, gameLines),
      statistics: { ...player.statistics, gamesPlayed: gamesPlayed + 1, bestScore: Math.max(bestScore, 10) },
      lastGameId: gameId,
      updatedAt: serverTimestamp()
    });
    transaction.set(receiptRef, {
      awardedXp,
      xpBefore: player.xp,
      xpAfter,
      level,
      lines: gameLines,
      score: 10,
      createdAt: serverTimestamp()
    });
  });
}

test('Bloc en formation can only be purchased once for 300 credits and equipped by its owner', {
  skip: !emulatorAvailable
}, async () => {
  const uid = 'bloc-one-purchase';
  await seedPlayer(uid, 1, 500);
  const db = testEnvironment.authenticatedContext(uid).firestore();
  const playerRef = doc(db, `players/${uid}`);
  const itemRef = doc(db, `players/${uid}/inventory/loading-screen-bloc-1`);
  const preferencesRef = doc(db, `players/${uid}/preferences/current`);

  await assertFails(setDoc(itemRef, {
    itemId: 'loading-screen-bloc-1',
    name: 'Bloc en formation',
    type: 'loading-screen',
    category: 'loading-screen',
    imageUrl: '/boutique%201/Blocs%20Tetris%20m%C3%A9talliques%20sur%20plan%20quadrill%C3%A9.png',
    source: 'shop',
    price: 300,
    purchasedAt: serverTimestamp()
  }));
  assert.equal((await getDoc(playerRef)).data().credits, 500);
  await assertSucceeds(purchaseBloc1(db, uid));
  assert.equal((await getDoc(playerRef)).data().credits, 200);
  assert.equal((await getDoc(itemRef)).data().type, 'loading-screen');
  await assertFails(runTransaction(db, transaction => {
    transaction.update(playerRef, {
      credits: -100,
      updatedAt: serverTimestamp()
    });

    transaction.set(itemRef, {
      itemId: 'loading-screen-bloc-1',
      name: 'Bloc en formation',
      type: 'loading-screen',
      category: 'loading-screen',
      imageUrl: '/boutique%201/Blocs%20Tetris%20m%C3%A9talliques%20sur%20plan%20quadrill%C3%A9.png',
      source: 'shop',
      price: 300,
      purchasedAt: serverTimestamp()
    });
  }));
  assert.equal((await getDoc(playerRef)).data().credits, 200);

  const preferences = {
    equippedSkin: 'default',
    equippedMusic: 'none',
    equippedLoadingScreen: 'loading-screen-bloc-1',
    settings: { music: true, musicVolume: 70, blocksVolume: 80 },
    updatedAt: serverTimestamp()
  };
  await assertSucceeds(setDoc(preferencesRef, preferences));
  await assertSucceeds(setDoc(preferencesRef, {
    ...preferences,
    equippedLoadingScreen: 'none',
    updatedAt: serverTimestamp()
  }));
  await assertFails(setDoc(doc(testEnvironment.authenticatedContext('other-bloc-owner')
    .firestore(), 'players/other-bloc-owner/preferences/current'), preferences));
});

test('a player can save a game transaction once but cannot change another profile', {
  skip: !emulatorAvailable
}, async () => {
  const uid = 'owner-saves-own-game';
  const otherUid = 'another-player-profile';
  await seedPlayer(uid, 4);
  await seedPlayer(otherUid, 4);
  const db = testEnvironment.authenticatedContext(uid).firestore();
  const playerRef = doc(db, `players/${uid}`);
  const gameId = 'client-game-receipt-0001';
  const xpAfter = thresholds[4] + 10;

  await assertSucceeds(submitClientGame(db, uid, gameId, xpAfter, 4, 10));
  assert.equal((await getDoc(playerRef)).data().xp, xpAfter);
  assert.equal((await getDoc(doc(db, `players/${uid}/processedGames/${gameId}`)))
    .data().xpAfter, xpAfter);
  await assertFails(submitClientGame(db, uid, gameId, xpAfter + 10, 4, 10));
  assert.equal((await getDoc(playerRef)).data().xp, xpAfter);
  await assertFails(updateDoc(doc(db, `players/${otherUid}`), {
    xp: xpAfter + 10, updatedAt: serverTimestamp()
  }));
  await assertFails(getDoc(doc(testEnvironment.authenticatedContext(otherUid)
    .firestore(), `players/${uid}/xpBoostState/current`)));
});

test('quest progress can be saved by its owner but not by another player', {
  skip: !emulatorAvailable
}, async () => {
  const uid = 'quest-progress-owner';
  const otherUid = 'quest-progress-other';
  await seedPlayer(uid, 1);
  const ownerDb = testEnvironment.authenticatedContext(uid).firestore();
  const otherDb = testEnvironment.authenticatedContext(otherUid).firestore();
  const questRef = doc(ownerDb, `players/${uid}/quests/progress`);
  const forgedPathRef = doc(ownerDb, `players/${uid}/quests/forged`);
  const otherQuestRef = doc(otherDb, `players/${uid}/quests/progress`);
  const progress = {
    schemaVersion: 1,
    statistics: { gamesPlayed: 1 },
    completedSteps: { gamesPlayed: [1] },
    rewardedSteps: { gamesPlayed: [1] },
    totalXpAwarded: 250
  };

  await assertSucceeds(setDoc(questRef, progress));
  assert.equal((await getDoc(questRef)).exists(), true);
  await assertFails(getDoc(otherQuestRef));
  await assertFails(setDoc(otherQuestRef, progress));
  await assertFails(setDoc(forgedPathRef, progress));
});

test('the leaderboard stores the best single-game lines, not cumulative lines', {
  skip: !emulatorAvailable
}, async () => {
  const uid = 'single-game-lines-record';
  await seedPlayer(uid, 4);
  const db = testEnvironment.authenticatedContext(uid).firestore();
  const playerRef = doc(db, `players/${uid}`);
  const firstGameXp = thresholds[4] + 10;
  const secondGameXp = firstGameXp + 10;

  await assertSucceeds(submitClientGame(
    db, uid, 'single-game-lines-0001', firstGameXp, 4, 10, 5
  ));
  await assertSucceeds(submitClientGame(
    db, uid, 'single-game-lines-0002', secondGameXp, 4, 10, 2
  ));

  const player = (await getDoc(playerRef)).data();
  assert.equal(player.lines, 7);
  assert.equal(player.bestSingleGameLines, 5);

  const entryRef = doc(db, `leaderboards/single-game/entries/${uid}`);
  const entry = {
    uid,
    displayName: 'Joueur',
    usernameLower: 'joueur',
    lines: 5,
    bestScore: 10,
    level: 4,
    updatedAt: serverTimestamp()
  };
  await assertSucceeds(setDoc(entryRef, entry));
  await assertFails(setDoc(entryRef, { ...entry, lines: player.lines }));
});

test('Spark rules limit XP writes to the owner but cannot validate browser gameplay', {
  skip: !emulatorAvailable
}, async () => {
  const uid = 'player-can-self-grant-xp';
  await seedPlayer(uid, 4);
  const db = testEnvironment.authenticatedContext(uid).firestore();
  const playerRef = doc(db, `players/${uid}`);
  const gameId = 'client-forged-receipt-0001';

  await assertSucceeds(submitClientGame(
    db, uid, gameId, thresholds[100], 100, thresholds[100] - thresholds[4]
  ));
  assert.equal((await getDoc(playerRef)).data().xp, thresholds[100]);
});

test('an earned XP boost can be recovered once by its owner', {
  skip: !emulatorAvailable
}, async () => {
  const uid = 'earned-xp-boost';
  await seedPlayer(uid, 3);
  const db = testEnvironment.authenticatedContext(uid).firestore();
  const boostRef = doc(db, `players/${uid}/inventory/xp-boost-level-3`);
  const reward = {
    level: 3,
    itemId: 'xp-boost-level-3',
    type: 'xp-boost',
    category: 'xp-boost',
    name: 'Boost XP +5',
    durationMs: 20 * 60 * 1000,
    bonusXp: 5,
    imageUrl: '/boost%20xp/Embl%C3%A8me%20XP%20dor%C3%A9%20X2%20n%C3%A9on.png',
    quantity: 1,
    usedQuantity: 0,
    source: 'battle-pass',
    seasonId: 'season-1',
    unlockedAt: serverTimestamp()
  };
  await assertSucceeds(setDoc(boostRef, reward));
  await assertFails(setDoc(boostRef, reward));
  assert.equal((await getDoc(boostRef)).data().quantity, 1);
});

test('the Battle Pass level-7 XP boost stores boost level 7', {
  skip: !emulatorAvailable
}, async () => {
  const uid = 'earned-xp-boost-level-eight';
  await seedPlayer(uid, 7);
  const db = testEnvironment.authenticatedContext(uid).firestore();
  const boostRef = doc(db, `players/${uid}/inventory/xp-boost-level-7`);
  await assertSucceeds(setDoc(boostRef, {
    level: 7,
    itemId: 'xp-boost-level-7',
    type: 'xp-boost',
    category: 'xp-boost',
    name: 'Boost XP +5',
    durationMs: 20 * 60 * 1000,
    bonusXp: 5,
    imageUrl: '/boost%20xp/Embl%C3%A8me%20XP%20dor%C3%A9%20X2%20n%C3%A9on.png',
    quantity: 1,
    usedQuantity: 0,
    source: 'battle-pass',
    seasonId: 'season-1',
    unlockedAt: serverTimestamp()
  }));
  assert.equal((await getDoc(boostRef)).data().level, 7);
});

test('an owner can select, consume, and finish their own earned XP boost', {
  skip: !emulatorAvailable
}, async () => {
  const uid = 'xp-boost-server-owned';
  const itemId = 'xp-boost-level-3';
  await seedPlayer(uid, 3);
  await testEnvironment.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    await setDoc(doc(db, `players/${uid}/inventory/${itemId}`), {
      itemId,
      level: 3,
      type: 'xp-boost',
      category: 'xp-boost',
      name: 'Boost XP +5',
      durationMs: 20 * 60 * 1000,
      bonusXp: 5,
      quantity: 1,
      usedQuantity: 0,
      source: 'battle-pass',
      seasonId: 'season-1',
      unlockedAt: new Date()
    });
    await setDoc(doc(db, `players/${uid}/xpBoostState/current`), {
      selectedBoostId: itemId,
      activeBoostId: null,
      activeRemainingMs: 0
    });
  });

  const ownerDb = testEnvironment.authenticatedContext(uid).firestore();
  const itemRef = doc(ownerDb, `players/${uid}/inventory/${itemId}`);
  const stateRef = doc(ownerDb, `players/${uid}/xpBoostState/current`);
  assert.equal((await getDoc(itemRef)).data().quantity, 1);
  assert.equal((await getDoc(stateRef)).data().selectedBoostId, itemId);
  await assertSucceeds(setDoc(stateRef, {
    selectedBoostId: itemId,
    updatedAt: serverTimestamp()
  }, { merge: true }));
  const sessionId = 'xp-boost-game-session-0001';
  const startedAt = Timestamp.fromDate(new Date());
  const expiresAt = Timestamp.fromMillis(startedAt.toMillis() + 20 * 60 * 1000);
  await assertSucceeds(runTransaction(ownerDb, async transaction => {
    const [item, state] = await Promise.all([
      transaction.get(itemRef),
      transaction.get(stateRef)
    ]);
    transaction.update(itemRef, {
      usedQuantity: item.data().usedQuantity + 1,
      updatedAt: serverTimestamp()
    });
    transaction.update(stateRef, {
      selectedBoostId: null,
      activeBoostId: itemId,
      activeRemainingMs: 20 * 60 * 1000,
      activeStartedAt: startedAt,
      activeExpiresAt: expiresAt,
      activeSessionId: sessionId,
      pausedSessionId: null,
      updatedAt: serverTimestamp()
    });
  }));
  assert.equal((await getDoc(itemRef)).data().usedQuantity, 1);
  await assertFails(updateDoc(stateRef, {
    activeExpiresAt: Timestamp.fromMillis(expiresAt.toMillis() + 1),
    updatedAt: serverTimestamp()
  }));
  await assertFails(updateDoc(itemRef, {
    usedQuantity: 2, updatedAt: serverTimestamp()
  }));
  await assertSucceeds(updateDoc(stateRef, {
    activeBoostId: null,
    activeRemainingMs: 0,
    activeStartedAt: null,
    activeExpiresAt: null,
    activeSessionId: null,
    pausedSessionId: null,
    updatedAt: serverTimestamp()
  }));
  await assertFails(setDoc(doc(ownerDb, `players/${uid}/inventory/xp-boost-level-8`), {
    level: 8,
    itemId: 'xp-boost-level-8',
    type: 'xp-boost',
    category: 'xp-boost',
    name: 'Boost XP +5',
    durationMs: 20 * 60 * 1000,
    bonusXp: 5,
    imageUrl: '/boost%20xp/Embl%C3%A8me%20XP%20dor%C3%A9%20X2%20n%C3%A9on.png',
    quantity: 1,
    usedQuantity: 0,
    source: 'battle-pass',
    seasonId: 'season-1',
    unlockedAt: serverTimestamp()
  }));
  await assertFails(getDoc(doc(testEnvironment.authenticatedContext('other-xp-player')
    .firestore(), `players/${uid}/xpBoostState/current`)));
});

test('a player can claim an earned skin from verified Firestore XP, but not a future skin', {
  skip: !emulatorAvailable
}, async () => {
  const uid = 'earned-skin-claim';
  await seedPlayer(uid, 10);
  const db = testEnvironment.authenticatedContext(uid).firestore();
  const earnedSkinRef = doc(db, `players/${uid}/inventory/skin-02`);
  const futureSkinRef = doc(db, `players/${uid}/inventory/skin-03`);

  const skinData = {
    level: 10,
    itemId: 'skin-02',
    type: 'skin',
    name: 'Skin 2',
    source: 'battle-pass',
    seasonId: 'season-1',
    unlockedAt: serverTimestamp()
  };
  await assertFails(setDoc(futureSkinRef, {
    ...skinData,
    level: 15,
    itemId: 'skin-03',
    name: 'Skin 3'
  }));
  await assertSucceeds(setDoc(earnedSkinRef, skinData));
  await assertFails(setDoc(earnedSkinRef, skinData));
  assert.equal((await getDoc(earnedSkinRef)).data().type, 'skin');
});

test('a player can claim an earned Battle Pass loading screen, but not an unearned one', {
  skip: !emulatorAvailable
}, async () => {
  const uid = 'earned-loading-screen-claim';
  await seedPlayer(uid, 2);
  const db = testEnvironment.authenticatedContext(uid).firestore();
  const earnedRef = doc(db, `players/${uid}/inventory/loading-screen-bp-01`);
  const futureRef = doc(db, `players/${uid}/inventory/loading-screen-bp-02`);
  const item = {
    level: 2,
    itemId: 'loading-screen-bp-01',
    type: 'loading-screen',
    category: 'loading-screen',
    name: 'Tétris néon sous un ciel cosmique',
    imageUrl: '/Batll%20Pass%20ecran%20chargement/T%C3%A9tris%20n%C3%A9on%20sous%20un%20ciel%20cosmique.png',
    source: 'battle-pass',
    seasonId: 'season-1',
    unlockedAt: serverTimestamp()
  };
  await assertFails(setDoc(futureRef, {
    ...item,
    level: 6,
    itemId: 'loading-screen-bp-02',
    name: 'Trône néon aux blocs violets',
    imageUrl: '/Batll%20Pass%20ecran%20chargement/Tr%C3%B4ne%20n%C3%A9on%20aux%20blocs%20violets.png'
  }));
  await assertFails(setDoc(earnedRef, { ...item, imageUrl: '/wrong-image.png' }));
  await assertSucceeds(setDoc(earnedRef, item));
  assert.equal((await getDoc(earnedRef)).data().type, 'loading-screen');
});

test('a player can claim and equip earned Battle Pass music only', {
  skip: !emulatorAvailable
}, async () => {
  const uid = 'earned-battle-pass-music';
  await seedPlayer(uid, 1);
  const db = testEnvironment.authenticatedContext(uid).firestore();
  const earnedRef = doc(db, `players/${uid}/inventory/music-bp-01`);
  const futureRef = doc(db, `players/${uid}/inventory/music-bp-02`);
  const item = {
    level: 1,
    itemId: 'music-bp-01',
    type: 'music',
    category: 'music',
    name: 'High Score',
    audioUrl: '/Batll%20Pass%20musique/17-high-scoremp3.mp3',
    imageUrl: '/Batll%20Pass%20musique/Ic%C3%B4ne%20n%C3%A9on%20de%20notes%20musicales.png',
    source: 'battle-pass',
    seasonId: 'season-1',
    unlockedAt: serverTimestamp()
  };
  await assertFails(setDoc(futureRef, {
    ...item,
    level: 9,
    itemId: 'music-bp-02',
    name: 'Pixel Rush',
    audioUrl: '/Batll%20Pass%20musique/19-sfx.mp3'
  }));
  await assertFails(setDoc(earnedRef, { ...item, audioUrl: '/wrong-track.mp3' }));
  await assertSucceeds(setDoc(earnedRef, item));

  const preferencesRef = doc(db, `players/${uid}/preferences/current`);
  const preferences = {
    equippedSkin: 'default',
    equippedMusic: 'music-bp-01',
    equippedLoadingScreen: 'none',
    settings: { music: true, musicVolume: 70, blocksVolume: 80 },
    updatedAt: serverTimestamp()
  };
  await assertSucceeds(setDoc(preferencesRef, preferences));
  await assertFails(setDoc(preferencesRef, {
    ...preferences,
    equippedMusic: 'music-bp-02',
    updatedAt: serverTimestamp()
  }));
});

test('an earned legacy skin document can be repaired without deleting its other fields', {
  skip: !emulatorAvailable
}, async () => {
  const uid = 'repair-legacy-redbull';
  await seedPlayer(uid, 5);
  await testEnvironment.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), `players/${uid}/inventory/redbull`), {
      itemId: 'redbull',
      type: 'legacy-skin',
      legacyNote: 'preserve this field'
    });
  });
  const db = testEnvironment.authenticatedContext(uid).firestore();
  const inventoryRef = doc(db, `players/${uid}/inventory/redbull`);

  await assertSucceeds(updateDoc(inventoryRef, {
    level: 5,
    itemId: 'redbull',
    type: 'skin',
    name: 'Red Bull',
    source: 'battle-pass',
    seasonId: 'season-1',
    unlockedAt: serverTimestamp()
  }));
  const repaired = (await getDoc(inventoryRef)).data();
  assert.equal(repaired.type, 'skin');
  assert.equal(repaired.legacyNote, 'preserve this field');
});

test('a player can claim each earned 100-credit reward only once', {
  skip: !emulatorAvailable
}, async () => {
  const uid = 'earned-credit-claim';
  await seedPlayer(uid, 4);
  const db = testEnvironment.authenticatedContext(uid).firestore();
  const playerRef = doc(db, `players/${uid}`);
  const stateRef = doc(db, `players/${uid}/battlePassSeasons/season-1`);
  const receiptRef = doc(db, `players/${uid}/battlePassSeasons/season-1/rewards/4`);

  const claim = writeBatch(db);
  claim.update(playerRef, {
    credits: 375,
    battlePass: { seasonId: 'season-1', level: 4, lastCreditRewardLevel: '4' },
    updatedAt: serverTimestamp()
  });
  claim.set(stateRef, {
    seasonId: 'season-1',
    creditRewardLevels: [4],
    updatedAt: serverTimestamp()
  });
  claim.set(receiptRef, {
    level: 4,
    credits: 100,
    seasonId: 'season-1',
    claimedAt: serverTimestamp()
  });
  await assertSucceeds(claim.commit());
  assert.equal((await getDoc(playerRef)).data().credits, 375);

  const duplicate = writeBatch(db);
  duplicate.update(playerRef, {
    credits: 475,
    battlePass: { seasonId: 'season-1', level: 4, lastCreditRewardLevel: '4' },
    updatedAt: serverTimestamp()
  });
  duplicate.set(stateRef, {
    seasonId: 'season-1',
    creditRewardLevels: [4, 8],
    updatedAt: serverTimestamp()
  });
  duplicate.set(receiptRef, {
    level: 4,
    credits: 100,
    seasonId: 'season-1',
    claimedAt: serverTimestamp()
  });
  await assertFails(duplicate.commit());
  assert.equal((await getDoc(playerRef)).data().credits, 375);
});

test('a player cannot claim credits before reaching the XP threshold or edit the balance directly', {
  skip: !emulatorAvailable
}, async () => {
  const uid = 'unearned-credit-claim';
  await seedPlayer(uid, 3);
  const db = testEnvironment.authenticatedContext(uid).firestore();
  const playerRef = doc(db, `players/${uid}`);
  const stateRef = doc(db, `players/${uid}/battlePassSeasons/season-1`);
  const receiptRef = doc(db, `players/${uid}/battlePassSeasons/season-1/rewards/4`);

  const unearnedClaim = writeBatch(db);
  unearnedClaim.update(playerRef, {
    credits: 375,
    battlePass: { seasonId: 'season-1', level: 3, lastCreditRewardLevel: '4' },
    updatedAt: serverTimestamp()
  });
  unearnedClaim.set(stateRef, {
    seasonId: 'season-1',
    creditRewardLevels: [4],
    updatedAt: serverTimestamp()
  });
  unearnedClaim.set(receiptRef, {
    level: 4,
    credits: 100,
    seasonId: 'season-1',
    claimedAt: serverTimestamp()
  });
  await assertFails(unearnedClaim.commit());
  await assertFails(updateDoc(doc(db, `players/${uid}`), {
    credits: 375,
    updatedAt: serverTimestamp()
  }));
  assert.equal((await getDoc(playerRef)).data().credits, 275);
});

test('the owner can read and equip an existing skin but cannot equip an unowned skin', {
  skip: !emulatorAvailable
}, async () => {
  const uid = 'owner-equips-earned-skin';
  await seedPlayer(uid, 1);
  await testEnvironment.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), `players/${uid}/inventory/redbull`), {
      level: 5,
      itemId: 'redbull',
      type: 'skin',
      name: 'Red Bull',
      source: 'battle-pass',
      seasonId: 'season-1',
      unlockedAt: new Date()
    });
  });
  const db = testEnvironment.authenticatedContext(uid).firestore();

  assert.equal((await getDoc(doc(db, `players/${uid}/inventory/redbull`))).exists(), true);
  await assertFails(setDoc(doc(db, `players/${uid}/preferences/current`), {
    equippedSkin: 'skin-20',
    equippedMusic: 'none',
    settings: { music: true, musicVolume: 70, blocksVolume: 80 },
    updatedAt: serverTimestamp()
  }));
  await assertSucceeds(setDoc(doc(db, `players/${uid}/preferences/current`), {
    equippedSkin: 'redbull',
    equippedMusic: 'none',
    settings: { music: true, musicVolume: 70, blocksVolume: 80 },
    updatedAt: serverTimestamp()
  }));
});
