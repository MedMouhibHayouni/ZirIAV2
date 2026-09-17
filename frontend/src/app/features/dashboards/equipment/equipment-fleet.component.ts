import {  Component, OnInit, inject, signal , ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideTractor, lucidePlus, lucideTrash2, lucideCheck, lucideX, lucidePower } from '@ng-icons/lucide';
import { FormsModule } from '@angular/forms';

interface Machine { 
  id: string; 
  type: string; 
  brand: string;
  capacity_tonnes?: number;
  daily_rate_tnd: number; 
  available: boolean; 
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-equipment-fleet',
  standalone: true,
  imports: [CommonModule, NgIconComponent, FormsModule],
  providers: [provideIcons({ lucideTractor, lucidePlus, lucideTrash2, lucideCheck, lucideX, lucidePower 
})],
  templateUrl: './equipment-fleet.component.html',
  styleUrl: './equipment-fleet.component.scss'
})
export class EquipmentFleetComponent implements OnInit {
  private http = inject(HttpClient);
  fleet = signal<Machine[]>([]);
  showAddModal = false;

  newMachine = {
    type: '',
    brand: '',
    capacity_tonnes: 0,
    daily_rate_tnd: 0,
    operating_zone: 'Kasserine'
  };

  showEditModal = false;
  editingMachine: Machine | null = null;

  ngOnInit() {
    this.fetchFleet();
  }

  fetchFleet() {
    this.http.get<Machine[]>(`${environment.apiUrl}/equipment/my`).subscribe({
      next: (data) => this.fleet.set(data),
      error: () => {
        this.fleet.set([
          { id: '1', type: 'Tracteur', brand: 'Mahindra', daily_rate_tnd: 150, available: true },
          { id: '2', type: 'Moissonneuse', brand: 'Claas', daily_rate_tnd: 450, available: false }
        ]);
      }
    });
  }

  toggleAvailability(machine: Machine) {
    const newStatus = !machine.available;
    this.http.patch(`${environment.apiUrl}/equipment/${machine.id}/toggle-availability`, {}).subscribe({
      next: () => {
        this.fleet.update(f => f.map(m => m.id === machine.id ? { ...m, available: newStatus } : m));
      }
    });
  }

  addMachine() {
    this.http.post<Machine>(`${environment.apiUrl}/equipment`, this.newMachine).subscribe({
      next: (m) => {
        this.fleet.update(f => [...f, m]);
        this.showAddModal = false;
        this.newMachine = { type: '', brand: '', capacity_tonnes: 0, daily_rate_tnd: 0, operating_zone: 'Kasserine' };
      }
    });
  }

  openEdit(machine: Machine) {
    this.editingMachine = { ...machine };
    this.showEditModal = true;
  }

  saveEdit() {
    if (!this.editingMachine) return;
    this.http.patch<Machine>(`${environment.apiUrl}/equipment/${this.editingMachine.id}`, this.editingMachine).subscribe({
      next: (m) => {
        this.fleet.update(f => f.map(x => x.id === m.id ? m : x));
        this.showEditModal = false;
        this.editingMachine = null;
      }
    });
  }
}
