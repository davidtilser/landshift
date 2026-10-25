/** Display conversions only. Model inputs and calculations stay in SI units.
 * NIST: https://www.nist.gov/pml/us-surveyfoot/revised-unit-conversion-factors
 * US liquid gallon = exactly 3.785411784 liters (not an Imperial gallon).
 */
const M2_PER_ACRE = 4046.8564224
const M3_PER_US_GALLON = 0.003785411784
const METERS_PER_FOOT = 0.3048

const number = (value: number, digits: number): string =>
  value.toLocaleString('en-US', { maximumFractionDigits: digits })

/** Favor whole numbers; retain fractions when rounding would change over 5%. */
export function usNumber(value: number): string {
  const whole = Math.round(value)
  if (Math.abs(value - whole) <= Math.abs(value) * 0.05) return number(whole, 0)
  const tenth = Math.round(value * 10) / 10
  if (Math.abs(value - tenth) <= Math.abs(value) * 0.05) return number(tenth, 1)
  return Math.abs(value) >= 1
    ? number(value, 1)
    : value.toLocaleString('en-US', { maximumSignificantDigits: 2 })
}

export const usAreaNumber = (areaM2: number): string =>
  usNumber(areaM2 / M2_PER_ACRE)

export const usAcres = (areaM2: number): string =>
  `${usAreaNumber(areaM2)} acres`

function compactNumber(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `${usNumber(value / 1_000_000)}M`
  if (Math.abs(value) >= 10_000) {
    const thousands = value / 1000
    const tens = Math.round(thousands / 10) * 10
    const rounded =
      Math.abs(thousands - tens) <= Math.abs(thousands) * 0.05
        ? tens
        : Math.round(thousands)
    return `${number(rounded, 0)}k`
  }
  if (Math.abs(value) >= 1000) return `${usNumber(value / 1000)}k`
  return usNumber(value)
}

export const usGallons = (volumeM3: number): string =>
  `${compactNumber(volumeM3 / M3_PER_US_GALLON)} US gal`

export function usInches(depthMm: number): string {
  const inches = depthMm / 25.4
  return `${Math.abs(inches) < 1 ? usNumber(inches) : number(inches, 1)} in`
}

export const usFeet = (lengthM: number): string =>
  `${usNumber(lengthM / METERS_PER_FOOT)} ft`

/** Localize authored SI explanations before pagination; never rewrite sources.
 * Known Polo volume quantities are water or liquid fuel, hence US gallons.
 * Electricity keeps its units with rounded values. Ratios, dates, IDs and
 * source URLs remain unchanged.
 */
export function poloUsText(text: string): string {
  const numeric = String.raw`(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?`
  const quantity = new RegExp(
    `\\b(${numeric})(?:\\s+(million))?([\\s-]+)(hectares?|ha|m²|m³|m2|m3|mm|km|metres?|meters?|litres?|liters?|kWh|MWh|GWh|MW|L|m)(?![A-Za-z0-9²³])`,
    'g',
  )
  return text
    .replace(/\bfour-hectare\b/g, `${usAreaNumber(40_000)}-acre`)
    .replace(
      quantity,
      (
        _match: string,
        raw: string,
        million: string | undefined,
        separator: string,
        unit: string,
      ) => {
        const value = Number(raw.replaceAll(',', '')) * (million ? 1e6 : 1)
        if (unit === 'ha' || unit.startsWith('hectare'))
          return separator === '-'
            ? `${usAreaNumber(value * 10_000)}-acre`
            : usAcres(value * 10_000)
        if (unit === 'm²' || unit === 'm2')
          return `${compactNumber(value / METERS_PER_FOOT ** 2)} sq ft`
        if (unit === 'm³' || unit === 'm3') return usGallons(value)
        if (unit === 'L' || unit.startsWith('lit'))
          return usGallons(value / 1000)
        if (unit === 'mm') return usInches(value)
        if (unit === 'km') return `${usNumber(value / 1.609344)} mi`
        if (['kWh', 'MWh', 'GWh', 'MW'].includes(unit))
          return `${usNumber(value)} ${unit}`
        return usFeet(value)
      },
    )
}
