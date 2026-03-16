'use client';

import { useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase';
import { signInAnonymously } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

const formSchema = z.object({
  adminName: z
    .string()
    .trim()
    .min(2, { message: 'Name must be at least 2 characters.' })
    .transform((val) => val.toUpperCase()),
  roomTitle: z
    .string()
    .trim()
    .optional()
    .transform((val) => (val ? val.toUpperCase() : val)),
});

type CreateRoomFormValues = z.infer<typeof formSchema>;

export default function CreateRoomPage() {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();
  const { auth, firestore, isUserLoading } = useFirebase();

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

  const form = useForm<CreateRoomFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      adminName: '',
      roomTitle: '',
    },
    mode: 'onChange'
  });

  const onSubmit = (values: CreateRoomFormValues) => {
    startTransition(() => {
      const user = auth.currentUser;
      if (!user) {
        toast({
          title: 'Connecting...',
          description: 'Still establishing a session. Please wait a moment and try again.',
          variant: 'default',
        });
        if (auth) signInAnonymously(auth); // Attempt to sign in again if missing
        return;
      }

      const adminId = user.uid;
      const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();

      // --- Non-blocking writes ---
      const roomRef = doc(firestore, 'rooms', roomCode);
      setDoc(roomRef, {
        adminId: adminId,
        title: values.roomTitle || '',
        createdAt: serverTimestamp(),
        status: 'live',
        isLocked: false,
      }).catch(error => {
        console.error("Error creating room document:", error);
        toast({
          title: 'Error',
          description: 'Could not create the room document. Please try again.',
          variant: 'destructive',
        });
      });

      const participantRef = doc(firestore, `rooms/${roomCode}/participants`, adminId);
      setDoc(participantRef, {
          name: values.adminName,
          registerNumber: 'HOST',
          role: 'host',
          status: 'online',
          joinedAt: serverTimestamp(),
      }).catch(error => {
        console.error("Error creating participant document:", error);
      });
      
      // These actions happen immediately.
      toast({
        title: 'Room Created!',
        description: `Your room code is ${roomCode}. Redirecting...`,
      });

      const recentRoom = {
        roomId: roomCode,
        role: 'host' as const,
        name: values.adminName,
        joinedAt: new Date().toISOString(),
      };
      localStorage.setItem('recentRoom', JSON.stringify(recentRoom));

      // Redirect immediately!
      router.push(`/admin/${roomCode}`);
    });
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-muted/50 p-4">
      <div className="absolute left-4 top-4 md:left-8 md:top-8">
        <Button asChild variant="ghost">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
          </Link>
        </Button>
      </div>
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Create a New Room</CardTitle>
          <CardDescription>
            Enter your name to get started. A unique room code will be generated
            for you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="adminName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Name (Admin)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Professor Smith"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="roomTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Room Title (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Mid-term Presentations"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isPending || !form.formState.isValid || isUserLoading} className="w-full">
                {isUserLoading ? 'Connecting...' : isPending ? 'Creating Room...' : 'Create Room'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
