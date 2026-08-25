export const Role = {
  ADMIN: 'ADMIN',
  LIBRARIAN: 'LIBRARIAN',
  MEMBER: 'MEMBER'
} as const;

export type RoleType = typeof Role[keyof typeof Role];
