const HOME_ALTITUDE = 2.5
/** Center that keeps both American continents inside the overview disc. */
const AMERICAS = { lat: 10, lng: -90 }
/** Korean peninsula. The arc stops here instead of crossing the Pacific. */
const KOREA = { lat: 37, lng: 127 }

const along = Math.random()

/** One facing per page load, anywhere from the Americas eastward to Korea. Idle returns here. */
export const openingView = {
  lat: AMERICAS.lat + (KOREA.lat - AMERICAS.lat) * along,
  lng: AMERICAS.lng + (KOREA.lng - AMERICAS.lng) * along,
  altitude: HOME_ALTITUDE,
}
