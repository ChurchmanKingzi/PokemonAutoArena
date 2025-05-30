/**
 * Chlorophyll ability - doubles initiative in sunny weather
 */

import { handleWeatherAbilityBoosts } from './weatherAbilities.js';
import { getCurrentWeather, WEATHER_TYPES } from '../weather.js';

// Ability identifier and display name
const ABILITY_ID = 'chlorophyll';
const ABILITY_NAME = 'Chlorophyll';

/**
 * Check if the weather condition for Chlorophyll is active
 * @returns {boolean} - True if sunny weather is active
 */
function isChlorophyllWeatherActive() {
    const weather = getCurrentWeather();
    return weather && weather.state === WEATHER_TYPES.SONNE;
}

/**
 * Update Chlorophyll boosts based on current weather
 * @returns {boolean} - True if any changes were made
 */
export function updateChlorophyllBoosts() {
    return handleWeatherAbilityBoosts(ABILITY_ID, ABILITY_NAME, isChlorophyllWeatherActive);
}