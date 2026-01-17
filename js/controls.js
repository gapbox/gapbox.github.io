/**
 * ============================================================================
 * EXIT VECTOR - CONTROLS MODULE
 * ============================================================================
 * Handles all input methods: device orientation (IMU/accelerometer),
 * touch controls, and keyboard fallback for desktop.
 * 
 * Features:
 * - DeviceOrientation API for tilt-based control
 * - Touch joystick for mobile fallback
 * - Keyboard arrow keys for desktop
 * - Input smoothing and calibration
 * - iOS 13+ permission handling
 * 
 * @module controls
 * ============================================================================
 */

/**
 * ControlsManager class
 * Centralizes all input handling and provides a unified gravity vector
 */
class ControlsManager {
    /**
     * Create a new ControlsManager
     */
    constructor() {
        /** @type {Object} Current gravity vector from input */
        this.gravity = { x: 0, y: 0 };

        /** @type {Object} Raw gravity before smoothing */
        this.rawGravity = { x: 0, y: 0 };

        /** @type {string} Current active control method */
        this.activeMethod = CONTROL_METHOD.KEYBOARD;

        /** @type {boolean} Whether device orientation is available */
        this.hasDeviceOrientation = false;

        /** @type {boolean} Whether touch is available */
        this.hasTouch = 'ontouchstart' in window;

        /** @type {Object} Calibration offset for tilt */
        this.calibration = { x: 0, y: 0 };

        /** @type {boolean} Whether controls are initialized */
        this.initialized = false;

        /** @type {Object} Keyboard state */
        this.keys = {
            left: false,
            right: false,
            up: false,
            down: false
        };

        /** @type {Object} Touch joystick state */
        this.touch = {
            active: false,
            startX: 0,
            startY: 0,
            currentX: 0,
            currentY: 0
        };

        /** @type {HTMLElement} Joystick element reference */
        this.joystickElement = null;

        /** @type {HTMLElement} Joystick knob element reference */
        this.joystickKnob = null;

        /** @type {boolean} Whether orientation is landscape */
        this.isLandscape = window.innerWidth > window.innerHeight;

        // Bind event handlers
        this._bindHandlers();
    }

    /**
     * Bind event handler methods to this instance
     * @private
     */
    _bindHandlers() {
        this._handleDeviceOrientation = this._handleDeviceOrientation.bind(this);
        this._handleKeyDown = this._handleKeyDown.bind(this);
        this._handleKeyUp = this._handleKeyUp.bind(this);
        this._handleTouchStart = this._handleTouchStart.bind(this);
        this._handleTouchMove = this._handleTouchMove.bind(this);
        this._handleTouchEnd = this._handleTouchEnd.bind(this);
        this._handleResize = this._handleResize.bind(this);
    }

    /**
     * Initialize the controls system
     * Sets up all input listeners and detects available methods
     * @returns {Promise<string>} The active control method
     */
    async init() {
        if (this.initialized) {
            return this.activeMethod;
        }

        // Get joystick elements
        this.joystickElement = document.getElementById('touch-joystick');
        this.joystickKnob = document.getElementById('joystick-knob');

        // Set up keyboard controls (always available)
        this._setupKeyboardControls();

        // Set up touch controls if available
        if (this.hasTouch) {
            this._setupTouchControls();
        }

        // Set up resize handler
        window.addEventListener('resize', this._handleResize);
        window.addEventListener('orientationchange', this._handleResize);

        // Try to set up device orientation
        this.hasDeviceOrientation = this._checkDeviceOrientationSupport();

        if (this.hasDeviceOrientation) {
            // Check if permission is needed (iOS 13+)
            if (typeof DeviceOrientationEvent.requestPermission === 'function') {
                // iOS requires user gesture to request permission
                // Permission will be requested when start button is clicked
                this.activeMethod = CONTROL_METHOD.KEYBOARD;
            } else {
                // Android or older iOS - permission not needed
                this._setupDeviceOrientation();
                this.activeMethod = CONTROL_METHOD.TILT;
            }
        } else {
            this.activeMethod = this.hasTouch ? CONTROL_METHOD.TOUCH : CONTROL_METHOD.KEYBOARD;
        }

        this.initialized = true;
        this._updateControlIndicator();

        return this.activeMethod;
    }

