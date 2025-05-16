/**
 * Terrain rendering system for the battlefield
 */

import { TERRAIN_TYPES } from './terrainGenerator.js';

// Colors for different terrain types
export const TERRAIN_COLORS = {
    [TERRAIN_TYPES.GRASS]: '#4CAF50',  // Green
    [TERRAIN_TYPES.WATER]: '#2196F3',  // Blue
    [TERRAIN_TYPES.MOUNTAIN]: '#795548', // Brown
    [TERRAIN_TYPES.SAND]: '#D2B48C',   // Tan/Sand color
    [TERRAIN_TYPES.LAVA]: '#FF5722',   // Red-orange for lava
    [TERRAIN_TYPES.SWAMP]: '#6B8E23',  // Olive green for swamp
    [TERRAIN_TYPES.SNOW]: '#E0F7FA'    // Light blue-white for snow
};

// Darker shades for the checkerboard pattern
export const TERRAIN_COLORS_DARK = {
    [TERRAIN_TYPES.GRASS]: '#388E3C',   // Darker green
    [TERRAIN_TYPES.WATER]: '#1976D2',   // Darker blue
    [TERRAIN_TYPES.MOUNTAIN]: '#5D4037', // Darker brown
    [TERRAIN_TYPES.SAND]: '#BC9B5D',    // Darker sand
    [TERRAIN_TYPES.LAVA]: '#D84315',    // Darker lava
    [TERRAIN_TYPES.SWAMP]: '#556B2F',   // Darker olive green for swamp
    [TERRAIN_TYPES.SNOW]: '#B3E5FC'     // Slightly darker blue-white for snow
};

/**
 * Apply terrain colors to the battlefield tiles
 * @param {Array} terrainGrid - 2D array of terrain types
 */
export function renderTerrain(terrainGrid) {
    // Get all battlefield tiles
    const tiles = document.querySelectorAll('.battlefield-tile');
    
    // Apply the appropriate color to each tile based on terrain
    tiles.forEach(tile => {
        const x = parseInt(tile.dataset.x);
        const y = parseInt(tile.dataset.y);
        
        // Check if the coordinates are valid
        if (terrainGrid && terrainGrid[y] && terrainGrid[y][x]) {
            const terrain = terrainGrid[y][x];
            const isEven = (x + y) % 2 === 0;
            
            // Set the background color based on terrain type and checkerboard pattern
            if (isEven) {
                tile.style.backgroundColor = TERRAIN_COLORS[terrain];
            } else {
                tile.style.backgroundColor = TERRAIN_COLORS_DARK[terrain];
            }
        }
    });
}