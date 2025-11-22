/**
 * Google Authentication Service (MEJORADO)
 * - Token guardado en localStorage (persiste entre sesiones)
 * - Auto-refresh de token antes de expirar
 * - Mejor manejo de errores sin clearing agresivo
 * - Type safety mejorado
 * - Logger centralizado
 */

import { logger } from './logger';

interface GoogleAuthConfig {
  clientId: string;
  apiKey: string;
  scopes: string[];
}

interface TokenInfo {
  expires_in: number;
  access_type: string;
  [key: string]: unknown;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  picture: string;
}

interface TokenResponse {
  access_token?: string;
  error?: string;
  expires_in?: number;
  [key: string]: unknown;
}

interface GoogleTokenClient {
  requestAccessToken: (options?: { prompt?: string }) => void;
}

class GoogleAuthService {
  private config: GoogleAuthConfig;
  private tokenClient: GoogleTokenClient | null = null;
  private accessToken: string | null = null;
  private user: UserProfile | null = null;
  private listeners: ((user: UserProfile | null) => void)[] = [];
  private tokenRefreshTimer: NodeJS.Timeout | null = null;
  private TOKEN_STORAGE_KEY = 'google_access_token_v2';
  private USER_STORAGE_KEY = 'google_user_v2';
  private TOKEN_EXPIRY_KEY = 'google_token_expiry';

