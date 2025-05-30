/**
 * Walzer attack implementation with dodge system
 * Pokemon rolls in a straight line to the edge of the arena, damaging everything in its path
 * Pokemon in the path can now attempt to dodge to safety
 */

import { GRID_SIZE } from '../config.js';
import { getCharacterPositions, isTileOccupied, updateCharacterPosition } from '../characterPositions.js';
import { logBattleEvent } from '../battleLog.js';
import { rollDamageWithValue } from '../diceRoller.js';
import { focusOnCharacter } from '../cameraSystem.js';
import { setPokemonSpriteState } from '../pokemonOverlay.js';
import { getTypeEffectiveness, getTypeEffectivenessDescription } from '../effectivenessLookupTable.js';
import { calculateDodgeValue, attemptDodge } from '../dodgeSystem.js';
import { animateDodge } from '../animationManager.js';
import { getOccupiedTiles } from '../pokemonDistanceCalculator.js';
import { getCurrentWeather } from '../weather.js';
import { initializeAttackResult } from '../attackSystem.js';

/**
 * Get available dodge positions that avoid the Walzer path
 * @param {Object} charPos - Position of the dodging character {x, y}
 * @param {Array} walzerPath - Array of positions in the Walzer path
 * @param {Object} attackerPos - Position of the attacker {x, y}
 * @returns {Array} - Array of possible dodge positions not in the Walzer path
 */
function getWalzerDodgePositions(charPos, walzerPath, attackerPos) {
    // All possible directions to check (including diagonals)
    const directions = [
        {x: 0, y: -1},  // Up
        {x: 1, y: -1},  // Up-Right
        {x: 1, y: 0},   // Right
        {x: 1, y: 1},   // Down-Right
        {x: 0, y: 1},   // Down
        {x: -1, y: 1},  // Down-Left
        {x: -1, y: 0},  // Left
        {x: -1, y: -1}  // Up-Left
    ];
    
    const availablePositions = [];
    
    // Create a set of path positions for quick lookup
    const pathPositions = new Set(walzerPath.map(pos => `${pos.x},${pos.y}`));
    
    // Check each direction for valid dodge positions
    for (const dir of directions) {
        // Check positions 1 and 2 tiles away
        for (let distance = 1; distance <= 2; distance++) {
            const newX = charPos.x + (dir.x * distance);
            const newY = charPos.y + (dir.y * distance);
            
            // Check if position is within the battlefield
            if (newX < 0 || newX >= GRID_SIZE || newY < 0 || newY >= GRID_SIZE) {
                continue; // Skip positions outside the battlefield
            }
            
            // Check if position is not occupied
            if (isTileOccupied(newX, newY)) {
                continue; // Skip occupied positions
            }
            
            // Check if position is in the Walzer path
            if (pathPositions.has(`${newX},${newY}`)) {
                continue; // Skip positions in the Walzer path
            }
            
            // Position is valid and safe from Walzer, add it
            availablePositions.push({x: newX, y: newY});
        }
    }
    
    return availablePositions;
}

/**
 * Attempt to dodge the Walzer attack
 * @param {string} targetId - ID of the Pokemon trying to dodge
 * @param {Object} target - Target character data
 * @param {Object} attacker - Attacker character data
 * @param {Array} walzerPath - Path of the Walzer attack
 * @returns {Promise<Object>} - Dodge result {success, newPosition, roll}
 */
