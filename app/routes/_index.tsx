import { ActionFunction, LoaderArgs, LoaderFunction, json, redirect } from '@remix-run/node'
import { createServerClient } from '@supabase/auth-helpers-remix'
import { useEffect, useState } from 'react'
import { useActionData, useLoaderData } from 'react-router'

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

export const loader: LoaderFunction = async ({ request }: LoaderArgs) => {
  const response = new Response()
  // an empty response is required for the auth helpers
  // to set cookies to manage auth

  const supabase = createServerClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_KEY || '',
    { request, response }
  )
  const { data: { session }} = await supabase.auth.getSession()

  /// ...resolve loader


  return json({ session })
}

export default function Index() {
  const [finalWorldMap, setWorldMap] = useState([])
  const [finalSeedDistances, setSeedDistances] = useState([])
  const [showTerrain, setShowTerrain] = useState(false)
  const [showDistances, setShowDistances] = useState(false)
  const [seedLocations, setSeedLocations] = useState([])
  const [showValues, setShowValues] = useState(false)
  const [numSeeds, setNumSeeds] = useState(1)
  const [seedPower, setSeedPower] = useState(70)
  const [stretch, setStretch] = useState(11)
  const [iteration, setIteration] = useState(1)
  
  const { session } = useLoaderData()
  const actionData = useActionData()
  
  const TERRAIN_COLORS = {
    'F': 'bg-green-700',
    'P': 'bg-yellow-400',
    'M': 'bg-gray-400'
  }
  
  useEffect(() => {
    const MAP_WIDTH = 100
    const MAP_HEIGHT = 50
    const worldMap = []
    const seedDistances = []
    const seedLocations = {}
    const TERRAIN_TYPES = ['F', 'F', 'F', 'M', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P']
  
    const getDistanceFromNearestSeed = (point) => {
      const [row_i, col_i] = point
  
      let nearestDistance = Math.max(MAP_WIDTH, MAP_HEIGHT)
  
      for (const seed_row of Object.keys(seedLocations)) {
        const seed_col = seedLocations[seed_row]
        const distance = Math.sqrt(Math.abs(seed_row - row_i) ** 2 + Math.abs(seed_col - col_i) ** 2)
        if (distance < nearestDistance) {
          nearestDistance = distance
        }
      }
  
      return nearestDistance
    }
  
    const getDistanceScore = (point) => {
      const [row_i, col_i] = point
  
      let distanceScore = 0
  
      for (const seed_row of Object.keys(seedLocations)) {
        const seed_col = seedLocations[seed_row]
        const distance = Math.sqrt(Math.abs(seed_row - row_i) ** 2 + Math.abs(seed_col - col_i) ** 2)
  
        distanceScore += distance || 1
      }
  
      return distanceScore / numSeeds
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
      }
    }

    for (const row of Object.keys(seedLocations)) {
      const seedRow = parseInt(row)
      const seedCols = seedLocations[seedRow]

      for (const seedCol of seedCols) {
        const landMassHeight = Math.floor(Math.random() * (MAP_HEIGHT - seedRow)) + 20
        let rowOffset = 0
        let rowWidth = Math.floor(Math.random() * (MAP_WIDTH - seedCol)) + 1
        for (let y = seedRow; y < Math.min(MAP_HEIGHT, seedRow + landMassHeight); y++) {
          for (let i = seedCol + rowOffset; i < seedCol + rowWidth; i++) {
            const terrainType = TERRAIN_TYPES[Math.floor(Math.random() * TERRAIN_TYPES.length)]
            worldMap[y][i] = terrainType
          }
          rowWidth = rowWidth + Math.floor(0.5 - Math.random() * (rowWidth / 4)) + 1
          rowOffset = Math.floor(10 * ((0.5 - Math.random())))
        }
        console.log(landMassHeight)
      }
    }

    setWorldMap(worldMap)
    setSeedDistances(seedDistances)
    setSeedLocations(seedLocations)
  }, [numSeeds, stretch, iteration, seedPower])

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2 justify-center">
        <button onClick={() => setShowTerrain(!showTerrain)} className="bg-gray-100 rounded-md border-solid border-gray-200 border-[1px] px-2 py-1">Toggle Terrain View</button>
        <button onClick={() => setShowDistances(!showDistances)} className="bg-gray-100 rounded-md border-solid border-gray-200 border-[1px] px-2 py-1">Show Seed Distances</button>
        <button onClick={() => setShowValues(!showValues)} className="bg-gray-100 rounded-md border-solid border-gray-200 border-[1px] px-2 py-1">Show Terrain Values</button>
        <div className="flex gap-2">
          Num Seeds
          <input type="number" value={numSeeds} onChange={(e) => setNumSeeds(parseInt(e.target.value))} className="bg-gray-100 rounded-md border-solid border-gray-200 border-[1px] px-2 py-1 w-24" />
        </div>
        {/* <div className="flex gap-2">
          Stretch factor
          <input type="number" value={stretch} onChange={(e) => setStretch(parseInt(e.target.value))} className="bg-gray-100 rounded-md border-solid border-gray-200 border-[1px] px-2 py-1 w-24" />
        </div>
        <div className="flex gap-2">
          Seed power
          <input type="number" value={seedPower} onChange={(e) => setSeedPower(parseInt(e.target.value))} className="bg-gray-100 rounded-md border-solid border-gray-200 border-[1px] px-2 py-1 w-24" />
        </div> */}
        <button onClick={() => setIteration(iteration + 1)} className="bg-gray-100 rounded-md border-solid border-gray-200 border-[1px] px-2 py-1">Regenerate</button>
      </div>
      <div className="w-full rounded-md overflow-hidden">
        {
          finalWorldMap.map((row, row_i) => {
            return (
              <div className="flex grow" key={row_i.toString()}>
                {
                  row.map((value, col_i) => {
                    if (Object.keys(seedLocations).includes(row_i.toString())) {
                      if (seedLocations[row_i].includes(col_i)) {
                        return (
                          <div className={`flex grow w-full aspect-square text-xs ${value === '~' ? 'bg-blue-300' : (showTerrain ? TERRAIN_COLORS[value] : 'bg-yellow-400')}`} key={`${row_i.toString()}-${col_i.toString()}`}>{showValues ? value : ' '}</div>
                        )
                      }
                    }
                    return (
                      <div className={`flex grow w-full aspect-square text-xs ${value === '~' ? 'bg-blue-300' : (showTerrain ? TERRAIN_COLORS[value] : 'bg-gray-400')}`} key={`${row_i.toString()}-${col_i.toString()}`}>{showValues ? value : ' '}</div>
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
