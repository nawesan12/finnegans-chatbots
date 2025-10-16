import { NextRequest, NextResponse } from "next/server";

import { getAuthPayload } from "@/lib/auth";
import { fetchConversationByContactId } from "@/server/conversations";

interface Params {
  contactId: string;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<Params> },
) {
  const auth = getAuthPayload(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { contactId } = await context.params;

  try {
    const conversation = await fetchConversationByContactId(
      auth.userId,
      contactId,
    );

    if (!conversation) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    return NextResponse.json({ conversation });
  } catch (error) {
    console.error(
      `Error fetching conversation ${contactId}:`,
      error,
    );
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
