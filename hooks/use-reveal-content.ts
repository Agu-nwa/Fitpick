"use client";

import { useCallback, useEffect, useRef, type RefObject } from "react";

type RevealTarget = HTMLElement | null | undefined | RefObject<HTMLElement | null> | (() => HTMLElement | null | undefined);

export type RevealContentOptions = {
  topOffset?: number;
  bottomOffset?: number;
  behavior?: ScrollBehavior;
  delayMs?: number;
  align?: "start" | "center" | "nearest";
  focus?: boolean;
  animateTarget?: boolean;
  emphasize?: boolean;
};

type ScrollHost = HTMLElement | Window;

type ScrollMetrics = {
  currentTop: number;
  maxTop: number;
  viewportHeight: number;
  targetTop: number;
  targetBottom: number;
};

type ActiveReveal = {
  frameId: number | null;
  cleanup: () => void;
  cancelled: boolean;
};

let latestRevealRequestId = 0;
let activeReveal: ActiveReveal | null = null;

function resolveTarget(target: RevealTarget) {
  if (!target) return null;
  if (typeof target === "function") return target() || null;
  if ("current" in target) return target.current;
  return target;
}

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function easeOutQuart(t: number) {
  return 1 - Math.pow(1 - t, 4);
}

function canScroll(element: HTMLElement) {
  const style = window.getComputedStyle(element);
  const overflowY = style.overflowY;
  return /(auto|scroll|overlay)/.test(overflowY) && element.scrollHeight > element.clientHeight;
}

