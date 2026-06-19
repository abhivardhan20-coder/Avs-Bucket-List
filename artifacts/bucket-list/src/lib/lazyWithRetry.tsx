
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
                        const storageKey = `lazy_retry_${window.location.pathname}`;
                        const retriesStr = sessionStorage.getItem(storageKey);
                        const retries = retriesStr ? parseInt(retriesStr, 10) : 0;

                        if (retries < 3) {
                            const delay = Math.pow(2, retries) * 500; // 500ms, 1000ms, 2000ms
                            sessionStorage.setItem(storageKey, (retries + 1).toString());
                            console.warn(`Chunk load failed, reloading page in ${delay}ms (retry ${retries + 1}/3)...`);
                            setTimeout(() => {
                                window.location.reload();
                            }, delay);
                            return;
                        }
                    }

                    // If not a chunk error or already retried 3 times, reject
                    reject(error);
                });
        });
    });
};