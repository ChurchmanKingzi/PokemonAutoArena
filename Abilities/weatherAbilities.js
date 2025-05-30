/**
 * Weather abilities base module - handles initiative boosts for weather-related abilities
 * Updated to use centralized initiative management system
 * FIXED: Race condition where originalInitiativeRollBeforeWeatherAbility was deleted before values were restored
 */

import { logBattleEvent } from '../battleLog.js';
import { getSortedCharacters, getSortedCharactersDisplay, updatePokemonInitiative, batchUpdatePokemonInitiative } from '../initiative.js';
import { hasPokemonAbility } from '../statusEffects.js';
import { getCurrentWeather, changeWeather, WEATHER_TYPES } from '../weather.js';

const originalInitiativeValues = new Map(); 

// Weather-altering abilities
const WEATHER_ABILITIES = {
    'Dürre': 'SONNE',
    'Endland': 'SONNE', 
    'Orichalkum-Puls': 'SONNE',
    
    'Niesel': 'REGEN',
    'Urmeer': 'REGEN',
    
    'Sandsturm': 'SANDSTURM',
    
    'Hagelalarm': 'HAGEL',
    
    'Schneeschauer': 'SCHNEE'
};

// Weather-extending items
const WEATHER_EXTENDING_ITEMS = {
    'SONNE': 'Heißbrocken',
    'REGEN': 'Nassbrocken',
    'SANDSTURM': 'Glattbrocken', 
    'HAGEL': 'Eisbrocken',
    'SCHNEE': 'Eisbrocken' // Snow uses the same item as hail
};

// Track Pokemon with active weather ability boosts
const weatherAbilityBoostedPokemon = new Map();

/**
 * Apply initiative boost for a specific weather ability
 * Now uses the centralized initiative update system
 * FIXED: Cleanup now happens after batch update completes to prevent race conditions
 * 
 * @param {string} abilityId - The ability identifier
 * @param {string} abilityName - The display name of the ability
 * @param {Function} isWeatherActive - Function that returns true if this ability's weather condition is active
 * @param {number} boostMultiplier - The multiplier to apply to initiative (default: 2)
 */
