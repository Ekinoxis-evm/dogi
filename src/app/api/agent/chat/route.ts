import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  tool,
  toUIMessageStream,
  type UIMessage,
} from 'ai'
import { z } from 'zod'
import { requireUser, unauthorized } from '@/lib/auth'
import { db } from '@/lib/db'
import { quoteStay } from '@/lib/pricing'

export const maxDuration = 30

// The DogChain agent (AgentKit + LangChain + OpenAI, wallet tools) ported to the AI SDK
// through AI Gateway. It no longer touches money or wallets: it searches stays, prices
// them and reads the user's own pets. Booking and paying stay in the UI, behind
// Mercado Pago checkout, so the agent can never spend.
const INSTRUCTIONS = `You are Dogi, a helper for pet parents and hosts in Colombia (launch city: Medellin).
Reply in the user's language (Spanish by default). Short, warm, concrete.
Use the tools to find stays and quote prices; never invent a listing, a price or a review.
Prices are in Colombian pesos. You cannot book or pay: when the user is ready, point them to the listing page.
If a pet's health or safety is at risk, tell them to call a vet first.`

export async function POST(req: Request) {
  let me
  try {
    me = await requireUser(req)
  } catch (e) {
    return unauthorized(e) ?? Response.json({ error: 'server_error' }, { status: 500 })
  }
  const { messages }: { messages: UIMessage[] } = await req.json()

  const result = streamText({
    model: process.env.DOGI_AGENT_MODEL ?? 'anthropic/claude-haiku-5-5',
    instructions: INSTRUCTIONS,
    messages: await convertToModelMessages(messages.slice(-20)),
    stopWhen: isStepCount(5),
    tools: {
      searchStays: tool({
        description: 'Find live stays by neighbourhood/city, optionally only ones that accept a pet size or cats.',
        inputSchema: z.object({
          city: z.string().default('Medellin'),
          neighbourhood: z.string().optional(),
          accepts: z.enum(['small_dogs', 'medium_dogs', 'large_dogs', 'cats', 'puppies', 'seniors']).optional(),
        }),
        execute: async ({ city, neighbourhood, accepts }) => {
          let q = db()
            .from('listings')
            .select('id, space, city, neighbourhood, hourly_minor, max_guests')
            .eq('status', 'live')
            .ilike('city', city)
            .limit(8)
          if (neighbourhood) q = q.ilike('neighbourhood', `%${neighbourhood}%`)
          if (accepts) q = q.eq(`accepts_${accepts}`, true)
          const { data } = await q
          return (data ?? []).map((l) => ({ ...l, hourly_cop: l.hourly_minor / 100, url: `/stays/${l.id}` }))
        },
      }),
      quote: tool({
        description: 'Price a stay at a listing for 1-3 pets.',
        inputSchema: z.object({
          listingId: z.uuid(),
          stay: z.enum(['drop_in', 'half_day', 'full_day', 'overnight']),
          pets: z.number().int().min(1).max(3),
          dropInHours: z.number().int().min(1).max(4).optional(),
        }),
        execute: async ({ listingId, stay, pets, dropInHours }) => {
          const { data } = await db()
            .from('listings')
            .select('hourly_minor, status')
            .eq('id', listingId)
            .maybeSingle()
          if (!data || data.status !== 'live') return { error: 'listing not available' }
          return { currency: 'COP', ...quoteStay(data.hourly_minor / 100, stay, pets, dropInHours ?? 1) }
        },
      }),
      myPets: tool({
        description: "List the signed-in user's pets with the basics a host would ask about.",
        inputSchema: z.object({}),
        execute: async () => {
          const { data } = await db()
            .from('pets')
            .select('id, name, species, breed, weight_kg, energy, good_with_dogs, good_with_cats, watch_outs')
            .eq('owner_id', me.id)
          return data ?? []
        },
      }),
    },
  })

  return createUIMessageStreamResponse({ stream: toUIMessageStream({ stream: result.stream }) })
}
