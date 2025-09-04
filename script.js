// ====== Config ======
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const CELL = 10; // px per cell
const CSS_W = 960;
const CSS_H = 600;

canvas.width = CSS_W;
canvas.height = CSS_H;

const COLS = Math.floor(canvas.width / CELL);
const ROWS = Math.floor(canvas.height / CELL);

// DOM controls
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const stepBtn = document.getElementById("stepBtn");
const randomBtn = document.getElementById("randomBtn");
const clearBtn = document.getElementById("clearBtn");
const speedInput = document.getElementById("speed");
const speedVal = document.getElementById("speedVal");
const genEl = document.getElementById("gen");
const aliveEl = document.getElementById("alive");
const cellsizeEl = document.getElementById("cellsize");

cellsizeEl.textContent = CELL;
speedVal.textContent = speedInput.value;

// ====== Grid helpers (rows x cols) ======
function buildGrid(rows, cols, fill = 0) {
  return Array.from({ length: rows }, () => Array(cols).fill(fill));
}

let grid = buildGrid(ROWS, COLS, 0);
let fadeGrid = buildGrid(ROWS, COLS, 0);
let generation = 0;
let stable = false;

function randomizeGrid(density = 0.33) {
  grid = grid.map((row) => row.map(() => (Math.random() < density ? 1 : 0)));
  fadeGrid = buildGrid(ROWS, COLS, 0);
  generation = 0;
  stable = false;
  updateStats();
}

function clearGrid() {
  grid = buildGrid(ROWS, COLS, 0);
  fadeGrid = buildGrid(ROWS, COLS, 0);
  generation = 0;
  stable = false;
  updateStats();
}

function countNeighbors(r, c) {
  let n = 0;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const rr = r + dr;
      const cc = c + dc;
      if (rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS) {
        n += grid[rr][cc];
      }
    }
  }
  return n;
}

// ====== Stabilization helpers ======
function gridsEqual(gridA, gridB) {
  if (!gridA || !gridB) return false;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (gridA[r][c] !== gridB[r][c]) {
        return false;
      }
    }
  }
  return true;
}

function allFadesGone() {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (fadeGrid[r][c] > 0) return false;
    }
  }
  return true;
}

// ====== Update step ======
function update() {
  if (stable) {
    // grid has stabilized, but keep fading cells
    let fading = false;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (fadeGrid[r][c] > 0) {
          fadeGrid[r][c] *= FADE_DECAY;
          if (fadeGrid[r][c] < FADE_CUTOFF) fadeGrid[r][c] = 0;
          fading = true;
        }
      }
    }
    if (!fading) pause(); // stop completely once fades are gone
    return;
  }

  const next = buildGrid(ROWS, COLS, 0);
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const alive = grid[r][c] === 1;
      const neighbors = countNeighbors(r, c);

      if (alive) {
        if (neighbors === 2 || neighbors === 3) {
          next[r][c] = 1;
          fadeGrid[r][c] = 0; // reset fade if alive
        } else {
          next[r][c] = 0;
          fadeGrid[r][c] = 1; // start fading
        }
      } else {
        next[r][c] = neighbors === 3 ? 1 : 0;
        if (next[r][c] === 0 && fadeGrid[r][c] > 0) {
          fadeGrid[r][c] *= FADE_DECAY;
          if (fadeGrid[r][c] < FADE_CUTOFF) fadeGrid[r][c] = 0;
        }
      }
    }
  }

  // check if the new grid is the same as the current one
  if (gridsEqual(grid, next)) {
    stable = true;
  }

  grid = next;
  generation++;
  updateStats();
}

// ====== Drawing hearts ======
function drawHeart(ctx, x, y, size, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size, size);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(0, -0.3, -0.5, -0.3, -0.5, 0.2);
  ctx.bezierCurveTo(-0.5, 0.6, 0, 0.9, 0, 1);
  ctx.bezierCurveTo(0, 0.9, 0.5, 0.6, 0.5, 0.2);
  ctx.bezierCurveTo(0.5, -0.3, 0, -0.3, 0, 0);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

