'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, Timestamp, doc, deleteDoc, updateDoc, serverTimestamp, deleteField, setDoc } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { type Room } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { format, addDays, formatDistanceToNowStrict } from 'date-fns';
import Link from 'next/link';
import { ArrowRight, Crown, Trash2, ArchiveRestore, History, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
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
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


function RoomsList() {
    const { firestore, auth } = useFirebase();
    const router = useRouter();
    const { toast } = useToast();
    const [isJoining, setIsJoining] = useState<string | null>(null);

    const roomsQuery = useMemoFirebase(
        () => (firestore ? query(collection(firestore, 'rooms'), orderBy('createdAt', 'desc')) : null),
        [firestore]
    );
    const { data: rooms, isLoading } = useCollection<Room>(roomsQuery);
    
    const { activeRooms, deletedRooms } = useMemo(() => {
        const active: Room[] = [];
        const deleted: Room[] = [];
        (rooms || []).forEach(room => {
            if (room.deletedAt) {
                deleted.push(room);
            } else {
                active.push(room);
            }
        });
        return { activeRooms: active, deletedRooms: deleted };
    }, [rooms]);

    const handleRoomClick = async (roomId: string) => {
        if (!firestore || !auth.currentUser) return;
        
        setIsJoining(roomId);
        const adminUid = auth.currentUser.uid;

        // Register the super admin as a 'host' participant so they have permissions
        const participantRef = doc(firestore, `rooms/${roomId}/participants`, adminUid);
        
        try {
            await setDoc(participantRef, {
                name: 'MICROX(admin)',
                registerNumber: 'ADMIN',
                role: 'host',
                status: 'online',
                joinedAt: serverTimestamp(),
                nameSource: 'verified',
            }, { merge: true });

            const superAdminInfo = {
                roomId: roomId,
                role: 'host' as const,
                name: 'MICROX(admin)',
                joinedAt: new Date().toISOString(),
            };
            localStorage.setItem('recentRoom', JSON.stringify(superAdminInfo));
            router.push(`/admin/${roomId}`);
        } catch (error: any) {
            console.error("Error joining room as super admin:", error);
            toast({
                title: 'Access Error',
                description: 'Could not register administrative session. Please try again.',
                variant: 'destructive',
            });
            setIsJoining(null);
        }
    };

    const handleSoftDelete = (e: React.MouseEvent, roomId: string) => {
        e.stopPropagation();
        if (!firestore) return;
        const roomDocRef = doc(firestore, 'rooms', roomId);
        updateDoc(roomDocRef, { deletedAt: serverTimestamp() }).then(() => {
            toast({
                title: 'Room Moved to Recycle Bin',
                description: `Room ${roomId} will be permanently deleted in 3 days.`,
            });
        }).catch(error => {
            console.error("Error soft deleting room:", error);
            toast({
                title: 'Error',
                description: 'Could not move the room to the recycle bin.',
                variant: 'destructive',
            });
        });
    };

    const handleRestoreRoom = (e: React.MouseEvent, roomId: string) => {
        e.stopPropagation();
        if (!firestore) return;
        const roomDocRef = doc(firestore, 'rooms', roomId);
        updateDoc(roomDocRef, { deletedAt: deleteField() }).then(() => {
            toast({
                title: 'Room Restored',
                description: `Room ${roomId} has been restored.`,
            });
        }).catch(error => {
            console.error("Error restoring room:", error);
            toast({
                title: 'Error',
                description: 'Could not restore the room.',
                variant: 'destructive',
            });
        });
    };

    const handlePermanentDelete = (e: React.MouseEvent, roomId: string) => {
        e.stopPropagation();
        if (!firestore) return;
        const roomDocRef = doc(firestore, 'rooms', roomId);
        deleteDoc(roomDocRef).then(() => {
            toast({
                title: 'Room Permanently Deleted',
                description: `Room ${roomId} has been deleted forever.`,
            });
        }).catch(error => {
            console.error("Error permanently deleting room:", error);
            toast({
                title: 'Error',
                description: 'Could not permanently delete the room.',
                variant: 'destructive',
            });
        });
    };

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-10 w-64" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(3)].map((_, i) => (
                        <Card key={i}>
                            <CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader>
                            <CardContent><Skeleton className="h-4 w-1/2" /></CardContent>
                            <CardFooter><Skeleton className="h-8 w-full" /></CardFooter>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <Tabs defaultValue="active" className="w-full">
            <TabsList className="mb-4">
                <TabsTrigger value="active">Active Rooms ({activeRooms.length})</TabsTrigger>
                <TabsTrigger value="deleted">Recycle Bin ({deletedRooms.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="active">
                {activeRooms.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {activeRooms.map((room) => (
                            <Card
                                key={room.id}
                                onClick={() => handleRoomClick(room.id)}
                                className={cn(
                                    "cursor-pointer hover:border-primary transition-colors flex flex-col relative",
                                    isJoining === room.id && "opacity-70 pointer-events-none"
                                )}
                            >
                                {isJoining === room.id && (
                                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/20 backdrop-blur-[1px] rounded-lg">
                                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                    </div>
                                )}
                                <CardHeader>
                                    <CardTitle className="flex items-center justify-between gap-2">
                                        <span className="truncate">{room.title || `Room ${room.id}`}</span>
                                        <Badge variant={room.status === 'live' ? 'default' : 'destructive'} className={cn(
                                            "capitalize flex-shrink-0",
                                            room.status === 'live' && "bg-green-500/10 text-green-700 border-green-500/20 hover:bg-green-500/20"
                                        )}>
                                            {room.status}
                                        </Badge>
                                    </CardTitle>
                                    <CardDescription>{room.id}</CardDescription>
                                </CardHeader>
                                <CardContent className="flex-grow">
                                    <p className="text-sm text-muted-foreground">
                                        Created on:{' '}
                                        {room.createdAt ? format((room.createdAt as Timestamp).toDate(), 'dd MMM yyyy, p') : 'N/A'}
                                    </p>
                                </CardContent>
                                <CardFooter className="flex items-center justify-between">
                                    <Button variant="link" className="p-0 h-auto text-primary">
                                        Go to Admin Panel <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={(e) => e.stopPropagation()}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Move to Recycle Bin?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This will move room <span className="font-bold">{room.title || room.id}</span> to the recycle bin. It will be permanently deleted after 3 days.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancel</AlertDialogCancel>
                                                <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={(e) => handleSoftDelete(e, room.id)}>Move to Bin</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                ) : <p className="text-center text-muted-foreground py-10">No active rooms found.</p>}
            </TabsContent>
            <TabsContent value="deleted">
                 {deletedRooms.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {deletedRooms.map((room) => {
                             const deletionDate = room.deletedAt ? addDays((room.deletedAt as Timestamp).toDate(), 3) : new Date();
                             const timeToDeletion = formatDistanceToNowStrict(deletionDate, { addSuffix: true });
                            return (
                               <Card key={room.id} className="border-dashed flex flex-col bg-muted/20">
                                    <CardHeader>
                                        <CardTitle className="truncate">{room.title || `Room ${room.id}`}</CardTitle>
                                        <CardDescription>{room.id}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex-grow space-y-2">
                                         <p className="text-sm text-muted-foreground">
                                            Deleted on: {room.deletedAt ? format((room.deletedAt as Timestamp).toDate(), 'dd MMM yyyy, p') : 'N/A'}
                                        </p>
                                        <p className="text-sm font-medium text-destructive">
                                            Permanent deletion {timeToDeletion}
                                        </p>
                                    </CardContent>
                                    <CardFooter className="flex items-center justify-end gap-2">
                                         <Button variant="ghost" size="sm" onClick={(e) => handleRestoreRoom(e, room.id)}>
                                             <ArchiveRestore className="mr-2 h-4 w-4"/> Restore
                                         </Button>
                                         <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="destructive" size="sm" onClick={(e) => e.stopPropagation()}>
                                                    <Trash2 className="mr-2 h-4 w-4"/> Delete Forever
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This action is permanent and cannot be undone. Room <span className="font-bold">{room.title || room.id}</span> will be gone forever.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={(e) => handlePermanentDelete(e, room.id)}>Delete Forever</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </CardFooter>
                                </Card>
                            )
                        })}
                    </div>
                ) : (
                    <div className="text-center text-muted-foreground py-10 border-2 border-dashed rounded-lg">
                        <History className="h-12 w-12 mx-auto mb-4 text-primary/50" />
                        <p className="font-semibold">The Recycle Bin is empty.</p>
                        <p className="text-sm">Deleted rooms will appear here for 3 days.</p>
                    </div>
                )}
            </TabsContent>
        </Tabs>
    );
}


export default function SuperAdminPage() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [id, setId] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const { auth } = useFirebase();
    const { toast } = useToast();

    useEffect(() => {
        if (auth && !auth.currentUser) {
            signInAnonymously(auth).catch((err) => {
                console.error("Anonymous sign-in failed:", err);
                toast({
                    title: 'Connection Failed',
                    description: 'Could not connect to services.',
                    variant: 'destructive',
                });
            });
        }
    }, [auth, toast]);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (id === 'admin' && password === 'Devadarshb@01') {
            setIsAuthenticated(true);
            setError('');
             toast({
                title: 'Login Successful',
                description: 'Welcome, MicroX(Admin).',
            });
        } else {
            setError('Invalid credentials. Please try again.');
        }
    };
    
    if (!isAuthenticated) {
        return (
            <div className="flex min-h-dvh items-center justify-center bg-muted/50 p-4">
                <Card className="w-full max-w-sm">
                    <CardHeader>
                        <CardTitle className="text-2xl">Admin Login</CardTitle>
                        <CardDescription>
                            Enter your credentials to access the admin dashboard.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="id">ID</Label>
                                <Input
                                    id="id"
                                    type="text"
                                    placeholder="admin"
                                    value={id}
                                    onChange={(e) => setId(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="absolute inset-y-0 right-0 h-full w-10 text-muted-foreground"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        <span className="sr-only">Toggle password visibility</span>
                                    </Button>
                                </div>
                            </div>
                            {error && <p className="text-sm font-medium text-destructive">{error}</p>}
                            <Button type="submit" className="w-full">
                                Login
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex min-h-dvh flex-col bg-muted/40">
             <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="flex items-center gap-4">
                     <Link href="/" className="flex flex-col">
                        <span className="text-lg font-bold uppercase tracking-wide text-primary leading-tight sm:text-xl">
                            PEER JUDGE
                        </span>
                        <span className="text-[10px] text-muted-foreground sm:text-[11px]">
                            by MicroX
                        </span>
                    </Link>
                </div>
                <div className="flex items-center gap-2">
                    <Crown className="h-5 w-5 text-amber-500" />
                    <span className="font-semibold">MicroX(Admin)</span>
                </div>
            </header>
            <main className="flex-1 p-4 md:p-6">
                <h1 className="text-2xl font-bold mb-4">Room Management</h1>
                <RoomsList />
            </main>
        </div>
    );
}