import { Injectable, Logger } from '@nestjs/common';
import PDFDocument from 'pdfkit';

export interface ContractPdfData {
  contract_id: string;
  contract_type: string;
  status: string;
  initiator_name: string;
  counterparty_name: string;
  total_amount_tnd: number;
  commission_amount_tnd: number;
  net_amount_tnd: number;
  terms_snapshot: Record<string, any>;
  created_at: Date;
  accepted_at: Date | null;
}

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  async generateContractPdf(data: ContractPdfData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // ─── Header ──────────────────────────────────────────────────────────
        doc
          .rect(0, 0, 595, 120)
          .fill('#0f3460');

        doc
          .fillColor('#22c55e')
          .fontSize(28)
          .font('Helvetica-Bold')
          .text('ZirIA', 50, 35);

        doc
          .fillColor('#ffffff')
          .fontSize(11)
          .font('Helvetica')
          .text('Plateforme AgriTech Tunisienne', 50, 68)
          .text('contact@ziria.tn  •  www.ziria.tn', 50, 83);

        doc
          .fillColor('#ffffff')
          .fontSize(14)
          .font('Helvetica-Bold')
          .text('CONTRAT DE MISSION', 350, 50, { width: 200, align: 'right' })
          .fontSize(10)
          .font('Helvetica')
          .text(`Réf: ${data.contract_id.slice(0, 8).toUpperCase()}`, 350, 74, { width: 200, align: 'right' })
          .text(`Type: ${data.contract_type}`, 350, 88, { width: 200, align: 'right' });

        doc.moveDown(4);

        // ─── Status badge ─────────────────────────────────────────────────────
        const statusColors: Record<string, string> = {
          ACTIVE: '#22c55e',
          COMPLETED: '#3b82f6',
          PENDING_ACCEPTANCE: '#f59e0b',
          DISPUTED: '#ef4444',
          RESOLVED: '#8b5cf6',
          CANCELLED: '#6b7280',
        };
        const statusColor = statusColors[data.status] ?? '#6b7280';
        doc
          .fillColor(statusColor)
          .roundedRect(50, 130, 120, 24, 4)
          .fill();
        doc
          .fillColor('#ffffff')
          .fontSize(9)
          .font('Helvetica-Bold')
          .text(data.status.replace(/_/g, ' '), 56, 137);

        doc.moveDown(2);

        // ─── Parties ─────────────────────────────────────────────────────────
        doc
          .fillColor('#1e293b')
          .fontSize(12)
          .font('Helvetica-Bold')
          .text('PARTIES CONTRACTANTES', 50, 170);
        doc.moveTo(50, 186).lineTo(545, 186).strokeColor('#e2e8f0').stroke();

        doc.moveDown(0.5);

        const partyY = 195;
        // Left box
        doc.roundedRect(50, partyY, 230, 70, 6).fillAndStroke('#f8fafc', '#e2e8f0');
        doc.fillColor('#64748b').fontSize(8).font('Helvetica-Bold').text('DONNEUR D\'ORDRE', 60, partyY + 10);
        doc.fillColor('#1e293b').fontSize(11).font('Helvetica-Bold').text(data.initiator_name, 60, partyY + 26);
        doc.fillColor('#64748b').fontSize(8).font('Helvetica').text('Partie A', 60, partyY + 46);

        // Right box
        doc.roundedRect(305, partyY, 240, 70, 6).fillAndStroke('#f8fafc', '#e2e8f0');
        doc.fillColor('#64748b').fontSize(8).font('Helvetica-Bold').text('PRESTATAIRE', 315, partyY + 10);
        doc.fillColor('#1e293b').fontSize(11).font('Helvetica-Bold').text(data.counterparty_name, 315, partyY + 26);
        doc.fillColor('#64748b').fontSize(8).font('Helvetica').text('Partie B', 315, partyY + 46);

        doc.moveDown(5.5);

        // ─── Financial breakdown ──────────────────────────────────────────────
        doc
          .fillColor('#1e293b')
          .fontSize(12)
          .font('Helvetica-Bold')
          .text('DÉCOMPOSITION FINANCIÈRE', 50, 285);
        doc.moveTo(50, 301).lineTo(545, 301).strokeColor('#e2e8f0').stroke();

        const rows: [string, string][] = [
          ['Montant brut de la mission', `${Number(data.total_amount_tnd).toFixed(3)} TND`],
          ['Commission plateforme ZirIA', `- ${Number(data.commission_amount_tnd).toFixed(3)} TND`],
          ['Montant net (prestataire)', `${Number(data.net_amount_tnd).toFixed(3)} TND`],
        ];

        let rowY = 312;
        rows.forEach(([label, value], i) => {
          const isLast = i === rows.length - 1;
          if (isLast) {
            doc.roundedRect(50, rowY - 4, 495, 26, 4).fill('#f0fdf4');
            doc.fillColor('#15803d').font('Helvetica-Bold');
          } else {
            doc.fillColor('#374151').font('Helvetica');
          }
          doc.fontSize(10).text(label, 60, rowY);
          doc.text(value, 400, rowY, { width: 140, align: 'right' });
          rowY += 30;
        });

        doc.moveDown(2);

        // ─── Terms Snapshot ───────────────────────────────────────────────────
        doc
          .fillColor('#1e293b')
          .fontSize(12)
          .font('Helvetica-Bold')
          .text('TERMES & CONDITIONS', 50, rowY + 10);
        doc.moveTo(50, rowY + 26).lineTo(545, rowY + 26).strokeColor('#e2e8f0').stroke();

        let termsY = rowY + 38;
        const termLines = this.flattenTerms(data.terms_snapshot);
        for (const line of termLines.slice(0, 12)) {
          doc
            .fillColor('#475569')
            .fontSize(9)
            .font('Helvetica')
            .text(`• ${line}`, 60, termsY, { width: 480 });
          termsY += 16;
        }

        // ─── Dates ────────────────────────────────────────────────────────────
        const dateY = termsY + 20;
        doc.fillColor('#94a3b8').fontSize(8).font('Helvetica')
          .text(`Contrat créé le: ${new Date(data.created_at).toLocaleDateString('fr-FR', { dateStyle: 'long' })}`, 50, dateY)
          .text(data.accepted_at ? `Accepté le: ${new Date(data.accepted_at).toLocaleDateString('fr-FR', { dateStyle: 'long' })}` : 'En attente d\'acceptation', 50, dateY + 14);

        // ─── Footer watermark ────────────────────────────────────────────────
        const footerY = 770;
        doc.moveTo(50, footerY).lineTo(545, footerY).strokeColor('#e2e8f0').stroke();
        doc.fillColor('#94a3b8').fontSize(8).font('Helvetica')
          .text('Ce document est généré automatiquement par la plateforme ZirIA. Il est juridiquement contraignant.', 50, footerY + 8, { align: 'center', width: 495 })
          .text('ZirIA AgriTech — Tunisie  |  contact@ziria.tn', 50, footerY + 22, { align: 'center', width: 495 });

        // Diagonal watermark
        doc.save();
        doc.rotate(-45, { origin: [297, 421] });
        doc.fillColor('#22c55e').opacity(0.05).fontSize(72).font('Helvetica-Bold')
          .text('ZIRIA', 80, 380);
        doc.restore();

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  private flattenTerms(snapshot: Record<string, any>): string[] {
    const lines: string[] = [];
    const labelMap: Record<string, string> = {
      cargo_type: 'Type de cargaison',
      weight_tonnes: 'Poids (tonnes)',
      origin_address: 'Adresse d\'enlèvement',
      destination_address: 'Adresse de livraison',
      pickup_date: 'Date d\'enlèvement',
      daily_rate_tnd: 'Tarif journalier (TND)',
      duration_days: 'Durée (jours)',
      crop_type: 'Type de culture',
      task_type: 'Type de tâche',
      start_date: 'Date de début',
      end_date: 'Date de fin',
      equipment_name: 'Équipement',
      reservation_start: 'Début location',
      reservation_end: 'Fin location',
      notes: 'Notes',
    };
    for (const [key, val] of Object.entries(snapshot ?? {})) {
      if (val === null || val === undefined || val === '') continue;
      const label = labelMap[key] ?? key.replace(/_/g, ' ');
      lines.push(`${label}: ${val}`);
    }
    return lines;
  }
}
