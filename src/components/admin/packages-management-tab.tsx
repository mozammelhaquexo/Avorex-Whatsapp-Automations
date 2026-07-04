'use client';

import { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Check, 
  X, 
  Loader2, 
  Layers, 
  Coins, 
  Monitor, 
  Sparkles, 
  Crown, 
  Zap,
  Menu,
  CheckSquare,
  Square
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Package {
  id: string;
  name: string;
  code: string;
  features: string[];
  price: string;
  price_bdt: number;
  duration_days: number;
  device_limit: number;
  popular_badge: boolean;
  display_order: number;
  allowed_menus: string[];
  allowed_submenus: string[];
  is_active: boolean;
  created_at: string;
}

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

export function PackagesManagementTab() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);

  // Form States
  const [showModal, setShowModal] = useState(false);
  const [editingPkg, setEditingPkg] = useState<Package | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [price, setPrice] = useState('');
  const [priceBdt, setPriceBdt] = useState(0);
  const [durationDays, setDurationDays] = useState(30);
  const [deviceLimit, setDeviceLimit] = useState(1);
  const [popularBadge, setPopularBadge] = useState(false);
  const [displayOrder, setDisplayOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [features, setFeatures] = useState<string[]>([]);
  const [allowedMenus, setAllowedMenus] = useState<string[]>([]);
  
  const [newFeatureText, setNewFeatureText] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchPackages = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/data');
      if (res.ok) {
        const data = await res.json();
        setPackages(data.packages || []);
      }
    } catch (err) {
      console.error(err);
      toast.error('প্যাকেজসমূহ লোড করা যায়নি');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  const openCreateModal = () => {
    setEditingPkg(null);
    setName('');
    setCode('');
    setPrice('');
    setPriceBdt(0);
    setDurationDays(30);
    setDeviceLimit(1);
    setPopularBadge(false);
    setDisplayOrder(0);
    setIsActive(true);
    setFeatures([]);
    setAllowedMenus([]);
    setShowModal(true);
  };

  const openEditModal = (pkg: Package) => {
    setEditingPkg(pkg);
    setName(pkg.name || '');
    setCode(pkg.code || '');
    setPrice(pkg.price || '');
    setPriceBdt(pkg.price_bdt || 0);
    setDurationDays(pkg.duration_days || 30);
    setDeviceLimit(pkg.device_limit || 1);
    setPopularBadge(!!pkg.popular_badge);
    setDisplayOrder(pkg.display_order || 0);
    setIsActive(!!pkg.is_active);
    setFeatures(pkg.features || []);
    setAllowedMenus(pkg.allowed_menus || []);
    setShowModal(true);
  };

  const handleToggleMenu = (menuId: string) => {
    if (allowedMenus.includes(menuId)) {
      setAllowedMenus(allowedMenus.filter(m => m !== menuId));
    } else {
      setAllowedMenus([...allowedMenus, menuId]);
    }
  };

  const handleAddFeature = () => {
    if (newFeatureText.trim()) {
      setFeatures([...features, newFeatureText.trim()]);
      setNewFeatureText('');
    }
  };

  const handleRemoveFeature = (index: number) => {
    setFeatures(features.filter((_, i) => i !== index));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim() || priceBdt <= 0) {
      toast.error('নাম, কোড এবং সঠিক BDT মূল্য দিন।');
      return;
    }

    setSaving(true);
    try {
      const isEdit = !!editingPkg;
      const res = await fetch('/api/admin/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: isEdit ? 'updatePackage' : 'createPackage',
          packageId: editingPkg?.id,
          name: name.trim(),
          code: code.trim(),
          price: price.trim() || `৳${priceBdt} BDT`,
          priceBdt,
          durationDays,
          deviceLimit,
          popularBadge,
          displayOrder,
          isActive,
          features,
          allowedMenus,
          allowedSubmenus: []
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'প্যাকেজ সেভ করা যায়নি');
      }

      toast.success(isEdit ? 'প্যাকেজ আপডেট করা হয়েছে!' : 'প্যাকেজ তৈরি করা হয়েছে!');
      setShowModal(false);
      fetchPackages();
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || 'প্যাকেজ সেভ করার সময় ত্রুটি হয়েছে');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (packageId: string) => {
    if (!confirm('আপনি কি নিশ্চিত যে আপনি এই প্যাকেজটি ডিলিট করতে চান?')) return;
    setDeletingId(packageId);
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
        throw new Error(err.error || 'প্যাকেজ ডিলিট করা যায়নি');
      }
      toast.success('প্যাকেজ সফলভাবে ডিলিট হয়েছে');
      fetchPackages();
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || 'ডিলিট করার সময় ত্রুটি হয়েছে');
    } finally {
      setDeletingId(null);
    }
  };

  const getPackageIcon = (code: string) => {
    if (code === 'Max' || code === 'Enterprise') return <Crown className="h-5 w-5 text-violet-400" />;
    if (code === 'Premium') return <Zap className="h-5 w-5 text-blue-400" />;
    return <Sparkles className="h-5 w-5 text-zinc-400" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            প্যাকেজ ম্যানেজমেন্ট (Package Management)
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Sponsor/Client-এর মূল্য এবং মডিউল পারমিশন সম্বলিত প্যাকেজগুলো কনফিগার করুন।
          </p>
        </div>
        <Button onClick={openCreateModal} className="bg-primary hover:bg-primary/95 text-white gap-1.5 font-bold">
          <Plus className="h-4 w-4" /> নতুন প্যাকেজ যোগ করুন
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : packages.length === 0 ? (
        <Card className="border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/10">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="h-12 w-12 rounded-xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center border border-zinc-200 dark:border-zinc-800">
              <Layers className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">কোনো প্যাকেজ পাওয়া যায়নি</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                ড্যাশবোর্ডে যোগ করার জন্য একটি নতুন প্যাকেজ তৈরি করুন।
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-3">
          {packages.map((pkg) => (
            <Card key={pkg.id} className={cn(
              "border bg-zinc-50/40 dark:bg-zinc-950/20 overflow-hidden relative group transition-all duration-300",
              pkg.popular_badge ? "border-primary/40 shadow-[0_0_20px_rgba(59,130,246,0.1)]" : "border-zinc-200 dark:border-zinc-850",
              !pkg.is_active && "opacity-60"
            )}>
              {pkg.popular_badge && (
                <div className="absolute top-2.5 right-2.5 bg-primary/20 text-primary border border-primary/30 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
                  Popular
                </div>
              )}
              <CardHeader className="pb-3 border-b border-zinc-200 dark:border-zinc-900 bg-zinc-100/40 dark:bg-zinc-950/40">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center">
                    {getPackageIcon(pkg.code)}
                  </div>
                  <div>
                    <CardTitle className="text-base font-black text-foreground">{pkg.name}</CardTitle>
                    <span className="text-[10px] text-zinc-500 font-mono">Code: {pkg.code}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                {/* Package Metrics */}
                <div className="grid grid-cols-2 gap-3 text-xs border-b border-zinc-200 dark:border-zinc-900 pb-3">
                  <div>
                    <span className="text-zinc-550 dark:text-zinc-500 block">মূল্য (BDT)</span>
                    <span className="font-bold text-foreground block text-sm">৳{pkg.price_bdt || 0} BDT</span>
                  </div>
                  <div>
                    <span className="text-zinc-555 dark:text-zinc-500 block">মেয়াদ</span>
                    <span className="font-bold text-foreground block text-sm">{pkg.duration_days || 30} Days</span>
                  </div>
                  <div>
                    <span className="text-zinc-555 dark:text-zinc-500 block">ডিভাইস লিমিট</span>
                    <span className="font-bold text-foreground block text-sm flex items-center gap-1">
                      <Monitor className="h-3.5 w-3.5 text-zinc-400" />
                      {pkg.device_limit || 1}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-555 dark:text-zinc-500 block">ডিসপ্লে অর্ডার</span>
                    <span className="font-bold text-foreground block text-sm">{pkg.display_order || 0}</span>
                  </div>
                </div>

                {/* Features list */}
                <div>
                  <span className="text-[11px] font-bold uppercase text-zinc-500 block mb-2">ফিচারসমূহ</span>
                  <ul className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
                    {pkg.features?.map((feat, i) => (
                      <li key={i} className="text-xs text-zinc-650 dark:text-zinc-400 flex items-start gap-1.5">
                        <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                    {(!pkg.features || pkg.features.length === 0) && (
                      <li className="text-xs text-zinc-600 italic">কোনো ফিচার যোগ করা হয়নি</li>
                    )}
                  </ul>
                </div>

                {/* Allowed Menus */}
                <div className="pt-2 border-t border-zinc-200 dark:border-zinc-900">
                  <span className="text-[11px] font-bold uppercase text-zinc-500 block mb-1.5">মডিউল পারমিশন</span>
                  <div className="flex flex-wrap gap-1">
                    {pkg.allowed_menus?.map(m => (
                      <span key={m} className="bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-1.5 py-0.5 text-[10px] text-zinc-650 dark:text-zinc-400 font-medium">
                        {SIDEBAR_MENUS.find(sm => sm.id === m)?.label || m}
                      </span>
                    ))}
                    {(!pkg.allowed_menus || pkg.allowed_menus.length === 0) && (
                      <span className="text-[10px] text-red-500 font-medium border border-red-500/10 bg-red-500/5 px-1.5 py-0.5 rounded">None</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-zinc-200 dark:border-zinc-900 flex gap-2">
                  <Button onClick={() => openEditModal(pkg)} variant="outline" className="flex-1 text-xs border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-300 hover:text-foreground gap-1">
                    <Edit2 className="h-3 w-3" /> এডিট
                  </Button>
                  <Button 
                    onClick={() => handleDelete(pkg.id)} 
                    disabled={deletingId === pkg.id}
                    variant="ghost" 
                    className="border border-red-500/10 text-red-500 hover:text-white hover:bg-red-600 text-xs gap-1 shrink-0"
                  >
                    {deletingId === pkg.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                    মুছুন
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Package Edit/Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-card border border-zinc-200 dark:border-zinc-850 p-6 rounded-3xl shadow-2xl relative max-h-[90vh] overflow-y-auto animate-in scale-in duration-300">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-850 pb-3">
              <h3 className="text-lg font-black text-foreground">
                {editingPkg ? 'প্যাকেজ এডিট করুন' : 'নতুন প্যাকেজ তৈরি'}
              </h3>
              <Button onClick={() => setShowModal(false)} variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-foreground rounded-full">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleSave} className="mt-4 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="pkgName">প্যাকেজের নাম (Package Name)</Label>
                  <Input 
                    id="pkgName" 
                    placeholder="Premium Plan" 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    className="bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-foreground" 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pkgCode">প্যাকেজ কোড (Package Code)</Label>
                  <Input 
                    id="pkgCode" 
                    placeholder="Premium" 
                    value={code} 
                    onChange={e => setCode(e.target.value)} 
                    className="bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-foreground font-mono" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="pkgPriceBdt">BDT মূল্য (Price ৳)</Label>
                  <Input 
                    id="pkgPriceBdt" 
                    type="number" 
                    placeholder="999" 
                    value={priceBdt} 
                    onChange={e => setPriceBdt(Number(e.target.value))} 
                    className="bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-foreground" 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pkgDuration">মেয়াদ দিন (Days)</Label>
                  <Input 
                    id="pkgDuration" 
                    type="number" 
                    placeholder="30" 
                    value={durationDays} 
                    onChange={e => setDurationDays(Number(e.target.value))} 
                    className="bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-foreground" 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pkgDevice">ডিভাইস লিমিট (Device Limit)</Label>
                  <Input 
                    id="pkgDevice" 
                    type="number" 
                    placeholder="3" 
                    value={deviceLimit} 
                    onChange={e => setDeviceLimit(Number(e.target.value))} 
                    className="bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-foreground" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="pkgOrder">ডিসপ্লে অর্ডার</Label>
                  <Input 
                    id="pkgOrder" 
                    type="number" 
                    placeholder="1" 
                    value={displayOrder} 
                    onChange={e => setDisplayOrder(Number(e.target.value))} 
                    className="bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-foreground" 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pkgUsd">USD মূল্য (প্রদর্শনের জন্য - Optional)</Label>
                  <Input 
                    id="pkgUsd" 
                    placeholder="$19/mo" 
                    value={price} 
                    onChange={e => setPrice(e.target.value)} 
                    className="bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-foreground" 
                  />
                </div>
              </div>

              {/* Switches */}
              <div className="flex gap-6 py-2 border-t border-b border-zinc-200 dark:border-zinc-900">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <Checkbox checked={popularBadge} onCheckedChange={(val) => setPopularBadge(!!val)} />
                  <span className="text-xs font-semibold">পপুলার ব্যাজ (Popular Badge)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <Checkbox checked={isActive} onCheckedChange={(val) => setIsActive(!!val)} />
                  <span className="text-xs font-semibold">অ্যাক্টিভ করুন (Active Package)</span>
                </label>
              </div>

              {/* Allowed Menus Permission Gating */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">অনুমোদিত মডিউল (Permissions)</Label>
                <div className="grid grid-cols-3 gap-2 bg-zinc-50 dark:bg-zinc-900/40 p-3 border border-zinc-200 dark:border-zinc-900 rounded-xl">
                  {SIDEBAR_MENUS.map(m => (
                    <label key={m.id} className="flex items-center gap-2 cursor-pointer py-1 select-none">
                      <Checkbox checked={allowedMenus.includes(m.id)} onCheckedChange={() => handleToggleMenu(m.id)} />
                      <span className="text-xs text-zinc-655 dark:text-zinc-300">{m.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Features list management */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">প্যাকেজ ফিচার তালিকা</Label>
                <div className="flex gap-2">
                  <Input 
                    placeholder="যেমন: ৩টি হোয়াটসঅ্যাপ কানেকশন" 
                    value={newFeatureText} 
                    onChange={e => setNewFeatureText(e.target.value)} 
                    className="bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-foreground flex-1" 
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddFeature())}
                  />
                  <Button type="button" onClick={handleAddFeature} className="bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-foreground border border-zinc-200 dark:border-zinc-800 shrink-0">
                    যুক্ত করুন
                  </Button>
                </div>

                <div className="border border-zinc-200 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-950/40 rounded-xl p-3 max-h-[140px] overflow-y-auto space-y-1.5">
                  {features.map((feat, i) => (
                    <div key={i} className="flex justify-between items-center bg-zinc-100/60 dark:bg-zinc-900/60 p-2 rounded-lg text-xs border border-zinc-200 dark:border-zinc-850">
                      <span className="text-zinc-700 dark:text-zinc-300">{feat}</span>
                      <Button type="button" onClick={() => handleRemoveFeature(i)} variant="ghost" size="icon" className="h-5 w-5 text-red-500 hover:text-white hover:bg-red-600 rounded">
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  {features.length === 0 && (
                    <div className="text-xs text-zinc-650 dark:text-zinc-650 text-center py-4 italic">ফিচার যোগ করতে ওপরে লিখুন।</div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-200 dark:border-zinc-850 flex gap-2 justify-end">
                <Button type="button" onClick={() => setShowModal(false)} variant="outline" className="bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-300">
                  বাতিল
                </Button>
                <Button type="submit" disabled={saving} className="bg-primary hover:bg-primary/95 text-white font-bold px-6">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'প্যাকেজ সেভ করুন'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
