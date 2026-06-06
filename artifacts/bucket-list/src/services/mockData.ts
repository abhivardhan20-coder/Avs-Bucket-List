
import { MediaItem, MediaType } from '../types';

export const MOCK_LIBRARY: MediaItem[] = [
  {
    id: 'm1',
    title: 'Inception',
    type: MediaType.Movie,
    backdropUrl: 'https://picsum.photos/seed/inception-bg/1920/1080',
    posterUrl: 'https://picsum.photos/seed/inception-poster/300/450',
    overview: 'A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.',
    rating: 8.8,
    year: 2010,
    genres: ['Sci-Fi', 'Action', 'Thriller'],
    director: 'Christopher Nolan',
    cast: ['Leonardo DiCaprio', 'Joseph Gordon-Levitt', 'Elliot Page'],
    runtime: 148,
    trailerId: 'YoHD9XEInc0'
  },
  {
    id: 's1',
    title: 'Stranger Things',
    type: MediaType.Series,
    backdropUrl: 'https://picsum.photos/seed/stranger-bg/1920/1080',
    posterUrl: 'https://picsum.photos/seed/stranger-poster/300/450',
    overview: 'When a young boy disappears, his mother, a police chief and his friends must confront terrifying supernatural forces in order to get him back.',
    rating: 8.7,
    year: 2016,
    genres: ['Sci-Fi', 'Horror', 'Drama'],
    trailerId: 'b9EkMc79ZSU',
    totalEpisodes: 34,
    seasons: [
      {
        id: 'st-s1',
        number: 1,
        episodes: [
          { id: 'st-s1-e1', number: 1, title: 'Chapter One: The Vanishing of Will Byers', runtime: 47, watched: false },
          { id: 'st-s1-e2', number: 2, title: 'Chapter Two: The Weirdo on Maple Street', runtime: 55, watched: false }
        ]
      },
      {
        id: 'st-s2',
        number: 2,
        episodes: [
          { id: 'st-s2-e1', number: 1, title: 'Chapter One: MADMAX', runtime: 48, watched: false }
        ]
      }
    ]
  },
  {
    id: 'a1',
    title: 'Attack on Titan',
    type: MediaType.Anime,
    backdropUrl: 'https://picsum.photos/seed/aot-bg/1920/1080',
    posterUrl: 'https://picsum.photos/seed/aot-poster/300/450',
    overview: 'After his hometown is destroyed and his mother is killed, young Eren Jaeger vows to cleanse the earth of the giant humanoid Titans that have brought humanity to the brink of extinction.',
    rating: 9.0,
    year: 2013,
    genres: ['Animation', 'Action', 'Dark Fantasy'],
    trailerId: 'MGRm4IzAb1g',
    totalEpisodes: 88,
    seasons: [
      {
        id: 'aot-s1',
        number: 1,
        episodes: [
          { id: 'aot-s1-e1', number: 1, title: 'To You, in 2000 Years: The Fall of Shiganshina, Part 1', runtime: 24, watched: false },
          { id: 'aot-s1-e2', number: 2, title: 'That Day: The Fall of Shiganshina, Part 2', runtime: 24, watched: false }
        ]
      }
    ]
  },
  {
    id: 'm2',
    title: 'Interstellar',
    type: MediaType.Movie,
    backdropUrl: 'https://picsum.photos/seed/interstellar-bg/1920/1080',
    posterUrl: 'https://picsum.photos/seed/interstellar-poster/300/450',
    overview: 'A team of explorers travel through a wormhole in space in an attempt to ensure humanity\'s survival.',
    rating: 8.6,
    year: 2014,
    genres: ['Sci-Fi', 'Drama', 'Adventure'],
    director: 'Christopher Nolan',
    runtime: 169,
    trailerId: 'zSWdZVtXT7E'
  },
  {
    id: 'm3',
    title: 'The Grand Budapest Hotel',
    type: MediaType.Movie,
    backdropUrl: 'https://picsum.photos/seed/budapest-bg/1920/1080',
    posterUrl: 'https://picsum.photos/seed/budapest-poster/300/450',
    overview: 'A writer encounters the owner of an aging high-class hotel, who tells him of his early years serving as a lobby boy in the hotel\'s glorious years under an exceptional concierge.',
    rating: 8.1,
    year: 2014,
    genres: ['Comedy', 'Drama'],
    director: 'Wes Anderson',
    runtime: 99,
    trailerId: '1Fg5iWmQjwk'
  },
  {
    id: 's2',
    title: 'Breaking Bad',
    type: MediaType.Series,
    backdropUrl: 'https://picsum.photos/seed/bb-bg/1920/1080',
    posterUrl: 'https://picsum.photos/seed/bb-poster/300/450',
    overview: 'A high school chemistry teacher diagnosed with inoperable lung cancer turns to manufacturing and selling methamphetamine in order to secure his family\'s future.',
    rating: 9.5,
    year: 2008,
    genres: ['Crime', 'Drama', 'Thriller'],
    trailerId: 'HhesaQXLuRY',
    totalEpisodes: 62,
    seasons: [
       {
        id: 'bb-s1',
        number: 1,
        episodes: [
          { id: 'bb-s1-e1', number: 1, title: 'Pilot', runtime: 58, watched: false },
          { id: 'bb-s1-e2', number: 2, title: 'Cat\'s in the Bag...', runtime: 48, watched: false }
        ]
      }
    ]
  }
];

// Helper to get random subset
export const getTrending = () => MOCK_LIBRARY.slice(0, 4);
export const getTopRated = () => MOCK_LIBRARY.filter(m => m.rating > 8.5);
export const getAnime = () => MOCK_LIBRARY.filter(m => m.type === MediaType.Anime);
export const getById = (id: string) => MOCK_LIBRARY.find(m => m.id === id);