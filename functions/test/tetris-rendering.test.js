'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

class MockContext {
  constructor() {
    this.calls = [];
    this.globalAlpha = 1;
    this.stack = [];
  }

  clearRect(...args) { this.calls.push({ type: 'clearRect', args }); }
  fillRect(...args) {
    this.calls.push({
      type: 'fillRect', args, fillStyle: this.fillStyle, globalAlpha: this.globalAlpha
    });
  }
  strokeRect(...args) {
    this.calls.push({
      type: 'strokeRect', args, strokeStyle: this.strokeStyle, globalAlpha: this.globalAlpha
    });
  }
  drawImage(...args) { this.calls.push({ type: 'drawImage', args }); }
  beginPath() {}
  moveTo() {}
  lineTo() {}
  stroke() {}
  save() {
    this.stack.push({
      globalAlpha: this.globalAlpha,
      fillStyle: this.fillStyle,
      strokeStyle: this.strokeStyle,
      lineWidth: this.lineWidth
    });
  }
  restore() { Object.assign(this, this.stack.pop()); }
}

function createGame() {
  const elements = new Map();
  const contexts = new Map();
  const events = [];
  const navigations = [];
  const audios = [];
  const makeElement = id => {
    if (!elements.has(id)) {
      const element = {
        id,
        style: {},
        listeners: new Map(),
        attributes: {},
        classList: { add() {}, remove() {} },
        addEventListener(name, callback) { this.listeners.set(name, callback); },
        setAttribute(name, value) { this.attributes[name] = value; }
      };
      if (id === 'board' || id === 'next') {
        contexts.set(id, new MockContext());
        element.getContext = () => contexts.get(id);
      }
      elements.set(id, element);
    }
    return elements.get(id);
  };
  const document = {
    head: { append() {} },
    createElement() { return { textContent: '' }; },
    getElementById: makeElement,
    addEventListener() {}
  };
  const window = {
    addEventListener() {},
    dispatchEvent(event) { events.push(event); },
    TetrisPageTransition: {
      navigate(url) { navigations.push(url); }
    }
  };
  class MockImage {
    complete = true;
    naturalWidth = 64;
    naturalHeight = 64;
  }
  class MockAudio {
    constructor(source) {
      this.source = source;
      this.paused = true;
      this.volume = 1;
      this.currentTime = 0;
      audios.push(this);
    }

    play() {
      this.paused = false;
      return Promise.resolve();
    }

    pause() {
      this.paused = true;
    }
  }
  class MockCustomEvent {
    constructor(type, options) { this.type = type; this.detail = options.detail; }
  }

  vm.runInNewContext(
    fs.readFileSync(path.join(__dirname, '..', '..', 'tetris-game.js'), 'utf8'),
    {
      document,
      window,
      Audio: MockAudio,
      HTMLImageElement: MockImage,
      CustomEvent: MockCustomEvent,
      performance: { now: () => 0 },
      requestAnimationFrame() {}
    },
    { filename: 'tetris-game.js' }
  );
  return {
    elements, contexts, events, navigations, audios, MockImage, window,
    drop() { elements.get('drop').listeners.get('pointerdown')({ preventDefault() {} }); }
  };
}

function ghostCells(context) {
  const lastFrameStart = context.calls.findLastIndex(call => call.type === 'clearRect');
  return context.calls
    .slice(lastFrameStart)
    .filter(call => call.type === 'strokeRect' && call.strokeStyle === '#d7eaff')
    .map(call => [call.args[0], call.args[1]]);
}

test('renders a landing ghost that follows movement and rotation without changing gameplay', () => {
  const game = createGame();
  const board = game.contexts.get('board');
  game.window.TetrisGame.startSession(123_456, 'session_id_1234567890');

  const firstGhost = ghostCells(board);
  assert.equal(firstGhost.length, 4);
  assert.ok(firstGhost.every(([, y]) => y >= 0 && y < 600));
  assert.ok(board.calls.some(call =>
    call.type === 'fillRect' && call.globalAlpha === 0.28
  ));

  game.elements.get('right').listeners.get('pointerdown')({ preventDefault() {} });
  const movedGhost = ghostCells(board);
  assert.equal(movedGhost.length, firstGhost.length);
  assert.deepEqual(movedGhost.map(([x, y]) => [x - 30, y]), firstGhost);

  game.elements.get('rotate').listeners.get('pointerdown')({ preventDefault() {} });
  const rotatedGhost = ghostCells(board);
  assert.equal(rotatedGhost.length, movedGhost.length);
  assert.notDeepEqual(rotatedGhost, movedGhost);

  const skinImage = new game.MockImage();
  game.window.TetrisGame.setBlockImage(skinImage);
  assert.ok(board.calls.some(call => call.type === 'drawImage'));
  assert.ok(board.calls.some(call => call.type === 'fillRect' && call.fillStyle === '#808080'));
  game.window.TetrisGame.quit();

  const result = game.events.find(event => event.type === 'TetrisGameOver').detail;
  assert.deepEqual(Array.from(result.actions), ['right', 'rotate', 'quit']);
  assert.equal(result.score, 0);
  assert.equal(result.lines, 0);
  assert.equal(game.elements.get('xpEarned').textContent, '0');

  game.elements.get('leaveWithoutSaving').onclick();
  assert.deepEqual(game.navigations, ['tetris_salon_mobile_battle_pass.html']);
});

test('allows local play when online sessions are unavailable and marks results unsaved', () => {
  const game = createGame();
  game.window.TetrisGame.startOfflineSession(42);
  game.elements.get('left').listeners.get('pointerdown')({ preventDefault() {} });
  game.elements.get('down').listeners.get('pointerdown')({ preventDefault() {} });
  game.window.TetrisGame.quit();

  const result = game.events.find(event => event.type === 'TetrisGameOver').detail;
  assert.equal(result.offline, true);
  assert.equal(result.sessionId, null);
  assert.deepEqual(Array.from(result.actions), ['left', 'down', 'quit']);
  assert.equal(result.earnedXp, 0);
});

test('plays selected music only during active play and stops it when the game ends', () => {
  const game = createGame();
  game.window.TetrisGame.setGameMusic('/track.mp3', 35);
  const audio = game.audios.find(candidate => candidate.source === '/track.mp3');
  assert.ok(audio);
  assert.equal(audio.paused, true);

  game.window.TetrisGame.startOfflineSession(123_456);
  assert.equal(audio.paused, false);
  assert.equal(audio.volume, 0.35);

  game.window.TetrisGame.pause();
  assert.equal(audio.paused, true);
  game.window.TetrisGame.resume();
  assert.equal(audio.paused, false);

  for (let attempt = 0; attempt < 100 &&
      !game.events.some(event => event.type === 'TetrisGameOver'); attempt++) {
    game.drop();
  }
  assert.ok(game.events.some(event => event.type === 'TetrisGameOver'));
  assert.equal(audio.paused, true);
});

