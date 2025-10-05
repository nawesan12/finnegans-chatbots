const DEFAULT_EXPORT_LOCALE = "es-AR";

function sanitizeCsvValue(value: string) {
  return value.replace(/\r?\n|\r/g, " ").replace(/"/g, '""');
}

type ContactForExport = {
  name: string | null;
  phone: string;
  notes: string | null;
  tags: { tag: { name: string } }[];
  createdAt: Date;
  updatedAt: Date;
};

export function formatContactsAsCsv(
  contacts: ContactForExport[],
  options?: { locale?: string },
): string {
  const locale = options?.locale ?? DEFAULT_EXPORT_LOCALE;
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const headers = [
    "Nombre",
    "Teléfono",
    "Etiquetas",
    "Notas",
    "Actualizado",
    "Creado",
  ];

  const rows = contacts.map((contact) => {
    const tagNames = contact.tags
      .map((relation) => relation.tag.name)
      .filter((name) => name && name.trim().length > 0)
      .join("; ");

    return [
      contact.name ?? "",
      contact.phone,
      tagNames,
      contact.notes ?? "",
      dateFormatter.format(contact.updatedAt),
      dateFormatter.format(contact.createdAt),
    ];
  });

  const toCsvRow = (values: string[]) =>
    values.map((value) => `"${sanitizeCsvValue(value)}"`).join(",");

  const csvContent = [headers, ...rows].map(toCsvRow).join("\r\n");
  return `\ufeff${csvContent}`;
}
