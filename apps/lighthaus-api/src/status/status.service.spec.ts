import { jest } from "@jest/globals";
import type { MonitorRepository } from "../persistence/monitor.repository";
import { StatusService } from "./status.service";

type RepoMock = {
  clientIdsForUser: jest.Mock;
  listForViewer: jest.Mock;
  getLastResult: jest.Mock;
  uptime: jest.Mock;
  getOpenIncident: jest.Mock;
};

function makeRepo(
  monitors: { id: string; name: string; type: string; group: string; clientId: string | null }[],
): {
  repo: RepoMock;
  service: StatusService;
} {
  const repo: RepoMock = {
    clientIdsForUser: jest.fn(async () => ["c1"]),
    listForViewer: jest.fn(async () => monitors),
    getLastResult: jest.fn(async () => ({
      status: "up",
      checkedAt: new Date("2026-06-26T00:00:00Z"),
    })),
    uptime: jest.fn(async () => 99),
    getOpenIncident: jest.fn(async () => null),
  };
  return { repo, service: new StatusService(repo as unknown as MonitorRepository) };
}

describe("StatusService.boardFor", () => {
  it("staff: queries listForViewer with isStaff true and groups all monitors", async () => {
    const { repo, service } = makeRepo([
      { id: "a", name: "onehealthclinics.com", type: "http", group: "client-site", clientId: "c1" },
      {
        id: "s",
        name: "sitehaus-api",
        type: "service_health",
        group: "sh-service",
        clientId: null,
      },
    ]);

    const board = await service.boardFor({ userId: "u1", isStaff: true });

    expect(repo.clientIdsForUser).not.toHaveBeenCalled();
    expect(repo.listForViewer).toHaveBeenCalledWith({ isStaff: true, clientIds: [] });
    expect(board.groups.map((g) => g.group)).toEqual(["client-site", "sh-service"]);
  });

  it("client: resolves their clientIds and scopes listForViewer", async () => {
    const { repo, service } = makeRepo([
      { id: "a", name: "onehealthclinics.com", type: "http", group: "client-site", clientId: "c1" },
    ]);

    const board = await service.boardFor({ userId: "u2", isStaff: false });

    expect(repo.clientIdsForUser).toHaveBeenCalledWith("u2");
    expect(repo.listForViewer).toHaveBeenCalledWith({ isStaff: false, clientIds: ["c1"] });
    expect(board.groups).toHaveLength(1);
    expect(board.groups[0].monitors[0]).toMatchObject({
      name: "onehealthclinics.com",
      uptime90d: 99,
    });
  });
});
