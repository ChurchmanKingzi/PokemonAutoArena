/**
 * Team configuration management
 */

import { MIN_TEAMS, MAX_TEAMS, MIN_FIGHTERS_PER_TEAM, MAX_FIGHTERS_PER_TEAM } from './charakterAuswahlConfig.js';
import { updateTeamSlots } from './teamManager.js';
import { updateFightButtonState } from './arenaBuilder.js';

/**
 * Handles changes to team configuration
 */
export function handleTeamConfigChange() {
    validateTeamCount();
    validateFightersPerTeam();
    updateTeamSlots();
    updateFightButtonState();
}

/**
 * Validates the team count input
 * @returns {number} - The validated team count
 */
export function validateTeamCount() {
    const teamCountInput = document.getElementById('team-count');
    let value = parseInt(teamCountInput.value);
    
    // Ensure value is a number
    if (isNaN(value)) {
        value = MIN_TEAMS; // default value
    }
    
    // Ensure value is within bounds
    if (value < MIN_TEAMS) value = MIN_TEAMS;
    if (value > MAX_TEAMS) value = MAX_TEAMS;
    
    // Update the input with the validated value
    teamCountInput.value = value;
    
    return value;
}

/**
 * Validates the fighters per team input
 * @returns {number} - The validated fighters per team count
 */
export function validateFightersPerTeam() {
    const fightersPerTeamInput = document.getElementById('fighters-per-team');
    let value = parseInt(fightersPerTeamInput.value);
    
    // Ensure value is a number
    if (isNaN(value)) {
        value = MIN_FIGHTERS_PER_TEAM; // default value
    }
    
    // Ensure value is within bounds
    if (value < MIN_FIGHTERS_PER_TEAM) value = MIN_FIGHTERS_PER_TEAM;
    if (value > MAX_FIGHTERS_PER_TEAM) value = MAX_FIGHTERS_PER_TEAM;
    
    // Update the input with the validated value
    fightersPerTeamInput.value = value;
    
    return value;
}

/**
 * Initialize team configuration inputs
 */
export function initializeTeamConfig() {
    const teamCountInput = document.getElementById('team-count');
    const fightersPerTeamInput = document.getElementById('fighters-per-team');
    
    // Set initial values if not already set
    if (!teamCountInput.value) {
        teamCountInput.value = MIN_TEAMS;
    }
    
    if (!fightersPerTeamInput.value) {
        fightersPerTeamInput.value = MIN_FIGHTERS_PER_TEAM;
    }
    
    // Add event listeners
    teamCountInput.addEventListener('change', handleTeamConfigChange);
    fightersPerTeamInput.addEventListener('change', handleTeamConfigChange);
}