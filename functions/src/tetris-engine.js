'use strict';

const WIDTH = 10;
const HEIGHT = 20;
const {
  getXpForLines, getXpForPiece, getXpBoostedAward, XP_BOOST_DURATION_MS
} = require('./progression');
const SHAPES = [
  [[1, 1, 1, 1]],
  [[1, 1], [1, 1]],
  [[0, 1, 0], [1, 1, 1]],
  [[0, 1, 1], [1, 1, 0]],
  [[1, 1, 0], [0, 1, 1]],
  [[1, 0, 0], [1, 1, 1]],
  [[0, 0, 1], [1, 1, 1]]
];
const POINTS_PER_LINES = [0, 100, 300, 500, 800];
const ACTIONS = new Set(['left', 'right', 'down', 'rotate', 'drop', 'gravity', 'quit']);

function simulateGame(seed, actions, options = {}) {
  if (!Number.isInteger(seed) || seed < 1 || seed > 0xffffffff) {
    throw new TypeError('Invalid game seed.');
  }
  if (!Array.isArray(actions) || actions.length === 0 || actions.length > 50_000 ||
      actions.some(action => !ACTIONS.has(action))) {
    throw new TypeError('Invalid game replay.');
  }
  const xpBoostDurationMs = options.xpBoostDurationMs ?? 0;
  const actionOffsetsMs = options.actionOffsetsMs;
  if (!Number.isSafeInteger(xpBoostDurationMs) || xpBoostDurationMs < 0 ||
      xpBoostDurationMs > XP_BOOST_DURATION_MS ||
      (actionOffsetsMs !== undefined &&
        (!Array.isArray(actionOffsetsMs) || actionOffsetsMs.length !== actions.length ||
          actionOffsetsMs.some((offset, index) =>
            !Number.isSafeInteger(offset) || offset < 0 ||
            (index > 0 && offset < actionOffsetsMs[index - 1])))) ||
      (xpBoostDurationMs > 0 && actionOffsetsMs === undefined)) {
    throw new TypeError('Invalid XP boost replay timing.');
  }

  let randomState = seed >>> 0;
  const randomIndex = () => {
    randomState = (Math.imul(randomState, 1_664_525) + 1_013_904_223) >>> 0;
    return Math.floor(randomState / 0x1_0000_0000 * SHAPES.length);
  };
  const newPiece = () => {
    const index = randomIndex();
    return { index, matrix: SHAPES[index].map(row => row.slice()), x: 3, y: 0 };
  };
  const grid = Array.from({ length: HEIGHT }, () => Array(WIDTH).fill(false));
  let piece;
  let nextPiece = newPiece();
  let score = 0;
  let awardedXp = 0;
  let lines = 0;
  let piecesPlaced = 0;
  let level = 1;
  let ended = false;
  let actionIndex = -1;

  function awardXp(baseXp) {
    const boostActive = xpBoostDurationMs > 0 &&
      actionOffsetsMs[actionIndex] < xpBoostDurationMs;
    awardedXp += boostActive ? getXpBoostedAward(baseXp) : baseXp;
  }

  function collides(candidate) {
    for (let y = 0; y < candidate.matrix.length; y++) {
      for (let x = 0; x < candidate.matrix[y].length; x++) {
        if (!candidate.matrix[y][x]) continue;
        const px = candidate.x + x;
        const py = candidate.y + y;
        if (px < 0 || px >= WIDTH || py >= HEIGHT || (py >= 0 && grid[py][px])) return true;
      }
    }
    return false;
  }

  function spawn() {
    piece = nextPiece;
    nextPiece = newPiece();
    piece.x = Math.floor((WIDTH - piece.matrix[0].length) / 2);
    piece.y = 0;
    if (collides(piece)) ended = true;
  }

  function lock() {
    piecesPlaced++;
    awardXp(getXpForPiece(piece.index));
    piece.matrix.forEach((row, y) => row.forEach((value, x) => {
      if (value && piece.y + y >= 0) grid[piece.y + y][piece.x + x] = true;
    }));
    let cleared = 0;
    for (let y = HEIGHT - 1; y >= 0; y--) {
      if (grid[y].every(Boolean)) {
        grid.splice(y, 1);
        grid.unshift(Array(WIDTH).fill(false));
        cleared++;
        y++;
      }
    }
    if (cleared) {
      lines += cleared;
      awardXp(getXpForLines(cleared));
      score += (POINTS_PER_LINES[cleared] || 0) * level;
      level = 1 + Math.floor(lines / 10);
    } else {
      score += 1;
    }
    if (grid[0].some(Boolean)) {
      ended = true;
      return;
    }
    spawn();
  }

  function move(dx, dy) {
    const candidate = { ...piece, x: piece.x + dx, y: piece.y + dy };
    if (!collides(candidate)) {
      piece = candidate;
      return true;
    }
    if (dy) lock();
    return false;
  }

  function rotate() {
    const matrix = piece.matrix[0].map((_, index) =>
      piece.matrix.map(row => row[index]).reverse());
    for (const offset of [0, -1, 1, -2, 2]) {
      const candidate = { ...piece, matrix, x: piece.x + offset };
      if (!collides(candidate)) {
        piece = candidate;
        break;
      }
    }
  }

  spawn();
  for (const [index, action] of actions.entries()) {
    actionIndex = index;
    if (ended) throw new TypeError('Replay continues after game over.');
    switch (action) {
      case 'left': move(-1, 0); break;
      case 'right': move(1, 0); break;
      case 'down':
        if (move(0, 1)) score++;
        break;
      case 'gravity': move(0, 1); break;
      case 'rotate': rotate(); break;
      case 'quit': ended = true; break;
      case 'drop': {
        let distance = 0;
        while (!collides({ ...piece, y: piece.y + 1 })) {
          piece.y++;
          distance++;
        }
        score += distance * 2;
        lock();
        break;
      }
    }
  }
  return { ended, lines, piecesPlaced, score, awardedXp };
}

module.exports = { simulateGame };
