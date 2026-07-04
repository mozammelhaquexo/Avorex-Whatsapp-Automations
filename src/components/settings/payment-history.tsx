'use client';

import { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  HelpCircle,
  Loader2 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface PaymentRequest {
  id: string;
  request_id: string;
  payment_method: string;
  sender_number: string;
  transaction_id: string;
  expected_amount: number;
  paid_amount: number;
  status: 'Pending' | 'Under Review' | 'Approved' | 'Rejected' | 'Cancelled';
  submitted_at: string;
  admin_note: string | null;
  package_name: string;
  package_duration: string;
}

export function PaymentHistoryPanel() {
  const [history, setHistory] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/payment-requests');
      if (res.ok) {
        const data = await res.json();
        setHistory(data || []);
      }
    } catch (err) {
      console.error('Failed to load payment history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const getStatusBadge = (status: PaymentRequest['status']) => {
    const styles = {
      Pending: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      'Under Review': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      Approved: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      Rejected: 'bg-red-500/10 text-red-500 border-red-500/20',
      Cancelled: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20',
    };

    const icons = {
      Pending: <Clock className="h-3 w-3 shrink-0" />,
      'Under Review': <HelpCircle className="h-3 w-3 shrink-0" />,
      Approved: <CheckCircle2 className="h-3 w-3 shrink-0" />,
      Rejected: <XCircle className="h-3 w-3 shrink-0" />,
      Cancelled: <AlertCircle className="h-3 w-3 shrink-0" />,
    };

    const labels = {
      Pending: 'যাচাই করা হচ্ছে (Pending)',
      'Under Review': 'রিভিউতে আছে (Under Review)',
      Approved: 'অনুমোদিত (Approved)',
      Rejected: 'প্রত্যাখ্যাত (Rejected)',
      Cancelled: 'বাতিল (Cancelled)',
    };

    return (
      <span className={cn(
        "inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold border rounded-full shrink-0",
        styles[status] || styles.Pending
      )}>
        {icons[status] || icons.Pending}
        {labels[status] || labels.Pending}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          পেমেন্ট হিস্ট্রি (Payment History)
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          আপনার পেমেন্ট রিকোয়েস্ট এবং তার বর্তমান ভেরিফিকেশন স্ট্যাটাস এখানে দেখুন।
        </p>
      </div>

      {history.length === 0 ? (
        <Card className="border-zinc-800/40 bg-zinc-950/20">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="h-12 w-12 rounded-xl bg-zinc-900 flex items-center justify-center border border-zinc-850">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">কোনো পেমেন্ট পাওয়া যায়নি</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                আপনি এখনও কোনো পেমেন্ট রিকোয়েস্ট জমা দেননি।
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {history.map((req) => (
            <Card key={req.id} className="border-zinc-850 bg-zinc-950/30 overflow-hidden">
              <div className="border-b border-zinc-850 px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 bg-zinc-950/60">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-xs font-bold text-muted-foreground">{req.request_id}</span>
                  <span className="text-xs text-zinc-600">|</span>
                  <span className="text-xs text-zinc-400 font-medium flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-zinc-500" />
                    {new Date(req.submitted_at).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })} at {new Date(req.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                {getStatusBadge(req.status)}
              </div>
              <CardContent className="p-5">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground block mb-0.5">প্যাকেজ</span>
                    <span className="font-semibold text-foreground block">{req.package_name}</span>
                    <span className="text-xs text-muted-foreground block">মেয়াদ: {req.package_duration}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block mb-0.5">পেমেন্ট মাধ্যম</span>
                    <span className="font-semibold text-foreground block uppercase">{req.payment_method}</span>
                    <span className="text-xs text-muted-foreground block">Sender: {req.sender_number}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block mb-0.5">Transaction ID</span>
                    <span className="font-mono font-bold text-primary block break-all">{req.transaction_id}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block mb-0.5">পরিশোধের পরিমাণ</span>
                    <span className="font-semibold text-foreground block">৳{req.paid_amount} BDT</span>
                    {req.expected_amount !== req.paid_amount && (
                      <span className="text-[10px] text-zinc-500 block">Expected: ৳{req.expected_amount} BDT</span>
                    )}
                  </div>
                </div>

                {req.admin_note && (
                  <div className="mt-4 p-3 bg-red-500/5 border border-red-500/10 rounded-xl text-xs text-red-400/90">
                    <span className="font-bold block mb-1">অ্যাডমিন নোট:</span>
                    {req.admin_note}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