    /**
     * Request device orientation permission (iOS 13+)
     * Must be called from a user gesture event handler
     * @returns {Promise<boolean>} Whether permission was granted
     */
    async requestPermission() {
        if (typeof DeviceOrientationEvent.requestPermission !== 'function') {
            // Permission not required
            return true;
        }

        try {
            const permission = await DeviceOrientationEvent.requestPermission();
            if (permission === 'granted') {
                this._setupDeviceOrientation();
                this.activeMethod = CONTROL_METHOD.TILT;
                this._updateControlIndicator();
                return true;
            }
        } catch (error) {
            console.warn('Device orientation permission denied:', error);
        }

        // Fall back to touch or keyboard
        this.activeMethod = this.hasTouch ? CONTROL_METHOD.TOUCH : CONTROL_METHOD.KEYBOARD;
        this._updateControlIndicator();
        return false;
    }

    /**
     * Check if device orientation API is available
     * @returns {boolean} Whether device orientation is supported
     * @private
     */
    _checkDeviceOrientationSupport() {
        // Check if DeviceOrientationEvent exists
        if (!('DeviceOrientationEvent' in window)) {
            console.log('Device orientation not supported in this browser');
            return false;
        }

        // Check if we're in a secure context (HTTPS required for device motion on mobile)
        if (window.isSecureContext === false) {
            console.warn('Device orientation requires HTTPS (secure context)');
            return false;
        }

        return true;
    }

    /**
     * Set up device orientation event listener
     * @private
     */
    _setupDeviceOrientation() {
        window.addEventListener('deviceorientation', this._handleDeviceOrientation);
    }

    /**
     * Handle device orientation event
     * Converts device tilt to gravity vector
     * @param {DeviceOrientationEvent} event - Orientation event
     * @private
     */
    _handleDeviceOrientation(event) {
        // Check if we have valid data
        if (event.gamma === null || event.beta === null) {
            return;
        }

        // Switch to tilt control if not already
        if (this.activeMethod !== CONTROL_METHOD.TILT) {
            this.activeMethod = CONTROL_METHOD.TILT;
            this._updateControlIndicator();
        }

        // Get tilt angles
        // gamma: left-right tilt (-90 to 90)
        // beta: front-back tilt (-180 to 180)
        let tiltX, tiltY;

        if (this.isLandscape) {
            // In landscape, swap axes
            tiltX = event.beta;
            tiltY = -event.gamma;
        } else {
            // Portrait mode
            tiltX = event.gamma;
            tiltY = event.beta;
        }

        // Apply calibration
        tiltX -= this.calibration.x;
        tiltY -= this.calibration.y;

        // Apply dead zone
        if (Math.abs(tiltX) < CONTROL_CONFIG.deadZone) tiltX = 0;
        if (Math.abs(tiltY) < CONTROL_CONFIG.deadZone) tiltY = 0;

        // Clamp to max angle
        tiltX = Math.max(-CONTROL_CONFIG.maxTiltAngle,
            Math.min(CONTROL_CONFIG.maxTiltAngle, tiltX));
        tiltY = Math.max(-CONTROL_CONFIG.maxTiltAngle,
            Math.min(CONTROL_CONFIG.maxTiltAngle, tiltY));

        // Convert to normalized gravity (-1 to 1)
        this.rawGravity.x = (tiltX / CONTROL_CONFIG.maxTiltAngle) * CONTROL_CONFIG.tiltSensitivity;
        this.rawGravity.y = (tiltY / CONTROL_CONFIG.maxTiltAngle) * CONTROL_CONFIG.tiltSensitivity;
    }

    /**
     * Set up keyboard controls
     * @private
     */
    _setupKeyboardControls() {
        document.addEventListener('keydown', this._handleKeyDown);
        document.addEventListener('keyup', this._handleKeyUp);
    }

    /**
     * Handle keydown event
     * @param {KeyboardEvent} event - Keyboard event
     * @private
     */
    _handleKeyDown(event) {
        let handled = false;

        switch (event.key) {
            case 'ArrowLeft':
            case 'a':
            case 'A':
                this.keys.left = true;
                handled = true;
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                this.keys.right = true;
                handled = true;
                break;
            case 'ArrowUp':
            case 'w':
            case 'W':
                this.keys.up = true;
                handled = true;
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                this.keys.down = true;
                handled = true;
                break;
        }

        if (handled) {
            event.preventDefault();

            // Switch to keyboard control
            if (this.activeMethod !== CONTROL_METHOD.KEYBOARD &&
                this.activeMethod !== CONTROL_METHOD.TILT) {
                this.activeMethod = CONTROL_METHOD.KEYBOARD;
                this._updateControlIndicator();
            }
        }
    }

    /**
     * Handle keyup event
     * @param {KeyboardEvent} event - Keyboard event
     * @private
     */
    _handleKeyUp(event) {
        switch (event.key) {
            case 'ArrowLeft':
            case 'a':
            case 'A':
                this.keys.left = false;
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                this.keys.right = false;
                break;
            case 'ArrowUp':
            case 'w':
            case 'W':
                this.keys.up = false;
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                this.keys.down = false;
                break;
        }
    }