async function attemptWalzerDodge(targetId, target, attacker, walzerPath) {
    // Check if the Pokemon can attempt to dodge (status effects, etc.)
    // Import the status check function
    const { hasStatusEffect } = await import('../statusEffects.js');
    
    if (hasStatusEffect(target.character, 'frozen')) {
        logBattleEvent(`${target.character.name} ist eingefroren und kann dem Walzer nicht ausweichen!`);
        return { success: false };
    }

    if (hasStatusEffect(target.character, 'snared')) {
        logBattleEvent(`${target.character.name} ist gefesselt und kann dem Walzer nicht ausweichen!`);
        return { success: false };
    }

    if (hasStatusEffect(target.character, 'asleep')) {
        logBattleEvent(`${target.character.name} schläft und kann dem Walzer nicht ausweichen!`);
        return { success: false };
    }

    if (hasStatusEffect(target.character, 'paralyzed')) {
        // 30% chance to fail dodge due to paralysis
        if (Math.random() < 0.3) {
            logBattleEvent(`${target.character.name} ist paralysiert und kann dem Walzer nicht ausweichen!`);
            return { success: false };
        }
    }
    
    // Calculate dodge value
    const dodgeValue = calculateDodgeValue(target.character);
    
    // For Walzer, we'll use a simpler dodge system - just roll the dodge dice
    // The "attack roll" for Walzer is considered to be 1 success (moderate difficulty)
    const walzerAttackSuccesses = 1;
    
    // Import dice rolling function
    const { rollAttackDice } = await import('../diceRoller.js');
    
    // Roll for dodge
    const dodgeRoll = rollAttackDice(dodgeValue);
    
    // Log the dodge attempt
    logBattleEvent(`${target.character.name} versucht dem Walzer auszuweichen: [${dodgeRoll.rolls.join(', ')}] - ${dodgeRoll.successes} Erfolge, ${dodgeRoll.failures} Fehlschläge = ${dodgeRoll.netSuccesses} Netto.`);
    
    // Check if dodge is successful (dodge needs at least as many successes as the Walzer "attack")
    const dodgeSuccessful = dodgeRoll.netSuccesses >= walzerAttackSuccesses;
    
    if (!dodgeSuccessful) {
        // Check for luck token usage
        const { shouldUseLuckToken, useLuckToken } = await import('../luckTokenSystem.js');
        
        if (shouldUseLuckToken(target.character, dodgeRoll)) {
            const luckTokenResult = useLuckToken(target.character, dodgeRoll, dodgeValue, targetId);
            
            if (luckTokenResult.success) {
                logBattleEvent(luckTokenResult.message);
                const newDodgeRoll = luckTokenResult.roll;
                
                // Check if the new roll succeeds
                if (newDodgeRoll.netSuccesses >= walzerAttackSuccesses) {
                    // Find a safe dodge position
                    const dodgePositions = getWalzerDodgePositions(target, walzerPath, attacker);
                    
                    if (dodgePositions.length > 0) {
                        const dodgePos = dodgePositions[Math.floor(Math.random() * dodgePositions.length)];
                        return { 
                            success: true, 
                            newPosition: dodgePos, 
                            roll: newDodgeRoll 
                        };
                    }
                }
            }
        }
        
        return { success: false, roll: dodgeRoll };
    }
    
    // Dodge successful! Find a safe position
    const dodgePositions = getWalzerDodgePositions(target, walzerPath, attacker);
    
    if (dodgePositions.length === 0) {
        logBattleEvent(`${target.character.name} würfelt erfolgreich zum Ausweichen, aber es gibt keinen sicheren Platz!`);
        return { success: false, roll: dodgeRoll };
    }
    
    // Choose a random safe position
    const dodgePos = dodgePositions[Math.floor(Math.random() * dodgePositions.length)];
    
    return { 
        success: true, 
        newPosition: dodgePos, 
        roll: dodgeRoll 
    };
}

/**
 * Find the last valid position in the direction before hitting bounds or obstacles
 * Uses step-by-step movement with bounds checking at every step
 * @param {number} startX - Starting X position
 * @param {number} startY - Starting Y position
 * @param {number} dirX - Direction X (normalized)
 * @param {number} dirY - Direction Y (normalized)
 * @param {string} attackerId - ID of the attacker (to exclude from collision)
 * @returns {Object|null} - Last valid position or null if none found
 */
function findLastEmptyTile(startX, startY, dirX, dirY, attackerId) {
    let lastEmpty = null;
    let step = 1;
    const stepSize = 0.5; // Use smaller steps for more precision
    
    // Keep stepping in the direction until hitting the edge
    while (step < 100) { // Safety limit to prevent infinite loops
        const floatX = startX + dirX * step;
        const floatY = startY + dirY * step;
        const currentX = Math.round(floatX);
        const currentY = Math.round(floatY);
        
        // CRITICAL: Check bounds first - never go outside the arena
        if (currentX < 0 || currentX >= GRID_SIZE || currentY < 0 || currentY >= GRID_SIZE) {
            break; // Stop before going out of bounds
        }
        
        // Additional safety check: make sure we're not about to go out of bounds on next step
        const nextFloatX = startX + dirX * (step + stepSize);
        const nextFloatY = startY + dirY * (step + stepSize);
        const nextX = Math.round(nextFloatX);
        const nextY = Math.round(nextFloatY);
        
        if (nextX < 0 || nextX >= GRID_SIZE || nextY < 0 || nextY >= GRID_SIZE) {
            // Next step would go out of bounds, so this is our last valid position
            if (!isTileOccupied(currentX, currentY, attackerId)) {
                lastEmpty = { x: currentX, y: currentY };
            }
            break;
        }
        
        // Check if this tile is occupied (except by the attacker)
        if (!isTileOccupied(currentX, currentY, attackerId)) {
            lastEmpty = { x: currentX, y: currentY };
        }
        
        step += stepSize;
    }
    
    return lastEmpty;
}

/**
 * Calculate direction from one point to another (supports any angle)
 * @param {number} x1 - Starting X
 * @param {number} y1 - Starting Y
 * @param {number} x2 - Target X
 * @param {number} y2 - Target Y
 * @returns {Object} - Normalized direction vector { x, y }
 */
function calculateDirection(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    
    // Calculate the magnitude
    const magnitude = Math.sqrt(dx * dx + dy * dy);
    
    if (magnitude === 0) {
        return { x: 0, y: 0 }; // No movement if same position
    }
    
    // Return normalized direction vector (allows any angle)
    return {
        x: dx / magnitude,
        y: dy / magnitude
    };
}

