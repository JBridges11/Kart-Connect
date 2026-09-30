
const YELLOW  = '#F5C842'
const GREEN   = '#5CC85A'
const PURPLE  = '#7B5EA7'
const CONTACT = 'info@kart-connect.com'
const EFFECTIVE = '1 August 2026'

interface Section {
  num: number
  title: string
  content: React.ReactNode
}

const sections: Section[] = [
  {
    num: 1, title: 'Who We Are',
    content: (
      <>
        <p>Kart Connect ("we", "us", "our") is a software-as-a-service platform designed for kart racing teams and privateer drivers to log session data, manage setup sheets, track lap times, and analyse performance across race weekends.</p>
        <p>This Privacy Policy explains how we collect, use, store, and protect your personal information when you use our application at <strong>app.kart-connect.com</strong>.</p>
        <p>If you have any questions, contact us at: <a href={`mailto:${CONTACT}`}>{CONTACT}</a></p>
      </>
    ),
  },
  {
    num: 2, title: 'Information We Collect',
    content: (
      <>
        <p><strong>Account information</strong> — When you register, we collect your email address and a hashed password (we never store your password in plain text).</p>
        <p><strong>Profile and team data</strong> — Names, team names, logos, and branding colours you choose to add.</p>
        <p><strong>Session and setup data</strong> — Kart setup sheets, lap times, track conditions, weather, notes, and change logs you record within the app. This data is yours and is stored on your behalf.</p>
        <p><strong>Billing information</strong> — Subscription and payment details are handled entirely by Stripe. We receive only non-sensitive confirmation data (subscription status, plan type, renewal dates) and never store your card number or banking details.</p>
        <p><strong>Usage data</strong> — Standard server logs including IP address, browser type, pages visited, and error events. We use this to maintain service reliability.</p>
        <p><strong>Cookies</strong> — We use a single session authentication cookie to keep you logged in. We do not use advertising or tracking cookies.</p>
      </>
    ),
  },
  {
    num: 3, title: 'How We Use Your Information',
    content: (
      <>
        <p>We use your information only to:</p>
        <ul className="kc-list">
          {[
            'Provide, operate, and improve the Kart Connect platform',
            'Authenticate your account and maintain your session',
            'Process subscription payments through Stripe',
            'Send transactional emails (welcome, billing receipts, renewal reminders)',
            'Respond to support requests',
            'Detect and prevent fraud or security incidents',
          ].map(item => (
            <li key={item} className="kc-item">
              <span className="kc-dash">—</span> {item}
            </li>
          ))}
        </ul>
        <p>We do not sell your personal data. We do not use your session or setup data to train AI models or share it with third parties for marketing purposes.</p>
      </>
    ),
  },
  {
    num: 4, title: 'Data Storage and Security',
    content: (
      <>
        <p>Your data is stored in <strong>Supabase</strong> (PostgreSQL), hosted on infrastructure within the European Union. Supabase is SOC 2 Type II certified and encrypts data in transit (TLS 1.2+) and at rest (AES-256).</p>
        <p>Authentication is managed by Supabase Auth with secure JWT tokens. Row-level security policies ensure you can only access your own data.</p>
        <p>We take reasonable technical and organisational measures to protect your data. However, no system is completely secure — if you believe your account has been compromised, contact us immediately at <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.</p>
      </>
    ),
  },
  {
    num: 5, title: 'Third-Party Services',
    content: (
      <>
        <p>We work with a small number of trusted third parties to operate the service:</p>
        <ul className="kc-list">
          {[
            ['Supabase', 'Database hosting, authentication, and storage (EU infrastructure)'],
            ['Stripe', 'Payment processing and subscription management (PCI-DSS compliant)'],
            ['Netlify', 'Web hosting for the application front-end'],
            ['Resend', 'Transactional email delivery'],
          ].map(([name, desc]) => (
            <li key={name} className="kc-item">
              <span className="kc-dash">—</span> <strong>{name}</strong> — {desc}
            </li>
          ))}
        </ul>
        <p>Each of these providers has their own privacy policy and is subject to appropriate data-processing agreements where required under UK GDPR.</p>
      </>
    ),
  },
  {
    num: 6, title: 'Your Rights (UK GDPR)',
    content: (
      <>
        <p>If you are based in the UK or European Economic Area, you have the following rights regarding your personal data:</p>
        <ul className="kc-list">
          {[
            ['Access', 'Request a copy of the data we hold about you'],
            ['Rectification', 'Ask us to correct inaccurate or incomplete data'],
            ['Erasure', 'Request deletion of your account and associated personal data'],
            ['Portability', 'Receive your session data in a structured, machine-readable format'],
            ['Restriction', 'Ask us to limit how we process your data in certain circumstances'],
            ['Objection', 'Object to processing based on legitimate interests'],
          ].map(([right, desc]) => (
            <li key={right} className="kc-item">
              <span className="kc-dash">—</span> <strong>{right}</strong> — {desc}
            </li>
          ))}
        </ul>
        <p>To exercise any of these rights, email <a href={`mailto:${CONTACT}`}>{CONTACT}</a>. We will respond within 30 days. You also have the right to lodge a complaint with the Information Commissioner's Office (ICO) at <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer">ico.org.uk</a>.</p>
      </>
    ),
  },
  {
    num: 7, title: 'Data Retention',
    content: (
      <>
        <p>We retain your personal data for as long as your account is active. If you cancel your subscription and request deletion, we will remove your personal data within 30 days, except where we are required to retain it for legal or accounting purposes (typically 6 years for financial records under UK law).</p>
        <p>Anonymised, aggregated usage statistics may be retained indefinitely as they cannot be linked to any individual.</p>
      </>
    ),
  },
  {
    num: 8, title: 'Cookies',
    content: (
      <>
        <p>We use one strictly necessary cookie: an authentication session cookie that keeps you logged into the application. This cookie is set only after you sign in and is deleted when you sign out or when the session expires.</p>
        <p>We do not use advertising cookies, tracking pixels, or third-party analytics cookies. We do not participate in cross-site tracking.</p>
      </>
    ),
  },
  {
    num: 9, title: 'Children',
    content: (
      <p>Kart Connect is not directed at children under the age of 13. We do not knowingly collect personal information from children. If you believe a child has provided us with personal data, please contact us and we will delete it promptly.</p>
    ),
  },
  {
    num: 10, title: 'Changes to This Policy',
    content: (
      <>
        <p>We may update this Privacy Policy from time to time. When we make material changes, we will notify you by email or by displaying a notice within the application at least 14 days before the change takes effect.</p>
        <p>Continued use of Kart Connect after the effective date constitutes acceptance of the updated policy.</p>
      </>
    ),
  },
  {
    num: 11, title: 'Contact',
    content: (
      <>
        <p>For any privacy-related questions, requests, or concerns, please contact:</p>
        <p>
          <strong>Kart Connect</strong><br />
          Email: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>
        </p>
      </>
    ),
  },
]

