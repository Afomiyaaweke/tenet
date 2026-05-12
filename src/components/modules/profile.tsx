'use client';

import { useState } from 'react';
import { useAuthStore } from '@/store';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  User, Mail, Phone, MapPin, Building, Shield, Edit2, Save, X,
  CheckCircle, Briefcase, FileText, MapPinned,
} from 'lucide-react';

const SKILL_OPTIONS = [
  'Construction', 'IT', 'Supply', 'Consulting', 'Engineering',
  'Architecture', 'Electrical', 'Plumbing', 'HVAC', 'Landscaping',
  'Interior Design', 'Project Management', 'Logistics', 'Manufacturing',
  'Healthcare', 'Education', 'Finance', 'Legal', 'Agriculture', 'Telecommunications'
];

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

  const profile = user?.profile;
  const isVerified = profile?.verified ?? false;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto view-enter">
      {/* Header */}
      <div className="flex items-center justify-between">
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
            className="rounded-xl border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 transition-colors"
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

      {/* Profile Header Card */}
      <Card className="premium-shadow-lg rounded-xl border-0 bg-white overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
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

            {/* Verification Status Indicator */}
            <div className={`hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-xl ${
              isVerified ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'
            }`}>
              <div className={`w-3 h-3 rounded-full ${isVerified ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`} />
              <span className={`text-xs font-semibold ${isVerified ? 'text-emerald-700' : 'text-amber-700'}`}>
                {isVerified ? 'Identity Verified' : 'Verification Pending'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal Information Section */}
      <Card className="premium-shadow rounded-xl border-0 bg-white overflow-hidden">
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
                <Input className="rounded-lg focus:ring-emerald-500 focus:border-emerald-500 bg-gray-50/80" value={form.fullName} onChange={e => setForm(d => ({ ...d, fullName: e.target.value }))} />
              ) : (
                <p className="text-sm p-2.5 bg-gray-50/80 rounded-lg font-medium">{profile?.fullName || '-'}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                <Mail className="h-3 w-3 text-emerald-500" /> Email
              </Label>
              <p className="text-sm p-2.5 bg-gray-50/80 rounded-lg font-medium">{user?.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                <Phone className="h-3 w-3 text-emerald-500" /> Phone
              </Label>
              {editing ? (
                <Input className="rounded-lg focus:ring-emerald-500 focus:border-emerald-500 bg-gray-50/80" value={form.phone} onChange={e => setForm(d => ({ ...d, phone: e.target.value }))} />
              ) : (
                <p className="text-sm p-2.5 bg-gray-50/80 rounded-lg font-medium">{profile?.phone || '-'}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                <MapPin className="h-3 w-3 text-emerald-500" /> Location
              </Label>
              {editing ? (
                <Input className="rounded-lg focus:ring-emerald-500 focus:border-emerald-500 bg-gray-50/80" value={form.location} onChange={e => setForm(d => ({ ...d, location: e.target.value }))} />
              ) : (
                <p className="text-sm p-2.5 bg-gray-50/80 rounded-lg font-medium">{profile?.location || '-'}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Company Information Section (conditional) */}
      {profile?.type === 'company' && (
        <Card className="premium-shadow rounded-xl border-0 bg-white overflow-hidden">
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
                  <Input className="rounded-lg focus:ring-emerald-500 focus:border-emerald-500 bg-gray-50/80" value={form.companyName} onChange={e => setForm(d => ({ ...d, companyName: e.target.value }))} />
                ) : (
                  <p className="text-sm p-2.5 bg-gray-50/80 rounded-lg font-medium">{profile?.companyName || '-'}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                  <FileText className="h-3 w-3 text-teal-500" /> TIN Number
                </Label>
                {editing ? (
                  <Input className="rounded-lg focus:ring-emerald-500 focus:border-emerald-500 bg-gray-50/80" value={form.tinNumber} onChange={e => setForm(d => ({ ...d, tinNumber: e.target.value }))} />
                ) : (
                  <p className="text-sm p-2.5 bg-gray-50/80 rounded-lg font-medium">{profile?.tinNumber || '-'}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Skills Section */}
      <Card className="premium-shadow rounded-xl border-0 bg-white overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <div className="p-1.5 rounded-lg gradient-amber">
              <Briefcase className="h-3.5 w-3.5 text-white" />
            </div>
            Skills & Expertise
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
                        : 'bg-gray-100 text-muted-foreground hover:bg-emerald-50 hover:text-emerald-700 border border-border/60'
                    }`}
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
                    className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60"
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

      {/* Bio Section */}
      <Card className="premium-shadow rounded-xl border-0 bg-white overflow-hidden">
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
              className="rounded-lg focus:ring-emerald-500 focus:border-emerald-500 bg-gray-50/80 min-h-[120px]"
              value={form.bio}
              onChange={e => setForm(d => ({ ...d, bio: e.target.value }))}
              rows={4}
              placeholder="Write a brief description about yourself or your company..."
            />
          ) : (
            <p className="text-sm p-3 bg-gray-50/80 rounded-lg whitespace-pre-wrap leading-relaxed">
              {profile?.bio || 'No bio provided'}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
