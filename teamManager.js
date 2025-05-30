/**
 * Team management system with Pokémon integration and Trainer support
 */

import { validateTeamCount, validateFightersPerTeam } from './teamConfig.js';
import { getCharacterTemplate, getAvailableTemplates, enhanceCharacterWithMoves } from './characterManager.js';
import { updateFightButtonState } from './arenaBuilder.js';
import { applyStrategyBuffs, generateRandomTeam, DropdownFactory } from './utils.js';
import { getItemById } from './itemService.js';
import { getAvailableTrainerIcons } from './classService.js';
import { getAvailableMovesForSlot, handleMoveSelection } from './utils.js';
import { updatePokemonStatsTooltipForCharacter, createPokemonStatsTooltip } from './utils.js';
import { storeMoveDropdownInstance, cleanupMoveDropdownInstances, cleanupAllMoveDropdownInstances } from './utils.js';
import { clearStrategyDisplayCache } from './resetSystem.js';
import { applyMoveTypeColoring } from './utils.js';

// Store team assignments
let teamAssignments = [];

// Store trainer assignments
let trainers = [];

// Track if a drop was handled by a team slot
let dropHandled = false;

// Store dropdown instances for cleanup
const dropdownInstances = new Map();

/**
 * Get team assignments
 * @returns {Array} - The team assignments
 */
export function getTeamAssignments() {
    return teamAssignments;
}

/**
 * Get trainer assignments
 * @returns {Array} - The trainer assignments
 */
export function getTrainers() {
    return trainers;
}

/**
 * Initialize character strategy, range, attacks, and forcing mode
 * @param {Object} character - The character being added to a team
 */
