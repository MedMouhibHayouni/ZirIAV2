import {  Component, Input , ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'zir-badge',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './zir-badge.component.html',
  styleUrl: './zir-badge.component.scss'

})
export class ZirBadgeComponent {
  @Input() variant: 'active' | 'warning' = 'active';
}
