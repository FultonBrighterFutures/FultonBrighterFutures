/**
 * Shared map-building drag physics: home spring, pairwise collisions,
 * and slingshot launch on release (opposite the pull, proportional to distance).
 */

export const MAX_DRAG_DISTANCE = 1.15

// Pulls free buildings back toward their map slot. Slightly soft so a launch
// can travel and bounce before settling.
export const HOME_SPRING_STRENGTH = 9

export const COLLISION_STRENGTH = 110
export const VELOCITY_DAMPING_PER_SECOND = 2.4
export const MAX_PHYSICS_SPEED = 16
export const COLLISION_RADIUS = 0.6

/** World-units of drag → launch speed multiplier (further pull = faster fling). */
export const LAUNCH_SPEED_PER_UNIT = 12.6
export const MAX_LAUNCH_SPEED = 14.4
/** Ignore tiny releases so a click doesn't fling. */
export const MIN_LAUNCH_DISTANCE = 0.04

/**
 * Velocity imparted on pointer-up — slingshot opposite the drag direction,
 * scaled by how far the building was pulled.
 */
export function computeLaunchVelocity(offsetX, offsetZ) {
  const distance = Math.hypot(offsetX, offsetZ)
  if (distance < MIN_LAUNCH_DISTANCE) {
    return { velX: 0, velZ: 0 }
  }

  const speed = Math.min(distance * LAUNCH_SPEED_PER_UNIT, MAX_LAUNCH_SPEED)
  // Negate: pull out → fling back through home (opposite the drag).
  return {
    velX: -(offsetX / distance) * speed,
    velZ: -(offsetZ / distance) * speed,
  }
}

/**
 * Apply launch momentum to a building from its current offset away from home.
 */
export function applyDragReleaseLaunch(entry) {
  if (!entry) return

  entry.physX = entry.building.group.position.x
  entry.physZ = entry.building.group.position.z

  const offsetX = entry.physX - entry.homeX
  const offsetZ = entry.physZ - entry.homeZ
  const { velX, velZ } = computeLaunchVelocity(offsetX, offsetZ)

  entry.velX = velX
  entry.velZ = velZ
}

/** Hold this long on a list card to match a max-distance map drag. */
export const HOLD_SECONDS_FOR_MAX_PULL = 1.25

/**
 * Simulate a drag-pull + release using hold duration as pull distance.
 * Direction is a stable hash of the building id so repeats feel consistent.
 */
export function applyHoldDurationLaunch(entry, holdSeconds) {
  if (!entry) return

  const clampedHold = Math.max(0, Number(holdSeconds) || 0)
  const t = Math.min(clampedHold / HOLD_SECONDS_FOR_MAX_PULL, 1)
  const distance = t * MAX_DRAG_DISTANCE
  if (distance < MIN_LAUNCH_DISTANCE) return

  const seed = String(entry.id ?? '')
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  }
  const angle = (hash % 360) * (Math.PI / 180)

  const offsetX = Math.cos(angle) * distance
  const offsetZ = Math.sin(angle) * distance
  const y = entry.building.group.position.y

  entry.physX = entry.homeX + offsetX
  entry.physZ = entry.homeZ + offsetZ
  entry.building.setPosition(entry.physX, y, entry.physZ)
  entry.building.targetX = entry.physX
  entry.building.targetZ = entry.physZ

  applyDragReleaseLaunch(entry)
}

/**
 * One physics tick for visible map buildings.
 * Dragged building stays kinematic (pointer-driven); others spring home + collide.
 */
export function stepMapBuildingPhysics({ entries, draggedId, dt, getCollisionRadius }) {
  if (dt <= 0 || entries.length === 0) return

  entries.forEach((entry) => {
    if (entry.id === draggedId) {
      entry.physX = entry.building.group.position.x
      entry.physZ = entry.building.group.position.z
      // Hold velocity at zero while gripped so release uses fresh launch only.
      entry.velX = 0
      entry.velZ = 0
      return
    }

    entry.velX += (entry.homeX - entry.physX) * HOME_SPRING_STRENGTH * dt
    entry.velZ += (entry.homeZ - entry.physZ) * HOME_SPRING_STRENGTH * dt
  })

  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const a = entries[i]
      const b = entries[j]

      const dx = a.physX - b.physX
      const dz = a.physZ - b.physZ
      const dist = Math.hypot(dx, dz)
      const minDist = getCollisionRadius(a) + getCollisionRadius(b)

      if (dist === 0 || dist >= minDist) continue

      const overlap = minDist - dist
      const nx = dx / dist
      const nz = dz / dist
      const push = overlap * COLLISION_STRENGTH * dt

      if (a.id !== draggedId) {
        a.velX += nx * push
        a.velZ += nz * push
      }
      if (b.id !== draggedId) {
        b.velX -= nx * push
        b.velZ -= nz * push
      }
    }
  }

  const dampFactor = Math.exp(-VELOCITY_DAMPING_PER_SECOND * dt)

  entries.forEach((entry) => {
    if (entry.id === draggedId) return

    entry.velX *= dampFactor
    entry.velZ *= dampFactor

    const speed = Math.hypot(entry.velX, entry.velZ)
    if (speed > MAX_PHYSICS_SPEED) {
      const clampRatio = MAX_PHYSICS_SPEED / speed
      entry.velX *= clampRatio
      entry.velZ *= clampRatio
    }

    entry.physX += entry.velX * dt
    entry.physZ += entry.velZ * dt

    entry.building.targetX = entry.physX
    entry.building.targetZ = entry.physZ
    entry.building.setPosition(entry.physX, entry.building.group.position.y, entry.physZ)
  })
}
