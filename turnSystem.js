import { logBattleEvent } from './battleLog.js';
import { getSortedCharacters, getSortedCharactersDisplay } from './initiative.js';
import { getCharacterPositions } from './characterPositions.js';
import { highlightActiveCharacter, unhighlightActiveCharacter } from './animationManager.js';
import { findNearestEnemy, findNearestEnemyInRange, getBestAttack, performAttack, findNearestAlly, findNearestAllyInRange } from './attackSystem.js';
import { updateInitiativeHP } from './initiativeDisplay.js';
import { processMovementWithTerrainChecks } from './movementRange.js';
import { processStatusEffectsStart, processStatusEffectsEnd, hasStatusEffect } from './statusEffects.js';
import { resetTakenTurnsTracker, markTurnTaken, getNextImmediateTurn } from './initiativeChanges.js';
import { animateStatBoost } from './animationManager.js';
import { changeStatValue, getCurrentStage } from './statChanges.js';
import { isLineOfSightBlockedByAlly } from './projectileSystem.js';
import { calculateMinDistanceBetweenPokemon } from './pokemonDistanceCalculator.js';
import { doesPokemonOccupyTile } from './pokemonDistanceCalculator.js';
import { calculateSizeCategory } from './pokemonSizeCalculator.js';
import { GRID_SIZE } from './config.js';
import { areAllTeamMembersFleeing, findFurthestTileFromEnemies } from './Strategien/fliehend.js';
import { shouldUseStatusMove, getBestAttackWithStatusLogic, selectAimingTarget, selectOpportunisticTarget } from './Strategien/movePrioritization.js';
import { calculateMovementRange } from './movementRange.js';
import { findPathToTarget } from './pathfinding.js';
import { updatePokemonPosition } from './pokemonOverlay.js';
import { isConeAttack } from './coneHits.js';

import { animateSchwerttanz } from './Attacken/schwerttanz.js';
import { animatePanzerschutz } from './Attacken/panzerschutz.js';
import { animateHärtner } from './Attacken/härtner.js';
import { animateEisenabwehr } from './Attacken/eisenabwehr.js';
import { animateEinigler } from './Attacken/einigler.js';
import { animateAgilitaet } from './Attacken/agilitaet.js';
import { handleTurnChainBreaking, isInWalzerChain, updateWalzerChainVisual } from './Attacken/walzer.js';
import { checkAndHandleSonnentag } from './Attacken/sonnentag.js';
import { checkAndHandleRegentanz } from './Attacken/regentanz.js';
import { checkAndHandleSandsturm } from './Attacken/sandsturm.js';
import { checkAndHandleHagelsturm } from './Attacken/hagelsturm.js';
import { checkAndHandleSchneelandschaft } from './Attacken/schneelandschaft.js';

import { focusOnCharacter } from './cameraSystem.js';
import { shouldStartNewRound, getNextPokemonForTurn } from './initiativeChanges.js';
import { calculateDoubleTurns, resetDoubleTurnCounters, markTurnTaken as markDoubleTurnTaken, hasDoubleTurns, getTurnsTakenThisRound } from './doubleTurnSystem.js';
import { startOfTurnClassCheck } from './classManager.js';
import { getCurrentWeather, reduceWeatherTimer, applyWeatherEffects } from './weather.js';
import { findSupportMoves, getRandomValidAttack } from './utils.js';

import { handleJongleurSwap } from './Klassen/jongleur.js';

// Current turn counter
let currentTurn = 0;

// Flag to prevent multiple turn ends (which would then call multiple new turns)
let currentTurnEnded = false;

// Flag to track if turn ending is in progress
let currentTurnEndingInProgress = false;

// Track the last character that ended a turn to prevent duplicates
let lastTurnEndedCharacter = null;

// Track immediate turn requests
let pendingImmediateTurn = null;

// ANIMATION DELAY CONSTANTS
const STANDARD_TURN_END_DELAY = 100;
const DOUBLE_TURN_ANIMATION_DELAY = 1500; // 1.5 seconds for double turns to ensure animations complete
const POST_ATTACK_DELAY = 500; // Extra delay after attacks with potential animations

//Wait on Explosions
let explosionsInProgress = 0;
let explosionCompletionCallbacks = [];

// Track all long-running attacks in progress
let attacksInProgress = 0;
let attackCompletionCallbacks = [];
let activeAttackTypes = new Set();

/**
 * Get the effective range of an attack for turn system logic
 * Cone attacks get -1 range penalty during selection
 * @param {Object} attack - The attack object
 * @returns {number} - Effective range for selection
 */
function getEffectiveRangeForTurnLogic(attack) {
    const baseRange = attack.range || 1;
    
    // Check if this is a cone attack
    if (isConeAttack(attack)) {
        return Math.max(1, baseRange - 1); // Minimum range of 1, subtract 1 for cone attacks
    }
    
    return baseRange;
}

/**
 * Get the current turn number
 * @returns {number} - Current turn number
 */
export function getCurrentTurn() {
    return currentTurn;
}

/**
 * Reset the turn counter
 */
export function resetTurn() {
    currentTurn = 0;
    currentTurnEnded = false;
    currentTurnEndingInProgress = false;
    lastTurnEndedCharacter = null;
    pendingImmediateTurn = null;
    
    // Reset explosion tracking
    explosionsInProgress = 0;
    explosionCompletionCallbacks = [];
    
    console.log("Turn system state reset");
}

/**
 * Check if the battle is over (only one team remaining)
 * @returns {number|null} - Winning team index or null if battle continues
 */
export function checkBattleEnd() {
    const characterPositions = getCharacterPositions();
    // Get all remaining teams
    const remainingTeams = new Set();
    
    for (const charId in characterPositions) {
        // Only count characters that aren't defeated
        if (!characterPositions[charId].isDefeated) {
            remainingTeams.add(characterPositions[charId].teamIndex);
        }
    }
    
    // If only one team remains, that team wins
    if (remainingTeams.size === 1) {
        return Array.from(remainingTeams)[0];
    } else if (remainingTeams.size === 0) {
        // No teams left (unlikely)
        return -1;
    }
    
    // Battle continues
    return null;
}

