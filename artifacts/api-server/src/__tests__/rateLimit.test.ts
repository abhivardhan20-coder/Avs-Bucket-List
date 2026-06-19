import request from "supertest";
import { describe, it, expect } from "vitest";
import app from "../app";

describe("Rate Limiter Exceptions", () => {
  it("should rate limit requests to /api/v1/health/healthz after 10 requests", async () => {
    // Send 10 successful requests
    for (let i = 0; i < 10; i++) {
      const res = await request(app).get("/api/v1/health/healthz");
      expect(res.status).not.toBe(429);
    }
    // The 11th request should be rate limited
    const res = await request(app).get("/api/v1/health/healthz");
    expect(res.status).toBe(429);
  });
});
