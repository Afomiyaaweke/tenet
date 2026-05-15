'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
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
  Wrench, BookOpen, Mic, Sparkles, ArrowRight, Filter, X, Timer,
  ChevronDown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function getDaysUntil(dateStr: string): number {
  const now = new Date();
  const date = new Date(dateStr);
  return Math.ceil((date.getTime() - now.getTime()) / 86400000);
}

function formatCountdown(dateStr: string): string {
  const days = getDaysUntil(dateStr);
  if (days < 0) return 'Past';
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days <= 7) return `${days} days`;
  if (days <= 30) return `${Math.ceil(days / 7)} weeks`;
  return `${Math.ceil(days / 30)} months`;
}

function countdownColor(days: number): string {
  if (days < 0) return 'text-muted-foreground';
  if (days <= 2) return 'text-rose-600';
  if (days <= 7) return 'text-amber-600';
  return 'text-emerald-600';
}

function countdownBg(days: number): string {
  if (days < 0) return 'bg-muted/50';
  if (days <= 2) return 'bg-rose-50';
  if (days <= 7) return 'bg-amber-50';
  return 'bg-emerald-50';
}

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay: i * 0.06, duration: 0.35, ease: 'easeOut' },
  }),
  exit: { opacity: 0, y: -10, scale: 0.97, transition: { duration: 0.2 } },
};

const statVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.3 },
  }),
};

