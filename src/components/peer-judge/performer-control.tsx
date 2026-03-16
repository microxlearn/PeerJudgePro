'use client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, StopCircle, UserCheck, Loader2, Plus, X, Trash2 } from 'lucide-react';
import { type Performance, type PerformerStatus } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Separator } from '../ui/separator';
import { useEffect, useState } from 'react';
import { Input } from '../ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Timestamp } from 'firebase/firestore';
import { studentRoster } from '@/lib/student-roster';
import { cn } from '@/lib/utils';

const addPerformerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Input is too long.").transform(val => val.toUpperCase()),
});
type AddPerformerFormValues = z.infer<typeof addPerformerSchema>;

interface PerformerControlProps {
    onSetPerformanceStatus: (status: PerformerStatus) => void;
    onSetActivePerformers: (names: string[]) => void;
    activePerformances: Performance[];
    totalJudges: number;
    disabled?: boolean;
}

export default function PerformerControl({ 
    onSetPerformanceStatus,
    onSetActivePerformers,
    activePerformances, 
    totalJudges,
    disabled = false,
}: PerformerControlProps) {
  const [isToggling, setIsToggling] = useState(false);
  const [timer, setTimer] = useState(300);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [stagedNames, setStagedNames] = useState<string[]>([]);
  
  const form = useForm<AddPerformerFormValues>({
    resolver: zodResolver(addPerformerSchema),
    defaultValues: { name: '' },
  });

  const performerNameInput = form.watch('name');

  // Handle suggestions based on typing
  useEffect(() => {
    if (performerNameInput) {
        const lowercasedInput = performerNameInput.toLowerCase();
        const filteredSuggestions = Object.entries(studentRoster)
            .filter(([regNo, name]) =>
                (name.toLowerCase().includes(lowercasedInput) || regNo.toLowerCase().includes(lowercasedInput))
                && name.toLowerCase() !== lowercasedInput
            )
            .map(([, name]) => name.toUpperCase())
            .slice(0, 5);
        setSuggestions(filteredSuggestions);
    } else {
        setSuggestions([]);
    }
  }, [performerNameInput]);

  const handleSuggestionClick = (name: string) => {
    form.setValue('name', name, { shouldValidate: true });
    setSuggestions([]);
  };

  const addNameToList = (data: AddPerformerFormValues) => {
    if (!stagedNames.includes(data.name)) {
      setStagedNames(prev => [...prev, data.name]);
    }
    form.reset({ name: '' });
    setSuggestions([]);
  };

  const removeStagedName = (name: string) => {
    setStagedNames(prev => prev.filter(n => n !== name));
  };

  const handleSetBatch = () => {
    if (stagedNames.length > 0) {
      onSetActivePerformers(stagedNames);
      setStagedNames([]);
    }
  };

  useEffect(() => {
    if (activePerformances.length > 0) {
        const p = activePerformances[0];
        if (p.status === 'performing' && p.startedAt) {
            const intervalId = setInterval(() => {
                const startTime = (p.startedAt as Timestamp).toMillis();
                const now = Date.now();
                const elapsed = now - startTime;
                const timeLeft = Math.max(0, 300 - Math.floor(elapsed / 1000));
                setTimer(timeLeft);
                if (timeLeft === 0) clearInterval(intervalId);
            }, 1000);

            const startTime = (p.startedAt as Timestamp).toMillis();
            const now = Date.now();
            const elapsed = now - startTime;
            const timeLeft = Math.max(0, 300 - Math.floor(elapsed / 1000));
            setTimer(timeLeft);

            return () => clearInterval(intervalId);
        }
    }
    setTimer(300);
  }, [activePerformances]);

  const handleTogglePerformance = () => {
    if (activePerformances.length === 0 || isToggling) return;
    const currentStatus = activePerformances[0].status;
    const newStatus = currentStatus === 'waiting' ? 'performing' : 'finished';
    
    setIsToggling(true);
    onSetPerformanceStatus(newStatus);
    setTimeout(() => setIsToggling(false), 800);
  };

  const getStatusBadge = () => {
    if (disabled) return <Badge variant="destructive">Ended</Badge>;
    if (activePerformances.length === 0) return <Badge variant="secondary">Idle</Badge>;
    const status = activePerformances[0].status;
    switch (status) {
      case 'performing':
        return <Badge className="bg-green-500 hover:bg-green-500/90 text-primary-foreground border-green-600">Performing</Badge>;
      case 'finished':
        return <Badge variant="destructive">Finished</Badge>;
      case 'waiting':
      default:
        return <Badge variant="secondary">Waiting</Badge>;
    }
  };
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  }

  const status = activePerformances.length > 0 ? activePerformances[0].status : null;
  
  let performanceButton;
  if (activePerformances.length === 0 || disabled) {
    performanceButton = (
        <Button size="lg" disabled className="w-full">
            <UserCheck className="mr-2 h-4 w-4" />
            {disabled ? 'Session Ended' : 'Set a batch to start'}
        </Button>
    );
  } else if (status === 'waiting') {
      performanceButton = (
          <Button size="lg" onClick={handleTogglePerformance} disabled={isToggling || disabled} className="w-full">
              {isToggling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
              {isToggling ? 'Starting...' : `Start for ${activePerformances.length} Performer(s)`}
          </Button>
      );
  } else if (status === 'performing') {
      performanceButton = (
          <Button size="lg" variant="destructive" onClick={handleTogglePerformance} disabled={isToggling || disabled} className="w-full">
              {isToggling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <StopCircle className="mr-2 h-4 w-4" />}
              {isToggling ? 'Ending...' : 'End Performance'}
          </Button>
      );
  } else {
      performanceButton = (
          <Button size="lg" disabled className="w-full">
              <UserCheck className="mr-2 h-4 w-4" />
              Prepare next batch
          </Button>
      );
  }

  return (
    <Card className="shadow-lg w-full border-primary/20 h-full flex flex-col">
      <CardHeader>
        <CardTitle className='flex justify-between items-center'>
            Batch Management
            {getStatusBadge()}
        </CardTitle>
        <CardDescription>
          Build a batch of performers and control the session.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 flex-grow flex flex-col">
        <div className="space-y-2">
          <Form {...form}>
              <form onSubmit={form.handleSubmit(addNameToList)} className="flex items-start gap-2">
                  <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                          <FormItem className="flex-grow relative">
                              <FormLabel className="sr-only">Performer Name</FormLabel>
                              <FormControl>
                                  <Input
                                    placeholder="Enter Name or Reg No"
                                    {...field}
                                    onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                    disabled={disabled}
                                    autoComplete="off"
                                  />
                              </FormControl>
                              {suggestions.length > 0 && (
                                <Card className="absolute z-10 w-full mt-1 bg-card border-border rounded-md shadow-lg">
                                  <CardContent className="p-0">
                                      <ul className="py-1">
                                          {suggestions.map((name) => (
                                              <li 
                                                  key={name} 
                                                  className="px-3 py-2 cursor-pointer hover:bg-accent rounded-sm text-sm"
                                                  onMouseDown={() => handleSuggestionClick(name)}
                                              >
                                                  {name}
                                              </li>
                                          ))}
                                      </ul>
                                  </CardContent>
                                </Card>
                              )}
                              <FormMessage />
                          </FormItem>
                      )}
                  />
                  <Button type="submit" disabled={disabled} variant="secondary">
                    <Plus className="h-4 w-4" />
                  </Button>
              </form>
          </Form>
        </div>

        {stagedNames.length > 0 && (
            <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Staging List ({stagedNames.length})</p>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1">
                    {stagedNames.map(name => (
                        <Badge key={name} variant="secondary" className="pl-3 pr-1 py-1 gap-1 flex items-center bg-primary/5 border-primary/20">
                            <span className="truncate max-w-[120px]">{name}</span>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-4 w-4 hover:bg-destructive hover:text-white rounded-full p-0"
                                onClick={() => removeStagedName(name)}
                            >
                                <X className="h-3 w-3" />
                            </Button>
                        </Badge>
                    ))}
                </div>
                <Button onClick={handleSetBatch} className="w-full mt-2" size="sm" variant="default">
                    Set {stagedNames.length} Performers Active
                </Button>
            </div>
        )}

        <Separator />

        <div className="flex flex-col gap-2 rounded-lg border-2 border-dashed bg-muted/50 p-4 min-h-[140px] justify-center overflow-y-auto">
          <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Live Batch</p>
          {activePerformances.length > 0 ? (
            <div className="grid grid-cols-1 gap-2">
              {activePerformances.map((p) => (
                <div key={p.id} className="flex items-center justify-between bg-background p-3 rounded-md border shadow-sm border-primary/10">
                  <div className="overflow-hidden">
                    <p className="font-bold text-sm text-primary truncate">{p.performerName}</p>
                    <p className="text-[10px] text-muted-foreground">{p.voteCount} / {totalJudges} Judges Voted</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-primary">{p.totalScore}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <UserCheck className="h-8 w-8 text-primary/30 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">
                  No active performers. Add to staging above.
              </p>
            </div>
          )}
        </div>
        
        <div className='grid grid-cols-2 gap-4 text-center pt-2'>
             <div className="bg-muted/30 p-2 rounded-md border">
                <p className='text-[10px] text-muted-foreground uppercase font-bold'>Timer</p>
                <p className='text-xl font-bold font-mono text-primary'>{formatTime(timer)}</p>
            </div>
             <div className="bg-muted/30 p-2 rounded-md border">
                <p className='text-[10px] text-muted-foreground uppercase font-bold'>Live Count</p>
                <p className='text-xl font-bold text-primary'>{activePerformances.length}</p>
            </div>
        </div>

        <div className="grid grid-cols-1 gap-2 pt-2 mt-auto">
            {performanceButton}
        </div>
      </CardContent>
    </Card>
  );
}
