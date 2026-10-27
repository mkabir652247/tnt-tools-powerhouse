import { MessageCircle } from "lucide-react";
import { WHATSAPP_LINK, WHATSAPP_PHONE_DISPLAY } from "@/lib/contact-details";

export function WhatsAppButton() {
  return (
    <a
      href={WHATSAPP_LINK}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Chat with TNT Tools on WhatsApp at ${WHATSAPP_PHONE_DISPLAY}`}
      className="fixed bottom-5 right-5 z-50 inline-flex min-h-12 items-center gap-2 rounded-full bg-[#128C7E] px-4 text-sm font-bold text-white shadow-lg transition-colors hover:bg-[#075E54] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#128C7E]"
    >
      <MessageCircle width={20} height={20} aria-hidden="true" />
      <span>WhatsApp</span>
    </a>
  );
}
