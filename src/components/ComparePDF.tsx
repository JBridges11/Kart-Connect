import { Document, Page, View, Text, Image, StyleSheet, pdf, PDFViewer } from '@react-pdf/renderer'
import { lapMsToString } from '@/lib/formatters'
import type { Session, Setup, LapTime } from '@/types'

export interface ComparePDFProps {
  sessionA: Session
  sessionB: Session
  setupA: Setup | null
  setupB: Setup | null
  lapTimesA: LapTime[]
  lapTimesB: LapTime[]
  labelA?: string
  labelB?: string
  teamName?: string | null
  teamLogoUrl?: string | null
  teamPrimaryColor?: string | null
}

const DARK  = '#12121A'
const MUTED = '#6B7A99'
const BORDER = '#E4E4E7'
const DIFF  = '#FEF3C7'
const DIFF_TEXT = '#92400E'
const AMBER = '#CA8A04'

const s = StyleSheet.create({
  page:        { fontFamily: 'Helvetica', backgroundColor: '#FFFFFF', paddingBottom: 40 },
  header:      { backgroundColor: '#FFFFFF', paddingHorizontal: 25, paddingVertical: 20, alignItems: 'center' },
  logo:        { height: 60, width: 160 },
  headerSub:   { fontSize: 11, color: MUTED, marginTop: 6, textAlign: 'center' },
  titleBlock:  { paddingHorizontal: 25, paddingTop: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: BORDER },
  title:       { fontFamily: 'Helvetica-Bold', fontSize: 18, color: DARK },
  // Session columns header
  colHeader:   { flexDirection: 'row', paddingHorizontal: 25, paddingVertical: 10, backgroundColor: '#F4F4F5', borderBottomWidth: 1, borderBottomColor: BORDER },
  // colCell — label 150pt + 2 × 195pt = 540pt within 545pt content area
  colCell:     { width: 195 },
  colHeadTxt:  { fontSize: 10, fontFamily: 'Helvetica-Bold', color: DARK },
  colASub:     { fontSize: 9, color: MUTED, marginTop: 2 },
  // Table rows
  row:         { flexDirection: 'row', paddingHorizontal: 25, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: BORDER },
  rowDiff:     { backgroundColor: DIFF },
  rowLabel:    { width: 150, fontSize: 12, color: MUTED },
  rowVal:      { fontSize: 12, color: DARK },
  rowValDiff:  { color: DIFF_TEXT, fontFamily: 'Helvetica-Bold' },
  // Section
  section:     { marginHorizontal: 25, marginTop: 16, marginBottom: 6, flexDirection: 'row', alignItems: 'center' },
  sectionLine: { flex: 1, height: 1, backgroundColor: BORDER, marginLeft: 8 },
  sectionTxt:  { fontFamily: 'Helvetica-Bold', fontSize: 10, color: MUTED, letterSpacing: 1 },
  // Lap times
  lapRow:      { flexDirection: 'row', paddingHorizontal: 25, paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: BORDER },
  lapNum:      { width: 40, fontSize: 12, color: MUTED },
  lapTime:     { flex: 1, fontSize: 12, fontFamily: 'Helvetica', color: DARK },
  lapBest:     { color: AMBER, fontFamily: 'Helvetica-Bold' },
  footer:      { position: 'absolute', bottom: 16, left: 25, right: 25, flexDirection: 'row', justifyContent: 'space-between' },
  footerTxt:   { fontSize: 8, color: MUTED },
})

