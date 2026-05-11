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
import { GraduationCap, Plus, Calendar, MapPin, Users, Clock, CheckCircle2 } from 'lucide-react';

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
      case 'upcoming': return 'bg-emerald-100 text-emerald-700';
      case 'ongoing': return 'bg-amber-100 text-amber-700';
      case 'completed': return 'bg-gray-100 text-gray-600';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const categoryIcon = (cat: string) => {
    switch (cat) {
      case 'workshop': return '🛠️';
      case 'training': return '📚';
      case 'seminar': return '🎤';
      default: return '📅';
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Capacity Building</h2>
          <p className="text-muted-foreground text-sm">Workshops, training sessions, and professional development events</p>
        </div>
        {user?.role === 'admin' && (
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="h-4 w-4 mr-2" /> Create Event
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Event</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input value={newEvent.title} onChange={e => setNewEvent(d => ({ ...d, title: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Description *</Label>
                  <Textarea value={newEvent.description} onChange={e => setNewEvent(d => ({ ...d, description: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date & Time *</Label>
                    <Input type="datetime-local" value={newEvent.eventDate} onChange={e => setNewEvent(d => ({ ...d, eventDate: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Location *</Label>
                    <Input value={newEvent.location} onChange={e => setNewEvent(d => ({ ...d, location: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Capacity</Label>
                    <Input type="number" value={newEvent.capacity} onChange={e => setNewEvent(d => ({ ...d, capacity: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <select className="w-full h-9 rounded-md border px-3 text-sm" value={newEvent.category}
                      onChange={e => setNewEvent(d => ({ ...d, category: e.target.value }))}>
                      <option value="workshop">Workshop</option>
                      <option value="training">Training</option>
                      <option value="seminar">Seminar</option>
                    </select>
                  </div>
                </div>
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={handleCreate}>Create Event</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="animate-pulse"><CardContent className="p-4"><div className="h-40 bg-gray-200 rounded" /></CardContent></Card>
          ))}
        </div>
      ) : events.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No events scheduled</h3>
            <p className="text-muted-foreground text-sm">Check back later for upcoming workshops and training sessions</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {events.map(event => {
            const regCount = event._count?.registrations || event.registrations?.length || 0;
            const isFull = regCount >= event.capacity;
            const isRegistered = event.registrations?.some(r => r.userId === user?.id) || event.isRegistered;
            return (
              <Card key={event.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{categoryIcon(event.category)}</span>
                      <div>
                        <h3 className="font-semibold text-sm">{event.title}</h3>
                        <Badge className={`text-[10px] ${statusColor(event.status)}`}>{event.status}</Badge>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] capitalize">{event.category}</Badge>
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-2">{event.description}</p>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> {new Date(event.eventDate).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {event.location}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" /> {regCount}/{event.capacity} registered
                    </div>
                    {user?.role === 'contractor' && (
                      isRegistered ? (
                        <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => handleUnregister(event.id)}>
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Registered
                        </Button>
                      ) : (
                        <Button size="sm" className="text-xs h-7 bg-emerald-600 hover:bg-emerald-700"
                          disabled={isFull || event.status !== 'upcoming'}
                          onClick={() => handleRegister(event.id)}>
                          {isFull ? 'Full' : 'Register'}
                        </Button>
                      )
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
