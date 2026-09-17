import {  Component, Input , ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'zir-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './zir-button.component.html',
  styleUrl: './zir-button.component.scss'

})
export class ZirButtonComponent {
  @Input() variant: 'primary' | 'glass' | 'danger' = 'primary';
  @Input() disabled: boolean = false;
}
