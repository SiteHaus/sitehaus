import { checkHttp } from "./http.js";

const okFetch = async () => new Response("ok", { status: 200 });
const fiveHundred = async () => new Response("err", { status: 500 });

describe("checkHttp", () => {
  it("returns up with latency on 2xx", async () => {
    let t = 0;
    const r = await checkHttp("https://x.test", { fetchFn: okFetch, now: () => (t += 50) });
    expect(r.status).toBe("up");
    expect(r.latencyMs).toBe(50);
  });

  it("returns down on non-2xx", async () => {
    const r = await checkHttp("https://x.test", { fetchFn: fiveHundred });
    expect(r.status).toBe("down");
    expect(r.detail.httpStatus).toBe(500);
  });

  it("returns down on network throw/timeout", async () => {
    const boom = async () => { throw new Error("ECONNREFUSED"); };
    const r = await checkHttp("https://x.test", { fetchFn: boom });
    expect(r.status).toBe("down");
    expect(String(r.detail.error)).toContain("ECONNREFUSED");
  });
});
