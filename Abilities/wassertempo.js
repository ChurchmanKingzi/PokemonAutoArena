/**
 * Wassertempo ability (Swift Swim) - doubles initiative in rainy weather
 */

import { handleWeatherAbilityBoosts } from './weatherAbilities.js';
import { getCurrentWeather, WEATHER_TYPES } from '../weather.js';

// Ability identifier and display name
const ABILITY_ID = 'wassertempo';
const ABILITY_NAME = 'Wassertempo';

/**
 * Check if the weather condition for Wassertempo is active
 * @returns {boolean} - True if rainy weather is active
 */
function isWassertempoWeatherActive() {
    const weather = getCurrentWeather();
    return weather && weather.state === WEATHER_TYPES.REGEN;
}

/**
 * Update Wassertempo boosts based on current weather
 * @returns {boolean} - True if any changes were made
 */
export function updateWassertempoBoosts() {
    return handleWeatherAbilityBoosts(ABILITY_ID, ABILITY_NAME, isWassertempoWeatherActive);
}