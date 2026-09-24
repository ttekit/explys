import { ConstellationService } from "./constellation.service";

describe("ConstellationService.getConstellationsForUser", () => {
  it("returns existing constellations when user already has them", async () => {
    const existing = [{ id: 1, name: "Travel English", stars: [] }];
    const prisma = {
      constellation: {
        findMany: jest.fn().mockResolvedValue(existing),
      },
    };
    const generator = {
      ensurePersonalConstellationForUser: jest.fn(),
    };
    const service = new ConstellationService(
      prisma as never,
      {} as never,
      generator as never,
    );

    const result = await service.getConstellationsForUser(10);
    expect(result).toEqual(existing);
    expect(generator.ensurePersonalConstellationForUser).not.toHaveBeenCalled();
  });

  it("auto-generates personal constellation when user has no constellations", async () => {
    const generated = [{ id: 2, name: "Survival English", stars: [] }];
    const prisma = {
      constellation: {
        findMany: jest
          .fn()
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce(generated),
      },
      additionalUserData: {
        findUnique: jest.fn().mockResolvedValue({ englishLevel: "B1" }),
      },
    };
    const generator = {
      ensurePersonalConstellationForUser: jest.fn().mockResolvedValue({}),
    };
    const service = new ConstellationService(
      prisma as never,
      {} as never,
      generator as never,
    );

    const result = await service.getConstellationsForUser(42);
    expect(generator.ensurePersonalConstellationForUser).toHaveBeenCalledWith(
      42,
      "B1",
    );
    expect(result).toEqual(generated);
  });
});