export async function handleWeatherAbilityBoosts(abilityId, abilityName, isWeatherActive, boostMultiplier = 2) {
    // Get all characters
    const characters = getSortedCharacters();
    const displayCharacters = getSortedCharactersDisplay();
    
    console.log(`[Weather Ability] Checking ${abilityName} boosts. Weather active: ${isWeatherActive()}`);
    
    // Collect all initiative updates to perform as a batch
    const initiativeUpdates = [];
    
    // Track which Pokemon need cleanup after successful updates
    const pokemonToCleanup = [];
    
    // If the appropriate weather is active, apply boost to all Pokemon with the ability
    if (isWeatherActive()) {
    characters.forEach(entry => {
        if (entry.character && hasPokemonAbility(entry.character, [abilityId]) && 
            !weatherAbilityBoostedPokemon.has(entry.character.uniqueId)) {
            
            // Store the true original value if we've never seen this Pokemon before
            if (!originalInitiativeValues.has(entry.character.uniqueId)) {
                originalInitiativeValues.set(entry.character.uniqueId, entry.initiativeRoll);
            }
            
            // Always use the true original value from our persistent storage
            const trueOriginalValue = originalInitiativeValues.get(entry.character.uniqueId);
            
            // Calculate the boosted value using the true original
            const newInitiativeValue = Math.round(trueOriginalValue * boostMultiplier);
            
            // Store original roll for this boost instance if not already stored
            if (!entry.originalInitiativeRollBeforeWeatherAbility) {
                entry.originalInitiativeRollBeforeWeatherAbility = entry.initiativeRoll;
            }
                
                // Store the ability ID with the character ID so we know which ability caused the boost
                weatherAbilityBoostedPokemon.set(entry.character.uniqueId, abilityId);
                
                // Add to batch update
                initiativeUpdates.push({
                    pokemonId: entry.character.uniqueId,
                    newValue: newInitiativeValue,
                    source: abilityName
                });
                
                console.log(`[Weather Ability] Preparing boost for ${entry.character.name}: ${entry.originalInitiativeRollBeforeWeatherAbility} → ${newInitiativeValue}`);
            }
        });
        
        // Also prepare updates for display characters (they'll be handled in the batch update)
        displayCharacters.forEach(entry => {
            if (entry.character && hasPokemonAbility(entry.character, [abilityId]) && 
                !weatherAbilityBoostedPokemon.has(entry.character.uniqueId)) {
                
                // Store original roll if not already stored
                if (!entry.originalInitiativeRollBeforeWeatherAbility) {
                    entry.originalInitiativeRollBeforeWeatherAbility = entry.initiativeRoll;
                }
            }
        });
    } 
    // If the weather is not appropriate, remove boost from Pokemon with this ability
    else {
        // Find all Pokemon that were boosted by this specific ability
        characters.forEach(entry => {
            if (entry.character && 
                weatherAbilityBoostedPokemon.has(entry.character.uniqueId) && 
                weatherAbilityBoostedPokemon.get(entry.character.uniqueId) === abilityId) {
                
                // Always use the true original value from our persistent storage
                if (originalInitiativeValues.has(entry.character.uniqueId)) {
                    const trueOriginalValue = originalInitiativeValues.get(entry.character.uniqueId);
                    
                    // Add to batch update for restoration
                    initiativeUpdates.push({
                        pokemonId: entry.character.uniqueId,
                        newValue: trueOriginalValue,
                        source: `${abilityName} entfernt`
                    });
                    
                    // Mark this Pokemon for cleanup AFTER the batch update succeeds
                    pokemonToCleanup.push({
                        pokemonId: entry.character.uniqueId,
                        characterEntry: entry
                    });
                    
                    console.log(`[Weather Ability] Preparing boost removal for ${entry.character.name}: ${entry.initiativeRoll} → ${trueOriginalValue}`);
                }
            }
        });
    }
    
    // Apply all initiative changes as a batch if there are any updates
    if (initiativeUpdates.length > 0) {
        console.log(`[Weather Ability] Applying ${initiativeUpdates.length} initiative updates for ${abilityName}`);
        
        // Use the centralized batch update system
        const results = await batchUpdatePokemonInitiative(initiativeUpdates);
        
        // Only perform cleanup for successful updates
        const successfulUpdates = results.filter(result => result.success);
        console.log(`[Weather Ability] Successfully applied ${successfulUpdates.length}/${initiativeUpdates.length} initiative updates`);
        
        // Now that batch update is complete, perform cleanup for Pokemon whose boosts were removed
        if (!isWeatherActive() && pokemonToCleanup.length > 0) {
            pokemonToCleanup.forEach(cleanup => {
                const updateResult = successfulUpdates.find(result => 
                    result.pokemonId === cleanup.pokemonId
                );
                
                // Only cleanup if the update was successful
                if (updateResult) {
                    // Clean up the stored original value from character entry
                    if (cleanup.characterEntry && cleanup.characterEntry.originalInitiativeRollBeforeWeatherAbility) {
                        delete cleanup.characterEntry.originalInitiativeRollBeforeWeatherAbility;
                    }
                    
                    // Clean up the stored original value from display character entry
                    if (cleanup.displayCharacterEntry && cleanup.displayCharacterEntry.originalInitiativeRollBeforeWeatherAbility) {
                        delete cleanup.displayCharacterEntry.originalInitiativeRollBeforeWeatherAbility;
                    }
                    
                    // Remove from the map of boosted Pokemon
                    weatherAbilityBoostedPokemon.delete(cleanup.pokemonId);
                    
                    console.log(`[Weather Ability] Cleaned up boost data for Pokemon ${cleanup.pokemonId}`);
                }
            });
        }
        
        return successfulUpdates.length > 0; // Return true if any changes were made
    }
    
    return false; // No changes were made
}

