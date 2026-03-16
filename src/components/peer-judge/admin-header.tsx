'use client';

import Link from 'next/link';
import {
  User,
  ChevronDown,
  Users,
  ShieldAlert,
  QrCode,
  Loader2,
  Circle,
  FileSpreadsheet,
  FileText,
  Trophy,
  AlertTriangle,
} from 'lucide-react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useState, useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import JoinInfoPanel from './join-instructions';
import { Skeleton } from '../ui/skeleton';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';
import ReportsListDialog from './reports-list-dialog';
import { type IssueReport } from '@/lib/types';

interface AdminHeaderProps {
  roomId: string;
  hostName: string;
  sessionStatus: 'live' | 'ended';
  roomTitle?: string;
  judgesCount: number;
  reports: IssueReport[];
  isReportsLoading: boolean;
  onOpenParticipants: () => void;
  onEndSession: () => void;
  onClearAllReports: () => void;
  onExportExcel: () => void;
  onExportPdf: () => void;
  onExportVotesExcel: () => void;
  onExportVotesPdf: () => void;
  isEnding: boolean;
}

export default function AdminHeader({
  roomId,
  hostName,
  sessionStatus,
  roomTitle,
  judgesCount,
  reports,
  isReportsLoading,
  onOpenParticipants,
  onEndSession,
  onClearAllReports,
  onExportExcel,
  onExportPdf,
  onExportVotesExcel,
  onExportVotesPdf,
  isEnding,
}: AdminHeaderProps) {
  const [isClient, setIsClient] = useState(false);
  const isMobile = useIsMobile();
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(false);
  const [joinUrl, setJoinUrl] = useState('');

  useEffect(() => {
    setIsClient(true);
    const url = `${window.location.origin}/join?room=${roomId}`;
    setJoinUrl(url);
  }, [roomId]);
  
  const Trigger = (
    <div
      role="button"
      className="flex cursor-pointer items-center gap-1 rounded-lg border bg-muted px-2 py-1 text-sm transition-colors hover:bg-accent"
    >
      <span className="hidden font-semibold text-muted-foreground sm:inline">
        ROOM
      </span>
      <span className="font-mono text-base font-bold tracking-widest text-primary">
        {roomId}
      </span>
      <QrCode className="ml-1 h-5 w-5 text-muted-foreground" />
    </div>
  );

  const ModalContent = <JoinInfoPanel roomId={roomId} joinUrl={joinUrl} hostName={hostName} roomTitle={roomTitle} />;

  const JoinControl = (
    <>
      {isMobile ? (
        <Sheet open={joinModalOpen} onOpenChange={setJoinModalOpen}>
          <SheetTrigger asChild>{Trigger}</SheetTrigger>
          <SheetContent side="bottom" className="p-0 rounded-t-lg">
            <div className="p-4 pt-6">{ModalContent}</div>
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={joinModalOpen} onOpenChange={setJoinModalOpen}>
          <DialogTrigger asChild>{Trigger}</DialogTrigger>
          <DialogContent className="sm:max-w-md">{ModalContent}</DialogContent>
        </Dialog>
      )}
    </>
  );

  return (
    <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-2 md:gap-4">
        <Link href="/" className="flex flex-col">
            <span className="text-sm font-bold uppercase tracking-wide text-primary leading-tight sm:text-base">
                PEER JUDGE
            </span>
            <span className="text-[10px] text-muted-foreground sm:text-[11px]">
                by MicroX
            </span>
        </Link>
        
        {isClient ? JoinControl : <Skeleton className="h-9 w-36 rounded-lg" /> }

      </div>
      <div className="flex items-center gap-2 md:gap-3">
        <Button variant="outline" size="sm" className="gap-2 lg:hidden" onClick={onOpenParticipants}>
            <Users className="h-4 w-4" />
            <span>{judgesCount}</span>
        </Button>

        <Badge variant={sessionStatus === 'live' ? 'default' : 'destructive'} className={cn(
          "hidden sm:flex items-center gap-1.5",
          sessionStatus === 'live' && "bg-green-500/10 text-green-700 border-green-500/20 hover:bg-green-500/20"
        )}>
            {sessionStatus === 'live' && <Circle className="h-2 w-2 fill-current text-green-500" />}
            <span className="font-semibold">
              {sessionStatus === 'live' ? "Live" : "Ended"}
            </span>
        </Badge>


        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 pl-2 pr-2 sm:px-3">
              <div className="relative">
                <User className="h-5 w-5" />
                {reports.length > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 rounded-full bg-destructive animate-pulse" />
                )}
              </div>
              <span className="hidden font-medium md:inline">{hostName}</span>
              <ChevronDown className="h-4 w-4 hidden md:block" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel>Host: {hostName}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            <Dialog open={reportsOpen} onOpenChange={setReportsOpen}>
              <DialogTrigger asChild>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="cursor-pointer">
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  <span>Reports</span>
                  {reports.length > 0 && (
                    <Badge variant="destructive" className="ml-auto h-5 px-1.5 py-0 text-[10px]">
                      {reports.length}
                    </Badge>
                  )}
                </DropdownMenuItem>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <ReportsListDialog 
                  reports={reports} 
                  isLoading={isReportsLoading} 
                  onClearAll={onClearAllReports}
                  canClear={true}
                />
              </DialogContent>
            </Dialog>

            <DropdownMenuItem asChild className="cursor-pointer">
                <Link href={`/results/${roomId}`} target="_blank">
                    <Trophy className="mr-2 h-4 w-4" />
                    <span>Open Results Page</span>
                </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Leaderboard</DropdownMenuLabel>
            <DropdownMenuItem onSelect={onExportExcel} className="cursor-pointer">
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              <span>Export results as Excel</span>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onExportPdf} className="cursor-pointer">
              <FileText className="mr-2 h-4 w-4" />
              <span>Export results as PDF</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
             <DropdownMenuLabel className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Votes Matrix</DropdownMenuLabel>
            <DropdownMenuItem onSelect={onExportVotesExcel} className="cursor-pointer">
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              <span>Export votes as Excel</span>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onExportVotesPdf} className="cursor-pointer">
              <FileText className="mr-2 h-4 w-4" />
              <span>Export votes as PDF</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <DropdownMenuItem
                  onSelect={(e) => e.preventDefault()}
                  className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer"
                >
                  <ShieldAlert className="mr-2 h-4 w-4" />
                  <span>End Session</span>
                </DropdownMenuItem>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently close the room for all participants.
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isEnding}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={isEnding}
                    className="bg-destructive hover:bg-destructive/90"
                    onClick={onEndSession}
                  >
                    {isEnding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isEnding ? 'Ending...' : 'End Session'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}