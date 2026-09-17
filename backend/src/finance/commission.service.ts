import { Injectable } from '@nestjs/common';
import { QueryRunner } from 'typeorm';
import { PlatformCommission, CommissionTransactionType } from './entities/platform-commission.entity';
import { FinancialRecord, RecordType, RecordCategory } from './entities/financial-record.entity';

export const COMMISSION_RATES = {
  PRODUCE_SALE: 0.04,
  INPUT_PURCHASE: 0.03,
  EQUIPMENT_RENTAL: 0.06,
  TRANSPORT: 0.05,
  AGRIJOBS: 0.03,
  EXPERT_CONSULTATION: 0.12,
  LAND_AUCTION: 0.015,
};

@Injectable()
export class CommissionService {
  /**
   * Records a commission and the associated financial records for both parties
   * within an existing database transaction.
   */
  async recordCommission(
    queryRunner: QueryRunner,
    params: {
      type: CommissionTransactionType;
      grossTnd: number;
      payerUserId: string;
      payeeUserId: string;
      relatedEntityId: string;
      rate: number;
      category: RecordCategory;
    },
  ): Promise<{ platformCommission: PlatformCommission; payerRecord: FinancialRecord; payeeRecord: FinancialRecord }> {
    const { type, grossTnd, payerUserId, payeeUserId, relatedEntityId, rate, category } = params;
    const commissionAmount = grossTnd * rate;
    const netToPayee = grossTnd - commissionAmount;

    // 1. Platform Commission
    const platformCommission = queryRunner.manager.create(PlatformCommission, {
      transaction_type: type,
      reference_id: relatedEntityId,
      amount_tnd: commissionAmount,
      rate_pct: rate * 100, // store as percentage
      transaction_value_tnd: grossTnd,
    });
    await queryRunner.manager.save(PlatformCommission, platformCommission);

    const monthRef = new Date().toISOString().slice(0, 7); // YYYY-MM

    // 2. Debit for Payer (Full Gross Amount)
    const payerRecord = queryRunner.manager.create(FinancialRecord, {
      user_id: payerUserId,
      record_type: RecordType.EXPENSE,
      category: category,
      amount_tnd: grossTnd,
      description: `Paiement pour ${type}`,
      reference_id: relatedEntityId,
      month_ref: monthRef,
    });
    await queryRunner.manager.save(FinancialRecord, payerRecord);

    // 3. Credit for Payee (Net Amount: Gross - Commission)
    const payeeRecord = queryRunner.manager.create(FinancialRecord, {
      user_id: payeeUserId,
      record_type: RecordType.INCOME,
      category: category,
      amount_tnd: netToPayee,
      description: `Revenu pour ${type} (Commission déduite: ${commissionAmount} TND)`,
      reference_id: relatedEntityId,
      month_ref: monthRef,
    });
    await queryRunner.manager.save(FinancialRecord, payeeRecord);

    return { platformCommission, payerRecord, payeeRecord };
  }
}
