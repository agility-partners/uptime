// uptime.ts

export interface HeartbeatOptions {
    /** Exit code to report (0-255), will be appended to URL as /{exitCode} */
    exitCode?: number;
    /** Report a failure, appends /fail to the URL */
    reportFailure?: boolean;
    /** HTTP method to use for the request (HEAD, GET, or POST) */
    method?: 'HEAD' | 'GET' | 'POST';
  }
  
  export class Uptime {
    private baseUrl: string = 'https://uptime.betterstack.com/api/v1';
    
    /**
     * Initialize the Uptime client
     * @param baseUrl Optional custom base URL for the API
     */
    constructor(baseUrl?: string) {
      if (baseUrl) {
        this.baseUrl = baseUrl;
      }
    }
  
    /**
     * Send a heartbeat to Better Stack Uptime monitoring
     * @param heartbeatId The unique ID of the heartbeat monitor
     * @param options Additional options for the heartbeat
     * @returns Promise resolving to the response from the heartbeat API
     */
    async sendHeartbeat(heartbeatId: string, options?: HeartbeatOptions): Promise<Response> {
      let url = `${this.baseUrl}/heartbeat/${heartbeatId}`;
      
      // Handle fail or exit code status
      if (options?.reportFailure) {
        url += '/fail';
      } else if (options?.exitCode !== undefined) {
        if (options.exitCode < 0 || options.exitCode > 255) {
          throw new Error('Exit code must be between 0 and 255');
        }
        url += `/${options.exitCode}`;
      }
      
      const method = options?.method || 'GET';
      
      try {
        const response = await fetch(url, {
          method,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'uptime-betterstack-bun/1.0.0'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Heartbeat failed: ${response.status} ${response.statusText}`);
        }
        
        return response;
      } catch (error) {
        console.error('Failed to send heartbeat:', error);
        throw error;
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