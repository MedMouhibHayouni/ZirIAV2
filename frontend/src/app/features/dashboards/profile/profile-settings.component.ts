import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { 
  lucideUser, lucidePhone, lucideMail, lucideLock, lucideGlobe, 
  lucideBriefcase, lucideTruck, lucideShield, lucideSave, 
  lucideCamera, lucideCheck, lucideInfo
} from '@ng-icons/lucide';
import { AuthService } from '../../../core/services/auth.service';
import { LanguageService } from '../../../core/services/language.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-profile-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent],
  providers: [
    provideIcons({
      lucideUser, lucidePhone, lucideMail, lucideLock, lucideGlobe,
      lucideBriefcase, lucideTruck, lucideShield, lucideSave,
      lucideCamera, lucideCheck, lucideInfo
    })
  ],
  templateUrl: './profile-settings.component.html',
  styleUrl: './profile-settings.component.scss'
})
export class ProfileSettingsComponent implements OnInit {
  private auth = inject(AuthService);
  private langService = inject(LanguageService);
  private http = inject(HttpClient);

  currentUser = this.auth.currentUser;

  // ── Tab ──
  activeTab = signal<'personal' | 'role' | 'security'>('personal');

  // ── Plain form properties (ngModel-compatible) ──
  name = '';
  phone = '';
  email = '';
  language = 'fr';
  profilePictureUrl: string | null = null;

  // Security
  newPassword = '';
  confirmPassword = '';

  // Worker
  workerSkills: string[] = [];
  workerDailyRate = 50;
  workerBio = '';
  availableSkills = [
    { code: 'recolte_tomate', name: 'Récolte Tomates (حصاد الطماطم)' },
    { code: 'irrigation',     name: 'Irrigation & Drainage (الري والصرف)' },
    { code: 'taille_olive',   name: 'Taille des Oliviers (تقليم الزيتون)' },
    { code: 'conduite_tracteur', name: 'Conduite de Tracteur (سياقة الجرار)' },
    { code: 'fertilisation',  name: 'Fertilisation & Traitement (تسميد ومعالجة)' }
  ];

  // Driver
  driverVehicleType = 'TRUCK';
  driverCapacity = 5;
  driverPlate = '';
  driverLicense = '';
  vehicleTypes = [
    { code: 'TRUCK',       name: 'Camion Agricole (شاحنة فلاحية)' },
    { code: 'VAN',         name: 'Fourgonnette (شاحنة صغيرة)' },
    { code: 'PICKUP',      name: 'Pick-up (بيك آب)' },
    { code: 'REFRIGERATED',name: 'Camion Frigorifique (شاحنة مبردة)' }
  ];

  // Expert
  expertSpeciality = '';

  // Equipment Owner
  equipType = '';

  // Ambassador
  ambassadorZoneId = '';
  zones: any[] = [];

  // Supplier
  supplierBusinessName = '';
  supplierDescription = '';

  // Farmer
  farmerCooperativeId = '';
  cooperatives: any[] = [];

  // ── UI state (signals) ──
  saveSuccess = signal(false);
  saveError   = signal('');
  isSaving    = signal(false);

  ngOnInit() {
    this.loadProfile();
    this.loadDropdownData();
  }

  loadProfile() {
    this.http.get<any>(`${environment.apiUrl}/auth/me`).subscribe({
      next: (p) => {
        this.name              = p.name  || '';
        this.phone             = p.phone || '';
        this.email             = p.email || '';
        this.language          = p.language || 'fr';
        this.profilePictureUrl = p.profile_picture_url || null;

        if (p.language && p.language !== this.langService.currentLang()) {
          this.langService.currentLang.set(p.language);
        }

        const role = p.role;
        if (role === 'WORKER' || role === 'AGRI_WORKER') {
          const wp = p.worker_profile || {};
          this.workerSkills    = wp.skills || [];
          this.workerDailyRate = wp.daily_rate_tnd ? +wp.daily_rate_tnd : 50;
          this.workerBio       = wp.bio || '';
        }
        if (role === 'DRIVER') {
          const dp = p.driver_profile || {};
          this.driverVehicleType = dp.vehicle_type  || 'TRUCK';
          this.driverCapacity    = dp.capacity_tonnes ? +dp.capacity_tonnes : 5;
          this.driverPlate       = dp.vehicle_plate   || '';
          this.driverLicense     = dp.license_number  || '';
        }
        if (role === 'SUPPLIER') {
          this.supplierBusinessName = p.business_name        || '';
          this.supplierDescription  = p.business_description || '';
        }
        if (role === 'EXPERT')       this.expertSpeciality  = p.speciality     || '';
        if (role === 'EQUIP_OWNER')  this.equipType         = p.equipment_type  || '';
        if (role === 'FARMER_AMBASSADOR') this.ambassadorZoneId = p.zone_id    || '';
        if (role === 'FARMER')       this.farmerCooperativeId = p.cooperative_id || '';
      },
      error: () => this.saveError.set('Impossible de charger les données du profil.')
    });
  }

