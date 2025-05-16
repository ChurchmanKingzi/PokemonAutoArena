/**
 * Movement range calculations with multi-tile Pokémon support
 */

import { GRID_SIZE } from './config.js';
import { isTileOccupied } from './characterPositions.js';
import { TERRAIN_TYPES } from './terrainGenerator.js';
import { getTerrainAt, getMountainMovementCost, getLavaWeightMultiplier, getSnowWeightMultiplier, getSwampWeightMultiplier } from './terrainEffects.js';
import { hasStatusEffect } from './statusEffects.js';
import { getSnowMovementCost } from './terrainEffects.js';

/**
 * Get the pathfinding weight for a terrain type
 * This is used for finding the optimal path, not for actual movement cost
 * @param {string} terrainType - The type of terrain
 * @returns {number} - Pathfinding weight (higher means less desirable)
 */
export function getTerrainPathfindingWeight(terrainType, character) {
    if (character && character.terrainAttributes && character.terrainAttributes.fliegend) {
        return 1; // Flying Pokemon ignore terrain movement costs
    }
    
    // If character has "Schwimmend" attribute and terrain is water, it costs only 1 movement
    if (terrainType === TERRAIN_TYPES.WATER && 
        character && character.terrainAttributes && character.terrainAttributes.schwimmend) {
        return 1; // Swimming Pokemon move normally through water
    }

    switch (terrainType) {
        case TERRAIN_TYPES.GRASS:
            return 1; // Baseline weight
        case TERRAIN_TYPES.SAND:
            return 2; // Worth 2 grass tiles
        case TERRAIN_TYPES.MOUNTAIN:
            return getMountainMovementCost(character);
        case TERRAIN_TYPES.WATER:
            return 4; // Worth 4 grass tiles
        case TERRAIN_TYPES.LAVA:
            // Fire type Pokemon treat lava as normal terrain
            if (character && character.pokemonTypes && 
                character.pokemonTypes.some(type => 
                    typeof type === 'string' && type.toLowerCase() === 'fire')) {
                return 1;
            }
            
            // If already burned, treat lava as normal terrain
            if (character && hasStatusEffect(character, 'burned')) {
                return 1;
            }
            
            // Use the lava weight multiplier function which considers types
            return getLavaWeightMultiplier(character) * 5;
        case TERRAIN_TYPES.SWAMP:
            // Use the swamp weight multiplier function
            return getSwampWeightMultiplier(character);
        case TERRAIN_TYPES.SNOW:
            // Use the snow weight multiplier function
            return getSnowWeightMultiplier(character);
        default:
            return 1;
    }
}

/**
 * Get the movement cost for a terrain type
 * @param {string} terrainType - The type of terrain
 * @param {Object} character - The character data for special flags
 * @returns {number} - Movement cost in movement points
 */
export function getTerrainMovementCost(terrainType, character) {
    switch (terrainType) {
        case TERRAIN_TYPES.SAND:
            return 2; // Sand costs twice as much movement
        case TERRAIN_TYPES.MOUNTAIN:
            // Use the new type-based movement cost function for mountains
            return getMountainMovementCost(character);
        case TERRAIN_TYPES.SNOW:
            // Use the snow movement cost function
            return getSnowMovementCost(character);
        default:
            return 1; // All other terrains cost 1 movement point
    }
}

/**
 * Calculate movement range based on BW value and movement modifier
 * @param {number} bw - The BW (Bewegung) value of the character
 * @param {number} moveModifier - Optional movement modifier (e.g., 0.5 for half movement)
 * @returns {number} - Number of movement points the character has
 */
export function calculateMovementRange(bw, moveModifier = 1) {
    // Default to 1 if BW is not defined
    if (!bw || isNaN(bw)) return 1;
    
    // Calculate base movement: 1 tile per 5 BW points (rounded up)
    const baseMovement = bw;
    
    // Apply modifier
    return Math.max(1, Math.floor(baseMovement * moveModifier));
}

