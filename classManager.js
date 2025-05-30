/**
 * Class management system for trainers
 * Handles trainer class-specific effects that trigger at various points in battle
 */

import { getTrainers } from './teamManager.js';
import { getCharacterPositions } from './characterPositions.js';
import { logBattleEvent } from './battleLog.js';
import { rollAnglerCatch } from './Klassen/anglerCatches.js';
import { addPokemonToBattle } from './pokemonSpawner.js';
import { initializeRaufboldProtection } from './Klassen/raufbold.js';
import { getCurrentTurn } from './turnSystem.js';

// Store original team state when battle starts (for reset functionality)
let originalBattleState = null;

/**
 * Store the original battle state when combat begins
 * This allows us to reset to the original teams when returning to team builder
 * @param {Object} battleState - The original battle state to store
 */
export function storeOriginalBattleState(battleState) {
    originalBattleState = {
        teamAssignments: JSON.parse(JSON.stringify(battleState.teamAssignments)),
        characterPositions: JSON.parse(JSON.stringify(battleState.characterPositions)),
        sortedCharactersLogic: JSON.parse(JSON.stringify(battleState.sortedCharactersLogic)),
        sortedCharactersDisplay: JSON.parse(JSON.stringify(battleState.sortedCharactersDisplay))
    };
}

/**
 * Reset battle to original state (removes any angler-caught Pokemon)
 * @returns {Object|null} - The original battle state or null if not stored
 */
export function resetToOriginalBattleState() {
    if (!originalBattleState) {
        console.warn('No original battle state stored');
        return null;
    }
    return originalBattleState;
}

/**
 * Check trainer classes at the start of each round and trigger class-specific effects
 * This function is called once per round and checks each team only once
 * @returns {Promise} - Promise that resolves when all class effects are complete
 */
export async function startOfTurnClassCheck() {
    const trainers = getTrainers();
    const characterPositions = getCharacterPositions();
    const currentTurn = getCurrentTurn();
    
    // Get all teams that have at least one living Pokemon
    const teamsWithLivingPokemon = getTeamsWithLivingPokemon(characterPositions);
    
    if (teamsWithLivingPokemon.length === 0) {
        return;
    }
    
    // Create array of promises for all class effects
    const classEffectPromises = [];
    
    // Check for weather-changing classes first on the first turn (currentTurn === 0)
    if (currentTurn === 0) {
        // Apply weather effects FIRST, before any other class effects
        // Wait for weather effects to complete before proceeding
        await applyWeatherClassEffects(trainers, teamsWithLivingPokemon);
    }
    
    // Check each team's trainer class for other effects
    teamsWithLivingPokemon.forEach(teamIndex => {
        const trainer = trainers[teamIndex];
        if (!trainer) {
            console.warn(`No trainer found for team ${teamIndex + 1}`);
            return;
        }
                
        // Check for Angler class
        if (trainer.class === 'angler') {
            // Add angler effect promise to the array
            classEffectPromises.push(spawnAnglerPokemon(teamIndex, trainer));
        }
        
        // Check for Clown class
        if (trainer.class === 'clown') {
            // Add clown effect promise to the array
            classEffectPromises.push(applyClownEffect(teamIndex, trainer));
        }

        // Check for Raufbold class
        if (trainer.class === 'ruffian') {
            // Only initialize on the first round
            if (currentTurn === 0) {
                // Add raufbold effect promise to the array
                classEffectPromises.push(initializeRaufboldProtection(teamIndex, trainer));
            }
        }
        
        // Future trainer classes can be added here
    });
    
    // Wait for all class effects to complete before continuing
    if (classEffectPromises.length > 0) {
        await Promise.all(classEffectPromises);
    }
}

/**
 * Get teams that have at least one living Pokemon
 * @param {Object} characterPositions - Character positions object
 * @returns {Array} - Array of team indices with living Pokemon
 */
