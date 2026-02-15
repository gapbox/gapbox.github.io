# Exit Vector

**Exit Vector** is a gravity-driven maze experience where players control multiple balls simultaneously by tilting their device. Navigate through procedurally generated levels, aim for high-value exit zones, and master the physics to beat the target scores.

## Project Purpose
The goal of this project is to demonstrate advanced HTML5 game development techniques, specifically focusing on:
- **Physics Simulation**: Real-time multi-body physics with collision detection and response.
- **Mobile-First Interaction**: utilizing device sensors for a unique, physical control scheme.
- **Procedural Generation**: Creating infinite, playable maze variations.
- **Responsive Design**: A UI that adapts seamlessly between desktop and mobile form factors.

## How to Run
This is a static HTML5 web application.

### Desktop
1.  Download or clone the repository.
2.  Open `index.html` in any modern web browser (Chrome, Firefox, Safari, Edge).
3.  Use the **Arrow Keys** or **WASD** to control the direction of gravity.

### Mobile (Recommended)
Exit Vector is designed for mobile play.
1.  **Local Server**: For the best experience, serve the project folder using a local web server (e.g., `python -m http.server`, `npx serve`, or VS Code Live Server).
2.  **HTTPS Requirement**: The **DeviceOrientation API** (tilt control) typically requires a secure context (HTTPS) on modern iOS and Android devices.
    *   If running locally, you may need to use a tunneling tool (like `ngrok`) to create an HTTPS endpoint.
    *   Without HTTPS, the game will default to **Touch Controls** (Virtual Joystick).
3.  **Permissions**: On iOS 13+, you must grant permission for Motion & Orientation access. The game will prompt for this when you tap "Start Game".

## Technologies Used
- **HTML5**: Semantic structure and game container.
- **CSS3**: Modern styling using Custom Properties (variables), Flexbox, CSS Grid, and glassmorphism effects for the UI.
- **JavaScript (ES6+)**: Vanilla JavaScript using a class-based architecture. No external frameworks or 3rd-party game engines were used. `game.js`, `maze.js`, `physics.js`, `renderer.js`, and `controls.js` handle all logic.
- **Google Fonts**: Integration of 'Orbitron' and 'Rajdhani' for futuristic typography.

## HTML5 Features Used
This project makes extensive use of modern HTML5 APIs:

1.  **Canvas API**: The core game loop renders to an HTML5 `<canvas>` element. It handles all visual elements including the maze walls, ball physics, particle trails, and dynamic lighting effects.
2.  **DeviceOrientation API**: Accesses the device's accelerometer and gyroscope data (`alpha`, `beta`, `gamma`) to calculate a gravity vector, allowing users to control the game by physically tilting their phone.
3.  **Touch Events API**: Implements multi-touch support for the virtual joystick and UI interactions (`touchstart`, `touchmove`, `touchend`), ensuring low-latency response on touchscreens.
4.  **requestAnimationFrame**: Drives the game loop at 60 FPS (frames per second), syncing updates with the display's refresh rate for smooth animations and efficient battery usage.
5.  **Audio API**: (Note: Structure supports it, though currently visual-focused).
6.  **Page Visibility API**: Pauses the game loop automatically when the tab becomes inactive to save resources.
