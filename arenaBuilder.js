/**
 * Arena building system
 */

import { getTeamAssignments, areAllTeamsFilled } from './teamManager.js';
import { getTeamColor } from './charakterAuswahlUtils.js';
import { battle, resetBattle } from './battleManager.js';

/**
 * Handle fight button click
 */
export function handleFightButtonClick() {
    if (areAllTeamsFilled()) {
        navigateToArena();
    }
}

/**
 * Navigate to the arena page
 */
function navigateToArena() {
    // Hide character selection section
    document.querySelector('.character-selection').style.display = 'none';
    
    // Show combat area
    const combatArea = document.getElementById('combat-area');
    combatArea.style.display = 'block';
    
    // Build the arena content
    buildArena();
}

/**
 * Build the arena content
 */
function buildArena() {
    const combatArea = document.getElementById('combat-area');
    const teamAssignments = getTeamAssignments();
    
    // Clear any existing content
    combatArea.innerHTML = '';
        
    // Create back button at the top
    const backButtonContainer = document.createElement('div');
    backButtonContainer.className = 'back-button-container';
    backButtonContainer.style.textAlign = 'center';
    backButtonContainer.style.marginBottom = '20px';
    
    const backButton = document.createElement('button');
    backButton.className = 'back-button';
    backButton.textContent = 'Zurück zum Team-Builder';
    backButton.addEventListener('click', () => {
        // Reset the battle state completely
        resetBattle();
        
        // Hide combat area
        combatArea.style.display = 'none';
        
        // Show character selection
        document.querySelector('.character-selection').style.display = 'block';
    });
    
    backButtonContainer.appendChild(backButton);
    combatArea.appendChild(backButtonContainer);
    
    // Create container for the arena
    const arenaContainer = document.createElement('div');
    arenaContainer.className = 'battlefield';
    arenaContainer.style.display = 'block';
    
    // Create battlefield content
    const battlefieldContent = document.createElement('div');
    battlefieldContent.className = 'battlefield-content';
    
    // Create container for teams
    const teamsContainer = document.createElement('div');
    teamsContainer.className = 'arena-teams-container';
    
    // Display teams in the arena
    teamAssignments.forEach((team, index) => {
        const teamElement = document.createElement('div');
        teamElement.className = 'arena-team';
        teamElement.style.borderLeft = `5px solid ${getTeamColor(index)}`;
        
        const teamTitle = document.createElement('h3');
        teamTitle.textContent = `Team ${index + 1}`;
        teamElement.appendChild(teamTitle);
        
        const teamMembersContainer = document.createElement('div');
        teamMembersContainer.className = 'arena-team-members';
        
        team.forEach(character => {
            const characterElement = document.createElement('div');
            characterElement.className = 'arena-character';
            
            const spriteImg = document.createElement('img');
            spriteImg.src = character.spriteUrl || `Sprites/spr_mage${character.spriteNum || 1}.png`;
            spriteImg.alt = character.name || 'Character';
            
            const nameElement = document.createElement('div');
            nameElement.textContent = character.name;
            
            characterElement.appendChild(spriteImg);
            characterElement.appendChild(nameElement);
            teamMembersContainer.appendChild(characterElement);
        });
        
        teamElement.appendChild(teamMembersContainer);
        teamsContainer.appendChild(teamElement);
    });
    
    battlefieldContent.appendChild(teamsContainer);
    arenaContainer.appendChild(battlefieldContent);
    combatArea.appendChild(arenaContainer);
    
    // Start the battle simulation
    startBattle(teamAssignments);
}

/**
 * Start the battle simulation
 * @param {Array} teamAssignments - Team assignments
 */
function startBattle(teamAssignments) {
    // Ensure we have a battle function
    if (typeof window.battle !== 'function') {
        console.warn('Battle function not found in window, using imported battle function');
        window.battle = battle; // Use the imported function
    }
    
    // Use the battle function
    if (typeof window.battle === 'function') {
        window.battle(teamAssignments);
    } else {
        console.error('Battle function not found!');
    }
}

/**
 * Update the Fight button state based on whether all teams are filled
 */
export function updateFightButtonState() {
    const fightButton = document.getElementById('fight-button');
    if (!fightButton) return;
    
    if (areAllTeamsFilled()) {
        fightButton.classList.remove('disabled');
        fightButton.disabled = false;
    } else {
        fightButton.classList.add('disabled');
        fightButton.disabled = true;
    }
}

/**
 * Initialize the fight button
 */
export function initializeFightButton() {
    const fightButton = document.getElementById('fight-button');
    if (fightButton) {
        fightButton.addEventListener('click', handleFightButtonClick);
    }
}