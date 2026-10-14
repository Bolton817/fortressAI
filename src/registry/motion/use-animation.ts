"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { AnimationPreset } from "@/core/schema/manifest";

/**
 * Fortress AI — GSAP Animation Preset Hook (TDD §18.2, §19.3, FR-055, FR-056)
 * Invariants:
 * - Reduced motion preference must be respected (disables motion immediately).
 * - Animation is an enhancement layer only; never blocks content visibility.
 * - Cleanup timelines on React unmount to prevent memory leaks and hydration conflicts.
 */

export function useSectionAnimation(preset: AnimationPreset | string | undefined) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!preset || preset === "none" || !containerRef.current) return;

    // Check prefers-reduced-motion (FR-056)
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) {
      // Reduced motion: ensure all elements are immediately visible
      gsap.set(containerRef.current.querySelectorAll("[data-animate]"), {
        opacity: 1,
        y: 0,
        scale: 1,
        clearProps: "all",
      });
      return;
    }

    const ctx = gsap.context(() => {
      const targets = containerRef.current?.querySelectorAll("[data-animate]");
      if (!targets || targets.length === 0) return;

      switch (preset) {
        case "fade-up":
          gsap.fromTo(
            targets,
            { opacity: 0, y: 24 },
            { opacity: 1, y: 0, duration: 0.6, ease: "power2.out", stagger: 0.1 }
          );
          break;

        case "stagger-cards":
          gsap.fromTo(
            targets,
            { opacity: 0, y: 32 },
            { opacity: 1, y: 0, duration: 0.5, ease: "power2.out", stagger: 0.15 }
          );
          break;

        case "image-reveal":
          gsap.fromTo(
            targets,
            { opacity: 0, scale: 0.95 },
            { opacity: 1, scale: 1, duration: 0.7, ease: "power1.out" }
          );
          break;

        case "hero-crossfade":
          gsap.fromTo(
            targets,
            { opacity: 0 },
            { opacity: 1, duration: 0.8, ease: "power2.inOut" }
          );
          break;

        default:
          gsap.fromTo(
            targets,
            { opacity: 0, y: 16 },
            { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }
          );
          break;
      }
    }, containerRef);

    return () => ctx.revert(); // Clean up on unmount
  }, [preset]);

  return containerRef;
}
