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

  return json({ session })
}

export default function Index() {
  const { session } = useLoaderData()
  const actionData = useActionData()
  const MAP_WIDTH = 100
  const MAP_HEIGHT = 50
  const worldMap = []

  for (let i = 0; i < MAP_HEIGHT; i++) {
    worldMap[i] = []
    for (let j = 0; j < MAP_WIDTH; j++) {
      // const isLand = Math.random() > 0.3
      const isLand = i > 20 && i < 40 && j > 45 && j < 75
      if (isLand) {
        worldMap[i][j] = '='
        continue
      }
      worldMap[i][j] = '~'
    }
  }

  return (
    <div>
      <div className="grid grid-cols-[100] grid-rows-[100] w-full">
        {
          worldMap.map((row, row_i) => {
            return (
              <div className="flex grow" key={row_i.toString()}>
                {
                  row.map((value, col_i) => (
                    <div className={`flex grow ${value == '~' ? 'bg-blue-300' : 'bg-green-600'}`} key={`${row.toString()}-${col_i.toString()}`}>{value}</div>
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
