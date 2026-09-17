import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface ExpertDashboardStats {
  validated_this_month: number;
  ai_accuracy_rate: number;
  alerts_this_month: number;
  farmers_count: number;
  pending_requests_count: number;
  active_consultations_count: number;
  monthly_earnings_net: number;
  pending_cases_count?: number;
  unread_messages_count?: number;
  top_diseases_week?: any[];
  // legacy aliases kept for template compat
  covered_zones?: number;
  protected_farmers?: number;
}

export interface TriageCase {
  id: string;
  case_type: 'AI_DIAGNOSIS' | 'FIELD_REPORT';
  title: string;
  severity: 'NORMAL' | 'WARNING' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  created_at: string;
  photo_url?: string;
  farmer_id: string;
  farmer_name: string;
  farmer_display_name: string;
  privacy_level: string;
  crop_type?: string;
  delegation?: string;
  confidence_score?: number;
  recommendation_fr?: string;
  recommendation_darija?: string;
  is_expert_validated?: boolean;
}

export interface ExpertFieldReport {
  id: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'PENDING' | 'EXPERT_REVIEWING' | 'RESOLVED';
  description: string;
  observations?: string;
  recommendations?: string;
  affected_crop_type?: string;
  crop_type?: string;
  affected_area_ha?: number;
  photo_urls?: string[];
  gps_lat?: number;
  gps_lng?: number;
  created_at: string;
  ambassador_id: string;
  ambassador_name: string;
  farmer_id?: string;
  farmer_name?: string;
  zone_name: string;
  delegation: string;
  governorate: string;
}

