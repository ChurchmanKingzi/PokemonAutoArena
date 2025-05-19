/**
 * Battlefield grid creation and management
 * Updated to use the new Pokemon overlay system - Pokemon are no longer placed in tiles
 */

import { GRID_SIZE, TILE_SIZE } from './config.js';
import { getTerrainGrid } from './terrainGenerator.js';
import { TERRAIN_COLORS, TERRAIN_COLORS_DARK } from './terrainRenderer.js';
import { createPokemonOverlay, addPokemonToOverlay } from './pokemonOverlay.js';

/**
 * Create the battlefield grid (without Pokemon - they're now in the overlay)
 * @param {number} gridSize - Size of the grid (gridSize x gridSize)
 * @param {Array} teamAreas - Team starting areas
 * @param {Object} characterPositions - Map of character IDs to their positions
 * @returns {HTMLElement} - The battlefield grid element
 */
export function createBattlefieldGrid(gridSize, teamAreas, characterPositions) {
    const container = document.createElement('div');
    container.className = 'battlefield-grid-container';
    container.style.position = 'relative'; // Important for overlay positioning
    
    const grid = document.createElement('div');
    grid.className = 'battlefield-grid';
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = `repeat(${gridSize}, ${TILE_SIZE}px)`;
    grid.style.gridTemplateRows = `repeat(${gridSize}, ${TILE_SIZE}px)`;
    grid.style.gap = '0';
    grid.style.border = '1px solid #333';
    grid.style.position = 'relative';
    
    // Get the terrain grid
    const terrainGrid = getTerrainGrid();
    
    // Create tiles (without Pokemon sprites)
    for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
            const tile = document.createElement('div');
            tile.className = 'battlefield-tile';
            tile.dataset.x = x;
            tile.dataset.y = y;
            
            // Get terrain type for this tile
            const terrain = terrainGrid && terrainGrid[y] && terrainGrid[y][x] 
                ? terrainGrid[y][x] 
                : 'grass'; // Default to grass
            
            // Apply checkerboard pattern
            const isEven = (x + y) % 2 === 0;
            
            // Set the base color based on terrain type and checkerboard pattern
            if (isEven) {
                tile.style.backgroundColor = TERRAIN_COLORS[terrain];
            } else {
                tile.style.backgroundColor = TERRAIN_COLORS_DARK[terrain];
            }
            
            // Set tile dimensions and properties
            tile.style.width = `${TILE_SIZE}px`;
            tile.style.height = `${TILE_SIZE}px`;
            tile.style.position = 'relative';
            tile.style.overflow = 'visible';
            tile.style.zIndex = '1'; // Base z-index for tiles
            
            // Check if this tile is in a team area and add a team indicator
            teamAreas.forEach((area, teamIndex) => {
                if (x >= area.x && x < area.x + area.width && 
                    y >= area.y && y < area.y + area.height) {
                    
                    // Apply a semi-transparent team color overlay
                    const teamColor = getTeamColor(teamIndex);
                    const colorWithOpacity = hexToRgba(teamColor, 0.3);
                    
                    // Create a team indicator overlay div
                    const teamOverlay = document.createElement('div');
                    teamOverlay.className = 'team-area-overlay';
                    teamOverlay.style.position = 'absolute';
                    teamOverlay.style.top = '0';
                    teamOverlay.style.left = '0';
                    teamOverlay.style.width = '100%';
                    teamOverlay.style.height = '100%';
                    teamOverlay.style.backgroundColor = colorWithOpacity;
                    teamOverlay.style.pointerEvents = 'none';
                    teamOverlay.style.zIndex = '2';
                    
                    // Add the overlay to the tile
                    tile.appendChild(teamOverlay);
                    
                    // Mark the tile as being in a team area
                    tile.dataset.team = teamIndex;
                }
            });
            
            // Check if this tile is occupied by a Pokemon (for visual indication)
            // We don't place the Pokemon here anymore, but we can mark the tile
            for (const charId in characterPositions) {
                const pos = characterPositions[charId];
                
                // Import the occupation check function
                import('./pokemonDistanceCalculator.js').then(module => {
                    if (module.doesPokemonOccupyTile(pos, x, y)) {
                        tile.classList.add('occupied');
                        tile.dataset.occupiedBy = charId;
                    }
                }).catch(console.error);
            }
            
            grid.appendChild(tile);
        }
    }
    
    // Add the grid to the container
    container.appendChild(grid);
    
    // Create and add the Pokemon overlay as a child of the battlefield grid
    // This ensures the overlay transforms with the camera when the grid is transformed
    const pokemonOverlay = createPokemonOverlay(grid);
    
    // Now add all Pokemon to the overlay
    for (const charId in characterPositions) {
        const pos = characterPositions[charId];
        addPokemonToOverlay(charId, pos, pos.teamIndex);
    }
    
    return container;
}

/**
 * Update the battlefield display with the grid and Pokemon overlay
 * @param {Array} teamAreas - Team starting areas
 * @param {Object} positions - Character positions
 * @param {number} teamCount - Number of teams
 */
export function updateBattlefieldDisplay(teamAreas, positions, teamCount) {
    const battlefieldContent = document.querySelector('.battlefield-content');
    
    if (!battlefieldContent) {
        console.error("Battlefield content element not found!");
        return;
    }
    
    // Clear existing content in the battlefield content area
    battlefieldContent.innerHTML = '';
    
    // Create the layout container
    const layoutContainer = document.createElement('div');
    layoutContainer.className = 'battlefield-layout';
    layoutContainer.style.display = 'flex';
    layoutContainer.style.width = '100%';
    layoutContainer.style.height = '100%';
    layoutContainer.style.minHeight = '500px';
    
    // Create the battlefield grid with Pokemon overlay
    const battlefieldGrid = createBattlefieldGrid(GRID_SIZE, teamAreas, positions);
    
    // Style the container to ensure it fills available space
    battlefieldGrid.style.width = '100%';
    battlefieldGrid.style.height = '100%';
    battlefieldGrid.style.aspectRatio = '1 / 1'; // Maintain square aspect ratio
    
    // Add the grid to the layout container
    layoutContainer.appendChild(battlefieldGrid);
    
    // Add the layout container to the battlefield content
    battlefieldContent.appendChild(layoutContainer);
    
    return battlefieldGrid;
}

// Import utility functions that we need
function getTeamColor(teamIndex) {
    // This should be imported from utils.js in the actual implementation
    const colors = [
        '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6',
        '#1abc9c', '#34495e', '#e67e22', '#27ae60', '#c0392b'
    ];
    return colors[teamIndex % colors.length];
}

function hexToRgba(hex, alpha) {
    // Convert hex to rgba with alpha
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}