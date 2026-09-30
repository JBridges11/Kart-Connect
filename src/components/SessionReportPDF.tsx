import { Document, Page, View, Text, Image, StyleSheet, pdf } from '@react-pdf/renderer'
import { lapMsToString } from '@/lib/formatters'
import type { Session, Setup, LapTime } from '@/types'

export interface SessionReportProps {
  session: Session
  setup: Setup | null
  lapTimes: LapTime[]
  sessionLabel?: string
  teamName?: string | null
  teamLogoUrl?: string | null
}

const DARK   = '#12121A'
const MUTED  = '#6B7A99'
const BORDER = '#E4E4E7'
const AMBER  = '#CA8A04'

const s = StyleSheet.create({
  page:        { fontFamily: 'Helvetica', backgroundColor: '#FFFFFF', paddingBottom: 40 },
  header:      { paddingHorizontal: 25, paddingVertical: 20, alignItems: 'center' },
  logo:        { height: 60, width: 160 },
  headerSub:   { fontSize: 11, color: MUTED, marginTop: 6, textAlign: 'center' },
  titleBlock:  { paddingHorizontal: 25, paddingTop: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: BORDER },
  title:       { fontFamily: 'Helvetica-Bold', fontSize: 18, color: DARK },
  row:         { flexDirection: 'row', paddingHorizontal: 25, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: BORDER },
  rowLabel:    { width: 200, fontSize: 12, color: DARK },
  rowVal:      { flex: 1, fontSize: 12, fontFamily: 'Helvetica-Bold', color: DARK },
  rowEmpty:    { flex: 1, fontSize: 12, color: MUTED },
  section:     { marginHorizontal: 25, marginTop: 16, marginBottom: 6, flexDirection: 'row', alignItems: 'center' },
  sectionLine: { flex: 1, height: 1, backgroundColor: BORDER, marginLeft: 8 },
  sectionTxt:  { fontFamily: 'Helvetica-Bold', fontSize: 10, color: MUTED, letterSpacing: 1 },
  footer:      { position: 'absolute', bottom: 16, left: 25, right: 25, flexDirection: 'row', justifyContent: 'space-between' },
  footerTxt:   { fontSize: 8, color: MUTED },
})

const SETUP_FIELDS: { key: string; label: string; section?: string }[] = [
  { key: 'chassis_type',           label: 'Chassis',              section: 'KART' },
  { key: 'chassis_make',           label: 'Chassis Make' },
  { key: 'engine_type',            label: 'Engine' },
  { key: 'engine_number',          label: 'Engine Number' },
  { key: 'engine_rank',            label: 'Engine Rank' },
  { key: 'carb_rank',              label: 'Carb Rank' },
  { key: 'exhaust_rank',           label: 'Exhaust Rank' },
  { key: 'kart_driver_weight_kg',  label: 'Driver Weight (kg)' },
  { key: 'wheel_base',             label: 'Wheel Base',           section: 'REAR' },
  { key: 'rear_bumper',            label: 'Rear Bumper' },
  { key: 'rear_width_mm',          label: 'Rear Width (mm)' },
  { key: 'rear_hub_length_mm',     label: 'Rear Hub Length (mm)' },
  { key: 'third_bearing',          label: 'Third Bearing' },
  { key: 'third_bearing_type',     label: 'Third Bearing Type' },
  { key: 'axle_height',            label: 'Axle Carrier Height' },
  { key: 'axle_hardness',          label: 'Axle Hardness' },
  { key: 'axle_length',            label: 'Axle Length' },
  { key: 'brake_pads',             label: 'Brake Pads' },
  { key: 'brake_bias_pct',         label: 'Brake Bias (%)' },
  { key: 'rear_sprocket_teeth',    label: 'Rear Sprocket (T)',    section: 'ENGINE' },
  { key: 'engine_sprocket_teeth',  label: 'Engine Sprocket (T)' },
  { key: 'sprocket_carrier_type',  label: 'Sprocket Carrier' },
  { key: 'chain_measurement',      label: 'Chain' },
  { key: 'spark_plug',             label: 'Spark Plug' },
  { key: 'tape_over_rad',          label: 'Tape Over Rad (%)' },
  { key: 'main_jet',               label: 'Main Jet',             section: 'CARBURETTOR' },
  { key: 'air_screw',              label: 'Air Screw' },
  { key: 'needle_position',        label: 'Needle Position' },
  { key: 'float_height',           label: 'Float Height' },
  { key: 'carb_year',              label: 'Carb Year' },
  { key: 'front_width_mm',         label: 'Front Width (mm)',     section: 'FRONT END' },
  { key: 'front_hub_length_mm',    label: 'Front Hub Length (mm)' },
  { key: 'right_height',           label: 'Right Height' },
  { key: 'camber',                 label: 'Camber (°)' },
  { key: 'caster',                 label: 'Caster (°)' },
  { key: 'toe',                    label: 'Toe (mm)' },
  { key: 'stub_axle',              label: 'Stub Axle' },
  { key: 'wheel_type',             label: 'Wheel Type',           section: 'WHEELS & TYRES' },
  { key: 'tyre_make',              label: 'Tyre Make' },
  { key: 'tyre_model',             label: 'Tyre Model' },
  { key: 'tyre_condition',         label: 'Tyre Condition' },
  { key: 'tyre_pressure_fl',       label: 'Pressure FL (cold)' },
  { key: 'tyre_pressure_fr',       label: 'Pressure FR (cold)' },
  { key: 'tyre_pressure_rl',       label: 'Pressure RL (cold)' },
  { key: 'tyre_pressure_rr',       label: 'Pressure RR (cold)' },
  { key: 'hot_pressure_fl',        label: 'Hot Pressure FL' },
  { key: 'hot_pressure_fr',        label: 'Hot Pressure FR' },
  { key: 'hot_pressure_rl',        label: 'Hot Pressure RL' },
  { key: 'hot_pressure_rr',        label: 'Hot Pressure RR' },
  { key: 'max_engine_temp_c',      label: 'Max Engine Temp (°C)', section: 'ENGINE MONITORING' },
  { key: 'low_engine_temp_c',      label: 'Low Engine Temp (°C)' },
  { key: 'max_exhaust_temp_c',     label: 'Max Exhaust Temp (°C)' },
  { key: 'low_exhaust_temp_c',     label: 'Low Exhaust Temp (°C)' },
  { key: 'max_rpm',                label: 'Max RPM' },
  { key: 'low_rpm',                label: 'Low RPM' },
  { key: 'top_speed_kph',          label: 'Top Speed (km/h)' },
  { key: 'low_speed_kph',          label: 'Low Speed (km/h)' },
  { key: 'torsion_bar',            label: 'Torsion Bar',          section: 'CHASSIS & SEAT' },
  { key: 'seat_hardness',          label: 'Seat Hardness' },
  { key: 'seat_bolts_front',       label: 'Seat Bolts Front' },
  { key: 'seat_bolts_back',        label: 'Seat Bolts Back' },
  { key: 'seat_stay_left',         label: 'Left Seat Stay' },
  { key: 'seat_stay_right',        label: 'Right Seat Stay' },
]