export function initializeCharacter(character) {
    // Import dynamically to avoid circular dependencies
    import('./characterPreparation.js').then(module => {
        module.initializeCharacterAttacks(character);
    });
    
    // Initialize status effects
    import('./statusEffects.js').then(module => {
        module.initializeStatusEffects(character);
    });

    // Generate a unique ID if one doesn't exist
    if (!character.uniqueId) {
        character.uniqueId = `pokemon_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    }
    
    // Set default strategy if not already set
    if (!character.strategy) {
        character.strategy = 'aggressive';
    }
    applyStrategyBuffs(character, character.strategy);
    
    // Set default forcing mode if not already set
    if (!character.forcingMode) {
        character.forcingMode = 'always';
    }
    
    // Set default critThreshold if not already set
    if (character.critThreshold === undefined) {
        character.critThreshold = 4;
    }
    
    // Initialize selected item if not set
    if (!character.selectedItem) {
        character.selectedItem = null;
    }
    
    // Triple the KP values for combat (but keep original base stats unchanged)
    if (character.combatStats && character.combatStats.kp) {
        // Store the original KP for reference
        character.originalKP = character.combatStats.kp;
        
        // Triple the combat KP
        character.combatStats.kp = Math.round(character.combatStats.kp * 3);
        
        // Also set up currentKP and maxKP for battle
        character.currentKP = character.combatStats.kp;
        character.maxKP = character.combatStats.kp;
    }
    
    // Set range to the maximum range of all attacks
    let maxRange = 1; // Default minimum range
    if (character.attacks) {
        for (const attack of character.attacks) {
            if (attack && attack.range && attack.range > maxRange) {
                maxRange = attack.range;
            }
        }
    }
    
    character.range = maxRange;
}

async function handleCharacterSelection(teamIndex, slotIndex, templateId) {
     // Clean up any existing move dropdowns for this slot
    cleanupMoveDropdownInstances(teamIndex, slotIndex);
    
    if (!templateId) {
        // Empty selection - clear the slot
        teamAssignments[teamIndex][slotIndex] = null;
        updateTeamSlots();
        updateFightButtonState();
        return;
    }
    
    try {
        // Show loading indicator in the slot
        const slot = document.querySelector(`.team-slot[data-team="${teamIndex}"][data-slot="${slotIndex}"]`);
        if (slot) {
            const loadingIndicator = document.createElement('div');
            loadingIndicator.className = 'loading-moves-indicator';
            loadingIndicator.innerHTML = '<div class="loading-spinner"></div><span>Lade Attacken...</span>';
            loadingIndicator.style.textAlign = 'center';
            loadingIndicator.style.padding = '10px';
            loadingIndicator.style.margin = '10px 0';
            slot.appendChild(loadingIndicator);
        }
        
        // Get Pokémon template by ID
        const pokemon = getCharacterTemplate(templateId);
        
        if (pokemon) {
            // Initialize character abilities, strategy, etc.
            initializeCharacter(pokemon);
            
            // Enhance with moves data
            const enhancedPokemon = await enhanceCharacterWithMoves(pokemon);
            
            // Ensure KP (HP) values are tripled for combat (double-check)
            if (enhancedPokemon.combatStats && enhancedPokemon.combatStats.kp && !enhancedPokemon.originalKP) {
                // Store the original KP for reference
                enhancedPokemon.originalKP = enhancedPokemon.combatStats.kp;
                
                // Triple the combat KP
                enhancedPokemon.combatStats.kp = Math.round(enhancedPokemon.combatStats.kp * 3);
                
                // Also set up currentKP and maxKP for battle
                enhancedPokemon.currentKP = enhancedPokemon.combatStats.kp;
                enhancedPokemon.maxKP = enhancedPokemon.combatStats.kp;
            }
            
            // Assign to team
            teamAssignments[teamIndex][slotIndex] = enhancedPokemon;

            // Lieblingstyp-Buff
            const trainer = trainers[teamIndex];
            if (trainer && trainer.favoriteType) {
                const hasType = enhancedPokemon.pokemonTypes && enhancedPokemon.pokemonTypes.some(type => 
                    type.toLowerCase() === trainer.favoriteType.toLowerCase()
                );
                if (hasType) {
                    applyTypeBuff(enhancedPokemon, teamIndex);
                }
            }
        } else {
            console.error(`Failed to get Pokémon template for ID: ${templateId}`);
        }
    } catch (error) {
        console.error(`Error selecting character:`, error);
    } finally {
        // Update team slots to reflect changes
        updateTeamSlots();
        
        // Update the fight button state
        updateFightButtonState();
    }
}

/**
 * Updates the team slots based on current configuration - with new 3-column layout
 */
export function updateTeamSlots() {
    cleanupAllDropdowns();

    const teamCount = validateTeamCount();
    const fightersPerTeam = validateFightersPerTeam();
    
    // Initialize team assignments if needed
    if (teamAssignments.length !== teamCount) {
        // Preserve existing assignments where possible
        const newAssignments = [];
        for (let i = 0; i < teamCount; i++) {
            newAssignments[i] = [];
            for (let j = 0; j < fightersPerTeam; j++) {
                if (teamAssignments[i] && teamAssignments[i][j]) {
                    newAssignments[i][j] = teamAssignments[i][j];
                } else {
                    newAssignments[i][j] = null;
                }
            }
        }
        // Update assignments
        while(teamAssignments.length > 0) {
            teamAssignments.pop();
        }
        newAssignments.forEach(team => teamAssignments.push(team));
    } else {
        // Adjust fighter count per team if needed
        teamAssignments.forEach((team, i) => {
            // Add slots if needed
            while (team.length < fightersPerTeam) {
                team.push(null);
            }
            // Remove slots if needed
            while (team.length > fightersPerTeam) {
                team.pop();
            }

            team.forEach(pokemon => {
                if (pokemon) {
                    clearStrategyDisplayCache(pokemon);
                }
            });
        });
    }

    // Initialize trainers if needed
    if (trainers.length !== teamCount) {
        // Preserve existing trainers where possible
        const newTrainers = [];
        for (let i = 0; i < teamCount; i++) {
            if (trainers[i]) {
                newTrainers[i] = trainers[i];
            } else {
                newTrainers[i] = {
                    name: 'Trainer',
                    icon: 'trainer1.png',
                    class: 'angler',
                    favoriteType: null
                };
            }
        }
        // Update trainers
        while(trainers.length > 0) {
            trainers.pop();
        }
        newTrainers.forEach(trainer => trainers.push(trainer));
    }
    
    const teamsList = document.getElementById('teams-list');
    
    // Clear existing team slots
    teamsList.innerHTML = '';
    
    for (let teamIdx = 0; teamIdx < teamCount; teamIdx++) {
        for (let slotIdx = 0; slotIdx < fightersPerTeam; slotIdx++) {
            cleanupMoveDropdownInstances(teamIdx, slotIdx);
        }
    }

    // Create team containers
    for (let i = 0; i < teamCount; i++) {
        const team = document.createElement('div');
        team.className = 'team';
        
        // Team title
        const teamTitleContainer = document.createElement('div');
        teamTitleContainer.className = 'team-title-container';

        const teamTitle = document.createElement('div');
        teamTitle.className = 'team-title';
        teamTitle.textContent = `Team ${i + 1}`;

        const randomButton = document.createElement('button');
        randomButton.className = 'random-team-button';
        randomButton.textContent = 'Random Team';
        randomButton.dataset.team = i;
        randomButton.addEventListener('click', (e) => {
            const teamIndex = parseInt(e.target.dataset.team);
            generateRandomTeam(teamIndex, trainers, teamAssignments);
        });

        teamTitleContainer.appendChild(teamTitle);
        teamTitleContainer.appendChild(randomButton);
        team.appendChild(teamTitleContainer);

        // Trainer section
        const trainerSection = document.createElement('div');
        trainerSection.className = 'trainer-section';
        
        const trainerTitle = document.createElement('h4');
        trainerTitle.textContent = 'Trainer';
        trainerTitle.className = 'trainer-title';
        trainerSection.appendChild(trainerTitle);
        
        const trainerContent = document.createElement('div');
        trainerContent.className = 'trainer-content';
        
        // Trainer icon
        const trainerIconContainer = document.createElement('div');
        trainerIconContainer.className = 'trainer-icon-container';
        
        const trainerIcon = document.createElement('img');
        trainerIcon.className = 'trainer-icon';
        trainerIcon.src = `TrainerIcons/${trainers[i].icon}`;
        trainerIcon.alt = 'Trainer Icon';
        trainerIcon.addEventListener('click', () => openTrainerIconSelector(i));
        
        trainerIconContainer.appendChild(trainerIcon);
        trainerContent.appendChild(trainerIconContainer);
        
        // Trainer controls
        const trainerControls = document.createElement('div');
        trainerControls.className = 'trainer-controls';
        
        // Trainer name input
        const nameContainer = document.createElement('div');
        nameContainer.className = 'trainer-name-container';
        
        const nameLabel = document.createElement('label');
        nameLabel.textContent = 'Name:';
        nameLabel.htmlFor = `trainer-name-${i}`;
        
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.id = `trainer-name-${i}`;
        nameInput.className = 'trainer-name-input';
        nameInput.value = trainers[i].name;
        nameInput.addEventListener('change', (e) => {
            trainers[i].name = e.target.value;
        });
        
        nameContainer.appendChild(nameLabel);
        nameContainer.appendChild(nameInput);
        trainerControls.appendChild(nameContainer);
        
        // Trainer class dropdown
        const trainerClassContainer = document.createElement('div');
        trainerClassContainer.className = 'trainer-class-container';

        const classLabel = document.createElement('label');
        classLabel.textContent = 'Klasse:';
        classLabel.htmlFor = `trainer-class-${i}`;

        const currentClass = trainers[i].class || 'angler';

        const classDropdown = DropdownFactory.trainerClass(currentClass, (value) => {
            handleTrainerClassChange(i, value);
        });

        trainerClassContainer.appendChild(classLabel);
        trainerClassContainer.appendChild(classDropdown.getElement());
        trainerControls.appendChild(trainerClassContainer);

        // Favorite type dropdown
        const favoriteTypeContainer = document.createElement('div');
        favoriteTypeContainer.className = 'trainer-favorite-type-container';

        const favoriteTypeLabel = document.createElement('label');
        favoriteTypeLabel.textContent = 'Lieblingstyp:';
        favoriteTypeLabel.htmlFor = `trainer-favorite-type-${i}`;

        const currentFavoriteType = trainers[i].favoriteType || '';

        const favoriteTypeDropdown = DropdownFactory.favoriteType(currentFavoriteType, (value) => {
            handleFavoriteTypeChange(i, value);
        });

        favoriteTypeContainer.appendChild(favoriteTypeLabel);
        favoriteTypeContainer.appendChild(favoriteTypeDropdown.getElement());
        trainerControls.appendChild(favoriteTypeContainer);
        
        trainerContent.appendChild(trainerControls);
        trainerSection.appendChild(trainerContent);
        team.appendChild(trainerSection);
        
        // Team slots container
        const teamSlots = document.createElement('div');
        teamSlots.className = 'team-slots';
        
        // Create fighter slots - ALWAYS CREATE 6 SLOTS for grid layout
        for (let j = 0; j < 6; j++) {
            const slot = document.createElement('div');
            slot.className = 'team-slot';
            slot.dataset.team = i;
            slot.dataset.slot = j;
            
            // Only add content for configured Pokemon
            if (j < fightersPerTeam) {
                // Create Pokemon header with NEW 3-COLUMN LAYOUT
                const pokemonHeader = document.createElement('div');
                pokemonHeader.className = 'pokemon-header';
                
                // COLUMN 1: Pokemon sprite container (left side)
                const spriteContainer = document.createElement('div');
                spriteContainer.className = 'pokemon-sprite-container';
                
                if (teamAssignments[i][j]) {
                    const character = teamAssignments[i][j];
                    const img = document.createElement('img');
                    img.src = character.spriteUrl || 'placeholder.png';
                    img.alt = character.name;
                    spriteContainer.appendChild(img);
                    
                    // Add green border if Pokemon is buffed by favorite type
                    if (character.isTypeBuffed) {
                        spriteContainer.classList.add('buffed-sprite');
                    } else {
                        spriteContainer.classList.remove('buffed-sprite');
                    }
                    
                    // Create tooltip for Pokemon stats
                    const tooltip = createPokemonStatsTooltip(character);
                    spriteContainer.appendChild(tooltip);
                    
                    // Add hover event listeners for tooltip
                    spriteContainer.addEventListener('mouseenter', () => {
                        tooltip.style.display = 'block';
                    });
                    
                    spriteContainer.addEventListener('mouseleave', () => {
                        tooltip.style.display = 'none';
                    });
                }
                
                // COLUMN 2: Middle area (flexible space - empty for now)
                const middleArea = document.createElement('div');
                middleArea.className = 'pokemon-middle-area';
                // Middle area is currently empty but can be used for future features
                
                // COLUMN 3: Dropdowns container (far right)
                const dropdownsContainer = document.createElement('div');
                dropdownsContainer.className = 'pokemon-dropdowns-container';
                
                // CREATE ALL DROPDOWNS AND ADD TO DROPDOWNS CONTAINER
                
                // 1. Pokemon selection dropdown (always present)
                const customSelectWrapper = document.createElement('div');
                customSelectWrapper.className = 'custom-select-wrapper';
                customSelectWrapper.id = `custom-select-wrapper-${i}-${j}`;
                
                const customSelect = document.createElement('div');
                customSelect.className = 'custom-select';
                customSelect.dataset.team = i;
                customSelect.dataset.slot = j;
                
                const customSelectTrigger = document.createElement('div');
                customSelectTrigger.className = 'custom-select__trigger';
                
                // Add loading spinner initially
                const loadingSpinner = document.createElement('div');
                loadingSpinner.className = 'loading-spinner';
                
                const triggerText = document.createElement('span');
                triggerText.textContent = 'Lade Pokémon...';
                
                customSelectTrigger.appendChild(loadingSpinner);
                customSelectTrigger.appendChild(triggerText);
                
                const customSelectOptions = document.createElement('div');
                customSelectOptions.className = 'custom-select__options';

                // Add search input at the top of options
                const searchContainer = document.createElement('div');
                searchContainer.className = 'custom-select__search-container';
                searchContainer.style.padding = '10px';
                searchContainer.style.position = 'sticky';
                searchContainer.style.top = '0';
                searchContainer.style.backgroundColor = '#fff';
                searchContainer.style.borderBottom = '1px solid #eee';
                searchContainer.style.zIndex = '2';

                const searchInput = document.createElement('input');
                searchInput.type = 'text';
                searchInput.className = 'custom-select__search-input';
                searchInput.placeholder = 'Pokémon suchen...';
                searchInput.style.width = '100%';
                searchInput.style.padding = '8px';
                searchInput.style.borderRadius = '4px';
                searchInput.style.border = '1px solid #ddd';
                searchInput.style.boxSizing = 'border-box';

                searchContainer.appendChild(searchInput);
                customSelectOptions.appendChild(searchContainer);
                
                customSelect.appendChild(customSelectTrigger);
                customSelect.appendChild(customSelectOptions);
                customSelectWrapper.appendChild(customSelect);
                
                // Add Pokemon dropdown to dropdowns container
                dropdownsContainer.appendChild(customSelectWrapper);
                
                // 2. Strategy dropdown (only if character is selected)
                if (teamAssignments[i][j]) {
                    const character = teamAssignments[i][j];
                    const currentStrategy = character.strategy || 'aggressive';
                    
                    const strategyContainer = document.createElement('div');
                    strategyContainer.className = 'strategy-container-mini';
                    
                    const strategyLabel = document.createElement('label');
                    strategyLabel.textContent = 'Strategie:';
                    
                    // Capture teamIndex and slotIndex in the closure
                    const teamIdx = i;
                    const slotIdx = j;

                    const strategyDropdown = DropdownFactory.strategy(currentStrategy, (value) => {
                        character.strategy = value;
                        applyStrategyBuffs(character, value);
                        console.log(`Set ${character.name}'s strategy to ${value}`);
                        updatePokemonStatsTooltipForCharacter(teamIdx, slotIdx, character);
                    });
                    
                    strategyContainer.appendChild(strategyLabel);
                    strategyContainer.appendChild(strategyDropdown.getElement());
                    dropdownsContainer.appendChild(strategyContainer);

                    // 3. Forcing mode dropdown
                    const forceModeContainer = document.createElement('div');
                    forceModeContainer.className = 'strategy-container-mini';

                    const forceModeLabel = document.createElement('label');
                    forceModeLabel.textContent = 'Forcieren:';

                    const currentForcingMode = character.forcingMode || 'always';
                    
                    const forcingDropdown = DropdownFactory.forcingMode(currentForcingMode, (value) => {
                        teamAssignments[i][j].forcingMode = value;
                    });
                    
                    forceModeContainer.appendChild(forceModeLabel);
                    forceModeContainer.appendChild(forcingDropdown.getElement());
                    dropdownsContainer.appendChild(forceModeContainer);

                    // 4. Item dropdown
                    const itemContainer = document.createElement('div');
                    itemContainer.className = 'strategy-container-mini';
                    
                    const itemLabel = document.createElement('label');
                    itemLabel.textContent = 'Item:';
                    
                    const currentItemId = character.selectedItem ? character.selectedItem.id : '';
                    
                    const itemDropdown = DropdownFactory.item(currentItemId, (value) => {
                        if (value) {
                            const selectedItem = getItemById(value);
                            teamAssignments[i][j].selectedItem = selectedItem;
                        } else {
                            teamAssignments[i][j].selectedItem = null;
                        }
                    });
                    
                    itemContainer.appendChild(itemLabel);
                    itemContainer.appendChild(itemDropdown.getElement());
                    dropdownsContainer.appendChild(itemContainer);
                }
                
                // Add all three columns to pokemon header
                pokemonHeader.appendChild(spriteContainer);    // Column 1: Sprite
                pokemonHeader.appendChild(middleArea);         // Column 2: Middle
                pokemonHeader.appendChild(dropdownsContainer); // Column 3: Dropdowns
                
                slot.appendChild(pokemonHeader);
                
                // LOAD POKEMON DATA AND POPULATE DROPDOWN
                getAvailableTemplates().then(templates => {
                    // Remove loading spinner
                    customSelectTrigger.innerHTML = '';
                    
                    // Add current selection or default text
                    const currentPokemon = teamAssignments[i][j];
                    
                    if (currentPokemon) {
                        // Show selected Pokémon
                        const selectedImg = document.createElement('img');
                        selectedImg.src = currentPokemon.spriteUrl || 'placeholder.png';
                        selectedImg.className = 'custom-select__trigger-img';
                        
                        const selectedText = document.createElement('span');
                        selectedText.textContent = currentPokemon.name;
                        
                        customSelectTrigger.appendChild(selectedImg);
                        customSelectTrigger.appendChild(selectedText);
                    } else {
                        // Show default text
                        const selectedText = document.createElement('span');
                        selectedText.textContent = 'Pokémon auswählen';
                        customSelectTrigger.appendChild(selectedText);
                    }
                    
                    // Clear options (except search container)
                    const searchContainer = customSelectOptions.querySelector('.custom-select__search-container');
                    customSelectOptions.innerHTML = '';
                    customSelectOptions.appendChild(searchContainer);
                    
                    // Add default "no selection" option
                    const defaultOption = document.createElement('div');
                    defaultOption.className = 'custom-select__option';
                    defaultOption.dataset.value = '';
                    defaultOption.textContent = 'Kein Pokémon';
                    defaultOption.dataset.searchName = 'kein pokemon';
                    
                    defaultOption.addEventListener('click', function() {
                        handleCharacterSelection(i, j, '');
                        customSelect.classList.remove('open');
                        
                        // Update trigger display
                        customSelectTrigger.innerHTML = '';
                        const selectedText = document.createElement('span');
                        selectedText.textContent = 'Pokémon auswählen';
                        customSelectTrigger.appendChild(selectedText);
                    });
                    
                    customSelectOptions.appendChild(defaultOption);
                    
                    // Add all Pokémon options
                    templates.forEach(pokemon => {
                        const option = document.createElement('div');
                        option.className = 'custom-select__option';
                        option.dataset.value = pokemon.id;
                        option.dataset.searchName = pokemon.name.toLowerCase();
                        
                        // Add sprite image
                        if (pokemon.sprite) {
                            const img = document.createElement('img');
                            img.src = pokemon.sprite;
                            img.className = 'custom-select__option-img';
                            img.onerror = function() {
                                this.src = 'placeholder.png';
                            };
                            option.appendChild(img);
                        }
                        
                        // Add Pokémon name
                        const text = document.createElement('span');
                        text.textContent = pokemon.name;
                        option.appendChild(text);
                        
                        // Mark as selected if this is the current Pokémon
                        if (currentPokemon && currentPokemon.name === pokemon.name) {
                            option.classList.add('selected');
                        }
                        
                        // Add click handler
                        option.addEventListener('click', function() {
                            handleCharacterSelection(i, j, pokemon.id);
                            customSelect.classList.remove('open');
                            
                            // Update trigger display
                            customSelectTrigger.innerHTML = '';
                            
                            const selectedImg = document.createElement('img');
                            selectedImg.src = pokemon.sprite || 'placeholder.png';
                            selectedImg.className = 'custom-select__trigger-img';
                            
                            const selectedText = document.createElement('span');
                            selectedText.textContent = pokemon.name;
                            
                            customSelectTrigger.appendChild(selectedImg);
                            customSelectTrigger.appendChild(selectedText);
                        });
                        
                        customSelectOptions.appendChild(option);
                    });

                    // Add event listener for the search input
                    const searchInput = customSelect.querySelector('.custom-select__search-input');
                    searchInput.addEventListener('input', function(e) {
                        const searchText = e.target.value.toLowerCase();
                        const options = customSelectOptions.querySelectorAll('.custom-select__option');
                        
                        let firstVisible = null;
                        
                        options.forEach(option => {
                            if (option.classList.contains('custom-select__search-container')) {
                                return;
                            }
                            
                            const pokemonName = option.dataset.searchName;
                            if (pokemonName && pokemonName.includes(searchText)) {
                                option.style.display = 'flex';
                                if (!firstVisible) firstVisible = option;
                            } else {
                                option.style.display = 'none';
                            }
                        });
                        
                        if (firstVisible) {
                            firstVisible.scrollIntoView({ block: 'nearest' });
                        }
                    });
                    
                    // Handle keyboard navigation
                    searchInput.addEventListener('keydown', function(e) {
                        const options = Array.from(customSelectOptions.querySelectorAll('.custom-select__option:not([style*="display: none"])'));
                        
                        if (e.key === 'Enter' && options.length > 0) {
                            options[0].click();
                            return;
                        }
                        
                        if (e.key === 'Escape') {
                            customSelect.classList.remove('open');
                            return;
                        }
                    });
                    
                }).catch(error => {
                    console.error("Error loading Pokémon:", error);
                    
                    customSelectTrigger.innerHTML = '';
                    const errorText = document.createElement('span');
                    errorText.textContent = 'Fehler beim Laden der Pokémon';
                    errorText.style.color = 'red';
                    customSelectTrigger.appendChild(errorText);
                });
                
                // Add click event to toggle dropdown
                customSelectTrigger.addEventListener('click', function() {
                    // Close all other open dropdowns
                    document.querySelectorAll('.custom-select.open').forEach(select => {
                        if (select !== customSelect) {
                            select.classList.remove('open');
                        }
                    });
                    
                    // Toggle this dropdown
                    const wasAlreadyOpen = customSelect.classList.contains('open');
                    customSelect.classList.toggle('open');
                    
                    // Focus search input if dropdown is now open
                    if (!wasAlreadyOpen && customSelect.classList.contains('open')) {
                        setTimeout(() => {
                            const searchInput = customSelect.querySelector('.custom-select__search-input');
                            if (searchInput) {
                                searchInput.focus();
                                searchInput.select();
                            }
                        }, 10);
                    }
                });
                
                // Close dropdown when clicking outside
                document.addEventListener('click', function(e) {
                    if (!customSelect.contains(e.target)) {
                        customSelect.classList.remove('open');
                    }
                });
                
                // ADD MOVES SELECTION IF CHARACTER IS SELECTED
                if (teamAssignments[i][j]) {
                    const character = teamAssignments[i][j];
                    
                    // Clean up any existing move dropdowns for this slot
                    cleanupMoveDropdownInstances(i, j);
                    
                    // Add moves selection if character has availableMoves
                    if (character.availableMoves && character.availableMoves.length > 0) {
                        // Create moves container with 2x2 grid
                        const movesContainer = document.createElement('div');
                        movesContainer.className = 'moves-container';
                        movesContainer.style.marginTop = '15px';
                        
                        // Capture indices for move callbacks
                        const teamIdx = i;
                        const slotIdx = j;
                        
                        // Create four move dropdowns
                        for (let moveIndex = 0; moveIndex < 4; moveIndex++) {
                            const moveContainer = document.createElement('div');
                            moveContainer.className = 'move-selection-container';
                            
                            const selectedMoves = character.selectedMoves || [null, null, null, null];
                            const currentMove = selectedMoves[moveIndex];
                            const currentMoveId = currentMove ? currentMove.id : '';
                            
                            // Get available moves with disabled states
                            const availableMoves = getAvailableMovesForSlot(character, moveIndex);
                            
                            // Capture moveIndex for the callback
                            const capturedMoveIndex = moveIndex;
                            
                            const moveDropdown = DropdownFactory.move(availableMoves, currentMoveId, (value) => {
                                handleMoveSelection(teamIdx, slotIdx, capturedMoveIndex, value, character);
                            });
                            
                            // Store the dropdown instance for later updates
                            storeMoveDropdownInstance(teamIdx, slotIdx, capturedMoveIndex, moveDropdown);
                            
                            moveContainer.appendChild(moveDropdown.getElement());
                            movesContainer.appendChild(moveContainer);
                        }
                        
                        slot.appendChild(movesContainer);
                    }
                }
            } else {
                // For slots beyond the configured number, show disabled style
                slot.classList.add('disabled-slot');
                const disabledMessage = document.createElement('div');
                disabledMessage.className = 'disabled-slot-message';
                disabledMessage.textContent = 'Nicht konfiguriert';
                slot.appendChild(disabledMessage);
            }
            
            teamSlots.appendChild(slot);
        }
        
        team.appendChild(teamSlots);
        teamsList.appendChild(team);
    }
    
    // Apply type coloring to ALL teams after HTML recreation
    for (let teamIdx = 0; teamIdx < teamCount; teamIdx++) {
        if (teamAssignments[teamIdx]) {
            teamAssignments[teamIdx].forEach((pokemon, slotIndex) => {
                if (pokemon) {
                    // Small delay to ensure DOM is updated
                    setTimeout(() => {
                        applyMoveTypeColoring(teamIdx, slotIndex, pokemon);
                    }, 100);
                }
            });
        }
    }
    
    // Update the fight button state
    updateFightButtonState();
}

