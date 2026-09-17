import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PlatformCommission,
  CommissionTransactionType,
} from './entities/platform-commission.entity';
import {
  FinancialRecord,
  RecordType,
} from './entities/financial-record.entity';

export interface MonthlySummary {
  month: string;
  total_income: number;
  total_expenses: number;
  net: number;
  breakdown: { category: string; amount: number; type: string }[];
}

import { PaginatedResult } from '../common/dto/paginated.dto';

@Injectable()
export class FinanceService {
  constructor(
    @InjectRepository(PlatformCommission)
    private readonly commissionRepo: Repository<PlatformCommission>,
    @InjectRepository(FinancialRecord)
    private readonly recordRepo: Repository<FinancialRecord>,
  ) {}

  // ─── COMMISSIONS ─────────────────────────────────────────────────────────────

  async recordCommission(
    transactionType: CommissionTransactionType,
    referenceId: string,
    transactionValue: number,
    ratePct = 2.5,
  ): Promise<PlatformCommission> {
    const amount = +(transactionValue * (ratePct / 100)).toFixed(3);
    const commission = this.commissionRepo.create({
      transaction_type: transactionType,
      reference_id: referenceId,
      amount_tnd: amount,
      rate_pct: ratePct,
      transaction_value_tnd: transactionValue,
    });
    return this.commissionRepo.save(commission);
  }

  async findAllCommissions(type?: CommissionTransactionType): Promise<PlatformCommission[]> {
    const qb = this.commissionRepo.createQueryBuilder('pc');
    if (type) qb.where('pc.transaction_type = :type', { type });
    return qb.orderBy('pc.collected_at', 'DESC').getMany();
  }

  async getCommissionStats(): Promise<{
    total_tnd: number;
    by_type: { type: string; total: number; count: number }[];
  }> {
    const results = await this.commissionRepo
      .createQueryBuilder('pc')
      .select('pc.transaction_type', 'type')
      .addSelect('SUM(pc.amount_tnd)', 'total')
      .addSelect('COUNT(*)', 'count')
      .groupBy('pc.transaction_type')
      .getRawMany();

    const total_tnd = results.reduce((sum, r) => sum + Number(r.total), 0);
    const by_type = results.map(r => ({
      type: r.type,
      total: Number(r.total),
      count: Number(r.count),
    }));
    return { total_tnd, by_type };
  }

  // ─── FINANCIAL RECORDS (GRAND LIVRE) ─────────────────────────────────────────

  async addRecord(
    userId: string,
    dto: Partial<FinancialRecord>,
  ): Promise<FinancialRecord> {
    const record = this.recordRepo.create({ ...dto, user_id: userId });
    return this.recordRepo.save(record);
  }

