/**
 * PONG
 * Refactored with Classes, Game Loop, AI, Sound, Particles, and Game States
 */

// --- Constants ---
const BOARD_BG = "forestgreen";
const PADDLE_1_COLOR = "lightblue";
const PADDLE_2_COLOR = "red";
const PADDLE_BORDER = "black";
const BALL_COLOR = "yellow";
const BALL_BORDER = "black";
const BALL_RADIUS = 12.5;
const PADDLE_WIDTH = 25;
const PADDLE_HEIGHT = 100;

const WIN_SCORE = 5;

// Physics constants
const PADDLE_SPEED = 6;
const INITIAL_BALL_SPEED = 5;
const BALL_SPEED_INCREASE = 0.5;
const MAX_BALL_SPEED = 18;

// Difficulty Settings (AI Speed relative to base speed)
const DIFFICULTIES = {
    EASY: { name: 'EASY', speedRatio: 0.55 },
    MEDIUM: { name: 'MEDIUM', speedRatio: 0.85 },
    HARD: { name: 'HARD', speedRatio: 1.05 }, // Slightly faster than base paddle speed
    IMPOSSIBLE: { name: 'IMPOSSIBLE', speedRatio: 1.8 } 
};

// Keys
const KEYS = {
    P1_UP: 'w',
    P1_DOWN: 's',
    P2_UP: 'ArrowUp',
    P2_DOWN: 'ArrowDown',
    PAUSE: 'Escape',
    MENU_UP: 'ArrowUp',
    MENU_DOWN: 'ArrowDown',
    SELECT: 'Enter'
};

// --- Particle System ---
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 4 + 1;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.life = 1.0;
        this.decay = Math.random() * 0.03 + 0.02;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= this.decay;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, 6, 6);
        ctx.restore();
    }
}

// --- Audio Controller ---
class AudioController {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.enabled = true;
    }

    playTone(freq, type = 'square', duration = 0.1) {
        if (!this.enabled) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        
        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    playPaddleHit() { this.playTone(440, 'square', 0.1); }
    playWallHit() { this.playTone(220, 'square', 0.1); }
    playScore() { this.playTone(660, 'sine', 0.3); }
    playWin() { 
        this.playTone(523.25, 'triangle', 0.2);
        setTimeout(() => this.playTone(659.25, 'triangle', 0.2), 200);
        setTimeout(() => this.playTone(783.99, 'triangle', 0.4), 400);
    }
}

// --- Input Handler ---
class InputHandler {
    constructor() {
        this.keys = new Set();
        this.callbacks = {};

        window.addEventListener('keydown', e => {
            this.keys.add(e.key);
            if ([KEYS.P2_UP, KEYS.P2_DOWN, ' '].includes(e.key)) {
                e.preventDefault();
            }
            if (this.callbacks[e.key]) {
                this.callbacks[e.key]();
            }
        });
        
        window.addEventListener('keyup', e => {
            this.keys.delete(e.key);
        });
    }

    isPressed(key) {
        return this.keys.has(key);
    }

    onKey(key, callback) {
        this.callbacks[key] = callback;
    }

    simulateKey(key, isPressed) {
        if (isPressed) {
            this.keys.add(key);
            if (this.callbacks[key]) {
                this.callbacks[key]();
            }
        } else {
            this.keys.delete(key);
        }
    }
}

// --- Game Logic ---
class Game {
    constructor(canvas, scoreElement, resetBtn) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.scoreElement = scoreElement;
        this.width = canvas.width;
        this.height = canvas.height;

        this.audio = new AudioController();
        this.input = new InputHandler();

        this.state = 'MENU'; // MENU, PLAYING, PAUSED, GAMEOVER
        this.mode = 'PVP'; // PVP, AI
        this.difficulty = DIFFICULTIES.MEDIUM;
        this.winner = null;

        // Visual Effects
        this.particles = [];
        this.shakeTime = 0;
        this.shakeIntensity = 0;

        // Game Objects
        this.paddle1 = { x: 0, y: 0, score: 0 };
        this.paddle2 = { x: 0, y: 0, score: 0 };
        this.ball = { 
            x: 0, y: 0, dx: 0, dy: 0, speed: 0,
            trail: [] 
        };

