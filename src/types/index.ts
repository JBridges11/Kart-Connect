export interface Track {
  id: string
  user_id: string
  name: string
  country: string | null
  location: string | null
  circuit_type: 'indoor' | 'outdoor' | null
  layout_notes: string | null
  lat: number | null
  lng: number | null
  created_at: string
}

export interface KartEngine {
  id: string
  make: string
  number: string
  rank: number
}

export interface Kart {
  id: string
  user_id: string
  nickname: string
  chassis_type: string
  engine_type: string
  driver_name: string | null
  kart_make: string | null
  kart_model: string | null
  kart_class: string | null
  chassis_number: string | null
  chassis_stiffness: 'Standard' | 'Hard' | 'Soft' | null
  phone_number: string | null
  engine_make: string | null
  engine_number: string | null
  engines: KartEngine[]
  notes: string | null
  created_at: string
}

export type WeatherDescription = 'Sunny' | 'Light Sun' | 'Overcast' | 'Light Rain' | 'Rain' | 'Heavy Rain' | 'Snow'

export interface Session {
  id: string
  user_id: string
  kart_id: string
  track_id: string
  event_id: string | null
  session_date: string
  conditions: 'dry' | 'wet' | 'damp' | null
  weather_description: WeatherDescription | null
  altitude_m: number | null
  air_temp_c: number | null
  humidity_pct: number | null
  wind_speed_mph: number | null
  event_name: string | null
  session_type: 'practice' | 'qualifying' | 'race' | 'testing' | 'race_weekend'
  session_name: string | null
  best_lap_time_ms: number | null
  total_laps: number | null
  notes: string | null
  created_at: string
  track?: { name: string; country: string | null }
  kart?: { nickname: string; chassis_type: string; driver_name: string | null; kart_class: string | null }
}

export interface Setup {
  id: string
  session_id: string
  created_at: string

  chassis_type: string
  engine_type: string

  // Rear
  wheel_base: 'Standard' | 'Short' | 'Long' | null
  rear_bumper: 'Loose' | 'Tight' | null
  rear_width_mm: number | null
  rear_hub_length_mm: number | null
  third_bearing: boolean | null
  third_bearing_type: 'Loose' | 'Tight' | null
  axle_height: 'Low' | 'Med' | 'High' | null
  axle_hardness: 'Soft' | 'Med' | 'Hard' | null
  axle_length: 'Long' | 'Short' | null
  brake_pads: 'Soft' | 'Med' | 'Hard' | null
  brake_bias_pct: number | null

  // Engine
  rear_sprocket_teeth: number | null
  engine_sprocket_teeth: number | null
  sprocket_carrier_type: 'Fixed' | 'Floating' | null
  chain_measurement: string | null
  spark_plug: string | null
  tape_over_rad: number | null

  // Engine monitoring
  max_rpm: number | null
  low_rpm: number | null
  max_engine_temp_c: number | null
  low_engine_temp_c: number | null
  max_exhaust_temp_c: number | null
  low_exhaust_temp_c: number | null

  // Carb
  main_jet: string | null
  air_screw: string | null
  needle_position: string | null
  float_height: string | null
  carb_year: string | null

  // Front End
  front_width_mm: number | null
  front_hub_length_mm: number | null
  right_height: 'Lowest' | 'Low' | 'Med' | 'High' | 'Highest' | null
  camber: string | null
  caster: string | null
  toe: string | null
  stub_axle: 'Soft' | 'Hard' | null

  // Wheels & Tyres
  wheel_type: 'Summer' | 'Winter' | 'Wet' | null
  tyre_make: string | null
  tyre_model: string | null
  tyre_condition: 'New' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '8+' | null
  tyre_pressure_fl: number | null
  tyre_pressure_fr: number | null
  tyre_pressure_rl: number | null
  tyre_pressure_rr: number | null

  // Session results
  top_speed_kph: number | null
  low_speed_kph: number | null

  // Hot pressures (post-session)
  hot_pressure_fl: number | null
  hot_pressure_fr: number | null
  hot_pressure_rl: number | null
  hot_pressure_rr: number | null

