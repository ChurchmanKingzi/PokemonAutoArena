import { logBattleEvent, createBattleLog, resetBattleLog } from './battleLog.js';
import { displayInitiativeOrder } from './initiativeDisplay.js';
import { updateBattlefieldDisplay } from './battlefieldGrid.js';
import { rollInitiativeAndSort } from './initiative.js';
import { placeCharacters, setCharacterPositions, getCharacterPositions, defineTeamAreasWithScaling } from './characterPositions.js';
import { turn, resetTurn } from './turnSystem.js';
import { initializeTerrainSystem } from './terrainSystem.js';
import { resetSwimmingRegistry } from './terrainEffects.js';
import { initializeCamera, startInitialCameraSequence, resetCamera } from './cameraSystem.js';
import { initializeMinimapSystem, cleanupMinimapSystem } from './minimapSystem.js';
import { resetWeather, initializeWeatherSystem, cleanupWeatherSystem } from './weather.js';
import { resetSandAttackCounter } from './Abilities/sandgewalt.js';
import { checkAndApplyWeatherAbilities } from './Abilities/weatherAbilities.js';
import { resetDoubleTurnSystem } from './doubleTurnSystem.js';
import { removeStrategyBuffs, applyStrategyBuffs } from './utils.js';
import { forceCompleteAllAttacks } from './turnSystem.js';
import { resetReactionSystem, forceCompleteAllReactions } from './reactionSystem.js';

/**
 * Updated battle function to initialize both initiative lists and reaction system
 */
export function battle(teamAssignments) {    
    // Reset battle state
    resetTurn();
    resetBattleLog();
    resetSwimmingRegistry();
    resetWeather();
    resetSandAttackCounter();
    forceCompleteAllAttacks();
    
    // Reset reaction system for new battle
    forceCompleteAllReactions();
    resetReactionSystem();

     // Clear any lingering explosion visual elements from previous battles
    const battlefield = document.querySelector('.battlefield-grid');
    if (battlefield) {
        const explosions = battlefield.querySelectorAll('.explosion-animation');
        explosions.forEach(explosion => {
            if (explosion.parentNode) {
                explosion.parentNode.removeChild(explosion);
            }
        });
        
        const explosionCones = battlefield.querySelectorAll('.attack-cone.explosion-cone');
        explosionCones.forEach(cone => {
            if (cone.parentNode) {
                cone.parentNode.removeChild(cone);
            }
        });
    }

    // Initialize weather system after the battlefield is created
    initializeWeatherSystem();

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
                    initiativeRoll: 0,
                    // Initialize defeated status
                    isDefeated: false
                };
                
                characterList.push(charEntry);
                teamCharacters[teamIndex].push(charEntry);
            }
        });
    });
    
    // Define team areas based on number of teams AND team sizes
    // Use the new function that scales team areas based on team composition
    const initialTeamAreas = defineTeamAreasWithScaling(teamAssignments.length, teamCharacters);
    
    // Initialize terrain system with initial team areas
    initializeTerrainSystem(initialTeamAreas);
    
    // Place characters in their team areas - get back potentially resized team areas
    const placementResult = placeCharacters(teamCharacters, initialTeamAreas);
    const characterPositions = placementResult.positions;
    const finalTeamAreas = placementResult.teamAreas;
    
    // If we only get positions back (for backward compatibility), use the initial team areas
    const teamAreas = finalTeamAreas || initialTeamAreas;
    
    // Store the character positions globally
    setCharacterPositions(characterPositions);
    
    // Update the battlefield display - replace team display with grid
    // Pass the final team areas to ensure the display matches the actual areas used
    updateBattlefieldDisplay(teamAreas, characterPositions, teamAssignments.length);
    
    // Initialize camera system
    initializeCamera();
    
    // Initialize minimap system after the battlefield is created
    initializeMinimapSystem();
    
    // Add the battle log to the battlefield
    const battlefieldContent = document.querySelector('.battlefield-content');
    if (battlefieldContent) {
        const battleLog = createBattleLog();
        battlefieldContent.appendChild(battleLog);
    }
    
    // Welcome message
    logBattleEvent("Der Kampf beginnt!");
    
    // Roll initiative and sort characters - this now sets up both logic and display lists
    const sortedCharacters = rollInitiativeAndSort(characterList);
    
    // Display the initiative order in the Arena - this will now use the display list
    displayInitiativeOrder(sortedCharacters);
    
    // Start the initial camera sequence, then begin the first turn
    // Pass the FINAL team areas to the camera
    startInitialCameraSequence(teamAreas).then(async () => {
        // Log who goes first
        if (sortedCharacters.length > 0) {
            const firstCharacter = sortedCharacters[0];
            logBattleEvent(`${firstCharacter.character.name} will have the first turn!`);
        }
        
        // Apply trainer class effects before the first turn begins
        try {
            // Import and call startOfTurnClassCheck
            const classManager = await import('./classManager.js');
            await classManager.startOfTurnClassCheck();
            
            // Dürre, Niesel und co
            await checkAndApplyWeatherAbilities();
        } catch (error) {
            console.error('Error applying initial trainer class effects or Pokemon weather abilities:', error);
        }
        
        // Start the first turn
        setTimeout(() => {
            turn();
        }, 100);
    });
    
    return sortedCharacters;
}

