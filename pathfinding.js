/**
 * Path calculation for character movement
 * Modified to respect multi-tile Pokémon
 */

import { findAllReachablePositions, getTerrainPathfindingWeight, getTerrainMovementCost } from './movementRange.js';
import { getTerrainAt, getLavaWeightMultiplier, getMountainMovementCost } from './terrainEffects.js';
import { isTileOccupied, getCharacterPositions } from './characterPositions.js';
import { GRID_SIZE } from './config.js';
import { TERRAIN_TYPES } from './terrainGenerator.js';
import { getOccupiedTiles } from './pokemonDistanceCalculator.js';

// Track global movement history for debugging
const globalMovementHistory = {};

/**
 * Find the shortest/cheapest path to a target using A* pathfinding algorithm
 * with complete multi-tile Pokémon collision avoidance
 * @param {number} startX - Starting x coordinate
 * @param {number} startY - Starting y coordinate
 * @param {number} targetX - Target x coordinate
 * @param {number} targetY - Target y coordinate
 * @param {number} movementRange - Maximum movement range (in movement points)
 * @param {Object} character - The character data for terrain handling and size calculations
 * @param {string} characterId - ID of the character that's moving (for self-collision exclusion)
 * @returns {Object} - Object with target position and path: { x, y, path }
 */
/**
 * Find the shortest/cheapest path to a target using A* pathfinding algorithm
 * with complete multi-tile Pokémon collision avoidance and improved lava handling
 * @param {number} startX - Starting x coordinate
 * @param {number} startY - Starting y coordinate
 * @param {number} targetX - Target x coordinate
 * @param {number} targetY - Target y coordinate
 * @param {number} movementRange - Maximum movement range (in movement points)
 * @param {Object} character - The character data for terrain handling and size calculations
 * @param {string} characterId - ID of the character that's moving (for self-collision exclusion)
 * @returns {Object} - Object with target position and path: { x, y, path }
 */
