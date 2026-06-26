import { checkEmailDns } from "./email-dns.js";

const healthy = {
  resolveMx: async () => [{ exchange: "aspmx.l.google.com", priority: 1 }],
  resolveTxt: async (name: string) =>
    name.startsWith("google._domainkey")
      ? [["v=DKIM1; k=rsa; p=ABC"]]
      : [["v=spf1 include:_spf.google.com ~all"]],
};

describe("checkEmailDns", () => {
  it("up when MX + SPF + DKIM all present", async () => {
    const r = await checkEmailDns("x.test", { dkimSelector: "google", resolver: healthy });
    expect(r.status).toBe("up");
  });

  it("down when MX missing", async () => {
    const r = await checkEmailDns("x.test", {
      dkimSelector: "google",
      resolver: { ...healthy, resolveMx: async () => [] },
    });
    expect(r.status).toBe("down");
    expect(r.detail.mx).toBe(false);
  });

  it("degraded when SPF missing", async () => {
    const r = await checkEmailDns("x.test", {
      dkimSelector: "google",
      resolver: {
        ...healthy,
        resolveTxt: async (n: string) =>
          n.startsWith("google._domainkey") ? [["v=DKIM1; p=ABC"]] : [["unrelated"]],
      },
    });
    expect(r.status).toBe("degraded");
    expect(r.detail.spf).toBe(false);
  });

  it("degraded when DKIM missing", async () => {
    const r = await checkEmailDns("x.test", {
      dkimSelector: "google",
      resolver: {
        ...healthy,
        resolveTxt: async (n: string) =>
          n.startsWith("google._domainkey") ? [] : [["v=spf1 ~all"]],
      },
    });
    expect(r.status).toBe("degraded");
    expect(r.detail.dkim).toBe(false);
  });
});
