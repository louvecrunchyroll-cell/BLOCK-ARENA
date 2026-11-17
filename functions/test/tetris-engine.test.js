'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { simulateGame } = require('../src/tetris-engine');

test('replays the same seeded Tetris inputs deterministically', () => {
  const actions = Array(11).fill('drop');
  const first = simulateGame(123_456, actions);
  const second = simulateGame(123_456, actions);
  assert.deepEqual(first, { ended: true, lines: 0, piecesPlaced: 11, score: 221, awardedXp: 25 });
  assert.deepEqual(second, first);
});

test('rejects unknown actions and inputs after game over', () => {
  assert.throws(() => simulateGame(123_456, ['award-xp']), /Invalid game replay/);
  assert.throws(() => simulateGame(123_456, Array(12).fill('drop')), /continues after game over/);
});

test('ends the game as soon as locked blocks remain on the top row', () => {
  const actions = Array(10).fill('drop');
  assert.deepEqual(simulateGame(1, actions), {
    ended: false, lines: 0, piecesPlaced: 10, score: 206, awardedXp: 26
  });
  assert.deepEqual(simulateGame(1, [...actions, 'drop']), {
    ended: true, lines: 0, piecesPlaced: 11, score: 207, awardedXp: 27
  });
});

test('awards earned XP when a player quits and rejects actions after quitting', () => {
  const actions = ['drop', 'quit'];
  const result = simulateGame(123_456, actions);
  assert.equal(result.ended, true);
  assert.equal(result.awardedXp, 4);
  assert.equal(result.lines, 0);
  assert.equal(result.piecesPlaced, 1);
  assert.throws(() => simulateGame(123_456, [...actions, 'drop']), /continues after game over/);
});

test('accepts a quit before the first piece is placed as a zero-XP game', () => {
  assert.deepEqual(simulateGame(123_456, ['quit']), {
    ended: true, lines: 0, piecesPlaced: 0, score: 0, awardedXp: 0
  });
});

test('adds exactly five XP per piece award while the boost is active', () => {
  const actions = Array(10).fill('drop');
  const base = simulateGame(1, actions);
  const boosted = simulateGame(1, actions, {
    xpBoostDurationMs: 20 * 60 * 1000,
    actionOffsetsMs: Array(actions.length).fill(0)
  });
  assert.equal(base.awardedXp, 26);
  assert.equal(boosted.awardedXp, base.awardedXp + actions.length * 5);
});

test('stops applying the boost when an XP award occurs at its expiry time', () => {
  const actions = ['drop', 'quit'];
  assert.equal(simulateGame(123_456, actions, {
    xpBoostDurationMs: 1_000,
    actionOffsetsMs: [999, 1_000]
  }).awardedXp, 9);
  assert.equal(simulateGame(123_456, actions, {
    xpBoostDurationMs: 1_000,
    actionOffsetsMs: [1_000, 1_000]
  }).awardedXp, 4);
});

test('rejects invalid boost durations and action timing', () => {
  assert.throws(() => simulateGame(1, ['quit'], {
    xpBoostDurationMs: 20 * 60 * 1000
  }), /Invalid XP boost replay timing/);
  assert.throws(() => simulateGame(1, ['quit'], {
    xpBoostDurationMs: -1,
    actionOffsetsMs: [0]
  }), /Invalid XP boost replay timing/);
  assert.throws(() => simulateGame(1, ['drop', 'quit'], {
    xpBoostDurationMs: 1_000,
    actionOffsetsMs: [1, 0]
  }), /Invalid XP boost replay timing/);
});
