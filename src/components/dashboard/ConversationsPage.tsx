"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  CheckCheck,
  MessageCircle,
  PhoneCall,
  Search,
  Send,
  Sparkles,
} from "lucide-react";

import PageHeader from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ConversationMessage {
  id: string;
  direction: "inbound" | "outbound";
  content: string;
  timestamp: string;
  channel: "whatsapp" | "sms" | "email";
  status?: "delivered" | "read" | "sent" | "failed";
}

interface ConversationSummary {
  id: string;
  contactName: string;
  contactPhone: string;
  channel: ConversationMessage["channel"];
  lastMessagePreview: string;
  lastMessageAt: string;
  unreadCount?: number;
  priority?: "vip" | "standard" | "pending";
  tags?: string[];
  messages: ConversationMessage[];
}

const initialConversations: ConversationSummary[] = [
  {
    id: "conv-1",
    contactName: "Julieta Fernández",
    contactPhone: "+54 9 11 4567-8901",
    channel: "whatsapp",
    lastMessagePreview: "Perfecto, agendemos la demo para el jueves a las 15 hs.",
    lastMessageAt: "2024-11-04T15:45:00Z",
    unreadCount: 2,
    priority: "vip",
    tags: ["Onboarding", "Prioritario"],
    messages: [
      {
        id: "msg-1",
        direction: "inbound",
        content: "Hola, necesito confirmar si recibieron la documentación que envié el viernes.",
        timestamp: "2024-11-04T14:10:00Z",
        channel: "whatsapp",
        status: "read",
      },
      {
        id: "msg-2",
        direction: "outbound",
        content: "¡Hola Julieta! Sí, la recibimos y ya la revisó el equipo legal. Solo nos queda coordinar la demo para mostrarte el flujo actualizado.",
        timestamp: "2024-11-04T14:18:00Z",
        channel: "whatsapp",
        status: "delivered",
      },
      {
        id: "msg-3",
        direction: "inbound",
        content: "Perfecto, agendemos la demo para el jueves a las 15 hs.",
        timestamp: "2024-11-04T15:45:00Z",
        channel: "whatsapp",
        status: "read",
      },
    ],
  },
  {
    id: "conv-2",
    contactName: "Ricardo López",
    contactPhone: "+54 9 351 555-1234",
    channel: "whatsapp",
    lastMessagePreview: "¿Tienen disponible la plantilla de conversación para retail?",
    lastMessageAt: "2024-11-04T12:30:00Z",
    unreadCount: 0,
    priority: "pending",
    tags: ["Retail"],
    messages: [
      {
        id: "msg-4",
        direction: "inbound",
        content: "¿Tienen disponible la plantilla de conversación para retail?",
        timestamp: "2024-11-04T12:30:00Z",
        channel: "whatsapp",
        status: "sent",
      },
      {
        id: "msg-5",
        direction: "outbound",
        content: "¡Hola Ricardo! Claro que sí, ahora te comparto el acceso y la documentación complementaria.",
        timestamp: "2024-11-04T12:36:00Z",
        channel: "whatsapp",
        status: "delivered",
      },
      {
        id: "msg-6",
        direction: "outbound",
        content: "Además, coordinemos un espacio el miércoles así revisamos juntos los indicadores clave para tu equipo.",
        timestamp: "2024-11-04T12:40:00Z",
        channel: "whatsapp",
        status: "delivered",
      },
    ],
  },
  {
    id: "conv-3",
    contactName: "Carolina Méndez",
    contactPhone: "+54 9 261 222-3344",
    channel: "email",
    lastMessagePreview: "Gracias por la actualización, mañana avanzo con la campaña.",
    lastMessageAt: "2024-11-03T19:05:00Z",
    unreadCount: 1,
    priority: "standard",
    tags: ["Marketing", "Seguimiento"],
    messages: [
      {
        id: "msg-7",
        direction: "outbound",
        content: "Carolina, te comparto el resumen de métricas y la propuesta de ajustes para tu campaña de retención.",
        timestamp: "2024-11-03T18:30:00Z",
        channel: "email",
        status: "delivered",
      },
      {
        id: "msg-8",
        direction: "inbound",
        content: "Gracias por la actualización, mañana avanzo con la campaña.",
        timestamp: "2024-11-03T19:05:00Z",
        channel: "email",
        status: "read",
      },
    ],
  },
];

const channelLabels: Record<ConversationMessage["channel"], string> = {
  whatsapp: "WhatsApp",
  sms: "SMS",
  email: "Email",
};

const statusLabels: Record<NonNullable<ConversationMessage["status"]>, string> = {
  delivered: "Entregado",
  read: "Leído",
  sent: "Enviado",
  failed: "Error",
};

const statusBadgeStyles: Record<
  NonNullable<ConversationSummary["priority"]>,
  string
