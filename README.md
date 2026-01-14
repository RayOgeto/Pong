# PONG

An implementation of the classic arcade game Pong.

## Features
*   **Single Player (AI)**: Play against a computer opponent.
*   **Multiplayer**: Local 2-player mode on the same keyboard.
*   **Sound Effects**: Synthesized retro sound effects using the Web Audio API.
*   **Smooth Gameplay**: Uses `requestAnimationFrame` for 60FPS animations.
*   **Pause/Menu System**: Integrated menu and pause functionality.

## Controls
*   **Player 1 (Left)**: `W` (Up) / `S` (Down)
*   **Player 2 (Right)**: `Arrow Up` / `Arrow Down`
*   **Pause**: `Escape`
*   **Menu**:
    *   `Enter`: Start 2-Player Game
    *   `A`: Start 1-Player (AI) Game

## Setup
Simply open `index.html` in your browser. No build step required!

## Development
This project uses vanilla JavaScript (ES6+ Classes).
*   `index.js`: Main game logic (Game loop, Input, Physics).
*   `style.css`: Styling and layout.
