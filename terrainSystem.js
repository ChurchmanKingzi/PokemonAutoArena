// Import the storage for the terrain grid
import { getTerrainGrid, setTerrainGrid, generateTerrain } from './terrainGenerator.js';
import { renderTerrain } from './terrainRenderer.js';
import { getBattlefieldConfig } from './battlefieldConfig.js';

/**
 * Initialize the terrain system
 * @param {Array} teamAreas - Array of team starting areas
 * @returns {Array} - The generated terrain grid
 */
export function initializeTerrainSystem(teamAreas) {
    // Get the current battlefield configuration
    const config = getBattlefieldConfig();
        
    // Generate terrain based on the selected scenario
    const terrainGrid = generateTerrain(
        config.scenario,
        teamAreas
    );
    
    // Log the result
    let mountainCount = 0;
    for (let y = 0; y < terrainGrid.length; y++) {
        for (let x = 0; x < terrainGrid[y].length; x++) {
            if (terrainGrid[y][x] === 'mountain') {
                mountainCount++;
            }
        }
    }
    
    // IMPORTANT: Store the generated grid in the terrainGenerator's state
    setTerrainGrid(terrainGrid);
    
    // Render the terrain
    renderTerrain(terrainGrid);
    
    return terrainGrid;
}

/**
 * Get the current terrain type at a specific position
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @returns {string} - Terrain type at the position
 */
export function getTerrainAt(x, y) {
    const terrainGrid = getTerrainGrid();
    
    if (terrainGrid && terrainGrid[y] && terrainGrid[y][x]) {
        return terrainGrid[y][x];
    }
    
    // Default to grass if position is invalid
    return 'grass';
}

/**
 * Update terrain system with new team areas
 * @param {Array} teamAreas - Array of possibly resized team areas
 * @returns {Array} - The updated terrain grid
 */
export function updateTerrainWithTeamAreas(teamAreas) {
    // Get the current battlefield configuration
    const config = getBattlefieldConfig();
        
    // Generate terrain based on the selected scenario
    const terrainGrid = generateTerrain(
        config.scenario,
        teamAreas
    );
    
    // Store the generated grid in the terrainGenerator's state
    setTerrainGrid(terrainGrid);
    
    // Render the terrain
    renderTerrain(terrainGrid);
    
    return terrainGrid;
}