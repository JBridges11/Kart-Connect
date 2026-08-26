export function getDriverLiveUrl(token: string): string {
  return `${import.meta.env.VITE_APP_URL}/live/${token}`
}

export function getWhatsAppShareUrl(
  token: string,
  driverName: string,
  trackName: string,
  phone?: string | null
): string {
  const url = getDriverLiveUrl(token)
  const text = encodeURIComponent(
    `Hi ${driverName}, here's your setup link for ${trackName} today: ${url}`
  )
  const number = phone ? phone.replace(/\D/g, '') : ''
  return `https://wa.me/${number}?text=${text}`
}
