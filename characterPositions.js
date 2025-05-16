/**
 * Character positioning system
 * Modified to respect multi-tile Pokémon
 */

import { GRID_SIZE, TEAM_AREA_WIDTH, TEAM_AREA_HEIGHT } from './config.js';
import { shuffleArray } from './utils.js';
// Import the size calculator
import { calculateSizeCategory } from './pokemonSizeCalculator.js';
import { isPathValidForPokemon, doesPokemonOccupyTile } from './pokemonDistanceCalculator.js';
import { updateTileZIndex } from './tileZIndexManager.js';

// Global variable for character positions
let characterPositions = {};

/**
 * Get all character positions
 * @returns {Object} - Character positions map
 */
export function getCharacterPositions() {
    return characterPositions;
}

/**
 * Set character positions
 * @param {Object} positions - New character positions
 */
export function setCharacterPositions(positions) {
    characterPositions = positions;
}

/**
 * Check if a tile is occupied by any Pokémon
 * @param {number} x - x position to check
 * @param {number} y - y position to check
 * @param {string} [excludeCharId] - Optional character ID to exclude (for self-movement)
 * @returns {boolean} - Whether the tile is occupied
 */
export function isTileOccupied(x, y, excludeCharId = null) {
    // Check if position is out of bounds
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) {
        return true; // Treat out-of-bounds as occupied
    }
    
    // Check all characters
    for (const charId in characterPositions) {
        // Skip the excluded character (for self-movement)
        if (excludeCharId && charId === excludeCharId) continue;
        
        // Skip defeated characters
        if (characterPositions[charId].isDefeated) continue;
        
        // Check if this Pokémon occupies the specified tile using the function from pokemonDistanceCalculator
        if (doesPokemonOccupyTile(characterPositions[charId], x, y)) {
            return true;
        }
    }
    
    return false;
}

/**
 * Define team starting areas based on number of teams
 * @param {number} teamCount - Number of teams
 * @returns {Array} - Array of team areas with {x, y, width, height}
 */
export function defineTeamAreas(teamCount) {
    const areas = [];
    
    // Define team areas along the edges
    if (teamCount >= 1) {
        // Top edge (Team 1)
        areas.push({
            x: Math.floor((GRID_SIZE - TEAM_AREA_WIDTH) / 2),
            y: 0,
            width: TEAM_AREA_WIDTH,
            height: TEAM_AREA_HEIGHT
        });
    }
    
    if (teamCount >= 2) {
        // Bottom edge (Team 2)
        areas.push({
            x: Math.floor((GRID_SIZE - TEAM_AREA_WIDTH) / 2),
            y: GRID_SIZE - TEAM_AREA_HEIGHT,
            width: TEAM_AREA_WIDTH,
            height: TEAM_AREA_HEIGHT
        });
    }
    
    if (teamCount >= 3) {
        // Left edge (Team 3)
        areas.push({
            x: 0,
            y: Math.floor((GRID_SIZE - TEAM_AREA_HEIGHT) / 2),
            width: TEAM_AREA_HEIGHT,
            height: TEAM_AREA_WIDTH
        });
    }
    
    if (teamCount >= 4) {
        // Right edge (Team 4)
        areas.push({
            x: GRID_SIZE - TEAM_AREA_HEIGHT,
            y: Math.floor((GRID_SIZE - TEAM_AREA_WIDTH) / 2),
            width: TEAM_AREA_HEIGHT,
            height: TEAM_AREA_WIDTH
        });
    }
    
    if (teamCount >= 5) {
        // Top-left corner (Team 5)
        areas.push({
            x: 0,
            y: 0,
            width: TEAM_AREA_HEIGHT,
            height: TEAM_AREA_HEIGHT
        });
    }
    
    if (teamCount >= 6) {
        // Top-right corner (Team 6)
        areas.push({
            x: GRID_SIZE - TEAM_AREA_HEIGHT,
            y: 0,
            width: TEAM_AREA_HEIGHT,
            height: TEAM_AREA_HEIGHT
        });
    }
    
    if (teamCount >= 7) {
        // Bottom-left corner (Team 7)
        areas.push({
            x: 0,
            y: GRID_SIZE - TEAM_AREA_HEIGHT,
            width: TEAM_AREA_HEIGHT,
            height: TEAM_AREA_HEIGHT
        });
    }
    
    if (teamCount >= 8) {
        // Bottom-right corner (Team 8)
        areas.push({
            x: GRID_SIZE - TEAM_AREA_HEIGHT,
            y: GRID_SIZE - TEAM_AREA_HEIGHT,
            width: TEAM_AREA_HEIGHT,
            height: TEAM_AREA_HEIGHT
        });
    }
    
    if (teamCount >= 9) {
        // Middle-top (Team 9)
        areas.push({
            x: Math.floor((GRID_SIZE - TEAM_AREA_WIDTH) / 2),
            y: TEAM_AREA_HEIGHT + 2,
            width: TEAM_AREA_WIDTH,
            height: TEAM_AREA_HEIGHT
        });
    }
    
    if (teamCount >= 10) {
        // Middle-bottom (Team 10)
        areas.push({
            x: Math.floor((GRID_SIZE - TEAM_AREA_WIDTH) / 2),
            y: GRID_SIZE - TEAM_AREA_HEIGHT * 2 - 2,
            width: TEAM_AREA_WIDTH,
            height: TEAM_AREA_HEIGHT
        });
    }
    
    return areas;
}

