const relativeTimeFormatter = new Intl.RelativeTimeFormat("es-AR", {
  numeric: "auto",
});

const absoluteTimeFormatter = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "medium",
  timeStyle: "short",
});

const messageDayFormatter = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "full",
});

export function formatRelativeTime(value: string): string {
  const target = new Date(value);
  const now = new Date();

  if (Number.isNaN(target.getTime())) {
    return "hace un momento";
  }

  const diffMs = target.getTime() - now.getTime();
  const diffSeconds = Math.round(diffMs / 1000);
  const ranges: Array<[number, Intl.RelativeTimeFormatUnit]> = [
    [60, "second"],
    [60, "minute"],
    [24, "hour"],
    [7, "day"],
    [4.34524, "week"],
    [12, "month"],
    [Number.POSITIVE_INFINITY, "year"],
  ];

  let unit: Intl.RelativeTimeFormatUnit = "second";
  let valueToFormat = diffSeconds;

  for (const [step, nextUnit] of ranges) {
    if (Math.abs(valueToFormat) < step) {
      unit = nextUnit;
      break;
    }
    valueToFormat /= step;
  }

  const rounded = Math.round(valueToFormat);
  if (!Number.isFinite(rounded)) {
    return "hace un momento";
  }

  return relativeTimeFormatter.format(rounded, unit);
}

export function formatAbsoluteTime(value: string): string {
  const dateValue = new Date(value);
  if (Number.isNaN(dateValue.getTime())) {
    return "Fecha desconocida";
  }
  return absoluteTimeFormatter.format(dateValue);
}

export function formatMessageDay(value: string): string {
  const dateValue = new Date(value);
  if (Number.isNaN(dateValue.getTime())) {
    return "Fecha desconocida";
  }
  return messageDayFormatter.format(dateValue);
}
