/**
 * Type effectiveness lookup table for Pokémon attacks
 * Used to calculate damage multipliers between attack types and defense types
 */

// Mapping of English type names to German names
export const TYPE_NAMES_TRANSLATION = {
    'normal': 'Normal',
    'fire': 'Feuer',
    'water': 'Wasser',
    'electric': 'Elektro',
    'grass': 'Pflanze',
    'ice': 'Eis',
    'fighting': 'Kampf',
    'poison': 'Gift',
    'ground': 'Boden',
    'flying': 'Flug',
    'psychic': 'Psycho',
    'bug': 'Käfer',
    'rock': 'Gestein',
    'ghost': 'Geist',
    'dragon': 'Drache',
    'dark': 'Unlicht',
    'steel': 'Stahl',
    'fairy': 'Fee'
};

// Type effectiveness multipliers
// 0 = no effect, 0.5 = not very effective, 1 = normal effectiveness, 2 = super effective
// First key is attacking type, second key is defending type
export const TYPE_EFFECTIVENESS = {
    'normal': {
        'normal': 1, 'fire': 1, 'water': 1, 'electric': 1, 'grass': 1, 'ice': 1, 
        'fighting': 1, 'poison': 1, 'ground': 1, 'flying': 1, 'psychic': 1, 
        'bug': 1, 'rock': 0.5, 'ghost': 0, 'dragon': 1, 'dark': 1, 'steel': 0.5, 'fairy': 1
    },
    'fire': {
        'normal': 1, 'fire': 0.5, 'water': 0.5, 'electric': 1, 'grass': 2, 'ice': 2, 
        'fighting': 1, 'poison': 1, 'ground': 1, 'flying': 1, 'psychic': 1, 
        'bug': 2, 'rock': 0.5, 'ghost': 1, 'dragon': 0.5, 'dark': 1, 'steel': 2, 'fairy': 1
    },
    'water': {
        'normal': 1, 'fire': 2, 'water': 0.5, 'electric': 1, 'grass': 0.5, 'ice': 1, 
        'fighting': 1, 'poison': 1, 'ground': 2, 'flying': 1, 'psychic': 1, 
        'bug': 1, 'rock': 2, 'ghost': 1, 'dragon': 0.5, 'dark': 1, 'steel': 1, 'fairy': 1
    },
    'electric': {
        'normal': 1, 'fire': 1, 'water': 2, 'electric': 0.5, 'grass': 0.5, 'ice': 1, 
        'fighting': 1, 'poison': 1, 'ground': 0, 'flying': 2, 'psychic': 1, 
        'bug': 1, 'rock': 1, 'ghost': 1, 'dragon': 0.5, 'dark': 1, 'steel': 1, 'fairy': 1
    },
    'grass': {
        'normal': 1, 'fire': 0.5, 'water': 2, 'electric': 1, 'grass': 0.5, 'ice': 1, 
        'fighting': 1, 'poison': 0.5, 'ground': 2, 'flying': 0.5, 'psychic': 1, 
        'bug': 0.5, 'rock': 2, 'ghost': 1, 'dragon': 0.5, 'dark': 1, 'steel': 0.5, 'fairy': 1
    },
    'ice': {
        'normal': 1, 'fire': 0.5, 'water': 0.5, 'electric': 1, 'grass': 2, 'ice': 0.5, 
        'fighting': 1, 'poison': 1, 'ground': 2, 'flying': 2, 'psychic': 1, 
        'bug': 1, 'rock': 1, 'ghost': 1, 'dragon': 2, 'dark': 1, 'steel': 0.5, 'fairy': 1
    },
    'fighting': {
        'normal': 2, 'fire': 1, 'water': 1, 'electric': 1, 'grass': 1, 'ice': 2, 
        'fighting': 1, 'poison': 0.5, 'ground': 1, 'flying': 0.5, 'psychic': 0.5, 
        'bug': 0.5, 'rock': 2, 'ghost': 0, 'dragon': 1, 'dark': 2, 'steel': 2, 'fairy': 0.5
    },
    'poison': {
        'normal': 1, 'fire': 1, 'water': 1, 'electric': 1, 'grass': 2, 'ice': 1, 
        'fighting': 1, 'poison': 0.5, 'ground': 0.5, 'flying': 1, 'psychic': 1, 
        'bug': 1, 'rock': 0.5, 'ghost': 0.5, 'dragon': 1, 'dark': 1, 'steel': 0, 'fairy': 2
    },
    'ground': {
        'normal': 1, 'fire': 2, 'water': 1, 'electric': 2, 'grass': 0.5, 'ice': 1, 
        'fighting': 1, 'poison': 2, 'ground': 1, 'flying': 0, 'psychic': 1, 
        'bug': 0.5, 'rock': 2, 'ghost': 1, 'dragon': 1, 'dark': 1, 'steel': 2, 'fairy': 1
    },
    'flying': {
        'normal': 1, 'fire': 1, 'water': 1, 'electric': 0.5, 'grass': 2, 'ice': 1, 
        'fighting': 2, 'poison': 1, 'ground': 1, 'flying': 1, 'psychic': 1, 
        'bug': 2, 'rock': 0.5, 'ghost': 1, 'dragon': 1, 'dark': 1, 'steel': 0.5, 'fairy': 1
    },
    'psychic': {
        'normal': 1, 'fire': 1, 'water': 1, 'electric': 1, 'grass': 1, 'ice': 1, 
        'fighting': 2, 'poison': 2, 'ground': 1, 'flying': 1, 'psychic': 0.5, 
        'bug': 1, 'rock': 1, 'ghost': 1, 'dragon': 1, 'dark': 0, 'steel': 0.5, 'fairy': 1
    },
    'bug': {
        'normal': 1, 'fire': 0.5, 'water': 1, 'electric': 1, 'grass': 2, 'ice': 1, 
        'fighting': 0.5, 'poison': 0.5, 'ground': 1, 'flying': 0.5, 'psychic': 2, 
        'bug': 1, 'rock': 1, 'ghost': 0.5, 'dragon': 1, 'dark': 2, 'steel': 0.5, 'fairy': 0.5
    },
    'rock': {
        'normal': 1, 'fire': 2, 'water': 1, 'electric': 1, 'grass': 1, 'ice': 2, 
        'fighting': 0.5, 'poison': 1, 'ground': 0.5, 'flying': 2, 'psychic': 1, 
        'bug': 2, 'rock': 1, 'ghost': 1, 'dragon': 1, 'dark': 1, 'steel': 0.5, 'fairy': 1
    },
    'ghost': {
        'normal': 0, 'fire': 1, 'water': 1, 'electric': 1, 'grass': 1, 'ice': 1, 
        'fighting': 1, 'poison': 1, 'ground': 1, 'flying': 1, 'psychic': 2, 
        'bug': 1, 'rock': 1, 'ghost': 2, 'dragon': 1, 'dark': 0.5, 'steel': 1, 'fairy': 1
    },
    'dragon': {
        'normal': 1, 'fire': 1, 'water': 1, 'electric': 1, 'grass': 1, 'ice': 1, 
        'fighting': 1, 'poison': 1, 'ground': 1, 'flying': 1, 'psychic': 1, 
        'bug': 1, 'rock': 1, 'ghost': 1, 'dragon': 2, 'dark': 1, 'steel': 0.5, 'fairy': 0
    },
    'dark': {
        'normal': 1, 'fire': 1, 'water': 1, 'electric': 1, 'grass': 1, 'ice': 1, 
        'fighting': 0.5, 'poison': 1, 'ground': 1, 'flying': 1, 'psychic': 2, 
        'bug': 1, 'rock': 1, 'ghost': 2, 'dragon': 1, 'dark': 0.5, 'steel': 1, 'fairy': 0.5
    },
    'steel': {
        'normal': 1, 'fire': 0.5, 'water': 0.5, 'electric': 0.5, 'grass': 1, 'ice': 2, 
        'fighting': 1, 'poison': 1, 'ground': 1, 'flying': 1, 'psychic': 1, 
        'bug': 1, 'rock': 2, 'ghost': 1, 'dragon': 1, 'dark': 1, 'steel': 0.5, 'fairy': 2
    },
    'fairy': {
        'normal': 1, 'fire': 0.5, 'water': 1, 'electric': 1, 'grass': 1, 'ice': 1, 
        'fighting': 2, 'poison': 0.5, 'ground': 1, 'flying': 1, 'psychic': 1, 
        'bug': 1, 'rock': 1, 'ghost': 1, 'dragon': 2, 'dark': 2, 'steel': 0.5, 'fairy': 1
    }
};

