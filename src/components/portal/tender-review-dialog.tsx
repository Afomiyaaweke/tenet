'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  Download, CheckCircle2, Loader2, Building2, Briefcase,
  CalendarDays, MapPin, DollarSign, Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import type { Tender } from './lib';
import { parseRequirements, formatDate, isDeadlineSoon, isDeadlinePast } from './lib';

export function TenderReviewDialog({
  tender, open, onOpenChange,
}: {
  tender: Tender | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [exporting, setExporting] = useState(false);

  if (!tender) return null;

  const requirements = parseRequirements(tender.requirements);

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('tenet_token') : null;
      const headers: HeadersInit = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`/api/tenders/${tender.id}/export-pdf`, { headers });
      if (!res.ok) {
        try {
          const errData = await res.json();
          throw new Error(errData.error || 'Export failed');
        } catch {
          throw new Error('Export failed');
        }
      }
      const blob = await res.blob();
      if (blob.size < 100) throw new Error('Generated PDF is empty');
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${tender.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('PDF exported successfully');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to export PDF');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <div className="flex-1 overflow-y-auto">
          {/* Header */}
          <div className="gradient-emerald p-6 pb-8 rounded-t-lg relative">
            <DialogHeader>
              <DialogTitle className="text-xl text-white font-bold leading-tight pr-8">
                {tender.title}
              </DialogTitle>
              <DialogDescription className="text-white/80 mt-1">
                Published by {tender.user.name}
                {tender.user.company && ` · ${tender.user.company}`}
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-wrap gap-2 mt-4">
              <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30">
                <Building2 className="size-3" />{tender.organization}
              </Badge>
              <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30">
                <Briefcase className="size-3" />{tender.category}
              </Badge>
              <Badge className={`border-0 ${tender.status === 'open' ? 'bg-emerald-600 text-white' : tender.status === 'closed' ? 'bg-red-600 text-white' : 'bg-amber-600 text-white'}`}>
                {tender.status.charAt(0).toUpperCase() + tender.status.slice(1)}
              </Badge>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Key Details */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Budget</p>
                <p className="text-sm font-semibold flex items-center gap-1.5">
                  <DollarSign className="size-4 text-emerald-600" />{tender.budget}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Deadline</p>
                <p className="text-sm font-semibold flex items-center gap-1.5">
                  <CalendarDays className={`size-4 ${isDeadlinePast(tender.deadline) ? 'text-red-500' : isDeadlineSoon(tender.deadline) ? 'text-amber-500' : 'text-emerald-600'}`} />
                  {formatDate(tender.deadline)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Location</p>
                <p className="text-sm font-semibold flex items-center gap-1.5">
                  <MapPin className="size-4 text-emerald-600" />{tender.location || 'Not specified'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Published</p>
                <p className="text-sm font-semibold">{formatDate(tender.createdAt)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Bids</p>
                <p className="text-sm font-semibold flex items-center gap-1.5">
                  <Users className="size-4 text-emerald-600" />{tender.bidCount} {tender.bidCount === 1 ? 'bid' : 'bids'}
                </p>
              </div>
            </div>

            <Separator />

            {/* Description */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">Description</h3>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{tender.description}</p>
            </div>

            <Separator />

            {/* Requirements - KEY FEATURE */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">Requirements</h3>
              {requirements.length > 0 ? (
                <ul className="space-y-2.5">
                  {requirements.map((req, i) => (
                    <li key={i} className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
                      <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      <span className="text-sm leading-relaxed">{req}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground italic">No specific requirements listed.</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer with Export PDF */}
        <div className="border-t p-4 bg-muted/30">
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
            <Button onClick={handleExportPdf} disabled={exporting} className="gradient-emerald border-0 text-white">
              {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              {exporting ? 'Exporting...' : 'Export PDF'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