  loadDropdownData() {
    const fallbackZones = [
      { id: 'zone-1', name: 'Secteur Foussana (القصرين)' },
      { id: 'zone-2', name: 'Secteur Regueb (سيدي بوزيد)' },
      { id: 'zone-3', name: 'Secteur Dahmani (الكاف)' }
    ];
    this.zones = fallbackZones;

    this.http.get<any[]>(`${environment.apiUrl}/cooperatives`).subscribe({
      next: (data) => {
        this.cooperatives = (data?.length) ? data : [
          { id: 'coop-1', name: 'SMSA El Falah Foussana' },
          { id: 'coop-2', name: 'SMSA Regueb El Khir' },
          { id: 'coop-3', name: 'SMSA Dahmani Progrès' }
        ];
      },
      error: () => {
        this.cooperatives = [
          { id: 'coop-1', name: 'SMSA El Falah Foussana' },
          { id: 'coop-2', name: 'SMSA Regueb El Khir' },
          { id: 'coop-3', name: 'SMSA Dahmani Progrès' }
        ];
      }
    });
  }

  toggleSkill(skillCode: string) {
    const idx = this.workerSkills.indexOf(skillCode);
    if (idx > -1) {
      this.workerSkills = this.workerSkills.filter(s => s !== skillCode);
    } else {
      this.workerSkills = [...this.workerSkills, skillCode];
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const reader = new FileReader();
      reader.onload = () => { this.profilePictureUrl = reader.result as string; };
      reader.readAsDataURL(input.files[0]);
    }
  }

  onSubmit() {
    this.isSaving.set(true);
    this.saveSuccess.set(false);
    this.saveError.set('');

    const payload: any = {
      name: this.name,
      phone: this.phone,
      email: this.email,
      language: this.language,
      profile_picture_url: this.profilePictureUrl
    };

    if (this.newPassword) {
      if (this.newPassword !== this.confirmPassword) {
        this.saveError.set('Les mots de passe ne correspondent pas.');
        this.isSaving.set(false);
        return;
      }
      payload.password = this.newPassword;
    }

    const role = this.currentUser()?.role;
    if (role === 'WORKER' || role === 'AGRI_WORKER') {
      payload.skills         = this.workerSkills;
      payload.daily_rate_tnd = this.workerDailyRate;
      payload.bio            = this.workerBio;
    } else if (role === 'DRIVER') {
      payload.vehicle_type   = this.driverVehicleType;
      payload.capacity_tonnes = this.driverCapacity;
      payload.vehicle_plate  = this.driverPlate;
      payload.license_number = this.driverLicense;
    } else if (role === 'SUPPLIER') {
      payload.business_name        = this.supplierBusinessName;
      payload.business_description = this.supplierDescription;
    } else if (role === 'EXPERT') {
      payload.speciality = this.expertSpeciality;
    } else if (role === 'EQUIP_OWNER') {
      payload.equipment_type = this.equipType;
    } else if (role === 'FARMER_AMBASSADOR') {
      payload.zone_id = this.ambassadorZoneId;
    } else if (role === 'FARMER') {
      payload.cooperative_id = this.farmerCooperativeId;
    }

    this.http.patch<any>(`${environment.apiUrl}/users/me/profile`, payload).subscribe({
      next: (res) => {
        this.isSaving.set(false);
        this.saveSuccess.set(true);

        this.auth.updateUser({
          name: res.name,
          email: res.email,
          profile_picture_url: res.profile_picture_url,
          language: res.language
        });

        if (res.language) this.langService.currentLang.set(res.language);

        this.newPassword    = '';
        this.confirmPassword = '';
        setTimeout(() => this.saveSuccess.set(false), 3500);
      },
      error: (err) => {
        this.isSaving.set(false);
        this.saveError.set(err.error?.message || 'Erreur lors de la mise à jour du profil.');
      }
    });
  }

  getInitials(): string {
    if (!this.name) return 'Z';
    const parts = this.name.trim().split(' ');
    return parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : this.name.substring(0, 2).toUpperCase();
  }
}
