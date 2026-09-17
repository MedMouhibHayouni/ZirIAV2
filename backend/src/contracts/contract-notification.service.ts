import { Injectable } from '@nestjs/common';
import { NotificationGateway } from '../notifications/notification.gateway';

@Injectable()
export class ContractNotificationService {
  constructor(private readonly notificationGateway: NotificationGateway) {}

  notify(userId: string, event: string, data: Record<string, any>) {
    this.notificationGateway.sendToUser(userId, event, data);
  }

  notifyOfferReceived(userId: string, contractId: string, contractType: string, amount: number) {
    this.notify(userId, 'contract_offer_received', { contract_id: contractId, contract_type: contractType, proposed_amount_tnd: amount });
  }

  notifyCounterOffer(userId: string, contractId: string, amount: number) {
    this.notify(userId, 'contract_counter_offer', { contract_id: contractId, offer_amount_tnd: amount });
  }

  notifyContractAccepted(userId: string, contractId: string, finalAmount: number) {
    this.notify(userId, 'contract_accepted', { contract_id: contractId, final_amount_tnd: finalAmount });
  }

  notifyMissionStarted(userId: string, contractId: string) {
    this.notify(userId, 'contract_started', { contract_id: contractId });
  }

  notifyCheckpoint(userId: string, contractId: string, stage: string) {
    this.notify(userId, 'contract_checkpoint', { contract_id: contractId, stage });
  }

  notifyMissionCompleted(userId: string, contractId: string) {
    this.notify(userId, 'contract_completed', { contract_id: contractId });
  }

  notifyPaymentReceived(userId: string, contractId: string, amount: number) {
    this.notify(userId, 'contract_payment_received', { contract_id: contractId, amount_tnd: amount });
  }

  notifyExtensionRequested(userId: string, contractId: string, additionalDays: number) {
    this.notify(userId, 'contract_extension_requested', { contract_id: contractId, additional_days: additionalDays });
  }

  notifyDisputeOpened(userId: string, contractId: string, reason: string) {
    this.notify(userId, 'contract_dispute_opened', { contract_id: contractId, reason });
  }

  notifyDisputeResolved(userId: string, contractId: string, resolution: string) {
    this.notify(userId, 'contract_dispute_resolved', { contract_id: contractId, resolution });
  }

  notifyRatingReceived(userId: string, contractId: string, rating: number) {
    this.notify(userId, 'contract_rating_received', { contract_id: contractId, rating });
  }

  notifyJobApplicationReceived(userId: string, offerId: string, workerName: string) {
    this.notify(userId, 'job_application_received', { offer_id: offerId, worker_name: workerName });
  }

  notifyJobApplicationViewed(userId: string, offerId: string) {
    this.notify(userId, 'job_application_viewed', { offer_id: offerId });
  }

  notifyEquipmentReminder(userId: string, contractId: string) {
    this.notify(userId, 'equipment_reminder', { contract_id: contractId, message: 'La date de retour du matériel est demain.' });
  }
}
