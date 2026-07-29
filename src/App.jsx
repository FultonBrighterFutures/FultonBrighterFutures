import { useCallback, useEffect, useRef, useState } from 'react'
import ThreePanel from './components/ThreePanel'
import Timeline from './components/Timeline'
import SiteMenu from './components/SiteMenu'
import ContentPage from './components/ContentPage'
import FutureOverlay from './components/FutureOverlay'
import { useLookAheadBuilder } from './hooks/useLookAheadBuilder'
import { DEFAULT_YEAR, TIMELINE_YEARS } from './constants/timeline'
import './App.css'

function App() {
  const [year, setYear] = useState(DEFAULT_YEAR)
  const [lookAheadActive, setLookAheadActive] = useState(false)
  const [showFuture, setShowFuture] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [contentView, setContentView] = useState('artist-statement')
  const [showContent, setShowContent] = useState(false)
  const [contentActive, setContentActive] = useState(false)
  const [futureMetric, setFutureMetric] = useState('energy')
  const [selectedFutureBuilding, setSelectedFutureBuilding] = useState(null)
  const [baselineTotals, setBaselineTotals] = useState({
    annualKwh: 0,
    annualCo2Lbs: 0,
    annualSavings: 0,
  })

  const futureApiRef = useRef(null)
  const {
    selectedType,
    selectedStickerId,
    pendingStickerId,
    setPendingStickerId,
    userBuildings,
    addedTotals,
    isReady,
    isPlacing,
    isStickerOpen,
    selectType,
    openStickerPicker,
    closeStickerPicker,
    confirmSticker,
    beginPlacing,
    cancelPlacing,
    placeBuilding,
    reset: resetBuilder,
    clearUserBuildings,
  } = useLookAheadBuilder()

  const isMainView = !contentActive

  const activeMenuView = lookAheadActive
    ? 'look-ahead'
    : contentActive
      ? contentView
      : 'main'

  const resetLookAhead = useCallback(() => {
    setLookAheadActive(false)
    setSelectedFutureBuilding(null)
    resetBuilder()
  }, [resetBuilder])

  const closeContent = () => {
    setContentActive(false)
    resetLookAhead()
    setYear(DEFAULT_YEAR)
  }

  const openContent = (viewId) => {
    resetLookAhead()
    setContentView(viewId)
    setShowContent(true)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setContentActive(true))
    })
  }

  const handleYearChange = (nextYear) => {
    closeContent()
    setYear(nextYear)
  }

  const handleGoBack = () => {
    if (contentActive) {
      closeContent()
      return
    }

    resetLookAhead()
    setYear(DEFAULT_YEAR)
  }

  const handleLookAhead = () => {
    setContentActive(false)
    resetBuilder()
    setLookAheadActive(true)
    setShowFuture(true)
    setFutureMetric('energy')
    setSelectedFutureBuilding(null)
    setYear(TIMELINE_YEARS[TIMELINE_YEARS.length - 1])
  }

  const handleNavigate = (viewId) => {
    if (viewId === 'main') {
      closeContent()
      return
    }

    openContent(viewId)
  }

  const handleFutureApi = useCallback((api) => {
    futureApiRef.current = api
  }, [])

  const screenToGround = useCallback((clientX, clientY) => {
    return futureApiRef.current?.screenToGround?.(clientX, clientY) ?? null
  }, [])

  const handleDropBuilding = useCallback(
    (point) => {
      placeBuilding(point)
    },
    [placeBuilding],
  )

  useEffect(() => {
    if (!menuOpen) return

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setMenuOpen(false)
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [menuOpen])

  // Debug: press C to clear persisted Look Ahead buildings
  useEffect(() => {
    const handleClearBuildings = (event) => {
      if (event.key !== 'c' && event.key !== 'C') return
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const tag = event.target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || event.target?.isContentEditable) return

      event.preventDefault()
      clearUserBuildings()
      setSelectedFutureBuilding(null)
      console.info('[Look Ahead] Cleared persisted user buildings')
    }

    window.addEventListener('keydown', handleClearBuildings)
    return () => window.removeEventListener('keydown', handleClearBuildings)
  }, [clearUserBuildings])

  return (
    <>
      <header className="site-header">
        <SiteMenu
          isOpen={menuOpen}
          onToggle={setMenuOpen}
          activeView={activeMenuView}
          onNavigate={handleNavigate}
          onLookAhead={handleLookAhead}
        />
      </header>

      <main
        className={`site-main${
          isMainView && !lookAheadActive ? ' site-main--with-timeline' : ''
        }`}
      >
        <div className={`view-carousel${contentActive ? ' view-carousel--content' : ''}`}>
          <div className="main-view-stage" aria-hidden={contentActive}>
            {isMainView && <div className="ticks"></div>}

            <div className={`scene-carousel${lookAheadActive ? ' scene-carousel--future' : ''}`}>
              <section id="main" className="triptych" aria-hidden={lookAheadActive}>
                <div id="energy" className="triptych-panel triptych-panel--energy">
                  <ThreePanel variant="energy" label="Energy scene" year={year} />
                </div>

                <div id="co2" className="triptych-panel triptych-panel--co2">
                  <ThreePanel variant="co2" label="CO2 scene" year={year} />
                </div>

                <div id="saving" className="triptych-panel triptych-panel--saving">
                  <ThreePanel variant="saving" label="Saving scene" year={year} />
                </div>
              </section>

              {showFuture && (
                <section className="future-stage" aria-label="Future scene">
                  <ThreePanel
                    variant="future"
                    label="Future scene"
                    particleTheme={futureMetric}
                    onBuildingSelect={setSelectedFutureBuilding}
                    userBuildings={userBuildings}
                    placementMode={isPlacing}
                    onBaselineTotals={setBaselineTotals}
                    onFutureApi={handleFutureApi}
                  />
                  {lookAheadActive && (
                    <FutureOverlay
                      onBack={handleGoBack}
                      activeMetric={futureMetric}
                      onMetricChange={setFutureMetric}
                      selectedBuilding={selectedFutureBuilding}
                      baselineTotals={baselineTotals}
                      addedTotals={addedTotals}
                      userBuildings={userBuildings}
                      selectedType={selectedType}
                      selectedStickerId={selectedStickerId}
                      pendingStickerId={pendingStickerId}
                      isStickerOpen={isStickerOpen}
                      isPlacing={isPlacing}
                      isReady={isReady}
                      onSelectType={selectType}
                      onOpenSticker={openStickerPicker}
                      onCloseSticker={closeStickerPicker}
                      onSelectPendingSticker={setPendingStickerId}
                      onConfirmSticker={confirmSticker}
                      onBeginPlacing={beginPlacing}
                      onCancelPlacing={cancelPlacing}
                      onDrop={handleDropBuilding}
                      screenToGround={screenToGround}
                    />
                  )}
                </section>
              )}
            </div>
          </div>

          {showContent && (
            <section
              className="content-view-stage"
              aria-hidden={!contentActive}
              aria-label="Content page"
            >
              <ContentPage view={contentView} onBack={handleGoBack} />
            </section>
          )}
        </div>
      </main>

      {isMainView && !lookAheadActive && (
        <div className="chrome-carousel">
          <div className="timeline-stage">
            <Timeline
              year={year}
              onYearChange={handleYearChange}
              lookAheadActive={lookAheadActive}
              onLookAhead={handleLookAhead}
              scrollEnabled={isMainView && !lookAheadActive && !menuOpen}
            />
          </div>
        </div>
      )}

      <footer className="site-footer">
        <p>&copy; 2026 Fulton County Solar Data</p>
      </footer>
    </>
  )
}

export default App
