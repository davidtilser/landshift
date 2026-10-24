import { Map, GeoJSONSource, setWorkerUrl } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import type { FeatureCollection, Polygon } from 'geojson'
import type { DataPack } from './data.ts'
import { boundary } from './geometry.ts'

export function createMap(pack: DataPack): Map {
  setWorkerUrl(workerUrl)
  const map = new Map({
    container: 'map',
    center: pack.manifest.center,
    zoom: 16.1,
    pitch: 54,
    bearing: -28,
    minZoom: 14,
    maxZoom: 19,
    maxPitch: 72,
    maxBounds: [
      [pack.manifest.bounds[0] + 0.002, pack.manifest.bounds[1] + 0.002],
      [pack.manifest.bounds[2] - 0.002, pack.manifest.bounds[3] - 0.002],
    ],
    canvasContextAttributes: { antialias: true },
    attributionControl: false,
    localIdeographFontFamily: 'sans-serif',
    transformRequest: (url) => {
      const resolved = new URL(url, window.location.href)
      if (resolved.origin !== window.location.origin)
        throw new Error(`External map request blocked: ${resolved.origin}`)
      return { url: resolved.href }
    },
    style: {
      version: 8,
      glyphs: `${window.location.origin}${pack.baseUrl}fonts/{fontstack}/{range}.pbf`,
      sources: {
        aerial: {
          type: 'raster',
          tiles: [
            `${window.location.origin}${pack.baseUrl}aerial/{z}/{x}/{y}.jpg`,
          ],
          tileSize: 256,
          minzoom: 14,
          maxzoom: 18,
          bounds: pack.manifest.bounds,
        },
        elevation: {
          type: 'raster-dem',
          tiles: [
            `${window.location.origin}${pack.baseUrl}terrain/{z}/{x}/{y}.png`,
          ],
          tileSize: 256,
          encoding: 'terrarium',
          minzoom: 10,
          maxzoom: 14,
          bounds: pack.manifest.bounds,
          attribution: 'Mapzen elevation',
        },
      },
      layers: [
        {
          id: 'ground',
          type: 'background',
          paint: { 'background-color': '#e6e4d7' },
        },
      ],
      light: {
        anchor: 'viewport',
        color: '#fff8e6',
        intensity: 0.38,
        position: [1.5, 180, 50],
      },
      sky: {
        'sky-color': '#e4eee7',
        'horizon-color': '#e9ecdf',
        'fog-color': '#e9ecdf',
        'fog-ground-blend': 0.15,
        'horizon-fog-blend': 0.5,
      },
    },
  })
  return map
}

