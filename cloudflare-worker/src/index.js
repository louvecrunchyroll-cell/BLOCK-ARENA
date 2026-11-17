import { createRemoteJWKSet, jwtVerify } from 'jose';
import {
  getBattlePassRewardPlan, getProgression, getUnclaimedBattlePassCreditLevels,
  getUnclaimedBattlePassItemRewards,
  MAX_LEVEL, MAX_XP, BATTLE_PASS_CREDIT_REWARD_AMOUNT, BATTLE_PASS_ITEM_REWARDS,
  BATTLE_PASS_XP_BOOST_REWARDS, BATTLE_PASS_CREDIT_REWARD_LEVELS,
  LEGACY_BATTLE_PASS_CREDIT_REWARD_LEVELS, XP_BOOST_DURATION_MS
} from '../../functions/src/progression.js';
import { simulateGame } from '../../functions/src/tetris-engine.js';
import questModule from '../../functions/src/quests.js';

const { applyQuestProgress } = questModule;

const FIREBASE_ID_KEYS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
);
const APP_CHECK_KEYS = createRemoteJWKSet(
  new URL('https://firebaseappcheck.googleapis.com/v1/jwks')
);
const FIRESTORE_SCOPE = 'https://www.googleapis.com/auth/datastore';
let cachedAccessToken = '';
let cachedAccessTokenExpiresAt = 0;
let cachedSigningKey;

function jsonResponse(body, status, origin) {
  const headers = {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'vary': 'Origin'
  };
  if (origin) {
    headers['access-control-allow-origin'] = origin;
    headers['access-control-allow-methods'] = 'POST, OPTIONS';
    headers['access-control-allow-headers'] =
      'Authorization, Content-Type, X-Firebase-AppCheck';
    headers['access-control-max-age'] = '600';
  }
  return new Response(status === 204 ? null : JSON.stringify(body), { status, headers });
}

function allowedOrigin(request, env) {
  const origin = request.headers.get('Origin');
  if (!origin) return null;
  const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean);
  return allowed.includes(origin) ? origin : false;
}

function firestoreRoot(env) {
  return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(env.FIREBASE_PROJECT_ID)}/databases/(default)/documents`;
}

function firestoreDatabase(env) {
  return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(env.FIREBASE_PROJECT_ID)}/databases/(default)`;
}

function encodeBase64Url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function decodeBase64(value) {
  const binary = atob(value.replace(/-----[^-]+-----/g, '').replace(/\s/g, ''));
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

function parseServiceAccount(env) {
  let serviceAccount;
  try {
    serviceAccount = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON || '');
  } catch {
    throw new Error(
      'Le secret FIREBASE_SERVICE_ACCOUNT_JSON doit contenir le JSON complet du compte de service Firebase.'
    );
  }
  if (!serviceAccount || typeof serviceAccount !== 'object' ||
      Array.isArray(serviceAccount) ||
      serviceAccount.project_id !== env.FIREBASE_PROJECT_ID ||
      typeof serviceAccount.client_email !== 'string' ||
      typeof serviceAccount.private_key !== 'string') {
    throw new Error(
      'Le secret FIREBASE_SERVICE_ACCOUNT_JSON doit être un compte de service JSON valide du projet Firebase configuré.'
    );
  }
  return serviceAccount;
}

async function getSigningKey(env) {
  if (cachedSigningKey) return cachedSigningKey;
  const serviceAccount = parseServiceAccount(env);
  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    decodeBase64(serviceAccount.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
  cachedSigningKey = { serviceAccount, privateKey };
  return cachedSigningKey;
}

async function googleAccessToken(env) {
  if (cachedAccessToken && Date.now() < cachedAccessTokenExpiresAt - 60_000) {
    return cachedAccessToken;
  }
  const { serviceAccount, privateKey } = await getSigningKey(env);
  const issuedAt = Math.floor(Date.now() / 1000);
  const header = encodeBase64Url(new TextEncoder().encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
  const claim = encodeBase64Url(new TextEncoder().encode(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: FIRESTORE_SCOPE,
    aud: 'https://oauth2.googleapis.com/token',
    iat: issuedAt,
    exp: issuedAt + 3600
  })));
  const unsigned = `${header}.${claim}`;
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    privateKey,
    new TextEncoder().encode(unsigned)
  );
  const assertion = `${unsigned}.${encodeBase64Url(new Uint8Array(signature))}`;
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion
    })
  });
  const result = await response.json();
  if (!response.ok || typeof result.access_token !== 'string') {
    throw new Error('Google OAuth a refusé le jeton de service du Worker.');
  }
  cachedAccessToken = result.access_token;
  cachedAccessTokenExpiresAt = Date.now() + Number(result.expires_in || 3600) * 1000;
  return cachedAccessToken;
}

function toFirestoreValue(value) {
  if (value === null) return { nullValue: null };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toFirestoreValue) } };
  if (typeof value === 'object') {
    const fields = {};
    for (const [key, nestedValue] of Object.entries(value)) fields[key] = toFirestoreValue(nestedValue);
    return { mapValue: { fields } };
  }
  throw new TypeError('Type de champ Firestore non pris en charge.');
}

function fromFirestoreValue(value) {
  if ('nullValue' in value) return null;
  if ('stringValue' in value) return value.stringValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('timestampValue' in value) return new Date(value.timestampValue);
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(fromFirestoreValue);
  if ('mapValue' in value) return fromFirestoreFields(value.mapValue.fields || {});
  return undefined;
}

function fromFirestoreFields(fields = {}) {
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, fromFirestoreValue(value)])
  );
}

async function firestoreRequest(env, path, options = {}) {
  const token = await googleAccessToken(env);
  const response = await fetch(`${firestoreRoot(env)}${path}`, {
    ...options,
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      ...(options.headers || {})
    }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const reason = body?.error?.status || body?.error?.message;
    const error = new Error(
      `Firestore a refusé une opération (${response.status}${reason ? ` : ${reason}` : ''}).`
    );
    error.status = response.status;
    error.firestore = body;
    throw error;
  }
  return body;
}