/**
 * Check if target is at the edge of the arena in any direction
 * Now works with any direction vector
 * @param {number} targetX - Target X position
 * @param {number} targetY - Target Y position
 * @param {number} dirX - Direction X (normalized)
 * @param {number} dirY - Direction Y (normalized)
 * @returns {boolean} - True if target is at edge relative to direction
 */
function isTargetAtEdge(targetX, targetY, dirX, dirY) {
    // Calculate next position in the direction
    const nextX = Math.round(targetX + dirX);
    const nextY = Math.round(targetY + dirY);
    
    // Check if next position would be out of bounds
    return (nextX < 0 || nextX >= GRID_SIZE || nextY < 0 || nextY >= GRID_SIZE);
}

/**
 * Get all positions in a line using Bresenham-like algorithm
 * Ensures all positions are valid grid coordinates within bounds
 * @param {number} startX - Starting X
 * @param {number} startY - Starting Y
 * @param {number} endX - Ending X
 * @param {number} endY - Ending Y
 * @returns {Array} - Array of valid positions in the line
 */
function getLinePositions(startX, startY, endX, endY) {
    const positions = [];
    
    // Use Bresenham's line algorithm to get all grid positions the line passes through
    const dx = Math.abs(endX - startX);
    const dy = Math.abs(endY - startY);
    const sx = startX < endX ? 1 : -1;
    const sy = startY < endY ? 1 : -1;
    let err = dx - dy;
    
    let currentX = startX;
    let currentY = startY;
    
    while (true) {
        // Skip the starting position (Pokemon starts there)
        if (!(currentX === startX && currentY === startY)) {
            // CRITICAL: Bounds check every position
            if (currentX >= 0 && currentX < GRID_SIZE && currentY >= 0 && currentY < GRID_SIZE) {
                positions.push({ x: currentX, y: currentY });
            } else {
                // If we hit bounds, stop immediately
                console.warn(`Walzer path hit bounds at (${currentX}, ${currentY}), stopping path generation`);
                break;
            }
        }
        
        // Check if we've reached the end
        if (currentX === endX && currentY === endY) {
            break;
        }
        
        // Bresenham's algorithm step
        const err2 = 2 * err;
        if (err2 > -dy) {
            err -= dy;
            currentX += sx;
        }
        if (err2 < dx) {
            err += dx;
            currentY += sy;
        }
        
        // Safety check: if we're about to go out of bounds, stop
        if (currentX < 0 || currentX >= GRID_SIZE || currentY < 0 || currentY >= GRID_SIZE) {
            console.warn(`Walzer path would go out of bounds at (${currentX}, ${currentY}), stopping`);
            break;
        }
    }
    
    return positions;
}

/**
 * Find Pokemon in the path and return their IDs
 * Now considers the full size of both attacker and target Pokemon
 * @param {Array} attackerPath - Array of positions the attacker will travel through
 * @param {string} attackerId - ID of the attacker
 * @returns {Array} - Array of character IDs in the path
 */
function findPokemonInPath(attackerPath, attackerId) {
    const characterPositions = getCharacterPositions();
    const targetsInPath = [];
    const hitPositions = new Set(); // To track all positions the attacker will occupy
    
    // Get attacker data for size calculation
    const attacker = characterPositions[attackerId];
    if (!attacker) return [];
    
    // For each position in the attacker's path
    attackerPath.forEach(centerPos => {
        // Create a temporary position object for the attacker at this point in the path
        const attackerAtPos = {
            x: centerPos.x,
            y: centerPos.y,
            character: attacker.character
        };
        
        // Get all tiles the attacker would occupy at this position
        const attackerTiles = getOccupiedTiles(attackerAtPos);
        
        // Add all these positions to our hit positions set
        attackerTiles.forEach(tile => {
            hitPositions.add(`${tile.x},${tile.y}`);
        });
    });
    
    // Now check each character to see if any of its occupied tiles intersect with the hit positions
    const hitTargets = new Set(); // Track which targets have been hit to avoid duplicates
    
    for (const charId in characterPositions) {
        // Skip attacker and already defeated Pokemon
        if (charId === attackerId || characterPositions[charId].isDefeated) continue;
        
        // Skip if we've already determined this Pokemon will be hit
        if (hitTargets.has(charId)) continue;
        
        // Get all tiles occupied by this potential target
        const targetTiles = getOccupiedTiles(characterPositions[charId]);
        
        // Check if any of the target's tiles intersect with any of the attacker's path tiles
        const isHit = targetTiles.some(tile => hitPositions.has(`${tile.x},${tile.y}`));
        
        if (isHit) {
            targetsInPath.push(charId);
            hitTargets.add(charId); // Mark as hit to prevent duplicates
        }
    }
    
    return targetsInPath;
}

/**
 * Animate Walzer attack with simultaneous dodge mechanics
 * Now uses the full body hitbox of the attacking Pokemon
 * @param {string} attackerId - ID of the attacker
 * @param {Object} attacker - Attacker data
 * @param {string} targetId - ID of the initial target
 * @param {Object} target - Target data
 * @param {Function} callback - Callback when animation completes
 */
