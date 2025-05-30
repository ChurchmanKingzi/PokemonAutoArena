/**
 * Pokemon Overlay System - Renders all Pokemon sprites above the battlefield
 * This replaces the old system of placing Pokemon within individual tiles
 * Updated to maintain consistent Pokemon sprite sizes across all arena sizes
 * Now includes status effect icon management
 */

import { TILE_SIZE, GRID_SIZE } from './config.js';
import { calculateSizeCategory } from './pokemonSizeCalculator.js';
import { getStrategyText, getStrategyBorderStyle, getTeamColor, getCurrentKP } from './utils.js';

// Store the overlay container reference
let pokemonOverlayContainer = null;

// Constants for consistent Pokemon sizing
const BASELINE_TILE_SIZE = 20; // Reference tile size (from Mittel arena)
const BASE_POKEMON_SIZE = BASELINE_TILE_SIZE; // Base size for size category 1 Pokemon

// Helper function to get character positions (to avoid circular imports)
async function getCharacterPositions() {
    try {
        const { getCharacterPositions } = await import('./characterPositions.js');
        return getCharacterPositions();
    } catch (error) {
        console.warn('Could not import character positions:', error);
        return {};
    }
}

/**
 * Create the Pokemon overlay container
 * @param {HTMLElement} battlefieldGrid - The battlefield grid element to attach the overlay to
 * @returns {HTMLElement} - The overlay container element
 */
export function createPokemonOverlay(battlefieldGrid = null) {
    // Remove existing overlay if it exists
    if (pokemonOverlayContainer) {
        pokemonOverlayContainer.remove();
    }
    
    // Create the overlay container
    pokemonOverlayContainer = document.createElement('div');
    pokemonOverlayContainer.className = 'pokemon-overlay';
    pokemonOverlayContainer.style.position = 'absolute';
    pokemonOverlayContainer.style.top = '0';
    pokemonOverlayContainer.style.left = '0';
    pokemonOverlayContainer.style.width = '100%';
    pokemonOverlayContainer.style.height = '100%';
    pokemonOverlayContainer.style.pointerEvents = 'none'; // Allow clicks to pass through
    pokemonOverlayContainer.style.zIndex = '50'; // Above battlefield tiles but below projectiles
    pokemonOverlayContainer.style.overflow = 'visible';
    
    // If a battlefield grid is provided, attach the overlay directly to it
    // This ensures the overlay transforms with the camera
    if (battlefieldGrid) {
        battlefieldGrid.appendChild(pokemonOverlayContainer);
    }
    
    return pokemonOverlayContainer;
}

/**
 * Get the Pokemon overlay container
 * @returns {HTMLElement|null} - The overlay container or null if not created
 */
export function getPokemonOverlay() {
    return pokemonOverlayContainer;
}

/**
 * Create a Pokemon sprite element with proper positioning and styling
 * @param {string} charId - Character ID
 * @param {Object} pokemonData - Pokemon position and character data
 * @param {number} teamIndex - Team index for styling
 * @returns {HTMLElement} - The Pokemon sprite element
 */
export function createPokemonSprite(charId, pokemonData, teamIndex) {
    const character = pokemonData.character;
    const strategy = character.strategy || 'aggressive';
    
    // Create sprite element
    const sprite = document.createElement('img');
    sprite.src = character.spriteUrl || `Sprites/spr_mage${character.spriteNum || 1}.png`;
    sprite.alt = character.name;
    sprite.className = 'pokemon-sprite';
    sprite.title = `${character.name} [${getStrategyText(strategy)}]`;
    sprite.style.objectFit = 'contain';
    sprite.style.position = 'absolute';
    sprite.style.pointerEvents = 'auto'; // Enable interactions with sprites
    sprite.style.cursor = 'pointer';
    sprite.style.transition = 'all 0.15s ease-out';
    sprite.style.transformOrigin = 'center center';
    
    // Error handling for sprite loading
    sprite.onerror = function() {
        this.src = `Sprites/spr_mage${character.spriteNum || 1}.png`;
    };
    
    // Add data attributes for identification
    sprite.dataset.characterId = charId;
    sprite.dataset.team = teamIndex;
    sprite.dataset.strategy = strategy;
    
    // Apply team-specific border styling
    const borderStyle = getStrategyBorderStyle(strategy);
    sprite.style.border = `1px ${borderStyle.style} ${getTeamColor(teamIndex)}`;
    if (borderStyle.width) {
        sprite.style.borderWidth = borderStyle.width;
    }
    sprite.style.borderRadius = '50%';
    sprite.style.boxSizing = 'border-box';
    
    // Calculate and apply size
    const sizeCategory = calculateSizeCategory(character);
    applySizeToSprite(sprite, sizeCategory);
    
    // Position the sprite based on grid coordinates
    positionPokemonSprite(sprite, pokemonData.x, pokemonData.y, sizeCategory);
    
    return sprite;
}

