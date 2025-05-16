/**
 * Utility functions for character selection
 */

import { TEAM_COLORS } from './charakterAuswahlConfig.js';

/**
 * Capitalizes the first letter of a string
 * @param {string} string - The string to capitalize
 * @returns {string} - The capitalized string
 */
export function capitalizeFirstLetter(string) {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1);
}

/**
 * Get a color for a team
 * @param {number} teamIndex - The team index
 * @returns {string} - CSS color value
 */
export function getTeamColor(teamIndex) {
    // Return the color based on team index, cycle through colors if more teams than colors
    return TEAM_COLORS[teamIndex % TEAM_COLORS.length];
}

/**
 * Creates a separator line for the tooltip
 * @returns {HTMLElement} - The separator element
 */
export function createSeparator() {
    const separator = document.createElement('div');
    separator.className = 'tooltip-separator';
    return separator;
}

/**
 * Creates an attribute item for the tooltip
 * @param {string} label - The attribute label
 * @param {string|number} value - The attribute value
 * @returns {HTMLElement} - The attribute item element
 */
export function createAttributeItem(label, value) {
    const item = document.createElement('div');
    
    const itemLabel = document.createElement('span');
    itemLabel.className = 'tooltip-label';
    itemLabel.textContent = `${label}: `;
    
    const itemValue = document.createElement('span');
    itemValue.className = 'tooltip-value';
    itemValue.textContent = value;
    
    item.appendChild(itemLabel);
    item.appendChild(itemValue);
    
    return item;
}