> = {
  vip: "bg-amber-100 text-amber-700 border border-amber-200",
  pending: "bg-red-100 text-red-700 border border-red-200",
  standard: "bg-slate-100 text-slate-700 border border-slate-200",
};

const ConversationsPage = () => {
  const [conversations, setConversations] = useState(initialConversations);
  const [selectedConversationId, setSelectedConversationId] = useState(
    initialConversations[0]?.id ?? "",
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<"all" | "vip" | "pending" | "standard">(
    "all",
  );
  const [draftMessage, setDraftMessage] = useState("");

  const filteredConversations = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    return conversations.filter((conversation) => {
      const matchesFilter =
        filter === "all" || conversation.priority === filter;
      if (!matchesFilter) {
        return false;
      }

      if (!normalized) {
        return true;
      }

      const valuesToSearch = [
        conversation.contactName.toLowerCase(),
        conversation.contactPhone.toLowerCase(),
        conversation.lastMessagePreview.toLowerCase(),
        ...(conversation.tags?.map((tag) => tag.toLowerCase()) ?? []),
      ];

      return valuesToSearch.some((value) => value.includes(normalized));
    });
  }, [conversations, filter, searchTerm]);

  useEffect(() => {
    if (
      filteredConversations.length > 0 &&
      !filteredConversations.some(
        (conversation) => conversation.id === selectedConversationId,
      )
    ) {
      setSelectedConversationId(filteredConversations[0].id);
    }
  }, [filteredConversations, selectedConversationId]);

  const selectedConversation = useMemo(
    () =>
      conversations.find(
        (conversation) => conversation.id === selectedConversationId,
      ) ?? null,
    [conversations, selectedConversationId],
  );

  const timeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("es-AR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    [],
  );

  const dateTimeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("es-AR", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }),
    [],
  );

  const handleSendMessage = () => {
    const trimmed = draftMessage.trim();
    if (!trimmed || !selectedConversation) {
      return;
    }

    const newMessage: ConversationMessage = {
      id: `temp-${Date.now()}`,
      direction: "outbound",
      content: trimmed,
      timestamp: new Date().toISOString(),
      channel: selectedConversation.channel,
      status: "sent",
    };

    setConversations((previous) =>
      previous.map((conversation) => {
        if (conversation.id !== selectedConversation.id) {
          return conversation;
        }

        const updatedMessages = [...conversation.messages, newMessage];

        return {
          ...conversation,
          lastMessageAt: newMessage.timestamp,
          lastMessagePreview: trimmed,
          unreadCount: 0,
          messages: updatedMessages,
        };
      }),
    );
    setDraftMessage("");
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Bandeja de conversaciones"
        description="Centralizá los intercambios con tus contactos en un solo lugar. Visualizá el historial completo, detectá pendientes y respondé sin depender de la app de WhatsApp."
        actions={
          <Button variant="outline" className="gap-2">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Automatizar seguimiento
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[22rem,1fr] xl:grid-cols-[24rem,1fr]">
        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5 space-y-4">
            <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-2.5">
              <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar por nombre, teléfono o etiquetas"
                className="border-0 bg-transparent px-0 text-sm focus-visible:ring-0"
                aria-label="Buscar conversaciones"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {["all", "vip", "pending", "standard"].map((option) => {
                const labelMap: Record<string, string> = {
                  all: "Todas",
                  vip: "Prioritarias",
                  pending: "Pendientes",
                  standard: "Activas",
                };
                const isActive = filter === option;
                return (
                  <Button
                    key={option}
                    type="button"
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    onClick={() =>
                      setFilter(option as typeof filter)
                    }
                    className={cn(
                      "rounded-full",
                      isActive
                        ? "bg-[#4bc3fe] text-[#04102D] hover:bg-[#4bc3fe]/90"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50",
                    )}
                  >
                    {labelMap[option]}
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="max-h-[calc(100vh-18rem)] space-y-2 overflow-y-auto p-3">
            <AnimatePresence initial={false}>
              {filteredConversations.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500"
                >
                  No encontramos conversaciones con esos criterios. Ajustá los filtros
                  o iniciá un nuevo intercambio para verlo aquí.
                </motion.div>
              ) : (
                filteredConversations.map((conversation) => {
                  const isSelected = conversation.id === selectedConversationId;
                  const lastMessageDate = new Date(conversation.lastMessageAt);
                  return (
                    <motion.button
                      key={conversation.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      onClick={() => setSelectedConversationId(conversation.id)}
                      className={cn(
                        "w-full rounded-2xl border px-4 py-3 text-left transition-all",
                        "hover:border-[#4bc3fe]/60 hover:bg-[#eaf7ff]",
                        isSelected
                          ? "border-[#4bc3fe] bg-[#eaf7ff] shadow-sm"
                          : "border-transparent bg-white",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {conversation.contactName}
                          </p>
                          <p className="text-xs text-slate-500">
                            {conversation.contactPhone}
                          </p>
                        </div>
                        <span className="text-xs text-slate-400">
                          {timeFormatter.format(lastMessageDate)}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge
                          variant="secondary"
                          className="rounded-full bg-slate-100 text-xs text-slate-600"
                        >
                          {channelLabels[conversation.channel]}
                        </Badge>
                        {conversation.priority && (
                          <span
                            className={cn(
                              "rounded-full px-3 py-1 text-[0.65rem] font-semibold capitalize",
                              statusBadgeStyles[conversation.priority],
                            )}
                          >
                            {conversation.priority === "vip"
                              ? "Cliente prioritario"
                              : conversation.priority === "pending"
                                ? "Respuesta pendiente"
                                : "En seguimiento"}
                          </span>
                        )}
                        {conversation.unreadCount ? (
                          <span className="ml-auto rounded-full bg-[#04102D] px-2.5 py-0.5 text-xs font-semibold text-white">
                            {conversation.unreadCount}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-3 line-clamp-2 text-sm text-slate-600">
                        {conversation.lastMessagePreview}
                      </p>
                      {conversation.tags && conversation.tags.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {conversation.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[0.65rem] font-medium text-slate-500"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </motion.button>
                  );
                })
              )}
            </AnimatePresence>
          </div>
        </section>

        <section className="flex h-full flex-col rounded-3xl border border-slate-200 bg-white shadow-sm">
          {selectedConversation ? (
            <>
              <div className="flex items-center justify-between border-b border-slate-100 p-5">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    {selectedConversation.contactName}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {selectedConversation.contactPhone} · {channelLabels[selectedConversation.channel]}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="gap-2">
                    <PhoneCall className="h-4 w-4" aria-hidden="true" />
                    Llamar
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    className="gap-2 bg-[#4bc3fe] text-[#04102D] hover:bg-[#4bc3fe]/90"
                  >
                    <MessageCircle className="h-4 w-4" aria-hidden="true" />
                    Continuar en flujo
                  </Button>
                </div>
              </div>

              <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
                <div className="flex justify-center">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Historial completo
                  </span>
                </div>
                <div className="space-y-4">
                  {selectedConversation.messages.map((message) => {
                    const isOutbound = message.direction === "outbound";
                    const messageDate = new Date(message.timestamp);
                    return (
                      <div
                        key={message.id}
                        className={cn(
                          "flex w-full",
                          isOutbound ? "justify-end" : "justify-start",
                        )}
                      >
                        <motion.div
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                          className={cn(
                            "max-w-xl rounded-2xl px-4 py-3 shadow-sm",
                            isOutbound
                              ? "bg-[#4bc3fe] text-[#04102D]"
                              : "bg-slate-100 text-slate-700",
                          )}
                        >
                          <p className="text-sm leading-relaxed">{message.content}</p>
                          <div className="mt-3 flex items-center justify-end gap-2 text-[0.65rem] uppercase tracking-wide">
                            <span>
                              {dateTimeFormatter.format(messageDate)}
                            </span>
                            {message.status ? (
                              <span className="flex items-center gap-1">
                                <CheckCheck className="h-3 w-3" aria-hidden="true" />
                                {statusLabels[message.status]}
                              </span>
                            ) : null}
                          </div>
                        </motion.div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-slate-100 p-6">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-inner">
                  <div className="flex items-start gap-4">
                    <Textarea
                      value={draftMessage}
                      onChange={(event) => setDraftMessage(event.target.value)}
                      placeholder="Escribí tu respuesta..."
                      className="min-h-[96px] resize-none border-0 bg-transparent px-0 text-sm focus-visible:ring-0"
                      aria-label="Responder mensaje"
                    />
                    <Button
                      type="button"
                      onClick={handleSendMessage}
                      disabled={!draftMessage.trim()}
                      className="mt-1 flex h-10 items-center gap-2 self-start rounded-full bg-[#4bc3fe] px-5 text-sm font-semibold text-[#04102D] transition hover:bg-[#4bc3fe]/90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Enviar
                      <Send className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                      Programá respuestas automáticas o dispará un flujo desde aquí.
                    </span>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 font-semibold text-[#4bc3fe] transition hover:text-[#04102D]"
                    >
                      Ver recomendaciones
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-6 p-10 text-center">
              <div className="space-y-3">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#eaf7ff]">
                  <MessageCircle className="h-7 w-7 text-[#4bc3fe]" aria-hidden="true" />
                </div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Seleccioná una conversación para comenzar
                </h2>
                <p className="text-sm text-slate-500">
                  Filtrá por etiquetas, buscá por nombre o iniciá un nuevo contacto.
                  Todo el historial queda disponible para tu equipo.
                </p>
              </div>
              <Button className="gap-2 bg-[#4bc3fe] text-[#04102D] hover:bg-[#4bc3fe]/90">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                Crear conversación
              </Button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default ConversationsPage;
