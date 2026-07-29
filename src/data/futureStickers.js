import notificationIcon from '../assets/sticker-icons/Notification  - Iconly Pro.png'
import confettiIcon from '../assets/sticker-icons/Confetti  - Iconly Pro.png'
import guitarIcon from '../assets/sticker-icons/Acoustic Guitar Alt - Iconly Pro.png'
import headphonesIcon from '../assets/sticker-icons/Airpod Max Alt - Iconly Pro.png'
import giftIcon from '../assets/sticker-icons/Gift  - Iconly Pro.png'
import tennisIcon from '../assets/sticker-icons/Tennis Ball Basic - Iconly Pro.png'
import checkIcon from '../assets/sticker-icons/Checkmark 1 - Iconly Pro.png'
import flashIcon from '../assets/sticker-icons/Flash  - Iconly Pro.png'
import sunIcon from '../assets/sticker-icons/Sun - Iconly Pro.png'
import trophyIcon from '../assets/sticker-icons/FIFA World Cup Trophy - Iconly Pro.png'
import weatherIcon from '../assets/sticker-icons/Sun Cloud Big Rain - Iconly Pro.png'
import basketballIcon from '../assets/sticker-icons/Basketball Alt - Iconly Pro.png'

/**
 * Sticker catalog for Look Ahead building personalization.
 * Images live in src/assets/sticker-icons (Iconly Pro set).
 */
export const FUTURE_STICKERS = [
  { id: 'bell', src: notificationIcon, label: 'Bell' },
  { id: 'party', src: confettiIcon, label: 'Party' },
  { id: 'guitar', src: guitarIcon, label: 'Guitar' },
  { id: 'headphones', src: headphonesIcon, label: 'Headphones' },
  { id: 'gift', src: giftIcon, label: 'Gift' },
  { id: 'tennis', src: tennisIcon, label: 'Tennis' },
  { id: 'check', src: checkIcon, label: 'Check' },
  { id: 'bolt', src: flashIcon, label: 'Bolt' },
  { id: 'sun', src: sunIcon, label: 'Sun' },
  { id: 'trophy', src: trophyIcon, label: 'Trophy' },
  { id: 'weather', src: weatherIcon, label: 'Weather' },
  { id: 'basketball', src: basketballIcon, label: 'Basketball' },
]

const STICKERS_BY_ID = Object.fromEntries(FUTURE_STICKERS.map((sticker) => [sticker.id, sticker]))

export function getFutureSticker(stickerId) {
  return STICKERS_BY_ID[stickerId] ?? null
}
