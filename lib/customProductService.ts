/**
 * Custom Product Specs Service
 * 
 * Manages custom product specifications in Firestore
 * for products not found in the static PRODUCT_DATA
 */

import { doc, setDoc, getDoc, getDocs, collection, Timestamp, query, orderBy, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import { ProductType, ProductInfo } from './types';

// Extended interface for stored product specs (includes PDF-extracted data)
export interface CustomProductSpec {
    code: string;
    client: string;
    brand: string;
    master: string;
    type: ProductType;
    unit: 'KG' | 'LB';

    // Extended data from PDF extraction
    description?: string;
    destination?: string;
    version?: number;
    freezingMethod?: string;
    certification?: string;
    color?: string;
    preservative?: string;
    overweightPct?: string;
    glazingRatio?: number;
    glazingUnit?: string;
    netWeight?: number;
    netWeightUnit?: string;
    grossWeight?: number;
    grossWeightUnit?: string;
    packing?: string;

    // Size specifications
    sizes?: Array<{
        sizeMp: string;
        countMp: string;
        sizeMarked: string;
        countFinal: string;
        uniformity?: number;
    }>;

    // Defect limits
    defects?: Array<{
        defect: string;
        limit: string | number;
    }>;

    // Metadata
    createdAt: string;
    createdBy?: string;
    updatedAt?: string;
    source: 'pdf' | 'manual';
}

const COLLECTION_NAME = 'custom_products';

/**
 * Save a custom product spec to Firestore
 */
export const saveCustomProductSpec = async (spec: CustomProductSpec): Promise<void> => {
    if (!db) throw new Error('Firestore no está configurado');

    const docRef = doc(db, COLLECTION_NAME, spec.code);

    await setDoc(docRef, {
        ...spec,
        createdAt: spec.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
    });

    console.log(`✅ Custom product saved: ${spec.code}`);
};

/**
 * Get a custom product spec by code
 */
export const getCustomProductSpec = async (code: string): Promise<CustomProductSpec | null> => {
    if (!db) throw new Error('Firestore no está configurado');

    const docRef = doc(db, COLLECTION_NAME, code);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        return docSnap.data() as CustomProductSpec;
    }

    return null;
};

/**
 * Get all custom product specs
 */
export const getAllCustomProductSpecs = async (): Promise<CustomProductSpec[]> => {
    if (!db) throw new Error('Firestore no está configurado');

    const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => doc.data() as CustomProductSpec);
};

/**
 * Delete a custom product spec
 */
export const deleteCustomProductSpec = async (code: string): Promise<void> => {
    if (!db) throw new Error('Firestore no está configurado');

    const docRef = doc(db, COLLECTION_NAME, code);
    await deleteDoc(docRef);

    console.log(`🗑️ Custom product deleted: ${code}`);
};

/**
 * Convert CustomProductSpec to ProductInfo for use in PRODUCT_DATA lookups
 */
export const toProductInfo = (spec: CustomProductSpec): ProductInfo => ({
    client: spec.client,
    brand: spec.brand,
    master: spec.master,
    type: spec.type,
    unit: spec.unit
});
