import { Injectable, Logger } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { CommissionService, COMMISSION_RATES } from '../finance/commission.service';
import { WalletService } from '../finance/wallet.service';
import { NotificationService } from '../notifications/notification.service';
import { TransportRequest } from '../drivers/entities/transport-request.entity';
import { DriverProfile } from '../drivers/entities/driver-profile.entity';
import { CommissionTransactionType } from '../finance/entities/platform-commission.entity';
import { RecordCategory } from '../finance/entities/financial-record.entity';

export interface TransactionConfirmationDto {
  type: CommissionTransactionType;
  category: RecordCategory;
  grossTnd: number;
  payerUserId: string;
  payeeUserId: string;
  relatedEntityId: string;
  relatedEntityType: string;
  rate: number;
  stockUpdateFn?: (qr: QueryRunner) => Promise<void>;
  transportNeeded?: {
    originLat: number;
    originLng: number;
    destLat: number;
    destLng: number;
    cargoKg: number;
    description: string;
  };
  notificationPayer?: { title: string; message: string; payload: any };
  notificationPayee?: { title: string; message: string; payload: any };
}

@Injectable()
export class TransactionCoordinatorService {
  private readonly logger = new Logger(TransactionCoordinatorService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly commissionService: CommissionService,
    private readonly walletService: WalletService,
    private readonly notificationService: NotificationService,
  ) {}

  async confirmTransaction(dto: TransactionConfirmationDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let transportRequestId: string | null = null;

    try {
      // 1. Stock update logic if any
      if (dto.stockUpdateFn) {
        await dto.stockUpdateFn(queryRunner);
      }

      // 2. Commission & Ledger Entries
      await this.commissionService.recordCommission(queryRunner, {
        type: dto.type,
        grossTnd: dto.grossTnd,
        payerUserId: dto.payerUserId,
        payeeUserId: dto.payeeUserId,
        relatedEntityId: dto.relatedEntityId,
        rate: dto.rate,
        category: dto.category,
      });

      await this.walletService.creditPending(
        dto.payeeUserId,
        dto.grossTnd,
        dto.rate,
        dto.relatedEntityId,
        dto.relatedEntityType || dto.type.toString(),
        `Crédit en attente pour transaction ${dto.type}`,
        queryRunner.manager
      );

      // 3. Logistics request if needed
      if (dto.transportNeeded) {
        const tr = queryRunner.manager.create(TransportRequest, {
          listing_id: dto.relatedEntityId, // Reusing listing_id for related entity
          requester_id: dto.payeeUserId, // Seller is the requester generally
          origin_lat: dto.transportNeeded.originLat,
          origin_lng: dto.transportNeeded.originLng,
          origin_address: 'Point de départ', // Basic fallback
          destination_lat: dto.transportNeeded.destLat,
          destination_lng: dto.transportNeeded.destLng,
          destination_address: 'Point d\'arrivée', // Basic fallback
          cargo_type: dto.transportNeeded.description,
          weight_tonnes: dto.transportNeeded.cargoKg / 1000,
        });
        const savedTr = await queryRunner.manager.save(TransportRequest, tr);
        transportRequestId = savedTr.id;
      }

      // Commit Transaction
      await queryRunner.commitTransaction();
      this.logger.log(`Transaction ${dto.relatedEntityId} confirmed successfully.`);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Transaction failed: ${error.message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }

    // 4. Notifications (outside the transaction)
    if (dto.notificationPayer) {
      await this.notificationService.sendPushToUser(dto.payerUserId, dto.notificationPayer);
    }
    if (dto.notificationPayee) {
      await this.notificationService.sendPushToUser(dto.payeeUserId, dto.notificationPayee);
    }

    // Notify nearby drivers if transport was requested
    if (transportRequestId && dto.transportNeeded) {
      const queryRunnerForDrivers = this.dataSource.createQueryRunner();
      try {
        await queryRunnerForDrivers.connect();
        const nearbyDrivers = await queryRunnerForDrivers.manager
          .createQueryBuilder(DriverProfile, 'driver')
          .where('driver.is_active = true')
          .andWhere('ST_DWithin(driver.location, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326), 50000)', {
            lng: dto.transportNeeded.originLng,
            lat: dto.transportNeeded.originLat,
          })
          .getMany();

        for (const driver of nearbyDrivers) {
          await this.notificationService.sendPushToUser(driver.user_id, {
            title: 'Nouvelle course logistique 🚛',
            message: `Charge de ${dto.transportNeeded.cargoKg / 1000}t de ${dto.transportNeeded.description} disponible à moins de 50km de vous.`,
            payload: { type: 'NEW_TRANSPORT_REQUEST', request_id: transportRequestId },
          });
        }
      } catch (err) {
        this.logger.error('Failed to notify nearby drivers', err.stack);
      } finally {
        await queryRunnerForDrivers.release();
      }
    }

    return { success: true, transactionId: dto.relatedEntityId, transportRequestId };
  }
}
