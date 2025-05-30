/**
 * Rankenhieb (Vine Whip) attack for Pokemon battles - FIXED VERSION
 */

import { TILE_SIZE, GRID_SIZE } from '../config.js';
import { getCharacterPositions, isTileOccupied, updateCharacterPosition } from '../characterPositions.js';
import { rollAttackDice } from '../diceRoller.js';
import { logBattleEvent } from '../battleLog.js';
import { applyAttackDamage } from '../damage.js';
import { calculateFinalDamage } from '../damage.js';
import { attemptEnhancedDodge } from '../dodgeSystem.js'; // Use enhanced dodge system
import { doesPokemonOccupyTile } from '../pokemonDistanceCalculator.js';

// Vine movement speed (in pixels per second)
const VINE_SPEED = 500; // Adjustable speed for the vine animation

// Add styles for the vine
export function addRankenhiebStyles() {
    // Check if styles are already added
    if (document.getElementById('rankenhieb-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'rankenhieb-styles';
    style.textContent = `
        .rankenhieb-vine {
            position: absolute;
            height: 8px;
            background-color: #2ecc71; /* Green */
            transform-origin: left center;
            z-index: 100;
            border-radius: 4px;
            box-shadow: 0 0 5px rgba(46, 204, 113, 0.7);
        }
    `;
    document.head.appendChild(style);
}

// Main function to handle Rankenhieb attack
export async function handleRankenhiebAttack(attacker, target, selectedAttack, charId, targetId) {
    // Initialize attack result object
    const attackResult = {
        attacker: attacker.character.name,
        target: target.character.name,
        success: false,
        attackRolls: [],
        defenseRolls: [],
        damage: 0,
        log: []
    };
    
    // Log attack
    attackResult.log.push(`${attacker.character.name} benutzt ${selectedAttack.weaponName}.`);
    
    // Calculate GENA for attack roll
    const genaValue = await getModifiedGena(attacker, selectedAttack);
    
    // Roll for attack
    let attackRoll = rollAttackDice(genaValue);
    attackResult.attackRolls.push(attackRoll);
    
    // Log attack roll
    attackResult.log.push(`${attacker.character.name} greift ${target.character.name} mit ${selectedAttack.weaponName} an und würfelt: [${attackRoll.rolls.join(', ')}] - ${attackRoll.successes} Erfolge, ${attackRoll.failures} Fehlschläge = ${attackRoll.netSuccesses} Netto.`);
    
    // Handle luck tokens and forcing
    attackRoll = await handleLuckTokensAndForcing(attacker, attackRoll, genaValue, charId, attackResult);
    
    // Determine target tile based on hit/miss
    let targetTile;
    
    if (attackRoll.netSuccesses > 0) {
        // Hit - use the target's position
        targetTile = { x: target.x, y: target.y };
        attackResult.success = true;
        attackResult.log.push(`${attacker.character.name}s Rankenhieb trifft!`);
    } else {
        // Miss - find a random tile at max range or in range
        targetTile = findRandomTileForMiss(attacker, selectedAttack.range);
        attackResult.log.push(`${attacker.character.name}s Rankenhieb verfehlt das Ziel und schlägt bei (${targetTile.x}, ${targetTile.y}) ein!`);
    }
    
    // Give characters a chance to dodge and track successful dodgers
    const dodgePromises = [];
    const characterPositions = getCharacterPositions();
    const successfulDodgers = new Map(); // Track Pokemon that successfully dodge
    
    // Identify all potential Pokemon in the line
    const potentialTargets = findPokemonInLine(attacker, targetTile);
    
    // Allow each potential target to attempt dodge
    for (const potTarget of potentialTargets) {
        // Skip the attacker
        if (potTarget.id === charId) continue;
        
        const dodgePromise = attemptEnhancedDodgeWithDelay(
            attacker, 
            characterPositions[potTarget.id], 
            attackRoll, 
            selectedAttack, 
            potTarget.id,
            successfulDodgers
        );
        dodgePromises.push(dodgePromise);
    }
    
    // Wait for all dodge attempts to complete
    await Promise.all(dodgePromises);
    
    // Create and animate the vine
    const vinePromise = new Promise((resolveVine) => {
        createRankenhiebVine(attacker, targetTile, () => {
            resolveVine();
        });
    });
    
    // Wait for vine animation to complete
    await vinePromise;
    
    // Identify Pokemon that were hit by the vine after dodging
    // Use updated positions for Pokemon that successfully dodged
    const hitTargets = findPokemonTouchingVineWithDodgers(attacker, targetTile, successfulDodgers);
    
    if (attackRoll.netSuccesses > 0 && targetId && !successfulDodgers.has(targetId)) {
        const targetInHitTargets = hitTargets.some(hitTarget => hitTarget.id === targetId);
        if (!targetInHitTargets) {
            // Add the target to hitTargets
            const currentCharacterPositions = getCharacterPositions();
            const currentTarget = currentCharacterPositions[targetId];
            
            if (currentTarget) {
                hitTargets.push({
                    id: targetId,
                    position: currentTarget
                });
            }
        }
    }

    // Apply damage to all hit targets
    for (const hitTarget of hitTargets) {
        // Skip the attacker
        if (hitTarget.id === charId) continue;
        
        // Get current position (might be updated due to dodging)
        const currentCharacterPositions = getCharacterPositions();
        const currentTarget = currentCharacterPositions[hitTarget.id];
        
        if (!currentTarget) continue;
        
        const damageData = calculateFinalDamage(selectedAttack, currentTarget, attacker, attackRoll);
        
        // Apply damage using the damage system
        await applyAttackDamage(
            attacker, 
            currentTarget, 
            selectedAttack, 
            damageData.finalDamage, 
            {
                isCritical: damageData.isCritical,
                attackerId: charId,
                targetId: hitTarget.id,
                effectiveness: damageData.effectivenessType
            }
        );
        
        // Log the hit
        attackResult.log.push(`${currentTarget.character.name} wird von Rankenhieb getroffen und erleidet ${damageData.finalDamage} Schaden!`);
    }
    
    // Return the attack result
    return attackResult;
}

// Enhanced dodge function that properly updates positions
async function attemptEnhancedDodgeWithDelay(attacker, target, attackRoll, selectedAttack, targetId, successfulDodgers) {
    // Small delay to make dodges feel more natural
    await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
    
    // Attempt the enhanced dodge (this returns position info)
    const dodgeResult = await attemptEnhancedDodge(attacker, target, attackRoll, selectedAttack);
    
    if (dodgeResult.success && dodgeResult.position) {
        // Execute the dodge animation and position update
        const { animateDodge } = await import('../animationManager.js');
        
        // Animate the dodge
        animateDodge(targetId, dodgeResult.position, () => {
            // Update the character position in the global positions
            updateCharacterPosition(targetId, dodgeResult.position);
        });
        
        // Track this Pokemon as having successfully dodged with new position
        successfulDodgers.set(targetId, dodgeResult.position);
        
        logBattleEvent(`${target.character.name} weicht dem Rankenhieb aus!`);
    } else {
        logBattleEvent(`${target.character.name} kann dem Rankenhieb nicht ausweichen!`);
    }
    
    return dodgeResult;
}

// Find all Pokemon that touch the vine, accounting for successful dodgers
function findPokemonTouchingVineWithDodgers(attacker, targetTile, successfulDodgers) {
    const characterPositions = getCharacterPositions();
    const hitTargets = [];
    
    // Calculate the line parameters for the vine
    const dx = targetTile.x - attacker.x;
    const dy = targetTile.y - attacker.y;
    const distance = Math.max(Math.abs(dx), Math.abs(dy));
    
    // Normalize direction
    const stepX = dx === 0 ? 0 : dx / Math.abs(dx);
    const stepY = dy === 0 ? 0 : dy / Math.abs(dy);
    
    // Create a set of all tiles the vine passes through
    const vineTiles = new Set();
    for (let i = 0; i <= distance; i++) {
        const x = Math.round(attacker.x + stepX * i);
        const y = Math.round(attacker.y + stepY * i);
        vineTiles.add(`${x},${y}`);
    }
    
    // Check each character to see if it touches the vine
    for (const charId in characterPositions) {
        const charPos = characterPositions[charId];
        
        // Skip the attacker
        if (charPos === attacker) continue;
        
        // Skip already defeated characters
        if (charPos.isDefeated) continue;
        
        // Use updated position if this Pokemon successfully dodged
        let checkPosition = charPos;
        if (successfulDodgers.has(charId)) {
            const dodgedPosition = successfulDodgers.get(charId);
            checkPosition = {
                ...charPos,
                x: dodgedPosition.x,
                y: dodgedPosition.y
            };
        }
        
        // Check if any of the tiles this Pokemon occupies touches the vine
        const pokeSize = checkPosition.character.sizeCategory || 1;
        const radius = Math.floor(pokeSize / 2);
        
        let touchesVine = false;
        
        // Check all tiles the Pokemon occupies
        for (let dx = -radius; dx <= radius && !touchesVine; dx++) {
            for (let dy = -radius; dy <= radius && !touchesVine; dy++) {
                const tileX = checkPosition.x + dx;
                const tileY = checkPosition.y + dy;
                
                // Check if this tile is part of the vine
                if (vineTiles.has(`${tileX},${tileY}`)) {
                    touchesVine = true;
                    break;
                }
            }
        }
        
        if (touchesVine) {
            hitTargets.push({
                id: charId,
                position: checkPosition
            });
        }
    }
    
    return hitTargets;
}

// Create and animate the Rankenhieb vine
function createRankenhiebVine(attacker, targetTile, callback) {
    // Find the battlefield grid for positioning
    const battlefieldGrid = document.querySelector('.battlefield-grid');
    if (!battlefieldGrid) {
        if (callback) callback();
        return;
    }
    
    // Calculate the start and end positions in pixels
    const startX = (attacker.x * TILE_SIZE) + (TILE_SIZE / 2);
    const startY = (attacker.y * TILE_SIZE) + (TILE_SIZE / 2);
    const endX = (targetTile.x * TILE_SIZE) + (TILE_SIZE / 2);
    const endY = (targetTile.y * TILE_SIZE) + (TILE_SIZE / 2);
    
    // Calculate the length and angle of the vine
    const dx = endX - startX;
    const dy = endY - startY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    
    // Create the vine element
    const vine = document.createElement('div');
    vine.className = 'rankenhieb-vine';
    vine.style.position = 'absolute';
    vine.style.left = `${startX}px`;
    vine.style.top = `${startY}px`;
    vine.style.width = '0px'; // Start with zero width
    vine.style.height = '8px';
    vine.style.transformOrigin = 'left center';
    vine.style.transform = `rotate(${angle}deg)`;
    vine.style.transition = `width ${distance / VINE_SPEED}s linear`;
    
    // Add to the battlefield
    battlefieldGrid.appendChild(vine);
    
    // Animate the vine extension
    setTimeout(() => {
        vine.style.width = `${distance}px`;
    }, 10);
    
    // Wait for extension to complete
    setTimeout(() => {
        // Add a small delay at full extension
        setTimeout(() => {
            // Animate retraction
            vine.style.width = '0px';
            
            // Remove vine after retraction
            setTimeout(() => {
                if (vine.parentNode) {
                    vine.parentNode.removeChild(vine);
                }
                if (callback) callback();
            }, distance / VINE_SPEED * 1000);
        }, 200); // Small delay at full extension
    }, distance / VINE_SPEED * 1000 + 50);
}

// Create and initialize a Rankenhieb projectile (compatible with projectile system)
export function createRankenhieb(attacker, target, attack, isHit, callback, activeProjectiles) {
    // Call the implementation directly
    createRankenhiebVine(attacker, target, callback);
    
    // Return a dummy projectile object for compatibility
    return {
        id: `rankenhieb_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        attacker: attacker,
        target: target,
        attack: attack,
        isHit: isHit,
        callback: null, // Already handled by createRankenhiebVine
        removed: false,
        update: () => true, // No updates needed
        destroy: () => {
            // No special cleanup needed
            return true;
        }
    };
}

// Find a random tile at max range distance, or any random tile in range
function findRandomTileForMiss(attacker, range) {
    const potentialTiles = [];
    
    // Check tiles at max range first
    for (let x = attacker.x - range; x <= attacker.x + range; x++) {
        for (let y = attacker.y - range; y <= attacker.y + range; y++) {
            // Skip out of bounds tiles
            if (x < 0 || y < 0 || x >= GRID_SIZE || y >= GRID_SIZE) continue;
            
            // Calculate Manhattan distance
            const distance = Math.abs(x - attacker.x) + Math.abs(y - attacker.y);
            
            // Check if at max range
            if (distance === range) {
                // Check if tile is empty (no Pokemon)
                if (!isTileOccupied(x, y)) {
                    potentialTiles.push({ x, y, isMaxRange: true });
                }
            } else if (distance < range) {
                // Store in-range tiles as fallback
                if (!isTileOccupied(x, y)) {
                    potentialTiles.push({ x, y, isMaxRange: false });
                }
            }
        }
    }
    
    // Filter for max range tiles first
    const maxRangeTiles = potentialTiles.filter(tile => tile.isMaxRange);
    
    // If we have max range tiles, pick one randomly
    if (maxRangeTiles.length > 0) {
        const randomIndex = Math.floor(Math.random() * maxRangeTiles.length);
        return maxRangeTiles[randomIndex];
    }
    
    // Fallback to any in-range tile
    if (potentialTiles.length > 0) {
        const randomIndex = Math.floor(Math.random() * potentialTiles.length);
        return potentialTiles[randomIndex];
    }
    
    // Last resort: just return a tile at the edge of range
    return {
        x: attacker.x + (attacker.x < GRID_SIZE / 2 ? range : -range),
        y: attacker.y
    };
}

// Find all Pokemon that lie in a line between attacker and target
function findPokemonInLine(attacker, targetTile) {
    const characterPositions = getCharacterPositions();
    const potentialTargets = [];
    
    // Calculate the line parameters
    const dx = targetTile.x - attacker.x;
    const dy = targetTile.y - attacker.y;
    const distance = Math.max(Math.abs(dx), Math.abs(dy));
    
    // Check each character to see if it's on the line
    for (const charId in characterPositions) {
        const charPos = characterPositions[charId];
        
        // Skip the attacker
        if (charPos === attacker) continue;
        
        // Skip already defeated characters
        if (charPos.isDefeated) continue;
        
        // Check if this Pokemon is on the line
        if (isPokemonOnLine(attacker, targetTile, charPos)) {
            potentialTargets.push({
                id: charId,
                position: charPos
            });
        }
    }
    
    return potentialTargets;
}

// Check if a Pokemon lies on the line between two points
function isPokemonOnLine(attacker, targetTile, pokemonPos) {
    // Calculate the line parameters
    const dx = targetTile.x - attacker.x;
    const dy = targetTile.y - attacker.y;
    const distance = Math.max(Math.abs(dx), Math.abs(dy));
    
    // Normalize direction
    const stepX = dx === 0 ? 0 : dx / Math.abs(dx);
    const stepY = dy === 0 ? 0 : dy / Math.abs(dy);
    
    // Check each point along the line
    for (let i = 1; i <= distance; i++) {
        const x = Math.round(attacker.x + stepX * i);
        const y = Math.round(attacker.y + stepY * i);
        
        // Check if the Pokemon occupies this tile
        if (doesPokemonOccupyTile(pokemonPos, x, y)) {
            return true;
        }
    }
    
    return false;
}

// Get modified GENA value from attackSystem.js
async function getModifiedGena(attacker, attack) {
    try {
        const { getModifiedGena } = await import('../attackSystem.js');
        return getModifiedGena(attacker, attack);
    } catch (error) {
        console.error('Error importing getModifiedGena:', error);
        // Fallback to a basic calculation
        return attacker.character.combatStats?.gena || 1;
    }
}

// Handle luck tokens and forcing from attackSystem.js
async function handleLuckTokensAndForcing(attacker, attackRoll, genaValue, charId, attackResult) {
    try {
        const { handleLuckTokensAndForcing } = await import('../attackSystem.js');
        return await handleLuckTokensAndForcing(attacker, attackRoll, genaValue, charId, attackResult);
    } catch (error) {
        console.error('Error importing handleLuckTokensAndForcing:', error);
        // Fallback to just returning the original roll
        return attackRoll;
    }
}