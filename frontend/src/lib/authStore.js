// frontend/src/lib/authStore.js

export const ROLES = {
  SUPER_ADMIN: {
    key: 'SUPER_ADMIN',
    label: 'Superadmin',
    description: 'Full administrative control, user provisioning, system settings, and portfolio oversight.',
    color: '#3B82F6',
  },
  PARALEGAL_HEAD: {
    key: 'PARALEGAL_HEAD',
    label: 'Paralegal Head',
    description: 'Lead paralegal management, docketing authority, matter triage, and filings.',
    color: '#10B981',
  },
  PARALEGAL_ASSOCIATE: {
    key: 'PARALEGAL_ASSOCIATE',
    label: 'Paralegal Associates',
    description: 'Formalities execution, CBR docketing, miscellaneous form filings, and client communications.',
    color: '#06B6D4',
  },
  PATENT_DRAFTER: {
    key: 'PATENT_DRAFTER',
    label: 'Patent Drafters',
    description: 'Preparation of provisional and complete specifications, claims drafting, and FER response notes.',
    color: '#8B5CF6',
  },
};

export const ROLE_OPTIONS = [
  { value: 'SUPER_ADMIN', label: 'Superadmin', description: 'Complete system, user management and docketing control' },
  { value: 'PARALEGAL_HEAD', label: 'Paralegal Head', description: 'Lead docketing authority, formalities triage and all filings' },
  { value: 'PARALEGAL_ASSOCIATE', label: 'Paralegal Associates', description: 'Formalities execution, CBR receipts and filing forms' },
  { value: 'PATENT_DRAFTER', label: 'Patent Drafters', description: 'Drafting cockpit, assigned matter specification prep' },
];

export const ROOT_SUPER_ADMIN = {
  id: 'usr_root_superadmin',
  name: 'Pranav Bhat',
  email: 'pranavbhat@lextria.in',
  password: 'LextriaPT@334',
  role: 'SUPER_ADMIN',
  roleLabel: 'Superadmin',
  initials: 'PB',
  color: '#3B82F6',
  department: 'Firm Management',
  isRoot: true,
  createdAt: '2026-01-01T00:00:00.000Z',
};

const USERS_STORAGE_KEY = 'patent_registered_users';
const CURRENT_USER_STORAGE_KEY = 'patent_current_user';

export function getInitials(name = '') {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return 'PB';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function getRegisteredUsers() {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    let users = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(users)) users = [];

    // Filter out corrupted entries or old mock users without passwords
    users = users.filter((u) => u && u.email && u.password);

    // Ensure the root superadmin is present and synced
    const rootIndex = users.findIndex(
      (u) => u.email?.trim().toLowerCase() === ROOT_SUPER_ADMIN.email.toLowerCase() || u.isRoot
    );

    if (rootIndex === -1) {
      users.unshift({ ...ROOT_SUPER_ADMIN });
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    } else {
      // Keep root credentials exactly as mandated
      users[rootIndex] = {
        ...users[rootIndex],
        name: ROOT_SUPER_ADMIN.name,
        email: ROOT_SUPER_ADMIN.email,
        password: ROOT_SUPER_ADMIN.password,
        role: 'SUPER_ADMIN',
        roleLabel: 'Superadmin',
        isRoot: true,
      };
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    }

    return users;
  } catch (err) {
    console.error('Failed to load registered users:', err);
    return [{ ...ROOT_SUPER_ADMIN }];
  }
}

export function saveRegisteredUsers(users) {
  try {
    const hasRoot = users.some(
      (u) => u.email?.trim().toLowerCase() === ROOT_SUPER_ADMIN.email.toLowerCase() || u.isRoot
    );
    const finalUsers = hasRoot ? users : [{ ...ROOT_SUPER_ADMIN }, ...users];
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(finalUsers));
    return finalUsers;
  } catch (err) {
    console.error('Failed to save registered users:', err);
    return users;
  }
}

export function authenticate(loginId, password) {
  if (!loginId || !password) return null;
  const users = getRegisteredUsers();
  const cleanId = loginId.trim().toLowerCase();

  const matchedUser = users.find(
    (u) => u.email?.trim().toLowerCase() === cleanId && u.password === password
  );

  if (!matchedUser) return null;

  const { password: _, ...safeUser } = matchedUser;
  return safeUser;
}

export function getCurrentUser() {
  try {
    const raw = localStorage.getItem(CURRENT_USER_STORAGE_KEY);
    if (!raw) return null;
    const user = JSON.parse(raw);
    if (!user || !user.email) return null;

    // Verify user still exists in registered roster
    const users = getRegisteredUsers();
    const exists = users.find(
      (u) => u.email?.trim().toLowerCase() === user.email?.trim().toLowerCase()
    );
    if (!exists) {
      localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
      return null;
    }
    const { password: _, ...safeUser } = exists;
    return safeUser;
  } catch {
    return null;
  }
}

export function setCurrentUser(user) {
  try {
    if (!user) {
      localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
    } else {
      const { password: _, ...safeUser } = user;
      localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(safeUser));
    }
  } catch (err) {
    console.error('Failed to set current user:', err);
  }
}

export function logout() {
  try {
    localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
  } catch (err) {
    console.error('Failed to logout:', err);
  }
}