        // UI State
        this.menuSelection = 0; // 0: PVP, 1: AI (Easy), 2: AI (Med), 3: AI (Hard)
        this.menuOptions = [
            { text: "2 Player (PvP)", mode: 'PVP' },
            { text: "1 Player (Easy)", mode: 'AI', diff: DIFFICULTIES.EASY },
            { text: "1 Player (Medium)", mode: 'AI', diff: DIFFICULTIES.MEDIUM },
            { text: "1 Player (Hard)", mode: 'AI', diff: DIFFICULTIES.HARD },
            { text: "1 Player (Impossible)", mode: 'AI', diff: DIFFICULTIES.IMPOSSIBLE }
        ];

        // Bind reset button
        resetBtn.addEventListener('click', () => this.resetGame());
        
        // Input bindings for non-continuous actions
        this.input.onKey(KEYS.PAUSE, () => this.togglePause());
        this.input.onKey(KEYS.MENU_UP, () => this.navigateMenu(-1));
        this.input.onKey(KEYS.MENU_DOWN, () => this.navigateMenu(1));
        this.input.onKey(KEYS.SELECT, () => this.selectMenuOption());

        this.resetPositions();
        this.loop(); // Start the loop immediately to render menu
    }

    navigateMenu(direction) {
        if (this.state !== 'MENU') return;
        this.menuSelection += direction;
        if (this.menuSelection < 0) this.menuSelection = this.menuOptions.length - 1;
        if (this.menuSelection >= this.menuOptions.length) this.menuSelection = 0;
    }

    selectMenuOption() {
        if (this.state === 'MENU') {
            const option = this.menuOptions[this.menuSelection];
            this.mode = option.mode;
            if (option.diff) this.difficulty = option.diff;
            this.start();
        } else if (this.state === 'GAMEOVER') {
            this.resetGame();
        }
    }

    resetPositions() {
        this.paddle1.y = (this.height - PADDLE_HEIGHT) / 2;
        this.paddle1.x = 0;
        
        this.paddle2.y = (this.height - PADDLE_HEIGHT) / 2;
        this.paddle2.x = this.width - PADDLE_WIDTH;

        this.resetBall();
    }

    resetBall() {
        this.ball.x = this.width / 2;
        this.ball.y = this.height / 2;
        this.ball.speed = INITIAL_BALL_SPEED;
        this.ball.trail = [];
        this.ball.dx = Math.random() > 0.5 ? 1 : -1;
        this.ball.dy = Math.random() > 0.5 ? 1 : -1;
    }

    start() {
        this.paddle1.score = 0;
        this.paddle2.score = 0;
        this.updateScoreDisplay();
        this.state = 'PLAYING';
        this.resetPositions();
    }

    togglePause() {
        if (this.state === 'PLAYING') {
            this.state = 'PAUSED';
        } else if (this.state === 'PAUSED') {
            this.state = 'PLAYING';
        }
    }

    resetGame() {
        this.state = 'MENU';
        this.winner = null;
        this.resetPositions();
    }

    addParticles(x, y, color, count = 10) {
        for (let i = 0; i < count; i++) {
            this.particles.push(new Particle(x, y, color));
        }
    }

    shakeScreen(duration, intensity) {
        this.shakeTime = duration;
        this.shakeIntensity = intensity;
    }

    update() {
        // Update particles regardless of state (for visual flair)
        this.particles = this.particles.filter(p => p.life > 0);
        this.particles.forEach(p => p.update());

        if (this.state !== 'PLAYING') return;

        // Reduce shake
        if (this.shakeTime > 0) this.shakeTime--;

        // --- Paddle 1 ---
        if (this.input.isPressed(KEYS.P1_UP)) {
            if (this.paddle1.y > 0) this.paddle1.y -= PADDLE_SPEED;
        }
        if (this.input.isPressed(KEYS.P1_DOWN)) {
            if (this.paddle1.y < this.height - PADDLE_HEIGHT) this.paddle1.y += PADDLE_SPEED;
        }

        // --- Paddle 2 ---
        if (this.mode === 'AI') {
            const paddleCenter = this.paddle2.y + PADDLE_HEIGHT / 2;
            const aiSpeed = PADDLE_SPEED * this.difficulty.speedRatio;
            
            // AI Movement with deadzone
            if (paddleCenter < this.ball.y - 15) {
                this.paddle2.y += aiSpeed;
            } else if (paddleCenter > this.ball.y + 15) {
                this.paddle2.y -= aiSpeed;
            }
        } else {
            if (this.input.isPressed(KEYS.P2_UP)) {
                if (this.paddle2.y > 0) this.paddle2.y -= PADDLE_SPEED;
            }
            if (this.input.isPressed(KEYS.P2_DOWN)) {
                if (this.paddle2.y < this.height - PADDLE_HEIGHT) this.paddle2.y += PADDLE_SPEED;
            }
        }
        
        // Clamp Paddle 2
        this.paddle2.y = Math.max(0, Math.min(this.height - PADDLE_HEIGHT, this.paddle2.y));

        // --- Ball Trail Logic ---
        this.ball.trail.push({ x: this.ball.x, y: this.ball.y });
        if (this.ball.trail.length > 10) this.ball.trail.shift();

        // --- Ball Movement ---
        this.ball.x += this.ball.dx * this.ball.speed;
        this.ball.y += this.ball.dy * this.ball.speed;

        // Wall Collision
        if (this.ball.y <= 0 + BALL_RADIUS || this.ball.y >= this.height - BALL_RADIUS) {
            this.ball.dy *= -1;
            this.audio.playWallHit();
            this.addParticles(this.ball.x, this.ball.y, "white", 5);
        }

        // Paddle Collision
        const checkPaddleCollision = (paddle, isLeft) => {
            const collisionX = isLeft ? paddle.x + PADDLE_WIDTH + BALL_RADIUS : paddle.x - BALL_RADIUS;
            const hit = isLeft ? this.ball.x <= collisionX : this.ball.x >= collisionX;
            
            if (hit) {
                if (this.ball.y > paddle.y && this.ball.y < paddle.y + PADDLE_HEIGHT) {
                    this.ball.x = collisionX; 
                    this.ball.dx *= -1;
                    this.increaseSpeed();
                    this.audio.playPaddleHit();
                    this.addParticles(this.ball.x, this.ball.y, isLeft ? PADDLE_1_COLOR : PADDLE_2_COLOR, 15);
                    this.shakeScreen(5, 5);
                }
            }
        };

        checkPaddleCollision(this.paddle1, true);
        checkPaddleCollision(this.paddle2, false);

        // Scoring
        if (this.ball.x <= 0) {
            this.scorePoint(2);
        } else if (this.ball.x >= this.width) {
            this.scorePoint(1);
        }
    }

    scorePoint(playerNum) {
        if (playerNum === 1) this.paddle1.score++;
        else this.paddle2.score++;

        this.updateScoreDisplay();
        this.audio.playScore();
        this.shakeScreen(10, 10);
        
        if (this.paddle1.score >= WIN_SCORE || this.paddle2.score >= WIN_SCORE) {
            this.winner = playerNum;
            this.state = 'GAMEOVER';
            this.audio.playWin();
        } else {
            this.resetBall();
        }
    }

    increaseSpeed() {
        if (this.ball.speed < MAX_BALL_SPEED) {
            this.ball.speed += BALL_SPEED_INCREASE;
        }
    }

    updateScoreDisplay() {
        this.scoreElement.textContent = `${this.paddle1.score} : ${this.paddle2.score}`;
    }

    draw() {
        // Handle Shake
        this.ctx.save();
        if (this.shakeTime > 0) {
            const dx = (Math.random() - 0.5) * this.shakeIntensity;
            const dy = (Math.random() - 0.5) * this.shakeIntensity;
            this.ctx.translate(dx, dy);
        }

        // Clear board
        this.ctx.fillStyle = BOARD_BG;
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Draw Trail
        this.ball.trail.forEach((pos, index) => {
            const alpha = (index + 1) / this.ball.trail.length * 0.5;
            this.ctx.globalAlpha = alpha;
            this.ctx.fillStyle = BALL_COLOR;
            this.ctx.beginPath();
            this.ctx.arc(pos.x, pos.y, BALL_RADIUS * (index/this.ball.trail.length), 0, 2 * Math.PI);
            this.ctx.fill();
        });
        this.ctx.globalAlpha = 1.0;

        // Draw Paddles
        this.ctx.strokeStyle = PADDLE_BORDER;
        this.ctx.fillStyle = PADDLE_1_COLOR;
        this.ctx.fillRect(this.paddle1.x, this.paddle1.y, PADDLE_WIDTH, PADDLE_HEIGHT);
        this.ctx.strokeRect(this.paddle1.x, this.paddle1.y, PADDLE_WIDTH, PADDLE_HEIGHT);

        this.ctx.fillStyle = PADDLE_2_COLOR;
        this.ctx.fillRect(this.paddle2.x, this.paddle2.y, PADDLE_WIDTH, PADDLE_HEIGHT);
        this.ctx.strokeRect(this.paddle2.x, this.paddle2.y, PADDLE_WIDTH, PADDLE_HEIGHT);

        // Draw Ball
        this.ctx.fillStyle = BALL_COLOR;
        this.ctx.strokeStyle = BALL_BORDER;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(this.ball.x, this.ball.y, BALL_RADIUS, 0, 2 * Math.PI);
        this.ctx.fill();
        this.ctx.stroke();

        // Draw Particles
        this.particles.forEach(p => p.draw(this.ctx));

        this.ctx.restore(); // Restore shake transform

        // UI Overlays
        if (this.state === 'MENU') this.drawMenu();
        if (this.state === 'PAUSED') this.drawPause();
        if (this.state === 'GAMEOVER') this.drawGameOver();
    }

    drawMenu() {
        this.drawOverlay("PONG");
        
        this.ctx.font = "20px monospace";
        this.ctx.textAlign = "left";
        
        const startX = this.width / 2 - 100;
        let startY = this.height / 2 - 20;

        this.menuOptions.forEach((option, index) => {
            this.ctx.fillStyle = (index === this.menuSelection) ? "yellow" : "white";
            const prefix = (index === this.menuSelection) ? "> " : "  ";
            this.ctx.fillText(prefix + option.text, startX, startY + (index * 30));
        });

        this.ctx.fillStyle = "white";
        this.ctx.font = "14px monospace";
        this.ctx.textAlign = "center";
        this.ctx.fillText("Use Arrow Keys to Select, Enter to Start", this.width / 2, this.height - 30);
    }

    drawPause() {
        this.drawOverlay("PAUSED", "Press ESC to Resume");
    }

    drawGameOver() {
        const winnerText = this.winner === 1 ? "PLAYER 1 WINS!" : "PLAYER 2 WINS!";
        this.drawOverlay(winnerText, "Press ENTER to Main Menu");
    }

    drawOverlay(title, subtitle) {
        this.ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        this.ctx.fillStyle = "white";
        this.ctx.font = "50px monospace";
        this.ctx.textAlign = "center";
        this.ctx.fillText(title, this.width / 2, this.height / 2 - 20);

        if (subtitle) {
            this.ctx.font = "20px monospace";
            this.ctx.fillText(subtitle, this.width / 2, this.height / 2 + 40);
        }
    }

    loop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.loop());
    }
}

