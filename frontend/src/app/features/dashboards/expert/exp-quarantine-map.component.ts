import { Component, OnInit, OnDestroy, inject, signal, ChangeDetectionStrategy, ChangeDetectorRef, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideMap, lucideShieldAlert, lucidePlus, lucideX, lucideSend } from '@ng-icons/lucide';
import * as L from 'leaflet';
import { ExpertApiService } from '../../../core/services/expert-api.service';
import { ToastService } from './shared/toast.service';

@Component({
  selector: 'app-exp-quarantine-map',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NgIconComponent],
  providers: [provideIcons({ lucideMap, lucideShieldAlert, lucidePlus, lucideX, lucideSend })],
  template: `
<div class="quarantine-wrap">
  <div class="page-header">
    <div>
      <h2>Carte des Zones de Quarantaine</h2>
      <p>Délimitez les périmètres de sécurité sanitaires et diffusez des alertes en temps réel aux éleveurs de la zone.</p>
    </div>
  </div>

  <div class="quarantine-layout">
    <!-- Map Canvas -->
    <div class="map-container card glass">
      <div #mapEl id="quarantine-map" class="leaflet-map"></div>
      <div class="map-hint">
        💡 Cliquez n'importe où sur la carte pour définir le centre d'une nouvelle zone de quarantaine.
      </div>
    </div>

    <!-- Active Zones Panel & Creator -->
    <div class="control-panel card glass">
      @if (selectedLatLng(); as latlng) {
        <div class="create-zone-box animate-in">
          <div class="box-header">
            <h3><ng-icon name="lucidePlus"></ng-icon> Déclarer une Quarantaine</h3>
            <button class="close-btn-sm" (click)="selectedLatLng.set(null)"><ng-icon name="lucideX"></ng-icon></button>
          </div>
          
          <p class="text-xs text-muted mb-3">Coordonnées: [{{ latlng.lat.toFixed(4) }}, {{ latlng.lng.toFixed(4) }}]</p>

          <div class="form-group">
            <label>Titre de l'Alerte / Foyer</label>
            <input type="text" class="form-control" [(ngModel)]="zoneForm.title" placeholder="ex: Foyer de Fièvre Aphteuse">
          </div>

          <div class="form-group">
            <label>Maladie suspectée</label>
            <input type="text" class="form-control" [(ngModel)]="zoneForm.disease" placeholder="ex: Fièvre Aphteuse, Brucellose...">
          </div>

          <div class="form-group">
            <label>Rayon de sécurité (mètres)</label>
            <input type="number" class="form-control" [(ngModel)]="zoneForm.radius" (change)="updatePreviewCircle()" min="100" max="20000" step="100">
          </div>

          <div class="form-group">
            <label>Consignes & Mesures sanitaires</label>
            <textarea class="form-control" rows="3" [(ngModel)]="zoneForm.instructions" placeholder="Consignes obligatoires pour les éleveurs de la zone..."></textarea>
          </div>

          <button class="btn-primary w-full mt-2" (click)="broadcastZone()" [disabled]="!zoneForm.title || !zoneForm.disease">
            <ng-icon name="lucideSend"></ng-icon> Diffuser l'alerte de zone
          </button>
        </div>
      } @else {
        <div class="active-zones-list">
          <h3 class="panel-title"><ng-icon name="lucideShieldAlert"></ng-icon> Zones Actives ({{ activeZones().length }})</h3>
          @if (activeZones().length === 0) {
            <div class="empty-zones">Aucune zone de quarantaine active. Cliquez sur la carte pour en créer une.</div>
          } @else {
            <div class="zones-scroll">
              @for (z of activeZones(); track z.id) {
                <div class="zone-card">
                  <div class="zone-card-header">
                    <strong>{{ z.title }}</strong>
                    <button class="btn-delete" (click)="deleteZone(z.id)">Retirer</button>
                  </div>
                  <p class="text-xs">Maladie: <b>{{ z.disease }}</b></p>
                  <p class="text-xs">Rayon: {{ z.radius }}m</p>
                  <div class="instructions-box mt-2">{{ z.instructions }}</div>
                </div>
              }
            </div>
          }
        </div>
      }
    </div>
  </div>
</div>
  `,
  styles: [`
.quarantine-wrap { padding: 32px; max-width: 1300px; margin: 0 auto; }
.page-header { margin-bottom: 24px; }
.page-header h2 { margin: 0 0 6px; font-size: 1.5rem; color: var(--text-primary); }
.page-header p { margin: 0; color: var(--text-muted); font-size: 0.9rem; }
.quarantine-layout { display: grid; grid-template-columns: 1fr 380px; gap: 24px; }
.map-container { padding: 0; overflow: hidden; position: relative; border-radius: 16px; border: 1px solid var(--border); }
.leaflet-map { width: 100%; height: 550px; background: var(--bg-secondary); }
.map-hint { position: absolute; bottom: 12px; left: 12px; right: 12px; background: rgba(15,23,42,0.85); color: #fff; padding: 8px 12px; border-radius: 8px; font-size: 0.8rem; pointer-events: none; text-align: center; border: 1px solid rgba(255,255,255,0.1); z-index: 999; }
.control-panel { background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px; padding: 20px; display: flex; flex-direction: column; height: 550px; }
.panel-title { font-size: 1rem; font-weight: 700; color: var(--text-primary); margin: 0 0 16px; display: flex; align-items: center; gap: 8px; }
.empty-zones { text-align: center; color: var(--text-muted); padding: 40px 10px; font-size: 0.88rem; line-height: 1.5; }
.zones-scroll { display: flex; flex-direction: column; gap: 12px; overflow-y: auto; flex: 1; }
.zone-card { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 10px; padding: 12px; display: flex; flex-direction: column; gap: 4px; }
.zone-card-header { display: flex; justify-content: space-between; align-items: flex-start; }
.zone-card-header strong { font-size: 0.88rem; color: #ef4444; }
.btn-delete { background: none; border: none; color: var(--text-muted); font-size: 0.72rem; cursor: pointer; font-weight: 700; }
.btn-delete:hover { color: #ef4444; }
.instructions-box { background: var(--bg-card); border-left: 2.5px solid #ef4444; padding: 6px 10px; font-size: 0.8rem; color: var(--text-secondary); border-radius: 4px; }
.create-zone-box { display: flex; flex-direction: column; gap: 14px; height: 100%; }
.box-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 10px; }
.box-header h3 { margin: 0; font-size: 1rem; font-weight: 700; display: flex; align-items: center; gap: 6px; color: var(--text-primary); }
.close-btn-sm { background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 16px; }
.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-group label { font-size: 0.78rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; }
.form-control { padding: 8px 10px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg-primary); color: var(--text-primary); font-size: 0.88rem; }
.btn-primary { background: #ef4444; color: white; border: none; padding: 10px 16px; border-radius: 8px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; }
.btn-primary[disabled] { opacity: 0.6; cursor: not-allowed; }
.w-full { width: 100%; }
.animate-in { animation: fadeIn 0.2s ease; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class ExpQuarantineMapComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('mapEl') mapEl!: ElementRef;

  private readonly api = inject(ExpertApiService);
  private readonly toast = inject(ToastService);
  private readonly cdr = inject(ChangeDetectorRef);

  activeZones = signal<any[]>([]);
  selectedLatLng = signal<L.LatLng | null>(null);

  zoneForm = { title: '', disease: '', radius: 3000, instructions: '' };

  private map: L.Map | null = null;
  private previewCircle: L.Circle | null = null;
  private zoneDrawings: Map<string, L.Circle> = new Map();

  ngOnInit() {
    this.loadZones();
  }

  ngAfterViewInit() {
    this.initMap();
  }

  ngOnDestroy() {
    this.map?.remove();
    this.map = null;
  }

  initMap() {
    if (!this.mapEl?.nativeElement) return;
    this.map = L.map(this.mapEl.nativeElement, { attributionControl: false }).setView([33.8869, 9.5375], 7);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18
    }).addTo(this.map);

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      this.selectedLatLng.set(e.latlng);
      this.updatePreviewCircle();
      this.cdr.markForCheck();
    });
  }

  loadZones() {
    // Quarantine zones are mock-stored inside in-memory array for this demo/session
    // to provide visual features and map drawing
    const mock = [
      { id: '1', title: 'Foyer de Charbon Symptomatique', disease: 'Charbon', radius: 5000, lat: 35.8, lng: 9.9, instructions: 'Confinement strict de tous les bovins de la zone, désinfection des locaux.' },
      { id: '2', title: 'Suspicion de Fièvre Catarrhale', disease: 'FCO', radius: 3000, lat: 36.5, lng: 8.8, instructions: 'Désinsectisation intensive, interdiction de déplacement des ruminants.' }
    ];
    this.activeZones.set(mock);
    setTimeout(() => this.drawAllZones(), 100);
  }

  updatePreviewCircle() {
    if (!this.map || !this.selectedLatLng()) return;
    if (this.previewCircle) { this.previewCircle.remove(); }
    
    this.previewCircle = L.circle(this.selectedLatLng()!, {
      radius: this.zoneForm.radius,
      color: '#ef4444',
      fillColor: '#ef4444',
      fillOpacity: 0.15,
      weight: 1.5,
      dashArray: '5, 5'
    }).addTo(this.map);
  }

  drawAllZones() {
    if (!this.map) return;
    this.zoneDrawings.forEach(c => c.remove());
    this.zoneDrawings.clear();

    for (const z of this.activeZones()) {
      const c = L.circle([z.lat, z.lng], {
        radius: z.radius,
        color: '#ef4444',
        fillColor: '#ef4444',
        fillOpacity: 0.2,
        weight: 2
      }).bindPopup(`<strong>${z.title}</strong><br>Rayon: ${z.radius}m<br><em>${z.instructions}</em>`);
      c.addTo(this.map);
      this.zoneDrawings.set(z.id, c);
    }
  }

  broadcastZone() {
    const latlng = this.selectedLatLng();
    if (!latlng) return;

    const newZone = {
      id: Math.random().toString(36).substr(2, 9),
      title: this.zoneForm.title,
      disease: this.zoneForm.disease,
      radius: this.zoneForm.radius,
      lat: latlng.lat,
      lng: latlng.lng,
      instructions: this.zoneForm.instructions
    };

    this.activeZones.set([...this.activeZones(), newZone]);
    this.selectedLatLng.set(null);
    if (this.previewCircle) { this.previewCircle.remove(); this.previewCircle = null; }
    
    this.drawAllZones();
    this.toast.success('Périmètre de quarantaine actif & alerte diffusée !');
    this.cdr.markForCheck();
  }

  deleteZone(id: string) {
    this.activeZones.set(this.activeZones().filter(z => z.id !== id));
    this.drawAllZones();
    this.toast.info('Zone retirée', 'Le périmètre de sécurité a été levé.');
    this.cdr.markForCheck();
  }
}
