"use client";

import * as React from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * SVG displacement filter powering the "liquid glass" refraction. Render it
 * ONCE, high in the tree (see app/layout.tsx). Every LiquidGlassButton
 * references it via `filter: url(#glass-distortion)`.
 */
export const GlassFilter: React.FC = () => (
  <svg aria-hidden className="pointer-events-none absolute h-0 w-0">
    <filter
      id="glass-distortion"
      x="0%"
      y="0%"
      width="100%"
      height="100%"
      filterUnits="objectBoundingBox"
    >
      <feTurbulence
        type="fractalNoise"
        baseFrequency="0.001 0.005"
        numOctaves="1"
        seed="17"
        result="turbulence"
      />
      <feComponentTransfer in="turbulence" result="mapped">
        <feFuncR type="gamma" amplitude="1" exponent="10" offset="0.5" />
        <feFuncG type="gamma" amplitude="0" exponent="1" offset="0" />
        <feFuncB type="gamma" amplitude="0" exponent="1" offset="0.5" />
      </feComponentTransfer>
      <feGaussianBlur in="turbulence" stdDeviation="3" result="softMap" />
      <feSpecularLighting
        in="softMap"
        surfaceScale="5"
        specularConstant="1"
        specularExponent="100"
        lightingColor="white"
        result="specLight"
      >
        <fePointLight x="-200" y="-200" z="300" />
      </feSpecularLighting>
      <feComposite
        in="specLight"
        operator="arithmetic"
        k1="0"
        k2="1"
        k3="1"
        k4="0"
        result="litImage"
      />
      <feDisplacementMap
        in="SourceGraphic"
        in2="softMap"
        scale="120"
        xChannelSelector="R"
        yChannelSelector="G"
      />
    </filter>
  </svg>
);

// The three stacked glass layers: refracted+blurred backdrop, tint, rim light.
function GlassLayers() {
  return (
    <>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 rounded-[inherit]"
        style={{
          backdropFilter: "blur(3px)",
          filter: "url(#glass-distortion)",
          isolation: "isolate",
        }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 z-10 rounded-[inherit]"
        style={{ background: "rgba(255, 255, 255, 0.12)" }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 z-20 rounded-[inherit]"
        style={{
          boxShadow:
            "inset 2px 2px 1px 0 rgba(255, 255, 255, 0.45), inset -1px -1px 1px 1px rgba(255, 255, 255, 0.25)",
        }}
      />
    </>
  );
}

const glassBase = cn(
  "group/lg relative inline-flex cursor-pointer select-none items-center justify-center gap-2 overflow-hidden rounded-2xl",
  "font-semibold text-white transition-all duration-500 will-change-transform hover:scale-[1.02] active:scale-[0.99]",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  "[transition-timing-function:cubic-bezier(0.175,0.885,0.32,2.2)]",
);

const glassStyle: React.CSSProperties = {
  boxShadow: "0 6px 16px rgba(0, 0, 0, 0.28), 0 0 20px rgba(0, 0, 0, 0.12)",
};

interface LiquidGlassButtonProps {
  children: React.ReactNode;
  className?: string;
  /** When set, renders a Next.js <Link>; otherwise a native <button>. */
  href?: string;
  type?: "button" | "submit" | "reset";
  target?: string;
  disabled?: boolean;
  onClick?: React.MouseEventHandler<HTMLElement>;
  "aria-label"?: string;
}

/**
 * A call-to-action with Apple "liquid glass" refraction. Renders a Next.js
 * <Link> when `href` is set, otherwise a native <button> (e.g. form submit).
 * Pass sizing/shape via `className`; text is white for the dark theme.
 */
export function LiquidGlassButton({
  children,
  className,
  href,
  type = "button",
  target,
  disabled,
  onClick,
  ...rest
}: LiquidGlassButtonProps) {
  const content = (
    <>
      <GlassLayers />
      <span className="relative z-30 inline-flex items-center justify-center gap-2">{children}</span>
    </>
  );

  if (href && !disabled) {
    return (
      <Link
        href={href}
        target={target}
        onClick={onClick}
        className={cn(glassBase, className)}
        style={glassStyle}
        {...rest}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(glassBase, disabled && "pointer-events-none opacity-60", className)}
      style={glassStyle}
      {...rest}
    >
      {content}
    </button>
  );
}
