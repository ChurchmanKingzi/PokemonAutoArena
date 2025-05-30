/**
 * Attack cone visualization and utilities
 * Provides reusable functionality for cone-shaped attacks
 */

import { TILE_SIZE, GRID_SIZE } from './config.js';
import { getCharacterPositions } from './characterPositions.js';
import { calculateSizeCategory } from './pokemonSizeCalculator.js';

// Store active cones for management
const activeCones = new Map();

/**
 * Create a visual indicator for an attack cone
 * @param {Object} attacker - The attacker position
 * @param {Object} target - The target position (direction of cone)
 * @param {number} range - Range of the cone in tiles
 * @param {number} angle - Angle of the cone in degrees (default: 45)
 * @param {string} attackType - Type of attack for styling
 * @param {string} id - Optional ID for this cone (default: generated)
 * @returns {HTMLElement} - The created cone element
 */
export function createConeIndicator(attacker, target, range, angle = 45, attackType = 'default', id = null) {    
    // Generate ID if not provided
    const coneId = id || `cone-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Remove any existing cone with this ID if it exists
    removeConeIndicator(coneId);
    
    // Find the battlefield for positioning
    const battlefield = document.querySelector('.battlefield-grid');
    
    if (!battlefield) {
        console.error('Battlefield element not found for cone positioning');
        return null;
    }
    
    // Calculate display range based on attacker's size category
    let displayRange = range;
    if (attacker.character) {
        // Import and calculate size category
        import('./pokemonSizeCalculator.js').then(module => {
            // This is async, but we'll use the synchronous calculation below
        }).catch(error => {
            console.warn('Could not import pokemonSizeCalculator:', error);
        });
        
        // For immediate use, calculate size category inline
        let sizeCategory = 1;
        
        // Extract height and weight from different possible locations in the data
        let height, weight;
        
        // Try to get height/weight from statsDetails first (most  source)
        if (attacker.character.statsDetails) {
            height = attacker.character.statsDetails.height;
            weight = attacker.character.statsDetails.weight;
        }
        
        // Fallback to direct properties if they exist
        if (height === undefined) {
            height = attacker.character.height || 0;
        }
        if (weight === undefined) {
            weight = attacker.character.weight || 0;
        }
        
        // Check if the Pokémon is Flying type
        const isFlying = (attacker.character.pokemonTypes && 
                         attacker.character.pokemonTypes.some(type => type.toLowerCase() === 'flying')) ||
                         (attacker.character.pokemonTypesDe && 
                         attacker.character.pokemonTypesDe.some(type => type.toLowerCase() === 'flug'));
        
        // Calculate BMI
        const bmi = (height && height > 0) ? weight / (height * height) : 0;
        
        // Rule 1: Size increase based on height and BMI relationship
        if (height >= 1.6) {
            // Calculate how many 0.1m increments above 1.6m
            const heightIncrements = Math.floor((height - 1.6) / 0.1);
            // Calculate required BMI (decreases by 4 for each 0.1m above 1.6m)
            const requiredBMI = Math.max(0, 30 - (heightIncrements * 4));
            
            // Check if BMI meets the requirement or if height is at least 2m
            if (bmi >= requiredBMI || height >= 2) {
                sizeCategory += 1;
            }
        }
        
        // Rule 2: Additional size increases based on height milestones
        if (height >= 10) {
            sizeCategory += 3; // +1 for each milestone: 4m, 6m, and 10m
        } else if (height >= 6) {
            sizeCategory += 2; // +1 for each milestone: 4m and 6m
        } else if (height >= 4) {
            sizeCategory += 1; // +1 for 4m milestone
        }
        
        // Rule 3: Flying type size adjustment
        if (isFlying && sizeCategory === 1 && height >= 1.5) {
            sizeCategory += 1; // Representing wing span
        }
        
        // Increase display range by 1 for each size category beyond 1
        displayRange = range + Math.max(0, sizeCategory - 1);
    }
    
    // Calculate direction vector for rotation
    const dx = target.x - attacker.x;
    const dy = target.y - attacker.y;
    const directionAngle = Math.atan2(dy, dx); // in radians
    
    // Different visualization based on angle
    let coneElement;
    
    if (angle >= 360) {
        // CASE 1: 360 degrees - full circle
        coneElement = createCircleIndicator(attacker, displayRange, attackType, coneId);
    } else if (angle >= 180) {
        // CASE 2: 180-359 degrees - wide cone that requires special handling
        coneElement = createWideConeIndicator(attacker, target, displayRange, angle, attackType, coneId);
    } else {
        // CASE 3: <180 degrees - can use standard triangle cone
        coneElement = createStandardConeIndicator(attacker, target, displayRange, angle, attackType, coneId);
    }
    
    // Store the attacker and target positions for later reference
    coneElement.dataset.attackerX = attacker.x;
    coneElement.dataset.attackerY = attacker.y;
    coneElement.dataset.targetX = target.x;
    coneElement.dataset.targetY = target.y;
    
    // Add to the battlefield
    battlefield.appendChild(coneElement);
    
    // Store in active cones map
    activeCones.set(coneId, {
        element: coneElement,
        attacker: attacker,
        targetDirection: target,
        range: displayRange, // Store the display range, not the actual range
        angle: angle,
        attackType: attackType,
        createdAt: Date.now()
    });
    
    // Also create tile highlights to show affected areas more clearly
    // Use the original range for tile highlights, not the display range
    createTileHighlights(attacker, target, range, angle, attackType, coneId);
    
    return coneElement;
}

/**
 * Create a standard triangle-shaped cone indicator (<180 degrees)
 * Creates a clean cone with rounded outer edge like a slice of pizza
 */
function createStandardConeIndicator(attacker, target, range, angle, attackType, coneId) {
    // Calculate direction vector
    const dx = target.x - attacker.x;
    const dy = target.y - attacker.y;
    const baseAngle = Math.atan2(dy, dx);
    
    // Create SVG element
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    
    // Calculate cone dimensions
    const coneLength = range * TILE_SIZE;
    const halfAngleRad = (angle / 2) * (Math.PI / 180);
    
    // Calculate the coordinates for the arc endpoints
    const leftAngle = baseAngle - halfAngleRad;
    const rightAngle = baseAngle + halfAngleRad;
    
    const leftX = coneLength * Math.cos(leftAngle);
    const leftY = coneLength * Math.sin(leftAngle);
    const rightX = coneLength * Math.cos(rightAngle);
    const rightY = coneLength * Math.sin(rightAngle);
    
    // Find the bounding box for our cone - make it much larger to ensure no clipping
    const maxExtent = coneLength * 3; // Significantly larger than needed
    
    // Set the SVG dimensions to be very large to avoid any clipping
    svg.setAttribute("width", maxExtent * 2);
    svg.setAttribute("height", maxExtent * 2);
    svg.setAttribute("viewBox", `-${maxExtent} -${maxExtent} ${maxExtent * 2} ${maxExtent * 2}`);
    svg.setAttribute("id", coneId);
    svg.classList.add("attack-cone", "standard-cone", `${attackType}-cone`);
    svg.dataset.attackType = attackType;
    svg.dataset.angle = angle;
    svg.dataset.range = range;
    
    // Position SVG at the attacker's tile center
    const attackerCenterX = attacker.x * TILE_SIZE + TILE_SIZE / 2;
    const attackerCenterY = attacker.y * TILE_SIZE + TILE_SIZE / 2;
    
    svg.style.position = 'absolute';
    svg.style.left = `${attackerCenterX}px`;
    svg.style.top = `${attackerCenterY}px`;
    svg.style.transform = 'translate(-50%, -50%)';
    svg.style.overflow = 'visible';
    svg.style.zIndex = '95';
    svg.style.opacity = '0.7';
    svg.style.pointerEvents = 'none';
    
    // Add explicit styling to ensure no clipping
    svg.style.clipPath = 'none';
    svg.style.maskImage = 'none';
    
    // Create the cone path
    const path = document.createElementNS(svgNS, "path");
    
    // Create cone path with rounded outer edge
    // Start at origin (0,0), line to first point, arc to second point, close back to origin
    const arcRadius = coneLength;
    const largeArcFlag = (angle > 180) ? 1 : 0;
    const pathData = `M 0,0 L ${leftX},${leftY} A ${arcRadius},${arcRadius} 0 ${largeArcFlag} 1 ${rightX},${rightY} Z`;
    path.setAttribute("d", pathData);
    
    // Set fill color based on attack type
    let fillColor, strokeColor;
    
    switch (attackType) {
        case 'giftpuder':
            fillColor = "rgba(175, 106, 175, 0.3)";
            strokeColor = "rgba(175, 106, 175, 0.6)";
            break;
        case 'schlafpuder':
            fillColor = "rgba(135, 206, 250, 0.3)";
            strokeColor = "rgba(135, 206, 250, 0.6)";
            break;
        case 'stachelspore':
            fillColor = "rgba(144, 238, 144, 0.3)";
            strokeColor = "rgba(144, 238, 144, 0.6)";
            break;
        case 'sandwirbel':
            fillColor = "rgba(210, 180, 140, 0.3)";
            strokeColor = "rgba(210, 180, 140, 0.6)";
            break;
        case 'eissturm':
            fillColor = "rgba(176, 224, 230, 0.3)";
            strokeColor = "rgba(135, 206, 235, 0.5)";
            break;
        default:
            fillColor = "rgba(255, 100, 100, 0.3)";
            strokeColor = "rgba(255, 100, 100, 0.6)";
    }
    
    path.setAttribute("fill", fillColor);
    path.setAttribute("stroke", strokeColor);
    path.setAttribute("stroke-width", "2");
    
    // Add path to SVG
    svg.appendChild(path);
    
    return svg;
}

/**
 * Create a circular indicator for 360-degree attacks
 * @param {Object} attacker - Attacker position {x, y}
 * @param {number} range - Range of the attack in tiles
 * @param {string} attackType - Type of attack for styling
 * @param {string} coneId - Unique ID for this cone
 * @returns {HTMLElement} - The created circle element
 */
function createCircleIndicator(attacker, range, attackType, coneId) {
    // Create SVG element for consistency with other cone functions
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    
    // Calculate circle dimensions
    const radius = range * TILE_SIZE;
    
    // Use the same large viewBox approach as other cone functions to avoid clipping
    const maxExtent = radius * 3; // Much larger than needed to avoid clipping
    
    // Set up SVG with large dimensions to match other cone functions
    svg.setAttribute("width", maxExtent * 2);
    svg.setAttribute("height", maxExtent * 2);
    svg.setAttribute("viewBox", `-${maxExtent} -${maxExtent} ${maxExtent * 2} ${maxExtent * 2}`);
    svg.setAttribute("id", coneId);
    svg.classList.add("attack-cone", "circle-cone", `${attackType}-cone`);
    svg.dataset.attackType = attackType;
    svg.dataset.angle = 360;
    svg.dataset.range = range;
    
    // Position SVG at the attacker's tile center using the same method as other cones
    const attackerCenterX = attacker.x * TILE_SIZE + TILE_SIZE / 2;
    const attackerCenterY = attacker.y * TILE_SIZE + TILE_SIZE / 2;
    
    svg.style.position = 'absolute';
    svg.style.left = `${attackerCenterX}px`;
    svg.style.top = `${attackerCenterY}px`;
    svg.style.transform = 'translate(-50%, -50%)';
    svg.style.overflow = 'visible';
    svg.style.zIndex = '95';
    svg.style.opacity = '0.7';
    svg.style.pointerEvents = 'none';
    
    // Add explicit styling to ensure no clipping (same as other cone functions)
    svg.style.clipPath = 'none';
    svg.style.maskImage = 'none';
    
    // Create a full circle using a path element (more consistent with other cone functions)
    const path = document.createElementNS(svgNS, "path");
    
    // Create a path that draws a full circle
    // We'll draw two semicircle arcs to create a complete circle
    const pathData = `M ${-radius},0 A ${radius},${radius} 0 1 1 ${radius},0 A ${radius},${radius} 0 1 1 ${-radius},0 Z`;
    path.setAttribute("d", pathData);
    
    // Set fill and stroke colors based on attack type
    let fillColor, strokeColor;
    
    switch (attackType) {
        case 'giftpuder':
            fillColor = "rgba(175, 106, 175, 0.3)";
            strokeColor = "rgba(175, 106, 175, 0.6)";
            break;
        case 'schlafpuder':
            fillColor = "rgba(135, 206, 250, 0.3)";
            strokeColor = "rgba(135, 206, 250, 0.6)";
            break;
        case 'stachelspore':
            fillColor = "rgba(144, 238, 144, 0.3)";
            strokeColor = "rgba(144, 238, 144, 0.6)";
            break;
        case 'sandwirbel':
            fillColor = "rgba(210, 180, 140, 0.3)";
            strokeColor = "rgba(210, 180, 140, 0.6)";
            break;
        case 'eissturm':
            fillColor = "rgba(176, 224, 230, 0.3)";
            strokeColor = "rgba(135, 206, 235, 0.5)";
            break;
        case 'fadenschuss':
            fillColor = "rgba(144, 238, 144, 0.3)";
            strokeColor = "rgba(50, 205, 50, 0.6)";
            break;
        case 'rasierblatt':
            fillColor = "rgba(124, 252, 0, 0.3)";
            strokeColor = "rgba(34, 139, 34, 0.6)";
            break;
        case 'explosion':
            fillColor = "rgba(255, 69, 0, 0.4)";
            strokeColor = "rgba(255, 69, 0, 0.8)";
            break;
        default:
            fillColor = "rgba(255, 100, 100, 0.3)";
            strokeColor = "rgba(255, 100, 100, 0.6)";
    }
    
    path.setAttribute("fill", fillColor);
    path.setAttribute("stroke", strokeColor);
    path.setAttribute("stroke-width", "2");
    
    // Add the path to the SVG
    svg.appendChild(path);
    
    return svg;
}

/**
 * Create a wide cone indicator for angles >= 180 degrees
 * Uses SVG arc for proper rounded visualization
 */
function createWideConeIndicator(attacker, target, range, angle, attackType, coneId) {
    // Create an SVG element for the wide cone
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    
    // Calculate direction vector for rotation
    const dx = target.x - attacker.x;
    const dy = target.y - attacker.y;
    const baseAngle = Math.atan2(dy, dx);
    
    // Convert range to pixels
    const radius = range * TILE_SIZE;
    
    // Calculate the maximum extent needed - make it significantly larger
    const maxExtent = radius * 3; // Much larger than needed to avoid clipping
    
    // Create an svg that's large enough and centered on the origin
    svg.setAttribute("width", maxExtent * 2);
    svg.setAttribute("height", maxExtent * 2);
    svg.setAttribute("viewBox", `-${maxExtent} -${maxExtent} ${maxExtent * 2} ${maxExtent * 2}`);
    svg.setAttribute("id", coneId);
    svg.classList.add("attack-cone", "wide-cone", `${attackType}-cone`);
    svg.dataset.attackType = attackType;
    svg.dataset.angle = angle;
    svg.dataset.range = range;
    
    // Position SVG at the attacker's tile center
    const attackerCenterX = attacker.x * TILE_SIZE + TILE_SIZE / 2;
    const attackerCenterY = attacker.y * TILE_SIZE + TILE_SIZE / 2;
    
    svg.style.position = 'absolute';
    svg.style.left = `${attackerCenterX}px`;
    svg.style.top = `${attackerCenterY}px`;
    svg.style.transform = 'translate(-50%, -50%)';
    svg.style.overflow = 'visible';
    svg.style.zIndex = '95';
    svg.style.opacity = '0.7';
    svg.style.pointerEvents = 'none';
    
    // Add explicit styling to ensure no clipping
    svg.style.clipPath = 'none';
    svg.style.maskImage = 'none';
    
    // Create a sector path for the cone
    const path = document.createElementNS(svgNS, "path");
    
    // Calculate sector angles
    const halfAngleRad = (angle / 2) * (Math.PI / 180);
    const startAngle = baseAngle - halfAngleRad;
    const endAngle = baseAngle + halfAngleRad;
    
    // Calculate points on the circle edge
    const x1 = radius * Math.cos(startAngle);
    const y1 = radius * Math.sin(startAngle);
    const x2 = radius * Math.cos(endAngle);
    const y2 = radius * Math.sin(endAngle);
    
    // Create path data for the sector
    // Start at origin (0,0), line to first point, arc to second point, close back to origin
    const largeArcFlag = (angle > 180) ? 1 : 0;
    const d = `M 0,0 L ${x1},${y1} A ${radius},${radius} 0 ${largeArcFlag} 1 ${x2},${y2} Z`;
    
    path.setAttribute("d", d);
    
    // Set path styling based on attack type
    let fillColor, strokeColor;
    
    switch (attackType) {
        case 'giftpuder':
            fillColor = "rgba(175, 106, 175, 0.3)";
            strokeColor = "rgba(175, 106, 175, 0.6)";
            break;
        case 'schlafpuder':
            fillColor = "rgba(135, 206, 250, 0.3)";
            strokeColor = "rgba(135, 206, 250, 0.6)";
            break;
        case 'stachelspore':
            fillColor = "rgba(144, 238, 144, 0.3)";
            strokeColor = "rgba(144, 238, 144, 0.6)";
            break;
        case 'sandwirbel':
            fillColor = "rgba(210, 180, 140, 0.3)";
            strokeColor = "rgba(210, 180, 140, 0.6)";
            break;
        case 'eissturm':
            fillColor = "rgba(176, 224, 230, 0.3)";
            strokeColor = "rgba(135, 206, 235, 0.5)";
            break;
        default:
            fillColor = "rgba(255, 100, 100, 0.3)";
            strokeColor = "rgba(255, 100, 100, 0.6)";
    }
    
    path.setAttribute("fill", fillColor);
    path.setAttribute("stroke", strokeColor);
    path.setAttribute("stroke-width", "1");
    
    // Add path to SVG
    svg.appendChild(path);
    
    return svg;
}

/**
 * Create highlights for individual tiles affected by the cone
 */
function createTileHighlights(attacker, target, range, angle, attackType, coneId) {
    // Find the battlefield
    const battlefield = document.querySelector('.battlefield-grid');
    if (!battlefield) return;
    
    // Create container for tile highlights
    const container = document.createElement('div');
    container.className = 'tile-highlights-container';
    container.dataset.forCone = coneId;
    
    // Calculate direction angle
    const baseAngle = Math.atan2(target.y - attacker.y, target.x - attacker.x);
    
    // Check tiles in a square area around attacker that covers the range
    const checkRange = Math.ceil(range);
    
    // Process all tiles in range
    for (let offsetX = -checkRange; offsetX <= checkRange; offsetX++) {
        for (let offsetY = -checkRange; offsetY <= checkRange; offsetY++) {
            const tileX = attacker.x + offsetX;
            const tileY = attacker.y + offsetY;
            
            // Skip tiles outside the grid
            if (tileX < 0 || tileY < 0 || tileX >= GRID_SIZE || tileY >= GRID_SIZE) {
                continue;
            }
            
            // Check if within range
            const distance = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
            if (distance > range) continue;
            
            // Always include the attacker's tile
            let inCone = (offsetX === 0 && offsetY === 0);
            
            // Check if tile is in cone angle for non-attacker tiles
            if (!inCone) {
                if (angle >= 360) {
                    // 360° case - all tiles in range are affected
                    inCone = true;
                } else {
                    // Calculate tile angle relative to attacker
                    const tileAngle = Math.atan2(offsetY, offsetX);
                    
                    // Calculate angular difference
                    let angleDiff = Math.abs(tileAngle - baseAngle);
                    
                    // Normalize to [0, π]
                    while (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
                    
                    // Check if within half-angle
                    const halfAngleRad = (angle / 2) * (Math.PI / 180);
                    inCone = angleDiff <= halfAngleRad;
                }
            }
            
            if (inCone) {
                // Create highlight for this tile
                const highlight = document.createElement('div');
                highlight.className = 'tile-highlight';
                highlight.classList.add(`${attackType}-highlight`);
                
                // Position
                highlight.style.position = 'absolute';
                highlight.style.width = `${TILE_SIZE}px`;
                highlight.style.height = `${TILE_SIZE}px`;
                highlight.style.left = `${tileX * TILE_SIZE}px`;
                highlight.style.top = `${tileY * TILE_SIZE}px`;
                highlight.style.boxSizing = 'border-box';
                highlight.style.zIndex = '94'; // Below main cone
                
                // Add to container
                container.appendChild(highlight);
            }
        }
    }
    
    // Add container to battlefield if it has children
    if (container.children.length > 0) {
        battlefield.appendChild(container);
    }
}

/**
 * Remove a cone indicator from the battlefield
 * @param {string} coneId - Optional ID of the specific cone to remove
 *                          If not provided, removes all cones
 * @returns {boolean} - Whether any cones were removed
 */
export function removeConeIndicator(coneId = null) {
    let removed = false;
    
    if (coneId) {
        // Remove specific cone by ID
        const cone = document.getElementById(coneId);
        if (cone) {
            // Add fade-out animation
            cone.classList.add('fade-out');
            
            // Remove after animation completes
            setTimeout(() => {
                if (cone.parentNode) {
                    cone.parentNode.removeChild(cone);
                }
                // Remove from active cones map
                activeCones.delete(coneId);
            }, 200); // Animation time
            
            // Also remove associated tile highlights
            removeTileHighlights(coneId);
            
            removed = true;
        }
    } else {
        // Remove all cones
        const coneElements = document.querySelectorAll('.attack-cone');
        
        coneElements.forEach(cone => {
            if (cone && cone.parentNode) {
                // Add fade-out animation
                cone.classList.add('fade-out');
                
                // Remove after animation completes
                setTimeout(() => {
                    if (cone.parentNode) {
                        cone.parentNode.removeChild(cone);
                    }
                    // Remove from active cones map if it has an ID
                    if (cone.id) {
                        activeCones.delete(cone.id);
                    }
                }, 200); // Animation time
                
                removed = true;
            }
        });
        
        // Remove all tile highlights
        removeTileHighlights();
        
        // Clear the active cones map if any were removed
        if (removed) {
            activeCones.clear();
        }
    }
    
    return removed;
}

/**
 * Remove tile highlights associated with a cone
 * @param {string} coneId - Optional ID of the specific cone
 */
function removeTileHighlights(coneId = null) {
    let selector = '.tile-highlights-container';
    if (coneId) {
        selector += `[data-for-cone="${coneId}"]`;
    }
    
    const containers = document.querySelectorAll(selector);
    containers.forEach(container => {
        if (container && container.parentNode) {
            // Add fade-out to all highlights
            container.querySelectorAll('.tile-highlight').forEach(highlight => {
                highlight.classList.add('fade-out');
            });
            
            // Remove container after fade animation
            setTimeout(() => {
                if (container.parentNode) {
                    container.parentNode.removeChild(container);
                }
            }, 200);
        }
    });
}

/**
 * Check if a position is within an attack cone
 * @param {Object} attacker - Attacker position {x, y}
 * @param {Object} targetPos - Target position {x, y} (direction of cone)
 * @param {Object} checkPos - Position to check {x, y}
 * @param {number} range - Range of the cone
 * @param {number} coneAngle - Angle of the cone in degrees
 * @returns {boolean} - Whether the position is within the cone
 */
export function isPositionInCone(attacker, targetPos, checkPos, range, coneAngle = 45) {
    // Calculate vector from attacker to check position
    const checkDx = checkPos.x - attacker.x;
    const checkDy = checkPos.y - attacker.y;
    const checkDistance = Math.sqrt(checkDx * checkDx + checkDy * checkDy);
    
    // Check if the distance is within range
    if (checkDistance > range) {
        return false;
    }
    
    // Special case: 360 degrees means everything in range is affected
    if (coneAngle >= 360) {
        return true;
    }
    
    // If it's the attacker's own position, it's in the cone
    if (checkDx === 0 && checkDy === 0) {
        return true;
    }
    
    // Calculate direction vector from attacker to target
    const dx = targetPos.x - attacker.x;
    const dy = targetPos.y - attacker.y;
    
    // Handle case where target is same as attacker
    if (dx === 0 && dy === 0) {
        // Default to North if no direction specified
        return checkDy < 0 && Math.abs(checkDx) < Math.abs(checkDy);
    }
    
    const distance = Math.sqrt(dx * dx + dy * dy);
    const dirX = dx / distance;
    const dirY = dy / distance;
    
    // Calculate the dot product to find the angle
    const dot = dirX * checkDx + dirY * checkDy;
    
    // Ensure we don't divide by zero
    if (checkDistance === 0) return true; // Attacker's position
    
    const cosAngle = dot / checkDistance; // cos of angle between vectors
    
    // Cone half-angle (in radians)
    const coneHalfAngle = (coneAngle / 2 * Math.PI) / 180;
    
    // Check if position is within the cone
    return cosAngle > Math.cos(coneHalfAngle);
}

/**
 * Find all characters within a cone
 * @param {Object} attacker - Attacker position
 * @param {Object} targetPos - Direction of the cone
 * @param {number} range - Range of the cone
 * @param {number} angle - Angle of the cone in degrees
 * @returns {Array} - Array of {id, character, position} for characters in the cone
 */
export function findCharactersInCone(attacker, targetPos, range, angle = 45) {
    const characterPositions = getCharacterPositions();
    const charactersInCone = [];
    
    for (const charId in characterPositions) {
        const charPos = characterPositions[charId];
        
        if (charPos.isDefeated) continue;
        
        if (isCharacterInCone(attacker, targetPos, charPos.character, charPos, range, angle)) {
            charactersInCone.push({
                id: charId,
                character: charPos.character,
                position: charPos
            });
        }
    }
    
    return charactersInCone;
}

/**
 * Get all active cones
 * @returns {Map} - Map of active cones
 */
export function getActiveCones() {
    return activeCones;
}

/**
 * Add CSS styles for cone effects
 */
export function addConeStyles() {
    // Check if styles already exist
    if (document.getElementById('attack-cone-styles')) return;
    
    // Create style element
    const styleElement = document.createElement('style');
    styleElement.id = 'attack-cone-styles';
    
    // Define the CSS
    styleElement.textContent = `
        /* Base cone styling */
        .attack-cone {
            pointer-events: none;
            transition: opacity 0.2s ease-out;
        }
        
        /* SVG cone styling */
        .standard-cone path {
            transition: all 0.2s;
        }
        
        /* Circle cone (360 degrees) */
        .circle-cone {
            background-color: rgba(255, 255, 255, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.4);
        }
        
        /* Tile highlighting */
        .tile-highlight {
            border: 1px solid rgba(255, 255, 255, 0.4);
            background-color: rgba(255, 255, 255, 0.2);
            animation: tile-pulse 1.5s infinite;
            transition: opacity 0.2s;
        }
        
        @keyframes tile-pulse {
            0% { opacity: 0.6; }
            50% { opacity: 0.8; }
            100% { opacity: 0.6; }
        }
        
        /* Fade-out animation */
        .attack-cone.fade-out,
        .tile-highlight.fade-out {
            opacity: 0 !important;
        }
        
        /* Default cone style */
        .default-cone path, .default-highlight {
            fill: rgba(255, 100, 100, 0.3);
            stroke: rgba(255, 100, 100, 0.5);
        }
        
        /* Specific attack type cones */
        .giftpuder-cone path, .giftpuder-highlight {
            fill: rgba(175, 106, 175, 0.3);
            stroke: rgba(175, 106, 175, 0.6);
        }
        
        .schlafpuder-cone path, .schlafpuder-highlight {
            fill: rgba(135, 206, 250, 0.3);
            stroke: rgba(135, 206, 250, 0.6);
        }
        
        .stachelspore-cone path, .stachelspore-highlight {
            fill: rgba(144, 238, 144, 0.3);
            stroke: rgba(144, 238, 144, 0.6);
        }
        
        .sandwirbel-cone path, .sandwirbel-highlight {
            fill: rgba(210, 180, 140, 0.3);
            stroke: rgba(210, 180, 140, 0.6);
            animation: sandwirbel-cone-pulse 1.5s infinite;
        }
        
        @keyframes sandwirbel-cone-pulse {
            0% { 
                fill: rgba(210, 180, 140, 0.2);
                stroke: rgba(210, 180, 140, 0.4);
            }
            50% { 
                fill: rgba(210, 180, 140, 0.3);
                stroke: rgba(210, 180, 140, 0.6);
            }
            100% { 
                fill: rgba(210, 180, 140, 0.2);
                stroke: rgba(210, 180, 140, 0.4);
            }
        }
    `;
    
    // Add to document head
    document.head.appendChild(styleElement);
}

/**
 * Get all tiles occupied by a character based on their size category
 */
function getCharacterOccupiedTiles(character, position) {
    const sizeCategory = calculateSizeCategory(character) || 1;
    const occupiedTiles = [];
    
    if (sizeCategory === 1) {
        occupiedTiles.push({ x: position.x, y: position.y });
    } else if (sizeCategory === 2) {
        occupiedTiles.push({ x: position.x, y: position.y });
        occupiedTiles.push({ x: position.x + 1, y: position.y });
        occupiedTiles.push({ x: position.x, y: position.y + 1 });
        occupiedTiles.push({ x: position.x + 1, y: position.y + 1 });
    } else {
        // For larger sizes, create NxN grid
        for (let dx = 0; dx < sizeCategory; dx++) {
            for (let dy = 0; dy < sizeCategory; dy++) {
                occupiedTiles.push({ x: position.x + dx, y: position.y + dy });
            }
        }
    }
    
    return occupiedTiles;
}

/**
 * Enhanced version of isPositionInCone that accounts for character size
 */
export function isCharacterInCone(attacker, targetPos, character, checkPos, range, coneAngle = 45) {
    const occupiedTiles = getCharacterOccupiedTiles(character, checkPos);
    
    for (const tile of occupiedTiles) {
        if (isPositionInCone(attacker, targetPos, tile, range, coneAngle)) {
            return true;
        }
    }
    
    return false;
}

