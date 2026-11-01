const ROMANIA_TIME_ZONE = "Europe/Bucharest";

function partsByType(date: Date, options: Intl.DateTimeFormatOptions) {
  return Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      ...options,
      timeZone: ROMANIA_TIME_ZONE,
    })
      .formatToParts(date)
      .map(({ type, value }) => [type, value]),
  );
}

export function getRomaniaTime(date = new Date()) {
  const dateParts = partsByType(date, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const timeParts = partsByType(date, {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  return {
    date: `${dateParts.year}-${dateParts.month}-${dateParts.day}`,
    minutes: Number(timeParts.hour) * 60 + Number(timeParts.minute),
  };
}
