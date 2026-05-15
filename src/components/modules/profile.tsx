'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useAuthStore } from '@/store';
import { api, Document } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  User, Mail, Phone, MapPin, Building, Shield, Edit2, Save, X,
  CheckCircle, Briefcase, FileText, Upload, Clock, XCircle,
  Award, Receipt, FolderOpen, File, Camera,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SKILL_OPTIONS = [
  'Construction', 'IT', 'Supply', 'Consulting', 'Engineering',
  'Architecture', 'Electrical', 'Plumbing', 'HVAC', 'Landscaping',
  'Interior Design', 'Project Management', 'Logistics', 'Manufacturing',
  'Healthcare', 'Education', 'Finance', 'Legal', 'Agriculture', 'Telecommunications'
];

const SKILL_COLORS: Record<string, string> = {
  'Construction': 'bg-amber-50 text-amber-700 border-amber-200/60',
  'IT': 'bg-blue-50 text-blue-700 border-blue-200/60',
  'Supply': 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
  'Consulting': 'bg-purple-50 text-purple-700 border-purple-200/60',
  'Engineering': 'bg-teal-50 text-teal-700 border-teal-200/60',
  'Architecture': 'bg-rose-50 text-rose-700 border-rose-200/60',
  'Electrical': 'bg-yellow-50 text-yellow-700 border-yellow-200/60',
  'Plumbing': 'bg-cyan-50 text-cyan-700 border-cyan-200/60',
  'HVAC': 'bg-orange-50 text-orange-700 border-orange-200/60',
  'Landscaping': 'bg-lime-50 text-lime-700 border-lime-200/60',
  'Interior Design': 'bg-pink-50 text-pink-700 border-pink-200/60',
  'Project Management': 'bg-indigo-50 text-indigo-700 border-indigo-200/60',
  'Logistics': 'bg-sky-50 text-sky-700 border-sky-200/60',
  'Manufacturing': 'bg-stone-50 text-stone-700 border-stone-200/60',
  'Healthcare': 'bg-red-50 text-red-700 border-red-200/60',
  'Education': 'bg-violet-50 text-violet-700 border-violet-200/60',
  'Finance': 'bg-green-50 text-green-700 border-green-200/60',
  'Legal': 'bg-slate-50 text-slate-700 border-slate-200/60',
  'Agriculture': 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
  'Telecommunications': 'bg-blue-50 text-blue-700 border-blue-200/60',
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

const docStatusBadge = (status: string) => {
  switch (status) {
    case 'approved': return 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100';
    case 'rejected': return 'bg-rose-100 text-rose-700 hover:bg-rose-100';
    default: return 'bg-amber-100 text-amber-700 hover:bg-amber-100';
  }
};

const docStatusDot = (status: string) => {
  switch (status) {
    case 'approved': return 'bg-emerald-500';
    case 'rejected': return 'bg-rose-500';
    default: return 'bg-amber-500';
  }
};

function getProfileCompleteness(profile: Record<string, unknown> | undefined): { pct: number; missing: string[] } {
  if (!profile) return { pct: 0, missing: ['Full Name', 'Phone', 'Location', 'Skills', 'Bio'] };
  const checks: [string, boolean][] = [
    ['Full Name', !!(profile.fullName as string)],
    ['Phone', !!(profile.phone as string)],
    ['Location', !!(profile.location as string)],
    ['Skills', !!(profile.skillTags as string)],
    ['Bio', !!(profile.bio as string)],
  ];
  const completed = checks.filter(([, v]) => v).length;
  const missing = checks.filter(([, v]) => !v).map(([label]) => label);
  return { pct: Math.round((completed / checks.length) * 100), missing };
}

const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.35, ease: 'easeOut' },
  }),
};

