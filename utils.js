/**
 * Utility functions for the battle system
 */


import { TEAM_COLORS } from './config.js';

/**
 * Fisher-Yates shuffle algorithm
 * @param {Array} array - The array to shuffle
 * @returns {Array} - The shuffled array
 */
export function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

/**
 * Get text representation of a strategy
 * @param {string} strategy - The strategy code
 * @returns {string} - Human-readable strategy text
 */
export function getStrategyText(strategy) {
    switch (strategy) {
        case 'aggressive': return 'Aggressiv';
        case 'defensive': return 'Standhaft';
        case 'fleeing': return 'Fliehend';
        default: return 'Aggressiv';
    }
}

/**
 * Get border style for a character based on their strategy
 * @param {string} strategy - The strategy code
 * @returns {Object} - Border style properties
 */
export function getStrategyBorderStyle(strategy) {
    switch (strategy) {
        case 'aggressive': 
            return { style: 'solid', width: '3px' }; // Bold solid border for aggressive
        case 'defensive': 
            return { style: 'double', width: '3px' }; // Double border for defensive
        case 'fleeing': 
            return { style: 'dashed', width: '2px' }; // Dashed border for fleeing
        default: 
            return { style: 'solid' };
    }
}

/**
 * Get a color for a team
 * @param {number} teamIndex - The team index
 * @returns {string} - CSS color value
 */
export function getTeamColor(teamIndex) {
    // Import here to avoid circular dependencies
    
    // Return the color based on team index, cycle through colors if more teams than colors
    return TEAM_COLORS[teamIndex % TEAM_COLORS.length];
}

/**
 * Convert hex color to rgba
 * @param {string} hex - Hex color code
 * @param {number} opacity - Opacity value between 0 and 1
 * @returns {string} - RGBA color string
 */
export function hexToRgba(hex, opacity) {
    let r = 0, g = 0, b = 0;
    
    // Handle 3-digit hex
    if (hex.length === 4) {
        r = parseInt(hex[1] + hex[1], 16);
        g = parseInt(hex[2] + hex[2], 16);
        b = parseInt(hex[3] + hex[3], 16);
    } 
    // Handle 6-digit hex
    else if (hex.length === 7) {
        r = parseInt(hex.substring(1, 3), 16);
        g = parseInt(hex.substring(3, 5), 16);
        b = parseInt(hex.substring(5, 7), 16);
    }
    
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * Blend two colors together
 * @param {string} baseColor - Base color (hex or rgb)
 * @param {string} overlayColor - Overlay color (rgba)
 * @returns {string} - Resulting blended color
 */
export function blendColors(baseColor, overlayColor) {
    // For simplicity, we'll just return the overlay color
    // A more accurate blend would require converting both colors to rgba and calculating the blend
    return overlayColor;
}

/**
 * Get current KP (hit points) for a character
 * @param {Object} character - Character data
 * @returns {number} - Current KP
 */
export function getCurrentKP(character) {
    // Special case: if currentKP is explicitly set to 0, this value should be kept
    // So we need to check for undefined or null, not falsey values
    if (character.currentKP === undefined || character.currentKP === null) {
        // Initialize with max KP if not set
        if (character.combatStats && character.combatStats.kp) {
            character.currentKP = parseInt(character.combatStats.kp, 10);
        } else {
            character.currentKP = 10; // Default
        }
    } else {
        // Make sure currentKP is a number, not a string
        character.currentKP = parseInt(character.currentKP, 10);
    }
    
    // Store max KP if not already set
    if (character.maxKP === undefined || character.maxKP === null) {
        if (character.combatStats && character.combatStats.kp) {
            character.maxKP = parseInt(character.combatStats.kp, 10);
        } else {
            character.maxKP = 10; // Default
        }
    }
    
    return character.currentKP;
}