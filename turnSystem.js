/**
 * Turn management system
 */
import { logBattleEvent } from './battleLog.js';
import { getSortedCharacters, setSortedCharacters, getSortedCharactersDisplay, removeDefeatedFromLogic, markDefeatedInDisplay } from './initiative.js';
import { getCharacterPositions, removeDefeatedCharacter } from './characterPositions.js';
import { highlightActiveCharacter, unhighlightActiveCharacter } from './animationManager.js';
import { findNearestEnemyInRange, getBestAttack, performAttack } from './attackSystem.js';
import { moveCharacterByStrategy } from './strategyMovement.js';
import { updateInitiativeHP } from './initiativeDisplay.js';
import { processMovementWithTerrainChecks } from './movementRange.js';
import { processStatusEffectsStart, processStatusEffectsEnd } from './statusEffects.js';
import { resetTakenTurnsTracker, markTurnTaken, getNextImmediateTurn } from './initiativeChanges.js';
import { animateStatBoost } from './animationManager.js';
import { changeStatValue, getCurrentStage } from './statChanges.js';
import { animateSchwerttanz } from './Attacken/schwerttanz.js';
import { focusOnCharacter } from './cameraSystem.js';
import { displayInitiativeOrder } from './initiativeDisplay.js';
import { updatePokemonHPBar } from './pokemonOverlay.js';

// Current turn counter
let currentTurn = 0;

// Flag to prevent multiple turn ends (which would then call multiple new turns)
let currentTurnEnded = false;

// Track immediate turn requests
let pendingImmediateTurn = null;

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