/**
 * Place characters on the battlefield
 * @param {Array} teamCharacters - Array of teams with characters
 * @param {Array} teamAreas - Team area definitions
 * @returns {Object} - Map of character IDs to their positions
 */
export function placeCharacters(teamCharacters, teamAreas) {
    // Import necessary functions and variables
    import('./tileZIndexManager.js').then(module => {
        const { updateTileZIndex } = module;
    });
    
    const positions = {};
    const occupiedPositions = new Set(); // Track occupied tiles using "x,y" strings
    
    /**
     * Check if a position is valid for a Pokémon of given size
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} size - Size category of the Pokémon
     * @returns {boolean} - Whether the position is valid
     */
    function isValidPositionForSize(x, y, size) {
        // Calculate how many tiles the Pokémon extends from its center
        const extension = Math.floor(size / 2);
        
        // Check if any part of the Pokémon would be outside the battlefield
        return (
            (x - extension) >= 0 && 
            (x + extension) < GRID_SIZE && 
            (y - extension) >= 0 && 
            (y + extension) < GRID_SIZE
        );
    }
    
    teamCharacters.forEach((team, teamIndex) => {
        if (teamIndex >= teamAreas.length) return;
        
        const area = teamAreas[teamIndex];
        const availablePositions = [];
        
        // Generate all possible positions in this team area
        for (let x = area.x; x < area.x + area.width; x++) {
            for (let y = area.y; y < area.y + area.height; y++) {
                availablePositions.push({x, y});
            }
        }
        
        // Shuffle available positions
        const shuffledPositions = shuffleArray(availablePositions);
        
        // Assign positions to characters
        team.forEach((charEntry, charIndex) => {
            // Calculate size category for this Pokémon
            const sizeCategory = calculateSizeCategory(charEntry.character);
            
            // Filter positions to only include those valid for this Pokémon's size
            const validPositions = shuffledPositions.filter(pos => 
                isValidPositionForSize(pos.x, pos.y, sizeCategory) &&
                !occupiedPositions.has(`${pos.x},${pos.y}`)
            );
            
            if (validPositions.length > 0) {
                // Take the first valid position
                const position = validPositions[0];
                const posKey = `${position.x},${position.y}`;
                
                // Generate a unique ID for each character
                const charId = `team${teamIndex}_char${charIndex}`;
                positions[charId] = {
                    x: position.x,
                    y: position.y,
                    character: charEntry.character,
                    teamIndex: teamIndex,
                    strategy: charEntry.character.strategy || 'aggressive' // Include strategy
                };
                
                // Mark position as occupied
                occupiedPositions.add(posKey);
                
                // Get the tile element and update its z-index
                const tileElement = document.querySelector(`.battlefield-tile[data-x="${position.x}"][data-y="${position.y}"]`);
                if (tileElement) {
                    // We need to use the imported function if available, or define it inline as a fallback
                    if (typeof updateTileZIndex === 'function') {
                        updateTileZIndex(tileElement, true);
                    } else {
                        // Fallback implementation
                        if (!tileElement.dataset.originalZIndex && tileElement.style.zIndex) {
                            tileElement.dataset.originalZIndex = tileElement.style.zIndex;
                        }
                        tileElement.style.zIndex = '1000';
                    }
                }
                
                // Now mark additional tiles as occupied based on the Pokémon's size
                const extension = Math.floor(sizeCategory / 2);
                
                // Mark all tiles in the footprint
                for (let dx = -extension; dx <= extension; dx++) {
                    for (let dy = -extension; dy <= extension; dy++) {
                        const tx = position.x + dx;
                        const ty = position.y + dy;
                        
                        // Check if in bounds
                        if (tx >= 0 && tx < GRID_SIZE && ty >= 0 && ty < GRID_SIZE) {
                            occupiedPositions.add(`${tx},${ty}`);
                        }
                    }
                }
                
                // Remove the used position from the shuffled positions array
                const posIndex = shuffledPositions.findIndex(p => p.x === position.x && p.y === position.y);
                if (posIndex !== -1) {
                    shuffledPositions.splice(posIndex, 1);
                }
            } else {
                // No valid position found for this Pokémon - could add fallback here
                console.warn(`No valid position found for Pokémon ${charEntry.character.name} of size ${sizeCategory}`);
                
                // As a fallback, try looking outside team area but still within bounds
                const fallbackPositions = [];
                const margin = Math.floor(sizeCategory / 2);
                
                // Look at a larger area around the team area
                for (let x = Math.max(0, area.x - 2); x < Math.min(GRID_SIZE, area.x + area.width + 2); x++) {
                    for (let y = Math.max(0, area.y - 2); y < Math.min(GRID_SIZE, area.y + area.height + 2); y++) {
                        // Skip positions that are in the original team area
                        if (x >= area.x && x < area.x + area.width && 
                            y >= area.y && y < area.y + area.height) {
                            continue;
                        }
                        
                        // Check if position is valid for this size and not occupied
                        if (isValidPositionForSize(x, y, sizeCategory) && 
                            !occupiedPositions.has(`${x},${y}`)) {
                            fallbackPositions.push({x, y});
                        }
                    }
                }
                
                if (fallbackPositions.length > 0) {
                    // Use the first fallback position
                    const position = fallbackPositions[0];
                    const posKey = `${position.x},${position.y}`;
                    
                    // Generate a unique ID for each character
                    const charId = `team${teamIndex}_char${charIndex}`;
                    positions[charId] = {
                        x: position.x,
                        y: position.y,
                        character: charEntry.character,
                        teamIndex: teamIndex,
                        strategy: charEntry.character.strategy || 'aggressive'
                    };
                    
                    // Mark position as occupied
                    occupiedPositions.add(posKey);
                    
                    // Update z-index as before
                    const tileElement = document.querySelector(`.battlefield-tile[data-x="${position.x}"][data-y="${position.y}"]`);
                    if (tileElement) {
                        if (typeof updateTileZIndex === 'function') {
                            updateTileZIndex(tileElement, true);
                        } else {
                            if (!tileElement.dataset.originalZIndex && tileElement.style.zIndex) {
                                tileElement.dataset.originalZIndex = tileElement.style.zIndex;
                            }
                            tileElement.style.zIndex = '1000';
                        }
                    }
                    
                    // Mark occupied tiles as before
                    const extension = Math.floor(sizeCategory / 2);
                    for (let dx = -extension; dx <= extension; dx++) {
                        for (let dy = -extension; dy <= extension; dy++) {
                            const tx = position.x + dx;
                            const ty = position.y + dy;
                            if (tx >= 0 && tx < GRID_SIZE && ty >= 0 && ty < GRID_SIZE) {
                                occupiedPositions.add(`${tx},${ty}`);
                            }
                        }
                    }
                    
                    console.log(`Found fallback position for ${charEntry.character.name} at (${position.x}, ${position.y})`);
                } else {
                    console.error(`Failed to place Pokémon ${charEntry.character.name} - no valid position found.`);
                }
            }
        });
    });
    
    // Update the global positions
    characterPositions = positions;
    
    return positions;
}

