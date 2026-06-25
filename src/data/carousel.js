/** @typedef {{ id: string, client: string, leftLabel: string, rightLabel: string, number: string, image: string, width: number, height: number }} CarouselSlide */

/** @type {string[]} */
export const clientList = [
  'Netflix',
  'Pavilion',
  'ITV',
  'Wilderness Reserve',
  'Thunder Aviation',
  'Bentley Motors',
  'GQ',
  'Disney',
  'Fiorucci',
  'Burberry',
  'Mr Porter',
  'Net a Porter',
];

/** @type {Record<string, { leftLabel: string, rightLabel: string }>} */
const slideCopy = {
  Netflix: { leftLabel: 'Storytelling', rightLabel: 'Cultural relevance' },
  Pavilion: { leftLabel: 'Experience', rightLabel: 'Immersive worlds' },
  ITV: { leftLabel: 'Broadcast', rightLabel: 'Mass attention' },
  'Wilderness Reserve': { leftLabel: 'Place', rightLabel: 'Destination culture' },
  'Thunder Aviation': {
    leftLabel: 'Talent',
    rightLabel: 'Cultural and commercial value',
  },
  'Bentley Motors': { leftLabel: 'Craft', rightLabel: 'Luxury heritage' },
  GQ: { leftLabel: 'Style', rightLabel: 'Cultural currency' },
  Disney: { leftLabel: 'Imagination', rightLabel: 'Global myth-making' },
  Fiorucci: { leftLabel: 'Energy', rightLabel: 'Pop culture pulse' },
  Burberry: { leftLabel: 'Heritage', rightLabel: 'Modern Britishness' },
  'Mr Porter': { leftLabel: 'Edit', rightLabel: 'Taste-making' },
  'Net a Porter': { leftLabel: 'Commerce', rightLabel: 'Fashion ecosystem' },
};

/** One image per client — shuffled before assignment. */
const slideAssets = [
  { image: '/assets/images/carousel/slide-01.png', width: 736, height: 920 },
  { image: '/assets/images/carousel/slide-02.png', width: 819, height: 1024 },
  { image: '/assets/images/carousel/slide-03.png', width: 819, height: 1024 },
  { image: '/assets/images/carousel/slide-04.png', width: 767, height: 1024 },
  { image: '/assets/images/carousel/slide-05.png', width: 682, height: 1024 },
  { image: '/assets/images/carousel/slide-06.png', width: 764, height: 1024 },
  { image: '/assets/images/carousel/slide-07.png', width: 796, height: 1024 },
  { image: '/assets/images/carousel/slide-08.png', width: 736, height: 1024 },
  { image: '/assets/images/carousel/slide-09.png', width: 744, height: 1024 },
  { image: '/assets/images/carousel/slide-10.png', width: 708, height: 1024 },
  { image: '/assets/images/carousel/slide-11.png', width: 827, height: 1024 },
  { image: '/assets/images/carousel/slide-12.png', width: 812, height: 1024 },
];

/**
 * Seeded Fisher–Yates shuffle — random order, stable across builds/loads.
 * @template T
 * @param {T[]} items
 * @param {number} seed
 */
function shuffle(items, seed) {
  const result = [...items];
  let state = seed;

  for (let i = result.length - 1; i > 0; i -= 1) {
    state = (state * 16807) % 2147483647;
    const j = state % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

const shuffledAssets = shuffle(slideAssets, 482_913);

/** @type {CarouselSlide[]} */
export const carouselSlides = clientList.map((client, index) => {
  const asset = shuffledAssets[index];
  const copy = slideCopy[client] ?? {
    leftLabel: 'Relationships',
    rightLabel: 'Cultural impact',
  };

  return {
    id: `slide-${String(index + 1).padStart(2, '0')}`,
    client,
    leftLabel: copy.leftLabel,
    rightLabel: copy.rightLabel,
    number: String(index + 1).padStart(2, '0'),
    image: asset.image,
    width: asset.width,
    height: asset.height,
  };
});

/** Thunder Aviation — matches the Figma comp on load. */
export const defaultSlideIndex = clientList.indexOf('Thunder Aviation');
