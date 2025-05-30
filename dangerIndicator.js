/**
 * dangerIndicator.js - A reusable system for displaying danger areas on the battlefield
 * This module provides functions to create visual indicators for dangerous areas
 * that Pokemon should avoid.
 */

import { TILE_SIZE } from './config.js';

/**
 * Create a danger indicator covering a specified area
 * @param {Array} targetTiles - Array of {x, y} coordinates for tiles to mark
 * @param {Object} options - Additional options
 * @param {string} options.color - Color of the indicator (default: 'red')
 * @param {number} options.opacity - Opacity of the indicator (default: 0.3)
 * @param {number} options.duration - How long to display the indicator in ms (default: 1000)
 * @param {Function} options.onComplete - Callback when indicator times out
 * @returns {Object} - The created indicator with methods to control it
 */
export function createDangerIndicator(targetTiles, options = {}) {
    // Default options
    const color = options.color || 'rgba(255, 0, 0, 0.5)';
    const opacity = options.opacity || 0.3;
    const duration = options.duration || 1000;
    const onComplete = options.onComplete || null;
    
    // Create a container element
    const container = document.createElement('div');
    container.className = 'danger-indicator-container';
    
    // Add styles for positioning
    container.style.position = 'absolute';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.pointerEvents = 'none';
    container.style.zIndex = '150'; // Above battlefield but below UI
    
    // Create indicator elements for each tile
    const indicators = [];
    targetTiles.forEach(tile => {
        const indicator = document.createElement('div');
        indicator.className = 'danger-indicator';
        
        // Position over the tile
        indicator.style.position = 'absolute';
        indicator.style.left = `${tile.x * TILE_SIZE}px`;
        indicator.style.top = `${tile.y * TILE_SIZE}px`;
        indicator.style.width = `${TILE_SIZE}px`;
        indicator.style.height = `${TILE_SIZE}px`;
        
        // Set appearance
        indicator.style.backgroundColor = color;
        indicator.style.opacity = opacity;
        indicator.style.borderRadius = '3px';
        indicator.style.boxShadow = `0 0 5px ${color}`;
        indicator.style.transition = 'all 0.2s ease-in-out';
        
        // Add to container
        container.appendChild(indicator);
        indicators.push(indicator);
    });
    
    // Add to battlefield
    const battlefield = document.querySelector('.battlefield-grid');
    if (!battlefield) {
        console.error('Could not find battlefield element for danger indicator');
        return null;
    }
    battlefield.appendChild(container);
    
    // Set up timeout for removal
    let timeoutId = null;
    if (duration > 0) {
        timeoutId = setTimeout(() => {
            removeIndicator();
            if (onComplete) onComplete();
        }, duration);
    }
    
    // Function to remove the indicator
    function removeIndicator() {
        if (container.parentNode) {
            container.parentNode.removeChild(container);
        }
        if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }
    }
    
    // Return object with methods to control the indicator
    return {
        container,
        indicators,
        remove: removeIndicator,
        update(newTargetTiles) {
            // Remove existing indicators
            indicators.forEach(indicator => {
                if (indicator.parentNode) {
                    indicator.parentNode.removeChild(indicator);
                }
            });
            indicators.length = 0;
            
            // Create new indicators
            newTargetTiles.forEach(tile => {
                const indicator = document.createElement('div');
                indicator.className = 'danger-indicator';
                
                // Position over the tile
                indicator.style.position = 'absolute';
                indicator.style.left = `${tile.x * TILE_SIZE}px`;
                indicator.style.top = `${tile.y * TILE_SIZE}px`;
                indicator.style.width = `${TILE_SIZE}px`;
                indicator.style.height = `${TILE_SIZE}px`;
                
                // Set appearance
                indicator.style.backgroundColor = color;
                indicator.style.opacity = opacity;
                indicator.style.borderRadius = '3px';
                indicator.style.boxShadow = `0 0 5px ${color}`;
                
                // Add to container
                container.appendChild(indicator);
                indicators.push(indicator);
            });
        }
    };
}

/**
 * Create a square danger area centered on a target position
 * @param {Object} centerPos - Center position {x, y}
 * @param {number} size - Size of the square (must be odd number)
 * @param {Object} options - Additional options (see createDangerIndicator)
 * @returns {Object} - The created indicator
 */
export function createSquareDangerArea(centerPos, size, options = {}) {
    // Ensure size is odd
    if (size % 2 === 0) {
        console.warn('Square danger area size should be odd, adjusting...');
        size += 1;
    }
    
    // Calculate radius (half size, rounded down)
    const radius = Math.floor(size / 2);
    
    // Generate tiles around center
    const targetTiles = [];
    for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
            targetTiles.push({
                x: centerPos.x + dx,
                y: centerPos.y + dy
            });
        }
    }
    
    return createDangerIndicator(targetTiles, options);
}

/**
 * Create a circular danger area centered on a target position
 * @param {Object} centerPos - Center position {x, y}
 * @param {number} radius - Radius of the circle in tiles
 * @param {Object} options - Additional options (see createDangerIndicator)
 * @returns {Object} - The created indicator
 */
export function createCircularDangerArea(centerPos, radius, options = {}) {
    // Generate tiles within radius
    const targetTiles = [];
    const radiusSquared = radius * radius;
    
    for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
            // Use Pythagorean theorem to check if within radius
            if (dx * dx + dy * dy <= radiusSquared) {
                targetTiles.push({
                    x: centerPos.x + dx,
                    y: centerPos.y + dy
                });
            }
        }
    }
    
    return createDangerIndicator(targetTiles, options);
}

/**
 * Create a line danger area from source to target
 * @param {Object} sourcePos - Source position {x, y}
 * @param {Object} targetPos - Target position {x, y}
 * @param {number} width - Width of the line in tiles (default: 1)
 * @param {Object} options - Additional options (see createDangerIndicator)
 * @returns {Object} - The created indicator
 */
export function createLineDangerArea(sourcePos, targetPos, width = 1, options = {}) {
    // Bresenham's line algorithm to get tiles in line
    const targetTiles = [];
    const dx = Math.abs(targetPos.x - sourcePos.x);
    const dy = Math.abs(targetPos.y - sourcePos.y);
    const sx = sourcePos.x < targetPos.x ? 1 : -1;
    const sy = sourcePos.y < targetPos.y ? 1 : -1;
    let err = dx - dy;
    
    let x = sourcePos.x;
    let y = sourcePos.y;
    
    while (true) {
        // Add tiles within width of the main line
        if (width > 1) {
            const halfWidth = Math.floor(width / 2);
            for (let wx = -halfWidth; wx <= halfWidth; wx++) {
                for (let wy = -halfWidth; wy <= halfWidth; wy++) {
                    // Only add if within width distance from line
                    if (wx * wx + wy * wy <= halfWidth * halfWidth) {
                        targetTiles.push({ x: x + wx, y: y + wy });
                    }
                }
            }
        } else {
            targetTiles.push({ x, y });
        }
        
        if (x === targetPos.x && y === targetPos.y) break;
        
        const e2 = 2 * err;
        if (e2 > -dy) {
            err -= dy;
            x += sx;
        }
        if (e2 < dx) {
            err += dx;
            y += sy;
        }
    }
    
    return createDangerIndicator(targetTiles, options);
}