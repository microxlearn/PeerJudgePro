'use client';
import { useEffect, useTransition } from 'react';
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { joinRoomAction } from '@/app/actions';
import { studentRoster } from '@/lib/student-roster';
import { CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

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

export default function JoinForm() {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const form = useForm<JoinRoomFormValues>({
    resolver: zodResolver(joinRoomSchema),
    defaultValues: { roomCode: '', registerNumber: '', name: '' },
    mode: 'onChange',
  });

  const watchedRegisterNumber = form.watch('registerNumber');

  useEffect(() => {
    const upperCaseRegNo = watchedRegisterNumber.toUpperCase().trim();
    if (upperCaseRegNo) {
      if (studentRoster[upperCaseRegNo]) {
        form.setValue('name', studentRoster[upperCaseRegNo], { shouldValidate: true });
        form.clearErrors('registerNumber');
      } else {
        form.setValue('name', '', { shouldValidate: true });
        // Only set error if the input is of a reasonable length to avoid errors on first few chars
        if (upperCaseRegNo.length > 5) {
            form.setError('registerNumber', {
              type: 'manual',
              message: 'Register number not recognized',
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
      const result = await joinRoomAction(values);
      if (result?.error) {
        toast({
          title: 'Error joining room',
          description: result.error,
          variant: 'destructive',
        });
      } else if (result?.success) {
        toast({
          title: 'Joined successfully!',
          description: result.success,
        });
        form.reset();
        // In a real app, a redirect to the judge's view would happen here.
      }
    });
  };

  const registerNumberState = form.getFieldState('registerNumber');
  const isRegisterNumberValid = watchedRegisterNumber.length > 0 && !registerNumberState.error && !!studentRoster[watchedRegisterNumber.toUpperCase().trim()];
  const showRegisterNumberIcon = watchedRegisterNumber.length > 5;


  return (
    <Card className="w-full max-w-md shadow-lg">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Join Room</CardTitle>
            <CardDescription>
              Enter your details to participate. Your name will be auto-filled.
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
                            placeholder="e.g. MRAYBCA001" 
                            {...field} 
                            onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                            className={cn(
                                {"pr-10": showRegisterNumberIcon},
                                { "border-green-500 focus-visible:ring-green-500": isRegisterNumberValid },
                                { "border-destructive focus-visible:ring-destructive": registerNumberState.error }
                            )}
                        />
                         {showRegisterNumberIcon && (
                           <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                            {isRegisterNumberValid ? (
                               <CheckCircle className="h-5 w-5 text-green-500" />
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
                    <Input placeholder="Auto-filled from Register No." {...field} readOnly className="bg-muted/50 cursor-not-allowed" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <Button
                type="submit"
                disabled={isPending || !form.formState.isValid}
                className="w-full"
                size="lg"
              >
                {isPending ? 'Joining...' : 'Join Now'}
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
