// Códigos que requieren Peso Congelado (estructura antigua - compatibilidad)
const CLIENTES_CON_PESO_CONGELADO: Record<string, string> = {
    '00012': 'AQUAGOLD S.A.',
    '00016': 'AQUAGOLD S.A.',
    '00017': 'AQUAGOLD S.A.',
    '00018': 'AQUAGOLD S.A.',
    '00035': 'CASMARK SEAFOODS LTD',
    '00037': 'SEAFOOD TRADING COMPANY SARL',
    '00048': 'SN TRADING',
    '00051': 'MAISON MER',
    '00074': 'Hengsheng Heyuan Economic and trade',
    '00077': 'AQUAGOLD S.A.',
    '00079': 'COCEDERO DE MARISCOS',
    '00080': 'FRESH&GOOD OÜ',
    '00081': 'AQUAGOLD S.A.',
    '00084': 'CRUSTA C S.A.S',
    '00085': 'SI2A',
    '00087': 'AQUAGOLD S.A.',
    '00099': 'EVERGLORY INT TRADING (SA) CC',
    '00103': 'PESCAFACIL S.L.',
    '00106': 'ATHANASIOS CHATZISOTIRIOU',
    '00112': 'GROENLANDA SERV SRL',
    '00119': 'XIANMEILAI FOOD CO., LTD.',
    '00123': 'MORGAN FOODS INC',
    '00131': 'AQUAGOLD S.A.',
    '00145': 'MARUHA NICHIRO CORPORATION',
    '00158': 'ZUGGS, LLC',
    '00164': 'VERTIGO SH.P.K',
    '00170': 'Norven-Scandinavia OÜ',
    '00171': 'MIANPA S.A.',
    '00172': 'COCEDERO DE MARISCOS',
    '00175': 'PESCANOVA HELLAS LTD',
    '00177': 'MIANPA S.A.',
    '00179': 'OVER SEAS CO',
    '00181': 'SEAFOOD CONNECTION',
    '00183': 'DISTRIBUIDORA CAMAVINGA SA DE CV',
    '00186': 'CASMARK SEAFOODS LTD',
    '00204': 'HEIPLOEG INTERNATIONAL B.V.',
    '00225': 'ICELAND SEAFOOD IBERICA',
    '00232': 'PESCANOVA HELLAS LTD',
    '00233': 'AL TAHALUF FOOD STUFF AND TRADING WLL',
    '00234': 'PESCANOVA HELLAS LTD',
    '00235': 'TIANJIN JINFULIN',
    '00237': 'AQUAGOLD S.A.',
    '00238': 'ICELAND SEAFOOD IBERICA',
    '00240': 'LABEYRIE FINE FOODS',
    '00244': 'CRUSTA C S.A.S',
    '00246': 'GRUPO PROFAND, S.L.U',
    '00255': 'SI2A',
    '00256': 'PESCAFACIL S.L.',
    '00263': 'SN TRADING',
    '00267': 'PESCANOVA ITALIA SRL',
    '00272': 'COCEDERO DE MARISCOS',
    '00273': 'AQUAGOLD S.A.',
    '00287': 'AQUAGOLD S.A.',
    '00288': 'AQUAGOLD S.A.',
    '00290': 'EVERGLORY INT TRADING (SA) CC',
    '00296': 'GOLDEN MAR SEAFOODS',
    '00298': 'GOLDEN MAR SEAFOODS',
    '00299': 'ICELAND SEAFOOD IBERICA',
    '00307': 'MAISON MER',
    '00308': 'PESCANOVA FRANCE',
    '00309': 'CAPITAINE HOUAT',
    '00310': 'BEST CHOICE TRADING CORP',
    '00311': 'BEST CHOICE TRADING CORP',
    '00321': 'CRUSTA C S.A.S',
    '00327': 'MARISCOS CASTELLAR S.L.',
    '00328': 'MARISCOS CASTELLAR S.L.',
    '00329': 'MARISCOS CASTELLAR S.L.',
    '00331': 'MARISCOS CASTELLAR S.L.',
    '00336': 'MARISCOS CASTELLAR S.L.',
    '00343': 'VELES FOODS',
    '00348': 'TIANJIN J-ONE SUPPLY CHAIN MANAGEMENT',
    '00349': 'GLOBAL GALAXY FOOD SDN BHD',
    '00366': 'GAMBASTAR, S.L.',
    '00367': 'JOUN FISHERY CO., LTD.',
    '00372': 'MARUHA NICHIRO CORPORATION',
    '00375': 'SEAFOOD TRADING COMPANY SARL',
    '00379': 'AQUAGOLD S.A.',
    '00380': 'AQUAGOLD S.A.',
};

