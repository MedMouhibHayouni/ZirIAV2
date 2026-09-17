import {  Component, OnInit, inject, signal , ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LandApiService, LandParcel } from '../../../core/services/land-api.service';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { 
  lucideMap, lucideMaximize, lucideMapPin, 
  lucideGavel, lucideTrendingUp, lucidePlus,
  lucideInfo, lucideSettings
} from '@ng-icons/lucide';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-land-owner-lands',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  providers: [provideIcons({ 
    lucideMap, lucideMaximize, lucideMapPin, 
    lucideGavel, lucideTrendingUp, lucidePlus,
    lucideInfo, lucideSettings
  
})],
  templateUrl: './land-owner-lands.component.html',
  styleUrl: './land-owner-lands.component.scss'
})
export class LandOwnerLandsComponent implements OnInit {
  private api = inject(LandApiService);
  
  lands = this.api.myLands;
  isLoading = this.api.isLoadingLands;

  ngOnInit() {
    this.api.fetchMyLands().subscribe();
  }

  openLandDetail(land: LandParcel) {
    // Navigate to detail or open modal
  }

  startAuction(land: LandParcel) {
    // Open auction creation modal
  }
}
