'use client';

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Pen, Stamp, Upload, X, Check, Eraser, FileSignature,
  Image as ImageIcon, Trash2, Plus, Shield, Sparkles,
} from 'lucide-react';

/* ══════════════════════════════════════════════════════════════
   TYPES
   ══════════════════════════════════════════════════════════════ */

export interface SavedSignature {
  id: string;
  dataUrl: string;
  label: string;
  type: 'signature' | 'stamp';
}

export interface UseStampSignatureReturn {
  savedItems: SavedSignature[];
  addSignature: (dataUrl: string, label: string, type: 'signature' | 'stamp') => void;
  removeItem: (id: string) => void;
  uploadFromFile: (type: 'signature' | 'stamp') => Promise<void>;
  generateStamp: (text: string) => string;
}

/* ══════════════════════════════════════════════════════════════
   CONSTANTS
   ══════════════════════════════════════════════════════════════ */

const STORAGE_KEY = 'tenet_signatures';

export const STAMP_TEMPLATES = [
  { text: 'APPROVED', label: 'Approved', color: '#16a34a' },
  { text: 'VERIFIED', label: 'Verified', color: '#2563eb' },
  { text: 'CONFIDENTIAL', label: 'Confidential', color: '#dc2626' },
  { text: 'REJECTED', label: 'Rejected', color: '#dc2626' },
  { text: 'DRAFT', label: 'Draft', color: '#9333ea' },
] as const;

/* ══════════════════════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════════════════════ */

