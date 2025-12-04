const pdfLib = require('pdf-parse');
const fs = require('fs');

async function test() {
    try {
        const PDFParse = pdfLib.PDFParse;
        const dir = 'c:/Users/ROGER/Downloads/datos/datos';
        const files = fs.readdirSync(dir).filter(f => f.endsWith('.pdf'));
        const buffer = fs.readFileSync(dir + '/' + files[0]);

        console.log('Trying new PDFParse(buffer)...');
        try {
            const parser = new PDFParse(buffer);
            console.log('Instance created!');
            // Check if it has text
            if (parser.text) {
                console.log('Text found directly!');
            } else {
                console.log('No text property. Checking methods...');
                console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(parser)));
            }
        } catch (e) {
            console.log('Error new PDFParse(buffer):', e.message);
        }

    } catch (e) {
        console.log('Fatal Error:', e.message);
    }
}

test();
