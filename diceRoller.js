/**
 * Updated Dice rolling functions for the combat system with Luck Token support
 */

/**
 * Roll a six-sided die
 * @returns {number} - The result (1-6)
 */
export function rollD6() {
    return Math.floor(Math.random() * 6) + 1;
}

/**
 * Rolls multiple dice and sums the results
 * @param {number} count - The number of dice to roll
 * @returns {number} - The sum of all dice
 */
export function rollMultipleD6(count) {
    let sum = 0;
    for (let i = 0; i < count; i++) {
        sum += rollD6();
    }
    return sum;
}

/**
 * Roll multiple D6 dice and count successes (5-6) and failures (1)
 * @param {number} diceCount - Number of dice to roll
 * @returns {Object} - Result with total net successes and details of the roll
 */
export function rollAttackDice(diceCount) {
    // Default to 1 die if not specified or invalid
    const count = (!diceCount || diceCount < 1) ? 1 : diceCount;
    
    // Roll the dice
    const rolls = [];
    let successes = 0;
    let failures = 0;
    
    for (let i = 0; i < count; i++) {
        const roll = rollD6();
        rolls.push(roll);
        
        // Count successes (5-6) and failures (1)
        if (roll >= 5) successes++;
        else if (roll === 1) failures++;
    }
    
    // Calculate net successes
    const netSuccesses = successes - failures;
    
    return {
        rolls: rolls,
        successes: successes,
        failures: failures,
        netSuccesses: netSuccesses
    };
}

/**
 * Perform a forced roll with penalty
 * @param {number} diceCount - Number of dice to roll
 * @param {number} forcedCount - How many times forced already (for penalty)
 * @param {string} forcingMode - Forcing mode ('always', 'once', 'dynamic', 'never')
 * @param {boolean} isLuckTokenRoll - Whether this is a roll after using a luck token
 * @returns {Object} - Roll results
 */
export function forcedRoll(diceCount, forcedCount, forcingMode = 'always', isLuckTokenRoll = false) {
    // Roll the dice
    const result = rollAttackDice(diceCount);
    
    // Store the raw roll result before applying penalty
    const rawNetSuccesses = result.netSuccesses;
    
    // Apply the forced penalty (subtract forcedCount successes)
    // If this is a luck token roll, we only apply the current forcing penalty, not cumulative ones
    if (isLuckTokenRoll) {
        // For luck token rolls, only apply the current level penalty (1)
        result.netSuccesses = Math.max(-999, rawNetSuccesses);
    } else {
        // Normal forced roll with cumulative penalty
        result.netSuccesses = Math.max(-999, rawNetSuccesses - forcedCount);
    }
    
    // For logging purposes, add the raw roll info and penalty info
    result.rawNetSuccesses = rawNetSuccesses;
    result.penalty = isLuckTokenRoll ? 1 : forcedCount;
    
    return result;
}

/**
 * Roll dice for damage based on damage value
 * @param {number} damageValue - The base damage value
 * @returns {Object} - Damage roll results
 */
export function rollDamageWithValue(damageValue) {
    // Ensure damage value is at least 1
    const diceCount = Math.max(1, damageValue);
    
    // Roll N dice where N is the damage value
    const rolls = [];
    let total = 0;
    
    for (let i = 0; i < diceCount; i++) {
        const roll = rollD6();
        rolls.push(roll);
        total += roll;
    }
    
    return {
        rolls: rolls,
        total: total
    };
}