/**
 * Apply size category styling to a Pokemon sprite
 * Now properly scales with arena size to maintain consistent relative sizes
 * @param {HTMLElement} sprite - The sprite element
 * @param {number} sizeCategory - Size category (1, 2, 3, etc.)
 */
export function applySizeToSprite(sprite, sizeCategory) {
    sprite.dataset.sizeCategory = sizeCategory;
    
    // Calculate sprite size based on current tile size relative to baseline
    // This ensures Pokemon maintain their relative size across all arena sizes
    const scaleFactor = TILE_SIZE / BASELINE_TILE_SIZE;
    const spriteSize = scaleFactor * BASE_POKEMON_SIZE * sizeCategory;
    
    // Apply size
    sprite.style.width = `${spriteSize}px`;
    sprite.style.height = `${spriteSize}px`;
    
    // Set z-index based on size (larger Pokemon appear above smaller ones)
    sprite.style.zIndex = `${50 + sizeCategory}`;
    
    // Add size-specific styling (keep border width constant, only scale shadows)
    const shadowSize = Math.max(5, Math.round(scaleFactor * 10));
    
    if (sizeCategory >= 2) {
        sprite.style.borderWidth = '3px'; // Constant border width
        sprite.style.boxShadow = `0 0 ${shadowSize}px rgba(255, 215, 0, 0.5)`;
    }
    if (sizeCategory >= 3) {
        sprite.style.boxShadow = `0 0 ${shadowSize}px rgba(255, 140, 0, 0.6)`;
    }
    if (sizeCategory >= 4) {
        sprite.style.borderWidth = '4px'; // Constant border width
        sprite.style.boxShadow = `0 0 ${Math.round(shadowSize * 1.2)}px rgba(255, 69, 0, 0.7)`;
    }
    if (sizeCategory >= 5) {
        sprite.style.boxShadow = `0 0 ${Math.round(shadowSize * 1.5)}px rgba(255, 0, 0, 0.8)`;
    }
    
    // Add size class for CSS styling
    sprite.classList.add(`pokemon-size-${sizeCategory}`);
}

/**
 * Position a Pokemon sprite based on grid coordinates
 * @param {HTMLElement} sprite - The sprite element
 * @param {number} gridX - Grid X coordinate
 * @param {number} gridY - Grid Y coordinate
 * @param {number} sizeCategory - Size category for centering
 */
export function positionPokemonSprite(sprite, gridX, gridY, sizeCategory = 1) {
    // Calculate pixel position (center of the tile)
    const pixelX = (gridX * TILE_SIZE) + (TILE_SIZE / 2);
    const pixelY = (gridY * TILE_SIZE) + (TILE_SIZE / 2);
    
    // Position sprite with center alignment
    sprite.style.left = `${pixelX}px`;
    sprite.style.top = `${pixelY}px`;
    sprite.style.transform = 'translate(-50%, -50%)';
    
    // Store grid position for easy access
    sprite.dataset.gridX = gridX;
    sprite.dataset.gridY = gridY;
}

/**
 * Add a Pokemon to the overlay
 * @param {string} charId - Character ID
 * @param {Object} pokemonData - Pokemon position and character data
 * @param {number} teamIndex - Team index
 */
