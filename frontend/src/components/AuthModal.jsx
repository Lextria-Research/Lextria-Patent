// frontend/src/components/AuthModal.jsx
import React, { useState } from 'react';
import {
  X, Shield, Briefcase, Scale, UserCheck, Key, Lock,
  ChevronRight, CheckCircle2, Building
} from 'lucide-react';

export const USER_ACCOUNTS = [
  {
    id: 'pranav',
    name: 'Pranav Bhat',
    email: 'pranavbhat@lextria.in',
    role: 'SUPER_ADMIN',
    roleLabel: 'Super Admin / Managing Partner',
    initials: 'PB',
    color: '#3B82F6',
    department: 'Firm Management',
  },
  {
    id: 'paralegal',
    name: 'Paralegal Docketing Staff',
    email: 'paralegal@lextria.in',
    role: 'PARALEGAL',
    roleLabel: 'Paralegal / Docketing Officer',
    initials: 'PL',
    color: '#10B981',
    department: 'Docketing & Formalities',
  },
  {
    id: 'anusha',
    name: 'Anusha',
    email: 'anusha@lextria.in',
    role: 'DRAFTER',
    drafterName: 'Anusha',
    roleLabel: 'Patent Associate & Drafter',
    initials: 'AN',
    color: '#8B5CF6',
    department: 'Patent Drafting',
  },
  {
    id: 'ayush',
    name: 'Ayush',
    email: 'ayush@lextria.in',
    role: 'DRAFTER',
    drafterName: 'Ayush',
    roleLabel: 'Patent Associate & Drafter',
    initials: 'AY',
    color: '#EC4899',
    department: 'Patent Drafting',
  },
  {
    id: 'abhishek',
    name: 'Abhishek',
    email: 'abhishek@lextria.in',
    role: 'DRAFTER',
    drafterName: 'Abhishek',
    roleLabel: 'Patent Associate & Drafter',
    initials: 'AB',
    color: '#F59E0B',
    department: 'Patent Drafting',
  },
  {
    id: 'fiona',
    name: 'Fiona',
    email: 'fiona@lextria.in',
    role: 'DRAFTER',
    drafterName: 'Fiona',
    roleLabel: 'Patent Associate & Drafter',
    initials: 'FI',
    color: '#14B8A6',
    department: 'Patent Drafting',
  },
  {
    id: 'pramith',
    name: 'Pramith',
    email: 'pramith@lextria.in',
    role: 'DRAFTER',
    drafterName: 'Pramith',
    roleLabel: 'Patent Associate & Drafter',
    initials: 'PR',
    color: '#6366F1',
    department: 'Patent Drafting',
  },
  {
    id: 'pratham',
    name: 'Pratham',
    email: 'pratham@lextria.in',
    role: 'DRAFTER',
    drafterName: 'Pratham',
    roleLabel: 'Patent Associate & Drafter',
    initials: 'PT',
    color: '#06B6D4',
    department: 'Patent Drafting',
  },
  {
    id: 'thanush',
    name: 'Thanush',
    email: 'thanush@lextria.in',
    role: 'DRAFTER',
    drafterName: 'Thanush',
    roleLabel: 'Patent Associate & Drafter',
    initials: 'TH',
    color: '#84CC16',
    department: 'Patent Drafting',
  },
  {
    id: 'thilak',
    name: 'Thilak',
    email: 'thilak@lextria.in',
    role: 'DRAFTER',
    drafterName: 'Thilak',
    roleLabel: 'Patent Associate & Drafter',
    initials: 'TL',
    color: '#D97706',
    department: 'Patent Drafting',
  },
];

export default function AuthModal({ isOpen, onClose, currentUser, onSelectUser }) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 2500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--surface)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '560px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          border: '1px solid var(--line)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--line)',
            background: 'var(--page)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #1E293B, #3B82F6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
              }}
            >
              <Key size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: 900, margin: 0, color: 'var(--ink)' }}>
                Account Authentication & Switcher
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '2px 0 0' }}>
                Select authorized login account to enter role-specific workspace
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--muted)',
              padding: '6px',
              borderRadius: '6px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* User Roster */}
        <div style={{ maxHeight: '480px', overflowY: 'auto', padding: '16px 24px' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--muted)', marginBottom: '10px' }}>
            Available Firm User Accounts
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {USER_ACCOUNTS.map((acc) => {
              const isCurrent = currentUser?.id === acc.id;
              const Icon = acc.role === 'SUPER_ADMIN' ? Shield : acc.role === 'PARALEGAL' ? Scale : Briefcase;

              return (
                <div
                  key={acc.id}
                  onClick={() => {
                    onSelectUser(acc);
                    onClose();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: isCurrent ? '2px solid var(--accent)' : '1px solid var(--line)',
                    background: isCurrent ? 'var(--accent-soft)' : 'var(--page)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: acc.color,
                        color: '#fff',
                        fontWeight: 900,
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {acc.initials}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--ink)' }}>
                          {acc.name}
                        </span>
                        {isCurrent && (
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 800,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: '#D1FAE5',
                              color: '#065F46',
                            }}
                          >
                            LOGGED IN
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                        <Icon size={12} color="var(--muted)" />
                        <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600 }}>
                          {acc.roleLabel}
                        </span>
                      </div>
                    </div>
                  </div>

                  <ChevronRight size={16} color="var(--muted)" />
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer info */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid var(--line)',
            background: 'var(--page)',
            fontSize: '11px',
            color: 'var(--muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>Sessions are secured by Lextria Unified Auth</span>
          <span>Shared Supabase: eafciegebhuhoneypsqy</span>
        </div>
      </div>
    </div>
  );
}