async function firestoreRpc(env, method, payload = {}) {
  const token = await googleAccessToken(env);
  const response = await fetch(`${firestoreDatabase(env)}:${method}`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const reason = body?.error?.status || body?.error?.message;
    const error = new Error(
      `Firestore a refusé une transaction (${response.status}${reason ? ` : ${reason}` : ''}).`
    );
    error.status = response.status;
    error.firestore = body;
    throw error;
  }
  return body;
}

function documentPath(path) {
  return path.split('/').map(encodeURIComponent).join('/');
}

async function getDocument(env, path, transaction) {
  const suffix = transaction ? `?transaction=${encodeURIComponent(transaction)}` : '';
  try {
    const document = await firestoreRequest(env, `/${documentPath(path)}${suffix}`);
    return {
      path,
      name: document.name,
      updateTime: document.updateTime,
      data: fromFirestoreFields(document.fields)
    };
  } catch (error) {
    if (error.status === 404) return null;
    throw error;
  }
}

function writeDocument(document, data, { create = false } = {}) {
  const write = {
    update: {
      name: document.name,
      fields: Object.fromEntries(
        Object.entries(data).map(([key, value]) => [key, toFirestoreValue(value)])
      )
    }
  };
  write.updateMask = { fieldPaths: Object.keys(data) };
  if (create) write.currentDocument = { exists: false };
  else if (document.updateTime) write.currentDocument = { updateTime: document.updateTime };
  return write;
}

function getBattlePassSkinRepair(reward, existingData, now = new Date()) {
  const expected = {
    level: reward.level,
    itemId: reward.itemId,
    type: reward.type,
    name: reward.name,
    source: typeof existingData.source === 'string' && existingData.source
      ? existingData.source : 'battle-pass',
    seasonId: typeof existingData.seasonId === 'string' && existingData.seasonId
      ? existingData.seasonId : 'season-1',
    unlockedAt: existingData.unlockedAt instanceof Date
      ? existingData.unlockedAt : now
  };
  for (const key of [
    'category', 'imageUrl', 'durationMs', 'bonusXp', 'quantity', 'usedQuantity'
  ]) {
    if (reward[key] === undefined) continue;
    expected[key] = key === 'usedQuantity' &&
      Number.isSafeInteger(existingData.usedQuantity) && existingData.usedQuantity >= 0
      ? existingData.usedQuantity : reward[key];
  }
  return Object.fromEntries(
    Object.entries(expected).filter(([key, value]) => existingData[key] !== value)
  );
}

function newDocumentName(env, path) {
  return `${firestoreRoot(env)}/${documentPath(path)}`;
}

function createDocumentWrite(env, path, data) {
  const write = {
    update: {
      name: newDocumentName(env, path),
      fields: Object.fromEntries(
        Object.entries(data).map(([key, value]) => [key, toFirestoreValue(value)])
      )
    },
    currentDocument: { exists: false }
  };
  return write;
}

function writeOrCreateDocument(env, existing, path, data) {
  return existing ? writeDocument(existing, data) : createDocumentWrite(env, path, data);
}

async function beginTransaction(env) {
  const result = await firestoreRpc(env, 'beginTransaction', { options: { readWrite: {} } });
  if (!result.transaction) throw new Error('Firestore n’a pas ouvert de transaction.');
  return result.transaction;
}

async function rollback(env, transaction) {
  await firestoreRpc(env, 'rollback', { transaction });
}

async function commit(env, writes, transaction) {
  const token = await googleAccessToken(env);
  const response = await fetch(`${firestoreDatabase(env)}:commit`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({ writes, ...(transaction ? { transaction } : {}) })
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const reason = body?.error?.status || body?.error?.message;
    const error = new Error(
      `Firestore a refusé la validation de la transaction (${response.status}${reason ? ` : ${reason}` : ''}).`
    );
    error.status = response.status;
    error.firestore = body;
    throw error;
  }
}

function isAppCheckRequired() {
  return false;
}

async function authenticate(request, env, path, operation) {
  const authorization = request.headers.get('Authorization') || '';
  const idToken = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  const appCheckToken = request.headers.get('X-Firebase-AppCheck') || '';
  if (!idToken || (!appCheckToken && isAppCheckRequired(path, env, operation))) {
    const error = new Error('Connexion Firebase requise.');
    error.status = 401;
    throw error;
  }
  const [identity, appCheck] = await Promise.all([
    jwtVerify(idToken, FIREBASE_ID_KEYS, {
      issuer: `https://securetoken.google.com/${env.FIREBASE_PROJECT_ID}`,
      audience: env.FIREBASE_PROJECT_ID,
      algorithms: ['RS256']
    }),
    ...(appCheckToken ? [jwtVerify(appCheckToken, APP_CHECK_KEYS, {
      issuer: `https://firebaseappcheck.googleapis.com/${env.FIREBASE_PROJECT_NUMBER}`,
      audience: `projects/${env.FIREBASE_PROJECT_NUMBER}`,
      algorithms: ['RS256']
    })] : [])
  ]);
  if (!identity.payload.sub || (appCheck && appCheck.payload.sub !== env.FIREBASE_APP_ID)) {
    const error = new Error('Le jeton Firebase ou App Check ne correspond pas à cette application.');
    error.status = 401;
    throw error;
  }
  return identity.payload;
}

function validateDisplayName(value) {
  return typeof value === 'string' && value.trim().length >= 3 &&
    value.trim().length <= 24 && /^[\p{L}\p{N}_-]+$/u.test(value.trim());
}

function getUpdatedBattlePass(currentBattlePass, level) {
  if (currentBattlePass !== undefined &&
      (!currentBattlePass || typeof currentBattlePass !== 'object' ||
        Array.isArray(currentBattlePass))) {
    const error = new Error('La progression Battle Pass existante est invalide.');
    error.status = 409;
    throw error;
  }
  const battlePass = { ...(currentBattlePass || {}) };
  if ((battlePass.seasonId !== undefined &&
      (typeof battlePass.seasonId !== 'string' || !battlePass.seasonId)) ||
      (battlePass.level !== undefined &&
      (!Number.isSafeInteger(battlePass.level) || battlePass.level < 1 || battlePass.level > 100))) {
    const error = new Error('La progression Battle Pass existante est invalide.');
    error.status = 409;
    throw error;
  }
  if (!battlePass.seasonId) battlePass.seasonId = 'season-1';
  if (battlePass.seasonId === 'season-1' &&
      (battlePass.level === undefined || battlePass.level < level)) {
    battlePass.level = level;
  }
  return battlePass;
}