function fmt(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—'
  if (typeof v === 'boolean') return v ? 'Yes' : 'No'
  return String(v)
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return ''
  const [y, m, day] = d.split('-')
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${day} ${months[+m - 1]} ${y}`
}

function SessionReportDoc({ session, setup, lapTimes, sessionLabel, teamName, teamLogoUrl }: SessionReportProps) {
  const bestMs = lapTimes.length ? Math.min(...lapTimes.map(l => l.lap_time_ms)) : null
  const now    = new Date().toLocaleDateString('en-GB')

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <Image src={teamLogoUrl ?? `${window.location.origin}/logo-pdf.png`} style={s.logo} />
          <Text style={s.headerSub}>{teamName ? `${teamName}  ·  ` : ''}Session Report</Text>
        </View>

        {/* Title block */}
        <View style={s.titleBlock}>
          <Text style={s.title}>
            {session.track?.name ?? 'Unknown Track'}  —  {fmtDate(session.session_date)}
          </Text>
          {sessionLabel && (
            <Text style={{ fontSize: 13, fontFamily: 'Helvetica-Bold', color: DARK, marginTop: 8 }}>
              {sessionLabel}
            </Text>
          )}
          <Text style={{ fontSize: 10, color: MUTED, marginTop: 4 }}>
            {[
              session.kart?.nickname,
              bestMs ? `Best lap: ${lapMsToString(bestMs)}` : null,
              session.conditions,
              session.weather_description,
            ].filter(Boolean).join('  ·  ')}
          </Text>
        </View>

        {/* Setup fields */}
        {SETUP_FIELDS.map(({ key, label, section }) => {
          const raw = (setup as Record<string, unknown> | null)?.[key]
          const val = fmt(raw)
          const forceBreak = section === 'KART' || section === 'ENGINE MONITORING'
          return (
            <View key={key} wrap={!section} break={forceBreak}>
              {section && (
                <View style={s.section}>
                  <Text style={s.sectionTxt}>{section}</Text>
                  <View style={s.sectionLine} />
                </View>
              )}
              <View style={s.row}>
                <Text style={s.rowLabel}>{label}</Text>
                <Text style={val === '—' ? s.rowEmpty : s.rowVal}>{val}</Text>
              </View>
            </View>
          )
        })}

        {/* Lap times */}
        {lapTimes.length > 0 && (
          <View>
            <View style={s.section}>
              <Text style={s.sectionTxt}>LAP TIMES</Text>
              <View style={s.sectionLine} />
            </View>
            {lapTimes.map((lap, i) => {
              const isBest = lap.lap_time_ms === bestMs
              return (
                <View key={i} style={s.row}>
                  <Text style={[s.rowLabel, { color: MUTED }]}>Lap {lap.lap_number}</Text>
                  <Text style={[s.rowVal, isBest ? { color: AMBER } : {}]}>
                    {lapMsToString(lap.lap_time_ms)}{isBest ? '  ★ Best' : ''}
                  </Text>
                </View>
              )
            })}
          </View>
        )}

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerTxt}>{teamName ?? 'Kart Connect'} — Session Report</Text>
          <Text style={s.footerTxt}>Created by Kart Connect</Text>
          <Text style={s.footerTxt}>{now}</Text>
        </View>
      </Page>
    </Document>
  )
}

export async function generateSessionReportUrl(props: SessionReportProps): Promise<{ url: string; filename: string }> {
  const blob = await pdf(<SessionReportDoc {...props} />).toBlob()
  const url = URL.createObjectURL(blob)
  const track = (props.session.track?.name ?? 'session').replace(/[^a-z0-9]/gi, '_')
  const date  = props.session.session_date ?? 'date'
  const label = (props.sessionLabel ?? 'report').replace(/\s+/g, '_')
  return { url, filename: `${track}_${date}_${label}.pdf` }
}
