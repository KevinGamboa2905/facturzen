"use client";

import { LiquidGlassButton } from "@/components/ui/liquid-glass";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { Check, Star } from "lucide-react";
import { useState, useRef } from "react";
import confetti from "canvas-confetti";
import NumberFlow from "@number-flow/react";

export interface PricingPlan {
  name: string;
  price: string;
  yearlyPrice: string;
  period: string;
  features: string[];
  description: string;
  buttonText: string;
  href: string;
  isPopular: boolean;
}

interface PricingProps {
  plans: PricingPlan[];
  title?: React.ReactNode;
  description?: React.ReactNode;
}

export function Pricing({
  plans,
  title = "Un tarif simple, sans surprise.",
  description = "Choisissez la formule qui vous ressemble — sans engagement.",
}: PricingProps) {
  const [isMonthly, setIsMonthly] = useState(true);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const switchRef = useRef<HTMLButtonElement>(null);

  const handleToggle = (checked: boolean) => {
    setIsMonthly(!checked);
    if (checked && switchRef.current) {
      const rect = switchRef.current.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;

      confetti({
        particleCount: 50,
        spread: 60,
        origin: { x: x / window.innerWidth, y: y / window.innerHeight },
        colors: ["#f2f2f2", "#a1a1a1", "#ffffff", "#525252"],
        ticks: 200,
        gravity: 1.2,
        decay: 0.94,
        startVelocity: 30,
        shapes: ["circle"],
      });
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-20 sm:py-28">
      <div className="mb-12 space-y-4 text-center">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{title}</h2>
        <p className="whitespace-pre-line text-lg text-muted-foreground">{description}</p>
      </div>

      <div className="mb-10 flex items-center justify-center gap-3">
        <span className={cn("text-sm font-medium", isMonthly ? "text-foreground" : "text-muted-foreground")}>
          Mensuel
        </span>
        <label className="relative inline-flex cursor-pointer items-center">
          <Label>
            <Switch
              ref={switchRef as React.RefObject<HTMLButtonElement>}
              checked={!isMonthly}
              onCheckedChange={handleToggle}
              className="relative"
            />
          </Label>
        </label>
        <span className="text-sm font-medium text-foreground">
          Annuel <span className="text-muted-foreground">(économisez 20%)</span>
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {plans.map((plan, index) => (
          <motion.div
            key={index}
            initial={{ y: 50, opacity: 1 }}
            whileInView={
              isDesktop
                ? {
                    y: plan.isPopular ? -20 : 0,
                    opacity: 1,
                    x: index === 2 ? -30 : index === 0 ? 30 : 0,
                    scale: index === 0 || index === 2 ? 0.94 : 1.0,
                  }
                : {}
            }
            viewport={{ once: true }}
            transition={{
              duration: 1.6,
              type: "spring" as const,
              stiffness: 100,
              damping: 30,
              delay: 0.4,
              opacity: { duration: 0.5 },
            }}
            className={cn(
              "relative flex flex-col rounded-2xl border p-6 text-center backdrop-blur-sm",
              plan.isPopular
                ? "border-2 border-white/40 bg-white/[0.06]"
                : "border-white/10 bg-white/[0.03]",
              !plan.isPopular && "mt-5",
              index === 0 && "origin-right",
              index === 2 && "origin-left",
            )}
          >
            {plan.isPopular && (
              <div className="absolute right-0 top-0 flex items-center rounded-bl-xl rounded-tr-xl bg-primary px-2 py-0.5">
                <Star className="h-4 w-4 fill-current text-primary-foreground" />
                <span className="ml-1 font-semibold text-primary-foreground">Populaire</span>
              </div>
            )}
            <div className="flex flex-1 flex-col">
              <p className="text-base font-semibold text-muted-foreground">{plan.name}</p>
              <div className="mt-6 flex items-center justify-center gap-x-2">
                <span className="text-5xl font-bold tracking-tight text-foreground">
                  <NumberFlow
                    value={isMonthly ? Number(plan.price) : Number(plan.yearlyPrice)}
                    locales="fr-CH"
                    format={{
                      style: "currency",
                      currency: "CHF",
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }}
                    transformTiming={{ duration: 500, easing: "ease-out" }}
                    willChange
                    className="tabular-nums"
                  />
                </span>
                <span className="text-sm font-semibold leading-6 tracking-wide text-muted-foreground">
                  / {plan.period}
                </span>
              </div>

              <p className="text-xs leading-5 text-muted-foreground">
                {isMonthly ? "facturé mensuellement" : "facturé annuellement"}
              </p>

              <ul className="mt-5 flex flex-col gap-2">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <Check className="mt-1 h-4 w-4 flex-shrink-0 text-foreground" />
                    <span className="text-left text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <hr className="my-4 w-full border-white/10" />

              <LiquidGlassButton href={plan.href} className="h-11 w-full text-base tracking-tight">
                {plan.buttonText}
              </LiquidGlassButton>
              <p className="mt-6 text-xs leading-5 text-muted-foreground">{plan.description}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