async function createPlayerProfile(env, identity, requestData) {
  const requestedName = typeof requestData.displayName === 'string' ? requestData.displayName.trim() : '';
  if (!validateDisplayName(requestedName)) {
    const error = new Error('Le pseudo doit contenir entre 3 et 24 lettres, chiffres, _ ou -.');
    error.status = 400;
    throw error;
  }
  const email = typeof identity.email === 'string' ? identity.email : '';
  if (!email) {
    const error = new Error('Le compte Firebase ne fournit pas d’adresse e-mail.');
    error.status = 400;
    throw error;
  }

  const uid = identity.sub;
  const transaction = await beginTransaction(env);
  const [existingPlayer, legacyPlayer] = await Promise.all([
    getDocument(env, `players/${uid}`, transaction),
    getDocument(env, `users/${uid}`, transaction)
  ]);
  if (existingPlayer) {
    await rollback(env, transaction);
    return { ok: true, existing: true };
  }

  const legacy = legacyPlayer?.data || {};
  for (const [field, value] of Object.entries({
    xp: legacy.xp,
    lines: legacy.lines,
    credits: legacy.credits
  })) {
    if (value !== undefined && (!Number.isSafeInteger(value) || value < 0 ||
        (field === 'xp' && value > MAX_XP))) {
      const error = new Error(`Le profil historique contient une valeur ${field} invalide; aucune donnée n’a été modifiée.`);
      error.status = 409;
      throw error;
    }
  }
  if ((legacy.battlePass !== undefined &&
      (!legacy.battlePass || typeof legacy.battlePass !== 'object' || Array.isArray(legacy.battlePass))) ||
      (legacy.statistics !== undefined &&
      (!legacy.statistics || typeof legacy.statistics !== 'object' || Array.isArray(legacy.statistics)))) {
    const error = new Error('Le profil historique contient une progression ou des statistiques invalides; aucune donnée n’a été modifiée.');
    error.status = 409;
    throw error;
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
    const error = new Error('Le profil historique contient un niveau Battle Pass ou des statistiques invalides; aucune donnée n’a été modifiée.');
    error.status = 409;
    throw error;
  }
  const legacyName = typeof legacy.displayName === 'string' && validateDisplayName(legacy.displayName.trim())
    ? legacy.displayName.trim() : '';
  const displayName = legacyName || requestedName;
  const legacyUsername = typeof legacy.usernameLower === 'string' &&
    /^[\p{L}\p{N}_-]{3,24}$/u.test(legacy.usernameLower) ? legacy.usernameLower : '';
  const usernameLower = legacyUsername || displayName.toLocaleLowerCase('fr');
  const [username, publicProfile] = await Promise.all([
    getDocument(env, `usernames/${usernameLower}`, transaction),
    getDocument(env, `publicProfiles/${uid}`, transaction)
  ]);
  if (username && username.data.uid !== uid) {
    const error = new Error('Ce pseudo est déjà utilisé.');
    error.status = 409;
    throw error;
  }

  const now = new Date();
  const progression = getProgression(legacy.xp);
  const battlePass = getUpdatedBattlePass(legacy.battlePass, progression.level);
  const statistics = {
    ...(legacy.statistics || {}),
    gamesPlayed: legacy.statistics?.gamesPlayed ?? 0,
    bestScore: legacy.statistics?.bestScore ?? 0
  };
  const player = {
    displayName,
    email,
    usernameLower,
    xp: progression.xp,
    level: progression.level,
    lines: legacy.lines === undefined ? 0 : legacy.lines,
    credits: legacy.credits === undefined ? 0 : legacy.credits,
    battlePass,
    statistics,
    createdAt: legacy.createdAt || now,
    updatedAt: now
  };
  const writes = [
    createDocumentWrite(env, `players/${uid}`, player)
  ];
  if (!username) writes.push(createDocumentWrite(env, `usernames/${usernameLower}`, { uid }));
  const publicData = {
    displayName,
    usernameLower,
    ...(!publicProfile ? { createdAt: player.createdAt } : {})
  };
  if (publicProfile) writes.push(writeDocument(publicProfile, publicData));
  else writes.push(createDocumentWrite(env, `publicProfiles/${uid}`, publicData));
  await commit(env, writes, transaction);
  return { ok: true, existing: false };
}

function getWorkerXpBoostRemainingMs(state, now = Date.now()) {
  if (!state?.activeBoostId) return 0;
  const maximum = Number.isSafeInteger(state.activeRemainingMs)
    ? Math.max(0, Math.min(state.activeRemainingMs, XP_BOOST_DURATION_MS))
    : XP_BOOST_DURATION_MS;
  const expiresAt = state.activeExpiresAt instanceof Date
    ? state.activeExpiresAt.getTime() : null;
  return expiresAt === null
    ? maximum
    : Math.max(0, Math.min(maximum || XP_BOOST_DURATION_MS, expiresAt - now));
}

function isXpBoostItem(item, itemId) {
  const reward = BATTLE_PASS_XP_BOOST_REWARDS.find(candidate => candidate.itemId === itemId);
  const legacyItemLevel = /^xp-boost-level-(\d+)$/.exec(itemId)?.[1];
  const validLevel = reward && (item?.level === reward.level ||
    item?.level === Number(legacyItemLevel)) ||
    itemId === 'xp-boost-level-8' && item?.level === 8;
  return Boolean(validLevel && item && item.itemId === itemId &&
    item.type === 'xp-boost' && item.category === 'xp-boost' &&
    item.durationMs === XP_BOOST_DURATION_MS &&
    item.bonusXp === (reward?.bonusXp ?? 5));
}

function questRewardProgression(player, rewardXp) {
  if (!Number.isSafeInteger(player.xp) || player.xp < 0 || player.xp > MAX_XP) {
    const error = new Error('Le total XP existant est invalide; aucune donnée n’a été modifiée.');
    error.status = 409;
    throw error;
  }
  const progression = getProgression(player.xp + rewardXp);
  return {
    ...progression,
    battlePass: getUpdatedBattlePass(player.battlePass, progression.level)
  };
}

