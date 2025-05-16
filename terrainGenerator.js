/**
 * Terrain generation system for the battlefield
 */

import { GRID_SIZE } from './config.js';

// Terrain types
export const TERRAIN_TYPES = {
    GRASS: 'grass',
    WATER: 'water',
    MOUNTAIN: 'mountain',
    SAND: 'sand',
    LAVA: 'lava',
    SWAMP: 'swamp',
    SNOW: 'snow'
};

// Store the terrain data
let terrainGrid = [];

/**
 * Initialize the terrain grid with default terrain (grass)
 */
function initializeTerrainGrid() {
    terrainGrid = [];
    for (let y = 0; y < GRID_SIZE; y++) {
        terrainGrid[y] = [];
        for (let x = 0; x < GRID_SIZE; x++) {
            terrainGrid[y][x] = TERRAIN_TYPES.GRASS;
        }
    }
}

/**
 * Set the terrain grid
 * @param {Array} grid - The new terrain grid
 */
export function setTerrainGrid(grid) {
    terrainGrid = grid;
}

/**
 * Get the terrain grid
 * @returns {Array} - 2D array of terrain types
 */
export function getTerrainGrid() {
    return terrainGrid;
}

/**
 * Generate a lake in the terrain
 * @param {number} minSize - Minimum size of the lake in tiles
 * @param {number} maxSize - Maximum size of the lake in tiles
 * @returns {Array} - Array of lake tile coordinates for river generation
 */
function generateLake(minSize = 100, maxSize = 200) {
    // Choose a random size within the bounds
    const targetSize = Math.floor(Math.random() * (maxSize - minSize + 1)) + minSize;
    
    // Place the lake in the center of the arena
    const centerX = Math.floor(GRID_SIZE / 2);
    const centerY = Math.floor(GRID_SIZE / 2);
    
    // Create the lake using a simple expansion algorithm
    const waterTiles = new Set();
    const frontier = [{ x: centerX, y: centerY }];
    
    // Mark the center as water
    terrainGrid[centerY][centerX] = TERRAIN_TYPES.WATER;
    waterTiles.add(`${centerX},${centerY}`);
    
    // Expand the lake until it reaches the target size
    while (waterTiles.size < targetSize && frontier.length > 0) {
        // Get a random tile from the frontier
        const randomIndex = Math.floor(Math.random() * frontier.length);
        const currentTile = frontier[randomIndex];
        frontier.splice(randomIndex, 1);
        
        // Get all valid neighbors
        const neighbors = [
            { x: currentTile.x + 1, y: currentTile.y },
            { x: currentTile.x - 1, y: currentTile.y },
            { x: currentTile.x, y: currentTile.y + 1 },
            { x: currentTile.x, y: currentTile.y - 1 }
        ].filter(tile => 
            tile.x >= 0 && tile.x < GRID_SIZE && 
            tile.y >= 0 && tile.y < GRID_SIZE &&
            !waterTiles.has(`${tile.x},${tile.y}`)
        );
        
        // Add each valid neighbor to the lake with a decreasing probability as we get further from the center
        for (const neighbor of neighbors) {
            // Skip if we've reached the target size
            if (waterTiles.size >= targetSize) break;
            
            // Calculate distance from center
            const distX = neighbor.x - centerX;
            const distY = neighbor.y - centerY;
            const distance = Math.sqrt(distX * distX + distY * distY);
            
            // Higher probability for tiles closer to the center
            const probability = 1 - (distance / (GRID_SIZE / 2));
            
            if (Math.random() < probability) {
                terrainGrid[neighbor.y][neighbor.x] = TERRAIN_TYPES.WATER;
                waterTiles.add(`${neighbor.x},${neighbor.y}`);
                frontier.push(neighbor);
            }
        }
    }
    
    // Return the set of water tiles (for river generation)
    return Array.from(waterTiles).map(coords => {
        const [x, y] = coords.split(',').map(Number);
        return { x, y };
    });
}

/**
 * Generate rivers that connect the lake to the edge of the map
 * @param {Array} lakeTiles - Array of lake tiles
 * @param {number} minRivers - Minimum number of rivers
 * @param {number} maxRivers - Maximum number of rivers
 * @param {Array} teamAreas - Team starting areas to avoid
 */
