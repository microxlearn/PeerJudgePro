'use client';

import { type Performance, type Participant } from '@/lib/types';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';

type ExportablePerformance = Omit<Performance, 'createdAt' | 'startedAt' | 'voters'> & {
  rank?: number | string;
};


// --- LEADERBOARD EXPORT ---

function getSortedPerformances(performances: Performance[]): ExportablePerformance[] {
    const sorted = performances
        .filter(p => p.status === 'finished' && p.voteCount > 0)
        .sort((a, b) => b.totalScore - a.totalScore);

    if (sorted.length === 0) return [];

    const finalRanked: ExportablePerformance[] = [];
    let rank = 1;
    for (let i = 0; i < sorted.length; i++) {
        // Use standard competition ranking (1, 2, 2, 4)
        if (i > 0 && sorted[i].totalScore < sorted[i - 1].totalScore) {
            rank = i + 1;
        }
        const { createdAt, startedAt, voters, ...rest } = sorted[i];
        finalRanked.push({
            ...rest,
            rank,
        });
    }
    return finalRanked;
}


export function exportLeaderboardToExcel(performances: Performance[], participants: (Participant & {id: string})[], roomId: string, roomTitle: string, hostName: string) {
    const sortedData = getSortedPerformances(performances);
    const totalJudges = participants.filter(p => p.role === 'judge').length;

    // Sheet 1: Info
    const infoAOA: (string | number)[][] = [
        ['PeerJudge Leaderboard'],
        [`Room: ${roomTitle || roomId}`],
        [`Host: ${hostName}`],
        [`Date: ${format(new Date(), 'yyyy-MM-dd HH:mm')}`],
    ];

    const judges = participants.filter(p => p.role === 'judge').sort((a, b) => a.registerNumber.localeCompare(b.registerNumber));
    const finishedPerformances = performances.filter(p => p.status === 'finished');
    const totalVotesPossible = finishedPerformances.length;

    if (judges.length > 0) {
        infoAOA.push([]); // Blank row
        infoAOA.push(['Joined Judges & Vote Count']);
        infoAOA.push(['Register No', 'Name', 'Votes Cast']);
        judges.forEach(judge => {
            const votesCast = finishedPerformances.reduce((count, p) => (p.voters?.[judge.id] !== undefined ? count + 1 : count), 0);
            infoAOA.push([judge.registerNumber, judge.name, `${votesCast} / ${totalVotesPossible}`]);
        });
    }

    const infoSheet = XLSX.utils.aoa_to_sheet(infoAOA);
    infoSheet['!cols'] = [ {wch: 20}, {wch: 30}, {wch: 20} ];


    // Sheet 2: Leaderboard Data
    const resultsAOA: (string | number)[][] = [
        ['Rank', 'Name', 'Total Score', 'Average Score', 'Votes']
    ];
    sortedData.forEach(p => {
        const averageScore = p.voteCount > 0 ? parseFloat((p.totalScore / p.voteCount).toFixed(2)) : 'N/A';
        resultsAOA.push([p.rank ?? 0, p.performerName, p.totalScore, averageScore, `${p.voteCount} / ${totalJudges}`]);
    });
    
    const resultsSheet = XLSX.utils.aoa_to_sheet(resultsAOA);
    
    // Auto-calculate column widths for results sheet
    const colWidths = resultsAOA[0].map((_, colIndex) => ({
        wch: resultsAOA.reduce((w, row) => Math.max(w, String(row[colIndex] || '').length), 0) + 2
    }));
    resultsSheet['!cols'] = colWidths;
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, infoSheet, 'Info');
    XLSX.utils.book_append_sheet(workbook, resultsSheet, 'Leaderboard');

    const filenameBase = `${roomTitle || roomId}_Leaderboard_${format(new Date(), 'dd_MM_yyyy')}`
        .replace(/[^a-z0-9_-\s]/gi, '')
        .replace(/\s+/g, '_');
    XLSX.writeFile(workbook, `${filenameBase}.xlsx`);
}

