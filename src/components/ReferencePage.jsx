import { useState } from 'react'
import './ReferencePage.css'

const refs = {
  primary: [
    {
      id: 'fulton-solar',
      title: 'Fulton County Solar Program',
      publisher: 'Fulton County Government',
      year: '2024',
      type: 'Government dataset',
      url: 'https://www.fultoncountyga.gov/Inside-Fulton-County/Fulton-County-Initiatives/Sustainable-Fulton/Solar-Program',
      description:
        'Primary dataset. 42 county buildings, solar generation by site, PPA structure, CO₂ equivalencies, and program history since 2021.',
      featured: true,
    },
    {
      id: 'gpb-2025',
      title: 'Fulton County Partners Georgia Company on Solar Panel Expansion',
      publisher: 'Georgia Public Broadcasting',
      year: '2025',
      type: 'News report',
      url: 'https://www.gpb.org/news/2025/06/02/we-drove-them-here-fulton-county-partners-georgia-company-on-solar-panel-expansion',
      description:
        'Covers the 2025 expansion adding 32 buildings to the program. Used for projected generation data and program scope updates.',
    },
    {
      id: 'atlanta-solar',
      title: 'Solar Atlanta — Live Generation Map',
      publisher: 'Cherry Street Energy',
      year: '2024',
      type: 'Interactive reference',
      url: 'https://cherrystreet.live/solar-atlanta/',
      description:
        'Existing solar data visualization for the City of Atlanta. Referenced as a benchmark for regional scope and real-time data display conventions.',
    },
  ],
  visualization: [
    {
      id: 'penderecki',
      title: "The Maestro's Manor — Penderecki's Garden",
      publisher: "Penderecki's Garden",
      year: '2023',
      type: 'Interactive experience',
      url: 'https://pendereckisgarden.pl/en/the-maestros-manor',
      description:
        'Primary UX reference. Scroll-driven, chapter-based immersive narrative. Data and story coexist through spatial metaphor, ambient audio, and cyclical time structure.',
      featured: true,
    },
    {
      id: 'google-invisible',
      title: 'Seeing the Invisible',
      publisher: 'Google Arts & Culture',
      year: '2022',
      type: 'Interactive experiment',
      url: 'https://artsandculture.google.com/experiment/seeing-the-invisible/_QG_qDtzdqTsww?hl=en',
      description:
        'Reference for making invisible phenomena — like electromagnetic fields or solar energy — sensory and visually compelling.',
    },
    {
      id: 'chartogne',
      title: 'Chartogne-Taillet — Estate Site',
      publisher: 'Chartogne-Taillet',
      year: '2023',
      type: 'Three.js site',
      url: 'https://chartogne-taillet.com/en',
      description:
        'Reference for scroll-driven Three.js timelines, parallax depth, and organic particle systems tied to narrative milestones.',
    },
    {
      id: 'google-ai',
      title: 'Our AI Journey',
      publisher: 'Google DeepMind',
      year: '2024',
      type: 'Interactive timeline',
      url: 'https://ai.google/our-ai-journey/?section=seqtoseq',
      description:
        'Reference for chapter-based data progression with smooth transitions between time periods and bold milestone callouts.',
    },
    {
      id: 'instructables-solar',
      title: 'Making Solar Data Visualizations',
      publisher: 'Instructables',
      year: '2022',
      type: 'Tutorial',
      url: 'https://www.instructables.com/Making-Solar-Data-Visualizations/',
      description:
        'Reference for tangible and physical encodings of solar generation data — treating kWh as material rather than number.',
    },
  ],
  technical: [
    {
      id: 'threejs',
      title: 'Three.js',
      publisher: 'mrdoob',
      year: '2024',
      type: 'JavaScript library',
      url: 'https://threejs.org/',
      description:
        'WebGL library used to render the energy, CO₂, and savings building maps, particle systems, and Look Ahead scene interactions.',
    },
    {
      id: 'reactjs',
      title: 'React.js',
      publisher: 'Meta',
      year: '2024',
      type: 'JavaScript library',
      url: 'https://react.dev/',
      description:
        'UI library used for the site shell, timeline chrome, content pages, and interactive overlays that wrap the Three.js visualizations.',
    },
    {
      id: 'particlesjs',
      title: 'particles.js',
      publisher: 'Vincent Garreau',
      year: '2016',
      type: 'JavaScript library',
      url: 'https://vincentgarreau.com/particles.js/',
      description:
        'Lightweight particle system library. Evaluated for ambient light scatter, energy drift effects, and background atmosphere rendering.',
    },
  ],
  lookAhead: [
    {
      id: 'gsa-production',
      title: 'Solar Energy Production Estimates for Georgia\'s Climate',
      publisher: 'Georgia Solar Authority',
      year: '2024',
      type: 'Industry guide',
      url: 'https://georgiasolarauthority.com/solar-energy-production-estimates-for-georgia-climate',
      description:
        'Georgia peak-sun-hour ranges and NREL PVWatts context for Atlanta / central Georgia. Informed the ~1,350 kWh per kW-year yield used for Look Ahead building energy estimates.',
      featured: true,
    },
    {
      id: 'nrel-pvwatts',
      title: 'PVWatts Calculator',
      publisher: 'National Renewable Energy Laboratory (NREL)',
      year: '2024',
      type: 'Federal tool',
      url: 'https://pvwatts.nrel.gov/',
      description:
        'Industry-standard rooftop PV production model. Cited alongside Georgia Solar Authority guidance for Atlanta metro annual generation per installed kilowatt.',
    },
    {
      id: 'digital-windmill-ga',
      title: 'Solar in Georgia: Costs, Incentives & Installers (2026)',
      publisher: 'Digital Windmill',
      year: '2026',
      type: 'Market report',
      url: 'https://www.digitalwindmill.com/renewable-energy/solar-in-georgia-costs-incentives-top-installers-2026',
      description:
        'Atlanta-area yield (~1,300–1,400 kWh/kW-year) and typical residential system sizes (7–10 kW). Used to size the Look Ahead home building archetype (~8 kW / ~20 panels).',
    },
    {
      id: 'energysage-atlanta',
      title: 'Atlanta, GA Solar Panel Cost: 2026 Prices and Savings',
      publisher: 'EnergySage',
      year: '2026',
      type: 'Market data',
      url: 'https://www.energysage.com/local-data/solar-panel-cost/ga/fulton-county/atlanta/',
      description:
        'Fulton County / Atlanta residential system-size and cost benchmarks. Cross-checked Look Ahead home and small-commercial capacity assumptions.',
    },
    {
      id: 'gsa-commercial',
      title: 'Commercial Solar Energy Systems in Georgia',
      publisher: 'Georgia Solar Authority',
      year: '2024',
      type: 'Industry guide',
      url: 'https://georgiasolarauthority.com/commercial-solar-energy-systems-in-georgia',
      description:
        'Defines small commercial (10–100 kW) vs large commercial ranges in Georgia. Informed Look Ahead office (~20 kW) and shop (~12 kW) illustrative rooftop sizes.',
    },
    {
      id: 'surgepv-schools',
      title: 'Solar Design for School 2026: K-12 Rooftop Guide',
      publisher: 'SurgePV',
      year: '2026',
      type: 'Industry guide',
      url: 'https://www.surgepv.com/blog/solar-design-for-school',
      description:
        'K-12 rooftop capacity guidance (often 200–500 kW for a full school). Scaled down to an illustrative ~40 kW Look Ahead school add so one drop does not overwhelm the county baseline viz.',
    },
    {
      id: 'georgia-power-rooftop',
      title: 'Commercial Rooftop Solar Installations',
      publisher: 'Georgia Power',
      year: '2024',
      type: 'Utility resource',
      url: 'https://www.georgiapower.com/business/products-programs/business-solutions/commercial-solar-solutions/commercial-rooftop-installations.html',
      description:
        'Georgia Power commercial rooftop program overview. Contextual reference for how behind-the-meter solar offsets utility purchases in Georgia.',
    },
    {
      id: 'epa-egrid',
      title: 'eGRID — Emissions & Generation Resource Integrated Database',
      publisher: 'U.S. Environmental Protection Agency',
      year: '2023',
      type: 'Federal dataset',
      url: 'https://www.epa.gov/egrid/download-data',
      description:
        'Source of the SRSO CO₂ emission factor (lb/MWh) used in the Savings workbook and reused for Look Ahead CO₂ saved = (kWh / 1000) × rate.',
    },
  ],
}