export function addPokemonToOverlay(charId, pokemonData, teamIndex) {
    if (!pokemonOverlayContainer) {
        console.error('Pokemon overlay container not created');
        return null;
    }
    
    // Create the sprite
    const sprite = createPokemonSprite(charId, pokemonData, teamIndex);
    
    // Add to overlay
    pokemonOverlayContainer.appendChild(sprite);
    
    // Create HP bar for this Pokemon
    createPokemonHPBar(sprite, charId, pokemonData.character);
    
    // Create status effect icons for this Pokemon
    createPokemonStatusIcons(sprite, charId, pokemonData.character);
    
    return sprite;
}

/**
 * Update the HP bar display for a Pokemon
 * @param {HTMLElement} hpBarElement - The HP bar element
 * @param {Object} character - Character data
 */
function updatePokemonHPBarDisplay(hpBarElement, character) {
    
    // Get current KP using the utility function (this handles initialization)
    const currentKP = getCurrentKP(character);
    
    // Get max KP (should be set by getCurrentKP if not already set)
    const maxKP = character.maxKP || character.combatStats?.kp || 10;
    
    // Calculate HP percentage
    const hpPercent = Math.max(0, Math.min(100, (currentKP / maxKP) * 100));
    
    // Update HP bar width
    hpBarElement.style.width = `${hpPercent}%`;
    
    // Update color based on HP percentage
    if (hpPercent <= 25) {
        hpBarElement.style.backgroundColor = '#e74c3c'; // Red for critical health
    } else if (hpPercent <= 50) {
        hpBarElement.style.backgroundColor = '#f39c12'; // Orange for medium health
    } else {
        hpBarElement.style.backgroundColor = '#2ecc71'; // Green for good health
    }
}

/**
 * Update a specific Pokemon's HP bar based on current HP
 * @param {string} charId - Character ID
 */
export async function updatePokemonHPBar(charId) {
    const sprite = getPokemonSprite(charId);
    if (!sprite || !sprite.hpBarElement) {
        return;
    }
    
    // Get the character data
    const characterPositions = await getCharacterPositions();
    const charData = characterPositions[charId];
    if (!charData || !charData.character) {
        return;
    }
    
    // Update the HP bar display
    updatePokemonHPBarDisplay(sprite.hpBarElement, charData.character);
}

/**
 * Update all Pokemon HP bars
 */
export async function updateAllPokemonHPBars() {
    const characterPositions = await getCharacterPositions();
    for (const charId in characterPositions) {
        await updatePokemonHPBar(charId);
    }
}

/**
 * Create an HP bar for a Pokemon sprite
 * Now properly scales with arena size
 * @param {HTMLElement} sprite - The Pokemon sprite element
 * @param {string} charId - Character ID
 * @param {Object} character - Character data
 */
