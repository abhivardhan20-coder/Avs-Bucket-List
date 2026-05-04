/**
 * Strips seasonal suffixes, parts, and subtitles to return a "Root" series title.
 * Example: "Solo Leveling Season 2" -> "Solo Leveling"
 * Example: "Jujutsu Kaisen: Shibuya Incident" -> "Jujutsu Kaisen"
 */
export const cleanSeriesTitle = (title: string): string => {
    if (!title) return '';

    // 1. Split by colon and take the first part (removes subtitles)
    let cleaned = title.split(':')[0];

    // 2. Remove common seasonal patterns (case insensitive)
    const patterns = [
        /\s+Season\s+\d+/gi,
        /\s+Part\s+\d+/gi,
        /\s+Cour\s+\d+/gi,
        /\s+[\d]+(?:st|nd|rd|th)\s+Season/gi,
        /\s+\d+\s*nd/gi,
        /\s+\d+\s*rd/gi,
        /\s+\d+\s*th/gi,
        /\s+[\d]nd\s+Season/gi,
        /\s+[\d]rd\s+Season/gi,
        /\s+[\d]th\s+Season/gi,
        /\s+San\s+no\s+Shou/gi,
        /\s+Ni\s+no\s+Shou/gi,
        /\s+Ichi\s+no\s+Shou/gi,
        /\s+II$/g,      // Roman numeral II at end
        /\s+III$/g,     // Roman numeral III at end
        /\s+IV$/g,      // Roman numeral IV at end
        /\s+V$/g        // Roman numeral V at end
    ];

    let iterations = 0;
    const MAX_ITERATIONS = 10;
    let lastCleaned = '';
    
    // RECURSIVE CLEANING: Run until the string stops changing (capped at 10 iterations)
    // This handles "Season 3 Part 2" -> "Season 3" -> "Root"
    while (cleaned !== lastCleaned && iterations < MAX_ITERATIONS) {
        lastCleaned = cleaned;
        patterns.forEach(pattern => {
            cleaned = cleaned.replace(pattern, '');
        });
        cleaned = cleaned.trim();
        iterations++;
    }

    return cleaned;
};