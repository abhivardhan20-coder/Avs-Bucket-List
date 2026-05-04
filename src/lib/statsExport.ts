/**
 * CSV Export Utility for Stats Dashboard
 * Provides lightweight alternative to html2canvas for exporting statistics
 */

import { WatchedItem, MediaType } from '@/types';

export interface StatsExportData {
  title: string;
  exportDate: string;
  summary: {
    totalTitles: number;
    totalHours: number;
    totalMinutes: number;
    movies: number;
    series: number;
    anime: number;
  };
  genreBreakdown: Array<{ name: string; count: number }>;
  topActors: Array<{ name: string; count: number }>;
  topDirectors: Array<{ name: string; count: number }>;
  activityTimeline: Array<{ month: string; count: number }>;
}

/**
 * Generate CSV from stats data
 * Fast and lightweight alternative to image export
 */
export const generateStatsCSV = (data: StatsExportData): string => {
  const lines: string[] = [];

  // Header
  lines.push(`AV's Bucket List - Statistics Export`);
  lines.push(`Generated: ${data.exportDate}\n`);

  // Summary
  lines.push('=== SUMMARY ===');
  lines.push(`Total Titles,${data.summary.totalTitles}`);
  lines.push(`Total Time,${data.summary.totalHours}h ${data.summary.totalMinutes}m`);
  lines.push(`Movies,${data.summary.movies}`);
  lines.push(`Series,${data.summary.series}`);
  lines.push(`Anime,${data.summary.anime}\n`);

  // Genre Breakdown
  if (data.genreBreakdown.length > 0) {
    lines.push('=== GENRE BREAKDOWN ===');
    lines.push('Genre,Count');
    data.genreBreakdown.forEach(g => {
      lines.push(`"${g.name}",${g.count}`);
    });
    lines.push('');
  }

  // Top Cast
  if (data.topActors.length > 0) {
    lines.push('=== TOP ACTORS ===');
    lines.push('Actor,Appearances');
    data.topActors.forEach(a => {
      lines.push(`"${a.name}",${a.count}`);
    });
    lines.push('');
  }

  // Top Directors
  if (data.topDirectors.length > 0) {
    lines.push('=== TOP DIRECTORS ===');
    lines.push('Director,Appearances');
    data.topDirectors.forEach(d => {
      lines.push(`"${d.name}",${d.count}`);
    });
    lines.push('');
  }

  // Activity Timeline
  if (data.activityTimeline.length > 0) {
    lines.push('=== ACTIVITY TIMELINE ===');
    lines.push('Month,Count');
    data.activityTimeline.forEach(t => {
      lines.push(`"${t.month}",${t.count}`);
    });
  }

  return lines.join('\n');
};

/**
 * Download CSV file to user's device
 */
export const downloadStatsCSV = (csv: string, filename?: string) => {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  link.setAttribute('href', URL.createObjectURL(blob));
  link.setAttribute('download', filename || `AV-Stats-${new Date().getFullYear()}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Generate JSON export (machine-readable backup)
 */
export const generateStatsJSON = (data: StatsExportData): string => {
  return JSON.stringify(data, null, 2);
};

/**
 * Export stats in multiple formats
 */
export const exportStats = async (
  data: StatsExportData,
  format: 'csv' | 'json' | 'both' = 'csv'
): Promise<void> => {
  if (format === 'csv' || format === 'both') {
    const csv = generateStatsCSV(data);
    downloadStatsCSV(csv);
  }

  if (format === 'json' || format === 'both') {
    const json = generateStatsJSON(data);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
    const link = document.createElement('a');
    
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', `AV-Stats-${new Date().getFullYear()}.json`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
