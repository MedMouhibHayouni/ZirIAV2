import { Component, OnInit, inject, signal, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FinanceApiService, WalletSummary } from '../../../core/services/finance-api.service';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideDollarSign, lucideTrendingUp, lucideCheckCircle, lucideCalendar,
  lucideArrowUpRight, lucideDownload, lucideAward, lucideCreditCard,
  lucideChevronDown, lucideClock, lucideBriefcase, lucideMapPin
} from '@ng-icons/lucide';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-worker-earnings',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  providers: [provideIcons({
    lucideDollarSign, lucideTrendingUp, lucideCheckCircle, lucideCalendar,
    lucideArrowUpRight, lucideDownload, lucideAward, lucideCreditCard,
    lucideChevronDown, lucideClock, lucideBriefcase, lucideMapPin
  })],
  templateUrl: './worker-earnings.component.html',
  styleUrl: './worker-earnings.component.scss'
})
export class WorkerEarningsComponent implements OnInit {
  private financeApi = inject(FinanceApiService);
  private cdr = inject(ChangeDetectorRef);

  isLoading = signal(true);
  wallet = signal<WalletSummary | null>(null);

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

  exportToPdf() {
    alert("Votre relevé de revenus de travailleur ZirIA a été généré avec succès ! Le téléchargement va démarrer.");
  }
}
