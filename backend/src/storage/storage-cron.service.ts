import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { StorageReservation, StorageReservationStatus, StoragePaymentStatus } from './entities/storage-reservation.entity';
import { NotificationService } from '../notifications/notification.service';

@Injectable()
export class StorageCronService {
  private readonly logger = new Logger(StorageCronService.name);

  constructor(
    @InjectRepository(StorageReservation)
    private readonly reservationRepo: Repository<StorageReservation>,
    private readonly notificationService: NotificationService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async checkUpcomingPaymentDueDates() {
    this.logger.log('Execution du Cron Chambre Froide: Verification des echeances et gestion des retards...');

    const now = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    // 1. Process approaching payment due dates (<= 3 days)
    const upcomingReservations = await this.reservationRepo.find({
      where: {
        status: StorageReservationStatus.CONFIRMEE,
        next_payment_due_date: LessThanOrEqual(threeDaysFromNow),
      },
      relations: ['room', 'room.facility'],
    });

    for (const res of upcomingReservations) {
      if (res.renter_id) {
        await this.notificationService.sendToUsers(
          [res.renter_id],
          'Rappel Échéance Chambre Froide ⚡',
          `Votre prochain règlement pour la salle ${res.room.name} arrive à échéance le ${res.next_payment_due_date?.toLocaleDateString('fr-FR')}.`,
          {
            type: 'STORAGE_PAYMENT_DUE',
            reservation_id: res.id,
            due_date: res.next_payment_due_date,
            total_price: res.total_price,
          }
        );
      }
    }

    // 2. Process overdue payments: increment unpaid_months_count & update payment_status
    const overdueReservations = await this.reservationRepo.find({
      where: {
        status: StorageReservationStatus.CONFIRMEE,
        next_payment_due_date: LessThanOrEqual(now),
      },
      relations: ['room', 'room.facility'],
    });

    for (const res of overdueReservations) {
      if (Number(res.amount_due_tnd || res.total_price) > 0) {
        res.payment_status = StoragePaymentStatus.EN_RETARD;
        res.unpaid_months_count = (res.unpaid_months_count || 0) + 1;
        
        // Push due date to next month for counting next cycle
        const nextDue = new Date(res.next_payment_due_date || now);
        nextDue.setDate(nextDue.getDate() + 30);
        res.next_payment_due_date = nextDue;

        await this.reservationRepo.save(res);

        this.logger.warn(`Réservation ${res.id} marquée EN_RETARD (${res.unpaid_months_count} mois impayés). Client: ${res.client_name} (${res.client_phone})`);
      }
    }
  }
}
