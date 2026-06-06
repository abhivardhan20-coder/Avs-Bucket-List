/**
 * Timing Utilities — Barrel Export
 *
 * Use this module to import all timing primitives from a single location.
 *
 * - For plain JS/non-React contexts: use `debounce`, `throttle`, `debounceImmediate`
 * - For React components/hooks: use `useDebounce`
 */
export { debounce, throttle, debounceImmediate } from './debounce';
export { useDebounce } from '../hooks/useDebounce';
