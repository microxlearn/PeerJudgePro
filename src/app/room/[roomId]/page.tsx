'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useDoc, useCollection, useFirebase, useUser, useMemoFirebase } from '@/firebase';
import { doc, writeBatch, collection, query, orderBy, increment, Timestamp } from 'firebase/firestore';
import { type Room, type Performance, type Participant, type IssueReport } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Home, Trophy, Users, Loader2, CheckCircle2, Star, BadgeCheck, Timer } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import LeaderboardPanel from '@/components/peer-judge/leaderboard-panel';
import JudgeParticipantsList from '@/components/peer-judge/judge-participants-list';
import JudgeHeader from '@/components/peer-judge/judge-header';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { AnimatedScore } from '@/components/peer-judge/animated-score';

function JudgePageSkeleton() {
  return (
    <div className="flex min-h-dvh w-full items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md p-8 border-none shadow-sm">
        <Skeleton className="h-8 w-3/4 mb-2 rounded-full" />
        <Skeleton className="h-4 w-1/2 mb-8 rounded-full" />
        <Skeleton className="h-32 w-full mb-6 rounded-2xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
      </Card>
    </div>
  );
}

function MultiPerformerResultScreen({ 
    activePerformances,
    totalJudges,
}: { 
    activePerformances: Performance[];
    totalJudges: number;
}) {
  const votedCount = activePerformances[0]?.voteCount || 0;

  return (
    <div className="flex min-h-dvh w-full flex-col items-center justify-start bg-muted/20 p-4 pt-4 text-center sm:justify-center">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-lg"
      >
        <div className="mb-6 flex flex-col items-center gap-2">
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-bold px-3 py-1 text-[10px] uppercase tracking-widest">
                Progress: {votedCount} / {totalJudges} Judges Voted
            </Badge>
        </div>

        <div className="mb-8">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Evaluation Recorded</h2>
            <p className="text-muted-foreground mt-1">Your scores have been sent to the host.</p>
        </div>

        <div className="grid grid-cols-1 gap-2">
            {activePerformances.map((p, idx) => (
                <motion.div 
                    key={p.id} 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="p-4 rounded-xl bg-background border border-border/50 flex justify-between items-center text-left shadow-sm"
                >
                    <div className="overflow-hidden mr-4">
                        <div className="flex items-center gap-1.5 mb-0.5">
                            <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Performer</span>
                        </div>
                        <p className="text-base font-semibold text-foreground truncate">{p.performerName}</p>
                    </div>
                    <div className="text-right shrink-0">
                        <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-tight">Total Pts</p>
                        <AnimatedScore value={p.totalScore} className="text-xl font-bold text-primary tabular-nums leading-none mt-0.5" />
                    </div>
                </motion.div>
            ))}
        </div>
        
        <div className="mt-10 flex flex-col items-center gap-2">
            <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-pulse" />
                <div className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-pulse [animation-delay:200ms]" />
                <div className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-pulse [animation-delay:400ms]" />
            </div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-tighter">Waiting for host to start next round</p>
        </div>
      </motion.div>
    </div>
  );
}

function SessionEndedScreen() {
    const router = useRouter();
    useEffect(() => {
        const timer = setTimeout(() => router.push('/'), 5000);
        return () => clearTimeout(timer);
    }, [router]);

    return (
        <div className="flex min-h-dvh w-full flex-col items-center justify-center bg-muted/30 p-4 text-center">
            <Card className="p-8 w-full max-w-md shadow-xl border-none">
                <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-6">
                    <Home className="h-8 w-8 text-destructive" />
                </div>
                <CardHeader className="p-0">
                    <CardTitle className="text-2xl font-bold">Session Ended</CardTitle>
                    <CardDescription className="text-base mt-2">The host has closed this room. Thank you for participating!</CardDescription>
                </CardHeader>
                <CardContent className="mt-8 p-0">
                    <Button variant="outline" onClick={() => router.push('/')} className="w-full h-12 rounded-xl border-border">
                        Back to Home
                    </Button>
                    <p className="text-xs text-muted-foreground mt-4 italic">Redirecting in 5 seconds...</p>
                </CardContent>
            </Card>
        </div>
    );
}

