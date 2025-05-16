import { logBattleEvent } from './battleLog.js';
import { hasPokemonAbility } from './statusEffects.js';

// Store original stats for reference
const originalStats = new Map();

// Store stat stages for each Pokémon (-6 to +6)
const statStages = new Map();

// Store stat modifications with sources (for logging/display purposes)
const statModifications = new Map();

// Stage multipliers - each stage corresponds to a specific multiplier
const stageMultipliers = {
  "-6": 0.25,
  "-5": 0.28,
  "-4": 0.33,
  "-3": 0.4,
  "-2": 0.5,
  "-1": 0.67,
  "0": 1,
  "1": 1.5,
  "2": 2,
  "3": 2.5,
  "4": 3,
  "5": 3.5,
  "6": 4
};

// Minimum stat values as percentage of original or absolute value
const minimumStats = {
    gena: 2,            // Absolute minimum
    pa: 1,              // Absolute minimum
    bw: 1,              // Absolute minimum
    angriff: 0.25,      // 25% of original value
    verteidigung: 0.25, // 25% of original value
    spezialAngriff: 0.25, // 25% of original value
    spezialVerteidigung: 0.25, // 25% of original value
    init: 0.25         // 25% of original value
};

// German to English stat mapping (for code consistency)
const statMapping = {
    'gena': 'gena',
    'pa': 'pa',
    'initiative': 'init',
    'init': 'init',
    'angriff': 'angriff',
    'verteidigung': 'verteidigung',
    'spezial-angriff': 'spezialAngriff',
    'spezialangriff': 'spezialAngriff',
    'spezial-verteidigung': 'spezialVerteidigung',
    'spezialverteidigung': 'spezialVerteidigung',
    'bewegung': 'bw',
    'bw': 'bw'
};

// English to German stat mapping (for display)
const statDisplayNames = {
    'gena': 'GENA',
    'pa': 'PA',
    'init': 'Initiative',
    'angriff': 'Angriff',
    'verteidigung': 'Verteidigung',
    'spezialAngriff': 'Spezial-Angriff',
    'spezialVerteidigung': 'Spezial-Verteidigung',
    'bw': 'BW'
};

// Stats that use the stage-based system
const stageBased = ['angriff', 'verteidigung', 'spezialAngriff', 'spezialVerteidigung', 'init'];

/**
 * Initialize stat tracking for a Pokémon
 * @param {Object} pokemon - The Pokémon to initialize
 */
export function initializeStatTracking(pokemon) {
    if (!pokemon || !pokemon.uniqueId) return;
    
    // Only initialize if not already done
    if (!originalStats.has(pokemon.uniqueId)) {
        const stats = extractPokemonStats(pokemon);
        originalStats.set(pokemon.uniqueId, stats);
        statModifications.set(pokemon.uniqueId, new Map());
        
        // Initialize stat stages (all start at 0)
        const stages = {};
        for (const stat in stats) {
            stages[stat] = 0;
        }
        statStages.set(pokemon.uniqueId, stages);
    }
}

/**
 * Extract all stat values from a Pokémon
 * @param {Object} pokemon - The Pokémon to extract stats from
 * @returns {Object} - The extracted stats
 */
function extractPokemonStats(pokemon) {
    const stats = {};

    // Extract GENA
    if (pokemon.combatStats && pokemon.combatStats.gena !== undefined) {
        stats.gena = parseInt(pokemon.combatStats.gena);
    } else {
        stats.gena = 1; // Default value
    }

    // Extract PA
    if (pokemon.combatStats && pokemon.combatStats.pa !== undefined) {
        stats.pa = parseInt(pokemon.combatStats.pa);
    } else {
        stats.pa = 1; // Default value
    }

    // Extract BW (Movement)
    if (pokemon.combatStats && pokemon.combatStats.bw !== undefined) {
        stats.bw = parseInt(pokemon.combatStats.bw);
    } else {
        stats.bw = 1; // Default value
    }

    // Extract Initiative
    if (pokemon.combatStats && pokemon.combatStats.init !== undefined) {
        stats.init = parseInt(pokemon.combatStats.init);
    } else {
        stats.init = 1; // Default value
    }

    // Extract Attack, Defense, Sp. Attack, Sp. Defense from statsDetails
    if (pokemon.statsDetails && pokemon.statsDetails.statsGerman) {
        const germanStats = pokemon.statsDetails.statsGerman;
        
        // Check both property naming formats that might be used
        // Try with standard German naming first, then camelCase, then abbreviated versions
        stats.angriff = germanStats['Angriff'] || germanStats.Angriff || germanStats.angriff || germanStats.ang || 50;
        stats.verteidigung = germanStats['Verteidigung'] || germanStats.Verteidigung || germanStats.verteidigung || germanStats.vert || 50;
        stats.spezialAngriff = germanStats['Spezial-Angriff'] || germanStats['Spezial Angriff'] || germanStats.SpezialAngriff || germanStats.spezialAngriff || germanStats.spAng || 50;
        stats.spezialVerteidigung = germanStats['Spezial-Verteidigung'] || germanStats['Spezial Verteidigung'] || germanStats.SpezialVerteidigung || germanStats.spezialVerteidigung || germanStats.spVert || 50;
    } else {
        // Default values if not found
        stats.angriff = 50;
        stats.verteidigung = 50;
        stats.spezialAngriff = 50;
        stats.spezialVerteidigung = 50;
    }

    return stats;
}

