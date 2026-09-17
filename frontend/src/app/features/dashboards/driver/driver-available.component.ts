import {  Component, OnInit, inject, signal , ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LogisticsApiService, FreightMission } from '../../../core/services/logistics-api.service';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { 
  lucideTruck, lucideMapPin, lucidePackage, 
  lucideDollarSign, lucideClock, lucideCheckCircle, 
  lucideArrowRight, lucideInfo
} from '@ng-icons/lucide';
import { Router } from '@angular/router';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-driver-available',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  providers: [provideIcons({ 
    lucideTruck, lucideMapPin, lucidePackage, 
    lucideDollarSign, lucideClock, lucideCheckCircle, 
    lucideArrowRight, lucideInfo
  
})],
  templateUrl: './driver-available.component.html',
  styleUrl: './driver-available.component.scss'
})
export class DriverAvailableComponent implements OnInit {
  private api = inject(LogisticsApiService);
  private router = inject(Router);
  
  missions = this.api.availableMissions;
  isLoading = this.api.isLoadingAvailable;

  ngOnInit() {
    this.api.fetchAvailableMissions().subscribe();
  }

  accept(mission: FreightMission) {
    this.api.acceptMission(mission.id).subscribe({
      next: () => {
        this.router.navigate(['/dashboard/driver/en-cours']);
      }
    });
  }
}
