import {  Component, inject, signal, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideUserPlus, lucidePhone, lucideMapPin, lucideShieldCheck, lucideCheckCircle, lucideArrowRight, lucideLoader, lucideKey, lucideMail, lucideHash, lucideWheat } from '@ng-icons/lucide';
import { AmbassadorApiService } from '../../../core/services/ambassador-api.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-amb-onboarding',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgIconComponent],
  providers: [provideIcons({ lucideUserPlus, lucidePhone, lucideMapPin, lucideShieldCheck, lucideCheckCircle, lucideArrowRight, lucideLoader, lucideKey, lucideMail, lucideHash, lucideWheat })],
  template: `
<div class="onboarding-container">
  <header class="page-header">
    <div class="icon-box">
      <ng-icon name="lucideUserPlus"></ng-icon>
    </div>
    <div>
      <h1>Inscrire un Agriculteur</h1>
      <p>Ajoutez un nouveau membre à votre zone d'influence ZirIA</p>
    </div>
  </header>

  <div class="form-card" [class.success]="isSuccess()">
    @if (!isSuccess()) {
      <form [formGroup]="farmerForm" (ngSubmit)="onSubmit()">

        <div class="form-section">
          <label><ng-icon name="lucideUserPlus"></ng-icon> Identité de l'agriculteur</label>
          <div class="grid-2">
            <div class="input-group">
              <input type="text" formControlName="first_name" placeholder="Prénom (ex: Ahmed)">
            </div>
            <div class="input-group">
              <input type="text" formControlName="last_name" placeholder="Nom (ex: Ben Salah)">
            </div>
          </div>
        </div>

        <div class="grid-2">
          <div class="form-section">
            <label><ng-icon name="lucidePhone"></ng-icon> Téléphone</label>
            <div class="input-group"><input type="tel" formControlName="phone" placeholder="+216 ..."></div>
          </div>
          <div class="form-section">
            <label><ng-icon name="lucideHash"></ng-icon> CIN (optionnel)</label>
            <div class="input-group"><input type="text" formControlName="national_id" placeholder="N° CIN"></div>
          </div>
        </div>

        <div class="grid-2">
          <div class="form-section">
            <label><ng-icon name="lucideMail"></ng-icon> Email (optionnel)</label>
            <div class="input-group"><input type="email" formControlName="email" placeholder="email@domaine.com"></div>
          </div>
          <div class="form-section">
            <label><ng-icon name="lucideKey"></ng-icon> Mot de passe</label>
            <div class="input-group">
              <input type="text" formControlName="password" placeholder="Mot de passe">
              <button type="button" class="gen-pass-btn" (click)="generatePassword()">Générer</button>
            </div>
          </div>
        </div>

        <div class="grid-2">
          <div class="form-section">
            <label><ng-icon name="lucideMapPin"></ng-icon> Gouvernorat</label>
            <select formControlName="governorate">
              <option value="Kasserine">Kasserine</option>
              <option value="Sidi Bouzid">Sidi Bouzid</option>
              <option value="Kairouan">Kairouan</option>
              <option value="Sousse">Sousse</option>
              <option value="Tunis">Tunis</option>
              <option value="Sfax">Sfax</option>
            </select>
          </div>
          <div class="form-section">
            <label><ng-icon name="lucideMapPin"></ng-icon> Délégation</label>
            <div class="input-group"><input type="text" formControlName="delegation" placeholder="Ex: Foussana"></div>
          </div>
        </div>

        <div class="grid-2">
          <div class="form-section">
            <label><ng-icon name="lucideMapPin"></ng-icon> Village / Localité</label>
            <div class="input-group"><input type="text" formControlName="village" placeholder="Ex: Douar Ain Souini"></div>
          </div>
          <div class="form-section">
            <label><ng-icon name="lucideWheat"></ng-icon> Nb. parcelles (optionnel)</label>
            <div class="input-group"><input type="number" formControlName="parcel_count" placeholder="0" min="0"></div>
          </div>
        </div>

        <div class="form-section">
          <label><ng-icon name="lucideShieldCheck"></ng-icon> Niveau de Confidentialité</label>
          <div class="radio-group">
            <label class="radio-item" [class.active]="farmerForm.value.privacy_level === 'ANONYMOUS'">
              <input type="radio" formControlName="privacy_level" value="ANONYMOUS">
              <span>Anonyme</span>
              <small>Masqué pour tous</small>
            </label>
            <label class="radio-item" [class.active]="farmerForm.value.privacy_level === 'SEMI_PUBLIC'">
              <input type="radio" formControlName="privacy_level" value="SEMI_PUBLIC">
              <span>Semi-Public</span>
              <small>Nom abrégé</small>
            </label>
            <label class="radio-item" [class.active]="farmerForm.value.privacy_level === 'OPEN'">
              <input type="radio" formControlName="privacy_level" value="OPEN">
              <span>Ouvert</span>
              <small>Visible partout</small>
            </label>
          </div>
        </div>

        <div class="form-actions">
          <button type="submit" class="btn-submit" [disabled]="farmerForm.invalid || isSubmitting()">
            @if (isSubmitting()) {
              <ng-icon name="lucideLoader" class="spin"></ng-icon> Inscription en cours...
            } @else {
              Finaliser l'inscription <ng-icon name="lucideArrowRight"></ng-icon>
            }
          </button>
        </div>
      </form>
    } @else {
      <div class="success-view">
        <div class="success-icon">
          <ng-icon name="lucideCheckCircle"></ng-icon>
        </div>
        <h2>Inscription Réussie !</h2>
        <p>L'agriculteur <strong>{{ farmerForm.value.first_name }} {{ farmerForm.value.last_name }}</strong> a été ajouté à votre zone.</p>
        
        <div class="credentials-box">
          <p>Identifiants à remettre à l'agriculteur :</p>
          <div class="cred-row"><span class="cred-label">Mot de passe</span><div class="pass-val">{{ createdPassword() }}</div></div>
          @if (farmerForm.value.phone) {
            <div class="cred-row"><span class="cred-label">Tél</span><div class="pass-val" style="font-size:1rem">{{ farmerForm.value.phone }}</div></div>
          }
        </div>

        <button class="btn-reset" (click)="resetForm()">Inscrire un autre agriculteur</button>
      </div>
    }
  </div>
</div>
`, 
  styles: [`
    .onboarding-container { padding: 0; max-width: 800px; margin: 0 auto; }
    .page-header { display: flex; align-items: center; gap: 20px; margin-bottom: 32px; }
    .icon-box { width: 56px; height: 56px; background: var(--success-bg); color: var(--success); border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 28px; }
    .page-header h1 { font-size: 2rem; font-weight: 800; color: var(--text-primary); margin: 0; }
    .page-header p { color: var(--text-muted); margin: 4px 0 0; }

    .form-card { background: var(--bg-card); border-radius: 24px; padding: 40px; box-shadow: var(--shadow-lg); border: 1px solid var(--border); transition: all 0.3s ease; }
    .form-card.success { border-color: var(--success); background: var(--success-bg); }

    .form-section { margin-bottom: 24px; }
    .form-section label { display: flex; align-items: center; gap: 8px; font-weight: 700; color: var(--text-primary); margin-bottom: 12px; font-size: 0.95rem; }
    .form-section label ng-icon { color: var(--zir-emerald); }

    .input-group input, select { width: 100%; padding: 14px 18px; border-radius: 12px; border: 1.5px solid var(--border); font-size: 1rem; color: var(--text-primary); transition: all 0.2s; background: var(--bg-input); }
    .input-group input:focus, select:focus { outline: none; border-color: var(--zir-emerald); background: var(--bg-card); box-shadow: 0 0 0 4px var(--zir-emerald-dim); }

    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }

    .radio-group { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    .radio-item { cursor: pointer; padding: 16px; border-radius: 12px; border: 1.5px solid var(--border); background: var(--bg-secondary); text-align: center; transition: all 0.2s; position: relative; }
    .radio-item input { position: absolute; opacity: 0; }
    .radio-item span { display: block; font-weight: 700; color: var(--text-primary); margin-bottom: 2px; }
    .radio-item small { color: var(--text-muted); font-size: 0.75rem; }
    .radio-item.active { border-color: var(--zir-emerald); background: var(--success-bg); box-shadow: 0 4px 12px var(--zir-emerald-dim); }

    .form-actions { margin-top: 40px; }
    .btn-submit { width: 100%; padding: 16px; border-radius: 14px; background: linear-gradient(135deg, var(--zir-green-deep), var(--zir-emerald)); color: white; border: none; font-size: 1.1rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 12px; transition: all 0.2s; box-shadow: 0 4px 12px var(--zir-emerald-dim); }
    .btn-submit:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 20px var(--zir-emerald-dim); filter: brightness(1.1); }
    .btn-submit:disabled { opacity: 0.6; cursor: not-allowed; }

    .success-view { text-align: center; }
    .success-icon { width: 80px; height: 80px; background: var(--success); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 48px; margin: 0 auto 24px; box-shadow: 0 10px 20px var(--zir-emerald-dim); }
    .success-view h2 { font-size: 1.75rem; font-weight: 800; color: var(--success); margin-bottom: 8px; }
    .success-view p { color: var(--text-secondary); font-size: 1.1rem; }

    .credentials-box { margin: 32px 0; background: var(--bg-input); padding: 20px; border-radius: 16px; border: 1px dashed var(--zir-emerald); }
    .credentials-box p { font-size: 0.9rem; margin-bottom: 8px; font-weight: 600; color: var(--text-primary); }
    .pass-val { font-family: monospace; font-size: 1.5rem; font-weight: 800; color: var(--zir-emerald); letter-spacing: 2px; }

    .btn-reset { margin-top: 24px; padding: 12px 24px; border-radius: 10px; background: transparent; border: 1.5px solid var(--zir-emerald); color: var(--zir-emerald); font-weight: 700; cursor: pointer; transition: all 0.2s; }
    .btn-reset:hover { background: var(--success-bg); }

    .input-group { position: relative; display: flex; gap: 8px; }
    .gen-pass-btn { padding: 6px 14px; border-radius: 8px; background: var(--bg-secondary); border: 1px solid var(--border); color: var(--text-primary); font-weight: 600; font-size: 12px; cursor: pointer; white-space: nowrap; transition: all 0.2s; }
    .gen-pass-btn:hover { background: var(--bg-card-hover); border-color: var(--zir-emerald); color: var(--zir-emerald); }
    .cred-row { display: flex; align-items: center; gap: 16px; margin: 8px 0; }
    .cred-label { font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); min-width: 90px; }

    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  `]
})
export class AmbOnboardingComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(AmbassadorApiService);
  private readonly cdr = inject(ChangeDetectorRef);

  farmerForm = this.fb.group({
    first_name: ['', [Validators.required, Validators.minLength(2)]],
    last_name:  ['', [Validators.required, Validators.minLength(2)]],
    phone:       [''],
    national_id: [''],
    email:       [''],
    password:    ['', Validators.required],
    governorate: ['Kasserine', Validators.required],
    delegation:  [''],
    village:     [''],
    parcel_count:[null as null | number],
    privacy_level: ['SEMI_PUBLIC', Validators.required],
  });

  isSubmitting = signal(false);
  isSuccess = signal(false);
  createdPassword = signal('');

  generatePassword(): void {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let pwd = '';
    for (let i = 0; i < 8; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
    this.farmerForm.patchValue({ password: pwd });
    this.cdr.markForCheck();
  }

  onSubmit(): void {
    if (this.farmerForm.invalid) return;
    this.isSubmitting.set(true);
    const v = this.farmerForm.value;
    this.api.registerFarmerFull({
      first_name:   v.first_name!,
      last_name:    v.last_name!,
      phone:        v.phone || undefined,
      national_id:  v.national_id || undefined,
      email:        v.email || undefined,
      password:     v.password!,
      governorate:  v.governorate!,
      delegation:   v.delegation || undefined,
      village:      v.village || undefined,
      parcel_count: v.parcel_count ?? undefined,
      privacy_level: v.privacy_level as any,
    }).subscribe({
      next: () => {
        this.createdPassword.set(v.password!);
        this.isSuccess.set(true);
        this.isSubmitting.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.isSubmitting.set(false);
        alert('Erreur lors de l\'inscription. Vérifiez les données et réessayez.');
        this.cdr.markForCheck();
      }
    });
  }

  resetForm(): void {
    this.farmerForm.reset({
      governorate: 'Kasserine',
      privacy_level: 'SEMI_PUBLIC'
    });
    this.isSuccess.set(false);
    this.createdPassword.set('');
    this.cdr.markForCheck();
  }
}