function generateRivers(lakeTiles, minRivers = 5, maxRivers = 15, teamAreas = []) {
    // Determine how many rivers to create
    const numRivers = Math.floor(Math.random() * (maxRivers - minRivers + 1)) + minRivers;
    
    for (let i = 0; i < numRivers; i++) {
        // Choose a random lake tile as the starting point
        const startTile = lakeTiles[Math.floor(Math.random() * lakeTiles.length)];
        
        // Determine which edge to target based on starting position
        // but avoid team starting areas
        let possibleEdges = ['left', 'right', 'top', 'bottom'];
        
        // Filter edges that would flow towards team areas
        possibleEdges = possibleEdges.filter(edge => {
            let flowsToTeamArea = false;
            
            // Check if flowing in this direction would hit a team area
            for (const area of teamAreas) {
                switch (edge) {
                    case 'left':
                        // If team area is on the left side of the map and lake is to the right of it
                        if (area.x < startTile.x && area.x < GRID_SIZE/2) {
                            flowsToTeamArea = true;
                        }
                        break;
                    case 'right':
                        // If team area is on the right side of the map and lake is to the left of it
                        if (area.x > startTile.x && area.x > GRID_SIZE/2) {
                            flowsToTeamArea = true;
                        }
                        break;
                    case 'top':
                        // If team area is on the top of the map and lake is below it
                        if (area.y < startTile.y && area.y < GRID_SIZE/2) {
                            flowsToTeamArea = true;
                        }
                        break;
                    case 'bottom':
                        // If team area is on the bottom of the map and lake is above it
                        if (area.y > startTile.y && area.y > GRID_SIZE/2) {
                            flowsToTeamArea = true;
                        }
                        break;
                }
            }
            
            return !flowsToTeamArea;
        });
        
        // If no valid directions, skip this river
        if (possibleEdges.length === 0) {
            continue;
        }
        
        // Choose a random direction from the valid ones
        const targetEdge = possibleEdges[Math.floor(Math.random() * possibleEdges.length)];
        
        // Create a meandering path to the edge
        let currentX = startTile.x;
        let currentY = startTile.y;
        
        // Keep creating the river until we reach the edge
        while (currentX > 0 && currentX < GRID_SIZE - 1 && 
               currentY > 0 && currentY < GRID_SIZE - 1) {
            
            // Determine the main direction to flow
            let mainDirX = 0;
            let mainDirY = 0;
            
            switch (targetEdge) {
                case 'left':
                    mainDirX = -1;
                    break;
                case 'right':
                    mainDirX = 1;
                    break;
                case 'top':
                    mainDirY = -1;
                    break;
                case 'bottom':
                    mainDirY = 1;
                    break;
            }
            
            // Add some randomness to make the river meander
            // 80% chance to flow in the main direction, 20% to meander (more pronounced)
            if (Math.random() < 0.8) {
                currentX += mainDirX;
                currentY += mainDirY;
            } else {
                // Meander perpendicular to the main flow direction
                if (mainDirX !== 0) {
                    // Flowing horizontally, meander vertically
                    currentY += Math.random() < 0.5 ? 1 : -1;
                } else {
                    // Flowing vertically, meander horizontally
                    currentX += Math.random() < 0.5 ? 1 : -1;
                }
            }
            
            // Ensure we stay within bounds
            currentX = Math.max(0, Math.min(GRID_SIZE - 1, currentX));
            currentY = Math.max(0, Math.min(GRID_SIZE - 1, currentY));
            
            // Skip if this would enter a team area
            let inTeamArea = false;
            for (const area of teamAreas) {
                if (currentX >= area.x && currentX < area.x + area.width &&
                    currentY >= area.y && currentY < area.y + area.height) {
                    inTeamArea = true;
                    break;
                }
            }
            
            if (inTeamArea) {
                break; // Stop the river if it would enter a team area
            }
            
            // Mark the tile as water
            terrainGrid[currentY][currentX] = TERRAIN_TYPES.WATER;
            
            // Make rivers more pronounced by adding adjacent water tiles
            // 50% chance to add an adjacent water tile
            if (Math.random() < 0.5) {
                const offsetX = mainDirY !== 0 ? (Math.random() < 0.5 ? 1 : -1) : 0;
                const offsetY = mainDirX !== 0 ? (Math.random() < 0.5 ? 1 : -1) : 0;
                
                const adjacentX = currentX + offsetX;
                const adjacentY = currentY + offsetY;
                
                // Ensure adjacent tile is within bounds
                if (adjacentX >= 0 && adjacentX < GRID_SIZE && 
                    adjacentY >= 0 && adjacentY < GRID_SIZE) {
                    
                    // Check not in team area
                    let adjacentInTeamArea = false;
                    for (const area of teamAreas) {
                        if (adjacentX >= area.x && adjacentX < area.x + area.width &&
                            adjacentY >= area.y && adjacentY < area.y + area.height) {
                            adjacentInTeamArea = true;
                            break;
                        }
                    }
                    
                    if (!adjacentInTeamArea) {
                        terrainGrid[adjacentY][adjacentX] = TERRAIN_TYPES.WATER;
                    }
                }
            }
        }
    }
}

/**
 * Check if a position is inside any team area
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {Array} teamAreas - Array of team areas
 * @returns {boolean} - True if position is in a team area
 */
function isInTeamArea(x, y, teamAreas) {
    for (const area of teamAreas) {
        if (x >= area.x && x < area.x + area.width &&
            y >= area.y && y < area.y + area.height) {
            return true;
        }
    }
    return false;
}

/**
 * Create a mountain at the specified position
 * @param {number} centerX - Center X position
 * @param {number} centerY - Center Y position
 * @param {number} radius - Radius of the mountain
 * @param {Array} teamAreas - Team areas to avoid
 */
function createMountain(centerX, centerY, radius, teamAreas) {
    // Use noise for more natural mountain shape
    for (let offsetY = -radius; offsetY <= radius; offsetY++) {
        for (let offsetX = -radius; offsetX <= radius; offsetX++) {
            // Calculate distance from center (circular mountain shape)
            const distance = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
            
            if (distance <= radius) {
                // Use probability to create natural-looking edge
                const probability = 1 - (distance / radius);
                
                // Higher probability closer to center
                if (Math.random() < probability * 1.2) {
                    const tileX = centerX + offsetX;
                    const tileY = centerY + offsetY;
                    
                    // Check bounds and avoid team areas
                    if (tileX >= 0 && tileX < GRID_SIZE && 
                        tileY >= 0 && tileY < GRID_SIZE &&
                        !isInTeamArea(tileX, tileY, teamAreas) &&
                        terrainGrid[tileY] && terrainGrid[tileY][tileX] !== undefined) {  // Add this check
                        
                        // Only place mountain on grass
                        if (terrainGrid[tileY][tileX] === TERRAIN_TYPES.GRASS) {
                            terrainGrid[tileY][tileX] = TERRAIN_TYPES.MOUNTAIN;
                        }
                    }
                }
            }
        }
    }
}

/**
 * Create a mountain range across the battlefield
 * @param {Array} teamAreas - Team areas to avoid
 */
