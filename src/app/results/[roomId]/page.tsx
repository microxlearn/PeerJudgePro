'use client';

import { useState, useEffect, useMemo } from 'react';
import { type Participant, type Performance, type Room, type IssueReport } from '@/lib/types';
import { useCollection, useDoc, useMemoFirebase, useFirebase } from '@/firebase';
import {
  collection,
  query,
  doc,
  orderBy,
} from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import LeaderboardPanel from '@/components/peer-judge/leaderboard-panel';
import ScoresPanel from '@/components/peer-judge/scores-panel';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Home, Expand, Shrink, AlertTriangle, QrCode } from 'lucide-react';
import { signInAnonymously } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import ReportsListDialog from '@/components/peer-judge/reports-list-dialog';
import JoinInfoPanel from '@/components/peer-judge/join-instructions';
import { Badge } from '@/components/ui/badge';


function ResultsPageSkeleton() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-9 w-24" />
        </header>
        <main className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-0">
          <div className="flex flex-col p-4 border-r">
            <div className="p-4 border-b text-center mb-4"><Skeleton className="h-6 w-1/2 mx-auto" /></div>
            <Skeleton className="h-full w-full rounded-lg" />
          </div>
          <div className="flex flex-col p-4">
             <div className="p-4 border-b text-center mb-4"><Skeleton className="h-6 w-1/2 mx-auto" /></div>
            <Skeleton className="h-full w-full rounded-lg" />
          </div>
        </main>
    </div>
  );
}


