"use client";

import { useCallback, useEffect, useRef, type RefObject } from "react";

type RevealTarget = HTMLElement | null | undefined | RefObject<HTMLElement | null> | (() => HTMLElement | null | undefined);

export type RevealContentOptions = {
  topOffset?: number;
  bottomOffset?: number;
  behavior?: ScrollBehavior;
  delayMs?: number;
};

function resolveTarget(target: RevealTarget) {
  if (!target) return null;
  if (typeof target === "function") return target() || null;
  if ("current" in target) return target.current;
  return target;
}

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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

function isVisibleInViewport(element: HTMLElement, topOffset: number, bottomOffset: number) {
  const rect = element.getBoundingClientRect();
  return rect.top >= topOffset && rect.bottom <= window.innerHeight - bottomOffset;
}

function isVisibleInContainer(element: HTMLElement, container: HTMLElement, topOffset: number, bottomOffset: number) {
  const rect = element.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  return rect.top >= containerRect.top + topOffset && rect.bottom <= containerRect.bottom - bottomOffset;
}

export function scrollIntoViewWithOffset(target: HTMLElement | null | undefined, options: RevealContentOptions = {}) {
  if (!target || typeof window === "undefined") return false;

  const topOffset = options.topOffset ?? 24;
  const bottomOffset = options.bottomOffset ?? 112;
  const behavior: ScrollBehavior = prefersReducedMotion() ? "auto" : options.behavior || "smooth";
  const parent = scrollParent(target);

  if (parent) {
    if (isVisibleInContainer(target, parent, topOffset, bottomOffset)) return false;
    const targetRect = target.getBoundingClientRect();
    const parentRect = parent.getBoundingClientRect();
    parent.scrollTo({
      top: Math.max(0, parent.scrollTop + targetRect.top - parentRect.top - topOffset),
      behavior
    });
    return true;
  }

  if (isVisibleInViewport(target, topOffset, bottomOffset)) return false;
  const rect = target.getBoundingClientRect();
  window.scrollTo({
    top: Math.max(0, window.scrollY + rect.top - topOffset),
    behavior
  });
  return true;
}

export function useRevealContent(defaultOptions: RevealContentOptions = {}) {
  const timerRef = useRef<number | null>(null);
  const defaultOptionsRef = useRef(defaultOptions);

  defaultOptionsRef.current = defaultOptions;

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  return useCallback(
    (target: RevealTarget, options: RevealContentOptions = {}) => {
      if (typeof window === "undefined") return;
      if (timerRef.current) window.clearTimeout(timerRef.current);

      const delayMs = options.delayMs ?? defaultOptionsRef.current.delayMs ?? 80;
      timerRef.current = window.setTimeout(() => {
        scrollIntoViewWithOffset(resolveTarget(target), { ...defaultOptionsRef.current, ...options });
      }, delayMs);
    },
    []
  );
}