export async function endTurn(activeCharacter) {
    // Enhanced duplicate prevention
    if (currentTurnEnded || currentTurnEndingInProgress) {
        console.warn('endTurn() called multiple times for the same turn - ignoring duplicate');
        console.trace(); // This will help identify where the duplicate calls are coming from
        return;
    }
    
    // Check if this is the exact same character trying to end turn again
    if (lastTurnEndedCharacter && 
        lastTurnEndedCharacter.uniqueId === activeCharacter.character?.uniqueId) {
        console.warn(`endTurn() called again for the same character (${activeCharacter.character.name}) - ignoring duplicate`);
        return;
    }
    
    // Set flags to prevent multiple executions
    currentTurnEnded = true;
    currentTurnEndingInProgress = true;
    lastTurnEndedCharacter = activeCharacter.character;
    
    try {
        // Mark this character as having taken its turn this round
        if (activeCharacter.character && activeCharacter.character.uniqueId) {
            const pokemonId = activeCharacter.character.uniqueId;
            
            markTurnTaken(pokemonId); // Initiative system
            
            // Mark in double turn system and get current count
            const turnsTaken = markDoubleTurnTaken(pokemonId);
            
            // Simple check: if they have double turns and this was their first turn, give second turn
            if (hasDoubleTurns(pokemonId) && turnsTaken === 1) {
                logBattleEvent(`${activeCharacter.character.name} erhält einen zweiten Zug in dieser Runde!`);
                
                // Reset flags for the second turn
                currentTurnEnded = false;
                currentTurnEndingInProgress = false;
                lastTurnEndedCharacter = null;
                
                setTimeout(() => {
                    triggerImmediateTurn(pokemonId);
                    turn();
                }, DOUBLE_TURN_ANIMATION_DELAY);
                return;
            }
            
            // Log if this was their second turn
            if (turnsTaken === 2) {
                logBattleEvent(`${activeCharacter.character.name} hat beide Züge dieser Runde verwendet.`);
            }
        }
        
        // Log end of turn
        logBattleEvent(`${activeCharacter.character.name} beendet seinen Zug.`);
        
        const characterPositions = getCharacterPositions();
        
        // Find active character ID
        const activeCharId = Object.keys(characterPositions).find(id => 
            characterPositions[id].character === activeCharacter.character);
        
        if (activeCharId) {
            // Get character position
            const position = {
                x: characterPositions[activeCharId].x,
                y: characterPositions[activeCharId].y
            };
            
            // Process status effects at the end of turn
            const statusResult = await processStatusEffectsEnd(activeCharacter.character, position);
            
            // Log status effect messages
            statusResult.messages.forEach(message => {
                logBattleEvent(message);
            });
            
            // Clear the attack allies flag if it was set
            if (activeCharacter.character.attackAllies) {
                activeCharacter.character.attackAllies = false;
            }
            
            // Handle Jongleur class effect
            if (activeCharacter.character.currentKP > 0) {
                await handleJongleurSwap(activeCharacter, activeCharId);
            }
        }
        
        // Check if we've reached turn 2000
        if (currentTurn >= 2000) {
            logBattleEvent(`<div class="log-turn-header">TIMEOUT! DER KAMPF ENDET UNENTSCHIEDEN!</div>`, true);
            return;
        }

        // Wait for explosions before scheduling the next turn
        if (areExplosionsInProgress()) {
            console.log("Waiting for explosions to complete before ending turn...");
            await waitForExplosionsToComplete();
        }
        
        // Check if there's an immediate turn we need to process
        const immediateId = getNextImmediateTurn();
        if (immediateId) {
            pendingImmediateTurn = immediateId;
            
            // Reset flags for immediate turn
            currentTurnEnded = false;
            currentTurnEndingInProgress = false;
            lastTurnEndedCharacter = null;
            
            setTimeout(() => {
                turn(); 
            }, 10);
            return;
        }
        
        // Schedule next turn
        setTimeout(() => {
            // Reset flags before starting next turn
            currentTurnEnded = false;
            currentTurnEndingInProgress = false;
            lastTurnEndedCharacter = null;
            turn();
        }, 50);
        
    } catch (error) {
        console.error("Error in endTurn:", error);
        
        // Reset flags even if there's an error
        currentTurnEnded = false;
        currentTurnEndingInProgress = false;
        lastTurnEndedCharacter = null;
    } finally {
        // Always clear the "in progress" flag
        currentTurnEndingInProgress = false;
    }
}

/**
 * Handle an immediate turn for a specific Pokémon
 * @param {string} pokemonId - Unique ID of the Pokémon to give an immediate turn
 */
export function triggerImmediateTurn(pokemonId) {
    // Set pending immediate turn - this will be picked up in the next turn() call
    pendingImmediateTurn = pokemonId;
}

/**
 * Execute a single turn in the battle
 */
export async function turn() {
    // Wait for any ongoing attacks to complete before starting a new turn
    if (areAttacksInProgress()) {
        console.log(`Waiting for attacks to complete before processing next turn... (Active: ${getActiveAttackTypes().join(', ')})`);
        await waitForAttacksToComplete();
    }

    // Check if any character is in an animation state
    if (isAnyCharacterInAnimation()) {
        console.log("Character animation in progress, delaying turn processing...");
        // Wait a bit and try again
        setTimeout(() => {
            turn();
        }, 100);
        return;
    }

    // Handle immediate turn if there is one pending
    if (pendingImmediateTurn) {
        await handleImmediateTurn();
        return;
    }

    // ... rest of the function stays the same ...
    
    // Get current character positions and use logic list for turn processing
    const characterPositions = getCharacterPositions();
    let sortedCharactersLogic = getSortedCharacters();
    
    // Check if any characters remain in logic list
    if (sortedCharactersLogic.length === 0) {
        logBattleEvent(`<div class="log-turn-header">DER KAMPF IST VORBEI - KEINE CHARAKTERE ÜBRIG!</div>`, true);
        return;
    }
    
    // Check if all living Pokemon have taken their turn (new round detection)
    if (shouldStartNewRound()) {
        await startNewRound();
        // Re-fetch the sorted characters list after class effects
        sortedCharactersLogic = getSortedCharacters();
    }

    // Increment turn counter ONLY when processing a real turn
    currentTurn++;
    
    // Check if battle is over
    const winningTeam = checkBattleEnd();
    if (winningTeam !== null) {
        const teamName = (winningTeam >= 0) ? `Team ${winningTeam + 1}` : "Niemand";
        logBattleEvent(`<div class="log-turn-header">KAMPF VORBEI! ${teamName} GEWINNT!</div>`, true);
        return;
    }
    
    // Check if we've reached turn 2000 (timeout)
    if (currentTurn >= 2000) {
        logBattleEvent(`<div class="log-turn-header">TIMEOUT! DER KAMPF ENDET UNENTSCHIEDEN!</div>`, true);
        return;
    }
    
    // Get the next Pokemon that should take their turn
    const nextPokemon = getNextPokemonForTurn();
    
    if (!nextPokemon) {
        console.warn('No Pokemon available for turn, forcing new round...');
        await forceNewRound();
        return;
    }
    
    // Process the turn for the selected Pokemon
    await processPokemonTurn(nextPokemon, characterPositions);
}

/**
 * Handle an immediate turn for a pending Pokemon
 */
async function handleImmediateTurn() {
    const sortedCharactersLogic = getSortedCharacters();
    const characterPositions = getCharacterPositions();
    
    // Find the character with the pending immediate turn
    const pendingCharacter = sortedCharactersLogic.find(
        entry => entry.character && entry.character.uniqueId === pendingImmediateTurn
    );
    
    // Find the character ID
    let pendingCharId = null;
    for (const charId in characterPositions) {
        if (characterPositions[charId].character && 
            characterPositions[charId].character.uniqueId === pendingImmediateTurn) {
            pendingCharId = charId;
            break;
        }
    }
    
    // Clear the pending immediate turn
    const immediateTurnId = pendingImmediateTurn;
    pendingImmediateTurn = null;
    
    // If character found and not defeated, give them a turn
    if (pendingCharacter && pendingCharId && 
        !characterPositions[pendingCharId].isDefeated) {
        
        // Check if this is a second turn
        const turnsTaken = getTurnsTakenThisRound(immediateTurnId);
        const isSecondTurn = turnsTaken === 1;
        
        // Log that this is a special immediate turn
        if (isSecondTurn) {
            logBattleEvent(`<div class="log-turn-header">${pendingCharacter.character.name} nimmt seinen zweiten Zug!</div>`, true);
        } else {
            logBattleEvent(`<div class="log-turn-header">${pendingCharacter.character.name} erhält einen sofortigen Zug!</div>`, true);
        }
        
        // Mark this character as having taken its turn (but don't double mark for second turns)
        if (!isSecondTurn) {
            markTurnTaken(immediateTurnId);
        }
        
        // Process the immediate turn
        await executeCharacterTurn(pendingCharacter, pendingCharId, characterPositions);
    }
}

/**
 * Start a new round - reset trackers and handle round effects
 */
async function startNewRound() {
    // Reset taken turns tracker at the start of a new round
    resetTakenTurnsTracker();
    
    // Reset double turn counters
    resetDoubleTurnCounters();
    
    // Calculate which Pokemon get double turns this round
    calculateDoubleTurns();
    
    // Clear all skipTurnThisRound flags from both logic and display lists
    const sortedCharactersDisplay = getSortedCharactersDisplay();
    const sortedCharactersLogic = getSortedCharacters();
    
    sortedCharactersLogic.forEach(entry => {
        if (entry.character) {
            entry.character.skipTurnThisRound = false;
        }
    });
    sortedCharactersDisplay.forEach(entry => {
        if (entry.character) {
            entry.character.skipTurnThisRound = false;
        }
    });

    // Update weather at the end of each full round
    const currentWeather = getCurrentWeather();
    if (currentWeather.state !== "Normal" && currentWeather.timer > 0) {
        reduceWeatherTimer();
    }
    
    // Apply weather effects at the end of each full round
    await applyWeatherEffects();
    
    // Log the new round with prominent styling
    logBattleEvent(`<div class="log-round-header"><strong>Neue Runde beginnt!</strong></div>`, true);
    
    // Wait for all trainer class effects to complete before continuing
    await startOfTurnClassCheck();
    
    // Re-fetch the sorted characters list after class effects
    const updatedSortedCharactersLogic = getSortedCharacters();
    
    // Add a small delay to let players read the round start messages
    await new Promise(resolve => setTimeout(resolve, 500));
}