/**
 * Check if any Pokemon are currently boosted by weather abilities
 * @returns {boolean} - True if any Pokemon have active weather ability boosts
 */
export function hasActiveWeatherAbilityBoosts() {
    return weatherAbilityBoostedPokemon.size > 0;
}

/**
 * Get all Pokemon currently boosted by weather abilities
 * @returns {Map} - Map of Pokemon IDs to ability IDs causing the boost
 */
export function getActiveWeatherAbilityBoosts() {
    return new Map(weatherAbilityBoostedPokemon);
}

/**
 * Get the weather ability causing a specific Pokemon's boost
 * @param {string} pokemonId - Unique ID of the Pokemon
 * @returns {string|null} - Ability ID causing the boost, or null if no boost
 */
export function getWeatherAbilityBoostSource(pokemonId) {
    return weatherAbilityBoostedPokemon.get(pokemonId) || null;
}

/**
 * Remove weather ability boost from a specific Pokemon
 * Useful for when a Pokemon faints or is removed from battle
 * 
 * @param {string} pokemonId - Unique ID of the Pokemon
 * @returns {boolean} - Whether a boost was removed
 */
export async function removeWeatherAbilityBoost(pokemonId) {
    if (!weatherAbilityBoostedPokemon.has(pokemonId)) {
        return false;
    }
    
    // Get the true original value
    if (originalInitiativeValues.has(pokemonId)) {
        const trueOriginalValue = originalInitiativeValues.get(pokemonId);
        const abilityId = weatherAbilityBoostedPokemon.get(pokemonId);
        
        // Update initiative back to original value
        const result = await updatePokemonInitiative(pokemonId, trueOriginalValue, `Weather boost removed (${abilityId})`);
        
        // Only cleanup if the update was successful
        if (result.success) {
            // Remove the boost
            weatherAbilityBoostedPokemon.delete(pokemonId);
            
            // Also clean up display characters
            const displayCharacters = getSortedCharactersDisplay();
            const displayEntry = displayCharacters.find(entry => 
                entry.character && entry.character.uniqueId === pokemonId
            );
            if (displayEntry && displayEntry.originalInitiativeRollBeforeWeatherAbility) {
                delete displayEntry.originalInitiativeRollBeforeWeatherAbility;
            }
            
            return true;
        }
    }
    
    // Just remove from map if we can't restore the value
    weatherAbilityBoostedPokemon.delete(pokemonId);
    return false;
}

/**
 * Reset all weather ability boosts - useful when a battle ends
 */
export async function resetAllWeatherAbilityBoosts() {
    if (weatherAbilityBoostedPokemon.size === 0) {
        return;
    }
    
    console.log(`[Weather Ability] Resetting ${weatherAbilityBoostedPokemon.size} weather ability boosts`);
    
    // Collect all Pokemon that need their boosts removed
    const pokemonToReset = Array.from(weatherAbilityBoostedPokemon.keys());
    
    // Clear the map first
    weatherAbilityBoostedPokemon.clear();
    
    const restorationUpdates = [];
    
    // Prepare restoration updates
    pokemonToReset.forEach(pokemonId => {
        if (originalInitiativeValues.has(pokemonId)) {
            const trueOriginalValue = originalInitiativeValues.get(pokemonId);
            
            restorationUpdates.push({
                pokemonId: pokemonId,
                newValue: trueOriginalValue,
                source: 'Weather boost reset'
            });
        }
    });
    
    // Apply all restorations as a batch
    if (restorationUpdates.length > 0) {
        await batchUpdatePokemonInitiative(restorationUpdates);
        console.log(`[Weather Ability] Reset ${restorationUpdates.length} weather ability boosts`);
    }
}

/**
 * Debug function to log current weather ability boost status
 */
