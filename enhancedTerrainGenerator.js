import { TERRAIN_TYPES } from './terrainGenerator.js';
import { getBattlefieldConfig } from './battlefieldConfig.js';

/**
 * Generate ebene (plain) terrain - just grass everywhere
 * @param {number} gridSize - Size of the grid
 * @param {Array} teamAreas - Team areas to avoid
 * @returns {Array} - 2D array of terrain
 */
export function generateEbeneTerrain(gridSize, teamAreas) {
    const terrainGrid = [];
    
    // Fill the entire grid with grass
    for (let y = 0; y < gridSize; y++) {
        terrainGrid[y] = [];
        for (let x = 0; x < gridSize; x++) {
            terrainGrid[y][x] = TERRAIN_TYPES.GRASS;
        }
    }
    
    return terrainGrid;
}

/**
 * Generate see (lake) terrain - central lake with rivers
 * @param {number} gridSize - Size of the grid
 * @param {Array} teamAreas - Team areas to avoid
 * @returns {Array} - 2D array of terrain
 */
export function generateSeeTerrain(gridSize, teamAreas) {
    // Initialize with grass
    const terrainGrid = generateEbeneTerrain(gridSize, teamAreas);
    
    // Calculate lake size based on grid size (20% of the total area)
    const lakeSize = Math.floor((gridSize * gridSize) * 0.2);
    
    // Place the lake in the center
    const centerX = Math.floor(gridSize / 2);
    const centerY = Math.floor(gridSize / 2);
    
    // Create the lake using a simple expansion algorithm
    const waterTiles = new Set();
    const frontier = [{ x: centerX, y: centerY }];
    
    // Mark the center as water
    terrainGrid[centerY][centerX] = TERRAIN_TYPES.WATER;
    waterTiles.add(`${centerX},${centerY}`);
    
    // Expand the lake until it reaches the target size
    while (waterTiles.size < lakeSize && frontier.length > 0) {
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
            tile.x >= 0 && tile.x < gridSize && 
            tile.y >= 0 && tile.y < gridSize &&
            !waterTiles.has(`${tile.x},${tile.y}`)
        );
        
        // Add each valid neighbor to the lake with a decreasing probability as we get further from the center
        for (const neighbor of neighbors) {
            // Skip if we've reached the target size
            if (waterTiles.size >= lakeSize) break;
            
            // Calculate distance from center
            const distX = neighbor.x - centerX;
            const distY = neighbor.y - centerY;
            const distance = Math.sqrt(distX * distX + distY * distY);
            
            // Higher probability for tiles closer to the center
            const probability = 1 - (distance / (gridSize / 2));
            
            if (Math.random() < probability) {
                terrainGrid[neighbor.y][neighbor.x] = TERRAIN_TYPES.WATER;
                waterTiles.add(`${neighbor.x},${neighbor.y}`);
                frontier.push(neighbor);
            }
        }
    }
    
    // Generate 2-8 rivers from the lake
    const numRivers = 2 + Math.floor(Math.random() * 7); // 2-8 rivers
    
    // Convert the set of water tiles to an array
    const lakeTiles = Array.from(waterTiles).map(coords => {
        const [x, y] = coords.split(',').map(Number);
        return { x, y };
    });
    
    // Generate rivers that connect the lake to the edge of the map
    for (let i = 0; i < numRivers; i++) {
        // Choose a random lake tile as the starting point
        const startTile = lakeTiles[Math.floor(Math.random() * lakeTiles.length)];
        
        // Choose a random direction
        const directions = ['left', 'right', 'top', 'bottom'];
        const targetEdge = directions[Math.floor(Math.random() * directions.length)];
        
        // Create a meandering path to the edge
        let currentX = startTile.x;
        let currentY = startTile.y;
        
        // Keep creating the river until we reach the edge
        while (currentX > 0 && currentX < gridSize - 1 && 
               currentY > 0 && currentY < gridSize - 1) {
            
            // Determine the main direction to flow
            let mainDirX = 0;
            let mainDirY = 0;
            
            switch (targetEdge) {
                case 'left': mainDirX = -1; break;
                case 'right': mainDirX = 1; break;
                case 'top': mainDirY = -1; break;
                case 'bottom': mainDirY = 1; break;
            }
            
            // Add some randomness to make the river meander
            // 70% chance to flow in the main direction, 30% to meander
            if (Math.random() < 0.7) {
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
            currentX = Math.max(0, Math.min(gridSize - 1, currentX));
            currentY = Math.max(0, Math.min(gridSize - 1, currentY));
            
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
        }
    }
    
    // Ensure team areas are grass
    for (const area of teamAreas) {
        for (let y = area.y; y < area.y + area.height; y++) {
            for (let x = area.x; x < area.x + area.width; x++) {
                if (x >= 0 && x < gridSize && y >= 0 && y < gridSize) {
                    terrainGrid[y][x] = TERRAIN_TYPES.GRASS;
                }
            }
        }
    }
    
    return terrainGrid;
}