export async function animateWalzer(attackerId, attacker, targetId, target, callback) {
    const characterPositions = getCharacterPositions();
    
    // Handle Walzer chain logic
    const previousChain = attacker.character.walzerChain || 0;
    
    // Increment chain count
    if (!attacker.character.walzerChain) {
        attacker.character.walzerChain = 1;
    } else {
        attacker.character.walzerChain = Math.min(attacker.character.walzerChain + 1, 6); // Max 6 chain
    }

    updateWalzerChainVisual(attacker.character, true);
    
    const currentChain = attacker.character.walzerChain;
    const chainBonus = currentChain > 1 ? Math.min((currentChain - 1) * 3, 15) : 0;
    
    // Log chain information
    if (currentChain === 1) {
        logBattleEvent(`${attacker.character.name} beginnt eine Walzer-Kette!`);
    } else {
        logBattleEvent(`${attacker.character.name} setzt die Walzer-Kette fort! (${currentChain}x, +${chainBonus}d6 Bonus-Schaden)`);
    }
    
    // Apply continuous rotation visual effect for chain state
    const spriteEl = document.querySelector(`.pokemon-sprite[data-character-id="${attackerId}"]`);
    
    setPokemonSpriteState(attackerId, 'walzer-chain', true);
    
    // Calculate direction from attacker to target (now supports any angle!)
    const direction = calculateDirection(
        attacker.x, attacker.y,
        target.x, target.y
    );
    
    // Validate direction
    if (direction.x === 0 && direction.y === 0) {
        logBattleEvent(`${attacker.character.name}'s Walzer schlägt fehl! Kein gültiges Ziel gefunden.`);
        if (callback) callback(false);
        return;
    }
    
    // Check if target is at the edge
    if (isTargetAtEdge(target.x, target.y, direction.x, direction.y)) {
        logBattleEvent(`${attacker.character.name}'s Walzer schlägt fehl! Das Ziel ist bereits am Rand des Kampffeldes.`);
        if (callback) callback(false);
        return;
    }
    
    // Find the last empty tile in the direction
    const lastEmpty = findLastEmptyTile(
        attacker.x, attacker.y,
        direction.x, direction.y,
        attackerId
    );
    
    if (!lastEmpty) {
        logBattleEvent(`${attacker.character.name}'s Walzer schlägt fehl! Kein freier Platz in dieser Richtung.`);
        if (callback) callback(false);
        return;
    }
    
    console.log(`Walzer path: from (${attacker.x}, ${attacker.y}) to (${lastEmpty.x}, ${lastEmpty.y}) in direction (${direction.x.toFixed(2)}, ${direction.y.toFixed(2)})`);
    
    // Get all positions in the line
    const linePositions = getLinePositions(
        attacker.x, attacker.y,
        lastEmpty.x, lastEmpty.y
    );
    
    console.log(`Walzer will visit ${linePositions.length} positions:`, linePositions);
    
    // Find all Pokemon in the path using the new implementation that considers full body size
    const targetsInPath = findPokemonInPath(linePositions, attackerId);
    
    // Log the attack start with chain info
    if (currentChain === 1) {
        logBattleEvent(`${attacker.character.name} setzt Walzer ein und rollt in Richtung ${target.character.name}!`);
    } else {
        logBattleEvent(`${attacker.character.name} rollt mit verstärktem Walzer (${currentChain}x) in Richtung ${target.character.name}!`);
    }
    
    // PRE-CALCULATE ALL DODGE ATTEMPTS AND START THEM IMMEDIATELY
    const dodgeInfo = new Map(); // Map of targetId -> dodge info
    const dodgePromises = [];
    
    // For each Pokemon in the path, start their dodge attempt immediately
    for (const targetAtPosId of targetsInPath) {
        const targetData = characterPositions[targetAtPosId];
        
        // Calculate when Walzer will reach this Pokemon (position index * 100ms per step)
        const targetPosition = { x: targetData.x, y: targetData.y };
        
        // Find the earliest position where the attacker would hit this target
        // This is more complex now with multiple hitboxes
        let positionIndex = linePositions.length; // Default to end of path
        
        for (let i = 0; i < linePositions.length; i++) {
            // Create temporary position for the attacker at this point
            const attackerAtPos = {
                x: linePositions[i].x,
                y: linePositions[i].y,
                character: attacker.character
            };
            
            // Get tiles for both Pokemon
            const attackerTiles = getOccupiedTiles(attackerAtPos);
            const targetTiles = getOccupiedTiles(targetData);
            
            // Check if any tiles overlap
            const collision = attackerTiles.some(aTile => 
                targetTiles.some(tTile => 
                    aTile.x === tTile.x && aTile.y === tTile.y
                )
            );
            
            if (collision) {
                positionIndex = i;
                break;
            }
        }
        
        const timeUntilHit = positionIndex * 100; // 100ms per step
        
        // Start the dodge attempt immediately
        const dodgePromise = (async () => {
            const dodgeResult = await attemptWalzerDodge(
                targetAtPosId, 
                targetData, 
                attacker, 
                linePositions
            );
            
            if (dodgeResult.success) {
                // Start dodge animation immediately
                const dodgeAnimationPromise = new Promise(resolve => {
                    animateDodge(targetAtPosId, dodgeResult.newPosition, () => {
                        // Update position when animation completes
                        updateCharacterPosition(targetAtPosId, dodgeResult.newPosition);
                        resolve();
                    });
                });
                
                // Store dodge info
                dodgeInfo.set(targetAtPosId, {
                    success: true,
                    newPosition: dodgeResult.newPosition,
                    animationPromise: dodgeAnimationPromise,
                    dodgeStartTime: Date.now(),
                    timeUntilHit: timeUntilHit
                });
                
                logBattleEvent(`${targetData.character.name} beginnt auszuweichen!`);
                
                return dodgeAnimationPromise;
            } else {
                // Dodge failed
                dodgeInfo.set(targetAtPosId, {
                    success: false,
                    timeUntilHit: timeUntilHit
                });
                
                return Promise.resolve();
            }
        })();
        
        dodgePromises.push(dodgePromise);
    }
    
    // Add spinning visual effect to attacker
    setPokemonSpriteState(attackerId, 'spinning', true);
    
    // Focus camera on the attacker initially
    await focusOnCharacter(attackerId);
    
    // Keep track of hit targets to prevent hitting the same target multiple times
    const hitTargets = new Set();
    
    // Keep track of hit count for damage scaling
    let hitCount = 0;
    
    // Process each position in the path
    const processNextPosition = async (index) => {
        if (index >= linePositions.length) {
            // We've reached the end of the path
            
            // Remove spinning effect
            setPokemonSpriteState(attackerId, 'spinning', false);
            
            logBattleEvent(`${attacker.character.name} beendet seinen Walzer-Angriff.`);
            
            // Wait for any remaining dodge animations to complete
            await Promise.all(dodgePromises);
            
            // Final camera focus on the end position
            await focusOnCharacter(attackerId, 300);
            
            if (callback) callback(true);
            return;
        }
        
        const currentPos = linePositions[index];
        
        // SAFETY CHECK: Ensure we never move to an out-of-bounds position
        if (currentPos.x < 0 || currentPos.x >= GRID_SIZE || currentPos.y < 0 || currentPos.y >= GRID_SIZE) {
            console.error(`CRITICAL: Walzer tried to move to out-of-bounds position (${currentPos.x}, ${currentPos.y})! Stopping attack.`);
            
            // Remove spinning effect
            setPokemonSpriteState(attackerId, 'spinning', false);
            
            logBattleEvent(`${attacker.character.name}'s Walzer stoppt abrupt an der Arena-Grenze!`);
            
            if (callback) callback(false);
            return;
        }
        
        // Create a temporary position object for the attacker at this point in the path
        const attackerAtPos = {
            x: currentPos.x,
            y: currentPos.y,
            character: attacker.character
        };
        
        // Get all tiles the attacker occupies at this position
        const attackerTiles = getOccupiedTiles(attackerAtPos);
        
        // Check each target in the path to see if it collides with any of the attacker's tiles
        for (const targetAtPosId of targetsInPath) {
            // Skip if this target has already been hit
            if (hitTargets.has(targetAtPosId)) continue;
            
            let targetData = characterPositions[targetAtPosId];
            const dodgeData = dodgeInfo.get(targetAtPosId);

            // If this Pokemon has successfully dodged, use its new position for collision detection
            if (dodgeData && dodgeData.success) {
                // Check if dodge animation is completed
                const currentTime = Date.now();
                const dodgeTimeElapsed = currentTime - dodgeData.dodgeStartTime;
                const dodgeAnimationDuration = 300; // Match this with your actual animation duration
                
                if (dodgeTimeElapsed >= dodgeAnimationDuration) {
                    // Create a new targetData object with the updated position
                    targetData = { 
                        ...targetData, 
                        x: dodgeData.newPosition.x, 
                        y: dodgeData.newPosition.y 
                    };
                }
            }
            
            // Get all tiles the target occupies
            const targetTiles = getOccupiedTiles(targetData);
            
            // Check if any of the attacker's tiles collide with any of the target's tiles
            const collision = attackerTiles.some(aTile => 
                targetTiles.some(tTile => 
                    aTile.x === tTile.x && aTile.y === tTile.y
                )
            );
            
            if (collision) {
                if (dodgeData && dodgeData.success) {
                    // Check if the dodge animation completed in time
                    const currentTime = Date.now();
                    const dodgeTimeElapsed = currentTime - dodgeData.dodgeStartTime;
                    const dodgeAnimationDuration = 300; // Assume 300ms for dodge animation
                    
                    if (dodgeTimeElapsed >= dodgeAnimationDuration) {
                        // Dodge completed in time - Pokemon is safe!
                        logBattleEvent(`${targetData.character.name} weicht dem Walzer erfolgreich aus!`);
                        // Don't hit this Pokemon
                    } else {
                        // Dodge too slow - Pokemon gets hit while trying to dodge!
                        logBattleEvent(`${targetData.character.name} ist zu langsam beim Ausweichen und wird trotzdem getroffen!`);
                        
                        // Hit the Pokemon at their original position
                        applyWalzerHit(attackerId, attacker, targetAtPosId, targetData, hitCount);
                        hitCount++;
                        
                        // Mark as hit to prevent multiple hits
                        hitTargets.add(targetAtPosId);
                    }
                } else {
                    // No dodge attempt or dodge failed - Pokemon gets hit
                    if (dodgeData && !dodgeData.success) {
                        logBattleEvent(`${targetData.character.name} kann dem Walzer nicht ausweichen!`);
                    }
                    
                    applyWalzerHit(attackerId, attacker, targetAtPosId, targetData, hitCount);
                    hitCount++;
                    
                    // Mark as hit to prevent multiple hits
                    hitTargets.add(targetAtPosId);
                }
            }
        }
        
        // Move to this position (Walzer continues regardless of hits)
        await new Promise(resolve => {
            // Update character position - using the proper imported function
            updateCharacterPosition(attackerId, currentPos);
            
            // Focus camera on the moving Pokemon with a very short duration
            focusOnCharacter(attackerId, 50);
            
            // Short delay for movement animation
            setTimeout(resolve, 100);
        });
        
        // Process next position
        processNextPosition(index + 1);
    };
    
    // Start processing positions
    processNextPosition(0);
}

