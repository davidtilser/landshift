/** Small, local vector game pieces. No image service or external assets. */
export function choiceArt(kind: string): string {
  const building =
    '<path d="m48 52 42-21 40 20-42 22Z" fill="#cad7ce"/><path d="m48 52 40 21v31L48 82Z" fill="#688c79"/><path d="m88 73 42-22v31l-42 22Z" fill="#385e50"/><path d="m59 54 30-15 28 14-29 15Z" fill="#f4f6e9"/><path d="m61 70 20 10m-20 1 20 10m17-11 22-12m-22 23 22-12" stroke="#adc6bb" stroke-width="4"/>'
  const tree = (x: number, y: number, scale = 1): string =>
    `<g transform="translate(${String(x)} ${String(y)}) scale(${String(scale)})"><path d="M0 0v25" stroke="#92734c" stroke-width="4" stroke-linecap="round"/><ellipse cy="-3" rx="12" ry="18" fill="#7ea15b"/><ellipse cx="-4" cy="-7" rx="8" ry="13" fill="#b0cd77"/></g>`
  const drop = (x: number, y: number, scale = 1): string =>
    `<g transform="translate(${String(x)} ${String(y)}) scale(${String(scale)})"><path d="M0-20C-3-12-13-3-13 5a13 13 0 0 0 26 0C13-3 3-12 0-20Z" fill="#75bdcf"/><path d="M-7 4q0 7 7 7" stroke="#d8f2ee" stroke-width="3" fill="none" stroke-linecap="round"/></g>`
  const person = (x: number, y: number, color: string): string =>
    `<g transform="translate(${String(x)} ${String(y)})"><path d="m-4 9-2 17m10-17 2 17" stroke="#4f685d" stroke-width="4" stroke-linecap="round"/><path d="M-6-5h12v16H-6Z" fill="${color}"/><circle cy="-12" r="6" fill="#c89d79"/></g>`
  let art = building
  if (kind === 'water') art += drop(35, 35, 1.2) + drop(145, 39, 0.7)
  if (kind === 'hybrid')
    art +=
      drop(35, 48, 0.8) +
      '<g transform="translate(141 44)"><circle r="16" fill="#e5eddf"/><path d="M0-13Q18-13 4-2Q17 15 2 5Q-16 17-4 1Q-18-12-2-4" fill="#8fae91"/><circle r="4" fill="#547d6a"/></g>'
  if (kind === 'air')
    art +=
      '<g fill="none" stroke="#94b7b0" stroke-width="5" stroke-linecap="round"><path d="M23 28h27q14 0 10-10"/><path d="M19 40h34q12 0 9 9"/><path d="M131 39h20q12 0 10-10"/></g>'
  if (kind === 'bare')
    art =
      '<path d="m20 75 70-35 70 35-70 35Z" fill="#d8c5a2"/><path d="m35 75 55-27 55 27-55 27Z" stroke="#eddfc0" stroke-width="2" fill="none"/><path d="m51 71 17-8m45 19 16-8" stroke="#bda984" stroke-width="3"/>'
  if (kind === 'grove')
    art =
      '<path d="m17 84 72-36 73 36-73 36Z" fill="#bad28a"/>' +
      tree(49, 65, 0.8) +
      tree(86, 49, 1) +
      tree(122, 66, 0.9) +
      tree(84, 81, 0.9) +
      '<g fill="#e7b968"><circle cx="54" cy="100" r="3"/><circle cx="112" cy="100" r="3"/></g>'
  if (kind === 'garden')
    art =
      '<path d="m16 84 73-37 74 37-74 37Z" fill="#a8c892"/><ellipse cx="90" cy="85" rx="44" ry="18" fill="#76b8b4"/><ellipse cx="90" cy="83" rx="32" ry="11" fill="#acd6c7"/>' +
      tree(43, 66, 0.7) +
      tree(134, 69, 0.65) +
      '<g stroke="#718f55" stroke-width="3"><path d="M62 101V88m7 11V87m43 12V86"/></g>'
  if (kind === 'private')
    art =
      building +
      '<path d="M29 81v23m0-13 19 10m-3-12v23m-15-11 17 9" stroke="#bbc5b5" stroke-width="3"/>'
  if (kind === 'training')
    art =
      '<path d="m22 96 66-33 69 33-69 34Z" fill="#d9e6ce"/><path d="m40 35 47-21 48 21-48 23Z" fill="#587e72"/><path d="M58 44v19q28 21 58 0V44" fill="#7d9c83"/><path d="M135 36v28" stroke="#dbb66a" stroke-width="3"/>' +
      person(62, 91, '#8bafc0') +
      person(112, 91, '#dfbd75')
  if (kind === 'walk')
    art =
      '<path d="m16 89 72-36 74 36-74 36Z" fill="#b9cf91"/><path d="m45 103 70-36 16 8-70 36Z" fill="#f0dfb6"/>' +
      tree(39, 64, 0.8) +
      tree(137, 67, 0.8) +
      person(83, 84, '#e2ba74') +
      person(108, 95, '#7da4b6')
  return (
    '<svg class="choice-art" viewBox="0 0 180 135" aria-hidden="true"><ellipse cx="90" cy="112" rx="64" ry="12" fill="#264d3a" opacity=".07"/>' +
    art +
    '</svg>'
  )
}