/**
 * Update character position on the battlefield
 * @param {string} charId - Character ID
 * @param {Object} newPosition - New position {x, y}
 */
export function updateCharacterPosition(charId, newPosition) {
    // Import the tile z-index manager
    let updateTileZIndex;
    try {
        // Try to get the function directly if already imported
        updateTileZIndex = require('./tileZIndexManager.js').updateTileZIndex;
    } catch (e) {
        // Define fallback function
        updateTileZIndex = (tile, hasCharacter, previousTile = null) => {
            if (!tile) return;
            
            if (hasCharacter) {
                if (previousTile) {
                    // Set z-index relative to the previous tile
                    const previousZIndex = parseInt(previousTile.style.zIndex || 0);
                    tile.style.zIndex = (previousZIndex + 1).toString();
                } else {
                    // No previous tile information, use the base z-index
                    if (!tile.style.zIndex) {
                        tile.style.zIndex = '1000';
                    }
                }
            }
            // We no longer reset z-index when a character leaves
        };
    }
    
    const pos = characterPositions[charId];
    if (!pos) return;
    
    // Get the current and new tiles
    const currentTile = document.querySelector(`.battlefield-tile[data-x="${pos.x}"][data-y="${pos.y}"]`);
    const newTile = document.querySelector(`.battlefield-tile[data-x="${newPosition.x}"][data-y="${newPosition.y}"]`);
    
    if (!currentTile || !newTile) return;
    
    // Get the character element
    const characterElement = currentTile.querySelector(`.battlefield-character[data-character-id="${charId}"]`);
    if (!characterElement) return;
    
    // Update z-index for the new tile, passing the current tile as reference
    updateTileZIndex(newTile, true, currentTile);
    
    // We no longer update z-index for the current tile to reset it
    
    // Remove from current tile
    currentTile.classList.remove('occupied');
    characterElement.remove();
    
    // Add to new tile
    newTile.classList.add('occupied');
    newTile.appendChild(characterElement);
    
    // Update position in data
    pos.x = newPosition.x;
    pos.y = newPosition.y;
}