/**
 * Open trainer icon selector modal
 * @param {number} teamIndex - Index of the team
 */
async function openTrainerIconSelector(teamIndex) {
    // Create modal overlay
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    modalOverlay.style.position = 'fixed';
    modalOverlay.style.top = '0';
    modalOverlay.style.left = '0';
    modalOverlay.style.width = '100%';
    modalOverlay.style.height = '100%';
    modalOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    modalOverlay.style.display = 'flex';
    modalOverlay.style.justifyContent = 'center';
    modalOverlay.style.alignItems = 'center';
    modalOverlay.style.zIndex = '10000';
    
    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    modalContent.style.backgroundColor = 'white';
    modalContent.style.padding = '20px';
    modalContent.style.borderRadius = '8px';
    modalContent.style.maxWidth = '600px';
    modalContent.style.maxHeight = '80vh';
    modalContent.style.overflow = 'auto';
    
    // Modal title
    const modalTitle = document.createElement('h3');
    modalTitle.textContent = 'Trainer-Icon auswählen';
    modalTitle.style.marginTop = '0';
    modalContent.appendChild(modalTitle);
    
    // Loading indicator
    const loadingIndicator = document.createElement('div');
    loadingIndicator.innerHTML = '<div class="loading-spinner"></div><span>Lade Icons...</span>';
    loadingIndicator.style.textAlign = 'center';
    loadingIndicator.style.padding = '20px';
    modalContent.appendChild(loadingIndicator);
    
    // Add modal to DOM early so user sees loading
    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);
    
    try {
        // Get available icons (this is async)
        const availableIcons = await getAvailableTrainerIcons();
        
        // Remove loading indicator
        modalContent.removeChild(loadingIndicator);
        
        // Icon grid
        const iconGrid = document.createElement('div');
        iconGrid.className = 'trainer-icon-grid';
        iconGrid.style.display = 'grid';
        iconGrid.style.gridTemplateColumns = 'repeat(4, 1fr)';
        iconGrid.style.gap = '6px';
        iconGrid.style.marginBottom = '6px';
        
        // Add available icons
        availableIcons.forEach(iconName => {
            const iconOption = document.createElement('div');
            iconOption.className = 'trainer-icon-option';
            iconOption.style.cursor = 'pointer';
            iconOption.style.padding = '2px';
            iconOption.style.border = '2px solid transparent';
            iconOption.style.borderRadius = '2px';
            iconOption.style.textAlign = 'center';
            iconOption.style.transition = 'all 0.3s ease';
            
            const iconImg = document.createElement('img');
            iconImg.src = `TrainerIcons/${iconName}`;
            iconImg.alt = iconName;
            iconImg.style.width = '90px';
            iconImg.style.height = '90px';
            iconImg.style.objectFit = 'contain';
            
            iconOption.appendChild(iconImg);
            
            // Check if this is the current icon
            if (trainers[teamIndex].icon === iconName) {
                iconOption.style.borderColor = '#4a6fa5';
                iconOption.style.backgroundColor = '#f0f5ff';
            }
            
            // Add hover effect
            iconOption.addEventListener('mouseenter', () => {
                if (trainers[teamIndex].icon !== iconName) {
                    iconOption.style.borderColor = '#ccc';
                    iconOption.style.backgroundColor = '#f9f9f9';
                }
            });
            
            iconOption.addEventListener('mouseleave', () => {
                if (trainers[teamIndex].icon !== iconName) {
                    iconOption.style.borderColor = 'transparent';
                    iconOption.style.backgroundColor = 'transparent';
                }
            });
            
            // Add click handler
            iconOption.addEventListener('click', () => {
                // Update trainer icon
                trainers[teamIndex].icon = iconName;
                
                // Update UI
                const trainerIconElement = document.querySelector(`.team:nth-child(${teamIndex + 1}) .trainer-icon`);
                if (trainerIconElement) {
                    trainerIconElement.src = `TrainerIcons/${iconName}`;
                }
                
                // Close modal
                document.body.removeChild(modalOverlay);
            });
            
            iconGrid.appendChild(iconOption);
        });
        
        modalContent.appendChild(iconGrid);
        
    } catch (error) {
        console.error('Error loading trainer icons:', error);
        
        // Remove loading indicator if it still exists
        if (modalContent.contains(loadingIndicator)) {
            modalContent.removeChild(loadingIndicator);
        }
        
        const errorMessage = document.createElement('div');
        errorMessage.textContent = 'Fehler beim Laden der Icons. Verwende Standard-Icons.';
        errorMessage.style.textAlign = 'center';
        errorMessage.style.padding = '20px';
        errorMessage.style.color = 'red';
        modalContent.appendChild(errorMessage);
        
        // Use fallback icons
        const fallbackIcons = [];
        for (let i = 1; i <= 12; i++) {
            fallbackIcons.push(`trainer${i}.png`);
        }
        
        // Icon grid for fallback
        const iconGrid = document.createElement('div');
        iconGrid.className = 'trainer-icon-grid';
        iconGrid.style.display = 'grid';
        iconGrid.style.gridTemplateColumns = 'repeat(4, 1fr)';
        iconGrid.style.gap = '10px';
        iconGrid.style.marginBottom = '20px';
        
        // Add fallback icons
        fallbackIcons.forEach(iconName => {
            const iconOption = document.createElement('div');
            iconOption.className = 'trainer-icon-option';
            iconOption.style.cursor = 'pointer';
            iconOption.style.padding = '10px';
            iconOption.style.border = '2px solid transparent';
            iconOption.style.borderRadius = '8px';
            iconOption.style.textAlign = 'center';
            iconOption.style.transition = 'all 0.3s ease';
            
            const iconImg = document.createElement('img');
            iconImg.src = `TrainerIcons/${iconName}`;
            iconImg.alt = iconName;
            iconImg.style.width = '80px';
            iconImg.style.height = '80px';
            iconImg.style.objectFit = 'contain';
            
            // Add filename label
            const iconLabel = document.createElement('div');
            iconLabel.textContent = iconName.replace(/\.[^/.]+$/, "");
            iconLabel.style.fontSize = '12px';
            iconLabel.style.marginTop = '5px';
            iconLabel.style.color = '#666';
            
            iconOption.appendChild(iconImg);
            iconOption.appendChild(iconLabel);
            
            // Check if this is the current icon
            if (trainers[teamIndex].icon === iconName) {
                iconOption.style.borderColor = '#4a6fa5';
                iconOption.style.backgroundColor = '#f0f5ff';
            }
            
            // Add hover effect
            iconOption.addEventListener('mouseenter', () => {
                if (trainers[teamIndex].icon !== iconName) {
                    iconOption.style.borderColor = '#ccc';
                    iconOption.style.backgroundColor = '#f9f9f9';
                }
            });
            
            iconOption.addEventListener('mouseleave', () => {
                if (trainers[teamIndex].icon !== iconName) {
                    iconOption.style.borderColor = 'transparent';
                    iconOption.style.backgroundColor = 'transparent';
                }
            });
            
            // Add click handler
            iconOption.addEventListener('click', () => {
                // Update trainer icon
                trainers[teamIndex].icon = iconName;
                
                // Update UI
                const trainerIconElement = document.querySelector(`.team:nth-child(${teamIndex + 1}) .trainer-icon`);
                if (trainerIconElement) {
                    trainerIconElement.src = `TrainerIcons/${iconName}`;
                }
                
                // Close modal
                document.body.removeChild(modalOverlay);
            });
            
            iconGrid.appendChild(iconOption);
        });
        
        modalContent.appendChild(iconGrid);
    }
    
    // Close button
    const closeButton = document.createElement('button');
    closeButton.textContent = 'Schließen';
    closeButton.className = 'btn';
    closeButton.style.display = 'block';
    closeButton.style.margin = '0 auto';
    closeButton.addEventListener('click', () => {
        document.body.removeChild(modalOverlay);
    });
    
    modalContent.appendChild(closeButton);
    
    // Close modal when clicking overlay
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            document.body.removeChild(modalOverlay);
        }
    });
}