async function startGameSession(env, identity) {
  const uid = identity.sub;
  const sessionId = crypto.randomUUID();
  const seedBytes = crypto.getRandomValues(new Uint32Array(1));
  const seed = (seedBytes[0] % 0xffffffff) + 1;
  const now = new Date();
  const sessionPath = `gameSessions/${sessionId}`;
  const statePath = `players/${uid}/xpBoostState/current`;
  const playerPath = `players/${uid}`;
  const questPath = `players/${uid}/quests/progress`;
  const transaction = await beginTransaction(env);
  const [stateDocument, playerDocument, questDocument] = await Promise.all([
    getDocument(env, statePath, transaction),
    getDocument(env, playerPath, transaction),
    getDocument(env, questPath, transaction)
  ]);
  if (!playerDocument) {
    const error = new Error('Le profil joueur est introuvable.');
    error.status = 404;
    throw error;
  }

  const state = stateDocument?.data || {};
  const previousSessionId = state.activeSessionId || state.pausedSessionId || null;
  const previousSession = previousSessionId && previousSessionId !== sessionId
    ? await getDocument(env, `gameSessions/${previousSessionId}`, transaction) : null;
  let activeBoostId = state.activeBoostId || null;
  let activeRemainingMs = getWorkerXpBoostRemainingMs(state, now.getTime());
  const writes = [];

  if (activeRemainingMs === 0) {
    activeBoostId = state.selectedBoostId || null;
    if (activeBoostId) {
      if (typeof activeBoostId !== 'string') {
        const error = new Error('Le boost XP sélectionné est invalide.');
        error.status = 409;
        throw error;
      }
      const inventoryPath = `players/${uid}/inventory/${activeBoostId}`;
      const inventoryDocument = await getDocument(env, inventoryPath, transaction);
      const item = inventoryDocument?.data;
      const quantity = item?.quantity ?? 1;
      const usedQuantity = item?.usedQuantity ?? 0;
      if (!inventoryDocument || !isXpBoostItem(item, activeBoostId) ||
          !Number.isSafeInteger(quantity) || quantity < 1 ||
          !Number.isSafeInteger(usedQuantity) || usedQuantity < 0 ||
          usedQuantity >= quantity) {
        const error = new Error('Le boost XP sélectionné n’est plus disponible.');
        error.status = 409;
        throw error;
      }
      activeRemainingMs = XP_BOOST_DURATION_MS;
      writes.push(writeDocument(inventoryDocument, {
        usedQuantity: usedQuantity + 1,
        updatedAt: now
      }));

      const questResult = applyQuestProgress(
        questDocument?.data || null,
        { xpBoostsActivated: 1 }
      );
      const progression = questRewardProgression(playerDocument.data, questResult.rewardXp);
      writes.push(writeDocument(playerDocument, {
        xp: progression.xp,
        level: progression.level,
        battlePass: progression.battlePass,
        updatedAt: now
      }));
      writes.push(writeOrCreateDocument(env, questDocument, questPath, {
        ...questResult.progress,
        updatedAt: now
      }));
    }
  }

  const xpBoostId = activeRemainingMs > 0 ? activeBoostId : null;
  if (previousSession?.data && !previousSession.data.submittedAt) {
    writes.push(writeDocument(previousSession, { supersededAt: now }));
  }
  writes.push(writeOrCreateDocument(env, stateDocument, statePath, {
    selectedBoostId: null,
    activeBoostId: activeRemainingMs > 0 ? activeBoostId : null,
    activeRemainingMs,
    activeStartedAt: activeRemainingMs > 0 ? now : null,
    activeExpiresAt: activeRemainingMs > 0
      ? new Date(now.getTime() + activeRemainingMs) : null,
    activeSessionId: activeRemainingMs > 0 ? sessionId : null,
    pausedSessionId: null,
    updatedAt: now
  }));
  writes.push(createDocumentWrite(env, sessionPath, {
    uid,
    seed,
    createdAt: now,
    expiresAt: new Date(now.getTime() + 6 * 60 * 60 * 1000),
    xpBoostId,
    xpBoostDurationMs: activeRemainingMs,
    pausedTotalMs: 0,
    pausedAt: null,
    submittedAt: null
  }));

  await commit(env, writes, transaction);
  return {
    sessionId,
    seed,
    xpBoostId,
    xpBoostDurationMs: activeRemainingMs
  };
}

