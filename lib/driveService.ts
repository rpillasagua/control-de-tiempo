/**
 * Google Drive Service — Bitácora Técnica
 * Sube fotos de evidencia a Google Drive del técnico.
 * Usa el access token OAuth obtenido al hacer login con Google.
 * Costo: GRATIS (15GB por cuenta Google)
 */

import { compressImage } from './imageCompression';
import { logger } from './logger';

const FOLDER_NAME = 'Bitácora Técnica';

// ──────────────────────────────────────────────
// Obtener o crear carpeta "Bitácora Técnica" en Drive
// ──────────────────────────────────────────────
async function getOrCreateFolder(accessToken: string): Promise<string> {
  // Buscar si ya existe
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=name='${FOLDER_NAME}'+and+mimeType='application/vnd.google-apps.folder'+and+trashed=false&fields=files(id,name)`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const searchData = await searchRes.json();

  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id;
  }

  // Crear la carpeta
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder'
    })
  });
  const folder = await createRes.json();
  logger.log(`✅ Carpeta Google Drive creada: ${FOLDER_NAME} (${folder.id})`);
  return folder.id;
}

// ──────────────────────────────────────────────
// Obtener o crear subcarpeta para una visita
// ──────────────────────────────────────────────
async function getOrCreateVisitFolder(
  accessToken: string,
  parentFolderId: string,
  visitId: string,
  clientName: string,
  dateStr: string
): Promise<string> {
  const folderName = `${dateStr} — ${clientName}`;

  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=name='${encodeURIComponent(folderName)}'+and+'${parentFolderId}'+in+parents+and+trashed=false&fields=files(id)`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const { files } = await searchRes.json();
  if (files && files.length > 0) return files[0].id;

  const res = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId]
    })
  });
  const folder = await res.json();
  void visitId;
  return folder.id;
}

// ──────────────────────────────────────────────
// Subir una foto a Google Drive
// Retorna la URL pública del archivo
// ──────────────────────────────────────────────
export async function uploadPhotoToDrive(
  accessToken: string,
  file: File,
  visitId: string,
  clientName: string,
  fileName?: string
): Promise<string> {
  try {
    // 1. Comprimir imagen antes de subir
    const compressed = await compressImage(file, {
      maxSizeMB: 0.8,
      maxWidthOrHeight: 1920
    });

    // 2. Obtener/crear carpetas
    const rootFolderId = await getOrCreateFolder(accessToken);
    const dateStr = new Date().toLocaleDateString('es-EC').replace(/\//g, '-');
    const visitFolderId = await getOrCreateVisitFolder(
      accessToken, rootFolderId, visitId, clientName, dateStr
    );

    // 3. Subir archivo con multipart upload
    const finalName = fileName ?? `foto_${Date.now()}.jpg`;
    const metadata = {
      name: finalName,
      parents: [visitFolderId]
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', compressed);

    const uploadRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink,webContentLink',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: form
      }
    );

    const uploadData = await uploadRes.json();
    if (!uploadData.id) throw new Error(`Drive upload failed: ${JSON.stringify(uploadData)}`);

    // 4. Hacer el archivo PÚBLICO (para que aparezca en el reporte)
    await fetch(`https://www.googleapis.com/drive/v3/files/${uploadData.id}/permissions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ role: 'reader', type: 'anyone' })
    });

    // 5. Retornar URL directa de la imagen
    const directUrl = `https://drive.google.com/uc?export=view&id=${uploadData.id}`;
    logger.log(`✅ Foto subida a Drive: ${finalName} → ${directUrl}`);
    return directUrl;

  } catch (error) {
    logger.error('❌ Error subiendo foto a Drive:', error);
    throw error;
  }
}

// ──────────────────────────────────────────────
// Convertir base64 (data URL) a File para poder subirlo
// ──────────────────────────────────────────────
export function dataUrlToFile(dataUrl: string, fileName: string): File {
  const [header, base64] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg';
  const binary = atob(base64);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
  return new File([array], fileName, { type: mime });
}
