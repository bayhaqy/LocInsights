'use client'

/**
 * UserManagement — Superadmin panel for managing users and roles.
 *
 * Two tabs:
 *   1. Users  — CRUD on application users (username, password, role, active)
 *   2. Roles  — per-menu CRUD+export permission matrix per role
 *
 * Features:
 *   - List all users with role badges, status, last login, failed login count
 *   - Create new user (username, email, display_name, password, role, is_active)
 *   - Edit user (display_name, email, role, is_active, reset password, reset lockout)
 *   - Delete user (with confirmation; prevents self-delete & last-superadmin-delete)
 *   - Audit log viewer per user (last 20 actions)
 *   - Role descriptions sidebar (explains superadmin/admin/data/analyst/viewer permissions)
 *   - Per-role, per-menu CRUD+export permission matrix editor (Roles tab)
 *
 * Security:
 *   - All mutations go through /api/admin/users which enforces requireSuperadmin()
 *   - Passwords are never displayed (write-only field)
 *   - Self-demotion / self-deactivation blocked at API level
 *
 * Usage: rendered when activeView === 'users' in page.tsx (superadmin only).
 */

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Users, Plus, Edit, Trash2, Search, RefreshCw, Shield, ShieldCheck, ShieldAlert,
  Lock, Unlock, Key, Activity, AlertTriangle, UserCheck, UserX, Eye, EyeOff,
  Save, RotateCcw, Loader2, CheckCircle2, XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/lib/i18n/language-provider'
import { useSession } from 'next-auth/react'
import {
  MENU_LIST, DEFAULT_PERMISSIONS, ROLE_DESCRIPTIONS,
  type Permissions, type MenuPermission, type RoleId,
} from '@/lib/permissions'

type Role = 'superadmin' | 'admin' | 'data' | 'analyst' | 'viewer'

interface User {
  id: string
  username: string
  email: string | null
  display_name: string | null
  role: Role
  is_active: boolean
  failed_login_count: number
  locked_until: string | null
  last_login_at: string | null
  created_at: string
  updated_at: string
}

const ROLE_INFO: Record<Role, { label: string; desc: string; color: string; icon: any }> = {
  superadmin: {
    label: 'Superadmin',
    desc: 'Full CRUD on all master data + user/role management + system settings. Can run scrapers, ML training, and bulk imports.',
    color: 'var(--brand-red)',
    icon: ShieldCheck,
  },
  admin: {
    label: 'Admin',
    desc: 'All features except Users Management. Can CRUD on master data, run scrapers, ML training, and bulk imports.',
    color: '#2563eb',
    icon: Shield,
  },
  data: {
    label: 'Data Operator',
    desc: 'Full CRUD ONLY on Reports, Data Manager, and Data Scraper. Read-only on dashboards/maps/analysis.',
    color: '#059669',
    icon: Shield,
  },
  analyst: {
    label: 'Analyst',
    desc: 'Read-only on master data + can run ML/AI forecasts, A/B tests, and reports. Cannot edit master data or manage users.',
    color: '#7c3aed',
    icon: Shield,
  },
  viewer: {
    label: 'Viewer',
    desc: 'Read-only on dashboards and maps. Cannot access Data Manager, Scraper, Settings, or User Management. No exports.',
    color: '#5C5C5C',
    icon: Eye,
  },
}

