'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { 
  Shield, 
  Users, 
  Layers, 
  MessageSquare, 
  TrendingUp, 
  Bot, 
  Trash2, 
  Loader2, 
  UserPlus, 
  Search, 
  CheckCircle,
  AlertTriangle,
  Lock,
  Building2,
  KeyRound,
  Copy,
  Zap,
  Sparkles,
  BarChart3,
  Clock,
  RefreshCw,
  ArrowRightLeft,
  Ban,
  CreditCard,
  Settings,
  X
} from 'lucide-react';
import { TransactionsTab } from '@/components/admin/transactions-tab';
import { PackagesManagementTab } from '@/components/admin/packages-management-tab';
import { BrandingSettingsTab } from '@/components/admin/branding-settings-tab';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string;
  account_role: 'owner' | 'admin' | 'agent' | 'viewer';
  created_at: string;
  account_id: string;
  menu_access: string[] | null;
  plan: 'Standard' | 'Premium' | 'Enterprise';
}

interface Workspace {
  id: string;
  name: string;
  plan: 'Standard' | 'Premium' | 'Enterprise';
  created_at: string;
}

interface LicenseKey {
  id: string;
  key_code: string;
  plan: string;
  status: 'active' | 'used' | 'disabled';
  workspace_id: string | null;
  created_at: string;
  expiry_date: string | null;
  max_activations: number;
  activation_count: number;
  user_id: string | null;
  notes: string | null;
  duration: string | null;
  start_date: string | null;
}

interface Presence {
  user_id: string;
  status: 'online' | 'away';
  last_seen_at: string;
}

interface Package {
  id: string;
  name: string;
  code: string;
  features: string[];
  price: string;
  created_at: string;
  allowed_menus: string[];
  duration: string;
  is_active: boolean;
}

interface DashboardStats {
  totalUsers: number;
  activeLicenses: number;
  expiredLicenses: number;
  pendingActivations: number;
  packageDistribution: Record<string, number>;
  recentUsers: UserProfile[];
  recentLicenses: LicenseKey[];
}