export default function JudgePage() {
  const params = useParams<{ roomId: string }>();
  const roomId = params.roomId;
  const { firestore } = useFirebase();
  const { user: judgeUser, isUserLoading: isAuthLoading } = useUser();
  const { toast } = useToast();
  
  const [scores, setScores] = useState<Record<string, number>>({});
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isMounted = useRef(true);

  const roomRef = useMemoFirebase(() => firestore ? doc(firestore, 'rooms', roomId) : null, [firestore, roomId]);
  const { data: room, isLoading: isRoomLoading } = useDoc<Room>(roomRef);

  const performancesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'rooms', roomId, 'performances'), orderBy('createdAt', 'desc'));
  }, [firestore, roomId]);
  const { data: allPerformances, isLoading: arePerformancesLoading } = useCollection<Performance>(performancesQuery);

  const participantsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'rooms', roomId, 'participants') : null, [firestore, roomId]);
  const { data: participants, isLoading: areParticipantsLoading } = useCollection<Participant>(participantsQuery);

  const reportsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'rooms', roomId, 'reports'), orderBy('createdAt', 'desc')) : null, [firestore, roomId]);
  const { data: reports } = useCollection<IssueReport>(reportsQuery);

  const activePerformances = useMemo(() => {
    if (!allPerformances || !room?.activePerformerIds) return [];
    return allPerformances.filter(p => room.activePerformerIds?.includes(p.id));
  }, [allPerformances, room?.activePerformerIds]);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    const initialScores: Record<string, number> = {};
    activePerformances.forEach(p => {
        initialScores[p.id] = 10;
    });
    setScores(initialScores);
    setIsSubmitting(false); // CRITICAL: Reset submitting state when active performers change
  }, [room?.activePerformerIds, activePerformances.length]);

  useEffect(() => {
    if (activePerformances.length > 0 && activePerformances[0].status === 'performing' && activePerformances[0].startedAt) {
        const intervalId = setInterval(() => {
            const startTime = (activePerformances[0].startedAt as Timestamp).toMillis();
            const elapsed = Date.now() - startTime;
            const timeLeft = Math.max(0, 300 - Math.floor(elapsed / 1000));
            setCountdown(timeLeft);
            if (timeLeft === 0) clearInterval(intervalId);
        }, 1000);
        return () => clearInterval(intervalId);
    } else {
        setCountdown(null);
    }
  }, [activePerformances]);

  const totalJudges = participants?.filter(p => p.role === 'judge').length ?? 0;
  
  const hasVotedAll = useMemo(() => {
    if (!judgeUser || activePerformances.length === 0) return false;
    return activePerformances.every(p => p.voters && p.voters[judgeUser.uid] !== undefined);
  }, [activePerformances, judgeUser]);

  const handleSubmitAllScores = () => {
    if (!judgeUser || !firestore || activePerformances.length === 0 || isSubmitting) return;

    if (countdown !== null && countdown <= 0) {
      toast({ title: 'Time is up!', variant: 'destructive'});
      return;
    }

    setIsSubmitting(true);
    
    const batch = writeBatch(firestore);
    
    activePerformances.forEach(p => {
        const pRef = doc(firestore, 'rooms', roomId, 'performances', p.id);
        const score = scores[p.id] || 10;
        
        batch.update(pRef, {
            [`voters.${judgeUser.uid}`]: score,
            voteCount: increment(1),
            totalScore: increment(score),
        });
    });

    batch.commit()
        .then(() => {
            if (isMounted.current) {
                toast({ title: 'Evaluation Recorded' });
                // We don't reset isSubmitting to false here because the UI 
                // will transition to the result screen automatically via hasVotedAll.
                // It gets reset when room.activePerformerIds changes.
            }
        })
        .catch((error: any) => {
            console.error("Batch submission failed:", error);
            if (isMounted.current) {
                toast({ title: 'Submission failed', variant: 'destructive'});
                setIsSubmitting(false);
            }
        });
  };

  const isLoading = isAuthLoading || isRoomLoading || arePerformancesLoading || areParticipantsLoading;

  if (isLoading) return <JudgePageSkeleton />;
  if (room?.status === 'ended') return <SessionEndedScreen />;

  const isPerforming = activePerformances.length > 0 && activePerformances[0].status === 'performing';
  const showScoring = isPerforming && !hasVotedAll;

  return (
    <div className="relative flex min-h-dvh w-full flex-col bg-muted/10 pb-20 sm:pb-24">
        <JudgeHeader
          roomId={roomId}
          roomTitle={room?.title}
          onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
          onOpenParticipants={() => setIsParticipantsOpen(true)}
        />
        
        <main className="flex-grow flex w-full items-start justify-center p-4 pt-4 sm:pt-6">
            {showScoring ? (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-xl space-y-4 mb-24">
                  <div className="flex flex-col items-center justify-center space-y-2 mb-4">
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-bold px-3 py-0.5 text-[10px] uppercase tracking-wider">Live Evaluation</Badge>
                    {countdown !== null && (
                      <div className="flex items-center gap-2 text-destructive">
                        <Timer className="h-4 w-4" />
                        <span className="font-mono text-xl font-bold tabular-nums">
                            {Math.floor(countdown / 60).toString().padStart(2, '0')}:{(countdown % 60).toString().padStart(2, '0')}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    {activePerformances.map((p, idx) => (
                       <motion.div 
                        key={p.id}
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.05 }}
                       >
                          <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
                            <CardContent className="p-4 sm:p-5">
                              <div className="flex justify-between items-start gap-4 mb-4">
                                <div className="overflow-hidden flex-1">
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                    <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest">Active Performer</span>
                                  </div>
                                  <h3 className="text-lg font-bold text-foreground leading-tight">{p.performerName}</h3>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest block mb-0.5">Points</span>
                                  <span className="text-3xl font-bold text-primary tabular-nums tracking-tighter leading-none">{scores[p.id] ?? 10}</span>
                                </div>
                              </div>
                              
                              <div className="px-1">
                                <Slider
                                    value={[scores[p.id] ?? 10]}
                                    onValueChange={(val) => setScores(prev => ({ ...prev, [p.id]: val[0] }))}
                                    max={20}
                                    step={1}
                                    className="h-7"
                                />
                                <div className="flex justify-between text-[9px] font-bold text-muted-foreground/60 uppercase mt-2 px-1">
                                    <span>Poor</span>
                                    <span>Neutral</span>
                                    <span>Excellent</span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                       </motion.div>
                    ))}
                  </div>
                </motion.div>
            ) : activePerformances.length > 0 ? (
                <MultiPerformerResultScreen 
                    activePerformances={activePerformances}
                    totalJudges={totalJudges}
                />
            ) : (
                <div className="text-center w-full max-w-md mt-10">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-background rounded-3xl p-10 shadow-sm border border-border/40"
                    >
                        <div className="mx-auto w-16 h-16 bg-primary/5 rounded-full flex items-center justify-center mb-6">
                            <Trophy className="h-8 w-8 text-primary/30" />
                        </div>
                        <h2 className="text-xl font-bold tracking-tight">Standby</h2>
                        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                            The host is preparing the next round of performers. Check the leaderboard for current standings.
                        </p>
                        <div className="mt-8 flex justify-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary/20 animate-bounce [animation-delay:-0.3s]" />
                            <div className="w-1.5 h-1.5 rounded-full bg-primary/20 animate-bounce [animation-delay:-0.15s]" />
                            <div className="w-1.5 h-1.5 rounded-full bg-primary/20 animate-bounce" />
                        </div>
                    </motion.div>
                </div>
            )}
        </main>
        
        {showScoring && (
            <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-background/80 backdrop-blur-lg border-t border-border/40 pb-6">
                <div className="container mx-auto max-w-xl">
                    <Button
                        onClick={handleSubmitAllScores}
                        disabled={isSubmitting || (countdown !== null && countdown <= 0)}
                        className="w-full h-14 text-base font-bold shadow-lg rounded-xl active:scale-[0.98] transition-all bg-primary hover:bg-primary/90"
                        size="lg"
                    >
                        {isSubmitting ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}
                        {isSubmitting ? 'Submitting...' : `Submit Evaluation`}
                    </Button>
                    {countdown !== null && countdown <= 30 && countdown > 0 && (
                        <p className="text-center text-[10px] font-bold text-destructive mt-2 animate-pulse uppercase tracking-widest">Time is almost up!</p>
                    )}
                </div>
            </div>
        )}

        <Sheet open={isLeaderboardOpen} onOpenChange={setIsLeaderboardOpen}>
            <SheetContent side="bottom" className="h-[80dvh] p-0 rounded-t-[2rem] border-none shadow-2xl">
                <SheetHeader className="p-6 border-b border-border/40">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-50 rounded-lg">
                            <Trophy className="h-5 w-5 text-amber-500" />
                        </div>
                        <div>
                            <SheetTitle className="text-lg font-bold">Leaderboard</SheetTitle>
                            <SheetDescription className="text-xs">Global rankings for the room</SheetDescription>
                        </div>
                    </div>
                </SheetHeader>
                <div className="flex-grow overflow-hidden h-[calc(80dvh-80px)]">
                    <LeaderboardPanel performances={allPerformances} isLoading={arePerformancesLoading} isSheet />
                </div>
            </SheetContent>
        </Sheet>

        <Sheet open={isParticipantsOpen} onOpenChange={setIsParticipantsOpen}>
            <SheetContent side="bottom" className="h-[80dvh] p-0 rounded-t-[2rem] border-none shadow-2xl">
                <SheetHeader className="p-6 border-b border-border/40">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 rounded-lg">
                            <Users className="h-5 w-5 text-blue-500" />
                        </div>
                        <div>
                            <SheetTitle className="text-lg font-bold">Room Judges</SheetTitle>
                            <SheetDescription className="text-xs">All active session participants</SheetDescription>
                        </div>
                    </div>
                </SheetHeader>
                <div className="flex-grow overflow-hidden h-[calc(80dvh-80px)]">
                    <JudgeParticipantsList 
                      participants={participants} 
                      isLoading={areParticipantsLoading} 
                      reports={reports ?? []}
                    />
                </div>
            </SheetContent>
        </Sheet>

        {!showScoring && (
            <footer className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/40 bg-background/80 p-4 backdrop-blur-lg pb-6">
                <div className="container mx-auto flex max-w-md items-center justify-between gap-4">
                    <Button variant="ghost" className="flex-1 h-11 rounded-xl font-bold gap-2 text-xs" onClick={() => setIsLeaderboardOpen(true)}>
                        <Trophy className="h-4 w-4" /> Rankings
                    </Button>
                    <div className="w-px h-5 bg-border/60" />
                    <Button variant="ghost" className="flex-1 h-11 rounded-xl font-bold gap-2 text-xs" onClick={() => setIsParticipantsOpen(true)}>
                        <Users className="h-4 w-4" /> Judges ({totalJudges})
                    </Button>
                </div>
            </footer>
        )}
    </div>
  );
}
