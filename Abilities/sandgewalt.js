import { getCurrentWeather, changeWeather, WEATHER_TYPES } from '../weather.js';
import { logBattleEvent } from '../battleLog.js';

// Global counter for sand attacks by Pokemon with Sandgewalt
let sandAttackCounter = 0;

/**
 * Check if a Pokemon has the Sandgewalt ability
 * @param {Object} pokemon - Pokemon character object
 * @returns {boolean} - Whether the Pokemon has Sandgewalt
 */
export function hasSandgewalt(pokemon) {
    const abilities = pokemon.statsDetails?.abilities;
    if (!abilities) return false;
    
    return abilities.some(ability => 
        ability.name === "Sandgewalt" || ability.englishName === "sand-force"
    );
}

/**
 * Check if Sandgewalt should boost physical attack damage
 * @param {Object} attacker - Attacker Pokemon
 * @param {string} attackCategory - Attack category ("Physisch" or "Speziell")
 * @returns {boolean} - Whether damage should be boosted
 */
export function shouldBoostSandgewaltDamage(attacker, attackCategory) {
    // Must have Sandgewalt ability
    if (!hasSandgewalt(attacker)) return false;
    
    // Must be a physical attack
    if (attackCategory?.toLowerCase() !== 'physisch' && attackCategory?.toLowerCase() !== 'physical') {
        return false;
    }
    
    // Must be in sandstorm weather
    const currentWeather = getCurrentWeather();
    return currentWeather.state === WEATHER_TYPES.SANDSTURM;
}

/**
 * Apply Sandgewalt damage boost to physical attacks
 * @param {number} baseDamage - Base damage before boost
 * @param {Object} attacker - Attacker Pokemon
 * @param {string} attackCategory - Attack category
 * @returns {Object} - {damage: number, boosted: boolean, message: string}
 */
export function applySandgewaltDamageBoost(baseDamage, attacker, attackCategory) {
    if (!shouldBoostSandgewaltDamage(attacker, attackCategory)) {
        return {
            damage: baseDamage,
            boosted: false,
            message: null
        };
    }
    
    // Apply 30% damage boost
    const boostedDamage = Math.round(baseDamage * 1.3);
    
    return {
        damage: boostedDamage,
        boosted: true,
        message: `${attacker.name}s Sandgewalt verstärkt den physischen Angriff!`
    };
}

/**
 * Check if an attack name contains "sand"
 * @param {string} attackName - Name of the attack
 * @returns {boolean} - Whether the attack name contains "sand"
 */
function isSandAttack(attackName) {
    if (!attackName) return false;
    return attackName.toLowerCase().includes('sand');
}

/**
 * Handle sand attack counter and potential weather change
 * @param {Object} attacker - Attacker Pokemon
 * @param {Object} selectedAttack - The attack being used
 * @returns {boolean} - Whether weather was changed
 */
export function handleSandAttackCounter(attacker, selectedAttack) {
    // Must have Sandgewalt ability
    if (!hasSandgewalt(attacker)) return false;
    
    // Must be a sand attack
    if (!isSandAttack(selectedAttack.weaponName)) return false;
    
    // Increment counter
    sandAttackCounter++;
    
    logBattleEvent(`${attacker.name} setzt eine Sand-Attacke ein! (Sand-Zähler: ${sandAttackCounter}/3)`);
    
    // Check if counter reached 3
    if (sandAttackCounter >= 3) {
        // Reset counter
        sandAttackCounter = 0;
        
        // Change weather to Sandsturm for 3 turns
        changeWeather(WEATHER_TYPES.SANDSTURM, 3);
        
        logBattleEvent(`${attacker.name}s wiederholte Sand-Attacken haben einen Sandsturm heraufbeschworen!`);
        
        return true;
    }
    
    return false;
}

/**
 * Get the current sand attack counter (for debugging/display purposes)
 * @returns {number} - Current counter value
 */
export function getSandAttackCounter() {
    return sandAttackCounter;
}

/**
 * Reset the sand attack counter (for battle initialization)
 */
export function resetSandAttackCounter() {
    sandAttackCounter = 0;
}

/**
 * Manually set the sand attack counter (for testing purposes)
 * @param {number} value - New counter value
 */
export function setSandAttackCounter(value) {
    sandAttackCounter = Math.max(0, value);
}