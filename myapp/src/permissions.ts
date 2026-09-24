/**
 * permissions.ts — Role-based access control for DjoHealth
 *
 * Roles
 * ─────
 *   administrator  One account. Full access — manages staff, settings, and all clinical pages.
 *
 *   doctor         Added by the administrator. Clinical access:
 *                  dashboard, patients, consultations, rendez-vous, messages, AI diagnostics, settings.
 *
 *   staff          Added by the administrator. Operational access:
 *                  dashboard, messages, consultations, settings.
 *                  Cannot access patient records, rendez-vous, AI diagnostics, or staff management.
 *
 * Usage
 * ─────
 *   import { canAccess, filterNav } from '../permissions'
 *
 *   canAccess('doctor', '/patients')       // → true
 *   canAccess('staff',  '/patients')       // → false
 *   canAccess('staff',  '/settings')       // → true
 *   canAccess('administrator', '/staff')   // → true
 *   filterNav('doctor', navItems)          // → navItems filtered to doctor-allowed pages
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type Role = 'administrator' | 'doctor' | 'staff'

export interface PagePermission {
  /** Route path — must match the path used in <Route> */
  path: string
  /** Human-readable page name */
  label: string
  /** If true, ONLY the administrator role may access this page */
  adminOnly: boolean
  /** Full list of roles that may access this page */
  allowedRoles: Role[]
}

// ─── Page permission definitions ──────────────────────────────────────────────

export const PAGE_PERMISSIONS: PagePermission[] = [
  {
    // All authenticated roles see the dashboard
    path: '/dashboard',
    label: 'Tableau de bord',
    adminOnly: false,
    allowedRoles: ['administrator', 'doctor', 'staff'],
  },
  {
    // All roles can send/receive messages
    path: '/messages',
    label: 'Messages',
    adminOnly: false,
    allowedRoles: ['administrator', 'doctor', 'staff'],
  },
  {
    // Rendez-vous comes from AI diagnostics — clinical workflow, doctors + admin only
    path: '/rendez-vous',
    label: 'Rendez-vous',
    adminOnly: false,
    allowedRoles: ['administrator', 'doctor'],
  },
  {
    // Consultations: staff can assist but not manage clinical records independently
    path: '/consultations',
    label: 'Consultations',
    adminOnly: false,
    allowedRoles: ['administrator', 'doctor', 'staff'],
  },
  {
    // Patient records — clinical data, doctors + admin only
    path: '/patients',
    label: 'Patients',
    adminOnly: false,
    allowedRoles: ['administrator', 'doctor'],
  },
  {
    // AI pre-diagnostics — clinical review, doctors + admin only
    path: '/ai-diagnostics',
    label: 'Prediagnostics IA',
    adminOnly: false,
    allowedRoles: ['administrator', 'doctor'],
  },
  {
    // Staff management — administrator only
    path: '/staff',
    label: 'Personnel médical',
    adminOnly: true,
    allowedRoles: ['administrator'],
  },
  {
    // Settings — everyone can manage their own profile and password
    path: '/settings',
    label: 'Paramètres',
    adminOnly: false,
    allowedRoles: ['administrator', 'doctor', 'staff'],
  },
]

// ─── Role metadata ────────────────────────────────────────────────────────────

export const ROLES: Record<Role, { label: string; description: string }> = {
  administrator: {
    label: 'Administrateur',
    description:
      'Accès complet — gestion du personnel, paramètres système et toutes les pages cliniques.',
  },
  doctor: {
    label: 'Médecin',
    description:
      'Accès clinique — tableau de bord, patients, consultations, rendez-vous, messages, diagnostics IA et paramètres.',
  },
  staff: {
    label: 'Personnel',
    description:
      "Accès opérationnel — tableau de bord, messages, consultations et paramètres. Pas d'accès aux dossiers patients, rendez-vous ou diagnostics IA.",
  },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns true if the given role is allowed to visit the given path.
 * Unknown paths are denied by default (fail-secure).
 */
export function canAccess(role: Role | string | undefined | null, path: string): boolean {
  if (!role) return false

  const normalizedPath = path.replace(/\/$/, '').split('?')[0]

  const page = PAGE_PERMISSIONS.find(
    (p) => p.path === normalizedPath || normalizedPath.startsWith(p.path + '/')
  )

  if (!page) return false

  // Administrator always passes
  if (role === 'administrator') return true

  // Admin-only pages are hard-blocked for everyone else
  if (page.adminOnly) return false

  return (page.allowedRoles as string[]).includes(role)
}

/**
 * Filters a nav-item array to only the entries the given role can see.
 */
export function filterNav<T extends { path: string }>(
  role: Role | string | undefined | null,
  items: T[]
): T[] {
  return items.filter((item) => canAccess(role, item.path))
}

/**
 * Where to redirect when access is denied.
 */
export function getDeniedRedirect(role: Role | string | undefined | null): string {
  return role ? '/dashboard' : '/login'
}