function getTeamsWithLivingPokemon(characterPositions) {
    const teamsWithLiving = new Set();
    
    // Check all character positions
    for (const charId in characterPositions) {
        const charData = characterPositions[charId];
        
        // Skip defeated characters
        if (charData.isDefeated) continue;
        
        // Skip characters with 0 or negative KP
        if (charData.character && charData.character.currentKP <= 0) continue;
        
        // Add this team to the set if Pokemon is alive
        teamsWithLiving.add(charData.teamIndex);
    }
    
    return Array.from(teamsWithLiving).sort(); // Sort for consistent order
}

/**
 * Spawn an Angler Pokemon for the given team
 * @param {number} teamIndex - Index of the team
 * @param {Object} trainer - Trainer object
 */
async function spawnAnglerPokemon(teamIndex, trainer) {
    try {
        // Add a small delay for dramatic effect
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Roll for angler activation (10% chance per round)
        const anglerActivationRoll = Math.floor(Math.random() * 100) + 1; // 1-100
        const ANGLER_ACTIVATION_CHANCE = 10; // 10% chance
        
        if (anglerActivationRoll > ANGLER_ACTIVATION_CHANCE) {
            // Angler doesn't activate this round
            logBattleEvent(`<div class="log-angler-message">🎣 ${trainer.name} wartet geduldig am Wasser...</div>`, true);
            return;
        }
        
        // Angler activates! Log the activation
        logBattleEvent(`<div class="log-angler-message">🎣 ${trainer.name} spürt einen Biss!</div>`, true);
        
        // Roll for a Pokemon catch
        const caughtPokemon = await rollAnglerCatch(teamIndex);
        
        if (caughtPokemon) {
            // Success! Log the catch with special styling
            logBattleEvent(`<div class="log-angler-message">🐟 ${trainer.name} hat ${caughtPokemon.name} geangelt!</div>`, true);
                        
            // NOW ADD THE POKEMON TO THE BATTLE!
            await addPokemonToBattle(caughtPokemon, teamIndex, trainer.name);
            
        } else {
            // Failed to catch anything (the fish got away)
            logBattleEvent(`<div class="log-angler-message">💨 Der Fisch ist entkommen!</div>`, true);
        }
        
    } catch (error) {
        console.error('Error in spawnAnglerPokemon:', error);
        logBattleEvent(`<div class="log-angler-message">💥 ${trainer.name}'s Angel ist gerissen!</div>`, true);
    }
}

/**
 * Check if a team has any living Pokemon
 * @param {number} teamIndex - Index of the team to check
 * @param {Object} characterPositions - Character positions object
 * @returns {boolean} - Whether the team has living Pokemon
 */
export function teamHasLivingPokemon(teamIndex, characterPositions = null) {
    if (!characterPositions) {
        characterPositions = getCharacterPositions();
    }
    
    // Check all character positions for this team
    for (const charId in characterPositions) {
        const charData = characterPositions[charId];
        
        // Skip if not this team
        if (charData.teamIndex !== teamIndex) continue;
        
        // Skip defeated characters
        if (charData.isDefeated) continue;
        
        // Skip characters with 0 or negative KP
        if (charData.character && charData.character.currentKP <= 0) continue;
        
        // Found a living Pokemon
        return true;
    }
    
    return false;
}

/**
 * Get count of living Pokemon for a team
 * @param {number} teamIndex - Index of the team to check
 * @param {Object} characterPositions - Character positions object
 * @returns {number} - Number of living Pokemon on the team
 */
export function getLivingPokemonCount(teamIndex, characterPositions = null) {
    if (!characterPositions) {
        characterPositions = getCharacterPositions();
    }
    
    let count = 0;
    
    // Check all character positions for this team
    for (const charId in characterPositions) {
        const charData = characterPositions[charId];
        
        // Skip if not this team
        if (charData.teamIndex !== teamIndex) continue;
        
        // Skip defeated characters
        if (charData.isDefeated) continue;
        
        // Skip characters with 0 or negative KP
        if (charData.character && charData.character.currentKP <= 0) continue;
        
        // Count this living Pokemon
        count++;
    }
    
    return count;
}