async function submitGameResult(env, identity, requestData) {
  const { sessionId, actions, actionOffsetsMs } = requestData;
  if (typeof sessionId !== 'string' || !/^[A-Za-z0-9_-]{20,64}$/.test(sessionId)) {
    const error = new Error('Session de partie invalide.');
    error.status = 400;
    throw error;
  }
  if (!Array.isArray(actions) || actions.length === 0 || actions.length > 50_000) {
    const error = new Error('Rejeu de partie invalide.');
    error.status = 400;
    throw error;
  }
  if (!Array.isArray(actionOffsetsMs) || actionOffsetsMs.length !== actions.length ||
      actionOffsetsMs.some((offset, index) =>
        !Number.isSafeInteger(offset) || offset < 0 ||
        (index > 0 && offset < actionOffsetsMs[index - 1]))) {
    const error = new Error('Chronologie de partie invalide.');
    error.status = 400;
    throw error;
  }

  const uid = identity.sub;
  const sessionPath = `gameSessions/${sessionId}`;
  const transaction = await beginTransaction(env);
  const sessionDocument = await getDocument(env, sessionPath, transaction);
  if (!sessionDocument || sessionDocument.data.uid !== uid) {
    const error = new Error('Cette session de jeu ne t’appartient pas.');
    error.status = 403;
    throw error;
  }
  const session = sessionDocument.data;
  if (session.supersededAt) {
    const error = new Error('Cette session de jeu a été remplacée par une nouvelle partie.');
    error.status = 409;
    throw error;
  }
  if (session.submittedAt) {
    if (session.submission?.ok === true) {
      await rollback(env, transaction);
      return { ...session.submission, alreadySubmitted: true };
    }
    const error = new Error('Cette partie a déjà été validée.');
    error.status = 409;
    throw error;
  }
  if (!(session.createdAt instanceof Date)) {
    const error = new Error('La session de jeu est invalide.');
    error.status = 409;
    throw error;
  }

  const now = Date.now();
  const elapsedMs = now - session.createdAt.getTime();
  if (elapsedMs < 0 || elapsedMs > 6 * 60 * 60 * 1000 ||
      (session.expiresAt instanceof Date && session.expiresAt.getTime() < now) ||
      actionOffsetsMs[actionOffsetsMs.length - 1] > elapsedMs + 5_000) {
    const error = new Error('La durée ou l’expiration de la partie est invalide.');
    error.status = 400;
    throw error;
  }

  let baseResult;
  try {
    baseResult = simulateGame(session.seed, actions);
  } catch {
    const error = new Error('Le rejeu de la partie n’est pas valide.');
    error.status = 400;
    throw error;
  }
  if (!baseResult.ended) {
    const error = new Error('La partie doit être terminée avant sa validation.');
    error.status = 400;
    throw error;
  }

  const xpBoostDurationMs = session.xpBoostDurationMs || 0;
  const validSessionBoost = session.xpBoostId &&
    BATTLE_PASS_XP_BOOST_REWARDS.some(reward => reward.itemId === session.xpBoostId);
  if (!Number.isSafeInteger(xpBoostDurationMs) || xpBoostDurationMs < 0 ||
      xpBoostDurationMs > XP_BOOST_DURATION_MS ||
      (xpBoostDurationMs > 0 && !validSessionBoost)) {
    const error = new Error('Durée du boost XP invalide.');
    error.status = 400;
    throw error;
  }
  if (xpBoostDurationMs > 0) {
    const pausedAtMs = session.pausedAt instanceof Date
      ? Math.max(0, now - session.pausedAt.getTime()) : 0;
    const pausedTotalMs = Number.isSafeInteger(session.pausedTotalMs)
      ? session.pausedTotalMs : 0;
    const expectedActiveElapsedMs = Math.max(
      0, now - session.createdAt.getTime() - pausedAtMs - pausedTotalMs
    );
    if (Math.abs(
      expectedActiveElapsedMs - actionOffsetsMs[actionOffsetsMs.length - 1]
    ) > 5_000) {
      const error = new Error('La chronologie active de la partie ne correspond pas à la session.');
      error.status = 409;
      throw error;
    }
  }

  let result;
  try {
    result = simulateGame(session.seed, actions, {
      xpBoostDurationMs,
      actionOffsetsMs
    });
  } catch {
    const error = new Error('Le rejeu boosté de la partie n’est pas valide.');
    error.status = 400;
    throw error;
  }

  const playerPath = `players/${uid}`;
  const questPath = `players/${uid}/quests/progress`;
  const creditRewardsPath = `players/${uid}/battlePassSeasons/season-1`;
  const boostStatePath = `players/${uid}/xpBoostState/current`;
  const receiptPath = `players/${uid}/processedGames/${sessionId}`;
  const leaderboardPath = `leaderboards/single-game/entries/${uid}`;
  const rewardPaths = BATTLE_PASS_ITEM_REWARDS.map(reward =>
    `players/${uid}/inventory/${reward.itemId}`);
  const [
    playerDocument, questDocument, creditRewardsDocument, boostStateDocument,
    receiptDocument, leaderboardDocument, ...rewardDocuments
  ] = await Promise.all([
    getDocument(env, playerPath, transaction),
    getDocument(env, questPath, transaction),
    getDocument(env, creditRewardsPath, transaction),
    getDocument(env, boostStatePath, transaction),
    getDocument(env, receiptPath, transaction),
    getDocument(env, leaderboardPath, transaction),
    ...rewardPaths.map(path => getDocument(env, path, transaction))
  ]);
  if (!playerDocument) {
    const error = new Error('Le profil joueur est introuvable.');
    error.status = 404;
    throw error;
  }
  if (receiptDocument) {
    const error = new Error('Un reçu existe déjà pour cette partie.');
    error.status = 409;
    throw error;
  }
  const boostState = boostStateDocument?.data || {};
  const ownsBoostState = boostState.activeSessionId === sessionId ||
    boostState.pausedSessionId === sessionId;
  const awardedXp = xpBoostDurationMs > 0 ? result.awardedXp : baseResult.awardedXp;
  const player = playerDocument.data;
  if (!Number.isSafeInteger(player.xp) || player.xp < 0 || player.xp > MAX_XP) {
    const error = new Error('Le total XP existant est invalide; aucune donnée n’a été modifiée.');
    error.status = 409;
    throw error;
  }
  const gameProgression = getProgression(player.xp + awardedXp);
  const questResult = applyQuestProgress(questDocument?.data || null, {
    gamesPlayed: 1,
    linesCleared: result.lines,
    piecesPlaced: result.piecesPlaced,
    bestSingleGameLines: result.lines
  });
  const updatedProgression = getProgression(gameProgression.xp + questResult.rewardXp);
  const battlePass = getUpdatedBattlePass(player.battlePass, updatedProgression.level);
  const statistics = player.statistics && typeof player.statistics === 'object'
    ? player.statistics : {};
  const currentLines = player.lines === undefined ? 0 : player.lines;
  if (!Number.isSafeInteger(currentLines) || currentLines < 0) {
    const error = new Error('Le total de lignes existant est invalide; aucune donnée n’a été modifiée.');
    error.status = 409;
    throw error;
  }
  const previousBestSingleGameLines = player.bestSingleGameLines === undefined
    ? 0 : player.bestSingleGameLines;
  if (!Number.isSafeInteger(previousBestSingleGameLines) || previousBestSingleGameLines < 0) {
    const error = new Error('Le record de lignes existant est invalide; aucune donnée n’a été modifiée.');
    error.status = 409;
    throw error;
  }
  const totalLines = currentLines + result.lines;
  if (!Number.isSafeInteger(totalLines)) {
    const error = new Error('Le nouveau total de lignes dépasse la limite prise en charge.');
    error.status = 409;
    throw error;
  }
  const bestSingleGameLines = Math.max(previousBestSingleGameLines, result.lines);
  const bestScore = Math.max(
    Number.isInteger(statistics.bestScore) ? statistics.bestScore : 0,
    result.score
  );
  const earnedLevel = updatedProgression.level;
  const ownedItemIds = rewardDocuments.filter(Boolean)
    .map(document => document.path.split('/').at(-1));
  const rewardRecovery = getBattlePassRewardRecovery(
    { ...player, xp: updatedProgression.xp, level: earnedLevel, battlePass },
    creditRewardsDocument?.data || null,
    ownedItemIds,
    []
  );
  const nowDate = new Date(now);
  const nextPlayer = {
    xp: updatedProgression.xp,
    level: earnedLevel,
    battlePass: rewardRecovery.battlePass,
    lines: totalLines,
    bestSingleGameLines,
    statistics: {
      ...statistics,
      gamesPlayed: (Number.isSafeInteger(statistics.gamesPlayed)
        ? statistics.gamesPlayed : 0) + 1,
      bestScore
    },
    updatedAt: nowDate
  };
  if (rewardRecovery.creditsGranted > 0) nextPlayer.credits = rewardRecovery.credits;

  const submission = {
    ok: true,
    lines: result.lines,
    piecesPlaced: result.piecesPlaced,
    score: result.score,
    awardedXp,
    questXpAwarded: updatedProgression.xp - gameProgression.xp,
    questCompletions: questResult.newlyCompleted,
    xp: updatedProgression.xp,
    level: earnedLevel,
    creditsGranted: rewardRecovery.creditsGranted
  };
  const writes = [
    writeDocument(playerDocument, nextPlayer),
    writeOrCreateDocument(env, questDocument, questPath, {
      ...questResult.progress,
      updatedAt: nowDate
    }),
    writeDocument(sessionDocument, { submittedAt: nowDate, submission }),
    createDocumentWrite(env, receiptPath, {
      awardedXp,
      xpBefore: player.xp,
      xpAfter: updatedProgression.xp,
      level: earnedLevel,
      lines: result.lines,
      score: result.score,
      createdAt: nowDate
    })
  ];
  if (rewardRecovery.creditsGranted > 0) {
    writes.push(writeOrCreateDocument(env, creditRewardsDocument, creditRewardsPath, {
      seasonId: 'season-1',
      creditRewardLevels: rewardRecovery.creditRewardLevels,
      updatedAt: nowDate
    }));
  }
  rewardRecovery.itemRewards.forEach(reward => {
    writes.push(createDocumentWrite(env,
      `players/${uid}/inventory/${reward.itemId}`, {
        ...reward,
        source: 'battle-pass',
        seasonId: 'season-1',
        unlockedAt: nowDate
      }));
  });
  const leaderboardEntry = {
    uid,
    displayName: player.displayName || 'Joueur',
    usernameLower: player.usernameLower || '',
    lines: bestSingleGameLines,
    bestScore,
    level: earnedLevel,
    updatedAt: nowDate
  };
  writes.push(writeOrCreateDocument(env, leaderboardDocument, leaderboardPath, leaderboardEntry));

  if (ownsBoostState && validSessionBoost) {
    const expiresAt = boostState.activeExpiresAt instanceof Date
      ? boostState.activeExpiresAt
      : new Date(session.createdAt.getTime() + xpBoostDurationMs);
    const remainingMs = Math.max(
      0, Math.min(xpBoostDurationMs, expiresAt.getTime() - now)
    );
    writes.push(writeDocument(boostStateDocument, {
      activeBoostId: remainingMs > 0 ? session.xpBoostId : null,
      activeRemainingMs: remainingMs,
      activeStartedAt: remainingMs > 0
        ? boostState.activeStartedAt || session.createdAt : null,
      activeExpiresAt: remainingMs > 0 ? expiresAt : null,
      activeSessionId: null,
      pausedSessionId: null,
      updatedAt: nowDate
    }));
  }
  await commit(env, writes, transaction);
  return submission;
}

