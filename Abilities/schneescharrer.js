/**
 * Schneescharrer ability (Slush Rush) - doubles initiative in snow or hail weather
 */

import { handleWeatherAbilityBoosts } from './weatherAbilities.js';
import { getCurrentWeather, WEATHER_TYPES } from '../weather.js';

// Ability identifier and display name
const ABILITY_ID = 'schneescharrer';
const ABILITY_NAME = 'Schneescharrer';

/**
 * Check if the weather condition for Schneescharrer is active
 * @returns {boolean} - True if snow or hail weather is active
 */
function isSchneescharrerWeatherActive() {
    const weather = getCurrentWeather();
    return weather && (weather.state === WEATHER_TYPES.SCHNEE || weather.state === WEATHER_TYPES.HAGEL);
}

/**
 * Update Schneescharrer boosts based on current weather
 * @returns {boolean} - True if any changes were made
 */
export function updateSchneescharrerBoosts() {
    return handleWeatherAbilityBoosts(ABILITY_ID, ABILITY_NAME, isSchneescharrerWeatherActive);
}