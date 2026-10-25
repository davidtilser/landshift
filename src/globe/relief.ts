/** Relief encoding shared by `scripts/make-textures.ts` and the globe; lengths are in globe radii unless suffixed `_M`. */
export const EARTH_RADIUS_M = 6_371_000
export const LAND_EXAGGERATION = 40
export const SEA_FLOOR_EXAGGERATION = 60

/** Full range of NASA's 8-bit GEBCO_08 grids: elevation code 255 and bathymetry code 0. */
export const MAX_LAND_HEIGHT_M = 6400
export const MAX_SEA_DEPTH_M = 8000

/** `earth-height.png` code for sea level: code 0 is the deepest sea floor, and land starts one code above. */
export const SEA_LEVEL_CODE = 166
export const MAX_HEIGHT_CODE = 255

/** Displacement per height code, chosen so the deepest sea floor sits exactly `SEA_FLOOR_EXAGGERATION` deep. */
export const RADII_PER_HEIGHT_CODE =
  (MAX_SEA_DEPTH_M * SEA_FLOOR_EXAGGERATION) / EARTH_RADIUS_M / SEA_LEVEL_CODE

export const MAX_TERRAIN_RADIUS_RATIO =
  1 + (MAX_HEIGHT_CODE - SEA_LEVEL_CODE) * RADII_PER_HEIGHT_CODE

/** Sits between sea level (code 166) and the lowest land (code 167), so only land pierces the water. */
export const OCEAN_RADIUS_RATIO = 1.0002

export const CLOUD_CLEARANCE_RADII = 0.01
export const CLOUD_RADIUS_RATIO =
  MAX_TERRAIN_RADIUS_RATIO + CLOUD_CLEARANCE_RADII