/**
 * Generate gebirge (mountain) terrain
 * @param {number} gridSize - Size of the grid
 * @param {Array} teamAreas - Team areas to avoid
 * @returns {Array} - 2D array of terrain
 */
export function generateGebirgeTerrain(gridSize, teamAreas) {
    // Initialize with grass
    const terrainGrid = generateEbeneTerrain(gridSize, teamAreas);
    
    // Determine number of mountain areas based on grid size
    const minMountains = Math.max(3, Math.floor(gridSize / 10));
    const maxMountains = Math.max(8, Math.floor(gridSize / 5));
    
    const numMountainAreas = minMountains + Math.floor(Math.random() * (maxMountains - minMountains + 1));
    
    // Create multiple mountain regions
    for (let i = 0; i < numMountainAreas; i++) {
        // Determine size of this mountain area (larger for bigger maps)
        const minSize = Math.max(10, Math.floor(gridSize * 0.05));
        const maxSize = Math.max(50, Math.floor(gridSize * 0.15));
        const targetSize = minSize + Math.floor(Math.random() * (maxSize - minSize + 1));
        
        // Choose a random center point (avoid edges)
        const margin = Math.floor(gridSize * 0.1);
        const centerX = margin + Math.floor(Math.random() * (gridSize - 2 * margin));
        const centerY = margin + Math.floor(Math.random() * (gridSize - 2 * margin));
        
        // Check if this would overlap with a team area
        let overlapsTeamArea = false;
        for (const area of teamAreas) {
            const distance = Math.sqrt(
                Math.pow(centerX - (area.x + area.width/2), 2) +
                Math.pow(centerY - (area.y + area.height/2), 2)
            );
            
            // If too close to a team area, skip this mountain
            if (distance < targetSize) {
                overlapsTeamArea = true;
                break;
            }
        }
        
        if (overlapsTeamArea) {
            continue; // Skip this mountain and try another one
        }
        
        // Create the mountain using expansion algorithm
        const mountainTiles = new Set();
        const frontier = [{ x: centerX, y: centerY }];
        
        // Mark the center as mountain
        terrainGrid[centerY][centerX] = TERRAIN_TYPES.MOUNTAIN;
        mountainTiles.add(`${centerX},${centerY}`);
        
        // Expand the mountain until it reaches the target size
        while (mountainTiles.size < targetSize && frontier.length > 0) {
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
                tile.x >= 0 && tile.x < gridSize && 
                tile.y >= 0 && tile.y < gridSize &&
                !mountainTiles.has(`${tile.x},${tile.y}`)
            );
            
            // Add each valid neighbor with decreasing probability
            for (const neighbor of neighbors) {
                // Skip if we've reached the target size
                if (mountainTiles.size >= targetSize) break;
                
                // Calculate distance from center
                const distX = neighbor.x - centerX;
                const distY = neighbor.y - centerY;
                const distance = Math.sqrt(distX * distX + distY * distY);
                
                // Higher probability for tiles closer to the center
                const probability = 1 - (distance / (targetSize / 2));
                
                if (Math.random() < probability) {
                    // Check if this would enter a team area
                    let inTeamArea = false;
                    for (const area of teamAreas) {
                        if (neighbor.x >= area.x && neighbor.x < area.x + area.width &&
                            neighbor.y >= area.y && neighbor.y < area.y + area.height) {
                            inTeamArea = true;
                            break;
                        }
                    }
                    
                    if (!inTeamArea) {
                        terrainGrid[neighbor.y][neighbor.x] = TERRAIN_TYPES.MOUNTAIN;
                        mountainTiles.add(`${neighbor.x},${neighbor.y}`);
                        frontier.push(neighbor);
                    }
                }
            }
        }
    }
    
    return terrainGrid;
}

