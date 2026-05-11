'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuthStore } from '@/store';
import { api, Document } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { FileText, Upload, CheckCircle2, Clock, XCircle, Shield } from 'lucide-react';

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
      case 'approved': return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case 'rejected': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-amber-500" />;
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-emerald-100 text-emerald-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      default: return 'bg-amber-100 text-amber-700';
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold">Document Vault</h2>
        <p className="text-muted-foreground text-sm">Upload and manage your verification documents</p>
      </div>

      {/* Verification Status */}
      <Card>
        <CardContent className="p-4 flex items-center gap-4">
          <div className={`p-3 rounded-lg ${user?.profile?.verified ? 'bg-emerald-100' : 'bg-amber-100'}`}>
            <Shield className={`h-6 w-6 ${user?.profile?.verified ? 'text-emerald-600' : 'text-amber-600'}`} />
          </div>
          <div>
            <p className="font-medium">{user?.profile?.verified ? 'Verified Account' : 'Verification Pending'}</p>
            <p className="text-sm text-muted-foreground">
              {user?.profile?.verified
                ? 'Your account is verified. You can submit bids.'
                : 'Upload your documents for admin review to get verified.'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Upload Section */}
      <Card>
        <CardHeader><CardTitle className="text-base">Upload Document</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Document Type</label>
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
                className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100" />
            </div>
          </div>
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleUpload}>
            <Upload className="h-4 w-4 mr-2" /> Upload Document
          </Button>
        </CardContent>
      </Card>

      {/* Documents List */}
      <Card>
        <CardHeader><CardTitle className="text-base">My Documents</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-center text-muted-foreground py-4">Loading...</p>
          ) : documents.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No documents uploaded yet</p>
          ) : documents.map(doc => (
            <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                {statusIcon(doc.status)}
                <div>
                  <p className="text-sm font-medium">{doc.docType.replace('_', ' ')}</p>
                  <p className="text-xs text-muted-foreground">{doc.fileName} &middot; {new Date(doc.createdAt).toLocaleDateString()}</p>
                  {doc.reviewNotes && <p className="text-xs text-amber-600 mt-1">{doc.reviewNotes}</p>}
                </div>
              </div>
              <Badge className={`text-xs ${statusBadge(doc.status)}`}>{doc.status}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
