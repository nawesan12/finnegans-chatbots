import Link from "next/link";
import { ArrowUpRight, Linkedin, Youtube } from "lucide-react";

import { cn } from "@/lib/utils";

const navigationSections = [
  {
    title: "Producto",
    items: [
      { label: "Soluciones", href: "#soluciones" },
      { label: "Alianzas", href: "#alianzas" },
      { label: "Equipo", href: "#equipo" },
      { label: "Casos", href: "#casos" },
      { label: "Testimonios", href: "#testimonios" },
      { label: "Implementación", href: "#implementacion" },
    ],
  },
  {
    title: "Recursos",
    items: [
      { label: "Playbook", href: "https://finnegans.com/recursos/playbook-automatizacion" },
      { label: "WhatsApp Cloud", href: "https://finnegans.com/recursos/whatsapp-cloud" },
      { label: "Ayuda", href: "https://finnegans.com/ayuda" },
      { label: "Novedades", href: "https://finnegans.com/blog" },
    ],
  },
  {
    title: "Plataforma",
    items: [
      { label: "Ingresar", href: "/login" },
      { label: "Solicitar demo", href: "/register" },
      { label: "API", href: "https://finnegans.com/desarrolladores" },
      { label: "Estado del servicio", href: "https://status.finnegans.com" },
    ],
  },
] as const;

const legalLinks = [
  {
    label: "Privacidad",
    href: "https://finnegans.com/legales/privacidad",
  },
  {
    label: "Términos",
    href: "https://finnegans.com/legales/terminos",
  },
  {
    label: "Seguridad",
    href: "https://finnegans.com/seguridad",
  },
] as const;

const socialLinks = [
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/company/finnegans/",
    icon: Linkedin,
  },
  {
    label: "YouTube",
    href: "https://www.youtube.com/@FinnegansLatam",
    icon: Youtube,
  },
] as const;

type MarketingFooterProps = {
  className?: string;
  variant?: "light" | "dark";
};

export function MarketingFooter({
  className,
  variant = "light",
}: MarketingFooterProps) {
  const isDark = variant === "dark";
  const rootClasses = isDark
    ? "border-t border-white/10 bg-[#04102D] text-white"
    : "border-t border-[#04102D]/10 bg-[#04102D]/5 text-[#04102D]";
  const mutedClass = isDark ? "text-white/70" : "text-[#04102D]/70";
  const subtleClass = isDark ? "text-white/60" : "text-[#04102D]/60";
  const linkClass = isDark
    ? "text-white/80 transition hover:text-white"
    : "text-[#04102D]/70 transition hover:text-[#04102D]";
  const badgeClass = isDark
    ? "bg-white/5 text-white/80"
    : "bg-white text-[#04102D]/70";

  return (
    <footer className={cn(rootClasses, className)}>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 py-14">
        <div className="grid gap-12 lg:grid-cols-[1.1fr,0.9fr]">
          <div className="space-y-6">
            <Link href="/" className="flex items-center gap-3">
              <span
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-xl text-base font-semibold",
                  isDark ? "bg-white text-[#04102D]" : "bg-[#04102D] text-white",
                )}
              >
                F.
              </span>
              <div className="leading-tight">
                <p className={cn("text-xs uppercase tracking-[0.28em]", subtleClass)}>
                  Finnegans
                </p>
                <p className="text-xl font-semibold">Chatbots</p>
              </div>
            </Link>
            <p className={cn("max-w-md text-sm", mutedClass)}>
              Diseñamos operaciones conversacionales seguras para organizaciones
              que buscan automatizar procesos críticos sin perder el toque
              humano.
            </p>
            <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.28em]">
              {["NovaBank", "Grupo Sideral", "Lumen Retail", "SegurPlus"].map((logo) => (
                <span
                  key={logo}
                  className={cn(
                    "rounded-full border px-4 py-2",
                    isDark ? "border-white/20 text-white/70" : "border-[#04102D]/15 text-[#04102D]/70",
                  )}
                >
                  {logo}
                </span>
              ))}
            </div>
            <div className="space-y-3 text-sm">
              <p className={cn("font-semibold", isDark ? "text-white" : "text-[#04102D]")}>Contacto directo</p>
              <div className={cn("space-y-1", mutedClass)}>
                <p>📞 +54 11 5263-7700</p>
                <p>
                  ✉️{" "}
                  <a
                    href="mailto:hello@finnegans.com"
                    className={cn(linkClass, "underline decoration-transparent underline-offset-4")}
                  >
                    hello@finnegans.com
                  </a>
                </p>
                <p>📍 Av. del Libertador 2442, Buenos Aires</p>
              </div>
            </div>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {navigationSections.map((section) => (
              <div key={section.title} className="space-y-3 text-sm">
                <p className={cn("text-xs font-semibold uppercase tracking-[0.28em]", subtleClass)}>
                  {section.title}
                </p>
                <ul className="space-y-2">
                  {section.items.map((item) => (
                    <li key={item.label}>
                      <Link href={item.href} className={cn("inline-flex items-center gap-1", linkClass)}>
                        {item.label}
                        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <div className="space-y-3 text-sm">
              <p className={cn("text-xs font-semibold uppercase tracking-[0.28em]", subtleClass)}>
                Comunidades
              </p>
              <div className="flex flex-wrap gap-2">
                {socialLinks.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noreferrer"
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold",
                      isDark
                        ? "border-white/20 text-white/80 hover:border-white/40 hover:text-white"
                        : "border-[#04102D]/15 text-[#04102D]/70 hover:border-[#04102D]/30 hover:text-[#04102D]",
                    )}
                  >
                    <social.icon className="h-4 w-4" aria-hidden="true" />
                    {social.label}
                  </a>
                ))}
              </div>
              <div className="space-y-2">
                <p className={cn("text-xs font-semibold uppercase tracking-[0.28em]", subtleClass)}>
                  Certificaciones
                </p>
                <div className="flex flex-wrap gap-2 text-xs">
                  {["ISO 27001", "SOC2 ready", "Meta Business Partner"].map((badge) => (
                    <span
                      key={badge}
                      className={cn("rounded-full px-3 py-1", badgeClass)}
                    >
                      {badge}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 border-t border-dashed border-current/20 pt-6 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p className={mutedClass}>
            © {new Date().getFullYear()} Finnegans. Operaciones conversacionales para organizaciones que lideran sus mercados.
          </p>
          <div className="flex flex-wrap gap-4">
            {legalLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className={cn(linkClass, "text-xs font-medium")}
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
