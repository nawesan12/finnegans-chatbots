"use client";

import {
  type ComponentType,
  type SVGProps,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  BookOpen,
  CloudCog,
  Headphones,
  LifeBuoy,
  Mail,
  MessageCircle,
  MessageSquareCode,
  Rocket,
  Search,
  Settings2,
  ShieldCheck,
  Users,
  Workflow,
} from "lucide-react";

import PageHeader from "@/components/dashboard/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { itemVariants } from "@/lib/animations";

type HelpArticle = {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  tags: string[];
  steps: string[];
  tips?: string[];
  resources?: { label: string; href: string; external?: boolean }[];
};

type QuickAction = {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  badge?: string;
};

type FaqItem = {
  question: string;
  answer: string;
  cta?: { label: string; href: string };
};

const quickActions: QuickAction[] = [
  {
    id: "onboarding",
    title: "Checklist de onboarding",
    description:
      "Configura canales, equipos y tu primer flujo en menos de 30 minutos.",
    href: "#primeros-pasos",
    icon: Rocket,
    badge: "Recomendado",
  },
  {
    id: "whatsapp-cloud",
    title: "Conectar WhatsApp Cloud",
    description:
      "Aprende a vincular tu número y validar el webhook seguro paso a paso.",
    href: "#integraciones",
    icon: CloudCog,
  },
  {
    id: "equipo",
    title: "Invitar a tu equipo",
    description:
      "Crea roles, asigna permisos y comparte el panel con otras áreas.",
    href: "#operacion",
    icon: Users,
  },
];

