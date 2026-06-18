import request from "supertest";
import { describe, it, expect } from "vitest";
import app from "../app";

describe("Rate Limiter Exceptions", () => {
  it("should not rate limit requests to /api/v1/health/healthz", async () => {
    let lastStatus = 200;
    for (let i = 0; i < 105; i++) {
      const res = await request(app).get("/api/v1/health/healthz");
      lastStatus = res.status;
      expect(res.status).not.toBe(429);
    }
    expect(lastStatus).toBe(200);
  });
});
