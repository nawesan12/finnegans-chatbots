import { NextResponse } from "next/server";
import { getAuthPayload } from "@/lib/auth";
import prisma from "@/lib/prisma";

const MAX_RESULTS_PER_SECTION = 5;

export async function GET(request: Request) {
  const auth = getAuthPayload(request);

  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  if (!query) {
    return NextResponse.json({
      query: "",
      results: {
        flows: [],
        contacts: [],
        broadcasts: [],
        leads: [],
      },
    });
  }

  const [flows, contacts, broadcasts, leads] = await Promise.all([
    prisma.flow.findMany({
      where: {
        userId: auth.userId,
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { trigger: { contains: query, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        trigger: true,
        status: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
      take: MAX_RESULTS_PER_SECTION,
    }),
    prisma.contact.findMany({
      where: {
        userId: auth.userId,
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { phone: { contains: query, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        phone: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
      take: MAX_RESULTS_PER_SECTION,
    }),
    prisma.broadcast.findMany({
      where: {
        userId: auth.userId,
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { body: { contains: query, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        title: true,
        status: true,
        totalRecipients: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
      take: MAX_RESULTS_PER_SECTION,
    }),
    prisma.lead.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
          { company: { contains: query, mode: "insensitive" } },
          { message: { contains: query, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        company: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: MAX_RESULTS_PER_SECTION,
    }),
  ]);

  return NextResponse.json({
    query,
    results: {
      flows,
      contacts,
      broadcasts,
      leads,
    },
  });
}
