const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'data', 'issues.json');

try {
    if (fs.existsSync(file)) {
        const raw = fs.readFileSync(file, 'utf8');
        console.log('Original Content:', raw);

        let data;
        try {
            data = JSON.parse(raw);
        } catch (e) {
            console.log('JSON Parse Failed, resetting to []');
            data = [];
        }

        if (!Array.isArray(data)) {
            console.log('Data is not an array, resetting to []');
            data = [];
        }

        // Fix IDs
        const fixedData = data.map(item => {
            return {
                ...item,
                id: String(item.id).trim() // Ensure string and no whitespace
            };
        });

        fs.writeFileSync(file, JSON.stringify(fixedData, null, 2));
        console.log('Fixed Data Written:', JSON.stringify(fixedData, null, 2));
    } else {
        console.log('File does not exist.');
    }
} catch (e) {
    console.error('Script Error:', e);
}
