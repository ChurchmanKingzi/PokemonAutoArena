/**
 * Main entry point for character selection
 */

import { updateTeamSlots } from './teamManager.js';
import { initializeTeamConfig } from './teamConfig.js';
import { initializeFightButton } from './arenaBuilder.js';
import { initializeBattlefieldConfigUI } from './battlefieldConfigUI.js';
import { loadPokemon } from './characterManager.js';

function init() {
    // Pre-cache common types for UI responsiveness
    const commonTypes = [
        'normal', 'fire', 'water', 'electric', 'grass', 
        'ice', 'fighting', 'poison', 'ground', 'flying', 
        'psychic', 'bug', 'rock', 'ghost', 'dragon',
        'dark', 'steel', 'fairy'
    ];
    
    // Add colored type badges
    addTypeStyles();
    
    // Pre-load Pokémon data (this will now load all Pokémon)
    loadPokemon().then(() => {
        console.log("Pokémon data loaded");
        // After Pokémon are loaded, update the team slots to show them
        updateTeamSlots();
    }).catch(err => {
        console.error("Error loading Pokémon:", err);
    });
    
    // Initialize team configuration
    initializeTeamConfig();
    
    // Initialize fight button
    initializeFightButton();

    // Initialize battlefield configuration UI
    initializeBattlefieldConfigUI();
}

function addTypeStyles() {
    const styleElement = document.createElement('style');
    styleElement.id = 'pokemon-type-styles';
    styleElement.textContent = `
        /* Type colors */
        .type-normal { background-color: #A8A878; color: white; }
        .type-fire { background-color: #F08030; color: white; }
        .type-water { background-color: #6890F0; color: white; }
        .type-electric { background-color: #F8D030; color: black; }
        .type-grass { background-color: #78C850; color: white; }
        .type-ice { background-color: #98D8D8; color: black; }
        .type-fighting { background-color: #C03028; color: white; }
        .type-poison { background-color: #A040A0; color: white; }
        .type-ground { background-color: #E0C068; color: black; }
        .type-flying { background-color: #A890F0; color: white; }
        .type-psychic { background-color: #F85888; color: white; }
        .type-bug { background-color: #A8B820; color: white; }
        .type-rock { background-color: #B8A038; color: white; }
        .type-ghost { background-color: #705898; color: white; }
        .type-dragon { background-color: #7038F8; color: white; }
        .type-dark { background-color: #705848; color: white; }
        .type-steel { background-color: #B8B8D0; color: black; }
        .type-fairy { background-color: #EE99AC; color: black; }
        
        .type-badge {
            display: inline-block;
            padding: 2px 5px;
            border-radius: 3px;
            font-size: 11px;
            font-weight: bold;
            text-transform: uppercase;
            margin-right: 5px;
        }
    `;
    document.head.appendChild(styleElement);
}

// Start the application when DOM is loaded
document.addEventListener('DOMContentLoaded', init);