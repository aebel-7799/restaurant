import { MessageCircle } from "lucide-react";
import { RESTAURANT } from "@/lib/restaurant.config";

export function WhatsAppFab({ message }: { message?: string }) {
  const text = encodeURIComponent(message || `Hi ${RESTAURANT.name}, I have a question about my order.`);
  return (
    <a
      href={`https://wa.me/${RESTAURANT.whatsappNumber}?text=${text}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-20 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-105"
      style={{ maxWidth: "calc(28rem - 1rem)" }}
    >
      <MessageCircle className="h-6 w-6" />
    </a>
  );
}
