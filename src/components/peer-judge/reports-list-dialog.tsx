'use client';

import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { type IssueReport } from '@/lib/types';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { AlertCircle, Clock, User, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface ReportsListDialogProps {
  reports: IssueReport[];
  isLoading: boolean;
  onClearAll?: () => void;
  canClear?: boolean;
}

export default function ReportsListDialog({
  reports,
  isLoading,
  onClearAll,
  canClear = false,
}: ReportsListDialogProps) {
  const sortedReports = [...reports].sort((a, b) => {
    const timeA = (a.createdAt as Timestamp)?.toMillis() ?? 0;
    const timeB = (b.createdAt as Timestamp)?.toMillis() ?? 0;
    return timeB - timeA;
  });

  return (
    <>
      <DialogHeader className="relative pr-12">
        <DialogTitle>Issue Reports</DialogTitle>
        <DialogDescription>
          Technical difficulties reported by judges in real-time.
        </DialogDescription>
        {canClear && sortedReports.length > 0 && onClearAll && (
          <div className="absolute top-0 right-0">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10 text-destructive hover:bg-destructive/10">
                  <Trash2 className="h-5 w-5" />
                  <span className="sr-only">Clear All Reports</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear all reports?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently remove all issue reports for this room. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={onClearAll}>
                    Clear All
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </DialogHeader>
      <div className="py-4 h-[60vh]">
        <ScrollArea className="h-full">
          {isLoading ? (
            <div className="space-y-4 p-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse space-y-2">
                  <div className="h-4 w-1/4 bg-muted rounded" />
                  <div className="h-20 w-full bg-muted rounded" />
                </div>
              ))}
            </div>
          ) : sortedReports.length > 0 ? (
            <div className="space-y-4 pr-4">
              {sortedReports.map((report) => (
                <div key={report.id} className="rounded-lg border bg-card p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <User className="h-4 w-4 text-primary" />
                      {report.judgeName}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {report.createdAt ? format((report.createdAt as Timestamp).toDate(), 'p') : 'N/A'}
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                    <div className="space-y-1">
                      <p className="text-sm font-bold leading-tight">{report.issue}</p>
                      {report.customMessage && (
                        <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded italic">
                          "{report.customMessage}"
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <Badge variant="secondary" className="mb-2">All Clear</Badge>
              <p className="text-sm">No issues have been reported yet.</p>
            </div>
          )}
        </ScrollArea>
      </div>
    </>
  );
}