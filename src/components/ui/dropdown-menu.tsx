"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

// --- Single-open manager (only one dropdown open at a time) ---
let activeMenuId: string | null = null;
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
function getActiveMenuId() {
  return activeMenuId;
}
function setActiveMenuId(id: string | null) {
  if (activeMenuId === id) return;
  activeMenuId = id;
  listeners.forEach((cb) => cb());
}

/** Close any open dropdown (e.g. on route change). */
export function closeAllDropdowns() {
  setActiveMenuId(null);
}

interface DropdownMenuContextValue {
  id: string;
  open: boolean;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  contentRef: React.RefObject<HTMLDivElement | null>;
  setOpen: (v: boolean) => void;
}

const DropdownMenuContext = React.createContext<DropdownMenuContextValue | null>(
  null
);

function useDropdownMenuContext() {
  const ctx = React.useContext(DropdownMenuContext);
  if (!ctx) {
    throw new Error("DropdownMenu components must be used within <DropdownMenu>");
  }
  return ctx;
}

export function DropdownMenu({
  children,
  onOpenChange,
}: {
  children: React.ReactNode;
  onOpenChange?: (open: boolean) => void;
}) {
  const id = React.useId();
  const open =
    React.useSyncExternalStore(subscribe, getActiveMenuId, () => null) === id;
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);

  const setOpen = React.useCallback(
    (v: boolean) => {
      setActiveMenuId(v ? id : null);
      onOpenChange?.(v);
    },
    [id, onOpenChange]
  );

  React.useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || contentRef.current?.contains(t))
        return;
      setActiveMenuId(null);
      onOpenChange?.(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveMenuId(null);
        onOpenChange?.(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onOpenChange]);

  const value = React.useMemo<DropdownMenuContextValue>(
    () => ({ id, open, triggerRef, contentRef, setOpen }),
    [id, open, setOpen]
  );

  return (
    <DropdownMenuContext.Provider value={value}>
      {children}
    </DropdownMenuContext.Provider>
  );
}

export const DropdownMenuTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, ...props }, ref) => {
  const ctx = useDropdownMenuContext();
  const setRef = (node: HTMLButtonElement | null) => {
    ctx.triggerRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref)
      (ref as React.MutableRefObject<HTMLButtonElement | null>).current = node;
  };
  return (
    <button
      ref={setRef}
      type="button"
      aria-haspopup="menu"
      aria-expanded={ctx.open}
      onClick={() => ctx.setOpen(!ctx.open)}
      className={cn(
        "inline-flex items-center justify-center gap-1 outline-none focus-visible:ring-2 focus-visible:ring-accent",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
});
DropdownMenuTrigger.displayName = "DropdownMenuTrigger";

export const DropdownMenuContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    align?: "start" | "end" | "center";
    sideOffset?: number;
  }
>(({ className, children, align = "start", sideOffset = 8, ...props }, ref) => {
  const ctx = useDropdownMenuContext();
  const [style, setStyle] = React.useState<React.CSSProperties | null>(null);

  const update = React.useCallback(() => {
    const trigger = ctx.triggerRef.current;
    const content = ctx.contentRef.current;
    if (!trigger || !content) return;
    const r = trigger.getBoundingClientRect();
    const cw = content.offsetWidth;
    const ch = content.offsetHeight;
    let top = r.bottom + sideOffset;
    let left: number;
    if (align === "end") left = r.right - cw;
    else if (align === "center") left = r.left + r.width / 2 - cw / 2;
    else left = r.left;

    const vh = window.innerHeight;
    if (top + ch > vh - 8) {
      const above = r.top - sideOffset - ch;
      if (above >= 8) top = above;
    }
    left = Math.max(8, Math.min(left, window.innerWidth - cw - 8));
    setStyle({ top, left, visibility: "visible" });
  }, [ctx, align, sideOffset]);

  React.useLayoutEffect(() => {
    if (!ctx.open) return;
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [ctx.open, update]);

  React.useEffect(() => {
    if (!ctx.open) return;
    const root = ctx.contentRef.current;
    if (!root) return;
    const items = Array.from(
      root.querySelectorAll<HTMLElement>("[data-dropdown-item]")
    );
    const first = items[0]?.querySelector<HTMLElement>("a,button") || items[0];
    first?.focus();
  }, [ctx.open]);

  if (!ctx.open || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={(node) => {
        ctx.contentRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref)
          (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
      }}
      role="menu"
      style={style ?? { visibility: "hidden" }}
      className={cn(
        "fixed z-[100] min-w-[12rem] rounded-md border bg-popover p-1 text-popover-foreground shadow-lg animate-in fade-in-80",
        className
      )}
      onKeyDown={(e) => {
        const root = ctx.contentRef.current;
        if (!root) return;
        const items = Array.from(
          root.querySelectorAll<HTMLElement>("[data-dropdown-item]")
        );
        if (!items.length) return;
        const active = document.activeElement as HTMLElement;
        const idx = items.indexOf(active);
        const focusTarget = (el: HTMLElement) =>
          (el.querySelector<HTMLElement>("a,button") || el).focus();
        if (e.key === "ArrowDown") {
          e.preventDefault();
          focusTarget(items[(idx + 1) % items.length]);
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          focusTarget(items[(idx - 1 + items.length) % items.length]);
        } else if (e.key === "Home") {
          e.preventDefault();
          focusTarget(items[0]);
        } else if (e.key === "End") {
          e.preventDefault();
          focusTarget(items[items.length - 1]);
        }
      }}
      {...props}
    >
      {children}
    </div>,
    document.body
  );
});
DropdownMenuContent.displayName = "DropdownMenuContent";

export const DropdownMenuItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { inset?: boolean }
>(({ className, inset, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      role="menuitem"
      tabIndex={0}
      data-dropdown-item
      onKeyDown={(e) => {
        if (
          (e.key === "Enter" || e.key === " ") &&
          !(e.target as HTMLElement).closest("a,button")
        ) {
          e.preventDefault();
          (e.currentTarget as HTMLElement).click();
        }
      }}
      className={cn(
        "relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent/10 hover:text-accent focus-visible:bg-accent/10 focus-visible:text-accent data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0",
        inset && "pl-8",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});
DropdownMenuItem.displayName = "DropdownMenuItem";

export const DropdownMenuSeparator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      role="separator"
      className={cn("-mx-1 my-1 h-px bg-muted", className)}
      {...props}
    />
  );
});
DropdownMenuSeparator.displayName = "DropdownMenuSeparator";
