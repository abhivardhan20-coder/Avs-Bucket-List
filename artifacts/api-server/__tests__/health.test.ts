import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../src/app";

describe("Health API", () => {
  it("should return ok for /healthz", async () => {
    const response = await request(app).get("/api/v1/health/healthz");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });

  it("should return 400 if query params are provided to healthz", async () => {
    const response = await request(app).get("/api/v1/health/healthz?invalid=true");
    expect(response.status).toBe(400);
  });
});