/**
 * Apply damage when Walzer hits a Pokemon
 * @param {string} attackerId - ID of the attacker
 * @param {Object} attacker - Attacker data
 * @param {string} targetId - ID of the target
 * @param {Object} targetData - Target data
 * @param {number} hitCount - Current hit count for damage scaling
 */
async function applyWalzerHit(attackerId, attacker, targetId, targetData, hitCount) {
    // Import the damage system
    const { applyAttackDamage } = await import('../damage.js');
    
    // Calculate damage with increasing power for each hit AND chain bonus
    const damageResult = calculateWalzerDamageWithChain(
        attacker.character, 
        targetData.character,
        hitCount
    );
    
    // Determine effectiveness type for visual display
    let effectivenessType = 'normal';
    if (damageResult.effectivenessDesc) {
        if (damageResult.effectivenessDesc.includes("sehr effektiv")) {
            effectivenessType = 'super';
        } else if (damageResult.effectivenessDesc.includes("nicht sehr effektiv")) {
            effectivenessType = 'notvery';
        }
    }
    
    // Create attack data object for the damage system
    const walzerAttack = {
        weaponName: "Walzer",
        damage: damageResult.baseDiceCount,
        moveType: "rock", // Walzer is a rock-type attack
        category: "Physisch"
    };
    
    // Apply damage using the centralized damage system
    const result = await applyAttackDamage(
        attacker, 
        targetData, 
        walzerAttack, 
        damageResult.total,
        {
            attackerId: attackerId,
            targetId: targetId,
            effectiveness: effectivenessType,
            // Custom data for Walzer mechanics
            customData: {
                chainCount: damageResult.chainCount,
                chainBonus: damageResult.chainBonus,
                hitCount: hitCount,
                weatherMessage: damageResult.weatherMessage
            },
            // Custom handler for Walzer-specific logging
            onDamageComplete: (result) => {
                // Build hit message with chain information
                if (result.applied) {
                    let hitMessage = `${attacker.character.name} trifft ${targetData.character.name} mit Walzer`;
                    if (damageResult.chainBonus > 0) {
                        hitMessage += ` (Kette ${damageResult.chainCount}x, +${damageResult.chainBonus}d6)`;
                    }
                    hitMessage += ` und verursacht ${result.damage} Schaden!`;
                    
                    if (damageResult.effectivenessDesc) {
                        hitMessage += ` Der Angriff ${damageResult.effectivenessDesc}!`;
                    }
                    
                    if (damageResult.weatherMessage) {
                        hitMessage += ` ${damageResult.weatherMessage}`;
                    }
                    
                    logBattleEvent(hitMessage);
                }
            }
        }
    );
}

