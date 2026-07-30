import { getFutureSticker } from '../../data/futureStickers'
import BuildingPreview from './BuildingPreview'
import BuildingTypeGrid from './BuildingTypeGrid'
import BuildingPlacementPanel from './BuildingPlacementPanel'
import StickerPicker from './StickerPicker'

export default function BuildingComposer({
  selectedType = null,
  selectedStickerId = null,
  pendingStickerId = null,
  isStickerOpen = false,
  isPlacing = false,
  isReady = false,
  activeMetric = 'energy',
  onSelectType,
  onOpenSticker,
  onCloseSticker,
  onSelectPendingSticker,
  onConfirmSticker,
  onBeginPlacing,
  onCancelPlacing,
  onDrop,
  screenToGround,
  dropZoneBounds = null,
}) {
  const sticker = getFutureSticker(selectedStickerId)
  const hasSticker = Boolean(sticker)

  return (
    <div className="building-composer">
      <div className="building-composer-body">
        <div className="building-composer-row">
          <BuildingPreview
            typeId={selectedType}
            stickerId={selectedStickerId}
            metric={activeMetric}
          />
          <BuildingTypeGrid selectedType={selectedType} onSelect={onSelectType} />
        </div>

        {hasSticker ? (
          <div className="building-composer-sticker-row">
            <span className="building-composer-sticker-thumb" aria-hidden="true">
              <img src={sticker.src} alt="" />
            </span>
            <button type="button" className="future-sticker-btn" onClick={onOpenSticker}>
              Change Sticker
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="future-sticker-btn"
            onClick={onOpenSticker}
            disabled={!selectedType}
          >
            <span className="future-sticker-icon" aria-hidden="true">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 46 46" fill="none">
                <path
                  d="M20.8516 0.829102C19.8817 2.04884 19.1014 3.4148 18.5381 4.88477C17.7818 6.85811 17.431 8.97879 17.5039 11.125C17.5769 13.2712 18.0721 15.4018 18.959 17.3945C19.8459 19.3873 21.1074 21.2054 22.6719 22.7451C24.2363 24.2848 26.0744 25.5171 28.0811 26.3721C30.0877 27.2271 32.2259 27.6879 34.373 27.7266C36.52 27.7652 38.6348 27.3813 40.5957 26.5938C42.0605 26.0054 43.4174 25.2 44.624 24.207C43.8561 35.6403 34.3408 44.6768 22.7129 44.6768C10.5831 44.6765 0.75 34.8427 0.75 22.7129C0.750202 11.2102 9.59309 1.77415 20.8516 0.829102ZM44.1875 22.6016C42.9766 23.7039 41.5738 24.5839 40.0371 25.2012C38.2657 25.9127 36.3499 26.2617 34.3994 26.2266C32.4488 26.1914 30.5013 25.7729 28.6689 24.9922C26.8365 24.2114 25.1561 23.0846 23.7246 21.6758C22.293 20.2669 21.139 18.604 20.3291 16.7842C19.5193 14.9646 19.0692 13.0239 19.0029 11.0742C18.9367 9.12472 19.2554 7.20422 19.9385 5.42188C20.5312 3.8754 21.3887 2.45793 22.4717 1.22949L44.1875 22.6016Z"
                  stroke="#ADADAD"
                  strokeWidth="1.5"
                />
              </svg>
            </span>
            Add a sticker with your building
          </button>
        )}

        <button
          type="button"
          className={`future-add-btn${isReady ? ' is-ready' : ''}`}
          disabled={!isReady || isPlacing}
          onClick={onBeginPlacing}
        >
          <span className="future-add-btn-icon" aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 27 27" fill="none">
              <path
                d="M13.1247 0C14.2694 0 15.197 0.940157 15.197 2.0999V11.1998H24.1777C25.3222 11.1998 26.25 12.14 26.25 13.2997C26.25 14.4596 25.3222 15.3996 24.1777 15.3996H15.197V24.5001C15.197 25.6598 14.2694 26.6 13.1247 26.6C11.9803 26.6 11.0525 25.6598 11.0525 24.5001V15.3996H2.07227C0.927786 15.3996 0 14.4596 0 13.2997C0 12.14 0.927786 11.1998 2.07227 11.1998H11.0525V2.0999C11.0525 0.940157 11.9803 0 13.1247 0Z"
                fill="currentColor"
              />
            </svg>
          </span>
          Add Solar Building
        </button>
      </div>

      <StickerPicker
        open={isStickerOpen}
        selectedId={pendingStickerId}
        onSelect={onSelectPendingSticker}
        onConfirm={onConfirmSticker}
        onClose={onCloseSticker}
      />

      <BuildingPlacementPanel
        open={isPlacing}
        typeId={selectedType}
        stickerId={selectedStickerId}
        metric={activeMetric}
        dropZoneBounds={dropZoneBounds}
        onClose={onCancelPlacing}
        onDrop={onDrop}
        screenToGround={screenToGround}
      />
    </div>
  )
}