async function syncProgression(env, identity) {
  const transaction = await beginTransaction(env);
  const player = await getDocument(env, `players/${identity.sub}`, transaction);
  if (!player) {
    const error = new Error('Le profil joueur est introuvable.');
    error.status = 404;
    throw error;
  }
  if (!Number.isSafeInteger(player.data.xp) || player.data.xp < 0 ||
      player.data.xp > MAX_XP) {
    const error = new Error('Le total XP existant est invalide; aucune donnée n’a été modifiée.');
    error.status = 409;
    throw error;
  }
  const progression = getProgression(player.data.xp);
  const battlePass = getUpdatedBattlePass(player.data.battlePass, progression.level);
  const battlePassChanged = battlePass.seasonId !== player.data.battlePass?.seasonId ||
    (battlePass.seasonId === 'season-1' &&
      battlePass.level !== player.data.battlePass?.level);
  const changed = player.data.xp !== progression.xp || player.data.level !== progression.level ||
    battlePassChanged;
  if (changed) {
    await commit(env, [{
      ...writeDocument(player, {
        xp: progression.xp,
        level: progression.level,
        battlePass,
        updatedAt: new Date()
      })
    }], transaction);
  } else {
    await rollback(env, transaction);
  }
  return progression;
}

function getBattlePassRewardRecovery(player, rewardState, ownedItemIds, receiptLevels) {
  if (!Number.isSafeInteger(player.xp) || player.xp < 0 || player.xp > MAX_XP) {
    const error = new Error('Le total XP existant est invalide; aucune récompense n’a été modifiée.');
    error.status = 409;
    throw error;
  }
  if (player.credits !== undefined &&
      (!Number.isSafeInteger(player.credits) || player.credits < 0)) {
    const error = new Error('Le solde de crédits existant est invalide; aucune récompense n’a été modifiée.');
    error.status = 409;
    throw error;
  }

  const level = getProgression(player.xp).level;
  const battlePass = getUpdatedBattlePass(player.battlePass, level);
  if (battlePass.seasonId !== 'season-1') {
    return {
      level,
      battlePass,
      credits: player.credits || 0,
      creditsGranted: 0,
      creditRewardLevels: [],
      itemRewards: []
    };
  }

  let storedLevels = [];
  if (rewardState !== null) {
    if (!rewardState || typeof rewardState !== 'object' || Array.isArray(rewardState) ||
        rewardState.seasonId !== 'season-1') {
      const error = new Error('L’état des récompenses Battle Pass est invalide; aucune récompense n’a été modifiée.');
      error.status = 409;
      throw error;
    }
    storedLevels = rewardState.creditRewardLevels === undefined
      ? [] : rewardState.creditRewardLevels;
  }
  try {
    getUnclaimedBattlePassCreditLevels(MAX_LEVEL, storedLevels);
  } catch {
    const error = new Error('L’historique des récompenses de crédits est invalide; aucune récompense n’a été modifiée.');
    error.status = 409;
    throw error;
  }
  const marker = player.battlePass?.lastCreditRewardLevel;
  let markerLevels = [];
  if (marker !== undefined) {
    const markerLevel = Number(marker);
    if (typeof marker !== 'string' || String(markerLevel) !== marker ||
        !Number.isSafeInteger(markerLevel) ||
        !BATTLE_PASS_CREDIT_REWARD_LEVELS.includes(markerLevel) &&
          !LEGACY_BATTLE_PASS_CREDIT_REWARD_LEVELS.includes(markerLevel)) {
      const error = new Error('Le marqueur de crédits Battle Pass est invalide; aucune récompense n’a été modifiée.');
      error.status = 409;
      throw error;
    }
    try {
      markerLevels = getUnclaimedBattlePassCreditLevels(markerLevel, [])
        .filter(level => level <= markerLevel);
    } catch {
      const error = new Error('Le marqueur de crédits Battle Pass est invalide; aucune récompense n’a été modifiée.');
      error.status = 409;
      throw error;
    }
  }
  const claimedLevels = [...new Set([
    ...storedLevels, ...receiptLevels, ...markerLevels
  ])].sort((a, b) => a - b);
  try {
    getUnclaimedBattlePassCreditLevels(MAX_LEVEL, claimedLevels);
  } catch {
    const error = new Error('L’historique des récompenses de crédits est invalide; aucune récompense n’a été modifiée.');
    error.status = 409;
    throw error;
  }
  const plan = getBattlePassRewardPlan(
    level,
    player.credits || 0,
    claimedLevels,
    ownedItemIds
  );
  return {
    level,
    battlePass,
    credits: plan.credits,
    creditsGranted: plan.creditsGranted,
    creditRewardLevels: plan.claimedCreditLevels,
    itemRewards: plan.itemRewards
  };
}

