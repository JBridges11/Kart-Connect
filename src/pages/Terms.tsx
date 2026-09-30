export function TermsPage() {
  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      <iframe
        src="/kc-terms.html"
        title="Kart Connect Terms and Conditions"
        className="flex-1 w-full border-none"
        style={{ minHeight: '100vh' }}
      />
    </div>
  )
}
