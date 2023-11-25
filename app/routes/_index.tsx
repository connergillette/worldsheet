import { ActionFunction, LoaderArgs, LoaderFunction, json, redirect } from '@remix-run/node'
import { Form } from '@remix-run/react'
import { createServerClient } from '@supabase/auth-helpers-remix'
import { useEffect, useRef, useState } from 'react'
import { useActionData, useLoaderData } from 'react-router'

const DEFAULT_NUM_SEEDS = 4
const DEFAULT_SEED_LIFESPAN_MAX = 400
const DEFAULT_SEED_MULTIPLICATION_CHANCE = 0.7

export const action: ActionFunction = async ({ request }) => {
  const response = new Response()

  const supabase = createServerClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_KEY || '',
    { request, response }
  )

  const { data: { session }} = await supabase.auth.getSession()

  // ...perform action

  return redirect('/')
}

export const loader: LoaderFunction = async ({ request, params }: LoaderArgs) => {
  const response = new Response()
  // an empty response is required for the auth helpers
  // to set cookies to manage auth
  const url = new URL(request.url)
  const search = new URLSearchParams(url.search)
  const numSeeds = search.get('numSeeds') || DEFAULT_NUM_SEEDS
  const seedLifespanMax = search.get('seedLifespanMax') || DEFAULT_SEED_LIFESPAN_MAX
  const seedMultiplicationChance = search.get('seedMultiplicationChance') || DEFAULT_SEED_MULTIPLICATION_CHANCE

  const supabase = createServerClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_KEY || '',
    { request, response }
  )
  const { data: { session }} = await supabase.auth.getSession()

  /// ...resolve loader

  const MAP_WIDTH = 100
  const MAP_HEIGHT = 50
  const worldMap = []
  const seedDistances = []
  const seedLocations = {}

  const TERRAIN_TYPES = ['P', 'P', 'P', 'P','F']

  const MARCH_DIRECTION_COORDS = {
    0: [-1, 0], // up
    1: [-1, 1], // up-right
    2: [0, 1], // right
    3: [1, 1], // down-right
    4: [1, 0], // down
    5: [1, -1], // down-left
    6: [0, -1], // left
    7: [-1, -1], // up-left
  }

  const march = (currentPosition: number[], seedLife: number, canMultiply: boolean) => {
    while (seedLife > 0) {
      const [row, col] = currentPosition
      const [row_delta, col_delta] = MARCH_DIRECTION_COORDS[Math.floor(Math.random() * 7)]

      const newRow = Math.min(Math.max(parseInt(row) + row_delta, 0), MAP_HEIGHT)
      const newCol = Math.min(Math.max(parseInt(col) + col_delta, 0), MAP_WIDTH)

      if (canMultiply) {
        worldMap[newRow][newCol] = 'M'
      } else {
        worldMap[newRow][newCol] = TERRAIN_TYPES[Math.floor(Math.random() * TERRAIN_TYPES.length)]
      }
      currentPosition = [newRow, newCol]

      if (canMultiply && Math.random() > seedMultiplicationChance) {
        march([newRow, newCol], seedLife, false)
      }

      seedLife -= 1
    }
  }

  for (let i = 0; i < numSeeds; i++) {
    const row_i = Math.floor(Math.random() * MAP_HEIGHT)
    const col_i = Math.floor(Math.random() * MAP_WIDTH)
    if (seedLocations[row_i]) {
      seedLocations[row_i].push(col_i)
    } else {
      seedLocations[row_i] = [col_i]
    }
  }

  for (let i = 0; i <= MAP_HEIGHT; i++) {
    worldMap[i] = []
    seedDistances[i] = []
    for (let j = 0; j <= MAP_WIDTH; j++) {
      worldMap[i][j] = '~'
      seedDistances[i][j] = -1
    }
  }

  for (const seedRow of Object.keys(seedLocations)) {
    for (const seedCol of seedLocations[seedRow]) {
      const seedLife = Math.floor(Math.random() * seedLifespanMax) + 30
      march([seedRow, seedCol], seedLife, true)
    }
  }

  return json({ session, worldMap, seedLocations })
}

