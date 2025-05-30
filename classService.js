/**
 * Trainer class service for managing trainer classes and their descriptions
 */

// Available trainer classes with their descriptions
const TRAINER_CLASSES = [
    {
        id: 'angler',
        name: 'Angler',
        description: 'Nach jeder Runde erscheint mit einer 10%-Chance ein zufälliges Wasser-Pokemon unter deiner Kontrolle in deinem Team-Bereich.'
    },
    {
        id: 'arenaleiter',
        name: 'Arenaleiter',
        description: 'Pokemon deines Lieblingstyps erhalten +40% auf ihre Statuswerte statt +10%.'
    },
    {
        id: 'ace-trainer',
        name: 'Ass-Trainer',
        description: 'Deine Pokemon fügen 2.5-fachen Schaden mit sehr effektiven Attacken zu.'
    },
    {
        id: 'clown',
        name: 'Clown',
        description: 'Alle gegnerischen Pokemon beginnen den Kampf verwirrt.'
    },
    {
        id: 'thief',
        name: 'Dieb',
        description: 'Immer, wenn eines deiner Pokemon ein gegnerisches besiegt: 50%-Chance, das Pokemon mit 10% seiner max KP unter deiner Kontrolle wiederzubeleben.'
    },
    {
        id: 'jongleur',
        name: 'Jongleur',
        description: 'Am Anfang der Runde jedes deiner Pokemon: Seine Position wird mit einem zufälligen deiner anderen Pokemon derselben Größe vertauscht.'
    },
    {
        id: 'ninja boy',
        name: 'Ninjajunge',
        description: 'Deine Pokemon lösen, wenn sie besiegt werden, die Attacke Explosion aus.'
    },
    {
        id: 'picknicker',
        name: 'Picknicker',
        description: 'Der Kampf beginnt mit 8 Runden Sonne. Überschreibt Pokemon-Fähigkeiten, die das Wetter ändern würden.'
    },
    {
        id: 'ruffian',
        name: 'Raufbold',
        description: 'Die ersten zwei Attacken, die deine Pokemon treffen, haben keine Wirkung auf sie.'
    },
    {
        id: 'ruinenmaniac',
        name: 'Ruinenmaniac',
        description: 'Der Kampf beginnt mit 8 Runden Sandsturm. Überschreibt Pokemon-Fähigkeiten, die das Wetter ändern würden.'
    },
    {
        id: 'schirmdame',
        name: 'Schirmdame',
        description: 'Der Kampf beginnt mit 8 Runden Regen. Überschreibt Pokemon-Fähigkeiten, die das Wetter ändern würden.'
    },
    {
        id: 'snowboarder',
        name: 'Snowboarder',
        description: 'Der Kampf beginnt mit 8 Runden Schnee. Überschreibt Pokemon-Fähigkeiten, die das Wetter ändern würden.'
    },
];

/**
 * Get all available trainer classes
 * @returns {Array} - Array of trainer class objects
 */
export function getTrainerClasses() {
    return [...TRAINER_CLASSES];
}

/**
 * Get a trainer class by ID
 * @param {string} classId - The ID of the trainer class
 * @returns {Object|null} - The trainer class object or null if not found
 */
export function getTrainerClassById(classId) {
    return TRAINER_CLASSES.find(trainerClass => trainerClass.id === classId) || null;
}

/**
 * Get trainer class description by ID
 * @param {string} classId - The ID of the trainer class
 * @returns {string} - The description of the trainer class
 */
export function getTrainerClassDescription(classId) {
    const trainerClass = getTrainerClassById(classId);
    return trainerClass ? trainerClass.description : '';
}

/**
 * Static version - Get available trainer icons without server
 * @returns {Array} - Array of trainer icon filenames
 */
export async function getAvailableTrainerIcons() {
    const existingIcons = [
        '001Ash.png',
        '002Rocko.png',
        '003Misty.png',
        '004Surge.png',
        '005Erika.png',
        '006Koga.png',
        '007Sabrina.png',
        '008Puppe.png',
        '009Pyro.png',
        '010Giovanni.png',
        '011James.png',
        '012Jessie.png',
        '013Mauzi.png',
        '014Max.png',
        '015Red.png',
        '016Blue.png',
        '017Green.png',
        '018Gold.png',
        '019Silver.png',
        '020Krys.png',
        '021Ruby.png',
        '022Sapphire.png',
        '023Diamond.png',
        '024Platinum.png',
    ];
    
    return existingIcons.sort();
}