'use client';

import { useMemo, useState } from 'react';
import { useAuthStore } from '@/store';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { User, Mail, Phone, MapPin, Building, Shield, Edit2, Save, X } from 'lucide-react';

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

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">My Profile</h2>
          <p className="text-muted-foreground text-sm">Manage your personal information and verification status</p>
        </div>
        {!editing ? (
          <Button variant="outline" onClick={() => setEditing(true)}>
            <Edit2 className="h-4 w-4 mr-2" /> Edit Profile
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditing(false)}><X className="h-4 w-4 mr-1" /> Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSave}><Save className="h-4 w-4 mr-1" /> Save</Button>
          </div>
        )}
      </div>

      {/* Verification Status */}
      <Card>
        <CardContent className="p-4 flex items-center gap-4">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold ${
            profile?.verified ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
          }`}>
            {(profile?.fullName || 'U')[0].toUpperCase()}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold">{profile?.fullName || 'Complete your profile'}</h3>
            <p className="text-sm text-muted-foreground">{profile?.type === 'company' ? profile.companyName : 'Individual'}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={profile?.verified ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>
                <Shield className="h-3 w-3 mr-1" /> {profile?.verified ? 'Verified' : 'Pending Verification'}
              </Badge>
              <Badge variant="outline" className="capitalize">{user?.role?.replace('_', ' ')}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Details */}
      <Card>
        <CardHeader><CardTitle className="text-base">Profile Information</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1"><User className="h-3 w-3" /> Full Name</Label>
              {editing ? (
                <Input value={form.fullName} onChange={e => setForm(d => ({ ...d, fullName: e.target.value }))} />
              ) : (
                <p className="text-sm p-2 bg-gray-50 rounded">{profile?.fullName || '-'}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1"><Mail className="h-3 w-3" /> Email</Label>
              <p className="text-sm p-2 bg-gray-50 rounded">{user?.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1"><Phone className="h-3 w-3" /> Phone</Label>
              {editing ? (
                <Input value={form.phone} onChange={e => setForm(d => ({ ...d, phone: e.target.value }))} />
              ) : (
                <p className="text-sm p-2 bg-gray-50 rounded">{profile?.phone || '-'}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1"><MapPin className="h-3 w-3" /> Location</Label>
              {editing ? (
                <Input value={form.location} onChange={e => setForm(d => ({ ...d, location: e.target.value }))} />
              ) : (
                <p className="text-sm p-2 bg-gray-50 rounded">{profile?.location || '-'}</p>
              )}
            </div>
          </div>

          {profile?.type === 'company' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><Building className="h-3 w-3" /> Company Name</Label>
                {editing ? (
                  <Input value={form.companyName} onChange={e => setForm(d => ({ ...d, companyName: e.target.value }))} />
                ) : (
                  <p className="text-sm p-2 bg-gray-50 rounded">{profile?.companyName || '-'}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>TIN Number</Label>
                {editing ? (
                  <Input value={form.tinNumber} onChange={e => setForm(d => ({ ...d, tinNumber: e.target.value }))} />
                ) : (
                  <p className="text-sm p-2 bg-gray-50 rounded">{profile?.tinNumber || '-'}</p>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Skill Tags</Label>
            {editing ? (
              <div className="flex flex-wrap gap-2">
                {SKILL_OPTIONS.map(skill => (
                  <Badge key={skill} variant={selectedSkills.includes(skill) ? 'default' : 'outline'}
                    className="cursor-pointer text-xs" onClick={() => toggleSkill(skill)}>
                    {skill}
                  </Badge>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {profile?.skillTags?.split(',').filter(Boolean).map(tag => (
                  <Badge key={tag} variant="secondary" className="text-xs">{tag.trim()}</Badge>
                )) || <p className="text-sm text-muted-foreground">No skills listed</p>}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Bio / Portfolio</Label>
            {editing ? (
              <Textarea value={form.bio} onChange={e => setForm(d => ({ ...d, bio: e.target.value }))} rows={4} />
            ) : (
              <p className="text-sm p-2 bg-gray-50 rounded whitespace-pre-wrap">{profile?.bio || 'No bio provided'}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
