/**
 * UI for battlefield configuration
 */

import { 
    BATTLEFIELD_SIZES, 
    setBattlefieldSize,
    setBattlefieldScenario
} from './battlefieldConfig.js';

/**
 * Initialize the battlefield configuration UI
 */
export function initializeBattlefieldConfigUI() {
    // Create container for battlefield configuration
    const container = document.createElement('div');
    container.className = 'battlefield-config';
    container.innerHTML = `
        <h3>Kampffeld-Einstellungen</h3>
        <div class="battlefield-config-controls">
            <div class="control-group">
                <label for="battlefield-size">Arena-Größe:</label>
                <input type="range" id="battlefield-size" min="0" max="4" value="2" step="1" class="battlefield-size-slider">
                <span id="battlefield-size-label">Mittel (40x40)</span>
            </div>
            <div class="control-group">
                <label for="battlefield-scenario">Gelände:</label>
                <select id="battlefield-scenario" class="battlefield-scenario-select">
                    <option value="ebene">Ebene</option>
                    <option value="see">See</option>
                    <option value="gebirge">Gebirge</option>
                    <option value="wueste">Wüste</option>
                    <option value="meer">Meer</option>
                    <option value="vulkan">Vulkan</option>
                    <option value="sumpf">Sumpf</option>
                    <option value="eiswueste">Eiswüste</option>
                    <option value="zufallsmix">Zufallsmix</option>
                </select>
            </div>
        </div>
    `;
    
    // Find the simulator controls section and add the battlefield config
    const simulatorControls = document.querySelector('.simulator-controls');
    if (simulatorControls) {
        simulatorControls.appendChild(container);
        
        // Set up the event listeners
        setupEventListeners();
        
        // Initialize the size (make sure defaults are applied)
        setBattlefieldSize("MITTEL");
    }
}

/**
 * Set up event listeners for battlefield configuration controls
 */
function setupEventListeners() {
    // Size slider
    const sizeSlider = document.getElementById('battlefield-size');
    const sizeLabel = document.getElementById('battlefield-size-label');
    
    if (sizeSlider && sizeLabel) {
        sizeSlider.addEventListener('input', () => {
            const value = parseInt(sizeSlider.value);
            let sizeName, sizeValue;
            
            switch (value) {
                case 0:
                    sizeName = "WINZIG";
                    sizeValue = BATTLEFIELD_SIZES.WINZIG.size;
                    break;
                case 1:
                    sizeName = "KLEIN";
                    sizeValue = BATTLEFIELD_SIZES.KLEIN.size;
                    break;
                case 2:
                    sizeName = "MITTEL";
                    sizeValue = BATTLEFIELD_SIZES.MITTEL.size;
                    break;
                case 3:
                    sizeName = "GROSS";
                    sizeValue = BATTLEFIELD_SIZES.GROSS.size;
                    break;
                case 4:
                    sizeName = "RIESIG";
                    sizeValue = BATTLEFIELD_SIZES.RIESIG.size;
                    break;
                default:
                    sizeName = "MITTEL";
                    sizeValue = BATTLEFIELD_SIZES.MITTEL.size;
            }
            
            // Update the label
            sizeLabel.textContent = `${BATTLEFIELD_SIZES[sizeName].name} (${sizeValue}x${sizeValue})`;
            
            // Set the battlefield size
            setBattlefieldSize(sizeName);
        });
    }
    
    // Scenario dropdown
    const scenarioSelect = document.getElementById('battlefield-scenario');
    
    if (scenarioSelect) {
        scenarioSelect.addEventListener('change', () => {
            const scenarioId = scenarioSelect.value;
            setBattlefieldScenario(scenarioId);
        });
    }
}