import { describe, it, expect } from 'vitest';
import { cleanSeriesTitle } from '../utils/stringUtils';

describe('stringUtils - cleanSeriesTitle', () => {
    it('should strip simple "Season" suffixes', () => {
        expect(cleanSeriesTitle('Solo Leveling Season 2')).toBe('Solo Leveling');
        expect(cleanSeriesTitle('Demon Slayer Season 3')).toBe('Demon Slayer');
    });

    it('should strip "Part" suffixes', () => {
        expect(cleanSeriesTitle('Attack on Titan Part 2')).toBe('Attack on Titan');
    });

    it('should handle colons and subtitles', () => {
        expect(cleanSeriesTitle('Jujutsu Kaisen: Shibuya Incident')).toBe('Jujutsu Kaisen');
        expect(cleanSeriesTitle('Bleach: Thousand-Year Blood War')).toBe('Bleach');
    });

    it('should handle multiple suffixes recursively', () => {
        // "Show Season 3 Part 2" 
        // Iteration 1: "Show Part 2"
        // Iteration 2: "Show"
        expect(cleanSeriesTitle('Mushoku Tensei Season 2 Part 2')).toBe('Mushoku Tensei');
    });

    it('should strip Roman numeral suffixes at the end of the title', () => {
        expect(cleanSeriesTitle('Psycho-Pass II')).toBe('Psycho-Pass');
        expect(cleanSeriesTitle('Overlord III')).toBe('Overlord');
        expect(cleanSeriesTitle('Kingdom IV')).toBe('Kingdom');
    });

    it('should handle ordinal suffixes', () => {
        expect(cleanSeriesTitle('Kaguya-sama 3rd Season')).toBe('Kaguya-sama');
        expect(cleanSeriesTitle('Haikyuu!! 2nd Season')).toBe('Haikyuu!!');
    });

    it('should handle Japanese season markers', () => {
        expect(cleanSeriesTitle('Fire Force Ni no Shou')).toBe('Fire Force');
        expect(cleanSeriesTitle('Mob Psycho 100 III')).toBe('Mob Psycho 100');
    });

    it('should return empty string if input is empty', () => {
        expect(cleanSeriesTitle('')).toBe('');
    });

    it('should trim surrounding whitespace', () => {
        expect(cleanSeriesTitle('   Naruto   ')).toBe('Naruto');
    });
});