function createMountainRange(teamAreas) {
    // Decide orientation of the range (horizontal, vertical, or diagonal)
    const orientation = Math.floor(Math.random() * 3); // 0 = horizontal, 1 = vertical, 2 = diagonal
    
    // Number of mountains in the range
    const mountainCount = 15 + Math.floor(Math.random() * 16); // 15-30 mountains
    
    // Starting position for the range
    let startX, startY, endX, endY;
    
    // Set start and end points based on orientation
    switch (orientation) {
        case 0: // Horizontal range
            startX = Math.floor(GRID_SIZE * 0.1);
            endX = Math.floor(GRID_SIZE * 0.9);
            startY = Math.floor(GRID_SIZE * 0.3 + Math.random() * (GRID_SIZE * 0.4));
            endY = startY; // Same Y for horizontal
            break;
        case 1: // Vertical range
            startX = Math.floor(GRID_SIZE * 0.3 + Math.random() * (GRID_SIZE * 0.4));
            endX = startX; // Same X for vertical
            startY = Math.floor(GRID_SIZE * 0.1);
            endY = Math.floor(GRID_SIZE * 0.9);
            break;
        case 2: // Diagonal range
            startX = Math.floor(GRID_SIZE * 0.1);
            startY = Math.floor(GRID_SIZE * 0.1);
            endX = Math.floor(GRID_SIZE * 0.9);
            endY = Math.floor(GRID_SIZE * 0.9);
            // Randomly flip direction for variety
            if (Math.random() < 0.5) {
                [startY, endY] = [endY, startY];
            }
            break;
    }
    
    // Calculate position increment for each mountain
    const totalDistance = Math.max(
        Math.abs(endX - startX),
        Math.abs(endY - startY)
    );
    
    // Variance for the "shake" in the mountain range
    const maxShake = Math.floor(GRID_SIZE * 0.1); // 10% of grid size
    
    // Create mountains along the range
    for (let i = 0; i < mountainCount; i++) {
        // Calculate base position along the line
        const progress = i / (mountainCount - 1);
        const baseX = Math.round(startX + (endX - startX) * progress);
        const baseY = Math.round(startY + (endY - startY) * progress);
        
        // Add randomness to create a natural-looking, shaky mountain range
        const shakeX = Math.floor(Math.random() * (maxShake * 2 + 1)) - maxShake;
        const shakeY = Math.floor(Math.random() * (maxShake * 2 + 1)) - maxShake;
        
        const mountainX = Math.max(0, Math.min(GRID_SIZE - 1, baseX + shakeX));
        const mountainY = Math.max(0, Math.min(GRID_SIZE - 1, baseY + shakeY));
        
        // Create mountain with varying size
        const radius = 3 + Math.floor(Math.random() * 4); // 3-6 radius
        createMountain(mountainX, mountainY, radius, teamAreas);
    }
}

/**
 * Create scattered individual mountains
 * @param {number} count - Number of mountains to create
 * @param {Array} teamAreas - Team areas to avoid
 */
function createScatteredMountains(count, teamAreas) {
    for (let i = 0; i < count; i++) {
        // Random position away from edges
        const x = Math.floor(GRID_SIZE * 0.1 + Math.random() * (GRID_SIZE * 0.8));
        const y = Math.floor(GRID_SIZE * 0.1 + Math.random() * (GRID_SIZE * 0.8));
        
        // Skip if in team area
        if (isInTeamArea(x, y, teamAreas)) {
            continue;
        }
        
        // Create mountain with varying size
        const radius = 2 + Math.floor(Math.random() * 3); // 2-4 radius (smaller than range mountains)
        createMountain(x, y, radius, teamAreas);
    }
}

/**
 * Ensure team starting areas are grass
 * @param {Array} teamAreas - Array of team starting areas
 */
function ensureTeamAreasAreGrass(teamAreas) {
    teamAreas.forEach(area => {
        for (let y = area.y; y < area.y + area.height; y++) {
            for (let x = area.x; x < area.x + area.width; x++) {
                // Ensure coordinates are within the grid bounds
                if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
                    terrainGrid[y][x] = TERRAIN_TYPES.GRASS;
                }
            }
        }
    });
}

/**
 * Create paths between team areas
 * @param {Array} teamAreas - Team areas
 */
function createPathsBetweenTeamAreas(teamAreas) {
    if (!teamAreas || teamAreas.length <= 1) return;
    
    // Get the center points of each team area
    const teamCenters = teamAreas.map(area => ({
        x: Math.floor(area.x + area.width / 2),
        y: Math.floor(area.y + area.height / 2)
    }));
    
    // For each pair of team centers, create a path
    for (let i = 0; i < teamCenters.length - 1; i++) {
        for (let j = i + 1; j < teamCenters.length; j++) {
            createPath(teamCenters[i], teamCenters[j]);
        }
    }
}

/**
 * Create a path between two points, clearing mountains
 * @param {Object} start - Start point {x, y}
 * @param {Object} end - End point {x, y}
 */
function createPath(start, end) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const distance = Math.max(Math.abs(dx), Math.abs(dy));
    
    const stepX = dx === 0 ? 0 : dx / Math.abs(dx);
    const stepY = dy === 0 ? 0 : dy / Math.abs(dy);
    
    // Create a narrow path (width=1)
    for (let i = 0; i <= distance; i++) {
        const x = Math.round(start.x + stepX * i);
        const y = Math.round(start.y + stepY * i);
        
        // Clear mountains in a small radius
        for (let offsetY = -1; offsetY <= 1; offsetY++) {
            for (let offsetX = -1; offsetX <= 1; offsetX++) {
                const pathX = x + offsetX;
                const pathY = y + offsetY;
                
                // Check bounds
                if (pathX >= 0 && pathX < GRID_SIZE && pathY >= 0 && pathY < GRID_SIZE) {
                    // Only change mountains to grass (leave water and other terrain)
                    if (terrainGrid[pathY][pathX] === TERRAIN_TYPES.MOUNTAIN) {
                        terrainGrid[pathY][pathX] = TERRAIN_TYPES.GRASS;
                    }
                }
            }
        }
    }
}

/**
 * Generate random terrain for the battlefield
 * @param {string} scenario - The selected terrain scenario
 * @param {Array} teamAreas - Array of team starting areas
 * @returns {Array} - The generated terrain grid
 */