/**
 * Force a new round when no Pokemon are available for turns
 */
async function forceNewRound() {
    resetTakenTurnsTracker();
    
    // Try again with the first character in initiative order
    const sortedCharactersLogic = getSortedCharacters();
    if (sortedCharactersLogic.length > 0) {
        const firstPokemon = sortedCharactersLogic[0];
        const characterPositions = getCharacterPositions();
        await processPokemonTurn(firstPokemon, characterPositions);
    } else {
        logBattleEvent(`<div class="log-turn-header">DER KAMPF IST VORBEI - KEINE CHARAKTERE ÜBRIG!</div>`, true);
    }
}

/**
 * Process a turn for a specific Pokemon
 * @param {Object} activeCharacter - The Pokemon to process the turn for
 * @param {Object} characterPositions - Character positions object
 */
async function processPokemonTurn(activeCharacter, characterPositions) {
    // Find the active character's ID using uniqueId
    let activeCharId = null;
    for (const charId in characterPositions) {
        if (characterPositions[charId].character && 
            characterPositions[charId].character.uniqueId === activeCharacter.character.uniqueId) {
            activeCharId = charId;
            break;
        }
    }
    
    // Double-check: Skip if character is defeated, should skip turn, OR is in animation
    if (!activeCharId || 
        characterPositions[activeCharId].isDefeated || 
        (activeCharacter.character && activeCharacter.character.skipTurnThisRound) ||
        isCharacterInAnimation(activeCharacter.character, characterPositions[activeCharId])) {
        
        // Handle skip scenarios
        await handleSkippedTurn(activeCharacter);
        return;
    }
    
    // Mark this character as having taken its turn this round
    markTurnTaken(activeCharacter.character.uniqueId);
    
    // Execute the character's turn
    await executeCharacterTurn(activeCharacter, activeCharId, characterPositions);
}

/**
 * Handle a Pokemon that should skip their turn
 * @param {Object} activeCharacter - The Pokemon skipping their turn
 */
async function handleSkippedTurn(activeCharacter) {
    // Clear the skip flag if we're skipping due to it
    if (activeCharacter.character && activeCharacter.character.skipTurnThisRound) {
        // WALZER CHAIN: Break chain when Pokemon skips turn due to skipTurnThisRound
        handleTurnChainBreaking(activeCharacter.character, 'skip');
        
        activeCharacter.character.skipTurnThisRound = false;
    }
    
    // Mark as taken turn even though skipped
    markTurnTaken(activeCharacter.character.uniqueId);
    
    // Continue to next turn
    setTimeout(() => {
        currentTurnEnded = false;
        turn();
    }, 50);
}

/**
 * Execute the actual turn logic for a character
 * @param {Object} activeCharacter - The Pokemon taking their turn
 * @param {string} activeCharId - The character's ID on the battlefield
 * @param {Object} characterPositions - Character positions object
 */
async function executeCharacterTurn(activeCharacter, activeCharId, characterPositions) {
    // Reset swim check flags
    if (activeCharId) {
        characterPositions[activeCharId].hasPassedSwimmingCheck = false;
        if (characterPositions[activeCharId].character) {
            characterPositions[activeCharId].character.hasPassedSwimmingCheck = false;
        }
    }
    
    // Log the character's name header first
    const characterName = activeCharacter.character.name;
    logBattleEvent(`<div class="log-turn-header">${characterName} ist dran!</div>`, true);
    
    // Then log the regular turn message
    logBattleEvent(`${characterName} ist am Zug.`);
    
    // WALZER CHAIN: Apply visual state if Pokemon is in a chain
    if (isInWalzerChain(activeCharacter.character)) {
        updateWalzerChainVisual(activeCharacter.character, true);
    }
    
    // Highlight the active character
    highlightActiveCharacter(activeCharId);
    
    // Focus camera on the active character - AWAIT to ensure camera movement completes
    await focusOnCharacter(activeCharId);
    
    // Add delay AFTER camera arrives at its location
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Process status effects at start of turn
    const statusMessages = processStatusEffectsStart(activeCharacter.character);
    
    // Log any status messages
    statusMessages.forEach(message => {
        logBattleEvent(message);
    });
    
    // Skip turn if a status effect caused it
    if (activeCharacter.character.skipTurn) {
        // WALZER CHAIN: Break chain when Pokemon skips turn due to status effect
        handleTurnChainBreaking(activeCharacter.character, 'skip');
        
        // Remove the flag for next turn
        activeCharacter.character.skipTurn = false;
        
        // End turn immediately
        setTimeout(() => {
            unhighlightActiveCharacter();
            endTurn(activeCharacter);
        }, STANDARD_TURN_END_DELAY);
        return;
    }
    
    // Get character strategy and execute turn based on it
    const strategy = characterPositions[activeCharId].character.strategy || 'aggressive';
    
    await takeTurn(activeCharId, activeCharacter);
}

/**
 * Enhanced performAttack wrapper that handles Walzer chains and respects pre-selected attacks
 * @param {Object} attacker - Attacker character data
 * @param {Object} target - Target character data
 * @param {Object} preferredAttack - Optional pre-selected attack to use instead of getBestAttack
 * @returns {Promise<Object>} - Attack results
 */
async function performAttackWithChainManagement(attacker, target, preferredAttack = null) {
    let selectedAttack;
    
    if (preferredAttack) {
        // Use the pre-selected attack (e.g., from status move selection)
        selectedAttack = preferredAttack;
    } else {
        // Get the best attack that will be used (normal behavior)
        selectedAttack = await getBestAttack(attacker, target);
    }
    
    if (selectedAttack) {
        const attackName = selectedAttack.weaponName;
        
        // WALZER CHAIN MANAGEMENT - Only break chains for non-Walzer attacks
        // The increment is handled inside animateWalzer() in walzer.js
        if (attackName !== "Walzer" && isInWalzerChain(attacker.character)) {
            handleTurnChainBreaking(attacker.character, attackName);
        }
    }
    
    // If we have a preferred attack, use forced attack selection
    if (preferredAttack) {
        return await performAttackWithForcedSelection(attacker, target, preferredAttack);
    } else {
        // Normal attack behavior
        return await performAttack(attacker, target);
    }
}

/**
 * Handle the revised turn strategy for a character's turn with 5-phase combat
 * @param {string} charId - The character's ID
 * @param {Object} activeCharacter - The character data
 */
async function takeTurn(charId, activeCharacter) {
    // First: Weather Moves. Then: Buff Moves.
    let usedWeather = await checkAndHandleSonnentag(charId, activeCharacter);
    if (usedWeather) {
        return; // Exit early, turn has been handled
    }
    usedWeather = await checkAndHandleRegentanz(charId, activeCharacter);
    if (usedWeather) {
        return; // Exit early, turn has been handled
    }
    usedWeather = await checkAndHandleSandsturm(charId, activeCharacter);
    if (usedWeather) {
        return; // Exit early, turn has been handled
    }
    usedWeather = await checkAndHandleHagelsturm(charId, activeCharacter);
    if (usedWeather) {
        return; // Exit early, turn has been handled
    }
    usedWeather = await checkAndHandleSchneelandschaft(charId, activeCharacter);
    if (usedWeather) {
        return; // Exit early, turn has been handled
    }
    
    const characterPositions = getCharacterPositions();
    
    // Check if character is snared - prevent movement if so
    if (hasStatusEffect(activeCharacter.character, 'snared')) {
        logBattleEvent(`${activeCharacter.character.name} ist verstrickt und kann sich nicht bewegen!`);
        
        // Can't move, but can still try to attack from current position
        await handleSnaredTurn(charId, activeCharacter, characterPositions);
        return;
    }

    // Handle confusion - target allies instead of enemies if confused
    if (activeCharacter.character.isConfused) {
        await handleConfusedTurn(charId, activeCharacter, characterPositions);
        return;
    }
    
    // === 5-PHASE COMBAT SYSTEM ===
    await executeFivePhaseCombat(charId, activeCharacter, characterPositions);
}

