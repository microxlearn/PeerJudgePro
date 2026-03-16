'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Download, Lock, Pause, RotateCcw, Bolt, ShieldAlert } from 'lucide-react';
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';

interface SessionControlsProps {
    isPaused: boolean;
    onPauseChange: (paused: boolean) => void;
    isLocked: boolean;
    onLockChange: (locked: boolean) => void;
}

export default function SessionControls({ isPaused, onPauseChange, isLocked, onLockChange }: SessionControlsProps) {
  return (
    <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="item-1">
            <Card className="mt-8 shadow-lg">
                <AccordionTrigger className="w-full p-6 hover:no-underline">
                     <CardHeader className="p-0 text-left">
                        <CardTitle>Host Power Tools</CardTitle>
                        <CardDescription>
                        Advanced tools for managing the session.
                        </CardDescription>
                    </CardHeader>
                </AccordionTrigger>
                <AccordionContent>
                    <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="outline" className="w-full">
                                    <RotateCcw className="mr-2" /> Reset Scores
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Reset all scores?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This will clear all submitted scores for the current performer. This action cannot be undone.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction className="bg-destructive hover:bg-destructive/90">Reset</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                        <div className="flex items-center justify-center space-x-2 rounded-md border p-3">
                        <Pause className="text-muted-foreground" />
                        <Label htmlFor="pause-judging">Pause Judging</Label>
                        <Switch id="pause-judging" checked={isPaused} onCheckedChange={onPauseChange} />
                        </div>
                        <div className="flex items-center justify-center space-x-2 rounded-md border p-3">
                        <Lock className="text-muted-foreground" />
                        <Label htmlFor="lock-room">Lock Room</Label>
                        <Switch id="lock-room" checked={isLocked} onCheckedChange={onLockChange} />
                        </div>
                        <Button variant="outline" className="w-full">
                            <Bolt className="mr-2" /> Force Resync
                        </Button>
                        <Button variant="outline" className="w-full">
                        <Download className="mr-2" /> Export Results
                        </Button>
                    </CardContent>
                </AccordionContent>
            </Card>
        </AccordionItem>
    </Accordion>
  );
}
