import { useState, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Upload, FileText, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useScheduleStore } from '@/store/scheduleStore';
import { toast } from 'sonner';

interface ScheduleUploadProps {
  onUpload: (sessionId: string) => void;
}

export default function ScheduleUpload({ onUpload }: ScheduleUploadProps) {
  const { projectId } = useParams<{ projectId: string }>();
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [uploading, setUploading] = useState(false);
  const { uploadSchedule } = useScheduleStore();
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    const ext = f.name.split('.').pop()?.toLowerCase();
    if (ext !== 'xml' && ext !== 'mpp') {
      toast.error('Please upload an XML or MPP file');
      return;
    }
    setFile(f);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleDropFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      await uploadSchedule(file, name || undefined, projectId);
      toast.success('Schedule uploaded successfully');
      onUpload(file.name);
    } catch (e: any) {
      toast.error(e.message || 'Failed to upload schedule');
    } finally {
      setUploading(false);
    }
  };

  const removeFile = () => {
    setFile(null);
    setName('');
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-lg">
        <CardContent className="pt-6">
          <div className="text-center mb-6">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Import Schedule</h2>
            <p className="mt-1 text-muted-foreground">
              Upload a Microsoft Project (MSPDI), Primavera P6 (PMXML), or P6 Professional XML schedule
            </p>
          </div>

          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={`relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 text-center transition-colors ${
              dragOver
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/20 hover:border-primary/50 hover:bg-muted/30'
            }`}
          >
            <Upload className={`mb-3 h-10 w-10 ${dragOver ? 'text-primary' : 'text-muted-foreground'}`} />
            <p className="font-medium">
              {dragOver ? 'Drop your file here' : 'Drag & drop your schedule file'}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              or click to browse · .xml, .mpp up to 50MB
            </p>
            <input
              ref={fileRef}
              type="file"
  
              className="hidden"
              onChange={handleDropFile}
            />
          </div>

          {file && (
            <div className="mt-4">
              <div className="flex items-center justify-between rounded-lg border bg-muted/50 px-4 py-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium text-sm">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={removeFile}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="mt-3">
                <Label htmlFor="schedule-name">Schedule Name</Label>
                <Input
                  id="schedule-name"
                  placeholder="e.g., Q3 2024 Baseline"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          )}

          <Button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="mt-6 w-full"
          >
            {uploading ? (
              <>
                <Check className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload & Parse
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