/**
 * Reset character battle-specific properties WITHOUT touching combat stats
 * @param {Object} character - Character to reset
 */
function resetCharacterBattleState(character) {
    // IMPORTANT: Store current combat stats to ensure they're not accidentally modified
    const originalCombatStats = character.combatStats ? { ...character.combatStats } : null;
    const originalStatsDetails = character.statsDetails ? {
        ...character.statsDetails,
        statsGerman: character.statsDetails.statsGerman ? { ...character.statsDetails.statsGerman } : null
    } : null;
    
    // Reset current KP to max KP (this is the only stat modification we want)
    if (character.maxKP) {
        character.currentKP = character.maxKP;
    } else if (character.combatStats && character.combatStats.kp) {
        character.currentKP = character.combatStats.kp;
        character.maxKP = character.combatStats.kp;
    }

    // Re-apply strategy buffs based on current strategy setting SYNCHRONOUSLY
    // First remove any existing strategy buffs
    if (character.hasStrategyBuffs) {
        removeStrategyBuffs(character);
        // Then apply the current strategy buffs
        if (character.strategy) {
            applyStrategyBuffs(character, character.strategy);
        }
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
    
    // MODIFIED SAFETY CHECK: Exclude strategy-affected stats from restoration
    if (originalCombatStats) {
        // Get the stats that might be affected by strategy buffs
        const strategyAffectedStats = new Set(['bw', 'pa', 'gena', 'angriff', 'verteidigung', 'spAngriff', 'spVerteidigung']);
        
        // Restore all combat stats except currentKP, maxKP, and strategy-affected stats
        Object.keys(originalCombatStats).forEach(key => {
            if (key !== 'currentKP' && key !== 'maxKP' && !strategyAffectedStats.has(key)) {
                character.combatStats[key] = originalCombatStats[key];
            }
        });
    }
    
    // MODIFIED SAFETY CHECK: Exclude strategy-affected stats from restoration  
    if (originalStatsDetails && character.statsDetails) {
        Object.keys(originalStatsDetails).forEach(key => {
            if (key === 'statsGerman' && originalStatsDetails.statsGerman) {
                // Only restore stats that aren't affected by strategy buffs
                const strategyAffectedGermanStats = new Set([
                    'Angriff', 'Verteidigung', 'Spezial-Angriff', 'Spezial-Verteidigung'
                ]);
                
                Object.keys(originalStatsDetails.statsGerman).forEach(statKey => {
                    if (!strategyAffectedGermanStats.has(statKey)) {
                        character.statsDetails.statsGerman[statKey] = originalStatsDetails.statsGerman[statKey];
                    }
                });
            } else {
                character.statsDetails[key] = originalStatsDetails[key];
            }
        });
    }
    
    return character;
}