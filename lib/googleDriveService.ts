/**
 * Google Drive Service
 * Maneja el almacenamiento de fotos en Google Drive
 */

import { logger } from './logger';

interface GoogleDriveConfig {
  apiKey: string;
  clientId: string;
  rootFolderId: string;
}

interface GoogleDriveFile {
  id: string;
  name: string;
  thumbnailLink?: string;
  webViewLink?: string;
  webContentLink?: string;
}

interface GoogleDrivePermission {
  id: string;
  type: string;
  role: string;
  emailAddress?: string;
}

interface GoogleDriveListResponse {
  files: GoogleDriveFile[];
}

class GoogleDriveService {
  private config: GoogleDriveConfig;
  private accessToken: string | null = null;
  private rootFolderId: string | null = null;
  private readonly ROOT_FOLDER_NAME = 'descongelado';

  constructor() {
    this.config = {
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY || '',
      clientId: process.env.NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID || '',
      rootFolderId: process.env.NEXT_PUBLIC_GOOGLE_DRIVE_ROOT_FOLDER_ID || ''
    };
  }

  /**
   * Asegura que tenemos un token válido
   */
  private async ensureToken() {
    const { googleAuthService } = await import('./googleAuthService');
    this.accessToken = await googleAuthService.ensureValidToken();
  }

