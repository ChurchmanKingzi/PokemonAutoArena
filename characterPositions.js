/**
 * Character positioning system
 * Modified to respect multi-tile Pokémon
 */

import { GRID_SIZE, TEAM_AREA_WIDTH, TEAM_AREA_HEIGHT } from './config.js';
import { shuffleArray } from './utils.js';
import { calculateSizeCategory } from './pokemonSizeCalculator.js';
import { isPathValidForPokemon, doesPokemonOccupyTile } from './pokemonDistanceCalculator.js';
import { updatePokemonPosition, removePokemonFromOverlay, setPokemonSpriteState } from './pokemonOverlay.js';

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
        
        // Check if this Pokémon occupies the specified tile
        if (doesPokemonOccupyTile(characterPositions[charId], x, y)) {
            return true;
        }
    }
    
    return false;
}

/**
 * Define team starting areas based on number of teams and team sizes
 * @param {number} teamCount - Number of teams
 * @param {Array} teamSizes - Array of team sizes (optional)
 * @returns {Array} - Array of team areas with {x, y, width, height}
 */
export function defineTeamAreas(teamCount, teamSizes = []) {
    const areas = [];
    
    // Helper function to calculate team area dimensions based on team size
    function getTeamAreaDimensions(teamSize) {
        if (teamSize <= 1) {
            return { width: 8, height: 4 };
        } else if (teamSize === 2) {
            return { width: 8, height: 5 };
        } else if (teamSize <= 4) {
            return { width: 9, height: 5 };
        } else {
            return { width: 10, height: 5 };
        }
    }
    
    // Define team areas along the edges
    if (teamCount >= 1) {
        // Top edge (Team 1)
        const dimensions = getTeamAreaDimensions(teamSizes[0] || 1);
        areas.push({
            x: Math.floor((GRID_SIZE - dimensions.width) / 2),
            y: 0,
            width: dimensions.width,
            height: dimensions.height
        });
    }
    
    if (teamCount >= 2) {
        // Bottom edge (Team 2)
        const dimensions = getTeamAreaDimensions(teamSizes[1] || 1);
        areas.push({
            x: Math.floor((GRID_SIZE - dimensions.width) / 2),
            y: GRID_SIZE - dimensions.height,
            width: dimensions.width,
            height: dimensions.height
        });
    }
    
    if (teamCount >= 3) {
        // Left edge (Team 3)
        const dimensions = getTeamAreaDimensions(teamSizes[2] || 1);
        areas.push({
            x: 0,
            y: Math.floor((GRID_SIZE - dimensions.width) / 2),
            width: dimensions.height,
            height: dimensions.width
        });
    }
    
    if (teamCount >= 4) {
        // Right edge (Team 4)
        const dimensions = getTeamAreaDimensions(teamSizes[3] || 1);
        areas.push({
            x: GRID_SIZE - dimensions.height,
            y: Math.floor((GRID_SIZE - dimensions.width) / 2),
            width: dimensions.height,
            height: dimensions.width
        });
    }
    
    // Continue with corners for teams 5-10...
    if (teamCount >= 5) {
        const dimensions = getTeamAreaDimensions(teamSizes[4] || 1);
        areas.push({
            x: 0,
            y: 0,
            width: dimensions.height,
            height: dimensions.height
        });
    }
    
    if (teamCount >= 6) {
        const dimensions = getTeamAreaDimensions(teamSizes[5] || 1);
        areas.push({
            x: GRID_SIZE - dimensions.height,
            y: 0,
            width: dimensions.height,
            height: dimensions.height
        });
    }
    
    if (teamCount >= 7) {
        const dimensions = getTeamAreaDimensions(teamSizes[6] || 1);
        areas.push({
            x: 0,
            y: GRID_SIZE - dimensions.height,
            width: dimensions.height,
            height: dimensions.height
        });
    }
    
    if (teamCount >= 8) {
        const dimensions = getTeamAreaDimensions(teamSizes[7] || 1);
        areas.push({
            x: GRID_SIZE - dimensions.height,
            y: GRID_SIZE - dimensions.height,
            width: dimensions.height,
            height: dimensions.height
        });
    }
    
    if (teamCount >= 9) {
        const dimensions = getTeamAreaDimensions(teamSizes[8] || 1);
        areas.push({
            x: Math.floor((GRID_SIZE - dimensions.width) / 2),
            y: dimensions.height + 2,
            width: dimensions.width,
            height: dimensions.height
        });
    }
    
    if (teamCount >= 10) {
        const dimensions = getTeamAreaDimensions(teamSizes[9] || 1);
        areas.push({
            x: Math.floor((GRID_SIZE - dimensions.width) / 2),
            y: GRID_SIZE - dimensions.height * 2 - 2,
            width: dimensions.width,
            height: dimensions.height
        });
    }
    
    return areas;
}

