const HOME_LATITUDE = 20
const HOME_ALTITUDE = 2.5
const AMERICAS = { west: -130, east: -40 }
const EURASIA = { west: 0, east: 120 }

function longitudeIn(band: { west: number; east: number }): number {
  return band.west + Math.random() * (band.east - band.west)
}

/** One facing per page load, centered on the Americas or on Eurasia. Idle returns here. */
export const openingView = {
  lat: HOME_LATITUDE,
  lng: longitudeIn(Math.random() < 0.5 ? AMERICAS : EURASIA),
  altitude: HOME_ALTITUDE,
}
