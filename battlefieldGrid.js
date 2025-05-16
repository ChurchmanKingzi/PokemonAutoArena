/**
 * Battlefield grid creation and management
 * With improved Pokémon size category integration
 */

import { GRID_SIZE, TILE_SIZE } from './config.js';
import { getStrategyText, getStrategyBorderStyle, getTeamColor, hexToRgba, blendColors } from './utils.js';
import { getTerrainGrid } from './terrainGenerator.js';
import { TERRAIN_COLORS, TERRAIN_COLORS_DARK } from './terrainRenderer.js';
import { calculateSizeCategory, applySizeToElement, initializePokemonSizes, debugPokemonSizes } from './pokemonSizeCalculator.js';

/**
 * Create the battlefield grid
 * @param {number} gridSize - Size of the grid (gridSize x gridSize)
 * @param {Array} teamAreas - Team starting areas
 * @param {Object} characterPositions - Map of character IDs to their positions
 * @returns {HTMLElement} - The battlefield grid element
 */
export function createBattlefieldGrid(gridSize, teamAreas, characterPositions) {
    const container = document.createElement('div');
    container.className = 'battlefield-grid-container';
    
    const grid = document.createElement('div');
    grid.className = 'battlefield-grid';
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = `repeat(${gridSize}, ${TILE_SIZE}px)`;
    grid.style.gridTemplateRows = `repeat(${gridSize}, ${TILE_SIZE}px)`;
    grid.style.gap = '0';
    grid.style.border = '1px solid #333';
    
    // Get the terrain grid
    const terrainGrid = getTerrainGrid();
    
    // Create tiles and apply terrain colors
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
            
            // Apply checkerboard pattern - this should be consistent across all tiles
            const isEven = (x + y) % 2 === 0;
            
            // Set the base color based on terrain type and checkerboard pattern
            if (isEven) {
                tile.style.backgroundColor = TERRAIN_COLORS[terrain];
            } else {
                tile.style.backgroundColor = TERRAIN_COLORS_DARK[terrain];
            }
            
            // Set tile dimensions
            tile.style.width = `${TILE_SIZE}px`;
            tile.style.height = `${TILE_SIZE}px`;
            // Add position: relative for proper overflow handling
            tile.style.position = 'relative';
            tile.style.overflow = 'visible';
            tile.style.zIndex = '1'; // Base z-index for tiles
            
            // Check if this tile is in a team area and add a team indicator
            let inTeamArea = false;
            teamAreas.forEach((area, teamIndex) => {
                if (x >= area.x && x < area.x + area.width && 
                    y >= area.y && y < area.y + area.height) {
                    
                    inTeamArea = true;
                    
                    // Apply a semi-transparent team color overlay
                    const teamColor = getTeamColor(teamIndex);
                    const colorWithOpacity = hexToRgba(teamColor, 0.3);
                    
                    // Create a team indicator overlay div instead of changing background
                    const teamOverlay = document.createElement('div');
                    teamOverlay.className = 'team-area-overlay';
                    teamOverlay.style.position = 'absolute';
                    teamOverlay.style.top = '0';
                    teamOverlay.style.left = '0';
                    teamOverlay.style.width = '100%';
                    teamOverlay.style.height = '100%';
                    teamOverlay.style.backgroundColor = colorWithOpacity;
                    teamOverlay.style.pointerEvents = 'none'; // Allow clicks to pass through
                    teamOverlay.style.zIndex = '2'; // Above the tile but below characters
                    
                    // Add the overlay to the tile
                    tile.appendChild(teamOverlay);
                    
                    // Mark the tile as being in a team area
                    tile.dataset.team = teamIndex;
                }
            });
            
            grid.appendChild(tile);
        }
    }
    
    container.appendChild(grid);
    
    // Add characters to the grid
    for (const charId in characterPositions) {
        const pos = characterPositions[charId];
        const character = pos.character;
        const teamIndex = pos.teamIndex;
        const strategy = character.strategy || 'aggressive';
        
        // Find the tile at this position
        const tile = grid.querySelector(`.battlefield-tile[data-x="${pos.x}"][data-y="${pos.y}"]`);
        
        if (tile) {
            // Create character container div (this will help with positioning larger Pokémon)
            const characterContainer = document.createElement('div');
            characterContainer.className = 'battlefield-character-container';
            characterContainer.style.position = 'relative';
            characterContainer.style.width = '100%';
            characterContainer.style.height = '100%';
            characterContainer.style.overflow = 'visible';
            characterContainer.style.zIndex = '3'; // Above team overlays
            
            // Create character sprite
            const sprite = document.createElement('img');
            sprite.src = character.spriteUrl || `Sprites/spr_mage${character.spriteNum || 1}.png`;
            sprite.alt = character.name;
            sprite.className = 'battlefield-character';
            sprite.title = `${character.name} [${getStrategyText(strategy)}]`; // Add strategy to tooltip
            sprite.style.objectFit = 'contain';
            sprite.style.transition = 'width 0.3s, height 0.3s, left 0.3s, top 0.3s'; // Smooth transition for size changes
            sprite.onerror = function() {
                this.src = `Sprites/spr_mage${character.spriteNum || 1}.png`;
            };
            
            // Add a data attribute to identify the character
            sprite.dataset.characterId = charId;
            sprite.dataset.team = teamIndex;
            sprite.dataset.strategy = strategy;
            
            // Visual indicator for strategy (border style)
            const borderStyle = getStrategyBorderStyle(strategy);
            sprite.style.border = `2px ${borderStyle.style} ${getTeamColor(teamIndex)}`;
            if (borderStyle.width) {
                sprite.style.borderWidth = borderStyle.width;
            }
            sprite.style.borderRadius = '50%';
            sprite.style.boxSizing = 'border-box';
            
            // Calculate size category
            const sizeCategory = calculateSizeCategory(character);
            
            // Apply size category to the sprite
            applySizeToElement(sprite, sizeCategory, TILE_SIZE);
            
            // Add sprite to container
            characterContainer.appendChild(sprite);
            
            // Add container to tile
            tile.appendChild(characterContainer);
            tile.classList.add('occupied');

            tile.style.zIndex = '1000';
        }
    }
    
    return container;
}

/**
 * Update the battlefield display with the grid and characters
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
    layoutContainer.style.gap = '20px';
    
    // Create the battlefield grid
    const battlefieldGrid = createBattlefieldGrid(GRID_SIZE, teamAreas, positions);
    
    // Add the grid to the layout container
    layoutContainer.appendChild(battlefieldGrid);
    
    // Add the layout container to the battlefield content
    battlefieldContent.appendChild(layoutContainer);
        
    // Initialize Pokémon sizes on the battlefield
    initializePokemonSizes(positions);
    
    // Run debug function to output size categories in console
    debugPokemonSizes(positions);
    
    // Set a delayed reapplication of sizes to ensure all DOM elements are fully rendered
    setTimeout(() => {
        console.log("Re-applying Pokémon sizes to ensure proper display...");
        initializePokemonSizes(positions);
    }, 500);
    
    return battlefieldGrid;
}