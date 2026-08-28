"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  placeholder?: string;
}

type Coords = { top: number; left: number; width: number };

const SelectContext = React.createContext<{
  value: string;
  onValueChange: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: React.MutableRefObject<HTMLButtonElement | null>;
  coords: Coords | null;
} | null>(null);

function Select({ value, onValueChange, children }: SelectProps) {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const [coords, setCoords] = React.useState<Coords | null>(null);

  React.useEffect(() => {
    if (open && triggerRef.current) {
      const t = triggerRef.current.getBoundingClientRect();
      setCoords({ top: t.bottom + 4, left: t.left, width: t.width });
    }
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <SelectContext.Provider value={{ value, onValueChange, open, setOpen, triggerRef, coords }}>
      <div className="relative">{children}</div>
    </SelectContext.Provider>
  );
}

const SelectTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, ...props }, ref) => {
  const ctx = React.useContext(SelectContext);
  return (
    <button
      ref={(node) => {
        if (ctx) ctx.triggerRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) (ref as React.MutableRefObject<HTMLButtonElement | null>).current = node;
      }}
      type="button"
      onClick={() => ctx?.setOpen(!ctx?.open)}
      className={cn(
        "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
        className
      )}
      {...props}
    >
      {children}
      <ChevronDown className="h-4 w-4 opacity-50" />
    </button>
  );
});
SelectTrigger.displayName = "SelectTrigger";

const SelectValue = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => {
  const ctx = React.useContext(SelectContext);
  return (
    <span
      ref={ref}
      className={cn("block truncate", !ctx?.value && "text-muted-foreground", className)}
      {...props}
    >
      {ctx?.value || props.children || "Select..."}
    </span>
  );
});
SelectValue.displayName = "SelectValue";

const SelectContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  const ctx = React.useContext(SelectContext);
  const localRef = React.useRef<HTMLDivElement>(null);
  const [style, setStyle] = React.useState<React.CSSProperties | null>(null);

  const measure = React.useCallback(() => {
    if (!ctx?.open || !ctx.triggerRef.current) return;
    const t = ctx.triggerRef.current.getBoundingClientRect();
    const h = localRef.current?.offsetHeight ?? 220;
    let top = t.bottom + 4;
    if (top + h > window.innerHeight - 8) top = Math.max(8, t.top - h - 4);
    setStyle({ position: "fixed", top, left: t.left, width: t.width, zIndex: 60 });
  }, [ctx?.open]);

  React.useLayoutEffect(() => {
    measure();
  }, [measure]);

  React.useEffect(() => {
    if (!ctx?.open) return;
    const onScroll = () => measure();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    window.visualViewport?.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
      window.visualViewport?.removeEventListener("resize", onScroll);
    };
  }, [ctx?.open, measure]);

  if (!ctx?.open) return null;

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-50"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) ctx.setOpen(false);
        }}
      />
      <div
        ref={(node) => {
          (localRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
          if (typeof ref === "function") ref(node);
          else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }}
        style={style ?? (ctx.coords ? { position: "fixed", ...ctx.coords, zIndex: 60 } : undefined)}
        className={cn(
          "max-h-60 overflow-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-80",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </>,
    document.body
  );
});
SelectContent.displayName = "SelectContent";

const SelectItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { value: string }
>(({ className, value, children, ...props }, ref) => {
  const ctx = React.useContext(SelectContext);
  const selected = ctx?.value === value;
  return (
    <div
      ref={ref}
      onClick={() => {
        ctx?.onValueChange(value);
        ctx?.setOpen(false);
      }}
      className={cn(
        "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none hover:bg-accent/10 hover:text-accent",
        selected && "bg-accent/15 text-accent",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});
SelectItem.displayName = "SelectItem";

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };
