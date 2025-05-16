/**
 * Strategy-based movement for characters
 * Completely reworked to match the specified strategies
 */

import { calculateMovementRange } from './movementRange.js';
import { findPathToTarget } from './pathfinding.js';
import { STRATEGY } from './config.js';
import { getCharacterPositions } from './characterPositions.js';
import { getBestAttack, findNearestEnemy, findNearestEnemyInRange } from './attackSystem.js';
import { GRID_SIZE } from './config.js';

/**
 * Move a character based on their strategy
 * @param {Object} charData - Character data with position and strategy
 * @returns {Object} - New position and path
 */
export function moveCharacterByStrategy(charData) {
    const character = charData.character;
    const teamIndex = charData.teamIndex;
    const currentX = charData.x;
    const currentY = charData.y;
    const strategy = character.strategy || STRATEGY.AGGRESSIVE;
    
    // Get character ID
    const characterPositions = getCharacterPositions();
    const charId = Object.keys(characterPositions).find(id => 
        characterPositions[id].character === character);
    
    // Calculate movement range based on BW and strategy
    const bw = (character.combatStats && character.combatStats.bw) ? character.combatStats.bw : 1;
    let movementRange = calculateMovementRange(bw);
    
    // Apply any movement modifiers (like from defensive strategy)
    if (charData.moveModifier) {
        movementRange = Math.ceil(movementRange * charData.moveModifier);
    }
    
    // Default: don't move
    let result = { x: currentX, y: currentY, path: [] };
    
    // Find nearest enemy for reference
    const nearestEnemy = findNearestEnemy(character, teamIndex, currentX, currentY);
    if (!nearestEnemy) {
        return result; // No enemies found
    }
    
    // Special handling if we need to move away after an attack
    if (charData.moveAwayAfterAttack) {
        // Get the attack range (passed from the turn function)
        const attackRange = charData.attackRange || 1;
        
        // Calculate current distance to enemy
        const currentDistance = nearestEnemy.distance;
        
        // Only move away if there's room to do so while staying in range
        if (currentDistance < attackRange) {
            // Maximum distance we can move away while staying in range
            const maxMoveDistance = Math.min(
                movementRange,           // Limited by our movement capacity
                attackRange - currentDistance  // Limited by attack range (must stay in range)
            );
            
            // If we can't move away at all, return no movement
            if (maxMoveDistance <= 0) {
                return result;
            }
            
            // Create a direction vector pointing away from the enemy
            const dirX = currentX - nearestEnemy.x;
            const dirY = currentY - nearestEnemy.y;
            
            // Normalize the direction
            const dirLength = Math.sqrt(dirX * dirX + dirY * dirY);
            if (dirLength === 0) {
                return result; // Cannot determine direction
            }
            
            const normDirX = dirX / dirLength;
            const normDirY = dirY / dirLength;
            
            // Calculate target position away from enemy but within attack range
            const targetX = Math.round(currentX + normDirX * maxMoveDistance);
            const targetY = Math.round(currentY + normDirY * maxMoveDistance);
            
            // Ensure within grid bounds
            const boundedTargetX = Math.max(0, Math.min(GRID_SIZE - 1, targetX));
            const boundedTargetY = Math.max(0, Math.min(GRID_SIZE - 1, targetY));
            
            // Find path away from enemy
            const pathAway = findPathToTarget(
                currentX, currentY,
                boundedTargetX, boundedTargetY,
                movementRange,
                character,
                charId
            );
            
            if (pathAway && pathAway.path.length > 0) {
                // Validate the final position is still in range
                const endPos = pathAway.path[pathAway.path.length - 1];
                const endX = endPos.x;
                const endY = endPos.y;
                
                // Calculate final distance to enemy
                const endDx = endX - nearestEnemy.x;
                const endDy = endY - nearestEnemy.y;
                const endDistance = Math.sqrt(endDx * endDx + endDy * endDy);
                
                // Only use this path if it keeps us in range
                if (endDistance <= attackRange) {
                    return pathAway;
                }
            }
            
            // If no direct path away, try different angles
            for (let angle = 30; angle <= 330; angle += 30) {
                const radians = (angle * Math.PI) / 180;
                const rotatedDirX = Math.cos(radians) * normDirX - Math.sin(radians) * normDirY;
                const rotatedDirY = Math.sin(radians) * normDirX + Math.cos(radians) * normDirY;
                
                const altTargetX = Math.round(currentX + rotatedDirX * maxMoveDistance);
                const altTargetY = Math.round(currentY + rotatedDirY * maxMoveDistance);
                
                // Ensure within grid bounds
                const boundedAltTargetX = Math.max(0, Math.min(GRID_SIZE - 1, altTargetX));
                const boundedAltTargetY = Math.max(0, Math.min(GRID_SIZE - 1, altTargetY));
                
                const altPathAway = findPathToTarget(
                    currentX, currentY,
                    boundedAltTargetX, boundedAltTargetY,
                    movementRange,
                    character,
                    charId
                );
                
                if (altPathAway && altPathAway.path.length > 0) {
                    // Validate the final position is still in range
                    const endPos = altPathAway.path[altPathAway.path.length - 1];
                    const endX = endPos.x;
                    const endY = endPos.y;
                    
                    // Calculate final distance to enemy
                    const endDx = endX - nearestEnemy.x;
                    const endDy = endY - nearestEnemy.y;
                    const endDistance = Math.sqrt(endDx * endDx + endDy * endDy);
                    
                    // Only use this path if it keeps us in range
                    if (endDistance <= attackRange) {
                        return altPathAway;
                    }
                }
            }
        }
        
        // Return default no-movement result if we can't move away while staying in range
        return result;
    }
    
    // Handle each strategy normally if not moving away after attack
    switch (strategy) {
        case STRATEGY.AGGRESSIVE:
        case STRATEGY.DEFENSIVE:
            // For both aggressive and defensive: determine best attack and optimal position
            return handleOffensiveMovement(charData, nearestEnemy, charId, movementRange);
            
        case STRATEGY.FLEEING:
            // For fleeing: first check for attack, then move to safest position
            return handleFleeingMovement(charData, charId, movementRange);
    }
    
    return result;
}

