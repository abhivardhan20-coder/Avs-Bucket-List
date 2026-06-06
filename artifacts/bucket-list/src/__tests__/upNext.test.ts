import { describe, it, expect } from 'vitest';
import { getUpNextForSeries, parseEpisodeId } from '../utils/upNext';
import { MediaType, WatchedItem, MediaItem } from '../types';

describe('upNext Utils', () => {
    describe('parseEpisodeId', () => {
        it('should correctly parse a standard episode ID', () => {
            const { season, episode } = parseEpisodeId('ep_123_2_5');
            expect(season).toBe(2);
            expect(episode).toBe(5);
        });

        it('should return zeros for invalid IDs', () => {
            expect(parseEpisodeId('invalid')).toEqual({ season: 0, episode: 0 });
            expect(parseEpisodeId('ep_123')).toEqual({ season: 0, episode: 0 });
        });
    });

    describe('getUpNextForSeries', () => {
        const mockMedia: MediaItem = {
            id: '123',
            title: 'Test Show',
            type: MediaType.Series,
            posterUrl: 'poster.jpg',
            backdropUrl: 'backdrop.jpg',
            overview: 'Overview',
            rating: 8,
            year: 2024,
            genres: ['Action'],
            seasons: [
                {
                    id: 's1',
                    number: 1,
                    episodes: [
                        { id: 'ep_123_1_1', number: 1, title: 'E1', runtime: 20, watched: false },
                        { id: 'ep_123_1_2', number: 2, title: 'E2', runtime: 20, watched: false },
                    ]
                },
                {
                    id: 's2',
                    number: 2,
                    episodes: [
                        { id: 'ep_123_2_1', number: 1, title: 'E1', runtime: 20, watched: false },
                    ]
                }
            ]
        };

        it('should return S1 E1 if nothing has been watched', () => {
            const watchedItem: WatchedItem = {
                id: '123',
                type: MediaType.Series,
                watchedEpisodeIds: new Set(),
                watchedEpisodes: 0,
                totalEpisodes: 3
            } as any;

            const res = getUpNextForSeries(watchedItem, mockMedia);
            expect(res?.seasonNumber).toBe(1);
            expect(res?.nextEpisode.number).toBe(1);
        });

        it('should return S1 E2 if S1 E1 is watched', () => {
            const watchedItem: WatchedItem = {
                id: '123',
                type: MediaType.Series,
                watchedEpisodeIds: new Set(['ep_123_1_1']),
                watchedEpisodes: 1,
                totalEpisodes: 3
            } as any;

            const res = getUpNextForSeries(watchedItem, mockMedia);
            expect(res?.seasonNumber).toBe(1);
            expect(res?.nextEpisode.number).toBe(2);
        });

        it('should jump to S2 E1 if all of S1 is watched', () => {
            const watchedItem: WatchedItem = {
                id: '123',
                type: MediaType.Series,
                watchedEpisodeIds: new Set(['ep_123_1_1', 'ep_123_1_2']),
                watchedEpisodes: 2,
                totalEpisodes: 3
            } as any;

            const res = getUpNextForSeries(watchedItem, mockMedia);
            expect(res?.seasonNumber).toBe(2);
            expect(res?.nextEpisode.number).toBe(1);
        });

        it('should return null if the entire show is watched', () => {
            const watchedItem: WatchedItem = {
                id: '123',
                type: MediaType.Series,
                watchedEpisodeIds: new Set(['ep_123_1_1', 'ep_123_1_2', 'ep_123_2_1']),
                watchedEpisodes: 3,
                totalEpisodes: 3
            } as any;

            const res = getUpNextForSeries(watchedItem, mockMedia);
            expect(res).toBeNull();
        });

        it('should return null if fullMedia is missing', () => {
            const watchedItem: WatchedItem = { id: '123' } as any;
            expect(getUpNextForSeries(watchedItem, null)).toBeNull();
        });
    });
});
