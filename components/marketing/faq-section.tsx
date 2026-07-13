import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { faq } from "@/lib/marketing";

// FAQ accordion + matching FAQPage JSON-LD, kept in sync from the same source (§7).
export function FaqSection() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <section id="faq" aria-labelledby="faq-heading" className="border-t border-border">
      <div className="mx-auto w-full max-w-3xl px-6 py-20 sm:py-28">
        <h2 id="faq-heading" className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
          Questions <span className="font-serif font-medium italic">fréquentes</span>
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
          Tout ce qu'un indépendant se demande avant de changer d'outil de facturation.
        </p>

        <Accordion type="single" collapsible className="mt-10 w-full">
          {faq.map((item, index) => (
            <AccordionItem key={item.question} value={`item-${index}`}>
              <AccordionTrigger>{item.question}</AccordionTrigger>
              <AccordionContent>{item.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </section>
  );
}