/**
 * Apply a stat change to a Pokémon
 * @param {Object} pokemon - The Pokémon to modify
 * @param {string} statName - The name of the stat to modify
 * @param {number} stageChange - The number of stages to change (positive for increase, negative for decrease)
 * @param {Object} source - Source of the stat change (null for self)
 * @returns {Object} - Result of the operation
 */
export function changeStatValue(pokemon, statName, stageChange, source = null) {
    if (!pokemon || !pokemon.uniqueId) {
        return { success: false, message: "Ungültiges Pokémon" };
    }

    // Initialize if needed
    initializeStatTracking(pokemon);
    
    // Normalize stat name
    const normalizedStatName = normalizeStatName(statName);
    if (!normalizedStatName) {
        return { success: false, message: `Unbekannter Stat: ${statName}` };
    }

    // Determine source type
    let sourceType = 'self';
    if (source) {
        if (source.teamIndex === pokemon.teamIndex) {
            sourceType = 'ally';
        } else {
            sourceType = 'enemy';
        }
    }

    // Check for abilities that affect stat changes
    const hasContrary = hasPokemonAbility(pokemon, ['umkehrung', 'contrary']);
    const hasStatChangeImmunity = hasPokemonAbility(pokemon, [
        'neutraltorso', 'pulverrauch', 'metallprotektor', 'spiegelrüstung',
        'clear body', 'white smoke', 'full metal body', 'mirror armor'
    ]);

    // Apply Contrary ability - reverse the direction of stat changes
    if (hasContrary) {
        stageChange = -stageChange;
    }

    // Check for stat change immunity (only for negative changes from external sources)
    if (hasStatChangeImmunity && stageChange < 0 && sourceType !== 'self') {
        return { 
            success: false, 
            message: `${pokemon.name}'s Fähigkeit verhindert die Stat-Senkung!`,
            prevented: true,
            ability: true
        };
    }

    // Get current stages for this Pokémon
    const stages = statStages.get(pokemon.uniqueId);
    
    // Get original stat value
    const originalValue = originalStats.get(pokemon.uniqueId)[normalizedStatName];
    if (originalValue === undefined) {
        return { success: false, message: `Kein Originalwert für ${statName} gefunden` };
    }

    // Get modifications map for logging purposes
    const modifications = statModifications.get(pokemon.uniqueId);
    if (!modifications.has(normalizedStatName)) {
        modifications.set(normalizedStatName, {
            total: 0,
            sources: []
        });
    }
    
    // Check if this stat uses stage-based calculation
    const isStageBasedStat = stageBased.includes(normalizedStatName);
    
    let newValue;
    let effectiveStageChange = stageChange;
    
    if (isStageBasedStat) {
        // Current stage value
        const currentStage = stages[normalizedStatName];
        
        // Calculate new stage value, clamped to -6 to +6
        const newStage = Math.max(-6, Math.min(6, currentStage + stageChange));
        
        // If we hit a stage boundary, adjust the effective stage change
        effectiveStageChange = newStage - currentStage;
        
        // If we can't change the stage in the requested direction
        if (effectiveStageChange === 0) {
            if (stageChange > 0) {
                return {
                    success: false,
                    message: `${pokemon.name}'s ${statDisplayNames[normalizedStatName]} kann nicht weiter erhöht werden.`,
                    atMaximum: true
                };
            } else {
                return {
                    success: false,
                    message: `${pokemon.name}'s ${statDisplayNames[normalizedStatName]} kann nicht weiter gesenkt werden.`,
                    atMinimum: true
                };
            }
        }
        
        // Update the stage
        stages[normalizedStatName] = newStage;
        
        // Calculate new value based on stage multiplier
        const multiplier = stageMultipliers[newStage.toString()];
        newValue = Math.round(originalValue * multiplier);
        
        // Add the modification record (for display and logging)
        const statMod = modifications.get(normalizedStatName);
        statMod.total = newStage; // Store current stage in total
        statMod.sources.push({
            amount: effectiveStageChange, // Record the actual stage change
            sourceType: sourceType,
            sourceName: source ? source.name : 'Selbst',
            timestamp: Date.now()
        });
    } else {
        // For non-stage-based stats (gena, pa, bw), use the original direct modification system
        if (!modifications.has(normalizedStatName)) {
            modifications.set(normalizedStatName, {
                total: 0,
                sources: []
            });
        }
        
        const statMod = modifications.get(normalizedStatName);
        
        // Calculate new total modification
        const newTotal = statMod.total + stageChange;
        
        // Calculate the actual new stat value directly
        newValue = originalValue + newTotal;
        
        // Check minimum values
        const minValue = getMinimumStatValue(normalizedStatName, originalValue);
        if (newValue < minValue) {
            // Can't reduce further
            if (stageChange < 0) {
                return { 
                    success: false, 
                    message: `${pokemon.name}'s ${statDisplayNames[normalizedStatName]} kann nicht weiter gesenkt werden.`,
                    atMinimum: true
                };
            }
            newValue = minValue;
        }
        
        // Update the modification
        statMod.total = newTotal;
        statMod.sources.push({
            amount: stageChange,
            sourceType: sourceType,
            sourceName: source ? source.name : 'Selbst',
            timestamp: Date.now()
        });
    }
    
    // Trigger initiative recalculation if initiative was changed
    if (normalizedStatName === 'init') {
        import('./initiativeChanges.js').then(module => {
            // The initiative value recalculation is handled by the turn system directly
            const result = module.changeInitiative(pokemon.uniqueId, newValue - originalValue, 
                stageChange > 0 ? "Initiative erhöht" : "Initiative gesenkt");
            
            // If this should result in an immediate turn, trigger it
            if (result.shouldTakeTurnNow) {
                import('./turnSystem.js').then(tsModule => {
                    tsModule.triggerImmediateTurn(pokemon.uniqueId);
                });
            }
        }).catch(error => {
            console.error("Error updating initiative:", error);
        });
    }
    
    return { 
        success: true,
        originalValue: originalValue,
        newValue: newValue,
        change: effectiveStageChange,
        statName: normalizedStatName,
        displayName: statDisplayNames[normalizedStatName],
        stage: isStageBasedStat ? stages[normalizedStatName] : null
    };
}

