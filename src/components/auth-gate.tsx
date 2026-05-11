'use client';

import { useState } from 'react';
import { useAuthStore } from '@/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const SKILL_OPTIONS = [
  'Construction', 'IT', 'Supply', 'Consulting', 'Engineering',
  'Architecture', 'Electrical', 'Plumbing', 'HVAC', 'Landscaping',
  'Interior Design', 'Project Management', 'Logistics', 'Manufacturing',
  'Healthcare', 'Education', 'Finance', 'Legal', 'Agriculture', 'Telecommunications'
];

export function AuthGate() {
  const { login, register } = useAuthStore();
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [regData, setRegData] = useState({
    email: '', password: '', role: 'contractor', fullName: '', phone: '',
    location: '', type: 'individual', companyName: '', tinNumber: '',
    licenseNumber: '', skillTags: '', bio: '',
  });
  const [loading, setLoading] = useState(false);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const ok = await login(loginData.email, loginData.password);
    if (!ok) toast.error('Invalid credentials');
    setLoading(false);
  };

  const toggleSkill = (skill: string) => {
    setSelectedSkills(prev =>
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    );
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const data = {
      ...regData,
      skillTags: selectedSkills.join(','),
    };
    const ok = await register(data);
    if (!ok) toast.error('Registration failed. Email may already exist.');
    else toast.success('Welcome to Afomiya!');
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-emerald-50 via-white to-amber-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center">
              <span className="text-white font-bold text-lg">A</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Afomiya</h1>
              <p className="text-xs text-gray-500">Tender Ecosystem</p>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs">v1.0 MVP</Badge>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Transforming Procurement
            </h2>
            <p className="text-gray-600">
              Connect with verified contractors, discover tenders, and manage projects — all in one platform.
            </p>
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Sign In</TabsTrigger>
              <TabsTrigger value="register">Create Account</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Card>
                <CardHeader>
                  <CardTitle>Welcome Back</CardTitle>
                  <CardDescription>Sign in to your Afomiya account</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" placeholder="you@example.com"
                        value={loginData.email} onChange={e => setLoginData(d => ({ ...d, email: e.target.value }))} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input id="password" type="password" placeholder="••••••••"
                        value={loginData.password} onChange={e => setLoginData(d => ({ ...d, password: e.target.value }))} required />
                    </div>
                    <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={loading}>
                      {loading ? 'Signing in...' : 'Sign In'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="register">
              <Card>
                <CardHeader>
                  <CardTitle>Create Account</CardTitle>
                  <CardDescription>Join the Afomiya Tender Ecosystem</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Account Type</Label>
                        <Select value={regData.role} onValueChange={v => setRegData(d => ({ ...d, role: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="contractor">Contractor / Supplier</SelectItem>
                            <SelectItem value="tender_owner">Tender Owner</SelectItem>
                            <SelectItem value="admin">Administrator</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Profile Type</Label>
                        <Select value={regData.type} onValueChange={v => setRegData(d => ({ ...d, type: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="individual">Individual</SelectItem>
                            <SelectItem value="company">Company</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Full Name *</Label>
                        <Input placeholder="Your full name" required
                          value={regData.fullName} onChange={e => setRegData(d => ({ ...d, fullName: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>Email *</Label>
                        <Input type="email" placeholder="you@example.com" required
                          value={regData.email} onChange={e => setRegData(d => ({ ...d, email: e.target.value }))} />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Password *</Label>
                      <Input type="password" placeholder="Min 8 chars with uppercase, lowercase, number, special" required
                        value={regData.password} onChange={e => setRegData(d => ({ ...d, password: e.target.value }))} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Phone *</Label>
                        <Input placeholder="+251..." required
                          value={regData.phone} onChange={e => setRegData(d => ({ ...d, phone: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>Location *</Label>
                        <Input placeholder="City, Region" required
                          value={regData.location} onChange={e => setRegData(d => ({ ...d, location: e.target.value }))} />
                      </div>
                    </div>

                    {regData.type === 'company' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Company Name *</Label>
                          <Input placeholder="Your company name"
                            value={regData.companyName} onChange={e => setRegData(d => ({ ...d, companyName: e.target.value }))} />
                        </div>
                        <div className="space-y-2">
                          <Label>TIN Number</Label>
                          <Input placeholder="Tax ID"
                            value={regData.tinNumber} onChange={e => setRegData(d => ({ ...d, tinNumber: e.target.value }))} />
                        </div>
                      </div>
                    )}

                    {regData.role === 'contractor' && (
                      <div className="space-y-2">
                        <Label>Skill Tags</Label>
                        <div className="flex flex-wrap gap-2">
                          {SKILL_OPTIONS.map(skill => (
                            <Badge key={skill} variant={selectedSkills.includes(skill) ? 'default' : 'outline'}
                              className="cursor-pointer text-xs"
                              onClick={() => toggleSkill(skill)}>
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Bio / Portfolio</Label>
                      <Textarea placeholder="Brief description of your experience and capabilities"
                        value={regData.bio} onChange={e => setRegData(d => ({ ...d, bio: e.target.value }))} rows={3} />
                    </div>

                    <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={loading}>
                      {loading ? 'Creating Account...' : 'Create Account'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white/80 py-4 text-center text-sm text-gray-500">
        <p>Afomiya Platform &middot; Transforming Procurement Through Technology &middot; v1.0</p>
      </footer>
    </div>
  );
}