/**
 * Execute the 5-phase combat system with enhanced status move selection,
 * integrated buff move handling, aiming strategy support, and opportunistic strategy
 * @param {string} charId - The character's ID
 * @param {Object} activeCharacter - The character data
 * @param {Object} characterPositions - Character positions object
 */
async function executeFivePhaseCombat(charId, activeCharacter, characterPositions) {
    // === PHASE 0: BUFF MOVE CHECK (highest priority) ===
    // Calculate probability of using a buff move
    let buffProbability = 0.05; // Base 5% chance
    
    // Get the base stat total
    const baseStatTotal = activeCharacter.character.statsDetails?.baseStatTotal || 500; // Default to 500 if not available
    
    // For every full 80 points below 600, add 10% probability
    const pointsBelow600 = Math.max(0, 600 - baseStatTotal);
    const additionalProbability = Math.floor(pointsBelow600 / 80) * 0.10;
    buffProbability += additionalProbability;
    
    // Triple probability for "Verstärkend" strategy
    if (activeCharacter.character.strategy === 'reinforcing') {
        buffProbability *= 3;
    }
    
    // Cap at 80%
    buffProbability = Math.min(buffProbability, 0.8);
    
    // Roll for buff move
    const buffRoll = Math.random();
    if (buffRoll <= buffProbability) {
        // Try to find a valid buff move
        const buffMoves = (activeCharacter.character.attacks || []).filter(attack => 
            attack.buff === true && 
            (attack.currentPP === undefined || attack.currentPP > 0)
        );
        
        // Shuffle buff moves to select a random one
        const shuffledBuffMoves = [...buffMoves].sort(() => Math.random() - 0.5);
        
        // Look for a valid buff move (where not all stats are at +6)
        let validBuffMove = null;
        
        for (const move of shuffledBuffMoves) {
            if (move.buffedStats && move.buffedStats.length > 0) {
                // Check if any of the stats are not at max stage (+6)
                const hasNonMaxedStat = move.buffedStats.some(statName => {
                    const normalizedStatName = normalizeStatName(statName);
                    const currentStage = getCurrentStage(activeCharacter.character, normalizedStatName);
                    return currentStage < 6; // Not at max stage
                });
                
                if (hasNonMaxedStat) {
                    validBuffMove = move;
                    break;
                }
            } else {
                // If no specific stats are listed, assume it's a valid buff move
                validBuffMove = move;
                break;
            }
        }
        
        // If we found a valid buff move, use it and end turn
        if (validBuffMove) {
            // WALZER CHAIN: Break chain when using a buff move instead of attacking
            if (isInWalzerChain(activeCharacter.character)) {
                handleTurnChainBreaking(activeCharacter.character, validBuffMove.weaponName);
            }
            
            // Apply the buff move (this is awaited and includes animations)
            await applyBuffMove(charId, activeCharacter.character, validBuffMove);
            
            const finalPos = characterPositions[charId];
            updatePokemonPosition(charId, finalPos.x, finalPos.y);

            // FIXED: Extended delay for buff moves to account for animations
            setTimeout(() => {
                unhighlightActiveCharacter();
                endTurn(activeCharacter);
            }, POST_ATTACK_DELAY); // 500ms delay after buff moves
            return; // Exit early - buff move takes precedence over everything else
        }
    }
    
    // === STRATEGY-BASED TARGET SELECTION ===
    const pokemonStrategy = activeCharacter.character.strategy;
    let nearestEnemy;
    let selectedMove = null;
    let bestAttack = null;
    let isSpecialStrategy = false;
    
    // OPPORTUNISTIC STRATEGY - Highest priority for target selection
    if (pokemonStrategy === 'opportunistic' || pokemonStrategy === 'opportunistisch') {
        // Use opportunistic strategy to select optimal target and attack combination
        const opportunisticResult = await selectOpportunisticTarget(charId, activeCharacter, characterPositions);
        
        if (opportunisticResult) {
            nearestEnemy = opportunisticResult.target;
            selectedMove = opportunisticResult.attack;
            bestAttack = opportunisticResult.attack;
            isSpecialStrategy = true;
            
            logBattleEvent(`${activeCharacter.character.name} verwendet Opportunistik-Strategie: ${selectedMove.weaponName} gegen ${nearestEnemy.character.name}.`);
        } else {
            // Fall back to nearest enemy if no opportunistic target found
            nearestEnemy = findNearestEnemy(
                activeCharacter.character, 
                characterPositions[charId].teamIndex, 
                characterPositions[charId].x, 
                characterPositions[charId].y
            );
        }
    }
    // AIMING STRATEGY
    else if (pokemonStrategy === 'aiming' || pokemonStrategy === 'zielend') {
        // Use aiming strategy to select optimal target and attack
        const aimingResult = await selectAimingTarget(charId, activeCharacter, characterPositions);
        
        if (aimingResult) {
            nearestEnemy = aimingResult.target;
            selectedMove = aimingResult.attack;
            bestAttack = aimingResult.attack;
            isSpecialStrategy = true;
            
            logBattleEvent(`${activeCharacter.character.name} verwendet Zielen-Strategie: ${selectedMove.weaponName} gegen ${nearestEnemy.character.name}.`);
        } else {
            // Fall back to nearest enemy if no aiming target found
            nearestEnemy = findNearestEnemy(
                activeCharacter.character, 
                characterPositions[charId].teamIndex, 
                characterPositions[charId].x, 
                characterPositions[charId].y
            );
        }
    } else {
        // === NORMAL TARGET SELECTION ===
        nearestEnemy = findNearestEnemy(
            activeCharacter.character, 
            characterPositions[charId].teamIndex, 
            characterPositions[charId].x, 
            characterPositions[charId].y
        );
    }
    
    if (!nearestEnemy) {
        logBattleEvent(`${activeCharacter.character.name} findet kein Ziel zum Angreifen.`);
        setTimeout(() => {
            unhighlightActiveCharacter();
            endTurn(activeCharacter);
        }, STANDARD_TURN_END_DELAY);
        return;
    }
    
    // === MOVE SELECTION (skip if special strategy already selected move) ===
    if (!isSpecialStrategy) {
        // === SUPPORTING STRATEGY LOGIC ===
        if (pokemonStrategy === 'unterstützend' || pokemonStrategy === 'supporting') {
            // Check for support moves first
            const supportMoves = findSupportMoves(activeCharacter.character);
            
            if (supportMoves.length > 0) {
                // Always use a support move if available
                const randomIndex = Math.floor(Math.random() * supportMoves.length);
                selectedMove = supportMoves[randomIndex];
                
                bestAttack = await getBestAttackWithStatusLogic(
                    characterPositions[charId],
                    characterPositions[nearestEnemy.id],
                    selectedMove
                );
                
                logBattleEvent(`${activeCharacter.character.name} verwendet Unterstützungsattacke ${selectedMove.weaponName}.`);
            } else {
                // No support moves available, use random attack
                const randomAttack = getRandomValidAttack(activeCharacter.character);
                
                if (randomAttack) {
                    selectedMove = randomAttack;
                    bestAttack = await getBestAttackWithStatusLogic(
                        characterPositions[charId],
                        characterPositions[nearestEnemy.id],
                        selectedMove
                    );
                    
                    logBattleEvent(`${activeCharacter.character.name} hat keine Unterstützungsattacken und wählt zufällig ${selectedMove.weaponName} gegen ${nearestEnemy.character.name}.`);
                }
            }
        }
        // === NORMAL STATUS MOVE LOGIC (for non-supporting Pokemon) ===
        else {
            // Check if Pokemon should use a status move
            const statusMoveDecision = shouldUseStatusMove(activeCharacter.character);
            
            if (statusMoveDecision.shouldUseStatus && statusMoveDecision.selectedMove) {
                // Use the selected status move
                selectedMove = statusMoveDecision.selectedMove;
                bestAttack = await getBestAttackWithStatusLogic(
                    characterPositions[charId],
                    characterPositions[nearestEnemy.id],
                    selectedMove
                );
                
                logBattleEvent(`${activeCharacter.character.name} entscheidet sich für Statusattacke ${selectedMove.weaponName} gegen ${nearestEnemy.character.name} (Entfernung: ${nearestEnemy.distance}).`);
            } else {
                // Use normal offensive move selection
                bestAttack = await getBestAttack(
                    characterPositions[charId],
                    characterPositions[nearestEnemy.id]
                );
                
                if (bestAttack) {
                    logBattleEvent(`${activeCharacter.character.name} wählt ${bestAttack.weaponName} gegen ${nearestEnemy.character.name} (Entfernung: ${nearestEnemy.distance}).`);
                }
            }
        }
    }
    
    if (!bestAttack) {
        logBattleEvent(`${activeCharacter.character.name} hat keine verfügbaren Attacken gegen ${nearestEnemy.character.name}.`);
        setTimeout(() => {
            unhighlightActiveCharacter();
            endTurn(activeCharacter);
        }, STANDARD_TURN_END_DELAY);
        return;
    }

    if (!bestAttack.range) {
        console.warn(`Attack ${bestAttack.weaponName} missing range property, defaulting to 1`);
        bestAttack.range = 1;
    }
    
    let hasAttacked = false;

    // === PHASE 1: Attack immediately if in range ===
    const effectiveRangeForPhase1 = getEffectiveRangeForTurnLogic(bestAttack);
    if (nearestEnemy.distance <= effectiveRangeForPhase1) {
        // Check line of sight for ranged attacks
        if (bestAttack.type === 'ranged') {
            const isBlocked = isLineOfSightBlockedByAlly(characterPositions[charId], characterPositions[nearestEnemy.id]);
            if (isBlocked) {
                logBattleEvent(`${activeCharacter.character.name} hat keine freie Schusslinie zu ${nearestEnemy.character.name}.`);
            } else {
                await executePhase1Attack(charId, activeCharacter, nearestEnemy, bestAttack, characterPositions);
                hasAttacked = true;
            }
        } else {
            // Melee attack - always possible if in range
            await executePhase1Attack(charId, activeCharacter, nearestEnemy, bestAttack, characterPositions);
            hasAttacked = true;
        }
    }
    
    // === PHASE 2: Movement to optimal range (enhanced for supporting strategy) ===
    await executePhase2MoveToMaxRange(charId, activeCharacter, nearestEnemy, bestAttack, characterPositions);
    
    // === PHASE 3: Attack after movement (if didn't attack in Phase 1) ===
    if (!hasAttacked) {
        const updatedDistance = calculateMinDistanceBetweenPokemon(
            characterPositions[charId],
            characterPositions[nearestEnemy.id]
        );
        
        const effectiveRangeForPhase3 = getEffectiveRangeForTurnLogic(bestAttack);
        if (updatedDistance <= effectiveRangeForPhase3) {
            // Check line of sight again for ranged attacks  
            if (bestAttack.type === 'ranged') {
                const isBlocked = isLineOfSightBlockedByAlly(characterPositions[charId], characterPositions[nearestEnemy.id]);
                if (!isBlocked) {
                    await executePhase3Attack(charId, activeCharacter, nearestEnemy, bestAttack, characterPositions);
                    hasAttacked = true;
                }
            } else {
                await executePhase3Attack(charId, activeCharacter, nearestEnemy, bestAttack, characterPositions);
                hasAttacked = true;
            }
        }
    }
    
    // === PHASE 4: Enhanced fallback attack (highest range move regardless of type) ===
    if (!hasAttacked) {
        await executePhase4FallbackAttack(charId, activeCharacter, nearestEnemy, characterPositions);
        hasAttacked = true; // Set flag regardless of success
    }
    
    // FIXED: Extended delay for combat turns to account for attack animations
    setTimeout(() => {
        unhighlightActiveCharacter();
        endTurn(activeCharacter);
    }, POST_ATTACK_DELAY); // 500ms delay after attacks
}

