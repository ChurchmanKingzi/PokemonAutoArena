/**
 * Sandscharrer ability (Sand Rush) - doubles initiative in sandstorm weather
 */

import { handleWeatherAbilityBoosts } from './weatherAbilities.js';
import { getCurrentWeather, WEATHER_TYPES } from '../weather.js';

// Ability identifier and display name
const ABILITY_ID = 'sandscharrer';
const ABILITY_NAME = 'Sandscharrer';

/**
 * Check if the weather condition for Sandscharrer is active
 * @returns {boolean} - True if sandstorm weather is active
 */
function isSandscharrerWeatherActive() {
    const weather = getCurrentWeather();
    return weather && weather.state === WEATHER_TYPES.SANDSTURM;
}

/**
 * Update Sandscharrer boosts based on current weather
 * @returns {boolean} - True if any changes were made
 */
export function updateSandscharrerBoosts() {
    return handleWeatherAbilityBoosts(ABILITY_ID, ABILITY_NAME, isSandscharrerWeatherActive);
}