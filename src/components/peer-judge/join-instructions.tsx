'use client';

import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Copy, Check, Share } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '../ui/skeleton';
import { useState } from 'react';
import QRCode from 'react-qr-code';

interface JoinInfoPanelProps {
  roomId: string;
  joinUrl: string;
  hostName?: string;
  roomTitle?: string;
}

export default function JoinInfoPanel({
  roomId,
  joinUrl,
  hostName,
  roomTitle,
}: JoinInfoPanelProps) {
  const { toast } = useToast();
  const [isUrlCopied, setIsUrlCopied] = useState(false);
  const [isCodeCopied, setIsCodeCopied] = useState(false);

  const handleCopy = (text: string, type: 'link' | 'code' | 'text') => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        if (type === 'link') {
          setIsUrlCopied(true);
          setTimeout(() => setIsUrlCopied(false), 2000);
        } else if (type === 'code') {
          setIsCodeCopied(true);
          setTimeout(() => setIsCodeCopied(false), 2000);
        }

        if (type === 'text') {
            toast({
              title: 'Invitation Copied',
              description: 'The invitation text has been copied to your clipboard.',
            });
        } else {
            toast({ title: `${type} copied!` });
        }
      })
      .catch((err) => {
        toast({ title: `Failed to copy ${type}`, variant: 'destructive' });
        console.error('Copy failed', err);
      });
  };

  const handleShare = async () => {
    const shareText = `Join the PeerJudge session!\n\nRoom Name: ${roomTitle || 'N/A'}\nHost: ${hostName || 'N/A'}\nRoom Code: ${roomId}\n\nJoin here: ${joinUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'PeerJudge Room Invitation',
          text: shareText,
          url: joinUrl,
        });
      } catch (err) {
        // This block is entered if the user cancels the share dialog or an error occurs.
        // We'll intentionally do nothing to avoid bothering a user who chose to cancel.
      }
    } else {
      // Fallback for browsers that don't support navigator.share
      handleCopy(shareText, 'text');
    }
  };

  if (!joinUrl) {
    return <Skeleton className="h-[400px] w-full" />;
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-center text-2xl">
          Invite Participants
        </DialogTitle>
        <DialogDescription className="text-center">
          Share the room code or link to join room{' '}
          <span className="font-bold text-primary">{roomId}</span>
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="bg-white p-4 rounded-lg border">
            <p className="text-center font-bold text-lg text-primary mb-2">
                PEER JUDGE by MicroX
            </p>
            <QRCode
                value={joinUrl}
                size={256}
                style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                viewBox={`0 0 256 256`}
            />
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button onClick={() => handleCopy(joinUrl, 'link')} size="lg">
            {isUrlCopied ? (
              <Check className="mr-2 text-green-500" />
            ) : (
              <Copy className="mr-2" />
            )}
            {isUrlCopied ? 'Link Copied' : 'Copy Join Link'}
          </Button>
          <Button
            onClick={() => handleCopy(roomId, 'code')}
            size="lg"
            variant="secondary"
          >
            {isCodeCopied ? (
              <Check className="mr-2 text-green-500" />
            ) : (
              <Copy className="mr-2" />
            )}
            {isCodeCopied ? 'Code Copied' : 'Copy Room Code'}
          </Button>
        </div>
        <Button onClick={handleShare} size="lg" className="w-full">
          <Share className="mr-2" />
          Share Invitation
        </Button>
      </div>
    </>
  );
}
