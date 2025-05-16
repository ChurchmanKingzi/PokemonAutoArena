/**
 * Character preparation for combat
 */

/**
 * Initialize character with melee attack and ranged attacks
 * @param {Object} character - The character being added to a team
 * @returns {Object} - The character with initialized attacks
 */
export function initializeCharacterAttacks(character) {
    // Create attacks array if it doesn't exist
    if (!character.attacks) {
        character.attacks = [];
    }
    
    // Add Verzweifler as the default melee attack if no attacks exist
    if (character.attacks.length === 0) {
        character.attacks.push({
            type: 'melee',
            weaponName: "Verzweifler",
            damage: 5, // 5d6 damage
            range: 1
        });
    }
    
    // Update the character's max range
    character.range = calculateCharacterRange(character);
    
    return character;
}

/**
 * Calculate the maximum attack range for a character
 * @param {Object} character - The character
 * @returns {number} - Maximum attack range
 */
export function calculateCharacterRange(character) {
    // Find maximum range among all attacks
    let maxRange = 1; // Default melee range
    
    if (character.attacks && character.attacks.length > 0) {
        for (const attack of character.attacks) {
            if (attack.range > maxRange) {
                maxRange = attack.range;
            }
        }
    }
    
    return maxRange;
}