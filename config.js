/**
 * Configuration constants for the battle system
 */

// Grid dimensions - start with default value, will be updated
export let GRID_SIZE = 40; 
export const TILE_SIZE = 20; // pixels
export const TEAM_AREA_WIDTH = 8;
export const TEAM_AREA_HEIGHT = 4;

// Battle settings
export const MAX_TURN_LIMIT = 400;

// Update grid size when settings change
export function updateGridSize(newSize) {
    GRID_SIZE = newSize;
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