/**
 * Check if all teams are filled to capacity
 * @returns {boolean} - Whether all teams are filled
 */
export function areAllTeamsFilled() {
    const teamCount = validateTeamCount();
    const fightersPerTeam = validateFightersPerTeam();
    
    // Check if all teams have the required number of fighters
    for (let i = 0; i < teamCount; i++) {
        // Ensure team exists
        if (!teamAssignments[i]) {
            return false;
        }
        
        // Check if team has correct number of fighters
        if (teamAssignments[i].length !== fightersPerTeam) {
            return false;
        }
        
        // Check if all slots are filled
        for (let j = 0; j < fightersPerTeam; j++) {
            if (teamAssignments[i][j] === null) {
                return false;
            }
        }
    }
    
    // All teams are filled
    return true;
}

/**
 * Handle drag over
 * @param {DragEvent} e - The drag event
 */
export function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

/**
 * Handle drag enter
 * @param {DragEvent} e - The drag event
 */
export function handleDragEnter(e) {
    e.preventDefault();
    e.target.closest('.team-slot').classList.add('drag-over');
}

/**
 * Handle drag leave
 * @param {DragEvent} e - The drag event
 */
export function handleDragLeave(e) {
    e.target.closest('.team-slot').classList.remove('drag-over');
}

/**
 * Handle drop
 * @param {DragEvent} e - The drag event
 */