@Injectable({ providedIn: 'root' })
export class ExpertApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/expert`;

  /** Signal bumped when a new pending request arrives (real-time via WebSocket) */
  readonly pendingRequestRefresh = signal(0);

  notifyPendingRequestRefresh() {
    this.pendingRequestRefresh.update(v => v + 1);
  }
  getDashboardStats(): Observable<ExpertDashboardStats> {
    return this.http.get<ExpertDashboardStats>(`${this.base}/dashboard-stats`).pipe(catchError(() => of(null as any)));
  }

  getPendingCases(): Observable<TriageCase[]> {
    return this.http.get<TriageCase[]>(`${this.base}/pending-cases`).pipe(catchError(() => of([])));
  }

  getPriorityActions(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/priority-actions`).pipe(catchError(() => of([])));
  }

  getFieldReports(): Observable<ExpertFieldReport[]> {
    return this.http.get<ExpertFieldReport[]>(`${this.base}/field-reports`).pipe(catchError(() => of([])));
  }

  validateDiagnosis(
    id: string,
    isCorrect: boolean,
    correctedDisease?: string,
    comments?: string,
    nameAr?: string,
    nameLat?: string,
  ): Observable<any> {
    return this.http.patch(`${this.base}/detections/${id}/validate`, {
      is_correct: isCorrect,
      corrected_disease: correctedDisease,
      comments,
      name_ar: nameAr,
      name_lat: nameLat,
    });
  }

  createPrescription(dto: any): Observable<any> {
    return this.http.post(`${this.base}/prescriptions`, dto);
  }

  getPrescriptions(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/prescriptions`).pipe(catchError(() => of([])));
  }

  getMyAlerts(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/phyto-alerts/my`).pipe(catchError(() => of([])));
  }

  broadcastAlert(dto: any): Observable<any> {
    return this.http.post(`${this.base}/broadcast-alert`, dto);
  }

  createConsultation(dto: any): Observable<any> {
    return this.http.post(`${this.base}/consultations`, dto);
  }

  getConsultationsQueue(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/consultations/my-queue`).pipe(catchError(() => of([])));
  }

  acceptConsultation(id: string): Observable<any> {
    return this.http.patch(`${this.base}/consultations/${id}/accept`, {});
  }

  respondToConsultation(id: string, response: string): Observable<any> {
    return this.http.patch(`${this.base}/consultations/${id}/respond`, { response });
  }

  getConsultationsEarnings(): Observable<any> {
    return this.http.get<any>(`${this.base}/consultations/earnings`).pipe(catchError(() => of({ gross_amount_tnd: 0, net_to_expert_tnd: 0, platform_commission_tnd: 0 })));
  }

  completeProfile(dto: { expert_type: string; governorate_zones: string[]; certifications: string[]; bio: string }): Observable<any> {
    return this.http.patch(`${this.base}/profile/complete`, dto);
  }

  getMyFarmers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/my-farmers`).pipe(catchError(() => of([])));
  }

  getFarmerDetails(farmerId: string): Observable<any> {
    return this.http.get<any>(`${this.base}/my-farmers/${farmerId}/details`).pipe(catchError(() => of(null)));
  }

  requestFarmerLink(farmerId: string, note?: string): Observable<any> {
    return this.http.post(`${this.base}/farmer-relations/request`, { farmer_id: farmerId, note });
  }

  respondToLink(id: string, accepted: boolean): Observable<any> {
    return this.http.patch(`${this.base}/farmer-relations/${id}/respond`, { accepted });
  }

  getPendingRelations(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/farmer-relations/pending`).pipe(catchError(() => of([])));
  }

  removeFarmerLink(farmerId: string): Observable<any> {
    return this.http.delete(`${this.base}/farmer-relations/${farmerId}`);
  }

  getPublicProfile(expertId: string): Observable<any> {
    return this.http.get<any>(`${this.base}/public-profile/${expertId}`).pipe(catchError(() => of(null)));
  }

  getMyProfile(): Observable<any> {
    return this.http.get<any>(`${this.base}/my-profile`).pipe(catchError(() => of(null)));
  }

  updateProfile(dto: {
    name?: string;
    phone?: string;
    email?: string;
    governorate?: string;
    delegation?: string;
    profile_picture_url?: string;
    language?: string;
    speciality?: string;
    bio?: string;
    governorate_zones?: string[];
    certifications?: string[];
    consultation_rate_tnd?: number;
    tarif_note?: string;
    professional_status?: string;
    crda_zone_id?: string;
    affiliation_name?: string;
    institution_name?: string;
    accepts_remote_consultations?: boolean;
    password?: string;
  }): Observable<any> {
    return this.http.patch(`${this.base}/profile/update`, dto);
  }

  getAvailableExperts(governorate?: string): Observable<any[]> {
    const params = governorate ? `?governorate=${encodeURIComponent(governorate)}` : '';
    const base = this.base.replace('/expert', '/farmer');
    return this.http.get<any[]>(`${base}/available-experts${params}`).pipe(catchError(() => of([])));
  }

  getMessageConversations(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/messages/conversations`).pipe(catchError(() => of([])));
  }

  getMessages(partnerId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/messages/thread/${partnerId}`).pipe(catchError(() => of([])));
  }

  sendMessage(receiverId: string, body: string): Observable<any> {
    return this.http.post(`${this.base}/messages/send`, { receiver_id: receiverId, body });
  }

  getMessageUnreadCount(): Observable<{ unread_count: number }> {
    return this.http.get<{ unread_count: number }>(`${this.base}/messages/unread-count`).pipe(
      catchError(() => of({ unread_count: 0 }))
    );
  }

  getEarningsDashboard(): Observable<any> {
    return this.http.get<any>(`${this.base}/earnings-dashboard`).pipe(catchError(() => of(null)));
  }

  getPrescriptionSuggestions(diseaseName: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/prescription-suggestions?diseaseName=${encodeURIComponent(diseaseName)}`).pipe(catchError(() => of([])));
  }

  getCropKc(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/crop-kc`).pipe(catchError(() => of([])));
  }

  getAnimalNorms(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/animal-norms`).pipe(catchError(() => of([])));
  }

  getNpkCalculation(crop: string, area: number, ph: number): Observable<any> {
    return this.http.get<any>(`${this.base}/npk-calculator?crop=${encodeURIComponent(crop)}&area=${area}&ph=${ph}`).pipe(catchError(() => of(null)));
  }

  getVaccineTypes(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/vaccine-types`).pipe(catchError(() => of([])));
  }

  getGovernorateCentroids(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/governorate-centroids`).pipe(catchError(() => of([])));
  }

  getAllHerdRecords(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/herd-records/all`).pipe(catchError(() => of([])));
  }

  deletePrescription(id: string): Observable<any> {
    return this.http.delete(`${this.base}/prescriptions/${id}`);
  }

  getSoilAnalyses(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/soil-analyses`).pipe(catchError(() => of([])));
  }

  createSoilAnalysis(dto: any): Observable<any> {
    return this.http.post<any>(`${this.base}/soil-analyses`, dto);
  }

  getWells(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/wells`).pipe(catchError(() => of([])));
  }

  createWell(dto: any): Observable<any> {
    return this.http.post<any>(`${this.base}/wells`, dto);
  }

  addWellMeasurement(wellId: string, dto: any): Observable<any> {
    return this.http.post<any>(`${this.base}/wells/${wellId}/measurements`, dto);
  }

  getWellMeasurements(wellId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/wells/${wellId}/measurements`).pipe(catchError(() => of([])));
  }

  getHerdRecords(farmerId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/herd-records/farmer/${farmerId}`).pipe(catchError(() => of([])));
  }

  createOrUpdateHerdRecord(dto: any): Observable<any> {
    return this.http.post<any>(`${this.base}/herd-records`, dto);
  }

  getVaccinations(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/vaccinations`).pipe(catchError(() => of([])));
  }

  createVaccination(dto: any): Observable<any> {
    return this.http.post<any>(`${this.base}/vaccinations`, dto);
  }

  getRationCalculation(species: string, stage: string, herdSize: number): Observable<any> {
    return this.http.get<any>(`${this.base}/ration-calculator?species=${encodeURIComponent(species)}&stage=${encodeURIComponent(stage)}&herdSize=${herdSize}`).pipe(catchError(() => of(null)));
  }

  getEtcCalculation(crop: string, stage: string, governorate: string): Observable<any> {
    return this.http.get<any>(`${this.base}/water/etc-calculator?crop=${encodeURIComponent(crop)}&stage=${encodeURIComponent(stage)}&governorate=${encodeURIComponent(governorate)}`).pipe(catchError(() => of(null)));
  }

  getWaterProjects(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/water-projects`).pipe(catchError(() => of([])));
  }

  createWaterProject(dto: any): Observable<any> {
    return this.http.post<any>(`${this.base}/water-projects`, dto);
  }

  updateWaterProjectStatus(projectId: string, status: string): Observable<any> {
    return this.http.patch<any>(`${this.base}/water-projects/${projectId}/status`, { status });
  }

  updateWell(wellId: string, dto: { well_name?: string; status?: string; geological_notes?: string }): Observable<any> {
    return this.http.patch<any>(`${this.base}/wells/${wellId}`, dto);
  }

  deleteWell(wellId: string): Observable<any> {
    return this.http.delete<any>(`${this.base}/wells/${wellId}`);
  }

  getCropJournals(farmerId: string, season?: string): Observable<any[]> {
    const query = season ? `?season=${encodeURIComponent(season)}` : '';
    return this.http.get<any[]>(`${this.base}/crop-journals/farmer/${farmerId}${query}`).pipe(catchError(() => of([])));
  }

  createCropJournal(dto: any): Observable<any> {
    return this.http.post<any>(`${this.base}/crop-journals`, dto);
  }

  getSeasonalRisks(month?: number): Observable<any[]> {
    const query = month ? `?month=${month}` : '';
    return this.http.get<any[]>(`${this.base}/seasonal-risks${query}`).pipe(catchError(() => of([])));
  }

  // ── Phase 1: Reference Data ──────────────────────────────────────────────
  getCrdaZones(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/crda-zones`).pipe(catchError(() => of([])));
  }

  getGovernorateBoundaries(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/governorate-boundaries`).pipe(catchError(() => of([])));
  }

  // ── Phase 4: AWAITING_INFO ────────────────────────────────────────────────
  requestAdditionalInfo(id: string, chips: string[], text?: string): Observable<any> {
    return this.http.post(`${this.base}/consultations/${id}/request-info`, { chips, text });
  }

  getConsultationAdditionalInfo(id: string): Observable<any> {
    return this.http.get<any>(`${this.base}/consultations/${id}/additional-info`).pipe(catchError(() => of(null)));
  }

  // ── Phase 5: Commission Agreements ────────────────────────────────────────
  getCommissionAgreements(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/commission-agreements`).pipe(catchError(() => of([])));
  }

  createCommissionAgreement(dto: { supplier_id: string; commission_percentage: number }): Observable<any> {
    return this.http.post(`${this.base}/commission-agreements`, dto);
  }

  removeCommissionAgreement(id: string): Observable<any> {
    return this.http.delete(`${this.base}/commission-agreements/${id}`);
  }

  getPrescriptionPurchases(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/prescription-purchases`).pipe(catchError(() => of([])));
  }

  // ── Sprint 3 API methods ───────────────────────────────────────────────────
  getDiseaseHeatmapData(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base.replace('/expert', '')}/disease-detections/heatmap`).pipe(catchError(() => of([])));
  }

  getWaterCalculationHistory(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/water/calculations`).pipe(catchError(() => of([])));
  }

  saveWaterCalculation(dto: any): Observable<any> {
    return this.http.post<any>(`${this.base}/water/calculations`, dto);
  }

  getReproductionRecords(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/reproduction-records`).pipe(catchError(() => of([])));
  }

  createReproductionRecord(dto: any): Observable<any> {
    return this.http.post<any>(`${this.base}/reproduction-records`, dto);
  }

  updateReproductionRecord(id: string, dto: any): Observable<any> {
    return this.http.patch<any>(`${this.base}/reproduction-records/${id}`, dto);
  }

  getClinicalDossiers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/clinical-dossiers`).pipe(catchError(() => of([])));
  }

  createClinicalDossier(dto: any): Observable<any> {
    return this.http.post<any>(`${this.base}/clinical-dossiers`, dto);
  }

  updateClinicalDossier(id: string, dto: any): Observable<any> {
    return this.http.patch<any>(`${this.base}/clinical-dossiers/${id}`, dto);
  }
}