const TYPE_CLASS = {
  'Government dataset': 'ref-tag--dataset',
  'News report': 'ref-tag--news',
  'Interactive reference': 'ref-tag--interactive',
  'Interactive experience': 'ref-tag--experience',
  'Interactive experiment': 'ref-tag--experiment',
  'Three.js site': 'ref-tag--three',
  'Interactive timeline': 'ref-tag--timeline',
  Tutorial: 'ref-tag--tutorial',
  'Code library': 'ref-tag--code',
  'JavaScript library': 'ref-tag--lib',
  'Industry guide': 'ref-tag--guide',
  'Federal tool': 'ref-tag--federal',
  'Market report': 'ref-tag--market',
  'Market data': 'ref-tag--market',
  'Utility resource': 'ref-tag--utility',
  'Federal dataset': 'ref-tag--dataset',
}

const TOTAL =
  refs.primary.length +
  refs.visualization.length +
  refs.technical.length +
  refs.lookAhead.length

function Tag({ type }) {
  const typeClass = TYPE_CLASS[type] || 'ref-tag--default'
  return <span className={`ref-tag ${typeClass}`}>{type}</span>
}

function RefCard({ item: r }) {
  const [copied, setCopied] = useState(false)

  function copyUrl() {
    navigator.clipboard.writeText(r.url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }

  return (
    <article className={`ref-card${r.featured ? ' ref-card--featured' : ''}`}>
      {r.featured && <div className="ref-card-badge">Primary reference</div>}

      <div className="ref-card-top">
        <Tag type={r.type} />
        <h3 className="ref-card-title">{r.title}</h3>
        <p className="ref-card-meta">
          {r.publisher} · {r.year}
        </p>
      </div>

      <p className="ref-card-description">{r.description}</p>

      <div className="ref-card-actions">
        <a
          className="ref-card-url"
          href={r.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          {r.url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
        </a>
        <div className="ref-card-buttons">
          <button type="button" className="ref-card-btn" onClick={copyUrl}>
            {copied ? 'Copied' : 'Copy URL'}
          </button>
          <a
            className="ref-card-btn"
            href={r.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Visit ↗
          </a>
        </div>
      </div>
    </article>
  )
}

function Section({ label, count, children }) {
  return (
    <section className="ref-section">
      <div className="ref-section-header">
        <h2 className="ref-section-label">{label}</h2>
        <span className="ref-section-count">{count} sources</span>
      </div>
      <div className="ref-grid">{children}</div>
    </section>
  )
}

export default function ReferencePage() {
  return (
    <div className="reference-page">
      <header className="reference-page-header">
        <h1 id="research-title" className="content-page-title">
          References
        </h1>
        <p className="content-page-text reference-page-intro">
          Source data, design precedents, technical libraries, and Look Ahead methodology sources
          used in the development of this solar data visualization. {TOTAL} total references across
          four categories.
        </p>
      </header>

      <Section label="Primary data sources" count={refs.primary.length}>
        {refs.primary.map((r) => (
          <RefCard key={r.id} item={r} />
        ))}
      </Section>

      <Section label="Look Ahead building estimates" count={refs.lookAhead.length}>
        {refs.lookAhead.map((r) => (
          <RefCard key={r.id} item={r} />
        ))}
      </Section>

      <Section label="Data visualization precedents" count={refs.visualization.length}>
        {refs.visualization.map((r) => (
          <RefCard key={r.id} item={r} />
        ))}
      </Section>

      <Section label="Technical libraries" count={refs.technical.length}>
        {refs.technical.map((r) => (
          <RefCard key={r.id} item={r} />
        ))}
      </Section>

      <footer className="reference-page-footer">
        <p>
          Compiled for the Public Art Futures Lab by internship and arts residency in collaboration
          with Partnership for Inclusive Innovation and the Fulton County Sustainability Division
        </p>
      </footer>
    </div>
  )
}