export function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation(); // Stop the event from bubbling up to the document
    
    // Remove the drag-over class
    const slot = e.target.closest('.team-slot');
    slot.classList.remove('drag-over');
    
    // Get the team and slot indices
    const teamIndex = parseInt(slot.dataset.team);
    const slotIndex = parseInt(slot.dataset.slot);
    
    // Mark this drop as handled to prevent document drop handler from processing it
    dropHandled = true;
}

/**
 * Handle document drag over
 * @param {DragEvent} e - The drag event
 */
export function handleDocumentDragOver(e) {
    // Only prevent default if we're dragging from a team slot
    if (e.dataTransfer && e.dataTransfer.types.includes('application/json')) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }
}

/**
 * Handle drop on document (outside team slots)
 * @param {DragEvent} e - The drag event
 */
export function handleDocumentDrop(e) {
    // Only process if we're dropping from a team slot and it wasn't already handled by a team slot
    if (e.dataTransfer && e.dataTransfer.types.includes('application/json') && !dropHandled) {
        e.preventDefault();
    }
    
    // Reset flags
    dropHandled = false;
}

/**
 * Reset the drop handled flag when starting a new drag
 */
export function resetDropHandledFlag() {
    dropHandled = false;
}

/**
 * Update the move selection UI for a Pokemon
 * @param {Array} character - The Pokemon character
 * @returns {Array} - Array of available moves for the UI
 */
