"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";

interface Message {
  id: string;
  waMessageId?: string | null;
  direction: string;
  type: string;
  content: string | null;
  payload?: unknown;
  status: string;
  createdAt: string;
  contactId: string;
}

interface MessageNewEvent {
  message: Message;
  contactId: string;
}

interface MessageStatusEvent {
  messageId: string;
  waMessageId: string;
  status: string;
  contactId: string;
}

interface TypingEvent {
  contactId: string;
}

interface UseConversationSocketOptions {
  contactId: string | null;
  onMessageNew?: (message: Message) => void;
  onMessageStatus?: (event: MessageStatusEvent) => void;
  onTypingStart?: () => void;
  onTypingStop?: () => void;
  enabled?: boolean;
}

export function useConversationSocket({
  contactId,
  onMessageNew,
  onMessageStatus,
  onTypingStart,
  onTypingStop,
  enabled = true,
}: UseConversationSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
      setIsConnecting(false);
    }
  }, []);

  useEffect(() => {
    // Don't connect if disabled or no contact ID
    if (!enabled || !contactId) {
      disconnect();
      return;
    }

    // Get WebSocket URL from environment variable
    const wsUrl = process.env.NEXT_PUBLIC_WEBHOOK_WS_URL;

    if (!wsUrl) {
      console.warn("NEXT_PUBLIC_WEBHOOK_WS_URL not configured - WebSocket disabled");
      return;
    }

    setIsConnecting(true);

    // Create socket connection
    const socket = io(wsUrl, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    // Connection event handlers
    socket.on("connect", () => {
      console.log("WebSocket connected");
      setIsConnected(true);
      setIsConnecting(false);

      // Join the conversation room
      socket.emit("join:conversation", contactId);
    });

    socket.on("disconnect", () => {
      console.log("WebSocket disconnected");
      setIsConnected(false);
    });

    socket.on("connect_error", (error) => {
      console.error("WebSocket connection error:", error);
      setIsConnecting(false);
    });

    // Message event handlers
    socket.on("message:new", (event: MessageNewEvent) => {
      if (event.contactId === contactId && onMessageNew) {
        onMessageNew(event.message);
      }
    });

    socket.on("message:status", (event: MessageStatusEvent) => {
      if (event.contactId === contactId && onMessageStatus) {
        onMessageStatus(event);
      }
    });

    socket.on("typing:start", (event: TypingEvent) => {
      if (event.contactId === contactId && onTypingStart) {
        onTypingStart();
      }
    });

    socket.on("typing:stop", (event: TypingEvent) => {
      if (event.contactId === contactId && onTypingStop) {
        onTypingStop();
      }
    });

    // Cleanup on unmount or contactId change
    return () => {
      if (socket) {
        socket.emit("leave:conversation", contactId);
        socket.disconnect();
      }
      socketRef.current = null;
      setIsConnected(false);
      setIsConnecting(false);
    };
  }, [contactId, enabled, onMessageNew, onMessageStatus, onTypingStart, onTypingStop, disconnect]);

  return {
    isConnected,
    isConnecting,
    disconnect,
  };
}