/**
 * Handle movement for offensive strategies (Aggressiv and Standhaft)
 */
function handleOffensiveMovement(charData, nearestEnemy, charId, movementRange) {
    const currentX = charData.x;
    const currentY = charData.y;
    const character = charData.character;
    const teamIndex = charData.teamIndex;
    
    // Default: don't move
    let result = { x: currentX, y: currentY, path: [] };
    
    // IMPORTANT FIX: Get best attack SYNCHRONOUSLY - call directly without await
    // This is different from the async approach but maintains compatibility
    const bestAttackData = {
        character: character,
        teamIndex: teamIndex, 
        x: currentX, 
        y: currentY
    };
    
    const targetData = {
        character: nearestEnemy.character,
        x: nearestEnemy.x,
        y: nearestEnemy.y
    };
    
    // Use synchronous getBestAttack call - this assumes it can work synchronously in this context
    const bestAttack = getBestAttack(bestAttackData, targetData, nearestEnemy.distance);
    
    // If bestAttack is a Promise, we can't use it directly - just default to moving toward enemy
    if (!bestAttack || bestAttack instanceof Promise) {
        console.log(`${character.name} could not determine best attack synchronously, moving directly toward enemy.`);
        const pathToEnemy = findPathToTarget(
            currentX, currentY, 
            nearestEnemy.x, nearestEnemy.y, 
            movementRange,
            character,
            charId
        );
        
        if (pathToEnemy && pathToEnemy.path.length > 0) {
            return pathToEnemy;
        }
        return result;
    }
    
    // Get attack range and log detailed info for debugging
    const attackRange = bestAttack.range;
    console.log(`${character.name} selected ${bestAttack.weaponName} (range: ${attackRange}, type: ${bestAttack.type}) against ${nearestEnemy.character.name} at distance ${nearestEnemy.distance}.`);
    
    // Check if enemy is already in range
    if (nearestEnemy.distance <= attackRange) {
        // Enemy is in range
        
        // Only move away if too close (not already at maximum range)
        if (nearestEnemy.distance < attackRange) {
            console.log(`${character.name} is too close (${nearestEnemy.distance} < ${attackRange}), moving away to optimal range.`);
            return moveToOptimalDistance(charData, nearestEnemy, attackRange, movementRange, charId);
        } else {
            console.log(`${character.name} is already at perfect range (${nearestEnemy.distance}/${attackRange}), not moving.`);
            return result; // Already at perfect range
        }
    } else {
        // Enemy is out of range - move toward enemy
        console.log(`${character.name} is out of range (${nearestEnemy.distance} > ${attackRange}), moving toward enemy.`);
        
        // For all attacks, try to stop at exact optimal range
        return moveToOptimalDistance(charData, nearestEnemy, attackRange, movementRange, charId);
    }
}