function getAvailableMovesForUI(character) {
    if (!character || !character.availableMoves) {
        return [createVerzweiflerMove()]; // Return only Verzweifler if no moves available
    }
    
    // Get selected moves (non-null ones)
    const selectedMoves = (character.selectedMoves || [])
        .filter(move => move !== null);
    
    // Otherwise return only available moves (no Verzweifler)
    return character.availableMoves;
}

/**
 * Check if any moves are selected for a Pokemon
 * @param {Object} character - The Pokemon character
 * @returns {boolean} - Whether any moves are selected
 */
function hasSelectedMoves(character) {
    if (!character || !character.selectedMoves) {
        return false;
    }
    
    return character.selectedMoves.some(move => move !== null);
}

/**
 * Update a character's attacks based on selected moves
 * @param {Object} character - The character to update
 */
export function updateCharacterAttacks(character) {
    if (!character) return;
    
    // Create attacks array if it doesn't exist
    if (!character.attacks) {
        character.attacks = [];
    }
    
    // Reset attacks array with just the basic Verzweifler attack
    character.attacks = [{
        type: 'melee',
        weaponName: "Verzweifler",
        damage: 5,
        range: 1,
        category: 'physisch'
    }];
    
    // Add selected moves as attacks
    if (character.selectedMoves && Array.isArray(character.selectedMoves)) {
        character.selectedMoves.forEach(move => {
            if (!move) return; // Skip null moves
            
            // Add as an attack with required properties
            character.attacks.push({
                type: move.range > 1 ? 'ranged' : 'melee',
                weaponName: move.name,
                damage: typeof move.strength === 'number' ? move.strength : 1,
                range: move.range || 0,
                pp: move.pp || 0,
                currentPP: move.pp || 0, // Initialize with full PP
                moveType: move.type, // IMPORTANT: This needs to match the type name in effectivenessLookupTable
                moveTypeDe: move.typeDe,
                category: move.category || 'Physisch', // Include the German category
                accuracy: move.accuracy,
                cone: move.cone || undefined,
                buff: move.buff || undefined,
                buffedStats: move.buffedStats || undefined,
                notOffensive: move.notOffensive || undefined,
                strahl: move.strahl || undefined,
                reaction: move.reaction || undefined
            });
        });
    }
    
    // Update the character's max range
    let maxRange = 0;
    character.attacks.forEach(attack => {
        if (attack.range > maxRange) {
            maxRange = attack.range;
        }
    });
    character.range = maxRange;
}

