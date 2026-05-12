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
} from 'lucide-react';

export function DocumentsView() {
  const { user } = useAuthStore();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [docType, setDocType] = useState('business_license');
  const fileRef = useRef<HTMLInputElement>(null);

  const loadDocs = useCallback(async () => {
    setLoading(true);
    const res = await api.get('/documents');
    if (res.success) setDocuments(res.data);
    setLoading(false);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadDocs(); }, [loadDocs]);

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('docType', docType);
    formData.append('userId', user?.id || '');
    const res = await api.upload('/documents', formData);
    if (res.success) {
      toast.success('Document uploaded');
      loadDocs();
    } else toast.error(res.error || 'Upload failed');
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

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto view-enter">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-2xl gradient-teal shadow-md flex-shrink-0">
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
      <Card className="premium-shadow-lg rounded-xl border-0 bg-white">
        <CardContent className="p-5 flex items-center gap-4">
          <div className={`p-3 rounded-2xl flex-shrink-0 ${user?.profile?.verified ? 'gradient-emerald' : 'gradient-amber'}`}>
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div>
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

      {/* Stats Summary */}
      {!loading && documents.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card className="premium-shadow rounded-xl border-0 bg-white hover:-translate-y-0.5 transition-all duration-200">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-50 flex-shrink-0">
                <Clock className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <p className="text-xl font-bold">{pendingCount}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </CardContent>
          </Card>
          <Card className="premium-shadow rounded-xl border-0 bg-white hover:-translate-y-0.5 transition-all duration-200">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-50 flex-shrink-0">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-xl font-bold">{approvedCount}</p>
                <p className="text-xs text-muted-foreground">Approved</p>
              </div>
            </CardContent>
          </Card>
          <Card className="premium-shadow rounded-xl border-0 bg-white hover:-translate-y-0.5 transition-all duration-200">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-rose-50 flex-shrink-0">
                <XCircle className="h-4 w-4 text-rose-600" />
              </div>
              <div>
                <p className="text-xl font-bold">{rejectedCount}</p>
                <p className="text-xs text-muted-foreground">Rejected</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Upload Section */}
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
            <div className="space-y-2">
              <label className="text-sm font-medium">File (PDF, JPEG, PNG)</label>
              <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png"
                className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 file:cursor-pointer" />
            </div>
          </div>
          <Button className="gradient-emerald hover:opacity-90 text-white rounded-xl premium-shadow transition-all hover:-translate-y-0.5" onClick={handleUpload}>
            <Upload className="h-4 w-4 mr-2" /> Upload Document
          </Button>
        </CardContent>
      </Card>

      {/* Documents List */}
      <Card className="premium-shadow rounded-xl border-0 bg-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <div className="p-1.5 rounded-lg gradient-teal">
              <FolderOpen className="h-3.5 w-3.5 text-white" />
            </div>
            My Documents
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-14 bg-muted/50 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8">
              <div className="p-3 rounded-2xl gradient-teal w-fit mx-auto mb-4">
                <FileText className="h-8 w-8 text-white" />
              </div>
              <p className="text-sm font-medium">No documents uploaded yet</p>
              <p className="text-xs text-muted-foreground mt-1">Upload your first document to get started</p>
            </div>
          ) : documents.map(doc => {
            const dtConfig = docTypeConfig(doc.docType);
            const DtIcon = dtConfig.icon;
            return (
              <div key={doc.id} className="flex items-center justify-between p-3.5 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${dtConfig.bg} flex-shrink-0`}>
                    <DtIcon className={`h-4 w-4 ${dtConfig.color}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className={`h-1.5 w-1.5 rounded-full ${statusDot(doc.status)}`} />
                      <p className="text-sm font-medium">{dtConfig.label}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{doc.fileName} &middot; {new Date(doc.createdAt).toLocaleDateString()}</p>
                    {doc.reviewNotes && <p className="text-xs text-amber-600 mt-1">{doc.reviewNotes}</p>}
                  </div>
                </div>
                <Badge className={`text-xs px-2.5 py-0.5 border-0 rounded-lg ${statusBadge(doc.status)}`}>{doc.status}</Badge>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
