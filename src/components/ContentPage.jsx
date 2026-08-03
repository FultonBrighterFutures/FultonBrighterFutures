import './ContentPage.css'
import BackButton from './BackButton'
import ReferencePage from './ReferencePage'
import BuildingCollage from '../../DesignAssets/BuildingCollage.png'
import StaticBuildingIcon from './building/StaticBuildingIcon'
import thaisHeadshot from '../../DesignAssets/TeamHeadshots/Thais.png'
import dkHeadshot from '../../DesignAssets/TeamHeadshots/DK.png'
import kathleenHeadshot from '../../DesignAssets/TeamHeadshots/Kathleen.png'
import teamImage1 from '../../DesignAssets/TeamImages/DKT1.jpg'
import teamImage2 from '../../DesignAssets/TeamImages/DKT2.jpg'
import teamImage3 from '../../DesignAssets/TeamImages/DKT3.jpg'

const CONTENT = {
  'artist-statement': {
    title: 'Overview',
    body: [
      'Fulton Brighter Futures is an interactive data visualization representing solar panel adoption across Fulton County Government buildings since 2021. Each solar-equipped building appears as a glowing orb relative to its size; together the orbs cluster into the county\'s shape. A timeline lets viewers watch adoption grow year by year, alongside energy generated, CO2 reduced, and money saved.', 
      'The project exists online and as a temporary, interactive, digital installation at the Fulton County Government Center. This project explores the relationship between energy, carbon, and conservation through an interactive visual timeline.',
      'Use the main site to move through years 2021–2026, then look ahead to imagine what comes next.',
    ],
  },
  team: {
    titleBold: 'The People',
    titleThin: 'behind the visualization',
    intro: 'This project was shaped by a close collaboration between design, technology, and public-facing storytelling. Together, we translated Fulton County\'s sustainability data into an interactive experience that is both informative and visually memorable, helping residents, visitors, and decision-makers engage with the story of solar growth in a more human way.',
    members: [
      {
        name: 'Thaís Alvarenga',
        title: 'Design Engineer',
        description: 'Led the technical build of the interactive visualization, architecting the site in Three.js, React, and Vite. Responsible for turning raw County datasets into a functioning, real-time visual system — from data processing to the 3D rendering of each building\'s orb.',
        image: thaisHeadshot,
        linkedin: 'https://www.linkedin.com/in/thais-alvarenga-medina/',
        email: 'thais@gatech.edu',
        instagram: 'https://www.instagram.com/latinxr.hn/',
      },
      {
        name: 'Daksh Kapoor (DK)',
        title: 'Design Engineer',
        description: 'Directed the visual language and user experience of the project, from the color system and orb-based data encoding to the building design. Shaped how energy, emissions, and savings data translated into an intuitive, emotionally resonant visual story.',
        image: dkHeadshot,
        linkedin: 'https://www.linkedin.com/in/daksh-kapoor30/',
        email: 'dkreates.design@gmail.com',
        instagram: 'https://www.instagram.com/dkreates_/',
      },
      {
        name: 'Kathleen Brown',
        title: 'Project Manager',
        description: 'Oversaw the project from concept to delivery, coordinating between the design and development teams, Fulton County\'s DREAM Sustainability Division, and the Public Art Futures Lab.',
        image: kathleenHeadshot,
        linkedin: 'https://www.linkedin.com/in/kathleenbloom11/',
        email: 'Kathleen.Brown@fultoncountyga.gov',
        instagram: 'https://www.instagram.com/fultonpublicart/',
      },
    ],
  },
}

