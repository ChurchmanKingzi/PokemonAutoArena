/**
 * Configuration constants for the battle system
 * Updated to work with the Pokemon overlay system
 */

// Grid dimensions - start with default value, will be updated
export let GRID_SIZE = 40; // Default "Mittel"
export let TILE_SIZE = 20; // Pixels per tile
export const TEAM_AREA_WIDTH = 8;
export const TEAM_AREA_HEIGHT = 4;

// Constants for calculating arena size
const BASELINE_GRID_SIZE = 40; // Mittel size
const BASELINE_TILE_SIZE = 20; // Baseline tile size for Mittel
const TARGET_ARENA_SIZE = BASELINE_GRID_SIZE * BASELINE_TILE_SIZE; // 800px

// Battle settings
export const MAX_TURN_LIMIT = 400;

// Store references to update functions
let updateCallbacks = [];

/**
 * Register a callback to be called when grid/tile size changes
 * @param {Function} callback - Function to call on size change
 */
export function registerSizeUpdateCallback(callback) {
    updateCallbacks.push(callback);
}

/**
 * Unregister a size update callback
 * @param {Function} callback - Function to remove
 */
export function unregisterSizeUpdateCallback(callback) {
    const index = updateCallbacks.indexOf(callback);
    if (index > -1) {
        updateCallbacks.splice(index, 1);
    }
}

// Update grid size when settings change
export function updateGridSize(newSize) {
    const oldGridSize = GRID_SIZE;
    const oldTileSize = TILE_SIZE;
    
    GRID_SIZE = newSize;
    
    // Calculate new tile size to maintain consistent arena size (approximately 800x800 pixels)
    // For Mittel (40x40), this should remain 20px
    // For smaller arenas like Winzig (15x15), this will be larger (~53px)
    // For larger arenas, this will be smaller
    const newTileSize = Math.round(TARGET_ARENA_SIZE / GRID_SIZE);
    
    // Update tile size
    TILE_SIZE = newTileSize;
    
    // Set CSS variable for global access (useful for animations, etc.)
    document.documentElement.style.setProperty('--tile-size', `${TILE_SIZE}px`);
    document.documentElement.style.setProperty('--grid-size', GRID_SIZE);
    
    // Notify all registered callbacks about the size change
    updateCallbacks.forEach(callback => {
        try {
            callback(newSize, newTileSize, oldGridSize, oldTileSize);
        } catch (error) {
            console.error('Error in size update callback:', error);
        }
    });
    
    // Update Pokemon overlay if it exists
    updatePokemonOverlayForSizeChange();
}

/**
 * Update Pokemon overlay when tile size changes
 */
function updatePokemonOverlayForSizeChange() {
    // Dynamically import to avoid circular dependencies
    import('./pokemonOverlay.js').then(module => {
        if (module.updateAllPokemonSizes) {
            module.updateAllPokemonSizes();
        }
    }).catch(error => {
        console.warn('Could not update Pokemon overlay sizes:', error);
    });
}

/**
 * Get current configuration
 * @returns {Object} - Current configuration
 */
export function getCurrentConfig() {
    return {
        gridSize: GRID_SIZE,
        tileSize: TILE_SIZE,
        arenaPixelSize: GRID_SIZE * TILE_SIZE,
        teamAreaWidth: TEAM_AREA_WIDTH,
        teamAreaHeight: TEAM_AREA_HEIGHT
    };
}

/**
 * Initialize configuration system
 */
export function initializeConfig() {
    // Set initial CSS variables
    document.documentElement.style.setProperty('--tile-size', `${TILE_SIZE}px`);
    document.documentElement.style.setProperty('--grid-size', GRID_SIZE);
}

// Strategy types
export const STRATEGY = {
    AGGRESSIVE: 'aggressive',
    DEFENSIVE: 'defensive',
    FLEEING: 'fleeing'
};

// Attack types
export const ATTACK_TYPE = {
    MELEE: 'melee',
    RANGED: 'ranged'
};

// Team colors
export const TEAM_COLORS = [
    '#e74c3c', // Red
    '#3498db', // Blue
    '#2ecc71', // Green
    '#f39c12', // Orange
    '#9b59b6', // Purple
    '#1abc9c', // Teal
    '#34495e', // Dark Blue
    '#e67e22', // Dark Orange
    '#27ae60', // Dark Green
    '#c0392b'  // Dark Red
];

// Initialize on module load
initializeConfig();