/**
 * Place characters on the battlefield with improved positioning logic
 * The actual visual placement is now handled by the Pokemon overlay system
 * @param {Array} teamCharacters - Array of teams with characters
 * @param {Array} teamAreas - Team area definitions
 * @returns {Object} - Map of character IDs to their positions and final team areas
 */
export function placeCharacters(teamCharacters, teamAreas) {
    // Initialize positions and occupied positions tracking
    let positions = {};
    let occupiedPositions = new Set();
    let originalTeamAreas = JSON.parse(JSON.stringify(teamAreas));
    let finalTeamAreas = JSON.parse(JSON.stringify(teamAreas));
    let maxAttempts = 5;
    let success = false;
    
    // Function to check if a position is valid for a Pokemon of given size
    function isValidPositionForSize(x, y, size) {
        const extension = Math.floor(size / 2);
        return (
            (x - extension) >= 0 && 
            (x + extension) < GRID_SIZE && 
            (y - extension) >= 0 && 
            (y + extension) < GRID_SIZE
        );
    }
    
    // Try placing with progressively larger team areas
    for (let attempt = 0; attempt < maxAttempts && !success; attempt++) {
        positions = {};
        occupiedPositions = new Set();
        success = true;
        
        // Calculate scaled team areas for this attempt
        const currentAreas = teamAreas.map(area => {
            if (attempt === 0) return { ...area };
            
            const newWidth = Math.floor(area.width * (1 + attempt * 0.2));
            const newHeight = Math.floor(area.height * (1 + attempt * 0.2));
            
            const newX = Math.max(0, Math.floor(area.x - (newWidth - area.width) / 2));
            const newY = Math.max(0, Math.floor(area.y - (newHeight - area.height) / 2));
            
            return {
                x: newX,
                y: newY,
                width: Math.min(newWidth, GRID_SIZE - newX),
                height: Math.min(newHeight, GRID_SIZE - newY)
            };
        });
        
        finalTeamAreas = JSON.parse(JSON.stringify(currentAreas));
        
        // Try to place all Pokemon
        teamCharacters.forEach((team, teamIndex) => {
            if (teamIndex >= currentAreas.length) return;
            
            const area = currentAreas[teamIndex];
            const availablePositions = [];
            
            // Generate all possible positions in this team area
            for (let x = area.x; x < area.x + area.width; x++) {
                for (let y = area.y; y < area.y + area.height; y++) {
                    availablePositions.push({x, y});
                }
            }
            
            // Sort team members by size (largest first)
            const sortedTeam = [...team].sort((a, b) => {
                const sizeA = calculateSizeCategory(a.character);
                const sizeB = calculateSizeCategory(b.character);
                return sizeB - sizeA;
            });
            
            // Shuffle available positions
            const shuffledPositions = shuffleArray([...availablePositions]);
            
            // Place each Pokemon
            sortedTeam.forEach((charEntry, originalIndex) => {
                const charIndex = team.findIndex(c => c === charEntry);
                const sizeCategory = calculateSizeCategory(charEntry.character);
                
                let positionFound = false;
                
                for (let i = 0; i < shuffledPositions.length; i++) {
                    const pos = shuffledPositions[i];
                    
                    if (!isValidPositionForSize(pos.x, pos.y, sizeCategory)) {
                        continue;
                    }
                    
                    // Check if any tiles would be occupied
                    let tileOccupied = false;
                    const extension = Math.floor(sizeCategory / 2);
                    
                    for (let dx = -extension; dx <= extension && !tileOccupied; dx++) {
                        for (let dy = -extension; dy <= extension && !tileOccupied; dy++) {
                            const tx = pos.x + dx;
                            const ty = pos.y + dy;
                            
                            if (tx < 0 || tx >= GRID_SIZE || ty < 0 || ty >= GRID_SIZE) {
                                continue;
                            }
                            
                            if (occupiedPositions.has(`${tx},${ty}`)) {
                                tileOccupied = true;
                            }
                        }
                    }
                    
                    if (!tileOccupied) {
                        // Valid position found
                        const charId = `team${teamIndex}_char${charIndex}`;
                        positions[charId] = {
                            x: pos.x,
                            y: pos.y,
                            character: charEntry.character,
                            teamIndex: teamIndex,
                            strategy: charEntry.character.strategy || 'aggressive'
                        };
                        
                        // Mark tiles as occupied
                        for (let dx = -extension; dx <= extension; dx++) {
                            for (let dy = -extension; dy <= extension; dy++) {
                                const tx = pos.x + dx;
                                const ty = pos.y + dy;
                                
                                if (tx < 0 || tx >= GRID_SIZE || ty < 0 || ty >= GRID_SIZE) {
                                    continue;
                                }
                                
                                occupiedPositions.add(`${tx},${ty}`);
                            }
                        }
                        
                        shuffledPositions.splice(i, 1);
                        positionFound = true;
                        break;
                    }
                }
                
                if (!positionFound) {
                    success = false;
                    console.log(`Failed to place Pokémon ${charEntry.character.name} in team ${teamIndex} (size ${sizeCategory})`);
                }
            });
        });
        
        if (success) {
            console.log(`Successfully placed all Pokémon on attempt ${attempt + 1}`);
        } else if (attempt < maxAttempts - 1) {
            console.log(`Failed to place all Pokémon on attempt ${attempt + 1}, trying with larger team areas...`);
        }
    }
    
    if (!success) {
        console.warn(`Could not place all Pokémon even with maximum scaling. Some Pokémon will be missing.`);
    }
    
    // Update the global positions
    characterPositions = positions;
    
    return {
        positions: positions,
        teamAreas: finalTeamAreas
    };
}