function getBattlePassSkinRecovery(player, ownedItemIds) {
  if (!player || typeof player !== 'object' ||
      !Number.isSafeInteger(player.xp) || player.xp < 0 || player.xp > MAX_XP) {
    const error = new Error('Le XP Firestore est invalide; aucun skin n’a été attribué.');
    error.status = 409;
    throw error;
  }
  const level = getProgression(player.xp).level;
  const battlePass = getUpdatedBattlePass(player.battlePass, level);
  return {
    level,
    itemRewards: battlePass.seasonId === 'season-1'
      ? getUnclaimedBattlePassItemRewards(level, ownedItemIds)
      : []
  };
}

async function syncBattlePassRewardsOnce(env, identity) {
  const uid = identity.sub;
  const transaction = await beginTransaction(env);
  const playerPath = `players/${uid}`;
  const statePath = `${playerPath}/battlePassSeasons/season-1`;
  const creditLevels = Array.from({ length: 25 }, (_, index) => (index + 1) * 4);
  const [player, state, ...rewardSnapshots] = await Promise.all([
    getDocument(env, playerPath, transaction),
    getDocument(env, statePath, transaction),
    ...BATTLE_PASS_ITEM_REWARDS.map(reward =>
      getDocument(env, `${playerPath}/inventory/${reward.itemId}`, transaction)),
    ...creditLevels.map(level =>
      getDocument(env, `${statePath}/rewards/${level}`, transaction))
  ]);
  if (!player) {
    await rollback(env, transaction);
    const error = new Error('Le profil joueur est introuvable.');
    error.status = 404;
    throw error;
  }

  const skinSnapshots = rewardSnapshots.slice(0, BATTLE_PASS_ITEM_REWARDS.length);
  const receiptSnapshots = rewardSnapshots.slice(BATTLE_PASS_ITEM_REWARDS.length);
  receiptSnapshots.forEach((snapshot, index) => {
    if (!snapshot) return;
    const receipt = snapshot.data;
    if (receipt.level !== creditLevels[index] ||
        receipt.credits !== BATTLE_PASS_CREDIT_REWARD_AMOUNT ||
        receipt.seasonId !== 'season-1') {
      const error = new Error('Un reçu de crédits Battle Pass est invalide; aucune récompense n’a été modifiée.');
      error.status = 409;
      throw error;
    }
  });
  const recovery = getBattlePassRewardRecovery(
    player.data,
    state?.data || null,
    skinSnapshots.filter(snapshot => snapshot).map(snapshot => snapshot.path.split('/').pop()),
    receiptSnapshots.flatMap((snapshot, index) => snapshot ? [creditLevels[index]] : [])
  );
  if (recovery.battlePass.seasonId !== 'season-1') {
    await rollback(env, transaction);
    return { level: recovery.level, creditsGranted: 0, rewardsGranted: [] };
  }

  const existingReceiptLevels = new Set(
    receiptSnapshots.flatMap((snapshot, index) => snapshot ? [creditLevels[index]] : [])
  );
  const missingReceipts = recovery.creditRewardLevels.filter(level =>
    level <= recovery.level && !existingReceiptLevels.has(level)
  );
  const writes = [];
  const now = new Date();
  const nextBattlePass = recovery.battlePass;
  const playerPatch = {};
  if (player.data.xp !== getProgression(player.data.xp).xp ||
      player.data.level !== recovery.level ||
      player.data.battlePass?.seasonId !== nextBattlePass.seasonId ||
      player.data.battlePass?.level !== nextBattlePass.level ||
      recovery.credits !== (player.data.credits || 0)) {
    playerPatch.xp = player.data.xp;
    playerPatch.level = recovery.level;
    playerPatch.battlePass = nextBattlePass;
    if (recovery.credits !== (player.data.credits || 0)) playerPatch.credits = recovery.credits;
    playerPatch.updatedAt = now;
    writes.push(writeDocument(player, playerPatch));
  }

  const creditRewardLevels = recovery.creditRewardLevels;
  if (creditRewardLevels.length &&
      (!state || JSON.stringify(state.data.creditRewardLevels || []) !==
        JSON.stringify(creditRewardLevels))) {
    const stateData = {
      seasonId: 'season-1',
      creditRewardLevels,
      updatedAt: now
    };
    writes.push(state
      ? writeDocument(state, stateData)
      : createDocumentWrite(env, statePath, stateData));
  }

  for (const reward of recovery.itemRewards) {
    const rewardPath = `${playerPath}/inventory/${reward.itemId}`;
    writes.push(createDocumentWrite(env, rewardPath, {
      ...reward,
      source: 'battle-pass',
      seasonId: 'season-1',
      unlockedAt: now
    }));
  }
  for (let index = 0; index < BATTLE_PASS_ITEM_REWARDS.length; index++) {
    const snapshot = skinSnapshots[index];
    if (!snapshot) continue;
    const repair = getBattlePassSkinRepair(
      BATTLE_PASS_ITEM_REWARDS[index], snapshot.data, now
    );
    if (Object.keys(repair).length) writes.push(writeDocument(snapshot, repair));
  }
  for (const level of missingReceipts) {
    writes.push(createDocumentWrite(env, `${statePath}/rewards/${level}`, {
      level,
      credits: BATTLE_PASS_CREDIT_REWARD_AMOUNT,
      seasonId: 'season-1',
      claimedAt: now
    }));
  }

  if (writes.length) await commit(env, writes, transaction);
  else await rollback(env, transaction);
  return {
    level: recovery.level,
    creditsGranted: recovery.creditsGranted,
    rewardsGranted: recovery.itemRewards
  };
}

