'use client';

import { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  HelpCircle,
  Loader2,
  DollarSign,
  User,
  Smartphone,
  Tag,
  FileText,
  Calendar,
  X,
  Send,
  Trash2
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PaymentRequest {
  id: string;
  request_id: string;
  user_id: string;
  package_id: string;
  payment_method: string;
  sender_number: string;
  transaction_id: string;
  expected_amount: number;
  paid_amount: number;
  status: 'Pending' | 'Under Review' | 'Approved' | 'Rejected' | 'Cancelled';
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  admin_note: string | null;
  payment_note: string | null;
  package_name: string;
  package_duration: string;
  user_name: string;
  user_email: string;
}

export function TransactionsTab() {
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [methodFilter, setMethodFilter] = useState('All');
  
  // Selected request for details modal/drawer
  const [selectedRequest, setSelectedRequest] = useState<PaymentRequest | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [processingAction, setProcessingAction] = useState<string | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'All') params.set('status', statusFilter);
      if (methodFilter !== 'All') params.set('paymentMethod', methodFilter);
      if (query) params.set('query', query);

      const res = await fetch(`/api/admin/payment-requests?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setRequests(data || []);
      } else {
        toast.error('পেমেন্ট রিকোয়েস্ট লোড করতে ব্যর্থ হয়েছে');
      }
    } catch (err) {
      console.error(err);
      toast.error('পেমেন্ট রিকোয়েস্ট লোড করতে নেটওয়ার্ক সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();

    // Auto-refresh every 20 seconds to fetch new transaction requests
    const interval = setInterval(() => {
      fetchRequests();
    }, 20000);

    return () => clearInterval(interval);
  }, [statusFilter, methodFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchRequests();
  };

  const handleAction = async (requestId: string, action: 'approve' | 'reject' | 'review') => {
    setProcessingAction(action);
    try {
      const res = await fetch('/api/admin/payment-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          action,
          adminNote: adminNote.trim()
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'অ্যাকশন প্রসেস করতে ব্যর্থ হয়েছে');
      }

      toast.success(
        action === 'approve' ? 'পেমেন্ট সফলভাবে অনুমোদিত হয়েছে ও লাইসেন্স জেনারেট হয়েছে!' :
        action === 'reject' ? 'পেমেন্ট রিকোয়েস্ট বাতিল করা হয়েছে!' :
        'পেমেন্ট রিকোয়েস্ট আন্ডার রিভিউতে রাখা হয়েছে।'
      );

      setSelectedRequest(null);
      setAdminNote('');
      fetchRequests();
    } catch (err: any) {
      toast.error(err.message || 'কিছু ভুল হয়েছে');
    } finally {
      setProcessingAction(null);
    }
  };

  const handleDeleteRequest = async (id: string) => {
    if (!confirm('আপনি কি নিশ্চিত যে এই পেমেন্ট ট্রানজেকশনটি মুছে ফেলতে চান?')) return;
    try {
      const res = await fetch('/api/admin/payment-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'deleteRequest',
          requestId: id
        })
      });
      if (res.ok) {
        toast.success('পেমেন্ট ট্রানজেকশনটি মুছে ফেলা হয়েছে।');
        fetchRequests();
      } else {
        const data = await res.json();
        throw new Error(data.error || 'মুছে ফেলতে ব্যর্থ হয়েছে');
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDeleteAllRequests = async () => {
    if (!confirm('সতর্কতা! আপনি কি সমস্ত পেমেন্ট ট্রানজেকশন মুছে ফেলতে চান? এটি আর ফিরিয়ে আনা যাবে না।')) return;
    try {
      const res = await fetch('/api/admin/payment-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'deleteAllRequests'
        })
      });
      if (res.ok) {
        toast.success('সমস্ত পেমেন্ট ট্রানজেকশন সফলভাবে মুছে ফেলা হয়েছে।');
        fetchRequests();
      } else {
        const data = await res.json();
        throw new Error(data.error || 'মুছে ফেলতে ব্যর্থ হয়েছে');
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const openDetails = (req: PaymentRequest) => {
    setSelectedRequest(req);
    setAdminNote(req.admin_note || '');
  };

  const getStatusBadge = (status: PaymentRequest['status']) => {
    const styles = {
      Pending: 'bg-amber-500/15 text-amber-500 border-amber-500/30 font-bold',
      'Under Review': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      Approved: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      Rejected: 'bg-red-500/10 text-red-500 border-red-500/20',
      Cancelled: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20',
    };

    return (
      <span className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold border rounded-full shrink-0",
        styles[status] || styles.Pending
      )}>
        {status === 'Pending' && (
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping shrink-0" />
        )}
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Search & Filter Form */}
      <form onSubmit={handleSearchSubmit} className="grid gap-4 md:grid-cols-4 items-end bg-zinc-950/20 p-4 border border-zinc-900 rounded-2xl">
        <div className="md:col-span-2 space-y-1.5">
          <Label htmlFor="search">খুঁজুন (Search)</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="search"
              placeholder="নাম, ইমেইল, Transaction ID, Sender Number..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 bg-zinc-900 border-zinc-800"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>স্ট্যাটাস ফিল্টার</Label>
          <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || 'All')}>
            <SelectTrigger className="bg-zinc-900 border-zinc-800">
              <SelectValue placeholder="সব স্ট্যাটাস" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
              <SelectItem value="All">All Status</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Under Review">Under Review</SelectItem>
              <SelectItem value="Approved">Approved</SelectItem>
              <SelectItem value="Rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5 flex gap-2">
          <div className="flex-1 space-y-1.5">
            <Label>পেমেন্ট মেথড</Label>
            <Select value={methodFilter} onValueChange={(val) => setMethodFilter(val || 'All')}>
              <SelectTrigger className="bg-zinc-900 border-zinc-800">
                <SelectValue placeholder="সব মেথড" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                <SelectItem value="All">All Methods</SelectItem>
                <SelectItem value="bKash">bKash</SelectItem>
                <SelectItem value="Nagad">Nagad</SelectItem>
                <SelectItem value="Rocket">Rocket</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button type="submit" className="flex-1 bg-primary hover:bg-primary/95 text-white">
              খুঁজুন
            </Button>
            {requests.length > 0 && (
              <Button 
                type="button" 
                onClick={handleDeleteAllRequests} 
                variant="destructive"
                className="shrink-0 font-bold bg-red-600 hover:bg-red-500 text-white gap-1.5"
              >
                <Trash2 className="h-4 w-4" /> All Delete
              </Button>
            )}
          </div>
        </div>
      </form>

      {/* Requests List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : requests.length === 0 ? (
        <Card className="border-zinc-800 bg-zinc-950/10">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="h-12 w-12 rounded-xl bg-zinc-900 flex items-center justify-center border border-zinc-800">
              <DollarSign className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">কোনো ট্রানজেকশন রিকোয়েস্ট পাওয়া যায়নি</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                পেমেন্ট রিকোয়েস্ট লিস্ট খালি।
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="border border-zinc-200 dark:border-zinc-850 bg-zinc-50/50 dark:bg-zinc-950/20 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-850 bg-zinc-100/60 dark:bg-zinc-950/60 text-xs text-muted-foreground uppercase font-semibold">
                  <th className="px-5 py-4">Request ID / Date</th>
                  <th className="px-5 py-4">User</th>
                  <th className="px-5 py-4">Package</th>
                  <th className="px-5 py-4">Method & Sender</th>
                  <th className="px-5 py-4">Transaction ID</th>
                  <th className="px-5 py-4 text-right">Amount</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-850">
                {requests.map((req) => (
                  <tr 
                    key={req.id} 
                    className={cn(
                      "hover:bg-zinc-100/40 dark:hover:bg-zinc-900/20 transition-all border-l-2",
                      req.status === 'Pending' 
                        ? "bg-amber-500/[0.03] border-l-amber-500/80 shadow-[inset_1px_0_0_0_rgba(245,158,11,0.15)] animate-pulse-slow" 
                        : "border-l-transparent"
                    )}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-foreground block">{req.request_id}</span>
                        {req.status === 'Pending' && (
                          <span className="inline-flex items-center rounded-full bg-amber-500 px-1.5 py-0.5 text-[8px] font-black text-black uppercase tracking-wider animate-bounce">
                            New
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-zinc-500 block">
                        {new Date(req.submitted_at).toLocaleDateString()} {new Date(req.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-semibold text-foreground block">{req.user_name}</span>
                      <span className="text-xs text-muted-foreground block">{req.user_email}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-semibold text-foreground block">{req.package_name}</span>
                      <span className="text-[11px] text-zinc-500 block">মেয়াদ: {req.package_duration}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center rounded bg-primary/10 px-1.5 py-0.5 text-xs font-bold text-primary uppercase mb-0.5">
                        {req.payment_method}
                      </span>
                      <span className="text-xs text-muted-foreground block">Sender: {req.sender_number}</span>
                    </td>
                    <td className="px-5 py-4 font-mono font-semibold text-primary">{req.transaction_id}</td>
                    <td className="px-5 py-4 text-right">
                      <span className="font-bold text-foreground block">৳{req.paid_amount}</span>
                      <span className="text-[10px] text-zinc-500 block">Expected: ৳{req.expected_amount}</span>
                    </td>
                    <td className="px-5 py-4">{getStatusBadge(req.status)}</td>
                    <td className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Button onClick={() => openDetails(req)} size="sm" variant="outline" className="text-xs bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-300 hover:text-foreground">
                          Review
                        </Button>
                        <Button 
                          onClick={() => handleDeleteRequest(req.id)} 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0"
                          title="Delete Request"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Review Drawer / Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg h-full bg-card border-l border-zinc-200 dark:border-zinc-850 p-6 flex flex-col justify-between shadow-2xl relative animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div>
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-850 pb-4">
                <div>
                  <h3 className="text-lg font-black text-foreground">Review Transaction</h3>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">{selectedRequest.request_id}</p>
                </div>
                <Button onClick={() => setSelectedRequest(null)} variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-foreground rounded-full">
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Scrollable details */}
              <div className="mt-6 space-y-6 overflow-y-auto max-h-[calc(100vh-280px)] pr-2">
                {/* User details */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" /> User Information
                  </h4>
                  <div className="bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-900 p-4 rounded-xl space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Name:</span> <span className="font-semibold">{selectedRequest.user_name}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Email:</span> <span>{selectedRequest.user_email}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">User ID:</span> <span className="font-mono text-xs text-zinc-500">{selectedRequest.user_id}</span></div>
                  </div>
                </div>

                {/* Payment details */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Smartphone className="h-3.5 w-3.5" /> Payment Details
                  </h4>
                  <div className="bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-900 p-4 rounded-xl space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Payment Method:</span> <span className="font-bold uppercase text-primary">{selectedRequest.payment_method}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Sender Number:</span> <span className="font-semibold">{selectedRequest.sender_number}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Transaction ID:</span> <span className="font-mono font-black text-primary text-base">{selectedRequest.transaction_id}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Paid Amount:</span> <span className="font-bold text-foreground">৳{selectedRequest.paid_amount} BDT</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Expected Amount:</span> <span className="text-zinc-400">৳{selectedRequest.expected_amount} BDT</span></div>
                    {selectedRequest.payment_note && (
                      <div className="pt-2 border-t border-zinc-200 dark:border-zinc-850 mt-2">
                        <span className="text-xs text-muted-foreground block mb-1">User Payment Note:</span>
                        <p className="text-xs text-zinc-550 dark:text-zinc-300 italic">"{selectedRequest.payment_note}"</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Package details */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5" /> Selected Package
                  </h4>
                  <div className="bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-900 p-4 rounded-xl space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Package Name:</span> <span className="font-semibold text-foreground">{selectedRequest.package_name}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Duration:</span> <span>{selectedRequest.package_duration}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Package ID:</span> <span className="font-mono text-xs text-zinc-500">{selectedRequest.package_id}</span></div>
                  </div>
                </div>

                {/* Admin notes */}
                <div className="space-y-1.5">
                  <Label htmlFor="adminNote" className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" /> Internal Admin Note
                  </Label>
                  <Textarea
                    id="adminNote"
                    placeholder="Add feedback, reject reasons, or verification details..."
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    className="bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-sm focus:border-primary min-h-[80px]"
                  />
                </div>
              </div>
            </div>

            {/* Actions footer */}
            <div className="border-t border-zinc-200 dark:border-zinc-850 pt-4 flex flex-col gap-2">
              <div className="flex gap-2">
                <Button
                  onClick={() => handleAction(selectedRequest.id, 'approve')}
                  disabled={processingAction !== null}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  {processingAction === 'approve' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Approve Payment'}
                </Button>
                <Button
                  onClick={() => handleAction(selectedRequest.id, 'reject')}
                  disabled={processingAction !== null}
                  className="flex-1 bg-red-650 hover:bg-red-600 text-white font-bold"
                >
                  {processingAction === 'reject' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reject Payment'}
                </Button>
              </div>
              <Button
                onClick={() => handleAction(selectedRequest.id, 'review')}
                disabled={processingAction !== null}
                variant="outline"
                className="w-full bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-300"
              >
                {processingAction === 'review' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Mark Under Review'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