/**
 * Generate wueste (desert) terrain
 * @param {number} gridSize - Size of the grid
 * @param {Array} teamAreas - Team areas to avoid
 * @returns {Array} - 2D array of terrain
 */
export function generateWuesteTerrain(gridSize, teamAreas) {
    const terrainGrid = [];
    
    // Fill the entire grid with sand
    for (let y = 0; y < gridSize; y++) {
        terrainGrid[y] = [];
        for (let x = 0; x < gridSize; x++) {
            terrainGrid[y][x] = TERRAIN_TYPES.SAND;
        }
    }
    
    // Generate 1-5 oases
    const numOases = 1 + Math.floor(Math.random() * 5);
    
    for (let i = 0; i < numOases; i++) {
        // Random size for each oasis
        const oasisSize = 5 + Math.floor(Math.random() * 15);
        
        // Random position (avoiding edges)
        const margin = Math.floor(gridSize * 0.1);
        const centerX = margin + Math.floor(Math.random() * (gridSize - 2 * margin));
        const centerY = margin + Math.floor(Math.random() * (gridSize - 2 * margin));
        
        // Create the oasis
        const oasisTiles = new Set();
        const frontier = [{ x: centerX, y: centerY }];
        
        // Mark the center as water (oasis center)
        terrainGrid[centerY][centerX] = TERRAIN_TYPES.WATER;
        oasisTiles.add(`${centerX},${centerY}`);
        
        // Expand the oasis
        while (oasisTiles.size < oasisSize && frontier.length > 0) {
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
                tile.x >= 0 && tile.x < gridSize && 
                tile.y >= 0 && tile.y < gridSize &&
                !oasisTiles.has(`${tile.x},${tile.y}`)
            );
            
            // Add each valid neighbor to the oasis
            for (const neighbor of neighbors) {
                // Skip if we've reached the target size
                if (oasisTiles.size >= oasisSize) break;
                
                // Calculate distance from center
                const distX = neighbor.x - centerX;
                const distY = neighbor.y - centerY;
                const distance = Math.sqrt(distX * distX + distY * distY);
                
                // Higher probability for tiles closer to the center
                const probability = 1 - (distance / (oasisSize / 2));
                
                if (Math.random() < probability) {
                    // Water in the center, surrounded by grass
                    if (distance < 2) {
                        terrainGrid[neighbor.y][neighbor.x] = TERRAIN_TYPES.WATER;
                    } else {
                        terrainGrid[neighbor.y][neighbor.x] = TERRAIN_TYPES.GRASS;
                    }
                    
                    oasisTiles.add(`${neighbor.x},${neighbor.y}`);
                    frontier.push(neighbor);
                }
            }
        }
    }
    
    // Ensure team areas are grass (easier to move)
    for (const area of teamAreas) {
        for (let y = area.y; y < area.y + area.height; y++) {
            for (let x = area.x; x < area.x + area.width; x++) {
                if (x >= 0 && x < gridSize && y >= 0 && y < gridSize) {
                    terrainGrid[y][x] = TERRAIN_TYPES.GRASS;
                }
            }
        }
    }
    
    return terrainGrid;
}

/**
 * Generate meer (sea) terrain
 * @param {number} gridSize - Size of the grid
 * @param {Array} teamAreas - Team areas to avoid
 * @returns {Array} - 2D array of terrain
 */