export default function AdminPanelPage() {
  const router = useRouter();
  const { accountRole, profileLoading, user } = useAuth();
  const userId = user?.id;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    profiles: UserProfile[];
    accounts: Workspace[];
    licenseKeys: LicenseKey[];
    presences: Presence[];
    packages: Package[];
    stats: DashboardStats | null;
    pendingTransactionsCount?: number;
  } | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [updatingWorkspaceId, setUpdatingWorkspaceId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  // License Key States
  const [showGenerateKeyModal, setShowGenerateKeyModal] = useState(false);
  const [newKeyPlan, setNewKeyPlan] = useState<string>('Standard');
  const [newKeyDuration, setNewKeyDuration] = useState<string>('30 Days');
  const [newKeyMaxActivations, setNewKeyMaxActivations] = useState<number>(1);
  const [newKeyNotes, setNewKeyNotes] = useState<string>('');
  const [newKeyCustomExpiry, setNewKeyCustomExpiry] = useState<string>('');
  const [generatingKey, setGeneratingKey] = useState(false);
  const [deletingKeyId, setDeletingKeyId] = useState<string | null>(null);

  // Package Management States
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState<Package | null>(null);
  const [packageName, setPackageName] = useState('');
  const [packageCode, setPackageCode] = useState('');
  const [packagePrice, setPackagePrice] = useState('');
  const [packageFeatures, setPackageFeatures] = useState<string[]>([]);
  const [packageDuration, setPackageDuration] = useState('30 Days');
  const [packageAllowedMenus, setPackageAllowedMenus] = useState<string[]>([]);
  const [newFeatureText, setNewFeatureText] = useState('');
  const [savingPackage, setSavingPackage] = useState(false);
  const [deletingPackageId, setDeletingPackageId] = useState<string | null>(null);

  // Add User States
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUserFullName, setNewUserFullName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'owner' | 'admin' | 'agent' | 'viewer'>('agent');
  const [newUserWorkspaceId, setNewUserWorkspaceId] = useState('');
  const [newUserMenuAccess, setNewUserMenuAccess] = useState<string[]>([
    'dashboard', 'inbox', 'notifications', 'contacts', 'pipelines'
  ]);
  const [addingUser, setAddingUser] = useState(false);

  // Edit Permissions States
  const [editingPermissionsProfile, setEditingPermissionsProfile] = useState<UserProfile | null>(null);
  const [editingMenuAccess, setEditingMenuAccess] = useState<string[]>([]);
  const [updatingPermissions, setUpdatingPermissions] = useState(false);

  // User Details States
  const [selectedDetailUser, setSelectedDetailUser] = useState<UserProfile | null>(null);
  const [selectedUserPayments, setSelectedUserPayments] = useState<any[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  
  // Manual Validity Extension States
  const [extendingLicenseId, setExtendingLicenseId] = useState<string | null>(null);
  const [extensionDays, setExtensionDays] = useState<number>(30);
  const [extending, setExtending] = useState(false);

  const SIDEBAR_MENUS = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'inbox', label: 'Inbox' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'contacts', label: 'Contacts' },
    { id: 'pipelines', label: 'Pipelines' },
    { id: 'broadcasts', label: 'Broadcasts' },
    { id: 'automations', label: 'Automations' },
    { id: 'flows', label: 'Flows' },
    { id: 'agents', label: 'AI Agents' },
  ];

  useEffect(() => {
    if (data?.accounts?.[0]?.id && !newUserWorkspaceId) {
      setNewUserWorkspaceId(data.accounts[0].id);
    }
  }, [data?.accounts, newUserWorkspaceId]);

  const isUserOnline = (userId: string) => {
    if (!data?.presences) return false;
    const presence = data.presences.find((p) => p.user_id === userId);
    if (!presence) return false;
    const lastSeen = new Date(presence.last_seen_at).getTime();
    const now = Date.now();
    return (now - lastSeen) < 75000;
  };

  const activeSessionsCount = useMemo(() => {
    if (!data?.profiles || !data?.presences) return 0;
    return data.profiles.filter(p => isUserOnline(p.user_id || p.id)).length;
  }, [data?.profiles, data?.presences]);

  const fetchAdminData = async () => {
    try {
      const res = await fetch('/api/admin/data');
      if (!res.ok) {
        throw new Error('Failed to load admin data');
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      toast.error(err.message || 'Error loading dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profileLoading) return;
    if (user?.email !== 'admin@avorex.com') {
      return;
    }
    fetchAdminData();
  }, [user?.email, profileLoading]);

  // Filter users by search query
  const filteredUsers = useMemo(() => {
    if (!data?.profiles) return [];
    return data.profiles.filter(p => {
      const search = searchQuery.toLowerCase();
      return (
        p.email?.toLowerCase().includes(search) ||
        p.full_name?.toLowerCase().includes(search) ||
        p.account_role?.toLowerCase().includes(search)
      );
    });
  }, [data?.profiles, searchQuery]);

  const handleUpdateRole = async (targetUserId: string, newRole: string | null) => {
    setUpdatingUserId(targetUserId);
    try {
      const res = await fetch('/api/admin/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateRole',
          userId: targetUserId,
          targetRole: newRole
        })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update role');
      }
      toast.success('User role updated successfully');
      await fetchAdminData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update user role');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleUpdateWorkspacePlan = async (workspaceId: string, newPlan: string | null) => {
    setUpdatingWorkspaceId(workspaceId);
    try {
      const res = await fetch('/api/admin/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateWorkspacePlan',
          workspaceId,
          targetPlan: newPlan
        })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update plan');
      }
      toast.success('Workspace plan updated successfully');
      await fetchAdminData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update workspace plan');
    } finally {
      setUpdatingWorkspaceId(null);
    }
  };

  const handleDeleteUser = async (targetUserId: string) => {
    if (targetUserId === userId) {
      toast.error('You cannot delete your own account!');
      return;
    }
    setDeletingUserId(targetUserId);
    try {
      const res = await fetch('/api/admin/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'deleteUser',
          userId: targetUserId
        })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete user');
      }
      toast.success('User deleted successfully');
      await fetchAdminData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete user');
    } finally {
      setDeletingUserId(null);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail || !newUserPassword) {
      toast.error('Please fill in all required fields.');
      return;
    }
    setAddingUser(true);
    try {
      const res = await fetch('/api/admin/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'createUser',
          email: newUserEmail.trim(),
          password: newUserPassword,
          fullName: newUserFullName.trim(),
          menuAccess: newUserMenuAccess
        })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create user');
      }
      toast.success('New user created successfully!');
      setShowAddModal(false);
      setNewUserFullName('');
      setNewUserEmail('');
      setNewUserPassword('');
      await fetchAdminData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create user');
    } finally {
      setAddingUser(false);
    }
  };

  const handleSavePermissions = async () => {
    if (!editingPermissionsProfile) return;
    setUpdatingPermissions(true);
    try {
      const res = await fetch('/api/admin/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateRole',
          userId: editingPermissionsProfile.user_id || editingPermissionsProfile.id,
          targetRole: editingPermissionsProfile.account_role,
          menuAccess: editingMenuAccess
        })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update permissions');
      }
      toast.success('Permissions updated successfully');
      await fetchAdminData();
      setEditingPermissionsProfile(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update permissions');
    } finally {
      setUpdatingPermissions(false);
    }
  };
  const handleSavePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!packageName.trim() || !packageCode.trim()) {
      toast.error("Name and Code are required.");
      return;
    }
    setSavingPackage(true);
    try {
      const isEdit = !!editingPackage;
      const res = await fetch('/api/admin/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: isEdit ? 'updatePackage' : 'createPackage',
          packageId: editingPackage?.id,
          name: packageName.trim(),
          code: packageCode.trim(),
          price: packagePrice.trim(),
          features: packageFeatures,
          duration: packageDuration,
          allowedMenus: packageAllowedMenus,
        })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save package');
      }
      toast.success(isEdit ? 'Package updated successfully!' : 'Package created successfully!');
      setShowPackageModal(false);
      setEditingPackage(null);
      await fetchAdminData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save package');
    } finally {
      setSavingPackage(false);
    }
  };

  const handleDeletePackage = async (packageId: string) => {
    setDeletingPackageId(packageId);
    try {
      const res = await fetch('/api/admin/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'deletePackage',
          packageId
        })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete package');
      }
      toast.success('Package deleted successfully');
      await fetchAdminData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete package');
    } finally {
      setDeletingPackageId(null);
    }
  };

  const openCreatePackageModal = () => {
    setEditingPackage(null);
    setPackageName('');
    setPackageCode('');
    setPackagePrice('');
    setPackageFeatures([]);
    setPackageDuration('30 Days');
    setPackageAllowedMenus([]);
    setNewFeatureText('');
    setShowPackageModal(true);
  };

  const openEditPackageModal = (pkg: Package) => {
    setEditingPackage(pkg);
    setPackageName(pkg.name);
    setPackageCode(pkg.code);
    setPackagePrice(pkg.price);
    setPackageFeatures(pkg.features || []);
    setPackageDuration(pkg.duration || '30 Days');
    setPackageAllowedMenus(pkg.allowed_menus || []);
    setNewFeatureText('');
    setShowPackageModal(true);
  };

  const addFeature = () => {
    if (newFeatureText.trim() && !packageFeatures.includes(newFeatureText.trim())) {
      setPackageFeatures([...packageFeatures, newFeatureText.trim()]);
      setNewFeatureText('');
    }
  };

  const removeFeature = (idx: number) => {
    setPackageFeatures(packageFeatures.filter((_, i) => i !== idx));
  };
  const handleGenerateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneratingKey(true);
    try {
      const res = await fetch('/api/admin/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generateLicenseKey',
          plan: newKeyPlan,
          duration: newKeyDuration,
          maxActivations: newKeyMaxActivations,
          notes: newKeyNotes || null,
          expiryDate: newKeyCustomExpiry || null,
        })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to generate key');
      }
      toast.success('License key generated successfully!');
      setShowGenerateKeyModal(false);
      setNewKeyNotes('');
      setNewKeyCustomExpiry('');
      setNewKeyMaxActivations(1);
      await fetchAdminData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate key');
    } finally {
      setGeneratingKey(false);
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    setDeletingKeyId(keyId);
    try {
      const res = await fetch('/api/admin/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'deleteLicenseKey',
          keyId
        })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete key');
      }
      toast.success('License key deleted successfully');
      await fetchAdminData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete key');
    } finally {
      setDeletingKeyId(null);
    }
  };

  const handleDeactivateKey = async (keyId: string) => {
    try {
      const res = await fetch('/api/admin/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'deactivateLicenseKey',
          keyId
        })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to deactivate key');
      }
      toast.success('License key deactivated successfully');
      await fetchAdminData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to deactivate key');
    }
  };

  if (profileLoading || (loading && (accountRole === 'admin' || accountRole === 'owner'))) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-muted-foreground gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium">Loading Admin Panel...</p>
      </div>
    );
  }

  // Access check: Only the super admin (admin@avorex.com) can access the Admin Panel
  if (user?.email !== 'admin@avorex.com') {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center px-4 max-w-md mx-auto">
        <div className="h-16 w-16 bg-destructive/10 text-destructive flex items-center justify-center rounded-full mb-6">
          <Lock className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Access Denied</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          You must have Super Administrator privileges to view the global Admin Panel.
        </p>
        <Button onClick={() => router.push('/dashboard')} className="mt-6">
          Return to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary animate-pulse" />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Admin Panel
          </h1>
        </div>
        <div className="rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-semibold text-primary">
          Global Control Mode
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Global management dashboard. Generate license keys, manage user accounts, and verify workspace tiers.
      </p>

      {/* Tabs */}
      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="bg-muted/60 p-1 rounded-xl gap-1">
          <TabsTrigger value="dashboard" className="rounded-lg gap-1.5"><BarChart3 className="h-4.5 w-4.5" /> Dashboard</TabsTrigger>
          <TabsTrigger value="users" className="rounded-lg gap-1.5"><Users className="h-4.5 w-4.5" /> Users ({data?.profiles.length || 0})</TabsTrigger>
          <TabsTrigger value="transactions" className="rounded-lg gap-1.5 relative">
            <CreditCard className="h-4.5 w-4.5" /> 
            Transactions
            {data && data.pendingTransactionsCount && data.pendingTransactionsCount > 0 ? (
              <span className="ml-1.5 flex h-4.5 px-1.5 min-w-[18px] items-center justify-center rounded-full bg-red-500 text-[9px] font-black text-white ring-2 ring-background animate-pulse">
                {data.pendingTransactionsCount}
              </span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="keys" className="rounded-lg gap-1.5"><KeyRound className="h-4.5 w-4.5" /> License Keys ({data?.licenseKeys?.length || 0})</TabsTrigger>
          <TabsTrigger value="packages" className="rounded-lg gap-1.5"><Layers className="h-4.5 w-4.5" /> Packages ({data?.packages?.length || 0})</TabsTrigger>
          <TabsTrigger value="branding" className="rounded-lg gap-1.5"><Settings className="h-4.5 w-4.5" /> Branding & Payment</TabsTrigger>
        </TabsList>

        {/* Tab 0: Dashboard Stats */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-border/60 bg-card/65">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Users</p>
                    <p className="text-3xl font-black text-foreground mt-1">{data?.stats?.totalUsers || data?.profiles?.length || 0}</p>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-blue-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/60 bg-card/65">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Licenses</p>
                    <p className="text-3xl font-black text-emerald-500 mt-1">{data?.stats?.activeLicenses || 0}</p>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-emerald-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/60 bg-card/65">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Expired Licenses</p>
                    <p className="text-3xl font-black text-red-500 mt-1">{data?.stats?.expiredLicenses || 0}</p>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/60 bg-card/65">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pending Activation</p>
                    <p className="text-3xl font-black text-amber-500 mt-1">{data?.stats?.pendingActivations || 0}</p>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-amber-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Package Distribution */}
          <Card className="border-border/60 bg-card/65">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <Layers className="h-4.5 w-4.5 text-primary" /> Package Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-3">
                {data?.stats?.packageDistribution && Object.entries(data.stats.packageDistribution).length > 0 ? (
                  Object.entries(data.stats.packageDistribution).map(([plan, count]) => (
                    <div key={plan} className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 p-4">
                      <span className="text-sm font-semibold text-foreground">{plan}</span>
                      <span className="text-lg font-bold text-primary">{count as number}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground col-span-3 text-center py-4">No distribution data available.</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border-border/60 bg-card/65">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold text-foreground uppercase tracking-wider">Recently Registered Users</CardTitle>
              </CardHeader>
              <CardContent>
                {data?.stats?.recentUsers && data.stats.recentUsers.length > 0 ? (
                  <div className="space-y-3">
                    {data.stats.recentUsers.map((u) => (
                      <div key={u.id} className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/10 p-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">{u.full_name || 'No Name'}</p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </div>
                        <span className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No users yet.</p>
                )}
              </CardContent>
            </Card>
            <Card className="border-border/60 bg-card/65">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold text-foreground uppercase tracking-wider">Recently Generated Keys</CardTitle>
              </CardHeader>
              <CardContent>
                {data?.stats?.recentLicenses && data.stats.recentLicenses.length > 0 ? (
                  <div className="space-y-3">
                    {data.stats.recentLicenses.map((k) => (
                      <div key={k.id} className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/10 p-3">
                        <div>
                          <p className="text-sm font-mono font-bold text-foreground">{k.key_code}</p>
                          <p className="text-xs text-muted-foreground">{k.plan} - {k.status}</p>
                        </div>
                        <span className="text-xs text-muted-foreground">{new Date(k.created_at).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No keys generated yet.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 2: Users Management */}
        <TabsContent value="users" className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users by name, email, or role..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10"
                />
              </div>
              {searchQuery && (
                <Button variant="ghost" onClick={() => setSearchQuery('')} className="h-10">
                  Clear
                </Button>
              )}

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-semibold">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                {activeSessionsCount} Active {activeSessionsCount === 1 ? 'User' : 'Users'}
              </div>
            </div>
            
            <Button onClick={() => setShowAddModal(true)} className="h-10 gap-1.5 rounded-xl">
              <UserPlus className="h-4 w-4" /> Add User
            </Button>
          </div>

          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full min-w-[600px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-muted-foreground font-medium">
                    <th className="p-4">Name</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Joined Date</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-muted-foreground">
                        No users found matching your search.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((userProfile) => {
                      const isSelf = userProfile.user_id === userId;
                      const uId = (userProfile.user_id || userProfile.id) as string;
                      return (
                        <tr key={userProfile.id} className="hover:bg-muted/20 transition-colors">
                          <td className="p-4 font-medium text-foreground flex items-center gap-2">
                            <span 
                              className={cn(
                                "h-2 w-2 rounded-full",
                                isUserOnline(userProfile.user_id || userProfile.id) ? "bg-emerald-500 shadow-[0_0_8px_#10b981]" : "bg-muted-foreground/30"
                              )}
                              title={isUserOnline(userProfile.user_id || userProfile.id) ? "Online" : "Offline"}
                            />
                            <div>
                              <span 
                                onClick={() => {
                                  setSelectedDetailUser(userProfile);
                                  setSelectedUserPayments([]);
                                  setLoadingPayments(true);
                                  fetch(`/api/admin/payment-requests?query=${encodeURIComponent(userProfile.email)}`)
                                    .then(res => res.json())
                                    .then(data => {
                                      setSelectedUserPayments(data || []);
                                      setLoadingPayments(false);
                                    })
                                    .catch(() => setLoadingPayments(false));
                                }}
                                className="hover:underline hover:text-primary cursor-pointer font-bold text-foreground transition-colors"
                              >
                                {userProfile.full_name || 'No Name'}
                              </span>
                              {isSelf && <span className="ml-1.5 inline-flex items-center rounded-full bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-medium text-blue-500">You</span>}
                            </div>
                          </td>
                          <td className="p-4 text-muted-foreground">{userProfile.email}</td>
                          <td className="p-4 text-muted-foreground text-xs">
                            {new Date(userProfile.created_at).toLocaleDateString()}
                          </td>
                          <td className="p-4 text-right flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-primary hover:bg-primary/10 hover:text-primary disabled:opacity-50"
                              disabled={isSelf}
                              onClick={() => {
                                setEditingPermissionsProfile(userProfile);
                                setEditingMenuAccess(userProfile.menu_access || [
                                  'dashboard', 'inbox', 'notifications', 'contacts', 'pipelines', 'broadcasts', 'automations', 'flows', 'agents'
                                ]);
                              }}
                              title="Edit Menu Permissions"
                            >
                              <Shield className="h-4 w-4" />
                            </Button>
                            
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive h-8 w-8 disabled:opacity-50"
                              disabled={isSelf || deletingUserId === uId}
                              onClick={() => {
                                if (confirm(`Are you sure you want to delete ${userProfile.email} from the system?`)) {
                                  handleDeleteUser(uId);
                                }
                              }}
                              title="Delete User"
                            >
                              {deletingUserId === uId ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>



        {/* Tab 3: License Keys Management */}
        <TabsContent value="keys" className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">License Key Inventory</h2>
            <Button onClick={() => setShowGenerateKeyModal(true)} className="h-10 gap-1.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg">
              <KeyRound className="h-4 w-4" /> Generate License Key
            </Button>
          </div>

          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full min-w-[800px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-muted-foreground font-medium">
                    <th className="p-4">License Key</th>
                    <th className="p-4">Package</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Activations</th>
                    <th className="p-4">Expiry</th>
                    <th className="p-4">Redeemed By</th>
                    <th className="p-4">Generated</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {!data?.licenseKeys || data.licenseKeys.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-muted-foreground">
                        No license keys generated yet. Click &quot;Generate License Key&quot; to create one.
                      </td>
                    </tr>
                  ) : (
                    data.licenseKeys.map((keyObj) => {
                      const isUsed = keyObj.status === 'used';
                      const isDisabled = keyObj.status === 'disabled';
                      const isExpired = keyObj.expiry_date && new Date(keyObj.expiry_date) < new Date();
                      
                      return (
                        <tr key={keyObj.id} className="hover:bg-muted/20 transition-colors">
                          <td className="p-4 font-mono font-bold text-foreground flex items-center gap-2">
                            <span>{keyObj.key_code}</span>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6 text-muted-foreground hover:text-foreground"
                              onClick={() => {
                                navigator.clipboard.writeText(keyObj.key_code);
                                toast.success("Key copied to clipboard!");
                              }}
                              title="Copy Key"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                          <td className="p-4">
                            <span className={cn(
                              "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                              (keyObj.plan === 'Max' || keyObj.plan === 'Enterprise') ? 'bg-purple-500/10 text-purple-500' :
                              keyObj.plan === 'Premium' ? 'bg-blue-500/10 text-blue-500' :
                              'bg-zinc-500/10 text-zinc-500'
                            )}>
                              {keyObj.plan === 'Enterprise' ? 'Max' : keyObj.plan}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className={cn(
                              "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                              isDisabled ? "bg-red-500/10 text-red-500" :
                              isExpired ? "bg-amber-500/10 text-amber-500" :
                              isUsed ? "bg-blue-500/10 text-blue-500" :
                              "bg-emerald-500/10 text-emerald-500"
                            )}>
                              {isExpired && !isDisabled ? 'expired' : keyObj.status}
                            </span>
                          </td>
                          <td className="p-4 text-xs text-muted-foreground">
                            {keyObj.activation_count || 0} / {keyObj.max_activations || 1}
                          </td>
                          <td className="p-4 text-xs text-muted-foreground">
                            {keyObj.expiry_date ? new Date(keyObj.expiry_date).toLocaleDateString() : 'No expiry'}
                          </td>
                          <td className="p-4 font-mono text-xs text-muted-foreground truncate max-w-[120px]" title={keyObj.workspace_id || 'Not redeemed'}>
                            {keyObj.workspace_id ? keyObj.workspace_id.substring(0, 8) + '...' : '-'}
                          </td>
                          <td className="p-4 text-muted-foreground text-xs">
                            {new Date(keyObj.created_at).toLocaleDateString()}
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {keyObj.status === 'used' && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-amber-500 hover:bg-amber-500/10 hover:text-amber-500 h-8 w-8 disabled:opacity-50"
                                  onClick={() => {
                                    if (confirm(`Deactivate license key ${keyObj.key_code}? This will remove access for the bound workspace.`)) {
                                      handleDeactivateKey(keyObj.id);
                                    }
                                  }}
                                  title="Deactivate Key"
                                >
                                  <Ban className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive h-8 w-8 disabled:opacity-50"
                                disabled={deletingKeyId === keyObj.id}
                                onClick={() => {
                                  if (confirm(`Are you sure you want to delete license key ${keyObj.key_code}?`)) {
                                    handleDeleteKey(keyObj.id);
                                  }
                                }}
                                title="Delete Key"
                              >
                                {deletingKeyId === keyObj.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Removed Plan Features Guide */}
        </TabsContent>

        {/* Tab 3: Transactions */}
        <TabsContent value="transactions" className="space-y-6">
          <TransactionsTab />
        </TabsContent>

        {/* Tab 4: Packages Management */}
        <TabsContent value="packages" className="space-y-6">
          <PackagesManagementTab />
        </TabsContent>

        {/* Tab 5: Branding & Settings */}
        <TabsContent value="branding" className="space-y-6">
          <BrandingSettingsTab />
        </TabsContent>
      </Tabs>

      {/* Add User Modal */}
      {showAddModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300"
          onClick={() => setShowAddModal(false)}
        >
          <div 
            className="w-full max-w-md rounded-[24px] border border-border/80 bg-card/95 backdrop-blur-md p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-300 relative text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-foreground mb-6">Add New User</h3>
            
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Full Name</label>
                <Input 
                  placeholder="e.g. John Doe"
                  value={newUserFullName}
                  onChange={(e) => setNewUserFullName(e.target.value)}
                  className="h-10 rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Email Address *</label>
                <Input 
                  type="email"
                  placeholder="e.g. john@avorex.com"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  required
                  className="h-10 rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Password *</label>
                <Input 
                  type="password"
                  placeholder="At least 6 characters"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  required
                  className="h-10 rounded-xl"
                />
              </div>

              <div className="flex gap-3 justify-end border-t border-border pt-4 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddModal(false)}
                  className="w-28 h-10 rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={addingUser}
                  className="w-40 h-10 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
                >
                  {addingUser ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create User'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Permissions Modal */}
      {editingPermissionsProfile && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setEditingPermissionsProfile(null)}
        >
          <div 
            className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 relative text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-foreground">Edit Menu Permissions</h3>
            <p className="text-xs text-muted-foreground mt-1 mb-4">
              Configure sidebar menu items visible to <span className="font-semibold text-foreground">{editingPermissionsProfile.email}</span>
            </p>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Sidebar Menu Permissions</label>
                <div className="grid grid-cols-2 gap-2 mt-1 max-h-[200px] overflow-y-auto border border-border rounded-lg p-2.5 bg-muted/20">
                  {SIDEBAR_MENUS.map((menu) => {
                    const checked = editingMenuAccess.includes(menu.id);
                    return (
                      <label key={menu.id} className="flex items-center gap-2 text-xs font-medium cursor-pointer hover:bg-muted/40 p-1.5 rounded transition-colors">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            if (checked) {
                              setEditingMenuAccess(editingMenuAccess.filter(id => id !== menu.id));
                            } else {
                              setEditingMenuAccess([...editingMenuAccess, menu.id]);
                            }
                          }}
                          className="rounded border-gray-300 text-primary focus:ring-primary h-3.5 w-3.5"
                        />
                        {menu.label}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingPermissionsProfile(null)}
                  className="flex-1 h-10 rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSavePermissions}
                  disabled={updatingPermissions}
                  className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {updatingPermissions ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Permissions'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Details & Activities Modal */}
      {selectedDetailUser && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedDetailUser(null)}
        >
          <div 
            className="w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 relative text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button 
              onClick={() => setSelectedDetailUser(null)}
              className="absolute top-4 right-4 h-8 w-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="h-12 w-12 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-black text-lg">
                {(selectedDetailUser.full_name || selectedDetailUser.email || 'U')[0].toUpperCase()}
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground leading-none">
                  {selectedDetailUser.full_name || 'No Name'}
                </h3>
                <p className="text-xs text-muted-foreground mt-1.5">
                  {selectedDetailUser.email}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Account Details */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-primary uppercase tracking-wider border-b border-border pb-1">
                  Account Details
                </h4>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase">System Role</span>
                    <span className="font-semibold text-foreground capitalize">{selectedDetailUser.account_role}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase">Joined Date</span>
                    <span className="font-semibold text-foreground">
                      {new Date(selectedDetailUser.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Plan/Package Selector */}
                <div className="space-y-1.5 pt-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Workspace Plan / Package</label>
                  <Select
                    defaultValue={selectedDetailUser.plan || 'Standard'}
                    onValueChange={(val) => {
                      handleUpdateWorkspacePlan(selectedDetailUser.account_id, val);
                      setSelectedDetailUser(prev => prev ? { ...prev, plan: val as any } : null);
                    }}
                    disabled={updatingWorkspaceId === selectedDetailUser.account_id || !selectedDetailUser.account_id}
                  >
                    <SelectTrigger className="w-full h-10 text-xs font-semibold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Standard">Standard</SelectItem>
                      <SelectItem value="Premium">Premium</SelectItem>
                      <SelectItem value="Enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground leading-normal">
                    Changing this updates the user's workspace tier limits in real-time.
                  </p>
                </div>
              </div>

              {/* Right Column: License details */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-primary uppercase tracking-wider border-b border-border pb-1">
                  License Keys Details
                </h4>

                {(() => {
                  const activeLicense = data?.licenseKeys?.find(
                    (k) => k.user_id === selectedDetailUser.user_id || k.workspace_id === selectedDetailUser.account_id
                  );

                  if (activeLicense) {
                    return (
                      <div className="space-y-2.5 bg-muted/20 border border-border p-3.5 rounded-xl text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">License Key:</span>
                          <span className="font-mono font-bold text-foreground select-all bg-muted/65 px-2 py-1 rounded border border-border/40">{activeLicense.key_code}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Package Tier:</span>
                          <span className="font-semibold text-foreground uppercase text-[10px] bg-primary/10 border border-primary/20 text-primary px-2 py-0.5 rounded-md">
                            {activeLicense.plan === 'Enterprise' ? 'Max' : activeLicense.plan}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Status:</span>
                          <span className={cn(
                            "font-semibold capitalize",
                            activeLicense.status === 'active' ? "text-emerald-500" : "text-amber-500"
                          )}>{activeLicense.status}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Expiry Date:</span>
                          <span className="font-semibold text-foreground">
                            {activeLicense.expiry_date ? new Date(activeLicense.expiry_date).toLocaleDateString() : 'No expiry'}
                          </span>
                        </div>
                        {activeLicense.notes && (
                          <div className="border-t border-border/40 pt-2 mt-2">
                            <span className="text-muted-foreground block text-[10px] uppercase">Notes:</span>
                            <p className="text-foreground mt-0.5 text-xs italic">{activeLicense.notes}</p>
                          </div>
                        )}

                        {extendingLicenseId === activeLicense.id ? (
                          <div className="border-t border-border/40 pt-3 mt-3 space-y-2">
                            <span className="text-muted-foreground block text-[10px] uppercase font-bold text-primary">মেয়াদ বাড়ান (Extend License Validity)</span>
                            <div className="flex gap-2">
                              {([30, 90, 365]).map((days) => (
                                <button
                                  key={days}
                                  type="button"
                                  onClick={() => setExtensionDays(days)}
                                  className={cn(
                                    "flex-1 py-1 border rounded text-[10px] font-bold transition-all",
                                    extensionDays === days ? "border-primary bg-primary/10 text-white font-bold" : "border-border text-zinc-400 bg-muted/10"
                                  )}
                                >
                                  +{days} Days
                                </button>
                              ))}
                            </div>
                            <div className="flex gap-2 pt-1">
                              <Button
                                size="sm"
                                type="button"
                                variant="outline"
                                onClick={() => setExtendingLicenseId(null)}
                                className="flex-1 text-[10px] h-7"
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                type="button"
                                disabled={extending}
                                onClick={async () => {
                                  setExtending(true);
                                  try {
                                    const res = await fetch('/api/admin/data', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        action: 'extendLicense',
                                        licenseId: activeLicense.id,
                                        workspaceId: selectedDetailUser.account_id,
                                        daysToAdd: extensionDays
                                      })
                                    });
                                    if (res.ok) {
                                      toast.success("লাইসেন্সের মেয়াদ বাড়ানো হয়েছে!");
                                      setExtendingLicenseId(null);
                                      fetchAdminData();
                                      setSelectedDetailUser(null);
                                    } else {
                                      const err = await res.json();
                                      throw new Error(err.error || "Failed to extend license");
                                    }
                                  } catch (err: any) {
                                    toast.error(err.message);
                                  } finally {
                                    setExtending(false);
                                  }
                                }}
                                className="flex-1 text-[10px] h-7 bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
                              >
                                {extending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Extend & Save'}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setExtendingLicenseId(activeLicense.id);
                              setExtensionDays(30);
                            }}
                            className="w-full mt-3 h-8 text-[11px] font-bold border-primary/20 hover:border-primary/45 hover:bg-primary/5 text-primary rounded-xl"
                          >
                            Extend Validity (মেয়াদ বাড়ান)
                          </Button>
                        )}
                      </div>
                    );
                  }

                  return (
                    <div className="p-4 border border-dashed border-border rounded-xl text-center text-xs text-muted-foreground">
                      <AlertTriangle className="h-5 w-5 text-amber-500 mx-auto mb-1.5" />
                      No active digital license key linked to this user.
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Bottom Row: Purchase & Activities log */}
            <div className="mt-6 space-y-3">
              <h4 className="text-xs font-black text-primary uppercase tracking-wider border-b border-border pb-1">
                Payment & Activities History
              </h4>

              <div className="border border-border rounded-xl overflow-hidden bg-muted/10 max-h-[180px] overflow-y-auto">
                {loadingPayments ? (
                  <div className="p-6 text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" /> Loading user activities...
                  </div>
                ) : selectedUserPayments.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground">
                    No billing request activities found for this user.
                  </div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                        <th className="p-2.5">Date</th>
                        <th className="p-2.5">Package</th>
                        <th className="p-2.5">Method</th>
                        <th className="p-2.5">Amount</th>
                        <th className="p-2.5">Status</th>
                        <th className="p-2.5">Transaction ID</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {selectedUserPayments.map((p) => (
                        <tr key={p.id} className="hover:bg-muted/10">
                          <td className="p-2.5 text-muted-foreground whitespace-nowrap">
                            {new Date(p.submitted_at).toLocaleDateString()}
                          </td>
                          <td className="p-2.5 font-medium text-foreground">{p.package_name}</td>
                          <td className="p-2.5 text-muted-foreground uppercase">{p.payment_method}</td>
                          <td className="p-2.5 font-bold text-foreground">৳{p.paid_amount}</td>
                          <td className="p-2.5">
                            <span className={cn(
                              "inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold border",
                              p.status === 'Approved' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" :
                              p.status === 'Pending' ? "bg-amber-500/10 border-amber-500/20 text-amber-500" :
                              "bg-red-500/10 border-red-500/20 text-red-500"
                            )}>
                              {p.status}
                            </span>
                          </td>
                          <td className="p-2.5 font-mono text-[10px] text-muted-foreground select-all">{p.transaction_id}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedDetailUser(null)}
                className="px-6 h-9 rounded-xl text-xs font-semibold"
              >
                Close Details
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Generate License Key Modal */}
      {showGenerateKeyModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setShowGenerateKeyModal(false)}
        >
          <div 
            className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 relative text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-foreground mb-4">Generate License Key</h3>
            
            <form onSubmit={handleGenerateKey} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Package Tier *</label>
                  <Select value={newKeyPlan} onValueChange={(v) => v && setNewKeyPlan(v)}>
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {data?.packages?.map((pkg) => (
                        <SelectItem key={pkg.id} value={pkg.code}>{pkg.name}</SelectItem>
                      ))}
                      {(!data?.packages || data.packages.length === 0) && (
                        <>
                          <SelectItem value="Starter">Starter</SelectItem>
                          <SelectItem value="Premium">Premium</SelectItem>
                          <SelectItem value="Max">Max</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Duration *</label>
                  <Select value={newKeyDuration} onValueChange={(v) => v && setNewKeyDuration(v)}>
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7 Days">7 Days</SelectItem>
                      <SelectItem value="30 Days">30 Days</SelectItem>
                      <SelectItem value="90 Days">90 Days</SelectItem>
                      <SelectItem value="180 Days">180 Days</SelectItem>
                      <SelectItem value="1 Year">1 Year</SelectItem>
                      <SelectItem value="Lifetime">Lifetime</SelectItem>
                      <SelectItem value="Custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {newKeyDuration === 'Custom' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Custom Expiry Date</label>
                  <Input
                    type="datetime-local"
                    value={newKeyCustomExpiry}
                    onChange={(e) => setNewKeyCustomExpiry(e.target.value)}
                    className="h-10"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Max Activations</label>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={newKeyMaxActivations}
                    onChange={(e) => setNewKeyMaxActivations(parseInt(e.target.value) || 1)}
                    className="h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Notes (optional)</label>
                  <Input
                    placeholder="Internal notes..."
                    value={newKeyNotes}
                    onChange={(e) => setNewKeyNotes(e.target.value)}
                    className="h-10"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowGenerateKeyModal(false)}
                  className="flex-1 h-10 rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={generatingKey}
                  className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {generatingKey ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Generate Key'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create/Edit Package Modal */}
      {showPackageModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300"
          onClick={() => setShowPackageModal(false)}
        >
          <div 
            className="w-full max-w-lg rounded-[24px] border border-border/80 bg-card/95 backdrop-blur-md p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-300 relative text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-foreground mb-4">
              {editingPackage ? 'Edit Package' : 'Create Package'}
            </h3>
            
            <form onSubmit={handleSavePackage} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Package Name *</label>
                  <Input 
                    placeholder="e.g. Starter Plan"
                    value={packageName}
                    onChange={(e) => setPackageName(e.target.value)}
                    required
                    className="h-10 rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Code (Unique identifier) *</label>
                  <Input 
                    placeholder="e.g. Starter"
                    value={packageCode}
                    onChange={(e) => setPackageCode(e.target.value)}
                    required
                    className="h-10 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Price *</label>
                  <Input 
                    placeholder="e.g. $49/mo or Custom"
                    value={packagePrice}
                    onChange={(e) => setPackagePrice(e.target.value)}
                    required
                    className="h-10 rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Default Duration</label>
                  <Select value={packageDuration} onValueChange={(v) => v && setPackageDuration(v)}>
                    <SelectTrigger className="h-10 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7 Days">7 Days</SelectItem>
                      <SelectItem value="30 Days">30 Days</SelectItem>
                      <SelectItem value="90 Days">90 Days</SelectItem>
                      <SelectItem value="180 Days">180 Days</SelectItem>
                      <SelectItem value="1 Year">1 Year</SelectItem>
                      <SelectItem value="Lifetime">Lifetime</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Package Features</label>
                <div className="flex gap-2">
                  <Input 
                    placeholder="Add a feature requirement..."
                    value={newFeatureText}
                    onChange={(e) => setNewFeatureText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addFeature();
                      }
                    }}
                    className="h-10 rounded-xl flex-1"
                  />
                  <Button type="button" onClick={addFeature} className="h-10 rounded-xl bg-primary text-primary-foreground">
                    Add
                  </Button>
                </div>

                <div className="flex flex-wrap gap-1.5 mt-2.5 max-h-[140px] overflow-y-auto border border-border/80 rounded-xl p-2.5 bg-muted/20">
                  {packageFeatures.length === 0 ? (
                    <span className="text-xs text-muted-foreground italic">No features added yet.</span>
                  ) : (
                    packageFeatures.map((feat, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1 bg-primary/10 border border-primary/20 text-primary text-xs font-medium px-2 py-0.5 rounded-full">
                        <span>{feat}</span>
                        <button type="button" onClick={() => removeFeature(idx)} className="text-primary hover:text-red-500 font-bold ml-0.5 text-xs">
                          ×
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Allowed Menus</label>
                <div className="grid grid-cols-2 gap-2 mt-1 max-h-[160px] overflow-y-auto border border-border rounded-xl p-2.5 bg-muted/20">
                  {SIDEBAR_MENUS.map((menu) => {
                    const checked = packageAllowedMenus.includes(menu.id);
                    return (
                      <label key={menu.id} className="flex items-center gap-2 text-xs font-medium cursor-pointer hover:bg-muted/40 p-1.5 rounded transition-colors">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            if (checked) {
                              setPackageAllowedMenus(packageAllowedMenus.filter(id => id !== menu.id));
                            } else {
                              setPackageAllowedMenus([...packageAllowedMenus, menu.id]);
                            }
                          }}
                          className="rounded border-gray-300 text-primary focus:ring-primary h-3.5 w-3.5"
                        />
                        {menu.label}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3 justify-end border-t border-border pt-4 mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPackageModal(false)}
                  className="w-28 h-10 rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={savingPackage}
                  className="w-40 h-10 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
                >
                  {savingPackage ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Package'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
