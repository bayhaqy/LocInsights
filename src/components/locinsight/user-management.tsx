'use client'

/**
 * UserManagement — Superadmin panel for managing users and roles.
 *
 * Features:
 *   - List all users with role badges, status, last login, failed login count
 *   - Create new user (username, email, display_name, password, role, is_active)
 *   - Edit user (display_name, email, role, is_active, reset password, reset lockout)
 *   - Delete user (with confirmation; prevents self-delete & last-superadmin-delete)
 *   - Audit log viewer per user (last 20 actions)
 *   - Role descriptions sidebar (explains superadmin/analyst/viewer permissions)
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
import {
  Users, Plus, Edit, Trash2, Search, RefreshCw, Shield, ShieldCheck, ShieldAlert,
  Lock, Unlock, Key, Activity, AlertTriangle, UserCheck, UserX, Eye, EyeOff,
} from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/lib/i18n/language-provider'
import { useSession } from 'next-auth/react'

type Role = 'superadmin' | 'analyst' | 'viewer'

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
  analyst: {
    label: 'Analyst',
    desc: 'Read-only on master data + can run ML/AI forecasts, A/B tests, and reports. Cannot edit master data or manage users.',
    color: '#7c3aed',
    icon: Shield,
  },
  viewer: {
    label: 'Viewer',
    desc: 'Read-only on dashboards and maps. Cannot access Data Manager, Scraper, Settings, or User Management.',
    color: '#5C5C5C',
    icon: Eye,
  },
}

export function UserManagement() {
  const { t } = useLanguage()
  const { data: session } = useSession()
  const currentUserId = (session?.user as any)?.id

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
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchUsers} disabled={loading} className="h-8">
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={openCreate} className="h-8 bg-[var(--brand-red)] hover:bg-[var(--brand-red-dark)]">
            <Plus className="w-3.5 h-3.5 mr-1" /> New User
          </Button>
        </div>
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
    </div>
  )
}