export function generateMeerTerrain(gridSize, teamAreas) {
    const terrainGrid = [];
    
    // Fill the entire grid with water
    for (let y = 0; y < gridSize; y++) {
        terrainGrid[y] = [];
        for (let x = 0; x < gridSize; x++) {
            terrainGrid[y][x] = TERRAIN_TYPES.WATER;
        }
    }
    
    // Create small islands around team areas
    for (const area of teamAreas) {
        // Calculate the center of the team area
        const centerX = area.x + Math.floor(area.width / 2);
        const centerY = area.y + Math.floor(area.height / 2);
        
        // Island size (make it somewhat larger than team area)
        const islandRadius = Math.max(area.width, area.height) + 2;
        
        // Create the island with a more natural coastline
        for (let y = Math.max(0, centerY - islandRadius * 2); y <= Math.min(gridSize - 1, centerY + islandRadius * 2); y++) {
            for (let x = Math.max(0, centerX - islandRadius * 2); x <= Math.min(gridSize - 1, centerX + islandRadius * 2); x++) {
                // Calculate distance from center (squared for efficiency)
                const dx = x - centerX;
                const dy = y - centerY;
                const distSquared = dx * dx + dy * dy;
                
                // Add some randomness to the coastline
                const randomFactor = 0.8 + (Math.random() * 0.4); // 0.8 to 1.2
                const effectiveRadiusSquared = (islandRadius * randomFactor) * (islandRadius * randomFactor);
                
                // Determine tile type based on distance from center
                if (x >= area.x && x < area.x + area.width && y >= area.y && y < area.y + area.height) {
                    // Inside team area is always grass
                    terrainGrid[y][x] = TERRAIN_TYPES.GRASS;
                }
                else if (distSquared <= effectiveRadiusSquared) {
                    // Calculate normalized distance (0 at center, 1 at edge)
                    const normalizedDist = Math.sqrt(distSquared) / (islandRadius * randomFactor);
                    
                    if (normalizedDist > 0.8) {
                        // Outer ring is sand (beach)
                        terrainGrid[y][x] = TERRAIN_TYPES.SAND;
                    } 
                    else if (normalizedDist > 0.6) {
                        // Transition zone is mix of sand and grass
                        terrainGrid[y][x] = Math.random() < 0.7 ? TERRAIN_TYPES.GRASS : TERRAIN_TYPES.SAND;
                    }
                    else {
                        // Interior is grass with occasional sand patches
                        terrainGrid[y][x] = Math.random() < 0.1 ? TERRAIN_TYPES.SAND : TERRAIN_TYPES.GRASS;
                    }
                }
            }
        }
        
        // Add some additional randomness to the coastline
        for (let i = 0; i < 10; i++) {
            // Create random peninsula or inlet
            const angle = Math.random() * 2 * Math.PI;
            const distanceFromCenter = islandRadius * (0.8 + Math.random() * 0.4);
            const featureX = Math.floor(centerX + Math.cos(angle) * distanceFromCenter);
            const featureY = Math.floor(centerY + Math.sin(angle) * distanceFromCenter);
            
            // Skip if outside grid
            if (featureX < 0 || featureX >= gridSize || featureY < 0 || featureY >= gridSize) {
                continue;
            }
            
            // Create feature (small blob of land or water)
            const featureRadius = 2 + Math.floor(Math.random() * 3);
            const isInlet = Math.random() < 0.4; // 40% chance to be inlet (water)
            
            for (let y = Math.max(0, featureY - featureRadius); y <= Math.min(gridSize - 1, featureY + featureRadius); y++) {
                for (let x = Math.max(0, featureX - featureRadius); x <= Math.min(gridSize - 1, featureX + featureRadius); x++) {
                    const dx = x - featureX;
                    const dy = y - featureY;
                    const distSquared = dx * dx + dy * dy;
                    
                    if (distSquared <= featureRadius * featureRadius) {
                        // Skip team areas
                        let inTeamArea = false;
                        for (const a of teamAreas) {
                            if (x >= a.x && x < a.x + a.width && y >= a.y && y < a.y + a.height) {
                                inTeamArea = true;
                                break;
                            }
                        }
                        
                        if (!inTeamArea) {
                            if (isInlet) {
                                terrainGrid[y][x] = TERRAIN_TYPES.WATER;
                            } else {
                                // Peninsula is sand at the edge, grass inside
                                const normDist = Math.sqrt(distSquared) / featureRadius;
                                terrainGrid[y][x] = normDist > 0.7 ? TERRAIN_TYPES.SAND : TERRAIN_TYPES.GRASS;
                            }
                        }
                    }
                }
            }
        }
    }
    
    return terrainGrid;
}

