const SURNAMES = [
  'VALE', 'MORROW', 'KANE', 'SANTOS', 'OKAFOR', 'RIVERA', 'LINDQVIST', 'TANAKA', 'DUBOIS', 'KOVAC',
  'MENDES', 'ALVAREZ', 'NWOSU', 'PETROV', 'HADDAD', 'BRANDT', 'COSTA', 'FERRAN', 'MASON', 'DIALLO',
  'REYES', 'SILVA', 'VOLKOV', 'ADEYEMI', 'MARCHETTI', 'HOLM', 'BAKER', 'QUINN', 'ALI', 'GARCIA',
  'MULLER', 'ROSSI', 'NAKAMURA', 'OSEI', 'LARSEN', 'MORENO', 'KHAN', 'DUARTE', 'FRASER', 'ERICSSON'
]
const INITIALS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'R', 'S', 'T', 'V']
const NATIONS = ['ENG', 'BRA', 'ESP', 'NGA', 'FRA', 'GER', 'POR', 'ARG', 'JPN', 'NED', 'ITA', 'GHA', 'USA', 'MEX', 'SWE']

export const TEAMS = [
  {
    id: 'northside',
    name: 'NORTHSIDE',
    suffix: 'FC',
    short: 'NTH',
    city: 'NORTHSIDE',
    stadium: 'THE YARD',
    rating: 85,
    formation: '433',
    primary: '#d8ff3e',
    secondary: '#0b1410',
    shorts: '#0b1410',
    socks: '#d8ff3e',
    accent: '#eaff9a',
    star: 'J. VALE',
    motto: 'NO FEAR IN THE NORTH',
    style: 'HIGH PRESS'
  },
  {
    id: 'rivera',
    name: 'RIVERA',
    suffix: 'UNITED',
    short: 'RIV',
    city: 'PUERTO RIVERA',
    stadium: 'RIVERA PARK',
    rating: 83,
    formation: '433',
    primary: '#42d7f5',
    secondary: '#f4f8fa',
    shorts: '#0d2233',
    socks: '#42d7f5',
    accent: '#dcfbff',
    star: 'M. SANTOS',
    motto: 'PLAY WITH THE TIDE',
    style: 'TIKI-TAKA'
  },
  {
    id: 'kingsley',
    name: 'KINGSLEY',
    suffix: 'CITY',
    short: 'KGC',
    city: 'KINGSLEY',
    stadium: 'CROWN GROUND',
    rating: 87,
    formation: '433',
    primary: '#2b5cff',
    secondary: '#ffd45e',
    shorts: '#12225c',
    socks: '#2b5cff',
    accent: '#ffd45e',
    star: 'A. OKAFOR',
    motto: 'BORN TO REIGN',
    style: 'CONTROL'
  },
  {
    id: 'atlas',
    name: 'ATLAS',
    suffix: 'SC',
    short: 'ATL',
    city: 'ATLAS HEIGHTS',
    stadium: 'ATLAS FIELD',
    rating: 84,
    formation: '442',
    primary: '#f24343',
    secondary: '#f6efe2',
    shorts: '#f6efe2',
    socks: '#f24343',
    accent: '#ffd2c9',
    star: 'L. FERRAN',
    motto: 'CARRY THE WEIGHT',
    style: 'DIRECT'
  },
  {
    id: 'porto',
    name: 'PORTO',
    suffix: 'NOVO',
    short: 'PNV',
    city: 'PORTO NOVO',
    stadium: 'ESTADIO NOVO',
    rating: 82,
    formation: '433',
    primary: '#18d6a4',
    secondary: '#ffe14a',
    shorts: '#083b33',
    socks: '#18d6a4',
    accent: '#ffe14a',
    star: 'R. MENDES',
    motto: 'THE NEW WAVE',
    style: 'COUNTER'
  },
  {
    id: 'ironwolves',
    name: 'IRONWOLVES',
    suffix: '',
    short: 'IRW',
    city: 'THE FORGE',
    stadium: 'THE FORGE',
    rating: 81,
    formation: '352',
    primary: '#ff7a2f',
    secondary: '#20242a',
    shorts: '#20242a',
    socks: '#ff7a2f',
    accent: '#ffc69b',
    star: 'K. BRANDT',
    motto: 'FORGED IN THE DARK',
    style: 'LOW BLOCK'
  }
]

