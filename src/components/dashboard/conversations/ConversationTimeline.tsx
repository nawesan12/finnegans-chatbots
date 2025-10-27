"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, MessageCircle } from "lucide-react";

import { toast } from "sonner";

import { cn } from "@/lib/utils";
import {
  formatAbsoluteTime,
  formatMessageDay,
} from "@/lib/conversations/formatters";
import type { ConversationMessage } from "@/lib/conversations/types";
import { Button } from "@/components/ui/button";

interface ConversationTimelineProps {
  messages: ConversationMessage[];
}

const ConversationTimeline: React.FC<ConversationTimelineProps> = ({
  messages,
}) => {
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const isFirstRenderRef = useRef(true);

  useEffect(() => {
    if (!bottomRef.current) {
      return;
    }

    const behavior = isFirstRenderRef.current ? "auto" : "smooth";
    bottomRef.current.scrollIntoView({ behavior, block: "end" });
    isFirstRenderRef.current = false;
  }, [messages]);

  useEffect(() => {
    if (!copiedMessageId) {
      return;
    }

    const timer = window.setTimeout(() => {
      setCopiedMessageId(null);
    }, 2000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [copiedMessageId]);

  useEffect(() => {
    if (!copiedMessageId) {
      return;
    }

    const exists = messages.some((message) => message.id === copiedMessageId);
    if (!exists) {
      setCopiedMessageId(null);
    }
  }, [copiedMessageId, messages]);

  const sortedMessages = useMemo(() => {
    return [...messages].sort((first, second) => {
      const firstTime = new Date(first.timestamp).getTime();
      const secondTime = new Date(second.timestamp).getTime();
      if (Number.isNaN(firstTime) || Number.isNaN(secondTime)) {
        return 0;
      }
      return firstTime - secondTime;
    });
  }, [messages]);

  const handleCopyMessage = useCallback(async (message: ConversationMessage) => {
    try {
      await navigator.clipboard.writeText(message.text);
      setCopiedMessageId(message.id);
      toast.success("Mensaje copiado");
    } catch (error) {
      toast.error("No pudimos copiar el mensaje");
      console.error(error);
    }
  }, []);

  if (!sortedMessages.length) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-slate-500">
        <MessageCircle className="h-8 w-8 text-slate-400" aria-hidden="true" />
        <p className="text-sm">
          Aún no hay mensajes registrados en esta conversación.
        </p>
      </div>
    );
  }

  const groups = sortedMessages.reduce(
    (accumulator, message) => {
      const label = formatMessageDay(message.timestamp);
      const current = accumulator.get(label) ?? [];
      current.push(message);
      accumulator.set(label, current);
      return accumulator;
    },
    new Map<string, ConversationMessage[]>(),
  );

  const renderMessage = (message: ConversationMessage) => {
    const timestamp = formatAbsoluteTime(message.timestamp);
    const metadata = Array.from(new Set(message.metadata)).filter(Boolean);
    const isCopied = copiedMessageId === message.id;

    return (
      <div
        key={message.id}
        className={cn(
          "flex",
          message.direction === "out" && "justify-end",
          message.direction === "system" && "justify-center",
        )}
      >
        <div
          className={cn(
            "group relative max-w-[80%] rounded-2xl border px-4 py-3 text-sm shadow-sm transition-colors",
            message.direction === "in" &&
              "border-slate-200 bg-white text-slate-900",
            message.direction === "out" &&
              "border-transparent bg-[#04102D] text-white",
            message.direction === "system" &&
              "border-slate-200 bg-slate-100 text-slate-700",
          )}
        >
          <div
            className={cn(
              "absolute -top-3 right-2 hidden gap-2 rounded-full border border-slate-200 bg-white/90 p-1 text-xs text-slate-500 shadow-sm transition-opacity group-hover:flex",
              message.direction === "out" && "border-[#04102D]/40 bg-[#04102D]/90 text-white",
              "group-focus-within:flex",
            )}
          >
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-7 w-7 rounded-full text-current",
                message.direction === "out"
                  ? "hover:bg-white/10 focus-visible:bg-white/20"
                  : "hover:bg-slate-100 focus-visible:bg-slate-100",
              )}
              onClick={() => handleCopyMessage(message)}
              aria-label={isCopied ? "Mensaje copiado" : "Copiar mensaje"}
            >
              {isCopied ? (
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              )}
            </Button>
          </div>
          <p className="whitespace-pre-wrap break-words leading-relaxed">
            {message.text}
          </p>
          {metadata.length > 0 ? (
            <ul className="mt-2 space-y-1 text-xs text-slate-500">
              {metadata.map((entry) => (
                <li key={entry} className="flex items-center gap-2">
                  <span className="inline-flex h-1.5 w-1.5 rounded-full bg-slate-400" />
                  <span className="break-words text-left">{entry}</span>
                </li>
              ))}
            </ul>
          ) : null}
          <span
            className={cn(
              "mt-2 block text-[0.65rem] uppercase tracking-wider",
              message.direction === "out" ? "text-white/70" : "text-slate-400",
            )}
          >
            {timestamp}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {Array.from(groups.entries()).map(([label, entries]) => (
        <div key={label} className="space-y-3">
          <div className="sticky top-0 z-10 flex items-center justify-center">
            <span className="inline-flex items-center rounded-full bg-white/80 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500 shadow-sm">
              {label}
            </span>
          </div>
          <div className="space-y-4">
            {entries.map((message) => renderMessage(message))}
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
};

export default ConversationTimeline;
