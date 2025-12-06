const fs = require('fs');
const path = 'lib/technical-specs.ts';

try {
    let content = fs.readFileSync(path, 'utf8');
    console.log('Read file, size:', content.length);

    const replacements = [
        { code: '00261', newType: 'COLA' },
        { code: '00262', newType: 'VALOR_AGREGADO' },
        { code: '00264', newType: 'COLA' }
    ];

    let changed = false;

    replacements.forEach(rep => {
        // Search for: "00261": { ... "productType": "ENTERO"
        // Use non-greedy match for content between code and productType
        const regex = new RegExp(`("${rep.code}":\\s*\\{[\\s\\S]*?"productType":\\s*")ENTERO(")`);

        if (regex.test(content)) {
            content = content.replace(regex, `$1${rep.newType}$2`);
            console.log(`Updated ${rep.code} to ${rep.newType}`);
            changed = true;
        } else {
            console.log(`Could not find match for ${rep.code} (or already updated)`);
        }
    });

    if (changed) {
        fs.writeFileSync(path, content);
        console.log('Successfully wrote updates to file');
    } else {
        console.log('No changes needed');
    }

} catch (err) {
    console.error('Error:', err);
}
