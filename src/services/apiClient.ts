export enum ApiErrorType {
  NETWORK = 'NETWORK',
  TIMEOUT = 'TIMEOUT',
  API_ERROR = 'API_ERROR',
  UNKNOWN = 'UNKNOWN'
}

export class ApiError extends Error {
  constructor(
    public type: ApiErrorType,
    public message: string,
    public status?: number,
    public statusText?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  signal?: AbortSignal;
}

const DEFAULT_TIMEOUT = 10000;
const DEFAULT_RETRIES = 3;
const DEFAULT_RETRY_DELAY = 1000;

/**
 * Sanitize URLs for logging to avoid exposing sensitive data like tokens
 */
const sanitizeUrl = (url: string): string => {
  try {
    const parsed = new URL(url);
    const sensitiveParams = ['token', 'auth', 'api_key', 'access_token', 'id_token'];
    sensitiveParams.forEach(param => {
      if (parsed.searchParams.has(param)) {
        parsed.searchParams.set(param, '[REDACTED]');
      }
    });
    return parsed.toString();
  } catch {
    return url; // If URL parsing fails, return original
  }
};

/**
 * Robust fetch wrapper with retries and timeouts
 */
export async function apiClient<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const { 
    timeout = DEFAULT_TIMEOUT, 
    retries = DEFAULT_RETRIES, 
    retryDelay = DEFAULT_RETRY_DELAY,
    signal: externalSignal,
    ...fetchOptions 
  } = options;

  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  
  let lastError: ApiError | undefined;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    // If external signal is already aborted, fail immediately
    if (externalSignal?.aborted) {
      clearTimeout(id);
      throw new ApiError(ApiErrorType.NETWORK, 'Request aborted by user');
    }

    // Link external signal to our controller
    const onExternalAbort = () => controller.abort();
    if (externalSignal) externalSignal.addEventListener('abort', onExternalAbort);

    try {
      if (attempt > 0) {
        if (import.meta.env.DEV) {
          console.log(`[API] Retrying (${attempt}/${retries}) for ${sanitizeUrl(url)}...`);
        }
        // Exponential backoff with jitter
        const baseDelay = retryDelay * Math.pow(2, attempt - 1);
        const jitter = baseDelay * 0.2 * Math.random(); // 20% jitter
        await new Promise(r => setTimeout(r, baseDelay + jitter));
      }

      // Get token from sessionStorage
      let userToken = '';
      try {
        userToken = sessionStorage.getItem('av_session_token') || '';
      } catch (e) {
        console.warn("[apiClient] Failed to read session token", e);
      }

      const response = await fetch(url, {
        ...fetchOptions,
        keepalive: fetchOptions.keepalive, // Crucial for beforeunload/visibilitychange
        signal: controller.signal,
        headers: {
          ...fetchOptions.headers,
          'X-Request-ID': requestId,
          ...(userToken ? { 'X-User-Token': userToken } : {})
        }
      });

      clearTimeout(id);

      if (!response.ok) {
        // Retry 5xx server errors and 429 rate-limit responses
        if ((response.status >= 500 || response.status === 429) && attempt < retries) {
          // Respect Retry-After header if present for 429s
          if (response.status === 429) {
            const retryAfter = response.headers.get('Retry-After');
            if (retryAfter) {
              // Parse Retry-After: can be seconds or a full HTTP date
              let retrySeconds = parseInt(retryAfter, 10);
              if (isNaN(retrySeconds)) {
                // It's a date string, calculate seconds until then
                const date = Date.parse(retryAfter);
                if (!isNaN(date)) {
                  retrySeconds = Math.ceil((date - Date.now()) / 1000);
                }
              }
              // Clamp to safe range: 0.5s to 10s
              const retryMs = Math.max(500, Math.min(retrySeconds * 1000, 10000));
              await new Promise(r => setTimeout(r, retryMs));
            }
          }
          throw new ApiError(ApiErrorType.API_ERROR, `Server Error (${response.status})`, response.status, response.statusText);
        }
        
        let details: unknown;
        try { details = await response.json(); } catch(e) {
          console.warn("Details parse failed", e);
        }
        
        throw new ApiError(
          ApiErrorType.API_ERROR, 
          `Request failed with status ${response.status}`, 
          response.status, 
          response.statusText,
          details
        );
      }

      if (externalSignal) externalSignal.removeEventListener('abort', onExternalAbort);
      return await response.json() as T;

    } catch (err: unknown) {
      clearTimeout(id);
      if (externalSignal) externalSignal.removeEventListener('abort', onExternalAbort);
      
      if (err instanceof Error && err.name === 'AbortError') {
        lastError = new ApiError(ApiErrorType.TIMEOUT, `Request timed out after ${timeout}ms`);
      } else if (err instanceof ApiError) {
        lastError = err;
      } else {
        const msg = err instanceof Error ? err.message : 'Network request failed';
        lastError = new ApiError(ApiErrorType.NETWORK, msg);
      }

      // Only retry transient errors (network, timeout, 5xx, 429)
      const isTransient = lastError.type === ApiErrorType.NETWORK || 
                         lastError.type === ApiErrorType.TIMEOUT || 
                        (lastError.type === ApiErrorType.API_ERROR && (lastError.status! >= 500 || lastError.status === 429));

      if (!isTransient || attempt === retries) {
        console.error(`[API] Permanent failure [${lastError.type}] on ${sanitizeUrl(url)}: ${lastError.message}`, lastError);
        throw lastError;
      }
    }
  }

  throw lastError || new ApiError(ApiErrorType.UNKNOWN, 'Unexpected execution end');
}

/**
 * Normalized API wrapper for consistent error handling.
 * Returns a result object instead of throwing, making it perfect for safe UI-level calls.
 */
export async function safeFetch<T>(url: string, options: RequestOptions = {}): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const data = await apiClient<T>(url, options);
    return { success: true, data };
  } catch (err: unknown) {
    const errorMessage = err instanceof ApiError ? err.message : (err instanceof Error ? err.message : 'Unknown network error');
    return { success: false, error: errorMessage };
  }
}
