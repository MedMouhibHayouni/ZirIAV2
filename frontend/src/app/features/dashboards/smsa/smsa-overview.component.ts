import { Component, OnInit, inject, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideMap, lucideCloudLightning, lucideRadio, lucideUsers,
  lucideAlertTriangle, lucidePackage, lucideBarChart2, lucideX,
  lucideWind, lucideDroplets, lucideThermometer, lucideFileText,
  lucideBriefcase, lucideRefreshCw, lucideLeaf, lucideHammer, lucideMail, lucideSun,
  lucideMegaphone, lucideSend, lucideCheckCircle
} from '@ng-icons/lucide';
import { SmsaApiService, WeatherForecast } from '../../../core/services/smsa-api.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationStore } from '../../../core/state/notification.store';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-smsa-overview',
  standalone: true,
  imports: [CommonModule, NgIconComponent, FormsModule],
  providers: [provideIcons({
    lucideMap, lucideCloudLightning, lucideRadio, lucideUsers,
    lucideAlertTriangle, lucidePackage, lucideBarChart2, lucideX,
    lucideWind, lucideDroplets, lucideThermometer, lucideFileText,
    lucideBriefcase, lucideRefreshCw, lucideLeaf, lucideHammer, lucideMail, lucideSun,
    lucideMegaphone, lucideSend, lucideCheckCircle
  })],
  templateUrl: './smsa-overview.component.html',
  styleUrl: './smsa-overview.component.scss'
})
export class SmsaOverviewComponent implements OnInit {
  private smsaApi = inject(SmsaApiService);
  private auth = inject(AuthService);
  private notificationStore = inject(NotificationStore);

  readonly stats = this.smsaApi.stats;
  readonly activityFeed = this.smsaApi.activityFeed;
  readonly weather = this.smsaApi.weather;
  readonly isLoading = this.smsaApi.isLoading;
  readonly hasError = this.smsaApi.hasError;

  showAlertModal = false;
  alertMessage = '';
  isSendingBroadcast = signal(false);
  showBroadcastConfirm = signal(false);

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    // Sprint 5: Pass real governorate from AuthService to get real weather
    const user = this.auth.currentUser() as any;
    const governorate = user?.governorate || '';
    this.smsaApi.fetchOverviewData(governorate);
  }

  get presidentGovernorate(): string {
    const user = this.auth.currentUser() as any;
    return user?.governorate || 'Kasserine';
  }

  get memberCount(): number {
    return this.stats()?.active_members || 0;
  }

  getFeedIconClass(type: string): string {
    return type;
  }

  getFeedIconName(type: string): string {
    switch (type) {
      case 'B2B_CONNECTION':
      case 'sale': return 'lucidePackage';
      case 'DISEASE_DETECTION':
      case 'disease': return 'lucideLeaf';
      case 'JOB_OFFER':
      case 'job': return 'lucideHammer';
      default: return 'lucideFileText';
    }
  }

  openBroadcastModal() {
    this.showAlertModal = true;
    this.showBroadcastConfirm.set(false);
    this.alertMessage = '';
  }

  requestConfirmBroadcast() {
    if (!this.alertMessage.trim()) return;
    this.showBroadcastConfirm.set(true);
  }

  sendAlert() {
    if (!this.alertMessage.trim()) return;
    this.isSendingBroadcast.set(true);
    this.smsaApi.broadcastAlert(this.alertMessage).subscribe({
      next: (res: any) => {
        this.notificationStore.showSuccess(`✅ Message envoyé à ${res?.sent || 'tous les'} membres.`);
        this.showAlertModal = false;
        this.showBroadcastConfirm.set(false);
        this.alertMessage = '';
        this.isSendingBroadcast.set(false);
      },
      error: () => {
        this.notificationStore.showError("Erreur lors de l'envoi du message.");
        this.isSendingBroadcast.set(false);
      }
    });
  }
}