/**
 * Normalize a stat name to our internal format
 * @param {string} statName - The stat name to normalize
 * @returns {string|null} - The normalized stat name or null if not found
 */
function normalizeStatName(statName) {
    if (!statName) return null;
    
    const lowerName = statName.toLowerCase();
    return statMapping[lowerName] || null;
}

/**
 * Get the minimum allowed value for a stat
 * @param {string} statName - The normalized stat name
 * @param {number} originalValue - The original value of the stat
 * @returns {number} - The minimum allowed value
 */
function getMinimumStatValue(statName, originalValue) {
    const minSetting = minimumStats[statName];
    
    if (minSetting === undefined) return 1; // Default minimum
    
    if (minSetting < 1) {
        // Percentage of original
        return Math.max(1, Math.floor(originalValue * minSetting));
    } else {
        // Absolute minimum
        return minSetting;
    }
}

/**
 * Get the current value of a stat, considering all modifications
 * @param {Object} pokemon - The Pokémon to check
 * @param {string} statName - The name of the stat to get
 * @returns {number} - The current stat value
 */
export function getCurrentStatValue(pokemon, statName) {
    if (!pokemon || !pokemon.uniqueId) return 0;
    
    // Initialize if needed
    initializeStatTracking(pokemon);
    
    // Normalize stat name
    const normalizedStatName = normalizeStatName(statName);
    if (!normalizedStatName) return 0;
    
    // Get original value
    const originalStats = getOriginalStats(pokemon);
    const originalValue = originalStats[normalizedStatName];
    
    if (originalValue === undefined) return 0;
    
    // Check if this stat uses stage-based calculation
    const isStageBasedStat = stageBased.includes(normalizedStatName);
    
    if (isStageBasedStat) {
        // Get the current stage
        const stages = statStages.get(pokemon.uniqueId);
        if (!stages || stages[normalizedStatName] === undefined) {
            return originalValue; // No modifications
        }
        
        // Get the stage and calculate the value with the stage multiplier
        const stage = stages[normalizedStatName];
        const multiplier = stageMultipliers[stage.toString()];
        return Math.round(originalValue * multiplier);
    } else {
        // For non-stage-based stats, use the original system
        // Get modifications
        const modifications = statModifications.get(pokemon.uniqueId);
        if (!modifications || !modifications.has(normalizedStatName)) {
            return originalValue; // No modifications
        }
        
        const statMod = modifications.get(normalizedStatName);
        
        // Direct addition/subtraction for gena, pa, bw
        const newValue = originalValue + statMod.total;
        
        // Ensure it doesn't go below minimum
        const minValue = getMinimumStatValue(normalizedStatName, originalValue);
        return Math.max(minValue, newValue);
    }
}

