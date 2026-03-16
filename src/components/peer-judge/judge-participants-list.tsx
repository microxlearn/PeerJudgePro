'use client';

import { ScrollArea } from '@/components/ui/scroll-area';
import { type Participant, type IssueReport } from '@/lib/types';
import { CheckCircle, XCircle, Users, Crown, BadgeCheck, AlertTriangle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface JudgeParticipantsListProps {
  participants: (Participant & { id: string })[] | null;
  isLoading: boolean;
  reports?: IssueReport[];
}

export default function JudgeParticipantsList({ participants, isLoading, reports = [] }: JudgeParticipantsListProps) {
    const host = participants?.find((p) => p.role === 'host');
    // Sort judges by register number
    const judges = participants?.filter((p) => p.role === 'judge').sort((a, b) => a.registerNumber.localeCompare(b.registerNumber)) ?? [];

    const judgeHasReport = (judgeId: string) => {
      return reports.some(report => report.judgeId === judgeId);
    };

    const renderSkeleton = () => (
        <div className="space-y-1 p-4">
            {[...Array(8)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 rounded-md p-2">
                    <Skeleton className="h-5 w-5 rounded-full" />
                    <Skeleton className="h-4 w-40" />
                </div>
            ))}
        </div>
    );

    const renderParticipant = (participant: Participant & { id: string }, isHost: boolean = false) => (
         <div
            key={participant.id}
            className={cn("flex items-center justify-between rounded-md p-3", isHost ? "" : "hover:bg-accent")}
        >
            <div className="flex items-center gap-3 overflow-hidden">
                {participant.status === 'online' ? (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                            </TooltipTrigger>
                            <TooltipContent>Online</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                ) : (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                            </TooltipTrigger>
                            <TooltipContent>Offline</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}
                <div className="flex flex-col min-w-0">
                    <span className="font-medium truncate" title={participant.name}>{participant.name}</span>
                </div>
                {participant.name === 'MICROX(admin)' && !isHost && <BadgeCheck className="h-4 w-4 text-blue-500 flex-shrink-0" />}
                {judgeHasReport(participant.id) && (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
                            </TooltipTrigger>
                            <TooltipContent>Issue reported</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}
            </div>
        </div>
    );

    return (
        <ScrollArea className="h-full">
            {isLoading ? renderSkeleton() : (
                 <div className="p-4 space-y-4">
                    {host && (
                        <div>
                            <h3 className="mb-2 text-sm font-semibold text-muted-foreground flex items-center gap-2"><Crown className="h-4 w-4 text-amber-500" /> Host</h3>
                            <div className="rounded-md bg-muted">
                                {renderParticipant(host, true)}
                            </div>
                        </div>
                    )}

                    <div>
                         <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Judges ({judges.length})</h3>
                         {judges.length === 0 ? (
                             <div className="text-center py-10 text-sm text-muted-foreground border-2 border-dashed rounded-lg">
                                 <Users className="h-12 w-12 mx-auto mb-4 text-primary/50" />
                                 <p>No other judges have joined yet.</p>
                             </div>
                         ) : (
                             <div className="space-y-1">
                                 {judges.map(judge => renderParticipant(judge))}
                             </div>
                         )}
                    </div>
                </div>
            )}
        </ScrollArea>
    );
}