    /**
     * Set up touch controls
     * @private
     */
    _setupTouchControls() {
        const touchArea = document.getElementById('touch-area');
        if (touchArea) {
            touchArea.addEventListener('touchstart', this._handleTouchStart, { passive: false });
            touchArea.addEventListener('touchmove', this._handleTouchMove, { passive: false });
            touchArea.addEventListener('touchend', this._handleTouchEnd, { passive: false });
            touchArea.addEventListener('touchcancel', this._handleTouchEnd, { passive: false });
        }
    }

    /**
     * Handle touch start event
     * @param {TouchEvent} event - Touch event
     * @private
     */
    _handleTouchStart(event) {
        event.preventDefault();

        const touch = event.touches[0];
        this.touch.active = true;
        this.touch.startX = touch.clientX;
        this.touch.startY = touch.clientY;
        this.touch.currentX = touch.clientX;
        this.touch.currentY = touch.clientY;

        // Show joystick
        this._showJoystick(touch.clientX, touch.clientY);

        // Switch to touch control if not using tilt
        if (this.activeMethod !== CONTROL_METHOD.TILT) {
            this.activeMethod = CONTROL_METHOD.TOUCH;
            this._updateControlIndicator();
        }
    }

    /**
     * Handle touch move event
     * @param {TouchEvent} event - Touch event
     * @private
     */
    _handleTouchMove(event) {
        event.preventDefault();

        if (!this.touch.active) return;

        const touch = event.touches[0];
        this.touch.currentX = touch.clientX;
        this.touch.currentY = touch.clientY;

        // Calculate offset from start
        const dx = this.touch.currentX - this.touch.startX;
        const dy = this.touch.currentY - this.touch.startY;

        // Calculate distance
        const distance = Math.sqrt(dx * dx + dy * dy);
        const maxDistance = CONTROL_CONFIG.joystickRadius;

        // Clamp to max radius
        const clampedDistance = Math.min(distance, maxDistance);
        const angle = Math.atan2(dy, dx);

        // Calculate clamped position
        const clampedX = Math.cos(angle) * clampedDistance;
        const clampedY = Math.sin(angle) * clampedDistance;

        // Update joystick visual
        this._updateJoystick(clampedX, clampedY);

        // Convert to gravity (only if tilt is not active)
        if (this.activeMethod !== CONTROL_METHOD.TILT) {
            const normalizedX = clampedX / maxDistance;
            const normalizedY = clampedY / maxDistance;

            this.rawGravity.x = normalizedX * CONTROL_CONFIG.tiltSensitivity;
            this.rawGravity.y = normalizedY * CONTROL_CONFIG.tiltSensitivity;
        }
    }

    /**
     * Handle touch end event
     * @param {TouchEvent} event - Touch event
     * @private
     */
    _handleTouchEnd(event) {
        event.preventDefault();

        this.touch.active = false;

        // Reset gravity if using touch control
        if (this.activeMethod === CONTROL_METHOD.TOUCH) {
            this.rawGravity.x = 0;
            this.rawGravity.y = 0;
        }

        // Hide joystick
        this._hideJoystick();
    }

    /**
     * Show joystick at position
     * @param {number} x - X position
     * @param {number} y - Y position
     * @private
     */
    _showJoystick(x, y) {
        if (!this.joystickElement) return;

        this.joystickElement.style.left = `${x}px`;
        this.joystickElement.style.top = `${y}px`;
        this.joystickElement.classList.remove('hidden');

        if (this.joystickKnob) {
            this.joystickKnob.style.transform = 'translate(-50%, -50%)';
        }
    }

    /**
     * Update joystick knob position
     * @param {number} offsetX - X offset from center
     * @param {number} offsetY - Y offset from center
     * @private
     */
    _updateJoystick(offsetX, offsetY) {
        if (!this.joystickKnob) return;

        this.joystickKnob.style.transform =
            `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`;
    }

    /**
     * Hide joystick
     * @private
     */
    _hideJoystick() {
        if (!this.joystickElement) return;

        this.joystickElement.classList.add('hidden');
    }

    /**
     * Handle window resize/orientation change
     * @private
     */
    _handleResize() {
        this.isLandscape = window.innerWidth > window.innerHeight;
    }