  /**
   * Inicializa Google Drive API y crea carpeta raíz si no existe
   */
  async initialize() {
    try {
      // Importar el servicio de autenticación
      const { googleAuthService } = await import('./googleAuthService');

      // Inicializar el servicio de autenticación si no está inicializado
      if (typeof window !== 'undefined') {
        await googleAuthService.initialize();
      }

      // Obtener y configurar el token de acceso
      await this.ensureToken();

      // Si ya tenemos un rootFolderId configurado, validar que existe antes de usarlo
      if (this.config.rootFolderId) {
        logger.log('🔍 Validando carpeta raíz configurada:', this.config.rootFolderId);
        try {
          // Intentar obtener metadata de la carpeta para verificar que existe
          const verifyResponse = await fetch(
            `https://www.googleapis.com/drive/v3/files/${this.config.rootFolderId}?fields=id,name,trashed`,
            { headers: { 'Authorization': `Bearer ${this.accessToken}` } }
          );

          if (verifyResponse.ok) {
            const fileData = await verifyResponse.json();
            // Verificar que no esté en la papelera
            if (fileData.trashed) {
              logger.warn('⚠️ La carpeta raíz configurada está en la papelera. Buscando/creando una nueva...');
              // Limpiar caché inválido
              if (typeof window !== 'undefined') {
                localStorage.removeItem('google_drive_root_folder_id');
              }
            } else {
              this.rootFolderId = this.config.rootFolderId;
              logger.log('✅ Carpeta raíz validada:', this.rootFolderId);
              return;
            }
          } else {
            logger.warn('⚠️ La carpeta raíz configurada no existe o no es accesible. Buscando/creando una nueva...');
            // Limpiar caché inválido
            if (typeof window !== 'undefined') {
              localStorage.removeItem('google_drive_root_folder_id');
            }
          }
        } catch (error) {
          logger.warn('⚠️ Error validando carpeta raíz:', error);
          // Continuar con el flujo normal de búsqueda/creación
        }
      }

      // Si ya tenemos la carpeta raíz en memoria, no buscarla de nuevo
      if (this.rootFolderId) {
        return;
      }

      // OPTIMIZACIÓN: Intentar cargar desde localStorage (con validación)
      const CACHE_KEY = 'google_drive_root_folder_id';
      if (typeof window !== 'undefined') {
        const cachedId = localStorage.getItem(CACHE_KEY);
        if (cachedId) {
          logger.log('🔍 Validando carpeta raíz desde caché:', cachedId);
          try {
            // Validar que la carpeta en caché todavía existe
            const verifyResponse = await fetch(
              `https://www.googleapis.com/drive/v3/files/${cachedId}?fields=id,name,trashed`,
              { headers: { 'Authorization': `Bearer ${this.accessToken}` } }
            );

            if (verifyResponse.ok) {
              const fileData = await verifyResponse.json();
              if (!fileData.trashed) {
                this.rootFolderId = cachedId;
                logger.log('✅ Carpeta raíz validada desde caché:', this.rootFolderId);
                return;
              } else {
                logger.warn('⚠️ Carpeta en caché está en la papelera');
                localStorage.removeItem(CACHE_KEY);
              }
            } else {
              logger.warn('⚠️ Carpeta en caché no existe o no es accesible');
              localStorage.removeItem(CACHE_KEY);
            }
          } catch (error) {
            logger.warn('⚠️ Error validando caché:', error);
            localStorage.removeItem(CACHE_KEY);
          }
        }
      }

      // Si no, buscar o crear la carpeta "descongelado" en el drive
      logger.log('🔍 Buscando carpeta "descongelado"...');

      // Buscar TODAS las carpetas que coincidan
      const query = `name='${this.ROOT_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`,
        { headers: { 'Authorization': `Bearer ${this.accessToken}` } }
      );
      const data: GoogleDriveListResponse = await response.json();
      const folders = data.files || [];

      if (folders.length > 0) {
        // Usar la primera encontrada como principal
        this.rootFolderId = folders[0].id;
        logger.log('✅ Carpeta "descongelado" encontrada:', this.rootFolderId);

        // Guardar en caché
        if (typeof window !== 'undefined') {
          localStorage.setItem(CACHE_KEY, this.rootFolderId);
        }

        // Si hay duplicados, intentar limpiar los vacíos
        if (folders.length > 1) {
          logger.warn(`⚠️ Se encontraron ${folders.length} carpetas "descongelado". Intentando limpiar duplicados vacíos...`);

          for (let i = 1; i < folders.length; i++) {
            const duplicateId = folders[i].id;
            try {
              // Verificar si está vacía
              const checkQuery = `'${duplicateId}' in parents and trashed=false`;
              const checkRes = await fetch(
                `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(checkQuery)}&pageSize=1`,
                { headers: { 'Authorization': `Bearer ${this.accessToken}` } }
              );
              const checkData = await checkRes.json();

              if (!checkData.files || checkData.files.length === 0) {
                // Está vacía, eliminarla
                logger.log(`🗑️ Eliminando carpeta duplicada vacía: ${duplicateId}`);
                await this.deleteFile(duplicateId);
              } else {
                logger.warn(`⚠️ La carpeta duplicada ${duplicateId} NO está vacía. No se eliminará automáticamente.`);
              }
            } catch (e) {
              logger.error(`Error verificando/eliminando duplicado ${duplicateId}:`, e);
            }
          }
        }
      } else {
        logger.log('📁 Creando carpeta "descongelado"...');
        this.rootFolderId = await this.createRootFolder();
        logger.log('✅ Carpeta "descongelado" creada:', this.rootFolderId);

        // Guardar en caché
        if (typeof window !== 'undefined') {
          localStorage.setItem(CACHE_KEY, this.rootFolderId);
        }
      }
    } catch (error) {
      logger.error('❌ Error inicializando Google Drive:', error);
      throw error;
    }
  }

  /**
   * Busca una carpeta en la raíz del Drive
   */
  private async findFolderInRoot(folderName: string): Promise<string | null> {
    try {
      // Buscamos la carpeta por nombre y que no esté en la papelera.
      // Eliminamos 'root' in parents para ser más flexibles y encontrarla si ya existe.
      const query = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;

      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      const data: GoogleDriveListResponse = await response.json();

      if (data.files && data.files.length > 0) {
        if (data.files.length > 1) {
          logger.warn(`⚠️ Se encontraron ${data.files.length} carpetas raíz "descongelado". Usando la primera.`);
        }
        return data.files[0].id;
      }

      return null;
    } catch (error) {
      logger.error('Error buscando carpeta en raíz:', error);
      return null;
    }
  }

  /**
   * Crea la carpeta raíz "descongelado" en el Drive
   */
  private async createRootFolder(): Promise<string> {
    try {
      const metadata = {
        name: this.ROOT_FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder'
      };

      const response = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(metadata)
      });

      const data: GoogleDriveFile = await response.json();
      return data.id;
    } catch (error) {
      logger.error('Error creando carpeta raíz:', error);
      throw error;
    }
  }

  /**
   * Crea una carpeta en Google Drive
   * @param folderName Nombre de la carpeta
   * @param parentFolderId ID de la carpeta padre (opcional)
   */
  async createFolder(folderName: string, parentFolderId?: string): Promise<string> {
    try {
      const effectiveParentId = parentFolderId || this.config.rootFolderId;
      if (!effectiveParentId) {
        throw new Error(`Cannot create folder "${folderName}": No parent folder ID provided and no root folder ID configured`);
      }

      logger.log(`📁 Intentando crear carpeta: "${folderName}" en parent: ${effectiveParentId}`);

      const metadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [effectiveParentId]
      };

      const response = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(metadata)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        logger.error('❌ Error HTTP al crear carpeta:', response.status, errorData);
        throw new Error(`Error creating folder "${folderName}": ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
      }

      const data: GoogleDriveFile = await response.json();

      if (!data.id) {
        throw new Error(`No se recibió ID de carpeta para "${folderName}"`);
      }

      logger.log(`✅ Carpeta creada exitosamente: "${folderName}" (ID: ${data.id})`);
      return data.id;
    } catch (error) {
      logger.error(`❌ Error creando carpeta "${folderName}":`, error);
      throw error;
    }
  }

  /**
   * Busca una carpeta por nombre
   * @param folderName Nombre de la carpeta
   * @param parentFolderId ID de la carpeta padre
   */
  async findFolder(folderName: string, parentFolderId?: string): Promise<string | null> {
    try {
      const effectiveParentId = parentFolderId || this.config.rootFolderId;
      if (!effectiveParentId) {
        logger.warn(`Cannot find folder "${folderName}": No parent folder ID provided`);
        return null;
      }

      const query = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and '${effectiveParentId}' in parents and trashed=false`;

      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      const data: GoogleDriveListResponse = await response.json();

      if (data.files && data.files.length > 0) {
        if (data.files.length > 1) {
          logger.warn(`⚠️ Se encontraron ${data.files.length} carpetas con el nombre "${folderName}". Usando la primera.`);
        }
        return data.files[0].id;
      }

      return null;
    } catch (error) {
      logger.error('Error finding folder:', error);
      return null;
    }
  }

  /**
   * Obtiene o crea una carpeta
   * @param folderName Nombre de la carpeta
   * @param parentFolderId ID de la carpeta padre
   */
  async getOrCreateFolder(folderName: string, parentFolderId?: string): Promise<string> {
    // Asegurar que la carpeta raíz existe
    if (!this.rootFolderId) {
      await this.initialize();
    }

    let folderId = await this.findFolder(folderName, parentFolderId);

    if (!folderId) {
      folderId = await this.createFolder(folderName, parentFolderId);
    }

    return folderId;
  }

  /**
   * Comparte un archivo con un usuario específico
   */
  async shareWithUser(fileId: string, email: string): Promise<void> {
    logger.log(`👤 Compartiendo archivo ${fileId} con ${email}`);
    try {
      await this.addPermission(fileId, 'user', 'reader', email);
      logger.log(`✅ Archivo compartido exitosamente con ${email}`);
    } catch (error) {
      logger.warn(`⚠️ No se pudo compartir con ${email}:`, error instanceof Error ? error.message : String(error));
      // No lanzamos error para no interrumpir el flujo principal
    }
  }

  /**
   * Hace un archivo público para que pueda ser visualizado
   */
  async makeFilePublic(fileId: string): Promise<void> {
    logger.log(`🔓 Configurando permisos para archivo: ${fileId}`);

    try {
      // Asegurar token válido antes de cualquier operación
      await this.ensureToken();

      // Primero verificar si ya tiene permisos públicos o de dominio
      const existingPermissions = await this.getFilePermissions(fileId);
      const hasAccess = existingPermissions.some(p =>
        (p.type === 'anyone' || p.type === 'domain') && p.role === 'reader'
      );

      if (hasAccess) {
        logger.log(`✅ Archivo ${fileId} ya tiene permisos de acceso`);
        return;
      }

      // Intentar primero permiso público (anyone)
      try {
        await this.addPermission(fileId, 'anyone', 'reader');
        logger.log(`✅ Permisos PÚBLICOS configurados para archivo ${fileId}`);
        return;
      } catch (publicError) {
        logger.warn('⚠️ No se pudo configurar permiso público ("anyone").', publicError instanceof Error ? publicError.message : String(publicError));
        logger.info('ℹ️ El archivo se subió pero puede requerir permisos manuales si la organización es estricta.');
      }
    } catch (error) {
      logger.error('❌ Error en makeFilePublic:', error);
      throw error;
    }
  }

  /**
   * Helper para agregar un permiso específico
   */
  private async addPermission(fileId: string, type: string, role: string, emailAddress?: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: any = {
      role: role,
      type: type
    };

    if (emailAddress) {
      body.emailAddress = emailAddress;
    }

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      }
    );

    if (!response.ok) {
      // Si es error de auth (401), intentar una vez más refrescando token explícitamente
      if (response.status === 401) {
        logger.log('🔄 Error 401 en permisos. Reintentando con token fresco...');
        await this.ensureToken();

        const retryResponse = await fetch(
          `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              role: role,
              type: type
            })
          }
        );

        if (retryResponse.ok) return;

        const retryData = await retryResponse.json();
        throw new Error(retryData?.error?.message || `HTTP ${retryResponse.status}`);
      }

      const errorData = await response.json();
      throw new Error(errorData?.error?.message || `HTTP ${response.status}`);
    }
  }

  /**
   * Obtiene los permisos de un archivo
   */
  async getFilePermissions(fileId: string): Promise<GoogleDrivePermission[]> {
    try {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      if (!response.ok) {
        logger.warn(`No se pudieron obtener permisos para ${fileId}:`, response.status);
        return [];
      }

      const data = await response.json();
      return data.permissions || [];
    } catch (error) {
      logger.error('Error obteniendo permisos:', error);
      return [];
    }
  }  /**
   * Sube un archivo a Google Drive
   * @param file Archivo a subir
   * @param fileName Nombre del archivo
   * @param folderId ID de la carpeta destino
   */
  async uploadFile(file: File, fileName: string, folderId: string): Promise<string> {
    try {
      logger.log(`⬆️ Subiendo archivo: ${fileName} (${file.size} bytes)`);

      // Crear metadata
      const metadata = {
        name: fileName,
        parents: [folderId]
      };

      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', file);

      const response = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink,webContentLink,thumbnailLink',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          },
          body: form
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        logger.error('❌ Error en respuesta de subida:', errorData);
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }

      const data: GoogleDriveFile = await response.json();
      logger.log(`✅ Archivo subido exitosamente. ID: ${data.id}`);

      // Verificar que tenemos el ID del archivo
      if (!data.id) {
        throw new Error('No file ID returned from upload');
      }

      // Intentar hacer el archivo público para que se pueda visualizar
      try {
        await this.makeFilePublic(data.id);
        logger.log('✅ Permisos públicos configurados');
      } catch (error) {
        logger.warn('⚠️ No se pudieron configurar permisos públicos:', error instanceof Error ? error.message : String(error));
        // Continuar de todos modos - la URL googleusercontent.com debería funcionar
      }


      // ESTRATEGIA DE URLs:
      // 1. thumbnailLink: Es la más confiable para <img> tags (googleusercontent.com), evitamos 403s.
      //    Viene pequeña (s220), así que la agrandamos a s2000.
      // 2. uc?export=view: Fallback si no hay thumbnail.

      let publicUrl: string = '';
      let thumbnailLink = data.thumbnailLink;

      // SMART POLLING: Intentar obtener el thumbnailLink si no viene inmediatamente
      // Esto soluciona el problema de propagación: esperamos activamente hasta que esté listo
      if (!thumbnailLink) {
        logger.log('⏳ Iniciando smart polling para thumbnail...');
        const pollingStart = Date.now();
        const MAX_POLLING_TIME = 10000; // 10 segundos máximo
        const POLLING_INTERVAL = 500; // Revisar cada 500ms

        while (Date.now() - pollingStart < MAX_POLLING_TIME) {
          try {
            const fileMetadata = await this.getFile(data.id);
            if (fileMetadata && fileMetadata.thumbnailLink) {
              thumbnailLink = fileMetadata.thumbnailLink;
              logger.log(`✅ thumbnailLink recuperado en ${(Date.now() - pollingStart)}ms`);
              break;
            }
          } catch (e) {
            // Ignorar errores transitorios durante el polling
          }
          await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL));
        }

        if (!thumbnailLink) {
          logger.warn('⚠️ No se pudo obtener thumbnailLink después del polling. Usando fallback.');
        }
      }

      if (thumbnailLink) {
        // SOLUCIÓN RÁPIDA: Usar formato googleusercontent.com más estable
        // Este formato es más permanente que thumbnailLink dinámico
        publicUrl = `https://lh3.googleusercontent.com/d/${data.id}=s2000`;

        logger.log(`🔗 Usando URL estable googleusercontent: ${publicUrl}`);
      } else {
        // Fallback a la URL directa
        publicUrl = `https://drive.google.com/uc?export=view&id=${data.id}`;
        logger.log(`🔗 Usando URL directa (fallback): ${publicUrl}`);
      }

      return publicUrl;
    } catch (error) {
      logger.error('❌ Error uploading file:', error);
      throw error;
    }
  }

  /**
   * Obtiene los metadatos de un archivo
   */
  async getFile(fileId: string): Promise<GoogleDriveFile> {
    await this.ensureToken();

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,webViewLink,webContentLink,thumbnailLink`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get file: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Extrae el ID de archivo de una URL de Google Drive
   */
  private extractFileIdFromUrl(url: string): string | null {
    if (!url) return null;

    // 1. Check for our custom x-file-id parameter first (most reliable for our app)
    const customMatch = url.match(/[?&]x-file-id=([^&]+)/);
    if (customMatch) return customMatch[1];

    // 2. Formato googleusercontent.com: https://lh3.googleusercontent.com/d/FILE_ID=s2000
    const googleUserContentMatch = url.match(/googleusercontent\.com\/d\/([^=?&]+)/);
    if (googleUserContentMatch) return googleUserContentMatch[1];

    // 3. Formato: https://drive.google.com/uc?export=view&id=FILE_ID
    const match = url.match(/[?&]id=([^&]+)/);
    if (match) return match[1];

    // 4. Formato: https://drive.google.com/file/d/FILE_ID/view
    const match2 = url.match(/\/file\/d\/([^/]+)/);
    if (match2) return match2[1];

    return null;
  }

  /**
   * Sube una foto del análisis organizada por código/lote
   * @param file Archivo de imagen
   * @param codigo Código del análisis
   * @param lote Lote del análisis
   * @param analysisId ID del análisis (para crear subcarpeta)
   * @param photoType Tipo de foto (ej: 'peso_bruto', 'uniformidad_grandes')
   * @param oldPhotoUrl URL de la foto anterior (opcional, se eliminará si existe)
   */
  async uploadAnalysisPhoto(
    file: File,
    codigo: string,
    lote: string,
    analysisId: string,
    photoType: string,
    oldPhotoUrl?: string,
    viewerEmail?: string
  ): Promise<string> {
    try {
      logger.log(`📸 Subiendo foto: ${photoType} (${file.size} bytes)`);

      // Asegurar token válido antes de comenzar
      await this.ensureToken();

      // Verificar conectividad primero
      logger.log('🔍 Verificando conectividad con Google Drive...');
      const isConnected = await this.checkConnectivity();
      if (!isConnected) {
        // Intentar refrescar token una vez más si falla la conectividad
        await this.ensureToken();
        const retryConnected = await this.checkConnectivity();
        if (!retryConnected) {
          throw new Error('Error de conexión con Google Drive. Verifica tu conexión a internet o permisos de Google Drive.');
        }
      }
      logger.log('✅ Conectividad verificada');

      // Asegurar que la carpeta raíz "descongelado" existe
      logger.log('📁 Verificando carpeta raíz...');
      if (!this.rootFolderId) {
        await this.initialize();
        if (!this.rootFolderId) {
          throw new Error('Could not initialize Google Drive service: Root folder ID is missing');
        }
      }
      logger.log('✅ Carpeta raíz verificada:', this.rootFolderId);

      // Estructura: descongelado/CODIGO/LOTE/ANALYSIS_ID/TIPO_FOTO.jpg

      // 1. Obtener o crear carpeta del código
      logger.log(`📁 Creando/verificando carpeta del código: ${codigo}`);
      const codigoFolderId = await this.getOrCreateFolder(codigo, this.rootFolderId || undefined);
      logger.log('✅ Carpeta del código:', codigoFolderId);

      // 2. Obtener o crear carpeta del lote
      logger.log(`📁 Creando/verificando carpeta del lote: ${lote}`);
      const loteFolderId = await this.getOrCreateFolder(lote, codigoFolderId);
      logger.log('✅ Carpeta del lote:', loteFolderId);

      // 3. Obtener o crear carpeta del análisis (NUEVO)
      logger.log(`📁 Creando/verificando carpeta del análisis: ${analysisId}`);
      const analysisFolderId = await this.getOrCreateFolder(analysisId, loteFolderId);
      logger.log('✅ Carpeta del análisis:', analysisFolderId);

      // Generar nombre de archivo con timestamp para evitar duplicados
      const timestamp = Date.now();
      // Safe extraction of extension - handle case where file.name might be undefined (e.g., Blob from IndexedDB)
      const extension = file.name?.split('.').pop() || 'jpg';
      const fileName = `${photoType}_${timestamp}.${extension}`;
      logger.log(`📄 Nombre de archivo generado: ${fileName}`);

      // Subir archivo a la carpeta del ANÁLISIS
      logger.log(`⬆️ Subiendo archivo a Google Drive...`);
      const url = await this.uploadFile(file, fileName, analysisFolderId);

      logger.log(`✅ Foto subida exitosamente: descongelado/${codigo}/${lote}/${analysisId}/${fileName}`);

      // NOTA: No es necesario compartir explícitamente porque el archivo ya es público
      // El intento de compartir causaba errores 403 de rate limit sin beneficio alguno
      // if (viewerEmail) {
      //   const newFileId = this.extractFileIdFromUrl(url);
      //   if (newFileId) {
      //     await this.shareWithUser(newFileId, viewerEmail);
      //   }
      // }

      logger.log(`🔗 URL generada: ${url}`);

      // Si hay una foto anterior, eliminarla DESPUÉS de subir la nueva exitosamente
      // Esto previene pérdida de datos si la subida falla
      if (oldPhotoUrl) {
        const oldFileId = this.extractFileIdFromUrl(oldPhotoUrl);
        if (oldFileId) {
          try {
            logger.log(`🗑️ Eliminando foto anterior: ${oldFileId}`);
            // No esperamos a que termine para no bloquear la respuesta
            this.deleteFile(oldFileId).catch(err => {
              logger.warn('⚠️ Error eliminando foto anterior en background:', err);
            });
          } catch (error) {
            logger.warn('No se pudo iniciar eliminación de foto anterior:', error);
          }
        }
      }

      return url;
    } catch (error) {
      logger.error('❌ Error uploading analysis photo:', error);
      throw error;
    }
  }

  /**
   * Elimina un archivo de Google Drive
   * @param fileId ID del archivo
   */
  async deleteFile(fileId: string): Promise<void> {
    try {
      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.accessToken} `
        }
      });

      if (!response.ok) {
        // Si es 404, el archivo ya no existe, lo consideramos éxito
        if (response.status === 404) {
          logger.warn(`⚠️ Archivo ${fileId} no encontrado al intentar borrar (ya eliminado).`);
          return;
        }

        const errorData = await response.json().catch(() => ({}));
        logger.error(`❌ Error eliminando archivo ${fileId}:`, response.status, errorData);
        throw new Error(`Delete failed: ${response.status} - ${JSON.stringify(errorData)}`);
      }

      logger.log(`✅ Archivo eliminado correctamente: ${fileId}`);
    } catch (error) {
      logger.error('Error deleting file:', error);
      throw error;
    }
  }

  /**
   * Elimina la carpeta del análisis (Lote) dentro de la carpeta del Código
   * @param codigo Código del análisis
   * @param lote Lote del análisis
   */
  async deleteAnalysisFolder(codigo: string, lote: string): Promise<void> {
    try {
      logger.log(`🗑️ Intentando eliminar carpeta de análisis: ${codigo}/${lote}`);
      await this.ensureToken();

      // Asegurar que tenemos la carpeta raíz "descongelado"
      if (!this.rootFolderId) {
        await this.initialize();
        if (!this.rootFolderId) {
          logger.warn('⚠️ No se pudo obtener rootFolderId para eliminar carpeta');
          return;
        }
      }

      // 1. Buscar carpeta del código dentro de "descongelado"
      const codigoFolderId = await this.findFolder(codigo, this.rootFolderId);
      if (!codigoFolderId) {
        logger.warn(`⚠️ No se encontró la carpeta del código: ${codigo}`);
        return;
      }

      // 2. Buscar carpeta del lote dentro de la carpeta del código
      const loteFolderId = await this.findFolder(lote, codigoFolderId);
      if (!loteFolderId) {
        logger.warn(`⚠️ No se encontró la carpeta del lote: ${lote} en ${codigo}`);
        return;
      }

      // 3. Eliminar carpeta del lote (esto elimina la carpeta y todos sus archivos)
      await this.deleteFile(loteFolderId);
      logger.log(`✅ Carpeta de análisis eliminada: ${codigo}/${lote} (${loteFolderId})`);

    } catch (error) {
      logger.error('❌ Error eliminando carpeta de análisis:', error);
      // No lanzamos error para no romper el flujo de eliminación del documento
    }
  }


  /**
   * Verifica la conectividad con Google Drive
   */
  async checkConnectivity(): Promise<boolean> {
    try {
      // Verificar si tenemos token válido
      if (!this.accessToken) {
        logger.warn('❌ No hay token de acceso para verificar conectividad');
        return false;
      }

      // Hacer una petición simple para verificar conectividad
      const response = await fetch('https://www.googleapis.com/drive/v3/about?fields=user', {
        headers: {
          'Authorization': `Bearer ${this.accessToken} `
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.warn('❌ Error de conectividad con Google Drive:', response.status, errorText);
        return false;
      }

      const data = await response.json();
      logger.log('✅ Conectividad con Google Drive verificada para usuario:', data.user?.displayName);
      return true;
    } catch (error) {
      logger.error('❌ Error verificando conectividad:', error);
      return false;
    }
  }

  /**
   * Renueva permisos públicos para múltiples archivos
   * Útil para arreglar permisos expirados en análisis existentes
   */
  async renewPublicPermissions(fileIds: string[]): Promise<void> {
    logger.log(`🔄 Renovando permisos para ${fileIds.length} archivos...`);

    for (const fileId of fileIds) {
      try {
        await this.makeFilePublic(fileId);
        logger.log(`✅ Permisos renovados para: ${fileId} `);
        // Pequeño delay para no sobrecargar la API
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        logger.warn(`⚠️ Error renovando permisos para ${fileId}: `, error instanceof Error ? error.message : String(error));
      }
    }

    logger.log('✅ Renovación de permisos completada');
  }

  /**
   * Extrae IDs de archivos de Google Drive de una lista de URLs
   */
  extractFileIdsFromUrls(urls: string[]): string[] {
    const fileIds: string[] = [];

    for (const url of urls) {
      if (url && url.includes('drive.google.com')) {
        const fileIdMatch = url.match(/[?&]id=([^&]+)/);
        if (fileIdMatch && fileIdMatch[1]) {
          fileIds.push(fileIdMatch[1]);
        }
      }
    }

    return [...new Set(fileIds)]; // Remover duplicados
  }
}

// Exportar instancia singleton
export const googleDriveService = new GoogleDriveService();
export default googleDriveService;
