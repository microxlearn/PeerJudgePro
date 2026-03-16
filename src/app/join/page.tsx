'use client';
import { Suspense, useEffect, useTransition, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { studentRoster } from '@/lib/student-roster';
import { CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFirebase } from '@/firebase';
import { signInAnonymously } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import RejoinCard from '@/components/peer-judge/rejoin-card';
import { type RecentRoom } from '@/lib/types';


const joinRoomSchema = z.object({
  roomCode: z
    .string()
    .trim()
    .length(6, { message: 'Room code must be 6 characters.' })
    .transform((val) => val.toUpperCase()),
  registerNumber: z
    .string()
    .trim()
    .min(1, { message: 'Register number cannot be empty.' })
    .transform((val) => val.toUpperCase()),
  name: z
    .string()
    .trim()
    .min(1, { message: 'Name is required and must be valid.' }),
});

type JoinRoomFormValues = z.infer<typeof joinRoomSchema>;


function JoinRoomForm() {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { auth, firestore, isUserLoading } = useFirebase();
  const searchParams = useSearchParams();
  const registerNumberRef = useRef<HTMLInputElement>(null);

  const form = useForm<JoinRoomFormValues>({
    resolver: zodResolver(joinRoomSchema),
    defaultValues: { roomCode: '', registerNumber: '', name: '' },
    mode: 'onChange',
  });
  
  // Pre-authenticate the user when the component mounts
  useEffect(() => {
    if (auth && !auth.currentUser) {
      signInAnonymously(auth).catch((error) => {
        console.error("Anonymous sign-in failed:", error);
        toast({
          title: 'Authentication Failed',
          description: 'Could not establish a session. Please check your network and refresh.',
          variant: 'destructive',
        });
      });
    }
  }, [auth, toast]);


  const watchedRegisterNumber = form.watch('registerNumber');
  
  // Effect to auto-fill room code from URL
  useEffect(() => {
    const roomCodeFromUrl = searchParams.get('room');
    if (roomCodeFromUrl) {
      const sanitizedCode = roomCodeFromUrl.trim().toUpperCase().slice(0, 6);
      form.setValue('roomCode', sanitizedCode, { shouldValidate: true });
      registerNumberRef.current?.focus();
    }
  }, [searchParams, form]);


  // Effect to auto-fill name from register number
  useEffect(() => {
    const upperCaseRegNo = watchedRegisterNumber.toUpperCase().trim();
    if (upperCaseRegNo) {
      if (upperCaseRegNo === 'ADMIN') {
        form.setValue('name', 'MICROX(admin)', { shouldValidate: true });
        form.clearErrors('registerNumber');
      } else if (studentRoster[upperCaseRegNo]) {
        form.setValue('name', studentRoster[upperCaseRegNo], { shouldValidate: true });
        form.clearErrors('registerNumber');
      } else {
        form.setValue('name', '', { shouldValidate: true });
         if (form.formState.isSubmitted || watchedRegisterNumber.length > 5) {
            form.setError('registerNumber', {
              type: 'manual',
              message: 'Not in roster. Please enter your name manually.',
            });
        }
      }
    } else {
        form.setValue('name', '', { shouldValidate: true });
        form.clearErrors('registerNumber');
    }
  }, [watchedRegisterNumber, form]);


  const onSubmit = (values: JoinRoomFormValues) => {
    startTransition(async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          toast({
            title: 'Connecting...',
            description: 'Still establishing a session. Please wait a moment and try again.',
            variant: 'default',
          });
          return;
        }

        const roomRef = doc(firestore, 'rooms', values.roomCode);
        const roomSnap = await getDoc(roomRef);
        if (!roomSnap.exists()) {
          throw new Error('Room not found. Please check the code.');
        }
        
        const userId = user.uid;
        
        const participantsRef = collection(firestore, `rooms/${values.roomCode}/participants`);
        const q = query(participantsRef, where("registerNumber", "==", values.registerNumber));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            const isRejoining = querySnapshot.docs.some(doc => doc.id === userId);
            if (!isRejoining) {
                throw new Error('This register number is already in the room.');
            }
        }

        const participantRef = doc(firestore, `rooms/${values.roomCode}/participants`, userId);
        const officialName = values.registerNumber === 'ADMIN' ? 'MICROX(admin)' : (studentRoster[values.registerNumber] || values.name);

        // Fire-and-forget write operation
        setDoc(participantRef, {
            name: officialName,
            registerNumber: values.registerNumber,
            role: 'judge',
            status: 'online', 
            joinedAt: serverTimestamp(),
            nameSource: (values.registerNumber === 'ADMIN' || !!studentRoster[values.registerNumber]) ? 'verified' : 'manual',
        }, { merge: true }).catch(error => {
            console.error("Error writing participant document:", error);
        });

        toast({
          title: 'Joined Successfully!',
          description: `Welcome, ${officialName}. Redirecting...`,
        });

        const recentRoom = {
          roomId: values.roomCode,
          role: 'judge' as const,
          name: officialName,
          registerNumber: values.registerNumber,
          joinedAt: new Date().toISOString(),
        };
        localStorage.setItem('recentRoom', JSON.stringify(recentRoom));

        // Redirect immediately
        router.push(`/room/${values.roomCode}`);

      } catch (error: any) {
         toast({
          title: 'Error Joining Room',
          description: error.message || 'An unexpected error occurred.',
          variant: 'destructive',
        });
      }
    });
  };

  const registerNumberState = form.getFieldState('registerNumber');
  const isNameManuallyEntered = !studentRoster[watchedRegisterNumber.toUpperCase().trim()] && watchedRegisterNumber.toUpperCase().trim() !== 'ADMIN';
  const isRegisterNumberRecognized = watchedRegisterNumber.length > 0 && !registerNumberState.error && (!!studentRoster[watchedRegisterNumber.toUpperCase().trim()] || watchedRegisterNumber.toUpperCase().trim() === 'ADMIN');
  const showRegisterNumberFeedback = watchedRegisterNumber.length > 5 || watchedRegisterNumber.toUpperCase().trim() === 'ADMIN';


  return (
    <Card className="w-full max-w-md shadow-lg">
      <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardHeader className="text-center">
              <CardTitle>Join Room</CardTitle>
              <CardDescription>
              Enter your details to participate.
              </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
              <FormField
              control={form.control}
              name="roomCode"
              render={({ field }) => (
                  <FormItem>
                  <FormLabel>Room Code</FormLabel>
                  <FormControl>
                      <Input
                      placeholder="ABCDEF"
                      {...field}
                      maxLength={6}
                      autoCapitalize="characters"
                      className="uppercase text-center text-lg tracking-widest font-mono"
                      autoFocus
                      />
                  </FormControl>
                  <FormMessage />
                  </FormItem>
              )}
              />
              <FormField
              control={form.control}
              name="registerNumber"
              render={({ field }) => (
                  <FormItem>
                  <FormLabel>Register Number</FormLabel>
                  <FormControl>
                      <div className="relative">
                          <Input 
                              ref={registerNumberRef}
                              placeholder="e.g. MRAYBCA001" 
                              {...field} 
                              onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                              className={cn(
                                  "pr-10",
                                  { "border-green-500 focus-visible:ring-green-500": isRegisterNumberRecognized },
                                  { "border-destructive focus-visible:ring-destructive": registerNumberState.error && registerNumberState.error.type !== 'manual' }
                              )}
                          />
                          {showRegisterNumberFeedback && (
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                              {isRegisterNumberRecognized ? (
                                  <CheckCircle className="h-5 w-5 text-green-500" />
                              ) : registerNumberState.error?.type === 'manual' ? (
                                  null
                              ) : registerNumberState.error ? (
                                  <XCircle className="h-5 w-5 text-destructive" />
                              ) : null }
                          </div>
                          )}
                      </div>
                  </FormControl>
                  <FormMessage />
                  </FormItem>
              )}
              />
              <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                  <FormItem>
                  <FormLabel>Your Name</FormLabel>
                  <FormControl>
                      <Input 
                          placeholder={isNameManuallyEntered ? "Enter your name" : "Auto-filled" } 
                          {...field} 
                          readOnly={!isNameManuallyEntered} 
                          className={cn({ "bg-muted/50 cursor-not-allowed": !isNameManuallyEntered })} 
                      />
                  </FormControl>
                    {registerNumberState.error?.type === 'manual' && (
                      <FormDescription>
                          Your register number is not in the official list. Please enter your name carefully.
                      </FormDescription>
                  )}
                  <FormMessage />
                  </FormItem>
              )}
              />
              <Button
                  type="submit"
                  disabled={isPending || !form.formState.isValid || isUserLoading}
                  className="w-full"
                  size="lg"
              >
                  {isUserLoading ? 'Connecting...' : isPending ? 'Joining...' : 'Join Now'}
              </Button>
          </CardContent>
          <CardFooter className="flex justify-center">
              <p className="text-center text-sm text-muted-foreground">
                  Are you the host?{' '}
                  <Link href="/create" className="font-semibold text-primary underline-offset-4 hover:underline">
                      Create a room
                  </Link>
              </p>
          </CardFooter>
          </form>
      </Form>
    </Card>
  );
}

