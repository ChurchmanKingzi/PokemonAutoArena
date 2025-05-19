/**
 * Minimap system for the Pokemon battle simulator
 * Displays a small overview of the battlefield in the top right corner
 */

import { GRID_SIZE, TILE_SIZE } from './config.js';
import { getTerrainGrid } from './terrainGenerator.js';
import { TERRAIN_COLORS } from './terrainRenderer.js';
import { getCharacterPositions } from './characterPositions.js';
import { getTeamColor } from './utils.js';
import { calculateSizeCategory } from './pokemonSizeCalculator.js';
import { getActiveProjectiles } from './projectileSystem.js';

// Configuration
const MINIMAP_SIZE = 300; // pixels
const MINIMAP_PADDING = 50; // pixels from the edge
const MINIMAP_OPACITY = 0.8;
const MIN_DOT_SIZE = 2; // minimum size for Pokemon dots
const MAX_DOT_SIZE = 6; // maximum size for Pokemon dots
const ACTIVE_SIZE_MULTIPLIER = 1.5; // active Pokemon are 50% larger
const ACTIVE_BRIGHTNESS_BOOST = 1.3; // active Pokemon are 30% brighter
const PROJECTILE_DOT_SIZE = 1.5; // size of projectile dots

// References
let minimapElement = null;
let minimapContext = null;
let updateInterval = null;

/**
 * Initialize the minimap system
 * @returns {boolean} - Whether initialization was successful
 */
export function initializeMinimapSystem() {
    // Create minimap canvas
    minimapElement = document.createElement('canvas');
    minimapElement.className = 'battlefield-minimap';
    minimapElement.width = MINIMAP_SIZE;
    minimapElement.height = MINIMAP_SIZE;
    
    // Style the minimap
    minimapElement.style.position = 'fixed'; // Fixed position to stay in view
    minimapElement.style.top = `${MINIMAP_PADDING}px`;
    minimapElement.style.right = `${MINIMAP_PADDING}px`;
    minimapElement.style.zIndex = '3000'; // Above everything
    minimapElement.style.opacity = MINIMAP_OPACITY;
    minimapElement.style.borderRadius = '5px';
    minimapElement.style.border = '1px solid rgba(0, 0, 0, 0.3)';
    minimapElement.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
    minimapElement.style.pointerEvents = 'none'; // Don't capture mouse events
    
    // Get the context for drawing
    minimapContext = minimapElement.getContext('2d');
    
    // Add the minimap to the body to ensure it's always on top
    document.body.appendChild(minimapElement);
    
    // Start the update loop
    startMinimapUpdates();
    
    // Add CSS for minimap pulsing animation
    addMinimapStyles();
    
    return true;
}

/**
 * Add necessary styles for the minimap
 */
function addMinimapStyles() {
    // Check if styles already exist
    if (document.getElementById('minimap-styles')) return;
    
    const styleEl = document.createElement('style');
    styleEl.id = 'minimap-styles';
    styleEl.textContent = `
        @keyframes minimap-pokemon-pulse {
            0% { transform: scale(0.9); }
            50% { transform: scale(1.1); }
            100% { transform: scale(0.9); }
        }
        
        .battlefield-minimap {
            backdrop-filter: blur(2px);
            background-color: rgba(255, 255, 255, 0.15);
        }
    `;
    
    document.head.appendChild(styleEl);
}

/**
 * Start the minimap update loop
 */
function startMinimapUpdates() {
    // Clear any existing interval
    if (updateInterval) {
        clearInterval(updateInterval);
    }
    
    // Set up the update interval (10 times per second)
    updateInterval = setInterval(updateMinimap, 100);
    
    // Do an immediate update
    updateMinimap();
}

/**
 * Update the minimap display
 */
function updateMinimap() {
    if (!minimapContext) return;
    
    // Clear the canvas
    minimapContext.clearRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);
    
    // Draw the background
    minimapContext.fillStyle = 'rgba(0, 0, 0, 0.2)';
    minimapContext.fillRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);
    
    // Draw terrain
    drawTerrain();
    
    // Draw characters
    drawCharacters();
    
    // Draw projectiles
    drawProjectiles();
}

/**
 * Draw the terrain on the minimap
 */
function drawTerrain() {
    const terrainGrid = getTerrainGrid();
    if (!terrainGrid || !terrainGrid.length) return;
    
    const tileSize = MINIMAP_SIZE / GRID_SIZE;
    
    // Draw each terrain tile
    for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
            const terrain = terrainGrid[y][x];
            
            // Use the base terrain color (not the checkerboard)
            minimapContext.fillStyle = TERRAIN_COLORS[terrain];
            
            // Draw the tile
            minimapContext.fillRect(
                x * tileSize, 
                y * tileSize, 
                tileSize, 
                tileSize
            );
        }
    }
}

/**
 * Draw the characters on the minimap
 */