export function endTurn(activeCharacter) {
    // Prevent multiple endTurn calls for the same turn
    if (currentTurnEnded) {
        console.warn('endTurn() called multiple times for the same turn - ignoring duplicate');
        return;
    }
    currentTurnEnded = true;
    
    // Mark this character as having taken its turn this round
    if (activeCharacter.character && activeCharacter.character.uniqueId) {
        markTurnTaken(activeCharacter.character.uniqueId);
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
        
        // Process status effects at the end of turn, passing position
        const statusResult = processStatusEffectsEnd(activeCharacter.character, position);
        
        // Log status effect messages
        statusResult.messages.forEach(message => {
            logBattleEvent(message);
        });
        
        // Apply status effect damage
        if (statusResult.damage > 0) {
            activeCharacter.character.currentKP -= statusResult.damage;
            
            // Update HP display
            updateInitiativeHP();
            updatePokemonHPBar(activeCharId, activeCharacter.character);
            
            // Check if character was defeated by status effects
            if (activeCharacter.character.currentKP <= 0) {
                activeCharacter.character.currentKP = 0;
                
                // Remove from logic list and mark in display list
                removeDefeatedFromLogic(activeCharacter.character.uniqueId);
                markDefeatedInDisplay(activeCharacter.character.uniqueId);
                
                // Remove from battlefield
                removeDefeatedCharacter(activeCharId);
                
                // Update the display to show the changes
                displayInitiativeOrder(getSortedCharactersDisplay());
                
                logBattleEvent(`${activeCharacter.character.name} wurde besiegt!`);
            }
        }
        
        // Clear the attack allies flag if it was set
        if (activeCharacter.character.attackAllies) {
            activeCharacter.character.attackAllies = false;
        }
    }
    
    // Check if we've reached turn 100
    if (currentTurn >= 2000) {
        logBattleEvent(`<div class="log-turn-header">TIMEOUT! DER KAMPF ENDET UNENTSCHIEDEN!</div>`, true);
        return; // End the battle
    }
    
    // Check if there's an immediate turn we need to process
    const immediateId = getNextImmediateTurn();
    if (immediateId) {
        pendingImmediateTurn = immediateId;
        // Reset the turn ended flag and return - immediate turn will handle next scheduling
        setTimeout(() => {
            currentTurnEnded = false;
        }, 10);
        return;
    }
    
    // Only schedule next turn if no immediate turn is pending
    setTimeout(() => {
        currentTurnEnded = false; // Reset flag before starting next turn
        turn();
    }, 50); // 50ms delay between turns
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
    // Handle immediate turn if there is one pending
    if (pendingImmediateTurn) {
        // Get the character that should take an immediate turn from logic list
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
            
            // Log that this is a special immediate turn
            logBattleEvent(`<div class="log-turn-header">${pendingCharacter.character.name} erhält einen sofortigen Zug!</div>`, true);
            
            // Mark this character as having taken its turn
            markTurnTaken(immediateTurnId);
            
            // Reset swim check flags
            characterPositions[pendingCharId].hasPassedSwimmingCheck = false;
            if (characterPositions[pendingCharId].character) {
                characterPositions[pendingCharId].character.hasPassedSwimmingCheck = false;
            }
            
            // Highlight the active character
            highlightActiveCharacter(pendingCharId);
            
            // Focus camera on the active character and wait for it to complete
            await focusOnCharacter(pendingCharId);
            
            // Add delay AFTER camera arrives at its location
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Process status effects at start of turn
            const statusMessages = processStatusEffectsStart(pendingCharacter.character);
            
            // Log any status messages
            statusMessages.forEach(message => {
                logBattleEvent(message);
            });
            
            // Skip turn if a status effect caused it
            if (pendingCharacter.character.skipTurn) {
                // Remove the flag for next turn
                pendingCharacter.character.skipTurn = false;
                
                // End turn immediately
                setTimeout(() => {
                    unhighlightActiveCharacter();
                    endTurn(pendingCharacter);
                }, 100);
                return;
            }
            
            // Process the turn with the character's strategy
            const strategy = characterPositions[pendingCharId].character.strategy || 'aggressive';
            
            // Handle turn based on strategy
            if (strategy === 'fleeing') {
                handleFleeingStrategy(pendingCharId, pendingCharacter);
            } else if (strategy === 'defensive') {
                handleDefensiveStrategy(pendingCharId, pendingCharacter);
            } else {
                handleAggressiveStrategy(pendingCharId, pendingCharacter);
            }
            
            return; // Exit to avoid processing a regular turn
        }
    }

    // Get current character positions and use logic list for turn processing
    const characterPositions = getCharacterPositions();
    let sortedCharactersLogic = getSortedCharacters();
    
    // Check if any characters remain in logic list
    if (sortedCharactersLogic.length === 0) {
        logBattleEvent(`<div class="log-turn-header">DER KAMPF IST VORBEI - KEINE CHARAKTERE ÜBRIG!</div>`, true);
        return;
    }
    
    // Start of a new round logic
    if (currentTurn % sortedCharactersLogic.length === 0) {
        // Reset taken turns tracker at the start of a new round
        resetTakenTurnsTracker();
        
        // Clear all skipTurnThisRound flags from both logic and display lists
        const sortedCharactersDisplay = getSortedCharactersDisplay();
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
        
        logBattleEvent(`<div class="log-round-header">Neue Runde beginnt!</div>`, true);
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
    
    // Calculate turn index based on the logic character list
    let turnIndex = (currentTurn - 1) % sortedCharactersLogic.length;
    let activeCharacter = sortedCharactersLogic[turnIndex];
    
    // Since we only have alive characters in the logic list, we shouldn't need to skip any
    // But let's keep a safety check for characters that should skip their turn
    let charactersChecked = 0;
    let activeCharId = null;
    
    while (charactersChecked < sortedCharactersLogic.length) {
        // Find the active character's ID using uniqueId
        activeCharId = null;
        for (const charId in characterPositions) {
            if (characterPositions[charId].character && 
                activeCharacter.character && 
                characterPositions[charId].character.uniqueId === activeCharacter.character.uniqueId) {
                activeCharId = charId;
                break;
            }
        }
        
        // Double-check: Skip if character is defeated or should skip turn
        if (!activeCharId || 
            characterPositions[activeCharId].isDefeated || 
            (activeCharacter.character && activeCharacter.character.skipTurnThisRound)) {
            
            // Clear the skip flag if we're skipping due to it
            if (activeCharacter.character && activeCharacter.character.skipTurnThisRound) {
                activeCharacter.character.skipTurnThisRound = false;
                console.log(`${activeCharacter.character.name} skipped turn due to skipTurnThisRound flag`);
            }
            
            turnIndex = (turnIndex + 1) % sortedCharactersLogic.length;
            activeCharacter = sortedCharactersLogic[turnIndex];
            charactersChecked++;
        } else {
            // Found a valid character to take their turn
            break;
        }
    }
    
    // If all characters should be skipped (shouldn't happen with our filtering), end battle
    if (charactersChecked >= sortedCharactersLogic.length) {
        logBattleEvent(`<div class="log-turn-header">DER KAMPF IST VORBEI - ALLE CHARAKTERE ÜBERSPRUNGEN!</div>`, true);
        return;
    }
    
    if (activeCharId) {
        // Reset swim check flags
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
    
    // Mark this character as having taken its turn this round
    markTurnTaken(activeCharacter.character.uniqueId);
    
    // Highlight the active character
    highlightActiveCharacter(activeCharId);
    
    // Focus camera on the active character
    // Added camera focus for normal turns - AWAIT it to ensure camera movement completes
    await focusOnCharacter(activeCharId);
    
    // Add delay AFTER camera arrives at its location
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Process status effects at start of turn
    if (activeCharId) {
        const statusMessages = processStatusEffectsStart(activeCharacter.character);
        
        // Log any status messages
        statusMessages.forEach(message => {
            logBattleEvent(message);
        });
        
        // Skip turn if a status effect caused it
        if (activeCharacter.character.skipTurn) {
            // Remove the flag for next turn
            activeCharacter.character.skipTurn = false;
            
            // End turn immediately
            setTimeout(() => {
                unhighlightActiveCharacter();
                endTurn(activeCharacter);
            }, 100);
            return;
        }
    }
    
    // Get character strategy
    const strategy = characterPositions[activeCharId].character.strategy || 'aggressive';
    
    // Handle turn based on strategy
    if (strategy === 'fleeing') {
        handleFleeingStrategy(activeCharId, activeCharacter);
    } else if (strategy === 'defensive') {
        handleDefensiveStrategy(activeCharId, activeCharacter);
    } else {
        handleAggressiveStrategy(activeCharId, activeCharacter);
    }
}

/**
 * Handle the fleeing strategy for a character's turn
 * @param {string} charId - The character's ID
 * @param {Object} activeCharacter - The character data
 */
async function handleFleeingStrategy(charId, activeCharacter) {
    // First check if the character should use a buff move
    const usedBuffMove = await checkAndHandleBuffMove(charId, activeCharacter);
    if (usedBuffMove) {
        return; // Exit early, turn has been handled
    }
    
    const characterPositions = getCharacterPositions();
    
    // FLEEING STRATEGY: Move first, then attack only after moving
    
    // Move character based on strategy
    const newPosition = moveCharacterByStrategy(characterPositions[charId]);
    
    // If there's a path to follow, animate the movement
    if (newPosition && newPosition.path && newPosition.path.length > 0) {
        // Log the movement
        logBattleEvent(`${activeCharacter.character.name} flieht und bewegt sich von den Gegnern weg.`);
        
        // Use the new movement processing function with terrain checks
        processMovementWithTerrainChecks(charId, characterPositions[charId], newPosition.path, async () => {
            // After movement completes (including terrain checks), check for possible attack
            let hasAttacked = false; // Track if we've attacked already
            
            try {
                const enemyInRangeAfterMove = await findNearestEnemyInRange(characterPositions[charId]);
                
                if (!hasAttacked && enemyInRangeAfterMove && enemyInRangeAfterMove.character) {
                    hasAttacked = true; // Mark as attacked
                    
                    logBattleEvent(`${activeCharacter.character.name} prüft Angriffsmöglichkeit nach Bewegung... ${enemyInRangeAfterMove.character.name} ist in Reichweite (${enemyInRangeAfterMove.distance} Felder)!`);
                    
                    // Perform attack
                    const attackResult = await performAttack(
                        characterPositions[charId], 
                        characterPositions[enemyInRangeAfterMove.id]
                    );
                    
                    // Log attack results
                    attackResult.log.forEach(logEntry => {
                        logBattleEvent(logEntry);
                    });
                    
                    // Update HP display
                    updateInitiativeHP();
                    
                    // Check if target was defeated
                    if (attackResult.success && characterPositions[enemyInRangeAfterMove.id].character.currentKP <= 0) {
                        removeDefeatedCharacter(enemyInRangeAfterMove.id);
                    }
                }
            } catch (error) {
                console.error("Error checking for enemies after movement:", error);
            }
            
            // End turn
            setTimeout(() => {
                unhighlightActiveCharacter();
                endTurn(activeCharacter);
            }, 100);
        });
    } else {
        // No movement, check for attack
        let hasAttacked = false; // Track if we've attacked already
        
        try {
            const enemyInRange = await findNearestEnemyInRange(characterPositions[charId]);
            
            if (!hasAttacked && enemyInRange && enemyInRange.character) {
                hasAttacked = true; // Mark as attacked
                
                logBattleEvent(`${activeCharacter.character.name} prüft Angriffsmöglichkeit... ${enemyInRange.character.name} ist in Reichweite (${enemyInRange.distance} Felder)!`);
                
                // Perform attack
                const attackResult = await performAttack(
                    characterPositions[charId], 
                    characterPositions[enemyInRange.id]
                );
                
                // Log attack results
                attackResult.log.forEach(logEntry => {
                    logBattleEvent(logEntry);
                });
                
                // Update HP display
                updateInitiativeHP();
                
                // Check if target was defeated
                if (attackResult.success && characterPositions[enemyInRange.id].character.currentKP <= 0) {
                    removeDefeatedCharacter(enemyInRange.id);
                }
            } else {
                logBattleEvent(`${characterPositions[charId].character.name} kann sich nicht bewegen und findet kein Ziel zum Angreifen.`);
            }
        } catch (error) {
            console.error("Error checking for enemies in range:", error);
            logBattleEvent(`${characterPositions[charId].character.name} kann sich nicht bewegen und findet kein Ziel zum Angreifen.`);
        }
        
        // End turn
        setTimeout(() => {
            unhighlightActiveCharacter();
            endTurn(activeCharacter);
        }, 100);
    }
}

/**
 * Handle the defensive strategy for a character's turn
 * @param {string} charId - The character's ID
 * @param {Object} activeCharacter - The character data
 */
async function handleDefensiveStrategy(charId, activeCharacter) {
    // First check if the character should use a buff move
    const usedBuffMove = await checkAndHandleBuffMove(charId, activeCharacter);
    if (usedBuffMove) {
        return; // Exit early, turn has been handled
    }
    
    const characterPositions = getCharacterPositions();
    
    // DEFENSIVE STRATEGY (STANDHAFT)
    // For defensive strategy: Check if we can attack without moving first
    let hasAttacked = false;
    
    try {
        // Check if any enemies are in range from current position
        const enemyInRange = await findNearestEnemyInRange(characterPositions[charId]);
        
        // If enemy in range, attack immediately without moving
        if (enemyInRange && enemyInRange.character) {
            hasAttacked = true;
            
            logBattleEvent(`${activeCharacter.character.name} bleibt standhaft und greift ${enemyInRange.character.name} an.`);
            
            // Perform attack from current position
            const attackResult = await performAttack(
                characterPositions[charId], 
                characterPositions[enemyInRange.id]
            );
            
            // Log attack results
            attackResult.log.forEach(logEntry => {
                logBattleEvent(logEntry);
            });
            
            // Update HP display
            updateInitiativeHP();
            
            // Check if target was defeated
            if (attackResult.success && characterPositions[enemyInRange.id].character.currentKP <= 0) {
                removeDefeatedCharacter(enemyInRange.id);
            }
            
            // For defensive strategy, end turn after successful attack
            setTimeout(() => {
                unhighlightActiveCharacter();
                endTurn(activeCharacter);
            }, 100);
            return;
        }
    } catch (error) {
        console.error("Error checking for enemies in range:", error);
    }
    
    // No attack possible from current position, try to move (with half movement)
    if (!hasAttacked) {
        // Apply half movement modifier for defensive character
        characterPositions[charId].moveModifier = 0.5;
        
        // Calculate movement based on strategy (will find optimal position)
        const newPosition = moveCharacterByStrategy(characterPositions[charId]);
        
        // Clean up the movement modifier
        delete characterPositions[charId].moveModifier;
        
        // If there's a path to follow, animate the movement
        if (newPosition && newPosition.path && newPosition.path.length > 0) {
            logBattleEvent(`${activeCharacter.character.name} bewegt sich vorsichtig zur optimalen Angriffsposition (halbe Bewegung).`);
            
            // Use terrain-aware movement
            processMovementWithTerrainChecks(charId, characterPositions[charId], newPosition.path, async () => {
                // After movement, check for attack
                try {
                    const enemyInRangeAfterMove = await findNearestEnemyInRange(characterPositions[charId]);
                    
                    if (enemyInRangeAfterMove && enemyInRangeAfterMove.character) {
                        logBattleEvent(`${activeCharacter.character.name} prüft Angriffsmöglichkeit nach Bewegung... ${enemyInRangeAfterMove.character.name} ist in Reichweite (${enemyInRangeAfterMove.distance} Felder)!`);
                        
                        // Perform attack
                        const attackResult = await performAttack(
                            characterPositions[charId], 
                            characterPositions[enemyInRangeAfterMove.id]
                        );
                        
                        // Log attack results
                        attackResult.log.forEach(logEntry => {
                            logBattleEvent(logEntry);
                        });
                        
                        // Update HP display
                        updateInitiativeHP();
                        
                        // Check if target was defeated
                        if (attackResult.success && characterPositions[enemyInRangeAfterMove.id].character.currentKP <= 0) {
                            removeDefeatedCharacter(enemyInRangeAfterMove.id);
                        }
                    } else {
                        logBattleEvent(`${activeCharacter.character.name} findet kein Ziel zum Angreifen nach der Bewegung.`);
                    }
                } catch (error) {
                    console.error("Error checking for enemies after movement:", error);
                }
                
                // End turn
                setTimeout(() => {
                    unhighlightActiveCharacter();
                    endTurn(activeCharacter);
                }, 100);
            });
        } else {
            // No movement possible
            logBattleEvent(`${activeCharacter.character.name} bleibt standhaft und findet kein Ziel zum Angreifen.`);
            
            // End turn
            setTimeout(() => {
                unhighlightActiveCharacter();
                endTurn(activeCharacter);
            }, 100);
        }
    }
}

/**
 * Handle the aggressive strategy for a character's turn
 * @param {string} charId - The character's ID
 * @param {Object} activeCharacter - The character data
 */
async function handleAggressiveStrategy(charId, activeCharacter) {
    // First check if the character should use a buff move
    const usedBuffMove = await checkAndHandleBuffMove(charId, activeCharacter);
    if (usedBuffMove) {
        return; // Exit early, turn has been handled
    }
    
    const characterPositions = getCharacterPositions();
    
    // AGGRESSIVE STRATEGY - Continue with normal aggressive behavior
    let hasAttacked = false;
    
    try {
        // First check if any enemies are in range from current position
        const enemyInRange = await findNearestEnemyInRange(characterPositions[charId]);
        
        // If enemy in range, attack immediately before moving
        if (enemyInRange && enemyInRange.character) {
            hasAttacked = true;
            
            // Get the best attack to determine optimal range
            const bestAttack = await getBestAttack(
                characterPositions[charId],
                characterPositions[enemyInRange.id]
            );
            
            logBattleEvent(`${activeCharacter.character.name} greift aus sicherer Entfernung ${enemyInRange.character.name} an.`);
            
            // Perform attack from current position
            const attackResult = await performAttack(
                characterPositions[charId], 
                characterPositions[enemyInRange.id]
            );
            
            // Log attack results and update HP
            attackResult.log.forEach(logEntry => {
                logBattleEvent(logEntry);
            });
            updateInitiativeHP();
            
            // Check if target was defeated
            if (attackResult.success && characterPositions[enemyInRange.id].character.currentKP <= 0) {
                removeDefeatedCharacter(enemyInRange.id);
            }
            
            // After attacking, move away to optimal distance if using a ranged attack
            const attackRange = bestAttack ? bestAttack.range : 1;
            
            // Only move away if the attack range allows it (ranged attack)
            if (attackRange > 1) {
                // Mark this character as wanting to move away after attacking
                // Pass the attack range so the movement function knows the target distance
                characterPositions[charId].moveAwayAfterAttack = true;
                characterPositions[charId].attackRange = attackRange;
                
                // Get movement to optimal position (moving away)
                const newPosition = moveCharacterByStrategy(characterPositions[charId]);
                
                // Remove the flags after getting movement
                delete characterPositions[charId].moveAwayAfterAttack;
                delete characterPositions[charId].attackRange;
                
                // If there's a path to follow, animate the movement
                if (newPosition && newPosition.path && newPosition.path.length > 0) {
                    logBattleEvent(`${activeCharacter.character.name} bewegt sich nach dem Angriff zur optimalen Distanz.`);
                    
                    // Use terrain-aware movement
                    processMovementWithTerrainChecks(charId, characterPositions[charId], newPosition.path, () => {
                        // End turn after movement completes
                        setTimeout(() => {
                            unhighlightActiveCharacter();
                            endTurn(activeCharacter);
                        }, 100);
                    });
                } else {
                    // No movement possible after attack
                    logBattleEvent(`${activeCharacter.character.name} kann sich nach dem Angriff nicht bewegen.`);
                    
                    // End turn
                    setTimeout(() => {
                        unhighlightActiveCharacter();
                        endTurn(activeCharacter);
                    }, 100);
                }
            } else {
                // Range is 1, can't move away and still attack
                logBattleEvent(`${activeCharacter.character.name} bleibt nach dem Nahkampfangriff in Position.`);
                
                // End turn without movement
                setTimeout(() => {
                    unhighlightActiveCharacter();
                    endTurn(activeCharacter);
                }, 100);
            }
        }
    } catch (error) {
        console.error("Error checking for enemies in range:", error);
    }
    
    // If no attack was possible from current position, try to move and then attack
    if (!hasAttacked) {
        // Mark this character as wanting to move just enough to get in range
        characterPositions[charId].moveToOptimalRange = true;
        
        // Calculate movement based on strategy
        const newPosition = moveCharacterByStrategy(characterPositions[charId]);
        
        // Remove the flag after getting movement
        delete characterPositions[charId].moveToOptimalRange;
        
        // If there's a path to follow, animate the movement
        if (newPosition && newPosition.path && newPosition.path.length > 0) {            
            // Use terrain-aware movement
            processMovementWithTerrainChecks(charId, characterPositions[charId], newPosition.path, async () => {
                // After movement completes, check for attack
                try {
                    const enemyInRangeAfterMove = await findNearestEnemyInRange(characterPositions[charId]);
                    
                    if (enemyInRangeAfterMove && enemyInRangeAfterMove.character) {
                        logBattleEvent(`${activeCharacter.character.name} prüft Angriffsmöglichkeit nach Bewegung... ${enemyInRangeAfterMove.character.name} ist in Reichweite (${enemyInRangeAfterMove.distance} Felder)!`);
                        
                        // Perform attack
                        const attackResult = await performAttack(
                            characterPositions[charId], 
                            characterPositions[enemyInRangeAfterMove.id]
                        );
                        
                        // Log attack results
                        attackResult.log.forEach(logEntry => {
                            logBattleEvent(logEntry);
                        });
                        
                        // Update HP display
                        updateInitiativeHP();
                        
                        // Check if target was defeated
                        if (attackResult.success && characterPositions[enemyInRangeAfterMove.id].character.currentKP <= 0) {
                            removeDefeatedCharacter(enemyInRangeAfterMove.id);
                        }
                    } else {
                        logBattleEvent(`${activeCharacter.character.name} findet kein Ziel zum Angreifen nach der Bewegung.`);
                    }
                } catch (error) {
                    console.error("Error checking for enemies after movement:", error);
                }
                
                // End turn
                setTimeout(() => {
                    unhighlightActiveCharacter();
                    endTurn(activeCharacter);
                }, 100);
            });
        } else {
            // No movement possible, try to attack from current position
            try {
                const enemyInRange = await findNearestEnemyInRange(characterPositions[charId]);
                
                if (enemyInRange && enemyInRange.character) {
                    logBattleEvent(`${activeCharacter.character.name} kann sich nicht bewegen, greift aber ${enemyInRange.character.name} von seiner Position an!`);
                    
                    // Perform attack
                    const attackResult = await performAttack(
                        characterPositions[charId], 
                        characterPositions[enemyInRange.id]
                    );
                    
                    // Log attack results
                    attackResult.log.forEach(logEntry => {
                        logBattleEvent(logEntry);
                    });
                    
                    // Update HP display
                    updateInitiativeHP();
                    
                    // Check if target was defeated
                    if (attackResult.success && characterPositions[enemyInRange.id].character.currentKP <= 0) {
                        removeDefeatedCharacter(enemyInRange.id);
                    }
                } else {
                    logBattleEvent(`${activeCharacter.character.name} kann sich nicht bewegen und findet kein Ziel zum Angreifen.`);
                }
            } catch (error) {
                console.error("Error checking for enemies in range:", error);
                logBattleEvent(`${activeCharacter.character.name} kann sich nicht bewegen und findet kein Ziel zum Angreifen.`);
            }
            
            // End turn
            setTimeout(() => {
                unhighlightActiveCharacter();
                endTurn(activeCharacter);
            }, 100);
        }
    }
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
 * Apply a buff move to a Pokémon
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
            // Animate the Schwerttanz move
            await animateSchwerttanz(charId, character);
            
            // Apply +2 stages to Angriff
            const statChangeResult = changeStatValue(character, 'angriff', 2);
            
            if (statChangeResult.success) {
                logBattleEvent(`${character.name}'s Angriff steigt stark!`);
                
                // Visual feedback
                animateStatBoost(charId, 'attack-strong', () => {
                    setTimeout(resolve, 25);
                });
            } else {
                logBattleEvent(statChangeResult.message);
                resolve();
            }
        } else {
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
                animateStatBoost(charId, 'attack', () => {
                    setTimeout(resolve, 100);
                });
            } else {
                resolve();
            }
        }
    });
}

