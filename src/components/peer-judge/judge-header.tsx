'use client';

import Link from 'next/link';
import {
  Menu,
  Home,
  Users,
  Trophy,
  LogOut,
  Circle,
  Info,
  BadgeCheck,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet';
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
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useUser, useDoc, useCollection, useMemoFirebase, useFirebase } from '@/firebase';
import { type Participant } from '@/lib/types';
import { doc, collection } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Skeleton } from '../ui/skeleton';
import JoinInfoPanel from './join-instructions';
import ReportIssueDialog from './report-issue-dialog';

interface JudgeHeaderProps {
  roomId: string;
  roomTitle?: string;
  onOpenLeaderboard: () => void;
  onOpenParticipants: () => void;
}

export default function JudgeHeader({ roomId, roomTitle, onOpenLeaderboard, onOpenParticipants }: JudgeHeaderProps) {
  const { firestore } = useFirebase();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [joinUrl, setJoinUrl] = useState('');

  useEffect(() => {
    setJoinUrl(`${window.location.origin}/join?room=${roomId}`);
  }, [roomId]);

  const participantRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'rooms', roomId, 'participants', user.uid) : null),
    [firestore, user, roomId]
  );
  const { data: participant, isLoading: isParticipantLoading } = useDoc<Participant>(participantRef);
  
  const participantsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'rooms', roomId, 'participants') : null),
    [firestore, roomId]
  );
  const { data: participants, isLoading: areParticipantsLoading } = useCollection<Participant>(participantsQuery);
  const host = participants?.find(p => p.role === 'host');
  
  const isLoading = isUserLoading || isParticipantLoading || areParticipantsLoading;

  const handleExit = () => {
    setIsSidebarOpen(false);
    router.push('/');
  };

  const ModalContent = <JoinInfoPanel roomId={roomId} joinUrl={joinUrl} hostName={host?.name} roomTitle={roomTitle} />;

  return (
    <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-border/40 bg-background/80 px-4 backdrop-blur-md">
      <div className="flex items-center gap-1">
        <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:bg-muted/50">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[85vw] max-w-[300px] p-0 border-none shadow-2xl">
             <SheetHeader className="p-6 border-b border-border/40">
                <SheetTitle className="flex flex-col text-left">
                     <span className="text-xl font-bold tracking-tight text-primary">
                        PEER JUDGE
                    </span>
                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-[0.2em] mt-0.5">
                        by MicroX
                    </span>
                </SheetTitle>
            </SheetHeader>
            <div className="p-6 space-y-6">
                <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Room Access</p>
                    <p className="font-mono text-2xl font-bold tracking-[0.1em] text-primary">{roomId}</p>
                </div>
                 <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Session Role</p>
                    <Badge variant="secondary" className="bg-muted text-muted-foreground border-none font-semibold">Judge</Badge>
                </div>
            </div>
            <Separator className="bg-border/40" />
            <nav className="p-4 flex flex-col gap-1">
                 <SheetClose asChild>
                    <Button variant="ghost" className="justify-between text-sm h-12 rounded-xl group" onClick={onOpenLeaderboard}>
                        <div className="flex items-center gap-3">
                            <Trophy className="h-4 w-4 text-amber-500" />
                            <span>Leaderboard</span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Button>
                 </SheetClose>
                 <SheetClose asChild>
                    <Button variant="ghost" className="justify-between text-sm h-12 rounded-xl group" onClick={onOpenParticipants}>
                        <div className="flex items-center gap-3">
                            <Users className="h-4 w-4 text-blue-500" />
                            <span>Participants</span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Button>
                 </SheetClose>
                 <Dialog open={isInfoOpen} onOpenChange={setIsInfoOpen}>
                    <DialogTrigger asChild>
                        <Button variant="ghost" className="justify-between text-sm h-12 rounded-xl group">
                            <div className="flex items-center gap-3">
                                <Info className="h-4 w-4 text-primary" />
                                <span>Room Info</span>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="rounded-3xl border-none">
                        {ModalContent}
                    </DialogContent>
                 </Dialog>
                  <SheetClose asChild>
                    <Button variant="ghost" className="justify-between text-sm h-12 rounded-xl group" asChild>
                        <Link href="/">
                            <div className="flex items-center gap-3">
                                <Home className="h-4 w-4" />
                                <span>Home</span>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                    </Button>
                 </SheetClose>
                 <div className="pt-4 mt-4 border-t border-border/40">
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" className="w-full justify-start text-sm h-12 rounded-xl text-destructive hover:bg-destructive/5 hover:text-destructive">
                                <LogOut className="mr-3 h-4 w-4" /> Exit Room
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-3xl border-none shadow-2xl">
                            <AlertDialogHeader>
                                <AlertDialogTitle>Exit this session?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    You can rejoin later with the same room code as long as the session is live.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="gap-2 sm:gap-0">
                                <AlertDialogCancel className="rounded-xl border-border">Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleExit} className="rounded-xl bg-destructive hover:bg-destructive/90">Exit Session</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                 </div>
            </nav>
          </SheetContent>
        </Sheet>
        
        <Link href="/" className="flex flex-col ml-1">
            <span className="text-base font-bold tracking-tight text-primary">
                PEER JUDGE
            </span>
            <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-widest leading-none">
                MicroX
            </span>
        </Link>
      </div>

      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:block">
        {roomTitle && (
            <h1 className="truncate text-sm font-semibold text-foreground max-w-[200px]" title={roomTitle}>{roomTitle}</h1>
        )}
      </div>
      
      <div className="flex items-center gap-1">
        <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-destructive hover:bg-destructive/5 rounded-full">
              <AlertTriangle className="h-4 w-4" />
              <span className="sr-only">Report Issue</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] rounded-[2rem] border-none shadow-2xl">
            {participant && (
              <ReportIssueDialog
                roomId={roomId}
                judgeName={participant.name}
                judgeId={user?.uid || ''}
                onSuccess={() => setIsReportOpen(false)}
              />
            )}
          </DialogContent>
        </Dialog>

        {isLoading ? (
            <Skeleton className="h-8 w-8 rounded-full" />
        ) : (
            <div className="flex items-center gap-2 pl-2">
                <div className="hidden sm:flex flex-col text-right">
                     <div className="flex items-center justify-end gap-1">
                        <span className="font-semibold text-xs">{participant?.name}</span>
                        {participant?.name === 'MICROX(admin)' && <BadgeCheck className="h-3.5 w-3.5 text-blue-500" />}
                     </div>
                     <span className="text-[10px] text-muted-foreground font-medium">Judge</span>
                </div>
                <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
            </div>
        )}
      </div>
    </header>
  );
}
