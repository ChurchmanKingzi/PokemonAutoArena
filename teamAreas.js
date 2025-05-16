/**
 * Team area creation and management
 */

import { defineTeamAreas } from './characterPositions.js';

/**
 * Create team display areas in the battlefield
 * @param {Array} teams - The teams participating in the battle
 * @returns {HTMLElement} - The team display container
 */
export function createTeamAreas(teams) {
    // Create container for teams
    const teamsContainer = document.createElement('div');
    teamsContainer.className = 'arena-teams-container';
    
    // Create each team's display
    teams.forEach((team, index) => {
        // Skip if team is empty
        if (!team || team.length === 0) return;
        
        // Create team container
        const teamContainer = document.createElement('div');
        teamContainer.className = 'arena-team';
        
        // Add team title
        const teamTitle = document.createElement('h3');
        teamTitle.textContent = `Team ${index + 1}`;
        teamContainer.appendChild(teamTitle);
        
        // Create team members container
        const membersContainer = document.createElement('div');
        membersContainer.className = 'arena-team-members';
        
        // Add each character to the team
        team.forEach(character => {
            // Create character display
            const characterDisplay = document.createElement('div');
            characterDisplay.className = 'arena-character';
            
            // Add character sprite
            const sprite = document.createElement('img');
            sprite.src = `Sprites/spr_mage${character.spriteNum || 1}.png`;
            sprite.alt = character.name || 'Character';
            characterDisplay.appendChild(sprite);
            
            // Add character name
            const name = document.createElement('div');
            name.className = 'arena-character-name';
            name.textContent = character.name || 'Character';
            characterDisplay.appendChild(name);
            
            // Add to team members
            membersContainer.appendChild(characterDisplay);
        });
        
        // Add members to team container
        teamContainer.appendChild(membersContainer);
        
        // Add team to teams container
        teamsContainer.appendChild(teamContainer);
    });
    
    return teamsContainer;
}

/**
 * Get the appropriate team areas based on team count
 * @param {number} teamCount - Number of teams
 * @returns {Array} - Array of team areas
 */
export function getTeamAreas(teamCount) {
    return defineTeamAreas(teamCount);
}