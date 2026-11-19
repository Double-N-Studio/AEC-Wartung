// Printable workshop notice (aushang.html): fills in the club's logo, app name, address and QR code.
import { club, clubHost, clubLogo, clubQr, loadClub } from './club'

void loadClub().then(() => {
  const logo = document.querySelector<HTMLImageElement>('#logo')!
  logo.src = clubLogo()
  logo.alt = club.name
  document.querySelector('#app')!.textContent = club.app
  document.querySelector('#url')!.textContent = clubHost()
  const qr = document.querySelector<HTMLImageElement>('#qr')!
  qr.src = clubQr()
  qr.alt = `QR-Code zu ${clubHost()}`
  document.title = `Werkstatt-Aushang · ${club.app}`
})
