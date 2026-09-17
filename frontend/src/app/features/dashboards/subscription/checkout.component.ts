import { Component, ChangeDetectionStrategy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { 
  lucideCheckCircle2, lucideCreditCard, lucideBuilding2, lucideShieldCheck,
  lucideArrowRight, lucideArrowLeft, lucideZap, lucideLeaf, lucideCrown, lucideLandmark
} from '@ng-icons/lucide';
import { AuthService } from '../../../core/services/auth.service';
import { AuthStore } from '../../../core/state/auth.store';

@Component({
  selector: 'app-subscription-checkout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NgIconComponent],
  providers: [provideIcons({
    lucideCheckCircle2, lucideCreditCard, lucideBuilding2, lucideShieldCheck,
    lucideArrowRight, lucideArrowLeft, lucideZap, lucideLeaf, lucideCrown, lucideLandmark
  })],
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.scss'
})
export class SubscriptionCheckoutComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);
  private authStore = inject(AuthStore);

  step = signal<number>(1);
  selectedPlanCode = signal<string>('PRO');
  paymentMethod = signal<string>('card');
  loading = signal<boolean>(false);

  // Billing form
  companyName = '';
  taxId = '';
  address = '';

  plans = [
    { code: 'STARTER', name: 'Starter', price: '29 TND', icon: 'lucideZap', color: '#1e40af' },
    { code: 'PRO', name: 'Pro', price: '79 TND', icon: 'lucideShieldCheck', color: '#047857' },
    { code: 'BUSINESS', name: 'Business', price: '199 TND', icon: 'lucideCrown', color: '#6d28d9' }
  ];

  selectedPlan = computed(() => {
    return this.plans.find(p => p.code === this.selectedPlanCode()) || this.plans[1];
  });

  constructor() {
    this.route.queryParams.subscribe(params => {
      if (params['plan'] && this.plans.find(p => p.code === params['plan'])) {
        this.selectedPlanCode.set(params['plan']);
      }
    });
  }

  nextStep() {
    if (this.step() < 4) {
      this.step.set(this.step() + 1);
    }
  }

  prevStep() {
    if (this.step() > 1) {
      this.step.set(this.step() - 1);
    }
  }

  confirmPayment() {
    this.loading.set(true);
    // Simulate API call delay
    setTimeout(() => {
      const user = this.authService.currentUser();
      if (user) {
        // Update local state to reflect new subscription
        this.authStore.setSession(this.authStore.token() || '', {
          ...user,
          plan: this.selectedPlanCode()
        } as any);
      }
      this.loading.set(false);
      this.step.set(4); // Success step
    }, 2000);
  }

  returnToDashboard() {
    this.router.navigate(['/dashboard']);
  }
}