/**
 * Execute Phase 1 attack (immediate attack if in range)
 */
async function executePhase1Attack(charId, activeCharacter, nearestEnemy, bestAttack, characterPositions) {
    logBattleEvent(`${activeCharacter.character.name} greift sofort ${nearestEnemy.character.name} an!`);
    
    // Perform attack with chain management
    const attackResult = await performAttackWithChainManagement(
        characterPositions[charId], 
        characterPositions[nearestEnemy.id],
        bestAttack  // Pass the pre-selected attack
    );
    
    // Log attack results
    attackResult.log.forEach(logEntry => {
        logBattleEvent(logEntry);
    });
    
    // Update HP display
    updateInitiativeHP();
    
    // EXPLOSION SELF-DEFEAT CHECK
    if (activeCharacter.character.currentKP <= 0) {
        logBattleEvent(`${activeCharacter.character.name} wurde durch seinen eigenen Angriff besiegt!`);
        setTimeout(() => {
            unhighlightActiveCharacter();
            endTurn(activeCharacter);
        }, STANDARD_TURN_END_DELAY);
        return;
    }
}

/**
 * Execute Phase 2 movement to optimal range (now supports fleeing strategy)
 * Moves Pokemon to be exactly at their attack's max range from the target, 
 * OR away from all enemies if using fleeing strategy
 * @param {string} charId - The character's ID
 * @param {Object} activeCharacter - The character data
 * @param {Object} nearestEnemy - The target enemy data
 * @param {Object} bestAttack - The selected attack
 * @param {Object} characterPositions - Character positions object
 */
async function executePhase2MoveToMaxRange(charId, activeCharacter, nearestEnemy, bestAttack, characterPositions) {
    const currentPos = characterPositions[charId];

    // Enhanced animation check - now uses unified system
    if (isCharacterInAnimation(activeCharacter.character, currentPos) || 
        areAttacksInProgress()) {
        return;
    }

    const pokemonStrategy = activeCharacter.character.strategy;
    
    // Check if this Pokemon has fleeing strategy
    if (pokemonStrategy === 'fleeing') {
        // Check if ALL team members have fleeing strategy
        const allTeamFleeing = areAllTeamMembersFleeing(currentPos.teamIndex, characterPositions);
        
        if (!allTeamFleeing) {
            // This Pokemon has fleeing strategy but not all team members do
            // So it should flee away from enemies
            logBattleEvent(`Phase 2: ${activeCharacter.character.name} flieht vor den Gegnern.`);
            
            const attackerSize = calculateSizeCategory(activeCharacter.character);
            const fleePosition = findFurthestTileFromEnemies(
                currentPos.teamIndex, 
                characterPositions, 
                attackerSize, 
                currentPos
            );
            
            if (fleePosition) {
                // Calculate the movement range based on character's BW stat
                const movementRange = calculateMovementRange(
                    activeCharacter.character.combatStats?.bw || 1
                );
                
                // Find the best path to the flee position using pathfinding
                const path = findPathToTarget(
                    currentPos.x, 
                    currentPos.y,
                    fleePosition.x, 
                    fleePosition.y,
                    movementRange,
                    activeCharacter.character,
                    charId
                );
                
                // Execute movement if path exists
                if (path && path.path && path.path.length > 0) {
                    await new Promise(resolve => {
                        processMovementWithTerrainChecks(charId, characterPositions[charId], path.path, () => {
                            const finalPos = characterPositions[charId];
                            updatePokemonPosition(charId, finalPos.x, finalPos.y);
                            resolve();
                        });
                    });
                    logBattleEvent(`${activeCharacter.character.name} flieht zu einer sicheren Position.`);
                } else {
                    logBattleEvent(`${activeCharacter.character.name} kann nicht weiter fliehen und bleibt stehen.`);
                }
            } else {
                logBattleEvent(`${activeCharacter.character.name} findet keine sichere Position zum Fliehen.`);
            }
            return; // Exit early for fleeing behavior
        } else {
            // All team members are fleeing, so this Pokemon feels cornered and fights normally
            logBattleEvent(`Phase 2: ${activeCharacter.character.name} fühlt sich in die Ecke gedrängt und kämpft normal.`);
        }
    }
    
    // Normal movement logic for non-fleeing or cornered fleeing Pokemon
    const effectiveRange = getEffectiveRangeForTurnLogic(bestAttack);
    logBattleEvent(`Phase 2: ${activeCharacter.character.name} bewegt sich zur optimalen Reichweite (${effectiveRange} Felder).`);
    
    // Calculate Pokemon size to account for multi-tile occupation
    const attackerSize = calculateSizeCategory(activeCharacter.character);
    const targetPos = characterPositions[nearestEnemy.id];
    
    // Find the optimal position that places the Pokemon at exactly the attack's effective range
    const optimalPosition = findOptimalRangePosition(
        currentPos, 
        targetPos, 
        effectiveRange, 
        attackerSize, 
        characterPositions
    );
    
    if (optimalPosition) {
        // Calculate the movement range based on character's BW stat
        const movementRange = calculateMovementRange(
            activeCharacter.character.combatStats?.bw || 1
        );
        
        // Find the best path to the optimal position using pathfinding
        const path = findPathToTarget(
            currentPos.x, 
            currentPos.y,
            optimalPosition.x, 
            optimalPosition.y,
            movementRange,
            activeCharacter.character,
            charId
        );
        
        // Execute movement if path exists
        if (path && path.path && path.path.length > 0) {
            await new Promise(resolve => {
                processMovementWithTerrainChecks(charId, characterPositions[charId], path.path, () => {
                    resolve();
                });
            });
            logBattleEvent(`${activeCharacter.character.name} erreicht die optimale Position.`);
        } else {
            logBattleEvent(`${activeCharacter.character.name} kann die optimale Position nicht erreichen.`);
        }
    } else {
        logBattleEvent(`${activeCharacter.character.name} findet keine optimale Position und bleibt stehen.`);
    }
}