const SETUP_FIELDS: { key: string; label: string; section?: string }[] = [
  // Kart
  { key: 'chassis_type',           label: 'Chassis',              section: 'KART' },
  { key: 'chassis_make',           label: 'Chassis Make' },
  { key: 'engine_type',            label: 'Engine' },
  { key: 'engine_number',          label: 'Engine Number' },
  { key: 'engine_rank',            label: 'Engine Rank' },
  { key: 'carb_rank',              label: 'Carb Rank' },
  { key: 'exhaust_rank',           label: 'Exhaust Rank' },
  { key: 'kart_driver_weight_kg',  label: 'Driver Weight (kg)' },
  // Rear
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
  // Engine
  { key: 'rear_sprocket_teeth',    label: 'Rear Sprocket (T)',    section: 'ENGINE' },
  { key: 'engine_sprocket_teeth',  label: 'Engine Sprocket (T)' },
  { key: 'sprocket_carrier_type',  label: 'Sprocket Carrier' },
  { key: 'chain_measurement',      label: 'Chain' },
  { key: 'spark_plug',             label: 'Spark Plug' },
  { key: 'tape_over_rad',          label: 'Tape Over Rad (%)' },
  // Carburettor
  { key: 'main_jet',               label: 'Main Jet',             section: 'CARBURETTOR' },
  { key: 'air_screw',              label: 'Air Screw' },
  { key: 'needle_position',        label: 'Needle Position' },
  { key: 'float_height',           label: 'Float Height' },
  { key: 'carb_year',              label: 'Carb Year' },
  // Front End
  { key: 'front_width_mm',         label: 'Front Width (mm)',     section: 'FRONT END' },
  { key: 'front_hub_length_mm',    label: 'Front Hub Length (mm)' },
  { key: 'right_height',           label: 'Right Height' },
  { key: 'camber',                 label: 'Camber (°)' },
  { key: 'caster',                 label: 'Caster (°)' },
  { key: 'toe',                    label: 'Toe (mm)' },
  { key: 'stub_axle',              label: 'Stub Axle' },
  // Wheels & Tyres
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
  // Engine Monitoring
  { key: 'max_engine_temp_c',      label: 'Max Engine Temp (°C)', section: 'ENGINE MONITORING' },
  { key: 'low_engine_temp_c',      label: 'Low Engine Temp (°C)' },
  { key: 'max_exhaust_temp_c',     label: 'Max Exhaust Temp (°C)' },
  { key: 'low_exhaust_temp_c',     label: 'Low Exhaust Temp (°C)' },
  { key: 'max_rpm',                label: 'Max RPM' },
  { key: 'low_rpm',                label: 'Low RPM' },
  { key: 'top_speed_kph',          label: 'Top Speed (km/h)' },
  { key: 'low_speed_kph',          label: 'Low Speed (km/h)' },
  // Chassis & Seat
  { key: 'torsion_bar',            label: 'Torsion Bar',          section: 'CHASSIS & SEAT' },
  { key: 'seat_hardness',          label: 'Seat Hardness' },
  { key: 'seat_bolts_front',       label: 'Seat Bolts Front' },
  { key: 'seat_bolts_back',        label: 'Seat Bolts Back' },
  { key: 'seat_stay_left',         label: 'Left Seat Stay' },
  { key: 'seat_stay_right',        label: 'Right Seat Stay' },
]

// "Track — Date — Test N"  →  { track, date, test }
function splitLabel(label: string | undefined, fallback: string) {
  if (!label) return { track: fallback, date: '', test: '' }
  const parts = label.split(' — ')
  if (parts.length === 3) return { track: parts[0], date: parts[1], test: parts[2] }
  return { track: label, date: '', test: '' }
}

function fmt(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—'
  if (typeof v === 'boolean') return v ? 'Yes' : 'No'
  return String(v)
}

export function ComparePDFViewer(props: ComparePDFProps) {
  return (
    <PDFViewer width="100%" height="100%" style={{ border: 'none' }}>
      <ComparePDFDoc {...props} />
    </PDFViewer>
  )
}