function drawCharacters() {
    const characterPositions = getCharacterPositions();
    const tileSize = MINIMAP_SIZE / GRID_SIZE;
    
    // Find the active character
    let activeCharId = null;
    const activeCharacter = document.querySelector('.battlefield-character.active');
    if (activeCharacter) {
        activeCharId = activeCharacter.dataset.characterId;
    }
    
    // Draw each character
    for (const charId in characterPositions) {
        const charPos = characterPositions[charId];
        
        // Skip defeated characters
        if (charPos.isDefeated) continue;
        
        // Get team color
        const teamColor = getTeamColor(charPos.teamIndex);
        
        // Determine if this is the active character
        const isActive = (charId === activeCharId);
        
        // Calculate dot size based on Pokemon size
        const sizeCategory = calculateSizeCategory(charPos.character) || 1;
        
        // Scale dot size: size 1 = MIN_DOT_SIZE, size 5+ = MAX_DOT_SIZE
        let dotSize = MIN_DOT_SIZE + ((sizeCategory - 1) / 4) * (MAX_DOT_SIZE - MIN_DOT_SIZE);
        
        // Increase size for active character
        if (isActive) {
            dotSize *= ACTIVE_SIZE_MULTIPLIER;
        }
        
        // Draw pulsing effect - use current time for animation
        const pulseScale = 0.8 + (Math.sin(Date.now() / 500) + 1) * 0.1; // 0.8 to 1.0
        const finalDotSize = dotSize * pulseScale;
        
        // Determine the color with brightness adjustment for active character
        let color = teamColor;
        if (isActive) {
            // Make the color brighter for active character
            color = adjustBrightness(teamColor, ACTIVE_BRIGHTNESS_BOOST);
        }
        
        // Get center position
        const centerX = (charPos.x + 0.5) * tileSize;
        const centerY = (charPos.y + 0.5) * tileSize;
        
        // Draw the dot
        minimapContext.beginPath();
        minimapContext.arc(centerX, centerY, finalDotSize, 0, Math.PI * 2);
        minimapContext.fillStyle = color;
        minimapContext.fill();
        
        // Add a small border
        minimapContext.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        minimapContext.lineWidth = 0.5;
        minimapContext.stroke();
        
        // Add a glow effect for active Pokemon
        if (isActive) {
            // Draw an outer glow
            minimapContext.beginPath();
            minimapContext.arc(centerX, centerY, finalDotSize * 1.5, 0, Math.PI * 2);
            minimapContext.fillStyle = `${color}40`; // 25% opacity
            minimapContext.fill();
        }
    }
}

/**
 * Draw projectiles on the minimap
 */
function drawProjectiles() {
    try {
        const projectiles = getActiveProjectiles();
        if (!projectiles || !projectiles.length) return;
        
        const tileSize = MINIMAP_SIZE / GRID_SIZE;
        
        // Draw each projectile
        for (const projectile of projectiles) {
            // Skip if the projectile has been removed
            if (projectile.removed) continue;
            
            // Calculate position on minimap
            const x = (projectile.x / TILE_SIZE) * tileSize;
            const y = (projectile.y / TILE_SIZE) * tileSize;
            
            // Draw the projectile dot
            minimapContext.beginPath();
            minimapContext.arc(x, y, PROJECTILE_DOT_SIZE, 0, Math.PI * 2);
            minimapContext.fillStyle = 'rgba(200, 200, 200, 0.8)';
            minimapContext.fill();
        }
    } catch (error) {
        console.error("Error drawing projectiles on minimap:", error);
    }
}

/**
 * Adjust the brightness of a color
 * @param {string} color - Hex color string
 * @param {number} factor - Brightness factor (1.0 = no change)
 * @returns {string} - Adjusted color
 */
function adjustBrightness(color, factor) {
    // Skip if color is not a hex color
    if (!color || !color.startsWith('#')) return color;
    
    // Convert hex to RGB
    let r = parseInt(color.substr(1, 2), 16);
    let g = parseInt(color.substr(3, 2), 16);
    let b = parseInt(color.substr(5, 2), 16);
    
    // Adjust brightness
    r = Math.min(255, Math.round(r * factor));
    g = Math.min(255, Math.round(g * factor));
    b = Math.min(255, Math.round(b * factor));
    
    // Convert back to hex
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Cleanup the minimap system
 */
export function cleanupMinimapSystem() {
    if (updateInterval) {
        clearInterval(updateInterval);
        updateInterval = null;
    }
    
    if (minimapElement && minimapElement.parentNode) {
        minimapElement.parentNode.removeChild(minimapElement);
    }
    
    minimapElement = null;
    minimapContext = null;
}

/**
 * Toggle minimap visibility
 * @param {boolean} visible - Whether the minimap should be visible
 */
export function toggleMinimapVisibility(visible) {
    if (minimapElement) {
        minimapElement.style.display = visible ? 'block' : 'none';
    }
}