export function findPathToTarget(startX, startY, targetX, targetY, movementRange, character = null, characterId = null) {
    // If start and target are the same, return empty path
    if (startX === targetX && startY === targetY) {
        return { x: targetX, y: targetY, path: [] };
    }
    
    // Check if target is within grid bounds
    if (targetX < 0 || targetX >= GRID_SIZE || targetY < 0 || targetY >= GRID_SIZE) {
        return null;
    }
    
    // Get character positions for collision checking
    const characterPositions = getCharacterPositions();
    
    // First, generate a path map across the entire grid using Dijkstra's algorithm
    // This will tell us the best direction to move from any position
    const globalDirectionMap = generateGlobalPathMap(targetX, targetY, character, characterId);
    
    // Calculate initial distance from start to target (for progress tracking)
    const startToTargetDistance = heuristic(startX, startY, targetX, targetY);
    console.log(`Initial distance from (${startX},${startY}) to (${targetX},${targetY}): ${startToTargetDistance}`);
    
    // Now perform A* pathfinding using the global direction map for guidance
    const openSet = new Map();
    const closedSet = new Map();
    
    // Helper function to create a node key
    const getNodeKey = (x, y) => `${x},${y}`;
    
    // Add starting node to open set
    const startKey = getNodeKey(startX, startY);
    openSet.set(startKey, {
        x: startX,
        y: startY,
        g: 0, // Cost from start to current node
        h: calculateHeuristic(startX, startY, targetX, targetY, globalDirectionMap), 
        f: calculateHeuristic(startX, startY, targetX, targetY, globalDirectionMap), 
        parent: null,
        movementLeft: movementRange,
        terrainType: getTerrainAt(startX, startY),
        path: [] // Track the full path
    });
    
    // Main A* loop
    while (openSet.size > 0) {
        // Find the node with the lowest f score in the open set
        let currentKey = null;
        let currentNode = null;
        let lowestF = Infinity;
        
        for (const [key, node] of openSet.entries()) {
            if (node.f < lowestF) {
                lowestF = node.f;
                currentKey = key;
                currentNode = node;
            }
        }
        
        // If no node found, path is impossible
        if (!currentNode) {
            break; // We'll handle this case in the fallback logic below
        }
        
        // Remove current node from open set
        openSet.delete(currentKey);
        
        // Add to closed set
        closedSet.set(currentKey, currentNode);
        
        // Check if we've reached the target
        if (currentNode.x === targetX && currentNode.y === targetY) {
            // Reconstruct path
            const path = [...currentNode.path];
            
            // One final check to ensure the entire path is valid for multi-tile Pokémon
            if (validatePathForMultiTilePokemon(path, character, characterId)) {
                return {
                    x: targetX,
                    y: targetY,
                    path: path,
                    totalCost: currentNode.g
                };
            } else {
                // This path isn't valid for the full Pokémon, continue searching
                console.log(`Path to target invalid for multi-tile Pokémon, continuing search...`);
                continue;
            }
        }
        
        // If we've used all movement points, don't explore further
        if (currentNode.movementLeft <= 0) {
            continue;
        }
        
        // Get all valid neighbors (cardinal directions)
        const directions = [
            { x: 0, y: -1 }, // Up
            { x: 1, y: 0 },  // Right
            { x: 0, y: 1 },  // Down
            { x: -1, y: 0 }  // Left
        ];
        
        // Sort directions based on the global path map to prioritize exploration
        if (globalDirectionMap) {
            directions.sort((a, b) => {
                const nextPosA = { x: currentNode.x + a.x, y: currentNode.y + a.y };
                const nextPosB = { x: currentNode.x + b.x, y: currentNode.y + b.y };
                
                // Get direction values from global map (lower is better)
                let valueA = Infinity;
                let valueB = Infinity;
                
                if (isInBounds(nextPosA.x, nextPosA.y)) {
                    valueA = globalDirectionMap[nextPosA.y][nextPosA.x].value;
                }
                
                if (isInBounds(nextPosB.x, nextPosB.y)) {
                    valueB = globalDirectionMap[nextPosB.y][nextPosB.x].value;
                }
                
                return valueA - valueB;
            });
        }
        
        for (const dir of directions) {
            const neighborX = currentNode.x + dir.x;
            const neighborY = currentNode.y + dir.y;
            
            // Check if neighbor is within grid bounds
            if (neighborX < 0 || neighborX >= GRID_SIZE || neighborY < 0 || neighborY >= GRID_SIZE) {
                continue;
            }
            
            // IMPORTANT: Check ALL tiles the Pokémon would occupy at this position
            const pokemonAtNeighbor = {
                x: neighborX,
                y: neighborY,
                character: character
            };
            
            // Get all tiles the Pokémon would occupy
            const occupiedTiles = getOccupiedTiles(pokemonAtNeighbor);
            
            // Check if any tile is invalid
            let isValidPosition = true;
            for (const tile of occupiedTiles) {
                // Check bounds
                if (tile.x < 0 || tile.x >= GRID_SIZE || tile.y < 0 || tile.y >= GRID_SIZE) {
                    isValidPosition = false;
                    break;
                }
                
                // Check if occupied (excluding self)
                if (isTileOccupied(tile.x, tile.y, characterId)) {
                    isValidPosition = false;
                    break;
                }
            }
            
            // Skip this neighbor if any tile is invalid
            if (!isValidPosition) {
                continue;
            }
            
            // Get terrain type at neighbor
            const terrainType = getTerrainAt(neighborX, neighborY);
            
            // Get movement cost for this terrain
            const movementCost = getTerrainMovementCost(terrainType, character);
            
            // Check if we have enough movement points left
            if (movementCost > currentNode.movementLeft) {
                continue;
            }
            
            // Get pathfinding weight (used for A* path preference)
            const terrainWeight = getTerrainPathfindingWeight(terrainType, character);
            
            // Create neighbor key
            const neighborKey = getNodeKey(neighborX, neighborY);
            
            // Skip if in closed set with the same or more movement left
            const closedNode = closedSet.get(neighborKey);
            if (closedNode && closedNode.movementLeft >= currentNode.movementLeft - movementCost) {
                continue;
            }
            
            // Create a new path for this neighbor
            const newPath = [...currentNode.path, {
                x: neighborX,
                y: neighborY,
                terrainType: terrainType
            }];
            
            // Calculate tentative g score (cost from start to neighbor via current)
            // Use a more balanced approach for terrain penalties
            let terrainPenalty;
            if (terrainType === 'lava') {
                // Special handling for lava - still make it expensive but not prohibitive
                terrainPenalty = terrainWeight * 1.5;
            } else {
                // Standard penalty for other terrain types
                terrainPenalty = terrainWeight;
            }
            
            const tentativeG = currentNode.g + terrainPenalty;
            
            // Calculate new movement points left
            const newMovementLeft = currentNode.movementLeft - movementCost;
            
            // Check if neighbor is already in open set
            const existingNeighbor = openSet.get(neighborKey);
            
            // If this path to neighbor is better than any previous one
            if (!existingNeighbor || tentativeG < existingNeighbor.g) {
                // Calculate h score using the global direction map as a guide
                const h = calculateHeuristic(neighborX, neighborY, targetX, targetY, globalDirectionMap);
                
                // Update/create neighbor in open set
                openSet.set(neighborKey, {
                    x: neighborX,
                    y: neighborY,
                    g: tentativeG,
                    h: h,
                    f: tentativeG + h,
                    parent: currentNode,
                    movementLeft: newMovementLeft,
                    terrainType: terrainType,
                    path: newPath
                });
            }
        }
    }
    
    // If we've exhausted all possible paths and didn't reach the target,
    // Find the best partial path using both distance improvement and cost
    let bestPartialPath = null;
    let bestDistanceProgress = -Infinity; // Track how much closer to target we get
    let fallbackPath = null; // A path to use if we can't find one that makes progress
    let minDistance = Infinity; // Track closest node to target
    
    for (const [_, node] of closedSet.entries()) {
        // Skip nodes with empty paths (no movement)
        if (node.path.length === 0) continue;
        
        // IMPORTANT: Validate the path for multi-tile Pokémon
        if (!validatePathForMultiTilePokemon(node.path, character, characterId)) {
            continue;
        }
        
        // Calculate distance to target from this node
        const newDistance = heuristic(node.x, node.y, targetX, targetY);
        
        // Calculate how much closer we get compared to starting position
        const distanceImprovement = startToTargetDistance - newDistance;
        
        // This path gets us closer to the target
        if (distanceImprovement > 0) {
            // Track the best distance improvement
            if (distanceImprovement > bestDistanceProgress) {
                bestDistanceProgress = distanceImprovement;
                bestPartialPath = {
                    x: node.x,
                    y: node.y,
                    path: node.path,
                    totalCost: node.g,
                    isPartial: true,
                    distanceImprovement: distanceImprovement
                };
            }
        }
        
        // Also track closest node to target (fallback option)
        if (newDistance < minDistance) {
            minDistance = newDistance;
            fallbackPath = {
                x: node.x,
                y: node.y,
                path: node.path,
                totalCost: node.g,
                isPartial: true
            };
        }
    }
    
    // If we found a path that gets us closer to the target, use it
    if (bestPartialPath && bestDistanceProgress > 0) {
        console.log(`Found path that improves distance by ${bestDistanceProgress}`);
        return bestPartialPath;
    }
    
    // If no path gets us closer but we have a valid path, use the closest one
    if (fallbackPath) {
        console.log("Using closest path as fallback");
        return fallbackPath;
    }
    
    // Last resort: If we still have no valid path, try direct one-step movement
    // toward the target (cross lava if needed)
    console.log("No good path found, checking one-step options directly toward target");
    
    // Calculate direction toward target
    const dx = targetX - startX;
    const dy = targetY - startY;
    
    // Sort directions based on which gets us closest to target
    const directionsToTarget = [
        { x: Math.sign(dx), y: 0 }, // Horizontal step
        { x: 0, y: Math.sign(dy) }, // Vertical step
        { x: -Math.sign(dx), y: 0 }, // Opposite horizontal (for when direct is blocked)
        { x: 0, y: -Math.sign(dy) }  // Opposite vertical (for when direct is blocked)
    ].filter(dir => dir.x !== 0 || dir.y !== 0); // Filter out zero movement
    
    // Try each direction
    for (const dir of directionsToTarget) {
        const newX = startX + dir.x;
        const newY = startY + dir.y;
        
        // Skip if out of bounds
        if (!isInBounds(newX, newY)) continue;
        
        // Skip if occupied
        if (isTileOccupied(newX, newY, characterId)) continue;
        
        // Check multi-tile validity
        const pokemonAtPosition = {
            x: newX,
            y: newY,
            character: character
        };
        const occupiedTiles = getOccupiedTiles(pokemonAtPosition);
        let validPosition = true;
        
        for (const tile of occupiedTiles) {
            if (!isInBounds(tile.x, tile.y) || isTileOccupied(tile.x, tile.y, characterId)) {
                validPosition = false;
                break;
            }
        }
        
        if (!validPosition) continue;
        
        // Check terrain
        const terrainType = getTerrainAt(newX, newY);
        
        // Get movement cost and check if we can move here
        const moveCost = getTerrainMovementCost(terrainType, character);
        if (moveCost > movementRange) continue;
        
        // This is a valid one-step move, use it
        console.log(`Taking one step to (${newX},${newY}) through ${terrainType}`);
        return {
            x: newX,
            y: newY,
            path: [{
                x: newX,
                y: newY,
                terrainType: terrainType
            }],
            totalCost: getTerrainPathfindingWeight(terrainType, character),
            isPartial: true,
            isEmergency: true
        };
    }
    
    // If we get here, there is absolutely no valid move possible
    console.log("No valid moves possible");
    return null;
}

