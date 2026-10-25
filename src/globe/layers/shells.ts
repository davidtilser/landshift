/** Transparent shells draw inside-out so each one blends over the shells beneath it. */
export const RENDER_ORDER = { atmosphere: 1, ocean: 2, clouds: 3 } as const

/** three-globe's globe mesh rotation; shells sampling globe-aligned textures must match it. */
export const SHELL_ROTATION_Y = -Math.PI / 2