function createPokemonHPBar(sprite, charId, character) {
    // Get sprite dimensions for sizing (now properly scaled with arena)
    const spriteWidth = parseFloat(sprite.style.width) || (TILE_SIZE * 1); // fallback to tile size
    
    // Create HP bar container
    const hpBarContainer = document.createElement('div');
    hpBarContainer.className = 'pokemon-hp-bar-container';
    hpBarContainer.dataset.characterId = charId;
    hpBarContainer.style.position = 'absolute';
    hpBarContainer.style.width = `${spriteWidth * 0.75}px`; // 75% of sprite width
    hpBarContainer.style.height = `${Math.max(4, Math.round(TILE_SIZE * 0.3))}px`; // Scale height with tile size
    hpBarContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    hpBarContainer.style.borderRadius = `${Math.max(2, Math.round(TILE_SIZE * 0.15))}px`; // Scale border radius
    hpBarContainer.style.overflow = 'hidden';
    hpBarContainer.style.pointerEvents = 'none';
    hpBarContainer.style.border = '1px solid rgba(0, 0, 0, 0.3)';
    hpBarContainer.style.transition = 'all 0.15s ease-out'; // Match sprite transition
    
    // Create HP bar
    const hpBar = document.createElement('div');
    hpBar.className = 'pokemon-hp-bar';
    hpBar.style.height = '100%';
    hpBar.style.transition = 'width 0.3s ease, background-color 0.3s ease';
    
    // Calculate and set initial HP
    updatePokemonHPBarDisplay(hpBar, character);
    
    hpBarContainer.appendChild(hpBar);
    
    // Position HP bar above the sprite (using scaling that matches sprite scaling)
    const updateHPBarPosition = () => {
        const spriteLeft = parseFloat(sprite.style.left);
        const spriteTop = parseFloat(sprite.style.top);
        const sizeCategory = parseInt(sprite.dataset.sizeCategory) || 1;
        
        // Calculate Y offset based on current tile size for consistent positioning
        const scaleFactor = TILE_SIZE / BASELINE_TILE_SIZE;
        const yOffset = scaleFactor * BASE_POKEMON_SIZE * 0.75 + (sizeCategory * scaleFactor * 5);
        
        hpBarContainer.style.left = `${spriteLeft}px`;
        hpBarContainer.style.top = `${spriteTop - yOffset}px`;
        hpBarContainer.style.transform = 'translateX(-50%)'; // Center horizontally
    };
    
    // Initial positioning
    updateHPBarPosition();
    
    // Add to overlay (same parent as sprite)
    pokemonOverlayContainer.appendChild(hpBarContainer);
    
    // Store references for updates
    sprite.updateHPBar = updateHPBarPosition;
    sprite.hpBarContainer = hpBarContainer;
    sprite.hpBarElement = hpBar;
}

/**
 * Create status effect icons for a Pokemon sprite
 * Positions them above the HP bar and scales with size category
 * @param {HTMLElement} sprite - The Pokemon sprite element
 * @param {string} charId - Character ID
 * @param {Object} character - Character data
 */
function createPokemonStatusIcons(sprite, charId, character) {
    // Create status icons container
    const statusIconsContainer = document.createElement('div');
    statusIconsContainer.className = 'pokemon-status-icons-container';
    statusIconsContainer.dataset.characterId = charId;
    statusIconsContainer.style.position = 'absolute';
    statusIconsContainer.style.pointerEvents = 'none';
    statusIconsContainer.style.zIndex = '1500'; // Below damage numbers (9000) but above most other elements
    statusIconsContainer.style.display = 'flex';
    statusIconsContainer.style.flexDirection = 'row';
    statusIconsContainer.style.gap = '2px';
    statusIconsContainer.style.alignItems = 'center';
    statusIconsContainer.style.justifyContent = 'center';
    statusIconsContainer.style.transition = 'all 0.15s ease-out'; // Match sprite transition
    
    // Position status icons above the HP bar
    const updateStatusIconsPosition = () => {
        const spriteLeft = parseFloat(sprite.style.left);
        const spriteTop = parseFloat(sprite.style.top);
        const sizeCategory = parseInt(sprite.dataset.sizeCategory) || 1;
        
        // Calculate Y offset - position above HP bar
        const scaleFactor = TILE_SIZE / BASELINE_TILE_SIZE;
        const hpBarOffset = scaleFactor * BASE_POKEMON_SIZE * 0.75 + (sizeCategory * scaleFactor * 5);
        const statusIconOffset = Math.max(15, Math.round(scaleFactor * 20 + sizeCategory * 5)); // Additional offset above HP bar
        const totalOffset = hpBarOffset + statusIconOffset;
        
        statusIconsContainer.style.left = `${spriteLeft}px`;
        statusIconsContainer.style.top = `${spriteTop - totalOffset}px`;
        statusIconsContainer.style.transform = 'translateX(-50%)'; // Center horizontally
    };
    
    // Initial positioning
    updateStatusIconsPosition();
    
    // Add to overlay
    pokemonOverlayContainer.appendChild(statusIconsContainer);
    
    // Store references for updates
    sprite.updateStatusIcons = updateStatusIconsPosition;
    sprite.statusIconsContainer = statusIconsContainer;
    
    // Initialize with current status effects
    updatePokemonStatusIconsDisplay(sprite, character);
}

/**
 * Update the status icons display for a Pokemon
 * @param {HTMLElement} sprite - The Pokemon sprite element
 * @param {Object} character - Character data
 */
