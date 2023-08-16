import { ActionFunction, LoaderArgs, LoaderFunction, json, redirect } from '@remix-run/node'
import { Form } from '@remix-run/react'
import { createServerClient } from '@supabase/auth-helpers-remix'
import { useEffect, useState } from 'react'
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

  const TERRAIN_TYPES = ['F', 'F', 'F', 'M', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P']

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

      worldMap[newRow][newCol] = TERRAIN_TYPES[Math.floor(Math.random() * TERRAIN_TYPES.length)]
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
  
  const { session, worldMap, seedLocations } = useLoaderData()
  const actionData = useActionData()

  const TERRAIN_COLORS = {
    'F': 'bg-green-700',
    'P': 'bg-yellow-500',
    'M': 'bg-gray-300'
  }

  useEffect(() => {
    setIsLoading(false)
  }, [worldMap])

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
      <div className={`w-full rounded-md overflow-hidden transition ${isLoading ? 'blur-md' : ''}`}>
        {
          worldMap.map((row, row_i) => {
            return (
              <div className="flex grow text-black" key={row_i.toString()}>
                {
                  row.map((value, col_i) => {
                    const isSeedLocation = seedLocations[row_i] && seedLocations[row_i].includes(col_i)
                    return (
                      <>
                        <div className={`flex hover:outline outline-white relative grow w-full aspect-square text-xs ${value === '~' ? 'bg-blue-300' : (showTerrain ? TERRAIN_COLORS[value] : (isSeedLocation ? 'bg-yellow-400' : 'bg-gray-400'))}`} key={`${row.toString()}-${col_i.toString()}`} onMouseOver={() => setHoveredTile(`${row_i}-${col_i}`)} onMouseLeave={() => setHoveredTile(null) }>
                          {showValues ? value : ' '}
                          <div className={`absolute pointer-events-none z-10 pl-10 ${hoveredTile === `${row_i}-${col_i}` ? '' : 'hidden'}`}>Tooltip {row_i}-{col_i} {value} {isSeedLocation ? '(Seed)' : ''}</div>
                        </div>
                      </>
                    )
                  })
                }
              </div>
            )
          })
        }
      </div>
    </div>
  );
}
