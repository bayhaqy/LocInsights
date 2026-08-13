/**
 * LocInsights — Role-Based Access Control (RBAC) definitions.
 *
 * 4 built-in roles:
 *   - superadmin: full access including Users Management
 *   - admin:      all features EXCEPT Users Management
 *   - data:       full CRUD on Reports, Data Manager, Data Scraper; read on others
 *   - viewer:     read-only, NO export anywhere
 *
 * Permissions are stored per role as a JSON object:
 *   { menu_id: { read, create, update, delete, export } }
 *
 * The Defaults below are seeded into the `roles` table and can be edited
 * from the Users Management → Roles tab. They are also used as the in-memory
 * fallback when the DB query fails (so the app still works during DB issues).
 */

export type RoleId = 'superadmin' | 'admin' | 'data' | 'analyst' | 'viewer'

export type MenuId =
  | 'dashboard'
  | 'map'
  | 'opportunities'
  | 'analysis'
  | 'brands'
  | 'malls'
  | 'competitors'
  | 'ab'
  | 'ml'
  | 'mall_tenants'
  | 'reports'
  | 'data'
  | 'scraper'
  | 'methodology'
  | 'about'
  | 'settings'
  | 'users' // Users Management — only superadmin by default

export interface MenuPermission {
  read: boolean
  create: boolean
  update: boolean
  delete: boolean
  export: boolean
}

export type Permissions = Record<string, MenuPermission>

/** List of menus that can have CRUD permissions. */
export const MENU_LIST: { id: MenuId; label: string; description: string }[] = [
  { id: 'dashboard',    label: 'Dashboard',        description: 'KPI overview + top opportunities' },
  { id: 'map',          label: 'Map Explorer',     description: 'Interactive choropleth + layers' },
  { id: 'opportunities',label: 'Opportunities',    description: 'Ranked expansion sites' },
  { id: 'analysis',     label: 'Deep Analysis',    description: 'Per-kelurahan detail + ML projection' },
  { id: 'brands',       label: 'Brand Coverage',   description: 'MAP/MAA portfolio distribution' },
  { id: 'malls',        label: 'Mall Network',     description: 'Mall directory + tenants' },
  { id: 'competitors',  label: 'Competitor Intel', description: '887+ competitor outlets' },
  { id: 'ab',           label: 'A/B Simulator',    description: 'Tune scoring weights live' },
  { id: 'ml',           label: 'ML / AI Engine',   description: 'GBR revenue predictor + training' },
  { id: 'mall_tenants', label: 'Mall Tenants',     description: 'Live tenant audit per mall' },
  { id: 'reports',      label: 'Reports',          description: 'Executive + site + brand reports' },
  { id: 'data',         label: 'Data Manager',     description: 'Full CRUD for all 10 entities' },
  { id: 'scraper',      label: 'Data Scraper',     description: 'OSM scraper + brand classifier' },
  { id: 'methodology',  label: 'Methodology',      description: 'Composite score + Huff + GBR' },
  { id: 'about',        label: 'About',            description: 'Platform info + data sources' },
  { id: 'settings',     label: 'Settings',         description: 'AI + general app settings' },
  { id: 'users',        label: 'Users Management', description: 'Manage users & role permissions' },
]

const FULL: MenuPermission = { read: true, create: true, update: true, delete: true, export: true }
const READ_ONLY: MenuPermission = { read: true, create: false, update: false, delete: false, export: false }
const READ_EXPORT: MenuPermission = { read: true, create: false, update: false, delete: false, export: true }
const NONE: MenuPermission = { read: false, create: false, update: false, delete: false, export: false }

/**
 * Default permission matrix per role.
 * The superadmin can override any of these in the Roles tab.
 */
export const DEFAULT_PERMISSIONS: Record<RoleId, Permissions> = {
  // superadmin: full CRUD+export on everything, plus Users Management
  superadmin: Object.fromEntries(MENU_LIST.map(m => [m.id, { ...FULL }])) as Permissions,

  // admin: full CRUD+export on everything EXCEPT Users Management (no read)
  admin: Object.fromEntries(
    MENU_LIST.map(m => [m.id, m.id === 'users' ? { ...NONE } : { ...FULL }])
  ) as Permissions,

  // data: full CRUD+export ONLY on reports, data, scraper.
  //       Read-only (no export) on dashboards/maps/analysis/etc.
  //       No access to users management.
  data: Object.fromEntries(
    MENU_LIST.map(m => {
      if (m.id === 'users') return [m.id, { ...NONE }]
      if (m.id === 'reports' || m.id === 'data' || m.id === 'scraper') return [m.id, { ...FULL }]
      return [m.id, { ...READ_ONLY }]
    })
  ) as Permissions,

  // analyst: read + run ML/AI forecasts (no master data mutations, no users mgmt)
  // Kept for backwards compat with existing seeded users.
  analyst: Object.fromEntries(
    MENU_LIST.map(m => {
      if (m.id === 'users') return [m.id, { ...NONE }]
      if (m.id === 'ml' || m.id === 'ab' || m.id === 'analysis') return [m.id, { ...READ_EXPORT }]
      return [m.id, { ...READ_ONLY }]
    })
  ) as Permissions,

  // viewer: read-only everywhere, NO export, NO users management
  viewer: Object.fromEntries(
    MENU_LIST.map(m => [m.id, m.id === 'users' ? { ...NONE } : { ...READ_ONLY }])
  ) as Permissions,
}

/** Get permissions for a role, falling back to defaults if DB lookup fails. */
export function getDefaultPermissions(role: RoleId): Permissions {
  return DEFAULT_PERMISSIONS[role] || DEFAULT_PERMISSIONS.viewer
}

/** Check a specific permission for a role. */
export function hasPermission(
  perms: Permissions | null | undefined,
  menu: MenuId,
  action: keyof MenuPermission,
): boolean {
  if (!perms) return false
  const p = perms[menu]
  if (!p) return false
  return Boolean(p[action])
}

/** Get the list of menus a role can read (i.e. see in the sidebar). */
export function getReadableMenus(perms: Permissions | null | undefined): MenuId[] {
  if (!perms) return []
  return MENU_LIST.filter(m => perms[m.id]?.read).map(m => m.id)
}

export const ROLE_DESCRIPTIONS: Record<RoleId, string> = {
  superadmin: 'Full system access including user & role management',
  admin:      'All features except Users Management',
  data:       'Full CRUD on Reports, Data Manager & Scraper only',
  analyst:    'Read + run ML/AI forecasts (no master data mutations)',
  viewer:     'Read-only access, no exports',
}
