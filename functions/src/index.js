'use strict';

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const {
  onDocumentCreated, onDocumentWritten
} = require('firebase-functions/v2/firestore');
const { initializeApp } = require('firebase-admin/app');
const { FieldPath, FieldValue, Timestamp, getFirestore } = require('firebase-admin/firestore');
const { randomInt } = require('node:crypto');
const {
  BATTLE_PASS_ITEM_REWARDS, getBattlePassRewardPlan, getProgression,
  getUnclaimedBattlePassCreditLevels, getUnclaimedBattlePassItemRewards, MAX_LEVEL, MAX_XP,
  BATTLE_PASS_XP_BOOST_REWARDS, BATTLE_PASS_CREDIT_REWARD_LEVELS,
  LEGACY_BATTLE_PASS_CREDIT_REWARD_LEVELS, XP_BOOST_DURATION_MS, getXpBoostRemainingMs
} = require('./progression');
const { simulateGame } = require('./tetris-engine');
const { applyQuestProgress } = require('./quests');

initializeApp();
const db = getFirestore();

function xpBoostStateRef(uid) {
  return db.doc(`players/${uid}/xpBoostState/current`);
}

function xpBoostInventoryRef(uid, itemId) {
  return db.doc(`players/${uid}/inventory/${itemId}`);
}

function isXpBoostItem(item, itemId) {
  const expected = BATTLE_PASS_XP_BOOST_REWARDS.find(reward => reward.itemId === itemId);
  const legacyItemLevel = /^xp-boost-level-(\d+)$/.exec(itemId)?.[1];
  const validLevel = expected && (item?.level === expected.level ||
    item?.level === Number(legacyItemLevel)) ||
    itemId === 'xp-boost-level-8' && item?.level === 8;
  return Boolean(validLevel && item && item.itemId === itemId &&
    item.type === 'xp-boost' && item.category === 'xp-boost' &&
    item.durationMs === XP_BOOST_DURATION_MS &&
    item.bonusXp === expected.bonusXp);
}

function requireAuth(request) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Connecte-toi pour continuer.');
  }
  return request.auth.uid;
}

function getUpdatedBattlePass(currentBattlePass, level) {
  if (currentBattlePass !== undefined &&
      (!currentBattlePass || typeof currentBattlePass !== 'object' ||
        Array.isArray(currentBattlePass))) {
    throw new HttpsError('failed-precondition', 'La progression Battle Pass existante est invalide.');
  }
  const battlePass = { ...(currentBattlePass || {}) };
  if ((battlePass.seasonId !== undefined &&
      (typeof battlePass.seasonId !== 'string' || !battlePass.seasonId)) ||
      (battlePass.level !== undefined &&
      (!Number.isSafeInteger(battlePass.level) || battlePass.level < 1 || battlePass.level > 100))) {
    throw new HttpsError('failed-precondition', 'La progression Battle Pass existante est invalide.');
  }
  if (!battlePass.seasonId) battlePass.seasonId = 'season-1';
  if (battlePass.seasonId === 'season-1' &&
      (battlePass.level === undefined || battlePass.level < level)) {
    battlePass.level = level;
  }
  return battlePass;
}

function getPlayerBattlePassLevel(player) {
  return Number.isSafeInteger(player.xp) && player.xp >= 0 && player.xp <= MAX_XP
    ? getProgression(player.xp).level : 0;
}

function getBattlePassCreditRewards(player, battlePass, rewardState, earnedLevel) {
  if (battlePass.seasonId !== 'season-1') {
    return { creditsGranted: 0, credits: player.credits, claimedLevels: [] };
  }

  const storedLevels = rewardState && rewardState.creditRewardLevels !== undefined
    ? rewardState.creditRewardLevels : [];
  let uniqueClaimedLevels;
  let unclaimedLevels;
  try {
    getUnclaimedBattlePassCreditLevels(MAX_LEVEL, storedLevels);
    const claimedLevels = [...storedLevels];
    const marker = player.battlePass?.lastCreditRewardLevel;
    if (marker !== undefined) {
      const markerLevel = Number(marker);
      if (typeof marker !== 'string' || String(markerLevel) !== marker ||
          !Number.isSafeInteger(markerLevel) ||
          !BATTLE_PASS_CREDIT_REWARD_LEVELS.includes(markerLevel) &&
            !LEGACY_BATTLE_PASS_CREDIT_REWARD_LEVELS.includes(markerLevel)) {
        throw new TypeError('Invalid Battle Pass credit reward marker.');
      }
      claimedLevels.push(...getUnclaimedBattlePassCreditLevels(markerLevel, []));
    }
    uniqueClaimedLevels = [...new Set(claimedLevels)].sort((a, b) => a - b);
    unclaimedLevels = getUnclaimedBattlePassCreditLevels(earnedLevel, uniqueClaimedLevels);
  } catch (error) {
    throw new HttpsError(
      'failed-precondition',
      'L’historique des récompenses de crédits est invalide; aucun solde n’a été modifié.'
    );
  }
  let rewardPlan;
  try {
    rewardPlan = getBattlePassRewardPlan(earnedLevel, player.credits, uniqueClaimedLevels);
  } catch (error) {
    if (unclaimedLevels.length > 0) {
      throw new HttpsError(
        'failed-precondition',
        'Le solde existant ne permet pas d’ajouter les crédits Battle Pass sans risque.'
      );
    }
    throw error;
  }
  return {
    creditsGranted: rewardPlan.creditsGranted,
    credits: rewardPlan.credits,
    claimedLevels: rewardPlan.claimedCreditLevels
  };
}

function getBattlePassItemRewardRefs(uid) {
  return BATTLE_PASS_ITEM_REWARDS.map(reward =>
    db.doc(`players/${uid}/inventory/${reward.itemId}`));
}

function questProgressRef(uid) {
  return db.doc(`players/${uid}/quests/progress`);
}

