import { checkServiceHealth } from "./service-health.js";

describe("checkServiceHealth", () => {
  it("up on 200 with status ok", async () => {
    const r = await checkServiceHealth("https://svc.test/health", {
      fetchFn: async () => new Response(JSON.stringify({ status: "ok" }), { status: 200 }),
    });
    expect(r.status).toBe("up");
  });

  it("down on non-200", async () => {
    const r = await checkServiceHealth("https://svc.test/health", {
      fetchFn: async () => new Response("nope", { status: 503 }),
    });
    expect(r.status).toBe("down");
  });

  it("down on throw", async () => {
    const r = await checkServiceHealth("https://svc.test/health", {
      fetchFn: async () => {
        throw new Error("ETIMEDOUT");
      },
    });
    expect(r.status).toBe("down");
  });
});