function loadItems(): SavedSignature[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveItems(items: SavedSignature[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function generateSeal(text: string, date: string): string {
  const template = STAMP_TEMPLATES.find(t => t.text === text);
  const color = template?.color || '#dc2626';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
    <circle cx="60" cy="60" r="55" fill="none" stroke="${color}" stroke-width="3"/>
    <circle cx="60" cy="60" r="48" fill="none" stroke="${color}" stroke-width="1.5"/>
    <path id="topArc" d="M 15,60 A 45,45 0 0,1 105,60" fill="none"/>
    <text font-size="10" fill="${color}" font-weight="bold" letter-spacing="3">
      <textPath href="#topArc" startOffset="50%" text-anchor="middle">${text}</textPath>
    </text>
    <text x="60" y="68" text-anchor="middle" font-size="9" fill="${color}">${date}</text>
    <text x="60" y="80" text-anchor="middle" font-size="7" fill="${color}">TENET</text>
  </svg>`;
  return 'data:image/svg+xml;base64,' + btoa(svg);
}

/* ══════════════════════════════════════════════════════════════
   HOOK: useStampSignature
   ══════════════════════════════════════════════════════════════ */

export function useStampSignature(): UseStampSignatureReturn {
  const [savedItems, setSavedItems] = useState<SavedSignature[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const addSignature = useCallback((dataUrl: string, label: string, type: 'signature' | 'stamp') => {
    const newItem: SavedSignature = {
      id: Date.now().toString(),
      dataUrl,
      label,
      type,
    };
    setSavedItems(prev => {
      const updated = [...prev, newItem];
      saveItems(updated);
      return updated;
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setSavedItems(prev => {
      const updated = prev.filter(s => s.id !== id);
      saveItems(updated);
      return updated;
    });
    toast.success('Signature/stamp removed');
  }, []);

  const uploadFromFile = useCallback(async (type: 'signature' | 'stamp') => {
    return new Promise<void>((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) { resolve(); return; }
        const reader = new FileReader();
        reader.onload = (ev) => {
          const dataUrl = ev.target?.result as string;
          const label = type === 'signature'
            ? `Signature ${loadItems().filter(s => s.type === 'signature').length + 1}`
            : `Stamp ${loadItems().filter(s => s.type === 'stamp').length + 1}`;
          const newItem: SavedSignature = {
            id: Date.now().toString(),
            dataUrl,
            label,
            type,
          };
          setSavedItems(prev => {
            const updated = [...prev, newItem];
            saveItems(updated);
            return updated;
          });
          toast.success(`${type === 'signature' ? 'Signature' : 'Stamp'} uploaded`);
          resolve();
        };
        reader.readAsDataURL(file);
      };
      input.oncancel = () => resolve();
      input.click();
    });
  }, []);

  const generateStamp = useCallback((text: string): string => {
    const dateStr = new Date().toLocaleDateString();
    return generateSeal(text, dateStr);
  }, []);

  return {
    savedItems,
    addSignature,
    removeItem,
    uploadFromFile,
    generateStamp,
  };
}

/* ══════════════════════════════════════════════════════════════
   COMPONENT: SignatureDrawingCanvas
   ══════════════════════════════════════════════════════════════ */

function SignatureDrawingCanvas({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (dataUrl: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const scaleX = canvasRef.current.width / rect.width;
      const scaleY = canvasRef.current.height / rect.height;
      ctx.beginPath();
      ctx.moveTo((e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY);
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const scaleX = canvasRef.current.width / rect.width;
      const scaleY = canvasRef.current.height / rect.height;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineTo((e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY);
      ctx.stroke();
    }
  };

  const endDraw = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx && canvasRef.current) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  const save = () => {
    const dataUrl = canvasRef.current?.toDataURL('image/png');
    if (dataUrl) {
      onSave(dataUrl);
      clearCanvas();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pen className="h-4 w-4 text-emerald-600" /> Draw Your Signature
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="border-2 border-dashed border-border rounded-lg overflow-hidden bg-white">
            <canvas
              ref={canvasRef}
              width={460}
              height={200}
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={endDraw}
              onMouseLeave={endDraw}
              className="w-full cursor-crosshair touch-none"
            />
          </div>
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={clearCanvas} className="text-xs">
              <Eraser className="h-3.5 w-3.5 mr-1" /> Clear
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onClose} className="text-xs">Cancel</Button>
              <Button size="sm" onClick={save}
                className="text-xs gradient-emerald text-white border-0 premium-shadow hover:opacity-90">
                <Check className="h-3.5 w-3.5 mr-1" /> Save Signature
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ══════════════════════════════════════════════════════════════
   COMPONENT: StampSignatureManager
   ══════════════════════════════════════════════════════════════ */

interface StampSignatureManagerProps {
  /** If provided, the hook instance is used instead of creating one internally */
  hook?: UseStampSignatureReturn;
  /** Whether to show the drawing canvas feature */
  showDraw?: boolean;
  /** Whether to show stamp templates */
  showStampTemplates?: boolean;
  /** Whether to show upload buttons */
  showUpload?: boolean;
  /** Whether to show the gallery of saved items */
  showGallery?: boolean;
  /** Compact mode for inline use */
  compact?: boolean;
  /** Callback when a stamp/signature is selected */
  onSelect?: (item: SavedSignature) => void;
  /** Title override */
  title?: string;
}

export function StampSignatureManager({
  hook: externalHook,
  showDraw = true,
  showStampTemplates = true,
  showUpload = true,
  showGallery = true,
  compact = false,
  onSelect,
  title,
}: StampSignatureManagerProps) {
  const internalHook = useStampSignature();
  const { savedItems, addSignature, removeItem, uploadFromFile, generateStamp } = externalHook || internalHook;

  const [drawOpen, setDrawOpen] = useState(false);

  const handleDrawSave = (dataUrl: string) => {
    const sigCount = savedItems.filter(s => s.type === 'signature').length + 1;
    addSignature(dataUrl, `Signature ${sigCount}`, 'signature');
    toast.success('Signature saved');
    setDrawOpen(false);
  };

  const handleUploadSignature = () => {
    uploadFromFile('signature');
  };

  const handleUploadStamp = () => {
    uploadFromFile('stamp');
  };

  const handleAddStamp = (text: string) => {
    const dataUrl = generateStamp(text);
    addSignature(dataUrl, `${text} Stamp`, 'stamp');
    toast.success(`${text} stamp created`);
  };

  if (compact) {
    return (
      <div className="space-y-3">
        <SignatureDrawingCanvas open={drawOpen} onClose={() => setDrawOpen(false)} onSave={handleDrawSave} />

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          {showDraw && (
            <Button variant="outline" size="sm" className="h-8 text-xs rounded-lg" onClick={() => setDrawOpen(true)}>
              <Pen className="h-3.5 w-3.5 mr-1.5" /> Draw
            </Button>
          )}
          {showUpload && (
            <>
              <Button variant="outline" size="sm" className="h-8 text-xs rounded-lg" onClick={handleUploadSignature}>
                <Upload className="h-3.5 w-3.5 mr-1.5" /> Upload Sig
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs rounded-lg" onClick={handleUploadStamp}>
                <Stamp className="h-3.5 w-3.5 mr-1.5" /> Upload Stamp
              </Button>
            </>
          )}
          {showStampTemplates && (
            <div className="flex flex-wrap gap-1">
              {STAMP_TEMPLATES.map(st => (
                <button
                  key={st.text}
                  onClick={() => handleAddStamp(st.text)}
                  className="h-8 px-2.5 text-[10px] font-semibold rounded-lg border border-border/60 hover:bg-muted transition-colors"
                  style={{ color: st.color }}
                >
                  {st.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Gallery */}
        {showGallery && savedItems.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {savedItems.map(item => (
              <div key={item.id} className="flex flex-col items-center gap-1 flex-shrink-0 group relative">
                <button
                  onClick={() => onSelect?.(item)}
                  className={`w-16 h-14 border border-border rounded-lg hover:border-emerald-400 transition-colors overflow-hidden bg-white p-1 ${onSelect ? 'cursor-pointer' : 'cursor-default'}`}
                >
                  <img src={item.dataUrl} alt={item.label} className="max-w-full max-h-full object-contain" />
                </button>
                <span className="text-[9px] text-muted-foreground truncate max-w-[64px]">{item.label}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className="premium-shadow rounded-xl border-0 bg-card overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-orange-500/10">
            <FileSignature className="h-3.5 w-3.5 text-orange-600" />
          </div>
          {title || 'Signature & Stamp'}
          {savedItems.length > 0 && (
            <Badge className="text-[10px] px-1.5 py-0 bg-orange-50 text-orange-700 border-0 font-medium ml-1">
              {savedItems.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <SignatureDrawingCanvas open={drawOpen} onClose={() => setDrawOpen(false)} onSave={handleDrawSave} />

        {/* Upload Section */}
        {showUpload && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Upload</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleUploadSignature}
                className="flex flex-col items-center gap-2 p-4 border-2 border-dashed border-border/60 rounded-xl hover:border-emerald-300 hover:bg-emerald-50/30 transition-all"
              >
                <div className="p-2 rounded-lg bg-emerald-50">
                  <ImageIcon className="h-4 w-4 text-emerald-600" />
                </div>
                <span className="text-xs font-medium text-foreground">Upload Signature</span>
                <span className="text-[10px] text-muted-foreground">PNG, JPG, SVG</span>
              </button>
              <button
                onClick={handleUploadStamp}
                className="flex flex-col items-center gap-2 p-4 border-2 border-dashed border-border/60 rounded-xl hover:border-orange-300 hover:bg-orange-50/30 transition-all"
              >
                <div className="p-2 rounded-lg bg-orange-50">
                  <Stamp className="h-4 w-4 text-orange-600" />
                </div>
                <span className="text-xs font-medium text-foreground">Upload Stamp</span>
                <span className="text-[10px] text-muted-foreground">PNG, JPG, SVG</span>
              </button>
            </div>
          </div>
        )}

        {/* Draw Signature */}
        {showDraw && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Draw</p>
            <Button
              variant="outline"
              className="w-full rounded-xl border-dashed h-12"
              onClick={() => setDrawOpen(true)}
            >
              <Pen className="h-4 w-4 mr-2 text-emerald-600" /> Draw Your Signature
            </Button>
          </div>
        )}

        {/* Stamp Templates */}
        {showStampTemplates && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Stamp Templates</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {STAMP_TEMPLATES.map(st => (
                <button
                  key={st.text}
                  onClick={() => handleAddStamp(st.text)}
                  className="flex items-center gap-2 p-2.5 border border-border/60 rounded-xl hover:bg-muted/50 transition-all group"
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: st.color + '15' }}>
                    <Shield className="h-4 w-4" style={{ color: st.color }} />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-semibold" style={{ color: st.color }}>{st.label}</p>
                    <p className="text-[10px] text-muted-foreground">Click to add</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <Separator />

        {/* Gallery */}
        {showGallery && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Saved Items
            </p>
            {savedItems.length === 0 ? (
              <div className="text-center py-6 bg-muted/20 rounded-xl">
                <FileSignature className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No signatures or stamps saved yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Upload, draw, or generate one above</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {savedItems.map(item => (
                  <div
                    key={item.id}
                    className={`flex flex-col items-center gap-1.5 p-2 border border-border/60 rounded-xl hover:border-emerald-300 transition-all group relative ${onSelect ? 'cursor-pointer' : ''}`}
                    onClick={() => onSelect?.(item)}
                  >
                    <div className="w-full h-14 flex items-center justify-center bg-white rounded-lg overflow-hidden p-1">
                      <img src={item.dataUrl} alt={item.label} className="max-w-full max-h-full object-contain" />
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-medium truncate max-w-[80px]">{item.label}</p>
                      <Badge className={`text-[8px] px-1 py-0 border-0 rounded ${
                        item.type === 'signature'
                          ? 'bg-emerald-50 text-emerald-600'
                          : 'bg-orange-50 text-orange-600'
                      }`}>
                        {item.type}
                      </Badge>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ══════════════════════════════════════════════════════════════
   COMPONENT: StampSignatureSelector
   A compact dialog/inline selector for picking a saved sig/stamp
   ══════════════════════════════════════════════════════════════ */

interface StampSignatureSelectorProps {
  hook: UseStampSignatureReturn;
  open: boolean;
  onClose: () => void;
  onSelect: (item: SavedSignature) => void;
  title?: string;
}

export function StampSignatureSelector({
  hook,
  open,
  onClose,
  onSelect,
  title,
}: StampSignatureSelectorProps) {
  const { savedItems, uploadFromFile, generateStamp, removeItem } = hook;
  const [drawOpen, setDrawOpen] = useState(false);

  const handleDrawSave = (dataUrl: string) => {
    const sigCount = savedItems.filter(s => s.type === 'signature').length + 1;
    hook.addSignature(dataUrl, `Signature ${sigCount}`, 'signature');
    toast.success('Signature saved');
    setDrawOpen(false);
  };

  return (
    <>
      <SignatureDrawingCanvas open={drawOpen} onClose={() => setDrawOpen(false)} onSave={handleDrawSave} />

      <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSignature className="h-4 w-4 text-orange-600" />
              {title || 'Select Signature or Stamp'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="text-xs rounded-lg" onClick={() => setDrawOpen(true)}>
                <Pen className="h-3.5 w-3.5 mr-1.5" /> Draw New
              </Button>
              <Button variant="outline" size="sm" className="text-xs rounded-lg" onClick={() => uploadFromFile('signature')}>
                <Upload className="h-3.5 w-3.5 mr-1.5" /> Upload Signature
              </Button>
              <Button variant="outline" size="sm" className="text-xs rounded-lg" onClick={() => uploadFromFile('stamp')}>
                <Stamp className="h-3.5 w-3.5 mr-1.5" /> Upload Stamp
              </Button>
            </div>

            {/* Stamp Templates */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Quick Stamp</p>
              <div className="flex flex-wrap gap-2">
                {STAMP_TEMPLATES.map(st => (
                  <button
                    key={st.text}
                    onClick={() => {
                      const dataUrl = generateStamp(st.text);
                      const item: SavedSignature = {
                        id: Date.now().toString(),
                        dataUrl,
                        label: `${st.text} Stamp`,
                        type: 'stamp',
                      };
                      onSelect(item);
                    }}
                    className="h-8 px-3 text-xs font-semibold rounded-lg border border-border/60 hover:bg-muted transition-colors"
                    style={{ color: st.color }}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Saved Items */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Saved ({savedItems.length})
              </p>
              {savedItems.length === 0 ? (
                <div className="text-center py-4 bg-muted/20 rounded-xl">
                  <FileSignature className="h-6 w-6 text-muted-foreground/40 mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">No saved signatures or stamps</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                  {savedItems.map(item => (
                    <div
                      key={item.id}
                      className="flex flex-col items-center gap-1 p-2 border border-border/60 rounded-xl hover:border-emerald-300 hover:bg-emerald-50/30 transition-all cursor-pointer group relative"
                      onClick={() => onSelect(item)}
                    >
                      <div className="w-full h-12 flex items-center justify-center bg-white rounded-lg overflow-hidden p-1">
                        <img src={item.dataUrl} alt={item.label} className="max-w-full max-h-full object-contain" />
                      </div>
                      <p className="text-[9px] font-medium truncate max-w-[72px]">{item.label}</p>
                      <Badge className={`text-[8px] px-1 py-0 border-0 rounded ${
                        item.type === 'signature'
                          ? 'bg-emerald-50 text-emerald-600'
                          : 'bg-orange-50 text-orange-600'
                      }`}>
                        {item.type}
                      </Badge>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}
                        className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