export function generateTerrain(scenario, teamAreas = []) {
    console.log(`Generating terrain with scenario: ${scenario}`);
    
    // Initialize the grid with grass
    initializeTerrainGrid();
    
    // Generate terrain based on scenario
    switch(scenario.toLowerCase()) {
        case 'ebene':
            generateEbeneTerrain();
            break;
        case 'see':
            generateSeeTerrain(teamAreas);
            break;
        case 'wueste':
            generateWusteTerrain(teamAreas);
            break;
        case 'meer':
            generateMeerTerrain(teamAreas);
            break;
        case 'vulkan':
            generateVulkanTerrain(teamAreas);
            break;
        case 'zufallsmix':
            generateZufallsmixTerrain(teamAreas);
            break;
        case 'gebirge':
            generateGebirgeTerrain(teamAreas);
            break;
        case 'sumpf':
            generateSumpfTerrain(teamAreas);
            break;
        case 'eiswueste': 
            generateEiswuesteTerrain(teamAreas);
            break;
        default:
            // Default to ebene
            generateEbeneTerrain();
    }
    
    // Ensure team areas are appropriate for the scenario
    ensureTeamAreasCorrectTerrain(teamAreas, scenario);
    
    return terrainGrid;
}

/**
 * Generate Ebene (Plain) terrain - everything is grass
 */
function generateEbeneTerrain() {
    // Already initialized with grass, so nothing to do
    console.log("Generated Ebene terrain");
}

/**
 * Generate See (Lake) terrain - central lake with rivers
 * @param {Array} teamAreas - Team starting areas to avoid
 */
function generateSeeTerrain(teamAreas) {
    // Create a large central lake
    const lakeTiles = generateLake(300, 500); // Much larger lake
    
    // Generate 1-10 rivers from the lake to the edges
    const numRivers = 1 + Math.floor(Math.random() * 10);
    generateRivers(lakeTiles, numRivers, numRivers, teamAreas);
    
    console.log(`Generated See terrain with ${numRivers} rivers`);
}

/**
 * Generate Wüste (Desert) terrain - sand with small oases
 * @param {Array} teamAreas - Team starting areas
 */
function generateWusteTerrain(teamAreas) {
    // Fill the entire grid with sand
    for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
            terrainGrid[y][x] = TERRAIN_TYPES.SAND;
        }
    }
    
    // Create 1-8 small oases (water patches surrounded by grass)
    const numOases = 1 + Math.floor(Math.random() * 2);
    
    for (let i = 0; i < numOases; i++) {
        // Random position away from edges
        const centerX = Math.floor(GRID_SIZE * 0.1 + Math.random() * (GRID_SIZE * 0.8));
        const centerY = Math.floor(GRID_SIZE * 0.1 + Math.random() * (GRID_SIZE * 0.8));
        
        // Random size for the oasis
        const waterRadius = 2 + Math.floor(Math.random() * 5); // 2-6 tiles water radius
        const grassRadius = waterRadius + 2 + Math.floor(Math.random() * 3); // 4-11 tiles grass radius
        
        // Create the oasis
        for (let offsetY = -grassRadius; offsetY <= grassRadius; offsetY++) {
            for (let offsetX = -grassRadius; offsetX <= grassRadius; offsetX++) {
                const distance = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
                const tileX = centerX + offsetX;
                const tileY = centerY + offsetY;
                
                // Check bounds
                if (tileX >= 0 && tileX < GRID_SIZE && tileY >= 0 && tileY < GRID_SIZE) {
                    if (distance <= waterRadius) {
                        // Inner part is water
                        terrainGrid[tileY][tileX] = TERRAIN_TYPES.WATER;
                    } else if (distance <= grassRadius) {
                        // Outer ring is grass
                        terrainGrid[tileY][tileX] = TERRAIN_TYPES.GRASS;
                    }
                }
            }
        }
    }
    
    console.log(`Generated Wüste terrain with ${numOases} oases`);
}

/**
 * Generate Meer (Sea) terrain - mostly water with island starting areas
 * @param {Array} teamAreas - Team starting areas
 */
function generateMeerTerrain(teamAreas) {
    // Fill the entire grid with water
    for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
            terrainGrid[y][x] = TERRAIN_TYPES.WATER;
        }
    }
    
    // Create islands around each team area
    teamAreas.forEach((area, index) => {
        // Determine the island size (larger than the team area)
        const islandRadius = Math.max(area.width, area.height) + 5 + Math.floor(Math.random() * 10);
        
        // Determine island center
        const centerX = area.x + Math.floor(area.width / 2);
        const centerY = area.y + Math.floor(area.height / 2);
        
        // Create the island with frayed edges using noise
        for (let offsetY = -islandRadius; offsetY <= islandRadius; offsetY++) {
            for (let offsetX = -islandRadius; offsetX <= islandRadius; offsetX++) {
                const distance = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
                const tileX = centerX + offsetX;
                const tileY = centerY + offsetY;
                
                // Check bounds
                if (tileX >= 0 && tileX < GRID_SIZE && tileY >= 0 && tileY < GRID_SIZE) {
                    // Use noise to create natural coast
                    if (distance <= islandRadius) {
                        // Frayed edge effect - more likely to be land closer to center
                        const probability = 1.2 - (distance / islandRadius);
                        
                        if (Math.random() < probability) {
                            // 70% grass, 30% sand for variety
                            terrainGrid[tileY][tileX] = Math.random() < 0.7 ? 
                                TERRAIN_TYPES.GRASS : TERRAIN_TYPES.SAND;
                        }
                    }
                }
            }
        }
    });
    
    // Add some small additional islands
    const numExtraIslands = 1 + Math.floor(Math.random() * 5);
    
    for (let i = 0; i < numExtraIslands; i++) {
        const centerX = Math.floor(GRID_SIZE * 0.1 + Math.random() * (GRID_SIZE * 0.8));
        const centerY = Math.floor(GRID_SIZE * 0.1 + Math.random() * (GRID_SIZE * 0.8));
        
        // Check if too close to team areas
        let tooClose = false;
        for (const area of teamAreas) {
            const areaCenter = {
                x: area.x + Math.floor(area.width / 2),
                y: area.y + Math.floor(area.height / 2)
            };
            
            const distance = Math.sqrt(
                Math.pow(centerX - areaCenter.x, 2) + 
                Math.pow(centerY - areaCenter.y, 2)
            );
            
            if (distance < GRID_SIZE * 0.2) { // Keep islands away from team areas
                tooClose = true;
                break;
            }
        }
        
        if (!tooClose) {
            // Create small island
            const radius = 3 + Math.floor(Math.random() * 5);
            
            for (let offsetY = -radius; offsetY <= radius; offsetY++) {
                for (let offsetX = -radius; offsetX <= radius; offsetX++) {
                    const distance = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
                    const tileX = centerX + offsetX;
                    const tileY = centerY + offsetY;
                    
                    if (tileX >= 0 && tileX < GRID_SIZE && tileY >= 0 && tileY < GRID_SIZE) {
                        if (distance <= radius) {
                            const probability = 1.1 - (distance / radius);
                            
                            if (Math.random() < probability) {
                                terrainGrid[tileY][tileX] = Math.random() < 0.6 ? 
                                    TERRAIN_TYPES.SAND : TERRAIN_TYPES.GRASS;
                            }
                        }
                    }
                }
            }
        }
    }
    
    console.log(`Generated Meer terrain with ${numExtraIslands} extra islands`);
}