export async function exportLeaderboardToPdf(performances: Performance[], participants: (Participant & { id: string })[], roomId: string, roomTitle: string, hostName: string) {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    
    const sortedData = getSortedPerformances(performances);
    const totalJudges = participants.filter(p => p.role === 'judge').length;


    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Header
    doc.setFontSize(20);
    doc.setTextColor(59, 130, 246); // Blue color
    doc.text('PEER JUDGE by MicroX', 14, 22);

    doc.setTextColor(0);
    doc.setFontSize(12);
    doc.text(`Room: ${roomTitle || roomId}`, 14, 30);
    doc.text(`Host: ${hostName}`, 14, 36);
    doc.text(`Date: ${format(new Date(), 'yyyy-MM-dd HH:mm')}`, 14, 42);

    autoTable(doc, {
        startY: 50,
        head: [['Rank', 'Name', 'Total Score', 'Average Score', 'Votes']],
        body: sortedData.map(p => {
            const averageScore = p.voteCount > 0 ? (p.totalScore / p.voteCount).toFixed(2) : 'N/A';
            return [
                p.rank,
                p.performerName,
                p.totalScore,
                averageScore,
                `${p.voteCount} / ${totalJudges}`,
            ];
        }),
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246], fontStyle: 'bold' }, 
        didParseCell: (data) => {
            // Bold performer names in the body
            if (data.section === 'body' && data.column.index === 1) {
                data.cell.styles.fontStyle = 'bold';
            }
        },
    });

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(9);
        doc.setTextColor(150);
        doc.textWithLink(
            'https://peerjudge.microxlearn.online',
            14,
            pageHeight - 10,
            { url: 'https://peerjudge.microxlearn.online' }
        );
    }

    const filenameBase = `${roomTitle || roomId}_Leaderboard_${format(new Date(), 'dd_MM_yyyy')}`
        .replace(/[^a-z0-9_-\s]/gi, '')
        .replace(/\s+/g, '_');
    doc.save(`${filenameBase}.pdf`);
}


// --- VOTES MATRIX EXPORT ---

export function exportVotesToExcel(performances: (Performance & {id: string})[], participants: (Participant & {id: string})[], roomId: string, roomTitle: string, hostName: string) {
    const judges = participants.filter(p => p.role === 'judge').sort((a, b) => a.registerNumber.localeCompare(b.registerNumber));
    const finishedPerformances = performances
        .filter(p => p.status === 'finished')
        .sort((a, b) => {
            const timeA = (a.createdAt as Timestamp)?.toMillis() ?? 0;
            const timeB = (b.createdAt as Timestamp)?.toMillis() ?? 0;
            return timeA - timeB;
        });

    if (judges.length === 0) {
        throw new Error("No judges to export.");
    }
    
    // Sheet 1: Info
    const infoAOA: (string | number)[][] = [
        ['PeerJudge Vote Matrix'],
        [`Room: ${roomTitle || roomId}`],
        [`Host: ${hostName}`],
        [`Date: ${format(new Date(), 'yyyy-MM-dd HH:mm')}`],
    ];

    const totalVotesPossible = finishedPerformances.length;
    infoAOA.push([]); // Blank row
    infoAOA.push(['Joined Judges & Vote Count']);
    infoAOA.push(['Register No', 'Name', 'Votes Cast']);
    judges.forEach(judge => {
        const votesCast = finishedPerformances.reduce((count, p) => (p.voters?.[judge.id] !== undefined ? count + 1 : count), 0);
        infoAOA.push([judge.registerNumber, judge.name, `${votesCast} / ${totalVotesPossible}`]);
    });
    
    const infoSheet = XLSX.utils.aoa_to_sheet(infoAOA);
    infoSheet['!cols'] = [ {wch: 20}, {wch: 30}, {wch: 20} ];


    // Sheet 2: Vote Matrix Data
    const performerNames = finishedPerformances.map(p => p.performerName);
    const header = ['Judge Name', 'Register No', ...performerNames];

    const body = judges.map(judge => {
        const row: (string | number)[] = [judge.name, judge.registerNumber];
        finishedPerformances.forEach(performance => {
            const score = performance.voters?.[judge.id];
            row.push(score !== undefined ? score : '—');
        });
        return row;
    });
    const matrixAOA = [header, ...body];
    const worksheet = XLSX.utils.aoa_to_sheet(matrixAOA);
    
    const colWidths = matrixAOA[0].map((_, colIndex) => ({
      wch: matrixAOA.reduce((w, row) => Math.max(w, String(row[colIndex] || '').length), 0) + 2
    }));
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, infoSheet, 'Info');
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Vote Matrix');

    const filenameBase = `${roomTitle || roomId}_Votes_${format(new Date(), 'dd_MM_yyyy')}`
        .replace(/[^a-z0-9_-\s]/gi, '')
        .replace(/\s+/g, '_');
    XLSX.writeFile(workbook, `${filenameBase}.xlsx`);
}

