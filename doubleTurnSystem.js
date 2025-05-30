/**
 * Double Turn System - Handles Pokemon that get multiple turns per round due to high initiative
 */

import { getSortedCharacters } from './initiative.js';
import { logBattleEvent } from './battleLog.js';

// Track which Pokemon get double turns and how many they've taken this round
let doubleTurnPokemon = new Set();
let turnsTakenThisRound = new Map();

/**
 * Get the effective initiative value for a Pokemon
 * This is the actual value used for turn order, including all modifiers
 * @param {Object} character - Character entry from initiative list
 * @returns {number} - The effective initiative value
 */
function getEffectiveInitiative(character) {
    // Always use the current initiativeRoll as it includes all modifications:
    // - Weather ability boosts (Chlorophyll, etc.)
    // - Stat stage changes (from moves/abilities)
    // - Any other initiative modifications
    return character.initiativeRoll;
}

/**
 * Calculate which Pokemon should get double turns based on initiative
 * FIXED: Now uses actual effective initiative values for comparison
 * A Pokemon gets double turns if their initiative is more than twice that of the fastest enemy
 */
export function calculateDoubleTurns() {
    const characters = getSortedCharacters();
    const newDoubleTurnPokemon = new Set();
        
    // Group characters by team
    const teamGroups = {};
    characters.forEach(entry => {
        if (!entry.character || entry.isDefeated) return;
        
        const teamIndex = entry.teamIndex;
        if (!teamGroups[teamIndex]) {
            teamGroups[teamIndex] = [];
        }
        teamGroups[teamIndex].push(entry);
    });
    
    // For each team, find the fastest enemy across all other teams
    Object.keys(teamGroups).forEach(teamIndex => {
        const team = teamGroups[teamIndex];
        
        // Find fastest enemy initiative across all other teams
        let fastestEnemyInitiative = 0;
        Object.keys(teamGroups).forEach(otherTeamIndex => {
            if (otherTeamIndex === teamIndex) return; // Skip same team
            
            const otherTeam = teamGroups[otherTeamIndex];
            otherTeam.forEach(enemy => {
                const enemyInitiative = getEffectiveInitiative(enemy);
                fastestEnemyInitiative = Math.max(fastestEnemyInitiative, enemyInitiative);
            });
        });
                
        // Check each Pokemon in this team for double turn eligibility
        team.forEach(ally => {
            const allyInitiative = getEffectiveInitiative(ally);
            const threshold = fastestEnemyInitiative * 2;
                        
            // Pokemon gets double turns if initiative > 2 * fastest enemy initiative
            if (fastestEnemyInitiative > 0 && allyInitiative > threshold) {
                newDoubleTurnPokemon.add(ally.character.uniqueId);
            }
        });
    });
    
    // Log changes in double turn status
    const previousDoubleTurn = new Set(doubleTurnPokemon);
    
    // Find Pokemon that gained double turns
    newDoubleTurnPokemon.forEach(pokemonId => {
        if (!previousDoubleTurn.has(pokemonId)) {
            const character = characters.find(c => c.character?.uniqueId === pokemonId);
            if (character) {
                logBattleEvent(`${character.character.name} ist so schnell, dass es 2 Züge pro Runde erhält!`);
                
                // CRITICAL FIX: Initialize turn counter for mid-round activation
                if (!turnsTakenThisRound.has(pokemonId)) {
                    // They're gaining double turns mid-turn, so they're currently on turn 0
                    turnsTakenThisRound.set(pokemonId, 0);
                }
            }
        }
    });
    
    // Find Pokemon that lost double turns
    previousDoubleTurn.forEach(pokemonId => {
        if (!newDoubleTurnPokemon.has(pokemonId)) {
            const character = characters.find(c => c.character?.uniqueId === pokemonId);
            if (character) {
                logBattleEvent(`${character.character.name} ist nicht mehr schnell genug für 2 Züge pro Runde.`);
            }
        }
    });
    
    // Update the set
    doubleTurnPokemon = newDoubleTurnPokemon;
        
    return doubleTurnPokemon;
}