/**
 * Apply special spinning CSS class to support the animation
 */
export function setupWalzerAnimation() {
    // Add spinning animation style if not already present
    if (!document.getElementById('walzer-animation-style')) {
        const style = document.createElement('style');
        style.id = 'walzer-animation-style';
        style.textContent = `
            .pokemon-sprite.spinning {
                animation: pokemon-spin 0.3s linear infinite !important;
            }
            
            @keyframes pokemon-spin {
                0% { transform: translate(-50%, -50%) rotate(0deg); }
                100% { transform: translate(-50%, -50%) rotate(360deg); }
            }
            
            /* Enhanced version with additional effects */
            @keyframes pokemon-walzer-spin {
                0% {
                    transform: translate(-50%, -50%) rotate(0deg);
                    filter: brightness(1) blur(0px);
                }
                50% {
                    transform: translate(-50%, -50%) rotate(180deg);
                    filter: brightness(1.3) blur(1px);
                }
                100% {
                    transform: translate(-50%, -50%) rotate(360deg);
                    filter: brightness(1) blur(0px);
                }
            }
            
            /* Speed trail effect */
            .pokemon-sprite.spinning::after {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: inherit;
                background-position: center;
                background-size: cover;
                opacity: 0.6;
                filter: blur(4px) brightness(1.2);
                z-index: -1;
                border-radius: inherit;
                animation: trail-fade 0.3s linear infinite;
            }
            
            @keyframes trail-fade {
                0% { opacity: 0.6; transform: scale(1.1); }
                100% { opacity: 0; transform: scale(1.3); }
            }

            .pokemon-sprite.walzer-chain {
                animation: pokemon-spin 0.3s linear infinite !important;
            }
        `;
        document.head.appendChild(style);
    }
}