export function logWeatherAbilityStatus() {
    console.log("=== WEATHER ABILITY BOOST STATUS ===");
    
    if (weatherAbilityBoostedPokemon.size === 0) {
        console.log("No Pokemon currently have weather ability boosts");
        return;
    }
    
    const characters = getSortedCharacters();
    
    weatherAbilityBoostedPokemon.forEach((abilityId, pokemonId) => {
        const characterEntry = characters.find(entry => 
            entry.character && entry.character.uniqueId === pokemonId
        );
        
        if (characterEntry) {
            const originalValue = characterEntry.originalInitiativeRollBeforeWeatherAbility || 'Unknown';
            const currentValue = characterEntry.initiativeRoll;
            
            console.log(`${characterEntry.character.name}: ${abilityId} boost (${originalValue} → ${currentValue})`);
        }
    });
}

/**
 * Check and apply weather abilities at the start of the first turn
 * Only triggers if weather is currently Normal
 * Goes through Pokemon in initiative order (fastest first)
 * Stops after the first Pokemon with a weather ability
 */
export async function checkAndApplyWeatherAbilities() {
    const currentWeather = getCurrentWeather();
    
    // Only trigger if weather is Normal
    if (currentWeather.state !== WEATHER_TYPES.NORMAL) {
        return;
    }
    
    // Get all Pokemon in initiative order (fastest first)
    const sortedCharacters = getSortedCharacters();
    
    // Check each Pokemon in order for weather abilities
    for (const characterEntry of sortedCharacters) {
        const pokemon = characterEntry.character;
        
        if (!pokemon || !pokemon.statsDetails?.abilities) {
            continue;
        }
        
        // Check if this Pokemon has any weather-altering abilities
        for (const ability of pokemon.statsDetails.abilities) {
            const abilityName = ability.name;
            
            if (WEATHER_ABILITIES[abilityName]) {
                const weatherType = WEATHER_ABILITIES[abilityName];
                
                // Check for weather-extending item
                const extendingItem = WEATHER_EXTENDING_ITEMS[weatherType];
                const hasExtendingItem = pokemon.selectedItem && 
                    pokemon.selectedItem.name === extendingItem;
                
                const duration = hasExtendingItem ? 8 : 5;
                
                // Apply weather change and log appropriate message
                switch (weatherType) {
                    case 'SONNE':
                        await changeWeather(WEATHER_TYPES.SONNE, duration);
                        logBattleEvent(`${pokemon.name}'s ${abilityName} lässt die Sonne scheinen!`);
                        break;
                    case 'REGEN':
                        await changeWeather(WEATHER_TYPES.REGEN, duration);
                        logBattleEvent(`${pokemon.name}'s ${abilityName} lässt es regnen!`);
                        break;
                    case 'SANDSTURM':
                        await changeWeather(WEATHER_TYPES.SANDSTURM, duration);
                        logBattleEvent(`${pokemon.name}'s ${abilityName} entfacht einen Sandsturm!`);
                        break;
                    case 'HAGEL':
                        await changeWeather(WEATHER_TYPES.HAGEL, duration);
                        logBattleEvent(`${pokemon.name}'s ${abilityName} lässt es hageln!`);
                        break;
                    case 'SCHNEE':
                        await changeWeather(WEATHER_TYPES.SCHNEE, duration);
                        logBattleEvent(`${pokemon.name}'s ${abilityName} lässt es schneien!`);
                        break;
                }
                
                // Log item extension if applicable
                if (hasExtendingItem) {
                    const itemMessages = {
                        'Heißbrocken': 'verlängert den Sonnenschein',
                        'Nassbrocken': 'verlängert den Regen',
                        'Glattbrocken': 'verlängert den Sandsturm',
                        'Eisbrocken': weatherType === 'HAGEL' ? 'verlängert den Hagel' : 'verlängert den Schneefall'
                    };
                    
                    const message = itemMessages[extendingItem] || 'verlängert das Wetter';
                    logBattleEvent(`${pokemon.name}'s ${extendingItem} ${message}!`);
                }
                
                // Stop after the first Pokemon with a weather ability
                return;
            }
        }
    }
}