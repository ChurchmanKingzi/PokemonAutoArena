/**
 * Pause button system for Pokemon battles
 * Controls pausing and resuming all battle functions
 */

// Global pause state
let isPaused = false;

// Store animation states for restoration
const pausedElements = new Map();
let originalRAF = null;
let originalSetTimeout = null;

/**
 * Get the current pause state
 * @returns {boolean} - Whether the battle is currently paused
 */
export function getIsPaused() {
    return isPaused;
}

/**
 * Set the pause state
 * @param {boolean} paused - New pause state
 */
export function setIsPaused(paused) {
    const wasPaused = isPaused;
    isPaused = paused;
    
    // Update button text based on pause state
    const pauseButton = document.getElementById('pause-button');
    if (pauseButton) {
        pauseButton.textContent = isPaused ? 'Fortfahren' : 'PAUSE';
        pauseButton.setAttribute('aria-pressed', isPaused.toString());
    }
    
    // If we're transitioning from paused to unpaused, resume animations
    if (wasPaused && !isPaused) {
        resumeBattle();
    } else if (!wasPaused && isPaused) {
        pauseBattle();
    }
    
    console.log(`Battle ${isPaused ? 'paused' : 'resumed'}`);
}

/**
 * Pause all battle activity
 */
function pauseBattle() {
    // Add a visual overlay to indicate pause state
    createPauseOverlay();
    
    // Freeze all animations - select everything that might be animated
    document.querySelectorAll(
        '.projectile, .animation-wrapper, .battlefield-character, .pokemon-sprite, ' + 
        '.damage-number, .status-effect-indicator, .stat-boost-bounce, .stat-arrow, ' + 
        '.cone-indicator, .area-effect-particle, .explosion-animation, .attack-cone, ' +
        '.weather-effect, .melee-attack-animation-wrapper, .dodge-animation-wrapper, ' +
        '.battlefield-grid, .pokemon-overlay, .hp-bar, [style*="animation"], [style*="transition"]'
    ).forEach(el => {
        try {
            // Save the current state for restoration later
            const state = {
                animationPlayState: el.style.animationPlayState,
                transition: el.style.transition,
                filter: el.style.filter,
                transform: el.style.transform
            };
            pausedElements.set(el, state);
            
            // Pause all animations
            el.style.animationPlayState = 'paused';
            // Freeze transitions
            el.style.transition = 'none';
        } catch (e) {
            console.warn('Error pausing element:', e);
        }
    });
    
    // Freeze any requestAnimationFrame loops
    if (!originalRAF) {
        originalRAF = window.requestAnimationFrame;
        window.requestAnimationFrame = function(callback) {
            if (isPaused) {
                return 0; // Don't schedule anything during pause
            }
            return originalRAF(callback);
        };
    }
    
    // Freeze any setTimeout calls
    if (!originalSetTimeout) {
        originalSetTimeout = window.setTimeout;
        window.setTimeout = function(callback, delay, ...args) {
            if (isPaused) {
                return 0; // Don't schedule anything during pause
            }
            return originalSetTimeout(callback, delay, ...args);
        };
    }
    
    // Cancel active projectile animation frame
    if (window.projectileAnimationFrameId) {
        cancelAnimationFrame(window.projectileAnimationFrameId);
        window.projectileAnimationFrameId = null;
    }
    
    // Find and store any active intervals
    for (let i = 1; i < 1000; i++) {
        window.clearInterval(i); // Clear any active intervals
    }
}

/**
 * Resume battle after pause
 */
function resumeBattle() {
    // Remove the pause overlay
    removePauseOverlay();
    
    // Restore all animations
    pausedElements.forEach((state, el) => {
        try {
            // Restore original states
            el.style.animationPlayState = state.animationPlayState || 'running';
            el.style.transition = state.transition || '';
            
            // Only restore filter/transform if they were modified during pause
            if (state.filter) el.style.filter = state.filter;
            if (state.transform) el.style.transform = state.transform;
        } catch (e) {
            console.warn('Error resuming element:', e);
        }
    });
    pausedElements.clear();
    
    // Restore original requestAnimationFrame
    if (originalRAF) {
        window.requestAnimationFrame = originalRAF;
        originalRAF = null;
    }
    
    // Restore original setTimeout
    if (originalSetTimeout) {
        window.setTimeout = originalSetTimeout;
        originalSetTimeout = null;
    }
    
    // Resume projectile system
    try {
        import('./projectileSystem.js').then(module => {
            if (typeof module.startProjectileSystem === 'function') {
                module.startProjectileSystem();
            }
        }).catch(error => {
            console.warn('Could not import projectileSystem.js:', error);
        });
    } catch (error) {
        console.warn('Error resuming projectile system:', error);
    }
    
    // Resume turn system
    try {
        import('./turnSystem.js').then(module => {
            if (typeof module.turn === 'function') {
                // Small delay to let animations resume before continuing
                setTimeout(() => module.turn(), 50);
            }
        }).catch(error => {
            console.warn('Could not import turnSystem.js:', error);
        });
    } catch (error) {
        console.warn('Error resuming turn system:', error);
    }
    
    // Resume camera system
    try {
        import('./cameraSystem.js').then(module => {
            if (typeof module.recalculateBattleZoom === 'function') {
                module.recalculateBattleZoom();
            }
        }).catch(error => {
            console.warn('Could not import cameraSystem.js:', error);
        });
    } catch (error) {
        console.warn('Error resuming camera system:', error);
    }
}