/**
 * Check if a Pokemon should get double turns
 * @param {string} pokemonId - Unique ID of the Pokemon
 * @returns {boolean} - Whether the Pokemon gets double turns
 */
export function hasDoubleTurns(pokemonId) {
    return doubleTurnPokemon.has(pokemonId);
}

/**
 * Get all Pokemon that have double turns
 * @returns {Set} - Set of Pokemon IDs that get double turns
 */
export function getDoubleTurnPokemon() {
    return new Set(doubleTurnPokemon);
}

/**
 * Reset turn counters for all Pokemon at the start of a new round
 */
export function resetDoubleTurnCounters() {
    turnsTakenThisRound.clear();
}

/**
 * Mark that a Pokemon has taken a turn
 * @param {string} pokemonId - Unique ID of the Pokemon
 * @returns {number} - Number of turns taken this round (1 or 2)
 */
export function markTurnTaken(pokemonId) {
    const currentTurns = turnsTakenThisRound.get(pokemonId) || 0;
    const newTurnCount = currentTurns + 1;
    turnsTakenThisRound.set(pokemonId, newTurnCount);
        
    return newTurnCount;
}

/**
 * Check if a Pokemon should get a second turn
 * UPDATED: More robust checking for mid-round activation
 * @param {string} pokemonId - Unique ID of the Pokemon
 * @returns {boolean} - Whether the Pokemon should get a second turn
 */
export function shouldGetSecondTurn(pokemonId) {
    // Must have double turns enabled
    if (!hasDoubleTurns(pokemonId)) {
        return false;
    }
    
    // Check if they've only taken 1 turn this round
    const turnsTaken = turnsTakenThisRound.get(pokemonId) || 0;
    const shouldGet = turnsTaken === 1;
        
    return shouldGet;
}

/**
 * Get how many turns a Pokemon has taken this round
 * @param {string} pokemonId - Unique ID of the Pokemon
 * @returns {number} - Number of turns taken (0, 1, or 2)
 */
export function getTurnsTakenThisRound(pokemonId) {
    return turnsTakenThisRound.get(pokemonId) || 0;
}

/**
 * Debug function to log current double turn status
 * UPDATED: Now shows actual effective initiative values
 */
export function logDoubleTurnStatus() {
    const characters = getSortedCharacters();
        
    // Group by team and show initiative values
    const teamGroups = {};
    characters.forEach(entry => {
        if (!entry.character || entry.isDefeated) return;
        
        const teamIndex = entry.teamIndex;
        if (!teamGroups[teamIndex]) {
            teamGroups[teamIndex] = [];
        }
        teamGroups[teamIndex].push(entry);
    });
    
    Object.keys(teamGroups).forEach(teamIndex => {      
        teamGroups[teamIndex].forEach(entry => {
            const effectiveInitiative = getEffectiveInitiative(entry);
            const hasDouble = hasDoubleTurns(entry.character.uniqueId);
            const turnsTaken = getTurnsTakenThisRound(entry.character.uniqueId);
        });
    });
    
    // Show threshold calculations
    Object.keys(teamGroups).forEach(teamIndex => {
        const team = teamGroups[teamIndex];
        
        // Find fastest enemy initiative
        let fastestEnemyInitiative = 0;
        Object.keys(teamGroups).forEach(otherTeamIndex => {
            if (otherTeamIndex === teamIndex) return;
            
            const otherTeam = teamGroups[otherTeamIndex];
            otherTeam.forEach(enemy => {
                const enemyInitiative = getEffectiveInitiative(enemy);
                fastestEnemyInitiative = Math.max(fastestEnemyInitiative, enemyInitiative);
            });
        });
    });
}

/**
 * Reset all double turn system state
 * This should be called when the battle is reset
 */
export function resetDoubleTurnSystem() {
    doubleTurnPokemon.clear();
    turnsTakenThisRound.clear();
}