  constructor() {
    this.config = {
      clientId: process.env.NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID || '',
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY || '',
      scopes: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/drive.file'
      ]
    };
  }

  /**
   * Inicializa Google Identity Services y restaura sesión guardada
   */
  async initialize() {
    if (typeof window === 'undefined') return;

    try {
      // Cargar Google Identity Services
      await this.loadGoogleScript();

      // MEJORÍA: Usar redirect en lugar de popup (evita bloqueo del navegador)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: this.config.clientId,
        scope: this.config.scopes.join(' '),
        callback: this.onTokenResponse,
        ux_mode: 'redirect',
        redirect_uri: typeof window !== 'undefined' ? window.location.origin : ''
      });

      // Verificar si venimos de un redirect de Google Auth
      await this.handleRedirectCallback();

      // MEJORÍA: Restaurar sesión desde localStorage (persiste entre navegador restarts)
      await this.syncFromPersistentStorage();

      logger.log('✅ Google Auth inicializado (modo redirect)');
    } catch (error) {
      logger.error('❌ Error inicializando Google Auth:', error);
      throw error;
    }
  }

  /**
   * Maneja el callback después de redirect de Google Auth
   */
  private async handleRedirectCallback() {
    if (typeof window === 'undefined') return;

    const urlParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = urlParams.get('access_token');
    const error = urlParams.get('error');

    if (error) {
      logger.error('❌ Error en autenticación Google (redirect):', error);
      // Limpiar URL sin recargar
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (accessToken) {
      // Evitar procesar si ya tenemos un token válido en memoria para evitar bucles
      if (this.accessToken === accessToken) {
        return;
      }

      logger.log('✅ Token recibido desde redirect');

      // Simular respuesta del callback
      await this.onTokenResponse({ access_token: accessToken });

      // Limpiar URL sin recargar
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }

  /**
   * Restaura token y usuario desde localStorage
   */
  private async syncFromPersistentStorage() {
    if (typeof window === 'undefined') return;

    try {
      const savedToken = localStorage.getItem(this.TOKEN_STORAGE_KEY);
      const savedUser = localStorage.getItem(this.USER_STORAGE_KEY);
      const savedExpiry = localStorage.getItem(this.TOKEN_EXPIRY_KEY);

      if (savedToken && savedUser) {
        this.accessToken = savedToken;
        this.user = JSON.parse(savedUser) as UserProfile;

        // Verificar si el token aún es válido
        // IMPORTANTE: Si falla por red, ASUMIMOS que es válido para no desloguear al usuario offline
        const isValid = await this.verifyToken();

        if (isValid) {
          logger.log('✅ Token restaurado desde localStorage (persistencia)');
          this.notifyListeners();

          // Configurar refresh automático si falta poco para expirar
          if (savedExpiry) {
            const expiryTime = parseInt(savedExpiry);
            const now = Date.now();
            const timeToExpiry = expiryTime - now;

            if (timeToExpiry > 0 && timeToExpiry < 3600000) { // Si expira en menos de 1 hora
              this.scheduleTokenRefresh(timeToExpiry - 300000); // Refresh 5 min antes
            }
          }
          return;
        } else {
          // Solo limpiar si verifyToken devuelve explícitamente false (inválido)
          // Si verifyToken lanzó excepción (red), no llegamos aquí (o deberíamos manejarlo en verifyToken)
          // En la nueva implementación de verifyToken, devuelve true si hay error de red,
          // así que si llegamos aquí es porque es REALMENTE inválido.
          logger.warn('⚠️ Token guardado expiró o es inválido, limpiando...');
          this.clearStoredAuth();
        }
      }
    } catch (error) {
      logger.error('Error sincronizando storage:', error);
      // No limpiamos auth aquí por si es un error temporal de lectura
    }
  }
  /**
   * Carga el script de Google Identity Services
   */
  private loadGoogleScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((window as any).google) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Error cargando Google Identity Services'));
      document.head.appendChild(script);
    });
  }

  /**
   * Callback cuando se recibe un token (LOGIN)
   */
  private onTokenResponse = async (response: TokenResponse) => {
    if (response.error) {
      logger.error('❌ Error en autenticación Google:', response.error);
      alert(`Error de autenticación: ${response.error}`);
      return;
    }

    if (response.access_token) {
      this.accessToken = response.access_token;

      // MEJORÍA: Guardar en localStorage en lugar de sessionStorage
      if (this.accessToken) {
        localStorage.setItem(this.TOKEN_STORAGE_KEY, this.accessToken);
      }

      // Cargar información del usuario
      await this.loadUserInfo();

      // Configurar refresh automático (cada 50 minutos)
      this.scheduleTokenRefresh(50 * 60 * 1000);

      this.notifyListeners();
    }
  };

  /**
   * Cierra la sesión
   */
  logout() {
    if (this.tokenClient && this.accessToken) {
      // Revocar token en Google
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).google.accounts.oauth2.revoke(this.accessToken, () => {
        logger.log('Token revocado en Google');
      });
    }

    this.clearStoredAuth();
  }

  /**
   * Limpia autenticación (sin ser tan agresivo como antes)
   */
  private clearStoredAuth() {
    this.accessToken = null;
    this.user = null;

    // Limpiar localStorage
    localStorage.removeItem(this.TOKEN_STORAGE_KEY);
    localStorage.removeItem(this.USER_STORAGE_KEY);
    localStorage.removeItem(this.TOKEN_EXPIRY_KEY);

    // Limpiar timer de refresh
    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
      this.tokenRefreshTimer = null;
    }

    this.notifyListeners();
  }

  /**
   * Inicia el flujo de login
   */
  async login(): Promise<void> {
    if (!this.tokenClient) {
      await this.initialize();
    }

    this.tokenClient?.requestAccessToken();
  }

  /**
   * Obtiene información del usuario autenticado
   */
  private async loadUserInfo() {
    if (!this.accessToken) return;

    try {
      const response = await fetch(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        {
          headers: { Authorization: `Bearer ${this.accessToken}` },
          signal: AbortSignal.timeout(10000)
        }
      );

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const userData = await response.json();
      this.user = {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        picture: userData.picture
      };

      // Guardar en localStorage
      localStorage.setItem(this.USER_STORAGE_KEY, JSON.stringify(this.user));

      // Estimar expiración en 1 hora
      const expiryTime = Date.now() + 60 * 60 * 1000;
      localStorage.setItem(this.TOKEN_EXPIRY_KEY, expiryTime.toString());

      logger.log('✅ Usuario autenticado:', this.user.name);
      this.notifyListeners();
    } catch (error) {
      logger.error('Error obteniendo info del usuario:', error);
      this.clearStoredAuth();
    }
  }

  /**
   * Verifica si un token es válido (sin clearing agresivo)
   */
  /**
   * Verifica si un token es válido (sin clearing agresivo)
   * Retorna true si es válido O si no se puede verificar (offline)
   * Retorna false SOLO si Google responde explícitamente que es inválido
   */
  private async verifyToken(): Promise<boolean> {
    if (!this.accessToken) return false;

    try {
      const response = await fetch(
        `https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${this.accessToken}`,
        { signal: AbortSignal.timeout(5000) }
      );

      if (response.status === 401) {
        logger.warn('⚠️ Token inválido (401) - Expirado o revocado');
        return false;
      }

      if (!response.ok) {
        logger.warn(`⚠️ Token check failed: ${response.status} - Asumiendo válido por error de servidor`);
        // Si falla con 500 u otro error, asumimos válido para no bloquear al usuario
        return true;
      }

      const tokenInfo: TokenInfo = await response.json();

      // Si expira muy pronto, marcar como inválido
      if (tokenInfo.expires_in && tokenInfo.expires_in < 60) {
        logger.warn('⚠️ Token expira en menos de 1 minuto');
        return false;
      }

      logger.log(`✅ Token válido (expira en ${tokenInfo.expires_in}s)`);
      return true;
    } catch (error) {
      logger.warn('Error verificando token (posiblemente offline):', error);
      // Si hay error de red (offline), ASUMIMOS que el token es válido
      // para permitir que la app funcione con datos en caché
      return true;
    }
  }

  /**
   * Programa refresh automático del token
   */
  private scheduleTokenRefresh(delayMs: number) {
    // Limpiar timer anterior
    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
    }

    this.tokenRefreshTimer = setTimeout(async () => {
      logger.log('🔄 Refrescando token automáticamente...');

      if (this.tokenClient) {
        this.tokenClient.requestAccessToken();
      }
    }, delayMs);
  }

  /**
   * MEJORADO: Verifica y renueva el token si es necesario (sin throwing agresivo)
   */
  async ensureValidToken(): Promise<string> {
    if (!this.accessToken) {
      throw new Error('No hay sesión activa. Por favor, inicia sesión.');
    }

    try {
      // Verificar si el token es válido
      const isValid = await this.verifyToken();

      if (isValid) {
        return this.accessToken;
      }

      // Token inválido, marcar como expirado
      logger.warn('⚠️ Token inválido, usuario debe re-autenticar');
      this.clearStoredAuth();

      throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.');
    } catch (error) {
      logger.error('Error verificando token:', error);
      this.clearStoredAuth();
      throw error;
    }
  }

  /**
   * Verifica si el usuario está autenticado
   */
  isAuthenticated(): boolean {
    return this.accessToken !== null;
  }

  /**
   * Obtiene el token de acceso actual
   */
  getAccessToken(): string | null {
    return this.accessToken;
  }

  /**
   * Obtiene la información del usuario actual
   */
  getUser(): UserProfile | null {
    return this.user;
  }

  /**
   * Refresca el token de acceso silenciosamente
   */
  async refreshToken(): Promise<string> {
    if (!this.tokenClient) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      try {
        logger.log('🔄 Refrescando token silenciosamente...');
        // Usar prompt: 'none' para intentar refrescar sin interacción del usuario
        this.tokenClient?.requestAccessToken({ prompt: 'none' });

        // El callback configurado en initialize manejará la respuesta
        // Pero necesitamos una forma de saber cuándo termina para esta promesa
        // Una solución simple es esperar a que cambie el token o ocurra un error
        // NOTA: Esto es una simplificación, idealmente el callback debería resolver esta promesa

        // Para esta implementación, vamos a confiar en que el callback actualiza el estado
        // y devolvemos el token actual después de un breve retraso si no hay error inmediato
        setTimeout(() => {
          if (this.accessToken) {
            resolve(this.accessToken);
          } else {
            reject(new Error('No se pudo refrescar el token'));
          }
        }, 2000);
      } catch (error) {
        logger.error('Error refrescando token:', error);
        reject(error);
      }
    });
  }

  /**
   * Suscribe a cambios en el estado de autenticación
   */
  subscribe(listener: (user: UserProfile | null) => void): () => void {
    this.listeners.push(listener);
    // Emitir estado actual inmediatamente
    listener(this.user);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.user));
  }
}

// Exportar instancia singleton
export const googleAuthService = new GoogleAuthService();
export default googleAuthService;
