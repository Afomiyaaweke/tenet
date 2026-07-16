'use client';

import { useState, useEffect, useCallback } from 'react';
import { LiveTender } from '@/lib/api';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  FileSearch, FileText, ExternalLink, Download, Copy,
  Loader2, Calendar, DollarSign, FileDown, FileSpreadsheet,
  Search, ChevronDown, ChevronUp, X, Globe2, ScanSearch,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────
interface DiscoverData {
  title: string;
  metaDescription?: string;
  metaKeywords?: string;
  content: string;
  sections: { heading: string; content: string }[];
  deadlines: string[];
  budgets: string[];
  documentLinks: { url: string; label: string; type: string }[];
  pageLinks: { url: string; label: string; relevance: string }[];
  url: string;
  publishedTime?: string | null;
  contentType: string;
  fetchedAt: string;
  stats: {
    totalChars: number;
    sectionsFound: number;
    docLinksFound: number;
    pageLinksFound: number;
    deadlinesFound: number;
    budgetsFound: number;
  };
}

interface FullDocumentViewerProps {
  tender: LiveTender;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ── Component ──────────────────────────────────────────────────────────
export function FullDocumentViewer({ tender, open, onOpenChange }: FullDocumentViewerProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DiscoverData | null>(null);
  const [activeTab, setActiveTab] = useState('structured');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set());
  const [copySuccess, setCopySuccess] = useState(false);

