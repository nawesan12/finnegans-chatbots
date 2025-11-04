import {
  createMetaTemplate,
  deleteMetaTemplate,
  MetaTemplateError,
} from "@/lib/meta-templates";
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
  // @ts-expect-error restore
  global.fetch = originalFetch;
});

beforeEach(() => {
  fetchMock.mockReset();
  prismaMock.user.findUnique.mockReset();
});

describe("Meta templates client", () => {
  const userId = "user-42";

  it("creates a new template and returns identifiers", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      metaAccessToken: " token ",
      metaBusinessAccountId: " 112233 ",
    });

    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () => JSON.stringify({ id: "tmpl_1" }),
    } as Response);

    const result = await createMetaTemplate(userId, {
      name: "welcome_message",
      category: "marketing",
      language: " es-ar ",
      components: [
        {
          type: "body",
          text: "Hello {{1}}",
          example: { body_text: [["Hi there"]] },
        },
        {
          type: "buttons",
          buttons: [{ type: "quick_reply", text: "Yes" }],
        },
      ],
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("112233/message_templates");
    expect(init?.method).toBe("POST");
    expect(init?.headers).toMatchObject({
      Authorization: expect.stringContaining("token"),
      "Content-Type": "application/json",
    });
    expect(JSON.parse(String(init?.body))).toEqual({
      name: "welcome_message",
      category: "MARKETING",
      language: "es_AR",
      components: [
        { type: "BODY", text: "Hello {{1}}", example: { body_text: [["Hi there"]] } },
        {
          type: "BUTTONS",
          buttons: [{ type: "QUICK_REPLY", text: "Yes" }],
        },
      ],
    });
    expect(result).toEqual({ id: "tmpl_1", raw: { id: "tmpl_1" } });
  });

  it("propagates Graph errors with normalized message", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      metaAccessToken: "token",
      metaBusinessAccountId: "9988",
    });

    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      text: async () =>
        JSON.stringify({
          error: { message: "Generic", error_user_msg: "Invalid component" },
        }),
    } as Response);

    await expect(
      createMetaTemplate(userId, {
        name: "bad",
        category: "utility",
        language: "en_US",
      }),
    ).rejects.toMatchObject<Partial<MetaTemplateError>>({
      status: 400,
      message: "Invalid component",
    });
  });

  it("fails when credentials are missing", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      metaAccessToken: null,
      metaBusinessAccountId: null,
    });

    await expect(
      createMetaTemplate(userId, {
        name: "no_creds",
        category: "marketing",
        language: "en_US",
      }),
    ).rejects.toMatchObject<Partial<MetaTemplateError>>({ status: 400 });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("deletes a template via Graph API", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      metaAccessToken: "token",
      metaBusinessAccountId: "5544",
    });

    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () => JSON.stringify({ success: true }),
    } as Response);

    await deleteMetaTemplate(userId, "tmpl_9");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("tmpl_9");
    expect(init?.method).toBe("DELETE");
  });
});
