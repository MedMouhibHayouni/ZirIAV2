import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export type ContractType = 'TRANSPORT_MISSION' | 'JOB_MISSION' | 'EQUIPMENT_RENTAL' | 'TRANSPORT' | 'JOB';
export type ContractStatus =
  | 'DRAFT' | 'NEGOTIATING' | 'ACCEPTED' | 'IN_PROGRESS'
  | 'COMPLETED' | 'DISPUTED' | 'CANCELLED'
  | 'PENDING_ACCEPTANCE' | 'ACTIVE' | 'RESOLVED'
  | 'OUVERTE' | 'EN_ATTENTE' | 'NEGOCIATION'
  | 'EN_ATTENTE_SIGNATURE' | 'ACTIF' | 'EN_COURS'
  | 'TERMINEE' | 'ANNULEE';

export interface MissionContract {
  id: string;
  contract_type: ContractType;
  status: ContractStatus;
  reference_id: string;
  initiator_id: string;
  counterparty_id: string;
  farmer_id: string;
  provider_id: string;
  parcel_id: string | null;
  proposed_amount_tnd: number;
  final_amount_tnd: number | null;
  platform_commission_tnd: number | null;
  net_to_provider_tnd: number | null;
  terms_snapshot: Record<string, any>;
  audit_log: Array<{ at: string; action: string; by: string; diff?: any }>;
  status_history: Array<{ status: string; changed_by_id: string; changed_at: string; note: string }>;
  total_amount_tnd: number;
  commission_amount_tnd: number;
  start_date: string | null;
  end_date: string | null;
  duration_days: number | null;
  description: string | null;
  provider_notes: string | null;
  cancellation_reason: string | null;
  cancelled_by: string | null;
  dispute_reason: string | null;
  dispute_opened_at: string | null;
  completed_at: string | null;
  accepted_at: string | null;
  daily_rate_agreed: number | null;
  total_days: number | null;
  total_amount_agreed: number | null;
  conditions_text: string | null;
  worker_marked_complete: boolean;
  worker_marked_complete_at: string | null;
  farmer_rated_provider: number | null;
  provider_rated_farmer: number | null;
  farmer_rating_comment: string | null;
  provider_rating_comment: string | null;
  employer_rating: number | null;
  employer_rating_badges: string[] | null;
  employer_comment: string | null;
  worker_reply: string | null;
  employer_rating_submitted_at: string | null;
  worker_visible: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface MissionMessage {
  id: string;
  contract_id: string;
  sender_id: string;
  content: string;
  attachment_url: string | null;
  message_type: 'TEXT' | 'OFFER' | 'COUNTER_OFFER' | 'SYSTEM';
  offer_amount_tnd: number | null;
  created_at: string;
}

export interface MissionContractDocument {
  id: string;
  contract_id: string;
  document_type: 'WORK_ORDER' | 'DELIVERY_CONFIRMATION' | 'RENTAL_AGREEMENT' | 'INVOICE' | 'RECEIPT';
  file_url: string;
  generated_at: string;
  generated_by_id: string | null;
}

@Injectable({ providedIn: 'root' })
export class ContractsApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/contracts`;

  getMyContracts(): Observable<MissionContract[]> {
    return this.http.get<MissionContract[]>(`${this.base}/me`).pipe(
      catchError(() => of([]))
    );
  }

  getContractsByType(type: ContractType): Observable<MissionContract[]> {
    return this.http.get<MissionContract[]>(`${this.base}/by-type`, { params: { type } }).pipe(
      catchError(() => of([]))
    );
  }

  getContract(id: string): Observable<MissionContract> {
    return this.http.get<MissionContract>(`${this.base}/${id}`);
  }

  acceptContract(id: string): Observable<MissionContract> {
    return this.http.patch<MissionContract>(`${this.base}/${id}/accept`, {});
  }

  startMission(id: string): Observable<MissionContract> {
    return this.http.patch<MissionContract>(`${this.base}/${id}/start`, {});
  }

  completeMission(id: string): Observable<MissionContract> {
    return this.http.patch<MissionContract>(`${this.base}/${id}/complete`, {});
  }

  cancelContract(id: string, reason: string): Observable<MissionContract> {
    return this.http.patch<MissionContract>(`${this.base}/${id}/cancel`, { reason });
  }

  rateContract(id: string, rating: number, comment?: string): Observable<MissionContract> {
    return this.http.post<MissionContract>(`${this.base}/${id}/rate`, { rating, comment });
  }

  extendMission(id: string, additionalDays: number, additionalAmount: number): Observable<MissionContract> {
    return this.http.post<MissionContract>(`${this.base}/${id}/extend`, {
      additional_days: additionalDays,
      additional_amount: additionalAmount,
    });
  }

  getMessages(contractId: string): Observable<MissionMessage[]> {
    return this.http.get<MissionMessage[]>(`${this.base}/${contractId}/messages`).pipe(
      catchError(() => of([]))
    );
  }

  sendMessage(contractId: string, content: string, messageType: string = 'TEXT', offerAmount?: number): Observable<MissionMessage> {
    const body: any = { content, message_type: messageType };
    if (offerAmount !== undefined) body.offer_amount_tnd = offerAmount;
    return this.http.post<MissionMessage>(`${this.base}/${contractId}/messages`, body);
  }

  acceptOffer(contractId: string, messageId: string): Observable<MissionContract> {
    return this.http.patch<MissionContract>(`${this.base}/${contractId}/accept-offer`, { message_id: messageId });
  }

  getDocuments(contractId: string): Observable<MissionContractDocument[]> {
    return this.http.get<MissionContractDocument[]>(`${this.base}/${contractId}/documents`).pipe(
      catchError(() => of([]))
    );
  }

  getHistory(contractId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/${contractId}/history`).pipe(
      catchError(() => of([]))
    );
  }

  openDispute(contractId: string, reasonType: string, description: string, photoUrls?: string[]): Observable<any> {
    return this.http.post(`${this.base}/${contractId}/dispute`, {
      reason_type: reasonType,
      description,
      photo_urls: photoUrls,
    });
  }

  raiseDispute(id: string, reason: string): Observable<MissionContract> {
    return this.http.patch<MissionContract>(`${this.base}/${id}/dispute`, { reason });
  }

  workerReplyToEvaluation(contractId: string, reply: string): Observable<void> {
    return this.http.post<void>(`${this.base}/${contractId}/worker-reply`, { reply });
  }

  downloadPdf(id: string): void {
    this.http.get(`${this.base}/${id}/pdf`, { responseType: 'blob' }).subscribe(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contrat-ziria-${id.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  // ─── Dual Signature Flow ──────────────────────────────────────────────

  signContract(id: string): Observable<MissionContract> {
    return this.http.post<MissionContract>(`${this.base}/${id}/sign`, {});
  }

  workerMarkComplete(id: string): Observable<MissionContract> {
    return this.http.post<MissionContract>(`${this.base}/${id}/mark-complete`, {});
  }

  farmerConfirmComplete(id: string): Observable<MissionContract> {
    return this.http.post<MissionContract>(`${this.base}/${id}/confirm-complete`, {});
  }
}
