import { REGIONS, STATUS, metricFor, placeCompanies } from './engine/model.js'
import { normalizeCompanyDates } from './engine/lib/company-dates.js'

/**
 * @typedef {object} CityDatum
 * @property {string|number} id Stable, unique company key.
 * @property {string} name Company display name.
 * @property {{label: string, value: number}} metric Nonnegative metric; encodes building height.
 * @property {{label: string, value: string}[]} [categories] Generic district memberships.
 * @property {1|2|3|4|5|6|7} [mask] Normalized category intersection; encodes district/color.
 * @property {"healthy"|"warning"|"critical"} status Health classification.
 * @property {string} [updatedAt] Last record update, ISO 8601 with timezone.
 * @property {string} [statusChangedAt] Start of the current health status.
 */

/** Validate at the chart boundary, before layout or GPU allocation. */
export function validateCityData(data) {
  if (!Array.isArray(data))
    throw new TypeError('cityMark: data deve ser uma lista.')
  const ids = new Set()
  for (const [index, datum] of data.entries()) {
    if (
      !datum ||
      !['string', 'number'].includes(typeof datum.id) ||
      !String(datum.id).trim() ||
      ids.has(String(datum.id))
    )
      throw new TypeError(`cityMark: id ausente ou repetido na linha ${index}.`)
    ids.add(String(datum.id))
  }
  let rows = data
  if (data.some((datum) => datum.categories !== undefined)) {
    try {
      const normalized = placeCompanies(data)
      if (data.some((datum) => datum.mask === undefined))
        rows = normalized.map((datum, index) => ({
          ...datum,
          id: data[index].id,
        }))
    } catch (error) {
      throw new TypeError(`cityMark: ${error.message}`)
    }
  }
  for (const [index, datum] of rows.entries()) {
    normalizeCompanyDates(datum, index)
    if (
      typeof datum.name !== 'string' ||
      !datum.name.trim() ||
      typeof metricFor(datum).label !== 'string' ||
      !metricFor(datum).label.trim() ||
      !Number.isFinite(metricFor(datum).value) ||
      metricFor(datum).value < 0 ||
      !REGIONS.some((region) => region.mask === datum.mask) ||
      !Object.hasOwn(STATUS, datum.status)
    )
      throw new TypeError(
        `cityMark: nome, métrica, categorias ou saúde inválidos na linha ${index}.`,
      )
  }
  return rows
}
