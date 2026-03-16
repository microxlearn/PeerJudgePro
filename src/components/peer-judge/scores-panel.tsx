'use client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { type Performance, type Participant } from '@/lib/types';
import { Progress } from '@/components/ui/progress';
import { Expand, Users } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';
import { useState, useEffect, useRef, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AnimatedScore } from './animated-score';

interface ScoresPanelProps {
    performances?: Performance[]; // Support for multiple active performers
    totalJudges: number;
    participants: (Participant & { id: string })[] | null;
    onFullScreen?: () => void;
    isFullScreen?: boolean;
}

export default function ScoresPanel({ performances = [], totalJudges, participants, onFullScreen, isFullScreen = false }: ScoresPanelProps) {
  // Use first performance as a proxy for batch progress/voters since they are submitted together
  const primaryPerformance = performances[0];
  
  const votesCasted = primaryPerformance?.voteCount ?? 0;
  const voteProgress = totalJudges > 0 ? (votesCasted / totalJudges) * 100 : 0;

  const prevVotersRef = useRef<Record<string, number>>();
  const [recentVoters, setRecentVoters] = useState<{ judgeId: string; name: string }[]>([]);

  const participantsMap = useMemo(() => {
    if (!participants) return new Map<string, string>();
    return new Map(participants.map(p => [p.id, p.name]));
  }, [participants]);

  useEffect(() => {
    const prevVoters = prevVotersRef.current ?? {};
    const currentVoters = primaryPerformance?.voters ?? {};

    if (prevVoters === currentVoters) return;

    const newVoterIds = Object.keys(currentVoters).filter(id => !(id in prevVoters));

    if (newVoterIds.length > 0) {
        const newVotersWithNames = newVoterIds
            .map(id => ({ judgeId: id, name: participantsMap.get(id) || `Judge ${id.slice(0, 5)}...` }))
            .filter(v => v.name);
        
        setRecentVoters(currentList => {
            const combined = [...newVotersWithNames, ...currentList];
            const unique = Array.from(new Map(combined.map(item => [item.judgeId, item])).values());
            return unique.slice(0, 30); // Keep more names
        });
    }
    
    prevVotersRef.current = currentVoters;
  }, [primaryPerformance?.voters, participantsMap]);

  useEffect(() => {
    if (primaryPerformance?.id) {
        setRecentVoters([]);
        prevVotersRef.current = {};
    }
  }, [primaryPerformance?.id]);

  const getConfidence = () => {
    if (voteProgress < 30) return { text: 'Initial Phase', color: 'text-red-500' };
    if (voteProgress < 70) return { text: 'In Progress', color: 'text-yellow-500' };
    return { text: 'Finalizing', color: 'text-green-500' };
  }
  const confidence = getConfidence();
  
  const RecentVotersList = ({ isFullScreenList }: { isFullScreenList: boolean }) => (
    <div className={cn(isFullScreenList ? "mt-0" : "mt-6")}>
      <div className="flex items-center gap-2 mb-3">
        <Users className="h-3.5 w-3.5 text-muted-foreground" />
        <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Recent Submissions</h4>
      </div>
      <ScrollArea className={cn(isFullScreenList ? "h-[calc(80vh-200px)]" : "h-48")}>
        <div className="flex flex-wrap gap-2 pr-4">
          <AnimatePresence initial={false}>
            {recentVoters.length > 0 ? (
              recentVoters.map((voter) => (
                <motion.div
                  key={voter.judgeId}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={cn(
                    "px-3 py-1.5 rounded-full border bg-background shadow-sm font-medium text-foreground",
                    isFullScreenList ? "text-sm" : "text-[11px]"
                  )}
                >
                  {voter.name}
                </motion.div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center w-full py-10 text-center text-muted-foreground bg-muted/20 rounded-xl border-2 border-dashed">
                <p className="text-xs font-semibold">Waiting for judges...</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </ScrollArea>
    </div>
  );

  return (
    <Card className={cn("shadow-lg h-full flex flex-col", isFullScreen && "border-0 shadow-none rounded-none")}>
      {!isFullScreen && (
        <CardHeader className="flex flex-row items-center justify-between shrink-0">
          <div className="space-y-1.5">
              <CardTitle>Score Intelligence</CardTitle>
              <CardDescription>
                Live batch analytics.
              </CardDescription>
          </div>
          {onFullScreen && (
              <Button variant="ghost" size="icon" onClick={onFullScreen}>
                  <Expand className="h-5 w-5" />
              </Button>
          )}
        </CardHeader>
      )}
      <CardContent className={cn("flex-grow overflow-auto", isFullScreen && "p-6")}>
        <div className={cn("grid grid-cols-1 gap-6", isFullScreen && "xl:grid-cols-2")}>
            <div className="space-y-6">
                {performances.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {performances.map(p => (
                            <div key={p.id} className="bg-primary/5 border border-primary/10 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                                <p className="text-[10px] uppercase font-bold text-muted-foreground/80 truncate w-full mb-1">{p.performerName}</p>
                                <AnimatedScore value={p.totalScore} className="text-4xl font-black text-primary tabular-nums tracking-tighter" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-10 text-center border-2 border-dashed rounded-2xl bg-muted/30">
                        <p className="text-sm font-medium text-muted-foreground">No active performers to display.</p>
                    </div>
                )}

                <div className="space-y-3 p-4 rounded-2xl border bg-card">
                    <div className='flex justify-between items-baseline'>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Judge Progress</p>
                        <p className={`text-[10px] font-bold ${confidence.color}`}>{confidence.text}</p>
                    </div>
                    <Progress value={voteProgress} className="h-2" />
                    <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground/60">
                        <span>{votesCasted} SUBMITTED</span>
                        <span>{totalJudges} TOTAL JUDGES</span>
                    </div>
                </div>

                {!isFullScreen && <RecentVotersList isFullScreenList={false} />}
            </div>

            {isFullScreen && <RecentVotersList isFullScreenList={true} />}
        </div>
      </CardContent>
    </Card>
  );
}