/**
 * Generate a global path map from target to all other cells on the grid
 * This creates a "flow field" that points toward the target from any position
 * @param {number} targetX - X coordinate of the target
 * @param {number} targetY - Y coordinate of the target
 * @param {Object} character - The character data for terrain handling
 * @param {string} characterId - ID of the character that's moving (for self-collision exclusion)
 * @returns {Array} - 2D array with direction and cost values for each cell
 */
function generateGlobalPathMap(targetX, targetY, character = null, characterId = null) {
    // Create a 2D array to store the cost to reach the target from each position
    const distanceMap = Array(GRID_SIZE).fill().map(() => 
        Array(GRID_SIZE).fill().map(() => ({
            value: Infinity,
            explored: false,
            direction: null // Will point toward the best next position
        }))
    );
    
    // Check if target is valid
    if (!isInBounds(targetX, targetY)) {
        return distanceMap;
    }
    
    // Queue for Dijkstra's algorithm (breadth-first search with costs)
    const queue = [];
    
    // Start from the target position
    distanceMap[targetY][targetX].value = 0;
    queue.push({ x: targetX, y: targetY, cost: 0 });
    
    // Directions for neighbor checking
    const directions = [
        { x: 0, y: -1, name: 'up' },
        { x: 1, y: 0, name: 'right' },
        { x: 0, y: 1, name: 'down' },
        { x: -1, y: 0, name: 'left' }
    ];
    
    // Process all accessible tiles
    while (queue.length > 0) {
        // Sort queue by cost (lowest first)
        queue.sort((a, b) => a.cost - b.cost);
        
        // Get next position to process
        const current = queue.shift();
        
        // Skip if already explored with a better cost
        if (distanceMap[current.y][current.x].explored) {
            continue;
        }
        
        // Mark as explored
        distanceMap[current.y][current.x].explored = true;
        
        // Check all neighbors
        for (const dir of directions) {
            const nx = current.x + dir.x;
            const ny = current.y + dir.y;
            
            // Skip if out of bounds
            if (!isInBounds(nx, ny)) {
                continue;
            }
            
            // Skip if tile is occupied by any character (excluding self)
            if (isTileOccupied(nx, ny, characterId)) {
                continue;
            }
            
            // Get terrain type at this position
            const terrainType = getTerrainAt(nx, ny);
            
            // Get weight for this terrain (how difficult it is to traverse)
            const terrainWeight = getTerrainPathfindingWeight(terrainType, character);
            
            // Calculate cost to reach this neighbor via current position
            // Use linear scaling instead of cubing for a more balanced approach
            const tentativeCost = current.cost + terrainWeight;
            
            // If this path is better than any previous one
            if (tentativeCost < distanceMap[ny][nx].value) {
                // Update cost
                distanceMap[ny][nx].value = tentativeCost;
                
                // Update direction (points back toward target)
                distanceMap[ny][nx].direction = {
                    x: -dir.x, // Invert direction to point toward target
                    y: -dir.y,
                    name: getOppositeDirection(dir.name)
                };
                
                // Add to queue for further exploration
                if (!distanceMap[ny][nx].explored) {
                    queue.push({ x: nx, y: ny, cost: tentativeCost });
                }
            }
        }
    }
    
    return distanceMap;
}

