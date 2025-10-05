import { GET } from "../route";
import prisma from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";
import { formatLeadsAsCsv } from "@/lib/leads";

jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    lead: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock("@/lib/auth", () => {
  const actual = jest.requireActual("@/lib/auth");
  return {
    ...actual,
    getAuthPayload: jest.fn(),
  };
});

jest.mock("@/lib/leads", () => {
  const actual = jest.requireActual("@/lib/leads");
  return {
    ...actual,
    formatLeadsAsCsv: jest.fn(() => "csv-data"),
  };
});

const prismaMock = prisma as unknown as {
  lead: { findMany: jest.Mock };
};

const getAuthPayloadMock = getAuthPayload as jest.Mock;
const formatLeadsAsCsvMock = formatLeadsAsCsv as jest.Mock;

describe("GET /api/leads/export", () => {
  beforeEach(() => {
    prismaMock.lead.findMany.mockReset();
    getAuthPayloadMock.mockReset();
    formatLeadsAsCsvMock.mockClear();
  });

  it("rejects unknown focus areas", async () => {
    getAuthPayloadMock.mockReturnValue({ userId: "user-1" });

    const response = await GET(
      new Request("https://app.example.com/api/leads/export?focusArea=unknown"),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "La necesidad principal no es válida.",
    });
    expect(prismaMock.lead.findMany).not.toHaveBeenCalled();
  });

  it("filters exported leads by focus area", async () => {
    getAuthPayloadMock.mockReturnValue({ userId: "user-1" });
    const now = new Date();
    prismaMock.lead.findMany.mockResolvedValue([
      {
        id: "lead-1",
        name: "Ana",
        email: "ana@example.com",
        company: "Acme",
        phone: "+5491100000000",
        status: "new",
        focusArea: "sales",
        message: "Necesitamos automatizar ventas",
        notes: null,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    const response = await GET(
      new Request("https://app.example.com/api/leads/export?focusArea=sales"),
    );

    expect(prismaMock.lead.findMany).toHaveBeenCalledWith({
      where: { focusArea: "sales" },
      orderBy: { createdAt: "desc" },
    });
    expect(formatLeadsAsCsvMock).toHaveBeenCalledWith([
      expect.objectContaining({ focusArea: "sales" }),
    ]);
    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe("csv-data");
  });
});

