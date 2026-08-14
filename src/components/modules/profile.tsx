'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useAuthStore, useNavStore } from '@/store';
import { api, Document, Company } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  User, Mail, Phone, MapPin, Building, Shield, Edit2, Save, X,
  CheckCircle, Briefcase, FileText, Upload, Clock, XCircle,
  Award, Receipt, FolderOpen, File, Camera, Users, UserCircle,
  Globe, MapPinned, Hash, ExternalLink, Plus, ChevronRight,
  Lock, Eye, PenTool, Settings, FileCheck, ClipboardList,
} from 'lucide-react';
import { StampSignatureManager } from '@/components/stamp-signature';
// ==========================================
// Constants
// ==========================================

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

// Role configuration
type UserRole = 'team_admin' | 'user';

interface RoleConfig {
  label: string;
  description: string;
  icon: typeof Shield;
  badgeClass: string;
  permissions: { label: string; icon: typeof Eye }[];
}

const ROLE_CONFIG: Record<UserRole, RoleConfig> = {
  team_admin: {
    label: 'Team Admin',
    description: 'Company management',
    icon: Users,
    badgeClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    permissions: [
      { label: 'Create tenders', icon: ClipboardList },
      { label: 'Review bids', icon: FileCheck },
      { label: 'Manage team members', icon: Users },
      { label: 'Company settings', icon: Settings },
      { label: 'Submit bids', icon: PenTool },
      { label: 'View tenders', icon: Eye },
      { label: 'Manage own profile & documents', icon: User },
    ],
  },
  user: {
    label: 'User',
    description: 'Standard access',
    icon: UserCircle,
    badgeClass: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    permissions: [
      { label: 'Submit bids', icon: PenTool },
      { label: 'View tenders', icon: Eye },
      { label: 'Manage own profile', icon: User },
      { label: 'Upload documents', icon: FileText },
    ],
  },
};

// Document helpers
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

