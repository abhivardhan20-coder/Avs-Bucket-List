---
name: React Query unstable array default
description: Using `= []` as destructuring default for React Query data creates a new array reference every render when the query is disabled (data=undefined), causing infinite useEffect loops.
---

# React Query Unstable Array Default

## The Rule
Never use `= []` as a destructuring default for React Query `data`. Use `useMemo` to stabilize.

```ts
// BAD — creates new [] every render when data is undefined:
const { data: watched = [] } = useQuery({ ..., enabled: !!user });

// GOOD — stable reference, only changes when query fetches new data:
const { data: watchedData } = useQuery({ ..., enabled: !!user });
const watched = useMemo(() => watchedData ?? [], [watchedData]);
```

**Why:** When `enabled: false` (e.g. user is null), `data` is `undefined`. The `= []` destructuring default runs fresh each render, producing a new `[]` reference. If any `useEffect` has this array as a dep, it fires every render → `setState` → re-render → new `[]` ref → infinite loop ("Maximum update depth exceeded").

**How to apply:** Any React Query `useQuery` returning an array type with `enabled` conditionally false. Check `useWatchedSlice.ts` and `useWatchlistSlice.ts` as the canonical fixed examples in this project.
