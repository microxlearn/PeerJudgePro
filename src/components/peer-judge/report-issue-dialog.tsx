
'use client';

import { useState } from 'react';
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { useFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const ISSUES = [
  "MARK SLIDE BAR NOT WORKING",
  "SUBMITING BUTTON NOT WORKING",
  "MARK NOT SUBMITTING....",
  "AUTO LOGOUTING",
  "PERFORMER NAME NOT SHOWING",
  "OTHER"
];

interface ReportIssueDialogProps {
  roomId: string;
  judgeName: string;
  judgeId: string;
  onSuccess: () => void;
}

export default function ReportIssueDialog({
  roomId,
  judgeName,
  judgeId,
  onSuccess,
}: ReportIssueDialogProps) {
  const [selectedIssue, setSelectedIssue] = useState<string>(ISSUES[0]);
  const [customMessage, setCustomMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!firestore) return;
    setIsSubmitting(true);

    try {
      const reportsRef = collection(firestore, 'rooms', roomId, 'reports');
      await addDoc(reportsRef, {
        judgeName,
        judgeId,
        issue: selectedIssue,
        customMessage: selectedIssue === 'OTHER' ? customMessage : null,
        createdAt: serverTimestamp(),
      });

      toast({
        title: 'Report Submitted',
        description: 'Thank you. The host has been notified.',
      });
      onSuccess();
    } catch (error: any) {
      console.error("Error submitting report:", error);
      toast({
        title: 'Submission Failed',
        description: 'Could not send the report. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Report an Issue</DialogTitle>
        <DialogDescription>
          Is something not working correctly? Let the host know.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-6 py-4">
        <RadioGroup value={selectedIssue} onValueChange={setSelectedIssue}>
          {ISSUES.map((issue) => (
            <div key={issue} className="flex items-center space-x-3">
              <RadioGroupItem value={issue} id={issue} />
              <Label htmlFor={issue} className="cursor-pointer">{issue}</Label>
            </div>
          ))}
        </RadioGroup>

        {selectedIssue === 'OTHER' && (
          <div className="space-y-2">
            <Label htmlFor="custom-message">Description</Label>
            <Textarea
              id="custom-message"
              placeholder="Describe the problem..."
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
        )}
      </div>
      <DialogFooter>
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || (selectedIssue === 'OTHER' && !customMessage.trim())}
          className="w-full sm:w-auto"
        >
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Send Report
        </Button>
      </DialogFooter>
    </>
  );
}