  const fetchDiscovery = useCallback(async () => {
    const docUrl =
      tender.documentUrl ||
      (tender.requiredDocs && tender.requiredDocs.startsWith('http') ? tender.requiredDocs : null) ||
      tender.externalUrl;

    if (!docUrl) {
      toast.error('No document URL available for this tender');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/tenders/fetch-doc/discover', { url: docUrl });
      if (res.success && res.data) {
        setData(res.data as DiscoverData);
        // Expand all sections by default
        setExpandedSections(new Set(res.data.sections.map((_: { heading: string; content: string }, i: number) => i)));
      } else {
        toast.error(res.error || 'Failed to discover document');
      }
    } catch {
      toast.error('Failed to discover document');
    }
    setLoading(false);
  }, [tender]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setData(null);
      setActiveTab('structured');
      setSearchQuery('');
      setExpandedSections(new Set());
      fetchDiscovery();
    }
  }, [open, fetchDiscovery]);

  const toggleSection = (idx: number) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleCopy = async () => {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(data.content);
      setCopySuccess(true);
      toast.success('Content copied to clipboard');
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      toast.error('Failed to copy content');
    }
  };

  const handleExportPdf = async () => {
    if (!data) return;
    try {
      const token = useAuthStore.getState().token;
      const res = await fetch('/api/tenders/fetch-doc/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ url: data.url, title: tender.title }),
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `Full_Doc_${(tender.title || 'Tender').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
      toast.success('PDF exported!');
    } catch {
      toast.error('Failed to export PDF');
    }
  };

  const handleExportCsv = async () => {
    if (!data) return;
    try {
      const token = useAuthStore.getState().token;
      const res = await fetch('/api/tenders/fetch-doc/export-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ url: data.url, title: tender.title }),
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `Full_Doc_${(tender.title || 'Tender').replace(/[^a-zA-Z0-9]/g, '_')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
      toast.success('CSV exported!');
    } catch {
      toast.error('Failed to export CSV');
    }
  };

  // Filter full text content based on search
  const filteredContent = data?.content
    ? searchQuery
      ? data.content
          .split('\n')
          .filter((line) => line.toLowerCase().includes(searchQuery.toLowerCase()))
          .join('\n')
      : data.content
    : '';

  const sourceHost = (() => {
    try {
      return new URL(data?.url || tender.externalUrl || '').hostname;
    } catch {
      return 'external source';
    }
  })();

  const docIcon = (type: string) => {
    const t = type.toUpperCase();
    if (['XLS', 'XLSX', 'CSV'].includes(t)) return <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
    if (['PDF'].includes(t)) return <FileDown className="h-4 w-4 text-rose-600 dark:text-rose-400" />;
    return <FileText className="h-4 w-4 text-sky-600 dark:text-sky-400" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-3 space-y-2 border-b shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-lg font-bold leading-snug line-clamp-2">
                {tender.title}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30">
                  <Globe2 className="h-2.5 w-2.5 mr-0.5" />
                  {sourceHost}
                </Badge>
                {data?.publishedTime && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    <Calendar className="h-2.5 w-2.5 mr-0.5" />
                    {new Date(data.publishedTime).toLocaleDateString()}
                  </Badge>
                )}
                {loading ? (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-amber-600 border-amber-300 dark:border-amber-700 dark:text-amber-400">
                    <Loader2 className="h-2.5 w-2.5 mr-0.5 animate-spin" />
                    Discovering…
                  </Badge>
                ) : data ? (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-emerald-600 border-emerald-300 dark:border-emerald-700 dark:text-emerald-400">
                    <ScanSearch className="h-2.5 w-2.5 mr-0.5" />
                    Discovered
                  </Badge>
                ) : null}
              </div>
            </div>
            {/* Export buttons */}
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-[10px] px-2"
                onClick={handleExportPdf}
                disabled={!data}
              >
                <FileDown className="h-3 w-3" /> PDF
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-[10px] px-2"
                onClick={handleExportCsv}
                disabled={!data}
              >
                <FileSpreadsheet className="h-3 w-3" /> CSV
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-[10px] px-2"
                onClick={handleCopy}
                disabled={!data}
              >
                {copySuccess ? <span className="text-emerald-600">Copied!</span> : <><Copy className="h-3 w-3" /> Copy</>}
              </Button>
            </div>
          </div>

          {/* Stats bar */}
          {data?.stats && (
            <div className="flex items-center gap-3 flex-wrap text-[10px] text-muted-foreground">
              <span>{data.stats.totalChars.toLocaleString()} chars</span>
              <span className="text-border">|</span>
              <span>{data.stats.sectionsFound} sections</span>
              <span className="text-border">|</span>
              <span>{data.stats.docLinksFound} documents</span>
              <span className="text-border">|</span>
              <span>{data.stats.pageLinksFound} related pages</span>
              {data.stats.deadlinesFound > 0 && (
                <>
                  <span className="text-border">|</span>
                  <span className="text-amber-600 dark:text-amber-400">{data.stats.deadlinesFound} deadline(s)</span>
                </>
              )}
              {data.stats.budgetsFound > 0 && (
                <>
                  <span className="text-border">|</span>
                  <span className="text-emerald-600 dark:text-emerald-400">{data.stats.budgetsFound} budget ref(s)</span>
                </>
              )}
            </div>
          )}
        </DialogHeader>

        {/* Tabs + Content */}
        <div className="flex-1 min-h-0 flex flex-col">
          {loading ? (
            <LoadingSkeleton />
          ) : data ? (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
              <div className="px-6 pt-2 shrink-0">
                <TabsList className="h-8 bg-muted/50">
                  <TabsTrigger value="structured" className="text-xs gap-1 px-3 h-7">
                    <FileSearch className="h-3 w-3" /> Structured View
                  </TabsTrigger>
                  <TabsTrigger value="fulltext" className="text-xs gap-1 px-3 h-7">
                    <FileText className="h-3 w-3" /> Full Text
                  </TabsTrigger>
                  <TabsTrigger value="documents" className="text-xs gap-1 px-3 h-7">
                    <Download className="h-3 w-3" /> Linked Documents
                    {data.documentLinks.length > 0 && (
                      <Badge className="ml-0.5 text-[9px] px-1 py-0 h-3.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-0">
                        {data.documentLinks.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Structured View Tab */}
              <TabsContent value="structured" className="flex-1 min-h-0 m-0 mt-2 px-6 pb-6">
                <ScrollArea className="h-full">
                  <div className="space-y-4 pr-3">
                    {/* Meta description */}
                    {data.metaDescription && (
                      <Card className="border-emerald-200/60 dark:border-emerald-800/40 bg-emerald-50/30 dark:bg-emerald-950/10">
                        <CardContent className="p-4">
                          <p className="text-xs text-muted-foreground mb-1 font-medium uppercase tracking-wide">Description</p>
                          <p className="text-sm leading-relaxed">{data.metaDescription}</p>
                        </CardContent>
                      </Card>
                    )}

                    {/* Deadlines & Budgets row */}
                    {(data.deadlines.length > 0 || data.budgets.length > 0) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {data.deadlines.length > 0 && (
                          <Card className="border-amber-200/60 dark:border-amber-800/40 bg-amber-50/30 dark:bg-amber-950/10">
                            <CardContent className="p-4 space-y-2">
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wide">
                                <Calendar className="h-3.5 w-3.5" />
                                Deadlines
                              </div>
                              {data.deadlines.map((d, i) => (
                                <div key={i} className="flex items-center gap-2 text-sm">
                                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                                  <span>{d}</span>
                                </div>
                              ))}
                            </CardContent>
                          </Card>
                        )}
                        {data.budgets.length > 0 && (
                          <Card className="border-emerald-200/60 dark:border-emerald-800/40 bg-emerald-50/30 dark:bg-emerald-950/10">
                            <CardContent className="p-4 space-y-2">
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">
                                <DollarSign className="h-3.5 w-3.5" />
                                Budget References
                              </div>
                              {data.budgets.map((b, i) => (
                                <div key={i} className="flex items-center gap-2 text-sm font-medium">
                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                  <span>{b}</span>
                                </div>
                              ))}
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    )}

                    {/* Sections */}
                    {data.sections.length > 0 ? (
                      <div className="space-y-2">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                          <FileSearch className="h-3.5 w-3.5" />
                          Sections ({data.sections.length})
                        </h4>
                        {data.sections.map((sec, idx) => (
                          <Card key={idx} className="border-border/60">
                            <CardContent className="p-0">
                              <button
                                className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/40 transition-colors rounded-lg"
                                onClick={() => toggleSection(idx)}
                              >
                                <span className="text-sm font-semibold text-foreground">{sec.heading}</span>
                                {expandedSections.has(idx) ? (
                                  <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                                )}
                              </button>
                              {expandedSections.has(idx) && (
                                <div className="px-3 pb-3 pt-0 animate-[fadeIn_0.2s_ease-out]">
                                  <Separator className="mb-2" />
                                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{sec.content}</p>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <Card className="border-dashed">
                        <CardContent className="p-6 text-center">
                          <FileSearch className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">No structured sections detected.</p>
                          <p className="text-xs text-muted-foreground mt-1">Try the Full Text tab to see the complete content.</p>
                        </CardContent>
                      </Card>
                    )}

                    {/* Related pages */}
                    {data.pageLinks.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                          <ExternalLink className="h-3.5 w-3.5" />
                          Related Pages ({data.pageLinks.length})
                        </h4>
                        <div className="space-y-1">
                          {data.pageLinks.map((p, i) => (
                            <a
                              key={i}
                              href={p.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-sm p-2 rounded-lg hover:bg-muted/50 transition-colors group"
                            >
                              <Globe2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              <span className="truncate flex-1 group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors">
                                {p.label}
                              </span>
                              <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 shrink-0">
                                {p.relevance}
                              </Badge>
                              <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Full Text Tab */}
              <TabsContent value="fulltext" className="flex-1 min-h-0 m-0 mt-2 px-6 pb-6 flex flex-col">
                <div className="relative mb-2 shrink-0">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search in full text…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 text-sm pl-8 pr-8"
                  />
                  {searchQuery && (
                    <button
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                      onClick={() => setSearchQuery('')}
                    >
                      <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                    </button>
                  )}
                </div>
                <ScrollArea className="flex-1 min-h-0">
                  <div className="rounded-lg border bg-muted/20 p-4">
                    <pre className="text-xs leading-relaxed whitespace-pre-wrap font-mono break-words">
                      {searchQuery ? (
                        <HighlightedText text={filteredContent} query={searchQuery} />
                      ) : (
                        data.content
                      )}
                    </pre>
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Linked Documents Tab */}
              <TabsContent value="documents" className="flex-1 min-h-0 m-0 mt-2 px-6 pb-6">
                <ScrollArea className="h-full">
                  <div className="space-y-3 pr-3">
                    {data.documentLinks.length > 0 ? (
                      <>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                          <Download className="h-3.5 w-3.5" />
                          Document Files ({data.documentLinks.length})
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {data.documentLinks.map((doc, i) => (
                            <Card key={i} className="border-border/60 hover:border-emerald-300/60 dark:hover:border-emerald-700/40 transition-colors">
                              <CardContent className="p-3 flex items-center gap-3">
                                <div className="shrink-0 p-2 rounded-lg bg-muted/50">
                                  {docIcon(doc.type)}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium truncate">{doc.label}</p>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
                                      {doc.type}
                                    </Badge>
                                    <span className="text-[10px] text-muted-foreground truncate max-w-[150px]">
                                      {(() => { try { return new URL(doc.url).pathname.split('/').pop(); } catch { return ''; } })()}
                                    </span>
                                  </div>
                                </div>
                                <a
                                  href={doc.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="shrink-0 inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 transition-colors"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                </a>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </>
                    ) : null}

                    {data.pageLinks.length > 0 ? (
                      <>
                        <Separator />
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                          <ExternalLink className="h-3.5 w-3.5" />
                          Related Requirement Pages ({data.pageLinks.length})
                        </h4>
                        <div className="space-y-1.5">
                          {data.pageLinks.map((p, i) => (
                            <a
                              key={i}
                              href={p.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-3 p-3 rounded-lg border hover:border-emerald-300/60 dark:hover:border-emerald-700/40 transition-colors group"
                            >
                              <div className="shrink-0 p-1.5 rounded-md bg-emerald-50 dark:bg-emerald-950/30">
                                <Globe2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors">
                                  {p.label}
                                </p>
                                <p className="text-[10px] text-muted-foreground truncate">{p.url}</p>
                              </div>
                              <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 shrink-0 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400">
                                {p.relevance}
                              </Badge>
                              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            </a>
                          ))}
                        </div>
                      </>
                    ) : null}

                    {data.documentLinks.length === 0 && data.pageLinks.length === 0 && (
                      <Card className="border-dashed">
                        <CardContent className="p-6 text-center">
                          <Download className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">No linked documents or related pages found.</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            The page may not contain direct document links, or they may be behind authentication.
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-2">
                <X className="h-8 w-8 text-muted-foreground/50 mx-auto" />
                <p className="text-sm text-muted-foreground">Failed to load document data</p>
                <Button variant="outline" size="sm" onClick={fetchDiscovery}>
                  <Loader2 className="h-3 w-3 mr-1" /> Retry
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Highlighted text sub-component ────────────────────────────────────
function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const parts: React.ReactNode[] = [];
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  let lastIndex = 0;
  let idx = lowerText.indexOf(lowerQuery, lastIndex);

  let key = 0;
  while (idx !== -1) {
    if (idx > lastIndex) {
      parts.push(<span key={key++}>{text.slice(lastIndex, idx)}</span>);
    }
    parts.push(
      <mark key={key++} className="bg-emerald-200/70 dark:bg-emerald-800/50 rounded px-0.5">
        {text.slice(idx, idx + query.length)}
      </mark>,
    );
    lastIndex = idx + query.length;
    idx = lowerText.indexOf(lowerQuery, lastIndex);
  }
  if (lastIndex < text.length) {
    parts.push(<span key={key++}>{text.slice(lastIndex)}</span>);
  }
  return <>{parts}</>;
}

// ── Loading skeleton ──────────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div className="flex-1 p-6 space-y-4">
      <div className="flex gap-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-32" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-28 rounded-lg" />
        <Skeleton className="h-28 rounded-lg" />
      </div>
      <Skeleton className="h-6 w-40" />
      {[1, 2, 3, 4, 5].map((i) => (
        <Skeleton key={i} className="h-20 rounded-lg" />
      ))}
    </div>
  );
}