/**
 * Check and handle buff move for a character's turn
 * @param {string} charId - The character ID
 * @param {Object} activeCharacter - The active character
 * @returns {Promise<boolean>} - Promise that resolves to true if a buff move was used
 */
async function checkAndHandleBuffMove(charId, activeCharacter) {
    // Calculate probability of using a buff move
    const buffProbability = calculateBuffMoveProbability(activeCharacter.character);
    
    // Roll for buff move
    const roll = Math.random();
    
    if (roll <= buffProbability) {
        // Try to find a valid buff move
        const buffMove = findValidBuffMove(activeCharacter.character);
        
        if (buffMove) {
            // Move character based on strategy
            const characterPositions = getCharacterPositions();
            const newPosition = moveCharacterByStrategy(characterPositions[charId]);
            
            // If there's a path to follow, animate the movement
            if (newPosition && newPosition.path && newPosition.path.length > 0) {
                logBattleEvent(`${activeCharacter.character.name} bewegt sich.`);
                
                // Use terrain-aware movement
                await new Promise(resolve => {
                    processMovementWithTerrainChecks(charId, characterPositions[charId], newPosition.path, () => {
                        resolve();
                    });
                });
            }
            
            // Apply the buff move
            await applyBuffMove(charId, activeCharacter.character, buffMove);
            
            // End turn
            setTimeout(() => {
                unhighlightActiveCharacter();
                endTurn(activeCharacter);
            }, 100);
            
            return true;
        }
    }
    
    return false;
}