    /**
     * Update gravity based on current input
     * Call this each frame to get smoothed gravity
     */
    update() {
        // Check if any keyboard key is pressed
        const keyboardActive = this.keys.left || this.keys.right ||
            this.keys.up || this.keys.down;

        // If keyboard is active, switch to keyboard mode and use keyboard input
        if (keyboardActive) {
            // Force keyboard mode when keys are pressed
            if (this.activeMethod !== CONTROL_METHOD.KEYBOARD) {
                this.activeMethod = CONTROL_METHOD.KEYBOARD;
                this._updateControlIndicator();
            }

            // Set raw gravity based on keys
            this.rawGravity.x = 0;
            this.rawGravity.y = 0;

            if (this.keys.left) this.rawGravity.x -= CONTROL_CONFIG.tiltSensitivity;
            if (this.keys.right) this.rawGravity.x += CONTROL_CONFIG.tiltSensitivity;
            if (this.keys.up) this.rawGravity.y -= CONTROL_CONFIG.tiltSensitivity;
            if (this.keys.down) this.rawGravity.y += CONTROL_CONFIG.tiltSensitivity;
        } else if (this.activeMethod === CONTROL_METHOD.KEYBOARD) {
            // No keys pressed in keyboard mode - reset gravity
            this.rawGravity.x = 0;
            this.rawGravity.y = 0;
        }
        // For TILT and TOUCH modes, rawGravity is set by their respective handlers

        // Apply smoothing
        const smoothing = CONTROL_CONFIG.smoothing;
        this.gravity.x += (this.rawGravity.x - this.gravity.x) * smoothing;
        this.gravity.y += (this.rawGravity.y - this.gravity.y) * smoothing;

        // Apply threshold to prevent drift
        if (Math.abs(this.gravity.x) < 0.001) this.gravity.x = 0;
        if (Math.abs(this.gravity.y) < 0.001) this.gravity.y = 0;
    }

    /**
     * Get current gravity vector
     * @returns {Object} Gravity vector { x, y }
     */
    getGravity() {
        return { x: this.gravity.x, y: this.gravity.y };
    }

    /**
     * Get current control method
     * @returns {string} Active control method
     */
    getActiveMethod() {
        return this.activeMethod;
    }

    /**
     * Calibrate tilt controls to current position
     */
    calibrate() {
        this.calibration.x = this.rawGravity.x / CONTROL_CONFIG.tiltSensitivity * CONTROL_CONFIG.maxTiltAngle;
        this.calibration.y = this.rawGravity.y / CONTROL_CONFIG.tiltSensitivity * CONTROL_CONFIG.maxTiltAngle;
    }

    /**
     * Update the control indicator UI element
     * @private
     */
    _updateControlIndicator() {
        const icon = document.getElementById('control-icon');
        const text = document.getElementById('control-text');

        if (!icon || !text) return;

        switch (this.activeMethod) {
            case CONTROL_METHOD.TILT:
                icon.textContent = '📱';
                text.textContent = 'Tilt';
                break;
            case CONTROL_METHOD.TOUCH:
                icon.textContent = '👆';
                text.textContent = 'Touch';
                break;
            case CONTROL_METHOD.KEYBOARD:
                icon.textContent = '⌨️';
                text.textContent = 'Keys';
                break;
        }
    }

    /**
     * Get debug information
     * @returns {Object} Debug data
     */
    getDebugInfo() {
        return {
            method: this.activeMethod,
            gravityX: this.gravity.x.toFixed(3),
            gravityY: this.gravity.y.toFixed(3),
            rawX: this.rawGravity.x.toFixed(3),
            rawY: this.rawGravity.y.toFixed(3),
            isLandscape: this.isLandscape
        };
    }

    /**
     * Reset controls state
     */
    reset() {
        this.gravity = { x: 0, y: 0 };
        this.rawGravity = { x: 0, y: 0 };
        this.keys = { left: false, right: false, up: false, down: false };
        this.touch.active = false;
        this._hideJoystick();
    }

    /**
     * Destroy and clean up event listeners
     */
    destroy() {
        window.removeEventListener('deviceorientation', this._handleDeviceOrientation);
        document.removeEventListener('keydown', this._handleKeyDown);
        document.removeEventListener('keyup', this._handleKeyUp);
        window.removeEventListener('resize', this._handleResize);
        window.removeEventListener('orientationchange', this._handleResize);

        const touchArea = document.getElementById('touch-area');
        if (touchArea) {
            touchArea.removeEventListener('touchstart', this._handleTouchStart);
            touchArea.removeEventListener('touchmove', this._handleTouchMove);
            touchArea.removeEventListener('touchend', this._handleTouchEnd);
            touchArea.removeEventListener('touchcancel', this._handleTouchEnd);
        }
    }
}

// Create singleton instance
const controlsManager = new ControlsManager();

// Export for use in other modules
window.ControlsManager = controlsManager;
