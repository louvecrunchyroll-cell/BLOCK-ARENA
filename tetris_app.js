(() => {
  'use strict';

  const MAX_LEVEL = 100;
  const BATTLE_PASS_PAGES = 20;
  // Paris is UTC+1 at both Battle Pass boundaries in November 2026.
  const BATTLE_PASS_START_AT = Date.parse('2026-11-02T00:00:00+01:00');
  const BATTLE_PASS_END_AT = Date.parse('2026-11-30T00:00:00+01:00');
  const SHOP_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  const SHOP_ROTATION_EPOCH = Date.UTC(1970, 0, 5);
  const SHOP_BLOC1_ID = 'loading-screen-bloc-1';
  const SHOP_BLOC1_PRICE = 300;
  const SHOP_BLOC1_IMAGE =
    '/boutique%201/Blocs%20Tetris%20m%C3%A9talliques%20sur%20plan%20quadrill%C3%A9.png';
  const CREDIT_LOGO_SRC =
    '/logo-pieces/M%C3%A9daille%20dor%C3%A9e%20avec%20bloc%20violet%20brillant.png';
  const BATTLE_PASS_SKIN_IMAGE_DIR = '/Batll Pass 1/';
  const BATTLE_PASS_SKIN_IMAGE_VERSION = '20261106-skin-image-paths';
  const BATTLE_PASS_SKIN_FILES = [
    'Logo Red Bull classique centré.png',
    'Logo Coca‑Cola Classic carré.png',
    'Drapeau français tricolore en aplats.png',
    'Chiffres néon 67 en contraste.png',
    'Emblème rétro de bière verte et rouge.png',
    'Logo Netflix rouge en relief sur fond noir.png',
    'walking_dead_skin_carre.png',
    'Les 100 — Logo Grunge et Fumée.png',
    'Portrait cinématographique de deux destins liés.png',
    'Aile de braise dans la fumée.png',
    'Emblème d’araignée rouge lumineux.png',
    'Route suspendue sous un ciel orageux.png',
    'Alice in Borderland, emblème des cartes.png',
    'Logo métallique V7 enflammé.png',
    'Enfant roux sous une méduse brillante.png',
    'Oncle Sam masqué dans les flammes.png',
    'Bulle irisée dans un ciel éclatant.png',
    'Logo néon rose « SQUID GAME ».png',
    null,
    null
  ];
  const BATTLE_PASS_SKIN_NAMES = [
    'Red Bull',
    'Coca-Cola',
    'FR',
    '67',
    'Heineken',
    'Netflix',
    'TWD',
    'LES 100',
    'Sisyphus The Myth',
    'Sweet Home',
    'Spiderman',
    'Under The Dome',
    'Alice In Borderland',
    'V7',
    'Ponyo',
    'American Nightmare',
    'Bubble',
    'Squid Game'
  ];
  const getBattlePassSkinImage = index => {
    const fileName = BATTLE_PASS_SKIN_FILES[index];
    if (!fileName) {
      const label = `SKIN ${index + 1}`;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="#4c1688"/><stop offset="1" stop-color="#101c50"/></linearGradient></defs><rect width="240" height="240" rx="28" fill="url(#g)"/><path d="M56 136h64V72h64v64h-64v64H56z" fill="#55dfff" opacity=".85"/><path d="M73 151h48v48H73zM136 88h31v31h-31z" fill="#fff" opacity=".55"/><text x="120" y="46" fill="#fff" font-family="Arial,sans-serif" font-size="21" font-weight="700" text-anchor="middle">${label}</text></svg>`;
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    }
    return `${BATTLE_PASS_SKIN_IMAGE_DIR}${encodeURIComponent(fileName)}?v=${BATTLE_PASS_SKIN_IMAGE_VERSION}`;
  };
  const BATTLE_PASS_SKINS = [
    ...Array.from({ length: 20 }, (_, index) => {
      const skinNumber = index + 1;
      const isRedBull = skinNumber === 1;
      const itemId = `skin-${String(skinNumber).padStart(2, '0')}`;
      return {
        level: skinNumber === 20 ? 99 : skinNumber * 5,
        itemId: isRedBull ? 'redbull' : itemId,
        name: BATTLE_PASS_SKIN_NAMES[index] || `Skin ${skinNumber}`,
        image: getBattlePassSkinImage(index)
      };
    })
  ];
  const BATTLE_PASS_LOADING_SCREENS = [
    { level: 2, itemId: 'loading-screen-bp-01', name: 'Tétris néon sous un ciel cosmique', image: '/Batll%20Pass%20ecran%20chargement/T%C3%A9tris%20n%C3%A9on%20sous%20un%20ciel%20cosmique.png' },
    { level: 6, itemId: 'loading-screen-bp-02', name: 'Trône néon aux blocs violets', image: '/Batll%20Pass%20ecran%20chargement/Tr%C3%B4ne%20n%C3%A9on%20aux%20blocs%20violets.png' },
    { level: 11, itemId: 'loading-screen-bp-03', name: 'Tempête néon et vortex de Tétris', image: '/Batll%20Pass%20ecran%20chargement/Temp%C3%AAte%20n%C3%A9on%20et%20vortex%20de%20T%C3%A9tris.png' },
    { level: 17, itemId: 'loading-screen-bp-04', name: 'Numéro 93 en style course grunge', image: '/Batll%20Pass%20ecran%20chargement/Num%C3%A9ro%2093%20en%20style%20course%20grunge.png' },
    { level: 21, itemId: 'loading-screen-bp-05', name: 'Forêt enchantée aux blocs néon', image: '/Batll%20Pass%20ecran%20chargement/For%C3%AAt%20enchant%C3%A9e%20aux%20blocs%20n%C3%A9on.png' },
    { level: 26, itemId: 'loading-screen-bp-06', name: 'Collage lumineux de blocs Tetris', image: '/Batll%20Pass%20ecran%20chargement/Collage%20lumineux%20de%20blocs%20Tetris.png' },
    { level: 31, itemId: 'loading-screen-bp-07', name: 'Coffret de Saint-Valentin dans les nuages', image: '/Batll%20Pass%20ecran%20chargement/Coffret%20de%20Saint-Valentin%20dans%20les%20nuages.png' },
    { level: 37, itemId: 'loading-screen-bp-08', name: 'Blocs Tetris métalliques Red Bull', image: '/Batll%20Pass%20ecran%20chargement/Blocs%20Tetris%20m%C3%A9talliques%20Red%20Bull.png' },
    { level: 41, itemId: 'loading-screen-bp-09', name: 'Arcade Tetris festif et coloré', image: '/Batll%20Pass%20ecran%20chargement/Arcade%20Tetris%20festif%20et%20color%C3%A9.png' }
  ];
  const BATTLE_PASS_MUSIC_LOGO =
    '/Batll%20Pass%20musique/Ic%C3%B4ne%20n%C3%A9on%20de%20notes%20musicales.png';
  const BATTLE_PASS_MUSIC = [
    { level: 1, itemId: 'music-bp-01', name: 'High Score', audioUrl: '/Batll%20Pass%20musique/17-high-scoremp3.mp3' },
    { level: 9, itemId: 'music-bp-02', name: 'Pixel Rush', audioUrl: '/Batll%20Pass%20musique/19-sfx.mp3' },
    { level: 14, itemId: 'music-bp-03', name: 'Neon Sprint', audioUrl: '/Batll%20Pass%20musique/20-sfx.mp3' },
    { level: 16, itemId: 'music-bp-04', name: 'Arcade Pulse', audioUrl: '/Batll%20Pass%20musique/23-sfx.mp3' },
    { level: 22, itemId: 'music-bp-05', name: 'Last Drop', audioUrl: '/Batll%20Pass%20musique/33-sfx.mp3' },
    { level: 29, itemId: 'music-bp-06', name: 'Terre Calme', audioUrl: '/Batll%20Pass%20musique/harmonious-earth_88300.mp3' },
    { level: 34, itemId: 'music-bp-07', name: 'Nouvel Élan', audioUrl: '/Batll%20Pass%20musique/inspiring-business-vibes_88287.mp3' },
    { level: 39, itemId: 'music-bp-08', name: 'Optimisme', audioUrl: '/Batll%20Pass%20musique/optimistic-professionalism_88726.mp3' },
    { level: 42, itemId: 'music-bp-09', name: 'Triomphe', audioUrl: '/Batll%20Pass%20musique/path-to-triumph_88293.mp3' }
  ].map(track => ({ ...track, imageUrl: BATTLE_PASS_MUSIC_LOGO }));
  const XP_BOOST_LEVELS = [
    3, 7, 13, 18, 23, 27, 33, 38, 43, 47, 53,
    58, 63, 67, 73, 78, 83, 87, 93, 97, 98
  ];
  const XP_BOOST_ITEM_LEVELS = [
    3, 7, 13, 18, 23, 28, 33, 38, 43, 48, 53,
    58, 63, 68, 73, 78, 83, 88, 93, 100, 98
  ];
  const BATTLE_PASS_CREDIT_REWARD_LEVELS = [
    4, 8, 12, 16, 19, 24, 28, 32, 36, 39, 44, 48, 52,
    56, 59, 64, 68, 72, 76, 79, 84, 88, 92, 96, 100
  ];
  const LEGACY_BATTLE_PASS_CREDIT_REWARD_LEVELS = [
    4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52,
    56, 60, 64, 68, 72, 76, 80, 84, 88, 92, 96, 100
  ];
  const XP_BOOST_DURATION_MS = 20 * 60 * 1000;
  const XP_BOOST_IMAGE =
    '/boost%20xp/Embl%C3%A8me%20XP%20dor%C3%A9%20X2%20n%C3%A9on.png';
  const XP_BOOSTS = XP_BOOST_LEVELS.map((level, index) => ({
    level,
    itemId: `xp-boost-level-${XP_BOOST_ITEM_LEVELS[index]}`,
    name: 'Boost XP +5',
    image: XP_BOOST_IMAGE
  }));
  const BLOCK_SKIN_IMAGES = new Map(
    BATTLE_PASS_SKINS.map(skin => [skin.itemId, skin.image])
  );
  const MAX_XP = 1_000_000;
  const XP_THRESHOLDS = [0, 0, 300, 900, 2_400];
  // Keep the display curve aligned with the server's 1,000,000 XP level-100 threshold.
  for (let targetLevel = 5; targetLevel <= MAX_LEVEL; targetLevel++) {
    const index = targetLevel - 5;
    const adjustment = Math.floor((index + 1) * 16 / 96) - Math.floor(index * 16 / 96);
    XP_THRESHOLDS[targetLevel] =
      XP_THRESHOLDS[targetLevel - 1] + 1_604 + 185 * index + adjustment;
  }
  const BLOCK_SKIN_COLORS = {
    default: '#808080',
    cyan: '#3fe3fc',
    yellow: '#ffe36a',
    violet: '#b77bff',
    green: '#5df4a3',
    pink: '#ff6a9e',
    blue: '#6a8dff',
    orange: '#ffab54'
  };
  const emptyData = () => ({
    xp: 0,
    level: 1,
    lines: 0,
    credits: 0,
    friends: [],
    blocked: [],
    ownedSkins: ['default'],
    inventoryItems: [],
    claimedCreditRewardLevels: [],
    equippedSkin: 'default',
    equippedMusic: 'none',
    equippedLoadingScreen: 'none',
    settings: { music: true, musicVolume: 70, blocksVolume: 80 }
  });

  let auth = null;
  let db = null;
  let firebaseInitPromise = null;
  let firebaseFunctionsSdkPromise = null;
  let currentUser = null;
  let authStateReady = false;
  let initialAuthStateResolved = false;
  let profile = null;
  let data = emptyData();
  let initialized = false;
  let profileUnsubscribe = null;
  let questProgressUnsubscribe = null;
  let worldLeaderboardUnsubscribe = null;
  let ownLeaderboardUnsubscribe = null;
  let ownProfileLeaderboardUnsubscribe = null;
  let friendsLeaderboardUnsubscribe = null;
  let worldLeaderboardEntries = [];
  let ownLeaderboardEntry = null;
  let ownProfileLeaderboardEntry = null;
  const friendLeaderboardUnsubscribes = new Map();
  const friendLeaderboardEntries = new Map();
  let lastNotifiedLevel = null;
  let hasObservedLevel = false;
  let deferQuestCompletionNotifications = false;
  const notifiedQuestCompletions = new Set();
  const pendingQuestNotificationStorageKey = 'tetrisPendingQuestCompletions';
  const pendingLevelNotificationStorageKey = 'tetrisPendingLevelUp';
  let battlePassCountdownInterval = null;
  let shopCountdownInterval = null;
  let pseudoChangeCountdownInterval = null;
  let inventoryUnsubscribe = null;
  let xpBoostStateUnsubscribe = null;
  let xpBoostTimerInterval = null;
  let expiredXpBoostRenderedId = null;
  let visibilityPausedGame = false;
  let xpBoostState = {
    selectedBoostId: null,
    activeBoostId: null,
    activeSessionId: null,
    activeRemainingMs: 0,
    activeStartedAt: null,
    activeExpiresAt: null
  };
  let creditRewardStateUnsubscribe = null;
  let inventoryInitialSnapshotLoaded = false;
  const blockSkinImagePromises = new Map();
  let rewardSyncPromise = null;
  let rewardSyncUid = null;
  let rewardSyncedLevel = 0;
  let rewardSyncRequestedLevel = 0;
  let battlePassNoticeTimeout = null;
  const centerNoticeQueue = [];
  let centerNoticeActive = false;
  const recentBattlePassNotices = new Set();
  let lastShopCycle = null;
  let gameSessionError = '';
  let connectionNoticeTimeout = null;
  let preferencesUnsubscribe = null;
  let friendsUnsubscribe = null;
  let blockedUnsubscribe = null;

  function configReady(config) {
    return config && config.apiKey && !config.apiKey.startsWith('YOUR_') &&
      config.authDomain && !config.authDomain.startsWith('YOUR_') &&
      config.projectId && !config.projectId.startsWith('YOUR_') &&
      config.appId && !config.appId.startsWith('YOUR_');
  }

  function connectionNotice(message, error = false, timeoutMs = 0) {
    const loginNotice = document.getElementById('notice');
    let notice = document.getElementById('firebaseNotice');
    clearTimeout(connectionNoticeTimeout);
    connectionNoticeTimeout = null;
    if (!message) {
      notice?.remove();
      if (loginNotice) loginNotice.textContent = '';
      return;
    }
    if (loginNotice) loginNotice.textContent = message;
    if (!notice) {
      notice = document.createElement('div');
      notice.id = 'firebaseNotice';
      notice.setAttribute('role', error ? 'alert' : 'status');
      notice.style.cssText = document.getElementById('board')
        ? 'position:fixed;z-index:1000;top:calc(env(safe-area-inset-top) + 8px);left:12px;right:12px;max-width:340px;margin:auto;padding:7px 10px;border:1px solid #f4ba4b;border-radius:10px;background:#1c1530e8;color:#fff0c1;box-shadow:0 4px 20px #0009;font:700 11px/1.3 system-ui,sans-serif;text-align:center;pointer-events:none'
        : 'position:fixed;z-index:1000;top:calc(env(safe-area-inset-top) + 10px);left:12px;right:12px;max-width:520px;margin:auto;padding:12px 14px;border:1px solid #f4ba4b;border-radius:12px;background:#1c1530;color:#fff0c1;box-shadow:0 4px 20px #0009;font:700 13px/1.45 system-ui,sans-serif;text-align:center;pointer-events:none';
      document.body.append(notice);
    }
    notice.setAttribute('role', error ? 'alert' : 'status');
    notice.textContent = message;
    if (timeoutMs > 0) {
      connectionNoticeTimeout = setTimeout(() => {
        if (document.getElementById('firebaseNotice') === notice) notice.remove();
        if (loginNotice?.textContent === message) loginNotice.textContent = '';
        connectionNoticeTimeout = null;
      }, timeoutMs);
    }
  }

  function showLoginMessage(message) {
    connectionNotice(message, true);
  }

  function finishAuthInitialization() {
    authStateReady = true;
    document.documentElement.classList.remove('auth-pending');
  }

  function loadFirebaseFunctionsSdk() {
    if (firebase.functions) return Promise.resolve();
    if (!firebaseFunctionsSdkPromise) {
      firebaseFunctionsSdkPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://www.gstatic.com/firebasejs/10.14.1/firebase-functions-compat.js';
        script.onload = resolve;
        script.onerror = () => reject(new Error('Impossible de charger le SDK Firebase Functions.'));
        document.head.append(script);
      });
    }
    return firebaseFunctionsSdkPromise;
  }

  function publicError(error) {
    const messages = {
      'auth/email-already-in-use': 'Cette adresse e-mail est déjà utilisée.',
      'auth/invalid-email': 'Adresse e-mail invalide.',
      'auth/invalid-credential': 'Adresse e-mail ou mot de passe incorrect.',
      'auth/user-not-found': 'Aucun compte ne correspond à cette adresse.',
      'auth/wrong-password': 'Adresse e-mail ou mot de passe incorrect.',
      'auth/weak-password': 'Le mot de passe doit contenir au moins 6 caractères.',
      'auth/too-many-requests': 'Trop de tentatives. Réessaie plus tard.',
      'auth/network-request-failed': 'Connexion réseau indisponible.',
      'auth/operation-not-allowed': 'Le fournisseur de connexion demandé n’est pas activé dans Firebase Authentication.',
      'auth/invalid-api-key': 'La clé Firebase est refusée. Vérifie la configuration Web du projet.',
      'auth/app-not-authorized': 'Ce domaine n’est pas autorisé dans Firebase Authentication.',
      'auth/unauthorized-domain': 'Ce domaine doit être autorisé dans Firebase Authentication.',
      'auth/account-exists-with-different-credential': 'Un compte existe déjà avec cette adresse. Connecte-toi avec son fournisseur habituel.',
      'auth/credential-already-in-use': 'Ce compte Google est déjà associé à un autre compte Firebase.',
      'auth/web-storage-unsupported': 'Le navigateur bloque le stockage nécessaire à la connexion Google.',
      'auth/popup-blocked': 'La fenêtre Google a été bloquée. Autorise les fenêtres pop-up pour ce site puis réessaie.',
      'auth/popup-closed-by-user': 'La fenêtre Google a été fermée avant la fin de la connexion.',
      'auth/cancelled-popup-request': 'Une autre fenêtre de connexion est déjà ouverte. Termine-la ou réessaie.',
      'permission-denied': 'Firestore a refusé l’opération. Vérifie les règles d’accès du document concerné.',
      'unauthenticated': 'Firebase Authentication ne reconnaît plus ta session. Reconnecte-toi avant de rejouer.',
      'not-found': 'Le profil Firestore du compte connecté est introuvable.',
      'failed-precondition': 'Firestore ne peut pas enregistrer cette partie dans son état actuel.',
      'auth/requires-recent-login': 'Reconnecte-toi puis réessaie cette opération.',
      'auth/invalid-verification-code': 'Le code de vérification est invalide ou expiré.',
      'auth/expired-action-code': 'Le lien a expiré. Demande une nouvelle réinitialisation.',
      'auth/invalid-action-code': 'Le lien de réinitialisation est invalide ou déjà utilisé.',
    };
    return messages[error.code] || error.message || 'Une erreur Firebase est survenue.';
  }

  async function callGameWorker(path, payload) {
    const user = auth?.currentUser || currentUser;
    const workerUrl = window.BLOCK_ARENA_WORKER_URL;
    if (!user) {
      const error = new Error('Une session Firebase connectée est nécessaire.');
      error.code = 'unauthenticated';
      throw error;
    }
    if (typeof workerUrl !== 'string' || !workerUrl.startsWith('https://')) {
      throw new Error('L’URL du serveur de partie Cloudflare n’est pas configurée.');
    }

    const response = await fetch(`${workerUrl.replace(/\/$/, '')}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${await user.getIdToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.error ||
        `Le serveur de partie a répondu avec le code HTTP ${response.status}.`);
      error.code = `worker/${response.status}`;
      throw error;
    }
    return data;
  }

  function isHostedOnlineGame() {
    return location.protocol === 'https:' &&
      !['localhost', '127.0.0.1'].includes(location.hostname);
  }

  function showFirebaseGameLoginPrompt(message) {
    window.TetrisGame?.waitForSession();
    connectionNotice(message, true);
    let loginLink = document.getElementById('firebaseGameLoginLink');
    if (!loginLink) {
      loginLink = document.createElement('a');
      loginLink.id = 'firebaseGameLoginLink';
      loginLink.href = 'tetris_connexion.html';
      loginLink.textContent = 'SE CONNECTER';
      loginLink.style.cssText = 'position:fixed;z-index:1001;left:50%;bottom:calc(env(safe-area-inset-bottom) + 22px);transform:translateX(-50%);padding:14px 24px;border:2px solid #55dfff;border-radius:14px;background:linear-gradient(110deg,#35206b,#125077);box-shadow:0 0 22px #35cfff88;color:#fff;font:900 15px system-ui,sans-serif;text-decoration:none;pointer-events:auto';
      document.body.append(loginLink);
    }
  }

  function clearFirebaseGameLoginPrompt() {
    document.getElementById('firebaseGameLoginLink')?.remove();
  }

  function dataWithPreferences(preferences) {
    return {
      ...data,
      equippedSkin: preferences.equippedSkin || 'default',
      equippedMusic: preferences.equippedMusic || 'none',
      equippedLoadingScreen: preferences.equippedLoadingScreen || 'none',
      settings: { ...data.settings, ...(preferences.settings || {}) }
    };
  }

  function syncEquippedLoadingScreen() {
    const item = (data.inventoryItems || []).find(inventoryItem =>
      inventoryItem.id === data.equippedLoadingScreen);
    if (data.equippedLoadingScreen !== 'none' && !item &&
        !inventoryInitialSnapshotLoaded) return;
    const imageUrl = data.equippedLoadingScreen === SHOP_BLOC1_ID
      ? SHOP_BLOC1_IMAGE
      : typeof item?.imageUrl === 'string' ? item.imageUrl
        : typeof item?.image === 'string' ? item.image : '';
    window.TetrisPageTransition?.setLoadingScreen(
      typeof imageUrl === 'string' ? imageUrl : ''
    );
  }

  function getUpdatedBattlePass(currentBattlePass, level) {
    const battlePass = { ...(currentBattlePass || {}) };
    if ((battlePass.seasonId !== undefined &&
        (typeof battlePass.seasonId !== 'string' || !battlePass.seasonId)) ||
        (battlePass.level !== undefined &&
        (!Number.isSafeInteger(battlePass.level) || battlePass.level < 1 ||
          battlePass.level > MAX_LEVEL))) {
      throw new Error('La progression Battle Pass existante est invalide; elle n’a pas été modifiée.');
    }
    if (!battlePass.seasonId) battlePass.seasonId = 'season-1';
    if (battlePass.seasonId === 'season-1' &&
        (!Number.isSafeInteger(battlePass.level) || battlePass.level < level)) {
      battlePass.level = level;
    }
    return battlePass;
  }

  function getBlockSkinColor(skin) {
    if (typeof skin !== 'string') return BLOCK_SKIN_COLORS.default;
    const normalizedSkin = skin.trim().toLowerCase();
    if (Object.prototype.hasOwnProperty.call(BLOCK_SKIN_COLORS, normalizedSkin)) {
      return BLOCK_SKIN_COLORS[normalizedSkin];
    }
    return /^#[\da-f]{6}$/i.test(normalizedSkin)
      ? normalizedSkin : BLOCK_SKIN_COLORS.default;
  }

  function loadBlockSkinImage(skin) {
    const source = BLOCK_SKIN_IMAGES.get(skin);
    if (!source) {
      return Promise.reject(new Error(`Aucune image de skin n’est configurée pour « ${skin} ».`));
    }
    if (!blockSkinImagePromises.has(skin)) {
      const imagePromise = new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error(`Impossible de charger l’image du skin « ${skin} » (${source}).`));
        image.src = source;
      });
      blockSkinImagePromises.set(skin, imagePromise);
      imagePromise.catch(() => {
        if (blockSkinImagePromises.get(skin) === imagePromise) {
          blockSkinImagePromises.delete(skin);
        }
      });
    }
    return blockSkinImagePromises.get(skin);
  }

  function syncBattlePassRewards(user, player) {
    const battlePass = player.battlePass || {};
    const seasonId = battlePass.seasonId || 'season-1';
    const reachedLevel = getProgression(player.xp).level;
    const newBoostThresholdReached = XP_BOOST_LEVELS.some(level =>
      level > rewardSyncedLevel && level <= reachedLevel);
    const newRewardThresholdReached = newBoostThresholdReached ||
      BATTLE_PASS_CREDIT_REWARD_LEVELS.some(level =>
        level > rewardSyncedLevel && level <= reachedLevel) ||
      BATTLE_PASS_LOADING_SCREENS.some(screen =>
        screen.level > rewardSyncedLevel && screen.level <= reachedLevel) ||
      BATTLE_PASS_SKINS.some(skin =>
        skin.level > rewardSyncedLevel && skin.level <= reachedLevel) ||
      BATTLE_PASS_MUSIC.some(track =>
        track.level > rewardSyncedLevel && track.level <= reachedLevel);
    if (seasonId !== 'season-1' || !newRewardThresholdReached) return;
    rewardSyncRequestedLevel = Math.max(rewardSyncRequestedLevel, reachedLevel);
    if (rewardSyncPromise && rewardSyncUid === user.uid) return rewardSyncPromise;

    rewardSyncUid = user.uid;
    const syncPromise = (async () => {
      while (currentUser?.uid === user.uid &&
          rewardSyncRequestedLevel > rewardSyncedLevel) {
        const requestedLevel = rewardSyncRequestedLevel;
        await claimBattlePassRewards(user, requestedLevel);
        if (currentUser?.uid !== user.uid) return;
        rewardSyncedLevel = Math.max(rewardSyncedLevel, requestedLevel);
      }
    })()
      .catch(error => {
        console.error('Synchronisation des récompenses Battle Pass impossible.', {
          uid: user.uid,
          code: error.code || 'client-validation',
          message: error.message || String(error)
        }, error);
      })
      .finally(() => {
        if (rewardSyncPromise === syncPromise) {
          rewardSyncPromise = null;
          rewardSyncUid = null;
        }
      });
    rewardSyncPromise = syncPromise;
    return rewardSyncPromise;
  }

  async function claimBattlePassRewards(user) {
    if (!db || currentUser?.uid !== user.uid) return;
    const playerRef = db.doc(`players/${user.uid}`);
    const rewardStateRef = db.doc(`players/${user.uid}/battlePassSeasons/season-1`);
    const profileSnapshot = await playerRef.get({ source: 'server' });
    if (!profileSnapshot.exists) throw new Error('Le profil joueur est introuvable.');
    const playerData = profileSnapshot.data();
    if (!Number.isSafeInteger(playerData.xp) || playerData.xp < 0 ||
        playerData.xp > MAX_XP) {
      throw new Error('Le total XP existant est invalide.');
    }
    const earnedLevel = getProgression(playerData.xp).level;
    if ((playerData.battlePass?.seasonId || 'season-1') !== 'season-1') return;
    let creditsGranted = 0;
    const rewardsGranted = [];
    for (const level of BATTLE_PASS_CREDIT_REWARD_LEVELS.filter(
      rewardLevel => rewardLevel <= earnedLevel
    )) {
      if (currentUser?.uid !== user.uid) return;
      const granted = await db.runTransaction(async transaction => {
        const [playerSnapshot, stateSnapshot, receiptSnapshot] = await Promise.all([
          transaction.get(playerRef),
          transaction.get(rewardStateRef),
          transaction.get(rewardStateRef.collection('rewards').doc(String(level)))
        ]);
        if (!playerSnapshot.exists) throw new Error('Le profil joueur est introuvable.');
        const player = playerSnapshot.data();
        const levelReached = getProgression(player.xp).level;
        const battlePass = player.battlePass || {};
        if (battlePass.seasonId && battlePass.seasonId !== 'season-1' ||
            levelReached < level || receiptSnapshot.exists) return false;
        const state = stateSnapshot.exists ? stateSnapshot.data() : {};
        if (state.seasonId !== undefined && state.seasonId !== 'season-1') {
          throw new Error('L’état des récompenses Battle Pass est invalide.');
        }
        const claimedLevels = state.creditRewardLevels || [];
        if (!Array.isArray(claimedLevels) || claimedLevels.some(claimedLevel =>
          !Number.isSafeInteger(claimedLevel) ||
          !BATTLE_PASS_CREDIT_REWARD_LEVELS.includes(claimedLevel) &&
            !LEGACY_BATTLE_PASS_CREDIT_REWARD_LEVELS.includes(claimedLevel)) ||
            new Set(claimedLevels).size !== claimedLevels.length) {
          throw new Error('L’historique des récompenses de crédits est invalide.');
        }
        const marker = battlePass.lastCreditRewardLevel;
        const markerLevel = marker === undefined ? 0 : Number(marker);
        if (marker !== undefined && (typeof marker !== 'string' ||
            String(markerLevel) !== marker || !Number.isSafeInteger(markerLevel) ||
            !BATTLE_PASS_CREDIT_REWARD_LEVELS.includes(markerLevel) &&
              !LEGACY_BATTLE_PASS_CREDIT_REWARD_LEVELS.includes(markerLevel))) {
          throw new Error('Le marqueur des récompenses de crédits est invalide.');
        }
        if (claimedLevels.includes(level) ||
            ([20, 40, 60, 80].includes(level + 1) &&
              claimedLevels.includes(level + 1)) ||
            (Number.isSafeInteger(markerLevel) && markerLevel >= level)) return false;
        const credits = player.credits === undefined ? 0 : player.credits;
        if (credits < 0 || !Number.isSafeInteger(credits + 100)) {
          throw new Error('Le solde de crédits existant est invalide.');
        }
        const now = firebase.firestore.FieldValue.serverTimestamp();
        const nextLevels = [...new Set([...claimedLevels, level])].sort((a, b) => a - b);
        transaction.update(playerRef, {
          credits: credits + 100,
          battlePass: { ...battlePass, lastCreditRewardLevel: String(level) },
          updatedAt: now
        });
        transaction.set(rewardStateRef, {
          seasonId: 'season-1',
          creditRewardLevels: nextLevels,
          updatedAt: now
        }, { merge: true });
        transaction.set(rewardStateRef.collection('rewards').doc(String(level)), {
          level,
          credits: 100,
          seasonId: 'season-1',
          claimedAt: now
        });
        return true;
      });
      if (granted) creditsGranted += 100;
    }

    const itemRewards = [
      ...BATTLE_PASS_SKINS.map((skin, index) => ({
        ...skin,
        type: 'skin',
        name: index === 0 ? 'Red Bull' : `Skin ${index + 1}`
      })),
      ...BATTLE_PASS_LOADING_SCREENS.map(screen => ({
        ...screen,
        type: 'loading-screen',
        category: 'loading-screen',
        imageUrl: screen.image
      })),
      ...BATTLE_PASS_MUSIC.map(track => ({
        ...track,
        type: 'music',
        category: 'music'
      })),
      ...XP_BOOSTS.map(boost => ({
        ...boost,
        type: 'xp-boost',
        category: 'xp-boost',
        durationMs: XP_BOOST_DURATION_MS,
        bonusXp: 5,
        imageUrl: XP_BOOST_IMAGE,
        quantity: 1,
        usedQuantity: 0
      }))
    ];
    if (currentUser?.uid !== user.uid) return;
    const eligibleRewards = itemRewards.filter(reward => reward.level <= earnedLevel);
    const itemRefs = eligibleRewards.map(reward =>
      db.doc(`players/${user.uid}/inventory/${reward.itemId}`));
    await db.runTransaction(async transaction => {
      rewardsGranted.length = 0;
      const [playerSnapshot, ...itemSnapshots] = await Promise.all([
        transaction.get(playerRef),
        ...itemRefs.map(itemRef => transaction.get(itemRef))
      ]);
      if (!playerSnapshot.exists) throw new Error('Le profil joueur est introuvable.');
      const player = playerSnapshot.data();
      if (!Number.isSafeInteger(player.xp) || player.xp < 0 ||
          player.xp > MAX_XP) {
        throw new Error('Le total XP existant est invalide.');
      }
      if ((player.battlePass?.seasonId || 'season-1') !== 'season-1') return;
      const currentLevel = getProgression(player.xp).level;
      eligibleRewards.forEach((reward, index) => {
        if (reward.level > currentLevel || itemSnapshots[index].exists) return;
        transaction.set(itemRefs[index], {
          level: reward.level,
          itemId: reward.itemId,
          type: reward.type,
          ...(reward.category ? { category: reward.category } : {}),
          name: reward.name,
          ...(reward.audioUrl ? { audioUrl: reward.audioUrl } : {}),
          ...(reward.imageUrl ? { imageUrl: reward.imageUrl } : {}),
          ...(reward.durationMs ? {
            durationMs: reward.durationMs,
            bonusXp: reward.bonusXp,
            quantity: reward.quantity,
            usedQuantity: reward.usedQuantity
          } : {}),
          source: 'battle-pass',
          seasonId: 'season-1',
          unlockedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        rewardsGranted.push(reward);
      });
    });

    if (currentUser?.uid !== user.uid) return;
    for (const reward of rewardsGranted) {
      showBattlePassRewardNotice(`${reward.name} ajouté au casier`, `item:${reward.itemId}`);
    }
    if (creditsGranted > 0) {
      connectionNotice(`${creditsGranted} crédits Battle Pass ajoutés à ton compte.`, false);
    }
  }

  function setupInventory(user) {
    data.ownedSkins = ['default'];
    data.inventoryItems = [];
    inventoryInitialSnapshotLoaded = false;
    inventoryUnsubscribe = db.collection(`players/${user.uid}/inventory`)
      .onSnapshot(snapshot => {
        if (currentUser?.uid !== user.uid) return;
        if (inventoryInitialSnapshotLoaded) {
          snapshot.docChanges().forEach(change => {
            const reward = change.doc.data();
            if (change.type === 'added' && reward.source === 'battle-pass') {
              showBattlePassRewardNotice(
                `${typeof reward.name === 'string' ? reward.name : change.doc.id} ajouté au casier`,
                `item:${change.doc.id}`
              );
            }
          });
        }

        inventoryInitialSnapshotLoaded = true;
        data.inventoryItems = snapshot.docs.map(item => ({
          id: item.id,
          ...item.data()
        }));
        if (data.equippedLoadingScreen !== 'none') syncEquippedLoadingScreen();
        data.ownedSkins = [
          'default',
          ...BATTLE_PASS_SKINS
            .filter(skin => snapshot.docs.some(item =>
              item.id === skin.itemId && item.data().type === 'skin'))
            .map(skin => skin.itemId)
        ];
        refreshPage();
      }, error => {
        console.error('Lecture du casier Firestore impossible.', {
          uid: user.uid,
          error
        });
        connectionNotice(`Impossible de charger le casier : ${publicError(error)}`, true);
      });
  }

  function setupXpBoostState(user) {
    xpBoostState = {
      selectedBoostId: null,
      activeBoostId: null,
      activeSessionId: null,
      activeRemainingMs: 0,
      activeExpiresAt: null
    };
    xpBoostStateUnsubscribe = db.doc(`players/${user.uid}/xpBoostState/current`)
      .onSnapshot(snapshot => {
        if (currentUser?.uid !== user.uid) return;
        const state = snapshot.exists ? snapshot.data() : {};
        xpBoostState = {
          selectedBoostId: state.selectedBoostId || null,
          activeBoostId: state.activeBoostId || null,
          activeSessionId: state.activeSessionId || null,
          activeRemainingMs: Number.isSafeInteger(state.activeRemainingMs)
            ? Math.max(0, Math.min(state.activeRemainingMs, XP_BOOST_DURATION_MS)) : 0,
          activeStartedAt: state.activeStartedAt || null,
          activeExpiresAt: state.activeExpiresAt || null,
          pausedSessionId: state.pausedSessionId || null
        };
        renderXpBoostIndicator();
        if (document.querySelector('[data-locker-grid="xpBoosts"]')) renderLocker();
      }, error => {
        console.error('Lecture de l’état du boost XP impossible.', {
          uid: user.uid,
          error
        });
        connectionNotice(`Impossible de charger l’état du boost XP : ${publicError(error)}`, true);
      });
  }

  function getXpBoostRemainingMs(state = xpBoostState, now = Date.now()) {
    if (!state.activeBoostId) return 0;
    if (state === xpBoostState && document.getElementById('board') &&
        xpBoostState.activeSessionId === window.TetrisGame?.getSessionId?.()) {
      return window.TetrisGame.getXpBoostRemainingMs();
    }
    const expiresAtMs = state.activeExpiresAt?.toMillis
      ? state.activeExpiresAt.toMillis()
      : state.activeStartedAt?.toMillis
        ? state.activeStartedAt.toMillis() + XP_BOOST_DURATION_MS
        : null;
    if (expiresAtMs !== null) {
      return Math.max(0, Math.min(
        state.activeRemainingMs || XP_BOOST_DURATION_MS,
        expiresAtMs - now
      ));
    }
    return 0;
  }

  function renderXpBoostIndicator() {
    const indicator = document.querySelector('.xp-boost-indicator');
    if (!indicator) return;
    const remaining = getXpBoostRemainingMs();
    const active = Boolean(xpBoostState.activeBoostId && remaining > 0);
    indicator.classList.toggle('active', active);
    indicator.setAttribute('aria-label', active
      ? `Boost XP actif, ${Math.floor(remaining / 60_000)} minutes et ${Math.floor(remaining / 1_000) % 60} secondes restantes`
      : 'Boost XP inactif');
    const time = indicator.querySelector('strong');
    if (!time) return;
    time.textContent = active
      ? `${String(Math.floor(remaining / 60_000)).padStart(2, '0')}:${String(
        Math.floor(remaining / 1_000) % 60).padStart(2, '0')}`
      : '';
  }

  function setupXpBoostIndicator() {
    if (!xpBoostTimerInterval) {
      xpBoostTimerInterval = window.setInterval(() => {
        renderXpBoostIndicator();
        const activeBoostId = xpBoostState.activeBoostId;
        if (activeBoostId && getXpBoostRemainingMs() <= 0) {
          if (expiredXpBoostRenderedId !== activeBoostId) {
            expiredXpBoostRenderedId = activeBoostId;
            if (document.querySelector('[data-locker-grid="xpBoosts"]')) renderLocker();
          }
        } else {
          expiredXpBoostRenderedId = null;
        }
      }, 250);
    }
    const isGamePage = Boolean(document.getElementById('board'));
    const isLobbyPage = Boolean(
      document.querySelector('.identity') && document.querySelector('.wallet')
    );
    if (!isGamePage && !isLobbyPage) {
      document.querySelectorAll('.xp-boost-indicator').forEach(indicator => indicator.remove());
      document.querySelectorAll('.wallet-stack').forEach(stack => {
        const wallet = stack.querySelector('.wallet');
        if (wallet) stack.before(wallet);
        stack.remove();
      });
      document.querySelectorAll('.stats.has-xp-boost').forEach(stats => {
        stats.classList.remove('has-xp-boost');
      });
      return;
    }
    if (document.querySelector('.xp-boost-indicator')) return;
    if (!document.getElementById('xpBoostIndicatorStyle')) {
      const style = document.createElement('style');
      style.id = 'xpBoostIndicatorStyle';
      style.textContent = '.xp-boost-indicator{display:flex;align-items:center;justify-content:center;gap:6px;min-width:100px;padding:7px 9px;border:1px solid #6b647d;border-radius:11px;background:linear-gradient(135deg,#24243b,#111323);color:#c8c4d5;font-size:10px;font-weight:900;line-height:1.1;white-space:nowrap;box-shadow:0 2px 8px #0007}.xp-boost-indicator strong{font-variant-numeric:tabular-nums;color:#c8c4d5}.xp-boost-indicator:not(.active) strong{display:none}.xp-boost-indicator.active{border-color:#ffcf48;color:#ffe7a0;box-shadow:0 0 11px #ffc432aa,0 0 22px #ffc43266,inset 0 0 8px #ffc43233}.xp-boost-indicator.active strong{color:#fff2b0}.stats .xp-boost-indicator{min-height:52px;flex-direction:column;gap:2px}.stats.has-xp-boost{grid-template-columns:repeat(4,minmax(0,1fr))}.wallet-stack{display:flex;flex:none;flex-direction:column;align-items:flex-end;gap:6px;min-width:0}.wallet-stack .xp-boost-indicator{min-width:0;padding:5px 6px;font-size:9px}.top>.xp-boost-indicator{flex:none}@media(max-width:390px){.xp-boost-indicator{min-width:88px;padding:6px;font-size:9px}.stats .xp-boost-indicator{min-width:0}.wallet-stack .xp-boost-indicator{min-width:0}}';
      document.head.append(style);
    }
    const indicator = document.createElement('div');
    indicator.className = 'xp-boost-indicator';
    indicator.innerHTML = '<span>BOOST XP</span><strong></strong>';
    const stats = document.querySelector('#board')?.closest('.app')?.querySelector('.stats');
    const wallet = document.querySelector('.wallet');
    const top = document.querySelector('.top');
    if (stats) {
      stats.classList.add('has-xp-boost');
      stats.append(indicator);
    } else if (wallet) {
      const walletStack = document.createElement('div');
      walletStack.className = 'wallet-stack';
      wallet.before(walletStack);
      walletStack.append(wallet, indicator);
    } else if (top) {
      top.append(indicator);
    } else {
      document.body.append(indicator);
    }
    renderXpBoostIndicator();
  }

  function setupBattlePassCreditRewards(user) {
    data.claimedCreditRewardLevels = [];
    creditRewardStateUnsubscribe = db
      .doc(`players/${user.uid}/battlePassSeasons/season-1`)
      .onSnapshot(snapshot => {
        if (currentUser?.uid !== user.uid) return;
        const claimedLevels = snapshot.exists
          ? snapshot.data().creditRewardLevels : [];
        if (!Array.isArray(claimedLevels) || claimedLevels.some(level =>
          !Number.isSafeInteger(level) ||
          !BATTLE_PASS_CREDIT_REWARD_LEVELS.includes(level) &&
            !LEGACY_BATTLE_PASS_CREDIT_REWARD_LEVELS.includes(level))) {
          console.error('Historique des crédits Battle Pass invalide.', {
            uid: user.uid,
            claimedLevels
          });
          connectionNotice(
            'Impossible de vérifier l’historique des crédits Battle Pass. Aucune récompense existante n’a été modifiée.',
            true
          );
          return;
        }
        data.claimedCreditRewardLevels = [...new Set(claimedLevels)];
        refreshPage();
      }, error => {
        console.error('Lecture de l’historique des crédits Battle Pass impossible.', {
          uid: user.uid,
          error
        });
        connectionNotice(
          `Impossible de vérifier les crédits Battle Pass : ${publicError(error)}`,
          true
        );
      });
  }

  function hasClaimedBattlePassCreditReward(level) {
    if (data.claimedCreditRewardLevels?.includes(level)) return true;
    if ([19, 39, 59, 79].includes(level) &&
        data.claimedCreditRewardLevels?.includes(level + 1)) return true;
    const marker = profile?.battlePass?.lastCreditRewardLevel;
    const markerLevel = typeof marker === 'string' ? Number(marker) : 0;
    return Number.isSafeInteger(markerLevel) && markerLevel >= level;
  }

  function setProfileData(snapshot) {
    if (!snapshot.exists) {
      profile = null;
      data = emptyData();
      showLoginMessage('Profil Firebase introuvable. Déconnecte-toi puis contacte le support du projet.');
      return;
    }
    const previousCredits = Number.isSafeInteger(profile?.credits) ? profile.credits : null;
    profile = snapshot.data();
    if (previousCredits !== null && Number.isSafeInteger(profile.credits) &&
        profile.credits > previousCredits) {
      const creditsGranted = profile.credits - previousCredits;
      showBattlePassRewardNotice(
        `+${creditsGranted.toLocaleString('fr-FR')} crédits`,
        `credits:${creditsGranted}`
      );
    }
    const progression = getProgression(profile.xp);
    if (!hasObservedLevel) lastNotifiedLevel = progression.level;
    else if (lastNotifiedLevel !== null && progression.level > lastNotifiedLevel) {
      const gainedLevels = progression.level - lastNotifiedLevel;
      if (document.getElementById('board')) {
        storePendingLevelUpNotice(progression.level, gainedLevels);
      } else {
        showLevelUp(progression.level, gainedLevels);
      }
      lastNotifiedLevel = progression.level;
    }
    hasObservedLevel = true;
    data = {
      ...data,
      xp: progression.xp,
      level: progression.level,
      lines: profile.lines || 0,
      credits: profile.credits || 0,
      battlePass: profile.battlePass || { seasonId: 'season-1', level: progression.level },
      statistics: profile.statistics || { gamesPlayed: 0, bestScore: 0 }
    };
    refreshPage();
  }

  function renderProgressSaveNotice(container, id) {
    let notice = document.getElementById(id);
    if (currentUser) {
      notice?.remove();
      return;
    }
    if (!container) return;
    if (!notice) {
      notice = document.createElement('div');
      notice.id = id;
      notice.className = 'progress-save-notice';
      const message = document.createElement('p');
      message.textContent =
        'Ton compte Google peut être connecté au navigateur sans être connecté au jeu. Aucune session Firebase n’est détectée sur cette page : les XP ne seront pas enregistrés.';
      const signIn = document.createElement('button');
      signIn.type = 'button';
      signIn.textContent = 'CONNEXION AU JEU AVEC GOOGLE';
      signIn.addEventListener('click', () => go('connexion'));
      notice.append(message, signIn);
      if (!document.getElementById('progressSaveNoticeStyle')) {
        const style = document.createElement('style');
        style.id = 'progressSaveNoticeStyle';
        style.textContent = '.progress-save-notice{margin:10px 0 0;padding:10px;border:1px solid #f4ba4b;border-radius:11px;background:#231b36;color:#fff0c1;font-size:12px;line-height:1.4;text-align:center}.progress-save-notice p{margin:0 0 8px}.progress-save-notice button{padding:7px 12px;border:1px solid #b98aff;border-radius:9px;background:#4c2875;color:white;font-size:11px;font-weight:900}';
        document.head.append(style);
      }
    }
    if (notice.parentElement !== container) container.append(notice);
  }

  function getProgression(totalXp) {
    const xp = Math.max(0, Math.min(MAX_XP, Math.floor(Number(totalXp) || 0)));
    let level = 1;
    while (level < MAX_LEVEL && xp >= XP_THRESHOLDS[level + 1]) level++;
    const xpForNextLevel = level === MAX_LEVEL ? 0 : XP_THRESHOLDS[level + 1] - XP_THRESHOLDS[level];
    return {
      xp,
      level,
      xpIntoLevel: level === MAX_LEVEL ? 0 : xp - XP_THRESHOLDS[level],
      xpForNextLevel,
      xpToNextLevel: level === MAX_LEVEL ? 0 : XP_THRESHOLDS[level + 1] - xp
    };
  }

  function showLevelUp(level, gainedLevels) {
    let style = document.getElementById('levelUpStyle');
    if (!style) {
      style = document.createElement('style');
      style.id = 'levelUpStyle';
      style.textContent = '@keyframes levelUpEnter{from{opacity:0;transform:translate(-50%,-50%) scale(.92)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}#levelUpNotice{position:fixed;z-index:10000;top:50%;left:50%;width:min(90vw,360px);padding:14px 18px;border:2px solid #55dfff;border-right-color:#e34cff;border-radius:16px;background:linear-gradient(110deg,#21104a,#102a50);box-shadow:0 0 22px #a540ffb0;color:#fff;text-align:center;font-weight:900;letter-spacing:1px;animation:levelUpEnter .28s ease-out;pointer-events:none}#levelUpNotice small{display:block;margin-top:3px;color:#d7c8ff;font-size:12px;letter-spacing:0}';
      style.textContent += '#levelUpNotice{transform:translate(-50%,-50%)}';
      document.head.append(style);
    }
    document.getElementById('levelUpNotice')?.remove();
    const notice = document.createElement('div');
    notice.id = 'levelUpNotice';
    const title = document.createElement('span');
    title.textContent = 'NIVEAU SUPÉRIEUR !';
    const subtitle = document.createElement('small');
    subtitle.textContent = `${gainedLevels > 1 ? `+${gainedLevels} niveaux • ` : ''}Niveau ${level}`;
    notice.append(title, subtitle);
    enqueueCenterNotice(notice);
  }

  function storePendingLevelUpNotice(level, gainedLevels) {
    try {
      const existing = JSON.parse(
        sessionStorage.getItem(pendingLevelNotificationStorageKey) || 'null'
      );
      const validExisting = existing && Number.isSafeInteger(existing.level) &&
        Number.isSafeInteger(existing.gainedLevels) && existing.gainedLevels > 0;
      const totalGainedLevels = validExisting
        ? existing.level === level
          ? existing.gainedLevels
          : existing.gainedLevels + gainedLevels
        : gainedLevels;
      sessionStorage.setItem(pendingLevelNotificationStorageKey, JSON.stringify({
        level,
        gainedLevels: totalGainedLevels
      }));
    } catch (error) {
      console.error('Impossible de conserver la notification de niveau avant le retour au salon.', error);
      showLevelUp(level, gainedLevels);
    }
  }

  function enqueueCenterNotice(notice) {
    centerNoticeQueue.push(notice);
    if (centerNoticeActive) return;
    const showNext = () => {
      const nextNotice = centerNoticeQueue.shift();
      if (!nextNotice) {
        centerNoticeActive = false;
        return;
      }
      centerNoticeActive = true;
      document.body.append(nextNotice);
      window.setTimeout(() => {
        nextNotice.remove();
        showNext();
      }, 2_000);
    };
    showNext();
  }

  function showBattlePassRewardNotice(message, rewardKey) {
    if (recentBattlePassNotices.has(rewardKey)) return;
    recentBattlePassNotices.add(rewardKey);
    window.setTimeout(() => recentBattlePassNotices.delete(rewardKey), 4_000);
    let style = document.getElementById('battlePassCreditRewardStyle');
    if (!style) {
      style = document.createElement('style');
      style.id = 'battlePassCreditRewardStyle';
      style.textContent = '@keyframes battlePassCreditRewardEnter{from{opacity:0;transform:translate(-50%,10px)}to{opacity:1;transform:translate(-50%,0)}}#battlePassCreditReward{position:fixed;z-index:10001;bottom:calc(env(safe-area-inset-bottom) + 18px);left:50%;width:max-content;max-width:90vw;padding:12px 18px;border:2px solid #55dfff;border-radius:14px;background:linear-gradient(110deg,#21104a,#102a50);box-shadow:0 0 22px #a540ffb0;color:#ffe27a;text-align:center;font-weight:900;animation:battlePassCreditRewardEnter .25s ease-out;pointer-events:none}';
      document.head.append(style);
    }
    let notice = document.getElementById('battlePassCreditReward');
    if (!notice) {
      notice = document.createElement('div');
      notice.id = 'battlePassCreditReward';
      notice.setAttribute('role', 'status');
      document.body.append(notice);
    }
    notice.setAttribute('role', 'status');
    notice.textContent = notice.textContent ? `${notice.textContent} • ${message}` : message;
    if (battlePassNoticeTimeout !== null) window.clearTimeout(battlePassNoticeTimeout);
    battlePassNoticeTimeout = window.setTimeout(() => {
      notice.remove();
      battlePassNoticeTimeout = null;
    }, 3_500);
  }

  function getQuestCompletionDescription(completion) {
    const quest = CLIENT_GAME_QUESTS.find(item => item.id === completion.questId);
    if (!quest || !Number.isSafeInteger(completion.step) ||
        completion.step < 1 || completion.step > quest.thresholds.length) return null;
    const target = quest.thresholds[completion.step - 1];
    const formattedTarget = target.toLocaleString('fr-FR');
    let objective;
    switch (quest.id) {
      case 'gamesPlayed':
        objective = `Jouer ${formattedTarget} ${target === 1 ? 'partie' : 'parties'}`;
        break;
      case 'linesCleared':
        objective = `Réaliser ${formattedTarget} ${target === 1 ? 'ligne' : 'lignes'}`;
        break;
      case 'piecesPlaced':
        objective = `Placer ${formattedTarget} formes`;
        break;
      case 'friendsAdded':
        objective = `Ajouter ${formattedTarget} ${target === 1 ? 'ami' : 'amis'}`;
        break;
      case 'xpBoostsActivated':
        objective = `Activer ${formattedTarget} Boost XP`;
        break;
      case 'giftsSent':
        objective = `Offrir ${formattedTarget} ${target === 1 ? 'cadeau' : 'cadeaux'}`;
        break;
      case 'bestSingleGameLines':
        objective = `Réaliser ${formattedTarget} ${target === 1 ? 'ligne' : 'lignes'} dans une partie`;
        break;
      default:
        return null;
    }
    return {
      key: `${completion.questId}:${completion.step}`,
      text: `${quest.title} — ${completion.step}/10 : ${objective}`,
      xp: CLIENT_QUEST_REWARDS_XP[completion.step - 1]
    };
  }

  function renderQuestCompletionNotice(completions) {
    const items = completions.map(getQuestCompletionDescription).filter(Boolean);
    if (!items.length) return;
    let style = document.getElementById('questCompletionNoticeStyle');
    if (!style) {
      style = document.createElement('style');
      style.id = 'questCompletionNoticeStyle';
      style.textContent = '@keyframes questCompletionEnter{from{opacity:0;transform:translate(-50%,-50%) scale(.96)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}#questCompletionNotice{position:fixed;z-index:10002;top:50%;left:50%;width:min(92vw,440px);max-height:70vh;overflow:auto;padding:15px 18px;border:2px solid #f4c65f;border-radius:16px;background:linear-gradient(125deg,#241344,#122b4b);box-shadow:0 0 24px #a540ffb0;color:#fff;text-align:left;animation:questCompletionEnter .25s ease-out;pointer-events:none}#questCompletionNotice strong{display:block;margin-bottom:8px;color:#ffe27a;text-align:center;font-size:15px;letter-spacing:1px}#questCompletionNotice ul{display:grid;gap:6px;margin:0;padding-left:18px;font-size:13px;font-weight:750}#questCompletionNotice li::marker{color:#55dfff}#questCompletionNotice small{display:block;margin-top:9px;color:#d7c8ff;text-align:center;font-weight:900}';
      style.textContent += '#questCompletionNotice{transform:translate(-50%,-50%)}';
      document.head.append(style);
    }
    const notice = document.createElement('div');
    notice.id = 'questCompletionNotice';
    notice.setAttribute('role', 'status');
    notice.setAttribute('aria-live', 'polite');
    const title = document.createElement('strong');
    title.textContent = items.length === 1 ? 'DÉFI TERMINÉ !' : `${items.length} DÉFIS TERMINÉS !`;
    const list = document.createElement('ul');
    let totalXp = 0;
    for (const item of items) {
      const row = document.createElement('li');
      row.textContent = `${item.text} — +${item.xp.toLocaleString('fr-FR')} XP`;
      list.append(row);
      totalXp += item.xp;
    }
    const reward = document.createElement('small');
    reward.textContent = `+${totalXp.toLocaleString('fr-FR')} XP au total`;
    notice.append(title, list, reward);
    enqueueCenterNotice(notice);
  }

  function deliverQuestCompletionNotice(completions, { defer = false } = {}) {
    if (!Array.isArray(completions)) return;
    const freshCompletions = [];
    for (const completion of completions) {
      const description = getQuestCompletionDescription(completion);
      if (!description || notifiedQuestCompletions.has(description.key)) continue;
      notifiedQuestCompletions.add(description.key);
      freshCompletions.push({
        questId: completion.questId,
        step: completion.step
      });
    }
    if (!freshCompletions.length) return;
    if (defer) {
      try {
        const existing = JSON.parse(
          sessionStorage.getItem(pendingQuestNotificationStorageKey) || '[]'
        );
        const merged = new Map();
        if (Array.isArray(existing)) {
          for (const completion of existing) {
            const description = getQuestCompletionDescription(completion);
            if (description) merged.set(description.key, completion);
          }
        }
        for (const completion of freshCompletions) {
          const description = getQuestCompletionDescription(completion);
          if (description) merged.set(description.key, completion);
        }
        sessionStorage.setItem(
          pendingQuestNotificationStorageKey,
          JSON.stringify([...merged.values()])
        );
      } catch (error) {
        console.error('Impossible de conserver la notification de défi avant le retour au salon.', error);
      }
      return;
    }
    window.TetrisPageTransition?.waitForLoading().then(() => {
      renderQuestCompletionNotice(freshCompletions);
    }).catch(error => {
      console.error('Impossible d’attendre la fin de l’écran de chargement des quêtes.', error);
    });
  }

  function showPendingQuestCompletionNotice() {
    if (!document.querySelector('.identity') || document.getElementById('board')) return;
    let completions;
    let levelUp = null;
    try {
      completions = JSON.parse(
        sessionStorage.getItem(pendingQuestNotificationStorageKey) || '[]'
      );
      sessionStorage.removeItem(pendingQuestNotificationStorageKey);
    } catch (error) {
      console.error('Impossible de restaurer la notification de défi après le chargement.', error);
    }
    try {
      levelUp = JSON.parse(
        sessionStorage.getItem(pendingLevelNotificationStorageKey) || 'null'
      );
      sessionStorage.removeItem(pendingLevelNotificationStorageKey);
      if (!levelUp || !Number.isSafeInteger(levelUp.level) ||
          !Number.isSafeInteger(levelUp.gainedLevels) || levelUp.gainedLevels < 1) {
        levelUp = null;
      }
    } catch (error) {
      console.error('Impossible de restaurer la notification de niveau après le chargement.', error);
    }
    if ((!Array.isArray(completions) || !completions.length) && !levelUp) return;
    window.TetrisPageTransition?.waitForLoading().then(() => {
      if (Array.isArray(completions) && completions.length) {
        renderQuestCompletionNotice(completions);
      }
      if (levelUp) showLevelUp(levelUp.level, levelUp.gainedLevels);
    }).catch(error => {
      console.error('Impossible d’attendre la fin du chargement du salon avant les notifications.', error);
    });
  }

  function setupQuestProgressNotifications(user) {
    let previousCompletedSteps = null;
    questProgressUnsubscribe = db.doc(`players/${user.uid}/quests/progress`)
      .onSnapshot(snapshot => {
        if (currentUser?.uid !== user.uid) return;
        const progress = snapshot.exists ? snapshot.data() : null;
        const completedSteps = progress?.completedSteps ||
          Object.fromEntries(CLIENT_GAME_QUESTS.map(quest => [quest.id, []]));
        if (typeof completedSteps !== 'object' || Array.isArray(completedSteps)) {
          console.error('Les étapes de quêtes enregistrées ne peuvent pas être lues.', {
            uid: user.uid
          });
          return;
        }
        if (previousCompletedSteps === null) {
          previousCompletedSteps = structuredClone(completedSteps);
          return;
        }
        const newlyCompleted = [];
        for (const quest of CLIENT_GAME_QUESTS) {
          const oldSteps = Array.isArray(previousCompletedSteps[quest.id])
            ? previousCompletedSteps[quest.id] : [];
          const newSteps = Array.isArray(completedSteps[quest.id])
            ? completedSteps[quest.id] : [];
          for (const step of newSteps) {
            if (Number.isSafeInteger(step) && !oldSteps.includes(step)) {
              newlyCompleted.push({ questId: quest.id, step });
            }
          }
        }
        previousCompletedSteps = structuredClone(completedSteps);
        deliverQuestCompletionNotice(newlyCompleted, {
          defer: deferQuestCompletionNotifications
        });
      }, error => {
        console.error('Surveillance des défis terminés impossible.', {
          uid: user.uid,
          error
        });
      });
  }

  async function loadPlayerProfile(user) {
    const playerSnapshot = await db.doc(`players/${user.uid}`).get();
    return playerSnapshot.exists ? playerSnapshot : null;
  }

  async function ensurePlayerProfile(user, requestedName) {
    let snapshot = await loadPlayerProfile(user);
    if (snapshot) return snapshot;

    const playerRef = db.doc(`players/${user.uid}`);
    const legacyRef = db.doc(`users/${user.uid}`);
    const usernameLowerFrom = value => typeof value === 'string' &&
      /^[\p{L}\p{N}_-]{3,24}$/u.test(value) ? value.toLocaleLowerCase('fr') : '';
    const displayNameFrom = value => typeof value === 'string' &&
      value.trim().length >= 3 && value.trim().length <= 24 &&
      /^[\p{L}\p{N}_-]+$/u.test(value.trim()) ? value.trim() : '';

    await db.runTransaction(async transaction => {
      const [existingPlayer, legacySnapshot] = await Promise.all([
        transaction.get(playerRef),
        transaction.get(legacyRef)
      ]);
      if (existingPlayer.exists) return;

      const legacy = legacySnapshot.exists ? legacySnapshot.data() : {};
      const displayName = displayNameFrom(legacy.displayName) ||
        displayNameFrom(requestedName);
      if (!displayName) {
        throw new Error('Choisis un pseudo de 3 à 24 caractères (lettres, chiffres, _ ou -) pour créer ton profil.');
      }
      if (legacySnapshot.exists && legacy.xp !== undefined &&
          (!Number.isSafeInteger(legacy.xp) || legacy.xp < 0)) {
        throw new Error('Le profil historique contient une valeur XP invalide. Aucune donnée n’a été modifiée.');
      }
      if (legacySnapshot.exists && legacy.credits !== undefined &&
          (!Number.isSafeInteger(legacy.credits) || legacy.credits < 0)) {
        throw new Error('Le profil historique contient un solde de crédits invalide. Aucune donnée n’a été modifiée.');
      }
      if (legacySnapshot.exists && legacy.xp > MAX_XP) {
        throw new Error('Le profil historique dépasse la limite XP prise en charge. Aucune donnée n’a été modifiée.');
      }
      if (legacySnapshot.exists && legacy.lines !== undefined &&
          (!Number.isSafeInteger(legacy.lines) || legacy.lines < 0)) {
        throw new Error('Le profil historique contient un total de lignes invalide. Aucune donnée n’a été modifiée.');
      }

      const usernameLower = usernameLowerFrom(legacy.usernameLower) ||
        displayName.toLocaleLowerCase('fr');
      const usernameRef = db.doc(`usernames/${usernameLower}`);
      const publicProfileRef = db.doc(`publicProfiles/${user.uid}`);
      const [usernameSnapshot, publicProfileSnapshot] = await Promise.all([
        transaction.get(usernameRef),
        transaction.get(publicProfileRef)
      ]);
      if (usernameSnapshot.exists && usernameSnapshot.data().uid !== user.uid) {
        throw new Error('Ce pseudo est déjà utilisé. Choisis-en un autre.');
      }

      const createdAt = legacy.createdAt || firebase.firestore.FieldValue.serverTimestamp();
      const progression = getProgression(legacy.xp);
      if (legacy.battlePass !== undefined &&
          (!legacy.battlePass || typeof legacy.battlePass !== 'object' ||
            Array.isArray(legacy.battlePass))) {
        throw new Error('Le profil historique contient une progression Battle Pass invalide. Aucune donnée n’a été modifiée.');
      }
      if (legacy.battlePass?.seasonId !== undefined &&
          (typeof legacy.battlePass.seasonId !== 'string' || !legacy.battlePass.seasonId) ||
          legacy.battlePass?.level !== undefined &&
          (!Number.isSafeInteger(legacy.battlePass.level) ||
            legacy.battlePass.level < 1 || legacy.battlePass.level > MAX_LEVEL)) {
        throw new Error('Le profil historique contient un niveau ou une saison Battle Pass invalide. Aucune donnée n’a été modifiée.');
      }
      const battlePass = legacy.battlePass && typeof legacy.battlePass === 'object'
        ? { ...legacy.battlePass }
        : { seasonId: 'season-1', level: progression.level };
      if (!battlePass.seasonId) battlePass.seasonId = 'season-1';
      if (battlePass.level === undefined) battlePass.level = progression.level;
      if (legacy.statistics !== undefined &&
          (!legacy.statistics || typeof legacy.statistics !== 'object' ||
            Array.isArray(legacy.statistics))) {
        throw new Error('Le profil historique contient des statistiques invalides. Aucune donnée n’a été modifiée.');
      }
      if (legacy.statistics?.gamesPlayed !== undefined &&
          (!Number.isSafeInteger(legacy.statistics.gamesPlayed) || legacy.statistics.gamesPlayed < 0) ||
          legacy.statistics?.bestScore !== undefined &&
          (!Number.isSafeInteger(legacy.statistics.bestScore) || legacy.statistics.bestScore < 0)) {
        throw new Error('Le profil historique contient des statistiques invalides. Aucune donnée n’a été modifiée.');
      }
      const statistics = {
        ...(legacy.statistics || {}),
        gamesPlayed: legacy.statistics?.gamesPlayed ?? 0,
        bestScore: legacy.statistics?.bestScore ?? 0
      };
      if (!Number.isSafeInteger(statistics.gamesPlayed) || statistics.gamesPlayed < 0 ||
          !Number.isSafeInteger(statistics.bestScore) || statistics.bestScore < 0) {
        throw new Error('Le profil historique contient des statistiques invalides. Aucune donnée n’a été modifiée.');
      }
      const profileData = {
        displayName,
        email: user.email || legacy.email || '',
        usernameLower,
        xp: progression.xp,
        level: progression.level,
        lines: legacy.lines === undefined ? 0 : legacy.lines,
        bestSingleGameLines: 0,
        credits: legacy.credits === undefined ? 0 : legacy.credits,
        battlePass,
        statistics,
        createdAt,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      transaction.set(playerRef, profileData);
      if (!usernameSnapshot.exists) transaction.set(usernameRef, { uid: user.uid });
      if (!publicProfileSnapshot.exists) {
        transaction.set(publicProfileRef, { displayName, usernameLower, createdAt });
      }
    });

    snapshot = await loadPlayerProfile(user);
    if (!snapshot) {
      throw new Error(`Le profil players/${user.uid} n’a pas été confirmé après sa création.`);
    }
    return snapshot;
  }

  function getLeaderboardIdentity(player) {
    const validName = value => typeof value === 'string' &&
      value.trim().length >= 3 && value.trim().length <= 24 &&
      /^[\p{L}\p{N}_-]+$/u.test(value.trim()) ? value.trim() : null;
    const hasProfileName = Object.prototype.hasOwnProperty.call(player, 'displayName');
    const hasProfileUsername = Object.prototype.hasOwnProperty.call(player, 'usernameLower');
    const profileName = validName(player.displayName);
    const profileUsername = typeof player.usernameLower === 'string' &&
      /^[\p{L}\p{N}_-]{3,24}$/u.test(player.usernameLower)
      ? player.usernameLower : null;
    const displayName = profileName || (!hasProfileName ? 'Joueur' : null);
    const usernameLower = profileUsername || (!hasProfileUsername ? 'joueur' : null);
    return {
      displayName,
      usernameLower,
      matchesProfile: Boolean(displayName && usernameLower) &&
        (!hasProfileName || profileName === player.displayName) &&
        (!hasProfileUsername || profileUsername === player.usernameLower)
    };
  }

  async function ensureLeaderboardEntry(user) {
    const playerRef = db.doc(`players/${user.uid}`);
    const leaderboardRef = db.doc(`leaderboards/single-game/entries/${user.uid}`);
    await db.runTransaction(async transaction => {
      const [playerSnapshot, leaderboardSnapshot] = await Promise.all([
        transaction.get(playerRef),
        transaction.get(leaderboardRef)
      ]);
      if (!playerSnapshot.exists) return;
      const player = playerSnapshot.data();
      const statistics = player.statistics || {};
      const currentBestLines = player.bestSingleGameLines === undefined
        ? 0 : player.bestSingleGameLines;
      if (!Number.isSafeInteger(currentBestLines) || currentBestLines < 0) {
        throw new Error('Le record de lignes par partie est invalide; il n’a pas été modifié.');
      }
      const previousEntry = leaderboardSnapshot.exists ? leaderboardSnapshot.data() : null;
      if (previousEntry && (!Number.isSafeInteger(previousEntry.lines) || previousEntry.lines < 0)) {
        throw new Error('Le record du classement est invalide; il n’a pas été modifié.');
      }
      const bestSingleGameLines = Math.max(
        currentBestLines, previousEntry ? previousEntry.lines : 0
      );
      const identity = getLeaderboardIdentity(player);
      if (!identity.matchesProfile) {
        console.warn('Entrée de classement ignorée : le profil Firestore ne contient pas un pseudo valide.', {
          uid: user.uid
        });
        return;
      }
      const entry = {
        uid: user.uid,
        displayName: identity.displayName,
        usernameLower: identity.usernameLower,
        lines: bestSingleGameLines,
        bestScore: Number.isSafeInteger(statistics.bestScore) && statistics.bestScore >= 0
          ? statistics.bestScore : 0,
        level: Number.isSafeInteger(player.level) && player.level >= 1 ? player.level : 1
      };
      if (leaderboardSnapshot.exists) {
        const current = leaderboardSnapshot.data();
        if (current.uid === entry.uid && current.displayName === entry.displayName &&
            current.usernameLower === entry.usernameLower && current.lines === entry.lines &&
            current.bestScore === entry.bestScore && current.level === entry.level) return;
      }
      transaction.set(leaderboardRef, {
        ...entry,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    });
  }

  function setPreferences(snapshot) {
    data = dataWithPreferences(snapshot.exists ? snapshot.data() : {});
    syncEquippedLoadingScreen();
    if (currentUser && !snapshot.exists) {
      savePreferences(data).catch(error => {
        console.error('Création des préférences Firebase impossible.', error);
        connectionNotice(`Paramètres non synchronisés : ${publicError(error)}`, true);
      });
    }
    refreshPage();
  }

  function createCreditLogo(size) {
    const image = document.createElement('img');
    image.className = 'credit-logo';
    image.src = CREDIT_LOGO_SRC;
    image.alt = '';
    image.setAttribute('aria-hidden', 'true');
    image.style.cssText = `width:${size}px;height:${size}px;object-fit:contain;flex:none`;
    return image;
  }

  function refreshPage() {
    if (!initialized) return;
    renderXpBoostIndicator();
    if (document.getElementById('board')) {
      window.TetrisGame?.setBlockColor(getBlockSkinColor(data.equippedSkin));
      window.TetrisGame?.setEffectsVolume(Number(data.settings.blocksVolume));
      window.TetrisGame?.setGameMusic(
        BATTLE_PASS_MUSIC.find(track => track.itemId === data.equippedMusic)?.audioUrl || null,
        Number(data.settings.musicVolume)
      );
      const equippedSkin = data.equippedSkin || 'default';
      const skinImageSource = BLOCK_SKIN_IMAGES.get(equippedSkin);
      if (skinImageSource) {
        loadBlockSkinImage(equippedSkin).then(image => {
          if (data.equippedSkin === equippedSkin) window.TetrisGame?.setBlockImage(image);
        }).catch(error => {
          console.error('Chargement de l’image du skin dans le jeu impossible.', {
            skin: equippedSkin,
            source: skinImageSource,
            error
          });
          connectionNotice(publicError(error), true);
        });
      } else {
        window.TetrisGame?.setBlockImage(null);
      }
    }
    const identity = document.querySelector('.identity');
    if (identity) {
      identity.querySelector('strong').textContent = profile?.lastPseudoChangeAt
        ? profile.displayName : currentUser?.displayName?.trim() ||
          profile?.displayName || (currentUser ? 'Connecté' : 'Invité');
      const progression = getProgression(data.xp);
      identity.querySelector('small').textContent = progression.level === MAX_LEVEL
        ? `Niveau ${progression.level} • ${progression.xp.toLocaleString('fr-FR')} XP • ${data.lines} lignes`
        : `Niveau ${progression.level} • ${progression.xpToNextLevel.toLocaleString('fr-FR')} XP avant niv. ${progression.level + 1} • ${data.lines} lignes`;
      document.querySelector('.wallet strong').textContent = data.credits.toLocaleString('fr-FR');
      renderSalonProgress();
    }

    const credits = document.getElementById('creditCount');
    if (credits) credits.textContent = data.credits.toLocaleString('fr-FR');

    if (document.getElementById('cards')) renderBattlePass();
    if (document.getElementById('created')) {
      document.getElementById('created').textContent = profile && profile.createdAt && profile.createdAt.toDate
        ? profile.createdAt.toDate().toLocaleDateString('fr-FR')
        : profile ? 'Compte activé' : 'Non renseignée';
    }
    if (document.getElementById('musicVolume')) renderSettings();
    if (document.getElementById('defaultSkin') || document.getElementById('noMusic')) {
      updateLoadout();
    }
    if (document.querySelector('[data-locker-grid="skins"]')) {
      renderLocker();
    }

    if (authStateReady && !currentUser && !document.getElementById('loginTab') &&
        !document.getElementById('form') &&
        !document.getElementById('board') &&
        !document.querySelector('.progress-save-notice')) {
      connectionNotice('Connecte-toi à Firebase pour charger tes données sur cet appareil.', true);
    } else if (currentUser && !document.getElementById('board')) {
      connectionNotice('');
    }
  }

  function attachUser(user) {
    [profileUnsubscribe, questProgressUnsubscribe, preferencesUnsubscribe, friendsUnsubscribe, blockedUnsubscribe,
      inventoryUnsubscribe, creditRewardStateUnsubscribe, xpBoostStateUnsubscribe,
      worldLeaderboardUnsubscribe, ownLeaderboardUnsubscribe,
      ownProfileLeaderboardUnsubscribe, friendsLeaderboardUnsubscribe,
      ...friendLeaderboardUnsubscribes.values()]
      .forEach(unsubscribe => { if (unsubscribe) unsubscribe(); });
    profileUnsubscribe = preferencesUnsubscribe = friendsUnsubscribe = blockedUnsubscribe = null;
    questProgressUnsubscribe = null;
    deferQuestCompletionNotifications = false;
    notifiedQuestCompletions.clear();
    inventoryUnsubscribe = null;
    xpBoostStateUnsubscribe = null;
    creditRewardStateUnsubscribe = null;
    worldLeaderboardUnsubscribe = null;
    ownLeaderboardUnsubscribe = null;
    ownProfileLeaderboardUnsubscribe = null;
    friendsLeaderboardUnsubscribe = null;
    worldLeaderboardEntries = [];
    ownLeaderboardEntry = null;
    ownProfileLeaderboardEntry = null;
    friendLeaderboardUnsubscribes.clear();
    friendLeaderboardEntries.clear();
    currentUser = user;
    if (user) connectionNotice('');
    profile = null;
    data = emptyData();
    inventoryInitialSnapshotLoaded = false;
    lastNotifiedLevel = null;
    hasObservedLevel = false;

    if (!user || !db) {
      xpBoostState = {
        selectedBoostId: null,
        activeBoostId: null,
        activeSessionId: null,
        activeRemainingMs: 0,
        activeExpiresAt: null
      };
      renderXpBoostIndicator();
      syncEquippedLoadingScreen();
      rewardSyncPromise = null;
      rewardSyncUid = null;
      rewardSyncedLevel = 0;
      rewardSyncRequestedLevel = 0;
      startOfflineGame();
      refreshPage();
      return;
    }
    rewardSyncPromise = null;
    rewardSyncUid = null;
    rewardSyncedLevel = 0;
    rewardSyncRequestedLevel = 0;
    setupInventory(user);
    setupXpBoostState(user);
    setupQuestProgressNotifications(user);
    setupBattlePassCreditRewards(user);
    const isGoogleUser = user.providerData.some(provider => provider.providerId === 'google.com');
    const requestedProfileName = isGoogleUser
      ? googleUsernameFromEmail(user.email)
      : user.displayName || '';
    if (document.getElementById('board')) beginGameSession();

    profileUnsubscribe = db.doc(`players/${user.uid}`).onSnapshot(async snapshot => {
      if (currentUser?.uid !== user.uid) return;
      if (snapshot.exists) {
        connectionNotice('');
        setProfileData(snapshot);
        syncBattlePassRewards(user, snapshot.data());
        ensureLeaderboardEntry(user).catch(error => {
          console.error('Synchronisation du classement mondial impossible.', {
            uid: user.uid,
            code: error.code || 'unknown',
            message: error.message || String(error)
          }, error);
        });
        return;
      }
      profile = null;
      data = emptyData();
      refreshPage();
      if (requestedProfileName) {
        try {
          await ensurePlayerProfile(user, requestedProfileName);
        } catch (error) {
          console.error('Compte connecté sans profil Firestore; création sécurisée impossible.', {
            uid: user.uid,
            code: error.code || 'profile-create-failed',
            message: error.message || String(error)
          }, error);
          connectionNotice(
            `Compte connecté, mais players/${user.uid} n’a pas pu être créé sans risque de perte de données : ${publicError(error)}`,
            true
          );
        }
      } else {
        connectionNotice(
          'Compte connecté, mais aucun pseudo Firebase n’est disponible pour créer players/{uid}.',
          true
        );
      }
    }, error => {
      console.error('Erreur de lecture du profil Firestore.', {
        uid: user.uid,
        path: `players/${user.uid}`,
        code: error.code || 'unknown',
        message: error.message || String(error)
      }, error);
      connectionNotice(
        `Impossible de charger players/${user.uid} (${error.code || 'erreur inconnue'}) : ${publicError(error)}`,
        true
      );
    });
    const needsPreferences = document.getElementById('musicVolume') ||
      document.getElementById('defaultSkin') ||
      document.getElementById('noMusic') ||
      document.getElementById('board') ||
      document.querySelector('[data-locker-grid="loadingScreens"]');
    if (needsPreferences) {
      preferencesUnsubscribe = db.doc(`players/${user.uid}/preferences/current`).onSnapshot(setPreferences, error => {
        console.error('Erreur de lecture des préférences Firebase.', error);
        connectionNotice(`Impossible de charger les paramètres : ${publicError(error)}`, true);
      });
    }

    if (document.getElementById('search')) setupFriends();
    if (document.getElementById('worldList')) setupLeaderboards();
  }

  async function initializeFirebase() {
    const config = window.BLOCK_ARENA_FIREBASE_CONFIG;
    if (!configReady(config)) {
      finishAuthInitialization();
      startOfflineGame();
      showLoginMessage('Firebase non configuré : complète firebase-config.js et déploie les règles.');
      return;
    }
    try {
      await window.BLOCK_ARENA_FIREBASE_READY;
      if (!window.firebase || !firebase.auth || !firebase.firestore) {
        throw new Error('Le SDK Firebase n’a pas pu être chargé. Vérifie ta connexion internet.');
      }
      const app = firebase.apps.length ? firebase.app() : firebase.initializeApp(config);
      auth = firebase.auth(app);
      await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
      db = firebase.firestore(app);
      showLoginMessage('Firebase Auth est prêt. Connecte-toi pour synchroniser ta progression Firestore.');
      auth.onAuthStateChanged(user => {
        const isInitialState = !initialAuthStateResolved;
        initialAuthStateResolved = true;
        finishAuthInitialization();
        attachUser(user);
        if (isInitialState && user && document.getElementById('form')) go('salon');
      }, error => {
        initialAuthStateResolved = true;
        finishAuthInitialization();
        console.error('Erreur d’état Firebase Authentication.', error);
        startOfflineGame();
        showLoginMessage(`Authentification indisponible : ${publicError(error)}`);
      });
      const supportsAuthRedirect = location.protocol === 'https:' ||
        (location.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(location.hostname));
      if (document.getElementById('form') && supportsAuthRedirect) {
        let redirectResult;
        try {
          redirectResult = await auth.getRedirectResult();
        } catch (error) {
          console.error('Retour de connexion Google impossible.', error);
          showLoginMessage(`Connexion Google impossible : ${publicError(error)}`);
        }
        if (redirectResult && redirectResult.user) {
          try {
            await completeGoogleSignIn(redirectResult.user);
          } catch (error) {
            console.error('Compte Google connecté, mais profil joueur indisponible.', error);
            showLoginMessage(`Compte Google connecté, mais le profil du jeu n’a pas pu être créé : ${publicError(error)}. Le compte Firebase n’a pas été supprimé.`);
          }
        }
      }
    } catch (error) {
      finishAuthInitialization();
      console.error('Initialisation Firebase impossible.', error);
      startOfflineGame();
      showLoginMessage(`Configuration Firebase invalide : ${publicError(error)}`);
    }
  }

  async function createAccount(name, email, password, remember) {
    await firebaseInitPromise;
    if (!auth) throw new Error('Firebase n’est pas configuré.');
    let credential;
    try {
      await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
      credential = await auth.createUserWithEmailAndPassword(email.trim(), password);
      await credential.user.updateProfile({ displayName: name.trim() });
      await ensurePlayerProfile(credential.user, name.trim());
      return credential.user;
    } catch (error) {
      if (!credential) {
        const message = publicError(error);
        connectionNotice(message, true);
        throw new Error(message);
      }
      const message = `Le compte Firebase Authentication a été créé, mais son profil Firestore n’a pas pu être créé : ${publicError(error)}. Le compte n’a pas été supprimé. Vérifie le déploiement des fonctions Firebase, puis reconnecte-toi pour terminer la configuration du profil.`;
      connectionNotice(message, true);
      throw new Error(message);
    }
  }

  async function signIn(email, password, remember) {
    await firebaseInitPromise;
    if (!auth) throw new Error('Firebase n’est pas configuré.');
    let credential;
    try {
      await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
      credential = await auth.signInWithEmailAndPassword(email.trim(), password);
    } catch (error) {
      const message = publicError(error);
      connectionNotice(message, true);
      throw new Error(message);
    }

    let snapshot;
    try {
      snapshot = await loadPlayerProfile(credential.user);
    } catch (error) {
      console.error('Authentification réussie, mais lecture du profil refusée.', error);
      const message = `Authentification réussie, mais Firestore n’a pas pu lire le profil : ${publicError(error)}. Vérifie les règles Firestore déployées.`;
      connectionNotice(message, true);
      throw new Error(message);
    }
    if (!snapshot && credential.user.displayName) {
      try {
        await ensurePlayerProfile(credential.user, credential.user.displayName);
        return credential.user;
      } catch (error) {
        const message = `Connexion Auth réussie, mais le profil Firestore n’existe pas et sa réparation a échoué : ${publicError(error)}.`;
        connectionNotice(message, true);
        throw new Error(message);
      }
    }
    if (!snapshot) {
      const message = 'Connexion Auth réussie, mais aucun profil joueur n’existe et aucun pseudo Firebase n’est disponible pour le créer.';
      connectionNotice(message, true);
      throw new Error(message);
    }
    return credential.user;
  }

  function googleUsernameFromEmail(email) {
    const localPart = typeof email === 'string' ? email.trim().split('@')[0] : '';
    if (!localPart) return '';
    let username = localPart
      .replace(/[^\p{L}\p{N}_-]/gu, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 24);
    if (!username) username = 'joueur';
    return username.padEnd(3, '0');
  }

  async function signInWithGoogle(_remember) {
    await firebaseInitPromise;
    if (!auth) throw new Error('Firebase n’est pas configuré.');
    try {
      await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
      const provider = new firebase.auth.GoogleAuthProvider();
      const credential = await auth.signInWithPopup(provider);
      await completeGoogleSignIn(credential.user);
    } catch (error) {
      const message = publicError(error);
      connectionNotice(message, true);
      throw new Error(message);
    }
  }

  async function completeGoogleSignIn(user) {
    let snapshot = await loadPlayerProfile(user);
    if (!snapshot) {
      const displayName = googleUsernameFromEmail(user.email);
      if (!displayName) throw new Error('Google ne fournit pas d’adresse e-mail pour créer le pseudo du jeu.');
      if (user.displayName !== displayName) await user.updateProfile({ displayName });
      snapshot = await ensurePlayerProfile(user, displayName);
    }
    go('salon');
  }

  async function sendPasswordReset(email) {
    await firebaseInitPromise;
    if (!auth) throw new Error('Firebase n’est pas configuré.');
    try {
      await auth.sendPasswordResetEmail(email.trim());
    } catch (error) {
      const message = publicError(error);
      connectionNotice(message, true);
      throw new Error(message);
    }
  }

  async function changePassword(currentPassword, nextPassword) {
    await firebaseInitPromise;
    if (!auth || !auth.currentUser) throw new Error('Connecte-toi à ton compte Firebase.');
    try {
      const credential = firebase.auth.EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
      await auth.currentUser.reauthenticateWithCredential(credential);
      await auth.currentUser.updatePassword(nextPassword);
    } catch (error) {
      const message = publicError(error);
      connectionNotice(message, true);
      throw new Error(message);
    }
  }

  async function signOut() {
    await firebaseInitPromise;
    if (!auth) throw new Error('Firebase n’est pas configuré.');
    await auth.signOut();
    go('connexion');
  }

  async function savePreferences(nextData) {
    if (!currentUser || !db) return;
    const settings = nextData.settings || data.settings;
    await db.doc(`players/${currentUser.uid}/preferences/current`).set({
      equippedSkin: nextData.equippedSkin || 'default',
      equippedMusic: nextData.equippedMusic || 'none',
      equippedLoadingScreen: nextData.equippedLoadingScreen || 'none',
      settings: {
        music: Boolean(settings.music),
        musicVolume: Number(settings.musicVolume),
        blocksVolume: Number(settings.blocksVolume)
      },
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  }

  async function startOfflineGame(reason) {
    if (document.getElementById('board')) {
      if (isHostedOnlineGame()) {
        showFirebaseGameLoginPrompt(reason
          ? `Partie non démarrée : ${reason}. Connecte-toi pour sauvegarder tes XP dans Firestore.`
          : 'Connecte-toi à ton compte BLOCK ARENA pour lancer une partie et sauvegarder tes XP dans Firestore.');
        return;
      }
      const seed = Math.floor(Math.random() * 0xffff_ffff) + 1;
      try {
        if (!window.TetrisGame) throw new Error('Le moteur de jeu n’est pas chargé.');
        await window.TetrisPageTransition?.waitForLoading();
        window.TetrisGame.startOfflineSession(seed);
        if (reason) console.warn(`Partie lancée en mode local : ${reason}`);
        connectionNotice(
          'Mode local — XP et résultats non sauvegardés.',
          false,
          2_500
        );
      } catch (error) {
        console.error('Démarrage local de la partie impossible.', error);
        window.TetrisGame?.waitForSession();
        connectionNotice(`Partie non démarrée : ${publicError(error)}`, true);
      }
    }
  }

  async function beginGameSession(isNewRun = false) {
    if (!window.TetrisGame) return;
    window.TetrisGame.waitForSession();
    gameSessionError = '';
    connectionNotice('');
    let firestoreOperation = 'initialisation Firebase';
    let profileReadyForDirectSave = false;
    try {
      if (isNewRun) {
        await window.TetrisPageTransition?.startForGame();
      } else {
        await window.TetrisPageTransition?.waitForLoading();
      }
      await firebaseInitPromise;
      const user = auth?.currentUser || currentUser;
      if (!user || !db) throw new Error('Une session Firebase connectée est nécessaire.');
      const playerRef = db.doc(`players/${user.uid}`);
      firestoreOperation = `lecture serveur de ${playerRef.path}`;
      const playerSnapshot = await playerRef.get({ source: 'server' });
      if (!playerSnapshot.exists) {
        throw new Error('Le profil Firestore du compte connecté est introuvable.');
      }
      profileReadyForDirectSave = true;
      firestoreOperation = 'création serveur de la session de jeu';
      const session = await callGameWorker('/game/start', {});
      const { sessionId, seed, xpBoostId, xpBoostDurationMs } = session || {};
      if (typeof sessionId !== 'string' || !/^[A-Za-z0-9_-]{20,64}$/.test(sessionId) ||
          !Number.isInteger(seed) || seed < 1 || seed > 0xffff_ffff ||
          !Number.isSafeInteger(xpBoostDurationMs) || xpBoostDurationMs < 0 ||
          xpBoostDurationMs > XP_BOOST_DURATION_MS ||
          (xpBoostId !== null && typeof xpBoostId !== 'string')) {
        throw new Error('Le serveur a renvoyé une session de partie invalide.');
      }
      const expiresAtMs = xpBoostDurationMs > 0
        ? Date.now() + xpBoostDurationMs : null;
      xpBoostState = {
        ...xpBoostState,
        ...(xpBoostId ? {
          selectedBoostId: null,
          activeBoostId: xpBoostId,
          activeSessionId: sessionId,
          activeRemainingMs: xpBoostDurationMs,
          activeStartedAt: firebase.firestore.Timestamp.fromMillis(
            expiresAtMs - xpBoostDurationMs
          ),
          activeExpiresAt: firebase.firestore.Timestamp.fromMillis(expiresAtMs),
          pausedSessionId: null
        } : {})
      };
      window.TetrisGame.startSession(
        seed,
        sessionId,
        xpBoostDurationMs,
        expiresAtMs
      );
      renderXpBoostIndicator();
      clearFirebaseGameLoginPrompt();
      connectionNotice('');
    } catch (error) {
      gameSessionError = publicError(error);
      console.error('Création locale de session de jeu impossible.', {
        operation: firestoreOperation,
        code: error.code || 'unknown',
        message: error.message || String(error)
      }, error);
      if (auth?.currentUser || currentUser) {
        if (profileReadyForDirectSave) {
          const randomValues = crypto.getRandomValues(new Uint32Array(5));
          const sessionId = Array.from(randomValues.slice(1), value =>
            value.toString(16).padStart(8, '0')).join('');
          const seed = randomValues[0] || 1;
          window.TetrisGame.startSession(seed, sessionId);
          clearFirebaseGameLoginPrompt();
          connectionNotice(
            'Serveur de partie indisponible : la partie démarre avec sauvegarde Firebase directe.',
            false
          );
          renderXpBoostIndicator();
          return;
        }
        window.TetrisGame.waitForSession();
        connectionNotice(`Partie non démarrée : ${firestoreOperation} — ${gameSessionError}.`, true);
        return;
      }
      startOfflineGame(`Aucun compte connecté : ${gameSessionError}`);
    }
  }

  const CLIENT_QUEST_REWARDS_XP =
    [250, 450, 1_500, 3_500, 5_500, 8_000, 10_000, 12_500, 15_000, 20_000];
  const CLIENT_GAME_QUESTS = [
    { id: 'gamesPlayed', title: 'JOUER DES PARTIES', stat: 'gamesPlayed', thresholds: [1, 5, 10, 20, 30, 40, 50, 65, 80, 100] },
    { id: 'linesCleared', title: 'RÉALISER DES LIGNES', stat: 'linesCleared', thresholds: [1, 10, 25, 50, 100, 200, 350, 500, 750, 1_000] },
    { id: 'piecesPlaced', title: 'PLACER DES FORMES', stat: 'piecesPlaced', thresholds: [10, 50, 100, 250, 500, 1_000, 2_000, 3_500, 5_000, 10_000] },
    { id: 'friendsAdded', title: 'AJOUTER DES AMIS', stat: 'friendsAdded', thresholds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
    { id: 'xpBoostsActivated', title: 'ACTIVER DES BOOST XP', stat: 'xpBoostsActivated', thresholds: [1, 2, 3, 5, 7, 10, 13, 16, 20, 25] },
    { id: 'giftsSent', title: 'OFFRIR DES CADEAUX', stat: 'giftsSent', thresholds: [1, 2, 3, 5, 7, 10, 15, 20, 30, 50] },
    { id: 'bestSingleGameLines', title: 'RECORD DE LIGNES EN UNE SEULE PARTIE', stat: 'bestSingleGameLines', thresholds: [1, 3, 5, 8, 12, 16, 20, 30, 40, 50] }
  ];

  function applyClientGameQuestProgress(current, result) {
    const progress = current ? structuredClone(current) : {
      schemaVersion: 1,
      statistics: Object.fromEntries(CLIENT_GAME_QUESTS.map(quest => [quest.stat, 0])),
      completedSteps: Object.fromEntries(CLIENT_GAME_QUESTS.map(quest => [quest.id, []])),
      rewardedSteps: Object.fromEntries(CLIENT_GAME_QUESTS.map(quest => [quest.id, []])),
      friendUids: [],
      totalXpAwarded: 0
    };
    if (progress.schemaVersion !== 1 || !progress.statistics || !progress.completedSteps ||
        !progress.rewardedSteps || !Array.isArray(progress.friendUids) ||
        !Number.isSafeInteger(progress.totalXpAwarded) || progress.totalXpAwarded < 0) {
      throw new Error('La progression des quêtes enregistrée est invalide.');
    }

    const newlyCompleted = [];
    let rewardXp = 0;
    for (const quest of CLIENT_GAME_QUESTS) {
      const count = progress.statistics[quest.stat];
      const completed = progress.completedSteps[quest.id];
      const rewarded = progress.rewardedSteps[quest.id];
      if (!Number.isSafeInteger(count) || count < 0 || !Array.isArray(completed) ||
          !Array.isArray(rewarded) || completed.length !== rewarded.length ||
          completed.some((step, index) => step !== rewarded[index] ||
            !Number.isSafeInteger(step) || step < 1 || step > 10)) {
        throw new Error('La progression des quêtes enregistrée est invalide.');
      }
    }

    const increments = {
      gamesPlayed: 1,
      linesCleared: result.lines,
      piecesPlaced: result.piecesPlaced ?? 0
    };
    for (const quest of CLIENT_GAME_QUESTS) {
      if (quest.id === 'bestSingleGameLines') {
        progress.statistics[quest.stat] = Math.max(progress.statistics[quest.stat], result.lines);
      } else if (increments[quest.stat] !== undefined) {
        progress.statistics[quest.stat] += increments[quest.stat];
      }
      const currentValue = progress.statistics[quest.stat];
      if (!Number.isSafeInteger(currentValue)) {
        throw new Error('Une statistique de quête dépasse la limite autorisée.');
      }
      for (let index = 0; index < quest.thresholds.length; index++) {
        const step = index + 1;
        if (currentValue < quest.thresholds[index] ||
            progress.completedSteps[quest.id].includes(step)) continue;
        progress.completedSteps[quest.id].push(step);
        progress.rewardedSteps[quest.id].push(step);
        const xp = CLIENT_QUEST_REWARDS_XP[index];
        rewardXp += xp;
        newlyCompleted.push({ questId: quest.id, step, xp });
      }
    }
    progress.totalXpAwarded += rewardXp;
    if (!Number.isSafeInteger(progress.totalXpAwarded)) {
      throw new Error('Le total des récompenses de quêtes dépasse la limite autorisée.');
    }
    return { progress, newlyCompleted, rewardXp };
  }

  async function saveGameResultToFirestore(user, result) {
    const gameValues = [result.earnedXp, result.lines, result.score, result.piecesPlaced ?? 0];
    if (gameValues.some(value => !Number.isSafeInteger(value) || value < 0)) {
      throw new Error('Les résultats de la partie sont invalides.');
    }
    const playerRef = db.doc(`players/${user.uid}`);
    const receiptRef = db.doc(`players/${user.uid}/processedGames/${result.sessionId}`);
    const questRef = db.doc(`players/${user.uid}/quests/progress`);
    const leaderboardRef = db.doc(`leaderboards/single-game/entries/${user.uid}`);

    return db.runTransaction(async transaction => {
      const [playerSnapshot, receiptSnapshot, questSnapshot] =
        await Promise.all([
          transaction.get(playerRef),
          transaction.get(receiptRef),
          transaction.get(questRef)
        ]);
      if (!playerSnapshot.exists) throw new Error('Le profil Firestore du compte connecté est introuvable.');
      if (receiptSnapshot.exists) {
        const receipt = receiptSnapshot.data();
        return {
          ok: true,
          alreadySubmitted: true,
          xp: receipt.xpAfter,
          level: receipt.level,
          awardedXp: receipt.awardedXp
        };
      }

      const player = playerSnapshot.data();
      if (!Number.isSafeInteger(player.xp) || player.xp < 0 || player.xp > MAX_XP) {
        throw new Error('Le total XP existant dans Firestore est invalide.');
      }
      const { progress: questProgress, newlyCompleted, rewardXp } = applyClientGameQuestProgress(
        questSnapshot.exists ? questSnapshot.data() : null,
        result
      );
      const newXp = player.xp + result.earnedXp + rewardXp;
      if (!Number.isSafeInteger(newXp)) {
        throw new Error('Le total XP dépasse la limite autorisée.');
      }
      const xp = Math.min(MAX_XP, newXp);
      const awardedXp = xp - player.xp;
      const level = getProgression(xp).level;
      const battlePass = getUpdatedBattlePass(player.battlePass, level);
      const oldStatistics = player.statistics || {};
      const gamesPlayed = oldStatistics.gamesPlayed || 0;
      const bestScore = Math.max(oldStatistics.bestScore || 0, result.score);
      const previousBestLines = player.bestSingleGameLines || 0;

      transaction.update(playerRef, {
        xp,
        level,
        battlePass,
        lines: (player.lines || 0) + result.lines,
        bestSingleGameLines: Math.max(previousBestLines, result.lines),
        statistics: { ...oldStatistics, gamesPlayed: gamesPlayed + 1, bestScore },
        lastGameId: result.sessionId,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      transaction.set(receiptRef, {
        awardedXp,
        xpBefore: player.xp,
        xpAfter: xp,
        level,
        lines: result.lines,
        score: result.score,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      transaction.set(questRef, questProgress);

      if (result.lines > previousBestLines) {
        const displayName = typeof player.displayName === 'string' && player.displayName
          ? player.displayName : 'Joueur';
        transaction.set(leaderboardRef, {
          uid: user.uid,
          displayName,
          usernameLower: typeof player.usernameLower === 'string' && player.usernameLower
            ? player.usernameLower : 'joueur',
          lines: result.lines,
          bestScore,
          level,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
      return {
        ok: true,
        alreadySubmitted: false,
        xp,
        level,
        awardedXp,
        questCompletions: newlyCompleted
      };
    });
  }

  async function submitGameResult(result) {
    const message = document.getElementById('modalText');
    const returnButton = document.getElementById('returnToSalon');
    const leaveWithoutSaving = document.getElementById('leaveWithoutSaving');
    if (result.offline) {
      if (message) {
        message.textContent =
          'Partie locale terminée. Les XP et résultats ne sont pas sauvegardés.';
      }
      if (returnButton) {
        returnButton.textContent = 'RETOURNER AU SALON';
        returnButton.disabled = false;
        returnButton.onclick = () => go('salon');
      }
      if (leaveWithoutSaving) leaveWithoutSaving.style.display = 'none';
      if (result.reason === 'quit') go('salon');
      return false;
    }
    deferQuestCompletionNotifications = true;
    const levelBeforeSave = getProgression(data.xp).level;
    const offerLeaveWithoutSaving = () => {
      if (result.reason === 'quit' && leaveWithoutSaving) {
        leaveWithoutSaving.style.display = 'inline-block';
      }
    };
    const showReturnToSalon = () => {
      if (!returnButton) return;
      returnButton.textContent = 'RETOURNER AU SALON';
      returnButton.disabled = false;
      returnButton.onclick = () => go('salon');
    };
    const user = auth?.currentUser || currentUser;
    if (!user || typeof result.sessionId !== 'string' ||
        !/^[A-Za-z0-9_-]{20,64}$/.test(result.sessionId)) {
      const reason = !user
        ? 'Aucun compte Firebase Authentication connecté.'
        : `La session de partie est invalide (${String(result.sessionId)}).`;
      console.error('XP de partie non sauvegardés.', {
        uid: user?.uid || null,
        sessionId: result.sessionId || null,
        reason,
        gameSessionError
      });
      if (message) message.textContent = `Sauvegarde des XP impossible : ${reason}`;
      offerLeaveWithoutSaving();
      showReturnToSalon();
      deferQuestCompletionNotifications = false;
      return false;
    }

    if (message) message.textContent = 'Enregistrement des XP sur ton compte…';
    if (returnButton) returnButton.disabled = true;
    let firestoreOperation = 'validation serveur du rejeu de partie';
    let response;
    try {
      if (!Array.isArray(result.actions) || !Array.isArray(result.actionOffsetsMs) ||
          result.actions.length !== result.actionOffsetsMs.length) {
        throw new Error('Le rejeu de partie est incomplet.');
      }
      response = await callGameWorker('/game/submit', {
        sessionId: result.sessionId,
        actions: result.actions,
        actionOffsetsMs: result.actionOffsetsMs
      });
      if (!response?.ok || !Number.isSafeInteger(response.xp) ||
          !Number.isSafeInteger(response.level)) {
        throw new Error('Le serveur n’a pas confirmé le résultat de cette partie.');
      }
    } catch (workerError) {
      console.warn('Le Worker ne peut pas enregistrer cette partie; tentative Firestore directe.', {
        uid: user.uid,
        sessionId: result.sessionId,
        code: workerError.code || 'unknown',
        message: workerError.message || String(workerError)
      });
      firestoreOperation = 'sauvegarde directe dans Firestore';
      try {
        response = await saveGameResultToFirestore(user, result);
      } catch (error) {
        console.error('Sauvegarde directe du résultat de partie échouée.', {
          uid: user.uid,
          sessionId: result.sessionId,
          operation: firestoreOperation,
          code: error.code || 'unknown',
          message: error.message || String(error)
        }, error);
        if (message) {
          message.textContent =
            `Sauvegarde des XP impossible (${firestoreOperation}) : ${publicError(error)}`;
        }
        offerLeaveWithoutSaving();
        showReturnToSalon();
        deferQuestCompletionNotifications = false;
        return false;
      }
    }

    const title = document.getElementById('modalTitle');
    if (title) title.textContent = 'PARTIE TERMINÉE';
    if (message) message.textContent = '';
    console.info('Résultat de partie enregistré dans Firestore.', {
      uid: user.uid,
      sessionId: result.sessionId,
      awardedXp: response.awardedXp,
      totalXp: response.xp,
      alreadySubmitted: response.alreadySubmitted === true
    });
    data = {
      ...data,
      xp: response.xp,
      level: response.level,
      battlePass: getUpdatedBattlePass(data.battlePass, response.level)
    };
    syncBattlePassRewards(user, { xp: response.xp, level: response.level });
    renderXpBoostIndicator();
    connectionNotice('');
    deliverQuestCompletionNotice(response.questCompletions, {
      defer: true
    });
    refreshPage();
    if (returnButton) {
      returnButton.textContent = 'RETOURNER AU SALON';
      returnButton.disabled = false;
      returnButton.onclick = () => go('salon');
    }
    if (!response.alreadySubmitted && response.level > levelBeforeSave) {
      storePendingLevelUpNotice(response.level, response.level - levelBeforeSave);
    }
    if (hasObservedLevel) lastNotifiedLevel = response.level;
    if (result.reason === 'quit') go('salon');
    else deferQuestCompletionNotifications = false;
    return true;
  }

  function go(page) {
    const pages = {
      salon: 'tetris_salon_mobile_battle_pass.html',
      jouer: 'tetris_jouer_mobile.html',
      quetes: 'tetris_quetes_mobile.html',
      battlepass: 'tetris_battle_pass_mobile.html',
      boutique: 'tetris_boutique_mobile.html',
      amis: 'tetris_amis_mobile.html',
      casier: 'tetris_casier_mobile.html.html',
      classement: 'tetris_classement_mobile.html',
      parametres: 'tetris_parametres_mobile.html',
      aide: 'tetris_aide_infos_mobile.html',
      connexion: 'tetris_connexion.html'
    };
    if (!pages[page]) throw new Error(`Page inconnue : ${page}`);
    if (window.TetrisPageTransition) {
      window.TetrisPageTransition.navigate(pages[page]);
    } else {
      window.location.href = pages[page];
    }
  }

  function renderBattlePass() {
    const progression = getProgression(data.xp);
    const level = progression.level;
    const currentXp = progression.xpIntoLevel;
    document.getElementById('level').textContent = level;
    document.getElementById('next').textContent = level === MAX_LEVEL ? 'MAX' : `Niv. ${level + 1}`;
    document.getElementById('xp').textContent = level === MAX_LEVEL
      ? `${progression.xp.toLocaleString('fr-FR')} / ${MAX_XP.toLocaleString('fr-FR')} XP`
      : `${currentXp.toLocaleString('fr-FR')} / ${progression.xpForNextLevel.toLocaleString('fr-FR')} XP`;
    let totalXpDisplay = document.getElementById('accountTotalXp');
    if (!totalXpDisplay) {
      totalXpDisplay = document.createElement('div');
      totalXpDisplay.id = 'accountTotalXp';
      totalXpDisplay.className = 'account-total-xp';
      totalXpDisplay.setAttribute('aria-live', 'polite');
      document.querySelector('.progress').insertAdjacentElement('afterend', totalXpDisplay);
      const style = document.createElement('style');
      style.id = 'accountTotalXpStyle';
      style.textContent = '.account-total-xp{visibility:hidden;margin:-20px 10px 22px;text-align:right;color:#c9b6ef;font-size:11px;font-weight:800;letter-spacing:.3px}';
      document.head.append(style);
    }
    totalXpDisplay.textContent = `XP TOTAL DU COMPTE : ${progression.xp.toLocaleString('fr-FR')} XP`;
    renderProgressSaveNotice(totalXpDisplay.parentElement, 'battlePassProgressSaveNotice');
    document.getElementById('fill').style.width = level === MAX_LEVEL
      ? '100%' : `${currentXp / progression.xpForNextLevel * 100}%`;
    const pageTitle = document.getElementById('pageTitle');
    const page = Number(pageTitle.dataset.page || 0);
    pageTitle.textContent = `Page ${page + 1} / ${BATTLE_PASS_PAGES}`;
    document.getElementById('prev').disabled = page === 0;
    document.getElementById('nextPage').disabled = page === BATTLE_PASS_PAGES - 1;
    const navigation = pageTitle.parentElement;
    navigation.className = 'page-navigation';
    let pageProgress = document.getElementById('pageProgress');
    if (!pageProgress) {
      pageProgress = document.createElement('div');
      pageProgress.id = 'pageProgress';
      pageProgress.className = 'page-track';
      pageProgress.setAttribute('role', 'progressbar');
      pageProgress.setAttribute('aria-label', 'Navigation entre les pages du Battle Pass');
      const pageProgressFill = document.createElement('div');
      pageProgressFill.id = 'pageProgressFill';
      pageProgressFill.className = 'page-progress-fill';
      pageProgress.append(pageProgressFill);
      navigation.append(pageProgress);
    }
    if (!document.getElementById('battlePassNavigationStyle')) {
      const style = document.createElement('style');
      style.id = 'battlePassNavigationStyle';
      style.textContent = '.page-navigation{flex:1;min-width:0;text-align:center}.page-track{height:11px;margin:9px 2px 0;border:1px solid #8e55d8;border-radius:8px;background:#35115f;overflow:hidden;box-shadow:inset 0 0 5px #140528}.page-progress-fill{height:100%;width:5%;border-radius:7px;background:linear-gradient(90deg,#fff45a,#ffd21f);box-shadow:0 0 9px #ffe31c,0 0 15px #ffd21f;transition:width .45s cubic-bezier(.2,.8,.2,1)}.empty{position:relative;display:grid;place-items:center}.skin-reward{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;width:100%;height:100%;text-align:center}.reward-image{display:block;width:min(100%,140px);height:auto;max-height:100%;aspect-ratio:1;object-fit:contain}.skin-reward strong{font-size:clamp(7px,1.8vw,10px);line-height:1.1;color:#fff;text-shadow:0 1px 5px #000}.credit-reward{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;width:100%;height:100%;text-align:center}.credit-reward-logo{display:block;width:min(48%,52px);height:auto;aspect-ratio:1;object-fit:contain}.credit-reward strong{font-size:clamp(8px,2.1vw,12px);line-height:1.15;white-space:nowrap;color:#ffe27a;text-shadow:0 1px 5px #000}.combined-rewards{display:flex;gap:2px}.combined-rewards .skin-reward,.combined-rewards .credit-reward{width:50%;min-width:0;gap:3px}.combined-rewards .reward-image{width:min(100%,58px);height:auto;max-height:58px}.combined-rewards .skin-reward strong,.combined-rewards .credit-reward strong{font-size:7px;white-space:normal}.combined-rewards .credit-reward-logo{width:min(60%,34px)}.card-lock{position:absolute;inset:0;display:grid;place-items:center;color:#ddc8ff;filter:drop-shadow(0 0 5px #b66cff)}.card-lock svg{width:38px;height:38px;overflow:visible}.season #battlePassCountdown{font-variant-numeric:tabular-nums;text-align:right}';
      document.head.append(style);
    }
    if (!document.getElementById('battlePassRewardStatusStyle')) {
      const style = document.createElement('style');
      style.id = 'battlePassRewardStatusStyle';
      style.textContent = '.reward-type{display:block;margin-top:2px;color:#8cffbe;font-size:7px;font-weight:900;line-height:1.1;text-shadow:0 1px 4px #000}.combined-rewards .reward-type{font-size:6px}.card.locked{opacity:1}.card-lock{position:absolute;top:3px;right:3px;display:grid;place-items:center;width:20px;height:20px;border:1px solid #d8b8ff;border-radius:50%;background:#160b30e8;color:#ddc8ff;filter:drop-shadow(0 0 4px #b66cff)}.card-lock svg{width:13px;height:15px;overflow:visible}';
      document.head.append(style);
    }
    if (!document.getElementById('battlePassXpBoostRewardStyle')) {
      const style = document.createElement('style');
      style.id = 'battlePassXpBoostRewardStyle';
      style.textContent = '.empty.reward-stack{display:flex;flex-direction:column;justify-content:space-evenly;gap:2px;padding:3px}.reward-stack>.skin-reward,.reward-stack>.credit-reward,.reward-stack>.xp-boost-reward{flex:1;min-height:0;gap:1px}.xp-boost-reward{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;width:100%;height:100%;text-align:center}.xp-boost-reward-image{display:block;width:min(100%,65px);height:auto;max-height:55%;object-fit:contain}.xp-boost-reward strong{font-size:clamp(7px,1.8vw,10px);line-height:1.1;color:#ffe27a;text-shadow:0 1px 5px #000}.xp-boost-reward small:not(.reward-type){font-size:7px;color:#ffe7a0}.reward-stack .reward-image{width:min(100%,58px);height:auto;max-height:55%}.reward-stack .credit-reward-logo{width:min(60%,34px);max-height:55%}.reward-stack .skin-reward strong,.reward-stack .credit-reward strong{font-size:7px;white-space:normal}.reward-stack .reward-type{font-size:6px}';
      document.head.append(style);
    }
    if (!document.getElementById('battlePassLoadingScreenRewardStyle')) {
      const style = document.createElement('style');
      style.id = 'battlePassLoadingScreenRewardStyle';
      style.textContent = '.loading-screen-reward{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;width:100%;height:100%;text-align:center}.loading-screen-reward-image{display:block;width:min(100%,140px);height:auto;max-height:70%;aspect-ratio:16/9;object-fit:cover;border:1px solid #ffffff70;border-radius:4px}.loading-screen-reward strong{font-size:clamp(7px,1.8vw,10px);line-height:1.1;color:#fff;text-shadow:0 1px 5px #000}.reward-stack .loading-screen-reward-image{width:min(100%,58px);max-height:55%}.reward-stack .loading-screen-reward strong{font-size:6px}';
      document.head.append(style);
    }
    const pageProgressFill = document.getElementById('pageProgressFill');
    const pagePercent = (page + 1) / BATTLE_PASS_PAGES * 100;
    pageProgressFill.style.width = `${pagePercent}%`;
    pageProgress.setAttribute('aria-valuenow', String(page + 1));
    pageProgress.setAttribute('aria-valuemin', '1');
    pageProgress.setAttribute('aria-valuemax', String(BATTLE_PASS_PAGES));

    const cards = document.getElementById('cards');
    cards.replaceChildren();
    const appendRewardType = (container, label) => {
      const type = document.createElement('small');
      type.className = 'reward-type';
      type.textContent = label;
      container.append(type);
    };
    for (let index = 0; index < 5; index++) {
      const cardLevel = page * 5 + index + 1;
      const card = document.createElement('div');
      card.className = `card${cardLevel > level ? ' locked' : ''}${cardLevel === level ? ' current' : ''}`;
      if (cardLevel > level) card.setAttribute('aria-label', `Niveau ${cardLevel}, verrouillé`);
      const heading = document.createElement('div');
      heading.className = 'card-head';
      heading.textContent = `Niv. ${cardLevel}`;
      card.append(heading);
      const empty = document.createElement('div');
      empty.className = 'empty';
      const skinReward = BATTLE_PASS_SKINS.find(skin => skin.level === cardLevel);
      const boostReward = XP_BOOSTS.find(boost => boost.level === cardLevel);
      const musicReward = BATTLE_PASS_MUSIC.find(track => track.level === cardLevel);
      const loadingScreenReward = BATTLE_PASS_LOADING_SCREENS.find(
        screen => screen.level === cardLevel
      );
      const hasCreditReward = BATTLE_PASS_CREDIT_REWARD_LEVELS.includes(cardLevel);
      const lockedLabel = cardLevel > level ? ', verrouillé' : '';
      const rewardLabels = [
        ...(skinReward ? [skinReward.name === 'Red Bull'
          ? 'Skin Red Bull' : skinReward.name] : []),
        ...(boostReward ? ['Boost XP +5 (20 min)'] : []),
        ...(musicReward ? [musicReward.name] : []),
        ...(loadingScreenReward ? [loadingScreenReward.name] : []),
        ...(hasCreditReward ? ['100 crédits'] : [])
      ];
      empty.setAttribute('aria-label', rewardLabels.length
        ? `${rewardLabels.join(' et ')}, niveau ${cardLevel}${lockedLabel}`
        : cardLevel > level ? 'Case de récompense verrouillée' : 'Emplacement de récompense vide');
      if (rewardLabels.length > 1) empty.classList.add('reward-stack');
      if (skinReward) {
        const skinPreview = document.createElement('div');
        skinPreview.className = 'skin-reward';
        const rewardImage = document.createElement('img');
        rewardImage.className = 'reward-image';
        rewardImage.src = skinReward.image;
        rewardImage.alt = skinReward.name;
        rewardImage.addEventListener('error', () => rewardImage.remove(), { once: true });
        const rewardName = document.createElement('strong');
        rewardName.textContent = skinReward.name;
        skinPreview.append(rewardImage, rewardName);
        appendRewardType(skinPreview, 'SKIN DE BLOC');
        empty.append(skinPreview);
      }
      if (boostReward) {
        const boostPreview = document.createElement('div');
        boostPreview.className = 'xp-boost-reward';
        const rewardImage = document.createElement('img');
        rewardImage.className = 'xp-boost-reward-image';
        rewardImage.src = boostReward.image;
        rewardImage.alt = 'Boost XP';
        rewardImage.addEventListener('error', () => rewardImage.remove(), { once: true });
        const rewardName = document.createElement('strong');
        rewardName.textContent = 'BOOST XP +5';
        const duration = document.createElement('small');
        duration.textContent = '20 MIN';
        boostPreview.append(rewardImage, rewardName, duration);
        appendRewardType(boostPreview, 'BOOST XP');
        empty.append(boostPreview);
      }
      if (musicReward) {
        const musicPreview = document.createElement('div');
        musicPreview.className = 'skin-reward';
        const rewardImage = document.createElement('img');
        rewardImage.className = 'reward-image';
        rewardImage.src = musicReward.imageUrl;
        rewardImage.alt = '';
        rewardImage.setAttribute('aria-hidden', 'true');
        rewardImage.addEventListener('error', () => rewardImage.remove(), { once: true });
        const rewardName = document.createElement('strong');
        rewardName.textContent = musicReward.name;
        musicPreview.append(rewardImage, rewardName);
        appendRewardType(musicPreview, 'MUSIQUE');
        empty.append(musicPreview);
      }
      if (loadingScreenReward) {
        const screenPreview = document.createElement('div');
        screenPreview.className = 'loading-screen-reward';
        const rewardImage = document.createElement('img');
        rewardImage.className = 'loading-screen-reward-image';
        rewardImage.src = loadingScreenReward.image;
        rewardImage.alt = loadingScreenReward.name;
        rewardImage.addEventListener('error', () => rewardImage.remove(), { once: true });
        const rewardName = document.createElement('strong');
        rewardName.textContent = 'ÉCRAN DE CHARGEMENT';
        screenPreview.append(rewardImage, rewardName);
        appendRewardType(screenPreview, 'ÉCRAN DE CHARGEMENT');
        empty.append(screenPreview);
      }
      if (hasCreditReward) {
        const reward = document.createElement('div');
        reward.className = 'credit-reward';
        const logo = document.createElement('img');
        logo.className = 'credit-reward-logo';
        logo.src = CREDIT_LOGO_SRC;
        logo.alt = '';
        logo.setAttribute('aria-hidden', 'true');
        const amount = document.createElement('strong');
        amount.textContent = '100 CRÉDITS';
        reward.append(logo, amount);
        appendRewardType(reward, 'CRÉDITS');
        empty.append(reward);
      }
      if (cardLevel > level) {
        const lock = document.createElement('div');
        lock.className = 'card-lock';
        lock.setAttribute('aria-hidden', 'true');
        lock.innerHTML = '<svg viewBox="0 0 32 36" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 15V10a8 8 0 0 1 16 0v5" stroke="#e4caff" stroke-width="3.5" stroke-linecap="round"/><rect x="4" y="14" width="24" height="19" rx="4" fill="#61349b" stroke="#d8b8ff" stroke-width="2"/><circle cx="16" cy="22" r="2" fill="#f3eaff"/><path d="M16 24v4" stroke="#f3eaff" stroke-width="2" stroke-linecap="round"/></svg>';
        empty.append(lock);
      }
      card.append(empty);
      cards.append(card);
    }
  }

  function renderBattlePassCountdown() {
    const countdown = document.querySelector('.season span');
    if (!countdown) return;
    countdown.id = 'battlePassCountdown';
    countdown.setAttribute('role', 'timer');
    const now = Date.now();
    const target = now < BATTLE_PASS_START_AT ? BATTLE_PASS_START_AT : BATTLE_PASS_END_AT;
    if (now >= BATTLE_PASS_END_AT) {
      countdown.textContent = 'BATTLE PASS TERMINÉ';
      return;
    }

    const remaining = Math.max(0, Math.ceil((target - now) / 1000));
    const days = Math.floor(remaining / 86_400);
    const hours = Math.floor(remaining % 86_400 / 3_600);
    const minutes = Math.floor(remaining % 3_600 / 60);
    const seconds = remaining % 60;
    const format = value => String(value).padStart(2, '0');
    countdown.textContent = now < BATTLE_PASS_START_AT
      ? `Débute dans : ${format(days)}J ${format(hours)}H ${format(minutes)}MIN ${format(seconds)}S`
      : `Fin dans : ${format(days)}J ${format(hours)}H ${format(minutes)}MIN ${format(seconds)}S`;
  }

  function startBattlePassCountdown() {
    if (battlePassCountdownInterval !== null) return;
    renderBattlePassCountdown();
    battlePassCountdownInterval = window.setInterval(renderBattlePassCountdown, 1000);
  }

  function updateBloc1ShopOffer(slots) {
    const button = slots.querySelector('[data-shop-item="bloc-1"]');
    const status = slots.querySelector('[data-shop-item-status="bloc-1"]');
    if (!button || !status) return;
    const owned = (data.inventoryItems || []).some(item => item.id === SHOP_BLOC1_ID);
    button.disabled = !currentUser || owned || data.credits < SHOP_BLOC1_PRICE;
    button.textContent = owned ? 'DÉJÀ ACHETÉ' : 'ACHETER';
    button.setAttribute('aria-label', owned
      ? 'Bloc en formation déjà dans le casier'
      : `Acheter Bloc en formation pour ${SHOP_BLOC1_PRICE} crédits`);
    status.textContent = owned ? 'Débloqué dans le casier'
      : !currentUser ? 'Connecte-toi pour acheter'
        : data.credits < SHOP_BLOC1_PRICE ? 'Crédits insuffisants'
          : 'Écran de chargement';
  }

  async function purchaseBloc1(button) {
    const user = currentUser;
    if (!user || !db) {
      connectionNotice('Connecte-toi pour acheter Bloc en formation.', true);
      return;
    }
    if (button.dataset.busy === 'true') return;
    button.dataset.busy = 'true';
    button.disabled = true;
    try {
      const playerRef = db.doc(`players/${user.uid}`);
      const itemRef = db.doc(`players/${user.uid}/inventory/${SHOP_BLOC1_ID}`);
      const purchase = await db.runTransaction(async transaction => {
        const [playerSnapshot, itemSnapshot] = await Promise.all([
          transaction.get(playerRef),
          transaction.get(itemRef)
        ]);
        if (!playerSnapshot.exists) {
          throw new Error('Profil Firebase introuvable.');
        }
        if (itemSnapshot.exists) {
          throw new Error('Bloc en formation est déjà présent dans ton casier.');
        }
        const credits = playerSnapshot.data().credits;
        if (!Number.isSafeInteger(credits) || credits < SHOP_BLOC1_PRICE) {
          throw new Error(`Il faut ${SHOP_BLOC1_PRICE} crédits pour acheter Bloc en formation.`);
        }
        transaction.update(playerRef, {
          credits: credits - SHOP_BLOC1_PRICE,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        transaction.set(itemRef, {
          itemId: SHOP_BLOC1_ID,
          name: 'Bloc en formation',
          type: 'loading-screen',
          category: 'loading-screen',
          imageUrl: SHOP_BLOC1_IMAGE,
          source: 'shop',
          price: SHOP_BLOC1_PRICE,
          purchasedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        return { credits: credits - SHOP_BLOC1_PRICE };
      });

      const [savedPlayer, savedItem] = await Promise.all([
        playerRef.get({ source: 'server' }),
        itemRef.get({ source: 'server' })
      ]);
      if (!savedPlayer.exists || !savedItem.exists ||
          savedPlayer.data().credits !== purchase.credits ||
          savedItem.data().type !== 'loading-screen' ||
          savedItem.data().imageUrl !== SHOP_BLOC1_IMAGE) {
        throw new Error('Firestore n’a pas confirmé l’achat de Bloc en formation.');
      }
      data.credits = savedPlayer.data().credits;
      data.inventoryItems = [
        ...(data.inventoryItems || []).filter(item => item.id !== SHOP_BLOC1_ID),
        { id: SHOP_BLOC1_ID, ...savedItem.data() }
      ];
      refreshPage();
      connectionNotice('Bloc en formation ajouté au casier.', false);
    } catch (error) {
      console.error('Achat de Bloc en formation impossible.', {
        uid: user.uid,
        code: error.code || 'purchase-failed',
        message: error.message || String(error)
      }, error);
      connectionNotice(`Achat impossible : ${publicError(error)}`, true);
    } finally {
      delete button.dataset.busy;
      updateBloc1ShopOffer(document.querySelector('.slots'));
    }
  }

  function renderShop() {
    const countdown = document.querySelector('.count');
    const slots = document.querySelector('.slots');
    if (!countdown || !slots || !document.getElementById('creditCount')) return;

    const now = Date.now();
    const cycle = Math.floor((now - SHOP_ROTATION_EPOCH) / SHOP_WEEK_MS);
    const nextRotation = SHOP_ROTATION_EPOCH + (cycle + 1) * SHOP_WEEK_MS;
    const remaining = Math.max(0, Math.ceil((nextRotation - now) / 1000));
    const days = Math.floor(remaining / 86_400);
    const hours = Math.floor(remaining % 86_400 / 3_600);
    const minutes = Math.floor(remaining % 3_600 / 60);
    const seconds = remaining % 60;
    const format = value => String(value).padStart(2, '0');
    countdown.id = 'shopCountdown';
    countdown.setAttribute('role', 'timer');
    countdown.setAttribute('aria-label', 'Temps avant le renouvellement hebdomadaire de la boutique');
    countdown.textContent =
      `PROCHAINE BOUTIQUE DANS ${days}J ${format(hours)}H ${format(minutes)}MIN ${format(seconds)}S`;

    if (lastShopCycle === cycle) {
      updateBloc1ShopOffer(slots);
      return;
    }
    lastShopCycle = cycle;
    const offers = [
      { number: 1, type: 'BLOC', price: SHOP_BLOC1_PRICE, icon: '■' },
      { number: 2, type: 'SKIN DE BLOC', price: 500, icon: '■' },
      { number: 3, type: 'SKIN DE BLOC', price: 800, icon: '■' },
      { number: 4, type: 'SKIN DE BLOC', price: 2000, icon: '■' },
      { number: 5, type: 'MUSIQUE', price: 2500, icon: '♫' }
    ];
    const offset = ((cycle % offers.length) + offers.length) % offers.length;
    slots.replaceChildren();
    if (!document.getElementById('shopOfferStyle')) {
      const style = document.createElement('style');
      style.id = 'shopOfferStyle';
      style.textContent = '.shop-item{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:14px;text-align:center}.shop-item-icon{width:48px;height:48px;display:grid;place-items:center;border:1px solid #ffffffb0;border-radius:12px;background:#f7f7ff;color:#211b37;font-size:28px;font-weight:900}.shop-item-image{width:min(100%,100px);height:70px;object-fit:contain;border-radius:8px}.shop-item-name{font-size:14px;font-weight:900;letter-spacing:.5px}.shop-item-price{display:flex;align-items:center;justify-content:center;gap:4px;color:#ffe27a;font-size:13px;font-weight:850}.shop-item-price .credit-logo{width:18px;height:18px}.shop-item-status{color:#c9c4da;font-size:10px;font-weight:700}.shop-item-actions{display:flex;align-items:center;justify-content:center;gap:7px}.shop-item-actions button{min-height:30px;border:1px solid #8a80a8;border-radius:9px;background:#35324a;color:#c6c1d1;font-size:11px;font-weight:800;opacity:.65}.shop-buy{padding:0 12px}.shop-item-actions .shop-buy:not(:disabled){opacity:1}.shop-gift{width:32px;padding:0;font-size:16px!important}.shop-item-actions button:disabled{cursor:not-allowed}.shop-item[data-shop-offer="bloc-1"]{height:auto;min-height:232px;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);grid-template-rows:94px auto auto 34px;align-content:stretch;align-items:center;gap:6px 8px;padding:12px;overflow:hidden}.shop-item[data-shop-offer="bloc-1"] .shop-item-image{grid-column:1/-1;width:100%;height:100%;max-height:94px;object-fit:contain;object-position:center;padding:3px;border:1px solid #ffffff20;border-radius:10px;background:#0d142b66}.shop-item[data-shop-offer="bloc-1"] .shop-item-name,.shop-item[data-shop-offer="bloc-1"] .shop-item-status{grid-column:1/-1;min-width:0;max-width:100%;overflow-wrap:anywhere}.shop-item[data-shop-offer="bloc-1"] .shop-item-price{grid-column:1;min-width:0;flex-wrap:wrap;font-size:clamp(10px,2.6vw,13px)}.shop-item[data-shop-offer="bloc-1"] .shop-item-price .credit-logo{width:18px;height:18px}.shop-item[data-shop-offer="bloc-1"] .shop-item-actions{grid-column:2;width:100%;min-width:0}.shop-item[data-shop-offer="bloc-1"] .shop-item-actions .shop-buy{width:100%;min-width:0;min-height:34px;padding:0 5px;font-size:clamp(9px,2.5vw,11px)}@media(max-width:360px){.shop-item[data-shop-offer="bloc-1"]{min-height:238px;grid-template-rows:90px auto auto 36px;gap:5px;padding:9px}.shop-item[data-shop-offer="bloc-1"] .shop-item-price{gap:2px;font-size:10px}.shop-item[data-shop-offer="bloc-1"] .shop-item-price .credit-logo{width:15px;height:15px}}.count{font-variant-numeric:tabular-nums}';
      document.head.append(style);
      const bloc1Layout = document.createElement('style');
      bloc1Layout.textContent = '.shop-item[data-shop-offer="bloc-1"] .shop-item-image{grid-row:1;max-height:110px}.shop-item[data-shop-offer="bloc-1"] .shop-item-name{grid-row:2}.shop-item[data-shop-offer="bloc-1"] .shop-item-status{grid-row:3}.shop-item[data-shop-offer="bloc-1"] .shop-item-price,.shop-item[data-shop-offer="bloc-1"] .shop-item-actions{grid-row:4}.shop-item[data-shop-offer="bloc-1"]{grid-template-rows:110px auto auto 36px;min-height:252px}@media(max-width:360px){.shop-item[data-shop-offer="bloc-1"]{grid-template-rows:100px auto auto 36px;min-height:240px}.shop-item[data-shop-offer="bloc-1"] .shop-item-image{max-height:100px}}';
      document.head.append(bloc1Layout);
    }

    for (let index = 0; index < offers.length; index++) {
      const offer = offers[(index + offset) % offers.length];
      const isBloc1 = offer.number === 1;
      const card = document.createElement('div');
      card.className = `slot shop-item${index === offers.length - 1 ? ' shop-item-featured' : ''}`;
      if (isBloc1) card.dataset.shopOffer = 'bloc-1';
      card.setAttribute('aria-label',
        isBloc1 ? `Bloc en formation, écran de chargement, ${offer.price.toLocaleString('fr-FR')} crédits`
          : `Article ${offer.number}, ${offer.type.toLocaleLowerCase('fr')}, ${offer.price.toLocaleString('fr-FR')} crédits, bientôt disponible`);
      let icon;
      if (isBloc1) {
        icon = document.createElement('img');
        icon.className = 'shop-item-image';
        icon.src = SHOP_BLOC1_IMAGE;
        icon.alt = 'Illustration de Bloc en formation';
      } else {
        icon = document.createElement('span');
        icon.className = 'shop-item-icon';
        icon.setAttribute('aria-hidden', 'true');
        icon.textContent = offer.icon;
      }
      const name = document.createElement('span');
      name.className = 'shop-item-name';
      name.textContent = isBloc1 ? 'Bloc en formation' : `${offer.type} ${offer.number}`;
      const price = document.createElement('span');
      price.className = 'shop-item-price';
      price.append(createCreditLogo(18),
        document.createTextNode(`${offer.price.toLocaleString('fr-FR')} crédits`));
      const status = document.createElement('span');
      status.className = 'shop-item-status';
      if (isBloc1) status.dataset.shopItemStatus = 'bloc-1';
      status.textContent = isBloc1 ? 'Écran de chargement' : 'Visuel et fonction à venir';
      const actions = document.createElement('div');
      actions.className = 'shop-item-actions';
      const buyButton = document.createElement('button');
      buyButton.type = 'button';
      buyButton.className = 'shop-buy';
      buyButton.textContent = 'Acheter';
      buyButton.disabled = !isBloc1;
      buyButton.setAttribute('aria-label', isBloc1
        ? `Acheter Bloc en formation pour ${offer.price} crédits`
        : `Acheter l’article ${offer.number}, bientôt disponible`);
      if (isBloc1) {
        buyButton.dataset.shopItem = 'bloc-1';
        buyButton.addEventListener('click', () => purchaseBloc1(buyButton));
      }
      const giftButton = document.createElement('button');
      giftButton.type = 'button';
      giftButton.className = 'shop-gift';
      giftButton.textContent = '🎁';
      giftButton.disabled = true;
      giftButton.setAttribute('aria-label', `Offrir l’article ${offer.number} à un ami, bientôt disponible`);
      actions.append(buyButton, giftButton);
      card.append(icon, name, price, status, actions);
      slots.append(card);
    }
    updateBloc1ShopOffer(slots);
  }

  function startShopCountdown() {
    if (shopCountdownInterval !== null) return;
    renderShop();
    shopCountdownInterval = window.setInterval(renderShop, 1000);
  }

  function renderSalonProgress() {
    const identity = document.querySelector('.identity');
    if (!identity) return;
    identity.querySelector('.avatar')?.remove();

    let panel = document.getElementById('accountProgress');
    if (!panel) {
      const details = identity && Array.from(identity.children)
        .find(child => !child.classList.contains('avatar'));
      if (!details) return;
      const playerName = identity.querySelector('strong');
      if (!playerName) return;
      if (!document.getElementById('accountProgressStyle')) {
        const style = document.createElement('style');
        style.id = 'accountProgressStyle';
        style.textContent = '.identity{flex:1}.identity>div{flex:1;min-width:0}.identity small{display:none}.account-progress{width:100%;min-width:0;margin:4px 0 0;padding:5px 7px;border:1px solid #7652d5;border-radius:8px;background:linear-gradient(110deg,#211246d9,#102448d9);box-shadow:0 0 9px #7038dc55}.identity .account-progress-player{display:block;width:100%;max-width:100%;margin:0 0 3px;text-align:left;font-size:clamp(11px,3.4vw,14px);line-height:1.2;white-space:normal;overflow-wrap:anywhere;color:#fff}.account-progress-head{display:flex;justify-content:space-between;gap:6px;align-items:center;font-size:10px;font-weight:900;color:#eee5ff}.account-progress-track{height:7px;margin:4px 0;border:1px solid #b348ff;border-radius:6px;background:#100b2a;overflow:hidden}.account-progress-fill{height:100%;width:0;border-radius:6px;background:linear-gradient(90deg,#6e46ff,#30d9ff,#ff42e9);box-shadow:0 0 8px #46bcff;transition:width .7s cubic-bezier(.2,.8,.2,1)}.account-progress-foot{display:flex;justify-content:space-between;gap:6px;color:#c9b6ef;font-size:9px}';
        document.head.append(style);
      }
      panel = document.createElement('section');
      panel.id = 'accountProgress';
      panel.className = 'account-progress';
      panel.setAttribute('aria-label', 'Progression du compte');
      panel.innerHTML = '<div class="account-progress-head"><span id="accountProgressLevel"></span><span id="accountProgressTotal"></span></div><div class="account-progress-track" role="progressbar" aria-label="Progression XP"><div class="account-progress-fill" id="accountProgressFill"></div></div><div class="account-progress-foot"><span id="accountProgressCurrent"></span><span id="accountProgressRemaining"></span></div>';
      playerName.classList.add('account-progress-player');
      panel.prepend(playerName);
      details.append(panel);
    }
    const googleName = typeof currentUser?.displayName === 'string'
      ? currentUser.displayName.trim() : '';
    const profileName = typeof profile?.displayName === 'string'
      ? profile.displayName.trim() : '';
    panel.querySelector('.account-progress-player').textContent = profile?.lastPseudoChangeAt
      ? profileName : googleName || profileName;
    const progression = getProgression(data.xp);
    const fill = document.getElementById('accountProgressFill');
    document.getElementById('accountProgressLevel').textContent = `NIVEAU ${progression.level}`;
    document.getElementById('accountProgressTotal').textContent =
      `${progression.xpForNextLevel.toLocaleString('fr-FR')} XP`;
    document.getElementById('accountProgressCurrent').textContent = progression.level === MAX_LEVEL
      ? 'Progression maximale' : `${progression.xpIntoLevel.toLocaleString('fr-FR')} / ${progression.xpForNextLevel.toLocaleString('fr-FR')} XP`;
    document.getElementById('accountProgressRemaining').textContent = progression.level === MAX_LEVEL
      ? 'NIVEAU MAX' : `${progression.xpToNextLevel.toLocaleString('fr-FR')} XP restantes`;
    fill.style.width = progression.level === MAX_LEVEL
      ? '100%' : `${progression.xpIntoLevel / progression.xpForNextLevel * 100}%`;
    panel.querySelector('[role="progressbar"]').setAttribute('aria-valuenow',
      String(progression.level === MAX_LEVEL ? 100 : Math.round(progression.xpIntoLevel / progression.xpForNextLevel * 100)));
    panel.querySelector('[role="progressbar"]').setAttribute('aria-valuemin', '0');
    panel.querySelector('[role="progressbar"]').setAttribute('aria-valuemax', '100');
    renderProgressSaveNotice(panel, 'salonProgressSaveNotice');
  }

  function renderLocker() {
    const skinsGrid = document.querySelector('[data-locker-grid="skins"]');
    if (!skinsGrid) return;

    const createCard = (name, image, status, options = {}) => {
      const item = document.createElement('article');
      item.className = `item${options.selected ? ' selected' : ''}${options.locked ? ' locked' : ''}`;
      const frame = document.createElement('div');
      frame.className = options.frameClass || 'skin-image-frame';
      if (typeof image === 'string' && !options.icon) {
        const preview = document.createElement('img');
        preview.className = 'skin-image';
        preview.src = image;
        preview.alt = name;
        preview.addEventListener('error', () => {
          preview.replaceWith(document.createTextNode('▧'));
          console.error(`Chargement de l’aperçu « ${name} » impossible.`, image);
        }, { once: true });
        frame.append(preview);
      } else {
        frame.textContent = image;
        frame.classList.add('empty-icon');
      }
      const label = document.createElement('span');
      label.className = 'item-name';
      label.textContent = name;
      const itemStatus = document.createElement('span');
      itemStatus.className = 'item-status';
      itemStatus.textContent = status;
      item.append(frame, label, itemStatus);
      if (options.equipSkin) {
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.equipSkin = options.equipSkin;
        button.textContent = status === 'ÉQUIPÉ' ? 'ÉQUIPÉ' : 'ÉQUIPER';
        button.disabled = status === 'ÉQUIPÉ';
        item.append(button);
      } else if (options.equipLoadingScreen) {
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.equipLoadingScreen = options.equipLoadingScreen;
        button.textContent = status === 'ÉQUIPÉ' ? 'DÉSÉQUIPER' : 'ÉQUIPER';
        item.append(button);
      } else if (options.equipMusic) {
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.equipMusic = options.equipMusic;
        button.textContent = status === 'ÉQUIPÉ' ? 'ÉQUIPÉ' : 'ÉQUIPER';
        button.disabled = status === 'ÉQUIPÉ';
        item.append(button);
      } else if (options.locked) {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = 'VERROUILLÉ';
        button.disabled = true;
        item.append(button);
      }
      return item;
    };

    skinsGrid.replaceChildren();
    const defaultEquipped = data.equippedSkin === 'default';
    const defaultPreview = document.createElement('div');
    defaultPreview.className = 'preview';
    for (let index = 0; index < 4; index++) {
      const block = document.createElement('span');
      block.className = 'block';
      defaultPreview.append(block);
    }
    const defaultCard = createCard('Blocs par défaut', null,
      defaultEquipped ? 'ÉQUIPÉ' : 'DISPONIBLE', {
        selected: defaultEquipped,
        icon: true,
        equipSkin: 'default'
      });
    defaultCard.querySelector('.skin-image-frame').replaceWith(defaultPreview);
    defaultPreview.className = 'skin-image-frame preview';
    skinsGrid.append(defaultCard);

    BATTLE_PASS_SKINS.forEach((skin, index) => {
      const owned = data.ownedSkins?.includes(skin.itemId);
      const equipped = data.equippedSkin === skin.itemId;
      skinsGrid.append(createCard(
        skin.name,
        skin.image,
        equipped ? 'ÉQUIPÉ' : owned ? 'DISPONIBLE' : 'VERROUILLÉ',
        {
          selected: equipped,
          locked: !owned,
          equipSkin: owned ? skin.itemId : null
        }
      ));
    });

    const inventoryCategories = {
      music: {
        grid: document.querySelector('[data-locker-grid="music"]'),
        label: 'Musiques',
        types: ['music', 'soundtrack']
      },
      xpBoost: {
        grid: document.querySelector('[data-locker-grid="xpBoosts"]'),
        label: 'Boost XP',
        types: ['xp-boost', 'xpboost']
      },
      loadingScreen: {
        grid: document.querySelector('[data-locker-grid="loadingScreens"]'),
        label: 'Écrans de chargement',
        types: ['loading-screen', 'loadingscreen']
      }
    };
    for (const [category, configuration] of Object.entries(inventoryCategories)) {
      if (!configuration.grid) continue;
      const items = (data.inventoryItems || []).filter(inventoryItem => {
        const itemType = String(inventoryItem.category || inventoryItem.type || '')
          .toLowerCase().replace(/[_\s]/g, '-');
        if (category === 'xpBoost') {
          const isXpBoost = [inventoryItem.category, inventoryItem.type].some(value =>
            configuration.types.includes(
              String(value || '').toLowerCase().replace(/[_\s]/g, '-')
            )
          );
          if (!isXpBoost) return false;
          const quantity = Number.isSafeInteger(inventoryItem.quantity)
            ? inventoryItem.quantity : 1;
          const usedQuantity = Number.isSafeInteger(inventoryItem.usedQuantity)
            ? inventoryItem.usedQuantity : 0;
          const isActive = xpBoostState.activeBoostId === inventoryItem.id &&
            getXpBoostRemainingMs() > 0;
          const isSelected = xpBoostState.selectedBoostId === inventoryItem.id;
          return quantity > usedQuantity || isActive || isSelected;
        }
        return configuration.types.includes(itemType) ||
          itemType === category.toLowerCase();
      });
      configuration.grid.replaceChildren();
      if (category === 'music') {
        const noMusicEquipped = !data.equippedMusic || data.equippedMusic === 'none';
        configuration.grid.append(createCard(
          'Aucune musique',
          '♪',
          noMusicEquipped ? 'ÉQUIPÉ' : 'DISPONIBLE',
          { selected: noMusicEquipped, icon: true, equipMusic: 'none' }
        ));
      }
      if (items.length === 0) {
        if (category !== 'music') {
          const empty = document.createElement('p');
          empty.className = 'empty-message';
          empty.textContent = `Aucun objet débloqué dans la catégorie ${configuration.label.toLowerCase()}.`;
          configuration.grid.append(empty);
        }
        continue;
      }
      items.forEach(item => {
        const musicTrack = category === 'music'
          ? BATTLE_PASS_MUSIC.find(track => track.itemId === item.id) : null;
        const preview = musicTrack?.imageUrl ||
          (typeof item.imageUrl === 'string' ? item.imageUrl
            : typeof item.image === 'string' ? item.image : null);
        const isEquipped = category === 'music' && data.equippedMusic === item.id ||
          category === 'loadingScreen' && data.equippedLoadingScreen === item.id;
        const isSelectedBoost = category === 'xpBoost' &&
          xpBoostState.selectedBoostId === item.id;
        const isActiveBoost = category === 'xpBoost' &&
          xpBoostState.activeBoostId === item.id && getXpBoostRemainingMs() > 0;
        const card = createCard(
          item.id === SHOP_BLOC1_ID ? 'Bloc en formation'
            : typeof item.name === 'string' ? item.name : item.id,
          preview || (category === 'music' ? '♪' : category === 'xpBoost' ? '⚡' : '🌌'),
          isActiveBoost ? 'ACTIF' : isSelectedBoost ? 'SÉLECTIONNÉ'
            : isEquipped ? 'ÉQUIPÉ' : 'DISPONIBLE',
          {
            selected: isEquipped || isSelectedBoost || isActiveBoost,
            icon: !preview,
            ...(category === 'music' ? { equipMusic: item.id } : {}),
            ...(category === 'loadingScreen' ? { equipLoadingScreen: item.id } : {})
          }
        );
        if (category === 'xpBoost') {
          const quantity = Number.isSafeInteger(item.quantity) ? item.quantity : 1;
          const usedQuantity = Number.isSafeInteger(item.usedQuantity) ? item.usedQuantity : 0;
          const availableQuantity = Math.max(0, quantity - usedQuantity);
          const durationMinutes = Number.isFinite(item.durationMs)
            ? item.durationMs / 60_000
            : Number(item.durationMinutes ?? item.durationInMinutes ?? item.minutes ?? item.duration);
          if (Number.isFinite(durationMinutes) && durationMinutes > 0) {
            const duration = document.createElement('div');
            duration.className = 'item-status';
            duration.textContent =
              `${durationMinutes} min • ${availableQuantity} disponible${availableQuantity === 1 ? '' : 's'}`;
            card.append(duration);
          }
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'secondary';
          button.dataset.selectXpBoost = item.id;
          button.textContent = isActiveBoost ? 'ACTIF' : isSelectedBoost ? 'SÉLECTIONNÉ'
            : 'SÉLECTIONNER';
          button.disabled = !currentUser || availableQuantity === 0 ||
            isSelectedBoost ||
            Boolean(xpBoostState.activeBoostId && getXpBoostRemainingMs() > 0);
          card.append(button);
        }
        if (category === 'music' && typeof item.audioUrl === 'string' && item.audioUrl) {
          const listen = document.createElement('button');
          listen.type = 'button';
          listen.className = 'secondary';
          listen.textContent = 'ÉCOUTER';
          listen.dataset.previewAudio = item.audioUrl;
          card.append(listen);
        }
        configuration.grid.append(card);
      });
    }
  }

  function setupLocker() {
    const skinsGrid = document.querySelector('[data-locker-grid="skins"]');
    if (!skinsGrid) return;
    document.querySelectorAll('.fold-toggle[aria-controls]').forEach(toggle => {
      toggle.addEventListener('click', () => {
        const expanded = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', String(!expanded));
        document.getElementById(toggle.getAttribute('aria-controls')).hidden = expanded;
      });
    });
    renderLocker();
    document.querySelector('.locker-categories').addEventListener('click', async event => {
      const boostButton = event.target.closest('[data-select-xp-boost]');
      if (boostButton) {
        const itemId = boostButton.dataset.selectXpBoost;
        if (!currentUser) {
          connectionNotice('Connecte-toi pour sélectionner un boost XP.', true);
          return;
        }
        boostButton.disabled = true;
        try {
          const stateRef = db.doc(`players/${currentUser.uid}/xpBoostState/current`);
          const itemRef = db.doc(`players/${currentUser.uid}/inventory/${itemId}`);
          await db.runTransaction(async transaction => {
            const [stateSnapshot, itemSnapshot] = await Promise.all([
              transaction.get(stateRef),
              transaction.get(itemRef)
            ]);
            const state = stateSnapshot.exists ? stateSnapshot.data() : {};
            if (state.activeBoostId && getXpBoostRemainingMs(state) > 0) {
              throw new Error('Attends la fin du boost actif avant d’en sélectionner un autre.');
            }
            if (!itemSnapshot.exists) throw new Error('Ce boost XP n’est pas dans ton casier.');
            const item = itemSnapshot.data();
            const quantity = item.quantity ?? 1;
            const usedQuantity = item.usedQuantity ?? 0;
            if (item.type !== 'xp-boost' || !Number.isSafeInteger(quantity) ||
                quantity < 1 || !Number.isSafeInteger(usedQuantity) ||
                usedQuantity < 0 || usedQuantity >= quantity) {
              throw new Error('Ce boost XP n’est plus disponible.');
            }
            transaction.set(stateRef, {
              selectedBoostId: itemId,
              updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
          });
          xpBoostState = {
            ...xpBoostState,
            selectedBoostId: itemId,
            ...(getXpBoostRemainingMs(xpBoostState) <= 0 ? {
              activeBoostId: null,
              activeRemainingMs: 0,
              activeExpiresAt: null
            } : {})
          };
          renderXpBoostIndicator();
          renderLocker();
        } catch (error) {
          console.error('Sélection du boost XP impossible.', { itemId, error });
          connectionNotice(`Le boost XP n’a pas été sélectionné : ${publicError(error)}`, true);
          renderLocker();
        }
        return;
      }
      const listenButton = event.target.closest('[data-preview-audio]');
      if (listenButton) {
        const audio = new Audio(listenButton.dataset.previewAudio);
        audio.volume = Number(data.settings.musicVolume) / 100;
        listenButton.disabled = true;
        try {
          await audio.play();
        } catch (error) {
          console.error('Lecture de l’aperçu musical impossible.', {
            source: listenButton.dataset.previewAudio,
            error
          });
          connectionNotice(`Impossible de lire cet aperçu : ${publicError(error)}`, true);
        } finally {
          listenButton.disabled = false;
        }
        return;
      }
      const musicButton = event.target.closest('[data-equip-music]');
      if (musicButton) {
        const musicId = musicButton.dataset.equipMusic;
        const musicItem = musicId === 'none' ? null : (data.inventoryItems || []).find(item =>
          item.id === musicId &&
          BATTLE_PASS_MUSIC.some(track => track.itemId === musicId) &&
          item.type === 'music' && item.category === 'music');
        if (musicId !== 'none' && !musicItem) {
          connectionNotice('Cette musique n’est pas débloquée dans ton casier.', true);
          renderLocker();
          return;
        }
        if (!currentUser) {
          connectionNotice('Connecte-toi pour équiper et sauvegarder cette musique.', true);
          return;
        }
        musicButton.disabled = true;
        try {
          await savePreferences({ ...data, equippedMusic: musicId });
          data.equippedMusic = musicId;
          refreshPage();
          renderLocker();
          connectionNotice('');
        } catch (error) {
          console.error('Équipement de la musique impossible.', { musicId, error });
          connectionNotice(`La musique n’a pas été équipée : ${publicError(error)}`, true);
          renderLocker();
        }
        return;
      }
      const button = event.target.closest('[data-equip-skin]');
      const loadingScreenButton = event.target.closest('[data-equip-loading-screen]');
      if (loadingScreenButton) {
        const loadingScreen = loadingScreenButton.dataset.equipLoadingScreen;
        const item = (data.inventoryItems || []).find(inventoryItem =>
          inventoryItem.id === loadingScreen &&
          String(inventoryItem.category || inventoryItem.type || '')
            .toLowerCase().replace(/[_\s]/g, '-') === 'loading-screen');
        if (!item) {
          connectionNotice('Cet écran de chargement n’est pas dans ton casier.', true);
          return;
        }
        if (!currentUser) {
          connectionNotice('Connecte-toi pour équiper et sauvegarder cet écran.', true);
          return;
        }
        const nextLoadingScreen = data.equippedLoadingScreen === loadingScreen
          ? 'none' : loadingScreen;
        loadingScreenButton.disabled = true;
        try {
          await savePreferences({ ...data, equippedLoadingScreen: nextLoadingScreen });
          data.equippedLoadingScreen = nextLoadingScreen;
          syncEquippedLoadingScreen();
          refreshPage();
          connectionNotice('');
        } catch (error) {
          console.error('Équipement de l’écran de chargement impossible.', {
            loadingScreen,
            error
          });
          connectionNotice(`L’écran de chargement n’a pas été modifié : ${publicError(error)}`, true);
          renderLocker();
        }
        return;
      }
      if (!button) return;
      const skin = button.dataset.equipSkin;
      if (!data.ownedSkins?.includes(skin)) {
        connectionNotice('Ce skin n’est pas débloqué sur ton compte.', true);
        return;
      }
      if (!currentUser) {
        connectionNotice('Connecte-toi pour équiper et sauvegarder ce skin.', true);
        return;
      }

      button.disabled = true;
      try {
        if (skin !== 'default') await loadBlockSkinImage(skin);
        await savePreferences({ ...data, equippedSkin: skin });
        data.equippedSkin = skin;
        refreshPage();
        connectionNotice('');
      } catch (error) {
        console.error('Équipement du skin impossible.', { skin, error });
        connectionNotice(`Le skin n’a pas été équipé : ${publicError(error)}`, true);
        renderLocker();
      }
    });
  }

  function updateLoadout() {
    const skin = document.getElementById('defaultSkin');
    const music = document.getElementById('noMusic');
    if (skin) skin.dataset.equipped = data.equippedSkin === 'default' ? 'true' : 'false';
    if (music) music.dataset.equipped = data.equippedMusic === 'none' ? 'true' : 'false';
    renderLocker();
  }

  function renderSettings() {
    const settings = data.settings;
    const music = document.getElementById('music');
    if (music) music.checked = settings.music;
    document.getElementById('musicVolume').value = settings.musicVolume;
    document.getElementById('blocksVolume').value = settings.blocksVolume;
    updateSettingsDisplay();
    renderPseudoChangeStatus();
  }

  function updateSettingsDisplay() {
    const music = document.getElementById('music');
    if (music) document.getElementById('musicVolume').disabled = !music.checked;
    document.getElementById('musicValue').textContent = `${document.getElementById('musicVolume').value} %`;
    document.getElementById('blocksValue').textContent = `${document.getElementById('blocksVolume').value} %`;
  }

  const PSEUDO_CHANGE_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

  function renderPseudoChangeStatus() {
    const button = document.getElementById('changePseudo');
    const cooldown = document.getElementById('pseudoCooldown');
    const currentName = document.getElementById('currentPseudo');
    if (!button || !cooldown || !currentName) return;

    currentName.textContent = profile?.displayName
      ? `Pseudo actuel : ${profile.displayName}` : '';
    if (!currentUser || !profile) {
      button.disabled = true;
      cooldown.textContent = currentUser ? 'Chargement du profil…' : 'Connecte-toi pour changer de pseudo.';
      return;
    }

    const lastChange = profile.lastPseudoChangeAt;
    const lastChangeDate = lastChange && typeof lastChange.toDate === 'function'
      ? lastChange.toDate() : null;
    if (lastChange && !lastChangeDate) {
      button.disabled = true;
      cooldown.textContent = 'La date du dernier changement est invalide. Contacte le support.';
      return;
    }
    if (!lastChangeDate) {
      button.disabled = false;
      cooldown.textContent = 'Ton premier changement est disponible immédiatement.';
      return;
    }

    const remaining = lastChangeDate.getTime() + PSEUDO_CHANGE_COOLDOWN_MS - Date.now();
    if (remaining <= 0) {
      button.disabled = false;
      cooldown.textContent = 'Tu peux changer de pseudo.';
      return;
    }
    button.disabled = true;
    let seconds = Math.floor(remaining / 1000);
    const days = Math.floor(seconds / 86_400);
    seconds %= 86_400;
    const hours = Math.floor(seconds / 3_600);
    seconds %= 3_600;
    const minutes = Math.floor(seconds / 60);
    seconds %= 60;
    cooldown.textContent =
      `Prochain changement dans ${days}j ${hours}h ${minutes}min ${seconds}s`;
  }

  async function changePlayerPseudo(value) {
    const user = currentUser;
    const newName = typeof value === 'string' ? value.trim() : '';
    if (!user || !db || !profile) throw new Error('Connecte-toi au jeu pour changer de pseudo.');
    if (!/^[\p{L}\p{N}_-]{3,24}$/u.test(newName)) {
      throw new Error('Le pseudo doit contenir 3 à 24 caractères : lettres, chiffres, _ ou -.');
    }
    if (newName === profile.displayName) {
      throw new Error('Choisis un pseudo différent de ton pseudo actuel.');
    }

    const usernameLower = newName.toLowerCase();
    const playerRef = db.doc(`players/${user.uid}`);
    const newUsernameRef = db.doc(`usernames/${usernameLower}`);
    const oldUsernameRef = typeof profile.usernameLower === 'string' && profile.usernameLower
      ? db.doc(`usernames/${profile.usernameLower}`) : null;
    const publicProfileRef = db.doc(`publicProfiles/${user.uid}`);
    const leaderboardRef = db.doc(`leaderboards/single-game/entries/${user.uid}`);
    let failedOperation = 'transaction setup';

    try {
      await db.runTransaction(async transaction => {
        failedOperation = `read ${playerRef.path}`;
        const playerSnapshot = await transaction.get(playerRef);
        failedOperation = `read ${newUsernameRef.path}`;
        const newUsernameSnapshot = await transaction.get(newUsernameRef);
        let oldUsernameSnapshot = null;
        if (oldUsernameRef) {
          failedOperation = `read ${oldUsernameRef.path}`;
          oldUsernameSnapshot = await transaction.get(oldUsernameRef);
        }
        failedOperation = `read ${publicProfileRef.path}`;
        const publicProfileSnapshot = await transaction.get(publicProfileRef);
        failedOperation = `read ${leaderboardRef.path}`;
        await transaction.get(leaderboardRef);

        failedOperation = `validate ${playerRef.path}`;
        if (!playerSnapshot.exists) throw new Error('Ton profil Firestore est introuvable.');
        const player = playerSnapshot.data();
        const lastChange = player.lastPseudoChangeAt;
        if (lastChange && typeof lastChange.toDate !== 'function') {
          throw new Error('La date du dernier changement est invalide. Contacte le support.');
        }
        if (lastChange &&
            lastChange.toDate().getTime() + PSEUDO_CHANGE_COOLDOWN_MS > Date.now()) {
          throw new Error('Le délai de 7 jours après ton dernier changement n’est pas terminé.');
        }
        if (newUsernameSnapshot.exists &&
            (newUsernameSnapshot.data().uid !== user.uid ||
             usernameLower !== player.usernameLower)) {
          throw new Error('Ce pseudo est déjà utilisé. Choisis-en un autre.');
        }
        failedOperation = `validate or create ${publicProfileRef.path}`;
        if (!publicProfileSnapshot.exists &&
            (!player.createdAt || typeof player.createdAt.toDate !== 'function')) {
          throw new Error('Le profil joueur ne contient pas de date de création valide; le profil public ne peut pas être réparé sans modifier ses données.');
        }
        const statistics = player.statistics || {};
        if (!Number.isSafeInteger(player.bestSingleGameLines) ||
            player.bestSingleGameLines < 0 || !Number.isSafeInteger(player.level) ||
            !Number.isSafeInteger(statistics.bestScore)) {
          throw new Error('Les données du classement sont invalides. Aucun changement n’a été effectué.');
        }

        const serverTimestamp = firebase.firestore.FieldValue.serverTimestamp();
        failedOperation = `commit ${playerRef.path}`;
        transaction.update(playerRef, {
          displayName: newName,
          usernameLower,
          lastPseudoChangeAt: serverTimestamp,
          updatedAt: serverTimestamp
        });
        failedOperation = `${publicProfileSnapshot.exists ? 'update' : 'create'} ${publicProfileRef.path}`;
        if (publicProfileSnapshot.exists) {
          transaction.update(publicProfileRef, { displayName: newName, usernameLower });
        } else {
          transaction.set(publicProfileRef, {
            displayName: newName,
            usernameLower,
            createdAt: player.createdAt
          });
        }
        if (!newUsernameSnapshot.exists) {
          failedOperation = `create ${newUsernameRef.path}`;
          transaction.set(newUsernameRef, { uid: user.uid });
        }
        if (oldUsernameRef && oldUsernameSnapshot?.exists &&
            oldUsernameRef.path !== newUsernameRef.path &&
            oldUsernameSnapshot.data().uid === user.uid) {
          failedOperation = `delete ${oldUsernameRef.path}`;
          transaction.delete(oldUsernameRef);
        }
        failedOperation = `commit ${leaderboardRef.path}`;
        transaction.set(leaderboardRef, {
          uid: user.uid,
          displayName: newName,
          usernameLower,
          lines: player.bestSingleGameLines,
          bestScore: statistics.bestScore,
          level: player.level,
          updatedAt: serverTimestamp
        });
        failedOperation = 'commit atomic transaction (Firestore does not identify the denied write)';
      });
    } catch (error) {
      console.error('Échec détaillé du changement de pseudo.', {
        operation: failedOperation,
        uid: user.uid,
        code: error.code || 'unknown',
        message: error.message || String(error)
      }, error);
      error.pseudoChangeOperation = failedOperation;
      throw error;
    }

    if (currentUser?.uid === user.uid) {
      profile = {
        ...profile,
        displayName: newName,
        usernameLower,
        lastPseudoChangeAt: firebase.firestore.Timestamp.now()
      };
      refreshPage();
    }
  }

  function setupSettings() {
    const music = document.getElementById('music');
    if (!document.getElementById('musicVolume')) return;
    if (!document.getElementById('changePseudo')) {
      const accountSection = Array.from(document.querySelectorAll('.section'))
        .find(section => section.querySelector('h2')?.textContent.trim() === 'COMPTE');
      if (accountSection) {
        const pseudoSection = document.createElement('details');
        pseudoSection.className = 'section';
        pseudoSection.innerHTML = '<summary><h2>CHANGER DE PSEUDO</h2><span class="chevron" aria-hidden="true">&#8964;</span></summary><div class="sub">Choisis un pseudo de 3 à 24 caractères (lettres, chiffres, _ ou -). Le premier changement est immédiat, puis un délai de 7 jours s’applique après chaque changement.</div><div class="sub" id="currentPseudo"></div><label class="field" for="newPseudo">Nouveau pseudo BLOCK ARENA</label><input class="textinput" id="newPseudo" type="text" minlength="3" maxlength="24" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Nouveau pseudo"><button class="primary pseudo-change-button" id="changePseudo" type="button" disabled>CHANGER DE PSEUDO</button><div class="message" id="pseudoChangeMessage" aria-live="polite"></div><div class="note" id="pseudoCooldown" aria-live="polite">Chargement du profil…</div>';
        accountSection.after(pseudoSection);
      }
    }
    renderSettings();
    const pseudoButton = document.getElementById('changePseudo');
    if (pseudoButton && pseudoButton.dataset.bound !== 'true') {
      pseudoButton.dataset.bound = 'true';
      pseudoButton.addEventListener('click', async () => {
        const message = document.getElementById('pseudoChangeMessage');
        pseudoButton.disabled = true;
        message.textContent = 'Enregistrement du pseudo…';
        try {
          await changePlayerPseudo(document.getElementById('newPseudo').value);
          document.getElementById('newPseudo').value = '';
          message.textContent = 'Pseudo modifié. Le prochain changement sera disponible dans 7 jours.';
        } catch (error) {
          console.error('Échec du changement de pseudo BLOCK ARENA.', error);
          const operation = error.pseudoChangeOperation || 'validation ou transaction Firestore';
          const code = error.code || 'unknown';
          message.textContent = `Échec : ${operation} (${code}). ${publicError(error)}`;
        } finally {
          renderPseudoChangeStatus();
        }
      });
    }
    if (pseudoChangeCountdownInterval === null && pseudoButton) {
      pseudoChangeCountdownInterval = window.setInterval(renderPseudoChangeStatus, 1000);
    }
    const persist = async () => {
      data.settings = {
        music: music ? music.checked : data.settings.music,
        musicVolume: Number(document.getElementById('musicVolume').value),
        blocksVolume: Number(document.getElementById('blocksVolume').value)
      };
      try {
        await savePreferences(data);
      } catch (error) {
        console.error('Enregistrement des préférences impossible.', error);
        connectionNotice(`Paramètres non synchronisés : ${publicError(error)}`, true);
      }
    };
    ['music', 'musicVolume', 'blocksVolume'].forEach(id => {
      const input = document.getElementById(id);
      if (!input) return;
      input.addEventListener('input', () => {
        data.settings = {
          music: music ? music.checked : data.settings.music,
          musicVolume: Number(document.getElementById('musicVolume').value),
          blocksVolume: Number(document.getElementById('blocksVolume').value)
        };
        updateSettingsDisplay();
      });
      input.addEventListener('change', persist);
    });
  }

  function appendEmpty(container, message) {
    container.replaceChildren();
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = message;
    container.append(empty);
  }

  function renderPeople(container, people, actions, onSelect, options = {}) {
    container.replaceChildren();
    people.forEach(personData => {
      const person = document.createElement('div');
      person.className = 'person';
      const avatar = document.createElement('div');
      avatar.className = 'avatar';
      avatar.textContent = (personData.displayName || '?').slice(0, 1).toUpperCase();
      const details = document.createElement('div');
      details.className = 'person-details';
      const name = document.createElement('strong');
      name.textContent = personData.displayName || 'Joueur';
      const info = document.createElement('small');
      info.textContent = personData.info || 'Compte Firebase';
      details.append(name, info);
      if (onSelect) {
        const trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.className = 'person-trigger';
        trigger.setAttribute('aria-expanded', 'false');
        trigger.addEventListener('click', () => onSelect(personData, person, trigger));
        if (!options.hideAvatar) trigger.append(avatar);
        if (options.hideInfo) details.removeChild(info);
        trigger.append(details);
        person.append(trigger);
      } else {
        if (!options.hideAvatar) person.append(avatar);
        if (options.hideInfo) details.removeChild(info);
        person.append(details);
      }
      if (actions) person.append(actions(personData));
      container.append(person);
    });
  }

  async function getRelations(collectionName) {
    if (!currentUser) return [];
    const snapshot = await db.collection(`players/${currentUser.uid}/${collectionName}`).get();
    return snapshot.docs.map(doc => doc.id);
  }

  async function searchPlayers(query) {
    const normalized = query.trim().toLocaleLowerCase('fr');
    if (!normalized || !currentUser) return [];
    const snapshot = await db.collection('publicProfiles')
      .orderBy('usernameLower')
      .startAt(normalized)
      .endAt(`${normalized}\uf8ff`)
      .limit(10)
      .get();
    return snapshot.docs.filter(doc => doc.id !== currentUser.uid).map(doc => ({ uid: doc.id, ...doc.data() }));
  }

  async function sendFriendRequest(targetUid) {
    const user = currentUser;
    if (!user || targetUid === user.uid) throw new Error('Cette demande d’ami n’est pas valide.');
    const outgoingRef = db.doc(`players/${user.uid}/friendRequestsSent/${targetUid}`);
    const incomingRef = db.doc(`players/${targetUid}/friendRequestsReceived/${user.uid}`);
    const blockedRef = db.doc(`players/${user.uid}/blocked/${targetUid}`);
    await db.runTransaction(async transaction => {
      const [outgoing, incoming, blocked] = await Promise.all([
        transaction.get(outgoingRef),
        transaction.get(incomingRef),
        transaction.get(blockedRef)
      ]);
      if (blocked.exists) throw new Error('Débloque ce joueur avant de lui envoyer une demande.');
      if (outgoing.exists || incoming.exists) {
        throw new Error('Une demande existe déjà entre ces deux comptes.');
      }
      const now = firebase.firestore.FieldValue.serverTimestamp();
      const request = {
        fromUid: user.uid,
        toUid: targetUid,
        status: 'pending',
        createdAt: now,
        updatedAt: now
      };
      transaction.set(outgoingRef, request);
      transaction.set(incomingRef, request);
    });
  }

  async function respondToFriendRequest(fromUid, accept) {
    const user = currentUser;
    if (!user || fromUid === user.uid) throw new Error('Cette demande d’ami n’est pas valide.');
    const receivedRef = db.doc(`players/${user.uid}/friendRequestsReceived/${fromUid}`);
    const sentRef = db.doc(`players/${fromUid}/friendRequestsSent/${user.uid}`);
    const reciprocalSentRef = db.doc(`players/${user.uid}/friendRequestsSent/${fromUid}`);
    const reciprocalReceivedRef = db.doc(`players/${fromUid}/friendRequestsReceived/${user.uid}`);
    const ownFriendRef = db.doc(`players/${user.uid}/friends/${fromUid}`);
    const otherFriendRef = db.doc(`players/${fromUid}/friends/${user.uid}`);
    await db.runTransaction(async transaction => {
      const [received, sent, reciprocalSent, reciprocalReceived, ownFriend, otherFriend] = await Promise.all([
        transaction.get(receivedRef),
        transaction.get(sentRef),
        transaction.get(reciprocalSentRef),
        transaction.get(reciprocalReceivedRef),
        transaction.get(ownFriendRef),
        transaction.get(otherFriendRef)
      ]);
      if (!received.exists || !sent.exists ||
          received.data().status !== 'pending' || sent.data().status !== 'pending' ||
          received.data().fromUid !== fromUid || received.data().toUid !== user.uid ||
          sent.data().fromUid !== fromUid || sent.data().toUid !== user.uid) {
        throw new Error('Cette demande n’est plus en attente ou ses données sont incohérentes.');
      }
      const status = accept ? 'accepted' : 'rejected';
      const now = firebase.firestore.FieldValue.serverTimestamp();
      transaction.update(receivedRef, { status, updatedAt: now, respondedAt: now });
      transaction.update(sentRef, { status, updatedAt: now, respondedAt: now });
      if (accept) {
        if (reciprocalSent.exists && reciprocalReceived.exists &&
            reciprocalSent.data().status === 'pending' &&
            reciprocalReceived.data().status === 'pending') {
          transaction.update(reciprocalSentRef, { status, updatedAt: now, respondedAt: now });
          transaction.update(reciprocalReceivedRef, { status, updatedAt: now, respondedAt: now });
        }
        if (!ownFriend.exists) transaction.set(ownFriendRef, { createdAt: now });
        if (!otherFriend.exists) transaction.set(otherFriendRef, { createdAt: now });
      }
    });
  }

  async function removeFriend(otherUid) {
    const user = currentUser;
    if (!user || otherUid === user.uid) throw new Error('Cet ami n’est pas valide.');
    const refs = [
      db.doc(`players/${user.uid}/friends/${otherUid}`),
      db.doc(`players/${otherUid}/friends/${user.uid}`),
      db.doc(`players/${user.uid}/friendRequestsSent/${otherUid}`),
      db.doc(`players/${user.uid}/friendRequestsReceived/${otherUid}`),
      db.doc(`players/${otherUid}/friendRequestsSent/${user.uid}`),
      db.doc(`players/${otherUid}/friendRequestsReceived/${user.uid}`)
    ];
    await db.runTransaction(async transaction => {
      const snapshots = await Promise.all(refs.map(ref => transaction.get(ref)));
      if (!snapshots[0].exists && !snapshots[1].exists) {
        throw new Error('Cette relation d’amitié n’existe plus.');
      }
      snapshots.forEach((snapshot, index) => {
        if (snapshot.exists) transaction.delete(refs[index]);
      });
    });
  }

  async function blockPlayer(otherUid) {
    const user = currentUser;
    if (!user || otherUid === user.uid) throw new Error('Ce joueur ne peut pas être bloqué.');
    const refs = [
      db.doc(`players/${user.uid}/blocked/${otherUid}`),
      db.doc(`players/${user.uid}/friends/${otherUid}`),
      db.doc(`players/${otherUid}/friends/${user.uid}`),
      db.doc(`players/${user.uid}/friendRequestsSent/${otherUid}`),
      db.doc(`players/${user.uid}/friendRequestsReceived/${otherUid}`),
      db.doc(`players/${otherUid}/friendRequestsSent/${user.uid}`),
      db.doc(`players/${otherUid}/friendRequestsReceived/${user.uid}`)
    ];
    await db.runTransaction(async transaction => {
      const snapshots = await Promise.all(refs.map(ref => transaction.get(ref)));
      transaction.set(refs[0], {
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      snapshots.slice(1).forEach((snapshot, index) => {
        if (snapshot.exists) transaction.delete(refs[index + 1]);
      });
    });
  }

  async function unblockPlayer(otherUid) {
    const user = currentUser;
    if (!user || otherUid === user.uid) throw new Error('Ce joueur ne peut pas être débloqué.');
    await db.doc(`players/${user.uid}/blocked/${otherUid}`).delete();
  }

  function bindFriendFoldouts() {
    [
      ['receivedRequestsToggle', 'receivedRequests'],
      ['sentRequestsToggle', 'sentRequests'],
      ['blockedToggle', 'blockedPeople']
    ].forEach(([toggleId, contentId]) => {
      const toggle = document.getElementById(toggleId);
      const content = document.getElementById(contentId);
      if (!toggle || !content || toggle.dataset.foldBound === 'true') return;
      toggle.dataset.foldBound = 'true';
      toggle.addEventListener('click', () => {
        const expanded = toggle.getAttribute('aria-expanded') !== 'true';
        toggle.setAttribute('aria-expanded', String(expanded));
        content.hidden = !expanded;
      });
    });
  }

  async function setupFriends() {
    const input = document.getElementById('search');
    const friendList = document.getElementById('friendList');
    const resultsContainer = document.createElement('div');
    document.getElementById('searchNote').after(resultsContainer);
    const receivedRequests = document.getElementById('receivedRequests');
    const sentRequests = document.getElementById('sentRequests');
    const blockedPeople = document.getElementById('blockedPeople');
    bindFriendFoldouts();

    async function renderRelations() {
      if (!currentUser) return;
      const [friendIds, blockedIds, receivedSnapshot, sentSnapshot] = await Promise.all([
        getRelations('friends'),
        getRelations('blocked'),
        db.collection(`players/${currentUser.uid}/friendRequestsReceived`).get(),
        db.collection(`players/${currentUser.uid}/friendRequestsSent`).get()
      ]);
      const pendingReceived = receivedSnapshot.docs.filter(doc => doc.data().status === 'pending');
      const pendingSent = sentSnapshot.docs.filter(doc => doc.data().status === 'pending');
      document.getElementById('friendCount').textContent = `${friendIds.length} ${friendIds.length === 1 ? 'ami' : 'amis'}`;
      if (friendIds.length) {
        const snapshots = await Promise.all(friendIds.map(uid => db.doc(`publicProfiles/${uid}`).get()));
        const friends = snapshots.map(doc => ({
          uid: doc.id,
          info: 'Statut indisponible',
          ...(doc.exists ? doc.data() : { displayName: doc.id })
        }));
        renderPeople(friendList, friends, personData => {
          const menu = document.createElement('div');
          menu.className = 'person-actions friend-menu';
          menu.hidden = true;
          const remove = document.createElement('button');
          remove.type = 'button';
          remove.textContent = 'Supprimer cet ami';
          remove.addEventListener('click', async () => {
            if (!window.confirm(`Supprimer ${personData.displayName || 'cet ami'} de ta liste ?`)) return;
            try {
              await removeFriend(personData.uid);
              await renderRelations();
              await renderSearch();
            } catch (error) {
              connectionNotice(`Suppression impossible : ${publicError(error)}`, true);
            }
          });
          const block = document.createElement('button');
          block.type = 'button';
          block.textContent = 'Bloquer';
          block.addEventListener('click', async () => {
            if (!window.confirm(`Bloquer ${personData.displayName || 'ce joueur'} ? Il sera aussi retiré de ta liste d’amis.`)) return;
            try {
              await blockPlayer(personData.uid);
              await renderRelations();
              await renderSearch();
            } catch (error) {
              connectionNotice(`Blocage impossible : ${publicError(error)}`, true);
            }
          });
          menu.append(remove, block);
          return menu;
        }, (_personData, row, trigger) => {
          const menu = row.querySelector('.friend-menu');
          menu.hidden = !menu.hidden;
          trigger.setAttribute('aria-expanded', String(!menu.hidden));
        }, { hideAvatar: true });
      } else {
        appendEmpty(friendList, 'Aucun ami pour le moment.');
      }
      document.getElementById('receivedRequestCount').textContent = String(pendingReceived.length);
      if (pendingReceived.length) {
        const snapshots = await Promise.all(pendingReceived.map(doc =>
          db.doc(`publicProfiles/${doc.data().fromUid}`).get()));
        renderPeople(receivedRequests, snapshots.filter(doc => doc.exists)
          .map(doc => ({ uid: doc.id, ...doc.data() })), person => {
          const actions = document.createElement('div');
          actions.className = 'person-actions';
          const accept = document.createElement('button');
          accept.type = 'button';
          accept.textContent = 'Accepter';
          accept.addEventListener('click', async () => {
            try {
              await respondToFriendRequest(person.uid, true);
              await renderRelations();
            } catch (error) {
              connectionNotice(`Acceptation impossible : ${publicError(error)}`, true);
            }
          });
          const reject = document.createElement('button');
          reject.type = 'button';
          reject.textContent = 'Refuser';
          reject.addEventListener('click', async () => {
            try {
              await respondToFriendRequest(person.uid, false);
              await renderRelations();
            } catch (error) {
              connectionNotice(`Refus impossible : ${publicError(error)}`, true);
            }
          });
          actions.append(accept, reject);
          return actions;
        });
      } else {
        appendEmpty(receivedRequests, 'Aucune demande reçue.');
      }
      document.getElementById('sentRequestCount').textContent = String(pendingSent.length);
      if (pendingSent.length) {
        const snapshots = await Promise.all(pendingSent.map(doc =>
          db.doc(`publicProfiles/${doc.data().toUid}`).get()));
        renderPeople(sentRequests, snapshots.filter(doc => doc.exists).map(doc => ({
          uid: doc.id, ...doc.data(), info: 'En attente de réponse'
        })), null);
      } else {
        appendEmpty(sentRequests, 'Aucune demande envoyée.');
      }
      document.getElementById('blockedCount').textContent = String(blockedIds.length);
      if (blockedIds.length) {
        const snapshots = await Promise.all(blockedIds.map(uid => db.doc(`publicProfiles/${uid}`).get()));
        renderPeople(blockedPeople, snapshots.map(doc => ({
          uid: doc.id,
          ...(doc.exists ? doc.data() : { displayName: doc.id })
        })), personData => {
          const actions = document.createElement('div');
          actions.className = 'person-actions';
          const unblock = document.createElement('button');
          unblock.type = 'button';
          unblock.textContent = 'Débloquer';
          unblock.addEventListener('click', async () => {
            if (!window.confirm(`Débloquer ${personData.displayName || 'ce joueur'} ?`)) return;
            try {
              await unblockPlayer(personData.uid);
              await renderRelations();
              await renderSearch();
            } catch (error) {
              connectionNotice(`Déblocage impossible : ${publicError(error)}`, true);
            }
          });
          actions.append(unblock);
          return actions;
        });
      } else {
        appendEmpty(blockedPeople, 'Aucune personne bloquée.');
      }
    }

    async function renderSearch() {
      const note = document.getElementById('searchNote');
      resultsContainer.replaceChildren();
      if (!input.value.trim()) {
        note.textContent = 'Saisis un pseudo pour rechercher un joueur.';
        return;
      }
      if (!currentUser) {
        note.textContent = 'Connecte-toi à Firebase pour rechercher des joueurs.';
        return;
      }
      note.textContent = 'Recherche…';
      try {
        const [players, friendIds, blockedIds] = await Promise.all([
          searchPlayers(input.value),
          getRelations('friends'),
          getRelations('blocked')
        ]);
        const [sentSnapshot, receivedSnapshot] = await Promise.all([
          db.collection(`players/${currentUser.uid}/friendRequestsSent`).get(),
          db.collection(`players/${currentUser.uid}/friendRequestsReceived`).get()
        ]);
        const sentIds = sentSnapshot.docs.filter(doc => doc.data().status === 'pending').map(doc => doc.id);
        const incomingIds = receivedSnapshot.docs.filter(doc => doc.data().status === 'pending').map(doc => doc.id);
        const visiblePlayers = players.filter(player =>
          !friendIds.includes(player.uid) && !blockedIds.includes(player.uid));
        if (!visiblePlayers.length) {
          note.textContent = 'Aucun joueur trouvé.';
          return;
        }
        note.textContent = '';
        renderPeople(resultsContainer, visiblePlayers.map(player => ({ ...player, info: 'Joueur Firebase' })), player => {
          const actions = document.createElement('div');
          actions.className = 'person-actions';
          const add = document.createElement('button');
          add.type = 'button';
          const hasIncomingRequest = incomingIds.includes(player.uid);
          add.textContent = hasIncomingRequest
            ? 'Accepter' : sentIds.includes(player.uid) ? 'Demande envoyée' : 'Ajouter';
          add.disabled = sentIds.includes(player.uid);
          add.addEventListener('click', async () => {
            try {
              if (hasIncomingRequest) await respondToFriendRequest(player.uid, true);
              else await sendFriendRequest(player.uid);
              await renderRelations();
              await renderSearch();
            } catch (error) {
              connectionNotice(`Demande d’ami impossible : ${publicError(error)}`, true);
            }
          });
          const block = document.createElement('button');
          block.type = 'button';
          block.textContent = 'Bloquer';
          block.addEventListener('click', async () => {
            if (!window.confirm(`Bloquer ${player.displayName || 'ce joueur'} ?`)) return;
            try {
              await blockPlayer(player.uid);
              await renderRelations();
              await renderSearch();
            } catch (error) {
              connectionNotice(`Blocage impossible : ${publicError(error)}`, true);
            }
          });
          actions.append(add, block);
          return actions;
        });
      } catch (error) {
        console.error('Recherche de joueurs Firebase impossible.', error);
        note.textContent = `Recherche impossible : ${publicError(error)}`;
      }
    }

    if (input.dataset.friendSearchBound !== 'true') {
      input.dataset.friendSearchBound = 'true';
      input.addEventListener('input', renderSearch);
    }
    try {
      await renderRelations();
    } catch (error) {
      console.error('Chargement des relations Firebase impossible.', error);
      connectionNotice(`Impossible de charger les amis et demandes : ${publicError(error)}`, true);
    }
    if (input.value) await renderSearch();
  }

  function renderPlayerList(container, players, emptyMessage) {
    if (!players.length) {
      appendEmpty(container, emptyMessage);
      return;
    }
    container.replaceChildren();
    players.forEach((player, index) => {
      const entry = document.createElement('div');
      entry.className = 'entry';
      const rank = document.createElement('div');
      rank.className = 'rank';
      const position = player.rank || index + 1;
      rank.textContent = position === 1 ? '1er' : `${position}e`;
      const name = document.createElement('div');
      name.className = 'name';
      name.textContent = player.displayName || 'Joueur';
      const tag = document.createElement('span');
      tag.className = 'tag';
      tag.textContent = player.isCurrent ? 'Ton profil' : 'Joueur';
      name.append(tag);
      const score = document.createElement('div');
      score.className = 'score';
      score.append(document.createTextNode(Number(player.lines || 0).toLocaleString('fr-FR')));
      const unit = document.createElement('small');
      unit.textContent = 'lignes';
      score.append(unit);
      entry.append(rank, name, score);
      container.append(entry);
    });
  }

  function getVisibleLeaderboard(players, currentUid) {
    const rankedPlayers = [...players]
      .sort((a, b) => b.lines - a.lines || a.uid.localeCompare(b.uid))
      .map((player, index) => ({
        ...player,
        rank: index + 1,
        isCurrent: player.uid === currentUid
      }));
    const visiblePlayers = rankedPlayers.slice(0, 7);
    const currentPlayer = rankedPlayers.find(player => player.uid === currentUid);
    if (currentPlayer && currentPlayer.rank > 7) visiblePlayers.push(currentPlayer);
    return visiblePlayers;
  }

  function setupLeaderboards() {
    const worldList = document.getElementById('worldList');
    const friendsList = document.getElementById('friendsList');
    if (worldLeaderboardUnsubscribe) {
      worldLeaderboardUnsubscribe();
      worldLeaderboardUnsubscribe = null;
    }
    if (ownLeaderboardUnsubscribe) {
      ownLeaderboardUnsubscribe();
      ownLeaderboardUnsubscribe = null;
    }
    if (ownProfileLeaderboardUnsubscribe) {
      ownProfileLeaderboardUnsubscribe();
      ownProfileLeaderboardUnsubscribe = null;
    }
    worldLeaderboardEntries = [];
    ownLeaderboardEntry = null;
    ownProfileLeaderboardEntry = null;
    if (!currentUser) {
      appendEmpty(worldList, 'Connecte-toi à Firebase pour consulter le classement.');
      appendEmpty(friendsList, 'Connecte-toi à Firebase pour consulter le classement.');
      return;
    }
    appendEmpty(worldList, 'Chargement du classement…');
    const leaderboardUserId = currentUser.uid;
    const renderWorldLeaderboard = () => {
      const entriesByUid = new Map(worldLeaderboardEntries.map(player => [player.uid, player]));
      const ownEntries = [ownProfileLeaderboardEntry, ownLeaderboardEntry].filter(Boolean);
      if (ownEntries.length) {
        const bestOwnEntry = ownEntries.reduce((best, entry) =>
          entry.lines > best.lines ? entry : best);
        entriesByUid.set(leaderboardUserId, {
          ...bestOwnEntry,
          lines: Math.max(...ownEntries.map(entry => entry.lines)),
          isCurrent: true
        });
      }
      renderPlayerList(worldList,
        getVisibleLeaderboard([...entriesByUid.values()], leaderboardUserId),
        'Aucun joueur enregistré pour le moment.');
    };
    ownLeaderboardUnsubscribe = db.doc(
      `leaderboards/single-game/entries/${leaderboardUserId}`
    ).onSnapshot(entrySnapshot => {
      if (currentUser?.uid !== leaderboardUserId) return;
      ownLeaderboardEntry = entrySnapshot.exists
        ? { uid: leaderboardUserId, ...entrySnapshot.data(), isCurrent: true }
        : null;
      renderWorldLeaderboard();
    }, error => {
      if (currentUser?.uid !== leaderboardUserId) return;
      console.error('Lecture de ton entrée au classement mondial impossible.', error);
    });
    ownProfileLeaderboardUnsubscribe = db.doc(`players/${leaderboardUserId}`)
      .onSnapshot(async playerSnapshot => {
        if (currentUser?.uid !== leaderboardUserId || !playerSnapshot.exists) return;
        try {
          const player = playerSnapshot.data();
          const identity = getLeaderboardIdentity(player);
          if (!identity.matchesProfile) return;
          let lines = player.bestSingleGameLines;
          if (lines === undefined) {
            const historySnapshot = await db.collection(
              `players/${leaderboardUserId}/processedGames`
            ).orderBy('lines', 'desc').limit(1).get();
            if (currentUser?.uid !== leaderboardUserId) return;
            lines = historySnapshot.empty ? 0 : historySnapshot.docs[0].data().lines;
          }
          if (!Number.isSafeInteger(lines) || lines < 0) {
            throw new Error('Le record personnel de lignes sauvegardé est invalide.');
          }
          ownProfileLeaderboardEntry = {
            uid: leaderboardUserId,
            displayName: identity.displayName,
            usernameLower: identity.usernameLower,
            lines,
            bestScore: Number.isSafeInteger(player.statistics?.bestScore)
              ? player.statistics.bestScore : 0,
            level: Number.isSafeInteger(player.level) ? player.level : 1,
            isCurrent: true
          };
          renderWorldLeaderboard();
        } catch (error) {
          console.error('Lecture du record personnel pour le classement mondial impossible.', {
            uid: leaderboardUserId,
            message: error.message || String(error)
          }, error);
        }
      }, error => {
        if (currentUser?.uid !== leaderboardUserId) return;
        console.error('Lecture de ton profil pour le classement mondial impossible.', error);
      });
    worldLeaderboardUnsubscribe = db.collection('leaderboards/single-game/entries')
      .orderBy('lines', 'desc')
      .orderBy(firebase.firestore.FieldPath.documentId(), 'asc')
      .onSnapshot(worldSnapshot => {
        if (currentUser?.uid !== leaderboardUserId) return;
        worldLeaderboardEntries = worldSnapshot.docs.map(doc => ({
          uid: doc.id, ...doc.data(), isCurrent: doc.id === leaderboardUserId
        }));
        renderWorldLeaderboard();
      }, error => {
        if (currentUser?.uid !== leaderboardUserId) return;
        console.error('Lecture du classement mondial Firebase impossible.', error);
        appendEmpty(worldList, `Classement indisponible : ${publicError(error)}`);
      });
    loadFirebaseFunctionsSdk()
      .then(() => firebase.app().functions('europe-west1')
        .httpsCallable('syncWorldLeaderboard')())
      .catch(error => {
        if (currentUser?.uid !== leaderboardUserId) return;
        console.error('Synchronisation initiale du TOP 7 mondial impossible.', error);
      });

    appendEmpty(friendsList, 'Chargement du classement amis…');
    friendsLeaderboardUnsubscribe = db.collection(`players/${leaderboardUserId}/friends`)
      .onSnapshot(friendSnapshot => {
        if (currentUser?.uid !== leaderboardUserId) return;
        const friendIds = new Set([
          leaderboardUserId,
          ...friendSnapshot.docs.map(friend => friend.id)
            .filter(uid => uid !== leaderboardUserId)
        ]);
        for (const [uid, unsubscribe] of friendLeaderboardUnsubscribes) {
          if (!friendIds.has(uid)) {
            unsubscribe();
            friendLeaderboardUnsubscribes.delete(uid);
            friendLeaderboardEntries.delete(uid);
          }
        }
        for (const uid of friendIds) {
          if (friendLeaderboardUnsubscribes.has(uid)) continue;
          const unsubscribe = db.doc(`leaderboards/single-game/entries/${uid}`)
            .onSnapshot(entrySnapshot => {
              if (currentUser?.uid !== leaderboardUserId) return;
              if (entrySnapshot.exists) {
                friendLeaderboardEntries.set(uid, { uid, ...entrySnapshot.data() });
              } else {
                friendLeaderboardEntries.delete(uid);
              }
              const friends = getVisibleLeaderboard(
                [...friendLeaderboardEntries.values()], leaderboardUserId
              );
              renderPlayerList(friendsList, friends,
                'Aucun ami avec un profil de jeu enregistré.');
            }, error => {
              if (currentUser?.uid !== leaderboardUserId) return;
              console.error('Lecture du score d’un ami impossible.', { uid, error });
              connectionNotice(`Classement amis indisponible : ${publicError(error)}`, true);
            });
          friendLeaderboardUnsubscribes.set(uid, unsubscribe);
        }
        const friends = getVisibleLeaderboard(
          [...friendLeaderboardEntries.values()], leaderboardUserId
        );
        renderPlayerList(friendsList, friends,
          friendIds.size > 1
            ? 'Chargement des scores de tes amis…'
            : 'Aucun ami pour le moment.');
      }, error => {
        if (currentUser?.uid !== leaderboardUserId) return;
        console.error('Lecture de la liste d’amis Firebase impossible.', error);
        appendEmpty(friendsList, `Classement amis indisponible : ${publicError(error)}`);
      });
  }

  function bindBackButtons() {
    document.addEventListener('click', event => {
      if (!event.target.closest('.back, #backTop, #backBottom')) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (document.getElementById('board')) {
        const quitGame = window.TetrisGame?.quit;
        if (typeof quitGame === 'function') quitGame();
        else connectionNotice('Retour bloqué : le jeu n’est pas prêt à sauvegarder cette partie.', true);
        return;
      }
      go('salon');
    }, true);
  }

  function initializePage() {
    if (initialized) return;
    initialized = true;
    bindBackButtons();
    bindFriendFoldouts();
    showPendingQuestCompletionNotice();

    if (document.getElementById('creditCount')) startShopCountdown();

    if (document.getElementById('form')) {
      const back = document.createElement('button');
      back.type = 'button';
      back.className = 'link';
      back.textContent = '← Retour au salon';
      back.addEventListener('click', () => go('salon'));
      document.querySelector('.panel').append(back);
      return;
    }

    setupXpBoostIndicator();
    setupSettings();
    setupLocker();
    if (document.querySelector('.identity')) {
      const menu = document.querySelector('.menu');
      if (menu && !menu.querySelector('[data-page="Quêtes"]')) {
        const questsButton = document.createElement('button');
        questsButton.type = 'button';
        questsButton.dataset.page = 'Quêtes';
        const icon = document.createElement('span');
        icon.className = 'emoji';
        icon.textContent = '✦';
        questsButton.append(icon, document.createTextNode(' QUÊTES'));
        menu.insertBefore(questsButton, menu.children[1] || null);
      }
      document.querySelectorAll('[data-page]').forEach(button => button.addEventListener('click', event => {
        event.preventDefault();
        const page = button.dataset.page.toLocaleLowerCase('fr')
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '');
        const pages = {
          jouer: 'jouer', amis: 'amis', boutique: 'boutique', battlepass: 'battlepass',
          classement: 'classement', parametres: 'parametres', quetes: 'quetes',
          'aide/infos': 'aide', casier: 'casier'
        };
        go(pages[page]);
      }));
    }

    if (document.getElementById('cards')) {
      renderBattlePass();
      startBattlePassCountdown();
    }
    const worldList = document.getElementById('worldList');
    const friendsList = document.getElementById('friendsList');
    if (worldList && friendsList) {
      if (!currentUser) {
        appendEmpty(worldList, 'Connecte-toi à Firebase pour consulter le classement.');
        appendEmpty(friendsList, 'Connecte-toi à Firebase pour consulter le classement.');
      }
    }

    if (document.getElementById('board')) {
      window.addEventListener('TetrisGameOver', event => {
        submitGameResult(event.detail);
      });
      window.addEventListener('TetrisNewRunRequest', () => beginGameSession(true));
      window.addEventListener('TetrisPauseState', event => {
        if (event.detail?.sessionId === window.TetrisGame?.getSessionId?.()) {
          renderXpBoostIndicator();
        }
      });
      document.addEventListener('visibilitychange', () => {
        const game = window.TetrisGame;
        if (document.hidden && game && !game.isPaused) {
          visibilityPausedGame = true;
          game.pause();
        } else if (!document.hidden && visibilityPausedGame && game) {
          visibilityPausedGame = false;
          game.resume();
        }
      });
    }

    document.addEventListener('click', event => {
      const pageTitle = document.getElementById('pageTitle');
      if (!pageTitle) return;
      let page = Number(pageTitle.dataset.page || 0);
      if (event.target.closest('#prev')) page = Math.max(0, page - 1);
      else if (event.target.closest('#nextPage')) page = Math.min(BATTLE_PASS_PAGES - 1, page + 1);
      else return;
      event.preventDefault();
      event.stopImmediatePropagation();
      pageTitle.dataset.page = String(page);
      renderBattlePass();
    }, true);

    refreshPage();
    if (currentUser) attachUser(currentUser);
  }

  window.TetrisApp = {
    createAccount,
    signIn,
    signInWithGoogle,
    sendPasswordReset,
    changePassword,
    signOut,
    submitGameResult,
    get currentUser() { return currentUser; },
    get profile() { return profile; },
    get data() { return data; },
    go
  };

  firebaseInitPromise = initializeFirebase();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePage, { once: true });
  } else {
    initializePage();
  }
})();
