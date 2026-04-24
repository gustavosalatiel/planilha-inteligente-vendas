// Captura e-mail al hacer blur en cualquier input[type=email] con data-identify.
// Regex estricta para evitar disparar user_identified con basura.

import { identify } from "./events";

export function initIdentify(): void {
  if (typeof document === "undefined") return;

  const handler = (ev: Event) => {
    const el = ev.target as HTMLInputElement;
    if (!el || el.type !== "email") return;
    if (!el.matches("[data-identify]")) return;
    const value = el.value?.trim();
    if (!value) return;
    void identify(value);
  };

  document.addEventListener("blur", handler, true);
  document.addEventListener("change", handler, true);
}
