'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuthStore } from '@/store';
import { api, Document } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Upload, CheckCircle2, Clock, XCircle, Shield,
  Briefcase, Receipt, FolderOpen, Award, File, ArrowRight,
  Search, Filter, CloudUpload, FileUp, Trash2, Eye,
} from 'lucide-react';

// ─── Animation Variants ─────────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] } },
};

const cardHover = {
  y: -3,
  transition: { duration: 0.2, ease: 'easeOut' },
};

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
      default: return { icon: File, bg: 'bg-gray-50', color: 'text-gray-600', label: type.replace('_', ' ') };
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
    <motion.div
      className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center gap-4">
        <div className="p-3 rounded-2xl gradient-teal shadow-md flex-shrink-0 shadow-teal-200/40">
          <FileText className="h-6 w-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
            <span className="text-gradient-emerald">Document</span> Vault
          </h2>
          <p className="text-muted-foreground text-sm mt-0.5">Upload and manage your verification documents</p>
        </div>
      </motion.div>

      {/* Verification Status */}
      <motion.div variants={itemVariants}>
        <Card className="premium-shadow-lg rounded-xl border-0 bg-white">
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
      </motion.div>

      {/* Stats Summary */}
      {!loading && documents.length > 0 && (
        <motion.div variants={itemVariants} className="grid grid-cols-3 gap-4">
          {[
            { count: pendingCount, label: 'Pending', icon: Clock, bg: 'bg-amber-50', color: 'text-amber-600', dot: 'bg-amber-500' },
            { count: approvedCount, label: 'Approved', icon: CheckCircle2, bg: 'bg-emerald-50', color: 'text-emerald-600', dot: 'bg-emerald-500' },
            { count: rejectedCount, label: 'Rejected', icon: XCircle, bg: 'bg-rose-50', color: 'text-rose-600', dot: 'bg-rose-500' },
          ].map(stat => (
            <motion.div key={stat.label} whileHover={cardHover}>
              <Card className="premium-shadow rounded-xl border-0 bg-white transition-all duration-200 h-full">
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
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Upload Section with Drag-Drop */}
      <motion.div variants={itemVariants}>
        <Card className="premium-shadow rounded-xl border-0 bg-white">
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
                  : 'border-border/60 bg-muted/20 hover:border-emerald-300 hover:bg-emerald-50/20'
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
                  className="text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
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
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50/50 border border-emerald-100"
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
              </motion.div>
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
      </motion.div>

      {/* Documents List */}
      <motion.div variants={itemVariants}>
        <Card className="premium-shadow rounded-xl border-0 bg-white">
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
                  className="h-7 text-xs rounded-lg bg-muted/50 border border-border/60 px-2 focus:ring-emerald-500 focus:outline-none"
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
                  className="h-7 text-xs rounded-lg bg-muted/50 border border-border/60 px-2 focus:ring-emerald-500 focus:outline-none"
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
              <AnimatePresence>
                {filteredDocs.map((doc, idx) => {
                  const dtConfig = docTypeConfig(doc.docType);
                  const DtIcon = dtConfig.icon;
                  return (
                    <motion.div
                      key={doc.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.04, duration: 0.25 }}
                      className="flex items-center justify-between p-3.5 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors"
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
                      <Badge className={`text-[10px] px-1.5 py-0 border-0 rounded-lg ${statusBadge(doc.status)} flex-shrink-0 ml-2`}>{doc.status}</Badge>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