/**
 * Get effectiveness multiplier for an attack type against a target Pokémon
 * @param {string} attackType - The type of attack (in English)
 * @param {Array} targetTypes - Array of target Pokémon's types (in English)
 * @returns {number} - Effectiveness multiplier
 */
export function getTypeEffectiveness(attackType, targetTypes) {
    // Default to normal effectiveness
    if (!attackType || !targetTypes || targetTypes.length === 0) {
        console.log("Missing type data in getTypeEffectiveness:", { attackType, targetTypes });
        return 1;
    }
    
    const lowerAttackType = attackType.toLowerCase();
    
    // If attackType is not in our table, return normal effectiveness
    if (!TYPE_EFFECTIVENESS[lowerAttackType]) {
        console.log(`Attack type ${lowerAttackType} not found in effectiveness table`);
        return 1;
    }
    
    // For multiple types, multiply the effectiveness against each type
    let multiplier = 1;
    for (const targetType of targetTypes) {
        if (!targetType) continue; // Skip null/undefined types
        
        const lowerTargetType = targetType.toLowerCase();
        if (TYPE_EFFECTIVENESS[lowerAttackType][lowerTargetType] !== undefined) {
            multiplier *= TYPE_EFFECTIVENESS[lowerAttackType][lowerTargetType];
        } else {
            console.log(`Target type ${lowerTargetType} not found in effectiveness table for ${lowerAttackType}`);
        }
    }
    return multiplier;
}

