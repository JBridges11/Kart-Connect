/**
 * Seed script — creates sample tracks, karts, sessions, setups, and lap times.
 * Run with: npx tsx seed.ts
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY and VITE_SUPABASE_URL in .env.local
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

function loadEnv(): Record<string, string> {
  const env: Record<string, string> = {}
  try {
    const raw = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8')
    for (const line of raw.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const [key, ...rest] = trimmed.split('=')
      env[key.trim()] = rest.join('=').trim()
    }
  } catch {
    console.error('Could not read .env.local')
  }
  return env
}

const env = loadEnv()
const SUPABASE_URL      = env['VITE_SUPABASE_URL'] ?? ''
const SERVICE_ROLE_KEY  = env['SUPABASE_SERVICE_ROLE_KEY'] ?? ''
const SEED_EMAIL        = 'seed@kartconnect.dev'
const SEED_PASSWORD     = 'seedpass123!'

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

function rnd(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function lapMs(baseMs: number, spread = 600): number {
  return baseMs + rnd(-spread, spread * 2)
}

async function main() {
  console.log('🌱 Seeding Kart Connect database…\n')

  // 1. Create test user (idempotent)
  let userId: string
  const { data: existingUsers } = await admin.auth.admin.listUsers()
  const existing = existingUsers.users.find(u => u.email === SEED_EMAIL)
  if (existing) {
    userId = existing.id
    console.log(`✓ Using existing seed user: ${SEED_EMAIL}`)
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: SEED_EMAIL,
      password: SEED_PASSWORD,
      email_confirm: true,
    })
    if (error) { console.error('Failed to create user:', error); process.exit(1) }
    userId = data.user.id
    console.log(`✓ Created seed user: ${SEED_EMAIL} / ${SEED_PASSWORD}`)
  }

  // 2. Tracks
  const trackData = [
    { name: 'Whilton Mill',  country: 'United Kingdom', circuit_type: 'outdoor', layout_notes: 'Long circuit, technical infield section. Good for rear grip setups.' },
    { name: 'Glan y Gors',   country: 'United Kingdom', circuit_type: 'outdoor', layout_notes: 'Fast flowing circuit. Benefits from high axle height and wide rear.' },
    { name: 'Buckmore Park', country: 'United Kingdom', circuit_type: 'outdoor', layout_notes: 'Very technical with a variety of corners. Tyre conservation important.' },
  ]

  const tracks: Record<string, string> = {}
  for (const t of trackData) {
    const { data, error } = await admin.from('tracks').insert({ ...t, user_id: userId }).select().single()
    if (error) { console.error('Track insert error:', error); continue }
    tracks[t.name] = data.id as string
    console.log(`  ✓ Track: ${t.name}`)
  }

  // 3. Karts
  const kartData = [
    { nickname: '#23 Rotax',    chassis_type: 'Tony Kart 401R',  engine_type: 'Rotax Max Senior', notes: 'Main race kart, well-developed setup.' },
    { nickname: 'Test Mule',    chassis_type: 'Birel ART R30',   engine_type: 'IAME X30 Senior',  notes: 'Testing chassis, trying new setup directions.' },
  ]

  const karts: Record<string, string> = {}
  for (const k of kartData) {
    const { data, error } = await admin.from('karts').insert({ ...k, user_id: userId }).select().single()
    if (error) { console.error('Kart insert error:', error); continue }
    karts[k.nickname] = data.id as string
    console.log(`  ✓ Kart: ${k.nickname}`)
  }

  // 4. Sessions + setups + lap times
  const sessionDefs = [
    {
      track: 'Whilton Mill', kart: '#23 Rotax', date: '2025-04-12',
      type: 'practice', conditions: 'dry', air_temp_c: 14, track_temp_c: 18,
      baseLapMs: 58200,
      setup: {
        chassis_type: 'Tony Kart 401R', engine_type: 'Rotax Max Senior',
        rear_bumper: 'Tight', rear_width_mm: 1000, rear_hub_length_mm: 85,
        third_bearing: false, axle_height: 'Low', brake_pads: 'Med',
        rear_sprocket_teeth: 82, engine_sprocket_teeth: 11, sprocket_carrier_type: 'Fixed',
        chain_measurement: '219', spark_plug: 'NGK BR9EG',
        main_jet: '108', air_screw: '1.5 turns out', needle_position: 'Clip 3',
        front_width_mm: 730, front_hub_length_mm: 30, right_height: 'Med',
        camber: '-0.5', caster: '15', toe: '+0.5', stub_axle: 'Hard',
        wheel_type: 'Summer', tyre_make: 'Bridgestone', tyre_model: 'YLC',
        tyre_pressure_fl: 0.80, tyre_pressure_fr: 0.80, tyre_pressure_rl: 0.80, tyre_pressure_rr: 0.80,
      },
      lapCount: 12,
    },
    {
      track: 'Whilton Mill', kart: '#23 Rotax', date: '2025-05-03',
      type: 'qualifying', conditions: 'dry', air_temp_c: 19, track_temp_c: 24,
      baseLapMs: 57800,
      setup: {
        chassis_type: 'Tony Kart 401R', engine_type: 'Rotax Max Senior',
        rear_bumper: 'Tight', rear_width_mm: 1005, rear_hub_length_mm: 85,
        third_bearing: true, axle_height: 'Med', brake_pads: 'Med',
        rear_sprocket_teeth: 82, engine_sprocket_teeth: 11, sprocket_carrier_type: 'Fixed',
        chain_measurement: '219', spark_plug: 'NGK BR9EG',
        main_jet: '110', air_screw: '1.5 turns out', needle_position: 'Clip 3',
        front_width_mm: 730, front_hub_length_mm: 30, right_height: 'Med',
        camber: '-0.5', caster: '15', toe: '+0.5', stub_axle: 'Hard',
        wheel_type: 'Summer', tyre_make: 'Bridgestone', tyre_model: 'YLC',
        tyre_pressure_fl: 0.82, tyre_pressure_fr: 0.82, tyre_pressure_rl: 0.82, tyre_pressure_rr: 0.82,
      },
      lapCount: 8,
    },
    {
      track: 'Glan y Gors', kart: '#23 Rotax', date: '2025-05-18',
      type: 'practice', conditions: 'dry', air_temp_c: 17, track_temp_c: 22,
      baseLapMs: 52100,
      setup: {
        chassis_type: 'Tony Kart 401R', engine_type: 'Rotax Max Senior',
        rear_bumper: 'Loose', rear_width_mm: 1010, rear_hub_length_mm: 90,
        third_bearing: false, axle_height: 'High', brake_pads: 'Med',
        rear_sprocket_teeth: 82, engine_sprocket_teeth: 11, sprocket_carrier_type: 'Fixed',
        chain_measurement: '219', spark_plug: 'NGK BR9EG',
        main_jet: '108', air_screw: '1.25 turns out', needle_position: 'Clip 2',
        front_width_mm: 740, front_hub_length_mm: 30, right_height: 'High',
        camber: '-1.0', caster: '16', toe: '0', stub_axle: 'Hard',
        wheel_type: 'Summer', tyre_make: 'Vega', tyre_model: 'XH',
        tyre_pressure_fl: 0.78, tyre_pressure_fr: 0.78, tyre_pressure_rl: 0.80, tyre_pressure_rr: 0.80,
      },
      lapCount: 15,
    },
    {
      track: 'Buckmore Park', kart: 'Test Mule', date: '2025-06-01',
      type: 'testing', conditions: 'damp', air_temp_c: 12, track_temp_c: 14,
      baseLapMs: 54200,
      setup: {
        chassis_type: 'Birel ART R30', engine_type: 'IAME X30 Senior',
        rear_bumper: 'Tight', rear_width_mm: 995, rear_hub_length_mm: 80,
        third_bearing: false, axle_height: 'Low', brake_pads: 'Soft',
        rear_sprocket_teeth: 80, engine_sprocket_teeth: 11, sprocket_carrier_type: 'Loose',
        chain_measurement: '219', spark_plug: 'NGK BR10EG',
        main_jet: '112', air_screw: '1.75 turns out', needle_position: 'Clip 4',
        front_width_mm: 720, front_hub_length_mm: 25, right_height: 'Low',
        camber: '-0.5', caster: '14', toe: '+1', stub_axle: 'Soft',
        wheel_type: 'Wet', tyre_make: 'Mojo', tyre_model: 'W5',
        tyre_pressure_fl: 0.55, tyre_pressure_fr: 0.55, tyre_pressure_rl: 0.58, tyre_pressure_rr: 0.58,
      },
      lapCount: 10,
    },
    {
      track: 'Buckmore Park', kart: '#23 Rotax', date: '2025-06-08',
      type: 'race', conditions: 'dry', air_temp_c: 22, track_temp_c: 28,
      baseLapMs: 52600,
      setup: {
        chassis_type: 'Tony Kart 401R', engine_type: 'Rotax Max Senior',
        rear_bumper: 'Tight', rear_width_mm: 1000, rear_hub_length_mm: 85,
        third_bearing: true, axle_height: 'Med', brake_pads: 'Hard',
        rear_sprocket_teeth: 83, engine_sprocket_teeth: 11, sprocket_carrier_type: 'Fixed',
        chain_measurement: '219', spark_plug: 'NGK BR9EG',
        main_jet: '106', air_screw: '1.5 turns out', needle_position: 'Clip 3',
        front_width_mm: 735, front_hub_length_mm: 30, right_height: 'Med',
        camber: '-0.5', caster: '15', toe: '+0.5', stub_axle: 'Hard',
        wheel_type: 'Summer', tyre_make: 'Bridgestone', tyre_model: 'YLC',
        tyre_pressure_fl: 0.85, tyre_pressure_fr: 0.85, tyre_pressure_rl: 0.85, tyre_pressure_rr: 0.85,
      },
      lapCount: 18,
    },
  ]

  for (const def of sessionDefs) {
    const trackId = tracks[def.track]
    const kartId  = karts[def.kart]
    if (!trackId || !kartId) {
      console.warn(`  ⚠ Skipping session — missing track/kart for "${def.track}" / "${def.kart}"`)
      continue
    }

    const laps = Array.from({ length: def.lapCount }, (_, i) => ({
      lap_number: i + 1,
      lap_time_ms: lapMs(def.baseLapMs),
    }))

    const bestLapMs = Math.min(...laps.map(l => l.lap_time_ms))

    const { data: session, error: sessErr } = await admin.from('sessions').insert({
      user_id:          userId,
      track_id:         trackId,
      kart_id:          kartId,
      session_date:     def.date,
      session_type:     def.type,
      conditions:       def.conditions,
      air_temp_c:       def.air_temp_c,
      track_temp_c:     def.track_temp_c,
      best_lap_time_ms: bestLapMs,
      total_laps:       def.lapCount,
    }).select().single()

    if (sessErr) { console.error('Session insert error:', sessErr); continue }

    const sessionId = session.id as string

    const { error: setupErr } = await admin.from('setups').insert({
      session_id: sessionId,
      ...def.setup,
    })
    if (setupErr) console.warn('  ⚠ Setup insert error:', setupErr.message)

    const { error: lapErr } = await admin.from('lap_times').insert(
      laps.map(l => ({ ...l, session_id: sessionId }))
    )
    if (lapErr) console.warn('  ⚠ Lap times insert error:', lapErr.message)

    console.log(`  ✓ Session: ${def.track} ${def.date} — best ${(bestLapMs / 1000).toFixed(3)}s (${def.lapCount} laps)`)
  }

  console.log('\n✅ Seed complete!')
  console.log(`\n   Login with: ${SEED_EMAIL} / ${SEED_PASSWORD}`)
}

main().catch(e => { console.error(e); process.exit(1) })
