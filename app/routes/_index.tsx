import { ActionFunction, LoaderArgs, LoaderFunction, json, redirect } from '@remix-run/node'
import { createServerClient } from '@supabase/auth-helpers-remix'
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

  const MAP_WIDTH = 100
  const MAP_HEIGHT = 50
  const NUM_SEEDS = 5
  const worldMap = []
  const seedLocations = {}
  const TERRAIN_TYPES = ['F', 'F', 'F', 'M', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P']

  for (let i = 0; i < NUM_SEEDS; i++) {
    const row_i = Math.floor(Math.random() * MAP_HEIGHT)
    const col_i = Math.floor(Math.random() * MAP_WIDTH)
    if (seedLocations[row_i]) {
      seedLocations[row_i].push(col_i)
    } else {
      seedLocations[row_i] = [col_i]
    }
  }

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
      distanceScore += distance
    }

    return distanceScore / 5
  }

  for (let i = 0; i <= MAP_HEIGHT; i++) {
    worldMap[i] = []
    for (let j = 0; j <= MAP_WIDTH; j++) {
      const point = [i, j]
      const distanceFromNearestSeed = getDistanceFromNearestSeed(point)
      const distanceScore = getDistanceScore(point)
      const isLand = (seedLocations[i] && seedLocations[i].includes(j)) || (distanceScore < 60 && distanceFromNearestSeed < (Math.random() * 10) + 10)
      if (isLand) {
        const terrainType = TERRAIN_TYPES[Math.floor(Math.random() * TERRAIN_TYPES.length)]
        worldMap[i][j] = terrainType
        continue
      }
      worldMap[i][j] = '~'
    }
  }


  return json({ session, worldMap })
}

export default function Index() {
  const { session, worldMap } = useLoaderData()
  const actionData = useActionData()

  const TERRAIN_COLORS = {
    'F': 'bg-green-700',
    'P': 'bg-yellow-400',
    'M': 'bg-gray-400'
  }

  const SHOW_VALUES = false

  return (
    <div>
      <div className="w-full">
        {
          worldMap.map((row, row_i) => {
            return (
              <div className="flex grow" key={row_i.toString()}>
                {
                  row.map((value, col_i) => (
                    <div className={`flex grow w-full aspect-square ${value == '~' ? 'bg-blue-300' : TERRAIN_COLORS[value]}`} key={`${row.toString()}-${col_i.toString()}`}>{SHOW_VALUES ? value : ' '}</div>
                  ))
                }
              </div>
            )
          })
        }
      </div>
    </div>
  );
}
