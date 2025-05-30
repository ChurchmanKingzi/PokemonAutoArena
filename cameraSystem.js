/**
 * Camera system for Pokemon battle simulation
 * Provides zoom and pan functionality to follow battle action
 */

import { TILE_SIZE, GRID_SIZE } from './config.js';
import { getCharacterPositions } from './characterPositions.js';

// Configuration
export const DEFAULT_ZOOM = 1;
export const TILES_TO_SHOW_HORIZONTALLY = 15; // Always show this many tiles horizontally
export let BATTLE_ZOOM = 1; // Will be calculated during initialization

// Camera state
let currentZoom = DEFAULT_ZOOM;
let targetX = 0;
let targetY = 0;
let battlefieldElement = null;
let battlefieldContainer = null;
let isTransitioning = false;
let followingProjectile = null;
let projectileFollowInterval = null;

/**
 * Calculate zoom to show exactly N tiles horizontally
 * @param {number} tilesToShow - Number of tiles to show horizontally (default: 9)
 * @returns {number} - Calculated zoom level
 */
function calculateZoomForTileCount(tilesToShow = TILES_TO_SHOW_HORIZONTALLY) {
    if (!battlefieldContainer) {
        console.warn("Cannot calculate zoom: battlefield container not found");
        return 1;
    }
    
    const containerRect = battlefieldContainer.getBoundingClientRect();
    const containerWidth = containerRect.width;
    
    // Width needed to show the specified number of tiles
    const tilesWidth = tilesToShow * TILE_SIZE;
    
    // Calculate zoom to fit exactly this many tiles in the container width
    const zoom = containerWidth / tilesWidth;
    
    return zoom;
}

/**
 * Initialize the camera system
 * @returns {boolean} - Whether initialization was successful
 */
export function initializeCamera() {
    // Reset camera state
    currentZoom = DEFAULT_ZOOM;
    targetX = 0;
    targetY = 0;
    isTransitioning = false;
    followingProjectile = null;
    
    // Get battlefield elements
    battlefieldElement = document.querySelector('.battlefield-grid');
    battlefieldContainer = document.querySelector('.battlefield-grid-container');
    
    if (!battlefieldElement || !battlefieldContainer) {
        console.error("Camera system could not find battlefield elements");
        return false;
    }
    
    // Set up container styles
    battlefieldContainer.style.overflow = 'hidden';
    battlefieldContainer.style.position = 'relative';
    battlefieldContainer.style.width = '100%';
    battlefieldContainer.style.height = '100%';
    battlefieldContainer.style.minHeight = '500px';
    battlefieldContainer.style.aspectRatio = '1 / 1';
    
    // Set up grid element
    battlefieldElement.style.transformOrigin = '0 0';
    battlefieldElement.style.position = 'relative';
    battlefieldElement.style.willChange = 'transform';
    
    // Calculate the consistent battle zoom (always shows 9 tiles horizontally)
    BATTLE_ZOOM = calculateZoomForTileCount(TILES_TO_SHOW_HORIZONTALLY);
    
    // Add resize observer to recalculate zoom on container resize
    const resizeObserver = new ResizeObserver(() => {
        // Recalculate battle zoom when container size changes
        BATTLE_ZOOM = calculateZoomForTileCount(TILES_TO_SHOW_HORIZONTALLY);
        
        if (!isTransitioning) {
            updateCameraTransform();
        }
    });
    
    resizeObserver.observe(battlefieldContainer);
    
    // Set CSS variable
    document.documentElement.style.setProperty('--camera-zoom', currentZoom);
    
    // This ensures the battlefield is visible from the start
    setTimeout(() => {
        // Center the battlefield
        targetX = (GRID_SIZE * TILE_SIZE) / 2;
        targetY = (GRID_SIZE * TILE_SIZE) / 2;
        
        // Use a zoom that shows the entire battlefield (but more than 9 tiles)
        const containerRect = battlefieldContainer.getBoundingClientRect();
        const containerWidth = containerRect.width;
        const containerHeight = containerRect.height;
        const battlefieldWidth = GRID_SIZE * TILE_SIZE;
        const battlefieldHeight = GRID_SIZE * TILE_SIZE;
        
        const widthRatio = containerWidth / battlefieldWidth;
        const heightRatio = containerHeight / battlefieldHeight;
        currentZoom = Math.min(widthRatio, heightRatio) * 0.9;
        
        // Apply transform immediately
        updateCameraTransform();
    }, 0);
    
    return true;
}

