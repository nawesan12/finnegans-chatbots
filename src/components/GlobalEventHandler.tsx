"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

const GlobalEventHandler = () => {
  const hasShownUnauthorizedRef = useRef(false);

  useEffect(() => {
    const handleUnauthorized = () => {
      if (hasShownUnauthorizedRef.current) {
        return;
      }

      hasShownUnauthorizedRef.current = true;
      toast.error(
        "Tu sesión expiró. Vuelve a iniciar sesión para continuar trabajando.",
      );

      window.setTimeout(() => {
        hasShownUnauthorizedRef.current = false;
      }, 1000);
    };

    window.addEventListener("auth:unauthorized", handleUnauthorized);

    return () => {
      window.removeEventListener("auth:unauthorized", handleUnauthorized);
    };
  }, []);

  return null;
};

export default GlobalEventHandler;
