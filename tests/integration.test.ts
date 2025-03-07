// uptime.test.ts
import { test, expect } from "bun:test";
import Uptime from "../src/uptime";

// TODO: Replace with your actual heartbeat ID from Better Stack
// Tests will run against the real API using this ID
const HEARTBEAT_ID = "HWudH2Yh9LErPmYPstxKK1aL"; // e.g. 'HWudH2Yh9LErPmYPstxKK1aL'

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