export default function ResultsPage() {
    const params = useParams<{ roomId: string }>();
    const roomId = params.roomId;
    const { toast } = useToast();
    const { firestore, auth, isUserLoading: isAuthLoading } = useFirebase();
    const [fullScreenPanel, setFullScreenPanel] = useState<'scores' | 'leaderboard' | null>(null);
    const [reportsOpen, setReportsOpen] = useState(false);
    const [joinUrl, setJoinUrl] = useState('');

    useEffect(() => {
        if (auth && !auth.currentUser) {
            signInAnonymously(auth).catch((error) => {
                console.error("Anonymous sign-in failed:", error);
                toast({
                    title: 'Authentication Failed',
                    description: 'Could not establish a session. Please refresh.',
                    variant: 'destructive',
                });
            });
        }
    }, [auth, toast]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setJoinUrl(`${window.location.origin}/join?room=${roomId}`);
        }
    }, [roomId]);

    const roomRef = useMemoFirebase(() => firestore ? doc(firestore, 'rooms', roomId) : null, [firestore, roomId]);
    const { data: room, isLoading: isRoomLoading } = useDoc<Room>(roomRef);

    const participantsQuery = useMemoFirebase(() => {
        if (!firestore || !roomId) return null;
        return query(collection(firestore, 'rooms', roomId, 'participants'));
    }, [firestore, roomId]);
    const { data: participants, isLoading: participantsLoading } = useCollection<Participant>(participantsQuery);
    
    const performancesQuery = useMemoFirebase(() => {
        if (!firestore || !roomId) return null;
        return query(collection(firestore, 'rooms', roomId, 'performances'), orderBy('createdAt', 'desc'));
    }, [firestore, roomId]);
    const { data: performances, isLoading: performancesLoading } = useCollection<Performance>(performancesQuery);

    const reportsQuery = useMemoFirebase(() => {
      if (!firestore || !roomId) return null;
      return query(collection(firestore, 'rooms', roomId, 'reports'), orderBy('createdAt', 'desc'));
    }, [firestore, roomId]);
    const { data: reports, isLoading: reportsLoading } = useCollection<IssueReport>(reportsQuery);

    const isLoading = isAuthLoading || isRoomLoading || participantsLoading || performancesLoading;
    
    const activePerformances = useMemo(() => {
      if (!performances || !room?.activePerformerIds) return [];
      return performances.filter(p => room.activePerformerIds?.includes(p.id));
    }, [performances, room?.activePerformerIds]);

    const judges = participants?.filter((p) => p.role === 'judge') ?? [];
    const host = participants?.find(p => p.role === 'host');

    if (isLoading) {
        return <ResultsPageSkeleton />;
    }

    return (
        <div className="flex min-h-dvh flex-col bg-background">
            <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="flex items-center gap-4">
                     <Link href="/" className="flex flex-col">
                        <span className="text-sm font-bold uppercase tracking-wide text-primary leading-tight sm:text-base">
                            PEER JUDGE
                        </span>
                        <span className="text-[10px] text-muted-foreground sm:text-[11px]">
                            by MicroX
                        </span>
                    </Link>
                     <div className="hidden sm:block h-6 w-px bg-border"></div>
                    <h1 className="text-lg font-semibold truncate hidden sm:block">{room?.title || `Room ${roomId}`}</h1>
                </div>
                <div className="flex items-center gap-2">
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                                <QrCode className="mr-2 h-4 w-4" />
                                <span className="hidden sm:inline">Join Info</span>
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                            <JoinInfoPanel 
                                roomId={roomId} 
                                joinUrl={joinUrl} 
                                hostName={host?.name} 
                                roomTitle={room?.title} 
                            />
                        </DialogContent>
                    </Dialog>

                    <Dialog open={reportsOpen} onOpenChange={setReportsOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="relative">
                                <AlertTriangle className="mr-2 h-4 w-4" />
                                <span className="hidden sm:inline">Reports</span>
                                {reports && reports.length > 0 && (
                                    <Badge variant="destructive" className="ml-1.5 h-5 px-1.5 py-0 text-[10px]">
                                        {reports.length}
                                    </Badge>
                                )}
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                            <ReportsListDialog reports={reports ?? []} isLoading={reportsLoading} />
                        </DialogContent>
                    </Dialog>
                    <Button variant="outline" asChild>
                        <Link href={`/admin/${roomId}`}>
                            <Home className="mr-2 h-4 w-4" /> Admin View
                        </Link>
                    </Button>
                </div>
            </header>
            <main className={cn(
                "flex-1 grid grid-cols-1 md:grid-cols-2 gap-0 overflow-hidden h-[calc(100dvh-3.5rem)]",
                 { "md:grid-cols-1": fullScreenPanel }
            )}>
                <div className={cn(
                    "flex flex-col h-full overflow-hidden",
                    fullScreenPanel === 'leaderboard' && "hidden",
                    !fullScreenPanel && "border-r"
                )}>
                    <div className="p-4 border-b text-center shrink-0 relative flex items-center justify-center">
                        <div className="text-center">
                            <h3 className="text-xl font-semibold">Score Intelligence</h3>
                            {activePerformances.length > 0 && (
                            <p className="text-sm text-muted-foreground">
                                Active Performer(s): <span className="font-bold text-primary">{activePerformances.map(p => p.performerName).join(', ')}</span>
                            </p>
                            )}
                        </div>
                        <Button variant="ghost" size="icon" className="absolute top-1/2 right-4 -translate-y-1/2" onClick={() => setFullScreenPanel(fullScreenPanel === 'scores' ? null : 'scores')}>
                            {fullScreenPanel === 'scores' ? <Shrink className="h-5 w-5" /> : <Expand className="h-5 w-5" />}
                        </Button>
                    </div>
                    <div className="flex-grow overflow-auto">
                        <ScoresPanel 
                            performances={activePerformances}
                            totalJudges={judges.length}
                            isFullScreen={fullScreenPanel === 'scores'}
                            participants={participants}
                        />
                    </div>
                </div>
                <div className={cn(
                    "flex flex-col h-full overflow-hidden",
                     fullScreenPanel === 'scores' && "hidden"
                )}>
                    <div className="p-4 border-b text-center shrink-0 relative flex items-center justify-center">
                        <div className="text-center">
                            <h3 className="text-xl font-semibold">Leaderboard</h3>
                            <p className="text-sm text-muted-foreground">Ranking of all completed performances.</p>
                        </div>
                         <Button variant="ghost" size="icon" className="absolute top-1/2 right-4 -translate-y-1/2" onClick={() => setFullScreenPanel(fullScreenPanel === 'leaderboard' ? null : 'leaderboard')}>
                            {fullScreenPanel === 'leaderboard' ? <Shrink className="h-5 w-5" /> : <Expand className="h-5 w-5" />}
                        </Button>
                    </div>
                    <div className="flex-grow overflow-auto">
                         <LeaderboardPanel 
                            performances={performances} 
                            isLoading={performancesLoading}
                            isFullScreen={fullScreenPanel === 'leaderboard'}
                        />
                    </div>
                </div>
            </main>
        </div>
    );
}