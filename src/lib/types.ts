'use client';
import { FieldValue, Timestamp } from "firebase/firestore";

export interface Participant {
  registerNumber: string;
  name: string;
  role: 'host' | 'judge';
  status: 'online' | 'offline';
  isLate?: boolean;
  id: string;
  nameSource?: 'verified' | 'manual';
}

export type PerformerStatus = 'waiting' | 'performing' | 'finished';

export interface Performance {
  id: string;
  performerName: string;
  voters?: Record<string, number>;
  totalScore: number;
  voteCount: number;
  status: PerformerStatus;
  createdAt?: FieldValue | Timestamp;
  startedAt?: FieldValue | Timestamp;
}

export interface Room {
  id: string;
  title: string;
  adminId: string;
  status: 'live' | 'ended';
  isLocked: boolean;
  activePerformerIds?: string[]; // Support multiple active performers
  createdAt: FieldValue | Timestamp;
  deletedAt?: FieldValue | Timestamp;
}

export interface RecentRoom {
  roomId: string;
  role: 'host' | 'judge';
  name: string;
  registerNumber?: string;
  joinedAt: string;
}

export interface IssueReport {
  id: string;
  judgeName: string;
  judgeId: string;
  issue: string;
  customMessage?: string;
  createdAt: FieldValue | Timestamp;
}