/**
 * Create a Verzweifler move
 * @returns {Object} - The Verzweifler move
 */
function createVerzweiflerMove() {
    return {
        id: -9999,
        name: "Verzweifler",
        englishName: "Struggle",
        type: "normal",
        typeDe: "Normal",
        power: 50,
        strength: 5,
        range: 1,
        accuracy: 100,
        pp: 0,
        currentPP: 0,
        damageClass: 'physical',
        category: 'Physisch'
    };
}

/**
 * Apply type-based buffs to all Pokemon of a trainer's team
 * @param {number} teamIndex - Index of the team
 * @param {string} favoriteType - The favorite type to buff
 */
function applyTypeBuffsToTeam(teamIndex, favoriteType) {
    if (!favoriteType || !teamAssignments[teamIndex]) return;
    
    teamAssignments[teamIndex].forEach(pokemon => {
        if (!pokemon) return;
        
        // Check if Pokemon has the favorite type - Use pokemonTypes instead of types
        const hasType = pokemon.pokemonTypes && pokemon.pokemonTypes.some(type => 
            type.toLowerCase() === favoriteType.toLowerCase()
        );
        
        if (hasType) {
            applyTypeBuff(pokemon, teamIndex);
        }
    });
}

/**
 * Remove type-based buffs from all Pokemon of a trainer's team
 * @param {number} teamIndex - Index of the team
 * @param {string} favoriteType - The previous favorite type to remove buffs from
 */
function removeTypeBuffsFromTeam(teamIndex, favoriteType) {
    if (!favoriteType || !teamAssignments[teamIndex]) return;
    
    teamAssignments[teamIndex].forEach(pokemon => {
        if (!pokemon) return;
        
        // Check if Pokemon has the previous favorite type - Use pokemonTypes instead of types
        const hasType = pokemon.pokemonTypes && pokemon.pokemonTypes.some(type => 
            type.toLowerCase() === favoriteType.toLowerCase()
        );
        
        if (hasType) {
            removeTypeBuff(pokemon);
        }
    });
}

/**
 * Apply type buff to a Pokemon's stats (MODIFIED to support Arenaleiter)
 * @param {Object} pokemon - The Pokemon to buff
 * @param {number} teamIndex - Index of the team (needed to check trainer class)
 */
export function applyTypeBuff(pokemon, teamIndex) {
    if (!pokemon.combatStats) return;
    
    // Store original stats if not already stored
    if (!pokemon.originalStatsBeforeTypeBuff) {
        pokemon.originalStatsBeforeTypeBuff = {
            kp: pokemon.combatStats.kp,
            gena: pokemon.combatStats.gena,
            pa: pokemon.combatStats.pa
        };
        
        // Store original base stats if they exist
        if (pokemon.statsDetails && pokemon.statsDetails.statsGerman) {
            pokemon.originalBaseStatsBeforeTypeBuff = { ...pokemon.statsDetails.statsGerman };
        }
    }
    
    // Get buff multiplier based on trainer class
    const buffMultiplier = getTypeBuffMultiplier(teamIndex);
    
    // Apply buff to combat stats
    const originalKP = pokemon.originalStatsBeforeTypeBuff.kp;
    const buffedKP = Math.round(originalKP * buffMultiplier);
    pokemon.combatStats.kp = buffedKP;
    pokemon.maxKP = buffedKP;
    
    // If Pokemon still has current KP, scale it proportionally
    if (pokemon.currentKP > 0) {
        const hpRatio = pokemon.currentKP / pokemon.maxKP;
        pokemon.currentKP = Math.round(buffedKP * hpRatio);
    }
    
    // GENA and PA buffs
    pokemon.combatStats.gena = Math.round(pokemon.originalStatsBeforeTypeBuff.gena * buffMultiplier);
    pokemon.combatStats.pa = Math.round(pokemon.originalStatsBeforeTypeBuff.pa * buffMultiplier);
    
    // Buff base stats if they exist (INCLUDING KP!)
    if (pokemon.statsDetails && pokemon.statsDetails.statsGerman && pokemon.originalBaseStatsBeforeTypeBuff) {
        const stats = pokemon.statsDetails.statsGerman;
        const originalStats = pokemon.originalBaseStatsBeforeTypeBuff;
        
        // German stat names - now including KP
        if (originalStats['KP']) stats['KP'] = Math.round(originalStats['KP'] * buffMultiplier);
        if (originalStats['Angriff']) stats['Angriff'] = Math.round(originalStats['Angriff'] * buffMultiplier);
        if (originalStats['Verteidigung']) stats['Verteidigung'] = Math.round(originalStats['Verteidigung'] * buffMultiplier);
        if (originalStats['Spezial-Angriff']) stats['Spezial-Angriff'] = Math.round(originalStats['Spezial-Angriff'] * buffMultiplier);
        if (originalStats['Spezial-Verteidigung']) stats['Spezial-Verteidigung'] = Math.round(originalStats['Spezial-Verteidigung'] * buffMultiplier);
        if (originalStats['Initiative']) stats['Initiative'] = Math.round(originalStats['Initiative'] * buffMultiplier);
    }
    
    // Mark as type buffed and store the multiplier used
    pokemon.isTypeBuffed = true;
    pokemon.typeBuffMultiplier = buffMultiplier;
}

