import { Component, OnInit, signal, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideFileText, lucideCheckCircle2, lucideXCircle, lucideClock, lucideSearch, lucideBox, lucideCheck, lucideX } from '@ng-icons/lucide';
import { environment } from '../../../../environments/environment';
import { ToastService } from '../expert/shared/toast.service';

@Component({
  selector: 'app-storage-reservations',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NgIconComponent],
  viewProviders: [provideIcons({ lucideFileText, lucideCheckCircle2, lucideXCircle, lucideClock, lucideSearch, lucideBox, lucideCheck, lucideX })],
  templateUrl: './storage-reservations.component.html',
  styleUrl: './storage-reservations.component.scss'
})
export class StorageReservationsComponent implements OnInit {
  private http = inject(HttpClient);
  private toast = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);

  reservations = signal<any[]>([]);
  total = signal<number>(0);
  page = signal<number>(1);
  limit = signal<number>(10);
  totalPages = signal<number>(1);
  selectedStatus = signal<string>('');

  ngOnInit() {
    this.fetchReservations();
  }

  fetchReservations() {
    let url = `${environment.apiUrl}/storage/reservations/owner?page=${this.page()}&limit=${this.limit()}`;
    if (this.selectedStatus()) {
      url += `&status=${this.selectedStatus()}`;
    }

    this.http.get<any>(url).subscribe({
      next: (res) => {
        const items = res.items || res.data || [];
        const total = res.total || 0;
        this.reservations.set(items);
        this.total.set(total);
        this.totalPages.set(Math.ceil(total / this.limit()) || 1);
        this.cdr.markForCheck();
      },
      error: () => {
        this.toast.error('Erreur', 'Impossible de charger les réservations.');
        this.cdr.markForCheck();
      }
    });
  }

  onStatusFilter(status: string) {
    this.selectedStatus.set(status);
    this.page.set(1);
    this.fetchReservations();
  }

  changePage(newPage: number) {
    if (newPage >= 1 && newPage <= this.totalPages()) {
      this.page.set(newPage);
      this.fetchReservations();
    }
  }

  accept(id: string) {
    this.http.patch(`${environment.apiUrl}/storage/reservations/${id}/accept`, {}).subscribe({
      next: () => {
        this.toast.success('Acceptée', 'Demande de réservation acceptée.');
        this.fetchReservations();
      }
    });
  }

  reject(id: string) {
    this.http.patch(`${environment.apiUrl}/storage/reservations/${id}/reject`, {}).subscribe({
      next: () => {
        this.toast.info('Refusée', 'Demande de réservation rejetée.');
        this.fetchReservations();
      }
    });
  }
}