const JoinPageSkeleton = () => (
    <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
            <CardTitle>Join Room</CardTitle>
            <CardDescription>Loading room details...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="space-y-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-10 w-full" /></div>
            <div className="space-y-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-10 w-full" /></div>
            <div className="space-y-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-10 w-full" /></div>
            <Skeleton className="h-12 w-full mt-4" />
        </CardContent>
        <CardFooter className="flex justify-center">
             <Skeleton className="h-4 w-48" />
        </CardFooter>
    </Card>
);

function JoinFlow() {
    const searchParams = useSearchParams();
    const [recentRoom, setRecentRoom] = useState<RecentRoom | null>(null);
    const [isChecking, setIsChecking] = useState(true);

    const hasRoomInQuery = searchParams.has('room');

    useEffect(() => {
        // If a `room` query parameter exists, we must show the join form.
        // We skip checking for a recent room to ensure shared links always work.
        if (hasRoomInQuery) {
            setRecentRoom(null);
            setIsChecking(false);
            return;
        }

        // If no query param, check for a recent room in localStorage.
        try {
            const item = localStorage.getItem('recentRoom');
            if (item) {
                const roomData = JSON.parse(item);
                const oneDay = 24 * 60 * 60 * 1000;
                if (new Date().getTime() - new Date(roomData.joinedAt).getTime() < oneDay) {
                    setRecentRoom(roomData);
                } else {
                    localStorage.removeItem('recentRoom'); // Expired
                }
            }
        } catch (error) {
            console.error("Failed to parse recent room from localStorage", error);
            localStorage.removeItem('recentRoom');
        }
        setIsChecking(false);
    }, [hasRoomInQuery]);

    const handleClearRecentRoom = () => {
        localStorage.removeItem('recentRoom');
        setRecentRoom(null);
    };

    if (isChecking) {
        return <JoinPageSkeleton />;
    }

    if (recentRoom) {
        return <RejoinCard recentRoomData={recentRoom} onClear={handleClearRecentRoom} />;
    }

    return <JoinRoomForm />;
}


export default function JoinPage() {
    return (
        <div className="flex flex-col min-h-dvh bg-muted/50">
            <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
                <div className="flex h-16 items-center">
                    <Link href="/" className="flex flex-col">
                        <span className="text-xl font-bold uppercase tracking-wide text-primary leading-tight sm:text-2xl">
                            PEER JUDGE
                        </span>
                        <span className="text-[11px] text-muted-foreground sm:text-xs">
                            by MicroX
                        </span>
                    </Link>
                </div>
            </header>
            <main className="flex-grow flex items-center justify-center p-4">
                <Suspense fallback={<JoinPageSkeleton />}>
                    <JoinFlow />
                </Suspense>
            </main>
        </div>
    );
}