/**
 * Get all valid adjacent tiles for movement
 * @param {number} x - Current x position
 * @param {number} y - Current y position
 * @param {Object} character - Character data (for terrain handling)
 * @param {number} remainingMovement - Remaining movement points
 * @param {string} characterId - ID of the character that's moving (for self-collision exclusion)
 * @returns {Array} - Array of valid adjacent positions {x, y, cost, weight}
 */
export function getAdjacentTiles(x, y, character, remainingMovement, characterId = null) {
    // Only cardinal directions (no diagonals)
    const directions = [
        {x: 0, y: -1}, // Up
        {x: 1, y: 0},  // Right
        {x: 0, y: 1},  // Down
        {x: -1, y: 0}  // Left
    ];
    
    const adjacentTiles = [];
    
    directions.forEach(dir => {
        const newX = x + dir.x;
        const newY = y + dir.y;
        
        // Check if in bounds
        if (newX >= 0 && newX < GRID_SIZE && newY >= 0 && newY < GRID_SIZE) {
            // Check if occupied by another character (pass characterId to exclude self)
            if (!isTileOccupied(newX, newY, characterId)) {
                // Get terrain type
                const terrainType = getTerrainAt(newX, newY);
                // Use the proper function to get movement cost based on terrain type
                const movementCost = getTerrainMovementCost(terrainType, character);
                // Get pathfinding weight
                const pathfindingWeight = getTerrainPathfindingWeight(terrainType);
                
                // Only add if we have enough movement points left
                if (movementCost <= remainingMovement) {
                    adjacentTiles.push({
                        x: newX, 
                        y: newY,
                        cost: movementCost,
                        weight: pathfindingWeight,
                        terrainType: terrainType
                    });
                }
            }
        }
    });
    
    return adjacentTiles;
}

/**
 * Find all positions a character can reach with given movement points
 * @param {number} startX - Starting x position
 * @param {number} startY - Starting y position
 * @param {number} movementPoints - How many movement points the character has
 * @param {Object} character - The character object for terrain checks
 * @param {string} characterId - ID of the character that's moving (for self-collision exclusion)
 * @returns {Array} - Array of reachable positions with their paths and costs
 */
export function findAllReachablePositions(startX, startY, movementPoints, character, characterId = null) {
    const visited = new Map(); // Map of "x,y" -> remaining movement at that position
    const result = [];
    
    // BFS to find all reachable positions
    const queue = [{
        x: startX, 
        y: startY, 
        movementLeft: movementPoints,
        path: [],
        totalCost: 0,
        totalWeight: 0
    }];
    
    while (queue.length > 0) {
        const current = queue.shift();
        const posKey = `${current.x},${current.y}`;
        
        // Skip if already visited with more or equal movement left
        if (visited.has(posKey) && visited.get(posKey) >= current.movementLeft) {
            continue;
        }
        
        // Mark as visited with this movement left
        visited.set(posKey, current.movementLeft);
        
        // Add to result if not starting position
        if (current.x !== startX || current.y !== startY) {
            result.push({
                x: current.x,
                y: current.y,
                path: current.path,
                totalCost: current.totalCost,
                totalWeight: current.totalWeight,
                movementLeft: current.movementLeft
            });
        }
        
        // If no movement left, don't explore further
        if (current.movementLeft <= 0) continue;
        
        // Get adjacent tiles that can be moved to, passing the characterId
        const adjacentTiles = getAdjacentTiles(
            current.x, 
            current.y, 
            character, 
            current.movementLeft,
            characterId
        );
        
        // Add valid moves to queue
        for (const tile of adjacentTiles) {
            const newPath = [...current.path, { x: tile.x, y: tile.y, terrainType: tile.terrainType }];
            const newMovementLeft = current.movementLeft - tile.cost;
            const newTotalCost = current.totalCost + tile.cost;
            const newTotalWeight = current.totalWeight + tile.weight;
            
            queue.push({
                x: tile.x,
                y: tile.y,
                movementLeft: newMovementLeft,
                path: newPath,
                totalCost: newTotalCost,
                totalWeight: newTotalWeight
            });
        }
    }
    
    return result;
}