export async function exportVotesToPdf(performances: (Performance & {id: string})[], participants: (Participant & {id: string})[], roomId: string, roomTitle: string, hostName: string) {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const judges = participants.filter(p => p.role === 'judge').sort((a, b) => a.registerNumber.localeCompare(b.registerNumber));
    
    const finishedPerformances = performances
        .filter(p => p.status === 'finished')
        .sort((a, b) => {
            const timeA = (a.createdAt as Timestamp)?.toMillis() ?? 0;
            const timeB = (b.createdAt as Timestamp)?.toMillis() ?? 0;
            return timeA - timeB;
        });

    if (judges.length === 0) {
        throw new Error("No judges to export.");
    }

    const doc = new jsPDF({ orientation: 'portrait' });
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();

    const drawPageHeader = (pageNumber: number) => {
      doc.setFontSize(20);
      doc.setTextColor(59, 130, 246); // Blue color
      doc.text('PEER JUDGE by MicroX - Vote Report', 14, 22);

      doc.setTextColor(0);
      doc.setFontSize(12);
      doc.text(`Room: ${roomTitle || roomId}`, 14, 30);
      doc.text(`Host: ${hostName}`, 14, 36);
      doc.text(`Date: ${format(new Date(), 'yyyy-MM-dd HH:mm')}`, 14, 42);
      
      doc.setFontSize(10);
      doc.setTextColor(150);
      doc.text(`Page ${pageNumber}`, pageWidth - 20, 22, { align: 'right' });

    };
    
    const didDrawPage = (data: any) => {
        drawPageHeader(data.pageNumber);
        // Footer
        doc.setFontSize(9);
        doc.setTextColor(150);
        doc.textWithLink(
            'https://peerjudge.microxlearn.online',
            14,
            pageHeight - 10,
            { url: 'https://peerjudge.microxlearn.online' }
        );
    };

    let currentY = 50;
    const bottomMargin = 20;

    judges.forEach((judge, judgeIndex) => {
        if (currentY + 30 > pageHeight - bottomMargin && judgeIndex > 0) {
            doc.addPage();
            currentY = 50;
        }

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(judge.name, 14, currentY);
        currentY += 8;

        const tableRows: (string | number)[][] = [];
        const chunkSize = 5;

        for (let i = 0; i < finishedPerformances.length; i += chunkSize) {
            const performanceChunk = finishedPerformances.slice(i, i + chunkSize);
            
            const performerNames = performanceChunk.map(p => p.performerName);
            const scores = performanceChunk.map(p => {
                const score = p.voters?.[judge.id];
                return score !== undefined ? score : '—';
            });
            
            tableRows.push(performerNames);
            tableRows.push(scores);
        }
        
        autoTable(doc, {
            startY: currentY,
            body: tableRows,
            theme: 'grid',
            didParseCell: (data) => {
                const isPerformerRow = data.row.index % 2 === 0;
                 if (isPerformerRow) { 
                    data.cell.styles.fillColor = [241, 245, 249];
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.textColor = [40, 40, 40];
                } else {
                    data.cell.styles.fontStyle = 'normal';
                    data.cell.styles.fontSize = 11;
                }
                data.cell.styles.halign = 'center';
            },
            didDrawPage,
        });
        
        currentY = (doc as any).lastAutoTable.finalY + 15;
    });

    const pageCount = (doc as any).internal.getNumberOfPages();
    if (pageCount === 0 || (currentY === 50 && judges.length === 0)) {
        didDrawPage({ pageNumber: 1 });
    }

    const filenameBase = `${roomTitle || roomId}_Votes_${format(new Date(), 'dd_MM_yyyy')}`
        .replace(/[^a-z0-9_-\s]/gi, '')
        .replace(/\s+/g, '_');
    doc.save(`${filenameBase}.pdf`);
}
