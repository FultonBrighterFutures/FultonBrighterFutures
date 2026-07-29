import { useEffect, useState } from 'react'
import ThreePanel from './components/ThreePanel'
import Timeline from './components/Timeline'
import SiteMenu from './components/SiteMenu'
import ContentPage from './components/ContentPage'
import FutureOverlay from './components/FutureOverlay'
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

  const isMainView = !contentActive

  const activeMenuView = lookAheadActive
    ? 'look-ahead'
    : contentActive
      ? contentView
      : 'main'

  const closeContent = () => {
    setContentActive(false)
    setLookAheadActive(false)
    setSelectedFutureBuilding(null)
    setYear(DEFAULT_YEAR)
  }

  const openContent = (viewId) => {
    setLookAheadActive(false)
    setSelectedFutureBuilding(null)
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

    setLookAheadActive(false)
    setSelectedFutureBuilding(null)
    setYear(DEFAULT_YEAR)
  }

  const handleLookAhead = () => {
    setContentActive(false)
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
                  />
                  {lookAheadActive && (
                    <FutureOverlay
                      onBack={handleGoBack}
                      activeMetric={futureMetric}
                      onMetricChange={setFutureMetric}
                      selectedBuilding={selectedFutureBuilding}
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
