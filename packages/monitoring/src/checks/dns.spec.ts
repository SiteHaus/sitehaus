import { checkDns } from "./dns.js";

const resolverThrowing = (code: string) => ({
  resolve4: async () => { const e: NodeJS.ErrnoException = new Error(code); e.code = code; throw e; },
});

describe("checkDns", () => {
  it("up when A records resolve", async () => {
    const r = await checkDns("ok.test", { resolve4: async () => ["1.2.3.4"] });
    expect(r.status).toBe("up");
    expect(r.detail.addresses).toEqual(["1.2.3.4"]);
  });

  it("down on SERVFAIL", async () => {
    const r = await checkDns("bad.test", resolverThrowing("SERVFAIL"));
    expect(r.status).toBe("down");
    expect(r.detail.code).toBe("SERVFAIL");
  });

  it("down on REFUSED", async () => {
    const r = await checkDns("bad.test", resolverThrowing("REFUSED"));
    expect(r.status).toBe("down");
    expect(r.detail.code).toBe("REFUSED");
  });

  it("down when answer is empty (no records)", async () => {
    const r = await checkDns("empty.test", { resolve4: async () => [] });
    expect(r.status).toBe("down");
    expect(r.detail.reason).toBe("no-answer");
  });
});