// --- Initialization ---
const canvas = document.querySelector('#gameboard');
const scoreText = document.querySelector('#scoretxt');
const resetBtn = document.querySelector('#resetbtn');

const game = new Game(canvas, scoreText, resetBtn);

// Mobile Controls Setup
const setupMobileControl = (id, key) => {
    const btn = document.getElementById(id);
    if (!btn) return;

    const press = (e) => {
        e.preventDefault();
        game.input.simulateKey(key, true);
    };

    const release = (e) => {
        e.preventDefault();
        game.input.simulateKey(key, false);
    };

    btn.addEventListener('mousedown', press);
    btn.addEventListener('mouseup', release);
    btn.addEventListener('touchstart', press, { passive: false });
    btn.addEventListener('touchend', release, { passive: false });
};

// Map buttons to Player 1 controls (and Menu controls which share keys)
// Note: In AI mode, P1 controls the player. In Menu, Menu keys are used.
// We'll map the UI buttons to P1 keys for movement, which usually double as menu keys or we can map multiple.
// The Game class uses KEYS.P1_UP ('w') for player 1, and KEYS.MENU_UP ('ArrowUp') for menu.
// To make it work for both, we can simulate both or ensure the game handles it.
// Let's check the game logic:
// Menu uses KEYS.MENU_UP ('ArrowUp'). Player 1 uses 'w'.
// We should probably map the mobile buttons to 'ArrowUp'/'ArrowDown' since they work for Menu AND Player 2.
// BUT, if the user plays Single Player (AI), they are Player 1 ('w'/'s').
// Let's map the mobile buttons to trigger BOTH 'w' and 'ArrowUp' to cover all bases (Menu + P1).

setupMobileControl('btn-up', 'ArrowUp'); // Menu Up
setupMobileControl('btn-up', 'w');       // Player 1 Up

setupMobileControl('btn-down', 'ArrowDown'); // Menu Down
setupMobileControl('btn-down', 's');         // Player 1 Down

setupMobileControl('btn-select', 'Enter');
setupMobileControl('btn-pause', 'Escape');