function scrollParent(element: HTMLElement) {
  let current = element.parentElement;
  while (current && current !== document.body) {
    if (canScroll(current)) return current;
    current = current.parentElement;
  }
  return null;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function isWindowHost(host: ScrollHost): host is Window {
  return host === window;
}

function getScrollTop(host: ScrollHost) {
  return isWindowHost(host) ? window.scrollY : host.scrollTop;
}

function setScrollTop(host: ScrollHost, top: number) {
  if (isWindowHost(host)) {
    window.scrollTo({ top, left: window.scrollX, behavior: "auto" });
    return;
  }
  host.scrollTop = top;
}

function getMaxScrollTop(host: ScrollHost) {
  if (!isWindowHost(host)) return Math.max(0, host.scrollHeight - host.clientHeight);
  const documentElement = document.documentElement;
  const body = document.body;
  return Math.max(0, Math.max(documentElement.scrollHeight, body.scrollHeight) - window.innerHeight);
}

function getScrollMetrics(target: HTMLElement, host: ScrollHost): ScrollMetrics {
  const rect = target.getBoundingClientRect();
  const currentTop = getScrollTop(host);

  if (isWindowHost(host)) {
    return {
      currentTop,
      maxTop: getMaxScrollTop(host),
      viewportHeight: window.innerHeight,
      targetTop: currentTop + rect.top,
      targetBottom: currentTop + rect.bottom
    };
  }

  const hostRect = host.getBoundingClientRect();
  const targetTop = currentTop + rect.top - hostRect.top;
  return {
    currentTop,
    maxTop: getMaxScrollTop(host),
    viewportHeight: host.clientHeight,
    targetTop,
    targetBottom: targetTop + rect.height
  };
}

function isVisible(metrics: ScrollMetrics, topOffset: number, bottomOffset: number) {
  const viewTop = metrics.currentTop + topOffset;
  const viewBottom = metrics.currentTop + metrics.viewportHeight - bottomOffset;
  return metrics.targetTop >= viewTop && metrics.targetBottom <= viewBottom;
}

function targetScrollTop(metrics: ScrollMetrics, options: Required<Pick<RevealContentOptions, "align" | "topOffset" | "bottomOffset">>) {
  const usableHeight = Math.max(96, metrics.viewportHeight - options.topOffset - options.bottomOffset);
  const targetHeight = Math.max(1, metrics.targetBottom - metrics.targetTop);

  if (options.align === "center") {
    return metrics.targetTop - options.topOffset - Math.max(0, (usableHeight - targetHeight) / 2);
  }

  if (options.align === "nearest") {
    const viewTop = metrics.currentTop + options.topOffset;
    const viewBottom = metrics.currentTop + metrics.viewportHeight - options.bottomOffset;
    if (metrics.targetTop < viewTop) return metrics.targetTop - options.topOffset;
    if (metrics.targetBottom > viewBottom) return metrics.targetBottom - metrics.viewportHeight + options.bottomOffset;
    return metrics.currentTop;
  }

  return metrics.targetTop - options.topOffset;
}

function durationForDistance(distance: number) {
  if (distance < 8) return 0;
  if (distance < 120) return 160;
  if (distance < 500) return 320 + ((distance - 120) / 380) * 130;
  if (distance < 1200) return 450 + ((distance - 500) / 700) * 150;
  return 700;
}

function cancelActiveReveal() {
  if (!activeReveal) return;
  activeReveal.cancelled = true;
  if (activeReveal.frameId !== null) window.cancelAnimationFrame(activeReveal.frameId);
  activeReveal.cleanup();
  activeReveal = null;
}

export function cancelRevealContent() {
  latestRevealRequestId += 1;
  cancelActiveReveal();
}

function addInterruptionListeners(host: ScrollHost, cancel: () => void) {
  const scrollTarget = isWindowHost(host) ? window : host;
  const passiveOptions: AddEventListenerOptions = { passive: true };
  const events: Array<keyof WindowEventMap> = ["wheel", "touchstart", "touchmove", "pointerdown"];

  events.forEach((event) => {
    scrollTarget.addEventListener(event, cancel, passiveOptions);
    if (!isWindowHost(host)) window.addEventListener(event, cancel, passiveOptions);
  });
  window.addEventListener("keydown", cancel);

  return () => {
    events.forEach((event) => {
      scrollTarget.removeEventListener(event, cancel, passiveOptions);
      if (!isWindowHost(host)) window.removeEventListener(event, cancel, passiveOptions);
    });
    window.removeEventListener("keydown", cancel);
  };
}

function animateTargetReveal(target: HTMLElement, options: RevealContentOptions, reducedMotion: boolean) {
  if (reducedMotion || options.animateTarget === false || typeof target.animate !== "function") return;

  target.animate(
    [
      { opacity: 0.88, transform: "translate3d(0, 12px, 0) scale(0.995)" },
      { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)" }
    ],
    {
      duration: 360,
      easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      fill: "none"
    }
  );
}

function emphasizeTarget(target: HTMLElement, options: RevealContentOptions, reducedMotion: boolean) {
  if (reducedMotion || !options.emphasize || typeof target.animate !== "function") return;

  target.animate(
    [
      { boxShadow: "0 0 0 0 rgba(91, 126, 118, 0)", backgroundColor: "rgba(255, 255, 255, 0)" },
      { boxShadow: "0 0 0 4px rgba(91, 126, 118, 0.13)", backgroundColor: "rgba(248, 244, 237, 0.42)", offset: 0.24 },
      { boxShadow: "0 0 0 0 rgba(91, 126, 118, 0)", backgroundColor: "rgba(255, 255, 255, 0)" }
    ],
    {
      duration: 520,
      easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      fill: "none"
    }
  );
}

function focusTarget(target: HTMLElement, options: RevealContentOptions) {
  if (!options.focus) return;
  target.focus({ preventScroll: true });
}

export function scrollIntoViewWithOffset(target: HTMLElement | null | undefined, options: RevealContentOptions = {}) {
  if (!target || typeof window === "undefined") return false;

  const topOffset = options.topOffset ?? 24;
  const bottomOffset = options.bottomOffset ?? 112;
  const align = options.align ?? "start";
  const reducedMotion = prefersReducedMotion();
  const behavior: ScrollBehavior = reducedMotion ? "auto" : options.behavior || "smooth";
  const parent = scrollParent(target);
  const host: ScrollHost = parent || window;
  const metrics = getScrollMetrics(target, host);

  if (isVisible(metrics, topOffset, bottomOffset)) {
    focusTarget(target, options);
    return false;
  }

  cancelActiveReveal();

  const destination = clamp(targetScrollTop(metrics, { align, topOffset, bottomOffset }), 0, metrics.maxTop);
  const distance = Math.abs(destination - metrics.currentTop);
  const duration = behavior === "auto" ? 0 : durationForDistance(distance);

  if (duration === 0) {
    setScrollTop(host, destination);
    animateTargetReveal(target, options, reducedMotion);
    emphasizeTarget(target, options, reducedMotion);
    focusTarget(target, options);
    return distance > 0;
  }

  const requestId = latestRevealRequestId;
  const startTime = window.performance.now();
  const startTop = metrics.currentTop;
  const delta = destination - startTop;
  const reveal: ActiveReveal = {
    frameId: null,
    cleanup: () => {},
    cancelled: false
  };

  const cancel = () => {
    if (activeReveal !== reveal) return;
    reveal.cancelled = true;
    if (reveal.frameId !== null) window.cancelAnimationFrame(reveal.frameId);
    reveal.cleanup();
    activeReveal = null;
  };

  reveal.cleanup = addInterruptionListeners(host, cancel);
  activeReveal = reveal;

  const step = (now: number) => {
    if (reveal.cancelled || requestId !== latestRevealRequestId) {
      cancel();
      return;
    }

    const progress = clamp((now - startTime) / duration, 0, 1);
    const nextTop = startTop + delta * easeOutQuart(progress);
    setScrollTop(host, nextTop);

    if (progress < 1) {
      reveal.frameId = window.requestAnimationFrame(step);
      return;
    }

    setScrollTop(host, destination);
    reveal.cleanup();
    if (activeReveal === reveal) activeReveal = null;
    animateTargetReveal(target, options, reducedMotion);
    emphasizeTarget(target, options, reducedMotion);
    focusTarget(target, options);
  };

  reveal.frameId = window.requestAnimationFrame(step);
  return true;
}

export function useRevealContent(defaultOptions: RevealContentOptions = {}) {
  const timerRef = useRef<number | null>(null);
  const requestIdRef = useRef(0);
  const defaultOptionsRef = useRef(defaultOptions);

  defaultOptionsRef.current = defaultOptions;

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      if (requestIdRef.current > 0 && requestIdRef.current === latestRevealRequestId) cancelRevealContent();
    };
  }, []);

  return useCallback(
    (target: RevealTarget, options: RevealContentOptions = {}) => {
      if (typeof window === "undefined") return;
      if (timerRef.current) window.clearTimeout(timerRef.current);
      cancelRevealContent();

      const delayMs = options.delayMs ?? defaultOptionsRef.current.delayMs ?? 80;
      const requestId = latestRevealRequestId;
      requestIdRef.current = requestId;
      timerRef.current = window.setTimeout(() => {
        if (requestId !== latestRevealRequestId) return;
        scrollIntoViewWithOffset(resolveTarget(target), { ...defaultOptionsRef.current, ...options });
      }, delayMs);
    },
    []
  );
}
