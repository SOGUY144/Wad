const fs = require('fs');
const path = require('path');

const issuesPath = path.join(__dirname, 'data', 'issues.json');

try {
    if (!fs.existsSync(issuesPath)) {
        console.log('issues.json not found');
    } else {
        const data = fs.readFileSync(issuesPath, 'utf8');
        const issues = JSON.parse(data);
        console.log('--------------------------------------------------');
        console.log(`Total Issues: ${issues.length}`);
        console.log('--------------------------------------------------');
        issues.forEach((i, idx) => {
            console.log(`[${idx}] ID: "${i.id}" (Type: ${typeof i.id})`);
            console.log(`      Title: ${i.title}`);
        });
        console.log('--------------------------------------------------');
    }
} catch (err) {
    console.error('Error:', err);
}
