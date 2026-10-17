// Detectie van contactgegevens in vrije tekst (FR-14, sectie 13.3).

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const URL = /(https?:\/\/|www\.)\S+|\b[a-z0-9-]+\.(be|com|nl|net|org|eu|io|me)\b/i;
// Belgische en internationale nummers: +32 4xx, 04xx xx xx xx, 0032...
const PHONE = /(\+|00)\s?\d{2}[\s./-]?\d([\s./-]?\d){6,}|\b0\d([\s./-]?\d){7,}/;

export function containsContactInfo(text: string): boolean {
  return EMAIL.test(text) || URL.test(text) || PHONE.test(text);
}

export const CONTACT_WARNING =
  "Deel geen telefoonnummer, e-mailadres of link. Gebruik de berichten in Padoo; deel je nummer pas als je de ander vertrouwt.";

export function slugifyUsername(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 24);
}

export const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
