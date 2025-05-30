import { createExplosion } from '../Attacken/explosion.js';
import { getActiveProjectiles } from '../projectileSystem.js';
import { logBattleEvent } from '../battleLog.js';
import { getCurrentStatValue } from '../statChanges.js';
import { calculateSizeCategory } from '../pokemonSizeCalculator.js';
        
/**
 * Check if a defeated Pokemon should trigger Ninjajunge explosion
 * @param {Object} defeatedPokemon - The defeated Pokemon
 * @returns {boolean} - Whether to trigger explosion
 */
export function shouldTriggerNinjajungeExplosion(defeatedPokemon) {
    // Check if the Pokemon has a trainer with the Ninjajunge class
    if (!defeatedPokemon.trainer) {
        return false;
    }
    
    const trainerClass = defeatedPokemon.trainer.class || '';
    
    // Case-insensitive check for more reliability
    return trainerClass.toLowerCase() === 'ninja boy';
}

/**
 * Create and trigger a Ninjajunge explosion from a defeated Pokemon
 * @param {Object} defeatedPokemon - The defeated Pokemon
 * @param {Object} defeatedPosition - The position of the defeated Pokemon
 * @returns {Promise} - Promise that resolves when explosion is complete
 */
export async function triggerNinjajungeExplosion(defeatedPokemon, defeatedPosition) {
    try {        
        // Log the Ninjajunge effect
        logBattleEvent(`<div class="log-ninjajunge-message">💥 ${defeatedPokemon.name}'s Niederlage löst eine Explosion aus!</div>`, true);
        
        // Get the defeated Pokemon's current Attack stat
        const attackStat = getCurrentStatValue(defeatedPokemon, 'angriff');
        
        // Calculate explosion damage based on the Pokemon's Attack stat
        // Using a formula similar to how damage is calculated in the game
        // Base explosion damage + attack stat modifier
        const baseDamage = 10; // Base explosion damage
        const statModifier = Math.floor(attackStat / 10); // Scale attack stat
        const explosionDamage = baseDamage + statModifier;
                
        // Calculate the Pokemon's size category
        const pokemonSize = calculateSizeCategory(defeatedPokemon);
        
        // Calculate explosion range as 2 plus Pokemon size
        const explosionRange = 1 + pokemonSize;
                
        // Create a mock attack object for the explosion
        const explosionAttack = {
            weaponName: "Explosion",
            damage: explosionDamage,
            range: explosionRange, // 2 plus Pokemon size instead of fixed 6
            cone: 360, // Full circle
            type: 'ranged',
            moveType: 'normal', // Explosion is Normal type
            category: 'Physisch' // Explosion is physical
        };
        
        // Create attacker position object
        const attackerPos = {
            x: defeatedPosition.x,
            y: defeatedPosition.y,
            character: defeatedPokemon,
            teamIndex: defeatedPosition.teamIndex
        };
        
        // Target doesn't matter for explosion, but we need to provide one
        const dummyTarget = {
            x: defeatedPosition.x + 1,
            y: defeatedPosition.y,
            character: defeatedPokemon
        };
        
        // Get the active projectiles array
        const activeProjectiles = getActiveProjectiles();
               
        // Create the explosion
        return new Promise((resolve) => {
            createExplosion(
                attackerPos,
                dummyTarget,
                explosionAttack,
                true, 
                () => {
                    resolve();
                },
                activeProjectiles
            );
        });
        
    } catch (error) {
        console.error('Error triggering Ninjajunge explosion:', error);
        return Promise.resolve();
    }
}