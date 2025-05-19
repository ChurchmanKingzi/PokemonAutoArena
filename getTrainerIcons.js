const fs = require('fs');
const path = require('path');

function getTrainerIcons(req, res) {
    const iconsDir = path.join(__dirname, 'TrainerIcons');
    
    console.log('Looking for icons in:', iconsDir);
    
    try {
        // Check if directory exists
        if (!fs.existsSync(iconsDir)) {
            console.error('TrainerIcons directory does not exist:', iconsDir);
            res.status(404).json({ error: 'TrainerIcons directory not found' });
            return;
        }
        
        // Read directory contents
        const files = fs.readdirSync(iconsDir);
        console.log('Found files in directory:', files);
        
        // Filter for image files
        const imageExtensions = /\.(png|jpg|jpeg|gif|webp)$/i;
        const imageFiles = files.filter(file => imageExtensions.test(file));
        
        console.log('Filtered image files:', imageFiles);
        
        // Set headers
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        
        // Send response
        res.status(200).json(imageFiles);
        
    } catch (error) {
        console.error('Error reading TrainerIcons directory:', error);
        res.status(500).json({ 
            error: 'Could not read TrainerIcons directory', 
            details: error.message 
        });
    }
}

module.exports = { getTrainerIcons };