'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/store';
import { api, EventItem } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  GraduationCap, Plus, Calendar, MapPin, Users, Clock, CheckCircle2,
  Wrench, BookOpen, Mic, Sparkles, ArrowRight,
} from 'lucide-react';

export function EventsView() {
  const { user } = useAuthStore();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '', description: '', eventDate: '', location: '', capacity: '50', category: 'workshop',
  });

  const loadEvents = useCallback(async () => {
    setLoading(true);
    const res = await api.get('/events');
    if (res.success) setEvents(res.data);
    setLoading(false);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadEvents(); }, [loadEvents]);

  const handleCreate = async () => {
    const res = await api.post('/events', {
      ...newEvent,
      capacity: parseInt(newEvent.capacity),
    });
    if (res.success) {
      toast.success('Event created!');
      setShowCreate(false);
      loadEvents();
    } else toast.error(res.error || 'Failed to create event');
  };

  const handleRegister = async (eventId: string) => {
    const res = await api.post(`/events/${eventId}/register`);
    if (res.success) {
      toast.success('Registered successfully!');
      loadEvents();
    } else toast.error(res.error || 'Failed to register');
  };

  const handleUnregister = async (eventId: string) => {
    const res = await api.delete(`/events/${eventId}/register`);
    if (res.success) {
      toast.success('Unregistered');
      loadEvents();
    } else toast.error(res.error || 'Failed to unregister');
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100';
      case 'ongoing': return 'bg-amber-100 text-amber-700 hover:bg-amber-100';
      case 'completed': return 'bg-teal-100 text-teal-700 hover:bg-teal-100';
      case 'cancelled': return 'bg-rose-100 text-rose-700 hover:bg-rose-100';
      default: return 'bg-gray-100 text-gray-600 hover:bg-gray-100';
    }
  };

  const statusDot = (status: string) => {
    switch (status) {
      case 'upcoming': return 'bg-emerald-500';
      case 'ongoing': return 'bg-amber-500';
      case 'completed': return 'bg-teal-500';
      case 'cancelled': return 'bg-rose-500';
      default: return 'bg-gray-400';
    }
  };

  const categoryConfig = (cat: string) => {
    switch (cat) {
      case 'workshop': return { icon: Wrench, gradient: 'gradient-emerald', label: 'Workshop' };
      case 'training': return { icon: BookOpen, gradient: 'gradient-teal', label: 'Training' };
      case 'seminar': return { icon: Mic, gradient: 'gradient-amber', label: 'Seminar' };
      default: return { icon: GraduationCap, gradient: 'gradient-emerald', label: 'Event' };
    }
  };

  const upcomingCount = events.filter(e => e.status === 'upcoming').length;
  const ongoingCount = events.filter(e => e.status === 'ongoing').length;
  const completedCount = events.filter(e => e.status === 'completed').length;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto view-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl gradient-emerald shadow-md flex-shrink-0">
            <GraduationCap className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
              <span className="text-gradient-emerald">Capacity</span> Building
            </h2>
            <p className="text-muted-foreground text-sm mt-0.5">Workshops, training sessions, and professional development</p>
          </div>
        </div>
        {user?.role === 'admin' && (
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button className="gradient-emerald hover:opacity-90 text-white rounded-xl px-5 premium-shadow transition-all hover:-translate-y-0.5">
                <Plus className="h-4 w-4 mr-2" /> Create Event
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto rounded-xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">
                  <span className="text-gradient-emerald">Create New</span> Event
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Title *</Label>
                  <Input value={newEvent.title} onChange={e => setNewEvent(d => ({ ...d, title: e.target.value }))}
                    className="bg-muted/50 border-border/60 rounded-xl focus:ring-emerald-500/20" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Description *</Label>
                  <Textarea value={newEvent.description} onChange={e => setNewEvent(d => ({ ...d, description: e.target.value }))}
                    className="bg-muted/50 border-border/60 rounded-xl focus:ring-emerald-500/20" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Date & Time *</Label>
                    <Input type="datetime-local" value={newEvent.eventDate} onChange={e => setNewEvent(d => ({ ...d, eventDate: e.target.value }))}
                      className="bg-muted/50 border-border/60 rounded-xl focus:ring-emerald-500/20" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Location *</Label>
                    <Input value={newEvent.location} onChange={e => setNewEvent(d => ({ ...d, location: e.target.value }))}
                      className="bg-muted/50 border-border/60 rounded-xl focus:ring-emerald-500/20" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Capacity</Label>
                    <Input type="number" value={newEvent.capacity} onChange={e => setNewEvent(d => ({ ...d, capacity: e.target.value }))}
                      className="bg-muted/50 border-border/60 rounded-xl focus:ring-emerald-500/20" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Category</Label>
                    <select className="w-full h-9 rounded-xl border border-border/60 bg-muted/50 px-3 text-sm focus:ring-emerald-500/20 focus:outline-none"
                      value={newEvent.category}
                      onChange={e => setNewEvent(d => ({ ...d, category: e.target.value }))}>
                      <option value="workshop">Workshop</option>
                      <option value="training">Training</option>
                      <option value="seminar">Seminar</option>
                    </select>
                  </div>
                </div>
                <Button className="w-full gradient-emerald hover:opacity-90 text-white rounded-xl premium-shadow transition-all hover:-translate-y-0.5" onClick={handleCreate}>
                  Create Event <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Stats Summary */}
      {!loading && events.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="premium-shadow rounded-xl border-0 bg-white hover:-translate-y-0.5 transition-all duration-200">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-50 flex-shrink-0">
                <Sparkles className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-xl font-bold">{upcomingCount}</p>
                <p className="text-xs text-muted-foreground">Upcoming</p>
              </div>
            </CardContent>
          </Card>
          <Card className="premium-shadow rounded-xl border-0 bg-white hover:-translate-y-0.5 transition-all duration-200">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-50 flex-shrink-0">
                <Clock className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <p className="text-xl font-bold">{ongoingCount}</p>
                <p className="text-xs text-muted-foreground">Ongoing</p>
              </div>
            </CardContent>
          </Card>
          <Card className="premium-shadow rounded-xl border-0 bg-white hover:-translate-y-0.5 transition-all duration-200">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-teal-50 flex-shrink-0">
                <CheckCircle2 className="h-4 w-4 text-teal-600" />
              </div>
              <div>
                <p className="text-xl font-bold">{completedCount}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </CardContent>
          </Card>
          <Card className="premium-shadow rounded-xl border-0 bg-white hover:-translate-y-0.5 transition-all duration-200">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-50 flex-shrink-0">
                <GraduationCap className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-xl font-bold">{events.length}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Events List */}
      {loading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="premium-shadow rounded-xl border-0 bg-white animate-pulse">
              <CardContent className="p-5 space-y-3">
                <div className="h-5 bg-muted/50 rounded-xl w-3/4" />
                <div className="h-4 bg-muted/50 rounded-xl w-full" />
                <div className="h-4 bg-muted/50 rounded-xl w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : events.length === 0 ? (
        <Card className="premium-shadow rounded-xl border-0 bg-white">
          <CardContent className="p-12 text-center">
            <div className="p-3 rounded-2xl gradient-emerald w-fit mx-auto mb-4">
              <GraduationCap className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold">No events scheduled</h3>
            <p className="text-muted-foreground text-sm mt-1">Check back later for upcoming workshops and training sessions</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {events.map(event => {
            const regCount = event._count?.registrations || event.registrations?.length || 0;
            const isFull = regCount >= event.capacity;
            const isRegistered = event.registrations?.some(r => r.userId === user?.id) || event.isRegistered;
            const catConfig = categoryConfig(event.category);
            const CatIcon = catConfig.icon;
            const capacityPct = Math.min(100, Math.round((regCount / event.capacity) * 100));

            return (
              <Card key={event.id} className="premium-shadow rounded-xl border-0 bg-white hover:-translate-y-0.5 transition-all duration-200">
                <CardContent className="p-5 space-y-4">
                  {/* Header: Category Icon + Title + Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl ${catConfig.gradient} flex-shrink-0`}>
                        <CatIcon className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm">{event.title}</h3>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className={`h-1.5 w-1.5 rounded-full ${statusDot(event.status)}`} />
                          <Badge className={`text-[10px] px-2 py-0 border-0 rounded-lg ${statusColor(event.status)}`}>
                            {event.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] capitalize rounded-lg border-border/60">{event.category}</Badge>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-muted-foreground line-clamp-2 pl-11">{event.description}</p>

                  {/* Date & Location */}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground pl-11">
                    <div className="flex items-center gap-1">
                      <div className="p-1 rounded bg-amber-50">
                        <Calendar className="h-3 w-3 text-amber-600" />
                      </div>
                      <span>{new Date(event.eventDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="p-1 rounded bg-teal-50">
                        <MapPin className="h-3 w-3 text-teal-600" />
                      </div>
                      <span>{event.location}</span>
                    </div>
                  </div>

                  {/* Capacity Progress */}
                  <div className="space-y-1.5 pl-11">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Users className="h-3 w-3" />
                        <span>{regCount}/{event.capacity} registered</span>
                      </div>
                      <span className="font-medium text-emerald-700">{capacityPct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-500"
                        style={{ width: `${capacityPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  {user?.role === 'contractor' && (
                    <div className="pt-3 border-t border-border/40 pl-11">
                      {isRegistered ? (
                        <Button size="sm" variant="outline" className="text-xs h-8 rounded-xl border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition-all"
                          onClick={() => handleUnregister(event.id)}>
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Registered
                        </Button>
                      ) : (
                        <Button size="sm" className="text-xs h-8 gradient-emerald text-white rounded-xl premium-shadow hover:opacity-90 transition-all hover:-translate-y-0.5"
                          disabled={isFull || event.status !== 'upcoming'}
                          onClick={() => handleRegister(event.id)}>
                          {isFull ? 'Full' : 'Register'}
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
