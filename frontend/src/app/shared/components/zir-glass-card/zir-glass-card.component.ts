import {  Component, Input , ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'zir-glass-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './zir-glass-card.component.html',
  styleUrl: './zir-glass-card.component.scss'

})
export class ZirGlassCardComponent {
  @Input() interactive: boolean = false;
}
