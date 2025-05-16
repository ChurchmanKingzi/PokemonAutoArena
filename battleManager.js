/**
 * Main battle controller
 */

import { logBattleEvent, createBattleLog, resetBattleLog } from './battleLog.js';
import { displayInitiativeOrder } from './initiativeDisplay.js';
import { updateBattlefieldDisplay } from './battlefieldGrid.js';
import { rollInitiativeAndSort } from './initiative.js';
import { placeCharacters, defineTeamAreas, setCharacterPositions } from './characterPositions.js';
import { turn, resetTurn } from './turnSystem.js';
import { initializeTerrainSystem } from './terrainSystem.js';
import { resetSwimmingRegistry } from './terrainEffects.js';
import { getCharacterPositions } from './characterPositions.js';

/**
 * Main battle function that runs when entering the Arena
 * @param {Array} teamAssignments - The team assignments from characterauswahl.js
 */
export function battle(teamAssignments) {
    console.log("Battle started!");
    
    // Reset battle state
    resetTurn();
    resetBattleLog();
    resetSwimmingRegistry();
    
    // Create a flat list of all characters with their team info
    const characterList = [];
    const teamCharacters = [];
    
    teamAssignments.forEach((team, teamIndex) => {
        // Create an array to hold characters for this team
        teamCharacters[teamIndex] = [];
        
        team.forEach((character, characterIndex) => {
            if (character) {
                // Ensure character has a uniqueId
                if (!character.uniqueId) {
                    character.uniqueId = `team${teamIndex}_char${characterIndex}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
                }
                                
                // Reset battle-specific properties while keeping original data
                resetCharacterBattleState(character);
                
                const charEntry = {
                    character: character,
                    teamIndex: teamIndex,
                    characterIndex: characterIndex,
                    // Initialize with zero, will be updated after rolling
                    initiativeRoll: 0
                };
                
                characterList.push(charEntry);
                teamCharacters[teamIndex].push(charEntry);
            }
        });
    });
    
    // Define team areas based on number of teams
    const teamAreas = defineTeamAreas(teamAssignments.length);
    
    // Initialize terrain system
    initializeTerrainSystem(teamAreas);
    
    // Place characters in their team areas
    const characterPositions = placeCharacters(teamCharacters, teamAreas);
    
    // Update the battlefield display - replace team display with grid
    updateBattlefieldDisplay(teamAreas, characterPositions, teamAssignments.length);
    
    // Add the battle log to the battlefield
    const battlefieldContent = document.querySelector('.battlefield-content');
    if (battlefieldContent) {
        const battleLog = createBattleLog();
        battlefieldContent.appendChild(battleLog);
    }
    
    // Welcome message
    logBattleEvent("Battle simulation started! Rolling initiative...");
    
    // Roll initiative and sort characters
    const sortedCharacters = rollInitiativeAndSort(characterList);
    
    // Display the initiative order in the Arena
    displayInitiativeOrder(sortedCharacters);
    
    // Log who goes first
    if (sortedCharacters.length > 0) {
        const firstCharacter = sortedCharacters[0];
        logBattleEvent(`${firstCharacter.character.name} will have the first turn!`);
    }
    
    // Start the first turn
    setTimeout(() => {
        turn();
    }, 100); // 0.1 second delay before starting
    
    return sortedCharacters;
}

/**
 * Reset character battle-specific properties
 * @param {Object} character - Character to reset
 */
function resetCharacterBattleState(character) {
    // Reset current KP to max KP
    if (character.maxKP) {
        character.currentKP = character.maxKP;
    } else if (character.combatStats && character.combatStats.kp) {
        character.currentKP = character.combatStats.kp;
        character.maxKP = character.combatStats.kp;
    }
    
    // Reset the new status effects array
    character.statusEffects = [];
    
    // Reset any battle properties
    character.hasUsedDodge = false;
    character.hasUsedLuckToken = false;
    character.hasPassedSwimmingCheck = false;
    character.isDefeated = false;
    
    // Reset PP for all attacks
    if (character.attacks) {
        character.attacks.forEach(attack => {
            if (attack.pp !== undefined && attack.currentPP !== undefined) {
                attack.currentPP = attack.pp;
            }
            if (attack.ammo !== undefined && attack.currentAmmo !== undefined) {
                attack.currentAmmo = attack.ammo;
            }
        });
    }
    
    return character;
}

/**
 * Reset all battle state
 * This function is called when returning to the character selection screen
 */
export function resetBattle() {
    // Reset turn state
    resetTurn();
    
    // Reset battle log
    resetBattleLog();
    
    // Reset swimming registry
    resetSwimmingRegistry();
    
    // Get character positions before clearing them to reset stats
    const characterPositions = getCharacterPositions();
    const allCharacters = [];
    for (const charId in characterPositions) {
        if (characterPositions[charId].character) {
            allCharacters.push(characterPositions[charId].character);
        }
    }
    
    // Clear all projectiles using the dedicated function
    try {
        import('./projectileSystem.js').then(module => {
            if (module.clearAllProjectiles) {
                module.clearAllProjectiles();
            }
        }).catch(error => {
            console.error("Error clearing projectiles:", error);
        });
    } catch (error) {
        console.error("Error importing projectileSystem:", error);
    }
    
    // Reset all character stat modifications
    try {
        import('./statChanges.js').then(module => {
            if (module.resetStatModifications) {
                allCharacters.forEach(character => {
                    module.resetStatModifications(character);
                });
            }
        }).catch(error => {
            console.error("Error resetting stat modifications:", error);
        });
    } catch (error) {
        console.error("Error importing statChanges:", error);
    }
    
    // Clear battlefield grid
    const battlefieldGrid = document.querySelector('.battlefield-grid');
    if (battlefieldGrid) {
        battlefieldGrid.remove();
    }
    
    // Remove initiative display
    const initiativeOrder = document.querySelector('.initiative-order');
    if (initiativeOrder) {
        initiativeOrder.remove();
    }
    
    // Remove battle log
    const battleLog = document.querySelector('.battle-log-container');
    if (battleLog) {
        battleLog.remove();
    }
    
    // Reset character positions
    setCharacterPositions({});
    
    // Remove any active character highlighting
    const activeCharacters = document.querySelectorAll('.battlefield-character.active');
    activeCharacters.forEach(char => {
        char.classList.remove('active');
    });
    
    // Clean up any other DOM elements created during battle
    const damageNumbers = document.querySelectorAll('.damage-number');
    damageNumbers.forEach(el => el.remove());
    
    const projectiles = document.querySelectorAll('.projectile');
    projectiles.forEach(el => el.remove());
    
    const impactEffects = document.querySelectorAll('.impact-effect');
    impactEffects.forEach(el => el.remove());
    
    // NEW: Clean up ALL possible animation elements
    const animationElements = [
        '.dodge-animation-wrapper',
        '.melee-attack-animation-wrapper',
        '.projectile',
        '.impact-effect',
        '.status-effect-indicator',
        '.stat-boost-bounce',
        '.stat-arrow',
        '.cone-indicator',
        '.area-effect-particle',
        '.animation-wrapper',
        '.giftpuder',
        '.stachelspore',
        '.schlafpuder',
        '.sandwirbel',
        '.rankenhieb',
        '.glut',
        '.aquaknarre',
        '.donnerschock',
        '.steinwurf'
    ];
    
    animationElements.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
            if (el.parentNode) {
                el.parentNode.removeChild(el);
            }
        });
    });
    
    // Clear any timers or intervals
    const highestTimeoutId = setTimeout(() => {}, 0);
    for (let i = 0; i < highestTimeoutId; i++) {
        clearTimeout(i);
    }
    
    console.log("Battle state has been completely reset");
}