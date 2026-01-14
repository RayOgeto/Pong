# PONG

An implementation of the classic arcade game Pong.

## Features

### 🎮 Gameplay Depth
*   **Single Player AI**: Challenge yourself against 4 difficulty levels:
    *   **Easy**: Good for beginners.
    *   **Medium**: A fair challenge.
    *   **Hard**: Matches your speed.
    *   **Impossible**: Can you beat the machine?
*   **Multiplayer**: Classic 2-player local PvP on one keyboard.
*   **Winning Condition**: First player to **5 points** wins the match!

### ✨ Visual "Juice"
*   **Particle Effects**: Explosions on paddle hits and wall bounces.
*   **Ball Trail**: A fading trail following the ball to emphasize speed.
*   **Screen Shake**: The board vibrates on high-impact collisions.
*   **Smooth Animations**: 60FPS gameplay via `requestAnimationFrame`.

### 🔊 Audio
*   **Synthesized Sound**: Retro bleeps and bloops generated in real-time using the Web Audio API.

## Controls
*   **Navigation (Menu)**:
    *   `Arrow Up` / `Arrow Down`: Select Mode
    *   `Enter`: Confirm / Start Game
*   **Player 1 (Left)**: `W` (Up) / `S` (Down)
*   **Player 2 (Right)**: `Arrow Up` / `Arrow Down`
*   **Pause**: `Escape`

## Setup
Simply open `index.html` in your browser. No build step required!

## Development
This project uses vanilla JavaScript.
*   `index.js`: Main game logic, physics, and rendering.
*   `style.css`: Styling and layout.