/**
 * Find the optimal position for a Pokemon to be at exactly the specified range from target
 * Takes Pokemon size into account to ensure proper positioning
 * @param {Object} currentPos - Current position data
 * @param {Object} targetPos - Target position data  
 * @param {number} desiredRange - Desired distance from target
 * @param {number} pokemonSize - Size category of the Pokemon (1, 2, 3, etc.)
 * @param {Object} characterPositions - All character positions for collision checking
 * @returns {Object|null} - Optimal position {x, y} or null if none found
 */
function findOptimalRangePosition(currentPos, targetPos, desiredRange, pokemonSize, characterPositions) {
    const candidates = [];
    const targetCenterX = targetPos.x;
    const targetCenterY = targetPos.y;
    
    // Search in expanding rings around the target at the desired range
    const searchRadius = Math.max(desiredRange + pokemonSize, 10); // Ensure we search wide enough
    
    for (let x = targetCenterX - searchRadius; x <= targetCenterX + searchRadius; x++) {
        for (let y = targetCenterY - searchRadius; y <= targetCenterY + searchRadius; y++) {
            // Skip if position is out of bounds
            if (x < 0 || y < 0 || x >= GRID_SIZE || y >= GRID_SIZE) continue;
            
            // Check if this position would place the Pokemon at the desired range
            const testPos = { x, y, character: currentPos.character };
            const distanceToTarget = calculateMinDistanceBetweenPokemon(testPos, targetPos);
            
            // We want positions where the closest tile is exactly at desired range
            if (distanceToTarget === desiredRange) {
                // Check if this position is valid (no collisions, within bounds)
                if (isValidPokemonPosition(x, y, pokemonSize, characterPositions, currentPos)) {
                    // Calculate distance from current position for prioritization
                    const distanceFromCurrent = Math.abs(x - currentPos.x) + Math.abs(y - currentPos.y);
                    candidates.push({
                        x: x,
                        y: y,
                        distanceFromCurrent: distanceFromCurrent,
                        distanceToTarget: distanceToTarget
                    });
                }
            }
        }
    }
    
    if (candidates.length === 0) {
        return null;
    }
    
    // Sort by distance from current position (prefer closer moves)
    candidates.sort((a, b) => {
        // First priority: closer to current position
        if (a.distanceFromCurrent !== b.distanceFromCurrent) {
            return a.distanceFromCurrent - b.distanceFromCurrent;
        }
        // Second priority: exact range match (should all be equal due to filtering above)
        return Math.abs(a.distanceToTarget - desiredRange) - Math.abs(b.distanceToTarget - desiredRange);
    });
    
    return { x: candidates[0].x, y: candidates[0].y };
}

/**
 * Check if a position is valid for a Pokemon of given size
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate  
 * @param {number} size - Size category of Pokemon
 * @param {Object} characterPositions - All character positions
 * @param {Object} excludePos - Position to exclude from collision checking (current Pokemon)
 * @returns {boolean} - Whether position is valid
 */
export function isValidPokemonPosition(x, y, size, characterPositions, excludePos = null) {
    // Check all tiles that this Pokemon would occupy
    for (let dx = 0; dx < size; dx++) {
        for (let dy = 0; dy < size; dy++) {
            const checkX = x + dx;
            const checkY = y + dy;
            
            // Check bounds
            if (checkX < 0 || checkY < 0 || checkX >= GRID_SIZE || checkY >= GRID_SIZE) {
                return false;
            }
            
            // Check for collision with other Pokemon
            for (const charId in characterPositions) {
                const otherPos = characterPositions[charId];
                
                // Skip self and defeated Pokemon
                if (otherPos === excludePos || otherPos.isDefeated) continue;
                
                // Check if any tile of the other Pokemon overlaps with our check position
                if (doesPokemonOccupyTile(otherPos, checkX, checkY)) {
                    return false;
                }
            }
        }
    }
    
    return true;
}

/**
 * Execute Phase 3 attack (after movement, if didn't attack in Phase 1)
 */
async function executePhase3Attack(charId, activeCharacter, nearestEnemy, bestAttack, characterPositions) {    
    // Perform attack with chain management
    const attackResult = await performAttackWithChainManagement(
        characterPositions[charId], 
        characterPositions[nearestEnemy.id],
        bestAttack  // Pass the pre-selected attack
    );
    
    // Log attack results
    attackResult.log.forEach(logEntry => {
        logBattleEvent(logEntry);
    });  

    // Update HP display
    updateInitiativeHP();
    
    // EXPLOSION SELF-DEFEAT CHECK
    if (activeCharacter.character.currentKP <= 0) {
        logBattleEvent(`${activeCharacter.character.name} wurde durch seinen eigenen Angriff besiegt!`);
        setTimeout(() => {
            unhighlightActiveCharacter();
        }, STANDARD_TURN_END_DELAY);
        return;
    }
}

/**
 * Execute Phase 4 fallback attack (try longest range attack if primary attack failed)
 */
async function executePhase4FallbackAttack(charId, activeCharacter, nearestEnemy, characterPositions) {
    // Find the attack with the longest range that has PP
    const validAttacks = (activeCharacter.character.attacks || []).filter(attack => {
        return attack.weaponName === "Verzweifler" || 
               (attack.pp === undefined || attack.currentPP === undefined || attack.currentPP > 0);
    });
    
    if (validAttacks.length === 0) {
        logBattleEvent(`Phase 4: ${activeCharacter.character.name} hat keine verfügbaren Angriffe mehr.`);
        return;
    }
    
    // Sort by range (highest first)
    validAttacks.sort((a, b) => (b.range || 1) - (a.range || 1));
    const longestRangeAttack = validAttacks[0];
    
    const currentDistance = calculateMinDistanceBetweenPokemon(
        characterPositions[charId],
        characterPositions[nearestEnemy.id]
    );
    
    const effectiveRangeForPhase4 = getEffectiveRangeForTurnLogic(longestRangeAttack);
    if (currentDistance <= effectiveRangeForPhase4) {
        // Check line of sight for ranged attacks
        if (longestRangeAttack.type === 'ranged') {
            const isBlocked = isLineOfSightBlockedByAlly(characterPositions[charId], characterPositions[nearestEnemy.id]);
            if (isBlocked) {
                logBattleEvent(`Phase 4: ${activeCharacter.character.name} hat keine freie Schusslinie für ${longestRangeAttack.weaponName}.`);
                return;
            }
        }
        
        logBattleEvent(`Phase 4: ${activeCharacter.character.name} verwendet ${longestRangeAttack.weaponName} als Notfall-Angriff!`);
        
        // Perform fallback attack with chain management
        const attackResult = await performAttackWithChainManagement(
            characterPositions[charId], 
            characterPositions[nearestEnemy.id],
            longestRangeAttack  // Pass the pre-selected attack
        );
        
        // Log attack results
        attackResult.log.forEach(logEntry => {
            logBattleEvent(logEntry);
        });
        
        // Update HP display
        updateInitiativeHP();
        
        // EXPLOSION SELF-DEFEAT CHECK
        if (activeCharacter.character.currentKP <= 0) {
            logBattleEvent(`${activeCharacter.character.name} wurde durch seinen eigenen Angriff besiegt!`);
            setTimeout(() => {
                unhighlightActiveCharacter();
                endTurn(activeCharacter);
            }, STANDARD_TURN_END_DELAY);
            return;
        }
    } else {
        logBattleEvent(`Phase 4: ${activeCharacter.character.name} kann auch mit ${longestRangeAttack.weaponName} nicht angreifen (Entfernung: ${currentDistance}, Reichweite: ${effectiveRangeForPhase4}).`);
    }
}

