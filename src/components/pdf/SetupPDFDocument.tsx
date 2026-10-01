import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import type { Session, Setup, Kart } from '@/types'
import { lapMsToString as _lapMsToString } from '@/lib/formatters'

const DARK  = '#12121A'
const MUTED = '#6B7A99'
const BORDER = '#E4E4E7'

const s = StyleSheet.create({
  page:       { fontFamily: 'Helvetica', backgroundColor: '#FFFFFF', paddingBottom: 32, paddingTop: 0 },
  // Header
  header:     { backgroundColor: '#FFFFFF', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: BORDER },
  logo:       { height: 36, width: 100 },
  headerRight: { alignItems: 'flex-end' },
  headerLabel: { fontSize: 7, color: MUTED, letterSpacing: 0.8, textTransform: 'uppercase' },
  headerValue: { fontSize: 8, color: DARK, fontFamily: 'Helvetica-Bold', marginTop: 1 },
  // Title band
  titleBand:  { paddingHorizontal: 20, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: BORDER },
  title:      { fontFamily: 'Helvetica-Bold', fontSize: 13, color: DARK },
  titleSub:   { fontSize: 8, color: MUTED, marginTop: 3 },
  // Two-column body
  body:       { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 10, gap: 12 },
  col:        { flex: 1 },
  // Section header
  section:    { flexDirection: 'row', alignItems: 'center', marginBottom: 3, marginTop: 8 },
  sectionTxt: { fontFamily: 'Helvetica-Bold', fontSize: 7, color: MUTED, letterSpacing: 0.8 },
  sectionLine:{ flex: 1, height: 0.5, backgroundColor: BORDER, marginLeft: 4 },
  // Row
  row:        { flexDirection: 'row', paddingVertical: 2.5, borderBottomWidth: 0.5, borderBottomColor: '#F0F0F0' },
  rowLabel:   { flex: 1, fontSize: 7.5, color: MUTED },
  rowVal:     { flex: 1, fontSize: 7.5, color: DARK, fontFamily: 'Helvetica-Bold', textAlign: 'right' },
  // Footer
  footer:     { position: 'absolute', bottom: 12, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between' },
  footerTxt:  { fontSize: 6.5, color: MUTED },
})

function fmt(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—'
  if (typeof v === 'boolean') return v ? 'Yes' : 'No'
  return String(v)
}

function Row({ label, value }: { label: string; value: unknown }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowVal}>{fmt(value)}</Text>
    </View>
  )
}

function Section({ title }: { title: string }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTxt}>{title}</Text>
      <View style={s.sectionLine} />
    </View>
  )
}

interface Props {
  session: Session & { kart: Kart | null }
  setup: Setup | null
  bestLap: string | null
  teamName?: string | null
  teamLogoUrl?: string | null
  teamPrimaryColor?: string | null
}