/**
 * Get effectiveness description for an attack type against a target Pokémon
 * @param {string} attackType - The type of attack (in English)
 * @param {Array} targetTypes - Array of target Pokémon's types (in English)
 * @returns {string} - Description of effectiveness
 */
export function getTypeEffectivenessDescription(attackType, targetTypes) {
    const effectiveness = getTypeEffectiveness(attackType, targetTypes);
    
    if (effectiveness === 0) {
        return "hat keine Wirkung";
    } else if (effectiveness < 1) {
        return "ist nicht sehr effektiv";
    } else if (effectiveness > 1) {
        return "ist super effektiv";
    } else {
        return "hat normale Wirkung";
    }
}

/**
 * Determine if an attack is physical or special based on its type
 * (In older Pokémon games, the attack category was determined by type)
 * @param {string} attackType - The type of attack (in English)
 * @returns {string} - 'Physisch' or 'Speziell'
 */
export function determineAttackCategory(attackType) {
    if (!attackType) return 'Physisch';
    
    const physicalTypes = ['normal', 'fighting', 'flying', 'poison', 'ground', 'rock', 'bug', 'ghost', 'steel'];
    
    if (physicalTypes.includes(attackType.toLowerCase())) {
        return 'Physisch';
    } else {
        return 'Speziell';
    }
}

/**
 * Get target's defense stat based on attack category
 * @param {string} category - Attack category ('Physisch' or 'Speziell')
 * @param {Object} targetStats - Target's stats
 * @returns {number} - Defense value
 */
export function getTargetDefense(category, targetStats) {
    if (category === 'Physisch') {
        return targetStats.Verteidigung || targetStats.defense || 0;
    } else {
        return targetStats['Spezial-Verteidigung'] || targetStats['special-defense'] || 0;
    }
}

/**
 * Get attacker's attack stat based on attack category
 * @param {string} category - Attack category ('Physisch' or 'Speziell')
 * @param {Object} attackerStats - Attacker's stats
 * @returns {number} - Attack value
 */
export function getAttackerAttack(category, attackerStats) {
    if (category === 'Physisch') {
        return attackerStats.Angriff || attackerStats.attack || 0;
    } else {
        return attackerStats['Spezial-Angriff'] || attackerStats['special-attack'] || 0;
    }
}