/**
 * Create a visual overlay to indicate pause state
 */
function createPauseOverlay() {
    // Check if overlay already exists
    if (document.getElementById('pause-overlay')) return;
    
    const overlay = document.createElement('div');
    overlay.id = 'pause-overlay';
    overlay.style.position = 'absolute';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
    overlay.style.zIndex = '10000';
    overlay.style.pointerEvents = 'none'; // Allow clicks to pass through
    
    // Add a pause indicator
    const indicator = document.createElement('div');
    indicator.style.position = 'absolute';
    indicator.style.top = '50%';
    indicator.style.left = '50%';
    indicator.style.transform = 'translate(-50%, -50%)';
    indicator.style.color = 'white';
    indicator.style.fontSize = '48px';
    indicator.style.fontWeight = 'bold';
    indicator.style.textShadow = '2px 2px 8px rgba(0, 0, 0, 0.7)';
    indicator.textContent = 'PAUSE';
    
    overlay.appendChild(indicator);
    
    // Add to the battlefield
    const battlefield = document.querySelector('.battlefield-grid') || 
                      document.querySelector('.battlefield-content') ||
                      document.querySelector('.battlefield');
    
    if (battlefield) {
        battlefield.appendChild(overlay);
    } else {
        document.body.appendChild(overlay);
    }
}

/**
 * Remove the pause overlay
 */
function removePauseOverlay() {
    const overlay = document.getElementById('pause-overlay');
    if (overlay && overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
    }
}

/**
 * Toggle the pause state
 */
export function togglePause() {
    setIsPaused(!isPaused);
}

/**
 * Reset the pause state (ensure battle is unpaused)
 * Called when returning to team builder
 */
export function resetPauseState() {
    // Restore original functions
    if (originalRAF) {
        window.requestAnimationFrame = originalRAF;
        originalRAF = null;
    }
    
    if (originalSetTimeout) {
        window.setTimeout = originalSetTimeout;
        originalSetTimeout = null;
    }
    
    // Clear any saved element states
    pausedElements.clear();
    
    setIsPaused(false);
    removePauseOverlay();
}

/**
 * Create the pause button element
 * @returns {HTMLElement} - The created pause button
 */
export function createPauseButton() {
    const pauseButton = document.createElement('button');
    pauseButton.id = 'pause-button';
    pauseButton.className = 'pause-button';
    pauseButton.textContent = 'PAUSE';
    pauseButton.setAttribute('aria-pressed', 'false');
    pauseButton.style.marginLeft = '10px';
    pauseButton.style.fontWeight = 'bold';
    
    // Add click event to toggle pause
    pauseButton.addEventListener('click', () => {
        togglePause();
    });
    
    return pauseButton;
}

/**
 * Initialize the pause button system
 * Called when building the arena
 */
export function initializePauseButton() {
    // Reset pause state
    resetPauseState();
    
    // Add a small style block for pause-related CSS
    const styleId = 'pause-button-styles';
    if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .pause-button {
                background-color: #f44336;
                color: white;
                padding: 10px 20px;
                font-size: 16px;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                transition: background-color 0.3s;
                font-weight: bold;
            }
            
            .pause-button:hover {
                background-color: #d32f2f;
            }
            
            .pause-button:active {
                background-color: #b71c1c;
            }
            
            /* When the game is paused */
            .pause-button[aria-pressed="true"] {
                background-color: #4CAF50;
            }
            
            .pause-button[aria-pressed="true"]:hover {
                background-color: #388E3C;
            }
            
            /* Pause overlay styling */
            #pause-overlay {
                animation: pause-fade-in 0.3s ease-out forwards;
            }
            
            @keyframes pause-fade-in {
                from { opacity: 0; }
                to { opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
}

/**
 * Check if the system should proceed (not paused)
 * For integrating with turn and projectile systems
 * @returns {boolean} - Whether the system should proceed
 */
export function shouldProceed() {
    return !isPaused;
}