/**
 * Update character position on the battlefield
 * Now uses the Pokemon overlay system instead of moving DOM elements between tiles
 * @param {string} charId - Character ID
 * @param {Object} newPosition - New position {x, y}
 */
export function updateCharacterPosition(charId, newPosition) {
    const pos = characterPositions[charId];
    if (!pos) return;
    
    // Update position in data
    pos.x = newPosition.x;
    pos.y = newPosition.y;
    
    // Update visual position using the overlay system
    updatePokemonPosition(charId, newPosition.x, newPosition.y);
}

/**
 * Remove a defeated character from battle
 * This function now:
 * 1. Removes the character from the logic list (so they don't get turns)
 * 2. Marks them as defeated in the display list (so they show as defeated)
 * 3. Updates the visual display
 * 4. Removes them from the battlefield grid
 * @param {string} charId - The character ID
 */
export async function removeDefeatedCharacter(charId) {
    const charData = characterPositions[charId];
    
    if (!charData) {
        console.warn(`Character ${charId} not found in positions`);
        return;
    }
    
    const character = charData.character;
    
    // Get the character's unique ID
    const characterUniqueId = character ? character.uniqueId : null;
    
    if (characterUniqueId) {
        // 1. Remove from logic list (no more turns) - Dynamic import to avoid circular dependency
        try {
            const { removeDefeatedFromLogic } = await import('./initiative.js');
            removeDefeatedFromLogic(characterUniqueId);
        } catch (error) {
            console.error("Error removing character from logic list:", error);
        }
        
        // 2. Mark as defeated in display list (visual indication) - Dynamic import to avoid circular dependency
        try {
            const { markDefeatedInDisplay } = await import('./initiative.js');
            markDefeatedInDisplay(characterUniqueId);
        } catch (error) {
            console.error("Error marking character as defeated in display list:", error);
        }
        
        // 3. Update the visual initiative display - Dynamic import to avoid circular dependency
        try {
            const { markDefeatedInInitiative } = await import('./initiativeDisplay.js');
            markDefeatedInInitiative(characterUniqueId);
        } catch (error) {
            console.error("Error updating initiative display:", error);
        }
    }
    
    // 4. Mark as defeated in character positions
    characterPositions[charId].isDefeated = true;
    charData.isDefeated = true;
    if (character) {
        character.isDefeated = true;
        character.currentKP = 0;
    }
    
    // 5. Apply defeated state to the Pokemon sprite in the overlay
    setPokemonSpriteState(charId, 'defeated', true);
    
    // Remove from battlefield grid visually with delay for animation
    const battlefieldCharacter = document.querySelector(`.battlefield-character[data-char-id="${charId}"]`);
    if (battlefieldCharacter) {
        // Add defeated styling
        battlefieldCharacter.classList.add('defeated');
        
        // Remove after a delay to show the defeat animation
        setTimeout(() => {
            if (battlefieldCharacter.parentNode) {
                battlefieldCharacter.parentNode.removeChild(battlefieldCharacter);
            }
        }, 1000);
    }
    
    // Also handle Pokemon overlay system if it exists
    const pokemonSprite = document.querySelector(`.pokemon-sprite[data-char-id="${charId}"]`);
    if (pokemonSprite) {
        pokemonSprite.classList.add('defeated');
        
        // Add defeat marker
        const defeatMarker = document.createElement('div');
        defeatMarker.className = 'defeat-marker';
        pokemonSprite.appendChild(defeatMarker);
        
        // Remove after delay
        setTimeout(() => {
            if (pokemonSprite.parentNode) {
                pokemonSprite.parentNode.removeChild(pokemonSprite);
            }
        }, 1000);
    }
    
    console.log(`Character ${character?.name || charId} has been defeated and removed from battle`);
}