async function syncBattlePassSkinsOnce(env, identity) {
  const transaction = await beginTransaction(env);
  const playerPath = `players/${identity.sub}`;
  const [player, ...skinSnapshots] = await Promise.all([
    getDocument(env, playerPath, transaction),
    ...BATTLE_PASS_ITEM_REWARDS.map(reward =>
      getDocument(env, `${playerPath}/inventory/${reward.itemId}`, transaction))
  ]);
  if (!player) {
    await rollback(env, transaction);
    const error = new Error('Le profil joueur est introuvable.');
    error.status = 404;
    throw error;
  }

  const recovery = getBattlePassSkinRecovery(
    player.data,
    skinSnapshots.filter(Boolean).map(snapshot => snapshot.path.split('/').pop())
  );
  const writes = recovery.itemRewards.map(reward => createDocumentWrite(
    env,
    `${playerPath}/inventory/${reward.itemId}`,
    {
      ...reward,
      source: 'battle-pass',
      seasonId: 'season-1',
      unlockedAt: new Date()
    }
  ));
  for (let index = 0; index < BATTLE_PASS_ITEM_REWARDS.length; index++) {
    const snapshot = skinSnapshots[index];
    if (!snapshot) continue;
    const repair = getBattlePassSkinRepair(
      BATTLE_PASS_ITEM_REWARDS[index], snapshot.data
    );
    if (Object.keys(repair).length) writes.push(writeDocument(snapshot, repair));
  }
  if (writes.length) await commit(env, writes, transaction);
  else await rollback(env, transaction);
  return { level: recovery.level, rewardsGranted: recovery.itemRewards };
}

async function syncBattlePassRewards(env, identity) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await syncBattlePassRewardsOnce(env, identity);
    } catch (error) {
      const firestoreStatus = error.firestore?.error?.status;
      const retryable = firestoreStatus === 'ABORTED' ||
        firestoreStatus === 'FAILED_PRECONDITION' || firestoreStatus === 'ALREADY_EXISTS';
      if (!retryable || attempt === 2) throw error;
    }
  }
  throw new Error('La récupération des récompenses Battle Pass a échoué après plusieurs conflits.');
}

async function syncBattlePassSkins(env, identity) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await syncBattlePassSkinsOnce(env, identity);
    } catch (error) {
      const firestoreStatus = error.firestore?.error?.status;
      const retryable = firestoreStatus === 'ABORTED' ||
        firestoreStatus === 'FAILED_PRECONDITION' || firestoreStatus === 'ALREADY_EXISTS';
      if (!retryable || attempt === 2) throw error;
    }
  }
  throw new Error('La récupération des skins Battle Pass a échoué après plusieurs conflits.');
}

export default {
  async fetch(request, env) {
    const origin = allowedOrigin(request, env);
    const requestUrl = new URL(request.url);
    const pathname = requestUrl.pathname;
    if (origin === false) return jsonResponse({ error: 'Origine non autorisée.' }, 403);
    if (request.method === 'OPTIONS') return jsonResponse({}, 204, origin);
    if (request.method !== 'POST') return jsonResponse({ error: 'Méthode non autorisée.' }, 405, origin);
    if (!origin) return jsonResponse({ error: 'Origine requise.' }, 403);

    try {
      const operation = requestUrl.searchParams.get('operation');
      const identity = await authenticate(request, env, pathname, operation);
      const requestData = await request.json();
      let data;
      if (pathname === '/profile/create') {
        data = await createPlayerProfile(env, identity, requestData);
      } else if (pathname === '/game/start') {
        data = await startGameSession(env, identity);
      } else if (pathname === '/game/submit') {
        data = await submitGameResult(env, identity, requestData);
      } else if (pathname === '/progression/sync') {
        data = await syncProgression(env, identity);
      } else if (pathname === '/battle-pass/sync') {
        data = operation === 'skins-only'
          ? await syncBattlePassSkins(env, identity)
          : await syncBattlePassRewards(env, identity);
      } else {
        return jsonResponse({ error: 'Route inconnue.' }, 404, origin);
      }
      return jsonResponse(data, 200, origin);
    } catch (error) {
      console.error('Erreur API de progression:', error.message);
      return jsonResponse({ error: error.message || 'Erreur interne du Worker.' }, error.status || 500, origin);
    }
  }
};

export {
  fromFirestoreFields, getBattlePassRewardRecovery, getUpdatedBattlePass,
  getBattlePassSkinRecovery, getBattlePassSkinRepair, isAppCheckRequired,
  parseServiceAccount, startGameSession, submitGameResult, toFirestoreValue,
  validateDisplayName
};