function updatePokemonStatusIconsDisplay(sprite, character) {
    if (!sprite.statusIconsContainer) return;
    
    const container = sprite.statusIconsContainer;
    const sizeCategory = parseInt(sprite.dataset.sizeCategory) || 1;
    
    // Clear existing icons
    container.innerHTML = '';
    
    // Hide container if no status effects
    if (!character.statusEffects || character.statusEffects.length === 0) {
        container.style.display = 'none';
        return;
    }
    
    container.style.display = 'flex';
    
    // Calculate icon size based on Pokemon size category and arena scaling
    const scaleFactor = TILE_SIZE / BASELINE_TILE_SIZE;
    const baseIconSize = Math.max(12, Math.round(6 * scaleFactor)); // Base size scaled with arena
    const iconSize = baseIconSize + (sizeCategory - 1) * Math.max(2, Math.round(2 * scaleFactor)); // Bigger for larger Pokemon
    
    // Create icon for each status effect
    character.statusEffects.forEach(effect => {
        const iconEl = document.createElement('div');
        iconEl.className = `status-effect-icon ${effect.cssClass}`;
        iconEl.title = `${effect.name}: ${effect.effect}`;
        
        // Base styling
        iconEl.style.width = `${iconSize}px`;
        iconEl.style.height = `${iconSize}px`;
        iconEl.style.borderRadius = '50%';
        iconEl.style.display = 'flex';
        iconEl.style.alignItems = 'center';
        iconEl.style.justifyContent = 'center';
        iconEl.style.fontSize = `${Math.max(8, Math.round(iconSize * 0.7))}px`;
        iconEl.style.fontWeight = 'bold';
        iconEl.style.textShadow = '0 0 2px rgba(0, 0, 0, 0.8)';
        iconEl.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        iconEl.style.border = '1px solid rgba(255, 255, 255, 0.3)';
        iconEl.style.boxShadow = '0 0 3px rgba(0, 0, 0, 0.5)';
        iconEl.style.transition = 'all 0.2s ease';
        
        // Special styling for different status effects
        switch (effect.id) {
            case 'poisoned':
                iconEl.style.backgroundColor = 'rgba(106, 13, 173, 0.8)'; // Purple
                iconEl.style.color = '#ffffff';
                iconEl.textContent = effect.htmlSymbol; // ☠
                break;
            case 'badly-poisoned':
                iconEl.style.backgroundColor = 'rgba(75, 0, 130, 0.8)'; // Darker purple
                iconEl.style.color = '#ffffff';
                iconEl.textContent = effect.htmlSymbol; // ☠+
                iconEl.style.fontSize = `${Math.max(6, Math.round(iconSize * 0.5))}px`; // Smaller font for the + symbol
                break;
            case 'burned':
                iconEl.style.backgroundColor = 'rgba(255, 69, 0, 0.8)'; // Orange-red
                iconEl.style.color = '#ffff00'; // Yellow
                iconEl.textContent = effect.htmlSymbol; // 🔥
                break;
            case 'asleep':
                iconEl.style.backgroundColor = 'rgba(135, 206, 250, 0.8)'; // Light blue
                iconEl.style.color = '#ffffff';
                iconEl.textContent = effect.htmlSymbol; // ☁
                break;
            case 'paralyzed':
                iconEl.style.backgroundColor = 'rgba(255, 215, 0, 0.8)'; // Gold
                iconEl.style.color = '#000000';
                iconEl.textContent = effect.htmlSymbol; // ⚡
                break;
            case 'frozen':
                iconEl.style.backgroundColor = 'rgba(176, 224, 230, 0.8)'; // Light cyan
                iconEl.style.color = '#000080'; // Dark blue
                iconEl.textContent = effect.htmlSymbol; // ❄
                break;
            case 'confused':
                iconEl.style.backgroundColor = 'rgba(255, 192, 203, 0.8)'; // Light pink
                iconEl.style.color = '#800080'; // Purple
                iconEl.textContent = effect.htmlSymbol; // ?
                break;
            case 'cursed':
                iconEl.style.backgroundColor = 'rgba(75, 0, 130, 0.8)'; // Indigo
                iconEl.style.color = '#ffffff';
                iconEl.textContent = effect.htmlSymbol; // 👻
                break;
            case 'infatuated':
                iconEl.style.backgroundColor = 'rgba(255, 105, 180, 0.8)'; // Hot pink
                iconEl.style.color = '#ffffff';
                iconEl.textContent = effect.htmlSymbol; // ♥
                break;
            case 'held':
                iconEl.style.backgroundColor = 'rgba(105, 105, 105, 0.8)'; // Dim gray
                iconEl.style.color = '#ffffff';
                iconEl.textContent = effect.htmlSymbol; // ⚓
                break;
            case 'seeded':
                iconEl.style.backgroundColor = 'rgba(34, 139, 34, 0.8)'; // Forest green
                iconEl.style.color = '#ffffff';
                iconEl.textContent = effect.htmlSymbol; // 🌿
                break;
            case 'snared':
                iconEl.style.backgroundColor = 'rgba(139, 69, 19, 0.8)'; // Saddle brown
                iconEl.style.color = '#ffffff';
                iconEl.textContent = effect.htmlSymbol; // 🕸️
                break;
            default:
                iconEl.style.backgroundColor = 'rgba(128, 128, 128, 0.8)'; // Default gray
                iconEl.style.color = '#ffffff';
                iconEl.textContent = effect.htmlSymbol || '?';
        }
        
        container.appendChild(iconEl);
    });
}

