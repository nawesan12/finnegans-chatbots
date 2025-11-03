import { formatAbsoluteTime } from "@/lib/conversations/formatters";
import type { ConversationSummary } from "@/lib/conversations/types";

function getLastMessage(
  conversation: ConversationSummary,
  direction: "in" | "out",
) {
  return (
    conversation.messages
      .slice()
      .reverse()
      .find((message) => message.direction === direction) ?? null
  );
}

export function generateQuickReplies(
  conversation: ConversationSummary,
): string[] {
  const suggestions = new Set<string>();

  const baseGreeting = conversation.contactName
    ? `Hola ${conversation.contactName}, soy parte del equipo de Finnegans.`
    : `Hola ${conversation.contactPhone}, soy parte del equipo de Finnegans.`;

  suggestions.add(baseGreeting);
  suggestions.add(
    "Gracias por tu mensaje, estoy revisando tu consulta y te respondo enseguida.",
  );
  suggestions.add("¿Hay algo más en lo que pueda ayudarte?");

  conversation.flows.forEach((flow) => {
    suggestions.add(
      `Gracias por seguir el flujo "${flow.name}". Si necesitás asistencia adicional, estoy disponible para ayudarte.`,
    );
  });

  const lastInboundMessage = getLastMessage(conversation, "in");
  if (lastInboundMessage?.text) {
    suggestions.add(
      `Recibimos tu último mensaje: "${lastInboundMessage.text.slice(0, 80)}". ¿Podrías brindarme más detalles?`,
    );
  }

  const firstInteraction = conversation.messages[0];
  if (firstInteraction) {
    suggestions.add(
      `Vimos que la conversación inició el ${formatAbsoluteTime(firstInteraction.timestamp)}. ¿Seguimos en contacto?`,
    );
  }

  return Array.from(suggestions);
}