/**
 * Generate Vulkan (Volcano) terrain - central mountain with lava
 * @param {Array} teamAreas - Team starting areas
 */
function generateVulkanTerrain(teamAreas) {
    // Center of the map
    const centerX = Math.floor(GRID_SIZE / 2);
    const centerY = Math.floor(GRID_SIZE / 2);
    
    // Create the mountain
    const mountainRadius = Math.floor(GRID_SIZE * 0.4); // 40% of grid size
    const lavaPoolRadius = Math.floor(mountainRadius * 0.3); // 30% of mountain size
    
    // Create mountain first
    for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
            const distance = Math.sqrt(
                Math.pow(x - centerX, 2) + 
                Math.pow(y - centerY, 2)
            );
            
            if (distance <= mountainRadius) {
                // Mountain area
                terrainGrid[y][x] = TERRAIN_TYPES.MOUNTAIN;
            }
        }
    }
    
    // Create lava pool in the center
    for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
            const distance = Math.sqrt(
                Math.pow(x - centerX, 2) + 
                Math.pow(y - centerY, 2)
            );
            
            if (distance <= lavaPoolRadius) {
                terrainGrid[y][x] = TERRAIN_TYPES.LAVA;
            }
        }
    }
    
    // Create lava rivers flowing outward
    const numLavaRivers = 4 + Math.floor(Math.random() * 4); // 4-7 lava rivers
    
    for (let i = 0; i < numLavaRivers; i++) {
        // Random angle for this river
        const angle = (i * 2 * Math.PI / numLavaRivers) + (Math.random() * 0.5 - 0.25);
        
        // Start at the edge of lava pool
        let currentX = centerX + Math.cos(angle) * lavaPoolRadius;
        let currentY = centerY + Math.sin(angle) * lavaPoolRadius;
        
        // Continue until reaching mountain edge
        while (true) {
            // Move outward
            currentX += Math.cos(angle) * (0.8 + Math.random() * 0.4);
            currentY += Math.sin(angle) * (0.8 + Math.random() * 0.4);
            
            // Round to get grid position
            const x = Math.round(currentX);
            const y = Math.round(currentY);
            
            // Stop if out of bounds or outside mountain
            if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) {
                break;
            }
            
            const distance = Math.sqrt(
                Math.pow(x - centerX, 2) + 
                Math.pow(y - centerY, 2)
            );
            
            if (distance > mountainRadius) {
                break;
            }
            
            // Create lava river (skip if already lava)
            if (terrainGrid[y][x] !== TERRAIN_TYPES.LAVA) {
                terrainGrid[y][x] = TERRAIN_TYPES.LAVA;
                
                // Add some width to the river (randomly)
                if (Math.random() < 0.4) {
                    const offsetX = Math.random() < 0.5 ? 1 : -1;
                    const offsetY = Math.random() < 0.5 ? 1 : -1;
                    
                    // Only add if within bounds and on mountain
                    if (x + offsetX >= 0 && x + offsetX < GRID_SIZE && 
                        y + offsetY >= 0 && y + offsetY < GRID_SIZE) {
                        if (terrainGrid[y + offsetY][x + offsetX] === TERRAIN_TYPES.MOUNTAIN) {
                            terrainGrid[y + offsetY][x + offsetX] = TERRAIN_TYPES.LAVA;
                        }
                    }
                }
            }
        }
    }
    
    console.log(`Generated Vulkan terrain with ${numLavaRivers} lava rivers`);
}

/**
 * Generate Gebirge (Mountain) terrain - mountain ranges
 * @param {Array} teamAreas - Team starting areas
 */
function generateGebirgeTerrain(teamAreas) {
    // Create a small lake
    const lakeTiles = generateLake(30, 60);
    
    // Add a few rivers
    generateRivers(lakeTiles, 2, 4, teamAreas);
    
    // Create main mountain range
    createMountainRange(teamAreas);
    
    // Add scattered individual mountains
    createScatteredMountains(10, teamAreas);
    
    // Ensure team areas are clear
    ensureTeamAreasAreGrass(teamAreas);
    
    // Create paths between team areas
    createPathsBetweenTeamAreas(teamAreas);
    
    console.log("Generated Gebirge terrain");
}

/**
 * Generate Zufallsmix (Random Mix) terrain - mix of all terrain types
 * @param {Array} teamAreas - Team starting areas
 */
