'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function createGame() {
  let now = 0;
  const elements = new Map();
  const listeners = new Map();
  const context = {
    clearRect() {},
    fillRect() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    stroke() {},
    save() {},
    restore() {},
    strokeRect() {}
  };
  const getElement = id => {
    if (!elements.has(id)) {
      elements.set(id, {
        id,
        style: {},
        classList: { add() {}, remove() {} },
        setAttribute() {},
        addEventListener(name, callback) {
          listeners.set(`${id}:${name}`, callback);
        },
        getContext: () => context
      });
    }
    return elements.get(id);
  };
  class TestDate extends Date {
    static now() {
      return now;
    }
  }
  class MockAudio {
    constructor(source) {
      this.source = source;
      this.paused = true;
      this.volume = 1;
      this.currentTime = 0;
    }

    play() {
      this.paused = false;
      return Promise.resolve();
    }

    pause() {
      this.paused = true;
    }
  }
  const window = {
    dispatchEvent() {},
    TetrisGame: null
  };
  const document = {
    head: { append() {} },
    createElement: () => ({ textContent: '' }),
    getElementById: getElement,
    addEventListener() {}
  };
  vm.runInNewContext(
    fs.readFileSync(path.join(__dirname, '..', '..', 'tetris-game.js'), 'utf8'),
    {
      Date: TestDate,
      document,
      window,
      Audio: MockAudio,
      performance: { now: () => now },
      CustomEvent: class {},
      requestAnimationFrame() {}
    }
  );
  return {
    game: window.TetrisGame,
    elements,
    setNow(value) { now = value; },
    drop() { listeners.get('drop:pointerdown')({ preventDefault() {} }); },
    pause() { getElement('pause').onclick(); },
    resume() { getElement('resume').onclick(); },
    xp() { return Number(getElement('xpEarned').textContent); }
  };
}

test('XP boost timer keeps running through pauses and expires at its absolute deadline', () => {
  const baseline = createGame();
  baseline.game.startSession(123_456, 'baseline-game-session-0001');
  baseline.drop();
  const baselineAfterFirstDrop = baseline.xp();
  baseline.drop();
  const baselineAfterSecondDrop = baseline.xp();

  const boosted = createGame();
  boosted.game.startSession(
    123_456, 'boosted-game-session-0001', 20 * 60 * 1000, 20 * 60 * 1000
  );
  boosted.drop();
  assert.equal(boosted.xp(), baselineAfterFirstDrop + 5);
  boosted.setNow(10 * 60 * 1000);
  boosted.pause();
  assert.equal(boosted.game.getXpBoostRemainingMs(), 10 * 60 * 1000);
  boosted.setNow(20 * 60 * 1000);
  assert.equal(boosted.game.getXpBoostRemainingMs(), 0);
  boosted.resume();
  boosted.drop();
  assert.equal(boosted.xp() - (baselineAfterFirstDrop + 5),
    baselineAfterSecondDrop - baselineAfterFirstDrop);

  const resumed = createGame();
  resumed.setNow(5 * 60 * 1000);
  resumed.game.startSession(
    123_456, 'resumed-game-session-0001', 15 * 60 * 1000, 20 * 60 * 1000
  );
  assert.equal(resumed.game.getXpBoostRemainingMs(), 15 * 60 * 1000);
  resumed.setNow(20 * 60 * 1000);
  assert.equal(resumed.game.getXpBoostRemainingMs(), 0);
});