function ComparePDFDoc({ sessionA, sessionB, setupA, setupB, lapTimesA, lapTimesB, labelA, labelB, teamName, teamLogoUrl, teamPrimaryColor: _teamPrimaryColor }: ComparePDFProps) {
  const bestA  = lapTimesA.length ? Math.min(...lapTimesA.map(l => l.lap_time_ms)) : null
  const bestB  = lapTimesB.length ? Math.min(...lapTimesB.map(l => l.lap_time_ms)) : null
  const now    = new Date().toLocaleDateString('en-GB')


  const diffOnly = SETUP_FIELDS.filter(({ key }) => {
    const a = fmt((setupA as Record<string, unknown> | null)?.[key])
    const b = fmt((setupB as Record<string, unknown> | null)?.[key])
    return a !== b
  })

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <Image src={teamLogoUrl ?? `${window.location.origin}/logo-pdf.png`} style={s.logo} />
          <Text style={s.headerSub}>{teamName ? `${teamName}  ·  ` : ''}Setup Comparison</Text>
        </View>

        {/* Title block — no columns, just stacked text, no overlap possible */}
        {(() => {
          const a = splitLabel(labelA, sessionA.session_name ?? sessionA.session_type ?? 'A')
          const b = splitLabel(labelB, sessionB.session_name ?? sessionB.session_type ?? 'B')
          return (
            <View style={s.titleBlock}>
              <Text style={s.title}>{sessionA.track?.name ?? '?'} — {(() => { const [y,m,d] = (sessionA.session_date ?? '').split('-'); return `${d} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+m-1]} ${y}` })()}</Text>
              <Text style={{ fontSize: 10, color: MUTED, marginTop: 6 }}>
                {diffOnly.length} difference{diffOnly.length !== 1 ? 's' : ''} found between the two setups
              </Text>
              <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: DARK, marginTop: 12 }}>
                {a.test || a.track}
              </Text>
              <Text style={{ fontSize: 9, color: MUTED, marginTop: 2 }}>
                {[sessionA.kart?.nickname, bestA ? `Best: ${lapMsToString(bestA)}` : null].filter(Boolean).join('  ·  ')}
              </Text>
              <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: DARK, marginTop: 8 }}>
                {b.test || b.track}
              </Text>
              <Text style={{ fontSize: 9, color: MUTED, marginTop: 2 }}>
                {[sessionB.kart?.nickname, bestB ? `Best: ${lapMsToString(bestB)}` : null].filter(Boolean).join('  ·  ')}
              </Text>
            </View>
          )
        })()}

        {/* Column label row — uses s.row (same as data rows, proven to work) */}
        <View style={[s.row, { backgroundColor: '#F4F4F5', paddingVertical: 8 }]}>
          <Text style={s.rowLabel}> </Text>
          <View style={s.colCell}>
            <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: MUTED, letterSpacing: 1 }}>{splitLabel(labelA, sessionA.session_name ?? 'A').test.toUpperCase()}</Text>
          </View>
          <View style={s.colCell}>
            <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: MUTED, letterSpacing: 1 }}>{splitLabel(labelB, sessionB.session_name ?? 'B').test.toUpperCase()}</Text>
          </View>
        </View>

        {/* Differences only */}
        <View style={s.section}>
          <Text style={s.sectionTxt}>DIFFERENCES</Text>
          <View style={s.sectionLine} />
        </View>
        {diffOnly.length === 0 ? (
          <Text style={{ paddingHorizontal: 25, fontSize: 8, color: MUTED }}>No differences found — setups are identical.</Text>
        ) : diffOnly.map(({ key, label }) => {
          const vA = fmt((setupA as Record<string, unknown> | null)?.[key])
          const vB = fmt((setupB as Record<string, unknown> | null)?.[key])
          return (
            <View key={key} style={[s.row, s.rowDiff]}>
              <Text style={s.rowLabel}>{label}</Text>
              <View style={s.colCell}><Text style={[s.rowVal, s.rowValDiff]}>{vA}</Text></View>
              <View style={s.colCell}><Text style={[s.rowVal, s.rowValDiff]}>{vB}</Text></View>
            </View>
          )
        })}

        {/* Full comparison */}
        <View style={s.section}>
          <Text style={s.sectionTxt}>FULL SETUP</Text>
          <View style={s.sectionLine} />
        </View>
        {SETUP_FIELDS.map(({ key, label, section }) => {
          const vA = fmt((setupA as Record<string, unknown> | null)?.[key])
          const vB = fmt((setupB as Record<string, unknown> | null)?.[key])
          const differs = vA !== vB
          return (
            <View key={key}>
              {section && (
                <View style={s.section}>
                  <Text style={s.sectionTxt}>{section}</Text>
                  <View style={s.sectionLine} />
                </View>
              )}
              <View style={[s.row, differs ? s.rowDiff : {}]}>
                <Text style={s.rowLabel}>{label}</Text>
                <View style={s.colCell}><Text style={[s.rowVal, differs ? s.rowValDiff : {}]}>{vA}</Text></View>
                <View style={s.colCell}><Text style={[s.rowVal, differs ? s.rowValDiff : {}]}>{vB}</Text></View>
              </View>
            </View>
          )
        })}

        {/* Lap times — inline at bottom of setup page */}
        {(lapTimesA.length > 0 || lapTimesB.length > 0) && (
          <View>
            <View style={s.section}>
              <Text style={s.sectionTxt}>LAP TIMES</Text>
              <View style={s.sectionLine} />
            </View>

            <View style={[s.row, { backgroundColor: '#F4F4F5' }]}>
              <Text style={[s.rowLabel, { fontFamily: 'Helvetica-Bold', fontSize: 9, letterSpacing: 1 }]}>LAP</Text>
              <View style={s.colCell}>
                <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: DARK }}>
                  {splitLabel(labelA, sessionA.session_name ?? 'A').test || (labelA ?? 'A')}
                </Text>
              </View>
              <View style={s.colCell}>
                <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: DARK }}>
                  {splitLabel(labelB, sessionB.session_name ?? 'B').test || (labelB ?? 'B')}
                </Text>
              </View>
            </View>

            {Array.from({ length: Math.max(lapTimesA.length, lapTimesB.length) }, (_, i) => {
              const lapA = lapTimesA[i]
              const lapB = lapTimesB[i]
              return (
                <View key={i} style={s.row}>
                  <Text style={[s.rowLabel, { color: '#71717A' }]}>{i + 1}</Text>
                  <View style={s.colCell}>
                    <Text style={[s.rowVal, lapA?.lap_time_ms === bestA ? { color: AMBER, fontFamily: 'Helvetica-Bold' } : {}]}>
                      {lapA ? lapMsToString(lapA.lap_time_ms) : '—'}
                    </Text>
                  </View>
                  <View style={s.colCell}>
                    <Text style={[s.rowVal, lapB?.lap_time_ms === bestB ? { color: AMBER, fontFamily: 'Helvetica-Bold' } : {}]}>
                      {lapB ? lapMsToString(lapB.lap_time_ms) : '—'}
                    </Text>
                  </View>
                </View>
              )
            })}
          </View>
        )}

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerTxt}>{teamName ?? 'Kart Connect'} — Setup Comparison</Text>
          <Text style={s.footerTxt}>Created by Kart Connect</Text>
          <Text style={s.footerTxt}>{now}</Text>
        </View>
      </Page>
    </Document>
  )
}

export async function generateComparePDF(props: ComparePDFProps) {
  const blob = await pdf(<ComparePDFDoc {...props} />).toBlob()
  const url  = URL.createObjectURL(blob)

  const track    = props.sessionA.track?.name ?? 'Unknown Track'
  const raw      = props.sessionA.session_date ?? ''
  const [y, m, d] = raw.split('-')
  const date     = `${d}-${m}-${y}`
  const partsA   = (props.labelA ?? '').split(' — ')
  const partsB   = (props.labelB ?? '').split(' — ')
  const testA    = partsA.length === 3 ? partsA[2] : (props.labelA ?? 'A')
  const testB    = partsB.length === 3 ? partsB[2] : (props.labelB ?? 'B')
  const filename = `Kart Connect - ${date} - ${track} - ${testA} vs ${testB}.pdf`

  return { url, filename }
}
