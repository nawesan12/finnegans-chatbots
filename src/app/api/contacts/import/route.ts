import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { getAuthPayload } from "@/lib/auth";
import prisma from "@/lib/prisma";

const importContactSchema = z.object({
  name: z
    .string()
    .optional()
    .transform((value) => {
      if (typeof value !== "string") {
        return null;
      }
      const trimmed = value.trim();
      return trimmed.length ? trimmed : null;
    }),
  phone: z
    .string({ required_error: "Phone number is required" })
    .min(1, "Phone number is required")
    .transform((value) => value.trim()),
  tags: z
    .array(z.string())
    .optional()
    .transform((tags) => {
      if (!Array.isArray(tags)) {
        return [];
      }
      return Array.from(
        new Set(
          tags
            .map((tag) => tag.trim())
            .filter((tagName) => tagName.length > 0),
        ),
      );
    }),
});

const importPayloadSchema = z.object({
  contacts: z.array(importContactSchema),
});

const normalizePhoneKey = (value: string) =>
  value.replace(/[\s-()]/g, "").toLowerCase();

export async function POST(request: Request) {
  const auth = getAuthPayload(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch (error) {
    console.error("Failed to parse import payload", error);
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = importPayloadSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid payload",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const duplicatesInPayload: string[] = [];
  const uniqueContacts: Array<{
    name: string | null;
    phone: string;
    tags: string[];
  }> = [];
  const seenPhones = new Set<string>();

  for (const contact of parsed.data.contacts) {
    const normalizedPhone = normalizePhoneKey(contact.phone);

    if (!normalizedPhone) {
      duplicatesInPayload.push(contact.phone);
      continue;
    }

    if (seenPhones.has(normalizedPhone)) {
      duplicatesInPayload.push(contact.phone);
      continue;
    }

    seenPhones.add(normalizedPhone);
    uniqueContacts.push({
      name: contact.name ?? null,
      phone: contact.phone,
      tags: contact.tags ?? [],
    });
  }

  if (!uniqueContacts.length) {
    return NextResponse.json(
      {
        error: "No valid contacts found in payload",
        duplicates: { inFile: duplicatesInPayload, existing: [] },
        failures: [],
      },
      { status: 400 },
    );
  }

  const transactionResult = await prisma.$transaction(async (tx) => {
    const summary = {
      imported: 0,
      existingDuplicates: [] as string[],
      failures: [] as { phone: string; reason: string }[],
    };

    for (const contact of uniqueContacts) {
      try {
        await tx.contact.create({
          data: {
            name: contact.name,
            phone: contact.phone,
            user: { connect: { id: auth.userId } },
            tags:
              contact.tags.length > 0
                ? {
                    create: contact.tags.map((tag) => ({
                      tag: {
                        connectOrCreate: {
                          where: { name: tag } satisfies Prisma.TagWhereUniqueInput,
                          create: { name: tag },
                        },
                      },
                    })),
                  }
                : undefined,
          },
        });

        summary.imported += 1;
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          summary.existingDuplicates.push(contact.phone);
          continue;
        }

        console.error("Unexpected error importing contact", error);
        summary.failures.push({ phone: contact.phone, reason: "unexpected_error" });
      }
    }

    return summary;
  });

  const responseBody = {
    total: uniqueContacts.length,
    imported: transactionResult.imported,
    duplicates: {
      inFile: duplicatesInPayload,
      existing: Array.from(new Set(transactionResult.existingDuplicates)),
    },
    failures: transactionResult.failures,
  };

  const status = transactionResult.imported > 0 ? 201 : 200;

  return NextResponse.json(responseBody, { status });
}