function generateZufallsmixTerrain(teamAreas) {
    // Randomly choose which features to include
    const includeWater = Math.random() < 0.7;
    const includeMountains = Math.random() < 0.7;
    const includeSand = Math.random() < 0.6;
    const includeLava = Math.random() < 0.4;
    const includeSnow = Math.random() < 0.5;
    const includeSwamp = Math.random() < 0.5;
    
    console.log(`Zufallsmix features: Water: ${includeWater}, Mountains: ${includeMountains}, 
                 Sand: ${includeSand}, Lava: ${includeLava}, Snow: ${includeSnow}, Swamp: ${includeSwamp}`);
    
    // Add features in layers
    
    // First layer: Add water features if included
    if (includeWater) {
        // Random lake size
        const lakeSize = Math.random() < 0.5 ? 
            { min: 30, max: 100 } : { min: 100, max: 300 };
            
        const lakeTiles = generateLake(lakeSize.min, lakeSize.max);
        
        // Random river count
        const riverCount = 1 + Math.floor(Math.random() * 8);
        generateRivers(lakeTiles, riverCount, riverCount, teamAreas);
    }
    
    // Second layer: Add mountain features if included
    if (includeMountains) {
        if (Math.random() < 0.5) {
            // Mountain range
            createMountainRange(teamAreas);
        } else {
            // Scattered mountains
            const mountainCount = 5 + Math.floor(Math.random() * 15);
            createScatteredMountains(mountainCount, teamAreas);
        }
    }
    
    // Third layer: Add sand patches if included
    if (includeSand) {
        const numSandPatches = 2 + Math.floor(Math.random() * 6);
        
        for (let i = 0; i < numSandPatches; i++) {
            const centerX = Math.floor(GRID_SIZE * 0.1 + Math.random() * (GRID_SIZE * 0.8));
            const centerY = Math.floor(GRID_SIZE * 0.1 + Math.random() * (GRID_SIZE * 0.8));
            const radius = 5 + Math.floor(Math.random() * 15);
            
            for (let offsetY = -radius; offsetY <= radius; offsetY++) {
                for (let offsetX = -radius; offsetX <= radius; offsetX++) {
                    const distance = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
                    const tileX = centerX + offsetX;
                    const tileY = centerY + offsetY;
                    
                    if (tileX >= 0 && tileX < GRID_SIZE && 
                        tileY >= 0 && tileY < GRID_SIZE && 
                        !isInTeamArea(tileX, tileY, teamAreas)) {
                        
                        if (distance <= radius) {
                            const probability = 1 - (distance / radius);
                            
                            if (Math.random() < probability) {
                                // Don't overwrite water and mountains with sand
                                if (terrainGrid[tileY][tileX] !== TERRAIN_TYPES.WATER && 
                                    terrainGrid[tileY][tileX] !== TERRAIN_TYPES.MOUNTAIN) {
                                    terrainGrid[tileY][tileX] = TERRAIN_TYPES.SAND;
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    
    // Fourth layer: Add snow patches if included
    if (includeSnow) {
        const numSnowPatches = 2 + Math.floor(Math.random() * 6);
        
        for (let i = 0; i < numSnowPatches; i++) {
            const centerX = Math.floor(GRID_SIZE * 0.1 + Math.random() * (GRID_SIZE * 0.8));
            const centerY = Math.floor(GRID_SIZE * 0.1 + Math.random() * (GRID_SIZE * 0.8));
            const radius = 5 + Math.floor(Math.random() * 15);
            
            for (let offsetY = -radius; offsetY <= radius; offsetY++) {
                for (let offsetX = -radius; offsetX <= radius; offsetX++) {
                    const distance = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
                    const tileX = centerX + offsetX;
                    const tileY = centerY + offsetY;
                    
                    if (tileX >= 0 && tileX < GRID_SIZE && 
                        tileY >= 0 && tileY < GRID_SIZE && 
                        !isInTeamArea(tileX, tileY, teamAreas)) {
                        
                        if (distance <= radius) {
                            const probability = 1 - (distance / radius);
                            
                            if (Math.random() < probability) {
                                // Don't overwrite water and mountains with snow
                                if (terrainGrid[tileY][tileX] !== TERRAIN_TYPES.WATER && 
                                    terrainGrid[tileY][tileX] !== TERRAIN_TYPES.MOUNTAIN) {
                                    terrainGrid[tileY][tileX] = TERRAIN_TYPES.SNOW;
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    
    // Fifth layer: Add swamp patches if included
    if (includeSwamp) {
        const numSwampPatches = 2 + Math.floor(Math.random() * 6);
        
        for (let i = 0; i < numSwampPatches; i++) {
            const centerX = Math.floor(GRID_SIZE * 0.1 + Math.random() * (GRID_SIZE * 0.8));
            const centerY = Math.floor(GRID_SIZE * 0.1 + Math.random() * (GRID_SIZE * 0.8));
            const radius = 5 + Math.floor(Math.random() * 12);
            
            for (let offsetY = -radius; offsetY <= radius; offsetY++) {
                for (let offsetX = -radius; offsetX <= radius; offsetX++) {
                    const distance = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
                    const tileX = centerX + offsetX;
                    const tileY = centerY + offsetY;
                    
                    if (tileX >= 0 && tileX < GRID_SIZE && 
                        tileY >= 0 && tileY < GRID_SIZE && 
                        !isInTeamArea(tileX, tileY, teamAreas)) {
                        
                        if (distance <= radius) {
                            const probability = 1 - (distance / radius);
                            
                            if (Math.random() < probability) {
                                // Don't overwrite water and mountains with swamp
                                if (terrainGrid[tileY][tileX] !== TERRAIN_TYPES.WATER && 
                                    terrainGrid[tileY][tileX] !== TERRAIN_TYPES.MOUNTAIN) {
                                    terrainGrid[tileY][tileX] = TERRAIN_TYPES.SWAMP;
                                }
                            }
                        }
                    }
                }
            }
            
            // Add small water patches within swamp areas (ponds)
            if (Math.random() < 0.7) {
                const waterRadius = Math.floor(radius * 0.4);
                for (let offsetY = -waterRadius; offsetY <= waterRadius; offsetY++) {
                    for (let offsetX = -waterRadius; offsetX <= waterRadius; offsetX++) {
                        const distance = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
                        const tileX = centerX + offsetX;
                        const tileY = centerY + offsetY;
                        
                        if (tileX >= 0 && tileX < GRID_SIZE && 
                            tileY >= 0 && tileY < GRID_SIZE && 
                            !isInTeamArea(tileX, tileY, teamAreas)) {
                            
                            if (distance <= waterRadius) {
                                const probability = 1 - (distance / waterRadius);
                                
                                if (Math.random() < probability) {
                                    terrainGrid[tileY][tileX] = TERRAIN_TYPES.WATER;
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    
    // Sixth layer: Add lava features if included
    if (includeLava) {
        const numLavaPatches = 1 + Math.floor(Math.random() * 3);
        
        for (let i = 0; i < numLavaPatches; i++) {
            const centerX = Math.floor(GRID_SIZE * 0.2 + Math.random() * (GRID_SIZE * 0.6));
            const centerY = Math.floor(GRID_SIZE * 0.2 + Math.random() * (GRID_SIZE * 0.6));
            const radius = 3 + Math.floor(Math.random() * 6);
            
            // Create lava pool
            for (let offsetY = -radius; offsetY <= radius; offsetY++) {
                for (let offsetX = -radius; offsetX <= radius; offsetX++) {
                    const distance = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
                    const tileX = centerX + offsetX;
                    const tileY = centerY + offsetY;
                    
                    if (tileX >= 0 && tileX < GRID_SIZE && 
                        tileY >= 0 && tileY < GRID_SIZE && 
                        !isInTeamArea(tileX, tileY, teamAreas)) {
                        
                        if (distance <= radius) {
                            const probability = 1.2 - (distance / radius);
                            
                            if (Math.random() < probability) {
                                // Override any terrain with lava
                                terrainGrid[tileY][tileX] = TERRAIN_TYPES.LAVA;
                            }
                        }
                    }
                }
            }
            
            // Add some lava streams
            if (Math.random() < 0.7) {
                const numStreams = 1 + Math.floor(Math.random() * 3);
                
                for (let j = 0; j < numStreams; j++) {
                    // Random angle
                    const angle = Math.random() * 2 * Math.PI;
                    
                    // Start at the edge of lava pool
                    let currentX = centerX + Math.cos(angle) * radius;
                    let currentY = centerY + Math.sin(angle) * radius;
                    
                    // Stream length
                    const streamLength = 5 + Math.floor(Math.random() * 15);
                    
                    for (let k = 0; k < streamLength; k++) {
                        // Move in direction with some variation
                        const angleVariation = angle + (Math.random() * 0.6 - 0.3);
                        currentX += Math.cos(angleVariation);
                        currentY += Math.sin(angleVariation);
                        
                        const x = Math.round(currentX);
                        const y = Math.round(currentY);
                        
                        // Check bounds and team areas
                        if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE ||
                            isInTeamArea(x, y, teamAreas)) {
                            break;
                        }
                        
                        terrainGrid[y][x] = TERRAIN_TYPES.LAVA;
                    }
                }
            }
        }
    }
    
    // Final touches: Create transitions between terrain types
    createTerrainTransitions();
    
    // Ensure team areas are appropriate
    ensureTeamAreasAreGrass(teamAreas);
    
    console.log("Generated Zufallsmix terrain");
}

/**
 * Create smooth transitions between different terrain types
 * for a more natural-looking landscape
 */
function createTerrainTransitions() {
    // Make a copy of the current terrain grid
    const tempGrid = [];
    for (let y = 0; y < GRID_SIZE; y++) {
        tempGrid[y] = [...terrainGrid[y]];
    }
    
    // Create transitions at the borders between terrain types
    for (let y = 1; y < GRID_SIZE - 1; y++) {
        for (let x = 1; x < GRID_SIZE - 1; x++) {
            const currentTerrain = tempGrid[y][x];
            
            // Skip water and lava as they don't need transitions
            if (currentTerrain === TERRAIN_TYPES.WATER || 
                currentTerrain === TERRAIN_TYPES.LAVA) {
                continue;
            }
            
            // Count different adjacent terrain types
            const adjacentTerrains = {};
            
            // Check all adjacent tiles
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    if (dx === 0 && dy === 0) continue; // Skip self
                    
                    const nx = x + dx;
                    const ny = y + dy;
                    
                    // Skip out of bounds
                    if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE) continue;
                    
                    const neighborTerrain = tempGrid[ny][nx];
                    if (!adjacentTerrains[neighborTerrain]) {
                        adjacentTerrains[neighborTerrain] = 0;
                    }
                    adjacentTerrains[neighborTerrain]++;
                }
            }
            
            // If surrounded by mostly a different terrain type (more than 5 neighbors),
            // create a transition by changing to that terrain with a 40% chance
            for (const [terrain, count] of Object.entries(adjacentTerrains)) {
                if (terrain !== currentTerrain && count >= 5 && Math.random() < 0.4) {
                    terrainGrid[y][x] = terrain;
                    break;
                }
            }
        }
    }
}

/**
 * Ensure team areas have the correct terrain based on scenario
 * @param {Array} teamAreas - Team starting areas
 * @param {string} scenario - The terrain scenario
 */
function ensureTeamAreasCorrectTerrain(teamAreas, scenario) {
    teamAreas.forEach(area => {
        // Determine target terrain type based on scenario
        let targetTerrain;
        
        switch(scenario.toLowerCase()) {
            case 'wüste':
            case 'wuste':
                targetTerrain = TERRAIN_TYPES.SAND;
                break;
            case 'eiswueste':
                targetTerrain = TERRAIN_TYPES.SNOW;
                break;
            default:
                targetTerrain = TERRAIN_TYPES.GRASS;
        }
            
        for (let y = area.y; y < area.y + area.height; y++) {
            for (let x = area.x; x < area.x + area.width; x++) {
                // Ensure coordinates are within the grid bounds
                if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
                    // For Meer, leave as is (mix of grass/sand)
                    if (scenario.toLowerCase() !== 'meer') {
                        terrainGrid[y][x] = targetTerrain;
                    }
                }
            }
        }
    });
}

/**
 * Generate Sumpf (Swamp) terrain - mostly swamp with patches of grass and water
 * @param {Array} teamAreas - Team starting areas
 */
function generateSumpfTerrain(teamAreas) {
    // Fill the entire grid with swamp initially
    for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
            terrainGrid[y][x] = TERRAIN_TYPES.SWAMP;
        }
    }
    
    // Add some grass and water patches (30% of the terrain)
    const numPatches = Math.floor(GRID_SIZE * GRID_SIZE * 0.3 / 100); // Each patch ~100 tiles
    
    for (let i = 0; i < numPatches; i++) {
        // Random position away from edges
        const centerX = Math.floor(GRID_SIZE * 0.1 + Math.random() * (GRID_SIZE * 0.8));
        const centerY = Math.floor(GRID_SIZE * 0.1 + Math.random() * (GRID_SIZE * 0.8));
        
        // Random size for the patch
        const radius = 5 + Math.floor(Math.random() * 10); // 5-14 radius
        
        // Randomly choose between grass and water
        const terrainType = Math.random() < 0.7 ? TERRAIN_TYPES.GRASS : TERRAIN_TYPES.WATER;
        
        // Create the patch
        for (let offsetY = -radius; offsetY <= radius; offsetY++) {
            for (let offsetX = -radius; offsetX <= radius; offsetX++) {
                const distance = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
                const tileX = centerX + offsetX;
                const tileY = centerY + offsetY;
                
                // Check bounds
                if (tileX >= 0 && tileX < GRID_SIZE && tileY >= 0 && tileY < GRID_SIZE) {
                    if (distance <= radius) {
                        // Higher probability for tiles closer to center
                        const probability = 1.2 - (distance / radius);
                        
                        if (Math.random() < probability) {
                            terrainGrid[tileY][tileX] = terrainType;
                        }
                    }
                }
            }
        }
    }
    
    // Ensure team areas are grass
    ensureTeamAreasAreGrass(teamAreas);
    
    console.log("Generated Sumpf terrain");
}

/**
 * Generate Eiswüste (Ice Desert) terrain - mostly snow with some water
 * @param {Array} teamAreas - Team starting areas
 */
function generateEiswuesteTerrain(teamAreas) {
    // Fill the entire grid with snow
    for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
            terrainGrid[y][x] = TERRAIN_TYPES.SNOW;
        }
    }
    
    // Add some water patches (10-15% of the terrain)
    const numPatches = Math.floor(GRID_SIZE * GRID_SIZE * 0.125 / 100); // Each patch ~100 tiles
    
    for (let i = 0; i < numPatches; i++) {
        // Random position away from edges
        const centerX = Math.floor(GRID_SIZE * 0.1 + Math.random() * (GRID_SIZE * 0.8));
        const centerY = Math.floor(GRID_SIZE * 0.1 + Math.random() * (GRID_SIZE * 0.8));
        
        // Random size for the patch
        const radius = 3 + Math.floor(Math.random() * 8); // 3-10 radius
        
        // Create the water patch
        for (let offsetY = -radius; offsetY <= radius; offsetY++) {
            for (let offsetX = -radius; offsetX <= radius; offsetX++) {
                const distance = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
                const tileX = centerX + offsetX;
                const tileY = centerY + offsetY;
                
                // Check bounds
                if (tileX >= 0 && tileX < GRID_SIZE && tileY >= 0 && tileY < GRID_SIZE) {
                    if (distance <= radius) {
                        // Higher probability for tiles closer to center
                        const probability = 1.2 - (distance / radius);
                        
                        if (Math.random() < probability) {
                            // Make sure this isn't in a team area
                            if (!isInTeamArea(tileX, tileY, teamAreas)) {
                                terrainGrid[tileY][tileX] = TERRAIN_TYPES.WATER;
                            }
                        }
                    }
                }
            }
        }
    }
    
    // Add some small mountain patches for variety (very few)
    const numMountainPatches = 1 + Math.floor(Math.random() * 3); // 1-3 small mountain patches
    
    for (let i = 0; i < numMountainPatches; i++) {
        const centerX = Math.floor(GRID_SIZE * 0.2 + Math.random() * (GRID_SIZE * 0.6));
        const centerY = Math.floor(GRID_SIZE * 0.2 + Math.random() * (GRID_SIZE * 0.6));
        
        // Small radius for mountains
        const radius = 2 + Math.floor(Math.random() * 3); // 2-4 radius
        
        // Create the mountain patch
        for (let offsetY = -radius; offsetY <= radius; offsetY++) {
            for (let offsetX = -radius; offsetX <= radius; offsetX++) {
                const distance = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
                const tileX = centerX + offsetX;
                const tileY = centerY + offsetY;
                
                // Check bounds
                if (tileX >= 0 && tileX < GRID_SIZE && tileY >= 0 && tileY < GRID_SIZE) {
                    if (distance <= radius) {
                        // Higher probability for tiles closer to center
                        const probability = 1.1 - (distance / radius);
                        
                        if (Math.random() < probability) {
                            // Make sure this isn't in a team area
                            if (!isInTeamArea(tileX, tileY, teamAreas)) {
                                terrainGrid[tileY][tileX] = TERRAIN_TYPES.MOUNTAIN;
                            }
                        }
                    }
                }
            }
        }
    }
    
    // Create paths between team areas
    createPathsBetweenTeamAreas(teamAreas);
    
    // Ensure team areas are appropriate for the scenario
    // For Eiswüste, team areas should be snow
    ensureTeamAreasCorrectTerrain(teamAreas, "eiswueste");
    
    console.log("Generated Eiswüste terrain");
}