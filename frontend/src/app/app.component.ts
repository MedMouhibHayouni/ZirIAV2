import {  Component , ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { UpgradeModalComponent } from './shared/components/upgrade-modal/upgrade-modal.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, UpgradeModalComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'

})
export class AppComponent {
  title = 'frontend';
}