/**
 * Get a display string for a stat value showing original in brackets if modified
 * @param {Object} pokemon - The Pokémon to check
 * @param {string} statName - The name of the stat to display
 * @returns {string} - The formatted stat value display
 */
export function getStatValueDisplay(pokemon, statName) {
    if (!pokemon || !pokemon.uniqueId) return "";
    
    // Initialize if needed
    initializeStatTracking(pokemon);
    
    // Normalize stat name
    const normalizedStatName = normalizeStatName(statName);
    if (!normalizedStatName) return "";
    
    // Get original and current values
    const originalStats = getOriginalStats(pokemon);
    const originalValue = originalStats[normalizedStatName];
    const currentValue = getCurrentStatValue(pokemon, statName);
    
    // Check if this is a stage-based stat
    const isStageBasedStat = stageBased.includes(normalizedStatName);
    
    // Get current stage if applicable
    let stageText = "";
    if (isStageBasedStat) {
        const stages = statStages.get(pokemon.uniqueId);
        if (stages && stages[normalizedStatName] !== 0) {
            const stage = stages[normalizedStatName];
            stageText = ` (${stage > 0 ? '+' : ''}${stage})`;
        }
    }
    
    // Display differently based on value change
    if (currentValue > originalValue) {
        return `<span style="color: green;">${currentValue}${stageText}</span> (${originalValue})`;
    } else if (currentValue < originalValue) {
        return `<span style="color: red;">${currentValue}${stageText}</span> (${originalValue})`;
    } else {
        // Even when values are the same, still show both values
        return `${currentValue} (${originalValue})`;
    }
}

/**
 * Get the original stats for a Pokémon
 * @param {Object} pokemon - The Pokémon to check
 * @returns {Object} - The original stats
 */
export function getOriginalStats(pokemon) {
    if (!pokemon || !pokemon.uniqueId) return {};
    
    // Initialize if needed
    initializeStatTracking(pokemon);
    
    return originalStats.get(pokemon.uniqueId) || {};
}

/**
 * Get the current stage for a specific stat
 * @param {Object} pokemon - The Pokémon to check
 * @param {string} statName - The name of the stat to get the stage for
 * @returns {number} - The current stage (-6 to +6) or 0 if not found
 */
export function getCurrentStage(pokemon, statName) {
    if (!pokemon || !pokemon.uniqueId) return 0;
    
    // Initialize if needed
    initializeStatTracking(pokemon);
    
    // Normalize stat name
    const normalizedStatName = normalizeStatName(statName);
    if (!normalizedStatName) return 0;
    
    // Check if this stat uses stage-based calculation
    const isStageBasedStat = stageBased.includes(normalizedStatName);
    if (!isStageBasedStat) return 0; // Non-stage stats don't have stages
    
    // Get stages
    const stages = statStages.get(pokemon.uniqueId);
    if (!stages || stages[normalizedStatName] === undefined) {
        return 0;
    }
    
    return stages[normalizedStatName];
}