export const FORMATIONS = {
  '433': {
    id: '433',
    name: '4-3-3',
    label: 'ATTACK',
    slots: [
      { role: 'GK', x: 0, z: -0.95 },
      { role: 'LB', x: -0.76, z: -0.52 },
      { role: 'CB', x: -0.28, z: -0.64 },
      { role: 'CB', x: 0.28, z: -0.64 },
      { role: 'RB', x: 0.76, z: -0.52 },
      { role: 'DM', x: 0, z: -0.2 },
      { role: 'CM', x: -0.48, z: -0.02 },
      { role: 'CM', x: 0.48, z: -0.02 },
      { role: 'LW', x: -0.7, z: 0.4 },
      { role: 'ST', x: 0, z: 0.48 },
      { role: 'RW', x: 0.7, z: 0.4 }
    ]
  },
  '442': {
    id: '442',
    name: '4-4-2',
    label: 'BALANCED',
    slots: [
      { role: 'GK', x: 0, z: -0.95 },
      { role: 'LB', x: -0.76, z: -0.52 },
      { role: 'CB', x: -0.28, z: -0.64 },
      { role: 'CB', x: 0.28, z: -0.64 },
      { role: 'RB', x: 0.76, z: -0.52 },
      { role: 'LM', x: -0.7, z: 0.04 },
      { role: 'CM', x: -0.22, z: -0.1 },
      { role: 'CM', x: 0.22, z: -0.1 },
      { role: 'RM', x: 0.7, z: 0.04 },
      { role: 'ST', x: -0.22, z: 0.44 },
      { role: 'ST', x: 0.22, z: 0.44 }
    ]
  },
  '352': {
    id: '352',
    name: '3-5-2',
    label: 'CONTROL',
    slots: [
      { role: 'GK', x: 0, z: -0.95 },
      { role: 'CB', x: -0.42, z: -0.66 },
      { role: 'CB', x: 0, z: -0.72 },
      { role: 'CB', x: 0.42, z: -0.66 },
      { role: 'LWB', x: -0.8, z: -0.08 },
      { role: 'CM', x: -0.3, z: -0.12 },
      { role: 'DM', x: 0, z: -0.24 },
      { role: 'CM', x: 0.3, z: -0.12 },
      { role: 'RWB', x: 0.8, z: -0.08 },
      { role: 'ST', x: -0.24, z: 0.46 },
      { role: 'ST', x: 0.24, z: 0.46 }
    ]
  }
}

export const DIFFICULTIES = {
  amateur: { id: 'amateur', name: 'AMATEUR', speed: 0.86, reaction: 0.7, accuracy: 0.62, label: 'CASUAL' },
  pro: { id: 'pro', name: 'PRO', speed: 1, reaction: 1, accuracy: 0.8, label: 'STANDARD' },
  legend: { id: 'legend', name: 'LEGEND', speed: 1.1, reaction: 1.25, accuracy: 0.92, label: 'HARDCORE' }
}

function hashString(text) {
  let hash = 2166136261
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function mulberry32(seed) {
  let value = seed >>> 0
  return () => {
    value += 0x6d2b79f5
    let next = value
    next = Math.imul(next ^ (next >>> 15), next | 1)
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61)
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296
  }
}

const ROLE_PROFILE = {
  GK: { pace: 54, shooting: 24, passing: 58, defending: 78, physical: 72, offset: 0 },
  LB: { pace: 78, shooting: 48, passing: 70, defending: 74, physical: 70, offset: -2 },
  RB: { pace: 78, shooting: 48, passing: 70, defending: 74, physical: 70, offset: -2 },
  CB: { pace: 64, shooting: 38, passing: 62, defending: 84, physical: 82, offset: -1 },
  LWB: { pace: 82, shooting: 52, passing: 72, defending: 70, physical: 68, offset: -1 },
  RWB: { pace: 82, shooting: 52, passing: 72, defending: 70, physical: 68, offset: -1 },
  DM: { pace: 68, shooting: 58, passing: 76, defending: 80, physical: 76, offset: 1 },
  CM: { pace: 72, shooting: 68, passing: 82, defending: 68, physical: 70, offset: 2 },
  LM: { pace: 80, shooting: 66, passing: 76, defending: 54, physical: 62, offset: 1 },
  RM: { pace: 80, shooting: 66, passing: 76, defending: 54, physical: 62, offset: 1 },
  LW: { pace: 88, shooting: 78, passing: 74, defending: 42, physical: 60, offset: 3 },
  RW: { pace: 88, shooting: 78, passing: 74, defending: 42, physical: 60, offset: 3 },
  ST: { pace: 84, shooting: 86, passing: 66, defending: 38, physical: 76, offset: 4 }
}