/**
 * Apply the Clown class effect - confuse all Pokemon of other teams
 * @param {number} teamIndex - Index of the team with the Clown trainer
 * @param {Object} trainer - Trainer object
 * @returns {Promise} - Promise that resolves when the effect is complete
 */
async function applyClownEffect(teamIndex, trainer) {
    // Only apply Clown effect on the first round (currentTurn === 0)
    const currentTurn = await import('./turnSystem.js').then(module => module.getCurrentTurn());
    if (currentTurn > 0) {
        return;
    }
    
    try {
        const characterPositions = getCharacterPositions();
        
        // Log the Clown effect activation
        logBattleEvent(`<div class="log-clown-message">🤡 ${trainer.name} verbreitet Verwirrung unter den Gegnern!</div>`, true);
        
        // Counter for Pokemon affected
        let confusedCount = 0;
        
        // Go through all characters and confuse opponents
        for (const charId in characterPositions) {
            const charData = characterPositions[charId];
            
            // Skip Pokemon on the Clown's team
            if (charData.teamIndex === teamIndex) continue;
            
            // Skip defeated Pokemon
            if (charData.isDefeated) continue;
            
            // Skip Pokemon with 0 or negative KP
            if (charData.character && charData.character.currentKP <= 0) continue;
            
            // Check if the Pokemon has the Tempomacher ability (immunity)
            const { hasPokemonAbility } = await import('./statusEffects.js');
            if (charData.character && hasPokemonAbility(charData.character, ['tempomacher', 'own tempo'])) {
                logBattleEvent(`${charData.character.name} ist dank Tempomacher immun gegen Verwirrung!`);
                continue;
            }
            
            // Apply confusion status effect
            if (charData.character) {
                // Add the confused status effect
                const { addStatusEffect } = await import('./statusEffects.js');
                const confusionAdded = addStatusEffect(charData.character, 'confused');
                
                if (confusionAdded) {
                    confusedCount++;
                    logBattleEvent(`${charData.character.name} wird verwirrt!`);
                }
            }
        }
        
        // Log summary of effect
        if (confusedCount > 0) {
            logBattleEvent(`<div class="log-clown-message">🤡 ${trainer.name} hat ${confusedCount} gegnerische Pokémon verwirrt!</div>`, true);
        } else {
            logBattleEvent(`<div class="log-clown-message">🤡 ${trainer.name}'s Ablenkungsversuch hat keine Wirkung!</div>`, true);
        }
        
    } catch (error) {
        console.error('Error in applyClownEffect:', error);
        logBattleEvent(`<div class="log-clown-message">💥 ${trainer.name}'s Ablenkungsversuch ist schiefgegangen!</div>`, true);
    }
}

/**
 * Apply weather-based trainer class effects at the start of battle
 * Only the trainer with the fastest Pokémon will set the weather
 * @param {Array} trainers - Array of trainers
 * @param {Array} teamsWithLivingPokemon - Array of team indices with living Pokémon
 * @returns {Promise} - Promise that resolves when the effect is complete
 */