/**
 * Move to optimal attack distance
 */
function moveToOptimalDistance(charData, enemy, attackRange, movementRange, charId) {
    const currentX = charData.x;
    const currentY = charData.y;
    const character = charData.character;
    
    console.log(`moveToOptimalDistance: current=(${currentX},${currentY}), enemy=(${enemy.x},${enemy.y}), distance=${enemy.distance}, attackRange=${attackRange}`);
    
    // Calculate vector from enemy to character
    const dirX = currentX - enemy.x;
    const dirY = currentY - enemy.y;
    const currentDistance = enemy.distance;
    
    // Calculate distance to move
    let distanceToMove = 0;
    
    // Direction multiplier: 1 for moving away, -1 for moving toward
    let directionMultiplier = 1;
    
    if (currentDistance < attackRange) {
        // Too close - move away by this amount
        distanceToMove = attackRange - currentDistance;
        directionMultiplier = 1; // Moving away
        console.log(`Too close, need to move away by ${distanceToMove} units.`);
    } else if (currentDistance > attackRange) {
        // Too far - move toward by this amount
        distanceToMove = currentDistance - attackRange;
        directionMultiplier = -1; // Moving toward
        console.log(`Too far, need to move toward by ${distanceToMove} units.`);
    }
    
    // Limit by movement range
    distanceToMove = Math.min(distanceToMove, movementRange);
    
    // If no movement needed
    if (distanceToMove === 0) {
        console.log(`No movement needed, already at optimal distance.`);
        return { x: currentX, y: currentY, path: [] };
    }
    
    // Normalize direction vector and apply direction multiplier
    const dirLength = Math.sqrt(dirX * dirX + dirY * dirY);
    
    // Avoid division by zero
    if (dirLength === 0) {
        console.log(`Warning: Direction length is zero, cannot normalize.`);
        return { x: currentX, y: currentY, path: [] };
    }
    
    const normDirX = (dirX / dirLength) * directionMultiplier;
    const normDirY = (dirY / dirLength) * directionMultiplier;
    
    // Calculate target position
    // Avoid rounding to get more precision, round in the bounded check instead
    const targetX = currentX + (normDirX * distanceToMove);
    const targetY = currentY + (normDirY * distanceToMove);
    
    // Make sure target is within grid bounds
    const boundedTargetX = Math.max(0, Math.min(GRID_SIZE - 1, Math.round(targetX)));
    const boundedTargetY = Math.max(0, Math.min(GRID_SIZE - 1, Math.round(targetY)));
    
    console.log(`Target position: (${boundedTargetX},${boundedTargetY}), moved ${distanceToMove} units from current.`);
    
    // Find path to this position
    const pathToTarget = findPathToTarget(
        currentX, currentY,
        boundedTargetX, boundedTargetY,
        movementRange,
        character,
        charId
    );
    
    if (pathToTarget && pathToTarget.path.length > 0) {
        const endPos = pathToTarget.path[pathToTarget.path.length - 1];
        console.log(`Path found! End position: (${endPos.x},${endPos.y}), steps: ${pathToTarget.path.length}`);
        return pathToTarget;
    }
    
    console.log(`No direct path found, trying alternatives...`);
    
    // If no direct path, try alternatives
    const alternativePositions = [];
    
    // Try multiple angles around the enemy to find a good position
    // Use smaller angle steps for more options
    for (let angle = 0; angle < 360; angle += 22.5) {
        const radians = angle * (Math.PI / 180);
        
        // Calculate position around enemy
        let altX, altY;
        
        if (currentDistance < attackRange) {
            // If too close, try positions at exactly attack range
            altX = Math.round(enemy.x + Math.cos(radians) * attackRange);
            altY = Math.round(enemy.y + Math.sin(radians) * attackRange);
        } else {
            // If too far, try multiple distances within the attack range
            // Try from exact range down to 1 less than range
            for (let rangeMod = 0; rangeMod <= 1; rangeMod += 0.5) {
                const tryRange = Math.max(1, attackRange - rangeMod);
                altX = Math.round(enemy.x + Math.cos(radians) * tryRange);
                altY = Math.round(enemy.y + Math.sin(radians) * tryRange);
                
                // Ensure within grid
                if (altX < 0 || altX >= GRID_SIZE || altY < 0 || altY >= GRID_SIZE) {
                    continue;
                }
                
                console.log(`Trying alternative at angle ${angle}, range ${tryRange}: (${altX},${altY})`);
                
                // Find path
                const path = findPathToTarget(
                    currentX, currentY,
                    altX, altY,
                    movementRange,
                    character,
                    charId
                );
                
                if (path && path.path.length > 0) {
                    // Calculate actual ending distance to enemy
                    const endPos = path.path[path.path.length - 1];
                    const endDx = endPos.x - enemy.x;
                    const endDy = endPos.y - enemy.y;
                    const endDistance = Math.sqrt(endDx * endDx + endDy * endDy);
                    
                    // Determine priority based on how the position compares to our goal
                    let priority = 0;
                    
                    if (currentDistance < attackRange) {
                        // When too close, prioritize positions that get us to exactly attack range
                        priority = Math.abs(endDistance - attackRange);
                    } else {
                        // When too far, prioritize ANY position that gets us in range
                        // Positions just within range are best
                        if (endDistance <= attackRange) {
                            priority = -1000 + endDistance; // Negative priority = higher preference
                        } else {
                            // If still out of range, prioritize positions that get us closer
                            priority = endDistance; 
                        }
                    }
                    
                    console.log(`Good alternative found at angle ${angle}, range ${tryRange}: final distance: ${endDistance}, priority: ${priority}, steps: ${path.path.length}`);
                    
                    alternativePositions.push({
                        x: altX,
                        y: altY,
                        path: path.path,
                        distance: endDistance,
                        priority: priority
                    });
                }
            }
        }
    }
    
    // Choose best alternative based on priority
    if (alternativePositions.length > 0) {
        alternativePositions.sort((a, b) => a.priority - b.priority);
        console.log(`Selected best alternative, priority: ${alternativePositions[0].priority}, distance: ${alternativePositions[0].distance}`);
        return alternativePositions[0];
    }
    
    console.log(`No good alternatives, trying direct fallback...`);
    
    // If still no path, try fallback movement
    let fallbackX, fallbackY;
    
    if (currentDistance < attackRange) {
        // If too close, move away from enemy
        fallbackX = Math.round(currentX + (normDirX * movementRange));
        fallbackY = Math.round(currentY + (normDirY * movementRange));
    } else {
        // If too far, move toward enemy but only as far as needed to get in range
        // Calculate distance to get just within range
        const distanceToRange = Math.max(0, currentDistance - attackRange);
        // Cap by movement range
        const moveDistance = Math.min(distanceToRange, movementRange);
        // Move toward enemy (note the negative normDir values)
        fallbackX = Math.round(currentX - (normDirX * moveDistance));
        fallbackY = Math.round(currentY - (normDirY * moveDistance));
    }
    
    // Ensure within grid
    const boundedFallbackX = Math.max(0, Math.min(GRID_SIZE - 1, fallbackX));
    const boundedFallbackY = Math.max(0, Math.min(GRID_SIZE - 1, fallbackY));
    
    // Try direct path
    const fallbackPath = findPathToTarget(
        currentX, currentY,
        boundedFallbackX, boundedFallbackY,
        movementRange,
        character,
        charId
    );
    
    if (fallbackPath && fallbackPath.path.length > 0) {
        console.log(`Using fallback path to (${boundedFallbackX},${boundedFallbackY})`);
        return fallbackPath;
    }
    
    console.log(`All movement options failed, staying at current position.`);
    return { x: currentX, y: currentY, path: [] };
}