/**
 * Generate vulkan (volcano) terrain
 * @param {number} gridSize - Size of the grid
 * @param {Array} teamAreas - Team areas to avoid
 * @returns {Array} - 2D array of terrain
 */
export function generateVulkanTerrain(gridSize, teamAreas) {
    // Initialize with grass
    const terrainGrid = generateEbeneTerrain(gridSize, teamAreas);
    
    // Place a massive mountain in the center
    const centerX = Math.floor(gridSize / 2);
    const centerY = Math.floor(gridSize / 2);
    
    // Calculate volcano size (30% of the grid)
    const volcanoSize = Math.floor((gridSize * gridSize) * 0.3);
    const lavaSize = Math.floor(volcanoSize * 0.2); // 20% of volcano is lava
    
    // Create the volcano mountain first
    const volcanoTiles = new Set();
    const frontier = [{ x: centerX, y: centerY }];
    
    // Mark the center as lava
    terrainGrid[centerY][centerX] = TERRAIN_TYPES.LAVA;
    volcanoTiles.add(`${centerX},${centerY}`);
    
    // Expand the volcano
    let lavaCount = 1;
    
    while (volcanoTiles.size < volcanoSize && frontier.length > 0) {
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
            tile.x >= 0 && tile.x < gridSize && 
            tile.y >= 0 && tile.y < gridSize &&
            !volcanoTiles.has(`${tile.x},${tile.y}`)
        );
        
        // Add neighbors to volcano
        for (const neighbor of neighbors) {
            // Skip if we've reached the target size
            if (volcanoTiles.size >= volcanoSize) break;
            
            // Check if this would enter a team area
            let inTeamArea = false;
            for (const area of teamAreas) {
                if (neighbor.x >= area.x && neighbor.x < area.x + area.width &&
                    neighbor.y >= area.y && neighbor.y < area.y + area.height) {
                    inTeamArea = true;
                    break;
                }
            }
            
            if (!inTeamArea) {
                // Calculate distance from center
                const distX = neighbor.x - centerX;
                const distY = neighbor.y - centerY;
                const distance = Math.sqrt(distX * distX + distY * distY);
                
                // For inner part, use lava (if not at limit)
                if (distance < gridSize * 0.1 && lavaCount < lavaSize) {
                    terrainGrid[neighbor.y][neighbor.x] = TERRAIN_TYPES.LAVA;
                    lavaCount++;
                } else {
                    terrainGrid[neighbor.y][neighbor.x] = TERRAIN_TYPES.MOUNTAIN;
                }
                
                volcanoTiles.add(`${neighbor.x},${neighbor.y}`);
                frontier.push(neighbor);
            }
        }
    }
    
    // Create 2-10 lava streams flowing from the center
    const numStreams = 2 + Math.floor(Math.random() * 9);
    
    // Collect all lava tiles
    const lavaTiles = [];
    for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
            if (terrainGrid[y][x] === TERRAIN_TYPES.LAVA) {
                lavaTiles.push({ x, y });
            }
        }
    }
    
    if (lavaTiles.length > 0) {
        for (let i = 0; i < numStreams; i++) {
            // Pick a random lava tile as starting point
            const startTile = lavaTiles[Math.floor(Math.random() * lavaTiles.length)];
            
            // Pick a random direction (more likely to go outward)
            const angle = Math.random() * 2 * Math.PI;
            let dirX = Math.cos(angle);
            let dirY = Math.sin(angle);
            
            // Normalize to ensure we're going towards the edge
            const toCenterX = centerX - startTile.x;
            const toCenterY = centerY - startTile.y;
            
            // If pointing towards center, reverse direction
            if (dirX * toCenterX + dirY * toCenterY > 0) {
                dirX = -dirX;
                dirY = -dirY;
            }
            
            // Create the lava stream
            let currentX = startTile.x;
            let currentY = startTile.y;
            let streamLength = 5 + Math.floor(Math.random() * 15);
            
            for (let j = 0; j < streamLength; j++) {
                // Add randomness to direction
                const randAngle = (Math.random() - 0.5) * 0.5; // +/- 0.25 radians
                const newDirX = dirX * Math.cos(randAngle) - dirY * Math.sin(randAngle);
                const newDirY = dirX * Math.sin(randAngle) + dirY * Math.cos(randAngle);
                
                dirX = newDirX;
                dirY = newDirY;
                
                // Move in the chosen direction
                currentX = Math.round(currentX + dirX);
                currentY = Math.round(currentY + dirY);
                
                // Check bounds
                if (currentX < 0 || currentX >= gridSize || 
                    currentY < 0 || currentY >= gridSize) {
                    break;
                }
                
                // Check if entering team area
                let inTeamArea = false;
                for (const area of teamAreas) {
                    if (currentX >= area.x && currentX < area.x + area.width &&
                        currentY >= area.y && currentY < area.y + area.height) {
                        inTeamArea = true;
                        break;
                    }
                }
                
                if (inTeamArea) {
                    break;
                }
                
                // Add the lava tile
                terrainGrid[currentY][currentX] = TERRAIN_TYPES.LAVA;
            }
        }
    }
    
    return terrainGrid;
}