/**
 * Handle turn for snared Pokemon (can't move but can attack)
 */
async function handleSnaredTurn(charId, activeCharacter, characterPositions) {
    try {
        const enemyInRange = await findNearestEnemyInRange(characterPositions[charId]);
        
        if (enemyInRange && enemyInRange.character) {
            logBattleEvent(`${activeCharacter.character.name} ist verstrickt, greift aber aggressiv ${enemyInRange.character.name} an!`);
            
            // Perform attack with chain management
            const attackResult = await performAttackWithChainManagement(
                characterPositions[charId], 
                characterPositions[enemyInRange.id]
            );
            
            // Log attack results
            attackResult.log.forEach(logEntry => {
                logBattleEvent(logEntry);
            });
            
            // Update HP display
            updateInitiativeHP();
        } else {
            logBattleEvent(`${activeCharacter.character.name} ist verstrickt und findet kein Ziel zum Angreifen.`);
        }
    } catch (error) {
        console.error("Error checking for enemies in range:", error);
    }
    
    // FIXED: Use POST_ATTACK_DELAY for snared turns too
    setTimeout(() => {
        unhighlightActiveCharacter();
        endTurn(activeCharacter);
    }, POST_ATTACK_DELAY);
}

/**
 * Handle turn for confused Pokemon (attacks allies)
 */
async function handleConfusedTurn(charId, activeCharacter, characterPositions) {
    // Clear the confusion flag for this turn's processing
    activeCharacter.character.isConfused = false;
    
    try {
        // Look for ally targets instead of enemies
        const allyInRange = await findNearestAllyInRange(characterPositions[charId], charId);
        
        if (allyInRange && allyInRange.character) {
            logBattleEvent(`${activeCharacter.character.name} ist verwirrt und greift Verbündeten ${allyInRange.character.name} an!`);
            
            // Perform attack on ally with chain management
            const attackResult = await performAttackWithChainManagement(
                characterPositions[charId], 
                characterPositions[allyInRange.id]
            );
            
            // Log attack results
            attackResult.log.forEach(logEntry => {
                logBattleEvent(logEntry);
            });
            
            // Update HP display
            updateInitiativeHP();
        } else {
            logBattleEvent(`${activeCharacter.character.name} ist verwirrt, findet aber keine Verbündeten zum Angreifen.`);
        }
    } catch (error) {
        console.error("Error checking for confused ally targets:", error);
    }
    
    // FIXED: Use POST_ATTACK_DELAY for confused turns too
    setTimeout(() => {
        unhighlightActiveCharacter();
        endTurn(activeCharacter);
    }, POST_ATTACK_DELAY);
}

/**
 * Calculate probability of a Pokémon using a buff move based on its base stat total
 * @param {Object} character - The Pokémon character
 * @returns {number} - Probability as a decimal (0-1)
 */
function calculateBuffMoveProbability(character) {
    // Base probability is 5%
    let probability = 1.05;
    
    // Get the base stat total
    const baseStatTotal = character.statsDetails?.baseStatTotal || 500; // Default to 500 if not available
    
    // For every full 80 points below 600, add 10% probability
    const pointsBelow600 = Math.max(0, 600 - baseStatTotal);
    const additionalProbability = Math.floor(pointsBelow600 / 80) * 0.10;
    
    // Return total probability
    return probability + additionalProbability;
}

/**
 * Find a valid buff move from a Pokémon's moves
 * @param {Object} character - The Pokémon character
 * @returns {Object|null} - A valid buff move or null if none found/usable
 */
function findValidBuffMove(character) {
    // If character has no moves, return null
    if (!character.attacks || character.attacks.length === 0) {
        return null;
    }

    for (const attack of character.attacks) {
        // Skip attacks with no PP
        if (attack.currentPP !== undefined && 
            attack.currentPP <= 0 ||
            attack.buff == undefined) {
            continue;
        }
    }
    
    // Filter for buff-type moves with available PP
    const buffMoves = character.attacks.filter(attack => 
        attack.buff === true && 
        (attack.currentPP === undefined || attack.currentPP > 0)
    );
    
    // If no buff moves found, return null
    if (buffMoves.length === 0) {
        return null;
    }
    
    // Shuffle buff moves to select a random one
    const shuffledBuffMoves = [...buffMoves].sort(() => Math.random() - 0.5);
    
    // Check each buff move to see if any stats it buffs are not maxed out
    for (const move of shuffledBuffMoves) {
        if (move.buffedStats && move.buffedStats.length > 0) {
            // Check if any of the stats are not at max stage (+6)
            const hasNonMaxedStat = move.buffedStats.some(statName => {
                const normalizedStatName = normalizeStatName(statName);
                const currentStage = getCurrentStage(character, normalizedStatName);
                return currentStage < 6; // Not at max stage
            });
            
            if (hasNonMaxedStat) {
                return move;
            }
        } else {
            // If no specific stats are listed, assume it's a valid buff move
            return move;
        }
    }
    
    // No valid buff move found
    return null;
}

/**
 * Normalize a stat name to internal format
 * @param {string} statName - The stat name to normalize
 * @returns {string} - Normalized stat name
 */
function normalizeStatName(statName) {
    const statMapping = {
        'angriff': 'angriff',
        'attack': 'angriff',
        'verteidigung': 'verteidigung',
        'defense': 'verteidigung',
        'spezial-angriff': 'spezialAngriff',
        'spezialangriff': 'spezialAngriff',
        'special-attack': 'spezialAngriff',
        'special attack': 'spezialAngriff',
        'spezial-verteidigung': 'spezialVerteidigung',
        'spezialverteidigung': 'spezialVerteidigung',
        'special-defense': 'spezialVerteidigung',
        'special defense': 'spezialVerteidigung',
        'initiative': 'init',
        'init': 'init',
        'speed': 'init'
    };
    
    return statMapping[statName.toLowerCase()] || statName.toLowerCase();
}

/**
 * Apply a buff move to a Pokémon - FIXED VERSION
 * @param {string} charId - The character ID
 * @param {Object} character - The character object
 * @param {Object} move - The buff move to apply
 * @returns {Promise<void>} - Promise that resolves when the animation is complete
 */