export default function Index() {
  const [showTerrain, setShowTerrain] = useState(false)
  const [showValues, setShowValues] = useState(false)
  const [numSeeds, setNumSeeds] = useState(DEFAULT_NUM_SEEDS)
  const [seedLifespanMax, setSeedLifespanMax] = useState(DEFAULT_SEED_LIFESPAN_MAX)
  const [seedMultiplicationChance, setSeedMultiplicationChance] = useState(DEFAULT_SEED_MULTIPLICATION_CHANCE)
  const [iteration, setIteration] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [hoveredTile, setHoveredTile] = useState(null)
  const [canvas, setCanvas] = useState(null)

  const canvasRef = useRef(null)
  
  const { session, worldMap, seedLocations } = useLoaderData()
  const [world, setWorld] = useState(worldMap)

  const actionData = useActionData()

  const TERRAIN_COLORS = {
    'F': 'bg-green-700',
    'P': 'bg-yellow-500',
    'M': 'bg-gray-300'
  }

  const SIZE_FACTOR = 10

  useEffect(() => {
    setIsLoading(false)
    setWorld(worldMap)
  }, [worldMap])

  useEffect(() => {
    if (canvasRef) {
      drawMap()
    }
  }, [worldMap])

  useEffect(() => {
    if (canvas) {
      canvas.addEventListener('mousemove', (e) => {
        const x = e.offsetX
        const y = e.offsetY

        // console.log(Math.floor(x / SIZE_FACTOR), Math.floor(y / SIZE_FACTOR))
        // context.fillStyle = 'gray'
        // context.fillRect(Math.floor(x / SIZE_FACTOR) * SIZE_FACTOR, Math.floor(y / SIZE_FACTOR) * SIZE_FACTOR, SIZE_FACTOR, SIZE_FACTOR)
        const copy = JSON.parse(JSON.stringify(worldMap))
        const coordX = Math.floor(x / SIZE_FACTOR)
        const coordY = Math.floor(y / SIZE_FACTOR)
        copy[coordY][coordX] = 'H'
        // setWorld(copy)
        // drawMap()
      })
      // canvas.addEventListener('mousemove', (e) => {
      //   const x = e.offsetX
      //   const y = e.offsetY

      //   const context = canvas.getContext('2d')
      //   console.log(Math.floor(x / SIZE_FACTOR) * SIZE_FACTOR, Math.floor(y / SIZE_FACTOR) * SIZE_FACTOR)
      //   // context.fillStyle = 'gray'
      //   context.fillRect(Math.floor(x / SIZE_FACTOR) * SIZE_FACTOR, Math.floor(y / SIZE_FACTOR) * SIZE_FACTOR, SIZE_FACTOR, SIZE_FACTOR)
      // })
    }
  }, [canvas])

  const drawMap = () => {
    const canvas = canvasRef.current
    setCanvas(canvas)
    canvas.style.width = 500
    canvas.style.height = 250
    // const dpi = window.devicePixelRatio
    const context = canvas.getContext('2d')
    // context.scale(dpi, dpi)
    // context.translate(0.5, 0.5)

    context.fillStyle = '#ffffff'
    context.lineWidth = 1
    for (let y = 0; y < 50; y++) {
      for (let x = 0; x < 100; x++) {
        const tile = world[y][x]
        switch (tile){
          case 'M':
            context.fillStyle = 'gray'
            break
          case 'P':
            context.fillStyle = 'yellow'
            break
          case 'F':
            context.fillStyle = 'green'
            break
          case 'H':
            context.fillStyle = 'red'
            break
          default:
            context.fillStyle = 'cyan'
            break
        }
        context.strokeRect(x * SIZE_FACTOR, y * SIZE_FACTOR, SIZE_FACTOR, SIZE_FACTOR)
        context.fillRect(x * SIZE_FACTOR, y * SIZE_FACTOR, SIZE_FACTOR, SIZE_FACTOR)
      }
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Form className="flex gap-2 justify-center content-center" method="get" onSubmit={(() => setIsLoading(true))}>
        <button onClick={() => setShowTerrain(!showTerrain)} className="rounded-md border-solid border-gray-200 border-[1px] px-2 py-1" name="showTerrain" type="button">Toggle Terrain Colors</button>
        <button onClick={() => setShowValues(!showValues)} className="rounded-md border-solid border-gray-200 border-[1px] px-2 py-1" name="showTerrainValues" type="button">Show Terrain Codes</button>
        <div className="flex gap-2 self-center">
          Num Seeds
          <input 
            type="number" 
            value={numSeeds} onChange={(e) => setNumSeeds(parseInt(e.target.value))}
            className="bg-transparent rounded-md border-solid border-gray-200 border-[1px] px-2 py-1 w-24" 
            name="numSeeds"
          />
        </div>
        <div className="flex gap-2 self-center">
          Seed Lifespan Max
          <input 
            type="number" 
            defaultValue={seedLifespanMax}
            className="bg-transparent rounded-md border-solid border-gray-200 border-[1px] px-2 py-1 w-24" 
            name="seedLifespanMax"
          />
        </div>
        <div className="flex gap-2 self-center">
          Seed Multiplication Chance
          <input 
            type="number"
            defaultValue={seedMultiplicationChance}
            className="bg-transparent rounded-md border-solid border-gray-200 border-[1px] px-2 py-1 w-24" 
            name="seedMultiplicationChance"
            step={0.01}
            min={0}
            max={1}
          />
        </div>
        <button onClick={() => setIteration(iteration + 1)} className="rounded-md border-solid border-gray-200 border-[1px] px-2 py-1" type="submit">Regenerate</button>
      </Form>
      <div className="w-['1000px'] h-['500px'] mx-auto">
        <canvas ref={canvasRef} width="1000" height="500" />
      </div>
    </div>
  );
}
