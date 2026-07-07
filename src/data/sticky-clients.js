import { clientList } from './carousel.js';

/** Pair client names into rows of two for the sticky scroll list. */
export const stickyClientRows = [];
for (let i = 0; i < clientList.length; i += 2) {
  stickyClientRows.push([
    clientList[i],
    clientList[i + 1] ?? '',
  ].filter(Boolean));
}