// Códigos que requieren campos de Peso Glaseo y Peso sin Glaseo
const CLIENTES_CON_PESO_GLASEO: Record<string, string> = {
    '00050': 'SEAFOOD TRADING COMPANY SARL',
    '00065': 'Monarch Trading, LLC',
    '00147': 'AQUAGOLD S.A.',
    '00148': 'AQUAGOLD S.A.',
    '00149': 'AQUAGOLD S.A.',
    '00213': 'AQUAGOLD S.A.',
    '00214': 'AQUAGOLD S.A.',
    '00236': 'PESCANOVA INC',
    '00239': 'AQUAGOLD S.A.',
    '00249': 'CRUSTA C S.A.S',
    '00262': 'HEIPLOEG INTERNATIONAL B.V.',
    '00346': 'AQUAGOLD S.A.',
};

// Códigos que NUNCA muestran Peso Congelado
const CLIENTES_SIN_PESO_CONGELADO: Record<string, string> = {
    '00020': 'ZHEJIANG YIWU CHINA COMMODITY CITY IMPOR',
    '00021': 'ZHEJIANG YIWU CHINA COMMODITY CITY IMPOR',
    '00022': 'OPTIMIZE INTEGRATION GROUP INC.',
    '00024': 'TIANJIN YINGBIN SUPPLY CHAIN CO., LTD.',
    '00026': 'PESCANOVA INC',
    '00027': 'AQUAGOLD S.A.',
    '00028': 'AQUAGOLD S.A.',
    '00034': 'BLUE PACIFIC LLC',
    '00036': 'INTEROCEAN SEAFOOD TRADER INC',
    '00039': 'INTERATLANTIC FISH S.L.U.',
    '00041': 'BLUE PACIFIC LLC',
    '00042': 'INTEROCEAN SEAFOOD TRADER INC',
    '00043': 'IMAEX TRADING CO. INC.',
    '00044': 'PESCANOVA INC',
    '00045': 'AQUAGOLD S.A.',
    '00046': 'AZ GEMS INC.',
    '00047': 'FOOD MASTERS',
    '00049': 'SCARPA WORLDWIDE LIMITED',
    '00053': 'AZ GEMS INC.',
    '00054': 'OCEAN GARDEN',
    '00055': 'ACADIAN FISH CO',
    '00057': 'SI2A',
    '00058': 'SCARPA WORLDWIDE LIMITED',
    '00072': 'SOUTHWIND FOODS',
    '00073': 'GUANGDONG HONGBAO AQUATIC DEVELOPMENT',
    '00075': 'AQUAGOLD S.A.',
    '00076': 'AQUAGOLD S.A.',
    '00078': 'AQUAGOLD S.A.',
    '00082': 'NV HOTTLET FROZEN FOODS',
    '00083': 'H&N GROUP',
    '00088': 'METRO A.D. EXPORT-IMPORT SKOPJE',
    '00089': 'NAUTILUS SEAFOOD',
    '00092': 'MARUHA NICHIRO CORPORATION',
    '00095': 'NV HOTTLET FROZEN FOODS',
    '00096': 'AQUA SEAFOOD LIMITED',
    '00097': 'EVERGLORY INT TRADING (SA) CC',
    '00098': 'H&N GROUP',
    '00100': 'METRO A.D. EXPORT-IMPORT SKOPJE',
    '00102': 'GALAXY GLOBAL INTERNATIONAL LLC.',
    '00105': 'AQUAGOLD S.A.',
    '00108': 'FAISAL ABDULLA SEAFOOD PROCESSING',
    '00113': 'TAIKA SEAFOOD CORPORATION',
    '00116': 'AQUAGOLD S.A.',
    '00117': 'PRIMSTAR B.V',
    '00120': 'THALASSA SEAFOODS',
    '00121': 'THALASSA SEAFOODS',
    '00122': 'PRIMSTAR B.V',
    '00124': 'AXEL FOOD S.R.L',
    '00127': 'AXEL FOOD S.R.L',
    '00128': 'FOOD MASTERS',
    '00130': 'AQUAGOLD S.A.',
    '00133': 'AQUAGOLD S.A.',
    '00134': 'ACADIAN FISH CO',
    '00136': 'Monarch Trading, LLC',
    '00137': 'TAIKA SEAFOOD CORPORATION',
    '00140': 'DAYSEADAY FROZEN B.V.',
    '00146': 'ZUGGS, LLC',
    '00150': 'CENSEA',
    '00152': 'SEA WIN, INC.',
    '00153': 'EAST FISH PROCESSING',
    '00154': 'EAST FISH PROCESSING',
    '00155': 'INTEROCEAN SEAFOOD TRADER INC',
    '00157': 'FAISAL ABDULLA SEAFOOD PROCESSING',
    '00160': 'MABSOUT & IDRISS SAL',
    '00162': 'ICELAND SEAFOOD IBERICA',
    '00163': 'FOOD MASTERS',
    '00165': 'UNITED FORTUNE SEAFOOD CORPORATIO',
    '00166': 'COMAVICOLA',
    '00168': 'COMAVICOLA',
    '00169': 'HAN SEAFOOD, INC.',
    '00173': 'SEA WIN, INC.',
    '00174': 'NAUTILUS SEAFOOD',
    '00176': 'LAWRENCE WHOLESALE',
    '00178': 'INTEROCEAN SEAFOOD TRADER INC',
    '00187': 'SEAFOOD CONNECTION',
    '00194': 'HAI YANG SEAFOOD CO., LTD.',
    '00195': 'CASMARK SEAFOODS LTD',
    '00198': 'SAKKYS SEAFOOD TRADING',
    '00199': 'STAR FOOD PRODUCTS, INC.',
    '00203': 'CENSEA',
    '00205': 'HEIPLOEG INTERNATIONAL B.V.',
    '00209': 'CENSEA',
    '00210': 'CENSEA',
    '00220': 'SEAFOOD CONNECTION',
    '00222': 'ICELAND SEAFOOD IBERICA',
    '00228': 'ICELAND SEAFOOD IBERICA',
    '00242': 'BEIRAGEL',
    '00247': 'INTERNATIONAL SEAFOOD',
    '00250': 'LAWRENCE WHOLESALE',
    '00254': 'COMAVICOLA',
    '00257': 'SHAHJALAL FOODS UK LTD',
    '00258': 'SHAHJALAL FOODS UK LTD',
    '00259': 'PREMIUM FOODS',
    '00261': 'PREMIUM FOODS',
    '00264': 'VERTIGO SH.P.K',
    '00265': 'VERTIGO SH.P.K',
    '00266': 'LEQUALITY LIFE CO., LTD.',
    '00268': 'AQUAGOLD S.A.',
    '00269': 'AQUAGOLD S.A.',
    '00270': 'IMAEX TRADING CO. INC.',
    '00271': 'NV HOTTLET FROZEN FOODS',
    '00274': 'FAISAL ABDULLA SEAFOOD PROCESSING',
    '00275': 'MAR&MONTI SRL',
    '00277': 'BALLINODE SEAFOODS',
    '00278': 'BALLINODE SEAFOODS',
    '00280': 'COMPESCA S.A.',
    '00282': 'BALLINODE SEAFOODS',
    '00283': 'COMPESCA S.A.',
    '00292': 'TRUE SEA',
    '00293': 'TRUE SEA',
    '00294': 'Congelados Herbania S.A.',
    '00295': 'Congelados Herbania S.A.',
    '00297': 'GOLDEN MAR SEAFOODS',
    '00300': 'AQUAGOLD S.A.',
    '00301': 'The Deep Seafood Co LLC',
    '00305': 'LANGUS SEAFOOD',
    '00306': 'MENGFU S.H.L., S.L.',
    '00315': 'AQUAGOLD S.A.',
    '00319': 'AQUAMARINE SEAFOOD',
    '00324': 'QUANLIAN AQUATIC PRODUCTS COLLECTION',
    '00325': 'QUANLIAN AQUATIC PRODUCTS COLLECTION',
    '00337': 'MARISCOS CASTELLAR S.L.',
    '00338': 'SEAFOOD CONNECTION',
    '00344': 'Marr S.p.A.',
    '00350': 'ICELAND SEAFOOD IBERICA',
    '00352': 'ICELAND SEAFOOD IBERICA',
    '00358': 'ABAD SEAFOOD LLC.',
    '00359': 'COMAVICOLA',
    '00361': 'SEA WIN, INC.',
    '00373': 'COMPESCA S.A.',
};