export function SetupPDFDocument({ session, setup, bestLap, teamName, teamLogoUrl }: Props) {
  const kart   = session.kart
  const track  = session.track
  const now    = new Date().toLocaleDateString('en-GB')
  const [y, m, d] = (session.session_date ?? '').split('-')
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const dateStr = y ? `${d} ${months[+m - 1]} ${y}` : '—'

  const driverLine = [kart?.kart_make, kart?.kart_model, kart?.kart_class, bestLap ? `Best: ${bestLap}` : null].filter(Boolean).join('  ·  ')
  const condLine   = [session.session_type?.charAt(0).toUpperCase() + session.session_type?.slice(1), session.conditions, session.weather_description].filter(Boolean).join('  ·  ')

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* Header */}
        <View style={s.header}>
          <Image src={teamLogoUrl ?? `${window.location.origin}/logo-pdf.png`} style={s.logo} />
          <View style={s.headerRight}>
            <Text style={s.headerLabel}>{teamName ?? 'Kart Connect'}  ·  Driver Setup Sheet</Text>
            <Text style={s.headerValue}>{track?.name ?? 'Unknown Track'}  ·  {dateStr}</Text>
            <Text style={[s.headerLabel, { marginTop: 2 }]}>{kart?.driver_name ?? kart?.nickname ?? 'Driver'}</Text>
          </View>
        </View>

        {/* Title band */}
        <View style={s.titleBand}>
          <Text style={s.title}>{kart?.driver_name ?? kart?.nickname ?? 'Driver'}</Text>
          {driverLine ? <Text style={s.titleSub}>{driverLine}</Text> : null}
          {condLine   ? <Text style={s.titleSub}>{condLine}</Text>   : null}
        </View>

        {/* Two-column body */}
        <View style={s.body}>

          {/* LEFT COLUMN */}
          <View style={s.col}>
            <Section title="KART" />
            <Row label="Chassis"            value={setup?.chassis_type} />
            <Row label="Chassis Make"       value={setup?.chassis_make} />
            <Row label="Engine"             value={setup?.engine_type} />
            <Row label="Engine Number"      value={setup?.engine_number} />
            <Row label="Engine Rank"        value={setup?.engine_rank} />
            <Row label="Carb Rank"          value={setup?.carb_rank} />
            <Row label="Exhaust Rank"       value={setup?.exhaust_rank} />
            <Row label="Driver Weight (kg)" value={setup?.kart_driver_weight_kg} />

            <Section title="REAR" />
            <Row label="Wheel Base"           value={setup?.wheel_base} />
            <Row label="Rear Bumper"          value={setup?.rear_bumper} />
            <Row label="Rear Width (mm)"      value={setup?.rear_width_mm} />
            <Row label="Rear Hub Length (mm)" value={setup?.rear_hub_length_mm} />
            <Row label="Third Bearing"        value={setup?.third_bearing} />
            <Row label="Third Bearing Type"   value={setup?.third_bearing_type} />
            <Row label="Axle Carrier Height"  value={setup?.axle_height} />
            <Row label="Axle Hardness"        value={setup?.axle_hardness} />
            <Row label="Axle Length"          value={setup?.axle_length} />
            <Row label="Brake Pads"           value={setup?.brake_pads} />
            <Row label="Brake Bias (%)"       value={setup?.brake_bias_pct} />

            <Section title="ENGINE" />
            <Row label="Rear Sprocket (T)"    value={setup?.rear_sprocket_teeth} />
            <Row label="Engine Sprocket (T)"  value={setup?.engine_sprocket_teeth} />
            <Row label="Sprocket Carrier"     value={setup?.sprocket_carrier_type} />
            <Row label="Chain"                value={setup?.chain_measurement} />
            <Row label="Spark Plug"           value={setup?.spark_plug} />
            <Row label="Tape Over Rad (%)"    value={setup?.tape_over_rad} />

            <Section title="CARBURETTOR" />
            <Row label="Main Jet"        value={setup?.main_jet} />
            <Row label="Air Screw"       value={setup?.air_screw} />
            <Row label="Needle Position" value={setup?.needle_position} />
            <Row label="Float Height"    value={setup?.float_height} />
            <Row label="Carb Year"       value={setup?.carb_year} />
          </View>

          {/* RIGHT COLUMN */}
          <View style={s.col}>
            <Section title="FRONT END" />
            <Row label="Front Width (mm)"      value={setup?.front_width_mm} />
            <Row label="Front Hub Length (mm)" value={setup?.front_hub_length_mm} />
            <Row label="Right Height"          value={setup?.right_height} />
            <Row label="Camber (°)"            value={setup?.camber} />
            <Row label="Caster (°)"            value={setup?.caster} />
            <Row label="Toe (mm)"              value={setup?.toe} />
            <Row label="Stub Axle"             value={setup?.stub_axle} />

            <Section title="WHEELS & TYRES" />
            <Row label="Wheel Type"         value={setup?.wheel_type} />
            <Row label="Tyre Make"          value={setup?.tyre_make} />
            <Row label="Tyre Model"         value={setup?.tyre_model} />
            <Row label="Tyre Condition"     value={setup?.tyre_condition} />
            <Row label="FL Cold"            value={setup?.tyre_pressure_fl} />
            <Row label="FR Cold"            value={setup?.tyre_pressure_fr} />
            <Row label="RL Cold"            value={setup?.tyre_pressure_rl} />
            <Row label="RR Cold"            value={setup?.tyre_pressure_rr} />
            <Row label="FL Hot"             value={setup?.hot_pressure_fl} />
            <Row label="FR Hot"             value={setup?.hot_pressure_fr} />
            <Row label="RL Hot"             value={setup?.hot_pressure_rl} />
            <Row label="RR Hot"             value={setup?.hot_pressure_rr} />

            <Section title="CHASSIS & SEAT" />
            <Row label="Torsion Bar"      value={setup?.torsion_bar} />
            <Row label="Seat Hardness"    value={setup?.seat_hardness} />
            <Row label="Seat Bolts Front" value={setup?.seat_bolts_front} />
            <Row label="Seat Bolts Back"  value={setup?.seat_bolts_back} />
            <Row label="Left Seat Stay"   value={setup?.seat_stay_left} />
            <Row label="Right Seat Stay"  value={setup?.seat_stay_right} />

            <Section title="ENGINE MONITORING" />
            <Row label="Max Engine Temp (°C)"  value={setup?.max_engine_temp_c} />
            <Row label="Low Engine Temp (°C)"  value={setup?.low_engine_temp_c} />
            <Row label="Max Exhaust Temp (°C)" value={setup?.max_exhaust_temp_c} />
            <Row label="Low Exhaust Temp (°C)" value={setup?.low_exhaust_temp_c} />
            <Row label="Max RPM"               value={setup?.max_rpm} />
            <Row label="Low RPM"               value={setup?.low_rpm} />
            <Row label="Top Speed (km/h)"      value={setup?.top_speed_kph} />
            <Row label="Low Speed (km/h)"      value={setup?.low_speed_kph} />

            {session.notes && (
              <>
                <Section title="NOTES" />
                <Text style={{ fontSize: 7.5, color: DARK, lineHeight: 1.5, marginTop: 2 }}>{session.notes}</Text>
              </>
            )}
          </View>
        </View>

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerTxt}>{teamName ?? 'Kart Connect'} — Driver Setup Sheet</Text>
          <Text style={s.footerTxt}>Created by Kart Connect</Text>
          <Text style={s.footerTxt}>{now}</Text>
        </View>

      </Page>
    </Document>
  )
}
