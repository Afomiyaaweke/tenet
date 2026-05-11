'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore, useNavStore } from '@/store';
import { api, Project } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { FolderKanban, DollarSign, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

export function ProjectsView() {
  const { user } = useAuthStore();
  const { setView } = useNavStore();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    const res = await api.get('/projects');
    if (res.success) setProjects(res.data);
    setLoading(false);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadProjects(); }, [loadProjects]);

  const statusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-100 text-emerald-700';
      case 'completed': return 'bg-teal-100 text-teal-700';
      case 'on_hold': return 'bg-amber-100 text-amber-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold">Projects</h2>
        <p className="text-muted-foreground text-sm">Track and manage your active projects</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse"><CardContent className="p-4"><div className="h-24 bg-gray-200 rounded" /></CardContent></Card>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FolderKanban className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No projects yet</h3>
            <p className="text-muted-foreground text-sm">Projects are created when bids are awarded</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {projects.map(project => (
            <Card key={project.id} className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setView('project-detail', { id: project.id })}>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <FolderKanban className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{project.tender?.title || 'Project'}</p>
                      <p className="text-xs text-muted-foreground">
                        Contractor: {project.bid?.user?.profile?.fullName || 'Assigned'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-semibold">ETB {project.contractValue.toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground">Contract Value</p>
                    </div>
                    <Badge className={`text-xs ${statusColor(project.status)}`}>
                      {project.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>

                {/* Progress Summary */}
                <div className="mt-3 pt-3 border-t grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-lg font-bold text-blue-600">{project._count?.tasks || 0}</p>
                    <p className="text-[10px] text-muted-foreground">Tasks</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-amber-600">{project._count?.milestones || 0}</p>
                    <p className="text-[10px] text-muted-foreground">Milestones</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-emerald-600">{project._count?.payments || 0}</p>
                    <p className="text-[10px] text-muted-foreground">Payments</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