/**
 * Mark a character as defeated on the battlefield with improved visual handling
 * @param {string} charId - ID of the defeated character
 */
export async function removeDefeatedCharacter(charId) {
    const characterPositions = getCharacterPositions();
    const charData = characterPositions[charId];
    
    if (!charData) return;
    
    console.log(`Attempting to mark character ${charId} (${charData.character.name}) as defeated`);
    
    // Mark as defeated in the data structure first
    characterPositions[charId].isDefeated = true;
    charData.isDefeated = true;
    
    // Delay slightly to ensure DOM is ready (addresses potential timing issues)
    setTimeout(() => {
        // Try multiple selector approaches to be thorough
        // 1. Try direct attribute selector
        let characterEl = document.querySelector(`.battlefield-character[data-character-id="${charId}"]`);
        
        // 2. If not found, try looking in the specific tile
        if (!characterEl) {
            const characterTile = document.querySelector(`.battlefield-tile[data-x="${charData.x}"][data-y="${charData.y}"]`);
            if (characterTile) {
                characterEl = characterTile.querySelector(`.battlefield-character`);
            }
        }
        
        // 3. As a last resort, look for any element with the name in the title attribute
        if (!characterEl) {
            const allCharacters = document.querySelectorAll('.battlefield-character');
            for (const el of allCharacters) {
                if (el.title && el.title.includes(charData.character.name)) {
                    characterEl = el;
                    break;
                }
            }
        }
        
        if (characterEl) {
            console.log(`Found character element for ${charId}, applying defeated styling`);
            
            // Force style application directly in addition to the class
            characterEl.classList.add('defeated');
            characterEl.style.filter = 'grayscale(100%) opacity(0.7)';
            characterEl.style.transform = 'rotate(90deg)';
            
            // Add a marker element to ensure the defeated state is visible
            const defeatMarker = document.createElement('div');
            defeatMarker.className = 'defeat-marker';
            defeatMarker.style.position = 'absolute';
            defeatMarker.style.top = '0';
            defeatMarker.style.left = '0';
            defeatMarker.style.width = '100%';
            defeatMarker.style.height = '100%';
            defeatMarker.style.background = `
                linear-gradient(to top right, transparent 45%, rgba(255,0,0,0.8) 45%, rgba(255,0,0,0.8) 55%, transparent 55%),
                linear-gradient(to top left, transparent 45%, rgba(255,0,0,0.8) 45%, rgba(255,0,0,0.8) 55%, transparent 55%)
            `;
            defeatMarker.style.pointerEvents = 'none';
            defeatMarker.style.zIndex = '100';
            
            // Check if marker already exists before adding
            if (!characterEl.querySelector('.defeat-marker')) {
                characterEl.appendChild(defeatMarker);
            }
        } else {
            console.warn(`Character element for ${charId} not found on battlefield`);
        }
        
        // Also check character overlay for large Pokémon (this might be the key!)
        const overlayCharacter = document.querySelector(`.character-overlay .battlefield-character[data-character-id="${charId}"]`);
        if (overlayCharacter) {
            console.log(`Found overlay character element for ${charId}, applying defeated styling`);
            overlayCharacter.classList.add('defeated');
            overlayCharacter.style.filter = 'grayscale(100%) opacity(0.7)';
            overlayCharacter.style.transform = 'rotate(90deg)';
        }
        
        // Also mark as defeated in the initiative list
        const characterUniqueId = charData.character.uniqueId;
        import('./initiativeDisplay.js').then(module => {
            module.markDefeatedInInitiative(characterUniqueId);
        });
    }, 50); // Small delay to ensure DOM is updated
}

/**
 * Check if a path is valid considering Pokémon sizes
 * @param {string} charId - Character ID moving
 * @param {Array} path - Array of positions {x, y}
 * @returns {boolean} - Whether the path is valid
 */
export function isPathValid(charId, path) {
    if (!path || path.length === 0) return true;
    
    // Verwende die Funktion isPathValidForPokemon für vollständigere Prüfung
    return isPathValidForPokemon(charId, path, characterPositions);
}