/**
 * Get all stat modifications for a Pokémon
 * @param {Object} pokemon - The Pokémon to check
 * @returns {Map|null} - Map of stat modifications or null if none
 */
export function getStatModifications(pokemon) {
    if (!pokemon || !pokemon.uniqueId) return null;
    
    return statModifications.get(pokemon.uniqueId) || null;
}

/**
 * Get all stat stages for a Pokémon
 * @param {Object} pokemon - The Pokémon to check
 * @returns {Object|null} - Object with stat stages or null if none
 */
export function getStatStages(pokemon) {
    if (!pokemon || !pokemon.uniqueId) return null;
    
    return statStages.get(pokemon.uniqueId) || null;
}

/**
 * Reset all stat modifications for a Pokémon
 * @param {Object} pokemon - The Pokémon to reset
 */
export function resetStatModifications(pokemon) {
    if (!pokemon || !pokemon.uniqueId) return;
    
    // Reset modification history
    statModifications.set(pokemon.uniqueId, new Map());
    
    // Reset stages to 0
    const stages = statStages.get(pokemon.uniqueId);
    if (stages) {
        for (const stat in stages) {
            stages[stat] = 0;
        }
    }
    
    // Log the reset
    logBattleEvent(`${pokemon.name}'s Statuswerte wurden zurückgesetzt.`);
}

/**
 * Check if a Pokémon has stat modifications
 * @param {Object} pokemon - The Pokémon to check
 * @returns {boolean} - Whether the Pokémon has any stat modifications
 */
export function hasStatModifications(pokemon) {
    if (!pokemon || !pokemon.uniqueId) return false;
    
    // Check for stage-based modifications
    const stages = statStages.get(pokemon.uniqueId);
    if (stages) {
        for (const stat in stages) {
            if (stages[stat] !== 0) {
                return true;
            }
        }
    }
    
    // Check for direct modifications (for non-stage stats)
    const mods = statModifications.get(pokemon.uniqueId);
    if (!mods) return false;
    
    return mods.size > 0;
}

/**
 * Get HTML for displaying all modified stats
 * @param {Object} pokemon - The Pokémon to display stats for
 * @returns {string} - HTML string of modified stats
 */
export function getModifiedStatsHTML(pokemon) {
    if (!pokemon || !pokemon.uniqueId || !hasStatModifications(pokemon)) {
        return "";
    }
    
    // Get all modifications
    const mods = statModifications.get(pokemon.uniqueId);
    const stages = statStages.get(pokemon.uniqueId);
    const original = originalStats.get(pokemon.uniqueId);
    
    let html = '<div class="modified-stats">';
    
    // Add each stage-based modified stat
    for (const statName in stages) {
        const stage = stages[statName];
        if (stage === 0) continue; // Skip unmodified stats
        
        const originalValue = original[statName];
        const currentValue = getCurrentStatValue(pokemon, statName);
        const displayName = statDisplayNames[statName];
        
        let statClass = "stat-normal";
        if (stage > 0) {
            statClass = "stat-increased";
        } else if (stage < 0) {
            statClass = "stat-decreased";
        }
        
        html += `<div class="modified-stat ${statClass}">`;
        html += `<span class="stat-name">${displayName}:</span> `;
        html += `<span class="stat-value">${currentValue}</span>`;
        html += `<span class="stat-stage">(${stage > 0 ? '+' : ''}${stage})</span>`;
        html += `<span class="stat-original">(Base: ${originalValue})</span>`;
        html += `</div>`;
    }
    
    // Add non-stage based modified stats
    if (mods) {
        for (const [statName, mod] of mods.entries()) {
            // Skip stage-based stats (already handled)
            if (stageBased.includes(statName)) continue;
            
            // Skip unmodified stats
            if (mod.total === 0) continue;
            
            const originalValue = original[statName];
            const currentValue = getCurrentStatValue(pokemon, statName);
            const displayName = statDisplayNames[statName];
            
            let statClass = "stat-normal";
            if (currentValue > originalValue) {
                statClass = "stat-increased";
            } else if (currentValue < originalValue) {
                statClass = "stat-decreased";
            }
            
            html += `<div class="modified-stat ${statClass}">`;
            html += `<span class="stat-name">${displayName}:</span> `;
            html += `<span class="stat-value">${currentValue}</span>`;
            html += `<span class="stat-original">(${originalValue})</span>`;
            html += `</div>`;
        }
    }
    
    html += '</div>';
    return html;
}