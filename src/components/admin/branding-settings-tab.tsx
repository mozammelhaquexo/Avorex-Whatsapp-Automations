'use client';

import { useState, useEffect } from 'react';
import { 
  Building2, 
  Save, 
  Loader2, 
  Smartphone, 
  HelpCircle,
  Globe,
  Settings,
  MessageSquare
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface BrandingSettings {
  id: string;
  software_name: string;
  brand_name: string;
  brand_logo_url: string | null;
  support_whatsapp: string;
  bkash_number: string;
  nagad_number: string;
  rocket_number: string;
  payment_instruction: string;
  currency: string;
  currency_symbol: string;
  default_country: string;
  payment_type: string;
}

export function BrandingSettingsTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Settings Form States
  const [softwareName, setSoftwareName] = useState('');
  const [brandName, setBrandName] = useState('');
  const [supportWhatsapp, setSupportWhatsapp] = useState('');
  const [bkashNumber, setBkashNumber] = useState('');
  const [nagadNumber, setNagadNumber] = useState('');
  const [rocketNumber, setRocketNumber] = useState('');
  const [paymentInstruction, setPaymentInstruction] = useState('');
  const [currency, setCurrency] = useState('BDT');
  const [currencySymbol, setCurrencySymbol] = useState('৳');
  const [defaultCountry, setDefaultCountry] = useState('Bangladesh');
  const [paymentType, setPaymentType] = useState('Send Money');

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/branding-settings');
      if (res.ok) {
        const data = await res.json();
        if (data.id) {
          setSoftwareName(data.software_name || '');
          setBrandName(data.brand_name || '');
          setSupportWhatsapp(data.support_whatsapp || '');
          setBkashNumber(data.bkash_number || '');
          setNagadNumber(data.nagad_number || '');
          setRocketNumber(data.rocket_number || '');
          setPaymentInstruction(data.payment_instruction || '');
          setCurrency(data.currency || 'BDT');
          setCurrencySymbol(data.currency_symbol || '৳');
          setDefaultCountry(data.default_country || 'Bangladesh');
          setPaymentType(data.payment_type || 'Send Money');
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('সেটিংস লোড করতে ত্রুটি হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch('/api/admin/branding-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          software_name: softwareName.trim(),
          brand_name: brandName.trim(),
          support_whatsapp: supportWhatsapp.trim(),
          bkash_number: bkashNumber.trim(),
          nagad_number: nagadNumber.trim(),
          rocket_number: rocketNumber.trim(),
          payment_instruction: paymentInstruction.trim(),
          currency: currency.trim(),
          currency_symbol: currencySymbol.trim(),
          default_country: defaultCountry.trim(),
          payment_type: paymentType.trim()
        })
      });

      if (res.ok) {
        toast.success('ব্র্যান্ডিং এবং পেমেন্ট সেটিংস সফলভাবে আপডেট হয়েছে!');
        fetchSettings();
      } else {
        const err = await res.json();
        throw new Error(err.error || 'সেটিংস আপডেট করা যায়নি');
      }
    } catch (err: any) {
      toast.error(err.message || 'সেটিংস সেভ করার সময় ত্রুটি হয়েছে');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          পেমেন্ট ও ব্র্যান্ডিং সেটিংস (Branding & Payment Settings)
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          সফটওয়্যারের নাম, ব্র্যান্ড নাম, সাপোর্ট লিঙ্ক এবং পেমেন্ট নম্বরসমূহ এখানে পরিবর্তন করুন।
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Core Branding Card */}
        <Card className="border-zinc-200 dark:border-zinc-850 bg-zinc-50/50 dark:bg-zinc-950/20">
          <CardHeader className="pb-3 border-b border-zinc-200 dark:border-zinc-900 bg-zinc-100/40 dark:bg-zinc-950/40">
            <CardTitle className="text-base font-black text-foreground flex items-center gap-1.5">
              <Building2 className="h-4.5 w-4.5 text-zinc-400" />
              সফটওয়্যার ও ব্র্যান্ডিং ইনফো
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="swName">সফটওয়্যারের নাম (Software Name)</Label>
                <Input 
                  id="swName" 
                  value={softwareName} 
                  onChange={e => setSoftwareName(e.target.value)} 
                  placeholder="Avorex Whatsapp Automation"
                  className="bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-foreground"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="brandName">ব্র্যান্ড নাম (Brand Code/Name)</Label>
                <Input 
                  id="brandName" 
                  value={brandName} 
                  onChange={e => setBrandName(e.target.value)} 
                  placeholder="AVX"
                  className="bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-foreground"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="supportWa">সাপোর্ট ও ব্র্যান্ডিং হোয়াটসঅ্যাপ নম্বর (WhatsApp Support Link/Num)</Label>
              <Input 
                id="supportWa" 
                value={supportWhatsapp} 
                onChange={e => setSupportWhatsapp(e.target.value)} 
                placeholder="01754967976"
                className="bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-foreground"
              />
              <span className="text-[11px] text-zinc-500">পেমেন্ট রিকোয়েস্ট জমার পর কাস্টমার এই নম্বরে নক করার বাটন পাবে।</span>
            </div>
          </CardContent>
        </Card>

        {/* Payment Configuration Card */}
        <Card className="border-zinc-200 dark:border-zinc-850 bg-zinc-50/50 dark:bg-zinc-950/20">
          <CardHeader className="pb-3 border-b border-zinc-200 dark:border-zinc-900 bg-zinc-100/40 dark:bg-zinc-950/40">
            <CardTitle className="text-base font-black text-foreground flex items-center gap-1.5">
              <Smartphone className="h-4.5 w-4.5 text-zinc-400" />
              ম্যানুয়াল পেমেন্ট ইনফরমেশন (Send Money Numbers)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="bkashNum">bKash Number</Label>
                <Input 
                  id="bkashNum" 
                  value={bkashNumber} 
                  onChange={e => setBkashNumber(e.target.value)} 
                  placeholder="01754967976"
                  className="bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-foreground font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nagadNum">Nagad Number</Label>
                <Input 
                  id="nagadNum" 
                  value={nagadNumber} 
                  onChange={e => setNagadNumber(e.target.value)} 
                  placeholder="01754967976"
                  className="bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-foreground font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rocketNum">Rocket Number</Label>
                <Input 
                  id="rocketNum" 
                  value={rocketNumber} 
                  onChange={e => setRocketNumber(e.target.value)} 
                  placeholder="01754967976"
                  className="bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-foreground font-mono"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="payType">পেমেন্ট ধরণ (Payment Type)</Label>
                <Input 
                  id="payType" 
                  value={paymentType} 
                  onChange={e => setPaymentType(e.target.value)} 
                  placeholder="Send Money"
                  className="bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-foreground"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="curr">কারেন্সি কোড</Label>
                  <Input 
                    id="curr" 
                    value={currency} 
                    onChange={e => setCurrency(e.target.value)} 
                    placeholder="BDT"
                    className="bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-foreground"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="currSym">কারেন্সি সিম্বল</Label>
                  <Input 
                    id="currSym" 
                    value={currencySymbol} 
                    onChange={e => setCurrencySymbol(e.target.value)} 
                    placeholder="৳"
                    className="bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-foreground"
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="defCountry">ডিফল্ট দেশ (Default Country)</Label>
                <Input 
                  id="defCountry" 
                  value={defaultCountry} 
                  onChange={e => setDefaultCountry(e.target.value)} 
                  placeholder="Bangladesh"
                  className="bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-foreground"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="payInst">পেমেন্ট নির্দেশনাবলী (Bangla Payment Instruction)</Label>
              <Textarea 
                id="payInst" 
                value={paymentInstruction} 
                onChange={e => setPaymentInstruction(e.target.value)} 
                placeholder="পেমেন্ট করার নিয়মাবলী..."
                className="bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-foreground min-h-[100px] text-sm"
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={saving} className="bg-primary hover:bg-primary/95 text-white gap-1.5 font-bold px-8">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            সেটিংস সেভ করুন
          </Button>
        </div>
      </form>
    </div>
  );
}
