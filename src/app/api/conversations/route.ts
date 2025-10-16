import { NextResponse } from "next/server";

import { getAuthPayload } from "@/lib/auth";
import { fetchConversationSummariesForUser } from "@/server/conversations";

export async function GET(request: Request) {
  const auth = getAuthPayload(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const conversations = await fetchConversationSummariesForUser(auth.userId, {
      take: 60,
    });
    return NextResponse.json({ conversations });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
