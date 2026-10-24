export interface Credit {
  id: string
  label: string
  holder: string
  url: string
  license: string
}

export const credits: readonly Credit[] = [
  {
    id: 'nasa-blue-marble',
    label:
      'Blue Marble Next Generation with Topography and Bathymetry (June 2004)',
    holder: 'NASA Earth Observatory',
    url: 'https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-topography-bathymetry/',
    license: 'Public domain (NASA)',
  },
  {
    id: 'nasa-gebco-topography',
    label: 'Topography (GEBCO_08)',
    holder:
      'NASA Earth Observatory (Jesse Allen), using GEBCO_08 Grid data, www.gebco.net',
    url: 'https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/topography-bathymetry-maps/',
    license: 'Public domain',
  },
  {
    id: 'nasa-blue-marble-clouds',
    label: 'Blue Marble clouds',
    holder: 'NASA Goddard Space Flight Center',
    url: 'https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57747/cloud_combined_2048.jpg',
    license: 'Public domain (NASA)',
  },
  {
    id: 'globe-gl',
    label: 'globe.gl',
    holder: 'Vasco Asturiano',
    url: 'https://github.com/vasturiano/globe.gl',
    license: 'MIT',
  },
  {
    id: 'three-js',
    label: 'three.js',
    holder: 'three.js authors',
    url: 'https://threejs.org',
    license: 'MIT',
  },
]

export function renderCredits(target: HTMLElement): void {
  const list = document.createElement('ul')
  for (const credit of credits) {
    const link = document.createElement('a')
    link.href = credit.url
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    link.textContent = credit.label
    const item = document.createElement('li')
    item.append(link, ` (${credit.holder}; ${credit.license})`)
    list.append(item)
  }
  target.replaceChildren(list)
}
