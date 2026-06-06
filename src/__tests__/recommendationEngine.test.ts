import { describe, it, expect } from 'vitest';
import { buildUserTaste, scoreItem, UserTaste } from '../lib/recommendationEngine';
import { MediaType, MediaItem } from '../types';

describe('recommendationEngine', () => {
    describe('buildUserTaste', () => {
        it('should extract top genres and preferred type from watch history', async () => {
            const mockWatched = [
                {
                    type: MediaType.Anime,
                    genres: ['Action', 'Fantasy'],
                    rating: 9,
                    updatedAt: new Date().toISOString()
                },
                {
                    type: MediaType.Anime,
                    genres: ['Action', 'Adventure'],
                    rating: 8,
                    updatedAt: new Date().toISOString()
                },
                {
                    type: MediaType.Movie,
                    genres: ['Sci-Fi'],
                    rating: 10,
                    updatedAt: new Date().toISOString()
                }
            ];

            const taste = await buildUserTaste(mockWatched as any);

            expect(taste.preferredType).toBe(MediaType.Anime);
            // Action appears twice, should be top genre
            expect(taste.topGenres[0].genre).toBe('Action');
            expect(taste.avgRatingByGenre['Sci-Fi']).toBe(10);
            expect(taste.avgRatingByGenre['Action']).toBe(8.5);
        });

        it('should extract top cast and directors and respect top-5 slice', async () => {
            const mockWatched = [
                {
                    type: MediaType.Movie,
                    genres: ['Drama'],
                    director: 'Director A',
                    cast: ['Actor 1', 'Actor 2'],
                    updatedAt: new Date().toISOString()
                },
                {
                    type: MediaType.Movie,
                    genres: ['Drama'],
                    director: 'Director A',
                    cast: ['Actor 1', 'Actor 3'],
                    updatedAt: new Date().toISOString()
                },
                // Add more actors to push Actor 3 out of top 5
                { type: MediaType.Movie, genres: ['Drama'], cast: ['Top1', 'Top2', 'Top3', 'Top4', 'Top5'], updatedAt: new Date().toISOString() },
                { type: MediaType.Movie, genres: ['Drama'], cast: ['Top1', 'Top2', 'Top3', 'Top4', 'Top5'], updatedAt: new Date().toISOString() }
            ];

            const taste = await buildUserTaste(mockWatched as any);

            expect(taste.topDirectors).toContain('Director A');
            expect(taste.topCast).toContain('Actor 1');
            expect(taste.topCast).toContain('Top1');
            expect(taste.topCast).not.toContain('Actor 3'); // Top1..5 plus Actor 1 = 6 actors. Actor 3 gets cut.
        });

        it('should handle empty history gracefully', async () => {
            const taste = await buildUserTaste([]);
            expect(taste.topGenres).toEqual([]);
            expect(taste.preferredType).toBe(MediaType.Movie); // Default
        });

        it('gives higher score to recent watches (recency weighting)', async () => {
            const now = Date.now();
            const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;

            const mockWatched = [
              {
                id: 'recent',
                type: MediaType.Movie,
                genres: ['Sci-Fi'],
                rating: 10,
                updatedAt: new Date(now).toISOString()
              },
              {
                id: 'old',
                type: MediaType.Movie,
                genres: ['Action'],
                rating: 10,
                updatedAt: new Date(now - ONE_YEAR_MS).toISOString()
              }
            ];

            const taste = await buildUserTaste(mockWatched as any);

            const sciFiScore = taste.topGenres.find(g => g.genre === 'Sci-Fi')?.score || 0;
            const actionScore = taste.topGenres.find(g => g.genre === 'Action')?.score || 0;

            // Sci-Fi (recent) should have a higher score than Action (1 year old)
            expect(sciFiScore).toBeGreaterThan(actionScore);
        });

        it('applies rating boost to genre scores', async () => {
            const mockWatched = [
              {
                id: 'good',
                type: MediaType.Movie,
                genres: ['Horror'],
                rating: 10,
                updatedAt: new Date().toISOString()
              },
              {
                id: 'bad',
                type: MediaType.Movie,
                genres: ['Comedy'],
                rating: 2,
                updatedAt: new Date().toISOString()
              }
            ];

            const taste = await buildUserTaste(mockWatched as any);

            const horrorScore = taste.topGenres.find(g => g.genre === 'Horror')?.score || 0;
            const comedyScore = taste.topGenres.find(g => g.genre === 'Comedy')?.score || 0;

            // Horror (rating 10) should have a significantly higher score than Comedy (rating 2)
            expect(horrorScore).toBeGreaterThan(comedyScore * 2);
        });
    });

    describe('scoreItem', () => {
        const sampleTaste: UserTaste = {
            topGenres: [{ genre: 'Action', score: 10 }, { genre: 'Sci-Fi', score: 5 }],
            topCast: ['Actor A'],
            topDirectors: ['Director X'],
            preferredType: MediaType.Anime,
            avgRatingByGenre: { 'Action': 4.5, 'Sci-Fi': 4.0 }
        };

        const excludedIds = new Set(['already-watched']);

        it('should return -1 for already watched items', () => {
            const item = { id: 'already-watched' } as MediaItem;
            expect(scoreItem(item, sampleTaste, excludedIds)).toBe(-1);
        });

        it('should score highly for matching genres and type', () => {
            const item = {
                id: 'new-show',
                type: MediaType.Anime,
                genres: ['Action'],
                rating: 8
            } as MediaItem;

            const score = scoreItem(item, sampleTaste, excludedIds);
            expect(score).toBeGreaterThan(20); // Action score * 2.5 + type affinity + boost
        });

        it('should give boosts for matching cast and director', () => {
            const baseItem = {
                id: '1',
                type: MediaType.Movie,
                genres: [],
                rating: 0
            } as MediaItem;

            const scoreBase = scoreItem(baseItem, sampleTaste, excludedIds);

            const itemWithCast = { ...baseItem, id: '2', cast: ['Actor A'] } as MediaItem;
            const scoreWithCast = scoreItem(itemWithCast, sampleTaste, excludedIds);

            expect(scoreWithCast).toBeGreaterThan(scoreBase);
            expect(scoreWithCast - scoreBase).toBe(2); // Actor A boost
        });
    });
});