const helpArticles: HelpArticle[] = [
  {
    id: "primeros-pasos",
    title: "Primeros pasos esenciales",
    description:
      "Todo lo que necesitas para activar Finnegans Chatbots desde cero y lanzar tu primer flujo automatizado.",
    category: "Onboarding",
    icon: Rocket,
    tags: ["onboarding", "primeros pasos", "checklist", "configuracion"],
    steps: [
      "Verifica que tu cuenta tenga acceso al dashboard y al panel de Meta for Developers.",
      "Define un objetivo: soporte, ventas o notificaciones. Esto ayudará a estructurar tus flujos iniciales.",
      "Carga tus contactos clave o integra tu CRM utilizando los importadores disponibles.",
      "Activa un flujo de bienvenida con un nodo Trigger simple para validar el recorrido de usuario.",
    ],
    tips: [
      "Utiliza el entorno de pruebas de Meta antes de impactar a tus clientes reales.",
      "Duplica flujos existentes para acelerar iteraciones y mantener una versión funcional.",
    ],
    resources: [
      {
        label: "Guía de onboarding completa",
        href: "https://finnegans.ai/docs/onboarding",
        external: true,
      },
    ],
  },
  {
    id: "integraciones",
    title: "Conectar Meta WhatsApp Cloud",
    description:
      "Configura credenciales, variables de entorno y verifica el webhook oficial sin errores.",
    category: "Integraciones",
    icon: CloudCog,
    tags: [
      "whatsapp",
      "meta",
      "webhook",
      "integraciones",
      "credenciales",
    ],
    steps: [
      "Obtén el App Secret, Token de largo plazo, Phone Number ID y Verify Token desde Meta for Developers.",
      "Carga las credenciales en Settings → WhatsApp Cloud o mediante variables de entorno si trabajas en modo multi-tenant.",
      "Publica tu instancia (o usa un túnel seguro) y apunta el webhook de Meta a /api/webhook con tu Verify Token.",
      "Suscríbete a los eventos messages, message_template_status_update y message_status_update para habilitar métricas.",
    ],
    tips: [
      "Aprovecha el webhook por flujo con token para automatizaciones externas (formularios, CRM, scripts).",
      "Si recibes 401 Missing signature revisa que la cabecera x-hub-signature-256 llegue completa desde Meta.",
    ],
    resources: [
      {
        label: "Paso a paso: Meta WhatsApp Cloud",
        href: "https://finnegans.ai/docs/meta-whatsapp-cloud",
        external: true,
      },
      {
        label: "Plantillas y mensajes masivos",
        href: "https://finnegans.ai/docs/broadcasts",
        external: true,
      },
    ],
  },
  {
    id: "automatizaciones",
    title: "Diseñar flujos inteligentes",
    description:
      "Buenas prácticas para estructurar disparadores, nodos condicionales y mensajes personalizados.",
    category: "Automatizaciones",
    icon: Workflow,
    tags: [
      "flujos",
      "automatizaciones",
      "triggers",
      "condicionales",
      "mensajes",
    ],
    steps: [
      "Comienza con un Trigger claro y utiliza etiquetas para segmentar audiencias o campañas.",
      "Enriquece el contexto con variables personalizadas para ofrecer respuestas dinámicas.",
      "Agrega nodos de condicionales y acciones externas (webhooks, CRM, email) para completar recorridos.",
      "Activa métricas de éxito por flujo para identificar bloqueos y oportunidades de mejora.",
    ],
    tips: [
      "Agrupa nodos relacionados con el mismo objetivo usando nombres consistentes y emojis.",
      "Programa revisiones quincenales del flujo con datos reales de Logs y Analytics.",
    ],
    resources: [
      {
        label: "Diseño de flujos con IA",
        href: "https://finnegans.ai/docs/flow-builder",
        external: true,
      },
    ],
  },
  {
    id: "operacion",
    title: "Operación diaria y soporte",
    description:
      "Monitorea conversaciones, gestiona tu equipo y mantén la calidad de servicio en línea.",
    category: "Operación",
    icon: MessageSquareCode,
    tags: ["logs", "equipos", "permisos", "operacion", "contactos"],
    steps: [
      "Supervisa la bandeja de Logs para responder a tickets pendientes o reprocesar mensajes con errores.",
      "Segmenta contactos con etiquetas y listas dinámicas para campañas y respuestas proactivas.",
      "Invita a nuevos usuarios desde Settings y asigna roles basados en responsabilidades (operador, analista, administrador).",
      "Documenta procesos internos en el Centro de ayuda y comparte enlaces directos con tu equipo.",
    ],
    tips: [
      "Configura alertas internas usando webhooks y herramientas como Slack, Teams o email.",
      "Habilita autenticación de dos factores y revisa accesos inactivos cada 30 días.",
    ],
    resources: [
      {
        label: "Guía de operación y soporte",
        href: "https://finnegans.ai/docs/operations",
        external: true,
      },
      {
        label: "Roles y permisos",
        href: "https://finnegans.ai/docs/settings",
        external: true,
      },
    ],
  },
];

const faqs: FaqItem[] = [
  {
    question: "¿Por qué mi webhook devuelve 403 al probarlo manualmente?",
    answer:
      "El endpoint principal valida la firma de Meta. Usa el webhook por flujo con token o incluye la cabecera x-hub-signature-256 generada con tu App Secret.",
    cta: {
      label: "Ver cómo generar la firma",
      href: "https://developers.facebook.com/docs/graph-api/webhooks/getting-started",
    },
  },
  {
    question: "¿Cómo puedo probar un flujo sin afectar a mis clientes?",
    answer:
      "Crea un entorno de pruebas con el número sandbox de Meta o duplica el flujo y limítalo a un segmento interno mediante etiquetas.",
  },
  {
    question: "¿Qué hacer si las métricas no se actualizan?",
    answer:
      "Revisa que los eventos message_status_update estén habilitados y que la API no devuelva errores. Usa la vista de Logs para confirmar que los cambios se registran.",
  },
];

