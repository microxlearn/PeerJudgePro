'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { type Performance } from '@/lib/types';
import { Trophy, Expand } from 'lucide-react';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';

interface LeaderboardPanelProps {
  performances: Performance[] | null;
  isLoading: boolean;
  isSheet?: boolean;
  onFullScreen?: () => void;
  isFullScreen?: boolean;
}

export default function LeaderboardPanel({ performances, isLoading, isSheet = false, onFullScreen, isFullScreen = false }: LeaderboardPanelProps) {
    const sortedPerformances = performances
        ?.filter(p => p.status === 'finished' && p.voteCount > 0)
        .sort((a, b) => b.totalScore - a.totalScore) ?? [];
    
    const finishedPerformances: (Performance & { rank: number })[] = [];
    if (sortedPerformances.length > 0) {
        let rank = 1;
        for (let i = 0; i < sortedPerformances.length; i++) {
            if (i > 0 && sortedPerformances[i].totalScore < sortedPerformances[i - 1].totalScore) {
                rank = i + 1;
            }
            finishedPerformances.push({
                ...sortedPerformances[i],
                rank,
            });
        }
    }

    const cardClasses = isSheet || isFullScreen ? "border-0 shadow-none rounded-none" : "shadow-lg";

    const renderSkeleton = () => (
        <div className="space-y-3 p-2">
          {[...Array(5)].map((_, i) => (
             <li key={i} className="flex items-center justify-between rounded-lg border bg-transparent p-3">
               <div className="flex items-center gap-4">
                 <Skeleton className="h-8 w-8 rounded-full" />
                 <Skeleton className="h-5 w-32" />
               </div>
               <div className="text-right flex flex-col items-end gap-1">
                 <Skeleton className="h-7 w-12" />
                 <Skeleton className="h-3 w-16" />
               </div>
             </li>
          ))}
        </div>
    );

    return (
        <Card className={`${cardClasses} h-full flex flex-col`}>
            <CardHeader className={cn("flex flex-row items-center justify-between", (isSheet || isFullScreen) && "hidden")}>
                <div className="space-y-1.5">
                    <CardTitle>Leaderboard</CardTitle>
                    <CardDescription>Ranking of all completed performances.</CardDescription>
                </div>
                {onFullScreen && !isSheet && (
                    <Button variant="ghost" size="icon" onClick={onFullScreen}>
                        <Expand className="h-5 w-5" />
                    </Button>
                )}
            </CardHeader>
            <CardContent className="flex-grow overflow-hidden p-0">
                {isLoading ? renderSkeleton() : (
                    finishedPerformances.length > 0 ? (
                        <ScrollArea className="h-full">
                            <ul className="space-y-3 p-4">
                                {finishedPerformances.map((p, index) => (
                                    <motion.li 
                                        key={p.id} 
                                        layoutId={`leaderboard-judge-${p.id}`}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="flex items-center justify-between rounded-lg border bg-background p-3 shadow-sm"
                                    >
                                        <div className="flex items-center gap-4 overflow-hidden">
                                            <span className={`flex items-center justify-center text-lg font-bold w-8 h-8 rounded-full flex-shrink-0 ${
                                                p.rank === 1 ? 'bg-amber-400 text-white' : 
                                                p.rank === 2 ? 'bg-slate-400 text-white' : 
                                                p.rank === 3 ? 'bg-amber-700/80 text-white' : 
                                                'bg-muted'
                                            }`}>{p.rank}</span>
                                            <span className="font-medium truncate" title={p.performerName}>{p.performerName}</span>
                                        </div>
                                        <div className="text-right flex-shrink-0 ml-2">
                                            <p className="text-2xl font-bold text-primary">{p.totalScore}</p>
                                            <p className="text-xs text-muted-foreground">{p.voteCount} votes</p>
                                        </div>
                                    </motion.li>
                                ))}
                            </ul>
                        </ScrollArea>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-4">
                            <Trophy className="h-12 w-12 mb-4 text-primary/50" />
                            <p className="font-semibold">No results yet</p>
                            <p className="text-sm">Completed performances will appear here.</p>
                        </div>
                    )
                )}
            </CardContent>
        </Card>
    );
}
