(() => {
  'use strict';

  const W = 10;
  const H = 20;
  const canvas = document.getElementById('board');
  const ctx = canvas.getContext('2d');
  const nextCanvas = document.getElementById('next');
  const nextContext = nextCanvas.getContext('2d');
  const placeSound = new Audio('song%20pose%20de%20forme/vadim_makes_sound-soft-app-button-tap-sound-2-547872.mp3');
  placeSound.preload = 'auto';
  const overlayStyle = document.createElement('style');
  overlayStyle.textContent = '#overlay{position:fixed;inset:0;z-index:10000;display:none;align-items:center;justify-content:center;padding:max(22px,env(safe-area-inset-top)) 22px max(22px,env(safe-area-inset-bottom));background:#050714d9}#overlay.open{display:flex}#overlay .modal{width:min(100%,400px);max-height:100%;overflow:auto;padding:25px;border:1px solid #a366ff;border-radius:18px;background:#171b3c;text-align:center;box-shadow:0 0 45px #aa52ff66}#overlay .modal h2{margin:0 0 8px}#overlay .modal p{color:#bec7e9}#overlay .modal .button{margin:5px;padding:12px 20px}#overlay #returnToSalon{width:min(100%,300px);border-color:#57cfff;background:linear-gradient(180deg,#244c72,#171733)}#overlay #leaveWithoutSaving{width:min(100%,300px);border-color:#aab1c8;background:#252943}.ctrl.drop{border-color:#f6bb57}.ctrl.pause{border-color:#ee78b7}';
  document.head.append(overlayStyle);
  const shapes = [
    [[1, 1, 1, 1]],
    [[1, 1], [1, 1]],
    [[0, 1, 0], [1, 1, 1]],
    [[0, 1, 1], [1, 1, 0]],
    [[1, 1, 0], [0, 1, 1]],
    [[1, 0, 0], [1, 1, 1]],
    [[0, 0, 1], [1, 1, 1]]
  ];
  let blockColor = '#808080';
  let blockImage = null;
  const pieceXp = [4, 1, 3, 2, 2, 3, 3];
  let grid = Array.from({ length: H }, () => Array(W).fill(null));
  let piece = null;
  let nextPiece = null;
  let score = 0;
  let earnedXp = 0;
  let lines = 0;
  let piecesPlaced = 0;
  let level = 1;
  let paused = false;
  let ended = false;
  let ready = false;
  let sessionId = null;
  let offline = false;
  let quitting = false;
  let randomState = 1;
  let actionsLog = [];
  let actionOffsetsMs = [];
  let sessionStartedAtMs = 0;
  let xpBoostExpiresAtMs = null;
  let last = 0;
  let accumulator = 0;
  let effectsVolume = 0.8;
  let gameMusic = null;
  let gameMusicUrl = null;
  let musicVolume = 0.7;

  function setEffectsVolume(volumePercent) {
    if (!Number.isFinite(volumePercent) || volumePercent < 0 || volumePercent > 100) {
      throw new TypeError('Invalid effects volume.');
    }
    effectsVolume = volumePercent / 100;
  }

  function playPlaceSound() {
    if (effectsVolume === 0) return;
    placeSound.volume = effectsVolume;
    placeSound.currentTime = 0;
    const playback = placeSound.play();
    if (playback && typeof playback.catch === 'function') {
      playback.catch(error => console.error('Lecture du son de pose impossible.', error));
    }
  }

  function setGameMusic(source, volumePercent) {
    if (source !== null && typeof source !== 'string') {
      throw new TypeError('Invalid game music source.');
    }
    if (!Number.isFinite(volumePercent) || volumePercent < 0 || volumePercent > 100) {
      throw new TypeError('Invalid music volume.');
    }
    const sourceChanged = source !== gameMusicUrl;
    if (sourceChanged) {
      stopGameMusic(true);
      gameMusicUrl = source;
      gameMusic = source ? new Audio(source) : null;
      if (gameMusic) {
        gameMusic.loop = true;
        gameMusic.preload = 'auto';
      }
    }
    musicVolume = volumePercent / 100;
    if (gameMusic) gameMusic.volume = musicVolume;
  }

  function startGameMusic() {
    if (!gameMusic || !gameMusic.paused || musicVolume === 0 || !ready || paused || ended) return;
    gameMusic.volume = musicVolume;
    const playback = gameMusic.play();
    if (playback && typeof playback.catch === 'function') {
      playback.catch(error => console.error('Lecture de la musique de partie impossible.', error));
    }
  }

  function stopGameMusic(resetTrack = false) {
    if (!gameMusic) return;
    gameMusic.pause();
    if (resetTrack) gameMusic.currentTime = 0;
  }

  function randomPiece() {
    randomState = (Math.imul(randomState, 1_664_525) + 1_013_904_223) >>> 0;
    const index = Math.floor(randomState / 0x1_0000_0000 * shapes.length);
    return { index, matrix: shapes[index].map(row => row.slice()), color: blockColor, x: 3, y: 0 };
  }

  function setBlockColor(color) {
    if (typeof color !== 'string' || !/^#[\da-f]{6}$/i.test(color)) {
      throw new TypeError('Invalid Tetris block color.');
    }
    blockColor = color;
    grid = grid.map(row => row.map(value => value ? blockColor : null));
    if (piece) piece.color = blockColor;
    if (nextPiece) nextPiece.color = blockColor;
    draw();
    if (nextPiece) drawNext();
  }

  function setBlockImage(image) {
    if (image !== null && (!(image instanceof HTMLImageElement) ||
        !image.complete || image.naturalWidth === 0)) {
      throw new TypeError('Invalid Tetris block image.');
    }
    blockImage = image;
    draw();
    if (nextPiece) drawNext();
  }

  function reset() {
    stopGameMusic(true);
    grid = Array.from({ length: H }, () => Array(W).fill(null));
    score = 0;
    earnedXp = 0;
    lines = 0;
    piecesPlaced = 0;
    level = 1;
    paused = false;
    ended = false;
    quitting = false;
    actionsLog = [];
    actionOffsetsMs = [];
    sessionStartedAtMs = Date.now();
    nextPiece = randomPiece();
    spawn();
    sync();
    hide();
    last = performance.now();
    accumulator = 0;
  }

  function startSession(seed, id, boostDurationMs = 0, boostExpiresAtMs = null) {
    if (!Number.isInteger(seed) || seed < 1 || seed > 0xffff_ffff) {
      throw new TypeError('Invalid Tetris seed.');
    }
    if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{20,64}$/.test(id)) {
      throw new TypeError('Invalid Tetris session ID.');
    }
    if (!Number.isSafeInteger(boostDurationMs) || boostDurationMs < 0 ||
        boostDurationMs > 20 * 60 * 1000) {
      throw new TypeError('Invalid XP boost duration.');
    }
    if (boostExpiresAtMs !== null && !Number.isSafeInteger(boostExpiresAtMs)) {
      throw new TypeError('Invalid XP boost expiration.');
    }
    const nextSessionId = id;
    if (ready && !ended && !paused && sessionId === nextSessionId) return;
    randomState = seed >>> 0;
    sessionId = nextSessionId;
    xpBoostExpiresAtMs = boostDurationMs > 0
      ? boostExpiresAtMs ?? Date.now() + boostDurationMs
      : null;
    offline = false;
    ready = true;
    reset();
    draw();
    if (!ended) startGameMusic();
  }

  function startOfflineSession(seed) {
    if (!Number.isInteger(seed) || seed < 1 || seed > 0xffff_ffff) {
      throw new TypeError('Invalid Tetris seed.');
    }
    if (ready && offline && !ended && !paused) return;
    randomState = seed >>> 0;
    sessionId = null;
    xpBoostExpiresAtMs = null;
    offline = true;
    ready = true;
    reset();
    draw();
    if (!ended) startGameMusic();
  }

  function waitForSession() {
    ready = false;
    stopGameMusic(true);
  }

  function spawn() {
    piece = nextPiece;
    nextPiece = randomPiece();
    piece.x = Math.floor((W - piece.matrix[0].length) / 2);
    piece.y = 0;
    if (collide(piece)) gameOver();
    drawNext();
  }

  function collide(candidate) {
    for (let y = 0; y < candidate.matrix.length; y++) {
      for (let x = 0; x < candidate.matrix[y].length; x++) {
        if (!candidate.matrix[y][x]) continue;
        const px = candidate.x + x;
        const py = candidate.y + y;
        if (px < 0 || px >= W || py >= H || (py >= 0 && grid[py][px])) return true;
      }
    }
    return false;
  }

  function move(dx, dy) {
    if (paused || ended || !ready) return false;
    const candidate = { ...piece, x: piece.x + dx, y: piece.y + dy };
    if (!collide(candidate)) {
      piece = candidate;
      draw();
      return true;
    }
    if (dy) lock();
    return false;
  }

  function lock() {
    playPlaceSound();
    piecesPlaced++;
    earnedXp += pieceXp[piece.index] +
      (xpBoostExpiresAtMs !== null && Date.now() < xpBoostExpiresAtMs ? 5 : 0);
    piece.matrix.forEach((row, y) => row.forEach((value, x) => {
      if (value && piece.y + y >= 0) grid[piece.y + y][piece.x + x] = piece.color;
    }));
    let cleared = 0;
    for (let y = H - 1; y >= 0; y--) {
      if (grid[y].every(Boolean)) {
        grid.splice(y, 1);
        grid.unshift(Array(W).fill(null));
        cleared++;
        y++;
      }
    }
    if (cleared) {
      lines += cleared;
      earnedXp += cleared * 10 +
        (xpBoostExpiresAtMs !== null && Date.now() < xpBoostExpiresAtMs ? 5 : 0);
      score += [0, 100, 300, 500, 800][cleared] * level;
      level = 1 + Math.floor(lines / 10);
    } else {
      score += 1;
    }
    sync();
    if (grid[0].some(Boolean)) {
      gameOver();
      return;
    }
    spawn();
  }

  function rotate() {
    if (paused || ended || !ready) return;
    const matrix = piece.matrix[0].map((_, index) =>
      piece.matrix.map(row => row[index]).reverse());
    for (const offset of [0, -1, 1, -2, 2]) {
      const candidate = { ...piece, matrix, x: piece.x + offset };
      if (!collide(candidate)) {
        piece = candidate;
        break;
      }
    }
    draw();
  }

  function drop() {
    if (paused || ended || !ready) return;
    let distance = 0;
    while (!collide({ ...piece, y: piece.y + 1 })) {
      piece.y++;
      distance++;
    }
    score += distance * 2;
    lock();
    sync();
    draw();
  }

  function drawBlockImage(context, destinationX, destinationY, size) {
    const sourceWidth = blockImage.naturalWidth;
    const sourceHeight = blockImage.naturalHeight;
    const inset = 1;
    const destinationSize = size - inset * 2;
    const scale = Math.min(
      destinationSize / sourceWidth,
      destinationSize / sourceHeight
    );
    const imageWidth = sourceWidth * scale;
    const imageHeight = sourceHeight * scale;
    context.drawImage(
      blockImage,
      0, 0, sourceWidth, sourceHeight,
      destinationX + inset + (destinationSize - imageWidth) / 2,
      destinationY + inset + (destinationSize - imageHeight) / 2,
      imageWidth, imageHeight
    );
    context.strokeStyle = '#ffffff88';
    context.lineWidth = 1;
    context.strokeRect(
      destinationX + inset + 0.5,
      destinationY + inset + 0.5,
      destinationSize - 1,
      destinationSize - 1
    );
  }

  function cell(context, x, y, color, size) {
    context.fillStyle = color;
    context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
    if (blockImage) {
      drawBlockImage(context, x * size, y * size, size);
      return;
    }
    context.fillStyle = '#ffffff45';
    context.fillRect(x * size + 2, y * size + 2, size - 4, 3);
    context.fillStyle = '#00000035';
    context.fillRect(x * size + size - 5, y * size + 2, 3, size - 4);
  }

  function draw() {
    ctx.clearRect(0, 0, 300, 600);
    ctx.fillStyle = '#0c132d';
    ctx.fillRect(0, 0, 300, 600);
    ctx.strokeStyle = '#ffffff12';
    for (let x = 0; x <= W; x++) {
      ctx.beginPath();
      ctx.moveTo(x * 30, 0);
      ctx.lineTo(x * 30, 600);
      ctx.stroke();
    }
    for (let y = 0; y <= H; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * 30);
      ctx.lineTo(300, y * 30);
      ctx.stroke();
    }
    if (piece) {
      let ghostY = piece.y;
      while (!collide({ ...piece, y: ghostY + 1 })) ghostY++;
      ctx.save();
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = piece.color;
      ctx.strokeStyle = '#d7eaff';
      ctx.lineWidth = 1.5;
      piece.matrix.forEach((row, y) => row.forEach((value, x) => {
        if (!value) return;
        const cellX = (piece.x + x) * 30 + 3;
        const cellY = (ghostY + y) * 30 + 3;
        ctx.fillRect(cellX, cellY, 24, 24);
        ctx.strokeRect(cellX + 0.5, cellY + 0.5, 23, 23);
      }));
      ctx.restore();
    }
    grid.forEach((row, y) => row.forEach((value, x) => {
      if (value) cell(ctx, x, y, value, 30);
    }));
    if (piece) {
      piece.matrix.forEach((row, y) => row.forEach((value, x) => {
        if (value) cell(ctx, piece.x + x, piece.y + y, piece.color, 30);
      }));
    }
  }

  function drawNext() {
    nextContext.clearRect(0, 0, 104, 104);
    const matrix = nextPiece.matrix;
    const size = 23;
    const offsetX = Math.floor((104 - matrix[0].length * size) / 2);
    const offsetY = Math.floor((104 - matrix.length * size) / 2);
    matrix.forEach((row, y) => row.forEach((value, x) => {
      if (!value) return;
      const cellX = offsetX + x * size;
      const cellY = offsetY + y * size;
      nextContext.fillStyle = nextPiece.color;
      nextContext.fillRect(cellX + 1, cellY + 1, size - 2, size - 2);
      if (blockImage) {
        drawBlockImage(nextContext, cellX, cellY, size);
        return;
      }
      nextContext.fillStyle = '#ffffff44';
      nextContext.fillRect(cellX + 2, cellY + 2, size - 4, 3);
    }));
  }

  function sync() {
    const xpEarned = document.getElementById('xpEarned');
    const linesDisplay = document.getElementById('lines');
    const levelDisplay = document.getElementById('level');
    if (xpEarned) xpEarned.textContent = String(earnedXp);
    if (linesDisplay) linesDisplay.textContent = String(lines);
    if (levelDisplay) levelDisplay.textContent = String(level);
  }

  const overlay = document.getElementById('overlay');
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-hidden', 'true');
  function show(title, message, canResume) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalText').textContent = message;
    document.getElementById('resume').style.display = canResume ? 'inline-block' : 'none';
    const returnToSalon = document.getElementById('returnToSalon');
    if (returnToSalon) {
      returnToSalon.style.display =
        title === 'PARTIE TERMINÉE' || title === 'SAUVEGARDE…' ? 'inline-block' : 'none';
    }
    const leaveWithoutSaving = document.getElementById('leaveWithoutSaving');
    if (leaveWithoutSaving) leaveWithoutSaving.style.display = 'none';
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
  }

  function hide() {
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
  }

  function gameOver() {
    ended = true;
    stopGameMusic(true);
    show('PARTIE TERMINÉE', 'Enregistrement des XP…', false);
    window.dispatchEvent(new CustomEvent('TetrisGameOver', {
      detail: {
        sessionId, actions: actionsLog.slice(), actionOffsetsMs: actionOffsetsMs.slice(),
        earnedXp, lines, piecesPlaced, score,
        reason: 'game-over', offline
      }
    }));
  }

  function setPaused(nextPaused) {
    if (ended || !ready) return;
    if (paused === nextPaused) return;
    paused = nextPaused;
    window.dispatchEvent(new CustomEvent('TetrisPauseState', {
      detail: { paused, sessionId }
    }));
    if (paused) {
      stopGameMusic();
      show('PAUSE', 'Partie en pause', true);
    }
    else {
      hide();
      last = performance.now();
      startGameMusic();
    }
  }

  function togglePause() {
    setPaused(!paused);
  }

  function quit() {
    if (!ready || quitting) return;
    const alreadyEnded = ended;
    if (!ended) {
      ended = true;
    }
    stopGameMusic(true);
    quitting = true;
    if (!alreadyEnded) recordAction('quit');
    show('SAUVEGARDE…', 'Enregistrement des XP avant le retour au salon.', false);
    window.dispatchEvent(new CustomEvent('TetrisGameOver', {
      detail: {
        sessionId, actions: actionsLog.slice(), actionOffsetsMs: actionOffsetsMs.slice(),
        earnedXp, lines, piecesPlaced, score,
        reason: 'quit', offline
      }
    }));
  }

  function frame(now) {
    const elapsed = Math.max(0, now - last);
    const delta = Math.min(elapsed, 100);
    last = now;
    if (ready && !paused && !ended) {
      accumulator += delta;
      if (accumulator >= Math.max(100, 850 - (level - 1) * 65)) {
        accumulator = 0;
        recordAction('gravity');
        move(0, 1);
      }
    }
    draw();
    requestAnimationFrame(frame);
  }

  const actions = {
    left: () => move(-1, 0),
    right: () => move(1, 0),
    down: () => {
      if (move(0, 1)) {
        score++;
        sync();
      }
    },
    rotate,
    drop
  };
  function recordAction(action) {
    actionsLog.push(action);
    actionOffsetsMs.push(Math.max(0, Date.now() - sessionStartedAtMs));
  }
  Object.entries(actions).forEach(([id, action]) => {
    document.getElementById(id).addEventListener('pointerdown', event => {
      event.preventDefault();
      if (!ready || paused || ended) return;
      startGameMusic();
      const recordedName = id === 'drop' ? 'drop' : id;
      recordAction(recordedName);
      action();
    });
  });
  document.getElementById('pause').onclick = togglePause;
  document.getElementById('resume').onclick = togglePause;
  const returnToSalon = document.getElementById('returnToSalon');
  if (returnToSalon) returnToSalon.onclick = quit;
  const leaveWithoutSaving = document.getElementById('leaveWithoutSaving');
  if (leaveWithoutSaving) leaveWithoutSaving.onclick = () => {
    const destination = 'tetris_salon_mobile_battle_pass.html';
    if (window.TetrisPageTransition) window.TetrisPageTransition.navigate(destination);
    else window.location.href = destination;
  };
  const quitButton = document.getElementById('quit');
  if (quitButton) quitButton.onclick = quit;
  const backTop = document.getElementById('backTop');
  if (backTop) backTop.onclick = quit;
  const backBottom = document.getElementById('backBottom');
  if (backBottom) backBottom.onclick = quit;
  document.addEventListener('keydown', event => {
    const keys = { ArrowLeft: 'left', ArrowRight: 'right', ArrowDown: 'down', ArrowUp: 'rotate', Space: 'drop' };
    const action = actions[keys[event.code] || keys[event.key]];
    if (action) {
      event.preventDefault();
      if (!ready || paused || ended) return;
      startGameMusic();
      const key = keys[event.code] || keys[event.key];
      recordAction(key);
      action();
    }
    if (event.key === 'Escape') togglePause();
  });

  window.TetrisGame = {
    startSession, startOfflineSession, waitForSession, setBlockColor, setBlockImage,
    setEffectsVolume, setGameMusic, quit,
    pause: () => setPaused(true),
    resume: () => setPaused(false),
    get isPaused() { return paused; },
    getXpBoostRemainingMs: () => xpBoostExpiresAtMs === null
      ? 0 : Math.max(0, xpBoostExpiresAtMs - Date.now()),
    getSessionId: () => sessionId
  };
  draw();
  requestAnimationFrame(frame);
})();