function getQuestRewardProgression(player, rewardXp) {
  if (!Number.isSafeInteger(player.xp) || player.xp < 0 || player.xp > MAX_XP) {
    throw new HttpsError('failed-precondition', 'Le total XP existant est invalide; aucune donnée n’a été modifiée.');
  }
  const progression = getProgression(player.xp + rewardXp);
  return {
    ...progression,
    battlePass: getUpdatedBattlePass(player.battlePass, progression.level)
  };
}

function saveQuestProgress(transaction, ref, questResult) {
  transaction.set(ref, {
    ...questResult.progress,
    updatedAt: FieldValue.serverTimestamp()
  });
}

function grantBattlePassItemRewards(
  transaction, battlePass, rewardRefs, rewardSnapshots, earnedLevel
) {
  if (battlePass.seasonId !== 'season-1') return { granted: false, owned: false };
  const ownedItemIds = rewardSnapshots
    .filter(snapshot => snapshot.exists)
    .map(snapshot => snapshot.ref.id);
  const eligibleRewards = getUnclaimedBattlePassItemRewards(earnedLevel);
  const unownedRewards = getUnclaimedBattlePassItemRewards(earnedLevel, ownedItemIds);
  unownedRewards.forEach(reward => {
    const rewardRef = rewardRefs.find(ref => ref.id === reward.itemId);
    if (!rewardRef) {
      throw new HttpsError('failed-precondition', 'Une récompense Battle Pass n’a pas de document de casier configuré.');
    }
    transaction.create(rewardRef, {
      ...reward,
      source: 'battle-pass',
      seasonId: 'season-1',
      unlockedAt: FieldValue.serverTimestamp()
    });
  });
  return {
    granted: unownedRewards.length > 0,
    owned: eligibleRewards.length > 0,
    rewardsGranted: unownedRewards
  };
}

