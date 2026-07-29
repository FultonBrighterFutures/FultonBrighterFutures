export const TIMELINE_YEARS = [2020, 2021, 2022, 2023, 2024, 2025, 2026]

export const DEFAULT_YEAR = 2020
export const DEFAULT_TIMELINE_ITEM_ID = 'year-2020'
export const DATA_START_YEAR = 2021

export const TIMELINE_ITEMS = TIMELINE_YEARS.map((year) => ({
  id: `year-${year}`,
  type: 'year',
  label: String(year),
  year,
  visualizationYear: year,
}))

export const TIMELINE_EVENTS_BY_YEAR = {
  2020: {
    dateLabel: 'April 2020',
    copy: 'Fulton County signs the original contract for seven buildings to start using solar energy. This events marks the start of Fulton County\'s Solar Program.',
  },
  2021: {
    dateLabel: 'April 2021',
    copy: 'The first batch of Phase 1 solar buildings are completed and begin generating clean energy.',
  },
  2024: {
    dateLabel: 'December 2024',
    copy: 'A contract amendment expands the project by at least 30 additional buildings.',
  },
  2025: {
    dateLabel: 'May 2025',
    copy: 'The first Phase 2 buildings are completed, alongside commissioner events at Cascade Library and Dorothy Benson Senior Center.',
  },
}

/**
 * Maps a timeline year to 0 (first year) → 1 (last year).
 * Passed to each scene as `progress` inside applyYear({ year, data, progress }).
 */
export function yearProgress(year) {
  const start = DATA_START_YEAR
  const end = TIMELINE_YEARS[TIMELINE_YEARS.length - 1]
  return Math.max(0, Math.min(1, (year - start) / (end - start)))
}