export default function ContentPage({ view, onBack }) {
  const isReferences = view === 'research'
  const page = CONTENT[view]

  if (!isReferences && !page) return null

  return (
    <section
      className="content-page"
      id={view}
      aria-labelledby={isReferences ? 'research-title' : `${view}-title`}
    >
      <div className="content-page-layout">
        <aside className="content-page-aside" aria-label="Page actions">
          <BackButton onClick={onBack} />
        </aside>

        <div className="content-page-inner">
          {isReferences ? (
            <ReferencePage />
          ) : view === 'team' ? (
            <>
              <h1 id={`${view}-title`} className="content-page-title">
                <span className="team-title-bold">{page.titleBold}</span>{' '}
                <span className="team-title-thin">{page.titleThin}</span>
              </h1>
              <p className="team-intro">{page.intro}</p>
              <div className="team-members-grid">
                {page.members.map((member) => (
                  <div key={member.name} className="team-member-card">
                    <div className="team-member-image-frame">
                      <img
                        src={member.image}
                        alt={member.name}
                        className="team-member-image"
                      />
                    </div>
                    <div className="team-member-info">
                      <h2 className="team-member-name">{member.name}</h2>
                      <p className="team-member-title">{member.title}</p>
                      <p className="team-member-description">{member.description}</p>
                    </div>
                    <div className="team-member-connect">
                      <span className="connect-label">Connect</span>
                      <div className="connect-icons">
                        <a
                          className="connect-icon"
                          href={member.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`${member.name} on LinkedIn`}
                        >
                          <svg viewBox="0 0 24 24"><path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.03-1.85-3.03-1.85 0-2.14 1.45-2.14 2.94v5.66H9.36V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45z"/></svg>
                        </a>
                        <a
                          className="connect-icon"
                          href={`mailto:${member.email}`}
                          aria-label={`Email ${member.name}`}
                        >
                          <svg viewBox="0 0 24 24"><path d="M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm17 3.24-7.36 5.6a1 1 0 0 1-1.22 0L4 8.24V17h16V8.24zM4.5 6l7.5 5.7L19.5 6h-15z"/></svg>
                        </a>
                        <a
                          className="connect-icon"
                          href={member.instagram}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`${member.name} on Instagram`}
                        >
                          <svg viewBox="0 0 24 24"><path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.24 2.23.41.56.21.96.47 1.38.89.42.42.68.82.89 1.38.17.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.24 1.8-.41 2.23-.21.56-.47.96-.89 1.38-.42.42-.82.68-1.38.89-.42.17-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.24-2.23-.41a3.72 3.72 0 0 1-1.38-.89 3.72 3.72 0 0 1-.89-1.38c-.17-.42-.36-1.06-.41-2.23-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85c.05-1.17.24-1.8.41-2.23.21-.56.47-.96.89-1.38.42-.42.82-.68 1.38-.89.42-.17 1.06-.36 2.23-.41 1.27-.06 1.65-.07 4.85-.07zM12 0C8.74 0 8.33.01 7.05.07c-1.28.06-2.15.26-2.91.56a5.9 5.9 0 0 0-2.13 1.39A5.9 5.9 0 0 0 .62 4.15c-.3.76-.5 1.63-.56 2.9C0 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.28.26 2.15.56 2.91.31.79.72 1.46 1.39 2.13.67.67 1.34 1.08 2.13 1.39.76.3 1.63.5 2.9.56C8.33 24 8.74 24 12 24s3.67-.01 4.95-.07c1.28-.06 2.15-.26 2.91-.56a5.9 5.9 0 0 0 2.13-1.39 5.9 5.9 0 0 0 1.39-2.13c.3-.76.5-1.63.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.28-.26-2.15-.56-2.91a5.9 5.9 0 0 0-1.39-2.13A5.9 5.9 0 0 0 19.86.63c-.76-.3-1.63-.5-2.91-.56C15.67.01 15.26 0 12 0zm0 5.84A6.16 6.16 0 1 0 12 18.16 6.16 6.16 0 0 0 12 5.84zm0 10.16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm7.85-10.4a1.44 1.44 0 1 1-2.88 0 1.44 1.44 0 0 1 2.88 0z"/></svg>
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <h1 id={`${view}-title`} className="content-page-title">
                {page.title}
              </h1>
              {page.body.map((paragraph) => (
                <p key={paragraph} className="content-page-text">
                  {paragraph}
                </p>
              ))}
              <div className="content-page-visual">
                <StaticBuildingIcon className="content-page-building-visual" theme="energy" />
                <img
                  src={BuildingCollage}
                  alt="Collage of the building visualization"
                  className="content-page-image"
                />
              </div>
              <p className="content-page-caption">
                Fulton County Buildings with solar panels installed.
              </p>
              <h2 className="content-page-title">Artist statement</h2>
              <p className="content-page-text">
                Thaís and DK are new media artists and recent graduates from the Georgia Institute 
                of Technology. They became part of Fulton County as Summer interns and resident 
                artists to bring this project to fruition. Their vision for this project is to 
                ultimately raise awareness among the general public regarding the beneficial use 
                of solar energy. As Atlanta residents themselves, they felt it important to inform 
                the county residents of the efforts being made towards renewable energy, especially 
                at a time when energy is constantly being drawn to power data centers. 

              </p>
              <p className="content-page-text">
                They have observed people visit public areas such as parks and libraries, and their hope is 
                that by placing this work in such a high-traffic public space, they can draw the attention 
                those people, even slightly, toward the work being done by Fulton County on solar 
                energy. In addition to informing people, they also want viewers to take something home with 
                them: a sense of accomplishment, and the understanding that their efforts can and will 
                lead to meaningful change for their community. 
              </p>
              <p className="content-page-text">
                The final project sits at the intersection of art and technology, adapting foundational 
                concepts of design to deliver an interactive installation. Viewers can come interact with 
                it, play with it, view it, and most importantly, learn something about their community's 
                efforts from it.
              </p>
              <div className="content-page-image-row">
                <img src={teamImage1} alt="Thais and DK in the field" className="content-page-inline-image" />
                <img src={teamImage2} alt="Thais and DK in the field" className="content-page-inline-image" />
                <img src={teamImage3} alt="Thais and DK in the field" className="content-page-inline-image" />
              </div>
              <p className="content-page-caption">
                {/* Thais &amp; DK in the field. */}
              </p>
            </>
          )}
        </div>
      </div>
    </section>
  )
}