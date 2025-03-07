// uptime.test.ts
import { test, expect } from "bun:test";
import Uptime from "../src/uptime";

// Replace with your actual heartbeat ID from Better Stack
const HEARTBEAT_ID = "YOUR_HEARTBEAT_ID_HERE"; // e.g. 'HWudH2Yh9LErPmYPstxKK1aL'

// Only run these tests if HEARTBEAT_ID is properly set
const runLiveTests = HEARTBEAT_ID !== "YOUR_HEARTBEAT_ID_HERE";

if (runLiveTests) {
  test("basic heartbeat works", async () => {
    const client = new Uptime();
    const response = await client.sendHeartbeat(HEARTBEAT_ID);
    expect(response.ok).toBe(true);
  });

  test("heartbeat with HEAD method works", async () => {
    const client = new Uptime();
    const response = await client.sendHeartbeat(HEARTBEAT_ID, { method: "HEAD" });
    expect(response.ok).toBe(true);
  });

} else {
  test("SKIPPED: Live tests - set HEARTBEAT_ID to run", () => {
    console.log("⚠️ Live tests skipped. Replace HEARTBEAT_ID to run actual API tests");
    expect(true).toBe(true);
  });
}