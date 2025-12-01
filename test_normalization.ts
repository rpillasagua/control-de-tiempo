
import { getNormalizedDefectKey } from './lib/defect-normalization';

const testCases: { input: string; expected: string }[] = [
    { input: 'CABEZA_ROJA_FUERTE', expected: 'CABEZA_ROJA' },
    { input: 'HEPATOPANCREAS_REVENTADO', expected: 'HEPATO_REVENTADO' },
    { input: 'HEPATOPANCREAS_REGADO', expected: 'HEPATO_REGADO' },
    { input: 'MATERIAL_EXTRANO', expected: 'MATERIAL_EXTRAÑO' },
    { input: 'QUEBRADOS', expected: 'QUEBRADO' },
    { input: 'ROSADOS', expected: 'ROSADO' },
    { input: 'SEMI_ROSADO', expected: 'SEMIROSADO' },
    { input: 'HEMOLINFAS_LEVE', expected: 'HEMOLINFAS_LEVES' },
    { input: 'RESTO_DE_VENAS', expected: 'RESTOS_DE_VENAS' },
    { input: 'CABEZA_NARANJA', expected: 'CABEZA_NARANJA' }
];

console.log('--- Testing Defect Normalization ---');
let allPassed = true;

testCases.forEach(({ input, expected }) => {
    const actual = getNormalizedDefectKey(input);
    const passed = actual === expected;
    console.log(`[${passed ? 'PASS' : 'FAIL'}] ${input} -> ${actual} (Expected: ${expected})`);
    if (!passed) allPassed = false;
});

if (allPassed) {
    console.log('\nAll normalization tests passed!');
} else {
    console.log('\nSome tests failed.');
    process.exit(1);
}
