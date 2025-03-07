import { describe, test, expect, beforeEach, mock, afterEach } from "bun:test";
import Uptime, { UptimeError } from "../src/uptime";

// Mock global fetch
const originalFetch = global.fetch;

describe("Uptime", () => {
  let mockFetch: ReturnType<typeof mock>;

  beforeEach(() => {
    // Create a mock implementation of fetch
    mockFetch = mock((url: string, options: RequestInit) => {
      return Promise.resolve(new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }));
    });

    global.fetch = mockFetch;
  });

  afterEach(() => {
    // Restore original fetch
    global.fetch = originalFetch;
    mockFetch.mockClear();
  });

  describe("constructor", () => {
    test("should use default values when no config provided", () => {
      const uptime = new Uptime();
      // Test private property indirectly by calling a method and inspecting the URL
      const heartbeatId = "test-id";
      
      uptime.sendHeartbeat(heartbeatId);
      
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain("https://uptime.betterstack.com/api/v1/heartbeat/test-id");
      expect(options.headers).toHaveProperty("User-Agent", "uptime-betterstack-bun/1.0.0");
    });

    test("should use custom baseUrl when provided", () => {
      const customBaseUrl = "https://custom.example.com/api";
      const uptime = new Uptime({ baseUrl: customBaseUrl });
      
      uptime.sendHeartbeat("test-id");
      
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("https://custom.example.com/api/heartbeat/test-id");
    });

    test("should use custom version when provided", () => {
      const uptime = new Uptime({ version: "2.0.0" });
      
      uptime.sendHeartbeat("test-id");
      
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [_, options] = mockFetch.mock.calls[0];
      expect(options.headers).toHaveProperty("User-Agent", "uptime-betterstack-bun/2.0.0");
    });
  });

  describe("buildHeartbeatUrl", () => {
    test("should throw if heartbeatId is empty", async () => {
      const uptime = new Uptime();
      expect(uptime.sendHeartbeat("")).rejects.toThrow(UptimeError);
    });

    test("should append /fail when reportFailure is true", async () => {
      const uptime = new Uptime();
      
      await uptime.reportFailure("test-id");
      
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("/heartbeat/test-id/fail");
    });

    test("should append exit code when provided", async () => {
      const uptime = new Uptime();
      
      await uptime.reportWithExitCode("test-id", 42);
      
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("/heartbeat/test-id/42");
    });

    test("should throw if exit code is out of range", async () => {
      const uptime = new Uptime();
      expect(uptime.reportWithExitCode("test-id", 300)).rejects.toThrow(UptimeError);
      expect(uptime.reportWithExitCode("test-id", -10)).rejects.toThrow(UptimeError);
    });
  });

  describe("sendHeartbeat", () => {
    test("should use GET method by default", async () => {
      const uptime = new Uptime();
      
      await uptime.sendHeartbeat("test-id");
      
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [_, options] = mockFetch.mock.calls[0];
      expect(options.method).toBe("GET");
    });

    test("should use specified HTTP method", async () => {
      const uptime = new Uptime();
      
      await uptime.sendHeartbeat("test-id", { method: "HEAD" });
      
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [_, options] = mockFetch.mock.calls[0];
      expect(options.method).toBe("HEAD");
    });

    test("should throw UptimeError when response is not ok", async () => {
      // Override the mock for this specific test
      mockFetch.mockImplementationOnce(() => {
        return Promise.resolve(new Response("Not Found", { 
          status: 404, 
          statusText: "Not Found" 
        }));
      });
      
      const uptime = new Uptime();
      
      expect(uptime.sendHeartbeat("test-id")).rejects.toThrow(UptimeError);
    });

    test("should throw UptimeError with status and statusText when response fails", async () => {
      mockFetch.mockImplementationOnce(() => {
        return Promise.resolve(new Response("Server Error", { 
          status: 500, 
          statusText: "Internal Server Error" 
        }));
      });
      
      const uptime = new Uptime();
      
      try {
        await uptime.sendHeartbeat("test-id");
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(UptimeError);
        if (error instanceof UptimeError) {
          expect(error.status).toBe(500);
          expect(error.statusText).toBe("Internal Server Error");
        } else {
          throw error;
        }
      }
    });

    test("should handle network errors", async () => {
      mockFetch.mockImplementationOnce(() => {
        return Promise.reject(new Error("Network error"));
      });
      
      const uptime = new Uptime();
      
      expect(uptime.sendHeartbeat("test-id")).rejects.toThrow(UptimeError);
    });

    test("should handle timeout", async () => {
      // Mock AbortController to simulate timeout
      const originalAbortController = global.AbortController;
      const mockAbort = mock(() => {});
      
      // @ts-ignore - Mocking AbortController
      global.AbortController = class MockAbortController {
        abort = mockAbort;
        signal = { aborted: false };
      };
      
      // Create a promise that won't resolve during the test
      const neverResolvingPromise = new Promise(() => {
        // This promise intentionally never resolves or rejects
      });
      
      mockFetch.mockImplementationOnce(() => {
        // Return a promise that won't complete before the timeout
        return neverResolvingPromise;
      });
      
      const uptime = new Uptime({ defaultTimeout: 5 }); // 5ms timeout
      
      // Start the request that should timeout
      const requestPromise = uptime.sendHeartbeat("test-id");
      
      // Wait for a longer period to ensure timeout occurs
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Now the abort should have been called
      expect(mockAbort).toHaveBeenCalled();
      
      // Restore original AbortController
      global.AbortController = originalAbortController;
    });
  });

  describe("convenience methods", () => {
    test("reportSuccess should call sendHeartbeat with correct parameters", async () => {
      const uptime = new Uptime();
      const spy = mock((heartbeatId: string, options?: any) => Promise.resolve(new Response()));
      uptime.sendHeartbeat = spy;
      
      await uptime.reportSuccess("test-id", { method: "POST" });
      
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith("test-id", { method: "POST" });
    });

    test("reportFailure should call sendHeartbeat with reportFailure: true", async () => {
      const uptime = new Uptime();
      const spy = mock((heartbeatId: string, options?: any) => Promise.resolve(new Response()));
      uptime.sendHeartbeat = spy;
      
      await uptime.reportFailure("test-id", { method: "POST" });
      
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith("test-id", { 
        method: "POST",
        reportFailure: true 
      });
    });

    test("reportWithExitCode should call sendHeartbeat with exitCode", async () => {
      const uptime = new Uptime();
      const spy = mock((heartbeatId: string, options?: any) => Promise.resolve(new Response()));
      uptime.sendHeartbeat = spy;
      
      await uptime.reportWithExitCode("test-id", 42, { method: "POST" });
      
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith("test-id", { 
        method: "POST",
        exitCode: 42 
      });
    });
  });
});