/**
 * Initialize the Walzer attack (called when game starts)
 */
export function initializeWalzer() {
    setupWalzerAnimation();
    console.log('Walzer-Angriff mit Ausweichen-System initialisiert.');
}

/**
 * Check if a Walzer is viable based on potential targets that could be hit
 * Now considers the full body hitbox of the attacking Pokemon
 * @param {Object} attacker - Attacker character data
 * @param {Object} target - Target character data
 * @returns {boolean} - Whether Walzer can successfully execute
 */
export function isWalzerViable(attacker, target) {
    // Calculate direction from attacker to target
    const direction = calculateDirection(
        attacker.x, attacker.y,
        target.x, target.y
    );
    
    // Check 1: Valid direction
    if (direction.x === 0 && direction.y === 0) {
        return false; // Same position or invalid
    }
    
    // Check 2: Target is not at edge (would cause immediate failure)
    if (isTargetAtEdge(target.x, target.y, direction.x, direction.y)) {
        return false; // Target at edge, Walzer would fail
    }
    
    // Find attacker's character ID for collision checking
    const characterPositions = getCharacterPositions();
    let attackerId = null;
    for (const charId in characterPositions) {
        if (characterPositions[charId].character === attacker.character) {
            attackerId = charId;
            break;
        }
    }
    
    if (!attackerId) {
        return false; // Can't find attacker
    }
    
    // Check 3: Valid path exists
    const lastEmpty = findLastEmptyTile(
        attacker.x, attacker.y,
        direction.x, direction.y,
        attackerId
    );
    
    if (!lastEmpty) {
        return false; // No valid path
    }
    
    // All checks passed - Walzer is viable!
    return true;
}

/**
 * Initialize or increment the Walzer chain for a Pokemon
 * @param {Object} pokemon - The Pokemon character
 * @returns {number} - Current chain count
 */
export function incrementWalzerChain(pokemon) {
    if (!pokemon.walzerChain) {
        pokemon.walzerChain = 1;
    } else {
        pokemon.walzerChain = Math.min(pokemon.walzerChain + 1, 6); // Max 6 chain (5 bonus)
    }
    
    return pokemon.walzerChain;
}

/**
 * Break the Walzer chain for a Pokemon
 * @param {Object} pokemon - The Pokemon character
 * @param {string} reason - Reason for breaking the chain
 */
export function breakWalzerChain(pokemon) {
    if (!pokemon.walzerChain || pokemon.walzerChain === 0) return;
    
    const oldChain = pokemon.walzerChain;
    pokemon.walzerChain = 0;
    
    if (oldChain > 1) {
        logBattleEvent(`${pokemon.name}'s Walzer-Kette (${oldChain}x) wurde unterbrochen!`);
    }
    
    // Remove visual chain effect
    updateWalzerChainVisual(pokemon, false);
}

/**
 * Get the current Walzer chain count for a Pokemon
 * @param {Object} pokemon - The Pokemon character
 * @returns {number} - Current chain count (0 if no chain)
 */
export function getWalzerChain(pokemon) {
    return pokemon.walzerChain || 0;
}

/**
 * Calculate bonus damage dice from Walzer chain
 * @param {number} chainCount - Current chain count
 * @returns {number} - Bonus dice to add
 */
export function getWalzerChainBonus(chainCount) {
    if (chainCount <= 1) return 0;
    
    // Each chain level after the first adds 3d6
    // Chain 2 = +3d6, Chain 3 = +6d6, Chain 4 = +9d6, Chain 5 = +12d6, Chain 6 = +15d6 (max)
    return Math.min((chainCount - 1) * 3, 15);
}

/**
 * Update visual effect for Walzer chain state
 * @param {Object} pokemon - The Pokemon character
 * @param {boolean} inChain - Whether the Pokemon is in chain state
 */
export function updateWalzerChainVisual(pokemon, inChain) {
    if (!pokemon.uniqueId) return;
    
    // Use the already imported function instead of dynamic import
    const characterPositions = getCharacterPositions();
    
    for (const charId in characterPositions) {
        if (characterPositions[charId].character && 
            characterPositions[charId].character.uniqueId === pokemon.uniqueId) {
            
            setPokemonSpriteState(charId, 'walzer-chain', inChain);
            break;
        }
    }
}

