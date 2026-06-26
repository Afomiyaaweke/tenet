'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore, useNavStore } from '@/store';
import { api, Tender, Bid } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  ArrowLeft, MapPin, Calendar, DollarSign, Tag, FileText, Gavel, Clock, Users,
  ChevronDown, ChevronUp, Award, AlertCircle, CheckCircle, X, ArrowRight,
  Briefcase, TrendingUp, Timer, CircleDot, Eye, Building2,
  ListChecks, FileStack, CircleCheck, Target, Ban, GitCompareArrows,
} from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

type DetailTab = 'overview' | 'bids' | 'documents';

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export function TenderDetailView({ tenderId }: { tenderId?: string }) {
  const { user } = useAuthStore();
  const { setView } = useNavStore();
  const [tender, setTender] = useState<Tender | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBid, setShowBid] = useState(false);
  const [bidData, setBidData] = useState({
    technicalProposal: '', financialProposal: '', timeline: '',
  });
  const [hasBid, setHasBid] = useState(false);
  const [activeTab, setActiveTab] = useState<DetailTab>('overview');

  const loadTender = useCallback(async () => {
    setLoading(true);
    const res = await api.get(`/tenders/${tenderId}`);
    if (res.success) setTender(res.data);
    // Load bids for this tender
    const bidsRes = await api.get('/bids', { tenderId: tenderId! });
    if (bidsRes.success) {
      setBids(bidsRes.data);
      setHasBid(bidsRes.data.some((b: Bid) => b.userId === user?.id));
    }
    setLoading(false);
  }, [tenderId, user?.id]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (tenderId) loadTender();
  }, [tenderId, loadTender]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleSubmitBid = async () => {
    const res = await api.post('/bids', {
      tenderId,
      ...bidData,
      financialProposal: parseFloat(bidData.financialProposal),
    });
    if (res.success) {
      toast.success('Bid submitted successfully!');
      setShowBid(false);
      loadTender();
    } else {
      toast.error(res.error || 'Failed to submit bid');
    }
  };

  const handleStatusChange = async (status: string) => {
    const res = await api.patch(`/tenders/${tenderId}/status`, { status });
    if (res.success) {
      toast.success(`Tender status updated to ${status}`);
      loadTender();
    } else {
      toast.error(res.error || 'Failed to update status');
    }
  };

  const bidStats = useMemo(() => ({
    pending: bids.filter(b => b.status === 'pending_review').length,
    shortlisted: bids.filter(b => b.status === 'shortlisted').length,
    awarded: bids.filter(b => b.status === 'awarded').length,
    rejected: bids.filter(b => b.status === 'rejected').length,
    total: bids.length,
  }), [bids]);

  const statusBadge = (status: string) => {
    switch (status) {
      case 'open': return 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100';
      case 'closed': return 'bg-rose-100 text-rose-700 hover:bg-rose-100';
      case 'awarded': return 'bg-teal-100 text-teal-700 hover:bg-teal-100';
      case 'cancelled': return 'bg-muted text-muted-foreground hover:bg-muted';
      default: return 'bg-muted text-muted-foreground hover:bg-muted';
    }
  };

  const statusDot = (status: string) => {
    switch (status) {
      case 'open': return 'bg-emerald-500';
      case 'closed': return 'bg-rose-500';
      case 'awarded': return 'bg-teal-500';
      case 'cancelled': return 'bg-muted-foreground/50';
      default: return 'bg-muted-foreground/50';
    }
  };

  const statusAccent = (status: string) => {
    switch (status) {
      case 'open': return 'from-emerald-400 to-emerald-600';
      case 'closed': return 'from-rose-400 to-rose-600';
      case 'awarded': return 'from-teal-400 to-teal-600';
      case 'cancelled': return 'from-muted to-muted-foreground/50';
      default: return 'from-muted to-muted-foreground/50';
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-4 max-w-5xl mx-auto view-enter">
        <div className="h-8 bg-muted/50 rounded-xl w-1/3 animate-pulse" />
        <div className="h-1.5 bg-muted/30 rounded-xl animate-pulse" />
        <div className="h-40 bg-muted/50 rounded-xl animate-pulse premium-shadow" />
        <div className="h-20 bg-muted/50 rounded-xl animate-pulse premium-shadow" />
      </div>
    );
  }

  if (!tender) {
    return (
      <div className="p-6 text-center view-enter">
        <div className="relative w-20 h-20 mx-auto mb-6">
          <div className="absolute inset-0 rounded-2xl gradient-rose opacity-20" />
          <div className="absolute inset-2 rounded-xl gradient-rose flex items-center justify-center">
            <FileText className="h-8 w-8 text-white" />
          </div>
        </div>
        <h3 className="text-lg font-semibold">Tender not found</h3>
        <p className="text-muted-foreground text-sm mt-2">The tender you&apos;re looking for doesn&apos;t exist or has been removed</p>
        <Button variant="outline" onClick={() => setView('tenders')} className="mt-4 rounded-xl">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Tenders
        </Button>
      </div>
    );
  }

  const isOpen = tender.status === 'open';
  const deadlinePassed = new Date(tender.deadline) < new Date();
  const canBid = user?.role === 'contractor' && isOpen && !deadlinePassed && !hasBid && user?.profile?.verified;
  const days = daysUntil(tender.deadline);

  const tabs: { key: DetailTab; label: string; icon: typeof ListChecks; count?: number }[] = [
    { key: 'overview', label: 'Overview', icon: ListChecks },
    { key: 'bids', label: 'Bids', icon: Gavel, count: bids.length },
    { key: 'documents', label: 'Documents', icon: FileStack },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto view-enter">
      {/* Back Button */}
      <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
        <Button variant="ghost" onClick={() => setView('tenders')}
          className="hover:text-emerald-700 hover:bg-primary/10 transition-colors rounded-xl">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Tenders
        </Button>
      </motion.div>

      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
      >
        <Card className="premium-shadow-lg rounded-xl border-0 bg-card overflow-hidden">
          {/* Accent strip */}
          <div className={`h-2 bg-gradient-to-r ${statusAccent(tender.status)}`} />

          <CardContent className="p-6 space-y-5">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
              <div className="flex-1 space-y-3">
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-xl flex-shrink-0 ${
                    tender.status === 'open' ? 'gradient-emerald' :
                    tender.status === 'awarded' ? 'gradient-teal' :
                    tender.status === 'cancelled' ? 'bg-muted' :
                    'gradient-rose'
                  }`}>
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-2xl font-bold tracking-tight">{tender.title}</h2>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <div className="flex items-center gap-1.5">
                        <span className={`h-1.5 w-1.5 rounded-full ${statusDot(tender.status)}`} />
                        <Badge className={`text-xs px-2.5 py-0.5 border-0 rounded-lg ${statusBadge(tender.status)}`}>
                          {tender.status}
                        </Badge>
                      </div>
                      {tender.categoryTags.split(',').filter(Boolean).map(tag => (
                        <Badge key={tag} className="text-[10px] bg-emerald-50 text-emerald-700 border-0 rounded-lg hover:bg-primary/10">
                          {tag.trim()}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className="bg-emerald-50/60 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                      <span className="text-[10px] text-emerald-600 font-medium">Budget</span>
                    </div>
                    <p className="text-sm font-bold text-emerald-700">ETB {tender.budgetMin.toLocaleString()} – {tender.budgetMax.toLocaleString()}</p>
                  </div>
                  <div className="bg-amber-50/60 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Timer className="h-3.5 w-3.5 text-amber-600" />
                      <span className="text-[10px] text-amber-600 font-medium">Deadline</span>
                    </div>
                    <p className="text-sm font-bold text-amber-700">{new Date(tender.deadline).toLocaleDateString()}</p>
                    <p className={`text-[10px] font-medium mt-0.5 ${days <= 0 ? 'text-rose-600' : days <= 3 ? 'text-rose-600' : days <= 7 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {days <= 0 ? 'Expired' : days === 1 ? '1 day left' : `${days} days left`}
                    </p>
                  </div>
                  <div className="bg-teal-50/60 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <MapPin className="h-3.5 w-3.5 text-teal-600" />
                      <span className="text-[10px] text-teal-600 font-medium">Location</span>
                    </div>
                    <p className="text-sm font-bold text-teal-700">{tender.location}</p>
                  </div>
                  <div className="bg-purple-50/60 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Users className="h-3.5 w-3.5 text-purple-600" />
                      <span className="text-[10px] text-purple-600 font-medium">Bids</span>
                    </div>
                    <p className="text-sm font-bold text-purple-700">{tender._count?.bids || 0} received</p>
                  </div>
                </div>

                {/* Requirements — always visible while viewing the tender */}
                <div className="rounded-xl border border-teal-200/60 dark:border-teal-900/40 bg-teal-50/50 dark:bg-teal-950/20 p-4 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-teal-100 dark:bg-teal-900/50">
                        <ListChecks className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                      </div>
                      <span className="text-sm font-semibold text-foreground">Tender Requirements</span>
                    </div>
                    {tender.requiredDocs && (
                      <span className="text-[10px] font-medium text-teal-700 dark:text-teal-300 bg-teal-100 dark:bg-teal-900/50 px-2 py-0.5 rounded-full">
                        {tender.requiredDocs.split(',').filter(Boolean).length} document{tender.requiredDocs.split(',').filter(Boolean).length === 1 ? '' : 's'}
                      </span>
                    )}
                  </div>
                  {tender.requiredDocs ? (
                    <div className="flex flex-wrap gap-1.5">
                      {tender.requiredDocs.split(',').filter(Boolean).map((doc, idx) => (
                        <span key={`${doc}-${idx}`} className="inline-flex items-center gap-1 text-xs font-medium bg-background dark:bg-card border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 rounded-lg px-2.5 py-1">
                          <FileStack className="h-3 w-3 shrink-0" />
                          {doc.trim()}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">No specific documents listed — contact the tender owner for eligibility details.</p>
                  )}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1.5 border-t border-teal-200/50 dark:border-teal-900/30">
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <CircleDot className="h-3 w-3 text-teal-500" /> Eligibility verified at bid submission
                    </span>
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <AlertCircle className="h-3 w-3 text-amber-500" /> Late or incomplete submissions are rejected
                    </span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 flex-shrink-0 lg:flex-col lg:items-stretch">
                {canBid && (
                  <Dialog open={showBid} onOpenChange={setShowBid}>
                    <DialogTrigger asChild>
                      <Button className="gradient-emerald hover:opacity-90 text-white rounded-xl premium-shadow transition-all hover:-translate-y-0.5 w-full">
                        <Gavel className="h-4 w-4 mr-2" /> Submit Bid
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto rounded-xl">
                      <DialogHeader>
                        <DialogTitle className="text-xl font-bold">
                          <span className="text-gradient-emerald">Submit Bid</span> for {tender.title}
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Technical Proposal *</Label>
                          <Textarea placeholder="Methodology, approach, team composition, relevant experience" rows={6}
                            value={bidData.technicalProposal} onChange={e => setBidData(d => ({ ...d, technicalProposal: e.target.value }))}
                            className="bg-muted/50 border-border/60 rounded-xl focus:ring-primary/20" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Financial Proposal (ETB) *</Label>
                          <Input type="number" placeholder="e.g. 250000"
                            value={bidData.financialProposal} onChange={e => setBidData(d => ({ ...d, financialProposal: e.target.value }))}
                            className="bg-muted/50 border-border/60 rounded-xl focus:ring-primary/20" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Timeline *</Label>
                          <Input placeholder="e.g. 30 days or 6 weeks"
                            value={bidData.timeline} onChange={e => setBidData(d => ({ ...d, timeline: e.target.value }))}
                            className="bg-muted/50 border-border/60 rounded-xl focus:ring-primary/20" />
                        </div>
                        <Button className="w-full gradient-emerald hover:opacity-90 text-white rounded-xl premium-shadow transition-all hover:-translate-y-0.5" onClick={handleSubmitBid}>
                          Submit Bid <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
                {hasBid && (
                  <Badge className="bg-emerald-100 text-emerald-700 border-0 rounded-lg hover:bg-emerald-100 py-1.5 px-3 text-sm">
                    <CheckCircle className="h-4 w-4 mr-1.5" /> Bid Submitted
                  </Badge>
                )}
                {(user?.role === 'admin' || (user?.role === 'tender_owner' && tender.createdBy === user.id)) && (
                  <div className="flex lg:flex-col gap-2">
                    {tender.status === 'open' && (
                      <Button variant="outline" size="sm" onClick={() => handleStatusChange('closed')}
                        className="rounded-xl text-xs">
                        <Ban className="h-3.5 w-3.5 mr-1.5" /> Close Tender
                      </Button>
                    )}
                    {tender.status === 'closed' && (
                      <Button variant="outline" size="sm" onClick={() => handleStatusChange('open')}
                        className="rounded-xl text-xs">
                        <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Reopen
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => handleStatusChange('cancelled')}
                      className="rounded-xl text-xs border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700">
                      <X className="h-3.5 w-3.5 mr-1.5" /> Cancel
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Tab Navigation */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
      >
        <Card className="premium-shadow rounded-xl border-0 bg-card">
          <CardContent className="p-1.5">
            <div className="flex gap-1">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeTab === tab.key
                      ? 'gradient-emerald text-white premium-shadow'
                      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                  }`}>
                  <tab.icon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span className={`text-[10px] px-1.5 py-0 rounded-full ${
                      activeTab === tab.key
                        ? 'bg-white/20 text-white'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Scope of Work */}
            <Card className="premium-shadow rounded-xl border-0 bg-card overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-emerald-400 to-emerald-600" />
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <div className="p-1.5 rounded-lg gradient-emerald">
                    <Briefcase className="h-3.5 w-3.5 text-white" />
                  </div>
                  Scope of Work
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm bg-muted/30 rounded-xl p-4 leading-relaxed">{tender.scope}</div>
              </CardContent>
            </Card>

            {/* Requirements & Details Grid */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* Budget Details */}
              <Card className="premium-shadow rounded-xl border-0 bg-card overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-emerald-400 to-teal-400" />
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-50">
                      <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                    </div>
                    Budget Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Minimum Budget</span>
                    <span className="text-sm font-semibold">ETB {tender.budgetMin.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Maximum Budget</span>
                    <span className="text-sm font-semibold">ETB {tender.budgetMax.toLocaleString()}</span>
                  </div>
                  <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600"
                      initial={{ width: 0 }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-center">Budget range from minimum to maximum</p>
                </CardContent>
              </Card>

              {/* Deadline & Location */}
              <Card className="premium-shadow rounded-xl border-0 bg-card overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-amber-400 to-teal-400" />
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-amber-50">
                      <Calendar className="h-3.5 w-3.5 text-amber-600" />
                    </div>
                    Timeline & Location
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-50">
                      <Timer className="h-4 w-4 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Submission Deadline</p>
                      <p className="text-sm font-semibold">{new Date(tender.deadline).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</p>
                      <p className={`text-[10px] font-medium ${days <= 0 ? 'text-rose-600' : days <= 3 ? 'text-rose-600' : days <= 7 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {days <= 0 ? 'Deadline has passed' : days === 1 ? '1 day remaining' : `${days} days remaining`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-teal-50">
                      <MapPin className="h-4 w-4 text-teal-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Project Location</p>
                      <p className="text-sm font-semibold">{tender.location}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Required Documents */}
            {tender.requiredDocs && (
              <Card className="premium-shadow rounded-xl border-0 bg-card overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-teal-400 to-teal-600" />
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-teal-50">
                      <FileStack className="h-3.5 w-3.5 text-teal-600" />
                    </div>
                    Required Documents
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {tender.requiredDocs.split(',').filter(Boolean).map(doc => (
                      <Badge key={doc} className="text-xs bg-teal-50 text-teal-700 border-0 rounded-lg hover:bg-teal-50 py-1 px-2.5">
                        <FileStack className="h-3 w-3 mr-1.5" /> {doc.trim()}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}

        {activeTab === 'bids' && (
          <motion.div
            key="bids"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            {/* Bid Stats */}
            {bids.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Pending', count: bidStats.pending, color: 'amber', icon: Clock },
                  { label: 'Shortlisted', count: bidStats.shortlisted, color: 'teal', icon: Award },
                  { label: 'Awarded', count: bidStats.awarded, color: 'emerald', icon: CheckCircle },
                  { label: 'Rejected', count: bidStats.rejected, color: 'rose', icon: AlertCircle },
                ].map(stat => (
                  <div key={stat.label} className={`bg-${stat.color}-50/60 rounded-xl p-3 text-center`}>
                    <stat.icon className={`h-4 w-4 text-${stat.color}-600 mx-auto mb-1`} />
                    <p className={`text-lg font-bold text-${stat.color}-700`}>{stat.count}</p>
                    <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                  </div>
                ))}
              </div>
            )}

            {(user?.role === 'admin' || user?.role === 'tender_owner') && bids.length > 0 ? (
              <Card className="premium-shadow rounded-xl border-0 bg-card overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-amber-400 to-amber-600" />
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <div className="p-1.5 rounded-lg gradient-amber">
                        <Gavel className="h-3.5 w-3.5 text-white" />
                      </div>
                      Submitted Bids
                      <Badge className="bg-amber-50 text-amber-700 border-0 rounded-lg text-[10px] hover:bg-amber-50">
                        {bids.length}
                      </Badge>
                    </CardTitle>
                    {bids.length >= 2 && (
                      <Button
                        size="sm"
                        className="gradient-emerald hover:opacity-90 text-white rounded-xl premium-shadow transition-all hover:-translate-y-0.5 text-xs"
                        onClick={() => setView('bid-compare', { tenderId: tender.id })}
                      >
                        <GitCompareArrows className="h-3.5 w-3.5 mr-1.5" /> Compare Bids
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-3">
                    {bids.map(bid => (
                      <BidCard key={bid.id} bid={bid} onUpdate={loadTender} />
                    ))}
                  </motion.div>
                </CardContent>
              </Card>
            ) : bids.length > 0 ? (
              <Card className="premium-shadow rounded-xl border-0 bg-card">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 p-4 bg-emerald-50/50 rounded-xl">
                    <div className="p-2 rounded-lg gradient-emerald">
                      <CheckCircle className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-emerald-700">Your bid has been submitted</p>
                      <p className="text-xs text-emerald-600 mt-0.5">You&apos;ll be notified when the bid status changes</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="premium-shadow rounded-xl border-0 bg-card">
                <CardContent className="p-12 text-center">
                  <div className="relative w-16 h-16 mx-auto mb-4">
                    <div className="absolute inset-0 rounded-2xl gradient-amber opacity-20" />
                    <div className="absolute inset-2 rounded-xl gradient-amber flex items-center justify-center">
                      <Gavel className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold">No bids yet</h3>
                  <p className="text-muted-foreground text-sm mt-1">Bids will appear here once contractors submit proposals</p>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}

        {activeTab === 'documents' && (
          <motion.div
            key="documents"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="premium-shadow rounded-xl border-0 bg-card overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-teal-400 to-teal-600" />
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <div className="p-1.5 rounded-lg gradient-teal">
                    <FileStack className="h-3.5 w-3.5 text-white" />
                  </div>
                  Tender Documents
                </CardTitle>
              </CardHeader>
              <CardContent>
                {tender.requiredDocs ? (
                  <div className="space-y-3">
                    {tender.requiredDocs.split(',').filter(Boolean).map((doc, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-teal-50">
                            <FileText className="h-4 w-4 text-teal-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{doc.trim()}</p>
                            <p className="text-[10px] text-muted-foreground">Required document</p>
                          </div>
                        </div>
                        <Badge className="text-[10px] bg-amber-50 text-amber-700 border-0 rounded-lg hover:bg-amber-50">
                          Required
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="p-3 rounded-2xl bg-muted/50 w-fit mx-auto mb-4">
                      <FileStack className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-sm font-semibold">No documents specified</h3>
                    <p className="text-muted-foreground text-xs mt-1">This tender has no specific document requirements</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function BidCard({ bid, onUpdate }: { bid: Bid; onUpdate: () => void }) {
  const { user } = useAuthStore();
  const [expanded, setExpanded] = useState(false);

  const handleStatusUpdate = async (status: string) => {
    const res = await api.patch(`/bids/${bid.id}/status`, { status });
    if (res.success) {
      toast.success(`Bid ${status}`);
      onUpdate();
    } else {
      toast.error(res.error || 'Failed to update bid');
    }
  };

  const bidStatusBadge = (status: string) => {
    switch (status) {
      case 'awarded': return 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100';
      case 'rejected': return 'bg-rose-100 text-rose-700 hover:bg-rose-100';
      case 'shortlisted': return 'bg-teal-100 text-teal-700 hover:bg-teal-100';
      case 'pending_review': return 'bg-amber-100 text-amber-700 hover:bg-amber-100';
      default: return 'bg-muted text-muted-foreground hover:bg-muted';
    }
  };

  const bidStatusDot = (status: string) => {
    switch (status) {
      case 'awarded': return 'bg-emerald-500';
      case 'rejected': return 'bg-rose-500';
      case 'shortlisted': return 'bg-teal-500';
      case 'pending_review': return 'bg-amber-500';
      default: return 'bg-muted-foreground/50';
    }
  };

  return (
    <motion.div variants={itemVariants} className="p-4 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors space-y-2">
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl gradient-emerald flex items-center justify-center flex-shrink-0">
            <span className="text-white font-semibold text-xs">
              {(bid.user?.profile?.fullName || 'U')[0].toUpperCase()}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium">{bid.user?.profile?.fullName || bid.user?.email || 'Contractor'}</p>
            <p className="text-xs text-muted-foreground">Submitted {new Date(bid.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <Badge className="text-xs border-0 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-primary/10">
            <DollarSign className="h-3 w-3 mr-1" /> ETB {bid.financialProposal.toLocaleString()}
          </Badge>
          <Badge className="text-xs border-0 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-50">
            <Clock className="h-3 w-3 mr-1" /> {bid.timeline}
          </Badge>
          <div className="flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${bidStatusDot(bid.status)}`} />
            <Badge className={`text-[10px] px-2 py-0.5 border-0 rounded-lg ${bidStatusBadge(bid.status)}`}>
              {bid.status.replace('_', ' ')}
            </Badge>
          </div>
          <div className="text-muted-foreground ml-1">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="mt-3 pt-3 border-t border-border/40 space-y-4">
              {/* Technical Proposal */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-lg gradient-emerald">
                    <Briefcase className="h-3.5 w-3.5 text-white" />
                  </div>
                  <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Technical Proposal</p>
                </div>
                <p className="text-sm whitespace-pre-wrap bg-muted/50 rounded-xl p-4 leading-relaxed">{bid.technicalProposal}</p>
              </div>

              {/* Admin Actions */}
              {user?.role === 'admin' && bid.status === 'pending_review' && (
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button size="sm"
                    className="gradient-teal text-white rounded-xl hover:opacity-90 premium-shadow transition-all hover:-translate-y-0.5"
                    onClick={() => handleStatusUpdate('shortlisted')}>
                    <Award className="h-3.5 w-3.5 mr-1.5" /> Shortlist
                  </Button>
                  <Button size="sm" variant="outline"
                    className="rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-all"
                    onClick={() => handleStatusUpdate('rejected')}>
                    <X className="h-3.5 w-3.5 mr-1.5" /> Reject
                  </Button>
                </div>
              )}
              {user?.role === 'admin' && bid.status === 'shortlisted' && (
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button size="sm"
                    className="gradient-emerald text-white rounded-xl hover:opacity-90 premium-shadow transition-all hover:-translate-y-0.5"
                    onClick={() => handleStatusUpdate('awarded')}>
                    <CheckCircle className="h-3.5 w-3.5 mr-1.5" /> Award Bid
                  </Button>
                  <Button size="sm" variant="outline"
                    className="rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-all"
                    onClick={() => handleStatusUpdate('rejected')}>
                    <X className="h-3.5 w-3.5 mr-1.5" /> Reject
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
