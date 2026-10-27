import { z } from 'zod'
import { requireUser, unauthorized } from '@/lib/auth'
import { db } from '@/lib/db'
import { pesosToMinor } from '@/lib/money'

const tri = z.enum(['yes', 'unsure', 'no'])
const text = (max: number) => z.string().trim().max(max).optional()

const Body = z.object({
  species: z.enum(['dog', 'cat', 'small_pet']),
  name: z.string().trim().min(1).max(60),
  breed: text(80),
  birthday: z.iso.date().optional(),
  weightKg: z.number().positive().max(150).optional(),
  sex: z.enum(['female', 'male']).optional(),
  neutered: z.boolean().optional(),
  microchip: z.string().trim().regex(/^[0-9A-Za-z]{9,20}$/).optional(),
  energy: z.number().int().min(1).max(5).optional(),
  goodWithDogs: tri.default('unsure'),
  goodWithCats: tri.default('unsure'),
  goodWithKids: tri.default('unsure'),
  watchOuts: z.array(z.enum(['anxious_alone', 'pulls_leash', 'loud_noises', 'guards_food', 'climbs_fences'])).max(5).default([]),
  notes: text(1000),
  meals: text(300),
  walks: text(300),
  potty: text(300),
  sleep: text(300),
  calming: text(1000),
  medication: text(1000),
  allergies: text(1000),
  vetClinic: text(120),
  vetPhone: text(40),
  emergencyContact: text(160),
  /** whole pesos the host may spend on an emergency vet visit; omitted = not authorised */
  emergencyVetCapCop: z.number().int().min(0).max(20_000_000).optional(),
  vaccines: z
    .array(z.object({ vaccine: z.enum(['rabies', 'dhpp', 'bordetella', 'fvrcp']), validUntil: z.iso.date() }))
    .max(4)
    .default([]),
})

const blank = (s: string | undefined) => (s ? s : null)

// Create a pet passport for the signed-in user. Owner comes from the Privy token, never
// from the body.
export async function POST(req: Request) {
  try {
    const me = await requireUser(req)
    const parsed = Body.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return Response.json({ error: 'invalid', issues: parsed.error.issues }, { status: 400 })
    const b = parsed.data

    const { data: pet, error } = await db()
      .from('pets')
      .insert({
        owner_id: me.id,
        species: b.species,
        name: b.name,
        breed: blank(b.breed),
        birthday: b.birthday ?? null,
        weight_kg: b.weightKg ?? null,
        sex: b.sex ?? null,
        neutered: b.neutered ?? null,
        microchip: blank(b.microchip),
        energy: b.energy ?? null,
        good_with_dogs: b.goodWithDogs,
        good_with_cats: b.goodWithCats,
        good_with_kids: b.goodWithKids,
        watch_outs: [...new Set(b.watchOuts)],
        notes: blank(b.notes),
        meals: blank(b.meals),
        walks: blank(b.walks),
        potty: blank(b.potty),
        sleep: blank(b.sleep),
        calming: blank(b.calming),
        medication: blank(b.medication),
        allergies: blank(b.allergies),
        vet_clinic: blank(b.vetClinic),
        vet_phone: blank(b.vetPhone),
        emergency_contact: blank(b.emergencyContact),
        emergency_vet_cap_minor: b.emergencyVetCapCop == null ? null : pesosToMinor(b.emergencyVetCapCop),
      })
      .select('id')
      .single()
    if (error) throw error

    // One row per vaccine; a cat does not get dog vaccines and vice versa.
    const allowed = b.species === 'cat' ? ['rabies', 'fvrcp'] : b.species === 'dog' ? ['rabies', 'dhpp', 'bordetella'] : []
    const vaccines = b.vaccines.filter((v, i, all) => allowed.includes(v.vaccine) && all.findIndex((w) => w.vaccine === v.vaccine) === i)
    if (vaccines.length) {
      const { error: vErr } = await db()
        .from('pet_vaccines')
        .insert(vaccines.map((v) => ({ pet_id: pet.id, vaccine: v.vaccine, valid_until: v.validUntil })))
      if (vErr) {
        await db().from('pets').delete().eq('id', pet.id) // keep it all-or-nothing
        throw vErr
      }
    }

    return Response.json({ id: pet.id }, { status: 201 })
  } catch (e) {
    console.error('[pets]', e instanceof Error ? e.message : e)
    return unauthorized(e) ?? Response.json({ error: 'server_error' }, { status: 500 })
  }
}
