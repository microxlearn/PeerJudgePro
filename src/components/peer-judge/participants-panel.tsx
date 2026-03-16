'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { type Participant, type IssueReport } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { MoreVertical, UserX, Crown, CheckCircle, XCircle, BadgeCheck, AlertTriangle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '../ui/button';
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Skeleton } from '../ui/skeleton';

interface ParticipantsPanelProps {
  participants: Participant[];
  onKick: (participantId: string) => void;
  isLoading: boolean;
  isSheet?: boolean;
  reports?: IssueReport[];
}

export default function ParticipantsPanel({
  participants,
  onKick,
  isLoading,
  isSheet = false,
  reports = [],
}: ParticipantsPanelProps) {
  const onlineCount = participants.filter((p) => p.status === 'online').length;
  
  // Sort participants alphabetically by name, keeping host at the top
  const sortedParticipants = [...participants]
    .sort((a, b) => {
      if (a.role === 'host') return -1;
      if (b.role === 'host') return 1;
      return a.name.localeCompare(b.name);
    });

  const host = participants.find((p) => p.role === 'host');

  const judgeHasReport = (judgeId: string) => {
    return reports.some(report => report.judgeId === judgeId);
  };

  const renderSkeleton = () => (
    <div className="space-y-1 p-2">
        {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center justify-between rounded-md p-2">
                <div className="flex items-center gap-3">
                    <Skeleton className="h-5 w-5 rounded-full" />
                    <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-6 w-16" />
            </div>
        ))}
    </div>
  );

  const cardClasses = isSheet ? "border-0 shadow-none" : "shadow-lg";

  return (
    <Card className={`${cardClasses} h-full flex flex-col`}>
      <CardHeader className="hidden lg:flex">
        <CardTitle className="flex items-center justify-between">
          <span>Participants</span>
          <span className="text-lg font-semibold text-primary">
            {onlineCount}/{participants.length}
          </span>
        </CardTitle>
        <CardDescription>Manage who is in the room.</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow p-0 overflow-hidden">
        <ScrollArea className="h-full">
         {isLoading ? renderSkeleton() : (
            <div className="space-y-1 p-2">
            {sortedParticipants.length === 0 && (
                <div className="text-center py-10 text-sm text-muted-foreground">
                    <p>No participants found.</p>
                </div>
            )}
            {sortedParticipants.map((participant) => (
              <div
                key={participant.id}
                className="flex items-center justify-between rounded-md p-2 hover:bg-accent"
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
                    <span className="font-medium truncate text-sm" title={participant.name}>{participant.name}</span>
                  </div>
                  {participant.name === 'MICROX(admin)' && <BadgeCheck className="h-4 w-4 text-blue-500 flex-shrink-0" />}
                  {judgeHasReport(participant.id) && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                           <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Technical issue reported</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge
                    variant={
                      participant.role === 'host' ? 'default' : 'secondary'
                    }
                    className="border text-[10px] h-5 px-1.5"
                  >
                    {participant.role === 'host' ? (
                      <Crown className="mr-1 h-3 w-3" />
                    ) : null}
                    {participant.role}
                  </Badge>
                  {participant.role !== 'host' && host && (
                     <AlertDialog>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onSelect={(e) => e.preventDefault()}
                            >
                              <UserX className="mr-2 h-4 w-4" />
                              Kick Participant
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <AlertDialogContent>
                          <AlertDialogHeader>
                              <AlertDialogTitle>Kick {participant.name}?</AlertDialogTitle>
                              <AlertDialogDescription>
                                  Are you sure you want to remove this participant from the room? They will need to rejoin with the room code.
                              </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => onKick(participant.id)} className="bg-destructive hover:bg-destructive/90">Kick</AlertDialogAction>
                          </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
            ))}
          </div>
         )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
