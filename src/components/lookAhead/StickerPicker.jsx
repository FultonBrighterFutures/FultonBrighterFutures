import { FUTURE_STICKERS } from '../../data/futureStickers'

export default function StickerPicker({
  open = false,
  selectedId = null,
  onSelect,
  onConfirm,
  onClose,
}) {
  return (
    <div
      className={`sticker-picker${open ? ' is-open' : ''}`}
      aria-hidden={!open}
      aria-label="Choose your sticker"
    >
      <div className="sticker-picker-panel">
        <button
          type="button"
          className="look-ahead-panel-close look-ahead-panel-close--menu-style"
          onClick={onClose}
          aria-label="Close sticker picker"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6L18 18M18 6L6 18" />
          </svg>
        </button>

        <header className="sticker-picker-header">
          <h3 className="sticker-picker-title">CHOOSE YOUR STICKER</h3>
          <p className="sticker-picker-subtitle">Add a personalized sticker to your building.</p>
        </header>

        <div className="sticker-picker-grid" role="listbox" aria-label="Stickers">
          {FUTURE_STICKERS.map((sticker) => {
            const isSelected = selectedId === sticker.id
            return (
              <button
                key={sticker.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={`sticker-picker-item${isSelected ? ' is-selected' : ''}`}
                onClick={() => onSelect?.(sticker.id)}
                title={sticker.label}
              >
                <span aria-hidden="true" className="sticker-picker-item-icon">
                  <img src={sticker.src} alt="" />
                </span>
              </button>
            )
          })}
        </div>

        <button
          type="button"
          className="sticker-picker-confirm"
          disabled={!selectedId}
          onClick={onConfirm}
        >
          Add Sticker
        </button>
      </div>
    </div>
  )
}