export function getTeam(id) {
  return TEAMS.find((team) => team.id === id) || TEAMS[0]
}

export function makeSquad(team, formationId = team.formation) {
  const formation = FORMATIONS[formationId] || FORMATIONS[team.formation] || FORMATIONS['433']
  const random = mulberry32(hashString(`${team.id}:${formation.id}`))
  let starIndex = formation.slots.findIndex((slot) => slot.role === 'ST')
  if (starIndex < 0) starIndex = formation.slots.length - 2

  return formation.slots.map((slot, index) => {
    const profile = ROLE_PROFILE[slot.role] || ROLE_PROFILE.CM
    const isStar = index === starIndex
    const rating = Math.max(
      58,
      Math.min(94, Math.round(team.rating + profile.offset + (isStar ? 6 : (random() - 0.5) * 7)))
    )
    const name = isStar
      ? team.star
      : `${INITIALS[Math.floor(random() * INITIALS.length)]}. ${SURNAMES[Math.floor(random() * SURNAMES.length)]}`
    const nation = NATIONS[Math.floor(random() * NATIONS.length)]
    const number = slot.role === 'GK' ? 1 : index + 1
    return {
      id: `${team.id}-${index}`,
      teamId: team.id,
      name,
      firstName: name.split('. ')[0],
      surname: name.split('. ')[1] || name,
      number,
      role: slot.role,
      slot,
      rating,
      pace: Math.min(96, profile.pace + Math.round((rating - team.rating) * 0.8)),
      shooting: Math.min(96, profile.shooting + Math.round((rating - team.rating) * 0.8)),
      passing: Math.min(96, profile.passing + Math.round((rating - team.rating) * 0.8)),
      defending: Math.min(96, profile.defending + Math.round((rating - team.rating) * 0.8)),
      physical: Math.min(96, profile.physical + Math.round((rating - team.rating) * 0.8)),
      nation,
      isGK: slot.role === 'GK',
      isStar
    }
  })
}

export function squadRating(squad) {
  const outfield = squad.filter((player) => !player.isGK)
  return Math.round(outfield.reduce((total, player) => total + player.rating, 0) / Math.max(1, outfield.length))
}

export function crestSVG(team) {
  const stars = Array.from({ length: team.rating >= 86 ? 3 : team.rating >= 83 ? 2 : 1 }, (_, index) => {
    const x = 60 + (index - (team.rating >= 86 ? 1 : 0.5)) * 13
    return `<path d="M${x} 25l2.1 4.6 5 .5-3.8 3.4 1.1 4.9-4.4-2.5-4.4 2.5 1.1-4.9-3.8-3.4 5-.5z" fill="${team.accent}" opacity=".92"/>`
  }).join('')
  return `<svg viewBox="0 0 120 132" role="img" aria-label="${team.name} crest">
    <path d="M60 3 113 19v52c0 31-23 50-53 60C30 121 7 102 7 71V19z" fill="${team.secondary}"/>
    <path d="M60 8 108 22v48c0 28-20 45-48 55C32 115 12 98 12 70V22z" fill="${team.primary}"/>
    <path d="M60 15 100 26v43c0 24-16 39-40 48-24-9-40-24-40-48V26z" fill="${team.secondary}" opacity=".9"/>
    <path d="M60 21 94 30v38c0 21-13 35-34 43-21-8-34-22-34-43V30z" fill="${team.primary}" opacity=".18"/>
    <path d="M20 58h80" stroke="${team.accent}" stroke-width="2" opacity=".5"/>
    <text x="60" y="78" text-anchor="middle" font-family="Arial Black, Arial" font-size="27" font-weight="900" fill="${team.accent}">${team.short}</text>
    <text x="60" y="94" text-anchor="middle" font-family="Arial" font-size="7" letter-spacing="2" fill="#ffffff" opacity=".72">${team.city}</text>
    ${stars}
  </svg>`
}
