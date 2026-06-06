
## 2026-05-11 - [Optimization: Cache-First Retrieval for Library Rows]
**Learning:** Components using direct `tmdb.*` services bypass the local Dexie `mediaCache`, leading to redundant network traffic. Using `ContentService` ensures cache-first retrieval.
**Action:** Always prefer `ContentService` methods for fetching details of items already present in the user's library to minimize latency and TMDB API usage.