async function applyBuffMove(charId, character, move) {
    return new Promise(async (resolve) => {
        // Log the buff use
        logBattleEvent(`${character.name} verwendet ${move.weaponName}!`);
        
        // Reduce PP for the move
        if (move.pp !== undefined && move.currentPP !== undefined) {
            move.currentPP = Math.max(0, move.currentPP - 1);
            logBattleEvent(`${move.weaponName} (${move.currentPP}/${move.pp} AP übrig).`);
        }
        
        // Special animation for Schwerttanz
        if (move.weaponName === "Schwerttanz") {
            // Animate the Schwerttanz move (this includes its own movement)
            await animateSchwerttanz(charId, character);
            
            // Apply +2 stages to Angriff
            const statChangeResult = changeStatValue(character, 'angriff', 2);
            
            if (statChangeResult.success) {
                logBattleEvent(`${character.name}'s Angriff steigt stark!`);
            } else {
                logBattleEvent(statChangeResult.message);
            }
            resolve();
        }
        // Agilität
        else if (move.weaponName === "Agilität") {
            // Animate the Agilität move (this includes its own movement)
            await animateAgilitaet(charId, character);
            
            // Apply +2 stages to Initiative
            const statChangeResult = changeStatValue(character, 'initiative', 2);
            
            if (statChangeResult.success) {
                logBattleEvent(`${character.name}'s Initiative steigt stark!`);
            } else {
                logBattleEvent(statChangeResult.message);
            }
            resolve();
        }
        // Panzerschutz
        else if (move.weaponName === "Panzerschutz") {
            await animatePanzerschutz(charId, character);
            // Apply +1 stage to Verteidigung
            const statChangeResult = changeStatValue(character, 'verteidigung', 1);
            
            if (statChangeResult.success) {
                logBattleEvent(`${character.name}'s Verteidigung steigt!`);
            } else {
                logBattleEvent(statChangeResult.message);
            }
            resolve();
        }
        // Härtner
        else if (move.weaponName === "Härtner") {
            await animateHärtner(charId, character);
            // Apply +1 stage to Verteidigung
            const statChangeResult = changeStatValue(character, 'verteidigung', 1);
            
            if (statChangeResult.success) {
                logBattleEvent(`${character.name}'s Verteidigung steigt!`);
            } else {
                logBattleEvent(statChangeResult.message);
            }
            resolve();
        }
        // Eisenabwehr
        else if (move.weaponName === "Eisenabwehr") {
            await animateEisenabwehr(charId, character);
            // Apply +2 stages to Verteidigung
            const statChangeResult = changeStatValue(character, 'verteidigung', 2);
            
            if (statChangeResult.success) {
                logBattleEvent(`${character.name}'s Verteidigung steigt stark!`);
            } else {
                logBattleEvent(statChangeResult.message);
            }
            resolve();
        }
        else {
            // Generic buff animation and effect for other buff moves
            if (move.buffedStats && move.buffedStats.length > 0) {
                // Apply +1 stage to each stat in buffedStats
                for (const statName of move.buffedStats) {
                    const normalizedStatName = normalizeStatName(statName);
                    const statChangeResult = changeStatValue(character, normalizedStatName, 1);
                    
                    if (statChangeResult.success) {
                        logBattleEvent(`${character.name}'s ${statChangeResult.displayName} steigt!`);
                    } else {
                        logBattleEvent(statChangeResult.message);
                    }
                }
                
                // Simple animation for generic buff
                animateStatBoost(charId, 'attack', async () => {
                    resolve();
                });
            } else {
                resolve();
            }
        }
    });
}

/**
 * Perform attack with forced move selection (temporarily boosts preferred move)
 * @param {Object} attacker - Attacker character data
 * @param {Object} target - Target character data  
 * @param {Object} forcedAttack - The attack to force selection of
 * @returns {Promise<Object>} - Attack results
 */
async function performAttackWithForcedSelection(attacker, target, forcedAttack) {
    // Store original attacks array
    const originalAttacks = attacker.character.attacks ? [...attacker.character.attacks] : [];
    
    try {
        // Find and temporarily boost the forced attack to ensure getBestAttack selects it
        if (attacker.character.attacks) {
            const attackIndex = attacker.character.attacks.findIndex(attack => 
                attack.weaponName === forcedAttack.weaponName
            );
            
            if (attackIndex !== -1) {
                // Store the original attack for damage calculation
                const originalAttack = { ...attacker.character.attacks[attackIndex] };
                
                // Create a modified attacks array with the forced attack boosted
                const modifiedAttacks = [...attacker.character.attacks];
                
                // Temporarily boost damage/effectiveness to ensure selection
                modifiedAttacks[attackIndex] = {
                    ...originalAttack,
                    damage: Math.max(originalAttack.damage || 0, 1000), // Boost damage
                    tempForced: true // Mark as temporarily forced
                };
                
                // Replace the attacks array
                attacker.character.attacks = modifiedAttacks;
                
                // Restore original attacks BEFORE calling performAttack
                attacker.character.attacks = originalAttacks;
                
                // Now call performAttack with the original attack data
                // but getBestAttack will have already selected our desired attack
                return await performAttack(attacker, target);
            }
        }
        
        return await performAttack(attacker, target);
        
    } finally {
        // Always restore the original attacks array
        if (originalAttacks.length > 0) {
            attacker.character.attacks = originalAttacks;
        }
    }
}

export function isCharacterInAnimation(character, charPos) {
    // Check if either the character or its position object have animation flags
    return (
        (character && (
            character.animationInProgress === true ||
            character.isUsingFlammenwurf === true ||
            character.isUsingDonner === true ||
            character.cannotMove === true
        )) ||
        (charPos && (
            charPos.attackAnimationActive === true ||
            charPos.isUsingFlammenwurf === true ||
            charPos.isUsingDonner === true ||
            charPos.cannotMove === true ||
            charPos.animationInProgress === true
        ))
    );
}

function isAnyCharacterInAnimation() {
    const characterPositions = getCharacterPositions();
    
    for (const charId in characterPositions) {
        const charPos = characterPositions[charId];
        if (charPos.character && isCharacterInAnimation(charPos.character, charPos)) {
            console.log(`Animation in progress for ${charPos.character.name}: blocking turn system`);
            return true;
        }
    }
    
    return false;
}

export function notifyExplosionStarted() {
    notifyAttackStarted('explosion');
}

export function notifyExplosionCompleted() {
    notifyAttackCompleted('explosion');
}

export function areExplosionsInProgress() {
    return isAttackTypeInProgress('explosion');
}

export function waitForExplosionsToComplete() {
    return waitForAttacksToComplete();
}

/**
 * Notify the turn system that a long-running attack has started
 * @param {string} attackType - Type of attack (e.g., 'donner', 'flammenwurf', 'explosion')
 */
export function notifyAttackStarted(attackType = 'generic') {
    attacksInProgress++;
    activeAttackTypes.add(attackType);
    console.log(`${attackType} attack started. Total attacks in progress: ${attacksInProgress}`);
}

/**
 * Notify the turn system that a long-running attack has completed
 * @param {string} attackType - Type of attack that completed
 */
export function notifyAttackCompleted(attackType = 'generic') {
    attacksInProgress = Math.max(0, attacksInProgress - 1);
    activeAttackTypes.delete(attackType);
    console.log(`${attackType} attack completed. Remaining attacks: ${attacksInProgress}`);
    
    if (attacksInProgress === 0) {
        const callbacks = [...attackCompletionCallbacks];
        attackCompletionCallbacks = [];
        
        callbacks.forEach(callback => {
            try {
                callback();
            } catch (error) {
                console.error('Error in attack completion callback:', error);
            }
        });
    }
}

/**
 * Check if any long-running attacks are currently in progress
 */
export function areAttacksInProgress() {
    return attacksInProgress > 0;
}

/**
 * Check if a specific type of attack is in progress
 * @param {string} attackType - Type of attack to check for
 */
export function isAttackTypeInProgress(attackType) {
    return activeAttackTypes.has(attackType);
}

/**
 * Get all currently active attack types
 */
export function getActiveAttackTypes() {
    return Array.from(activeAttackTypes);
}

/**
 * Wait for all attacks to complete
 */
export function waitForAttacksToComplete() {
    return new Promise((resolve) => {
        if (attacksInProgress === 0) {
            resolve();
        } else {
            attackCompletionCallbacks.push(resolve);
        }
    });
}

/**
 * Emergency cleanup - force complete all attacks
 */
export function forceCompleteAllAttacks() {
    console.warn('Force completing all attacks due to emergency cleanup');
    attacksInProgress = 0;
    activeAttackTypes.clear();
    
    const callbacks = [...attackCompletionCallbacks];
    attackCompletionCallbacks = [];
    
    callbacks.forEach(callback => {
        try {
            callback();
        } catch (error) {
            console.error('Error in forced attack completion callback:', error);
        }
    });
}