export function PrivacyPage() {
  return (
    <div style={{ background: '#f4f4f4', minHeight: '100vh', fontFamily: "'Inter', Arial, sans-serif", WebkitFontSmoothing: 'antialiased' }}>
      <style>{`
        .kc-privacy a { color: ${PURPLE}; }
        .kc-privacy p { font-size: 14.5px; color: #444; line-height: 1.7; margin-bottom: 12px; }
        .kc-privacy p:last-child { margin-bottom: 0; }
        .kc-list { list-style: none; margin: 10px 0 14px; padding: 0; }
        .kc-item { display: flex; gap: 10px; font-size: 14px; color: #444; padding: 7px 0; border-bottom: 1px solid #e8e8e8; line-height: 1.6; }
        .kc-item:last-child { border-bottom: none; }
        .kc-dash { color: ${YELLOW}; font-weight: 700; font-size: 16px; line-height: 1.45; flex-shrink: 0; }
      `}</style>

      <div className="kc-privacy" style={{ maxWidth: 720, margin: '0 auto', padding: '0 0 48px' }}>
        {/* Gradient accent bar */}
        <div style={{ height: 6, background: `linear-gradient(to right, ${YELLOW} 0%, ${GREEN} 50%, ${PURPLE} 100%)` }} />

        {/* Header */}
        <div style={{ background: '#fff', padding: '28px 40px 24px', borderBottom: '1px solid #e8e8e8', textAlign: 'center' }}>
          <img src="/logo-pdf.png" alt="Kart Connect" style={{ height: 72, width: 'auto', display: 'block', margin: '0 auto 18px' }} />
          <span style={{ display: 'inline-block', background: '#fef9e6', color: '#b5890a', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '4px 12px', borderRadius: 20, marginBottom: 12 }}>
            Legal
          </span>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a1a', marginBottom: 8, letterSpacing: '-0.02em' }}>Privacy Policy</h1>
          <p style={{ fontSize: 13, color: '#888', marginBottom: 0 }}>Effective date: {EFFECTIVE}</p>
        </div>

        {/* Intro callout */}
        <div style={{ margin: '28px 40px 0', padding: '14px 18px', background: '#fef9e6', borderLeft: `4px solid ${YELLOW}`, borderRadius: '0 6px 6px 0', fontSize: 14, color: '#555', lineHeight: 1.65 }}>
          Your privacy matters to us. Kart Connect collects only the data needed to run the service, never sells it, and gives you full control over your information.
        </div>

        {/* Sections */}
        <div style={{ padding: '28px 40px 0' }}>
          {sections.map((sec, i) => (
            <div key={sec.num} style={{ marginBottom: 36 }}>
              {i > 0 && <hr style={{ border: 'none', borderTop: '1px solid #e8e8e8', margin: '0 0 28px' }} />}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, paddingBottom: 10, borderBottom: `2px solid #fef9e6` }}>
                <div style={{
                  background: PURPLE, color: '#fff', fontSize: 11, fontWeight: 700,
                  width: 26, height: 26, borderRadius: '50%', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>{sec.num}</div>
                <span style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a', letterSpacing: '-0.01em' }}>{sec.title}</span>
              </div>
              <div>{sec.content}</div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ background: '#f9f9f9', borderTop: '1px solid #e8e8e8', padding: '28px 40px', textAlign: 'center', marginTop: 28 }}>
          <img src="/logo-pdf.png" alt="Kart Connect" style={{ height: 40, width: 'auto', display: 'block', margin: '0 auto 14px' }} />
          <p style={{ fontSize: 12, color: '#aaa', marginBottom: 12 }}>
            © {new Date().getFullYear()} Kart Connect. All rights reserved.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 20, flexWrap: 'wrap' }}>
            <a href="/terms" style={{ fontSize: 12, color: '#aaa', textDecoration: 'none' }}>Terms &amp; Conditions</a>
            <a href={`mailto:${CONTACT}`} style={{ fontSize: 12, color: '#aaa', textDecoration: 'none' }}>{CONTACT}</a>
          </div>
        </div>
      </div>
    </div>
  )
}
