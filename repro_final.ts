
// Mocking the WEIGHT-BASED heuristic logic

function calculateDefects(
    productCode: string,
    productType: string,
    netWeight: number,
    count: number,
    defects: Record<string, number>,
    mockSpecs: any
) {
    const specs = mockSpecs;

    // 1. Check Applicability
    if (!specs || (specs.freezingMethod !== 'BLOCK FROZEN' && specs.freezingMethod !== 'BRINE') || !netWeight || !count || !productType) {
        return { isApplicable: false, reason: 'Not applicable' };
    }

    // 2. Unit Conversion
    let convertedWeight = netWeight;
    if (convertedWeight > 50) convertedWeight = convertedWeight / 1000;

    if (productType === 'COLA' && specs.netWeightUnit === 'KG') {
        convertedWeight = convertedWeight * 2.20462;
    } else if (productType === 'ENTERO' && specs.netWeightUnit === 'LB') {
        convertedWeight = convertedWeight / 2.20462;
    }

    // BRINE LOGIC
    const packing = specs.packing || '';
    const isOneTwoOrThreeUnits = /^(1|2|3)\s*Und/i.test(packing);

    // HEURISTIC:
    // 1. KG: Always apply (Covers "1 Und * 12 Kg").
    // 2. LB: Apply if < 15 LB (Covers "1 Und * 6.6 Lb", Excludes "40 Lb").
    const isKg = specs.netWeightUnit === 'KG';
    const isSmallLb = specs.netWeightUnit === 'LB' && (netWeight || 0) < 15;
    const isValidBrineCandidate = isKg || isSmallLb;

    if (specs.freezingMethod === 'BRINE' || (isOneTwoOrThreeUnits && isValidBrineCandidate)) {
        if (isOneTwoOrThreeUnits) {
            let baseWeightKg = 3;
            if (productType === 'COLA') {
                convertedWeight = baseWeightKg * 2.20462;
            } else {
                convertedWeight = baseWeightKg;
            }
        }
    }

    const totalPieces = Math.round(count * convertedWeight);
    return { totalPieces, convertedWeight };
}

// Test Cases

// 1. True Brine KG ("1 Und * 12 Kg") -> Force 3kg
const case1 = {
    specs: { freezingMethod: 'BLOCK FROZEN', packing: '1 Und * 12kg', netWeightUnit: 'KG', defects: [] },
    weight: 12, count: 53, expected: 159
};

// 2. Standard Block Frozen LB ("10 Und * 3.64 Lb") -> Full Weight
const case2 = {
    specs: { freezingMethod: 'BLOCK FROZEN', packing: '10 Und * 3.64 Lb', netWeightUnit: 'LB', defects: [] },
    weight: 3.64, count: 18, expected: 66
};

// 3. Large Block Frozen LB ("2 Und * 20 Lb") -> Full Weight (Excluded by <15 rule)
const case3 = {
    specs: { freezingMethod: 'IQF', packing: '2 Und * 20 Lb', netWeightUnit: 'LB', defects: [] },
    weight: 20, count: 20, expected: 400
};

// 4. Small Brine LB ("1 Und * 6.6 Lb") -> Force 3kg (Included by <15 rule)
// 3kg = 6.61lb. If we force 3kg, converted weight is 3kg (since Entero/LB -> converted to KG for calc? No wait).
// Logic: if Entero/LB -> convertedWeight = netWeight / 2.20462 (KG).
// If Brine -> convertedWeight = 3 (KG).
// So total pieces = count * 3.
// If input is 6.6lb (~3kg). Count is per KG? usually count is per LB for LB products?
// Let's assume count 53 (per kg).
// 53 * 3 = 159.
const case4 = {
    specs: { freezingMethod: 'BLOCK FROZEN', packing: '1 Und * 6.6 Lb', netWeightUnit: 'LB', defects: [] },
    weight: 6.6, count: 53, expected: 159
};

console.log('--- Running Heuristic Verification ---');

function runTest(name: string, c: any) {
    const res = calculateDefects('TEST', 'ENTERO', c.weight, c.count, {}, c.specs);
    const passed = res.totalPieces === c.expected;
    console.log(`[${passed ? 'PASS' : 'FAIL'}] ${name}: Expected ${c.expected}, Got ${res.totalPieces}`);
}

runTest('True Brine KG (12kg)', case1);
runTest('Standard Block Frozen', case2);
runTest('Large Block Frozen LB (20lb)', case3);
runTest('Small Brine LB (6.6lb)', case4);
