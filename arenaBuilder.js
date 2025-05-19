/**
 * Arena building system
 */

import { getTeamAssignments, areAllTeamsFilled, getTrainers } from './teamManager.js';
import { getTeamColor } from './charakterAuswahlUtils.js';
import { battle, resetBattle } from './battleManager.js';
import { getTrainerClassById } from './classService.js';

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
    const trainers = getTrainers();
    
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
        
        // Add trainer section
        if (trainers && trainers[index]) {
            const trainer = trainers[index];
            const trainerClass = getTrainerClassById(trainer.class);
            
            const trainerSection = document.createElement('div');
            trainerSection.className = 'arena-trainer-section';
            trainerSection.style.display = 'flex';
            trainerSection.style.alignItems = 'center';
            trainerSection.style.marginBottom = '15px';
            trainerSection.style.padding = '10px';
            trainerSection.style.backgroundColor = 'rgba(74, 111, 165, 0.1)';
            trainerSection.style.borderRadius = '5px';
            
            // Trainer icon
            const trainerIcon = document.createElement('img');
            trainerIcon.src = `TrainerIcons/${trainer.icon}`;
            trainerIcon.alt = 'Trainer Icon';
            trainerIcon.style.width = '50px';
            trainerIcon.style.height = '50px';
            trainerIcon.style.marginRight = '15px';
            trainerIcon.style.borderRadius = '5px';
            trainerIcon.style.border = '2px solid #ddd';
            
            // Trainer info container
            const trainerInfo = document.createElement('div');
            trainerInfo.style.flex = '1';
            
            // Trainer name
            const trainerName = document.createElement('div');
            trainerName.textContent = trainer.name;
            trainerName.style.fontWeight = 'bold';
            trainerName.style.fontSize = '16px';
            trainerName.style.marginBottom = '2px';
            
            // Trainer class
            const trainerClassName = document.createElement('div');
            trainerClassName.textContent = trainerClass ? trainerClass.name : trainer.class;
            trainerClassName.style.fontSize = '14px';
            trainerClassName.style.color = '#666';
            trainerClassName.style.fontStyle = 'italic';
            
            // Trainer class description
            if (trainerClass && trainerClass.description) {
                const trainerDescription = document.createElement('div');
                trainerDescription.textContent = trainerClass.description;
                trainerDescription.style.fontSize = '12px';
                trainerDescription.style.color = '#888';
                trainerDescription.style.marginTop = '5px';
                trainerDescription.style.lineHeight = '1.3';
                trainerInfo.appendChild(trainerDescription);
            }
            
            trainerInfo.appendChild(trainerName);
            trainerInfo.appendChild(trainerClassName);
            
            trainerSection.appendChild(trainerIcon);
            trainerSection.appendChild(trainerInfo);
            teamElement.appendChild(trainerSection);
        }
        
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
    startBattle(teamAssignments, trainers);
}

/**
 * Start the battle simulation
 * @param {Array} teamAssignments - Team assignments
 * @param {Array} trainers - Trainer assignments
 */
function startBattle(teamAssignments, trainers = []) {
    // Prepare enhanced team data that includes trainer information
    const enhancedTeams = teamAssignments.map((team, index) => {
        // Filter out null/empty slots
        const activeMembers = team.filter(member => member !== null);
        
        // Add trainer information to each character
        const membersWithTrainer = activeMembers.map(member => {
            // Add trainer reference to each character
            return {
                ...member,
                teamIndex: index,
                trainer: trainers[index] || {
                    name: 'Trainer',
                    icon: 'trainer1.png',
                    class: 'angler'
                }
            };
        });
        
        return membersWithTrainer;
    });
    
    // Ensure we have a battle function
    if (typeof window.battle !== 'function') {
        console.warn('Battle function not found in window, using imported battle function');
        window.battle = battle; // Use the imported function
    }
    
    // Use the battle function with enhanced data
    if (typeof window.battle === 'function') {
        // Pass the enhanced teams and trainers to the battle function
        window.battle(enhancedTeams, trainers);
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