/**
 * Generate zufallsmix (random mix) terrain
 * @param {number} gridSize - Size of the grid
 * @param {Array} teamAreas - Team areas to avoid
 * @returns {Array} - 2D array of terrain
 */
export function generateZufallsmixTerrain(gridSize, teamAreas) {
    // Start with grass
    const terrainGrid = generateEbeneTerrain(gridSize, teamAreas);
    
    // Randomly place terrain features
    
    // Random number of lakes (1-3)
    const numLakes = 1 + Math.floor(Math.random() * 3);
    
    for (let i = 0; i < numLakes; i++) {
        const lakeSize = 10 + Math.floor(Math.random() * 30);
        const centerX = Math.floor(Math.random() * gridSize);
        const centerY = Math.floor(Math.random() * gridSize);
        
        // Create lake
        createRandomFeature(terrainGrid, centerX, centerY, lakeSize, TERRAIN_TYPES.WATER, gridSize, teamAreas);
        
        // Add 1-3 rivers from each lake
        const numRivers = 1 + Math.floor(Math.random() * 3);
        
        for (let j = 0; j < numRivers; j++) {
            createRiver(terrainGrid, centerX, centerY, gridSize, teamAreas);
        }
    }
    
    // Random number of mountain ranges (1-4)
    const numMountains = 1 + Math.floor(Math.random() * 4);
    
    for (let i = 0; i < numMountains; i++) {
        const mountainSize = 20 + Math.floor(Math.random() * 40);
        const centerX = Math.floor(Math.random() * gridSize);
        const centerY = Math.floor(Math.random() * gridSize);
        
        // Create mountain
        createRandomFeature(terrainGrid, centerX, centerY, mountainSize, TERRAIN_TYPES.MOUNTAIN, gridSize, teamAreas);
    }
    
    // Random number of desert areas (0-3)
    const numDeserts = Math.floor(Math.random() * 4);
    
    for (let i = 0; i < numDeserts; i++) {
        const desertSize = 30 + Math.floor(Math.random() * 50);
        const centerX = Math.floor(Math.random() * gridSize);
        const centerY = Math.floor(Math.random() * gridSize);
        
        // Create desert
        createRandomFeature(terrainGrid, centerX, centerY, desertSize, TERRAIN_TYPES.SAND, gridSize, teamAreas);
    }
    
    // Random number of lava pools (0-2)
    const numLavaPools = Math.floor(Math.random() * 3);
    
    for (let i = 0; i < numLavaPools; i++) {
        const lavaSize = 5 + Math.floor(Math.random() * 15);
        const centerX = Math.floor(Math.random() * gridSize);
        const centerY = Math.floor(Math.random() * gridSize);
        
        // Create lava pool
        createRandomFeature(terrainGrid, centerX, centerY, lavaSize, TERRAIN_TYPES.LAVA, gridSize, teamAreas);
        
        // Maybe add 1-2 lava streams
        if (Math.random() < 0.7) {
            const numStreams = 1 + Math.floor(Math.random() * 2);
            
            for (let j = 0; j < numStreams; j++) {
                createLavaStream(terrainGrid, centerX, centerY, gridSize, teamAreas);
            }
        }
    }
    
    // Ensure team areas are grass
    for (const area of teamAreas) {
        for (let y = area.y; y < area.y + area.height; y++) {
            for (let x = area.x; x < area.x + area.width; x++) {
                if (x >= 0 && x < gridSize && y >= 0 && y < gridSize) {
                    terrainGrid[y][x] = TERRAIN_TYPES.GRASS;
                }
            }
        }
    }
    
    return terrainGrid;
}

