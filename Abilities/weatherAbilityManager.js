/**
 * Weather Ability Manager - coordinates all weather-related abilities
 */

import { updateChlorophyllBoosts } from './chlorophyll.js';
import { updateWassertempoBoosts } from './wassertempo.js';
import { updateSandscharrerBoosts } from './sandscharrer.js';
import { updateSchneescharrerBoosts } from './schneescharrer.js';
import { resetAllWeatherAbilityBoosts } from './weatherAbilities.js';
import { WEATHER_TYPES } from '../weather.js';
import { calculateDoubleTurns, logDoubleTurnStatus } from '../doubleTurnSystem.js';

/**
 * Update all weather ability boosts when weather changes
 * @param {string} oldWeather - The previous weather state
 * @param {string} newWeather - The new weather state
 */
export function updateWeatherAbilities(oldWeather, newWeather) {
    // Only update if the weather has actually changed
    if (oldWeather === newWeather) {
        return;
    }

    console.log(`[Weather Ability Manager] Weather changing from ${oldWeather} to ${newWeather}`);

    // Update each ability based on current weather conditions
    const changes = [];
    
    // Chlorophyll (sunny weather)
    if (oldWeather === WEATHER_TYPES.SONNE || newWeather === WEATHER_TYPES.SONNE) {
        const changed = updateChlorophyllBoosts();
        if (changed) changes.push('Chlorophyll');
    }
    
    // Wassertempo (rainy weather)
    if (oldWeather === WEATHER_TYPES.REGEN || newWeather === WEATHER_TYPES.REGEN) {
        const changed = updateWassertempoBoosts();
        if (changed) changes.push('Wassertempo');
    }
    
    // Sandscharrer (sandstorm weather)
    if (oldWeather === WEATHER_TYPES.SANDSTURM || newWeather === WEATHER_TYPES.SANDSTURM) {
        const changed = updateSandscharrerBoosts();
        if (changed) changes.push('Sandscharrer');
    }
    
    // Schneescharrer (snow or hail weather)
    if (oldWeather === WEATHER_TYPES.SCHNEE || newWeather === WEATHER_TYPES.SCHNEE || 
        oldWeather === WEATHER_TYPES.HAGEL || newWeather === WEATHER_TYPES.HAGEL) {
        const changed = updateSchneescharrerBoosts();
        if (changed) changes.push('Schneescharrer');
    }
    
    // If no ability-specific changes were made but the weather changed,
    // we should still recalculate double turns as a safety measure
    if (changes.length === 0) {
        console.log(`[Weather Ability Manager] No specific ability changes, recalculating double turns as safety measure`);
        calculateDoubleTurns();
        logDoubleTurnStatus();
    } else {
        console.log(`[Weather Ability Manager] Updated abilities: ${changes.join(', ')}`);
    }
    
    return changes.length > 0;
}

/**
 * Initialize all weather abilities at the start of a battle
 * Applies boosts based on the initial weather condition
 */
export function initializeWeatherAbilities() {
    console.log("[Weather Ability Manager] Initializing weather abilities");
    
    // Update all abilities regardless of current weather
    let changes = false;
    
    changes = updateChlorophyllBoosts() || changes;
    changes = updateWassertempoBoosts() || changes;
    changes = updateSandscharrerBoosts() || changes;
    changes = updateSchneescharrerBoosts() || changes;
    
    // If no ability-specific changes were made, still recalculate double turns as a safety measure
    if (!changes) {
        console.log("[Weather Ability Manager] No ability changes during initialization, recalculating double turns as safety measure");
        calculateDoubleTurns();
        logDoubleTurnStatus();
    }
}

/**
 * Reset all weather abilities at the end of a battle
 */
export function resetWeatherAbilities() {
    resetAllWeatherAbilityBoosts();
}