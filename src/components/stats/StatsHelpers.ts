import { WatchedItem, MediaType } from '@/types';

/**
 * Performance-optimized calculation helpers
 * Uses single-pass iterations where possible for 10/10 performance
 */

export const calculateTimeStats = (watched: WatchedItem[]) => {
  let totalMinutes = 0;
  let movieMinutes = 0;
  let seriesMinutes = 0;
  let animeMinutes = 0;
  let minutesThisYear = 0;
  let movieCount = 0;
  let seriesCount = 0;
  let animeCount = 0;
  
  const currentYear = new Date().getFullYear();

  for (let i = 0; i < watched.length; i++) {
    const item = watched[i];
    const time = Number(item.watchedRuntime) || 0;
    totalMinutes += time;

    if (item.type === MediaType.Movie) { movieMinutes += time; movieCount++; }
    else if (item.type === MediaType.Series) { seriesMinutes += time; seriesCount++; }
    else if (item.type === MediaType.Anime) { animeMinutes += time; animeCount++; }

    const updatedAt = new Date(item.updatedAt);
    if (!isNaN(updatedAt.getTime()) && updatedAt.getFullYear() === currentYear) {
      minutesThisYear += time;
    }
  }

  return {
    totalMinutes,
    movieMinutes,
    seriesMinutes,
    animeMinutes,
    hours: Math.floor(totalMinutes / 60),
    days: (totalMinutes / (60 * 24)).toFixed(1),
    hoursThisYear: Math.floor(minutesThisYear / 60),
    hoursMovies: Math.floor(movieMinutes / 60),
    hoursSeries: Math.floor(seriesMinutes / 60),
    hoursAnime: Math.floor(animeMinutes / 60),
    movieCount,
    seriesCount,
    animeCount
  };
};

