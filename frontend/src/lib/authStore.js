// frontend/src/lib/authStore.js
import { supabase, coreDb } from './supabase';

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
    label: 'Drafter',
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
  password: 'Pranav@334',
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

/**
 * Universal SSO Authenticator via Central Supabase (eafciegebhuhoneypsqy)
 * with graceful local fallback.
 */
export async function authenticate(loginId, password) {
  if (!loginId || !password) return null;
  const cleanId = loginId.trim();
  let cleanPassword = password.trim();

  // 1. Central Supabase Universal SSO
  try {
    let authEmail = cleanId.includes('@') ? cleanId.toLowerCase() : null;

    if (!authEmail) {
      try {
        const { data: profileMatch } = await coreDb
          .from('profiles')
          .select('email, display_name, role')
          .ilike('display_name', cleanId)
          .maybeSingle();

        if (profileMatch?.email) {
          authEmail = profileMatch.email.toLowerCase();
        }
      } catch (e) {
        console.warn('Profile name lookup warning:', e);
      }
    }

    const finalEmail = authEmail || cleanId.toLowerCase();

    // Map common names to email if needed
    const NAME_MAP = {
      'pranav': 'pranavbhat@lextria.in',
      'pranav bhat': 'pranavbhat@lextria.in',
      'sharan': 'sharan@lextria.in',
      'mounisha': 'mounisha@lextria.in',
      'anusha': 'anusha@lextria.in',
      'ayush': 'ayush@lextria.in',
      'chaitra': 'chaitra@lextria.in',
      'kaushal': 'kaushal.kamath@lextria.in',
      'manoj': 'exec@lextria-demo.test',
      'manoj kumar': 'exec@lextria-demo.test',
      'exec': 'exec@lextria-demo.test'
    };
    if (!authEmail && NAME_MAP[cleanId.toLowerCase()]) {
      authEmail = NAME_MAP[cleanId.toLowerCase()];
    }

    // Convenience password normalization for legacy passwords
    if ((cleanPassword === '334' || cleanPassword === 'LextriaPT@334') && finalEmail === 'pranavbhat@lextria.in') {
      cleanPassword = 'Pranav@334';
    }
    if (cleanPassword === '334') {
      if (finalEmail === 'sharan@lextria.in') cleanPassword = 'Sharan@334';
      if (finalEmail === 'mounisha@lextria.in') cleanPassword = 'Mounisha@334';
    }

    const { data: authResult, error: authErr } = await supabase.auth.signInWithPassword({
      email: finalEmail,
      password: cleanPassword,
    });

    if (!authErr && authResult?.user) {
      const authUser = authResult.user;
      const meta = authUser.user_metadata || {};
      const dashAccess = meta.dashboard_access || {};

      const { data: userProfile } = await coreDb
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      const isRootAdmin = finalEmail === ROOT_SUPER_ADMIN.email.toLowerCase() || 
                          finalEmail === 'pranavbhat@lextria.in';
      const patAccess = dashAccess.patent || {};

      if (!isRootAdmin && patAccess.enabled === false) {
        throw new Error('Access to Patent Dashboard is not enabled for your account. Please contact an Administrator.');
      }

      // Explicit role mapping from dashboard_access.patent.role configured in Universal Settings
      let patentRole = 'PATENT_DRAFTER';
      const configuredRole = (patAccess.role || '').toUpperCase();

      if (configuredRole === 'DRAFTER' || configuredRole === 'PATENT_DRAFTER') {
        patentRole = 'PATENT_DRAFTER';
      } else if (configuredRole === 'FILER' || configuredRole === 'PARALEGAL_ASSOCIATE' || configuredRole === 'PARALEGAL') {
        patentRole = 'PARALEGAL_ASSOCIATE';
      } else if (configuredRole === 'AUDITOR' || configuredRole === 'PARALEGAL_HEAD') {
        patentRole = 'PARALEGAL_HEAD';
      } else if (configuredRole === 'ADMIN' || configuredRole === 'SUPER_ADMIN') {
        patentRole = 'SUPER_ADMIN';
      } else if (isRootAdmin) {
        patentRole = 'SUPER_ADMIN';
      } else if (userProfile?.role === 'SUPER_ADMIN' && !configuredRole) {
        patentRole = 'SUPER_ADMIN';
      } else if (userProfile?.role === 'PARALEGAL' || userProfile?.department === 'PARALEGAL') {
        patentRole = 'PARALEGAL_ASSOCIATE';
      } else if (userProfile?.role === 'DEPT_ADMIN') {
        patentRole = 'PARALEGAL_HEAD';
      } else {
        patentRole = 'PATENT_DRAFTER';
      }

      const roleMeta = ROLES[patentRole] || ROLES.PATENT_DRAFTER;
      const displayName = userProfile?.display_name || meta.display_name || finalEmail.split('@')[0];

      const universalUser = {
        id: authUser.id,
        name: displayName,
        email: authUser.email || finalEmail,
        role: patentRole,
        roleLabel: roleMeta.label,
        initials: getInitials(displayName),
        color: roleMeta.color,
        department: userProfile?.department || 'Patent Drafting',
        drafterName: displayName,
        isRoot: patentRole === 'SUPER_ADMIN',
        isUniversal: true,
      };

      setCurrentUser(universalUser);
      return universalUser;
    }
  } catch (err) {
    if (err.message && err.message.includes('not enabled')) {
      throw err;
    }
    console.warn('Central Supabase SSO check warning:', err.message);
  }

  // 2. Local registered users fallback
  const users = getRegisteredUsers();
  const matchedUser = users.find(
    (u) =>
      (u.email?.trim().toLowerCase() === cleanId.toLowerCase() ||
        u.name?.trim().toLowerCase() === cleanId.toLowerCase()) &&
      (u.password === password ||
        (cleanId.toLowerCase() === 'pranavbhat@lextria.in' &&
          (password === '334' || password === 'Pranav@334' || password === 'LextriaPT@334')))
  );

  if (!matchedUser) return null;

  const { password: _, ...safeUser } = matchedUser;
  setCurrentUser(safeUser);
  return safeUser;
}

export function getCurrentUser() {
  try {
    const raw = localStorage.getItem(CURRENT_USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setCurrentUser(user) {
  try {
    if (user) {
      localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
    }
  } catch {}
}

export function logout() {
  try {
    localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
    supabase.auth.signOut();
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
    case 'PATENT_DRAFTER': return 'Drafter';
    case 'PARALEGAL': return 'Paralegal';
    case 'DRAFTER': return 'Drafter';
    default: return role || 'User';
  }
};
