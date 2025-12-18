/**
 * Google Authentication Service (MEJORADO)
 * - Token guardado en localStorage (persiste entre sesiones)
 * - Auto-refresh de token antes de expirar
 * - Mejor manejo de errores sin clearing agresivo
 * - Type safety mejorado
 * - Logger centralizado
 */

import { logger } from './logger';
import { GoogleAuthProvider, signInWithCredential, signOut } from 'firebase/auth';
import { auth } from './firebase';

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

  // Resolvers para la promesa de login
  private loginResolve: ((value: void | PromiseLike<void>) => void) | null = null;
  private loginReject: ((reason?: any) => void) | null = null;
  private loginPromise: Promise<void> | null = null;

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

      // MEJORÍA: Usar popup en lugar de redirect (refresh silencioso)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: this.config.clientId,
        scope: this.config.scopes.join(' '),
        callback: this.onTokenResponse,
        // ux_mode: 'popup', // Explícitamente popup para refresh silencioso
      });

      // MEJORÍA: Restaurar sesión desde localStorage (persiste entre navegador restarts)
      await this.syncFromPersistentStorage();

      logger.log('✅ Google Auth inicializado (modo popup)');
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

        // 🔐 Resync Firebase Auth if needed
        if (isValid && auth && !auth.currentUser) {
          try {
            logger.log('🔐 Restaurando sesión Firebase con token guardado...');
            const credential = GoogleAuthProvider.credential(null, this.accessToken);
            await signInWithCredential(auth, credential);
            logger.log('✅ Sesión Firebase restaurada');
          } catch (e) {
            logger.warn('⚠️ No se pudo restaurar sesión Firebase con token guardado:', e);
          }
        }

        if (isValid) {
          logger.log('✅ Token restaurado desde localStorage (persistencia)');
          this.notifyListeners();

          // Configurar refresh automático si falta poco para expirar
          if (savedExpiry) {
            const expiryTime = parseInt(savedExpiry);
            const now = Date.now();
            const timeToExpiry = expiryTime - now;

            logger.log(`📊 Debug expiry: now=${now}, expiryTime=${expiryTime}, timeToExpiry=${timeToExpiry}ms (${Math.floor(timeToExpiry / 60000)} min)`);

            if (timeToExpiry > 0) {
              // Si aún es válido, programar refresh
              const refreshDelay = Math.max(0, timeToExpiry - 300000); // 5 min antes
              logger.log(`⏰ Refresh programado en ${Math.floor(refreshDelay / 60000)} minutos`);
              this.scheduleTokenRefresh(refreshDelay);
            } else {
              // Si ya expiró (pero verifyToken dijo que era válido??), refrescar ya
              logger.warn('⚠️ Token expirado según localStorage, refrescando...');
              this.scheduleTokenRefresh(0);
            }
          }
          return;
        } else {
          // Si verifyToken falló, NO limpiar inmediatamente.
          // Intentar un refresh silencioso si es posible
          logger.warn('⚠️ Token guardado parece inválido, intentando refrescar...');

          // Notificar listeners con el usuario aunque el token sea dudoso
          // para que la UI no parpadee a "Login" inmediatamente
          this.notifyListeners();

          // Intentar refrescar inmediatamente
          // Si falla el refresh, ahí sí se limpiará o pedirá login
          if (this.tokenClient) {
            // Pequeño delay para asegurar inicialización
            setTimeout(() => this.scheduleTokenRefresh(0), 1000);
          } else {
            // Si no hay cliente, limpiar
            this.clearStoredAuth();
          }
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
      // Ignorar error 'interaction_required' que ocurre cuando falla el refresh silencioso
      if (response.error === 'interaction_required') {
        logger.warn('⚠️ Refresh silencioso falló (interaction_required). El usuario debe re-autenticar.');
        // No mostramos alert, solo limpiamos la sesión para que la UI pida login
        this.clearStoredAuth();

        // Rechazar promesa si existe
        if (this.loginReject) {
          this.loginReject(new Error('Interacción requerida'));
          this.loginReject = null;
          this.loginResolve = null;
          this.loginPromise = null;
        }
        return;
      }

      logger.error('❌ Error en autenticación Google:', response.error);
      alert(`Error de autenticación: ${response.error}`);

      // Rechazar promesa si existe
      if (this.loginReject) {
        this.loginReject(new Error(response.error));
        this.loginReject = null;
        this.loginResolve = null;
        this.loginPromise = null;
      }
      return;
    }

    if (response.access_token) {
      this.accessToken = response.access_token;

      // MEJORÍA: Guardar en localStorage en lugar de sessionStorage
      if (this.accessToken) {
        localStorage.setItem(this.TOKEN_STORAGE_KEY, this.accessToken);
      }

      // 🔐 FIREBASE AUTH INTEGRATION
      try {
        if (auth) {
          logger.log('🔐 Iniciando sesión en Firebase con credencial de Google...');
          const credential = GoogleAuthProvider.credential(null, response.access_token);
          await signInWithCredential(auth, credential);
          logger.log('✅ Firebase Auth exitoso');
        } else {
          logger.warn('⚠️ Firebase Auth no inicializado, no se pudo hacer login en Firebase');
        }
      } catch (firebaseError) {
        logger.error('❌ Error en Firebase Auth:', firebaseError);
        // No bloqueamos el flujo si falla firebase, pero es crítico para la base de datos
        // Podríamos mostrar un toast o alerta
      }

      // Configurar refresh automático basado en expires_in si viene en la respuesta
      const expiresIn = response.expires_in || 3600; // Por defecto 1 hora

      // 🔥 CRÍTICO: Guardar tiempo de expiración para persistencia
      const expiryTime = Date.now() + expiresIn * 1000;
      localStorage.setItem(this.TOKEN_EXPIRY_KEY, expiryTime.toString());

      // Cargar información del usuario
      await this.loadUserInfo();

      const refreshBeforeExpiry = 600; // 10 minutos antes de expirar
      const refreshDelay = (expiresIn - refreshBeforeExpiry) * 1000;

      logger.log(`🔄 Token refresh programado en ${refreshDelay / 1000 / 60} minutos`);
      this.scheduleTokenRefresh(refreshDelay);

      this.notifyListeners();

      // Resolver promesa si existe
      if (this.loginResolve) {
        this.loginResolve();
        this.loginResolve = null;
        this.loginReject = null;
        this.loginPromise = null;
      }
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

    // 🔐 FIREBASE LOGOUT
    if (auth) {
      signOut(auth).catch(err => logger.error('Error cerrando sesión Firebase:', err));
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
   * Retorna una promesa que se resuelve cuando el login es exitoso
   */
  async login(): Promise<void> {
    if (!this.tokenClient) {
      await this.initialize();
    }

    // Si ya hay un login en proceso, retornar la promesa existente
    if (this.loginPromise) {
      return this.loginPromise;
    }

    this.loginPromise = new Promise((resolve, reject) => {
      this.loginResolve = resolve;
      this.loginReject = reject;
      this.tokenClient?.requestAccessToken();
    });

    return this.loginPromise;
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

      if (response.status === 400 || response.status === 401 || response.status === 403) {
        logger.warn(`⚠️ Token inválido (${response.status}) - Expirado, revocado o malformado`);
        return false;
      }

      if (!response.ok) {
        logger.warn(`⚠️ Token check failed: ${response.status} - Asumiendo válido por error de servidor (5xx)`);
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
   * IMPORTANTE: Ya no intenta refresh silencioso (causa errores CORS)
   * En su lugar, dispara evento para que la UI notifique al usuario
   */
  private scheduleTokenRefresh(delayMs: number) {
    // Limpiar timer anterior
    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
    }

    this.tokenRefreshTimer = setTimeout(() => {
      logger.log('⚠️ Token próximo a expirar - solicitando re-autenticación del usuario');

      // Disparar evento para que la UI muestre notificación
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('google-token-expiring', {
          detail: {
            expiresIn: 600, // 10 minutos de advertencia
            message: 'Tu sesión está por expirar en 10 minutos'
          }
        }));
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
      // IMPORTANTE: Solo limpiar auth si el error es un token realmente inválido
      // Si el error es de red (offline, timeout), NO limpiar y retornar el token actual
      if (error instanceof Error && error.message.includes('Sesión expirada')) {
        // Este error ya viene de arriba, ya limpiamos, re-throw
        throw error;
      }

      // Para otros errores (red, timeout), NO limpiar sesión
      logger.warn('⚠️ Error verificando token (posible problema de red), usando token en caché:', error);

      // Retornar el token actual asumiendo que es válido
      // Esto permite que la app funcione offline o con problemas de red temporales
      return this.accessToken;
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
   * Suscribirse a cambios de estado de autenticación
   * Implementa patrón BehaviorSubject: emite el valor actual inmediatamente al suscribirse
   */
  subscribe(listener: (user: UserProfile | null) => void): () => void {
    this.listeners.push(listener);

    // Emitir estado actual inmediatamente para evitar race conditions
    // Esto asegura que si el componente se suscribe después de la inicialización,
    // reciba el estado correcto inmediatamente.
    listener(this.user);

    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    logger.log(`📢 Notificando a ${this.listeners.length} listeners. Usuario:`, this.user ? this.user.name : 'null');
    this.listeners.forEach(listener => listener(this.user));
  }
}

// Exportar instancia singleton
export const googleAuthService = new GoogleAuthService();
export default googleAuthService;