/**
 * Helper function to validate a path for a multi-tile Pokémon
 * @param {Array} path - The path to check
 * @param {Object} character - The character data
 * @param {string} characterId - The character ID for exclusion
 * @returns {boolean} - Whether the path is valid
 */
function validatePathForMultiTilePokemon(path, character, characterId) {
    if (!path || path.length === 0) return true;
    
    // Check each position in the path
    for (const position of path) {
        // Create a temporary position for the moving Pokémon at this step
        const pokemonAtPosition = {
            x: position.x,
            y: position.y,
            character: character
        };
        
        // Get all tiles the Pokémon would occupy at this position
        const occupiedTiles = getOccupiedTiles(pokemonAtPosition);
        
        // Check if any of these tiles are already occupied by another Pokémon
        for (const tile of occupiedTiles) {
            // Skip tiles that are out of bounds
            if (tile.x < 0 || tile.x >= GRID_SIZE || tile.y < 0 || tile.y >= GRID_SIZE) {
                return false; // Path is invalid if it would go out of bounds
            }
            
            // Check if this tile is occupied by any other Pokémon
            if (isTileOccupied(tile.x, tile.y, characterId)) {
                return false; // Path is invalid
            }
        }
    }
    
    return true; // All positions in the path are valid
}

/**
 * Check if coordinates are within grid bounds
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @returns {boolean} - True if in bounds
 */
