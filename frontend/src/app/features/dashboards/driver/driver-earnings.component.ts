import {
  Component, OnInit, inject, signal, ChangeDetectionStrategy, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FinanceApiService, WalletSummary } from '../../../core/services/finance-api.service';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideDollarSign, lucideTrendingUp, lucideCheckCircle, lucideCalendar,
  lucideArrowUpRight, lucideDownload, lucideTruck, lucideCreditCard, lucideActivity
} from '@ng-icons/lucide';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-driver-earnings',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  providers: [provideIcons({
    lucideDollarSign, lucideTrendingUp, lucideCheckCircle, lucideCalendar,
    lucideArrowUpRight, lucideDownload, lucideTruck, lucideCreditCard, lucideActivity
  })],
  templateUrl: './driver-earnings.component.html',
  styleUrl: './driver-earnings.component.scss'
})
export class DriverEarningsComponent implements OnInit {
  private financeApi = inject(FinanceApiService);
  private cdr = inject(ChangeDetectorRef);

  isLoading = signal(true);
  wallet = signal<WalletSummary | null>(null);

  barHeights = [30, 55, 40, 75, 60, 90, 70, 85, 45, 80, 65, 95];
  months = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Août','Sep','Oct','Nov','Déc'];

  ngOnInit() {
    this.financeApi.getWalletSummary().subscribe({
      next: (data) => {
        this.wallet.set(data);
        this.isLoading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoading.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  formatAmount(n?: number): string {
    return (n ?? 0).toLocaleString('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  }

  exportReport() {
    alert('Votre relevé de revenus ZirIA a été généré. Le téléchargement démarrera dans un instant.');
  }
}
