'use client';

import { Eye, Trash2, CheckCircle2, CalendarDays, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Tender } from './lib';
import { parseRequirements, formatDate, isDeadlinePast, isDeadlineSoon, STATUS_COLORS } from './lib';

export function TenderCard({
  tender, onView, onDelete, showDelete = false,
}: {
  tender: Tender;
  onView: (tender: Tender) => void;
  onDelete?: (id: string) => void;
  showDelete?: boolean;
}) {
  const requirements = parseRequirements(tender.requirements);
  const deadlinePast = isDeadlinePast(tender.deadline);
  const deadlineSoon = isDeadlineSoon(tender.deadline);

  return (
    <Card className="group hover:shadow-lg transition-all duration-200 premium-shadow overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-snug line-clamp-2 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
            {tender.title}
          </CardTitle>
          <Badge className={STATUS_COLORS[tender.status] || STATUS_COLORS.open}>
            {tender.status}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{tender.organization}</span>
          <span>·</span>
          <span>{tender.category}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground line-clamp-2">{tender.description}</p>

        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="font-semibold text-foreground">{tender.budget}</span>
          </span>
          <span className="flex items-center gap-1">
            <CalendarDays className={`size-3 ${deadlinePast ? 'text-red-500' : deadlineSoon ? 'text-amber-500' : ''}`} />
            {formatDate(tender.deadline)}
          </span>
          {tender.location && (
            <span className="flex items-center gap-1">
              <MapPin className="size-3" />{tender.location}
            </span>
          )}
        </div>

        {requirements.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="size-3" />
            {requirements.length} requirement{requirements.length !== 1 ? 's' : ''}
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <Button size="sm" variant="outline" className="flex-1" onClick={() => onView(tender)}>
            <Eye className="size-3.5 mr-1" />View
          </Button>
          {showDelete && onDelete && (
            <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => onDelete(tender.id)}>
              <Trash2 className="size-3.5" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