function isInBounds(x, y) {
    return x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE;
}

/**
 * Traditional heuristic function for A* (Manhattan distance)
 * @param {number} x1 - Starting x coordinate
 * @param {number} y1 - Starting y coordinate
 * @param {number} x2 - Target x coordinate
 * @param {number} y2 - Target y coordinate
 * @returns {number} - Estimated cost to reach target
 */
function heuristic(x1, y1, x2, y2) {
    // Manhattan distance (no diagonals)
    return Math.abs(x2 - x1) + Math.abs(y2 - y1);
}

/**
 * Enhanced heuristic that uses the global path map to estimate true path cost
 * @param {number} x - Current x coordinate
 * @param {number} y - Current y coordinate
 * @param {number} targetX - Target x coordinate
 * @param {number} targetY - Target y coordinate
 * @param {Array} globalMap - The global path map
 * @returns {number} - Estimated cost to reach target
 */
function calculateHeuristic(x, y, targetX, targetY, globalMap) {
    // Basic manhattan distance
    const baseCost = heuristic(x, y, targetX, targetY);
    
    // If we have a global map, use its value as a better estimate
    if (globalMap && isInBounds(x, y) && globalMap[y][x]) {
        // Get the value from the global map (smaller is better)
        const globalValue = globalMap[y][x].value;
        
        // If the global value is infinity, it means this position can't reach the target
        // In that case, apply a large penalty
        if (globalValue === Infinity) {
            return baseCost * 100; // Large penalty for unreachable positions
        }
        
        // Use the global map value as the primary heuristic
        // This accounts for obstacles that require going around
        return globalValue;
    }
    
    // Fallback to basic manhattan distance if no global map is available
    return baseCost;
}

/**
 * Get the opposite direction name
 * @param {string} direction - Direction name
 * @returns {string} - Opposite direction name
 */
function getOppositeDirection(direction) {
    switch (direction) {
        case 'up': return 'down';
        case 'right': return 'left';
        case 'down': return 'up';
        case 'left': return 'right';
        default: return null;
    }
}

/**
 * Debug function to visualize a path (for testing purposes)
 * @param {Array} path - Path array
 * @param {number} startX - Start X position
 * @param {number} startY - Start Y position  
 * @param {number} targetX - Target X position
 * @param {number} targetY - Target Y position
 * @param {Array} globalMap - Optional global direction map to show
 */
function debugPath(path, startX, startY, targetX, targetY, globalMap = null) {
    // Create a grid representation
    const grid = [];
    for (let y = 0; y < GRID_SIZE; y++) {
        grid[y] = [];
        for (let x = 0; x < GRID_SIZE; x++) {
            const terrain = getTerrainAt(x, y);
            
            if (x === startX && y === startY) {
                grid[y][x] = 'S'; // Start
            } else if (x === targetX && y === targetY) {
                grid[y][x] = 'T'; // Target
            } else if (terrain === TERRAIN_TYPES.LAVA) {
                grid[y][x] = 'L'; // Lava
            } else if (terrain === TERRAIN_TYPES.WATER) {
                grid[y][x] = 'W'; // Water
            } else if (terrain === TERRAIN_TYPES.MOUNTAIN) {
                grid[y][x] = 'M'; // Mountain
            } else {
                grid[y][x] = '.'; // Empty space
            }
            
            // Show direction arrows if global map is provided
            if (globalMap && x !== targetX && y !== targetY) {
                const dirInfo = globalMap[y][x];
                if (dirInfo && dirInfo.direction) {
                    const dir = dirInfo.direction;
                    if (dir.name === 'up') grid[y][x] = '↑';
                    else if (dir.name === 'right') grid[y][x] = '→';
                    else if (dir.name === 'down') grid[y][x] = '↓';
                    else if (dir.name === 'left') grid[y][x] = '←';
                }
            }
        }
    }
    
    // Mark path on grid
    if (path) {
        path.forEach((pos, index) => {
            grid[pos.y][pos.x] = String(index % 10); // Use numbers for path (modulo 10 to keep single digit)
        });
    }
    
    // Print grid to console
    console.log('Path visualization:');
    grid.forEach(row => {
        console.log(row.join(' '));
    });
    
    // Print path terrain types
    if (path) {
        console.log('Path terrain types:');
        path.forEach((pos, i) => {
            console.log(`Step ${i}: ${pos.x},${pos.y} - ${pos.terrainType}`);
        });
    }
}