/**
 * Check if a Pokemon is in Walzer chain state
 * @param {Object} pokemon - The Pokemon character
 * @returns {boolean} - Whether the Pokemon is in chain state
 */
export function isInWalzerChain(pokemon) {
    return (pokemon.walzerChain || 0) > 0;
}

/**
 * Handle turn-based chain breaking
 * This should be called when a Pokemon uses any non-Walzer attack or skips a turn
 * @param {Object} pokemon - The Pokemon character
 * @param {string} attackName - Name of the attack used (or 'skip' for skipped turn)
 */
export function handleTurnChainBreaking(pokemon, attackName) {
    if (!isInWalzerChain(pokemon)) return;
    
    if (attackName === 'skip') {
        breakWalzerChain(pokemon, 'Zug übersprungen');
    } else if (attackName !== 'Walzer') {
        breakWalzerChain(pokemon, `andere Attacke (${attackName})`);
    }
}

/**
 * Handle defeat-based chain breaking
 * @param {Object} pokemon - The Pokemon character
 */
export function handleDefeatChainBreaking(pokemon) {
    if (isInWalzerChain(pokemon)) {
        breakWalzerChain(pokemon, 'Niederlage');
    }
}

/**
 * Enhanced Walzer damage calculation with chain bonus and weather effects
 * @param {Object} attacker - Attacker character
 * @param {Object} target - Target character
 * @param {number} hitCount - Number of hits in the current Walzer (same attack)
 * @returns {Object} - Damage calculation result
 */
export function calculateWalzerDamageWithChain(attacker, target, hitCount) {
    // Base damage is 3d6, increased by 1d6 for each hit in this specific Walzer use
    let baseDamage = 3 + hitCount;
    
    // Get chain bonus
    const chainCount = getWalzerChain(attacker);
    const chainBonus = getWalzerChainBonus(chainCount);
    
    // Add chain bonus to base damage
    baseDamage += chainBonus;
    
    // Get Einigler boost if applicable
    if (attacker.usedEinigler) {
        baseDamage += 2; // +2d6 damage if Einigler was used
    }
    
    // Apply weather effects for Rock-type attack (Walzer is Rock-type)
    let weatherMessage = "";
    const currentWeather = getCurrentWeather();
    
    if (currentWeather.state === "Sandsturm") {
        // Walzer is a Rock-type attack, boosted by Sandstorm
        const originalDamage = baseDamage;
        baseDamage = Math.round(baseDamage * 1.5);
        weatherMessage = `Der Sandsturm verstärkt den Walzer!`;
    }
    
    // Roll the damage
    const damageRoll = rollDamageWithValue(baseDamage);
    
    // Apply type effectiveness if possible
    let modifiedDamage = damageRoll.total;
    let effectivenessDesc = "";
    
    // If we have type information, apply effectiveness
    if (attacker.pokemonTypes && target.pokemonTypes) {
        const attackType = "rock";
        const targetTypes = target.pokemonTypes;
        
        // Calculate effectiveness and get description
        const effectiveness = getTypeEffectiveness(
            attackType.toLowerCase(),
            targetTypes.map(t => typeof t === 'string' ? t.toLowerCase() : t)
        );
        
        if (effectiveness !== undefined && !isNaN(effectiveness)) {
            modifiedDamage = Math.round(modifiedDamage * effectiveness);
            effectivenessDesc = getTypeEffectivenessDescription(
                attackType.toLowerCase(),
                targetTypes.map(t => typeof t === 'string' ? t.toLowerCase() : t)
            );
        }
    }
    
    // Add weather message to effectiveness description if present
    if (weatherMessage) {
        if (effectivenessDesc) {
            effectivenessDesc += ` ${weatherMessage}`;
        } else {
            effectivenessDesc = weatherMessage;
        }
    }
    
    return {
        ...damageRoll,
        total: modifiedDamage,
        effectivenessDesc: effectivenessDesc,
        baseDiceCount: baseDamage,
        chainBonus: chainBonus,
        chainCount: chainCount,
        weatherMessage: weatherMessage
    };
}

/**
 * Handle Walzer attack execution
 * @param {Object} attacker - Attacker character data
 * @param {Object} target - Target character data
 * @param {Object} selectedAttack - The selected attack
 * @param {string} charId - Attacker character ID
 * @param {string} targetId - Target character ID
 * @returns {Promise<Object>} - Attack result
 */
export async function handleWalzerAttack(attacker, target, selectedAttack, charId, targetId) {
    const attackResult = initializeAttackResult(attacker, target, selectedAttack);
    
    const walzerPromise = new Promise((resolveWalzer) => {
        animateWalzer(charId, attacker, targetId, target, (success) => {
            if (success) {
                attackResult.success = true;
                if (!attacker.character.walzerUseCount) {
                    attacker.character.walzerUseCount = 1;
                } else {
                    attacker.character.walzerUseCount++;
                }
            } else {
                attackResult.log.push(`${attacker.character.name}'s Walzer konnte nicht ausgeführt werden!`);
            }
            resolveWalzer();
        });
    });
    
    await walzerPromise;
    return attackResult;
}