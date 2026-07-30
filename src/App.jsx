import { useCallback, useEffect, useRef, useState } from 'react'
import ThreePanel from './components/ThreePanel'
import Timeline from './components/Timeline'
import SiteMenu from './components/SiteMenu'
import ContentPage from './components/ContentPage'
import FutureOverlay from './components/FutureOverlay'
import { useLookAheadBuilder } from './hooks/useLookAheadBuilder'
import {
  DEFAULT_TIMELINE_ITEM_ID,
  DEFAULT_YEAR,
  DATA_START_YEAR,
  TIMELINE_EVENTS_BY_YEAR,
  TIMELINE_ITEMS,
  TIMELINE_YEARS,
} from './constants/timeline'
import './App.css'
import fultonCountyLogo from '../DesignAssets/Logos/FultonCountyLogo.png'
import paflLogo from '../DesignAssets/Logos/PAFLLogo.png'
import fbfLogo from '../DesignAssets/Logos/FBFLogo.svg'
import BuildingCollage from '../DesignAssets/BuildingCollage.png'
import StaticBuildingIcon from './components/building/StaticBuildingIcon'
import FultonCountyBackdrop from './components/lookAhead/FultonCountyBackdrop'

// change to make carousel timeline go faster or slower
const AUTO_ADVANCE_DELAY_MS = 30_000
// Keep wheel/swipe timeline navigation available, but disabled for now.
const TIMELINE_SCROLL_ENABLED = true