/**
 * Check if a path is valid considering Pokémon sizes
 * @param {string} charId - Character ID moving
 * @param {Array} path - Array of positions {x, y}
 * @returns {boolean} - Whether the path is valid
 */
export function isPathValid(charId, path) {
    if (!path || path.length === 0) return true;
    return isPathValidForPokemon(charId, path, characterPositions);
}

/**
 * Get team sizes from teamCharacters array
 * @param {Array} teamCharacters - Array of teams with characters
 * @returns {Array} - Array of team sizes
 */
export function getTeamSizes(teamCharacters) {
    return teamCharacters.map(team => team.length);
}

/**
 * Define team areas with appropriate scaling based on team sizes
 * @param {number} teamCount - Number of teams
 * @param {Array} teamCharacters - Array of teams with characters
 * @returns {Array} - Array of team areas with {x, y, width, height}
 */
export function defineTeamAreasWithScaling(teamCount, teamCharacters) {
    const teamSizes = getTeamSizes(teamCharacters);
    return defineTeamAreas(teamCount, teamSizes);
}


/**
 * Updated initialization function for battlefield with Pokemon overlay
 * @param {Array} teamCharacters - Array of teams with characters
 * @returns {Object} - Map of character IDs to their positions and team areas
 */
export function initializeImprovedBattlefield(teamCharacters) {
    const teamCount = teamCharacters.length;
    const teamAreas = defineTeamAreasWithScaling(teamCount, teamCharacters);
    const positions = placeCharacters(teamCharacters, teamAreas);
    
    return {
        positions,
        teamAreas
    };
}

/**
 * Initialize terrain system with dynamically sized team areas
 * @param {Array} teamAreas - Team starting areas that may have been resized
 * @returns {Array} - The generated terrain grid
 */
export function initializeTerrainWithTeamAreas(teamAreas) {
    // Get the current battlefield configuration
    const config = getBattlefieldConfig();
    
    console.log("Initializing terrain system with config:", config);
    
    // Generate terrain based on the selected scenario, using the resized team areas
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
    console.log(`Generated terrain with ${mountainCount} mountain tiles`);
    
    // Store the generated grid in the terrainGenerator's state
    setTerrainGrid(terrainGrid);
    
    // Render the terrain
    renderTerrain(terrainGrid);
    
    return terrainGrid;
}