/**
 * Start the initial camera sequence for the battle
 * @param {Array} teamAreas - Team areas to focus on
 * @returns {Promise} - Promise that resolves when the sequence is complete
 */
export async function startInitialCameraSequence(teamAreas) {
    if (!battlefieldElement) {
        console.error("Camera system not initialized");
        return Promise.resolve();
    }
    
    // First show the entire battlefield
    await zoomToEntireBattlefield(DEFAULT_ZOOM, 0);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Then zoom to each team area in sequence
    // Use the consistent battle zoom (always shows 9 tiles horizontally)
    for (let i = 0; i < teamAreas.length; i++) {
        const area = teamAreas[i];
        await zoomToArea(area.x, area.y, area.width, area.height, BATTLE_ZOOM, 1000);
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Return immediately after showing team areas - don't zoom out to entire battlefield
    // This allows the battle system to directly focus on the first Pokemon to take action
    return Promise.resolve();
}

/**
 * Zoom to the entire battlefield
 * @param {number} zoom - Zoom level (ignored, calculated to fit battlefield)
 * @param {number} duration - Transition duration in ms
 * @returns {Promise} - Promise that resolves when zooming is complete
 */
export function zoomToEntireBattlefield(zoom = DEFAULT_ZOOM, duration = 0) {
    if (!battlefieldElement || !battlefieldContainer) {
        console.error("Camera system not initialized");
        return Promise.resolve();
    }
    
    // Get container dimensions
    const containerRect = battlefieldContainer.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const containerHeight = containerRect.height;
    
    // Get battlefield dimensions
    const battlefieldWidth = GRID_SIZE * TILE_SIZE;
    const battlefieldHeight = GRID_SIZE * TILE_SIZE;
    
    // Calculate the zoom needed to fit the battlefield in the container with margin
    const widthRatio = containerWidth / battlefieldWidth;
    const heightRatio = containerHeight / battlefieldHeight;
    
    // Use the smaller ratio with a margin to ensure the entire battlefield fits
    const fitZoom = Math.min(widthRatio, heightRatio) * 0.9; // 90% to leave a margin
    
    // Calculate the center point of the battlefield
    const centerX = (GRID_SIZE * TILE_SIZE) / 2;
    const centerY = (GRID_SIZE * TILE_SIZE) / 2;
    
    // Update global CSS variable for camera zoom
    document.documentElement.style.setProperty('--camera-zoom', fitZoom);
    
    // Zoom to the center point with the calculated zoom
    return zoomToPoint(centerX, centerY, fitZoom, duration);
}

/**
 * Focus the camera on a specific character
 * @param {string} charId - Character ID
 * @param {number} duration - Transition duration in ms
 * @returns {Promise} - Promise that resolves when focusing is complete
 */
export function focusOnCharacter(charId, duration = 500) {
    const characterPositions = getCharacterPositions();
    const charData = characterPositions[charId];
    
    if (!charData) {
        console.warn(`Cannot focus on character ${charId}, not found`);
        return Promise.resolve();
    }
    
    // Calculate center point of the character
    const centerX = (charData.x + 0.5) * TILE_SIZE;
    const centerY = (charData.y + 0.5) * TILE_SIZE;
    
    // Use the consistent battle zoom (always shows 9 tiles horizontally)
    const targetZoom = BATTLE_ZOOM;
    
    // Update global CSS variable for camera zoom
    document.documentElement.style.setProperty('--camera-zoom', targetZoom);
    
    // Zoom to the character
    return zoomToPoint(centerX, centerY, targetZoom, duration);
}

/**
 * Start following a projectile with the camera
 * @param {Object} projectile - The projectile to follow
 */
export function followProjectile(projectile) {
    if (!projectile) return;
    
    followingProjectile = projectile;
    
    // Clear any existing follow interval
    if (projectileFollowInterval) {
        clearInterval(projectileFollowInterval);
    }
    
    // Set up interval to follow the projectile
    projectileFollowInterval = setInterval(() => {
        if (followingProjectile && !followingProjectile.removed) {
            // Update camera to follow projectile using consistent battle zoom
            zoomToPoint(followingProjectile.x, followingProjectile.y, BATTLE_ZOOM, 0);
        } else {
            // Projectile was removed or no longer exists
            stopFollowingProjectile();
        }
    }, 16); // ~60fps update rate
}

/**
 * Stop following a projectile
 */
export function stopFollowingProjectile() {
    followingProjectile = null;
    
    if (projectileFollowInterval) {
        clearInterval(projectileFollowInterval);
        projectileFollowInterval = null;
    }
}

/**
 * Zoom to a specific area of the battlefield
 * @param {number} x - Left coordinate
 * @param {number} y - Top coordinate
 * @param {number} width - Width of the area
 * @param {number} height - Height of the area
 * @param {number} zoom - Zoom level (optional, uses consistent battle zoom if not provided)
 * @param {number} duration - Transition duration in ms
 * @returns {Promise} - Promise that resolves when zooming is complete
 */
export function zoomToArea(x, y, width, height, zoom = null, duration = 1000) {
    // Calculate center of the area
    const centerX = (x + width / 2) * TILE_SIZE;
    const centerY = (y + height / 2) * TILE_SIZE;
    
    // Use consistent battle zoom if no zoom specified
    const targetZoom = zoom !== null ? zoom : BATTLE_ZOOM;
    
    // Update global CSS variable for camera zoom
    document.documentElement.style.setProperty('--camera-zoom', targetZoom);
    
    // Zoom to the center point
    return zoomToPoint(centerX, centerY, targetZoom, duration);
}

/**
 * Zoom to a specific point on the battlefield
 * @param {number} centerX - X coordinate to focus on
 * @param {number} centerY - Y coordinate to focus on
 * @param {number} zoom - Zoom level
 * @param {number} duration - Transition duration in ms
 * @returns {Promise} - Promise that resolves when zooming is complete
 */
export function zoomToPoint(centerX, centerY, zoom, duration = 1000) {
    return new Promise(resolve => {
        if (!battlefieldElement || !battlefieldContainer) {
            console.error("Camera system not initialized");
            resolve();
            return;
        }
        
        isTransitioning = true;
        
        // Set target position - this ensures proper tracking
        targetX = centerX;
        targetY = centerY;
        currentZoom = zoom;
        
        // Update global CSS variable for camera zoom
        document.documentElement.style.setProperty('--camera-zoom', zoom);
        
        // For immediate transitions
        if (duration <= 0) {
            updateCameraTransform();
            isTransitioning = false;
            resolve();
            return;
        }
        
        // Set transition on the element - cubic-bezier for smooth camera movement
        battlefieldElement.style.transition = `transform ${duration}ms cubic-bezier(0.3, 0.0, 0.2, 1)`;
        
        // Apply the new zoom and position
        updateCameraTransform();
        
        // Listen for transition end
        const onTransitionEnd = () => {
            battlefieldElement.removeEventListener('transitionend', onTransitionEnd);
            isTransitioning = false;
            
            // NEW: Reapply transform to ensure accuracy
            updateCameraTransform();
            
            resolve();
        };
        
        battlefieldElement.addEventListener('transitionend', onTransitionEnd);
        
        // Safety timeout in case transition event doesn't fire
        setTimeout(() => {
            if (isTransitioning) {
                isTransitioning = false;
                resolve();
            }
        }, duration + 100);
    });
}

/**
 * Update the camera transform based on current position and zoom
 */
function updateCameraTransform() {
    if (!battlefieldElement || !battlefieldContainer) return;
    
    // Get container dimensions
    const containerRect = battlefieldContainer.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const containerHeight = containerRect.height;
    
    // Calculate the scaled size of the battlefield
    const battlefieldWidth = GRID_SIZE * TILE_SIZE;
    const battlefieldHeight = GRID_SIZE * TILE_SIZE;
    const scaledBattlefieldWidth = battlefieldWidth * currentZoom;
    const scaledBattlefieldHeight = battlefieldHeight * currentZoom;
    
    // Get the target position relative to the battlefield size
    const targetXRatio = targetX / battlefieldWidth;
    const targetYRatio = targetY / battlefieldHeight;
    
    // Calculate the position to center the target point in the viewport
    let translateX, translateY;
    
    // SMALL ARENA CASE - Battlefield smaller than container
    if (scaledBattlefieldWidth <= containerWidth && scaledBattlefieldHeight <= containerHeight) {
        // Center the entire battlefield in the container
        translateX = (containerWidth - scaledBattlefieldWidth) / 2;
        translateY = (containerHeight - scaledBattlefieldHeight) / 2;
    } 
    // LARGE ARENA CASE - Battlefield larger than container
    else {
        // Center the target point within the viewport
        const scaledX = targetX * currentZoom;
        const scaledY = targetY * currentZoom;
        
        translateX = (containerWidth / 2) - scaledX;
        translateY = (containerHeight / 2) - scaledY;
    }
    
    // Apply the transform with consistent approach for all arena sizes
    battlefieldElement.style.transform = `scale(${currentZoom}) translate(${translateX / currentZoom}px, ${translateY / currentZoom}px)`;
}

/**
 * Adjust an element's position to account for camera transformation
 * @param {HTMLElement} element - Element to adjust
 * @param {number} x - X coordinate in battlefield space
 * @param {number} y - Y coordinate in battlefield space
 */
export function positionElementWithCamera(element, x, y) {
    if (!battlefieldElement || !element) return;
    
    // Set position relative to the battlefield
    element.style.position = 'absolute';
    element.style.left = `${x}px`;
    element.style.top = `${y}px`;
    element.style.transformOrigin = 'center center';
    
    // Add a class that ensures it scales with the battlefield
    element.classList.add('camera-scaled-element');
}

/**
 * Reset the camera to its default state
 */
export function resetCamera() {
    // Stop following projectiles
    stopFollowingProjectile();
    
    // Reset camera state
    currentZoom = DEFAULT_ZOOM;
    targetX = 0;
    targetY = 0;
    isTransitioning = false;
    
    // Reset transform
    if (battlefieldElement) {
        battlefieldElement.style.transition = 'none';
        battlefieldElement.style.transform = 'none';
    }
    
    // Reset global CSS variable
    document.documentElement.style.setProperty('--camera-zoom', DEFAULT_ZOOM);
}

/**
 * Get the current battle zoom (useful for other systems to know the zoom level)
 * @returns {number} - Current battle zoom level
 */
export function getCurrentBattleZoom() {
    return BATTLE_ZOOM;
}

/**
 * Recalculate battle zoom (useful when grid size changes)
 */
export function recalculateBattleZoom() {
    BATTLE_ZOOM = calculateZoomForTileCount(TILES_TO_SHOW_HORIZONTALLY);
    return BATTLE_ZOOM;
}

/**
 * Follow a cone attack by moving the camera in the cone's direction
 * @param {Object} attacker - The attacker position
 * @param {Object} target - The target direction
 * @param {number} range - Range of the cone
 * @param {number} coneAngle - Angle of the cone in degrees
 * @param {number} duration - Transition duration in ms
 * @returns {Promise} - Promise that resolves when focusing is complete
 */
export function focusOnConeAttack(attacker, target, range, coneAngle, duration = 800) {
    // Don't move camera for 360-degree attacks (full circles)
    if (coneAngle >= 360) {
        return Promise.resolve();
    }
    
    // Calculate direction vector from attacker to target
    const dx = target.x - attacker.x;
    const dy = target.y - attacker.y;
    
    // Handle case where target is same as attacker
    if (dx === 0 && dy === 0) {
        return Promise.resolve();
    }
    
    // Normalize the direction vector
    const distance = Math.sqrt(dx * dx + dy * dy);
    const dirX = dx / distance;
    const dirY = dy / distance;
    
    // Calculate the focus point: move half the cone's range in the cone's direction
    const focusDistance = range * 0.5;
    const focusX = attacker.x + (dirX * focusDistance);
    const focusY = attacker.y + (dirY * focusDistance);
    
    // Convert to pixel coordinates for the camera system
    const centerX = (focusX + 0.5) * TILE_SIZE;
    const centerY = (focusY + 0.5) * TILE_SIZE;
    
    // Use the consistent battle zoom
    const targetZoom = BATTLE_ZOOM;
    
    // Update global CSS variable for camera zoom
    document.documentElement.style.setProperty('--camera-zoom', targetZoom);
    
    // Move camera to the focus point
    return zoomToPoint(centerX, centerY, targetZoom, duration);
}

export function focusOnCharacterSmooth(charId, duration = 500) {
    const characterPositions = getCharacterPositions();
    const charData = characterPositions[charId];
    
    if (!charData) {
        console.warn(`Cannot focus on character ${charId}, not found`);
        return Promise.resolve();
    }
    
    const centerX = (charData.x + 0.5) * TILE_SIZE;
    const centerY = (charData.y + 0.5) * TILE_SIZE;
    const targetZoom = BATTLE_ZOOM;
    
    document.documentElement.style.setProperty('--camera-zoom', targetZoom);
    return zoomToPoint(centerX, centerY, targetZoom, duration);
}