import { describe, expect, it } from "vitest";
import { getTeamService } from "../service";

describe("getTeamService", () => {
  it("returns mock teams for any user id", async () => {
    const teams = await getTeamService().listTeamsForUser("any");
    expect(teams.length).toBeGreaterThanOrEqual(1);
    expect(teams[0]).toMatchObject({ id: "team_1", slug: "acme" });
  });
});