function getProfileCompleteness(profile: Record<string, unknown> | undefined | null): { pct: number; missing: string[] } {
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

// Team member type for the role management section
interface TeamMember {
  id: string;
  email: string;
  role: UserRole;
  status: string;
  createdAt: string;
  profile?: { fullName: string; jobTitle?: string };
}

// ==========================================
// Main Component
// ==========================================

export function ProfileView() {
  const { user, setUser, company } = useAuthStore();
  const { setView } = useNavStore();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(() => ({
    fullName: user?.profile?.fullName || '',
    jobTitle: user?.profile?.jobTitle || '',
    phone: user?.profile?.phone || '',
    location: user?.profile?.location || '',
    address: user?.profile?.address || '',
    bio: user?.profile?.bio || '',
    skillTags: user?.profile?.skillTags || '',
  }));
  const [companyEditing, setCompanyEditing] = useState(false);
  const [companyForm, setCompanyForm] = useState(() => ({
    name: company?.name || '',
    industry: company?.industry || 'General',
    tinNumber: company?.tinNumber || '',
    registrationNo: company?.registrationNo || '',
    phone: company?.phone || '',
    email: company?.email || '',
    city: company?.city || '',
    country: company?.country || 'Ethiopia',
    address: company?.address || '',
    website: company?.website || '',
  }));
  const [selectedSkills, setSelectedSkills] = useState<string[]>(
    () => (user?.profile?.skillTags || '').split(',').map(s => s.trim()).filter(Boolean)
  );
  const [documents, setDocuments] = useState<Document[]>([]);
  const [docType, setDocType] = useState('business_license');
  const [docsLoading, setDocsLoading] = useState(false);
  const [companyData, setCompanyData] = useState<Company | null>(company || null);
  const [companyLoading, setCompanyLoading] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [changingRole, setChangingRole] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const profile = user?.profile;
  const isVerified = profile?.verified ?? false;
  const userRole = (user?.role || 'user') as UserRole;
  const roleConfig = ROLE_CONFIG[userRole];
  const isTeamAdmin = userRole === 'team_admin';
  const hasCompany = !!(user?.companyId || companyData);
  const completeness = getProfileCompleteness(profile as Record<string, unknown> | undefined | null);
  const approvedDocs = documents.filter(d => d.status === 'approved').length;
  const pendingDocs = documents.filter(d => d.status === 'pending').length;

  // Handle profile photo upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Please upload a JPEG, PNG, or WebP image');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'profile');

      const res = await api.upload('/profiles/upload-photo', formData);
      if (res.success && res.data) {
        // Update the user in the store so the photo appears everywhere
        if (user && setUser) {
          setUser({
            ...user,
            profile: { ...user.profile!, profilePhoto: res.data.profilePhoto },
          });
        }
        toast.success('Profile photo updated');
      } else {
        toast.error(res.error || 'Failed to upload photo');
      }
    } catch {
      toast.error('Failed to upload photo');
    }

    // Reset input
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  // Load documents
  const loadDocs = useCallback(async () => {
    setDocsLoading(true);
    const res = await api.get('/documents');
    if (res.success) setDocuments(res.data);
    setDocsLoading(false);
  }, []);

  // Load company details
  const loadCompany = async () => {
    if (!user?.companyId) return;
    setCompanyLoading(true);
    const res = await api.get(`/companies/${user.companyId}`);
    if (res.success) {
      setCompanyData(res.data);
    }
    setCompanyLoading(false);
  };

  // Load team members (for team_admin)
  const loadTeamMembers = async () => {
    if (!isTeamAdmin) return;
    setTeamLoading(true);
    try {
      if (user?.companyId) {
        const res = await api.get(`/companies/${user.companyId}`);
        if (res.success && res.data.users) {
          setTeamMembers(res.data.users);
        }
      } else if (isTeamAdmin) {
        // Team admin without company can see all users via profiles
        const res = await api.get('/profiles');
        if (res.success) {
          const members: TeamMember[] = res.data.map((p: { user: { id: string; email: string; role: UserRole; status: string; createdAt: string }; fullName: string; jobTitle?: string }) => ({
            id: p.user.id,
            email: p.user.email,
            role: p.user.role,
            status: p.user.status,
            createdAt: p.user.createdAt,
            profile: { fullName: p.fullName, jobTitle: p.jobTitle },
          }));
          setTeamMembers(members);
        }
      }
    } catch {
      // Silently fail
    }
    setTeamLoading(false);
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadDocs(); }, [loadDocs]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (user?.companyId && !companyData) loadCompany(); }, [user?.companyId, companyData]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadTeamMembers(); }, [isTeamAdmin, user?.companyId]);

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

  const handleCompanySave = async () => {
    if (!companyData?.id) return;
    const res = await api.put(`/companies/${companyData.id}`, companyForm);
    if (res.success) {
      toast.success('Company information updated!');
      setCompanyEditing(false);
      setCompanyData(res.data);
      // Refresh user data so store stays in sync
      const meRes = await api.get('/auth/me');
      if (meRes.success) setUser(meRes.data);
    } else {
      toast.error(res.error || 'Failed to update company');
    }
  };

  const startCompanyEdit = () => {
    setCompanyForm({
      name: companyData?.name || '',
      industry: companyData?.industry || 'General',
      tinNumber: companyData?.tinNumber || '',
      registrationNo: companyData?.registrationNo || '',
      phone: companyData?.phone || '',
      email: companyData?.email || '',
      city: companyData?.city || '',
      country: companyData?.country || 'Ethiopia',
      address: companyData?.address || '',
      website: companyData?.website || '',
    });
    setCompanyEditing(true);
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

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    if (!isTeamAdmin) return;
    setChangingRole(userId);
    const res = await api.patch(`/users/${userId}/role`, { role: newRole });
    if (res.success) {
      toast.success('Role updated successfully');
      loadTeamMembers();
    } else {
      toast.error(res.error || 'Failed to update role');
    }
    setChangingRole(null);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto view-enter">
      {/* Header */}
      <div
 className="flex items-center justify-between animate-[fadeIn_0.3s_ease-out]">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl gradient-emerald flex-shrink-0 shadow-md shadow-emerald-200/50">
            <User className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              <span className="text-gradient-emerald">My Profile</span>
            </h2>
            <p className="text-muted-foreground text-sm mt-0.5">Manage your profile, company info, and access level</p>
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
      </div>

      {/* ==========================================
          COMPANY SECTION (top of profile)
          ========================================== */}
      <div className="animate-[fadeIn_0.3s_ease-out]">
        <Card className="premium-shadow rounded-xl border-0 bg-card overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-teal-500/10">
                <Building className="h-3.5 w-3.5 text-teal-600" />
              </div>
              Company
              {companyData?.verified && (
                <Badge className="text-[10px] px-1.5 py-0 border-0 bg-emerald-50 text-emerald-700 ml-1">
                  <CheckCircle className="h-2.5 w-2.5 mr-0.5" /> Verified
                </Badge>
              )}
              {isTeamAdmin && hasCompany && !companyEditing && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto h-7 px-2 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                  onClick={startCompanyEdit}
                >
                  <Edit2 className="h-3 w-3 mr-1" /> Edit
                </Button>
              )}
              {companyEditing && (
                <div className="ml-auto flex items-center gap-1">
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setCompanyEditing(false)}>
                    <X className="h-3 w-3 mr-0.5" /> Cancel
                  </Button>
                  <Button size="sm" className="h-7 px-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleCompanySave}>
                    <Save className="h-3 w-3 mr-0.5" /> Save
                  </Button>
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {companyLoading ? (
              <div className="space-y-3">
                <div className="h-10 bg-muted/50 rounded-lg animate-pulse" />
                <div className="h-10 bg-muted/50 rounded-lg animate-pulse w-2/3" />
              </div>
            ) : hasCompany && companyData ? (
              <div className="space-y-4">
                {/* Company header */}
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center flex-shrink-0">
                    <Building className="h-5 w-5 text-teal-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {companyEditing ? (
                      <Input
                        value={companyForm.name}
                        onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                        className="h-8 text-sm font-bold"
                        placeholder="Company name"
                      />
                    ) : (
                      <>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-foreground">{companyData.name}</h4>
                          {companyData.verified && (
                            <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{companyData.industry}</p>
                      </>
                    )}
                  </div>
                  {!companyEditing && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-lg text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => setView('admin', { tab: 'companies' })}
                    >
                      View Details <ChevronRight className="h-3 w-3 ml-0.5" />
                    </Button>
                  )}
                </div>

                {/* Company details grid */}
                {companyEditing ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Industry</Label>
                        <Input
                          value={companyForm.industry}
                          onChange={(e) => setCompanyForm({ ...companyForm, industry: e.target.value })}
                          className="h-8 text-xs mt-1"
                          placeholder="e.g. Construction"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">TIN Number</Label>
                        <Input
                          value={companyForm.tinNumber}
                          onChange={(e) => setCompanyForm({ ...companyForm, tinNumber: e.target.value })}
                          className="h-8 text-xs mt-1"
                          placeholder="TIN..."
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Registration No.</Label>
                        <Input
                          value={companyForm.registrationNo}
                          onChange={(e) => setCompanyForm({ ...companyForm, registrationNo: e.target.value })}
                          className="h-8 text-xs mt-1"
                          placeholder="REG..."
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Phone</Label>
                        <Input
                          value={companyForm.phone}
                          onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                          className="h-8 text-xs mt-1"
                          placeholder="+251..."
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Email</Label>
                        <Input
                          value={companyForm.email}
                          onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                          className="h-8 text-xs mt-1"
                          placeholder="info@company.com"
                          type="email"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Website</Label>
                        <Input
                          value={companyForm.website}
                          onChange={(e) => setCompanyForm({ ...companyForm, website: e.target.value })}
                          className="h-8 text-xs mt-1"
                          placeholder="https://company.com"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">City</Label>
                        <Input
                          value={companyForm.city}
                          onChange={(e) => setCompanyForm({ ...companyForm, city: e.target.value })}
                          className="h-8 text-xs mt-1"
                          placeholder="Addis Ababa"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Country</Label>
                        <Input
                          value={companyForm.country}
                          onChange={(e) => setCompanyForm({ ...companyForm, country: e.target.value })}
                          className="h-8 text-xs mt-1"
                          placeholder="Ethiopia"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Address</Label>
                      <Input
                        value={companyForm.address}
                        onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                        className="h-8 text-xs mt-1"
                        placeholder="Street address"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {companyData.city && (
                      <div className="flex items-center gap-2 p-2.5 bg-muted/30 rounded-lg">
                        <MapPinned className="h-3.5 w-3.5 text-teal-500 flex-shrink-0" />
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Location</p>
                          <p className="text-xs font-medium">{companyData.city}{companyData.country ? `, ${companyData.country}` : ''}</p>
                        </div>
                      </div>
                    )}
                    {companyData.tinNumber && (
                      <div className="flex items-center gap-2 p-2.5 bg-muted/30 rounded-lg">
                        <Hash className="h-3.5 w-3.5 text-teal-500 flex-shrink-0" />
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">TIN Number</p>
                          <p className="text-xs font-medium">{companyData.tinNumber}</p>
                        </div>
                      </div>
                    )}
                    {companyData.registrationNo && (
                      <div className="flex items-center gap-2 p-2.5 bg-muted/30 rounded-lg">
                        <FileText className="h-3.5 w-3.5 text-teal-500 flex-shrink-0" />
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Registration No.</p>
                          <p className="text-xs font-medium">{companyData.registrationNo}</p>
                        </div>
                      </div>
                    )}
                    {companyData.industry && (
                      <div className="flex items-center gap-2 p-2.5 bg-muted/30 rounded-lg">
                        <Briefcase className="h-3.5 w-3.5 text-teal-500 flex-shrink-0" />
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Industry</p>
                          <p className="text-xs font-medium">{companyData.industry}</p>
                        </div>
                      </div>
                    )}
                    {companyData.phone && (
                      <div className="flex items-center gap-2 p-2.5 bg-muted/30 rounded-lg">
                        <Phone className="h-3.5 w-3.5 text-teal-500 flex-shrink-0" />
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Phone</p>
                          <p className="text-xs font-medium">{companyData.phone}</p>
                        </div>
                      </div>
                    )}
                    {companyData.website && (
                      <div className="flex items-center gap-2 p-2.5 bg-muted/30 rounded-lg">
                        <Globe className="h-3.5 w-3.5 text-teal-500 flex-shrink-0" />
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Website</p>
                          <p className="text-xs font-medium truncate max-w-[200px]">{companyData.website}</p>
                        </div>
                      </div>
                    )}
                    {companyData.email && (
                      <div className="flex items-center gap-2 p-2.5 bg-muted/30 rounded-lg">
                        <Mail className="h-3.5 w-3.5 text-teal-500 flex-shrink-0" />
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Email</p>
                          <p className="text-xs font-medium">{companyData.email}</p>
                        </div>
                      </div>
                    )}
                    {companyData.address && (
                      <div className="flex items-center gap-2 p-2.5 bg-muted/30 rounded-lg">
                        <MapPin className="h-3.5 w-3.5 text-teal-500 flex-shrink-0" />
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Address</p>
                          <p className="text-xs font-medium">{companyData.address}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
                  <Building className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">No company associated</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-[280px]">
                  Set up your company to access team management, create tenders, and more.
                </p>
                <Button
                  variant="outline"
                  className="mt-4 rounded-xl border-dashed"
                  onClick={() => setView('admin', { tab: 'companies' })}
                >
                  <Plus className="h-4 w-4 mr-1.5" /> Set Up Your Company
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ==========================================
          ROLE & ACCESS SECTION
          ========================================== */}
      <div className="animate-[fadeIn_0.3s_ease-out]">
        <Card className="premium-shadow rounded-xl border-0 bg-card overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-orange-500/10">
                <Shield className="h-3.5 w-3.5 text-orange-600" />
              </div>
              Role & Access Level
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Role Badge */}
            <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-xl">
              <div className={`p-2.5 rounded-xl ${roleConfig.badgeClass}`}>
                <roleConfig.icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold">{roleConfig.label}</span>
                  <Badge className={`text-[10px] px-2 py-0 border-0 font-semibold ${roleConfig.badgeClass}`}>
                    {roleConfig.description}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {user?.email}
                </p>
              </div>
            </div>

            {/* Permissions Checklist */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Permissions</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {roleConfig.permissions.map((perm) => {
                  const PermIcon = perm.icon;
                  return (
                    <div key={perm.label} className="flex items-center gap-2 px-3 py-2 bg-muted/20 rounded-lg">
                      <PermIcon className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                      <span className="text-xs font-medium text-foreground">{perm.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ==========================================
          PROFILE HEADER CARD
          ========================================== */}
      <div className="animate-[fadeIn_0.3s_ease-out]">
        <Card className="premium-shadow-lg rounded-xl border-0 bg-card overflow-hidden">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
              {/* Avatar */}
              <div className="relative flex-shrink-0 group">
                <div className="w-20 h-20 rounded-2xl gradient-emerald flex items-center justify-center shadow-lg shadow-emerald-200/40 overflow-hidden">
                  {profile?.profilePhoto ? (
                    <img
                      src={profile.profilePhoto}
                      alt={profile?.fullName || 'Profile'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-white font-bold text-3xl">
                      {(profile?.fullName || 'U')[0].toUpperCase()}
                    </span>
                  )}
                </div>
                {isVerified && (
                  <span className="absolute -bottom-1 -right-1 w-7 h-7 bg-emerald-500 rounded-xl border-3 border-white flex items-center justify-center shadow-md shadow-emerald-200">
                    <CheckCircle className="w-4 h-4 text-white" strokeWidth={2.5} />
                  </span>
                )}
                {editing && (
                  <div
                    className="absolute inset-0 rounded-2xl bg-black/40 flex items-center justify-center cursor-pointer hover:bg-black/50 transition-colors"
                    onClick={() => photoInputRef.current?.click()}
                  >
                    <Camera className="h-5 w-5 text-white" />
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handlePhotoUpload}
                    />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 text-center sm:text-left">
                <h3 className="text-xl font-bold text-foreground">{profile?.fullName || 'Complete your profile'}</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {profile?.jobTitle || (hasCompany ? 'Team Member' : 'Individual Professional')}
                  {companyData ? ` at ${companyData.name}` : ''}
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
                  <Badge className={`text-xs px-3 py-1 border-0 font-semibold ${roleConfig.badgeClass}`}>
                    <roleConfig.icon className="h-3 w-3 mr-1.5" />
                    {roleConfig.label}
                  </Badge>
                  {hasCompany && (
                    <Badge className="text-xs px-3 py-1 border-0 font-semibold bg-teal-50 text-teal-700">
                      <Building className="h-3 w-3 mr-1.5" />
                      {companyData?.name}
                    </Badge>
                  )}
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
                    <div
 className={`h-full rounded-full ${
 completeness.pct >= 80 ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' :
 completeness.pct >= 50 ? 'bg-gradient-to-r from-amber-400 to-amber-600' :
 'bg-gradient-to-r from-rose-400 to-rose-600'
 } transition-[width] duration-700`} style={{ width: `${completeness.pct}%` }}
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
      </div>

      {/* ==========================================
          PERSONAL INFORMATION
          ========================================== */}
      <div className="animate-[fadeIn_0.3s_ease-out]">
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
                  <Briefcase className="h-3 w-3 text-emerald-500" /> Job Title
                </Label>
                {editing ? (
                  <Input className="rounded-lg focus:ring-primary focus:border-primary bg-muted/50" value={form.jobTitle} onChange={e => setForm(d => ({ ...d, jobTitle: e.target.value }))} placeholder="e.g. Senior Engineer, Project Manager" />
                ) : (
                  <p className="text-sm p-2.5 bg-muted/50 rounded-lg font-medium">{profile?.jobTitle || '-'}</p>
                )}
              </div>
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
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                  <MapPin className="h-3 w-3 text-emerald-500" /> Address
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
      </div>

      {/* ==========================================
          SKILLS SECTION
          ========================================== */}
      <div className="animate-[fadeIn_0.3s_ease-out]">
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
                    <button
 key={skill}
 onClick={() => toggleSkill(skill)}
 className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
 isSelected
 ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200/50 hover:bg-emerald-600'
 : 'bg-muted text-muted-foreground hover:bg-primary/10 hover:text-emerald-700 border border-border/60'
 } active:scale-95 transition-transform`}
 >
                      {skill}
                    </button>
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
      </div>

      {/* ==========================================
          BIO SECTION
          ========================================== */}
      <div className="animate-[fadeIn_0.3s_ease-out]">
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
      </div>

      {/* ==========================================
          VERIFICATION DOCUMENTS
          ========================================== */}
      <div className="animate-[fadeIn_0.3s_ease-out]">
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
                {documents.map(doc => {
                    const dtConfig = docTypeConfig(doc.docType);
                    const DtIcon = dtConfig.icon;
                    return (
                      <div
 key={doc.id}
 className="flex items-center justify-between p-3.5 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors animate-[fadeIn_0.3s_ease-out]"
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
                      </div>
                    );
                  })}
</div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-3">No documents uploaded yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ==========================================
          TEAM MANAGEMENT (team_admin)
          ========================================== */}
      {isTeamAdmin && (
        <div className="animate-[fadeIn_0.3s_ease-out]">
          <Card className="premium-shadow rounded-xl border-0 bg-card overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-slate-500/10">
                  <Users className="h-3.5 w-3.5 text-slate-600" />
                </div>
                Team Members
                {!teamLoading && teamMembers.length > 0 && (
                  <Badge className="text-[10px] px-1.5 py-0 bg-slate-50 text-slate-700 border-0 font-medium ml-1">
                    {teamMembers.length}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {teamLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-16 bg-muted/50 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : teamMembers.length > 0 ? (
                <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
                  {teamMembers.map((member) => {
                      const memberRole = member.role as UserRole;
                      const memberConfig = ROLE_CONFIG[memberRole];
                      const MemberIcon = memberConfig.icon;
                      const isChanging = changingRole === member.id;

                      return (
                        <div
 key={member.id}
 className="flex items-center justify-between p-3.5 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors gap-3 animate-[fadeIn_0.3s_ease-out]"
 >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className={`p-2 rounded-lg ${memberConfig.badgeClass} flex-shrink-0`}>
                              <MemberIcon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">
                                {member.profile?.fullName || member.email}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {member.profile?.jobTitle && `${member.profile.jobTitle} · `}{member.email}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            {/* Role badge (editable for team_admin) */}
                            {isTeamAdmin && member.id !== user?.id ? (
                              <div className="flex items-center gap-2">
                                <Select
                                  value={memberRole}
                                  onValueChange={(value) => handleRoleChange(member.id, value as UserRole)}
                                  disabled={isChanging}
                                >
                                  <SelectTrigger className="h-8 w-[130px] rounded-lg text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="team_admin">
                                      <span className="flex items-center gap-1.5">
                                        <Users className="h-3 w-3 text-slate-500" /> Team Admin
                                      </span>
                                    </SelectItem>
                                    <SelectItem value="user">
                                      <span className="flex items-center gap-1.5">
                                        <UserCircle className="h-3 w-3 text-gray-500" /> User
                                      </span>
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                                {isChanging && (
                                  <div className="h-4 w-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                                )}
                              </div>
                            ) : (
                              <Badge className={`text-[10px] px-2 py-0.5 border-0 rounded-lg font-semibold ${memberConfig.badgeClass}`}>
                                <MemberIcon className="h-2.5 w-2.5 mr-0.5" />
                                {memberConfig.label}
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
</div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <Users className="h-8 w-8 text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {hasCompany ? 'No team members found' : 'Set up a company to manage team members'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ==========================================
          SIGNATURE & STAMP SECTION
          ========================================== */}
      <div className="animate-[fadeIn_0.3s_ease-out]">
        <StampSignatureManager
          showDraw={true}
          showUpload={true}
          showStampTemplates={true}
          showGallery={true}
        />
      </div>
    </div>
  );
}
