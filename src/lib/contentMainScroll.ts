export const CONTENT_MAIN_ROOT_SELECTOR = ".content-panel-content";

const CONTENT_MAIN_SCROLL_STEP_PX = 56;

const CONTENT_MAIN_SCROLL_SELECTORS = [
  "[data-content-main-scroll]",
  ".vault-document-scroll",
  ".linear-issue-scroll",
  ".workspace-status-list-scroll",
  ".project-overview-scroll",
];

function isScrollable(element: HTMLElement): boolean {
  if (element.scrollHeight <= element.clientHeight + 1) return false;
  const style = window.getComputedStyle(element);
  const overflowY = style.overflowY;
  return overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay";
}

function isVisible(element: HTMLElement): boolean {
  return element.offsetParent !== null || element === document.body;
}

function findFocusedScrollTarget(root: HTMLElement): HTMLElement | null {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement) || !root.contains(active)) {
    return null;
  }

  let node: HTMLElement | null = active;
  while (node && node !== root) {
    if (isScrollable(node)) return node;
    node = node.parentElement;
  }

  return null;
}

function findPrimaryScrollTarget(root: HTMLElement): HTMLElement | null {
  let best: HTMLElement | null = null;
  let bestArea = 0;

  for (const selector of CONTENT_MAIN_SCROLL_SELECTORS) {
    for (const element of root.querySelectorAll<HTMLElement>(selector)) {
      if (!isVisible(element) || !isScrollable(element)) continue;
      const area = element.clientWidth * element.clientHeight;
      if (area > bestArea) {
        best = element;
        bestArea = area;
      }
    }
  }

  if (best) return best;

  for (const element of root.querySelectorAll<HTMLElement>("*")) {
    if (!isVisible(element) || !isScrollable(element)) continue;
    const area = element.clientWidth * element.clientHeight;
    if (area > bestArea) {
      best = element;
      bestArea = area;
    }
  }

  return best;
}

export function findContentMainScrollTarget(): HTMLElement | null {
  const root = document.querySelector<HTMLElement>(CONTENT_MAIN_ROOT_SELECTOR);
  if (!root || !isVisible(root)) return null;
  return findFocusedScrollTarget(root) ?? findPrimaryScrollTarget(root);
}

export function scrollContentMain(direction: "up" | "down"): boolean {
  const target = findContentMainScrollTarget();
  if (!target) return false;

  const delta = direction === "down" ? CONTENT_MAIN_SCROLL_STEP_PX : -CONTENT_MAIN_SCROLL_STEP_PX;
  target.scrollBy({ top: delta, behavior: "auto" });
  return true;
}
