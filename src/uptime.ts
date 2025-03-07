// uptime.ts

/**
 * Custom error class for Uptime-related errors
 */
export class UptimeError extends Error {
  public readonly status?: number;
  public readonly statusText?: string;
  public readonly cause?: unknown;

  constructor(message: string, options?: { status?: number; statusText?: string; cause?: unknown }) {
    super(message);
    this.name = 'UptimeError';
    this.status = options?.status;
    this.statusText = options?.statusText;
    this.cause = options?.cause;
  }
}

export interface HeartbeatOptions {
  /** Exit code to report (0-255), will be appended to URL as /{exitCode} */
  exitCode?: number;
  /** Report a failure, appends /fail to the URL */
  reportFailure?: boolean;
  /** HTTP method to use for the request (HEAD, GET, or POST) */
  method?: 'HEAD' | 'GET' | 'POST';
  /** Request timeout in milliseconds (default: 10000) */
  timeout?: number;
}

export interface UptimeConfig {
  /** Base URL for the API */
  baseUrl?: string;
  /** Version string to use in User-Agent header */
  version?: string;
  /** Default timeout for requests in milliseconds */
  defaultTimeout?: number;
}

export class Uptime {
  private baseUrl: string = 'https://uptime.betterstack.com/api/v1';
  private readonly userAgent: string;
  private readonly defaultTimeout: number;
  
  /**
   * Initialize the Uptime client
   * @param config Optional configuration for the client
   */
  constructor(config?: UptimeConfig) {
    if (config?.baseUrl) {
      this.baseUrl = config.baseUrl;
    }
    this.userAgent = `uptime-betterstack-bun/${config?.version || '1.0.0'}`;
    this.defaultTimeout = config?.defaultTimeout || 10000;
  }

  /**
   * Builds the URL for a heartbeat request
   * @param heartbeatId The unique ID of the heartbeat monitor
   * @param options Additional options for the heartbeat
   * @returns The constructed URL
   * @private
   */
  private buildHeartbeatUrl(heartbeatId: string, options?: HeartbeatOptions): string {
    if (!heartbeatId) {
      throw new UptimeError('Heartbeat ID is required');
    }

    let url = `${this.baseUrl}/heartbeat/${heartbeatId}`;
    
    // Handle fail or exit code status
    if (options?.reportFailure) {
      url += '/fail';
    } else if (options?.exitCode !== undefined) {
      if (options.exitCode < 0 || options.exitCode > 255) {
        throw new UptimeError(`Exit code must be between 0 and 255, got ${options.exitCode}`);
      }
      url += `/${options.exitCode}`;
    }
    
    return url;
  }

  /**
   * Send a heartbeat to Better Stack Uptime monitoring
   * @param heartbeatId The unique ID of the heartbeat monitor
   * @param options Additional options for the heartbeat
   * @returns Promise resolving to the response from the heartbeat API
   * @throws {UptimeError} If the request fails
   */
  async sendHeartbeat(heartbeatId: string, options?: HeartbeatOptions): Promise<Response> {
    const url = this.buildHeartbeatUrl(heartbeatId, options);
    const method = options?.method || 'GET';
    const timeout = options?.timeout ?? this.defaultTimeout;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(url, {
        method,
        headers: {
          'Accept': 'application/json',
          'User-Agent': this.userAgent
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new UptimeError(`Heartbeat failed: ${response.status} ${response.statusText}`, {
          status: response.status,
          statusText: response.statusText
        });
      }
      
      return response;
    } catch (error) {
      if (error instanceof UptimeError) {
        throw error;
      }
      
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new UptimeError(`Request timed out after ${timeout}ms`, { cause: error });
      }
      
      throw new UptimeError('Failed to send heartbeat', { cause: error });
    }
  }
  
  /**
   * Report a successful heartbeat
   * @param heartbeatId The unique ID of the heartbeat monitor
   * @param options Additional options
   */
  async reportSuccess(heartbeatId: string, options?: Omit<HeartbeatOptions, 'reportFailure' | 'exitCode'>): Promise<Response> {
    return this.sendHeartbeat(heartbeatId, options);
  }
  
  /**
   * Report a failed heartbeat
   * @param heartbeatId The unique ID of the heartbeat monitor
   * @param options Additional options
   */
  async reportFailure(heartbeatId: string, options?: Omit<HeartbeatOptions, 'reportFailure'>): Promise<Response> {
    return this.sendHeartbeat(heartbeatId, {
      ...options,
      reportFailure: true
    });
  }
  
  /**
   * Report a heartbeat with a specific exit code
   * @param heartbeatId The unique ID of the heartbeat monitor
   * @param exitCode Exit code to report (0-255)
   * @param options Additional options
   */
  async reportWithExitCode(heartbeatId: string, exitCode: number, options?: Omit<HeartbeatOptions, 'exitCode'>): Promise<Response> {
    return this.sendHeartbeat(heartbeatId, {
      ...options,
      exitCode
    });
  }
}

// Default export for easier importing
export default Uptime;