// ====== Optimization for hearts ======
let heartSprite = null;
let aliveColorCached = null;
const FADE_DECAY = 0.9;   // tune this (0.9 = slower fade, 0.6 = faster fade)
const FADE_CUTOFF = 0.05; // below this we stop drawing a faded heart

function createHeartSprite(color) {
  const sprite = document.createElement('canvas');
  sprite.width = CELL;
  sprite.height = CELL;
  const sctx = sprite.getContext('2d');
  sctx.clearRect(0, 0, sprite.width, sprite.height);

  drawHeart(sctx, sprite.width / 2, sprite.height / 2, sprite.width / 2, color);

  return sprite;
}

function updateHeartSprite() {
  aliveColorCached = getComputedStyle(document.documentElement)
                       .getPropertyValue('--alive').trim() || '#00ff00';
  heartSprite = createHeartSprite(aliveColorCached);
}

function render() {
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
  ctx.fillStyle = bg || '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  let aliveCount = 0;

  if (!heartSprite) updateHeartSprite();

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r][c] === 1) {
        ctx.globalAlpha = 1;
        ctx.drawImage(heartSprite, c * CELL, r * CELL);
        aliveCount++;
      } else if (fadeGrid && fadeGrid[r][c] > 0) {
        const alpha = fadeGrid[r][c];
        if (alpha > FADE_CUTOFF) {
          ctx.globalAlpha = alpha;
          ctx.drawImage(heartSprite, c * CELL, r * CELL);
          ctx.globalAlpha = 1;
        }
      }
    }
  }

  aliveEl.textContent = aliveCount;
  genEl.textContent = generation;
}

function updateStats() {
  let aliveCount = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r][c] === 1) aliveCount++;
    }
  }
  aliveEl.textContent = aliveCount;
  genEl.textContent = generation;
}

// ====== Animation control ======
let timer = null;
function play() {
  if (timer) return;
  const tick = () => {
    update();
    render();
  };
  timer = setInterval(tick, Number(speedInput.value));
  startBtn.disabled = true;
  stopBtn.disabled = false;
}
function pause() {
  if (!timer) return;
  clearInterval(timer);
  timer = null;
  startBtn.disabled = false;
  stopBtn.disabled = true;
}

// ====== Mouse draw ======
let isDown = false;
let drawValue = 1;

canvas.addEventListener("mousedown", (e) => {
  isDown = true;
  const { r, c } = eventToCell(e);
  drawValue = grid[r][c] === 1 ? 0 : 1;
  setCell(r, c, drawValue);
});
canvas.addEventListener("mousemove", (e) => {
  if (!isDown) return;
  const { r, c } = eventToCell(e);
  setCell(r, c, drawValue);
});
window.addEventListener("mouseup", () => {
  isDown = false;
});

function eventToCell(e) {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const c = Math.floor(x / (rect.width / COLS));
  const r = Math.floor(y / (rect.height / ROWS));
  return {
    r: Math.min(Math.max(r, 0), ROWS - 1),
    c: Math.min(Math.max(c, 0), COLS - 1),
  };
}

function setCell(r, c, val) {
  grid[r][c] = val ? 1 : 0;
  render();
}

// ====== Wire controls ======
startBtn.addEventListener("click", play);
stopBtn.addEventListener("click", pause);
stepBtn.addEventListener("click", () => {
  pause();
  update();
  render();
});
randomBtn.addEventListener("click", () => {
  pause();
  randomizeGrid(0.33);
  render();
});
clearBtn.addEventListener("click", () => {
  pause();
  clearGrid();
  render();
});

speedInput.addEventListener("input", () => {
  speedVal.textContent = speedInput.value;
  if (timer) {
    clearInterval(timer);
    timer = setInterval(() => {
      update();
      render();
    }, Number(speedInput.value));
  }
});

// rules toggle
const rules = document.getElementById("rules");
const toggleRules = document.getElementById("toggleRules");
const showRules = document.getElementById("showRules");

toggleRules.addEventListener("click", () => {
  rules.classList.remove("show");
});

showRules.addEventListener("click", () => {
  rules.classList.add("show");
});

// ====== Boot ======
updateHeartSprite();
randomizeGrid(0.33);
render();