async function syncBattlePassRewardsForPlayer(uid) {
  const playerRef = db.doc(`players/${uid}`);
  const rewardRefs = getBattlePassItemRewardRefs(uid);
  const creditRewardsRef = db.doc(`players/${uid}/battlePassSeasons/season-1`);
  let granted = false;
  let owned = false;
  let creditsGranted = 0;
  let rewardsGranted = [];

  await db.runTransaction(async transaction => {
    granted = false;
    owned = false;
    creditsGranted = 0;
    rewardsGranted = [];
    const [playerSnapshot, creditRewardsSnapshot, ...rewardSnapshots] = await Promise.all([
      transaction.get(playerRef),
      transaction.get(creditRewardsRef),
      ...rewardRefs.map(ref => transaction.get(ref))
    ]);
    if (!playerSnapshot.exists) {
      throw new HttpsError('failed-precondition', 'Le profil joueur est introuvable.');
    }

    const player = playerSnapshot.data();
    if (!Number.isSafeInteger(player.xp) || player.xp < 0 || player.xp > MAX_XP) {
      throw new HttpsError('failed-precondition', 'Le total XP existant est invalide.');
    }
    const progressionLevel = getProgression(player.xp).level;
    const battlePass = getUpdatedBattlePass(
      player.battlePass,
      progressionLevel
    );
    if (battlePass.seasonId !== 'season-1') return;

    const creditRewards = getBattlePassCreditRewards(
      player,
      battlePass,
      creditRewardsSnapshot.exists ? creditRewardsSnapshot.data() : null,
      progressionLevel
    );
    if (creditRewards.creditsGranted > 0) {
      transaction.update(playerRef, {
        credits: creditRewards.credits,
        ...(battlePass.level !== player.battlePass?.level ||
          battlePass.seasonId !== player.battlePass?.seasonId ? { battlePass } : {}),
        updatedAt: FieldValue.serverTimestamp()
      });
      transaction.set(creditRewardsRef, {
        seasonId: 'season-1',
        creditRewardLevels: creditRewards.claimedLevels,
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
      creditsGranted = creditRewards.creditsGranted;
    } else if (battlePass.seasonId !== player.battlePass?.seasonId ||
        battlePass.level !== player.battlePass?.level) {
      transaction.update(playerRef, {
        battlePass,
        updatedAt: FieldValue.serverTimestamp()
      });
    }

    const itemRewardResult = grantBattlePassItemRewards(
      transaction, battlePass, rewardRefs, rewardSnapshots, progressionLevel
    );
    granted = itemRewardResult.granted;
    owned = itemRewardResult.owned;
    rewardsGranted = itemRewardResult.rewardsGranted;
  });

  return { granted, owned, creditsGranted, rewardsGranted };
}

exports.createPlayerProfile = onCall({ region: 'europe-west1' }, async request => {
  const uid = requireAuth(request);
  const name = typeof request.data?.displayName === 'string' ? request.data.displayName.trim() : '';
  if (name.length < 3 || name.length > 24 || !/^[\p{L}\p{N}_-]+$/u.test(name)) {
    throw new HttpsError('invalid-argument', 'Le pseudo doit contenir entre 3 et 24 caractères.');
  }
  const email = typeof request.auth.token.email === 'string' ? request.auth.token.email : '';
  if (!email) {
    throw new HttpsError('failed-precondition', 'Le compte Authentication ne fournit pas d’adresse e-mail.');
  }

  const username = name.toLocaleLowerCase('fr');
  const playerRef = db.doc(`players/${uid}`);
  const legacyRef = db.doc(`users/${uid}`);
  const publicRef = db.doc(`publicProfiles/${uid}`);

  await db.runTransaction(async transaction => {
    const existingPlayer = await transaction.get(playerRef);
    if (existingPlayer.exists) return;

    const legacyPlayer = await transaction.get(legacyRef);
    const legacy = legacyPlayer.exists ? legacyPlayer.data() : {};
    for (const [field, value] of Object.entries({
      xp: legacy.xp,
      lines: legacy.lines,
      credits: legacy.credits
    })) {
      if (value !== undefined && (!Number.isSafeInteger(value) || value < 0 ||
          (field === 'xp' && value > MAX_XP))) {
        throw new HttpsError(
          'failed-precondition',
          `Le profil historique contient une valeur ${field} invalide; aucune donnée n’a été modifiée.`
        );
      }
    }
    if ((legacy.battlePass !== undefined &&
        (!legacy.battlePass || typeof legacy.battlePass !== 'object' || Array.isArray(legacy.battlePass))) ||
        (legacy.statistics !== undefined &&
        (!legacy.statistics || typeof legacy.statistics !== 'object' || Array.isArray(legacy.statistics)))) {
      throw new HttpsError(
        'failed-precondition',
        'Le profil historique contient une progression ou des statistiques invalides; aucune donnée n’a été modifiée.'
      );
    }
    if ((legacy.battlePass?.seasonId !== undefined &&
        (typeof legacy.battlePass.seasonId !== 'string' || !legacy.battlePass.seasonId)) ||
        (legacy.battlePass?.level !== undefined &&
        (!Number.isSafeInteger(legacy.battlePass.level) ||
          legacy.battlePass.level < 1 || legacy.battlePass.level > 100)) ||
        (legacy.statistics?.gamesPlayed !== undefined &&
        (!Number.isSafeInteger(legacy.statistics.gamesPlayed) || legacy.statistics.gamesPlayed < 0)) ||
        (legacy.statistics?.bestScore !== undefined &&
        (!Number.isSafeInteger(legacy.statistics.bestScore) || legacy.statistics.bestScore < 0))) {
      throw new HttpsError(
        'failed-precondition',
        'Le profil historique contient un niveau Battle Pass ou des statistiques invalides; aucune donnée n’a été modifiée.'
      );
    }
    const legacyName = typeof legacy.displayName === 'string' ? legacy.displayName.trim() : '';
    const displayName = legacyName.length >= 3 && legacyName.length <= 24 &&
      /^[\p{L}\p{N}_-]+$/u.test(legacyName) ? legacyName : name;
    const legacyUsername = typeof legacy.usernameLower === 'string' &&
      /^[\p{L}\p{N}_-]{3,24}$/u.test(legacy.usernameLower) ? legacy.usernameLower : '';
    const effectiveUsername = legacyUsername || displayName.toLocaleLowerCase('fr');
    const usernameRef = db.doc(`usernames/${effectiveUsername}`);
    const [existingUsername, existingPublicProfile] = await Promise.all([
      transaction.get(usernameRef), transaction.get(publicRef)
    ]);
    if (existingUsername.exists && existingUsername.data().uid !== uid) {
      throw new HttpsError('already-exists', 'Ce pseudo est déjà utilisé.');
    }

    const createdAt = FieldValue.serverTimestamp();
    const progression = getProgression(legacy.xp);
    const battlePass = getUpdatedBattlePass(legacy.battlePass, progression.level);
    const statistics = {
      ...(legacy.statistics || {}),
      gamesPlayed: legacy.statistics?.gamesPlayed ?? 0,
      bestScore: legacy.statistics?.bestScore ?? 0
    };
    const profileData = {
      displayName,
      email,
      usernameLower: effectiveUsername || username,
      xp: progression.xp,
      level: progression.level,
      lines: legacy.lines === undefined ? 0 : legacy.lines,
      credits: legacy.credits === undefined ? 0 : legacy.credits,
      battlePass,
      statistics,
      createdAt: legacy.createdAt || createdAt,
      updatedAt: createdAt
    };

    if (!existingUsername.exists) transaction.create(usernameRef, { uid });
    transaction.create(playerRef, profileData);
    if (!existingPublicProfile.exists) {
      transaction.create(publicRef, {
        displayName,
        usernameLower: profileData.usernameLower,
        createdAt: profileData.createdAt
      });
    } else {
      transaction.update(publicRef, {
        displayName,
        usernameLower: profileData.usernameLower
      });
    }
  });

  return { ok: true };
});

exports.startGameSession = onCall({ region: 'europe-west1' }, async request => {
  const uid = requireAuth(request);
  const sessionRef = db.collection('gameSessions').doc();
  const seed = randomInt(1, 0x1_0000_0000);
  const stateRef = xpBoostStateRef(uid);
  const playerRef = db.doc(`players/${uid}`);
  const questRef = questProgressRef(uid);
  let gameBoostDurationMs = 0;
  let gameBoostId = null;
  await db.runTransaction(async transaction => {
    const [stateSnapshot, playerSnapshot, questSnapshot] = await Promise.all([
      transaction.get(stateRef),
      transaction.get(playerRef),
      transaction.get(questRef)
    ]);
    if (!playerSnapshot.exists) {
      throw new HttpsError('failed-precondition', 'Le profil joueur est introuvable.');
    }
    const state = stateSnapshot.exists ? stateSnapshot.data() : {};
    const now = Date.now();
    const previousSessionId = state.activeSessionId || state.pausedSessionId || null;
    const previousSessionRef = previousSessionId && previousSessionId !== sessionRef.id
      ? db.doc(`gameSessions/${previousSessionId}`) : null;
    const previousSessionSnapshot = previousSessionRef
      ? await transaction.get(previousSessionRef) : null;
    let activeBoostId = state.activeBoostId || null;
    let activeRemainingMs = getXpBoostRemainingMs(state, now);
    let boostRef = null;
    let boostSnapshot = null;

    if (activeRemainingMs === 0) {
      activeBoostId = state.selectedBoostId || null;
      if (activeBoostId) {
        boostRef = xpBoostInventoryRef(uid, activeBoostId);
        boostSnapshot = await transaction.get(boostRef);
        const boost = boostSnapshot.exists ? boostSnapshot.data() : null;
        const quantity = boost?.quantity ?? 1;
        const usedQuantity = boost?.usedQuantity ?? 0;
        if (!isXpBoostItem(boost, activeBoostId) ||
            !Number.isSafeInteger(quantity) || quantity < 1 ||
            !Number.isSafeInteger(usedQuantity) || usedQuantity < 0 ||
            usedQuantity >= quantity) {
          throw new HttpsError('failed-precondition', 'Le boost XP sélectionné n’est plus disponible.');
        }
        activeRemainingMs = XP_BOOST_DURATION_MS;
        transaction.update(boostRef, {
          usedQuantity: usedQuantity + 1,
          updatedAt: FieldValue.serverTimestamp()
        });
        const questResult = applyQuestProgress(
          questSnapshot.exists ? questSnapshot.data() : null,
          { xpBoostsActivated: 1 }
        );
        const player = playerSnapshot.data();
        const questProgression = getQuestRewardProgression(player, questResult.rewardXp);
        transaction.update(playerRef, {
          xp: questProgression.xp,
          level: questProgression.level,
          battlePass: questProgression.battlePass,
          updatedAt: FieldValue.serverTimestamp()
        });
        saveQuestProgress(transaction, questRef, questResult);
      }
    }

    gameBoostDurationMs = activeRemainingMs;
    gameBoostId = activeRemainingMs > 0 ? activeBoostId : null;
    if (previousSessionSnapshot?.exists && !previousSessionSnapshot.data().submittedAt) {
      transaction.update(previousSessionRef, {
        supersededAt: Timestamp.fromMillis(now)
      });
    }
    transaction.set(stateRef, {
      selectedBoostId: null,
      activeBoostId: activeRemainingMs > 0 ? activeBoostId : null,
      activeRemainingMs,
      activeStartedAt: activeRemainingMs > 0 ? Timestamp.fromMillis(now) : null,
      activeExpiresAt: activeRemainingMs > 0
        ? Timestamp.fromMillis(now + activeRemainingMs) : null,
      activeSessionId: activeRemainingMs > 0 ? sessionRef.id : null,
      pausedSessionId: null,
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });

    transaction.create(sessionRef, {
      uid,
      seed,
      createdAt: Timestamp.fromMillis(now),
      expiresAt: new Date(now + 6 * 60 * 60 * 1_000),
      xpBoostId: activeRemainingMs > 0 ? activeBoostId : null,
      xpBoostDurationMs: activeRemainingMs,
      pausedTotalMs: 0,
      pausedAt: null,
      submittedAt: null
    });
  });
  return {
    sessionId: sessionRef.id,
    seed,
    xpBoostId: gameBoostId,
    xpBoostDurationMs: gameBoostDurationMs
  };
});

exports.selectXpBoost = onCall({ region: 'europe-west1' }, async request => {
  const uid = requireAuth(request);
  const itemId = request.data?.itemId;
  if (typeof itemId !== 'string' ||
      !BATTLE_PASS_XP_BOOST_REWARDS.some(reward => reward.itemId === itemId)) {
    throw new HttpsError('invalid-argument', 'Boost XP invalide.');
  }
  const stateRef = xpBoostStateRef(uid);
  const inventoryRef = xpBoostInventoryRef(uid, itemId);
  await db.runTransaction(async transaction => {
    const [stateSnapshot, inventorySnapshot] = await Promise.all([
      transaction.get(stateRef), transaction.get(inventoryRef)
    ]);
    const state = stateSnapshot.exists ? stateSnapshot.data() : {};
    if (getXpBoostRemainingMs(state) > 0) {
      throw new HttpsError('failed-precondition', 'Termine ta partie avant de sélectionner un autre boost.');
    }
    const previousSessionId = state.activeSessionId || state.pausedSessionId || null;
    const previousSessionRef = previousSessionId
      ? db.doc(`gameSessions/${previousSessionId}`) : null;
    const previousSessionSnapshot = previousSessionRef
      ? await transaction.get(previousSessionRef) : null;
    const item = inventorySnapshot.exists ? inventorySnapshot.data() : null;
    const quantity = item?.quantity ?? 1;
    const usedQuantity = item?.usedQuantity ?? 0;
    if (!isXpBoostItem(item, itemId) ||
        !Number.isSafeInteger(quantity) || quantity < 1 ||
        !Number.isSafeInteger(usedQuantity) || usedQuantity < 0 ||
        usedQuantity >= quantity) {
      throw new HttpsError('failed-precondition', 'Tu ne possèdes plus ce boost XP.');
    }
    if (previousSessionSnapshot?.exists && !previousSessionSnapshot.data().submittedAt) {
      transaction.update(previousSessionRef, {
        supersededAt: FieldValue.serverTimestamp()
      });
    }
    transaction.set(stateRef, {
      selectedBoostId: itemId,
      activeBoostId: null,
      activeRemainingMs: 0,
      activeStartedAt: null,
      activeExpiresAt: null,
      activeSessionId: null,
      pausedSessionId: null,
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
  });
  return { ok: true, selectedBoostId: itemId };
});

exports.pauseXpBoost = onCall({ region: 'europe-west1' }, async request => {
  const uid = requireAuth(request);
  const sessionId = request.data?.sessionId;
  if (typeof sessionId !== 'string' || !/^[A-Za-z0-9_-]{20,}$/.test(sessionId)) {
    throw new HttpsError('invalid-argument', 'Session de partie invalide.');
  }
  const stateRef = xpBoostStateRef(uid);
  const sessionRef = db.doc(`gameSessions/${sessionId}`);
  let remainingMs = 0;
  await db.runTransaction(async transaction => {
    const [stateSnapshot, sessionSnapshot] = await Promise.all([
      transaction.get(stateRef), transaction.get(sessionRef)
    ]);
    if (!sessionSnapshot.exists || sessionSnapshot.data().uid !== uid ||
        sessionSnapshot.data().submittedAt) return;
    const state = stateSnapshot.exists ? stateSnapshot.data() : {};
    const now = Date.now();
    if (!sessionSnapshot.data().pausedAt) {
      transaction.update(sessionRef, { pausedAt: Timestamp.fromMillis(now) });
    }
    if (state.activeSessionId !== sessionId || !state.activeBoostId) return;
    remainingMs = getXpBoostRemainingMs(state, now);
    transaction.set(stateRef, {
      activeRemainingMs: remainingMs,
      activeStartedAt: null,
      activeExpiresAt: null,
      activeSessionId: null,
      pausedSessionId: sessionId,
      activeBoostId: remainingMs > 0 ? state.activeBoostId : null,
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
  });
  return { remainingMs };
});

exports.resumeXpBoost = onCall({ region: 'europe-west1' }, async request => {
  const uid = requireAuth(request);
  const sessionId = request.data?.sessionId;
  if (typeof sessionId !== 'string' || !/^[A-Za-z0-9_-]{20,}$/.test(sessionId)) {
    throw new HttpsError('invalid-argument', 'Session de partie invalide.');
  }
  const stateRef = xpBoostStateRef(uid);
  const sessionRef = db.doc(`gameSessions/${sessionId}`);
  let remainingMs = 0;
  await db.runTransaction(async transaction => {
    const [stateSnapshot, sessionSnapshot] = await Promise.all([
      transaction.get(stateRef), transaction.get(sessionRef)
    ]);
    if (!sessionSnapshot.exists || sessionSnapshot.data().uid !== uid ||
        sessionSnapshot.data().submittedAt) return;
    const state = stateSnapshot.exists ? stateSnapshot.data() : {};
    const now = Date.now();
    const session = sessionSnapshot.data();
    if (session.pausedAt?.toMillis) {
      const pausedTotalMs = (session.pausedTotalMs || 0) +
        Math.max(0, now - session.pausedAt.toMillis());
      transaction.update(sessionRef, {
        pausedTotalMs,
        pausedAt: null
      });
    }
    if (state.pausedSessionId !== sessionId || !state.activeBoostId) return;
    remainingMs = getXpBoostRemainingMs(state, now);
    if (remainingMs <= 0) {
      transaction.set(stateRef, {
        activeBoostId: null,
        activeRemainingMs: 0,
        activeStartedAt: null,
        activeExpiresAt: null,
        activeSessionId: null,
        pausedSessionId: null,
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
      return;
    }
    transaction.set(stateRef, {
      activeStartedAt: Timestamp.fromMillis(now),
      activeExpiresAt: Timestamp.fromMillis(now + remainingMs),
      activeSessionId: sessionId,
      pausedSessionId: null,
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
  });
  return { remainingMs };
});

exports.syncProgression = onCall({ region: 'europe-west1' }, async request => {
  const uid = requireAuth(request);
  const playerRef = db.doc(`players/${uid}`);
  const creditRewardsRef = db.doc(`players/${uid}/battlePassSeasons/season-1`);
  const itemRewardRefs = getBattlePassItemRewardRefs(uid);
  let progression;

  await db.runTransaction(async transaction => {
    const [snapshot, creditRewardsSnapshot, ...itemRewardSnapshots] = await Promise.all([
      transaction.get(playerRef),
      transaction.get(creditRewardsRef),
      ...itemRewardRefs.map(ref => transaction.get(ref))
    ]);
    if (!snapshot.exists) {
      throw new HttpsError('failed-precondition', 'Le profil joueur est introuvable.');
    }
    const player = snapshot.data();
    if (!Number.isSafeInteger(player.xp) || player.xp < 0 || player.xp > MAX_XP) {
      throw new HttpsError('failed-precondition', 'Le total XP existant est invalide; aucune donnée n’a été modifiée.');
    }
    progression = getProgression(player.xp);
    const battlePass = getUpdatedBattlePass(player.battlePass, progression.level);
    const creditRewards = getBattlePassCreditRewards(
      player,
      battlePass,
      creditRewardsSnapshot.exists ? creditRewardsSnapshot.data() : null,
      progression.level
    );
    const battlePassChanged = battlePass.seasonId !== player.battlePass?.seasonId ||
      (battlePass.seasonId === 'season-1' &&
        battlePass.level !== player.battlePass?.level);
    if (player.xp !== progression.xp || player.level !== progression.level ||
        battlePassChanged || creditRewards.creditsGranted > 0) {
      transaction.update(playerRef, {
        xp: progression.xp,
        level: progression.level,
        battlePass,
        ...(creditRewards.creditsGranted > 0 ? { credits: creditRewards.credits } : {}),
        updatedAt: FieldValue.serverTimestamp()
      });
    }
    if (creditRewards.creditsGranted > 0) {
      transaction.set(creditRewardsRef, {
        seasonId: 'season-1',
        creditRewardLevels: creditRewards.claimedLevels,
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
    }
    grantBattlePassItemRewards(
      transaction, battlePass, itemRewardRefs, itemRewardSnapshots, progression.level
    );
  });

  return progression;
});

exports.syncBattlePassRewards = onCall({ region: 'europe-west1' }, async request =>
  syncBattlePassRewardsForPlayer(requireAuth(request))
);

exports.grantBattlePassRewardsOnProfileChange = onDocumentWritten({
  document: 'players/{uid}',
  region: 'europe-west1',
  retry: true
}, async event => {
  if (!event.data?.after.exists) return;
  const player = event.data.after.data();
  const previous = event.data.before.exists ? event.data.before.data() : null;
  const seasonId = player.battlePass?.seasonId || 'season-1';
  const reachedLevel = getPlayerBattlePassLevel(player);
  const previousLevel = previous ? getPlayerBattlePassLevel(previous) : 0;
  if (seasonId === 'season-1' && reachedLevel >= 3 && reachedLevel > previousLevel) {
    await syncBattlePassRewardsForPlayer(event.params.uid);
  }
});

exports.syncWorldLeaderboard = onCall({ region: 'europe-west1' }, async request => {
  const uid = requireAuth(request);
  const [friendsSnapshot, worldSnapshot, currentPlayerSnapshot] = await Promise.all([
    db.collection(`players/${uid}/friends`).get(),
    db.collection('players').orderBy('bestSingleGameLines', 'desc')
      .orderBy(FieldPath.documentId(), 'asc').limit(7).get(),
    db.doc(`players/${uid}`).get()
  ]);
  const worldGameRecords = new Map();
  let gameQuery = db.collectionGroup('processedGames')
    .orderBy('lines', 'desc').limit(100);
  while (true) {
    const gameSnapshot = await gameQuery.get();
    if (gameSnapshot.empty) break;
    for (const gameDoc of gameSnapshot.docs) {
      const lines = gameDoc.data().lines;
      const playerId = gameDoc.ref.parent.parent?.id;
      if (!Number.isSafeInteger(lines) || lines < 0 || !playerId) {
        throw new HttpsError('failed-precondition', 'Un résultat historique du classement est invalide.');
      }
      if (!worldGameRecords.has(playerId)) {
        worldGameRecords.set(playerId, { uid: playerId, lines });
        if (worldGameRecords.size === 7) break;
      }
    }
    if (worldGameRecords.size >= 7 || gameSnapshot.size < 100) break;
    gameQuery = db.collectionGroup('processedGames')
      .orderBy('lines', 'desc').startAfter(gameSnapshot.docs.at(-1)).limit(100);
  }
  const topWorldGameRecords = [...worldGameRecords.values()]
    .sort((a, b) => b.lines - a.lines || a.uid.localeCompare(b.uid))
    .slice(0, 7);
  const worldGamePlayerRefs = topWorldGameRecords
    .map(record => record.uid)
    .map(playerId => db.doc(`players/${playerId}`));
  const worldGamePlayerSnapshots = [];
  for (let index = 0; index < worldGamePlayerRefs.length; index += 50) {
    worldGamePlayerSnapshots.push(
      ...await db.getAll(...worldGamePlayerRefs.slice(index, index + 50))
    );
  }
  const friendRefs = friendsSnapshot.docs.map(friend => db.doc(`players/${friend.id}`));
  const friendSnapshots = [];
  for (let index = 0; index < friendRefs.length; index += 50) {
    friendSnapshots.push(...await db.getAll(...friendRefs.slice(index, index + 50)));
  }
  const topFriends = friendSnapshots.filter(snapshot => snapshot.exists)
    .sort((a, b) => {
      const aLines = Number.isSafeInteger(a.data().bestSingleGameLines)
        ? a.data().bestSingleGameLines : 0;
      const bLines = Number.isSafeInteger(b.data().bestSingleGameLines)
        ? b.data().bestSingleGameLines : 0;
      return bLines - aLines || a.id.localeCompare(b.id);
    });
  const playersByUid = new Map(
    [
      ...worldSnapshot.docs,
      ...worldGamePlayerSnapshots,
      ...topFriends,
      ...(currentPlayerSnapshot.exists ? [currentPlayerSnapshot] : [])
    ].map(playerDoc => [playerDoc.id, playerDoc])
  );

  await Promise.all([...playersByUid.values()].map(playerDoc => {
    const playerRef = db.doc(`players/${playerDoc.id}`);
    const leaderboardRef = db.doc(`leaderboards/single-game/entries/${playerDoc.id}`);
    return (async () => {
      const historySnapshot = await db.collection(`players/${playerDoc.id}/processedGames`)
        .orderBy('lines', 'desc').limit(1).get();
      const historicalBest = historySnapshot.empty ? 0 : historySnapshot.docs[0].data().lines;
      if (!Number.isSafeInteger(historicalBest) || historicalBest < 0) {
        throw new HttpsError('failed-precondition', 'Le record historique d’un joueur est invalide.');
      }
      await db.runTransaction(async transaction => {
        const [playerSnapshot, leaderboardSnapshot] = await Promise.all([
          transaction.get(playerRef),
          transaction.get(leaderboardRef)
        ]);
        if (!playerSnapshot.exists) return;
        const player = playerSnapshot.data();
        const storedBest = player.bestSingleGameLines === undefined
          ? 0 : player.bestSingleGameLines;
        if (!Number.isSafeInteger(storedBest) || storedBest < 0) {
          throw new HttpsError('failed-precondition', 'Le record de lignes d’un profil est invalide.');
        }
        const previousEntry = leaderboardSnapshot.exists ? leaderboardSnapshot.data() : null;
        if (previousEntry && (!Number.isSafeInteger(previousEntry.lines) || previousEntry.lines < 0)) {
          throw new HttpsError('failed-precondition', 'Le record du classement est invalide.');
        }
        const lines = Math.max(
          storedBest, historicalBest, previousEntry ? previousEntry.lines : 0
        );
        if (player.bestSingleGameLines !== lines) {
          transaction.update(playerRef, {
            bestSingleGameLines: lines,
            updatedAt: FieldValue.serverTimestamp()
          });
        }
        const statistics = player.statistics || {};
        const bestScore = Number.isSafeInteger(statistics.bestScore) && statistics.bestScore >= 0
          ? statistics.bestScore : 0;
        const level = Number.isSafeInteger(player.level) && player.level >= 1
          ? player.level : getProgression(player.xp).level;
        const entry = {
          uid: playerDoc.id,
          displayName: player.displayName || 'Joueur',
          usernameLower: player.usernameLower || '',
          lines,
          bestScore,
          level
        };
        if (leaderboardSnapshot.exists) {
          const current = leaderboardSnapshot.data();
          if (current.uid === entry.uid && current.displayName === entry.displayName &&
              current.usernameLower === entry.usernameLower && current.lines === entry.lines &&
              current.bestScore === entry.bestScore && current.level === entry.level) return;
        }
        transaction.set(leaderboardRef, {
          ...entry,
          updatedAt: FieldValue.serverTimestamp()
        });
      });
    })();
  }));
  return { count: playersByUid.size };
});

exports.submitGameResult = onCall({ region: 'europe-west1' }, async request => {
  const uid = requireAuth(request);
  const sessionId = request.data?.sessionId;
  const actions = request.data?.actions;
  const actionOffsetsMs = request.data?.actionOffsetsMs;
  if (typeof sessionId !== 'string' || !/^[A-Za-z0-9_-]{20,}$/.test(sessionId)) {
    throw new HttpsError('invalid-argument', 'Session de partie invalide.');
  }
  if (!Array.isArray(actions) || actions.length === 0 || actions.length > 50_000) {
    throw new HttpsError('invalid-argument', 'Rejeu de partie invalide.');
  }
  if (!Array.isArray(actionOffsetsMs) || actionOffsetsMs.length !== actions.length ||
      actionOffsetsMs.some((offset, index) =>
        !Number.isSafeInteger(offset) || offset < 0 ||
        (index > 0 && offset < actionOffsetsMs[index - 1]))) {
    throw new HttpsError('invalid-argument', 'Chronologie de partie invalide.');
  }

  const sessionRef = db.doc(`gameSessions/${sessionId}`);
  const initialSession = await sessionRef.get();
  if (!initialSession.exists || initialSession.data().uid !== uid) {
    throw new HttpsError('permission-denied', 'Cette session de jeu ne t’appartient pas.');
  }
  const session = initialSession.data();
  if (session.supersededAt) {
    throw new HttpsError('failed-precondition', 'Cette session de jeu a été remplacée par une nouvelle partie.');
  }
  if (session.submittedAt) {
    if (session.submission?.ok === true) {
      return { ...session.submission, alreadySubmitted: true };
    }
    throw new HttpsError('already-exists', 'Cette partie a déjà été validée.');
  }
  if (!session.createdAt?.toDate) {
    throw new HttpsError('failed-precondition', 'La session de jeu est invalide.');
  }
  const elapsedMs = Date.now() - session.createdAt.toDate().getTime();
  if (elapsedMs < 0 || elapsedMs > 6 * 60 * 60 * 1_000) {
    throw new HttpsError('failed-precondition', 'La durée de la partie est invalide.');
  }

  let baseResult;
  try {
    baseResult = simulateGame(session.seed, actions);
  } catch (error) {
    throw new HttpsError('invalid-argument', 'Le rejeu de la partie n’est pas valide.');
  }
  if (!baseResult.ended) {
    throw new HttpsError('failed-precondition', 'La partie doit être terminée avant sa validation.');
  }
  const xpBoostDurationMs = session.xpBoostDurationMs || 0;
  const validSessionBoost = session.xpBoostId &&
    BATTLE_PASS_XP_BOOST_REWARDS.some(reward => reward.itemId === session.xpBoostId);
  if (!Number.isSafeInteger(xpBoostDurationMs) || xpBoostDurationMs < 0 ||
      xpBoostDurationMs > XP_BOOST_DURATION_MS ||
      (xpBoostDurationMs > 0 && !validSessionBoost) ||
      actionOffsetsMs[actionOffsetsMs.length - 1] > elapsedMs + 5_000) {
    throw new HttpsError('invalid-argument', 'Durée du boost XP invalide.');
  }
  let result;
  try {
    result = simulateGame(session.seed, actions, {
      xpBoostDurationMs,
      actionOffsetsMs
    });
  } catch (error) {
    throw new HttpsError('invalid-argument', 'Le rejeu boosté de la partie n’est pas valide.');
  }

  const playerRef = db.doc(`players/${uid}`);
  const receiptRef = db.doc(`players/${uid}/processedGames/${sessionId}`);
  const questRef = questProgressRef(uid);
  const boostStateRef = xpBoostStateRef(uid);
  const leaderboardRef = db.doc(`leaderboards/single-game/entries/${uid}`);
  const creditRewardsRef = db.doc(`players/${uid}/battlePassSeasons/season-1`);
  const itemRewardRefs = getBattlePassItemRewardRefs(uid);
  let awardedXp = result.awardedXp;
  let updatedProgression;
  let creditsGranted = 0;
  let alreadySubmittedResult = null;
  let submissionResult = null;

  await db.runTransaction(async transaction => {
    creditsGranted = 0;
    alreadySubmittedResult = null;
    submissionResult = null;
    const [
      currentSession, playerSnapshot, questSnapshot, creditRewardsSnapshot,
      boostStateSnapshot, receiptSnapshot, ...itemRewardSnapshots
    ] = await Promise.all([
      transaction.get(sessionRef),
      transaction.get(playerRef),
      transaction.get(questRef),
      transaction.get(creditRewardsRef),
      transaction.get(boostStateRef),
      transaction.get(receiptRef),
      ...itemRewardRefs.map(ref => transaction.get(ref))
    ]);
    if (!currentSession.exists || currentSession.data().uid !== uid) {
      throw new HttpsError('already-exists', 'Cette partie a déjà été validée.');
    }
    if (currentSession.data().submittedAt) {
      if (currentSession.data().submission?.ok === true) {
        alreadySubmittedResult = currentSession.data().submission;
        return;
      }
      throw new HttpsError('already-exists', 'Cette partie a déjà été validée.');
    }
    if (receiptSnapshot.exists) {
      throw new HttpsError('already-exists', 'Un reçu existe déjà pour cette partie.');
    }
    if (currentSession.data().supersededAt) {
      throw new HttpsError('failed-precondition', 'Cette session de jeu a été remplacée par une nouvelle partie.');
    }
    if (xpBoostDurationMs > 0) {
      const currentData = currentSession.data();
      const now = Date.now();
      const pausedAtMs = currentData.pausedAt?.toMillis
        ? Math.max(0, now - currentData.pausedAt.toMillis()) : 0;
      const pausedTotalMs = Number.isSafeInteger(currentData.pausedTotalMs)
        ? currentData.pausedTotalMs : 0;
      const expectedActiveElapsedMs = Math.max(
        0, now - currentData.createdAt.toDate().getTime() - pausedAtMs - pausedTotalMs
      );
      const reportedActiveElapsedMs = actionOffsetsMs[actionOffsetsMs.length - 1];
      if (Math.abs(expectedActiveElapsedMs - reportedActiveElapsedMs) > 5_000) {
        throw new HttpsError('failed-precondition', 'La chronologie active de la partie ne correspond pas à la session.');
      }
    }
    if (!playerSnapshot.exists) {
      throw new HttpsError('failed-precondition', 'Le profil joueur est introuvable.');
    }
    const boostState = boostStateSnapshot.exists ? boostStateSnapshot.data() : {};
    const ownsBoostState = boostState.activeSessionId === sessionId ||
      boostState.pausedSessionId === sessionId;
    awardedXp = xpBoostDurationMs > 0 ? result.awardedXp : baseResult.awardedXp;

    const player = playerSnapshot.data();
    if (!Number.isSafeInteger(player.xp) || player.xp < 0 || player.xp > MAX_XP) {
      throw new HttpsError('failed-precondition', 'Le total XP existant est invalide; aucune donnée n’a été modifiée.');
    }
    const progression = getProgression(player.xp);
    updatedProgression = getProgression(progression.xp + awardedXp);
    const statistics = player.statistics || {};
    const currentLines = player.lines === undefined ? 0 : player.lines;
    if (!Number.isSafeInteger(currentLines) || currentLines < 0) {
      throw new HttpsError('failed-precondition', 'Le total de lignes existant est invalide; aucune donnée n’a été modifiée.');
    }
    const previousBestSingleGameLines = player.bestSingleGameLines === undefined
      ? 0 : player.bestSingleGameLines;
    if (!Number.isSafeInteger(previousBestSingleGameLines) ||
        previousBestSingleGameLines < 0) {
      throw new HttpsError('failed-precondition', 'Le record de lignes existant est invalide; aucune donnée n’a été modifiée.');
    }
    const totalLines = currentLines + result.lines;
    if (!Number.isSafeInteger(totalLines)) {
      throw new HttpsError('failed-precondition', 'Le nouveau total de lignes dépasse la limite prise en charge.');
    }
    const bestSingleGameLines = Math.max(previousBestSingleGameLines, result.lines);
    const bestScore = Math.max(Number.isInteger(statistics.bestScore) ? statistics.bestScore : 0, result.score);
    const questResult = applyQuestProgress(
      questSnapshot.exists ? questSnapshot.data() : null,
      {
        gamesPlayed: 1,
        linesCleared: result.lines,
        piecesPlaced: result.piecesPlaced,
        bestSingleGameLines: result.lines
      }
    );
    updatedProgression = getQuestRewardProgression(
      { ...player, xp: updatedProgression.xp },
      questResult.rewardXp
    );
    const battlePass = updatedProgression.battlePass;
    const creditRewards = getBattlePassCreditRewards(
      player,
      battlePass,
      creditRewardsSnapshot.exists ? creditRewardsSnapshot.data() : null,
      updatedProgression.level
    );

    transaction.update(playerRef, {
      xp: updatedProgression.xp,
      level: updatedProgression.level,
      battlePass,
      ...(creditRewards.creditsGranted > 0 ? { credits: creditRewards.credits } : {}),
      lines: totalLines,
      bestSingleGameLines,
      statistics: {
        ...statistics,
        gamesPlayed: (Number.isInteger(statistics.gamesPlayed) ? statistics.gamesPlayed : 0) + 1,
        bestScore
      },
      updatedAt: FieldValue.serverTimestamp()
    });

    transaction.set(leaderboardRef, {
      uid,
      displayName: player.displayName || 'Joueur',
      usernameLower: player.usernameLower || '',
      lines: bestSingleGameLines,
      bestScore,
      level: updatedProgression.level,
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    if (creditRewards.creditsGranted > 0) {
      transaction.set(creditRewardsRef, {
        seasonId: 'season-1',
        creditRewardLevels: creditRewards.claimedLevels,
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
    }
    grantBattlePassItemRewards(
      transaction, battlePass, itemRewardRefs, itemRewardSnapshots,
      updatedProgression.level
    );
    saveQuestProgress(transaction, questRef, questResult);
    creditsGranted = creditRewards.creditsGranted;
    submissionResult = {
      ok: true,
      lines: result.lines,
      piecesPlaced: result.piecesPlaced,
      score: result.score,
      awardedXp,
      questXpAwarded: updatedProgression.xp -
        getProgression(player.xp + awardedXp).xp,
      xp: updatedProgression.xp,
      level: updatedProgression.level,
      creditsGranted
    };
    transaction.update(sessionRef, {
      submittedAt: FieldValue.serverTimestamp(),
      submission: submissionResult
    });
    transaction.create(receiptRef, {
      awardedXp,
      xpBefore: player.xp,
      xpAfter: updatedProgression.xp,
      level: updatedProgression.level,
      lines: result.lines,
      score: result.score,
      createdAt: FieldValue.serverTimestamp()
    });
    if (ownsBoostState && validSessionBoost) {
      const lastActionTime = actionOffsetsMs[actionOffsetsMs.length - 1];
      const remainingMs = Math.max(0, xpBoostDurationMs - lastActionTime);
      transaction.set(boostStateRef, {
        activeBoostId: remainingMs > 0 ? currentSession.data().xpBoostId : null,
        activeRemainingMs: remainingMs,
        activeStartedAt: null,
        activeExpiresAt: null,
        activeSessionId: null,
        pausedSessionId: null,
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
    }
  });

  if (alreadySubmittedResult) {
    return { ...alreadySubmittedResult, alreadySubmitted: true };
  }
  return submissionResult;
});

exports.recordAcceptedFriendQuest = onDocumentCreated({
  document: 'players/{uid}/friends/{friendUid}',
  region: 'europe-west1',
  retry: true
}, async event => {
  const { uid, friendUid } = event.params;
  if (!event.data || uid === friendUid) return;

  const playerRef = db.doc(`players/${uid}`);
  const questRef = questProgressRef(uid);
  const reciprocalRef = db.doc(`players/${friendUid}/friends/${uid}`);
  await db.runTransaction(async transaction => {
    const [playerSnapshot, questSnapshot, reciprocalSnapshot] = await Promise.all([
      transaction.get(playerRef),
      transaction.get(questRef),
      transaction.get(reciprocalRef)
    ]);
    if (!reciprocalSnapshot.exists) return;
    if (!playerSnapshot.exists) {
      throw new Error(`Le profil joueur ${uid} est introuvable pour la quête d’amis.`);
    }

    const previousProgress = questSnapshot.exists ? questSnapshot.data() : null;
    const previousFriendCount = previousProgress?.friendUids?.length || 0;
    const questResult = applyQuestProgress(previousProgress, { friendUid });
    if (questResult.progress.friendUids.length === previousFriendCount) return;

    const player = playerSnapshot.data();
    const progression = getQuestRewardProgression(player, questResult.rewardXp);
    transaction.update(playerRef, {
      xp: progression.xp,
      level: progression.level,
      battlePass: progression.battlePass,
      updatedAt: FieldValue.serverTimestamp()
    });
    saveQuestProgress(transaction, questRef, questResult);
  });
});