function App() {
  const [year, setYear] = useState(DEFAULT_YEAR)
  const [activeTimelineItemId, setActiveTimelineItemId] = useState(DEFAULT_TIMELINE_ITEM_ID)
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
  const [inactivityResetKey, setInactivityResetKey] = useState(0)
  const [isLeaving2020, setIsLeaving2020] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)
  const [introExiting, setIntroExiting] = useState(false)

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

  const handleEnter = () => {
    if (introExiting) return
    setIntroExiting(true)
  }

  const handleIntroExitEnd = (event) => {
    if (!introExiting || event.target !== event.currentTarget) return
    setHasStarted(true)
  }

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
    setIsLeaving2020(false)
    setYear(DEFAULT_YEAR)
    setActiveTimelineItemId(DEFAULT_TIMELINE_ITEM_ID)
  }

  const openContent = (viewId) => {
    resetLookAhead()
    setContentView(viewId)
    setShowContent(true)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setContentActive(true))
    })
  }

  const handleTimelineItemChange = (itemId) => {
    const nextItem = TIMELINE_ITEMS.find((item) => item.id === itemId)
    if (!nextItem) return

    const shouldAnimateFrom2020 = year === 2020 && nextItem.visualizationYear === 2021
    closeContent()
    setIsLeaving2020(shouldAnimateFrom2020)
    setActiveTimelineItemId(nextItem.id)
    setYear(shouldAnimateFrom2020 ? 2020 : nextItem.visualizationYear)
  }

  const handleGoBack = () => {
    if (contentActive) {
      closeContent()
      return
    }

    resetLookAhead()
    setYear(DEFAULT_YEAR)
    setActiveTimelineItemId(DEFAULT_TIMELINE_ITEM_ID)
  }

  const handleLookAhead = () => {
    setContentActive(false)
    resetBuilder()
    setIsLeaving2020(false)
    setLookAheadActive(true)
    setShowFuture(true)
    setFutureMetric('energy')
    setSelectedFutureBuilding(null)
    setYear(TIMELINE_YEARS[TIMELINE_YEARS.length - 1])
    setActiveTimelineItemId(`year-${TIMELINE_YEARS[TIMELINE_YEARS.length - 1]}`)
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

  const launchBuildingFromHold = useCallback((buildingId, holdSeconds) => {
    return futureApiRef.current?.launchBuildingFromHold?.(buildingId, holdSeconds) ?? false
  }, [])

  const selectFutureBuildingById = useCallback((buildingId) => {
    return futureApiRef.current?.selectBuildingById?.(buildingId) ?? false
  }, [])

  const handleDropBuilding = useCallback(
    (point) => {
      placeBuilding(point)
    },
    [placeBuilding],
  )

  const handleVisualizationActivity = useCallback(() => {
    setInactivityResetKey((current) => current + 1)
  }, [])

  useEffect(() => {
    if (!introExiting) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const delay = reducedMotion ? 0 : 900
    const timeoutId = window.setTimeout(() => setHasStarted(true), delay)

    return () => window.clearTimeout(timeoutId)
  }, [introExiting])

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

  useEffect(() => {
    if (!isMainView || lookAheadActive || menuOpen) return

    const timeoutId = window.setTimeout(() => {
      const currentIndex = TIMELINE_ITEMS.findIndex((item) => item.id === activeTimelineItemId)
      const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % TIMELINE_ITEMS.length
      const nextItem = TIMELINE_ITEMS[nextIndex]
      const shouldAnimateFrom2020 = year === 2020 && nextItem.visualizationYear === 2021
      setIsLeaving2020(shouldAnimateFrom2020)
      setActiveTimelineItemId(nextItem.id)
      setYear(shouldAnimateFrom2020 ? 2020 : nextItem.visualizationYear)
    }, AUTO_ADVANCE_DELAY_MS)

    return () => window.clearTimeout(timeoutId)
  }, [activeTimelineItemId, inactivityResetKey, isMainView, lookAheadActive, menuOpen, year])

  return (
    <>
      {!hasStarted ? (
        <div
          className={`intro-screen${introExiting ? ' intro-screen--exiting' : ''}`}
          role="dialog"
          aria-modal="true"
          aria-label="Intro screen"
          onAnimationEnd={handleIntroExitEnd}
        >
          <StaticBuildingIcon className="intro-screen__building-visual" theme="energy" />
          <img
            className="intro-screen__logo intro-screen__logo--left"
            src={fultonCountyLogo}
            alt="Fulton County logo"
          />
          <img
            className="intro-screen__logo intro-screen__logo--right"
            src={paflLogo}
            alt="PAFL logo"
          />
          <div className="intro-screen__content">
            <img className="intro-screen__fbf-logo" src={fbfLogo} alt="FBF logo" />
            <div className="intro-screen__stack">
              <p className="intro-screen__copy">
                Explore the growth of solar energy across Fulton County through an interactive 
                visualization. Since 2021, each building with solar panels appears as a glowing 
                orb sized by its footprint, gradually illuminating the county as adoption spreads. 
                A timeline lets viewers watch this transformation unfold alongside key metrics 
                including energy produced, CO₂ emissions reduced, and money saved.
              </p>
              <button
                type="button"
                className="chrome-cta intro-screen__button"
                onClick={handleEnter}
                disabled={introExiting}
              >
                <span className="chrome-cta-label">Enter</span>
              </button>
            </div>

            <div className="intro-screen__visual">
              <img
                src={BuildingCollage}
                alt="Collage of the building visualization"
                className="intro-screen__image"
              />
            </div>
          </div>
        </div>
      ) : (
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
            {isMainView && !lookAheadActive && <div className="ticks"></div>}

            <div className={`scene-carousel${lookAheadActive ? ' scene-carousel--future' : ''}`}>
              <section id="main" className="triptych" aria-hidden={lookAheadActive}>
                <div id="energy" className="triptych-panel triptych-panel--energy">
                  <ThreePanel
                    variant="energy"
                    label="Energy scene"
                    year={year}
                    onInteraction={handleVisualizationActivity}
                  />
                </div>

                <div id="co2" className="triptych-panel triptych-panel--co2">
                  <ThreePanel
                    variant="co2"
                    label="CO2 scene"
                    year={year}
                    onInteraction={handleVisualizationActivity}
                  />
                </div>

                <div id="saving" className="triptych-panel triptych-panel--saving">
                  <ThreePanel
                    variant="saving"
                    label="Saving scene"
                    year={year}
                    onInteraction={handleVisualizationActivity}
                  />
                </div>
                {(year < DATA_START_YEAR || isLeaving2020) && (
                  <div
                    className={`triptych-blackout${
                      isLeaving2020 ? ' triptych-blackout--exiting' : ''
                    }`}
                    aria-label="Solar performance data begins in 2021"
                    onAnimationEnd={(event) => {
                      if (event.target === event.currentTarget) {
                        setYear(2021)
                        setIsLeaving2020(false)
                      }
                    }}
                  >
                    {!isLeaving2020 && (
                      <p className="triptych-blackout__event">
                        <span className="triptych-blackout__date">
                          {TIMELINE_EVENTS_BY_YEAR[2020].dateLabel}
                        </span>
                        <span className="triptych-blackout__copy">
                          {TIMELINE_EVENTS_BY_YEAR[2020].copy}
                        </span>
                      </p>
                    )}
                  </div>
                )}
              </section>

              {showFuture && (
                <section className="future-stage" aria-label="Future scene">
                  <FultonCountyBackdrop active={lookAheadActive} />
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
                      onLaunchBuildingFromHold={launchBuildingFromHold}
                      onSelectBuilding={selectFutureBuildingById}
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

      {isLeaving2020 && (
        <p className="triptych-blackout__event timeline-transition-event" aria-hidden="true">
          <span className="triptych-blackout__date">
            {TIMELINE_EVENTS_BY_YEAR[2020].dateLabel}
          </span>
          <span className="triptych-blackout__copy">
            {TIMELINE_EVENTS_BY_YEAR[2020].copy}
          </span>
        </p>
      )}

      {isMainView && !lookAheadActive && (
        <div className="chrome-carousel">
          <div className="timeline-stage">
            <Timeline
              year={year}
              activeItemId={activeTimelineItemId}
              onItemChange={handleTimelineItemChange}
              lookAheadActive={lookAheadActive}
              onLookAhead={handleLookAhead}
              scrollEnabled={
                TIMELINE_SCROLL_ENABLED && isMainView && !lookAheadActive && !menuOpen
              }
              onActivity={handleVisualizationActivity}
              suppressEventText={isLeaving2020}
            />
          </div>
        </div>
      )}

      <footer className="site-footer">
        <p>&copy; 2026 Fulton County Solar Data</p>
      </footer>
        </>
      )}
    </>
  )
}

export default App