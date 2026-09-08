/**
 * Phase 26 — the legacy thumbnail journey was replaced by the journey-state
 * engine (`./journey-state.ts`). This module re-exports the new types so any
 * existing importer keeps compiling; new code should import journey-state
 * directly.
 */
export * from "./journey-state.ts";