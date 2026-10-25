import { mkdir, writeFile } from 'node:fs/promises'
import { Buffer } from 'node:buffer'
import { resolve } from 'node:path'
import { format } from 'prettier'

// Original, deliberately schematic vehicles. No downloaded models or textures.
const directory = resolve(import.meta.dirname, '../../public/models/polo')
await mkdir(directory, { recursive: true })
const faces = [
  [
    [1, 0, 0],
    [
      [1, -1, -1],
      [1, 1, -1],
      [1, 1, 1],
      [1, -1, 1],
    ],
  ],
  [
    [-1, 0, 0],
    [
      [-1, 1, -1],
      [-1, -1, -1],
      [-1, -1, 1],
      [-1, 1, 1],
    ],
  ],
  [
    [0, 1, 0],
    [
      [1, 1, -1],
      [-1, 1, -1],
      [-1, 1, 1],
      [1, 1, 1],
    ],
  ],
  [
    [0, -1, 0],
    [
      [-1, -1, -1],
      [1, -1, -1],
      [1, -1, 1],
      [-1, -1, 1],
    ],
  ],
  [
    [0, 0, 1],
    [
      [-1, -1, 1],
      [1, -1, 1],
      [1, 1, 1],
      [-1, 1, 1],
    ],
  ],
  [
    [0, 0, -1],
    [
      [-1, 1, -1],
      [1, 1, -1],
      [1, -1, -1],
      [-1, -1, -1],
    ],
  ],
]
for (const kind of ['car', 'van', 'truck']) {
  const truck = kind === 'truck'
  const length = truck ? 9 : kind === 'van' ? 6.5 : 5.5
  const width = truck ? 2.8 : 2.3
  const height = truck ? 2.3 : kind === 'van' ? 2 : 1.2
  const chunks = [],
    bufferViews = [],
    accessors = [],
    primitives = []
  let offset = 0
  const attribute = (values, type) => {
    const bytes = Buffer.from(new Float32Array(values).buffer)
    bufferViews.push({
      buffer: 0,
      byteOffset: offset,
      byteLength: bytes.length,
      target: 34962,
    })
    const min = [0, 1, 2].map((axis) =>
      Math.min(...values.filter((_, index) => index % 3 === axis)),
    )
    const max = [0, 1, 2].map((axis) =>
      Math.max(...values.filter((_, index) => index % 3 === axis)),
    )
    accessors.push({
      bufferView: bufferViews.length - 1,
      componentType: 5126,
      count: values.length / 3,
      type,
      min,
      max,
    })
    chunks.push(bytes)
    offset += bytes.length
    return accessors.length - 1
  }
  const box = (size, center, material) => {
    const positions = [],
      normals = []
    for (const [normal, corners] of faces) {
      for (const index of [0, 1, 2, 0, 2, 3]) {
        const vertex = corners[index].map(
          (value, axis) => (value * size[axis]) / 2 + center[axis],
        )
        // Cesium's glTF axis correction maps (forward, up, right) to (right, forward, up).
        positions.push(vertex[1], vertex[2], vertex[0])
        normals.push(normal[1], normal[2], normal[0])
      }
    }
    primitives.push({
      attributes: {
        POSITION: attribute(positions, 'VEC3'),
        NORMAL: attribute(normals, 'VEC3'),
      },
      material,
    })
  }
  box([width, length, height], [0, 0, 0.65 + height / 2], 0)
  box(
    [width * 0.86, length * 0.45, height * 0.65],
    [0, truck ? length * 0.26 : 0, 0.65 + height * 1.3],
    1,
  )
  for (const side of [-1, 1])
    for (const axle of [-1, 1])
      box([0.45, 1.1, 1.05], [(side * width) / 2, axle * length * 0.3, 0.6], 2)
  box([width * 0.85, 0.18, 0.35], [0, length / 2 + 0.04, 0.9], 3)
  const colors = [
    truck
      ? [0.93, 0.12, 0.09, 1]
      : kind === 'van'
        ? [0.93, 0.94, 0.84, 1]
        : [0.22, 0.69, 0.8, 1],
    truck ? [0.72, 0.08, 0.06, 1] : [0.14, 0.27, 0.3, 1],
    [0.12, 0.15, 0.14, 1],
    [1, 0.95, 0.69, 1],
  ]
  const bytes = Buffer.concat(chunks)
  const model = {
    asset: {
      version: '2.0',
      generator: 'Landshift original schematic vehicle generator',
    },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    meshes: [{ primitives }],
    materials: colors.map((baseColorFactor) => ({
      pbrMetallicRoughness: {
        baseColorFactor,
        metallicFactor: 0,
        roughnessFactor: 0.85,
      },
    })),
    accessors,
    bufferViews,
    buffers: [
      {
        byteLength: bytes.length,
        uri: `data:application/octet-stream;base64,${bytes.toString('base64')}`,
      },
    ],
  }
  await writeFile(
    resolve(directory, `${kind}.gltf`),
    await format(JSON.stringify(model), { parser: 'json' }),
  )
}