const supportChannels = [
  {
    id: "email",
    title: "Soporte por correo",
    description:
      "Respuestas en menos de 24 h hábiles. Ideal para integraciones, dudas técnicas o exportes de datos.",
    icon: Mail,
    href: "mailto:soporte@finnegans.ai",
    label: "Escribir a soporte",
  },
  {
    id: "whatsapp",
    title: "Canal prioritario",
    description:
      "Atención directa en horario extendido para incidentes críticos y monitoreo de campañas.",
    icon: MessageCircle,
    href: "https://wa.me/5491132456789",
    label: "Abrir chat de soporte",
  },
  {
    id: "sesion",
    title: "Sesiones guiadas",
    description:
      "Reserva un acompañamiento personalizado para revisar arquitectura, KPIs o nuevos lanzamientos.",
    icon: Headphones,
    href: "https://cal.com/finnegans/chatbots",
    label: "Agendar asesoría",
  },
];

const HelpCenterPage = () => {
  const [query, setQuery] = useState("");

  const filteredArticles = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return helpArticles;
    }

    return helpArticles.filter((article) => {
      const haystack = [
        article.title,
        article.description,
        article.category,
        ...article.tags,
        ...article.steps,
        ...(article.tips ?? []),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [query]);

  return (
    <div className="flex flex-col gap-10 pb-12">
      <PageHeader
        title="Centro de ayuda"
        description="Explora guías prácticas, flujos recomendados y canales de soporte para sacar el máximo provecho de Finnegans Chatbots."
      />

      <motion.section
        className="grid gap-6 lg:grid-cols-[2fr,3fr]"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="bg-gradient-to-br from-white via-white to-slate-50">
          <CardHeader className="space-y-6">
            <div className="flex flex-col gap-3">
              <Badge variant="secondary" className="w-fit bg-[#04102D]/5 text-[#04102D]">
                Siempre actualizado
              </Badge>
              <CardTitle className="text-2xl font-semibold text-[#04102D]">
                Encuentra respuestas en segundos
              </CardTitle>
              <CardDescription className="text-sm text-slate-600">
                Escribe lo que necesitas y filtraremos las guías relevantes del equipo de éxito de clientes.
              </CardDescription>
            </div>
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar por tema, canal o palabra clave"
                  className="h-12 rounded-lg border-slate-200 pl-10 text-sm"
                  aria-label="Buscar en el centro de ayuda"
                />
              </div>
              <p className="text-xs text-slate-500">
                Ejemplos: <span className="font-medium">&quot;webhook&quot;, &quot;automatizaciones&quot;, &quot;roles&quot;</span>
              </p>
            </div>
          </CardHeader>
          <CardFooter className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
            {quickActions.map((action) => {
              const Icon = action.icon;

              return (
                <Button
                  key={action.id}
                  asChild
                  variant="outline"
                  size="sm"
                  className="rounded-full border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:border-[#4bc3fe] hover:text-[#04102D]"
                >
                  <Link href={action.href}>
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    {action.title}
                    <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </Button>
              );
            })}
          </CardFooter>
        </Card>

        <motion.div
          className="grid gap-4 md:grid-cols-2"
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }}
          initial="hidden"
          animate="visible"
        >
          {quickActions.map((action) => {
            const Icon = action.icon;

            return (
              <motion.div key={action.id} variants={itemVariants}>
                <Card className="h-full border-slate-200 bg-white shadow-sm">
                  <CardHeader className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#04102D]/5 text-[#04102D]">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </div>
                      {action.badge ? (
                        <Badge variant="outline" className="border-[#4bc3fe]/40 bg-[#4bc3fe]/10 text-[#04102D]">
                          {action.badge}
                        </Badge>
                      ) : null}
                    </div>
                    <CardTitle className="text-base font-semibold text-slate-900">
                      {action.title}
                    </CardTitle>
                    <CardDescription className="text-sm text-slate-600">
                      {action.description}
                    </CardDescription>
                  </CardHeader>
                  <CardFooter className="pt-0">
                    <Button asChild variant="ghost" size="sm" className="text-[#04102D] hover:text-[#04102D]">
                      <Link href={action.href}>
                        Explorar
                        <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      </motion.section>

      <motion.section
        id="primeros-pasos"
        className="space-y-4"
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        viewport={{ once: true }}
      >
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#04102D]">
            <BookOpen className="h-4 w-4" aria-hidden="true" />
            Guías destacadas
          </div>
          <h2 className="text-2xl font-semibold text-slate-900">Contenido curado para tu equipo</h2>
          <p className="max-w-3xl text-sm text-slate-600">
            {filteredArticles.length === helpArticles.length
              ? "Accede a tutoriales completos sobre configuración, automatizaciones y operación diaria."
              : `Mostrando ${filteredArticles.length} resultado${
                  filteredArticles.length === 1 ? "" : "s"
                } para "${query}".`}
          </p>
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
          {filteredArticles.length === 0 ? (
            <Card className="border-dashed border-slate-200 bg-white/60">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-slate-800">
                  No encontramos coincidencias
                </CardTitle>
                <CardDescription className="text-sm text-slate-600">
                  Intenta con otra palabra clave o revisa las categorías principales a continuación.
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuery("")}
                  className="border-slate-200 text-slate-600 hover:text-[#04102D]"
                >
                  Limpiar búsqueda
                </Button>
              </CardFooter>
            </Card>
          ) : (
            filteredArticles.map((article) => {
              const Icon = article.icon;

              return (
                <Card
                  key={article.id}
                  id={article.id}
                  className="flex h-full flex-col border-slate-200 bg-white shadow-sm transition-transform hover:-translate-y-1"
                >
                  <CardHeader className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#04102D]/5 text-[#04102D]">
                          <Icon className="h-6 w-6" aria-hidden="true" />
                        </div>
                        <div className="space-y-1">
                          <CardTitle className="text-lg font-semibold text-slate-900">
                            {article.title}
                          </CardTitle>
                          <CardDescription className="text-sm text-slate-600">
                            {article.description}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                        {article.category}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Pasos recomendados
                      </p>
                      <ol className="list-inside list-decimal space-y-1 text-sm text-slate-700">
                        {article.steps.map((step, index) => (
                          <li key={index}>{step}</li>
                        ))}
                      </ol>
                    </div>
                    {article.tips ? (
                      <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4">
                        <p className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                          <LifeBuoy className="h-4 w-4" aria-hidden="true" />
                          Consejos del equipo
                        </p>
                        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600">
                          {article.tips.map((tip, index) => (
                            <li key={index}>{tip}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      {article.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="border-slate-200 bg-white text-xs font-medium text-slate-600"
                        >
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                  {article.resources?.length ? (
                    <CardFooter className="flex flex-wrap gap-3 border-t border-slate-100 pt-4">
                      {article.resources.map((resource) => (
                        <Button
                          key={resource.href}
                          asChild
                          variant="outline"
                          size="sm"
                          className="border-slate-200 text-slate-700 hover:border-[#4bc3fe] hover:text-[#04102D]"
                        >
                          <Link
                            href={resource.href}
                            target={resource.external ? "_blank" : undefined}
                            rel={resource.external ? "noreferrer" : undefined}
                          >
                            Ver recurso
                            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                          </Link>
                        </Button>
                      ))}
                    </CardFooter>
                  ) : null}
                </Card>
              );
            })
          )}
        </div>
      </motion.section>

      <Separator className="bg-slate-200" />

      <motion.section
        id="operacion"
        className="grid gap-6 lg:grid-cols-[1.4fr,1fr]"
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        viewport={{ once: true }}
      >
        <Card className="h-full border-slate-200 bg-white shadow-sm">
          <CardHeader className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#04102D]">
              <Settings2 className="h-4 w-4" aria-hidden="true" />
              Buenas prácticas operativas
            </div>
            <CardTitle className="text-xl text-slate-900">
              Checklist semanal del equipo
            </CardTitle>
            <CardDescription className="text-sm text-slate-600">
              Mantén tu operación saludable revisando estos puntos cada lunes. Puedes duplicar la lista y compartirla con tu equipo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm text-slate-700">
              <li>
                <span className="font-semibold text-[#04102D]">1.</span> Revisa logs con estado pendiente o fallido y documenta la causa raíz.
              </li>
              <li>
                <span className="font-semibold text-[#04102D]">2.</span> Actualiza etiquetas de contactos activos e identifica oportunidades de campañas proactivas.
              </li>
              <li>
                <span className="font-semibold text-[#04102D]">3.</span> Confirma que los flujos críticos tengan versiones recientes y nodos de fallback configurados.
              </li>
              <li>
                <span className="font-semibold text-[#04102D]">4.</span> Exporta métricas clave (mensajes enviados, tasa de finalización) y compártelas con stakeholders.
              </li>
              <li>
                <span className="font-semibold text-[#04102D]">5.</span> Valida accesos del equipo: remueve usuarios inactivos y refuerza MFA donde aplique.
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-[#04102D] text-white">
          <CardHeader className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-white/60">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Seguridad
            </div>
            <CardTitle className="text-xl font-semibold">Recomendaciones clave</CardTitle>
            <CardDescription className="text-sm text-white/70">
              Protege tu cuenta y evita pérdidas de información sensible en tus canales automatizados.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-white/80">
            <p>
              • Configura dominios verificados en Meta y limita el uso de tokens personales a entornos de staging.
            </p>
            <p>
              • Utiliza variables de entorno en lugar de credenciales incrustadas en flujos o notas.
            </p>
            <p>
              • Documenta procesos de recuperación y comparte el enlace directo a este Centro de ayuda con tu mesa de servicio.
            </p>
          </CardContent>
          <CardFooter>
            <Button asChild variant="secondary" className="bg-white text-[#04102D] hover:bg-white/90">
              <Link href="https://finnegans.ai/docs/security" target="_blank" rel="noreferrer">
                Más recomendaciones de seguridad
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </motion.section>

      <motion.section
        className="space-y-4"
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        viewport={{ once: true }}
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-[#04102D]">
          <LifeBuoy className="h-4 w-4" aria-hidden="true" />
          Preguntas frecuentes
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {faqs.map((faq) => (
            <Card key={faq.question} className="border-slate-200 bg-white">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-slate-900">
                  {faq.question}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-600">
                <p>{faq.answer}</p>
                {faq.cta ? (
                  <Button asChild variant="link" className="h-auto px-0 text-[#04102D]">
                    <Link href={faq.cta.href} target="_blank" rel="noreferrer">
                      {faq.cta.label}
                    </Link>
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      </motion.section>

      <motion.section
        id="contacto"
        className="space-y-6"
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        viewport={{ once: true }}
      >
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#04102D]">
            <Headphones className="h-4 w-4" aria-hidden="true" />
            Necesitas ayuda personalizada
          </div>
          <h2 className="text-2xl font-semibold text-slate-900">
            Elige el canal que mejor se adapte a tu caso
          </h2>
          <p className="max-w-2xl text-sm text-slate-600">
            Nuestro equipo de especialistas acompaña implementaciones, entrenamientos y auditorías de bots en empresas de toda la región.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {supportChannels.map((channel) => {
            const Icon = channel.icon;

            return (
              <Card key={channel.id} className="flex h-full flex-col border-slate-200 bg-white shadow-sm">
                <CardHeader className="space-y-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#04102D]/5 text-[#04102D]">
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <CardTitle className="text-lg font-semibold text-slate-900">
                    {channel.title}
                  </CardTitle>
                  <CardDescription className="text-sm text-slate-600">
                    {channel.description}
                  </CardDescription>
                </CardHeader>
                <CardFooter className="mt-auto">
                  <Button asChild className="w-full bg-[#04102D] text-white hover:bg-[#04102D]/90">
                    <Link href={channel.href} target="_blank" rel="noreferrer">
                      {channel.label}
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </motion.section>
    </div>
  );
};

export default HelpCenterPage;