/**
 * Handle movement for fleeing strategy
 */
function handleFleeingMovement(charData, charId, movementRange) {
    const currentX = charData.x;
    const currentY = charData.y;
    const character = charData.character;
    
    // Default: don't move
    let result = { x: currentX, y: currentY, path: [] };
    
    // Get all enemy positions
    const characterPositions = getCharacterPositions();
    const enemies = Object.values(characterPositions).filter(pos => 
        pos.teamIndex !== charData.teamIndex && !pos.isDefeated);
    
    if (enemies.length === 0) {
        return result; // No enemies
    }
    
    // Calculate distance to each enemy from current position
    const currentDistances = enemies.map(enemy => {
        const dx = currentX - enemy.x;
        const dy = currentY - enemy.y;
        return Math.sqrt(dx * dx + dy * dy);
    });
    
    // Find minimum distance to any enemy
    const minCurrentDistance = Math.min(...currentDistances);
    
    // Generate possible positions (all reachable positions)
    const possiblePositions = [];
    
    // Check all tiles within movement range
    for (let dx = -movementRange; dx <= movementRange; dx++) {
        for (let dy = -movementRange; dy <= movementRange; dy++) {
            // Skip if out of movement range
            if (Math.abs(dx) + Math.abs(dy) > movementRange) {
                continue;
            }
            
            const testX = currentX + dx;
            const testY = currentY + dy;
            
            // Skip if out of bounds
            if (testX < 0 || testX >= GRID_SIZE || testY < 0 || testY >= GRID_SIZE) {
                continue;
            }
            
            // Skip current position
            if (dx === 0 && dy === 0) {
                continue;
            }
            
            // Check if position is blocked
            let isBlocked = false;
            for (const pos of Object.values(characterPositions)) {
                if (pos.x === testX && pos.y === testY && !pos.isDefeated) {
                    isBlocked = true;
                    break;
                }
            }
            
            if (isBlocked) {
                continue;
            }
            
            // Find actual path to this position
            const path = findPathToTarget(
                currentX, currentY,
                testX, testY,
                movementRange,
                character,
                charId
            );
            
            if (!path || path.path.length === 0) {
                continue; // No valid path
            }
            
            // Calculate distances to all enemies from this position
            const newDistances = enemies.map(enemy => {
                const dx = testX - enemy.x;
                const dy = testY - enemy.y;
                return Math.sqrt(dx * dx + dy * dy);
            });
            
            // Find minimum distance to any enemy
            const minNewDistance = Math.min(...newDistances);
            
            // Add to possible positions
            possiblePositions.push({
                x: testX,
                y: testY,
                path: path.path,
                minDistance: minNewDistance
            });
        }
    }
    
    // Check if any position increases minimum distance
    const betterPositions = possiblePositions.filter(pos => 
        pos.minDistance > minCurrentDistance);
    
    if (betterPositions.length > 0) {
        // Sort by maximum minimum distance (furthest from any enemy)
        betterPositions.sort((a, b) => b.minDistance - a.minDistance);
        return betterPositions[0];
    }
    
    // If no position increases minimum distance, stay put
    return result;
}
