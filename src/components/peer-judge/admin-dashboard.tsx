'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { type Participant, type Performance, type PerformerStatus, type Room, type IssueReport } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

import AdminHeader from './admin-header';
import ParticipantsPanel from './participants-panel';
import PerformerControl from './performer-control';
import ScoresPanel from './scores-panel';
import { useCollection, useDoc, useMemoFirebase, useUser, useFirestore } from '@/firebase';
import {
  collection,
  query,
  doc,
  deleteDoc,
  updateDoc,
  writeBatch,
  serverTimestamp,
  orderBy,
  FieldValue,
  Timestamp,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Skeleton } from '../ui/skeleton';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import LeaderboardPanel from './leaderboard-panel';
import { useRouter } from 'next/navigation';
import { exportLeaderboardToExcel, exportLeaderboardToPdf, exportVotesToExcel, exportVotesToPdf } from '@/lib/export';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Users, Trophy } from 'lucide-react';

interface AdminDashboardProps {
  roomId: string;
}

export default function AdminDashboard({ roomId }: AdminDashboardProps) {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  const { toast } = useToast();
  const firestore = useFirestore();
  const { user: adminUser, isUserLoading: isAuthLoading } = useUser();
  const router = useRouter();
  const [isEnding, setIsEnding] = useState(false);
  const [fullScreenPanel, setFullScreenPanel] = useState<'scores' | 'leaderboard' | null>(null);
  
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

  const [isSheetOpen, setSheetOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<'participants' | 'leaderboard'>('participants');

  const activePerformances = useMemo(() => {
    if (!performances || !room?.activePerformerIds) return [];
    return performances.filter(p => room.activePerformerIds?.includes(p.id));
  }, [performances, room?.activePerformerIds]);

  const lastReportCountRef = useRef(0);
  useEffect(() => {
    if (reports && reports.length > lastReportCountRef.current) {
      const latestReport = reports[0];
      if (latestReport) {
        toast({
          title: 'New Issue Reported',
          description: `${latestReport.judgeName} reported a problem.`,
          duration: 2000,
        });
      }
    }
    lastReportCountRef.current = reports?.length ?? 0;
  }, [reports, toast]);

  const isLoading = isAuthLoading || participantsLoading || isRoomLoading || performancesLoading;
  const host = participants?.find(p => p.id === adminUser?.uid);
  const judges = participants?.filter((p) => p.role === 'judge') ?? [];
  const onlineJudges = judges.filter(p => p.status === 'online');
  const disableControls = room?.status === 'ended';

  const handleKickParticipant = (participantId: string) => {
    if (!firestore || !roomId) return;
    const participantRef = doc(firestore, 'rooms', roomId, 'participants', participantId);
    deleteDoc(participantRef)
      .then(() => {
        toast({ title: 'Participant Kicked' });
      })
      .catch((err) => {
        const contextualError = new FirestorePermissionError({ path: participantRef.path, operation: 'delete' });
        errorEmitter.emit('permission-error', contextualError);
      });
  };

  const handleClearAllReports = async () => {
    if (!firestore || !roomId || !reports || reports.length === 0) return;
    const batch = writeBatch(firestore);
    reports.forEach(report => {
      batch.delete(doc(firestore, 'rooms', roomId, 'reports', report.id));
    });
    try {
      await batch.commit();
      toast({ title: 'Reports Cleared' });
    } catch (error) {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };
  
  const handleSetPerformanceStatus = useCallback((status: PerformerStatus) => {
      if (activePerformances.length === 0 || !firestore || !roomId) return;
      
      const batch = writeBatch(firestore);
      activePerformances.forEach(p => {
        const pRef = doc(firestore, 'rooms', roomId, 'performances', p.id);
        const updateData: any = { status };
        if (status === 'performing') updateData.startedAt = serverTimestamp();
        batch.update(pRef, updateData);
      });
      
      batch.commit().catch(err => {
        console.error("Batch update failed:", err);
      });
  }, [activePerformances, firestore, roomId]);

  useEffect(() => {
    if (activePerformances.length > 0 && activePerformances[0].status === 'performing' && activePerformances[0].startedAt) {
      const startTime = (activePerformances[0].startedAt as Timestamp).toMillis();
      const remainingTime = (startTime + 300000) - Date.now();
      if (remainingTime > 0) {
        const timerId = setTimeout(() => handleSetPerformanceStatus('finished'), remainingTime);
        return () => clearTimeout(timerId);
      } else {
        handleSetPerformanceStatus('finished');
      }
    }
  }, [activePerformances, handleSetPerformanceStatus]);

  const handleSetActivePerformers = (names: string[]) => {
    if (!firestore || !roomId || !roomRef) return;
    
    const batch = writeBatch(firestore);
    const newIds: string[] = [];

    names.forEach(name => {
        const pRef = doc(collection(firestore, 'rooms', roomId, 'performances'));
        const pData: Omit<Performance, 'id'> = {
            performerName: name,
            voters: {},
            totalScore: 0,
            voteCount: 0,
            status: 'waiting',
            createdAt: serverTimestamp(),
        };
        batch.set(pRef, pData);
        newIds.push(pRef.id);
    });

    batch.update(roomRef, { activePerformerIds: newIds });

    batch.commit()
        .then(() => {
            toast({
                title: 'Performers Set',
                description: `${names.length} performer(s) added.`,
            });
        })
        .catch(err => {
            toast({ title: 'Error', variant: 'destructive' });
        });
  };

  const handleEndSession = async () => {
    if (!roomRef || !firestore || !host) return;
    setIsEnding(true);
    try {
      await updateDoc(roomRef, { status: 'ended' });
      toast({ title: 'Session Ended' });
    } catch (error: any) {
      toast({ title: 'Error', variant: 'destructive' });
    } finally {
      setIsEnding(false);
    }
  };

  const handleExport = async (format: 'excel' | 'pdf', type: 'leaderboard' | 'votes') => {
    if (!performances || performances.length === 0) {
      toast({ title: 'No Data to Export' });
      return;
    }
    const roomTitle = room?.title || '';
    const hostName = host?.name || 'N/A';
    try {
        if (type === 'leaderboard') {
            const dataToExport = performances.filter(p => p.status === 'finished' && p.voteCount > 0);
            if (format === 'excel') exportLeaderboardToExcel(performances, participants!, roomId, roomTitle, hostName);
            else await exportLeaderboardToPdf(dataToExport, participants!, roomId, roomTitle, hostName);
        } else {
            if (format === 'excel') exportVotesToExcel(performances, participants!, roomId, roomTitle, hostName);
            else await exportVotesToPdf(performances, participants!, roomId, roomTitle, hostName);
        }
    } catch (error: any) {
      toast({ title: 'Export Failed', variant: 'destructive' });
    }
  };

  if (!isClient || isLoading) {
    return (
      <div className="flex min-h-dvh flex-col bg-muted/40">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-10 w-28" />
        </header>
        <main className="flex-1 p-4 md:p-6"><Skeleton className="h-full w-full" /></main>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-muted/40">
      <AdminHeader
        roomId={roomId}
        hostName={host?.name ?? 'Host'}
        sessionStatus={room?.status ?? 'live'}
        roomTitle={room?.title}
        judgesCount={onlineJudges.length}
        reports={reports ?? []}
        isReportsLoading={reportsLoading}
        onOpenParticipants={() => { setMobileTab('participants'); setSheetOpen(true); }}
        onEndSession={handleEndSession}
        onClearAllReports={handleClearAllReports}
        onExportExcel={() => handleExport('excel', 'leaderboard')}
        onExportPdf={() => handleExport('pdf', 'leaderboard')}
        onExportVotesExcel={() => handleExport('excel', 'votes')}
        onExportVotesPdf={() => handleExport('pdf', 'votes')}
        isEnding={isEnding}
      />
      <main className="flex-1 p-4 md:p-6">
        <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-3 xl:grid-cols-4">
          <div className="lg:col-span-2 xl:col-span-3 grid grid-cols-1 gap-4 md:gap-6">
              <div className="grid grid-cols-1 gap-4 md:gap-6 xl:grid-cols-2">
                <div className="xl:col-span-1">
                    <PerformerControl 
                        onSetPerformanceStatus={handleSetPerformanceStatus}
                        onSetActivePerformers={handleSetActivePerformers}
                        activePerformances={activePerformances}
                        totalJudges={judges.length}
                        disabled={disableControls}
                    />
                </div>
                <div className="xl:col-span-1">
                    <ScoresPanel 
                        performances={activePerformances}
                        totalJudges={judges.length}
                        onFullScreen={() => setFullScreenPanel('scores')}
                        participants={participants}
                    />
                </div>
              </div>
          </div>
          <div className="hidden lg:flex flex-col lg:col-span-1 xl:col-span-1 overflow-hidden h-[calc(100dvh-10rem)]">
            <Tabs defaultValue="participants" className="flex flex-col flex-grow">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="participants">Participants</TabsTrigger>
                <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
              </TabsList>
              <TabsContent value="participants" className="flex-grow mt-2 overflow-hidden">
                <ParticipantsPanel
                  participants={participants ?? []}
                  onKick={handleKickParticipant}
                  isLoading={isLoading}
                  reports={reports ?? []}
                />
              </TabsContent>
              <TabsContent value="leaderboard" className="flex-grow mt-2 overflow-hidden">
                  <LeaderboardPanel performances={performances} isLoading={performancesLoading} onFullScreen={() => setFullScreenPanel('leaderboard')} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>

      <Sheet open={isSheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="h-[80dvh] p-0 rounded-t-[2rem] border-none shadow-2xl overflow-hidden flex flex-col">
            <SheetHeader className="p-4 border-b">
                <SheetTitle className="flex items-center gap-2">
                    {mobileTab === 'participants' ? <Users className="h-5 w-5" /> : <Trophy className="h-5 w-5" />}
                    {mobileTab === 'participants' ? 'Participants' : 'Leaderboard'}
                </SheetTitle>
            </SheetHeader>
            <div className="flex-grow overflow-hidden">
                {mobileTab === 'participants' ? (
                    <ParticipantsPanel
                        participants={participants ?? []}
                        onKick={handleKickParticipant}
                        isLoading={isLoading}
                        reports={reports ?? []}
                        isSheet={true}
                    />
                ) : (
                    <LeaderboardPanel 
                        performances={performances} 
                        isLoading={performancesLoading} 
                        isSheet={true}
                        onFullScreen={() => { setSheetOpen(false); setFullScreenPanel('leaderboard'); }}
                    />
                )}
            </div>
            <div className="p-4 border-t bg-muted/50">
                <Tabs value={mobileTab} onValueChange={(val) => setMobileTab(val as any)} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="participants">Participants</TabsTrigger>
                        <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>
        </SheetContent>
      </Sheet>

      <Dialog open={!!fullScreenPanel} onOpenChange={(isOpen) => !isOpen && setFullScreenPanel(null)}>
        <DialogContent className="max-w-5xl w-full h-[90vh] flex flex-col p-0">
            {fullScreenPanel === 'scores' && (
              <div className="p-4 border-b text-center">
                <h3 className="text-xl font-semibold">Score Intelligence</h3>
                {activePerformances.length > 0 && (
                  <p className="text-sm text-muted-foreground">Active: <span className="font-bold text-primary">{activePerformances.map(p => p.performerName).join(', ')}</span></p>
                )}
              </div>
            )}
            <div className="flex-grow overflow-y-auto">
              {fullScreenPanel === 'scores' && (
                  <ScoresPanel performances={activePerformances} totalJudges={judges.length} isFullScreen={true} participants={participants} />
              )}
              {fullScreenPanel === 'leaderboard' && (
                  <LeaderboardPanel performances={performances} isLoading={performancesLoading} isFullScreen={true} />
              )}
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