export function addMapLayers(map: Map, pack: DataPack): void {
  for (const [name, data] of Object.entries(pack.layers))
    map.addSource(name, { type: 'geojson', data })
  map.addSource('study-boundary', {
    type: 'geojson',
    data: boundary(pack.manifest.playableBounds),
  })
  map.addSource('campus', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
  })
  map.addLayer({
    id: 'landuse',
    type: 'fill',
    source: 'landuse',
    paint: {
      'fill-color': [
        'match',
        ['get', 'class'],
        'grass',
        '#c9d4b3',
        'wood',
        '#aebe9c',
        'cemetery',
        '#c7d1af',
        'residential',
        '#deded0',
        '#e2dfd0',
      ],
      'fill-opacity': 0.75,
    },
  })
  map.addLayer({
    id: 'landcover',
    type: 'fill',
    source: 'landcover',
    paint: { 'fill-color': '#bfcba3', 'fill-opacity': 0.45 },
  })
  map.addLayer({
    id: 'parks',
    type: 'fill',
    source: 'parks',
    paint: { 'fill-color': '#b0c89e', 'fill-opacity': 0.7 },
  })
  map.addLayer({
    id: 'water',
    type: 'fill',
    source: 'water',
    paint: { 'fill-color': '#9bbfbe' },
  })
  map.addLayer({
    id: 'aerial',
    type: 'raster',
    source: 'aerial',
    layout: { visibility: 'none' },
    paint: {
      'raster-opacity': 1,
      'raster-saturation': -0.35,
      'raster-contrast': -0.05,
      'raster-fade-duration': 0,
    },
  })
  map.addLayer({
    id: 'roads-outline',
    type: 'line',
    source: 'roads',
    paint: {
      'line-color': '#c8c6b6',
      'line-width': ['interpolate', ['linear'], ['zoom'], 14, 3, 18, 16],
    },
  })
  map.addLayer({
    id: 'roads',
    type: 'line',
    source: 'roads',
    paint: {
      'line-color': '#f9f7ee',
      'line-width': ['interpolate', ['linear'], ['zoom'], 14, 2, 18, 13],
    },
  })
  map.addLayer({
    id: 'trails',
    type: 'line',
    source: 'trails',
    paint: {
      'line-color': '#7c9c69',
      'line-width': 2,
      'line-dasharray': [2, 2],
    },
  })
  map.addLayer({
    id: 'parcels',
    type: 'line',
    source: 'parcels',
    layout: { visibility: 'none' },
    paint: { 'line-color': '#5b7061', 'line-width': 1, 'line-opacity': 0.5 },
  })
  map.addLayer({
    id: 'zoning',
    type: 'fill',
    source: 'zoning',
    layout: { visibility: 'none' },
    paint: {
      'fill-color': [
        'match',
        ['get', 'ZONING'],
        'IP',
        '#8f79af',
        'HI',
        '#b497b9',
        'LI',
        '#c6b1ca',
        'OS',
        '#6eaf82',
        '#caba8d',
      ],
      'fill-opacity': 0.35,
    },
  })
  map.addLayer({
    id: 'flood',
    type: 'fill',
    source: 'flood',
    filter: ['==', ['get', 'SFHATF'], 'T'],
    layout: { visibility: 'none' },
    paint: { 'fill-color': '#5d9db8', 'fill-opacity': 0.24 },
  })
  map.addLayer({
    id: 'buildings',
    type: 'fill-extrusion',
    source: 'buildings',
    paint: {
      'fill-extrusion-color': '#dedfce',
      'fill-extrusion-height': ['get', 'height'],
      'fill-extrusion-base': ['get', 'base'],
      'fill-extrusion-opacity': 0.96,
      'fill-extrusion-vertical-gradient': true,
    },
  })
  map.addLayer({
    id: 'trees',
    type: 'circle',
    source: 'trees',
    paint: {
      'circle-color': '#769766',
      'circle-radius': [
        'interpolate',
        ['linear'],
        ['zoom'],
        14,
        1,
        17,
        4.5,
        19,
        11,
      ],
      'circle-opacity': 0.8,
      'circle-stroke-color': '#5c7c52',
      'circle-stroke-width': 0.5,
      'circle-pitch-alignment': 'map',
    },
  })
  map.addLayer({
    id: 'reference-site',
    type: 'fill',
    source: 'project',
    paint: { 'fill-color': '#d2b677', 'fill-opacity': 0.15 },
  })
  map.addLayer({
    id: 'reference-site-line',
    type: 'line',
    source: 'project',
    paint: {
      'line-color': '#aa8050',
      'line-width': 2,
      'line-dasharray': [4, 3],
    },
  })
  map.addLayer({
    id: 'study-boundary',
    type: 'line',
    source: 'study-boundary',
    paint: {
      'line-color': '#71816c',
      'line-width': 1.5,
      'line-opacity': 0.6,
      'line-dasharray': [3, 4],
    },
  })
  map.addLayer({
    id: 'campus',
    type: 'fill-extrusion',
    source: 'campus',
    paint: {
      'fill-extrusion-color': ['get', 'color'],
      'fill-extrusion-height': ['get', 'height'],
      'fill-extrusion-base': ['get', 'base'],
      'fill-extrusion-opacity': 1,
      'fill-extrusion-vertical-gradient': true,
    },
  })
  map.addLayer({
    id: 'road-labels',
    type: 'symbol',
    source: 'roads',
    layout: {
      'symbol-placement': 'line',
      'text-field': ['get', 'FULLNAME'],
      'text-font': ['Noto Sans Regular'],
      'text-size': 11,
      'symbol-spacing': 350,
      'text-max-angle': 25,
    },
    paint: {
      'text-color': '#647266',
      'text-halo-color': '#f7f6ef',
      'text-halo-width': 1.5,
    },
  })
  map.setTerrain({ source: 'elevation', exaggeration: 1 })
}

export function updateCampus(map: Map, data: FeatureCollection<Polygon>): void {
  const source = map.getSource('campus')
  if (source instanceof GeoJSONSource) void source.setData(data)
}