async function applyWeatherClassEffects(trainers, teamsWithLivingPokemon) {
    // Check current weather state
    const { getCurrentWeather, changeWeather, WEATHER_TYPES } = await import('./weather.js');
    const currentWeather = getCurrentWeather();
    
    // Only apply if weather is currently Normal
    if (currentWeather.state !== WEATHER_TYPES.NORMAL) {
        return;
    }
    
    // Get all trainers with weather-changing classes
    const weatherTrainers = [];
    const weatherClasses = ['picknicker', 'ruinenmaniac', 'schirmdame', 'snowboarder'];
    
    teamsWithLivingPokemon.forEach(teamIndex => {
        const trainer = trainers[teamIndex];
        if (trainer && weatherClasses.includes(trainer.class)) {
            weatherTrainers.push({ trainer, teamIndex });
        }
    });
    
    // If no weather-changing trainers, no effect
    if (weatherTrainers.length === 0) {
        return;
    }
    
    // If only one weather trainer, apply their effect immediately
    if (weatherTrainers.length === 1) {
        return applyTrainerWeatherEffect(weatherTrainers[0].trainer);
    }
    
    // Multiple weather trainers - find the one with the fastest Pokémon
    try {
        // Find the fastest Pokémon for each team
        const characterPositions = getCharacterPositions();
        const fastestPokemonByTeam = new Map();
        
        // Get sorted characters (already sorted by initiative)
        // Iterate through all Pokémon in initiative order (fastest first)
        for (const charId in characterPositions) {
            const charData = characterPositions[charId];
            const teamIndex = charData.teamIndex;
            
            // Skip if not a weather trainer's team
            if (!weatherTrainers.some(wt => wt.teamIndex === teamIndex)) {
                continue;
            }
            
            // Skip defeated Pokémon
            if (charData.isDefeated || (charData.character && charData.character.currentKP <= 0)) {
                continue;
            }
            
            // Calculate effective speed
            let speed = 0;
            if (charData.character) {
                if (charData.character.combatStats && charData.character.combatStats.init) {
                    speed = charData.character.combatStats.init;
                } else if (charData.character.initiative) {
                    speed = charData.character.initiative;
                }
            }
            
            // Update fastest Pokémon for this team if needed
            if (!fastestPokemonByTeam.has(teamIndex) || speed > fastestPokemonByTeam.get(teamIndex).speed) {
                fastestPokemonByTeam.set(teamIndex, { charId, speed });
            }
        }
        
        // Find the team with the fastest Pokémon overall
        let fastestTeamIndex = -1;
        let highestSpeed = -1;
        
        for (const [teamIndex, pokemonData] of fastestPokemonByTeam.entries()) {
            if (pokemonData.speed > highestSpeed) {
                highestSpeed = pokemonData.speed;
                fastestTeamIndex = teamIndex;
            }
        }
        
        // Apply weather effect for the trainer with the fastest Pokémon
        if (fastestTeamIndex !== -1) {
            const fastestTrainer = weatherTrainers.find(wt => wt.teamIndex === fastestTeamIndex);
            if (fastestTrainer) {
                return applyTrainerWeatherEffect(fastestTrainer.trainer);
            }
        }
    } catch (error) {
        console.error('Error determining fastest weather trainer:', error);
    }
    
    // Fallback: just use the first trainer in the list
    return applyTrainerWeatherEffect(weatherTrainers[0].trainer);
}

/**
 * Apply weather effect for a specific trainer
 * @param {Object} trainer - Trainer object
 * @returns {Promise} - Promise that resolves when the effect is complete
 */
async function applyTrainerWeatherEffect(trainer) {
    return new Promise(async (resolve) => {
        // Add a small delay for dramatic effect
        await new Promise(r => setTimeout(r, 100));
        
        const { changeWeather, WEATHER_TYPES } = await import('./weather.js');
        const { logBattleEvent } = await import('./battleLog.js');
        
        const weatherDuration = 8; // All weather effects last 8 rounds
        
        switch (trainer.class) {
            case 'picknicker':
                changeWeather(WEATHER_TYPES.SONNE, weatherDuration);
                logBattleEvent(`<div class="log-weather-message">☀️ ${trainer.name} genießt die Sonne!</div>`, true);
                break;
                
            case 'ruinenmaniac':
                changeWeather(WEATHER_TYPES.SANDSTURM, weatherDuration);
                logBattleEvent(`<div class="log-weather-message">🏜️ ${trainer.name} bringt einen Sandsturm mit!</div>`, true);
                break;
                
            case 'schirmdame':
                changeWeather(WEATHER_TYPES.REGEN, weatherDuration);
                logBattleEvent(`<div class="log-weather-message">🌧️ ${trainer.name} öffnet ihren Regenschirm!</div>`, true);
                break;
                
            case 'snowboarder':
                changeWeather(WEATHER_TYPES.SCHNEE, weatherDuration);
                logBattleEvent(`<div class="log-weather-message">❄️ ${trainer.name} bringt Schnee mit!</div>`, true);
                break;
        }
        
        resolve();
    });
}