/**
 * Update a specific Pokemon's status icons based on current status effects
 * @param {string} charId - Character ID
 */
export async function updatePokemonStatusIcons(charId) {
    const sprite = getPokemonSprite(charId);
    if (!sprite || !sprite.statusIconsContainer) {
        return;
    }
    
    // Get the character data
    const characterPositions = await getCharacterPositions();
    const charData = characterPositions[charId];
    if (!charData || !charData.character) {
        return;
    }
    
    // Update the status icons display
    updatePokemonStatusIconsDisplay(sprite, charData.character);
}

/**
 * Update all Pokemon status icons
 */
export async function updateAllPokemonStatusIcons() {
    const characterPositions = await getCharacterPositions();
    for (const charId in characterPositions) {
        await updatePokemonStatusIcons(charId);
    }
}

/**
 * Update Pokemon sprite position
 * @param {string} charId - Character ID
 * @param {number} newX - New grid X coordinate
 * @param {number} newY - New grid Y coordinate
 */
export function updatePokemonPosition(charId, newX, newY) {
    const sprite = pokemonOverlayContainer?.querySelector(`[data-character-id="${charId}"]`);
    if (!sprite) {
        console.warn(`Pokemon sprite not found for character ID: ${charId}`);
        return;
    }
    
    const sizeCategory = parseInt(sprite.dataset.sizeCategory) || 1;
    positionPokemonSprite(sprite, newX, newY, sizeCategory);
    
    // Update HP bar position (this ensures HP bar follows the Pokemon)
    if (sprite.updateHPBar) {
        sprite.updateHPBar();
    }
    
    // Update status icons position (this ensures status icons follow the Pokemon)
    if (sprite.updateStatusIcons) {
        sprite.updateStatusIcons();
    }
}

/**
 * Remove a Pokemon from the overlay
 * @param {string} charId - Character ID
 */
export function removePokemonFromOverlay(charId) {
    if (!pokemonOverlayContainer) return;
    
    // Remove sprite elements
    const sprite = pokemonOverlayContainer.querySelector(`[data-character-id="${charId}"]`);
    if (sprite) {
        // Also remove the HP bar if it exists
        if (sprite.hpBarContainer && sprite.hpBarContainer.parentNode) {
            sprite.hpBarContainer.remove();
        }
        
        // Also remove the status icons if they exist
        if (sprite.statusIconsContainer && sprite.statusIconsContainer.parentNode) {
            sprite.statusIconsContainer.remove();
        }
    }
    
    // Fallback: Remove HP bar by selector (in case sprite reference is lost)
    const hpBar = pokemonOverlayContainer.querySelector(`.pokemon-hp-bar-container[data-character-id="${charId}"]`);
    if (hpBar) {
        hpBar.remove();
    }
    
    // Fallback: Remove status icons by selector (in case sprite reference is lost)
    const statusIcons = pokemonOverlayContainer.querySelector(`.pokemon-status-icons-container[data-character-id="${charId}"]`);
    if (statusIcons) {
        statusIcons.remove();
    }
}

