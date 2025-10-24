import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";

export async function DELETE(
  request: NextRequest,
  context: { params?: Promise<{ id: string }> },
) {
  const auth = getAuthPayload(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = context.params ? await context.params : undefined;
  const attendeeId = params?.id;

  if (!attendeeId) {
    return NextResponse.json(
      { error: "Attendee ID is required" },
      { status: 400 },
    );
  }

  const attendee = await prisma.broadcastRecipient.findFirst({
    where: {
      id: attendeeId,
      broadcast: {
        userId: auth.userId,
      },
    },
  });

  if (!attendee) {
    return NextResponse.json(
      { error: "Attendee not found" },
      { status: 404 },
    );
  }

  try {
    await prisma.broadcastRecipient.delete({
      where: { id: attendee.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete attendee", error);

    return NextResponse.json(
      { error: "Unable to delete attendee" },
      { status: 500 },
    );
  }
}