export function createUser({ name, email, password, role, drafterName, department }) {
  const users = getRegisteredUsers();
  const cleanEmail = email.trim().toLowerCase();

  if (users.some((u) => u.email?.trim().toLowerCase() === cleanEmail)) {
    throw new Error(`A user with email "${email}" already exists.`);
  }

  const roleMeta = ROLES[role] || ROLES.PATENT_DRAFTER;
  const newUser = {
    id: `usr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    name: name.trim(),
    email: cleanEmail,
    password: password.trim(),
    role: role,
    roleLabel: roleMeta.label,
    initials: getInitials(name),
    color: roleMeta.color,
    drafterName: role === 'PATENT_DRAFTER' ? (drafterName?.trim() || name.trim()) : undefined,
    department: department?.trim() || (
      role.includes('PARALEGAL')
        ? 'Docketing & Formalities'
        : role === 'SUPER_ADMIN'
        ? 'Firm Management'
        : 'Patent Drafting'
    ),
    isRoot: false,
    createdAt: new Date().toISOString(),
  };

  const updatedList = [...users, newUser];
  saveRegisteredUsers(updatedList);
  return newUser;
}

export function updateUser(id, updates) {
  const users = getRegisteredUsers();
  const index = users.findIndex((u) => u.id === id);
  if (index === -1) throw new Error('User not found.');

  const existing = users[index];

  // Prevent modifying root superadmin's email or role
  if (existing.isRoot || existing.email?.toLowerCase() === ROOT_SUPER_ADMIN.email.toLowerCase()) {
    if (updates.email && updates.email.toLowerCase() !== ROOT_SUPER_ADMIN.email.toLowerCase()) {
      throw new Error('Root Superadmin email address cannot be changed.');
    }
    if (updates.role && updates.role !== 'SUPER_ADMIN') {
      throw new Error('Root Superadmin role cannot be modified.');
    }
  }

  // Check email uniqueness if email changed
  if (updates.email && updates.email.trim().toLowerCase() !== existing.email.toLowerCase()) {
    const cleanEmail = updates.email.trim().toLowerCase();
    if (users.some((u) => u.id !== id && u.email?.trim().toLowerCase() === cleanEmail)) {
      throw new Error(`A user with email "${updates.email}" already exists.`);
    }
  }

  const newRole = updates.role || existing.role;
  const roleMeta = ROLES[newRole] || ROLES.PATENT_DRAFTER;
  const newName = updates.name ? updates.name.trim() : existing.name;

  const updatedUser = {
    ...existing,
    ...updates,
    name: newName,
    email: updates.email ? updates.email.trim().toLowerCase() : existing.email,
    password: updates.password ? updates.password.trim() : existing.password,
    role: newRole,
    roleLabel: roleMeta.label,
    initials: getInitials(newName),
    color: roleMeta.color,
    drafterName: newRole === 'PATENT_DRAFTER'
      ? (updates.drafterName?.trim() || existing.drafterName || newName)
      : undefined,
    updatedAt: new Date().toISOString(),
  };

  users[index] = updatedUser;
  saveRegisteredUsers(users);

  // If this was current user, update session
  const currentUser = getCurrentUser();
  if (currentUser?.id === id) {
    const { password: _, ...safeUser } = updatedUser;
    setCurrentUser(safeUser);
  }

  return updatedUser;
}

export function deleteUser(id) {
  const users = getRegisteredUsers();
  const target = users.find((u) => u.id === id);
  if (!target) throw new Error('User not found.');

  if (target.isRoot || target.email?.toLowerCase() === ROOT_SUPER_ADMIN.email.toLowerCase()) {
    throw new Error('The master Superadmin account cannot be deleted.');
  }

  const filtered = users.filter((u) => u.id !== id);
  saveRegisteredUsers(filtered);

  // If deleted user was logged in, log out
  const currentUser = getCurrentUser();
  if (currentUser?.id === id) {
    logout();
  }

  return true;
}

export function getActiveDrafters(records = []) {
  const users = getRegisteredUsers();
  const registeredDrafters = users
    .filter((u) => u.role === 'PATENT_DRAFTER')
    .map((u) => u.drafterName || u.name);

  // Fallback / legacy portfolio drafters to ensure existing records stay assigned
  const portfolioDrafters = (records || [])
    .map((r) => r.assigned_to)
    .filter((a) => a && typeof a === 'string' && a.trim() && !['not assigned', 'unassigned', 'none', '-'].includes(a.trim().toLowerCase()))
    .map((a) => a.trim());

  const combined = Array.from(new Set([...registeredDrafters, ...portfolioDrafters]));
  return combined.sort();
}

export const isSuperAdmin = (u) => u?.role === 'SUPER_ADMIN';
export const isParalegalHead = (u) => u?.role === 'PARALEGAL_HEAD';
export const isParalegalAssociate = (u) => u?.role === 'PARALEGAL_ASSOCIATE';
export const isParalegal = (u) => ['PARALEGAL_HEAD', 'PARALEGAL_ASSOCIATE', 'PARALEGAL'].includes(u?.role);
export const isDrafter = (u) => ['PATENT_DRAFTER', 'DRAFTER'].includes(u?.role);

export const getRoleLabel = (role) => {
  switch (role) {
    case 'SUPER_ADMIN': return 'Superadmin';
    case 'PARALEGAL_HEAD': return 'Paralegal Head';
    case 'PARALEGAL_ASSOCIATE': return 'Paralegal Associates';
    case 'PATENT_DRAFTER': return 'Patent Drafters';
    case 'PARALEGAL': return 'Paralegal';
    case 'DRAFTER': return 'Patent Drafter';
    default: return role || 'User';
  }
};
