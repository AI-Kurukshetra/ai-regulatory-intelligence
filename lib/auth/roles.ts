export const appRoles = [
  'admin',
  'compliance_officer',
  'analyst',
  'auditor',
  'readonly'
] as const

export type AppRole = (typeof appRoles)[number]

export const readOnlyRoles: AppRole[] = ['auditor', 'readonly']

export function hasRole(
  currentRole: string,
  allowedRoles: readonly AppRole[]
): currentRole is AppRole {
  return allowedRoles.includes(currentRole as AppRole)
}

