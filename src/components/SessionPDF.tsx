import { Document, Page, View, Text, Image, StyleSheet, pdf } from '@react-pdf/renderer'
import { lapMsToString, lapMsDelta } from '@/lib/formatters'
import type { Session, Setup, LapTime, SetupChange } from '@/types'

export interface SessionPDFProps {
  session: Session
  setup: Setup | null
  lapTimes: LapTime[]
  changes: SetupChange[]
  bestLap: LapTime | null
  sessionLabel?: string
  teamLogoUrl?: string | null
  teamName?: string | null
  teamPrimaryColor?: string | null
  teamSecondaryColor?: string | null
}

const Y = '#E8FF00'
const DARK = '#12121A'
const BODY = '#1C1C28'
const MUTED = '#6B7A99'
const BORDER = '#E0E0E0'
const BG_SECTION = '#F7F7FA'

const s = StyleSheet.create({
  page:           { fontFamily: 'Helvetica', backgroundColor: '#FFFFFF', paddingBottom: 38 },
  // Header band — centered, matching comparison PDF
  header:         { backgroundColor: '#FFFFFF', paddingHorizontal: 25, paddingVertical: 18, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: DARK },
  logo:           { height: 60, width: 160 },
  headerSub:      { fontSize: 11, color: MUTED, marginTop: 6, textAlign: 'center' },
  // Session title block
  titleBlock:     { paddingHorizontal: 25, paddingTop: 15, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: BORDER },
  trackName:      { fontFamily: 'Helvetica-Bold', fontSize: 22, color: BODY },
  subLine:        { fontSize: 9.5, color: MUTED, marginTop: 4 },
  badgeRow:       { flexDirection: 'row', gap: 7, marginTop: 7 },
  badge:          { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 3, fontSize: 8, fontFamily: 'Helvetica-Bold' },
  badgeYellow:    { backgroundColor: Y, color: DARK },
  badgeGrey:      { backgroundColor: '#E8E8F0', color: BODY },
  // Three-column info row
  infoRow:        { flexDirection: 'row', paddingHorizontal: 25, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: BORDER },
  infoCol:        { flex: 1 },
  infoItem:       { flexDirection: 'row', marginBottom: 4 },
  infoLabel:      { fontSize: 8, color: MUTED, width: 82, fontFamily: 'Helvetica-Bold' },
  infoValue:      { fontSize: 8, color: BODY, flex: 1 },
  // Notes
  notesBlock:     { marginHorizontal: 25, marginTop: 8, padding: 9, backgroundColor: BG_SECTION, borderRadius: 4 },
  notesText:      { fontSize: 8, color: BODY, lineHeight: 1.5 },
  // Section heading
  sectionHeading: { marginHorizontal: 25, marginTop: 12, marginBottom: 6, flexDirection: 'row', alignItems: 'center' },
  sectionLine:    { flex: 1, height: 1, backgroundColor: BORDER, marginLeft: 8 },
  sectionTitle:   { fontFamily: 'Helvetica-Bold', fontSize: 9, color: MUTED, letterSpacing: 2 },
  // Setup grid — 3 columns
  setupGrid:      { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 25, gap: 7 },
  setupCard:      { width: '32%', backgroundColor: BG_SECTION, borderRadius: 4, padding: 8 },
  setupCardTitle: { fontFamily: 'Helvetica-Bold', fontSize: 7.5, color: MUTED, letterSpacing: 1.5, marginBottom: 5, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: BORDER },
  setupRow:       { flexDirection: 'row', marginBottom: 3 },
  setupLabel:     { fontSize: 7.5, color: MUTED, width: 86, fontFamily: 'Helvetica-Bold' },
  setupValue:     { fontSize: 7.5, color: BODY, flex: 1, fontFamily: 'Helvetica-Bold' },
  setupSubtitle:  { fontSize: 7, color: MUTED, letterSpacing: 1, marginBottom: 2, marginTop: 3 },
  // Lap times table
  table:          { marginHorizontal: 25 },
  tableHead:      { flexDirection: 'row', backgroundColor: DARK, borderRadius: 3, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 2 },
  tableHeadCell:  { fontFamily: 'Helvetica-Bold', fontSize: 7.5, color: MUTED, letterSpacing: 1 },
  tableRow:       { flexDirection: 'row', paddingHorizontal: 10, paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: BORDER },
  tableRowBest:   { flexDirection: 'row', paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#FFFBE0', borderLeftWidth: 2, borderLeftColor: Y },
  tableCell:      { fontSize: 8.5, color: BODY, fontFamily: 'Courier' },
  bestBadge:      { backgroundColor: Y, color: DARK, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 2, fontSize: 7, fontFamily: 'Helvetica-Bold' },
  fasterBadge:    { backgroundColor: '#D4EDDA', color: '#155724', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 2, fontSize: 7, fontFamily: 'Helvetica-Bold' },
  slowerBadge:    { backgroundColor: '#F8D7DA', color: '#721C24', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 2, fontSize: 7, fontFamily: 'Helvetica-Bold' },
  // Changes
  changeItem:     { marginHorizontal: 25, marginBottom: 7, paddingLeft: 11, borderLeftWidth: 2, borderLeftColor: Y },
  changeDesc:     { fontSize: 8.5, color: BODY, fontFamily: 'Helvetica-Bold' },
  changeMeta:     { fontSize: 7.5, color: MUTED, marginTop: 2 },
  // Footer
  footer:         { position: 'absolute', bottom: 18, left: 25, right: 25, flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 7 },
  footerText:     { fontSize: 7.5, color: MUTED },
})

function v(val: unknown, unit?: string): string {
  if (val === null || val === undefined || val === '') return '—'
  if (typeof val === 'boolean') return val ? 'Yes' : 'No'
  return unit ? `${val} ${unit}` : String(val)
}

function SectionHeading({ title }: { title: string }) {
  return (
    <View style={s.sectionHeading}>
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={s.sectionLine} />
    </View>
  )
}

function InfoRow({ items }: { items: [string, string][] }) {
  const third = Math.ceil(items.length / 3)
  const cols = [items.slice(0, third), items.slice(third, third * 2), items.slice(third * 2)]
  return (
    <View style={s.infoRow}>
      {cols.map((col, ci) => (
        <View key={ci} style={s.infoCol}>
          {col.map(([label, value]) => (
            <View key={label} style={s.infoItem}>
              <Text style={s.infoLabel}>{label}</Text>
              <Text style={s.infoValue}>{value}</Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  )
}

function SetupCard({ title, rows }: { title: string; rows: { label: string; value: string; sub?: boolean }[] }) {
  return (
    <View style={s.setupCard}>
      <Text style={s.setupCardTitle}>{title.toUpperCase()}</Text>
      {rows.map((r, i) => (
        r.sub
          ? <Text key={i} style={s.setupSubtitle}>{r.label.toUpperCase()}</Text>
          : (
            <View key={i} style={s.setupRow}>
              <Text style={s.setupLabel}>{r.label}</Text>
              <Text style={s.setupValue}>{r.value}</Text>
            </View>
          )
      ))}
    </View>
  )
}

function SessionDocument({ session, setup: raw, lapTimes, changes, bestLap, sessionLabel, teamLogoUrl, teamName, teamPrimaryColor, teamSecondaryColor }: SessionPDFProps) {
  const accent = teamPrimaryColor ?? Y
  const dark   = teamSecondaryColor ?? DARK
  const setup = raw ?? ({} as Partial<Setup>)
  const generated = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

  const sessionType = session.session_type.charAt(0).toUpperCase() + session.session_type.slice(1)

  const gearRatio = setup.rear_sprocket_teeth && setup.engine_sprocket_teeth
    ? (setup.rear_sprocket_teeth / setup.engine_sprocket_teeth).toFixed(2)
    : '—'

  const driverName    = setup.driver_name ?? session.kart?.driver_name ?? null
  const chassisNumber = setup.chassis_number ?? null
  const engineMake    = setup.engine_make ?? null
  const engineNumber  = setup.engine_number ?? null

  const infoItems: [string, string][] = [
    ['Session Type', sessionType],
    ...(driverName    ? [['Driver',         driverName]    as [string, string]] : []),
    ...(chassisNumber ? [['Chassis No.',    chassisNumber] as [string, string]] : []),
    ...(engineMake    ? [['Engine Make',    engineMake]    as [string, string]] : []),
    ...(engineNumber  ? [['Engine No.',     engineNumber]  as [string, string]] : []),
    ['Conditions', session.conditions ?? '—'],
    ['Weather', session.weather_description ?? '—'],
    ['Altitude', v(session.altitude_m, 'm')],
    ['Air Temp', v(session.air_temp_c, '°C')],
    ['Humidity', v(session.humidity_pct, '%')],
    ['Wind Speed', v(session.wind_speed_mph, 'mph')],
  ]

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header — centered, matching comparison PDF */}
        <View style={[s.header, { borderBottomColor: dark }]}>
          <Image src={teamLogoUrl ?? `${window.location.origin}/logo-pdf.png`} style={s.logo} />
          <Text style={s.headerSub}>{teamName ? `${teamName}  ·  ` : ''}Session Report</Text>
        </View>

        {/* Session title */}
        <View style={s.titleBlock}>
          <Text style={s.trackName}>{session.track?.name ?? 'Unknown Track'}</Text>
          <Text style={s.subLine}>
            {[sessionLabel, session.kart?.nickname, new Date(session.session_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })].filter(Boolean).join('  ·  ')}
          </Text>
          <View style={s.badgeRow}>
            <Text style={[s.badge, s.badgeGrey]}>{sessionType.toUpperCase()}</Text>
            {session.conditions && <Text style={[s.badge, s.badgeGrey]}>{session.conditions.toUpperCase()}</Text>}
            {session.weather_description && <Text style={[s.badge, s.badgeGrey]}>{session.weather_description.toUpperCase()}</Text>}
            {session.best_lap_time_ms && <Text style={[s.badge, { backgroundColor: accent, color: dark }]}>BEST {lapMsToString(session.best_lap_time_ms)}</Text>}
            {session.total_laps && <Text style={[s.badge, s.badgeGrey]}>{session.total_laps} LAPS</Text>}
          </View>
        </View>

        {/* Conditions info */}
        <InfoRow items={infoItems} />

        {/* Notes */}
        {session.notes && (
          <View style={s.notesBlock}>
            <Text style={s.notesText}>{session.notes}</Text>
          </View>
        )}

        {/* Setup */}
        {raw && (
          <>
            <SectionHeading title="SETUP" />
            {/* 3×3 grid — Row 1: Kart · Engine · Carburettor */}
            <View style={s.setupGrid}>
              <SetupCard title="The Kart" rows={[
                ...(driverName    ? [{ label: 'Driver',      value: v(driverName)    }] : []),
                { label: 'Chassis',    value: v(setup.chassis_type) },
                ...(chassisNumber ? [{ label: 'Chassis No.', value: v(chassisNumber) }] : []),
                { label: 'Engine',     value: v(setup.engine_type) },
                ...(engineMake    ? [{ label: 'Engine Make', value: v(engineMake)    }] : []),
                ...(engineNumber  ? [{ label: 'Engine No.',  value: v(engineNumber)  }] : []),
                { label: 'Weight',     value: v(setup.kart_driver_weight_kg, 'kg') },
              ]} />

              <SetupCard title="Engine" rows={[
                { label: 'Rear Sprocket',  value: v(setup.rear_sprocket_teeth, 'T') },
                { label: 'Eng Sprocket',   value: v(setup.engine_sprocket_teeth, 'T') },
                { label: 'Gear Ratio',     value: gearRatio },
                { label: 'Tape Over Rad',  value: setup.tape_over_rad !== null && setup.tape_over_rad !== undefined ? `${setup.tape_over_rad} strips` : '—' },
                { label: 'Chain',          value: v(setup.chain_measurement) },
                { label: 'Spark Plug',     value: v(setup.spark_plug) },
              ]} />

              <SetupCard title="Carburettor" rows={[
                { label: 'Main Jet',      value: v(setup.main_jet) },
                { label: 'Air Screw',     value: v(setup.air_screw) },
                { label: 'Needle Pos',    value: v(setup.needle_position) },
                { label: 'Float Height',  value: v(setup.float_height) },
                { label: 'Carb Year',     value: v(setup.carb_year) },
              ]} />

              {/* Row 2: Engine Monitor · Rear · Front End */}
              <SetupCard title="Engine Monitor" rows={[
                { label: 'Max RPM',       value: v(setup.max_rpm, 'rpm') },
                { label: 'Low RPM',       value: v(setup.low_rpm, 'rpm') },
                { label: 'Engine Temp',   value: '', sub: true },
                { label: 'Max',           value: v(setup.max_engine_temp_c, '°C') },
                { label: 'Low',           value: v(setup.low_engine_temp_c, '°C') },
                { label: 'Exhaust Temp',  value: '', sub: true },
                { label: 'Max',           value: v(setup.max_exhaust_temp_c, '°C') },
                { label: 'Low',           value: v(setup.low_exhaust_temp_c, '°C') },
                { label: 'Top Speed',     value: v(setup.top_speed_kph, 'km/h') },
                { label: 'Low Speed',     value: v(setup.low_speed_kph, 'km/h') },
              ]} />

              <SetupCard title="Rear" rows={[
                { label: 'Width',          value: v(setup.rear_width_mm, 'mm') },
                { label: 'Hub Length',     value: v(setup.rear_hub_length_mm, 'mm') },
                { label: 'Axle Height',    value: v(setup.axle_height) },
                { label: 'Rear Bumper',    value: v(setup.rear_bumper) },
                { label: 'Third Bearing',  value: v(setup.third_bearing) },
                { label: 'Brake Pads',     value: v(setup.brake_pads) },
                { label: 'Brake Bias',     value: v(setup.brake_bias_pct, '%') },
                { label: 'Spkt Carrier',   value: v(setup.sprocket_carrier_type) },
              ]} />

              <SetupCard title="Front End" rows={[
                { label: 'Width',       value: v(setup.front_width_mm, 'mm') },
                { label: 'Hub Length',  value: v(setup.front_hub_length_mm, 'mm') },
                { label: 'Right Height', value: v(setup.right_height) },
                { label: 'Caster',      value: v(setup.caster) },
                { label: 'Camber',      value: v(setup.camber) },
                { label: 'Toe',         value: v(setup.toe) },
                { label: 'Stub Axle',   value: v(setup.stub_axle) },
              ]} />

              {/* Row 3: Wheels & Tyres · Pressures · Chassis */}
              <SetupCard title="Wheels & Tyres" rows={[
                { label: 'Wheel Type',   value: v(setup.wheel_type) },
                { label: 'Tyre Make',    value: v(setup.tyre_make) },
                { label: 'Tyre Model',   value: v(setup.tyre_model) },
                { label: 'Condition',    value: v(setup.tyre_condition) },
              ]} />

              <SetupCard title="Pressures" rows={[
                { label: 'Cold',  value: '', sub: true },
                { label: 'FL',    value: v(setup.tyre_pressure_fl) },
                { label: 'FR',    value: v(setup.tyre_pressure_fr) },
                { label: 'RL',    value: v(setup.tyre_pressure_rl) },
                { label: 'RR',    value: v(setup.tyre_pressure_rr) },
                { label: 'Hot',   value: '', sub: true },
                { label: 'FL',    value: v(setup.hot_pressure_fl) },
                { label: 'FR',    value: v(setup.hot_pressure_fr) },
                { label: 'RL',    value: v(setup.hot_pressure_rl) },
                { label: 'RR',    value: v(setup.hot_pressure_rr) },
              ]} />

              <SetupCard title="Chassis" rows={[
                { label: 'Seat Hardness',   value: v(setup.seat_hardness) },
                { label: 'Bolts Front',     value: v(setup.seat_bolts_front) },
                { label: 'Bolts Back',      value: v(setup.seat_bolts_back) },
                { label: 'Stay Left',       value: v(setup.seat_stay_left) },
                { label: 'Stay Right',      value: v(setup.seat_stay_right) },
                { label: 'Torsion Bar',     value: v(setup.torsion_bar) },
              ]} />
            </View>
          </>
        )}

        {/* Lap Times */}
        {lapTimes.length > 0 && (
          <>
            <SectionHeading title="LAP TIMES" />
            <View style={s.table}>
              <View style={[s.tableHead, { backgroundColor: dark }]}>
                <Text style={[s.tableHeadCell, { width: 30 }]}>#</Text>
                <Text style={[s.tableHeadCell, { width: 80 }]}>TIME</Text>
                <Text style={[s.tableHeadCell, { flex: 1 }]}>DELTA</Text>
                <Text style={[s.tableHeadCell, { flex: 2 }]}>NOTES</Text>
              </View>
              {lapTimes.map(lap => {
                const isBest = lap.lap_time_ms === bestLap?.lap_time_ms
                const delta  = bestLap ? lapMsDelta(lap.lap_time_ms, bestLap.lap_time_ms) : null
                return (
                  <View key={lap.id} style={isBest ? [s.tableRowBest, { borderLeftColor: accent }] : s.tableRow}>
                    <Text style={[s.tableCell, { width: 30 }]}>{lap.lap_number}</Text>
                    <Text style={[s.tableCell, { width: 80 }]}>{lapMsToString(lap.lap_time_ms)}</Text>
                    <View style={{ flex: 1 }}>
                      {isBest
                        ? <Text style={[s.bestBadge, { backgroundColor: accent, color: dark }]}>BEST</Text>
                        : delta && !delta.equal
                          ? <Text style={delta.faster ? s.fasterBadge : s.slowerBadge}>{delta.label}</Text>
                          : null
                      }
                    </View>
                    <Text style={[s.tableCell, { flex: 2, color: MUTED }]}>{lap.notes ?? ''}</Text>
                  </View>
                )
              })}
            </View>
          </>
        )}

        {/* Changes */}
        {changes.length > 0 && (
          <>
            <SectionHeading title="CHANGES LOG" />
            {changes.map(c => (
              <View key={c.id} style={[s.changeItem, { borderLeftColor: accent }]}>
                <Text style={s.changeDesc}>{c.change_description}</Text>
                {c.lap_delta_ms !== null && (
                  <Text style={[s.changeMeta, { color: c.lap_delta_ms < 0 ? '#155724' : '#721C24' }]}>
                    {c.lap_delta_ms < 0 ? '' : '+'}{c.lap_delta_ms}ms
                  </Text>
                )}
                {c.driver_feedback && <Text style={s.changeMeta}>{c.driver_feedback}</Text>}
              </View>
            ))}
          </>
        )}

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>KART CONNECT  ·  Session Report</Text>
          <Text style={s.footerText}>Created by Kart Connect</Text>
          <Text style={s.footerText}>Generated {generated}</Text>
        </View>
      </Page>
    </Document>
  )
}

export async function generateSessionPDFUrl(props: SessionPDFProps): Promise<{ url: string; filename: string }> {
  const blob = await pdf(<SessionDocument {...props} />).toBlob()
  const url = URL.createObjectURL(blob)
  const trackSlug = (props.session.track?.name ?? 'session').replace(/\s+/g, '-').toLowerCase()
  const label = (props.sessionLabel ?? '').replace(/\s+/g, '-').toLowerCase()
  const filename = `kart-connect-${trackSlug}-${props.session.session_date}${label ? `-${label}` : ''}.pdf`
  return { url, filename }
}

export async function generateSessionPDF(props: SessionPDFProps): Promise<void> {
  const { url, filename } = await generateSessionPDFUrl(props)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
