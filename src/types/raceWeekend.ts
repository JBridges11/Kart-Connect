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
  setup_data: Record<string, unknown> | null
  setup_started_at: string | null
  setup_updated_at: string | null
  setup_submitted: boolean
  submitted_at: string | null
  session_id: string | null
  created_at: string
}
