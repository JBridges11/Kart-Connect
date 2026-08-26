import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import type { Session, Setup, Kart } from '@/types'
import { lapMsToString as _lapMsToString } from '@/lib/formatters'

const DARK    = '#12121A'
const MUTED   = '#6B7A99'
const BORDER  = '#E4E4E7'
const AMBER   = '#CA8A04'

const s = StyleSheet.create({
  page:        { fontFamily: 'Helvetica', backgroundColor: '#FFFFFF', paddingBottom: 40 },
  header:      { backgroundColor: '#FFFFFF', paddingHorizontal: 25, paddingVertical: 20, alignItems: 'center' },
  logo:        { height: 60, width: 160 },
  headerSub:   { fontSize: 11, color: MUTED, marginTop: 6, textAlign: 'center' },
  titleBlock:  { paddingHorizontal: 25, paddingTop: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: BORDER },
  title:       { fontFamily: 'Helvetica-Bold', fontSize: 18, color: DARK },
  section:     { marginHorizontal: 25, marginTop: 16, marginBottom: 6, flexDirection: 'row', alignItems: 'center' },
  sectionLine: { flex: 1, height: 1, backgroundColor: BORDER, marginLeft: 8 },
  sectionTxt:  { fontFamily: 'Helvetica-Bold', fontSize: 10, color: MUTED, letterSpacing: 1 },
  row:         { flexDirection: 'row', paddingHorizontal: 25, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: BORDER },
  rowLabel:    { width: 200, fontSize: 12, color: MUTED },
  rowVal:      { flex: 1, fontSize: 12, color: DARK },
  footer:      { position: 'absolute', bottom: 16, left: 25, right: 25, flexDirection: 'row', justifyContent: 'space-between' },
  footerTxt:   { fontSize: 8, color: MUTED },
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

export function SetupPDFDocument({ session, setup, bestLap, teamName, teamLogoUrl, teamPrimaryColor }: Props) {
  const kart    = session.kart
  const track   = session.track
  const now     = new Date().toLocaleDateString('en-GB')
  const accent  = teamPrimaryColor ?? AMBER
  const [y, m, d] = (session.session_date ?? '').split('-')
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const dateStr = `${d} ${months[+m - 1]} ${y}`

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* Header */}
        <View style={s.header}>
          <Image src={teamLogoUrl ?? `${window.location.origin}/logo-pdf.png`} style={s.logo} />
          <Text style={s.headerSub}>{teamName ? `${teamName}  ·  ` : ''}Driver Setup Sheet</Text>
        </View>

        {/* Title block */}
        <View style={s.titleBlock}>
          <Text style={s.title}>{track?.name ?? 'Unknown Track'} — {dateStr}</Text>
          <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: DARK, marginTop: 12 }}>
            {kart?.driver_name ?? kart?.nickname ?? 'Driver'}
          </Text>
          <Text style={{ fontSize: 9, color: MUTED, marginTop: 2 }}>
            {[kart?.kart_make, kart?.kart_model, kart?.kart_class, bestLap ? `Best: ${bestLap}` : null].filter(Boolean).join('  ·  ')}
          </Text>
          <Text style={{ fontSize: 9, color: MUTED, marginTop: 4 }}>
            {[session.session_type?.charAt(0).toUpperCase() + session.session_type?.slice(1), session.conditions, session.weather_description].filter(Boolean).join('  ·  ')}
          </Text>
        </View>

        {/* Conditions column header row */}
        <View style={[s.row, { backgroundColor: '#F4F4F5', paddingVertical: 8 }]}>
          <Text style={[s.rowLabel, { fontFamily: 'Helvetica-Bold', fontSize: 9, color: MUTED, letterSpacing: 1 }]}>FIELD</Text>
          <Text style={[s.rowVal,   { fontFamily: 'Helvetica-Bold', fontSize: 9, color: MUTED, letterSpacing: 1 }]}>VALUE</Text>
        </View>

        {/* Kart */}
        <Section title="KART" />
        <Row label="Chassis"          value={setup?.chassis_type} />
        <Row label="Chassis Make"     value={setup?.chassis_make} />
        <Row label="Engine"           value={setup?.engine_type} />
        <Row label="Engine Number"    value={setup?.engine_number} />
        <Row label="Engine Rank"      value={setup?.engine_rank} />
        <Row label="Carb Rank"        value={setup?.carb_rank} />
        <Row label="Exhaust Rank"     value={setup?.exhaust_rank} />
        <Row label="Driver Weight (kg)" value={setup?.kart_driver_weight_kg} />

        {/* Engines from kart profile */}
        {kart?.engines?.length > 0 && (
          <>
            <Section title="ENGINES" />
            {kart.engines.map(e => (
              <View key={e.id}>
                <View style={[s.row, { backgroundColor: '#F4F4F5' }]}>
                  <Text style={[s.rowLabel, { fontFamily: 'Helvetica-Bold', fontSize: 9, color: accent, letterSpacing: 1 }]}>ENGINE #{e.rank}</Text>
                  <Text style={s.rowVal}> </Text>
                </View>
                <Row label="Make"   value={e.make} />
                <Row label="Number" value={e.number} />
              </View>
            ))}
          </>
        )}

        {/* Rear */}
        <Section title="REAR" />
        <Row label="Wheel Base"          value={setup?.wheel_base} />
        <Row label="Rear Bumper"         value={setup?.rear_bumper} />
        <Row label="Rear Width (mm)"     value={setup?.rear_width_mm} />
        <Row label="Rear Hub Length (mm)" value={setup?.rear_hub_length_mm} />
        <Row label="Third Bearing"       value={setup?.third_bearing} />
        <Row label="Third Bearing Type"  value={setup?.third_bearing_type} />
        <Row label="Axle Carrier Height" value={setup?.axle_height} />
        <Row label="Axle Hardness"       value={setup?.axle_hardness} />
        <Row label="Axle Length"         value={setup?.axle_length} />
        <Row label="Brake Pads"          value={setup?.brake_pads} />
        <Row label="Brake Bias (%)"      value={setup?.brake_bias_pct} />

        {/* Engine */}
        <Section title="ENGINE" />
        <Row label="Rear Sprocket (T)"   value={setup?.rear_sprocket_teeth} />
        <Row label="Engine Sprocket (T)" value={setup?.engine_sprocket_teeth} />
        <Row label="Sprocket Carrier"    value={setup?.sprocket_carrier_type} />
        <Row label="Chain"               value={setup?.chain_measurement} />
        <Row label="Spark Plug"          value={setup?.spark_plug} />
        <Row label="Tape Over Rad (%)"   value={setup?.tape_over_rad} />

        {/* Carburettor */}
        <Section title="CARBURETTOR" />
        <Row label="Main Jet"        value={setup?.main_jet} />
        <Row label="Air Screw"       value={setup?.air_screw} />
        <Row label="Needle Position" value={setup?.needle_position} />
        <Row label="Float Height"    value={setup?.float_height} />
        <Row label="Carb Year"       value={setup?.carb_year} />

        {/* Front End */}
        <Section title="FRONT END" />
        <Row label="Front Width (mm)"     value={setup?.front_width_mm} />
        <Row label="Front Hub Length (mm)" value={setup?.front_hub_length_mm} />
        <Row label="Right Height"         value={setup?.right_height} />
        <Row label="Camber (°)"           value={setup?.camber} />
        <Row label="Caster (°)"           value={setup?.caster} />
        <Row label="Toe (mm)"             value={setup?.toe} />
        <Row label="Stub Axle"            value={setup?.stub_axle} />

        {/* Wheels & Tyres */}
        <Section title="WHEELS & TYRES" />
        <Row label="Wheel Type"          value={setup?.wheel_type} />
        <Row label="Tyre Make"           value={setup?.tyre_make} />
        <Row label="Tyre Model"          value={setup?.tyre_model} />
        <Row label="Tyre Condition"      value={setup?.tyre_condition} />
        <Row label="Pressure FL (cold)"  value={setup?.tyre_pressure_fl} />
        <Row label="Pressure FR (cold)"  value={setup?.tyre_pressure_fr} />
        <Row label="Pressure RL (cold)"  value={setup?.tyre_pressure_rl} />
        <Row label="Pressure RR (cold)"  value={setup?.tyre_pressure_rr} />
        <Row label="Hot Pressure FL"     value={setup?.hot_pressure_fl} />
        <Row label="Hot Pressure FR"     value={setup?.hot_pressure_fr} />
        <Row label="Hot Pressure RL"     value={setup?.hot_pressure_rl} />
        <Row label="Hot Pressure RR"     value={setup?.hot_pressure_rr} />

        {/* Chassis & Seat */}
        <Section title="CHASSIS & SEAT" />
        <Row label="Torsion Bar"      value={setup?.torsion_bar} />
        <Row label="Seat Hardness"    value={setup?.seat_hardness} />
        <Row label="Seat Bolts Front" value={setup?.seat_bolts_front} />
        <Row label="Seat Bolts Back"  value={setup?.seat_bolts_back} />
        <Row label="Left Seat Stay"   value={setup?.seat_stay_left} />
        <Row label="Right Seat Stay"  value={setup?.seat_stay_right} />

        {/* Engine Monitoring */}
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
            <View style={[s.row, { paddingVertical: 10 }]}>
              <Text style={[s.rowVal, { fontSize: 10, lineHeight: 1.5 }]}>{session.notes}</Text>
            </View>
          </>
        )}

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