export function EventsView() {
  const { user } = useAuthStore();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
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
      setNewEvent({ title: '', description: '', eventDate: '', location: '', capacity: '50', category: 'workshop' });
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
      default: return 'bg-muted text-muted-foreground hover:bg-muted';
    }
  };

  const statusDot = (status: string) => {
    switch (status) {
      case 'upcoming': return 'bg-emerald-500';
      case 'ongoing': return 'bg-amber-500';
      case 'completed': return 'bg-teal-500';
      case 'cancelled': return 'bg-rose-500';
      default: return 'bg-muted-foreground/50';
    }
  };

  const categoryConfig = (cat: string) => {
    switch (cat) {
      case 'workshop': return { icon: Wrench, gradient: 'gradient-emerald', label: 'Workshop', color: 'text-emerald-600' };
      case 'training': return { icon: BookOpen, gradient: 'gradient-teal', label: 'Training', color: 'text-teal-600' };
      case 'seminar': return { icon: Mic, gradient: 'gradient-amber', label: 'Seminar', color: 'text-amber-600' };
      default: return { icon: GraduationCap, gradient: 'gradient-emerald', label: 'Event', color: 'text-emerald-600' };
    }
  };

  const upcomingCount = events.filter(e => e.status === 'upcoming').length;
  const ongoingCount = events.filter(e => e.status === 'ongoing').length;
  const completedCount = events.filter(e => e.status === 'completed').length;

  const filteredEvents = useMemo(() => {
    let result = events;
    if (filterCategory !== 'all') {
      result = result.filter(e => e.category === filterCategory);
    }
    if (filterStatus !== 'all') {
      result = result.filter(e => e.status === filterStatus);
    }
    return result;
  }, [events, filterCategory, filterStatus]);

  const activeFilterCount = (filterCategory !== 'all' ? 1 : 0) + (filterStatus !== 'all' ? 1 : 0);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto view-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="p-3 rounded-2xl gradient-emerald shadow-md flex-shrink-0"
          >
            <GraduationCap className="h-6 w-6 text-white" />
          </motion.div>
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
              <span className="text-gradient-emerald">Capacity</span> Building
            </h2>
            <p className="text-muted-foreground text-sm mt-0.5">Workshops, training sessions, and professional development</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Filter Toggle */}
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className={`rounded-xl transition-colors ${showFilters ? 'border-emerald-300 text-emerald-700 bg-emerald-50' : 'border-border/60'} ${activeFilterCount > 0 ? 'border-emerald-300' : ''}`}
          >
            <Filter className="h-4 w-4 mr-1.5" />
            Filters
            {activeFilterCount > 0 && (
              <Badge className="ml-1.5 text-[9px] px-1 py-0 gradient-emerald text-white border-0">{activeFilterCount}</Badge>
            )}
            <ChevronDown className={`h-3 w-3 ml-1 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </Button>
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
                      className="bg-muted/50 border-border/60 rounded-xl focus:ring-primary/20" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Description *</Label>
                    <Textarea value={newEvent.description} onChange={e => setNewEvent(d => ({ ...d, description: e.target.value }))}
                      className="bg-muted/50 border-border/60 rounded-xl focus:ring-primary/20" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Date & Time *</Label>
                      <Input type="datetime-local" value={newEvent.eventDate} onChange={e => setNewEvent(d => ({ ...d, eventDate: e.target.value }))}
                        className="bg-muted/50 border-border/60 rounded-xl focus:ring-primary/20" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Location *</Label>
                      <Input value={newEvent.location} onChange={e => setNewEvent(d => ({ ...d, location: e.target.value }))}
                        className="bg-muted/50 border-border/60 rounded-xl focus:ring-primary/20" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Capacity</Label>
                      <Input type="number" value={newEvent.capacity} onChange={e => setNewEvent(d => ({ ...d, capacity: e.target.value }))}
                        className="bg-muted/50 border-border/60 rounded-xl focus:ring-primary/20" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Category</Label>
                      <select className="w-full h-9 rounded-xl border border-border/60 bg-muted/50 px-3 text-sm focus:ring-primary/20 focus:outline-none"
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
      </div>

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Card className="premium-shadow rounded-xl border-0 bg-card">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Category Filter */}
                  <div className="flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Category</p>
                    <div className="flex flex-wrap gap-2">
                      {['all', 'workshop', 'training', 'seminar'].map(cat => (
                        <button key={cat}
                          onClick={() => setFilterCategory(cat)}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                            filterCategory === cat
                              ? 'gradient-emerald text-white premium-shadow'
                              : 'bg-muted text-muted-foreground hover:bg-primary/10 hover:text-emerald-700'
                          }`}
                        >
                          {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Status Filter */}
                  <div className="flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Status</p>
                    <div className="flex flex-wrap gap-2">
                      {['all', 'upcoming', 'ongoing', 'completed'].map(status => (
                        <button key={status}
                          onClick={() => setFilterStatus(status)}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                            filterStatus === status
                              ? 'gradient-emerald text-white premium-shadow'
                              : 'bg-muted text-muted-foreground hover:bg-primary/10 hover:text-emerald-700'
                          }`}
                        >
                          {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Clear Filters */}
                  {activeFilterCount > 0 && (
                    <div className="flex items-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setFilterCategory('all'); setFilterStatus('all'); }}
                        className="text-xs text-muted-foreground hover:text-rose-600 rounded-lg"
                      >
                        <X className="h-3 w-3 mr-1" /> Clear
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats Summary */}
      {!loading && events.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { icon: Sparkles, bg: 'bg-emerald-50', color: 'text-emerald-600', count: upcomingCount, label: 'Upcoming', idx: 0 },
            { icon: Clock, bg: 'bg-amber-50', color: 'text-amber-600', count: ongoingCount, label: 'Ongoing', idx: 1 },
            { icon: CheckCircle2, bg: 'bg-teal-50', color: 'text-teal-600', count: completedCount, label: 'Completed', idx: 2 },
            { icon: GraduationCap, bg: 'bg-emerald-50', color: 'text-emerald-600', count: events.length, label: 'Total', idx: 3 },
          ].map(stat => {
            const Icon = stat.icon;
            return (
              <motion.div key={stat.label} custom={stat.idx} variants={statVariants} initial="hidden" animate="visible">
                <Card className="premium-shadow rounded-xl border-0 bg-card hover:-translate-y-0.5 transition-all duration-200">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${stat.bg} flex-shrink-0`}>
                      <Icon className={`h-4 w-4 ${stat.color}`} />
                    </div>
                    <div>
                      <p className="text-xl font-bold">{stat.count}</p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Events List */}
      {loading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="premium-shadow rounded-xl border-0 bg-card animate-pulse">
              <CardContent className="p-5 space-y-3">
                <div className="h-5 bg-muted/50 rounded-xl w-3/4" />
                <div className="h-4 bg-muted/50 rounded-xl w-full" />
                <div className="h-4 bg-muted/50 rounded-xl w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredEvents.length === 0 ? (
        <Card className="premium-shadow rounded-xl border-0 bg-card">
          <CardContent className="p-12 text-center">
            <div className="p-3 rounded-2xl gradient-emerald w-fit mx-auto mb-4">
              <GraduationCap className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold">
              {activeFilterCount > 0 ? 'No events match your filters' : 'No events scheduled'}
            </h3>
            <p className="text-muted-foreground text-sm mt-1">
              {activeFilterCount > 0 ? 'Try adjusting or clearing your filters' : 'Check back later for upcoming workshops and training sessions'}
            </p>
            {activeFilterCount > 0 && (
              <Button variant="outline" className="mt-4 rounded-xl border-emerald-200 text-emerald-700 hover:bg-primary/10"
                onClick={() => { setFilterCategory('all'); setFilterStatus('all'); }}>
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <motion.div layout className="grid md:grid-cols-2 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredEvents.map((event, i) => {
              const regCount = event._count?.registrations || event.registrations?.length || 0;
              const isFull = regCount >= event.capacity;
              const isRegistered = event.registrations?.some(r => r.userId === user?.id) || event.isRegistered;
              const catConfig = categoryConfig(event.category);
              const CatIcon = catConfig.icon;
              const capacityPct = Math.min(100, Math.round((regCount / event.capacity) * 100));
              const daysUntil = getDaysUntil(event.eventDate);

              return (
                <motion.div key={event.id}
                  custom={i}
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  layout
                >
                  <Card className="premium-shadow rounded-xl border-0 bg-card hover:-translate-y-0.5 transition-all duration-200 h-full">
                    <CardContent className="p-5 space-y-4 flex flex-col">
                      {/* Header: Category Icon + Title + Countdown */}
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
                        {/* Countdown badge */}
                        {event.status === 'upcoming' && daysUntil >= 0 && (
                          <div className={`px-2.5 py-1 rounded-lg ${countdownBg(daysUntil)} flex items-center gap-1 flex-shrink-0`}>
                            <Timer className={`h-3 w-3 ${countdownColor(daysUntil)}`} />
                            <span className={`text-[10px] font-semibold ${countdownColor(daysUntil)}`}>
                              {formatCountdown(event.eventDate)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Category tag */}
                      <div className="flex items-center gap-2 pl-11">
                        <Badge variant="outline" className={`text-[10px] capitalize rounded-lg border-border/60 ${catConfig.color}`}>
                          {event.category}
                        </Badge>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-muted-foreground line-clamp-2 pl-11">{event.description}</p>

                      {/* Date & Location */}
                      <div className="flex flex-col gap-1.5 text-xs text-muted-foreground pl-11">
                        <div className="flex items-center gap-1.5">
                          <div className="p-1 rounded bg-amber-50 flex-shrink-0">
                            <Calendar className="h-3 w-3 text-amber-600" />
                          </div>
                          <span>{new Date(event.eventDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} at {new Date(event.eventDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="p-1 rounded bg-teal-50 flex-shrink-0">
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
                          <span className={`font-medium ${capacityPct >= 90 ? 'text-rose-600' : capacityPct >= 70 ? 'text-amber-600' : 'text-emerald-700'}`}>
                            {capacityPct}%
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${capacityPct}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut', delay: i * 0.06 }}
                            className={`h-full rounded-full ${
                              capacityPct >= 90 ? 'bg-gradient-to-r from-rose-400 to-rose-600' :
                              capacityPct >= 70 ? 'bg-gradient-to-r from-amber-400 to-amber-600' :
                              'bg-gradient-to-r from-emerald-400 to-emerald-600'
                            }`}
                          />
                        </div>
                      </div>

                      {/* Actions */}
                      {user?.role === 'contractor' && (
                        <div className="pt-3 border-t border-border/40 pl-11 mt-auto">
                          {isRegistered ? (
                            <Button size="sm" variant="outline" className="text-xs h-8 rounded-xl border-emerald-200 text-emerald-700 hover:bg-primary/10 transition-all"
                              onClick={() => handleUnregister(event.id)}>
                              <CheckCircle2 className="h-3 w-3 mr-1" /> Registered
                            </Button>
                          ) : (
                            <motion.div whileTap={{ scale: 0.97 }}>
                              <Button size="sm" className="text-xs h-8 gradient-emerald text-white rounded-xl premium-shadow hover:opacity-90 transition-all hover:-translate-y-0.5"
                                disabled={isFull || event.status !== 'upcoming'}
                                onClick={() => handleRegister(event.id)}>
                                {isFull ? 'Full' : 'Register Now'}
                              </Button>
                            </motion.div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
