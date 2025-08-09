// Script to upload existing JSON collections to JSONBin.io
// This will create separate bins for each collection

const fs = require('fs');
const path = require('path');

// JSONBin.io configuration
const API_KEY = '$2a$10$wzF6kws8SW2RspDvF2bnU.Jc.OYA7ethP7uIv2noBS.fmoOmwHwmq';
const BASE_URL = 'https://api.jsonbin.io/v3';

// Collection definitions with icons and metadata
const collections = [
    {
        name: 'animals',
        file: 'animals.json',
        displayName: 'Animals',
        icon: 'wolf',
        description: 'Game animals with stats and drops'
    },
    {
        name: 'weapons', 
        file: 'weapons.json',
        displayName: 'Weapons',
        icon: 'sword',
        description: 'Weapon stats and abilities'
    },
    {
        name: 'armor',
        file: 'armor.json', 
        displayName: 'Armor',
        icon: 'shield',
        description: 'Armor pieces and defense stats'
    },
    {
        name: 'food',
        file: 'food.json',
        displayName: 'Food',
        icon: 'meat',
        description: 'Food items and nutritional values'
    },
    {
        name: 'mods',
        file: 'mods.json',
        displayName: 'Modifications',
        icon: 'wrench',
        description: 'Equipment modifications and upgrades'  
    },
    {
        name: 'seasonal_challenges',
        file: 'seasonal_challenges.json',
        displayName: 'Seasonal Challenges',
        icon: 'target',
        description: 'Time-limited challenges and rewards'
    }
];

async function uploadCollection(collection) {
    try {
        // Read the JSON file
        const filePath = path.join(__dirname, 'crud_data', collection.file);
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(fileContent);
        
        // Calculate file size
        const size = Buffer.byteLength(JSON.stringify(data), 'utf8');
        console.log(`📁 ${collection.displayName}: ${(size/1024).toFixed(2)} KB`);
        
        // Create bin on JSONBin.io
        const response = await fetch(`${BASE_URL}/b`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': API_KEY,
                'X-Bin-Name': `game_${collection.name}`
            },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log(`✅ ${collection.displayName} uploaded successfully`);
        console.log(`   Bin ID: ${result.metadata.id}`);
        console.log(`   URL: https://jsonbin.io/${result.metadata.id}`);
        
        return {
            name: collection.name,
            binId: result.metadata.id,
            displayName: collection.displayName,
            icon: collection.icon,
            description: collection.description,
            size: size
        };
        
    } catch (error) {
        console.error(`❌ Failed to upload ${collection.displayName}:`, error.message);
        return null;
    }
}

async function uploadAllCollections() {
    console.log('🚀 Starting collection upload to JSONBin.io...\n');
    
    const results = [];
    
    for (const collection of collections) {
        const result = await uploadCollection(collection);
        if (result) {
            results.push(result);
        }
        
        // Add delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Generate configuration file
    const config = {
        collections: results,
        metadata: {
            totalCollections: results.length,
            totalSize: results.reduce((sum, r) => sum + r.size, 0),
            created: new Date().toISOString()
        }
    };
    
    // Save configuration to file
    fs.writeFileSync(
        path.join(__dirname, 'collections-config.json'),
        JSON.stringify(config, null, 2)
    );
    
    console.log('\n📋 Upload Summary:');
    console.log(`   Total Collections: ${results.length}`);
    console.log(`   Total Size: ${(config.metadata.totalSize/1024).toFixed(2)} KB`);
    console.log(`   Config saved to: collections-config.json`);
    
    console.log('\n🔧 Next Steps:');
    console.log('1. Update bin IDs in collection-manager.js');
    console.log('2. Test the multi-collection interface');
    console.log('3. Deploy to GitHub Pages');
}

// Run the upload process
if (require.main === module) {
    uploadAllCollections().catch(console.error);
}

module.exports = { uploadAllCollections, collections };