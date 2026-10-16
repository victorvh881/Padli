import "server-only";

const appUrl = () => process.env.APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

export const emailEnabled = () => Boolean(process.env.BREVO_API_KEY);

/**
 * Stuurt een e-mail via Brevo (EU). Zonder BREVO_API_KEY wordt de mail alleen
 * in de serverlog getoond, handig tijdens het testen.
 */
export async function sendEmail(to: string, subject: string, text: string) {
  if (!emailEnabled()) {
    console.log(`[e-mail niet verstuurd, geen BREVO_API_KEY]\nAan: ${to}\nOnderwerp: ${subject}\n${text}`);
    return;
  }
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": process.env.BREVO_API_KEY!, "content-type": "application/json" },
    body: JSON.stringify({
      sender: { email: process.env.EMAIL_FROM ?? "noreply@padoo.be", name: "Padoo" },
      to: [{ email: to }],
      subject,
      textContent: text,
    }),
  });
  if (!res.ok) console.error("E-mail versturen mislukt", res.status, await res.text());
}

export function link(path: string) {
  return `${appUrl()}${path}`;
}