// Also update the removeTypeBuff function to restore KP:

/**
 * Remove type buff from a Pokemon's stats
 * @param {Object} pokemon - The Pokemon to remove buff from
 */
function removeTypeBuff(pokemon) {
    if (!pokemon.originalStatsBeforeTypeBuff || !pokemon.isTypeBuffed) return;
    
    // Restore combat stats
    const originalKP = pokemon.originalStatsBeforeTypeBuff.kp;
    
    // Calculate current HP ratio before restoring
    const hpRatio = pokemon.currentKP / pokemon.combatStats.kp;
    
    // Restore KP
    pokemon.combatStats.kp = originalKP;
    pokemon.maxKP = originalKP;
    pokemon.currentKP = Math.round(originalKP * hpRatio);
    
    // Restore GENA and PA
    pokemon.combatStats.gena = pokemon.originalStatsBeforeTypeBuff.gena;
    pokemon.combatStats.pa = pokemon.originalStatsBeforeTypeBuff.pa;
    
    // Restore base stats if they exist (INCLUDING KP!)
    if (pokemon.statsDetails && pokemon.statsDetails.statsGerman && pokemon.originalBaseStatsBeforeTypeBuff) {
        const stats = pokemon.statsDetails.statsGerman;
        const originalStats = pokemon.originalBaseStatsBeforeTypeBuff;
        
        // Restore German stat names - now including KP
        if (originalStats['KP']) stats['KP'] = originalStats['KP'];
        if (originalStats['Angriff']) stats['Angriff'] = originalStats['Angriff'];
        if (originalStats['Verteidigung']) stats['Verteidigung'] = originalStats['Verteidigung'];
        if (originalStats['Spezial-Angriff']) stats['Spezial-Angriff'] = originalStats['Spezial-Angriff'];
        if (originalStats['Spezial-Verteidigung']) stats['Spezial-Verteidigung'] = originalStats['Spezial-Verteidigung'];
        if (originalStats['Initiative']) stats['Initiative'] = originalStats['Initiative'];
    }
    
    // Clear buff markers
    pokemon.isTypeBuffed = false;
    delete pokemon.originalStatsBeforeTypeBuff;
    delete pokemon.originalBaseStatsBeforeTypeBuff;
}

/**
 * Handle favorite type change for a trainer
 * @param {number} teamIndex - Index of the team
 * @param {string} newFavoriteType - The new favorite type
 */
function handleFavoriteTypeChange(teamIndex, newFavoriteType) {
    const trainer = trainers[teamIndex];
    const oldFavoriteType = trainer.favoriteType;
    
    // Remove buffs from old type
    if (oldFavoriteType) {
        removeTypeBuffsFromTeam(teamIndex, oldFavoriteType);
    }
    
    // Update trainer's favorite type
    trainer.favoriteType = newFavoriteType;
    
    // Apply buffs to new type
    if (newFavoriteType) {
        applyTypeBuffsToTeam(teamIndex, newFavoriteType);
    }
    
    // Update team slots to reflect changes
    updateTeamSlots();
}

/**
 * Get the appropriate buff multiplier based on trainer class
 * @param {number} teamIndex - Index of the team
 * @returns {number} - Buff multiplier (1.1 for normal, 1.4 for arenaleiter)
 */
function getTypeBuffMultiplier(teamIndex) {
    const trainer = trainers[teamIndex];
    const isArenaleiter = trainer && trainer.class === 'arenaleiter';
    return isArenaleiter ? 1.4 : 1.1; // 40% vs 10%
}

/**
 * Handle trainer class change and recalculate buffs if needed
 * @param {number} teamIndex - Index of the team
 * @param {string} newClass - The new trainer class
 */
function handleTrainerClassChange(teamIndex, newClass) {
    const trainer = trainers[teamIndex];
    const oldClass = trainer.class;
    
    // Update trainer class
    trainer.class = newClass;
    
    // If favorite type is set, check if we need to recalculate buffs
    if (trainer.favoriteType) {
        // Check if buff strength changed (arenaleiter vs non-arenaleiter)
        const oldIsArenaleiter = oldClass === 'arenaleiter';
        const newIsArenaleiter = newClass === 'arenaleiter';
        
        if (oldIsArenaleiter !== newIsArenaleiter) {
            // Buff strength changed, need to recalculate all type-matching Pokemon
            console.log(`Trainer class changed from ${oldClass} to ${newClass}, recalculating type buffs`);
            removeTypeBuffsFromTeam(teamIndex, trainer.favoriteType);
            applyTypeBuffsToTeam(teamIndex, trainer.favoriteType);
            
            // Update the UI to reflect the stat changes
            updateTeamSlots();
        }
    }
}

function storeDropdownInstance(key, dropdown) {
    // Clean up old instance if exists
    if (dropdownInstances.has(key)) {
        dropdownInstances.get(key).destroy();
    }
    dropdownInstances.set(key, dropdown);
}

function cleanupAllDropdowns() {
    dropdownInstances.forEach(dropdown => dropdown.destroy());
    dropdownInstances.clear();
    
    // Also cleanup move dropdown instances
    cleanupAllMoveDropdownInstances();
}