/**
 * Helper function to create a random terrain feature
 * @param {Array} terrainGrid - The terrain grid
 * @param {number} centerX - Center X position
 * @param {number} centerY - Center Y position
 * @param {number} size - Size of the feature
 * @param {string} terrainType - Type of terrain
 * @param {number} gridSize - Size of the grid
 * @param {Array} teamAreas - Team areas to avoid
 */
function createRandomFeature(terrainGrid, centerX, centerY, size, terrainType, gridSize, teamAreas) {
    const featureTiles = new Set();
    const frontier = [{ x: centerX, y: centerY }];
    
    // Check if center is in team area
    let inTeamArea = false;
    for (const area of teamAreas) {
        if (centerX >= area.x && centerX < area.x + area.width &&
            centerY >= area.y && centerY < area.y + area.height) {
            inTeamArea = true;
            break;
        }
    }
    
    // If not in team area, set the center
    if (!inTeamArea && centerX >= 0 && centerX < gridSize && centerY >= 0 && centerY < gridSize) {
        terrainGrid[centerY][centerX] = terrainType;
        featureTiles.add(`${centerX},${centerY}`);
    }
    
    // Expand the feature
    while (featureTiles.size < size && frontier.length > 0) {
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
            tile.x >= 0 && tile.x < gridSize && 
            tile.y >= 0 && tile.y < gridSize &&
            !featureTiles.has(`${tile.x},${tile.y}`)
        );
        
        // Add each valid neighbor to the feature
        for (const neighbor of neighbors) {
            // Skip if we've reached the target size
            if (featureTiles.size >= size) break;
            
            // Check if this would enter a team area
            let neighborInTeamArea = false;
            for (const area of teamAreas) {
                if (neighbor.x >= area.x && neighbor.x < area.x + area.width &&
                    neighbor.y >= area.y && neighbor.y < area.y + area.height) {
                    neighborInTeamArea = true;
                    break;
                }
            }
            
            if (!neighborInTeamArea) {
                terrainGrid[neighbor.y][neighbor.x] = terrainType;
                featureTiles.add(`${neighbor.x},${neighbor.y}`);
                frontier.push(neighbor);
            }
        }
    }
}

/**
 * Helper function to create a river
 * @param {Array} terrainGrid - The terrain grid
 * @param {number} startX - Starting X position
 * @param {number} startY - Starting Y position
 * @param {number} gridSize - Size of the grid
 * @param {Array} teamAreas - Team areas to avoid
 */
