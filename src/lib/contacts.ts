export function extractEmailAddresses(text: string) {
  const matches =
    text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}/g) ?? [];
  return [...new Set(matches.map((email) => email.replace(/[.,;:]+$/, "")))];
}
