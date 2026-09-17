import {  Component, OnInit, inject, signal, computed , ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { 
  lucideCalendar, lucideMapPin, lucideUser, lucidePhone, 
  lucideExternalLink, lucideCheckCircle, lucideChevronLeft, 
  lucideChevronRight, lucideClock, lucideX, lucideInfo, lucideAlertCircle
} from '@ng-icons/lucide';

interface Reservation {
  id: string;
  equipment: {
    id: string;
    model: string;
    brand: string;
    type: string;
    lat: number;
    lng: number;
  };
  lessee: {
    id: string;
    name: string;
    phone?: string;
  };
  start_date: string;
  end_date: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-equipment-calendar',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  providers: [provideIcons({ 
    lucideCalendar, lucideMapPin, lucideUser, lucidePhone, 
    lucideExternalLink, lucideCheckCircle, lucideChevronLeft, 
    lucideChevronRight, lucideClock, lucideX, lucideInfo, lucideAlertCircle
  
})],
  templateUrl: './equipment-calendar.component.html',
  styleUrls: ['./equipment-calendar.component.scss']
})
export class EquipmentCalendarComponent implements OnInit {
  private http = inject(HttpClient);
  
  reservations = signal<Reservation[]>([]);
  selectedRes = signal<Reservation | null>(null);
  isLoading = signal<boolean>(false);

  months = signal<any[]>([]);

  // Computed to group reservations by day for easy display
  reservationsByDay = computed(() => {
    const map = new Map<string, Reservation[]>();
    const resList = this.reservations();
    
    resList.forEach(res => {
      // Create entries for each day in the reservation period
      const start = new Date(res.start_date);
      const end = new Date(res.end_date);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toDateString();
        if (!map.has(dateStr)) map.set(dateStr, []);
        map.get(dateStr)?.push(res);
      }
    });
    
    return map;
  });

  ngOnInit() {
    this.generateMonths();
    this.fetchReservations();
  }

  generateMonths() {
    const now = new Date();
    const generatedMonths = [];
    
    for (let i = 0; i < 3; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const monthName = date.toLocaleString('fr-FR', { month: 'long', year: 'numeric' });
      
      const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
      const firstDayOfWeek = (date.getDay() + 6) % 7; // Monday = 0
      
      const days = [];
      // Empty padding before the 1st
      for (let j = 0; j < firstDayOfWeek; j++) {
        days.push(null);
      }
      
      for (let j = 1; j <= daysInMonth; j++) {
        days.push(new Date(date.getFullYear(), date.getMonth(), j));
      }
      
      generatedMonths.push({ name: monthName, days });
    }
    
    this.months.set(generatedMonths);
  }

  fetchReservations() {
    this.isLoading.set(true);
    this.http.get<Reservation[]>(`${environment.apiUrl}/equipment/reservations`).subscribe({
      next: (data) => {
        this.reservations.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        // Demo data if empty
        if (this.reservations().length === 0) {
          const today = new Date();
          this.reservations.set([
            { 
              id: '1', 
              equipment: { id: 'eq1', model: 'John Deere 6120M', brand: 'JD', type: 'TRACTOR', lat: 35.1676, lng: 8.8365 },
              lessee: { id: 'u1', name: 'Ahmed Ben Salah', phone: '+216 98 123 456' },
              start_date: today.toISOString(), 
              end_date: new Date(today.getTime() + 86400000).toISOString(),
              status: 'APPROVED'
            }
          ]);
        }
      }
    });
  }

  getResForDay(date: Date): Reservation[] {
    return this.reservationsByDay().get(date.toDateString()) || [];
  }

  isToday(date: Date): boolean {
    return date.toDateString() === new Date().toDateString();
  }

  selectReservation(res: Reservation) {
    this.selectedRes.set(res);
  }

  openNavigation(lat: number, lng: number) {
    window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank');
  }

  getMachineColor(type: string): string {
    const t = type.toLowerCase();
    if (t.includes('tractor')) return 'var(--zir-emerald)';
    if (t.includes('harvester')) return 'var(--warning)';
    if (t.includes('sprayer')) return 'var(--info)';
    return 'var(--text-secondary)';
  }
}