export function ProfileView() {
  const { user, setUser } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(() => ({
    fullName: user?.profile?.fullName || '',
    phone: user?.profile?.phone || '',
    location: user?.profile?.location || '',
    address: user?.profile?.address || '',
    companyName: user?.profile?.companyName || '',
    tinNumber: user?.profile?.tinNumber || '',
    licenseNumber: user?.profile?.licenseNumber || '',
    bio: user?.profile?.bio || '',
    skillTags: user?.profile?.skillTags || '',
  }));
  const [selectedSkills, setSelectedSkills] = useState<string[]>(
    () => (user?.profile?.skillTags || '').split(',').map(s => s.trim()).filter(Boolean)
  );
  const [documents, setDocuments] = useState<Document[]>([]);
  const [docType, setDocType] = useState('business_license');
  const [docsLoading, setDocsLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadDocs = useCallback(async () => {
    setDocsLoading(true);
    const res = await api.get('/documents');
    if (res.success) setDocuments(res.data);
    setDocsLoading(false);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadDocs(); }, [loadDocs]);

  const handleSave = async () => {
    const profileId = user?.profile?.id;
    if (!profileId) return;
    const res = await api.put(`/profiles/${profileId}`, {
      ...form,
      skillTags: selectedSkills.join(','),
    });
    if (res.success) {
      toast.success('Profile updated!');
      setEditing(false);
      // Refresh user data
      const meRes = await api.get('/auth/me');
      if (meRes.success) setUser(meRes.data);
    } else toast.error(res.error || 'Failed to update profile');
  };

  const toggleSkill = (skill: string) => {
    setSelectedSkills(prev => prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]);
  };

  const handleDocUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('docType', docType);
    formData.append('userId', user?.id || '');
    const res = await api.upload('/documents', formData);
    if (res.success) {
      toast.success('Document uploaded for verification');
      loadDocs();
    } else toast.error(res.error || 'Upload failed');
  };

  const profile = user?.profile;
  const isVerified = profile?.verified ?? false;
  const completeness = getProfileCompleteness(profile);
  const approvedDocs = documents.filter(d => d.status === 'approved').length;
  const pendingDocs = documents.filter(d => d.status === 'pending').length;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto view-enter">
      {/* Header */}
      <motion.div custom={0} variants={sectionVariants} initial="hidden" animate="visible"
        className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl gradient-emerald flex-shrink-0 shadow-md shadow-emerald-200/50">
            <User className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              <span className="text-gradient-emerald">My Profile</span>
            </h2>
            <p className="text-muted-foreground text-sm mt-0.5">Manage your personal information and verification status</p>
          </div>
        </div>
        {!editing ? (
          <Button
            variant="outline"
            onClick={() => setEditing(true)}
            className="rounded-xl border-emerald-200 text-emerald-700 hover:bg-primary/10 hover:text-emerald-800 transition-colors"
          >
            <Edit2 className="h-4 w-4 mr-2" /> Edit Profile
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setEditing(false)}
              className="rounded-xl"
            >
              <X className="h-4 w-4 mr-1" /> Cancel
            </Button>
            <Button
              className="gradient-emerald hover:opacity-90 text-white rounded-xl premium-shadow transition-all hover:-translate-y-0.5"
              onClick={handleSave}
            >
              <Save className="h-4 w-4 mr-1" /> Save
            </Button>
          </div>
        )}
      </motion.div>

      {/* Profile Header Card */}
      <motion.div custom={1} variants={sectionVariants} initial="hidden" animate="visible">
        <Card className="premium-shadow-lg rounded-xl border-0 bg-card overflow-hidden">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
              {/* Avatar */}
              <div className="relative flex-shrink-0 group">
                <div className="w-20 h-20 rounded-2xl gradient-emerald flex items-center justify-center shadow-lg shadow-emerald-200/40">
                  <span className="text-white font-bold text-3xl">
                    {(profile?.fullName || 'U')[0].toUpperCase()}
                  </span>
                </div>
                {isVerified && (
                  <span className="absolute -bottom-1 -right-1 w-7 h-7 bg-emerald-500 rounded-xl border-3 border-white flex items-center justify-center shadow-md shadow-emerald-200">
                    <CheckCircle className="w-4 h-4 text-white" strokeWidth={2.5} />
                  </span>
                )}
                {/* Camera overlay for edit mode */}
                {editing && (
                  <div className="absolute inset-0 rounded-2xl bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <Camera className="h-5 w-5 text-white" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 text-center sm:text-left">
                <h3 className="text-xl font-bold text-foreground">{profile?.fullName || 'Complete your profile'}</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {profile?.type === 'company' ? profile.companyName : 'Individual Professional'}
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-3 justify-center sm:justify-start">
                  <Badge className={`text-xs px-3 py-1 border-0 font-semibold ${
                    isVerified
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    <Shield className="h-3 w-3 mr-1.5" />
                    {isVerified ? 'Verified' : 'Pending Verification'}
                  </Badge>
                  <Badge className="text-xs px-3 py-1 border-0 font-semibold bg-emerald-50 text-emerald-700 capitalize">
                    <Briefcase className="h-3 w-3 mr-1.5" />
                    {user?.role?.replace('_', ' ')}
                  </Badge>
                </div>
              </div>

              {/* Verification Status & Completeness */}
              <div className="hidden sm:flex flex-col items-end gap-3">
                <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl ${
                  isVerified ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'
                }`}>
                  <div className={`w-3 h-3 rounded-full ${isVerified ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`} />
                  <span className={`text-xs font-semibold ${isVerified ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {isVerified ? 'Identity Verified' : 'Verification Pending'}
                  </span>
                </div>
                {/* Profile Completeness */}
                <div className="w-40">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Profile</span>
                    <span className={`text-xs font-bold ${completeness.pct >= 80 ? 'text-emerald-600' : completeness.pct >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>
                      {completeness.pct}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${completeness.pct}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className={`h-full rounded-full ${
                        completeness.pct >= 80 ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' :
                        completeness.pct >= 50 ? 'bg-gradient-to-r from-amber-400 to-amber-600' :
                        'bg-gradient-to-r from-rose-400 to-rose-600'
                      }`}
                    />
                  </div>
                  {completeness.missing.length > 0 && !editing && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Add: {completeness.missing.slice(0, 2).join(', ')}{completeness.missing.length > 2 ? '...' : ''}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Personal Information Section */}
      <motion.div custom={2} variants={sectionVariants} initial="hidden" animate="visible">
        <Card className="premium-shadow rounded-xl border-0 bg-card overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <div className="p-1.5 rounded-lg gradient-emerald">
                <User className="h-3.5 w-3.5 text-white" />
              </div>
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                  <User className="h-3 w-3 text-emerald-500" /> Full Name
                </Label>
                {editing ? (
                  <Input className="rounded-lg focus:ring-primary focus:border-primary bg-muted/50" value={form.fullName} onChange={e => setForm(d => ({ ...d, fullName: e.target.value }))} />
                ) : (
                  <p className="text-sm p-2.5 bg-muted/50 rounded-lg font-medium">{profile?.fullName || '-'}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                  <Mail className="h-3 w-3 text-emerald-500" /> Email
                </Label>
                <p className="text-sm p-2.5 bg-muted/50 rounded-lg font-medium">{user?.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                  <Phone className="h-3 w-3 text-emerald-500" /> Phone
                </Label>
                {editing ? (
                  <Input className="rounded-lg focus:ring-primary focus:border-primary bg-muted/50" value={form.phone} onChange={e => setForm(d => ({ ...d, phone: e.target.value }))} />
                ) : (
                  <p className="text-sm p-2.5 bg-muted/50 rounded-lg font-medium">{profile?.phone || '-'}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                  <MapPin className="h-3 w-3 text-emerald-500" /> Location
                </Label>
                {editing ? (
                  <Input className="rounded-lg focus:ring-primary focus:border-primary bg-muted/50" value={form.location} onChange={e => setForm(d => ({ ...d, location: e.target.value }))} />
                ) : (
                  <p className="text-sm p-2.5 bg-muted/50 rounded-lg font-medium">{profile?.location || '-'}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Company Information Section (conditional) */}
      {profile?.type === 'company' && (
        <motion.div custom={3} variants={sectionVariants} initial="hidden" animate="visible">
          <Card className="premium-shadow rounded-xl border-0 bg-card overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <div className="p-1.5 rounded-lg gradient-teal">
                  <Building className="h-3.5 w-3.5 text-white" />
                </div>
                Company Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                    <Building className="h-3 w-3 text-teal-500" /> Company Name
                  </Label>
                  {editing ? (
                    <Input className="rounded-lg focus:ring-primary focus:border-primary bg-muted/50" value={form.companyName} onChange={e => setForm(d => ({ ...d, companyName: e.target.value }))} />
                  ) : (
                    <p className="text-sm p-2.5 bg-muted/50 rounded-lg font-medium">{profile?.companyName || '-'}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                    <FileText className="h-3 w-3 text-teal-500" /> TIN Number
                  </Label>
                  {editing ? (
                    <Input className="rounded-lg focus:ring-primary focus:border-primary bg-muted/50" value={form.tinNumber} onChange={e => setForm(d => ({ ...d, tinNumber: e.target.value }))} />
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="text-sm p-2.5 bg-muted/50 rounded-lg font-medium flex-1">{profile?.tinNumber || '-'}</p>
                      {profile?.tinNumber && (
                        <Badge className="text-[10px] px-1.5 py-0 border-0 bg-teal-50 text-teal-700">TIN</Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                    <Award className="h-3 w-3 text-teal-500" /> License Number
                  </Label>
                  {editing ? (
                    <Input className="rounded-lg focus:ring-primary focus:border-primary bg-muted/50" value={form.licenseNumber} onChange={e => setForm(d => ({ ...d, licenseNumber: e.target.value }))} />
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="text-sm p-2.5 bg-muted/50 rounded-lg font-medium flex-1">{profile?.licenseNumber || '-'}</p>
                      {profile?.licenseNumber && (
                        <Badge className="text-[10px] px-1.5 py-0 border-0 bg-teal-50 text-teal-700">License</Badge>
                      )}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                    <MapPin className="h-3 w-3 text-teal-500" /> Address
                  </Label>
                  {editing ? (
                    <Input className="rounded-lg focus:ring-primary focus:border-primary bg-muted/50" value={form.address} onChange={e => setForm(d => ({ ...d, address: e.target.value }))} />
                  ) : (
                    <p className="text-sm p-2.5 bg-muted/50 rounded-lg font-medium">{profile?.address || '-'}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Skills Section */}
      <motion.div custom={4} variants={sectionVariants} initial="hidden" animate="visible">
        <Card className="premium-shadow rounded-xl border-0 bg-card overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <div className="p-1.5 rounded-lg gradient-amber">
                <Briefcase className="h-3.5 w-3.5 text-white" />
              </div>
              Skills & Expertise
              {selectedSkills.length > 0 && (
                <Badge className="text-[10px] px-1.5 py-0 bg-amber-50 text-amber-700 border-0 font-medium ml-1">
                  {selectedSkills.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {editing ? (
              <div className="flex flex-wrap gap-2">
                {SKILL_OPTIONS.map(skill => {
                  const isSelected = selectedSkills.includes(skill);
                  return (
                    <motion.button
                      key={skill}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => toggleSkill(skill)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                        isSelected
                          ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200/50 hover:bg-emerald-600'
                          : 'bg-muted text-muted-foreground hover:bg-primary/10 hover:text-emerald-700 border border-border/60'
                      }`}
                    >
                      {skill}
                    </motion.button>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {profile?.skillTags?.split(',').filter(Boolean).length ? (
                  profile.skillTags.split(',').filter(Boolean).map(tag => (
                    <span
                      key={tag}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border ${SKILL_COLORS[tag.trim()] || 'bg-emerald-50 text-emerald-700 border-emerald-200/60'}`}
                    >
                      {tag.trim()}
                    </span>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No skills listed</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Bio Section */}
      <motion.div custom={5} variants={sectionVariants} initial="hidden" animate="visible">
        <Card className="premium-shadow rounded-xl border-0 bg-card overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <div className="p-1.5 rounded-lg gradient-rose">
                <FileText className="h-3.5 w-3.5 text-white" />
              </div>
              Bio & Portfolio
            </CardTitle>
          </CardHeader>
          <CardContent>
            {editing ? (
              <Textarea
                className="rounded-lg focus:ring-primary focus:border-primary bg-muted/50 min-h-[120px]"
                value={form.bio}
                onChange={e => setForm(d => ({ ...d, bio: e.target.value }))}
                rows={4}
                placeholder="Write a brief description about yourself or your company..."
              />
            ) : (
              <p className="text-sm p-3 bg-muted/50 rounded-lg whitespace-pre-wrap leading-relaxed">
                {profile?.bio || 'No bio provided'}
              </p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Document Upload & Verification Section */}
      <motion.div custom={6} variants={sectionVariants} initial="hidden" animate="visible">
        <Card className="premium-shadow rounded-xl border-0 bg-card overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <div className="p-1.5 rounded-lg gradient-teal">
                <Shield className="h-3.5 w-3.5 text-white" />
              </div>
              Verification Documents
              {!docsLoading && documents.length > 0 && (
                <Badge className="text-[10px] px-1.5 py-0 bg-teal-50 text-teal-700 border-0 font-medium ml-1">
                  {documents.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Verification Progress */}
            {!isVerified && (
              <div className="bg-amber-50/60 border border-amber-200/60 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1 rounded-md bg-amber-100">
                    <Clock className="h-3.5 w-3.5 text-amber-600" />
                  </div>
                  <p className="text-sm font-semibold text-amber-800">Verification Progress</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      profile?.fullName ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground'
                    }`}>
                      {profile?.fullName ? <CheckCircle className="h-3 w-3" /> : '1'}
                    </div>
                    <span className="text-xs text-muted-foreground">Profile</span>
                  </div>
                  <div className="flex-1 h-px bg-border/60" />
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      documents.length > 0 ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground'
                    }`}>
                      {documents.length > 0 ? <CheckCircle className="h-3 w-3" /> : '2'}
                    </div>
                    <span className="text-xs text-muted-foreground">Documents</span>
                  </div>
                  <div className="flex-1 h-px bg-border/60" />
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      approvedDocs > 0 ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground'
                    }`}>
                      {approvedDocs > 0 ? <CheckCircle className="h-3 w-3" /> : '3'}
                    </div>
                    <span className="text-xs text-muted-foreground">Approval</span>
                  </div>
                </div>
                {pendingDocs > 0 && (
                  <p className="text-xs text-amber-700 mt-3">
                    {pendingDocs} document{pendingDocs > 1 ? 's' : ''} pending review. Admin will verify your documents shortly.
                  </p>
                )}
              </div>
            )}

            {/* Upload area */}
            <div className="border-2 border-dashed border-emerald-200/60 rounded-xl p-5 hover:border-emerald-300 transition-colors bg-emerald-50/20">
              <div className="flex flex-col sm:flex-row gap-3 items-end">
                <div className="flex-1 space-y-2">
                  <Label className="text-sm font-medium">Document Type</Label>
                  <select
                    className="w-full h-9 rounded-xl border border-border/60 bg-card px-3 text-sm focus:ring-primary/20 focus:outline-none"
                    value={docType}
                    onChange={e => setDocType(e.target.value)}
                  >
                    <option value="business_license">Business License</option>
                    <option value="tax_clearance">Tax Clearance</option>
                    <option value="portfolio">Portfolio</option>
                    <option value="certificate">Certificate</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="flex-1 space-y-2">
                  <Label className="text-sm font-medium">Select File</Label>
                  <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png"
                    className="w-full text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 file:cursor-pointer file:transition-colors" />
                </div>
                <Button
                  className="gradient-emerald hover:opacity-90 text-white rounded-xl premium-shadow transition-all hover:-translate-y-0.5 whitespace-nowrap"
                  onClick={handleDocUpload}
                >
                  <Upload className="h-4 w-4 mr-1.5" /> Upload
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground/60 mt-2">Accepted formats: PDF, JPEG, PNG &middot; Max size: 10MB</p>
            </div>

            {/* Documents list */}
            {docsLoading ? (
              <div className="space-y-2">
                {[1, 2].map(i => (
                  <div key={i} className="h-14 bg-muted/50 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : documents.length > 0 ? (
              <div className="space-y-2">
                <AnimatePresence>
                  {documents.map(doc => {
                    const dtConfig = docTypeConfig(doc.docType);
                    const DtIcon = dtConfig.icon;
                    return (
                      <motion.div
                        key={doc.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-between p-3.5 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${dtConfig.bg} flex-shrink-0`}>
                            <DtIcon className={`h-4 w-4 ${dtConfig.color}`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className={`h-1.5 w-1.5 rounded-full ${docStatusDot(doc.status)}`} />
                              <p className="text-sm font-medium">{dtConfig.label}</p>
                            </div>
                            <p className="text-xs text-muted-foreground">{doc.fileName} &middot; {new Date(doc.createdAt).toLocaleDateString()}</p>
                            {doc.reviewNotes && <p className="text-xs text-amber-600 mt-0.5">{doc.reviewNotes}</p>}
                          </div>
                        </div>
                        <Badge className={`text-[10px] px-2 py-0 border-0 rounded-lg ${docStatusBadge(doc.status)}`}>
                          {doc.status === 'approved' && <CheckCircle className="h-2.5 w-2.5 mr-0.5" />}
                          {doc.status === 'rejected' && <XCircle className="h-2.5 w-2.5 mr-0.5" />}
                          {doc.status === 'pending' && <Clock className="h-2.5 w-2.5 mr-0.5" />}
                          {doc.status}
                        </Badge>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-3">No documents uploaded yet</p>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
