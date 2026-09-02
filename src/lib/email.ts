/** Link de Yahoo Mail con destinatario, asunto y cuerpo precargados. */
export function armarLinkYahooMail(destinatario: string, asunto: string, cuerpo: string): string {
  return `https://compose.mail.yahoo.com/?to=${encodeURIComponent(destinatario)}&subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
}