/**
 * Obtained information about a cliente by código
 * @param codigo Código del cliente
 * @returns Información del cliente incluyendo si debe mostrar peso congelado y glaseo
 */
function getClientInfo(codigo: string): { nombre: string; mostrarPesoCongelado: boolean; requierePesoGlaseo: boolean } | null {
    // Verificar si el cliente está en la lista CON peso congelado
    if (CLIENTES_CON_PESO_CONGELADO[codigo]) {
        return {
            nombre: CLIENTES_CON_PESO_CONGELADO[codigo],
            mostrarPesoCongelado: true,
            requierePesoGlaseo: CLIENTES_CON_PESO_GLASEO[codigo] !== undefined
        };
    }

    // Verificar si el cliente está en la lista SIN peso congelado
    if (CLIENTES_SIN_PESO_CONGELADO[codigo]) {
        return {
            nombre: CLIENTES_SIN_PESO_CONGELADO[codigo],
            mostrarPesoCongelado: false,
            requierePesoGlaseo: CLIENTES_CON_PESO_GLASEO[codigo] !== undefined
        };
    }

    return null;
}

/**
 */
export function shouldShowPesoCongelado(codigo: string): boolean {
    const info = getClientInfo(codigo);
    return info?.mostrarPesoCongelado ?? true; // Por defecto muestra
}

/**
 * Obtiene el nombre del cliente por código
 * @param codigo Código del cliente
 * @returns Nombre del cliente o null si no se encuentra
 */
export function getClientName(codigo: string): string | null {
    const info = getClientInfo(codigo);
    return info?.nombre ?? null;
}

/**
 * Obtiene todos los códigos con sus nombres para autocomplete
 * @returns Array de {codigo, nombre} para usar en autocomplete
 */
export function getAllClients(): Array<{ codigo: string; nombre: string }> {
    const clientes: Array<{ codigo: string; nombre: string }> = [];

    // Agregar clientes CON peso congelado
    Object.entries(CLIENTES_CON_PESO_CONGELADO).forEach(([codigo, nombre]) => {
        clientes.push({ codigo, nombre });
    });

    // Agregar clientes SIN peso congelado
    Object.entries(CLIENTES_SIN_PESO_CONGELADO).forEach(([codigo, nombre]) => {
        // Evitar duplicados (algunos códigos pueden estar en ambas listas)
        if (!clientes.find(c => c.codigo === codigo)) {
            clientes.push({ codigo, nombre });
        }
    });

    return clientes.sort((a, b) => a.codigo.localeCompare(b.codigo));
}