  // Post-session lap time (stored as "M:SS.mmm" string)
  best_lap_time: string | null

  // Kart & Driver
  chassis_make: string | null
  engine_number: string | null
  engine_rank: number | null
  carb_rank: number | null
  exhaust_rank: number | null
  kart_driver_weight_kg: number | null

  // Chassis / Seat
  torsion_bar: 'None' | 'Soft' | 'Med' | 'Hard' | null
  seat_hardness: 'Very Soft' | 'Soft' | 'Medium' | 'Hard' | null
  seat_bolts_front: 'Loose' | 'Tight' | null
  seat_bolts_back: 'Loose' | 'Tight' | null
  seat_stay_left: 'None' | '1' | '2' | null
  seat_stay_right: 'None' | '1' | '2' | null
}

export interface SetupChange {
  id: string
  session_id: string
  from_setup_id: string | null
  to_setup_id: string | null
  change_description: string
  lap_delta_ms: number | null
  driver_feedback: string | null
  timestamp: string
}

export interface LapTime {
  id: string
  session_id: string
  lap_number: number
  lap_time_ms: number
  notes: string | null
}

export type SetupFormData = Omit<Setup, 'id' | 'session_id' | 'created_at'>

export interface SlotWeather {
  conditions?: Session['conditions']
  weather_description?: Session['weather_description']
  air_temp_c?: number | null
  humidity_pct?: number | null
  wind_speed_mph?: number | null
}

export interface SessionSlot {
  slotId: string
  label: string
  session_type: 'practice' | 'qualifying' | 'race' | 'testing'
  enabled: boolean
  setupOverrides: Partial<SetupFormData>
  weatherOverrides: SlotWeather
  lapTimes: Array<{ lap_number: number; lap_time_ms: number; notes: string | null }>
}

export interface WizardState {
  step: number
  eventId: string
  trackId: string | null
  newTrack: Partial<Omit<Track, 'id' | 'user_id' | 'created_at'>> | null
  kartId: string | null
  newKart: Partial<Omit<Kart, 'id' | 'user_id' | 'created_at'>> | null
  sessionMeta: {
    event_name: string | null
    session_date: string
    conditions: Session['conditions']
    weather_description: WeatherDescription | null
    altitude_m: number | null
    air_temp_c: number | null
    humidity_pct: number | null
    wind_speed_mph: number | null
    notes: string | null
  }
  baseSetup: Partial<SetupFormData>
  slots: SessionSlot[]
  loadedFromSession: boolean
}

export type PressureUnit = 'psi' | 'bar'
export type AltUnit   = 'm' | 'ft'
export type TempUnit  = 'c' | 'f'
export type SpeedUnit = 'kph' | 'mph'

export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete'
export type SubscriptionTier = 'privateer' | 'team' | 'pro_team'

export interface Subscription {
  id: string
  user_id: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  status: SubscriptionStatus
  tier: SubscriptionTier | null
  trial_start: string
  trial_end: string
  current_period_end: string | null
  last_kart_deleted_at: string | null
  created_at: string
}

export interface RaceWeekend {
  id: string
  manager_id: string
  track_id: string
  session_name: string
  session_date: string
  session_type: string
  is_live: boolean
  went_live_at: string | null
  expires_at: string | null
  ended_at: string | null
  created_at: string
  track?: { name: string; country: string | null }
}

export interface RaceWeekendDriver {
  id: string
  race_weekend_id: string
  manager_id: string
  kart_id: string
  driver_name: string
  driver_class: string | null
  kart_make: string | null
  kart_model: string | null
  chassis_number: string | null
  chassis_stiffness: string | null
  engines_snapshot: Array<{ rank: number; make: string; number: string }> | null
  selected_engine_rank: number | null
  token: string
  token_is_active: boolean
  setup_data: Partial<SetupFormData> | null
  setup_started_at: string | null
  setup_updated_at: string | null
  setup_submitted: boolean
  submitted_at: string | null
  session_id: string | null
  created_at: string
}