/**
 * Process movement with terrain checks
 * @param {string} charId - Character ID
 * @param {Object} charData - Character data with position
 * @param {Array} path - Path to follow
 * @param {Function} callback - Function to call when movement is complete
 */
export function processMovementWithTerrainChecks(charId, charData, path, callback) {
    // No path to follow
    if (!path || path.length === 0) {
        if (callback) callback();
        return;
    }
    
    const character = charData.character;
    let currentX = charData.x;
    let currentY = charData.y;
    
    // Store the original position in case of a terrain failure
    const startingPosition = { x: currentX, y: currentY };
    
    // Import needed modules - we'll use Promise.all to ensure everything is loaded before starting
    Promise.all([
        import('./characterPositions.js'),
        import('./terrainEffects.js'),
        import('./battleLog.js'),
        import('./diceRoller.js'),
        import('./damageNumbers.js'),
        import('./initiativeDisplay.js'),
        import('./turnSystem.js'),
        import('./tileZIndexManager.js'),
        import('./statusEffects.js')
    ]).then(([
        characterPositions, 
        terrainEffects,
        battleLog,
        diceRoller,
        damageNumbers,
        initiativeDisplay,
        turnSystem,
        tileZIndexManager,
        statusEffects
    ]) => {
        const { getTerrainAt, applyLavaEffect, applySnowEffect } = terrainEffects;
        const { logBattleEvent } = battleLog;
        const { rollD6 } = diceRoller;
        const { createDamageNumber } = damageNumbers;
        const { updateInitiativeHP } = initiativeDisplay;
        const { getCurrentTurn } = turnSystem;
        const { updateTileZIndex } = tileZIndexManager;
        const { addStatusEffect, hasStatusEffect } = statusEffects;
        
        // Track the last terrain type to only check when entering a new type
        const lastTerrainType = getTerrainAt(currentX, currentY);
        
        // Get the starting tile immediately and update its z-index
        const startingTile = document.querySelector(`.battlefield-tile[data-x="${currentX}"][data-y="${currentY}"]`);
        if (startingTile) {
            // Reset z-index for the starting tile immediately since the Pokémon is leaving
            updateTileZIndex(startingTile, false);
        }
        
        // Function to process each step in the path
        async function processStep(stepIndex) {
            // If we're done with all steps, call the callback
            if (stepIndex >= path.length) {
                if (callback) callback();
                return;
            }
            
            // Get the next position
            const nextPos = path[stepIndex];
            
            // Check if the tile is still valid (might have been occupied since path was calculated)
            if (characterPositions.isTileOccupied(nextPos.x, nextPos.y, charId)) {
                logBattleEvent(`${character.name} kann sich nicht weiterbewegen - der Weg ist blockiert.`);
                if (callback) callback();
                return;
            }
            
            // Get current and next terrain types
            const currentTerrainType = getTerrainAt(currentX, currentY);
            const nextTerrainType = getTerrainAt(nextPos.x, nextPos.y);
            
            // Get the next tile and increase its z-index immediately BEFORE the character moves there
            const nextTile = document.querySelector(`.battlefield-tile[data-x="${nextPos.x}"][data-y="${nextPos.y}"]`);
            if (nextTile) {
                updateTileZIndex(nextTile, true);
            }
            
            // Special handling for water terrain - check when entering water
            if (nextTerrainType === 'water' && 
                (currentTerrainType !== 'water' || stepIndex === 0)) {
                
                // Flying Pokemon fly over water with no effect
                if (character.terrainAttributes && character.terrainAttributes.fliegend) {
                    logBattleEvent(`${character.name} fliegt über das Wasser.`);
                    
                    // Move the character onto the water tile
                    characterPositions.updateCharacterPosition(charId, nextPos);
                    
                    // Update position tracking
                    charData.x = nextPos.x;
                    charData.y = nextPos.y;
                    currentX = nextPos.x;
                    currentY = nextPos.y;
                    
                    // Continue with the next step
                    setTimeout(() => {
                        if (stepIndex + 1 < path.length) {
                            const currentTile = document.querySelector(`.battlefield-tile[data-x="${currentX}"][data-y="${currentY}"]`);
                            if (currentTile) {
                                updateTileZIndex(currentTile, false);
                            }
                        }
                        
                        processStep(stepIndex + 1);
                    }, 150);
                    return;
                }
                
                // Swimming Pokemon move through water normally
                if (character.terrainAttributes && character.terrainAttributes.schwimmend) {
                    logBattleEvent(`${character.name} schwimmt problemlos durch das Wasser.`);
                    
                    // Move the character onto the water tile
                    characterPositions.updateCharacterPosition(charId, nextPos);
                    
                    // Update position tracking
                    charData.x = nextPos.x;
                    charData.y = nextPos.y;
                    currentX = nextPos.x;
                    currentY = nextPos.y;
                    
                    // Continue with the next step
                    setTimeout(() => {
                        if (stepIndex + 1 < path.length) {
                            const currentTile = document.querySelector(`.battlefield-tile[data-x="${currentX}"][data-y="${currentY}"]`);
                            if (currentTile) {
                                updateTileZIndex(currentTile, false);
                            }
                        }
                        
                        processStep(stepIndex + 1);
                    }, 150);
                    return;
                }
                
                // NEW: Non-swimming, non-flying Pokemon - take damage and continue movement
                // Roll 1d6 damage
                const damageRoll = rollD6();
                
                // Apply damage to character
                const oldKP = parseInt(character.currentKP, 10);
                character.currentKP = Math.max(0, oldKP - damageRoll);
                
                // Update HP display
                updateInitiativeHP();
                
                // Show damage number animation
                createDamageNumber(damageRoll, { x: nextPos.x, y: nextPos.y });
                
                // Log the result
                logBattleEvent(`${character.name} watet durch das Wasser und nimmt ${damageRoll} Schaden. Aktuelle KP: ${character.currentKP}`);
                
                // Move the character onto the water tile regardless of damage
                characterPositions.updateCharacterPosition(charId, nextPos);
                
                // Update position tracking
                charData.x = nextPos.x;
                charData.y = nextPos.y;
                currentX = nextPos.x;
                currentY = nextPos.y;
                
                // Check if character was defeated by water damage
                if (character.currentKP <= 0) {
                    logBattleEvent(`${character.name} ist im Wasser besiegt worden!`);
                    
                    // Mark as defeated
                    characterPositions.removeDefeatedCharacter(charId);
                    
                    // End movement
                    if (callback) callback();
                    return;
                }
                
                // Continue movement
                setTimeout(() => {
                    if (stepIndex + 1 < path.length) {
                        const currentTile = document.querySelector(`.battlefield-tile[data-x="${currentX}"][data-y="${currentY}"]`);
                        if (currentTile) {
                            updateTileZIndex(currentTile, false);
                        }
                    }
                    
                    processStep(stepIndex + 1);
                }, 150);
                return;
            } 
            // Mountain terrain handling - no more climbing check
            else if (nextTerrainType === 'mountain' && nextTerrainType !== currentTerrainType) {
                // Get the movement cost based on Pokemon type
                const mountainCost = terrainEffects.getMountainMovementCost(character);
                
                // Generate message based on type and cost
                let message = "";
                if (character.terrainAttributes && character.terrainAttributes.fliegend) {
                    message = `${character.name} fliegt über den Berg hinweg.`;
                } else if (mountainCost === 1) {
                    message = `${character.name} bewegt sich mühelos über den Berg. (1 BW-Kosten)`;
                } else if (mountainCost === 2) {
                    message = `${character.name} erklimmt den Berg. (2 BW-Kosten)`;
                } else if (mountainCost === 3) {
                    message = `${character.name} erklimmt den Berg mit erhöhter Anstrengung. (3 BW-Kosten)`;
                } else {
                    message = `${character.name} muss sich sehr anstrengen, um den Berg zu erklimmen. (4 BW-Kosten)`;
                }
                
                // Log the message
                logBattleEvent(message);
                
                // Continue with normal movement - the path calculation already took the movement cost into account
                characterPositions.updateCharacterPosition(charId, nextPos);
                
                // Update position tracking
                charData.x = nextPos.x;
                charData.y = nextPos.y;
                currentX = nextPos.x;
                currentY = nextPos.y;
            }
            // Sand terrain notification
            else if (nextTerrainType === 'sand' && nextTerrainType !== currentTerrainType) {
                // Sand: just inform the player about the terrain
                logBattleEvent(`${character.name} betritt sandiges Gelände.`);
            }
            // SNOW terrain handling - modified to apply on ANY step on snow, not just when entering from other terrain
            else if (nextTerrainType === 'snow') {
                // Get the movement cost based on Pokemon type
                const snowCost = terrainEffects.getSnowMovementCost(character);
                
                // Flying Pokemon fly over snow with no penalty
                if (character.terrainAttributes && character.terrainAttributes.fliegend) {
                    logBattleEvent(`${character.name} fliegt über den Schnee hinweg.`);
                    
                    // Move the character onto the snow tile
                    characterPositions.updateCharacterPosition(charId, nextPos);
                    
                    // Update position tracking
                    charData.x = nextPos.x;
                    charData.y = nextPos.y;
                    currentX = nextPos.x;
                    currentY = nextPos.y;
                    
                    // Continue with the next step
                    setTimeout(() => {
                        if (stepIndex + 1 < path.length) {
                            const currentTile = document.querySelector(`.battlefield-tile[data-x="${currentX}"][data-y="${currentY}"]`);
                            if (currentTile) {
                                updateTileZIndex(currentTile, false);
                            }
                        }
                        
                        processStep(stepIndex + 1);
                    }, 150);
                    return;
                }
                
                // Check for Ice or Fire type (immune to freezing)
                const isImmune = character.pokemonTypes && character.pokemonTypes.some(type => {
                    const typeName = typeof type === 'string' ? type.toLowerCase() : type;
                    return typeName === 'ice' || typeName === 'fire';
                });
                
                // First, allow the Pokemon to move onto the snow tile regardless of what happens next
                // Update character position visually
                characterPositions.updateCharacterPosition(charId, nextPos);
                
                // Update position tracking
                charData.x = nextPos.x;
                charData.y = nextPos.y;
                currentX = nextPos.x;
                currentY = nextPos.y;
                
                if (isImmune) {
                    // Get the type for the message
                    const immuneType = character.pokemonTypes.find(type => {
                        const typeName = typeof type === 'string' ? type.toLowerCase() : type;
                        return typeName === 'ice' || typeName === 'fire';
                    });
                    
                    const typeDisplay = typeof immuneType === 'string' ? 
                        (immuneType.toLowerCase() === 'ice' ? 'Eis' : 'Feuer') : 
                        'immunen';
                        
                    if (snowCost === 1) {
                        logBattleEvent(`${character.name} bewegt sich als ${typeDisplay}-Pokémon problemlos durch den Schnee. (1 BW-Kosten)`);
                    } else {
                        logBattleEvent(`${character.name} bewegt sich als ${typeDisplay}-Pokémon durch den Schnee. (${snowCost} BW-Kosten)`);
                    }
                    
                    // Continue movement for immune Pokemon
                    setTimeout(() => {
                        if (stepIndex + 1 < path.length) {
                            const currentTile = document.querySelector(`.battlefield-tile[data-x="${currentX}"][data-y="${currentY}"]`);
                            if (currentTile) {
                                updateTileZIndex(currentTile, false);
                            }
                        }
                        
                        processStep(stepIndex + 1);
                    }, 150);
                } else {
                    // Not immune - announce movement cost
                    if (snowCost === 1) {
                        logBattleEvent(`${character.name} bewegt sich durch den Schnee. (1 BW-Kosten)`);
                    } else {
                        logBattleEvent(`${character.name} bewegt sich mühsam durch den tiefen Schnee. (${snowCost} BW-Kosten)`);
                    }
                    
                    // Apply snow effect using the dedicated function
                    const snowEffect = applySnowEffect(character);
                    if (snowEffect.applied && snowEffect.message) {
                        // Log the effect message
                        logBattleEvent(snowEffect.message);
                        
                        // Add the frozen visual effect to the character
                        const characterEl = document.querySelector(`.battlefield-character[data-character-id="${charId}"]`);
                        if (characterEl) {
                            characterEl.classList.add('frozen-effect');
                        }
                        
                        // IMPORTANT: End movement immediately after this step if frozen
                        if (callback) callback();
                        return; // Stop further movement processing
                    }
                    
                    // Continue movement if not frozen
                    setTimeout(() => {
                        if (stepIndex + 1 < path.length) {
                            const currentTile = document.querySelector(`.battlefield-tile[data-x="${currentX}"][data-y="${currentY}"]`);
                            if (currentTile) {
                                updateTileZIndex(currentTile, false);
                            }
                        }
                        
                        processStep(stepIndex + 1);
                    }, 150);
                }
                return; // Make sure to return in all cases
            }
            // SWAMP: Special handling for swamp terrain - apply poison status to non-immune Pokemon
            else if (nextTerrainType === 'swamp' && nextTerrainType !== currentTerrainType) {
                // Flying Pokemon ignore swamp effects
                if (character.terrainAttributes && character.terrainAttributes.fliegend) {
                    logBattleEvent(`${character.name} fliegt sicher über den Sumpf.`);
                } 
                // Check if already poisoned
                else if (hasStatusEffect(character, 'poisoned') || hasStatusEffect(character, 'badly-poisoned')) {
                    logBattleEvent(`${character.name} ist bereits vergiftet und bewegt sich durch den Sumpf.`);
                } 
                // Check for immunity (Poison or Steel type)
                else if (character.pokemonTypes && character.pokemonTypes.some(type => {
                    const typeName = typeof type === 'string' ? type.toLowerCase() : type;
                    return typeName === 'poison' || typeName === 'steel';
                })) {
                    // Get the actual type for the message
                    const immuneType = character.pokemonTypes.find(type => {
                        const typeName = typeof type === 'string' ? type.toLowerCase() : type;
                        return typeName === 'poison' || typeName === 'steel';
                    });
                    
                    const typeDisplay = typeof immuneType === 'string' ? 
                        (immuneType.toLowerCase() === 'poison' ? 'Gift' : 'Stahl') : 
                        'immunen';
                        
                    logBattleEvent(`${character.name} ist als ${typeDisplay}-Pokémon immun gegen die Vergiftung durch den Sumpf.`);
                } 
                // Check for Giftheilung ability
                else if (character.abilities && character.abilities.some(ability => 
                    ability.name === 'Giftheilung' || ability.name === 'Poison Heal' || 
                    (ability.effect && ability.effect.toLowerCase().includes('giftheilung')))) {
                    
                    logBattleEvent(`${character.name} hat die Fähigkeit Giftheilung und genießt den Sumpf.`);
                }
                else {
                    // Apply poisoned status effect
                    const applied = addStatusEffect(character, 'poisoned');
                    if (applied) {
                        logBattleEvent(`${character.name} wird durch den Sumpf vergiftet!`);
                    }
                }
                
                // Continue with normal movement
                characterPositions.updateCharacterPosition(charId, nextPos);
                charData.x = nextPos.x;
                charData.y = nextPos.y;
                currentX = nextPos.x;
                currentY = nextPos.y;
            }
            
            // Update character position visually
            characterPositions.updateCharacterPosition(charId, nextPos);
            
            // Update current position
            currentX = nextPos.x;
            currentY = nextPos.y;
            
            // Update character data
            charData.x = nextPos.x;
            charData.y = nextPos.y;
            
            // LAVA: Special handling for lava terrain - NEW VERSION WITH BURN STATUS
            if (nextTerrainType === 'lava') {
                // Flying Pokemon ignore lava effects
                if (character.terrainAttributes && character.terrainAttributes.fliegend) {
                    logBattleEvent(`${character.name} fliegt sicher über die Lava.`);
                    
                    // Update position and continue movement
                    characterPositions.updateCharacterPosition(charId, nextPos);
                    charData.x = nextPos.x;
                    charData.y = nextPos.y;
                    currentX = nextPos.x;
                    currentY = nextPos.y;
                    
                    setTimeout(() => {
                        if (stepIndex + 1 < path.length) {
                            const currentTile = document.querySelector(`.battlefield-tile[data-x="${currentX}"][data-y="${currentY}"]`);
                            if (currentTile) {
                                updateTileZIndex(currentTile, false);
                            }
                        }
                        
                        processStep(stepIndex + 1);
                    }, 150);
                    return;
                }
                
                // Fire type Pokemon are immune to lava effects
                const isFireType = character.pokemonTypes && 
                    character.pokemonTypes.some(type => 
                        typeof type === 'string' && type.toLowerCase() === 'fire');
                
                if (isFireType) {
                    logBattleEvent(`${character.name} ist als Feuer-Pokémon immun gegen die Lava und bewegt sich problemlos hindurch.`);
                    
                    // Update position and continue movement
                    characterPositions.updateCharacterPosition(charId, nextPos);
                    charData.x = nextPos.x;
                    charData.y = nextPos.y;
                    currentX = nextPos.x;
                    currentY = nextPos.y;
                    
                    setTimeout(() => {
                        if (stepIndex + 1 < path.length) {
                            const currentTile = document.querySelector(`.battlefield-tile[data-x="${currentX}"][data-y="${currentY}"]`);
                            if (currentTile) {
                                updateTileZIndex(currentTile, false);
                            }
                        }
                        
                        processStep(stepIndex + 1);
                    }, 150);
                    return;
                }
                
                // Apply lava effect using the dedicated function
                const lavaEffect = applyLavaEffect(character);
                if (lavaEffect.applied && lavaEffect.message) {
                    logBattleEvent(lavaEffect.message);
                }
                
                // Update position and continue movement
                characterPositions.updateCharacterPosition(charId, nextPos);
                charData.x = nextPos.x;
                charData.y = nextPos.y;
                currentX = nextPos.x;
                currentY = nextPos.y;
                
                setTimeout(() => {
                    if (stepIndex + 1 < path.length) {
                        const currentTile = document.querySelector(`.battlefield-tile[data-x="${currentX}"][data-y="${currentY}"]`);
                        if (currentTile) {
                            updateTileZIndex(currentTile, false);
                        }
                    }
                    
                    processStep(stepIndex + 1);
                }, 150);
                return;
            }
            
            // Schedule the next step with a short delay
            setTimeout(() => {
                // If there are more steps, update z-index of the current tile
                if (stepIndex + 1 < path.length) {
                    const currentTile = document.querySelector(`.battlefield-tile[data-x="${currentX}"][data-y="${currentY}"]`);
                    if (currentTile) {
                        // The Pokémon is immediately leaving this tile again
                        updateTileZIndex(currentTile, false);
                    }
                }
                
                processStep(stepIndex + 1);
            }, 150); // 150ms delay between steps
        }
        
        // Start processing steps
        processStep(0);
    }).catch(error => {
        console.error("Error loading modules for movement processing:", error);
        if (callback) callback();
    });
}