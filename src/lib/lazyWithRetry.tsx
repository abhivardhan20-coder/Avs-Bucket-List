
import React, { ComponentType, LazyExoticComponent } from 'react';

/**
 * A wrapper around React.lazy that attempts to reload the page when a chunk fails to load.
 * This is common after a new deployment when old chunks are deleted.
 */
export const lazyWithRetry = <T extends ComponentType<any>>(
    factory: () => Promise<{ default: T }>
): LazyExoticComponent<T> => {
    return React.lazy(() => {
        return new Promise((resolve, reject) => {
            factory()
                .then(resolve)
                .catch((error) => {
                    // Check if the error is a chunk load error
                    const isChunkError = error.message && (
                        error.message.includes('Failed to fetch dynamically imported module') ||
                        error.message.includes('Importing a module script failed') ||
                        error.name === 'ChunkLoadError'
                    );

                    if (isChunkError) {
                        // Check if we've already tried reloading for this session
                        const storageKey = `lazy_retry_${window.location.pathname}`;
                        const retried = sessionStorage.getItem(storageKey);

                        if (!retried) {
                            // Mark as retried and reload
                            sessionStorage.setItem(storageKey, 'true');
                            console.warn("Chunk load failed, reloading page to get fresh assets...");
                            window.location.reload();
                            return;
                        }
                    }

                    // If not a chunk error or already retried, reject
                    reject(error);
                });
        });
    });
};