function createRiver(terrainGrid, startX, startY, gridSize, teamAreas) {
    // Choose a random direction (edge to flow towards)
    const directions = ['left', 'right', 'top', 'bottom'];
    const targetEdge = directions[Math.floor(Math.random() * directions.length)];
    
    // Create a meandering path to the edge
    let currentX = startX;
    let currentY = startY;
    
    // Keep creating the river until we reach the edge
    while (currentX > 0 && currentX < gridSize - 1 && 
           currentY > 0 && currentY < gridSize - 1) {
        
        // Determine the main direction to flow
        let mainDirX = 0;
        let mainDirY = 0;
        
        switch (targetEdge) {
            case 'left': mainDirX = -1; break;
            case 'right': mainDirX = 1; break;
            case 'top': mainDirY = -1; break;
            case 'bottom': mainDirY = 1; break;
        }
        
        // Add some randomness to make the river meander
        // 70% chance to flow in the main direction, 30% to meander
        if (Math.random() < 0.7) {
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
        currentX = Math.max(0, Math.min(gridSize - 1, currentX));
        currentY = Math.max(0, Math.min(gridSize - 1, currentY));
        
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
    }
}

/**
 * Helper function to create a lava stream
 * @param {Array} terrainGrid - The terrain grid
 * @param {number} startX - Starting X position
 * @param {number} startY - Starting Y position
 * @param {number} gridSize - Size of the grid
 * @param {Array} teamAreas - Team areas to avoid
 */
function createLavaStream(terrainGrid, startX, startY, gridSize, teamAreas) {
    // Pick a random direction (more likely to go outward)
    const angle = Math.random() * 2 * Math.PI;
    let dirX = Math.cos(angle);
    let dirY = Math.sin(angle);
    
    // Create the lava stream
    let currentX = startX;
    let currentY = startY;
    let streamLength = 5 + Math.floor(Math.random() * 10);
    
    for (let j = 0; j < streamLength; j++) {
        // Add randomness to direction
        const randAngle = (Math.random() - 0.5) * 0.5; // +/- 0.25 radians
        const newDirX = dirX * Math.cos(randAngle) - dirY * Math.sin(randAngle);
        const newDirY = dirX * Math.sin(randAngle) + dirY * Math.cos(randAngle);
        
        dirX = newDirX;
        dirY = newDirY;
        
        // Move in the chosen direction
        currentX = Math.round(currentX + dirX);
        currentY = Math.round(currentY + dirY);
        
        // Check bounds
        if (currentX < 0 || currentX >= gridSize || 
            currentY < 0 || currentY >= gridSize) {
            break;
        }
        
        // Check if entering team area
        let inTeamArea = false;
        for (const area of teamAreas) {
            if (currentX >= area.x && currentX < area.x + area.width &&
                currentY >= area.y && currentY < area.y + area.height) {
                inTeamArea = true;
                break;
            }
        }
        
        if (inTeamArea) {
            break;
        }
        
        // Add the lava tile
        terrainGrid[currentY][currentX] = TERRAIN_TYPES.LAVA;
    }
}

/**
 * Generate terrain based on the selected scenario
 * @param {string} scenario - Terrain scenario
 * @param {number} gridSize - Size of the grid
 * @param {Array} teamAreas - Team areas to avoid
 * @returns {Array} - 2D array of terrain
 */
export function generateTerrain(scenario, gridSize, teamAreas) {
    switch (scenario) {
        case 'ebene':
            return generateEbeneTerrain(gridSize, teamAreas);
        case 'see':
            return generateSeeTerrain(gridSize, teamAreas);
        case 'gebirge':
            return generateGebirgeTerrain(gridSize, teamAreas);
        case 'wueste':
            return generateWuesteTerrain(gridSize, teamAreas);
        case 'meer':
            return generateMeerTerrain(gridSize, teamAreas);
        case 'vulkan':
            return generateVulkanTerrain(gridSize, teamAreas);
        case 'zufallsmix':
            return generateZufallsmixTerrain(gridSize, teamAreas);
        default:
            return generateEbeneTerrain(gridSize, teamAreas);
    }
}