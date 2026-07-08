'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuthStore } from '@/store';
import { api, Document } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  FileText, Upload, CheckCircle2, Clock, XCircle, Shield,
  Briefcase, Receipt, FolderOpen, Award, File, ArrowRight,
  Search, Filter, CloudUpload, FileUp, Trash2, Eye,
  Stamp, FileSignature, X,
} from 'lucide-react';
import { useStampSignature, StampSignatureSelector, type SavedSignature } from '@/components/stamp-signature';
// ─── Helpers ────────────────────────────────────────────────────────
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getFileExtension(fileName: string): string {
  const parts = fileName.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : 'FILE';
}

export function DocumentsView() {
  const { user } = useAuthStore();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [docType, setDocType] = useState('business_license');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const fileRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [stampSelectorOpen, setStampSelectorOpen] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [docStamps, setDocStamps] = useState<Record<string, SavedSignature[]>>({});
  const stampSigHook = useStampSignature();

  const loadDocs = useCallback(async () => {
    setLoading(true);
    const res = await api.get('/documents');
    if (res.success) setDocuments(res.data);
    setLoading(false);
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { loadDocs(); }, [loadDocs]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0] || selectedFile;
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('docType', docType);
    formData.append('userId', user?.id || '');
    const res = await api.upload('/documents', formData);
    if (res.success) {
      toast.success('Document uploaded');
      setSelectedFile(null);
      if (fileRef.current) fileRef.current.value = '';
      loadDocs();
    } else toast.error(res.error || 'Upload failed');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Only PDF, JPEG, and PNG files are allowed');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be under 10MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
      case 'rejected': return <XCircle className="h-4 w-4 text-rose-600" />;
      default: return <Clock className="h-4 w-4 text-amber-600" />;
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100';
      case 'rejected': return 'bg-rose-100 text-rose-700 hover:bg-rose-100';
      default: return 'bg-amber-100 text-amber-700 hover:bg-amber-100';
    }
  };

  const statusDot = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-emerald-500';
      case 'rejected': return 'bg-rose-500';
      default: return 'bg-amber-500';
    }
  };

  const docTypeConfig = (type: string) => {
    switch (type) {
      case 'business_license': return { icon: Briefcase, bg: 'bg-emerald-50', color: 'text-emerald-600', label: 'Business License' };
      case 'tax_clearance': return { icon: Receipt, bg: 'bg-amber-50', color: 'text-amber-600', label: 'Tax Clearance' };
      case 'portfolio': return { icon: FolderOpen, bg: 'bg-teal-50', color: 'text-teal-600', label: 'Portfolio' };
      case 'certificate': return { icon: Award, bg: 'bg-purple-50', color: 'text-purple-600', label: 'Certificate' };
      default: return { icon: File, bg: 'bg-muted/50', color: 'text-muted-foreground', label: type.replace('_', ' ') };
    }
  };

  const pendingCount = documents.filter(d => d.status === 'pending').length;
  const approvedCount = documents.filter(d => d.status === 'approved').length;
  const rejectedCount = documents.filter(d => d.status === 'rejected').length;

  // ── Filtered Docs ──
  const filteredDocs = documents.filter(d => {
    const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
    const matchesType = typeFilter === 'all' || d.docType === typeFilter;
    return matchesStatus && matchesType;
  });

  return (
    <div
 className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto animate-[fadeIn_0.3s_ease-out]"
 >
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-2xl gradient-teal shadow-md flex-shrink-0 shadow-teal-200/40">
          <FileText className="h-6 w-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
            <span className="text-gradient-emerald">Document</span> Vault
          </h2>
          <p className="text-muted-foreground text-sm mt-0.5">Upload and manage your verification documents</p>
        </div>
      </div>

      {/* Verification Status */}
      <div>
        <Card className="premium-shadow-lg rounded-xl border-0 bg-card">
          <CardContent className="p-5 flex items-center gap-4">
            <div className={`p-3 rounded-2xl flex-shrink-0 ${user?.profile?.verified ? 'gradient-emerald' : 'gradient-amber'}`}>
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm">{user?.profile?.verified ? 'Verified Account' : 'Verification Pending'}</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {user?.profile?.verified
                  ? 'Your account is verified. You can submit bids.'
                  : 'Upload your documents for admin review to get verified.'}
              </p>
            </div>
            <div className="ml-auto flex-shrink-0">
              {user?.profile?.verified ? (
                <Badge className="bg-emerald-100 text-emerald-700 border-0 rounded-lg hover:bg-emerald-100">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Verified
                </Badge>
              ) : (
                <Badge className="bg-amber-100 text-amber-700 border-0 rounded-lg hover:bg-amber-100">
                  <Clock className="h-3 w-3 mr-1" /> Pending
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats Summary */}
      {!loading && documents.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { count: pendingCount, label: 'Pending', icon: Clock, bg: 'bg-amber-50', color: 'text-amber-600', dot: 'bg-amber-500' },
            { count: approvedCount, label: 'Approved', icon: CheckCircle2, bg: 'bg-emerald-50', color: 'text-emerald-600', dot: 'bg-emerald-500' },
            { count: rejectedCount, label: 'Rejected', icon: XCircle, bg: 'bg-rose-50', color: 'text-rose-600', dot: 'bg-rose-500' },
          ].map(stat => (
            <div className="hover:-translate-y-[3px] transition-all duration-200" key={stat.label}>
              <Card className="premium-shadow rounded-xl border-0 bg-card transition-all duration-200 h-full">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${stat.bg} flex-shrink-0`}>
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-xl font-bold">{stat.count}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}

      {/* Upload Section with Drag-Drop */}
      <div>
        <Card className="premium-shadow rounded-xl border-0 bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <div className="p-1.5 rounded-lg gradient-emerald">
                <Upload className="h-3.5 w-3.5 text-white" />
              </div>
              Upload Document
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Drag-drop zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200 ${
                isDragging
                  ? 'border-emerald-400 bg-emerald-50/50 scale-[1.01]'
                  : 'border-border/60 bg-muted/20 hover:border-emerald-300 hover:bg-primary/10'
              }`}
            >
              <div className="flex flex-col items-center gap-2">
                <div className={`p-3 rounded-2xl transition-colors ${isDragging ? 'gradient-emerald' : 'bg-emerald-50'}`}>
                  <CloudUpload className={`h-6 w-6 ${isDragging ? 'text-white' : 'text-emerald-600'}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {isDragging ? 'Drop your file here' : 'Drag & drop your file here'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">PDF, JPEG, PNG — Max 10MB</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-emerald-600 hover:text-emerald-700 hover:bg-primary/10"
                  onClick={() => fileRef.current?.click()}
                >
                  <FileUp className="h-3.5 w-3.5 mr-1" /> Or browse files
                </Button>
                <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) setSelectedFile(f);
                  }} />
              </div>
            </div>

            {/* Selected file preview */}
            {selectedFile && (
              <div
 className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50/50 border border-emerald-100 animate-[fadeIn_0.3s_ease-out]"
 >
                <div className="p-2 rounded-lg bg-emerald-100 flex-shrink-0">
                  <FileText className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">{getFileExtension(selectedFile.name)} &middot; {formatFileSize(selectedFile.size)}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                  onClick={() => { setSelectedFile(null); if (fileRef.current) fileRef.current.value = ''; }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}

            {/* Type selector + Upload button */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Document Type</label>
                <Select value={docType} onValueChange={setDocType}>
                  <SelectTrigger className="rounded-xl bg-muted/50 border-border/60">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="business_license">Business License</SelectItem>
                    <SelectItem value="tax_clearance">Tax Clearance</SelectItem>
                    <SelectItem value="portfolio">Portfolio</SelectItem>
                    <SelectItem value="certificate">Certificate</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  className="w-full gradient-emerald hover:opacity-90 text-white rounded-xl premium-shadow transition-all hover:-translate-y-0.5"
                  onClick={handleUpload}
                  disabled={!selectedFile}
                >
                  <Upload className="h-4 w-4 mr-2" /> Upload Document
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Documents List */}
      <div>
        <Card className="premium-shadow rounded-xl border-0 bg-card">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <div className="p-1.5 rounded-lg gradient-teal">
                  <FolderOpen className="h-3.5 w-3.5 text-white" />
                </div>
                My Documents
                <Badge className="text-[10px] px-1.5 py-0 border-0 bg-teal-50 text-teal-700 font-medium hover:bg-teal-50">
                  {filteredDocs.length} of {documents.length}
                </Badge>
              </CardTitle>
              {/* Filters */}
              <div className="flex items-center gap-2">
                <select
                  value={typeFilter}
                  onChange={e => setTypeFilter(e.target.value)}
                  className="h-7 text-xs rounded-lg bg-muted/50 border border-border/60 px-2 focus:ring-primary focus:outline-none"
                >
                  <option value="all">All Types</option>
                  <option value="business_license">Business License</option>
                  <option value="tax_clearance">Tax Clearance</option>
                  <option value="portfolio">Portfolio</option>
                  <option value="certificate">Certificate</option>
                  <option value="other">Other</option>
                </select>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="h-7 text-xs rounded-lg bg-muted/50 border border-border/60 px-2 focus:ring-primary focus:outline-none"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-14 bg-muted/50 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : filteredDocs.length === 0 ? (
              <div className="text-center py-8">
                <div className="p-3 rounded-2xl gradient-teal w-fit mx-auto mb-4">
                  <FileText className="h-8 w-8 text-white" />
                </div>
                <p className="text-sm font-medium">{statusFilter !== 'all' || typeFilter !== 'all' ? 'No documents match your filters' : 'No documents uploaded yet'}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {statusFilter !== 'all' || typeFilter !== 'all' ? 'Try changing your filter settings' : 'Upload your first document to get started'}
                </p>
                {(statusFilter !== 'all' || typeFilter !== 'all') && (
                  <Button variant="ghost" size="sm" className="text-xs mt-2 text-emerald-600 hover:text-emerald-700" onClick={() => { setStatusFilter('all'); setTypeFilter('all'); }}>
                    Clear filters
                  </Button>
                )}
              </div>
            ) : (
              filteredDocs.map((doc, idx) => {
                  const dtConfig = docTypeConfig(doc.docType);
                  const DtIcon = dtConfig.icon;
                  return (
                    <div key={doc.id}>
                    <div
 className="flex items-center justify-between p-3.5 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors animate-[fadeIn_0.3s_ease-out]"
 >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`p-2 rounded-lg ${dtConfig.bg} flex-shrink-0`}>
                          <DtIcon className={`h-4 w-4 ${dtConfig.color}`} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className={`h-1.5 w-1.5 rounded-full ${statusDot(doc.status)}`} />
                            <p className="text-sm font-medium">{dtConfig.label}</p>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {doc.fileName} &middot; {new Date(doc.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                          {doc.reviewNotes && (
                            <p className="text-xs mt-1 flex items-center gap-1">
                              {doc.status === 'approved' ? (
                                <span className="text-emerald-600 flex items-center gap-1"><Eye className="h-3 w-3" /> {doc.reviewNotes}</span>
                              ) : doc.status === 'rejected' ? (
                                <span className="text-rose-600 flex items-center gap-1"><Eye className="h-3 w-3" /> {doc.reviewNotes}</span>
                              ) : (
                                <span className="text-amber-600 flex items-center gap-1"><Eye className="h-3 w-3" /> {doc.reviewNotes}</span>
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Sign & Stamp button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-[10px] text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-lg"
                          onClick={(e) => { e.stopPropagation(); setSelectedDocId(doc.id); setStampSelectorOpen(true); }}
                        >
                          <Stamp className="h-3 w-3 mr-1" /> Sign & Stamp
                        </Button>
                        <Badge className={`text-[10px] px-1.5 py-0 border-0 rounded-lg ${statusBadge(doc.status)} flex-shrink-0`}>{doc.status}</Badge>
                      </div>
                    </div>
                    {/* Applied stamps for this document */}
                    {docStamps[doc.id] && docStamps[doc.id].length > 0 && (
                      <div className="flex items-center gap-2 mt-1 ml-11">
                        {docStamps[doc.id].map((stamp, sIdx) => (
                          <div key={`${stamp.id}-${sIdx}`} className="flex items-center gap-1.5 p-1 bg-orange-50/50 border border-orange-100 rounded-lg">
                            <div className="w-6 h-5 bg-white rounded overflow-hidden p-0.5">
                              <img src={stamp.dataUrl} alt={stamp.label} className="max-w-full max-h-full object-contain" />
                            </div>
                            <span className="text-[9px] text-orange-700 font-medium">{stamp.label}</span>
                            <button
                              className="h-3.5 w-3.5 rounded-full hover:bg-orange-100 flex items-center justify-center"
                              onClick={() => setDocStamps(prev => ({
                                ...prev,
                                [doc.id]: (prev[doc.id] || []).filter((_, i) => i !== sIdx),
                              }))}
                            >
                              <X className="h-2.5 w-2.5 text-orange-400" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    </div>
                  );
                })
            )}
          </CardContent>
        </Card>
      </div>
      {/* Stamp & Signature Selector Dialog */}
      <StampSignatureSelector
        hook={stampSigHook}
        open={stampSelectorOpen}
        onClose={() => { setStampSelectorOpen(false); setSelectedDocId(null); }}
        onSelect={(item) => {
          if (selectedDocId) {
            setDocStamps(prev => ({
              ...prev,
              [selectedDocId]: [...(prev[selectedDocId] || []), item],
            }));
            toast.success(`${item.label} applied to document`);
          }
          setStampSelectorOpen(false);
          setSelectedDocId(null);
        }}
        title="Select Stamp or Signature for Document"
      />
    </div>
  );
}
