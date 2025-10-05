import { createMetaFlow, deleteMetaFlow, MetaFlowError, updateMetaFlow } from "@/lib/meta-flow";
import prisma from "@/lib/prisma";

type PrismaMock = {
  user: {
    findUnique: jest.Mock;
  };
};

jest.mock("@/lib/prisma", () => {
  const user = { findUnique: jest.fn() };
  return {
    __esModule: true,
    default: { user },
  };
});

const prismaMock = prisma as unknown as PrismaMock;

const originalFetch = global.fetch;
const fetchMock = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>();

beforeAll(() => {
  // @ts-expect-error override for testing
  global.fetch = fetchMock;
});

afterAll(() => {
  // @ts-expect-error restore original fetch
  global.fetch = originalFetch;
});

beforeEach(() => {
  fetchMock.mockReset();
  prismaMock.user.findUnique.mockReset();
});

describe("Meta Flow client", () => {
  const userId = "user-123";

  it("creates a remote flow and returns identifiers", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      metaAccessToken: " access ",
      metaBusinessAccountId: " 987654 ",
    });

    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () =>
        JSON.stringify({
          id: "mf_1",
          flow_token: "token_1",
          flow_version: "5",
          revision_id: "rev_1",
          status: "ACTIVE",
        }),
    } as Response);

    const result = await createMetaFlow(userId, {
      name: "Onboarding",
      definition: { nodes: [], edges: [] },
      status: "Draft",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("987654/flows");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({
      name: "Onboarding",
      flow_json: { nodes: [], edges: [] },
      status: "DRAFT",
    });

    expect(result).toEqual({
      id: "mf_1",
      token: "token_1",
      version: "5",
      revisionId: "rev_1",
      status: "ACTIVE",
      raw: {
        id: "mf_1",
        flow_token: "token_1",
        flow_version: "5",
        revision_id: "rev_1",
        status: "ACTIVE",
      },
    });
  });

  it("propagates Graph errors with normalized message", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      metaAccessToken: "token",
      metaBusinessAccountId: "555",
    });

    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      text: async () =>
        JSON.stringify({
          error: { message: "Generic", error_user_msg: "Custom message" },
        }),
    } as Response);

    await expect(
      createMetaFlow(userId, {
        name: "Broken",
        definition: null,
        status: "draft",
      }),
    ).rejects.toMatchObject<Partial<MetaFlowError>>({
      status: 400,
      message: "Custom message",
    });
  });

  it("fails when Meta credentials are missing", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      metaAccessToken: null,
      metaBusinessAccountId: null,
    });

    await expect(
      createMetaFlow(userId, {
        name: "No creds",
        definition: {},
        status: "draft",
      }),
    ).rejects.toMatchObject<Partial<MetaFlowError>>({
      status: 400,
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("updates existing flow using PUT", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      metaAccessToken: "token",
      metaBusinessAccountId: "555",
    });

    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () => JSON.stringify({ id: "mf_1", token: "tok" }),
    } as Response);

    const result = await updateMetaFlow(userId, "mf_1", {
      name: "Updated",
      definition: { foo: "bar" },
      status: "active",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    expect(init?.method).toBe("PUT");
    expect(JSON.parse(String(init?.body))).toEqual({
      name: "Updated",
      flow_json: { foo: "bar" },
      status: "ACTIVE",
      id: "mf_1",
    });
    expect(result.id).toBe("mf_1");
  });

  it("deletes remote flow with DELETE", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      metaAccessToken: "token",
      metaBusinessAccountId: "555",
    });

    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () => "{}",
    } as Response);

    await deleteMetaFlow(userId, "remote-1");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    expect(init?.method).toBe("DELETE");
    expect(JSON.parse(String(init?.body))).toEqual({ id: "remote-1" });
  });
});