/**
 * Calculate the best position to move away from all enemies
 */
export async function findBestFleePosition(character, teamIndex, currentX, currentY, movementRange, characterId = null) {
    // Import dynamically to avoid circular dependencies
    const characterPositions = getCharacterPositions();
    
    // Get all possible positions within movement range
    const possiblePositions = findAllReachablePositions(currentX, currentY, movementRange, character, characterId);
    
    if (possiblePositions.length === 0) return null;
    
    let bestPosition = null;
    let maxTotalDistance = -1;
    
    // For each possible position, calculate total distance to all enemies
    possiblePositions.forEach(pos => {
        let totalDistance = 0;
        let enemyCount = 0;
        
        // Calculate distance to each enemy
        for (const charId in characterPositions) {
            const enemyPos = characterPositions[charId];
            
            // Skip if same team or enemy is defeated
            if (enemyPos.teamIndex === teamIndex || enemyPos.isDefeated) continue;
            
            // Add Manhattan distance to this enemy
            totalDistance += Math.abs(pos.x - enemyPos.x) + Math.abs(pos.y - enemyPos.y);
            enemyCount++;
        }
        
        // If there are enemies, calculate average distance
        if (enemyCount > 0) {
            const avgDistance = totalDistance / enemyCount;
            
            // Update if this position is better
            if (avgDistance > maxTotalDistance) {
                maxTotalDistance = avgDistance;
                bestPosition = pos;
            }
        }
    });
    
    // If no good position found (no enemies?), just return current position
    if (!bestPosition) {
        return { x: currentX, y: currentY, path: [] };
    }
    
    return bestPosition;
}

/**
 * Calculate movement cost through water based on character attributes and BW
 * @param {Object} character - Character data
 * @returns {number} - Movement points required
 */
export function calculateWaterMovementCost(character) {
    // Flying Pokemon move through water at normal speed
    if (character && character.terrainAttributes && character.terrainAttributes.fliegend) {
        return 1;
    }
    
    // Swimming Pokemon move through water at normal speed
    if (character && character.terrainAttributes && character.terrainAttributes.schwimmend) {
        return 1;
    }
    
    // Non-flying, non-swimming Pokemon move at half their max BW (rounded up)
    const maxBW = character && character.combatStats && character.combatStats.bw ? 
        parseInt(character.combatStats.bw, 10) : 
        1;
    
    return Math.ceil(maxBW / 2);
}

export function getModifiedTerrainWeight(terrainType, character) {
    // Get the base weight for this terrain type
    const baseWeight = getTerrainPathfindingWeight(terrainType);
    
    // If character has "Fliegend" attribute, all terrain is equally weighted
    if (character && character.terrainAttributes && character.terrainAttributes.fliegend) {
        return 1; // All terrain is equally weighted for flying Pokemon
    }
    
    // If character has "Schwimmend" attribute and terrain is water, it's preferable
    if (terrainType === TERRAIN_TYPES.WATER && 
        character && character.terrainAttributes && character.terrainAttributes.schwimmend) {
        return 1; // Water is normal terrain for swimming Pokemon
    }
    
    if (terrainType === TERRAIN_TYPES.MOUNTAIN) {
        return getMountainMovementCost(character);
    }
    
    // Special case for lava based on Pokemon types
    if (terrainType === TERRAIN_TYPES.LAVA) {
        const typeMultiplier = getLavaWeightMultiplier(character);
        return baseWeight * typeMultiplier;
    }
    
    // Return the base weight for all other cases
    return baseWeight;
}