export function UserManagement() {
  const { t } = useLanguage()
  const { data: session } = useSession()
  const currentUserId = (session?.user as any)?.id
  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users')

  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [editing, setEditing] = useState<Partial<User> & { password?: string; reset_lockout?: boolean } | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [editMode, setEditMode] = useState<'create' | 'edit'>('create')
  const [showPassword, setShowPassword] = useState(false)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (roleFilter !== 'all') params.set('role', roleFilter)
      params.set('include_inactive', 'true')
      const res = await fetch(`/api/admin/users?${params}`)
      const json = await res.json()
      if (json.success) {
        setUsers(json.data)
      } else {
        toast.error(json.error)
      }
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }, [search, roleFilter])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  function openCreate() {
    setEditing({
      username: '',
      email: '',
      display_name: '',
      password: '',
      role: 'viewer',
      is_active: true,
    })
    setEditMode('create')
    setShowDialog(true)
  }

  function openEdit(u: User) {
    setEditing({
      id: u.id,
      username: u.username,
      email: u.email || '',
      display_name: u.display_name || '',
      role: u.role,
      is_active: u.is_active,
      password: '',
      reset_lockout: false,
    })
    setEditMode('edit')
    setShowDialog(true)
  }

  async function save() {
    if (!editing) return
    try {
      if (editMode === 'create') {
        if (!editing.username || !editing.password) {
          toast.error('Username and password are required')
          return
        }
        if (editing.password.length < 8) {
          toast.error('Password must be at least 8 characters')
          return
        }
        const res = await fetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editing),
        })
        const json = await res.json()
        if (json.success) {
          toast.success(`User '${editing.username}' created with role '${editing.role}'`)
          setShowDialog(false)
          setEditing(null)
          fetchUsers()
        } else {
          toast.error(json.error)
        }
      } else {
        const body: any = { ...editing }
        // Don't send empty password
        if (!body.password) delete body.password
        // Don't send username (immutable)
        delete body.username
        const res = await fetch(`/api/admin/users?id=${editing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const json = await res.json()
        if (json.success) {
          toast.success('User updated')
          setShowDialog(false)
          setEditing(null)
          fetchUsers()
        } else {
          toast.error(json.error)
        }
      }
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  async function remove(u: User) {
    if (u.id === currentUserId) {
      toast.error('Cannot delete yourself')
      return
    }
    if (!confirm(`Delete user '${u.username}'? This cannot be undone.`)) return
    try {
      const res = await fetch(`/api/admin/users?id=${u.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) {
        toast.success(`User '${u.username}' deleted`)
        fetchUsers()
      } else {
        toast.error(json.error)
      }
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  async function toggleActive(u: User) {
    try {
      const res = await fetch(`/api/admin/users?id=${u.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !u.is_active }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(`${u.username} ${u.is_active ? 'deactivated' : 'activated'}`)
        fetchUsers()
      } else {
        toast.error(json.error)
      }
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const stats = {
    total: users.length,
    active: users.filter(u => u.is_active).length,
    superadmins: users.filter(u => u.role === 'superadmin' && u.is_active).length,
    locked: users.filter(u => u.locked_until && new Date(u.locked_until) > new Date()).length,
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-[24px] font-bold text-[var(--brand-ink)] leading-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-[var(--brand-red)]" />
            User &amp; Role Management
          </h2>
          <p className="text-[13px] text-[var(--brand-ink)]/60 mt-0.5">
            Manage user accounts, assign roles, reset passwords, and audit login activity.
          </p>
        </div>
      </div>

      {/* Tabs: Users + Roles */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'users' | 'roles')}>
        <TabsList className="mb-4">
          <TabsTrigger value="users" className="text-[12px]">
            <Users className="w-3.5 h-3.5 mr-1.5" />
            Users
          </TabsTrigger>
          <TabsTrigger value="roles" className="text-[12px]">
            <Shield className="w-3.5 h-3.5 mr-1.5" />
            Roles
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
      <div className="flex items-center gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={fetchUsers} disabled={loading} className="h-8">
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={openCreate} className="h-8 bg-[var(--brand-red)] hover:bg-[var(--brand-red-dark)]">
            <Plus className="w-3.5 h-3.5 mr-1" /> New User
          </Button>
        </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="card-premium">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-md bg-[var(--brand-cream)] text-[var(--brand-ink)] flex items-center justify-center">
                <Users className="w-3.5 h-3.5" />
              </div>
              <span className="text-[11px] uppercase tracking-wider text-[var(--brand-ink)]/60 font-medium">Total Users</span>
            </div>
            <div className="font-display text-[22px] font-bold text-[var(--brand-ink)] num-tabular">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="card-premium">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-md bg-green-50 text-green-700 flex items-center justify-center">
                <UserCheck className="w-3.5 h-3.5" />
              </div>
              <span className="text-[11px] uppercase tracking-wider text-[var(--brand-ink)]/60 font-medium">Active</span>
            </div>
            <div className="font-display text-[22px] font-bold text-[var(--brand-ink)] num-tabular">{stats.active}</div>
          </CardContent>
        </Card>
        <Card className="card-premium">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-md bg-[var(--brand-red-light)] text-[var(--brand-red)] flex items-center justify-center">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
              <span className="text-[11px] uppercase tracking-wider text-[var(--brand-ink)]/60 font-medium">Superadmins</span>
            </div>
            <div className="font-display text-[22px] font-bold text-[var(--brand-ink)] num-tabular">{stats.superadmins}</div>
          </CardContent>
        </Card>
        <Card className="card-premium">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-md bg-amber-50 text-amber-700 flex items-center justify-center">
                <Lock className="w-3.5 h-3.5" />
              </div>
              <span className="text-[11px] uppercase tracking-wider text-[var(--brand-ink)]/60 font-medium">Locked</span>
            </div>
            <div className="font-display text-[22px] font-bold text-[var(--brand-ink)] num-tabular">{stats.locked}</div>
          </CardContent>
        </Card>
      </div>

      {/* Role info cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {(['superadmin', 'analyst', 'viewer'] as Role[]).map(r => {
          const info = ROLE_INFO[r]
          const Icon = info.icon
          const count = users.filter(u => u.role === r).length
          return (
            <Card key={r} className="card-premium">
              <CardContent className="p-4">
                <div className="flex items-start gap-3 mb-2">
                  <div
                    className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0"
                    style={{ background: `${info.color}15`, color: info.color, border: `1px solid ${info.color}30` }}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-[14px] font-bold text-[var(--brand-ink)]">{info.label}</span>
                      <Badge variant="secondary" className="text-[9px]">{count}</Badge>
                    </div>
                    <p className="text-[11px] text-[var(--brand-ink)]/60 mt-1 leading-snug">{info.desc}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Filters + user table */}
      <Card className="card-premium">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-[12px] uppercase tracking-wider text-[var(--brand-ink)] flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-[var(--brand-red)]" />
              Users
              <Badge variant="secondary" className="text-[10px]">{users.length}</Badge>
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--brand-ink)]/40" />
                <Input
                  placeholder="Search users..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-7 pl-7 w-[180px] text-[12px]"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="h-7 w-[140px] text-[11px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  <SelectItem value="superadmin">Superadmin</SelectItem>
                  <SelectItem value="analyst">Analyst</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto max-h-[600px] border border-[var(--brand-border)] rounded scroll-styled">
            <table className="w-full text-[12px]">
              <thead className="sticky top-0 bg-[var(--brand-cream)] z-10">
                <tr className="border-b border-[var(--brand-border)] text-left">
                  <th className="px-3 py-2 font-semibold text-[var(--brand-ink)]/70 uppercase tracking-wider text-[10px]">Username</th>
                  <th className="px-3 py-2 font-semibold text-[var(--brand-ink)]/70 uppercase tracking-wider text-[10px]">Display Name</th>
                  <th className="px-3 py-2 font-semibold text-[var(--brand-ink)]/70 uppercase tracking-wider text-[10px]">Email</th>
                  <th className="px-3 py-2 font-semibold text-[var(--brand-ink)]/70 uppercase tracking-wider text-[10px]">Role</th>
                  <th className="px-3 py-2 font-semibold text-[var(--brand-ink)]/70 uppercase tracking-wider text-[10px]">Status</th>
                  <th className="px-3 py-2 font-semibold text-[var(--brand-ink)]/70 uppercase tracking-wider text-[10px]">Last Login</th>
                  <th className="px-3 py-2 font-semibold text-[var(--brand-ink)]/70 uppercase tracking-wider text-[10px]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr><td colSpan={7} className="py-8 text-center text-[var(--brand-ink)]/40">No users found.</td></tr>
                ) : (
                  users.map(u => {
                    const isLocked = u.locked_until && new Date(u.locked_until) > new Date()
                    const isSelf = u.id === currentUserId
                    const roleInfo = ROLE_INFO[u.role]
                    const RoleIcon = roleInfo.icon
                    return (
                      <tr key={u.id} className={`border-b border-[var(--brand-border)]/40 hover:bg-[var(--brand-cream)]/40 ${isSelf ? 'bg-[var(--brand-red)]/5' : ''}`}>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <strong className="text-[var(--brand-ink)]">{u.username}</strong>
                            {isSelf && <Badge variant="outline" className="text-[9px] border-[var(--brand-red)]/40 text-[var(--brand-red)]">You</Badge>}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-[var(--brand-ink)]/70">{u.display_name || '—'}</td>
                        <td className="px-3 py-2 text-[var(--brand-ink)]/70">{u.email || '—'}</td>
                        <td className="px-3 py-2">
                          <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border"
                            style={{ color: roleInfo.color, borderColor: `${roleInfo.color}40`, background: `${roleInfo.color}10` }}
                          >
                            <RoleIcon className="w-2.5 h-2.5" />
                            {roleInfo.label}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          {isLocked ? (
                            <Badge variant="outline" className="text-[9px] border-red-300 text-red-700 bg-red-50">
                              <Lock className="w-2.5 h-2.5 mr-0.5" /> Locked
                            </Badge>
                          ) : u.is_active ? (
                            <Badge variant="outline" className="text-[9px] border-green-300 text-green-700 bg-green-50">
                              <UserCheck className="w-2.5 h-2.5 mr-0.5" /> Active
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[9px] border-gray-300 text-gray-600 bg-gray-50">
                              <UserX className="w-2.5 h-2.5 mr-0.5" /> Inactive
                            </Badge>
                          )}
                          {u.failed_login_count > 0 && !isLocked && (
                            <div className="text-[9px] text-amber-700 mt-0.5">{u.failed_login_count} failed attempts</div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-[var(--brand-ink)]/60 text-[11px]">
                          {u.last_login_at
                            ? new Date(u.last_login_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })
                            : 'Never'}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openEdit(u)}
                              className="h-6 px-1.5 text-[10px] hover:bg-[var(--brand-cream)]"
                              title="Edit user"
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => toggleActive(u)}
                              disabled={isSelf}
                              className="h-6 px-1.5 text-[10px] hover:bg-[var(--brand-cream)]"
                              title={u.is_active ? 'Deactivate' : 'Activate'}
                            >
                              {u.is_active ? <UserX className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => remove(u)}
                              disabled={isSelf}
                              className="h-6 px-1.5 text-[10px] text-red-700 hover:bg-red-50"
                              title="Delete user"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      {showDialog && editing && (
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-[15px]">
                {editMode === 'create' ? <Plus className="w-4 h-4 text-[var(--brand-red)]" /> : <Edit className="w-4 h-4 text-[var(--brand-red)]" />}
                {editMode === 'create' ? 'Create New User' : `Edit User: ${editing.username}`}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              {editMode === 'create' && (
                <div>
                  <Label className="text-[11px] uppercase tracking-wider text-[var(--brand-ink)]/60 mb-1.5 block">
                    Username <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={editing.username || ''}
                    onChange={(e) => setEditing({ ...editing, username: e.target.value })}
                    placeholder="e.g., bayhaqy"
                    className="h-9 text-[12px]"
                  />
                  <p className="text-[10px] text-[var(--brand-ink)]/50 mt-1">Cannot be changed after creation.</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[11px] uppercase tracking-wider text-[var(--brand-ink)]/60 mb-1.5 block">Display Name</Label>
                  <Input
                    value={editing.display_name || ''}
                    onChange={(e) => setEditing({ ...editing, display_name: e.target.value })}
                    placeholder="e.g., Achmad Bayhaqy"
                    className="h-9 text-[12px]"
                  />
                </div>
                <div>
                  <Label className="text-[11px] uppercase tracking-wider text-[var(--brand-ink)]/60 mb-1.5 block">Email</Label>
                  <Input
                    type="email"
                    value={editing.email || ''}
                    onChange={(e) => setEditing({ ...editing, email: e.target.value })}
                    placeholder="user@locinsight.local"
                    className="h-9 text-[12px]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[11px] uppercase tracking-wider text-[var(--brand-ink)]/60 mb-1.5 block">
                    Role
                  </Label>
                  <Select
                    value={editing.role || 'viewer'}
                    onValueChange={(v) => setEditing({ ...editing, role: v as Role })}
                  >
                    <SelectTrigger className="h-9 text-[12px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="superadmin">🛡 Superadmin — Full access</SelectItem>
                      <SelectItem value="analyst">📊 Analyst — Read + ML/AI</SelectItem>
                      <SelectItem value="viewer">👁 Viewer — Read-only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[11px] uppercase tracking-wider text-[var(--brand-ink)]/60 mb-1.5 block">Active</Label>
                  <div className="flex items-center gap-2 h-9 px-3 border border-[var(--brand-border)] rounded-md bg-white">
                    <Switch
                      checked={editing.is_active !== false}
                      onCheckedChange={(v) => setEditing({ ...editing, is_active: v })}
                    />
                    <span className="text-[12px] text-[var(--brand-ink)]/70">
                      {editing.is_active !== false ? 'Active (can login)' : 'Inactive (cannot login)'}
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <Label className="text-[11px] uppercase tracking-wider text-[var(--brand-ink)]/60 mb-1.5 block">
                  {editMode === 'create' ? 'Password' : 'New Password (leave blank to keep current)'}
                  {editMode === 'create' && <span className="text-red-500"> *</span>}
                </Label>
                <div className="relative">
                  <Key className="w-3.5 h-3.5 absolute left-3 top-3 text-[var(--brand-ink)]/40" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={editing.password || ''}
                    onChange={(e) => setEditing({ ...editing, password: e.target.value })}
                    placeholder={editMode === 'create' ? 'Min 8 characters' : 'Enter new password to reset'}
                    className="h-9 text-[12px] pl-9 pr-9"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-2.5 text-[var(--brand-ink)]/40 hover:text-[var(--brand-ink)]"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-[10px] text-[var(--brand-ink)]/50 mt-1">Min 8 characters. Hashed with bcrypt (10 rounds).</p>
              </div>
              {editMode === 'edit' && (
                <div className="flex items-center gap-2 p-2 border border-[var(--brand-border)] rounded-md bg-[var(--brand-cream)]/50">
                  <Unlock className="w-3.5 h-3.5 text-amber-700" />
                  <label className="flex items-center gap-2 text-[11.5px] text-[var(--brand-ink)]/80 cursor-pointer flex-1">
                    <input
                      type="checkbox"
                      checked={!!editing.reset_lockout}
                      onChange={(e) => setEditing({ ...editing, reset_lockout: e.target.checked })}
                      className="w-3.5 h-3.5 accent-[var(--brand-red)]"
                    />
                    Reset lockout &amp; failed login counter
                  </label>
                </div>
              )}
              {/* Role description preview */}
              <div className="p-2.5 rounded-md border border-[var(--brand-border)] bg-[var(--brand-cream)]/30 text-[11px] text-[var(--brand-ink)]/70 leading-snug">
                <strong className="text-[var(--brand-ink)]">{ROLE_INFO[editing.role || 'viewer'].label} permissions:</strong>{' '}
                {ROLE_INFO[editing.role || 'viewer'].desc}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)} className="h-9 text-[12px]">
                Cancel
              </Button>
              <Button
                onClick={save}
                className="h-9 text-[12px] bg-[var(--brand-red)] hover:bg-[var(--brand-red-dark)]"
              >
                {editMode === 'create' ? 'Create User' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
        </TabsContent>

        <TabsContent value="roles" className="space-y-4">
          <RolesTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// =====================================================
// Roles tab — per-menu CRUD+export permission matrix
// =====================================================
function RolesTab() {
  const { t } = useLanguage()
  const [roles, setRoles] = useState<Array<{ id: string; name: string; description: string; permissions: Permissions; is_system: boolean; updated_at: string }>>([])
  const [selectedRole, setSelectedRole] = useState<RoleId>('admin')
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState<Permissions | null>(null)
  const [saving, setSaving] = useState(false)

  const fetchRoles = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/roles')
      let json: any = null
      try { json = await res.json() } catch {}
      if (json?.success) {
        setRoles(json.data)
        const sel = json.data.find((r: any) => r.id === selectedRole)
        if (sel) setDraft(sel.permissions as Permissions)
      } else {
        toast.error(json?.error || `HTTP ${res.status}`)
      }
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }, [selectedRole])

  useEffect(() => { fetchRoles() }, [fetchRoles])

  useEffect(() => {
    const sel = roles.find(r => r.id === selectedRole)
    if (sel) setDraft(JSON.parse(JSON.stringify(sel.permissions)) as Permissions)
  }, [selectedRole, roles])

  function togglePerm(menuId: string, action: keyof MenuPermission, value: boolean) {
    if (!draft) return
    if (selectedRole === 'superadmin') return // locked
    setDraft({
      ...draft,
      [menuId]: {
        ...(draft[menuId] || { read: false, create: false, update: false, delete: false, export: false }),
        [action]: value,
      },
    })
  }

  async function savePermissions() {
    if (!draft || selectedRole === 'superadmin') return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/roles/${selectedRole}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: draft }),
      })
      let json: any = null
      try { json = await res.json() } catch {}
      if (json?.success) {
        toast.success(`Permissions saved for role ${selectedRole}`)
        fetchRoles()
      } else {
        toast.error(json?.error || `HTTP ${res.status}`)
      }
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function resetPermissions() {
    if (!confirm(`Reset permissions for ${selectedRole} to system defaults?`)) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/roles/${selectedRole}`, { method: 'POST' })
      let json: any = null
      try { json = await res.json() } catch {}
      if (json?.success) {
        toast.success(`Permissions reset to defaults for role ${selectedRole}`)
        fetchRoles()
      } else {
        toast.error(json?.error || `HTTP ${res.status}`)
      }
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  const isLocked = selectedRole === 'superadmin'
  const fullAccessCount = draft ? Object.values(draft).filter(p => p.read && p.create && p.update && p.delete && p.export).length : 0
  const readOnlyCount = draft ? Object.values(draft).filter(p => p.read && !p.create && !p.update && !p.delete && !p.export).length : 0

  return (
    <div className="space-y-4">
      {/* Role selector */}
      <Card className="card-premium">
        <CardContent className="p-4">
          <Label className="text-[11px] uppercase tracking-wider text-[var(--brand-ink)]/60 block mb-2">
            Select role to edit
          </Label>
          <div className="flex flex-wrap items-center gap-2">
            {(['superadmin', 'admin', 'data', 'analyst', 'viewer'] as RoleId[]).map(rid => (
              <button
                key={rid}
                onClick={() => setSelectedRole(rid)}
                className={`px-3 py-1.5 rounded-md text-[12px] font-medium border transition-colors ${
                  selectedRole === rid
                    ? 'bg-[var(--brand-red)] text-white border-[var(--brand-red)]'
                    : 'bg-white text-[var(--brand-ink)]/70 border-[var(--brand-border)] hover:border-[var(--brand-red)]/40'
                }`}
              >
                {rid}
              </button>
            ))}
          </div>
          {roles.find(r => r.id === selectedRole)?.description && (
            <div className="mt-3 text-[12px] text-[var(--brand-ink)]/70 bg-[var(--brand-cream)] rounded-md px-3 py-2">
              {roles.find(r => r.id === selectedRole)?.description}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lock notice for superadmin */}
      {isLocked && (
        <Card className="card-premium border-amber-300/50 bg-amber-50/50">
          <CardContent className="p-3 flex items-center gap-2 text-[12px] text-amber-900">
            <Lock className="w-4 h-4 flex-shrink-0" />
            Super Admin permissions are locked (full access).
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="card-premium">
          <CardContent className="p-3 flex items-center gap-3">
            <Shield className="w-5 h-5 text-[var(--brand-red)]" />
            <div>
              <div className="text-[20px] font-bold text-[var(--brand-ink)] leading-none">{MENU_LIST.length}</div>
              <div className="text-[10px] uppercase tracking-wider text-[var(--brand-ink)]/55 mt-0.5">{MENU_LIST.length} menus configured</div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-premium">
          <CardContent className="p-3 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-700" />
            <div>
              <div className="text-[20px] font-bold text-[var(--brand-ink)] leading-none">{fullAccessCount}</div>
              <div className="text-[10px] uppercase tracking-wider text-[var(--brand-ink)]/55 mt-0.5">{fullAccessCount} menus with full CRUD+export</div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-premium">
          <CardContent className="p-3 flex items-center gap-3">
            <Lock className="w-5 h-5 text-amber-700" />
            <div>
              <div className="text-[20px] font-bold text-[var(--brand-ink)] leading-none">{readOnlyCount}</div>
              <div className="text-[10px] uppercase tracking-wider text-[var(--brand-ink)]/55 mt-0.5">{readOnlyCount} menus read-only</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Permission matrix */}
      <Card className="card-premium">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-[13px] uppercase tracking-wider text-[var(--brand-ink)] flex items-center gap-2">
              <Shield className="w-4 h-4 text-[var(--brand-red)]" />
              Role Permissions
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={resetPermissions} disabled={saving || isLocked} className="h-7 text-[11px]">
                <RotateCcw className="w-3 h-3 mr-1" />
                Reset to Defaults
              </Button>
              <Button size="sm" onClick={savePermissions} disabled={saving || isLocked} className="h-7 text-[11px] bg-[var(--brand-red)] hover:bg-[var(--brand-red-dark)]">
                {saving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}
                Save Permissions
              </Button>
            </div>
          </div>
          <p className="text-[11px] text-[var(--brand-ink)]/60 mt-1">
            Define per-menu CRUD + export permissions for the {selectedRole} role. Changes take effect for new sessions.
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          {loading || !draft ? (
            <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-[var(--brand-red)]" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead className="bg-[var(--brand-cream)] text-[var(--brand-ink)]/60 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="text-left px-3 py-2 sticky left-0 bg-[var(--brand-cream)]">Menu</th>
                    <th className="text-left px-3 py-2 hidden md:table-cell">Description</th>
                    <th className="text-center px-2 py-2">Read</th>
                    <th className="text-center px-2 py-2">Create</th>
                    <th className="text-center px-2 py-2">Update</th>
                    <th className="text-center px-2 py-2">Delete</th>
                    <th className="text-center px-2 py-2">Export</th>
                  </tr>
                </thead>
                <tbody>
                  {MENU_LIST.map(menu => {
                    const p = draft[menu.id] || { read: false, create: false, update: false, delete: false, export: false }
                    const isUsersMenu = menu.id === 'users' && selectedRole !== 'superadmin'
                    return (
                      <tr key={menu.id} className="border-b border-[var(--brand-border)]/50 hover:bg-[var(--brand-cream)]/30">
                        <td className="px-3 py-2 font-medium text-[var(--brand-ink)] sticky left-0 bg-white">{menu.label}</td>
                        <td className="px-3 py-2 text-[var(--brand-ink)]/60 text-[11px] hidden md:table-cell">{menu.description}</td>
                        {(['read', 'create', 'update', 'delete', 'export'] as (keyof MenuPermission)[]).map(action => (
                          <td key={action} className="text-center px-2 py-2">
                            <Switch
                              checked={p[action]}
                              disabled={isLocked || isUsersMenu}
                              onCheckedChange={(v) => togglePerm(menu.id, action, v)}
                              className="scale-90"
                            />
                          </td>
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