/**
 * Get Pokemon sprite element by character ID
 * @param {string} charId - Character ID
 * @returns {HTMLElement|null} - Sprite element or null if not found
 */
export function getPokemonSprite(charId) {
    return pokemonOverlayContainer?.querySelector(`.pokemon-sprite[data-character-id="${charId}"]`) || null;
}

/**
 * Get all Pokemon sprites
 * @returns {NodeList} - List of all Pokemon sprites
 */
export function getAllPokemonSprites() {
    return pokemonOverlayContainer?.querySelectorAll('.pokemon-sprite') || [];
}

/**
 * Clear all Pokemon from the overlay
 */
export function clearPokemonOverlay() {
    if (pokemonOverlayContainer) {
        pokemonOverlayContainer.innerHTML = '';
    }
}

/**
 * Destroy the Pokemon overlay
 */
export function destroyPokemonOverlay() {
    if (pokemonOverlayContainer) {
        pokemonOverlayContainer.remove();
        pokemonOverlayContainer = null;
    }
}

/**
 * Update all Pokemon sprite sizes when tile size changes
 * Now properly scales all Pokemon to maintain relative sizes
 */
export function updateAllPokemonSizes() {
    const sprites = getAllPokemonSprites();
    sprites.forEach(sprite => {
        const charId = sprite.dataset.characterId;
        const gridX = parseInt(sprite.dataset.gridX);
        const gridY = parseInt(sprite.dataset.gridY);
        const sizeCategory = parseInt(sprite.dataset.sizeCategory) || 1;
        
        // Reapply size (now properly scales with current tile size)
        applySizeToSprite(sprite, sizeCategory);
        
        // Reposition with new tile size (for grid positioning)
        positionPokemonSprite(sprite, gridX, gridY, sizeCategory);
        
        // Update HP bar position and size
        if (sprite.updateHPBar) {
            sprite.updateHPBar();
        }
        
        // Update status icons position and size
        if (sprite.updateStatusIcons) {
            sprite.updateStatusIcons();
        }
    });
}

/**
 * Apply visual state to a Pokemon sprite
 * @param {string} charId - Character ID
 * @param {string} state - Visual state ('active', 'defeated', 'attacking', etc.)
 * @param {boolean} add - Whether to add (true) or remove (false) the state
 */
export function setPokemonSpriteState(charId, state, add = true) {
    const sprite = getPokemonSprite(charId);
    if (!sprite) return;
    
    if (add) {
        sprite.classList.add(state);
    } else {
        sprite.classList.remove(state);
    }
    
    // Special handling for defeated state
    if (state === 'defeated' && add) {
        sprite.style.filter = 'grayscale(100%) opacity(0.7)';
        sprite.style.transform = sprite.style.transform + ' rotate(90deg)';
        
        // Add defeat marker
        const defeatMarker = document.createElement('div');
        defeatMarker.className = 'defeat-marker';
        defeatMarker.style.position = 'absolute';
        defeatMarker.style.top = '0';
        defeatMarker.style.left = '0';
        defeatMarker.style.width = '100%';
        defeatMarker.style.height = '100%';
        defeatMarker.style.background = `
            linear-gradient(to top right, transparent 45%, rgba(255,0,0,0.8) 45%, rgba(255,0,0,0.8) 55%, transparent 55%),
            linear-gradient(to top left, transparent 45%, rgba(255,0,0,0.8) 45%, rgba(255,0,0,0.8) 55%, transparent 55%)
        `;
        defeatMarker.style.pointerEvents = 'none';
        defeatMarker.style.zIndex = '1';
        
        sprite.appendChild(defeatMarker);
    }
}