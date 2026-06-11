import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Card, Button, SegmentedControl } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type { PressureUnit } from '@/types'

export function SettingsPage() {
  const navigate = useNavigate()
  const { user }  = useAuth()
  const [pressureUnit, setPressureUnit] = useState<PressureUnit>(
    (localStorage.getItem('kc_pressure_unit') as PressureUnit) ?? 'bar'
  )
  const [signingOut, setSigningOut] = useState(false)

  function savePressureUnit(unit: PressureUnit) {
    setPressureUnit(unit)
    localStorage.setItem('kc_pressure_unit', unit)
  }

  async function signOut() {
    setSigningOut(true)
    await supabase.auth.signOut()
    navigate('/login')
  }

  function exportData() {
    const blob = new Blob(
      [JSON.stringify({ exported_at: new Date().toISOString(), user: user?.email }, null, 2)],
      { type: 'application/json' }
    )
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'kart-connect-export.json'
    a.click()
  }

  return (
    <PageWrapper title="Settings">
      <div className="max-w-lg mx-auto space-y-5">
        {/* Profile */}
        <Card>
          <h3 className="font-heading text-sm uppercase tracking-wider text-text-primary mb-4">Profile</h3>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent-primary/20 flex items-center justify-center text-accent-primary font-bold">
              {user?.email?.[0].toUpperCase() ?? '?'}
            </div>
            <div>
              <p className="text-sm font-semibold text-text-primary">{user?.email ?? '—'}</p>
              <p className="text-xs text-text-muted">Registered racer</p>
            </div>
          </div>
        </Card>

        {/* Preferences */}
        <Card>
          <h3 className="font-heading text-sm uppercase tracking-wider text-text-primary mb-4">Preferences</h3>
          <SegmentedControl
            label="Tyre Pressure Unit"
            options={[
              { label: 'Bar', value: 'bar' },
              { label: 'PSI', value: 'psi' },
            ]}
            value={pressureUnit}
            onChange={v => savePressureUnit(v as PressureUnit)}
          />
        </Card>

        {/* Data */}
        <Card>
          <h3 className="font-heading text-sm uppercase tracking-wider text-text-primary mb-4">Data</h3>
          <Button variant="secondary" size="sm" onClick={exportData}>
            Export JSON Backup
          </Button>
        </Card>

        {/* Danger Zone */}
        <Card className="border-accent-secondary/30">
          <h3 className="font-heading text-sm uppercase tracking-wider text-accent-secondary mb-4">
            Danger Zone
          </h3>
          <Button
            variant="danger"
            size="sm"
            loading={signingOut}
            onClick={() => void signOut()}
          >
            Sign Out
          </Button>
        </Card>
      </div>
    </PageWrapper>
  )
}
