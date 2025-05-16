/**
 * Attack cone visualization and utilities
 * Provides reusable functionality for cone-shaped attacks
 */

import { TILE_SIZE, GRID_SIZE } from './config.js';
import { getCharacterPositions } from './characterPositions.js';

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
    console.log(`Creating cone indicator: angle=${angle}, range=${range}, type=${attackType}`);
    
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
    
    // Calculate direction vector for rotation
    const dx = target.x - attacker.x;
    const dy = target.y - attacker.y;
    const directionAngle = Math.atan2(dy, dx); // in radians
    
    // Different visualization based on angle
    let coneElement;
    
    if (angle >= 360) {
        // CASE 1: 360 degrees - full circle
        coneElement = createCircleIndicator(attacker, range, attackType, coneId);
    } else if (angle >= 180) {
        // CASE 2: 180-359 degrees - wide cone that requires special handling
        coneElement = createWideConeIndicator(attacker, target, range, angle, attackType, coneId);
    } else {
        // CASE 3: <180 degrees - can use standard triangle cone
        coneElement = createStandardConeIndicator(attacker, target, range, angle, attackType, coneId);
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
        range: range,
        angle: angle,
        attackType: attackType,
        createdAt: Date.now()
    });
    
    // Also create tile highlights to show affected areas more clearly
    createTileHighlights(attacker, target, range, angle, attackType, coneId);
    
    return coneElement;
}

/**
 * Create a standard triangle-shaped cone indicator (<180 degrees)
 */
function createStandardConeIndicator(attacker, target, range, angle, attackType, coneId) {
    // Calculate the cone width based on the angle and range
    const coneWidth = range * 2 * Math.tan((angle / 2) * (Math.PI / 180)) * TILE_SIZE;
    const coneLength = range * TILE_SIZE;
    
    // Calculate direction vector
    const dx = target.x - attacker.x;
    const dy = target.y - attacker.y;
    const lineAngle = Math.atan2(dy, dx) * 180 / Math.PI;
    
    // Create the cone element
    const coneElement = document.createElement('div');
    coneElement.className = 'attack-cone standard-cone';
    
    // Add attack-specific class for styling
    coneElement.classList.add(`${attackType}-cone`);
    
    coneElement.id = coneId;
    coneElement.dataset.attackType = attackType;
    coneElement.dataset.angle = angle;
    coneElement.dataset.range = range;
    
    // Position the cone at the center of the attacker's tile
    const coneX = attacker.x * TILE_SIZE + TILE_SIZE / 2;
    const coneY = attacker.y * TILE_SIZE + TILE_SIZE / 2;
    
    // Set cone dimensions
    coneElement.style.width = `${coneLength}px`;
    coneElement.style.height = `${coneWidth}px`;
    
    // Position the cone
    coneElement.style.position = 'absolute';
    coneElement.style.left = `${coneX}px`;
    coneElement.style.top = `${coneY}px`;
    
    // Rotate to match the direction
    coneElement.style.transform = `translate(0, -50%) rotate(${lineAngle}deg)`;
    
    // Ensure proper zIndex
    coneElement.style.zIndex = '95';
    
    // Set opacity for better visibility
    coneElement.style.opacity = '0.7';
    
    return coneElement;
}

/**
 * Create a circular indicator for 360-degree attacks
 */
function createCircleIndicator(attacker, range, attackType, coneId) {
    // Create the circle element
    const circleElement = document.createElement('div');
    circleElement.className = 'attack-cone circle-cone';
    
    // Add attack-specific class for styling
    circleElement.classList.add(`${attackType}-cone`);
    
    circleElement.id = coneId;
    circleElement.dataset.attackType = attackType;
    circleElement.dataset.angle = 360;
    circleElement.dataset.range = range;
    
    // Calculate dimensions (diameter is 2x range)
    const diameter = range * 2 * TILE_SIZE;
    
    // Position at the center of the attacker's tile
    const centerX = attacker.x * TILE_SIZE + TILE_SIZE / 2;
    const centerY = attacker.y * TILE_SIZE + TILE_SIZE / 2;
    
    // Set circle dimensions and position
    circleElement.style.width = `${diameter}px`;
    circleElement.style.height = `${diameter}px`;
    circleElement.style.borderRadius = '50%';
    circleElement.style.position = 'absolute';
    circleElement.style.left = `${centerX - diameter/2}px`;
    circleElement.style.top = `${centerY - diameter/2}px`;
    
    // Ensure proper zIndex
    circleElement.style.zIndex = '95';
    
    // Set opacity for better visibility
    circleElement.style.opacity = '0.7';
    
    return circleElement;
}

/**
 * Create a wide cone indicator for angles >= 180 degrees
 */
