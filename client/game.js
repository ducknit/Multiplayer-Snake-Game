// ================== Config & State ==================
const GRID_MIN = 1;
const GRID_MAX = 18;

let inputDir = { x: 0, y: 0 };
let nextDir  = { x: 0, y: 0 };      // direction queued by the player
let lastMoveDir = { x: 0, y: 0 };   // direction actually used on last tick
let turnLocked = false;             // prevents multiple turns in one frame
const isOpposite = (a, b) => a.x === -b.x && a.y === -b.y;

let speed = 5;
let difficultyMultiplier = 1;
let score = 0;
let snakeColor = "#32cd32"; // Default snake color
let lastPaintTime = 0;
let isPaused = false;
let isMusicOn = true;


// Snake & Food
let snakeArr = [{ x: 13, y: 15 }];
let food = { x: 6, y: 6 };

// ================== Sounds ==================
const foodSound = new Audio('./music/food.mp3');
const gameOverSound = new Audio('./music/gameover.mp3');
const moveSound = new Audio('./music/move.mp3');
const musicSound = new Audio('./music/music.mp3');
musicSound.loop = true;

// ================== DOM ==================
const board = document.getElementById("board");
const scoreBox = document.getElementById("scoreBox");
const highScoreBox = document.getElementById("highScoreBox");
const pauseOverlay = document.getElementById("pauseOverlay");
const gameOverScreen = document.getElementById("gameOverScreen");

// High score init
let highScore = localStorage.getItem("highScore")
  ? JSON.parse(localStorage.getItem("highScore"))
  : 0;
if (highScoreBox) highScoreBox.textContent = "High Score: " + highScore;

// ================== Main Loop ==================
function main(ctime) {
  window.requestAnimationFrame(main);
  if (isPaused) return;
  if ((ctime - lastPaintTime) / 1000 < 1 / (speed * difficultyMultiplier)) return;

  lastPaintTime = ctime;
  gameEngine();
}

// ================== Utilities ==================
function isCollide(sarr) {
  // Self-collision: head vs body
  for (let i = 1; i < sarr.length; i++) {
    if (sarr[i].x === sarr[0].x && sarr[i].y === sarr[0].y) return true;
  }
  // Wall-collision
  const h = sarr[0];
  if (h.x < GRID_MIN || h.y < GRID_MIN || h.x > GRID_MAX || h.y > GRID_MAX) return true;
  return false;
}

function getRandomFoodPosition(snakeArr) {
  // keep a 1-cell buffer from walls like original (2..16)
  let a = 2, b = 16;
  let pos, clash = true;
  while (clash) {
    pos = {
      x: Math.round(a + (b - a) * Math.random()),
      y: Math.round(a + (b - a) * Math.random())
    };
    clash = snakeArr.some(seg => seg.x === pos.x && seg.y === pos.y);
  }
  return pos;
}

function gameOver() {
  gameOverSound.play();
  musicSound.pause();
  inputDir = { x: 0, y: 0 };
  isPaused = true;
  if (gameOverScreen) gameOverScreen.style.display = "flex";
}

function resetGame() {
  if (gameOverScreen) gameOverScreen.style.display = "none";
  snakeArr = [{ x: 13, y: 15 }];
  food = getRandomFoodPosition(snakeArr);
  score = 0;
  if (scoreBox) scoreBox.textContent = "Score: 0";
  speed = 5;
  isPaused = false;
  inputDir = { x: 0, y: 0 };   // 🟢 reset direction
  nextDir = { x: 0, y: 0 };    // 🟢 reset direction
  lastMoveDir = { x: 0, y: 0 };
  turnLocked = false;
  if (isMusicOn) musicSound.play();
  render(); // immediate refresh
}

// ================== Render (separate for instant updates while paused) ==================
function render() {
  board.innerHTML = "";

  // Snake
  snakeArr.forEach((e, index) => {
    const el = document.createElement("div");
    el.style.gridRowStart = e.y;
    el.style.gridColumnStart = e.x;
    el.classList.add(index === 0 ? "head" : "snake");
    // Apply color live
    el.style.backgroundColor = snakeColor;
    board.appendChild(el);
  });

  // Food
  const f = document.createElement("div");
  f.style.gridRowStart = food.y;
  f.style.gridColumnStart = food.x;
  f.classList.add("food");
  board.appendChild(f);
}