export const getGenreBreakdown = (watched: WatchedItem[]) => {
  const genreCounts = new Map<string, number>();

  for (let i = 0; i < watched.length; i++) {
    const genres = watched[i].genres;
    if (genres) {
      for (let j = 0; j < genres.length; j++) {
        const genre = genres[j];
        genreCounts.set(genre, (genreCounts.get(genre) || 0) + 1);
      }
    }
  }

  return Array.from(genreCounts.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
};

export const getCategoryDistribution = (watched: WatchedItem[]) => {
  let movies = 0;
  let series = 0;
  let anime = 0;

  for (let i = 0; i < watched.length; i++) {
    const type = watched[i].type;
    if (type === MediaType.Movie) movies++;
    else if (type === MediaType.Series) series++;
    else if (type === MediaType.Anime) anime++;
  }

  return { movies, series, anime };
};

export const getTopPeople = (watched: WatchedItem[]) => {
  const actorCounts = new Map<string, number>();
  const directorCounts = new Map<string, number>();

  for (let i = 0; i < watched.length; i++) {
    const item = watched[i];
    const cast = item.cast;
    if (cast) {
      for (let j = 0; j < cast.length; j++) {
        const actor = cast[j];
        actorCounts.set(actor, (actorCounts.get(actor) || 0) + 1);
      }
    }
    const director = item.director;
    if (director) {
      directorCounts.set(director, (directorCounts.get(director) || 0) + 1);
    }
  }

  const topActors = Array.from(actorCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  const topDirectors = Array.from(directorCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  return { topActors, topDirectors };
};

export const getActivityTimeline = (watched: WatchedItem[]) => {
  const timeline = new Map<string, number>();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Initialize last 12 months with Map for O(1) lookups
  const today = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const key = `${months[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`;
    timeline.set(key, 0);
  }

  for (let i = 0; i < watched.length; i++) {
    const date = new Date(watched[i].updatedAt);
    if (!isNaN(date.getTime())) {
      const key = `${months[date.getMonth()]} ${date.getFullYear().toString().slice(2)}`;
      if (timeline.has(key)) {
        timeline.set(key, (timeline.get(key) || 0) + 1);
      }
    }
  }

  return Array.from(timeline.entries()).map(([name, count]) => ({ name, count }));
};

export const checkAchievements = (watched: WatchedItem[]) => {
  const achievements = [];
  const stats = calculateTimeStats(watched);
  const counts = getCategoryDistribution(watched);

  // 1. Movie Awards
  if (counts.movies >= 100) {
    achievements.push({ id: 'blockbuster', title: 'Blockbuster', desc: 'Watched 100+ movies', icon: '🎟️' });
  } else if (counts.movies >= 50) {
    achievements.push({ id: 'movie_buff', title: 'Movie Buff', desc: 'Watched 50+ movies', icon: '🎬' });
  }

  // 2. Series Awards
  let totalEps = 0;
  for (let i = 0; i < watched.length; i++) {
    totalEps += Number(watched[i].watchedEpisodes) || 0;
  }

  if (totalEps >= 500) {
    achievements.push({ id: 'marathon_runner', title: 'Marathon Runner', desc: 'Watched 500+ episodes', icon: '🏃' });
  } else if (totalEps >= 100) {
    achievements.push({ id: 'series_binger', title: 'Serial Binger', desc: 'Watched 100+ episodes', icon: '📺' });
  }

  // 3. Time Awards
  const daysTotal = parseFloat(stats.days);
  if (daysTotal >= 30) {
    achievements.push({ id: 'month_long', title: 'Couch Potato', desc: 'Spent 1 month watching content', icon: ' potatoes' });
  } else if (daysTotal >= 7) {
    achievements.push({ id: 'time_lord', title: 'Time Lord', desc: 'Spent 1 week watching content', icon: '⏳' });
  }

  // 4. Anime Awards
  if (counts.anime >= 50) {
    achievements.push({ id: 'super_otaku', title: 'Super Otaku', desc: 'Watched 50+ anime titles', icon: '🍣' });
  } else if (counts.anime >= 20) {
    achievements.push({ id: 'otaku', title: 'Otaku', desc: 'Watched 20+ anime titles', icon: '⛩️' });
  }

  // 5. Genre Mastery - Reuse breakdown for performance
  const genreBreakdown = getGenreBreakdown(watched);
  const genreMap = new Map(genreBreakdown.map(g => [g.name, g.value]));

  if ((genreMap.get('Horror') || 0) >= 10) achievements.push({ id: 'scream_queen', title: 'Scream Queen', desc: 'Watched 10+ Horror titles', icon: '👻' });
  if ((genreMap.get('Comedy') || 0) >= 20) achievements.push({ id: 'laugh_track', title: 'Laugh Track', desc: 'Watched 20+ Comedy titles', icon: '😂' });
  if ((genreMap.get('Action') || 0) >= 20) achievements.push({ id: 'adrenaline', title: 'Adrenaline Junkie', desc: 'Watched 20+ Action titles', icon: '🔥' });
  
  const scifiCount = (genreMap.get('Science Fiction') || 0) + (genreMap.get('Sci-Fi') || 0);
  if (scifiCount >= 10) achievements.push({ id: 'space_cadet', title: 'Space Cadet', desc: 'Watched 10+ Sci-Fi titles', icon: '👽' });
  
  if ((genreMap.get('Romance') || 0) >= 10) achievements.push({ id: 'romantic', title: 'Hopeless Romantic', desc: 'Watched 10+ Romance titles', icon: '💝' });

  if (genreMap.size >= 10) {
    achievements.push({ id: 'explorer', title: 'Genre Explorer', desc: 'Watched 10+ different genres', icon: '🗺️' });
  }

  // 6. Era Awards
  let oldSchoolCount = 0;
  for (let i = 0; i < watched.length; i++) {
    if (watched[i].year < 1980) oldSchoolCount++;
  }
  if (oldSchoolCount >= 5) {
    achievements.push({ id: 'old_school', title: 'Old School', desc: 'Watched 5+ classics (pre-1980)', icon: '🎞️' });
  }

  // 7. Completionist (Completed Shows)
  let completedShows = 0;
  for (let i = 0; i < watched.length; i++) {
    const item = watched[i];
    if ((item.type === MediaType.Series || item.type === MediaType.Anime) && 
         item.totalEpisodes > 0 && 
         item.watchedEpisodes >= item.totalEpisodes) {
      completedShows++;
    }
  }

  if (completedShows >= 5) {
    achievements.push({ id: 'completionist', title: 'Completionist', desc: 'Finished 5+ complete series', icon: '🎖️' });
  } else if (completedShows >= 1) {
    achievements.push({ id: 'finisher', title: 'The Finisher', desc: 'Finished a complete series', icon: '🏁' });
  }

  if (watched.length > 0 && achievements.length === 0) {
    achievements.push({ id: 'novice', title: 'Novice Watcher', desc: 'Started the journey', icon: '🌱' });
  }

  return achievements;
};