  async findUserRecords(userId: string, period?: string, page = 1, limit = 20): Promise<PaginatedResult<FinancialRecord>> {
    const qb = this.recordRepo.createQueryBuilder('fr').where('fr.user_id = :userId', { userId });
    
    if (period === 'month') {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      qb.andWhere('fr.recorded_at >= :start', { start: startOfMonth });
    }

    qb.orderBy('fr.recorded_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();
    
    return {
      items,
      total,
      page,
      limit,
      hasNext: (page * limit) < total
    };
  }

  /**
   * Génère un vrai PDF (via pdfmake) du relevé financier des 30 derniers jours.
   * Retourne un Buffer prêt pour le téléchargement.
   */
  async generateExportPdf(userId: string, userName?: string, governorate?: string): Promise<Buffer> {
    // Importer pdfmake en dynamique pour éviter les erreurs de module ES si absent
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfmake = require('pdfmake');

    const records = await this.recordRepo.createQueryBuilder('fr')
      .where('fr.user_id = :userId', { userId })
      .andWhere("fr.recorded_at >= NOW() - INTERVAL '30 days'")
      .orderBy('fr.recorded_at', 'DESC')
      .getMany();

    // ── Calcul du résumé ──────────────────────────────────────────────────────
    let totalIncome = 0;
    let totalExpenses = 0;
    for (const r of records) {
      const amount = Number(r.amount_tnd || 0);
      if (r.record_type === RecordType.INCOME) totalIncome += amount;
      else totalExpenses += amount;
    }
    const netBalance = totalIncome - totalExpenses;

    // ── Définition des polices (Roboto embarquée dans pdfmake) ───────────────
    const path = require('path');
    const fonts = {
      Roboto: {
        normal: path.join(process.cwd(), 'node_modules/pdfmake/fonts/Roboto/Roboto-Regular.ttf'),
        bold: path.join(process.cwd(), 'node_modules/pdfmake/fonts/Roboto/Roboto-Medium.ttf'),
        italics: path.join(process.cwd(), 'node_modules/pdfmake/fonts/Roboto/Roboto-Italic.ttf'),
        bolditalics: path.join(process.cwd(), 'node_modules/pdfmake/fonts/Roboto/Roboto-MediumItalic.ttf'),
      },
    };

    // ── Utiliser les polices virtuelles embarquées ────────────────────────────
    pdfmake.setFonts(fonts);

    // ── Lignes du tableau ─────────────────────────────────────────────────────
    const tableBody: any[][] = [
      [
        { text: 'Date', style: 'tableHeader' },
        { text: 'Description', style: 'tableHeader' },
        { text: 'Catégorie', style: 'tableHeader' },
        { text: 'Montant (TND)', style: 'tableHeader' },
        { text: 'Type', style: 'tableHeader' },
      ],
    ];

    for (const r of records) {
      const amount = Number(r.amount_tnd || 0);
      const isIncome = r.record_type === RecordType.INCOME;
      tableBody.push([
        new Date(r.recorded_at).toLocaleDateString('fr-TN'),
        r.description || '—',
        r.category || '—',
        { text: `${amount.toFixed(3)}`, color: isIncome ? '#27ae60' : '#e74c3c' },
        { text: isIncome ? 'Revenu' : 'Dépense', color: isIncome ? '#27ae60' : '#e74c3c' },
      ]);
    }

    if (records.length === 0) {
      tableBody.push([{ text: 'Aucune transaction sur les 30 derniers jours', colSpan: 5, italics: true, alignment: 'center' }, '', '', '', '']);
    }

    const today = new Date().toLocaleDateString('fr-TN', { day: '2-digit', month: 'long', year: 'numeric' });

    // ── Définition du document PDF ────────────────────────────────────────────
    const docDef = {
      pageSize: 'A4',
      pageMargins: [40, 60, 40, 60],
      header: {
        columns: [
          { text: '🌿 ZirIA Sentinel', style: 'headerLogo', margin: [40, 20, 0, 0] },
          { text: `Généré le ${today}`, alignment: 'right', margin: [0, 20, 40, 0], fontSize: 9, color: '#7f8c8d' },
        ],
      },
      footer: (currentPage: number, pageCount: number) => ({
        text: `Document généré par ZirIA Sentinel — Kasserine, Tunisie   |   Page ${currentPage} / ${pageCount}`,
        alignment: 'center',
        fontSize: 8,
        color: '#95a5a6',
        margin: [40, 0, 40, 10],
      }),
      content: [
        { text: 'RELEVÉ FINANCIER', style: 'title' },
        { text: `Période : 30 derniers jours`, style: 'subtitle' },
        {
          columns: [
            { text: `Agriculteur : ${userName || 'Non renseigné'}`, style: 'meta' },
            { text: `Gouvernorat : ${governorate || 'Kasserine'}`, style: 'meta', alignment: 'right' },
          ],
          margin: [0, 0, 0, 20],
        },
        {
          table: {
            headerRows: 1,
            widths: ['auto', '*', 'auto', 'auto', 'auto'],
            body: tableBody,
          },
          layout: {
            fillColor: (rowIndex: number) => rowIndex === 0 ? '#2c3e50' : (rowIndex % 2 === 0 ? '#f8f9fa' : null),
          },
        },
        { text: ' ', margin: [0, 20] },
        // ── Résumé bas de page ──────────────────────────────────────────────
        {
          table: {
            widths: ['*', 'auto'],
            body: [
              [{ text: 'Total Revenus (TND)', bold: true }, { text: totalIncome.toFixed(3), color: '#27ae60', bold: true, alignment: 'right' }],
              [{ text: 'Total Dépenses (TND)', bold: true }, { text: totalExpenses.toFixed(3), color: '#e74c3c', bold: true, alignment: 'right' }],
              [
                { text: 'SOLDE NET (TND)', bold: true, fontSize: 14 },
                {
                  text: `${netBalance >= 0 ? '+' : ''}${netBalance.toFixed(3)}`,
                  color: netBalance >= 0 ? '#27ae60' : '#e74c3c',
                  bold: true,
                  fontSize: 14,
                  alignment: 'right',
                },
              ],
            ],
          },
          layout: 'noBorders',
          margin: [0, 10],
        },
      ],
      styles: {
        headerLogo: { fontSize: 16, bold: true, color: '#2c3e50' },
        title: { fontSize: 22, bold: true, color: '#2c3e50', alignment: 'center', margin: [0, 0, 0, 5] },
        subtitle: { fontSize: 11, color: '#7f8c8d', alignment: 'center', margin: [0, 0, 0, 15] },
        meta: { fontSize: 10, color: '#2c3e50' },
        tableHeader: { bold: true, color: '#ffffff', fontSize: 10 },
      },
      defaultStyle: { font: 'Roboto', fontSize: 10 },
    };

    const pdfDoc = pdfmake.createPdf(docDef);
    return pdfDoc.getBuffer();
  }

  /**
   * Résumé mensuel pour le dossier de crédit SMSA.
   */
  async getMonthlySummary(userId: string): Promise<MonthlySummary[]> {
    const raw = await this.recordRepo
      .createQueryBuilder('fr')
      .select('fr.month_ref', 'month')
      .addSelect('fr.record_type', 'record_type')
      .addSelect('fr.category', 'category')
      .addSelect('SUM(fr.amount_tnd)', 'amount')
      .where('fr.user_id = :userId', { userId })
      .andWhere("fr.month_ref IS NOT NULL")
      .groupBy('fr.month_ref')
      .addGroupBy('fr.record_type')
      .addGroupBy('fr.category')
      .orderBy('fr.month_ref', 'DESC')
      .limit(100)
      .getRawMany();

    const monthMap = new Map<string, MonthlySummary>();
    for (const row of raw) {
      if (!monthMap.has(row.month)) {
        monthMap.set(row.month, {
          month: row.month,
          total_income: 0,
          total_expenses: 0,
          net: 0,
          breakdown: [],
        });
      }
      const summary = monthMap.get(row.month)!;
      const amount = Number(row.amount);
      if (row.record_type === RecordType.INCOME) summary.total_income += amount;
      else summary.total_expenses += amount;
      summary.breakdown.push({ category: row.category, amount, type: row.record_type });
      summary.net = summary.total_income - summary.total_expenses;
    }
    return Array.from(monthMap.values());
  }
}