// ================== Game Engine (no-gap grow logic) ==================
function gameEngine() {
  // Apply the queued direction for this tick
  inputDir = nextDir;

  // If snake is not moving, just render & skip logic
  if (inputDir.x === 0 && inputDir.y === 0) {
    render();
    return;
  }

  // Compute the next head position
  const nextHead = {
    x: snakeArr[0].x + inputDir.x,
    y: snakeArr[0].y + inputDir.y
  };

  // Collision check against would-be position
  if (isCollide([{ ...nextHead }, ...snakeArr])) {
    gameOver();
    return;
  }

  // EAT: If next head hits food
  if (nextHead.x === food.x && nextHead.y === food.y) {
    foodSound.play();
    snakeArr.unshift(nextHead); // grow

    // Score
    score += 1;
    if (scoreBox) scoreBox.textContent = "Score: " + score;
    if (score > highScore) {
      highScore = score;
      localStorage.setItem("highScore", JSON.stringify(highScore));
      if (highScoreBox) highScoreBox.textContent = "High Score: " + highScore;
    }

    // Speed up every 5 points
    if (score > 0 && score % 5 === 0) speed += 1;

    // New food
    food = getRandomFoodPosition(snakeArr);
  } else {
    // Normal move
    snakeArr.unshift(nextHead);
    snakeArr.pop();
  }

  lastMoveDir = inputDir;
  turnLocked = false;
  render();
}
// ================== Controls (queued dir + 180° block + pause) ==================
window.addEventListener('keydown', (e) => {
  // Pause/resume with Space
  if (e.key === ' ') {
    isPaused = !isPaused;
    if (pauseOverlay) pauseOverlay.style.display = isPaused ? "flex" : "none";
    // While paused, make sure the current state renders (e.g., color change)
    if (isPaused) render();
    return;
  }

  // Only allow one turn per frame
  if (turnLocked) return;

  let desired = null;
  switch (e.key) {
    case "ArrowUp":    desired = { x: 0,  y: -1 }; break;
    case "ArrowDown":  desired = { x: 0,  y:  1 }; break;
    case "ArrowLeft":  desired = { x: -1, y:  0 }; break;
    case "ArrowRight": desired = { x: 1,  y:  0 }; break;
    default: return; // ignore other keys
  }

  // Disallow 180° reverse if we have a body and already moved
  const hasBody = snakeArr.length > 1;
  const hasMoved = lastMoveDir.x !== 0 || lastMoveDir.y !== 0;
  if (hasBody && hasMoved && isOpposite(desired, lastMoveDir)) {
    return; // ignore illegal move
  }

  nextDir = desired;
  turnLocked = true;
  moveSound.play();
});

// ================== Buttons & Settings ==================
const restartBtn = document.getElementById("restartBtn");
if (restartBtn) restartBtn.addEventListener("click", resetGame);

// Settings UI elements
const settingsBtn = document.getElementById("settingsBtn");
const settingsMenu = document.getElementById("settingsMenu");
const pauseBtn = document.getElementById("pauseBtn");
const resumeBtn = document.getElementById("resumeBtn"); // if you have a separate resume button
const musicBtn = document.getElementById("musicBtn");
const snakeColorInput = document.getElementById("snakeColor");
const difficultySelect = document.getElementById("difficulty");
const closeSettings = document.getElementById("closeSettings");

// Open settings (auto-pause)
if (settingsBtn) {
  settingsBtn.addEventListener("click", () => {
    if (settingsMenu) settingsMenu.style.display = "flex";
    isPaused = true;
    if (pauseOverlay) pauseOverlay.style.display = "flex";
    render(); // show latest state while paused
  });
}

// Close settings
if (closeSettings) {
  closeSettings.addEventListener("click", () => {
    if (settingsMenu) settingsMenu.style.display = "none";
    // do not auto-resume; keep whatever pause state user had
  });
}

// Pause/Resume from settings
if (pauseBtn) {
  pauseBtn.addEventListener("click", () => {
    isPaused = true;
    if (pauseOverlay) pauseOverlay.style.display = "flex";
    render();
  });
}
if (resumeBtn) {
  resumeBtn.addEventListener("click", () => {
    isPaused = false;
    if (pauseOverlay) pauseOverlay.style.display = "none";
    if (settingsMenu) settingsMenu.style.display = "none"; // close menu on resume (requested behavior)
  });
}

// Music toggle
if (musicBtn) {
  musicBtn.addEventListener("click", () => {
    if (isMusicOn) {
      musicSound.pause();
    } else {
      musicSound.play();
    }
    isMusicOn = !isMusicOn;
  });
}

// Live snake color
if (snakeColorInput) {
  snakeColorInput.addEventListener("input", (e) => {
    snakeColor = e.target.value || "#32cd32";
    // reflect immediately if paused
    if (isPaused) render();
  });
}

// Difficulty (multiplier applied to base speed)
if (difficultySelect) {
  difficultySelect.addEventListener("change", (e) => {
    const val = parseFloat(e.target.value);
    difficultyMultiplier = isNaN(val) ? 1 : val;
  });
}

// ================== Start ==================
if (isMusicOn) musicSound.play();
window.requestAnimationFrame(main);
