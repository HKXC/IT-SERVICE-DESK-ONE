"use client";

import { useEffect, useRef } from "react";
import type { MotionScope } from "@/lib/motion-scope";

/**
 * Ambient cursor glow — a purely visual layer.
 *
 * The cursor never touches React state: pointer positions are fed to a
 * requestAnimationFrame loop that eases the glow toward the pointer and
 * writes a GPU-friendly `transform` straight onto the DOM. With
 * `will-change: transform` the browser composites the move without layout
 * or repaint, so the dashboard does not re-render per mouse movement.
 *
 * Two stacked, blurred-free radial gradients give depth: a tighter "core"
 * that tracks closely and a much larger, fainter "depth" halo that trails
 * further behind for a soft parallax feel.
 */
export function AmbientLayer({ scope }: { scope: MotionScope }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const coreRef = useRef<HTMLDivElement>(null);
  const depthRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scope === "none") return;
    const root = rootRef.current;
    const core = coreRef.current;
    const depth = depthRef.current;
    if (!root || !core || !depth) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");

    const place = (x: number, y: number) => {
      const transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
      core.style.transform = transform;
      depth.style.transform = transform;
    };

    // Static, centred, subtle when motion is unwanted or no precise pointer.
    if (!finePointer.matches || reduceMotion.matches) {
      place(window.innerWidth / 2, window.innerHeight / 2);
      root.dataset.ready = "true";
      return () => {
        root.dataset.ready = "false";
      };
    }

    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let coreX = targetX;
    let coreY = targetY;
    let depthX = targetX;
    let depthY = targetY;
    let frame = 0;
    let active = false;

    const CORE_EASE = 0.14; // close follow
    const DEPTH_EASE = 0.07; // looser, trails for depth

    const tick = () => {
      coreX += (targetX - coreX) * CORE_EASE;
      coreY += (targetY - coreY) * CORE_EASE;
      depthX += (targetX - depthX) * DEPTH_EASE;
      depthY += (targetY - depthY) * DEPTH_EASE;

      core.style.transform = `translate3d(${coreX}px, ${coreY}px, 0) translate(-50%, -50%)`;
      depth.style.transform = `translate3d(${depthX}px, ${depthY}px, 0) translate(-50%, -50%)`;

      const settledCore =
        Math.abs(targetX - coreX) < 0.15 && Math.abs(targetY - coreY) < 0.15;
      const settledDepth =
        Math.abs(targetX - depthX) < 0.15 && Math.abs(targetY - depthY) < 0.15;

      frame = settledCore && settledDepth ? 0 : requestAnimationFrame(tick);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType && event.pointerType !== "mouse") return;
      targetX = event.clientX;
      targetY = event.clientY;
      if (!active) {
        // Snap on first appearance so the glow fades in at the cursor rather
        // than sliding across the screen from the centre.
        active = true;
        coreX = depthX = targetX;
        coreY = depthY = targetY;
        root.dataset.ready = "true";
      }
      if (!frame) frame = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      if (frame) cancelAnimationFrame(frame);
      root.dataset.ready = "false";
    };
  }, [scope]);

  if (scope === "none") return null;

  return (
    <div ref={rootRef} className="ambient-root" aria-hidden="true">
      <div ref={depthRef} className="ambient-layer ambient-depth" />
      <div ref={coreRef} className="ambient-layer ambient-core" />
    </div>
  );
}
