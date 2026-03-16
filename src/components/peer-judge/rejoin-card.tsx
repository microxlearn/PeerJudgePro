'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { type RecentRoom, type Room } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Loader2, DoorOpen, UserPlus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface RejoinCardProps {
  recentRoomData: RecentRoom;
  onClear: () => void;
}

export default function RejoinCard({ recentRoomData, onClear }: RejoinCardProps) {
  const [isRejoining, setIsRejoining] = useState(false);
  const [roomStatus, setRoomStatus] = useState<'loading' | 'live' | 'ended' | 'not-found'>('loading');
  const [roomTitle, setRoomTitle] = useState<string | null>(null);
  const { firestore } = useFirebase();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    setRoomStatus('loading');
    if (!firestore) return;

    const roomRef = doc(firestore, 'rooms', recentRoomData.roomId);
    getDoc(roomRef).then(roomSnap => {
        if (roomSnap.exists()) {
            const roomData = roomSnap.data() as Room;
            setRoomStatus(roomData.status);
            if (roomData.title) {
                setRoomTitle(roomData.title);
            }
        } else {
            setRoomStatus('not-found');
        }
    }).catch(() => {
        setRoomStatus('not-found');
    });

  }, [firestore, recentRoomData.roomId]);

  const handleRejoin = async () => {
    setIsRejoining(true);
    const isHost = recentRoomData.role === 'host';
    const path = isHost ? `/admin/${recentRoomData.roomId}` : `/room/${recentRoomData.roomId}`;

    if (roomStatus === 'live' || (roomStatus === 'ended' && isHost)) {
       router.push(path);
       return;
    }
    
    if (roomStatus === 'ended' && !isHost) {
         toast({
          title: 'Session has ended',
          description: 'This session is over. You can create a new room.',
        });
    } else if (roomStatus === 'not-found') {
        toast({
          title: 'Room not found',
          description: 'This room no longer exists.',
          variant: 'destructive',
        });
        onClear();
    } else {
        toast({
            title: 'Please wait',
            description: 'Still checking room status.',
        });
    }
    setIsRejoining(false);
  };
  
  const isEnded = roomStatus === 'ended';
  const isHost = recentRoomData.role === 'host';
  const isButtonDisabled = isRejoining || (isEnded && !isHost) || roomStatus === 'loading' || roomStatus === 'not-found';
  
  const getButtonText = () => {
      if (isRejoining) return 'Rejoining...';
      if (isEnded && isHost) return 'View Results';
      if (isEnded && !isHost) return 'Session Ended';
      return `Rejoin as ${recentRoomData.role}`;
  };

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader className="text-center">
        {roomStatus === 'loading' ? <Skeleton className="h-6 w-32 mx-auto mb-2" /> : roomTitle && <CardDescription className="text-lg font-semibold text-primary">{roomTitle}</CardDescription>}
        <CardTitle>Welcome Back, {recentRoomData.name}!</CardTitle>
        <CardDescription>You have a recent session.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed bg-muted/50 p-6 space-y-2">
          <p className="text-sm text-muted-foreground">Room Code</p>
          <p className="text-4xl font-bold font-mono tracking-widest text-primary">
            {recentRoomData.roomId}
          </p>
          <div className="flex items-center gap-4 pt-2">
            <div className='text-center'>
              <p className="text-xs text-muted-foreground">Your Role</p>
              <Badge variant="secondary" className="capitalize">{recentRoomData.role}</Badge>
            </div>
            <div className='text-center'>
              <p className="text-xs text-muted-foreground">Status</p>
              {roomStatus === 'loading' ? (
                <Skeleton className="h-6 w-16" />
              ) : (
                <Badge variant={isEnded ? 'destructive' : 'default'} className={cn(
                  "capitalize",
                  !isEnded && roomStatus === 'live' && "bg-green-500/10 text-green-700 border-green-500/20 hover:bg-green-500/20"
                )}>
                  {roomStatus === 'not-found' ? 'Not Found' : roomStatus}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <Button onClick={handleRejoin} disabled={isButtonDisabled} className="w-full" size="lg">
          {isRejoining ? ( <Loader2 className="mr-2 animate-spin" /> ) : ( <DoorOpen className="mr-2" /> )}
          {getButtonText()}
        </Button>
      </CardContent>
      <CardFooter className="flex justify-center">
        <Button variant="ghost" onClick={onClear}>
          <UserPlus className="mr-2" /> Join a Different Room
        </Button>
      </CardFooter>
    </Card>
  );
}
