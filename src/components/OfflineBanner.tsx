import { WifiOff } from 'lucide-react'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

export function OfflineBanner() {
  const isOnline = useOnlineStatus()
  if (isOnline) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-2 bg-red-600 text-white text-xs font-semibold py-2 px-4">
      <WifiOff size={13} />
      <span>No internet connection — data cannot be saved or synced until signal is restored</span>
    </div>
  )
}