function createWideConeIndicator(attacker, target, range, angle, attackType, coneId) {
    // Create an SVG element for the wide cone
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    
    // Convert range to pixels (diameter)
    const diameter = range * 2 * TILE_SIZE;
    
    // Set SVG attributes
    svg.setAttribute("width", diameter);
    svg.setAttribute("height", diameter);
    svg.setAttribute("id", coneId);
    svg.classList.add("attack-cone", "wide-cone", `${attackType}-cone`);
    svg.dataset.attackType = attackType;
    svg.dataset.angle = angle;
    svg.dataset.range = range;
    
    // Calc center position (center of attacker's tile)
    const centerX = attacker.x * TILE_SIZE + TILE_SIZE / 2;
    const centerY = attacker.y * TILE_SIZE + TILE_SIZE / 2;
    
    // Position SVG centered on attacker
    svg.style.position = "absolute";
    svg.style.left = `${centerX - diameter/2}px`;
    svg.style.top = `${centerY - diameter/2}px`;
    svg.style.zIndex = "95";
    svg.style.opacity = "0.7";
    svg.style.pointerEvents = "none";
    
    // Calculate direction vector for rotation
    const dx = target.x - attacker.x;
    const dy = target.y - attacker.y;
    const directionAngle = Math.atan2(dy, dx) * 180 / Math.PI;
    
    // Create a sector path for the cone
    const path = document.createElementNS(svgNS, "path");
    
    // SVG sector calculations
    const svgCenterX = diameter / 2;
    const svgCenterY = diameter / 2;
    const radius = diameter / 2;
    
    // Calculate start and end angles for the sector
    const startAngle = -angle / 2;
    const endAngle = angle / 2;
    
    // Convert to radians for calculations
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    
    // Calculate points on the circle edge
    const x1 = svgCenterX + radius * Math.cos(startRad);
    const y1 = svgCenterY + radius * Math.sin(startRad);
    const x2 = svgCenterX + radius * Math.cos(endRad);
    const y2 = svgCenterY + radius * Math.sin(endRad);
    
    // Create path data: M=moveto center, L=lineto first point, A=arc to second point, Z=closepath
    // Arc parameters: rx ry x-rotation large-arc-flag sweep-flag x y
    const d = `M ${svgCenterX},${svgCenterY} L ${x1},${y1} A ${radius},${radius} 0 ${
        angle > 180 ? 1 : 0
    },1 ${x2},${y2} Z`;
    
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
        default:
            fillColor = "rgba(255, 100, 100, 0.3)";
            strokeColor = "rgba(255, 100, 100, 0.6)";
    }
    
    path.setAttribute("fill", fillColor);
    path.setAttribute("stroke", strokeColor);
    path.setAttribute("stroke-width", "1");
    
    // Add path to SVG
    svg.appendChild(path);
    
    // Rotate the SVG to match target direction
    // The -90 adjustment is because SVG 0° is East, while the game 0° might be different
    svg.style.transformOrigin = `${svgCenterX}px ${svgCenterY}px`;
    svg.style.transform = `rotate(${directionAngle - 90}deg)`;
    
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
    
    // Check all characters on the battlefield
    for (const charId in characterPositions) {
        const charPos = characterPositions[charId];
        
        // Skip defeated characters
        if (charPos.isDefeated) continue;
        
        // Check if this character is within the cone
        if (isPositionInCone(attacker, targetPos, charPos, range, angle)) {
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
        
        /* Standard cone styling (less than 180 degrees) */
        .standard-cone {
            clip-path: polygon(0 50%, 100% 0, 100% 100%);
            background-color: rgba(255, 255, 255, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.4);
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
        .default-cone, .default-highlight {
            background-color: rgba(255, 100, 100, 0.3);
            border-color: rgba(255, 100, 100, 0.5);
        }
        
        /* Specific attack type cones */
        .giftpuder-cone, .giftpuder-highlight {
            background-color: rgba(175, 106, 175, 0.3);
            border-color: rgba(175, 106, 175, 0.6);
        }
        
        .schlafpuder-cone, .schlafpuder-highlight {
            background-color: rgba(135, 206, 250, 0.3);
            border-color: rgba(135, 206, 250, 0.6);
        }
        
        .stachelspore-cone, .stachelspore-highlight {
            background-color: rgba(144, 238, 144, 0.3);
            border-color: rgba(144, 238, 144, 0.6);
        }
        
        .sandwirbel-cone, .sandwirbel-highlight {
            background-color: rgba(210, 180, 140, 0.3);
            border-color: rgba(210, 180, 140, 0.6);
        }
    `;
    
    // Add to document head
    document.head.appendChild(styleElement);
}