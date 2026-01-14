/**
 * PONG
 * Refactored with Classes, Game Loop, AI, and Sound
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

// Physics constants (adjusted for ~60FPS)
const PADDLE_SPEED = 6;
const INITIAL_BALL_SPEED = 4;
const BALL_SPEED_INCREASE = 0.5;
const MAX_BALL_SPEED = 15;

// Keys
const KEYS = {
    P1_UP: 'w',
    P1_DOWN: 's',
    P2_UP: 'ArrowUp',
    P2_DOWN: 'ArrowDown',
    PAUSE: 'Escape'
};

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
}

// --- Input Handler ---
class InputHandler {
    constructor() {
        this.keys = new Set();
        
        window.addEventListener('keydown', e => {
            this.keys.add(e.key);
            // Prevent default scrolling for game keys
            if ([KEYS.P2_UP, KEYS.P2_DOWN, ' '].includes(e.key)) {
                e.preventDefault();
            }
        });
        
        window.addEventListener('keyup', e => {
            this.keys.delete(e.key);
        });
    }

    isPressed(key) {
        return this.keys.has(key);
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

        this.state = 'MENU'; // MENU, PLAYING, PAUSED
        this.isSinglePlayer = false;

        // Game Objects
        this.paddle1 = { x: 0, y: 0, score: 0 };
        this.paddle2 = { x: 0, y: 0, score: 0 };
        this.ball = { x: 0, y: 0, dx: 0, dy: 0, speed: 0 };

        // Bind reset button
        resetBtn.addEventListener('click', () => this.resetGame());
        
        // Listen for pause toggle separately
        window.addEventListener('keydown', (e) => {
            if (e.key === KEYS.PAUSE) this.togglePause();
            if (this.state === 'MENU' && e.key === 'Enter') {
                this.isSinglePlayer = false;
                this.start();
            }
            if (this.state === 'MENU' && e.key === 'a') {
                this.isSinglePlayer = true;
                this.start();
            }
        });

        this.resetPositions();
        this.drawMenu();
    }

    resetPositions() {
        // Center paddles
        this.paddle1.y = (this.height - PADDLE_HEIGHT) / 2;
        this.paddle1.x = 0;
        
        this.paddle2.y = (this.height - PADDLE_HEIGHT) / 2;
        this.paddle2.x = this.width - PADDLE_WIDTH;

        // Reset ball
        this.resetBall();
    }

    resetBall() {
        this.ball.x = this.width / 2;
        this.ball.y = this.height / 2;
        this.ball.speed = INITIAL_BALL_SPEED;
        
        // Random direction
        this.ball.dx = Math.random() > 0.5 ? 1 : -1;
        this.ball.dy = Math.random() > 0.5 ? 1 : -1;
    }

    start() {
        this.state = 'PLAYING';
        this.loop();
    }

    togglePause() {
        if (this.state === 'PLAYING') {
            this.state = 'PAUSED';
            this.drawPause();
        } else if (this.state === 'PAUSED') {
            this.state = 'PLAYING';
            this.loop();
        }
    }

    resetGame() {
        this.paddle1.score = 0;
        this.paddle2.score = 0;
        this.updateScoreDisplay();
        this.resetPositions();
        this.state = 'MENU';
        this.drawMenu();
    }

    update() {
        if (this.state !== 'PLAYING') return;

        // --- Paddle 1 Movement (Player) ---
        if (this.input.isPressed(KEYS.P1_UP)) {
            if (this.paddle1.y > 0) this.paddle1.y -= PADDLE_SPEED;
        }
        if (this.input.isPressed(KEYS.P1_DOWN)) {
            if (this.paddle1.y < this.height - PADDLE_HEIGHT) this.paddle1.y += PADDLE_SPEED;
        }

        // --- Paddle 2 Movement (Player or AI) ---
        if (this.isSinglePlayer) {
            // Simple AI
            const paddleCenter = this.paddle2.y + PADDLE_HEIGHT / 2;
            // Add a deadzone to prevent jitter
            if (paddleCenter < this.ball.y - 10) {
                this.paddle2.y += PADDLE_SPEED * 0.85; // Slightly slower than player
            } else if (paddleCenter > this.ball.y + 10) {
                this.paddle2.y -= PADDLE_SPEED * 0.85;
            }
        } else {
            if (this.input.isPressed(KEYS.P2_UP)) {
                if (this.paddle2.y > 0) this.paddle2.y -= PADDLE_SPEED;
            }
            if (this.input.isPressed(KEYS.P2_DOWN)) {
                if (this.paddle2.y < this.height - PADDLE_HEIGHT) this.paddle2.y += PADDLE_SPEED;
            }
        }

        // Clamp paddle 2
        this.paddle2.y = Math.max(0, Math.min(this.height - PADDLE_HEIGHT, this.paddle2.y));


        // --- Ball Movement ---
        this.ball.x += this.ball.dx * this.ball.speed;
        this.ball.y += this.ball.dy * this.ball.speed;

        // Wall Collision (Top/Bottom)
        if (this.ball.y <= 0 + BALL_RADIUS || this.ball.y >= this.height - BALL_RADIUS) {
            this.ball.dy *= -1;
            this.audio.playWallHit();
        }

        // Paddle Collision
        // Check Paddle 1
        if (this.ball.x <= this.paddle1.x + PADDLE_WIDTH + BALL_RADIUS) {
            if (this.ball.y > this.paddle1.y && this.ball.y < this.paddle1.y + PADDLE_HEIGHT) {
                this.ball.x = this.paddle1.x + PADDLE_WIDTH + BALL_RADIUS; // Unstuck
                this.ball.dx *= -1;
                this.increaseSpeed();
                this.audio.playPaddleHit();
            }
        }

        // Check Paddle 2
        if (this.ball.x >= this.paddle2.x - BALL_RADIUS) {
            if (this.ball.y > this.paddle2.y && this.ball.y < this.paddle2.y + PADDLE_HEIGHT) {
                this.ball.x = this.paddle2.x - BALL_RADIUS; // Unstuck
                this.ball.dx *= -1;
                this.increaseSpeed();
                this.audio.playPaddleHit();
            }
        }

        // Scoring
        if (this.ball.x <= 0) {
            this.paddle2.score++;
            this.audio.playScore();
            this.updateScoreDisplay();
            this.resetBall();
        } else if (this.ball.x >= this.width) {
            this.paddle1.score++;
            this.audio.playScore();
            this.updateScoreDisplay();
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
        // Clear board
        this.ctx.fillStyle = BOARD_BG;
        this.ctx.fillRect(0, 0, this.width, this.height);

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
    }

    drawMenu() {
        this.ctx.fillStyle = BOARD_BG;
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        this.ctx.fillStyle = "white";
        this.ctx.font = "30px monospace";
        this.ctx.textAlign = "center";
        this.ctx.fillText("PONG", this.width / 2, this.height / 3);
        
        this.ctx.font = "20px monospace";
        this.ctx.fillText("Press ENTER for 2 Players", this.width / 2, this.height / 2);
        this.ctx.fillText("Press 'A' for 1 Player (AI)", this.width / 2, this.height / 2 + 40);
        
        this.ctx.font = "16px monospace";
        this.ctx.fillText("Controls: W/S (Left), Up/Down (Right)", this.width / 2, this.height - 50);
    }

    drawPause() {
        this.ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        this.ctx.fillStyle = "white";
        this.ctx.font = "40px monospace";
        this.ctx.textAlign = "center";
        this.ctx.fillText("PAUSED", this.width / 2, this.height / 2);
    }

    loop() {
        if (this.state !== 'PLAYING') return;

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
