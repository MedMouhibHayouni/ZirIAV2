import { Routes } from '@angular/router';
import { LandingComponent } from './features/landing/landing.component';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';
import { PwaMobileLayoutComponent } from './layout/pwa-mobile-layout/pwa-mobile-layout.component';

// Admin Components
import { AdminOverviewComponent } from './features/dashboards/admin/admin-overview.component';
import { AdminUsersComponent } from './features/dashboards/admin/admin-users.component';
import { AdminTransactionsComponent } from './features/dashboards/admin/admin-transactions.component';
import { AdminSystemComponent } from './features/dashboards/admin/admin-system.component';
import { AdminExpertsComponent } from './features/dashboards/admin/admin-experts.component';

// SMSA Components
import { SmsaOverviewComponent } from './features/dashboards/smsa/smsa-overview.component';
import { SmsaMembersComponent } from './features/dashboards/smsa/smsa-members.component';
import { SmsaParcelsComponent } from './features/dashboards/smsa/smsa-parcels.component';
import { SmsaMarketplaceComponent } from './features/dashboards/smsa/smsa-marketplace.component';
import { SmsaAlertsComponent } from './features/dashboards/smsa/smsa-alerts.component';

// B2B Components
import { B2bSourcingComponent } from './features/dashboards/b2b/b2b-sourcing.component';
import { B2bContractsComponent } from './features/dashboards/b2b/b2b-contracts.component';
import { B2bInsightsComponent } from './features/dashboards/b2b/b2b-insights.component';

// Equipment Components
import { EquipmentFleetComponent } from './features/dashboards/equipment/equipment-fleet.component';
import { EquipmentCalendarComponent } from './features/dashboards/equipment/equipment-calendar.component';
import { EquipmentRequestsComponent } from './features/dashboards/equipment/equipment-requests.component';
import { EquipmentRevenueComponent } from './features/dashboards/equipment/equipment-revenue.component';

// Expert Components (Lazy loaded)

// Ambassador Components
import { AmbassadorDashboardComponent } from './features/dashboards/ambassador/ambassador-dashboard.component';

import { roleGuard, authGuard, dashboardRedirectGuard } from './core/guards/role.guard';

export const routes: Routes = [
  // Public
  { path: '', component: LandingComponent },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent)
  },
  {
    path: 'onboarding/activity',
    canActivate: [authGuard],
    loadComponent: () => import('./features/auth/farmer-activity-onboarding/farmer-activity-onboarding.component').then(m => m.FarmerActivityOnboardingComponent)
  },
  {
    path: 'unauthorized',
    loadComponent: () => import('./features/auth/unauthorized/unauthorized.component').then(m => m.UnauthorizedComponent)
  },
  {
    path: 'marketplace',
    loadComponent: () => import('./features/marketplace/public-marketplace.component').then(m => m.PublicMarketplaceComponent)
  },
  {
    path: 'marketplace/:id',
    loadComponent: () => import('./features/marketplace/public-marketplace.component').then(m => m.PublicMarketplaceComponent)
  },
  {
    path: 'suppliers',
    loadComponent: () => import('./features/suppliers/supplier-directory.component').then(m => m.SupplierDirectoryComponent)
  },
  {
    path: 'suppliers/:id',
    loadComponent: () => import('./features/suppliers/supplier-vitrine.component').then(m => m.SupplierVitrinePublicComponent)
  },
  {
    path: 'know-my-plant',
    loadComponent: () => import('./features/landing/know-my-plant/know-my-plant.component').then(m => m.KnowMyPlantComponent)
  },

  {
    path: 'profil-travailleur/:workerId',
    loadComponent: () => import('./features/dashboards/shared/worker-profile-view.component').then(m => m.WorkerProfileViewComponent)
  },

  // ─── Dashboards MainLayout (Sidebar + Topbar) ───────────────────────────────
  {
    path: 'dashboard',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'subscription/checkout',
        loadComponent: () => import('./features/dashboards/subscription/checkout.component').then(m => m.SubscriptionCheckoutComponent)
      },
      {
        path: 'profile',
        loadComponent: () => import('./features/dashboards/profile/profile-settings.component').then(m => m.ProfileSettingsComponent)
      },
      {
        path: 'feed',
        data: { fullBleed: true },
        loadComponent: () => import('./features/zirfeed/zirfeed.component').then(m => m.ZirFeedComponent)
      },
      {
        path: 'admin',
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] },
        children: [
          { path: 'overview', component: AdminOverviewComponent },
          { path: 'users', component: AdminUsersComponent },
          { path: 'experts', component: AdminExpertsComponent },
          { path: 'transactions', component: AdminTransactionsComponent },
          { path: 'system', component: AdminSystemComponent },
          { path: '', redirectTo: 'overview', pathMatch: 'full' }
        ]
      },
      {
        path: 'smsa',
        canActivate: [roleGuard],
        data: { roles: ['COOP_PRESIDENT', 'ADMIN'] },
        children: [
          { path: 'overview', component: SmsaOverviewComponent },
          { path: 'members', component: SmsaMembersComponent },
          { path: 'parcels', component: SmsaParcelsComponent },
          { path: 'marketplace', component: SmsaMarketplaceComponent },
          { path: 'alerts', component: SmsaAlertsComponent },
          { path: '', redirectTo: 'overview', pathMatch: 'full' }
        ]
      },

      {
        path: 'b2b',
        canActivate: [roleGuard],
        data: { roles: ['B2B_BUYER', 'ADMIN'] },
        children: [
          { path: 'sourcing', component: B2bSourcingComponent },
          { path: 'contracts', component: B2bContractsComponent },
          { path: 'insights', component: B2bInsightsComponent },
          { path: '', redirectTo: 'sourcing', pathMatch: 'full' }
        ]
      },
      {
        path: 'equipment',
        canActivate: [roleGuard],
        data: { roles: ['EQUIP_OWNER', 'ADMIN'] },
        children: [
          { path: 'fleet', component: EquipmentFleetComponent },
          { path: 'calendar', component: EquipmentCalendarComponent },
          { path: 'requests', component: EquipmentRequestsComponent },
          { path: 'revenue', component: EquipmentRevenueComponent },
          { path: '', redirectTo: 'calendar', pathMatch: 'full' }
        ]
      },
      {
        path: 'farmer',
        canActivate: [roleGuard],
        data: { roles: ['FARMER', 'ADMIN'] },
        children: [
          { path: 'dashboard', loadComponent: () => import('./features/dashboards/farmer/farmer-overview.component').then(m => m.FarmerOverviewComponent) },
          { path: 'analytics', loadComponent: () => import('./features/dashboards/farmer/farmer-crops.component').then(m => m.FarmerCropsComponent) },
          { path: 'agent', data: { fullBleed: true }, loadComponent: () => import('./features/dashboards/farmer/farmer-agent.component').then(m => m.FarmerAgentComponent) },
          { path: 'map', data: { fullBleed: true }, loadComponent: () => import('./features/map/parcel-map.component').then(m => m.ParcelMapComponent) },
          { path: 'diagnostic', loadComponent: () => import('./features/dashboards/farmer/farmer-diagnostic.component').then(m => m.FarmerDiagnosticComponent) },
          { path: 'erp', loadComponent: () => import('./features/dashboards/farmer/farmer-erp.component').then(m => m.FarmerErpComponent),
            children: [
              { path: '', loadComponent: () => import('./features/dashboards/farmer/farmer-erp-dashboard.component').then(m => m.FarmerErpDashboardComponent) },
              { path: 'stock', loadComponent: () => import('./features/dashboards/farmer/farmer-erp-stock.component').then(m => m.FarmerErpStockComponent) },
              { path: 'finance', loadComponent: () => import('./features/dashboards/farmer/farmer-erp-finance.component').then(m => m.FarmerErpFinanceComponent) },
            ]
          },
          { path: 'services', loadComponent: () => import('./features/dashboards/farmer/farmer-services-hub.component').then(m => m.FarmerServicesHubComponent) },
          { path: 'alerts', loadComponent: () => import('./features/dashboards/farmer/farmer-alerts.component').then(m => m.FarmerAlertsComponent) },
          { path: 'marketplace', loadComponent: () => import('./features/dashboards/farmer/farmer-marketplace.component').then(m => m.FarmerMarketplaceComponent) },
          { path: 'supplies', loadComponent: () => import('./features/dashboards/farmer/farmer-supplies.component').then(m => m.FarmerSuppliesComponent) },
          { path: 'discover', loadComponent: () => import('./features/dashboards/farmer/farmer-discover-experts.component').then(m => m.FarmerDiscoverExpertsComponent) },
          { path: 'mes-experts', loadComponent: () => import('./features/dashboards/farmer/farmer-mes-experts.component').then(m => m.FarmerMesExpertsComponent) },
          { path: 'messages', loadComponent: () => import('./features/dashboards/farmer/farmer-messages.component').then(m => m.FarmerMessagesComponent) },
          {
            path: 'experts',
            loadComponent: () => import('./features/dashboards/farmer/farmer-expert-hub.component').then(m => m.FarmerExpertHubComponent),
            children: [
              { path: 'discover', loadComponent: () => import('./features/dashboards/farmer/farmer-discover-experts.component').then(m => m.FarmerDiscoverExpertsComponent) },
              { path: 'mes-experts', loadComponent: () => import('./features/dashboards/farmer/farmer-mes-experts.component').then(m => m.FarmerMesExpertsComponent) },
              { path: 'messages', loadComponent: () => import('./features/dashboards/farmer/farmer-messages.component').then(m => m.FarmerMessagesComponent) },
              { path: '', redirectTo: 'discover', pathMatch: 'full' }
            ]
          },
          { path: 'contrats', loadComponent: () => import('./features/dashboards/shared/contract-inbox.component').then(m => m.ContractInboxComponent) },
          { path: 'cheptel', loadComponent: () => import('./features/dashboards/farmer/farmer-cheptel.component').then(m => m.FarmerCheptelComponent) },
          { path: 'animal-diagnostic', loadComponent: () => import('./features/dashboards/farmer/farmer-animal-diagnostic.component').then(m => m.FarmerAnimalDiagnosticComponent) },
          { path: 'apiculture', loadComponent: () => import('./features/dashboards/farmer/farmer-apiculture.component').then(m => m.FarmerApicultureComponent) },
          { path: 'consentements', loadComponent: () => import('./features/dashboards/farmer/consent-center.component').then(m => m.ConsentCenterComponent) },
          { path: 'charte-donnees', loadComponent: () => import('./features/dashboards/farmer/data-charter.component').then(m => m.DataCharterComponent) },
          { path: 'dossiers', loadComponent: () => import('./features/dashboards/farmer/farmer-dossiers.component').then(m => m.FarmerDossiersComponent) },
          { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
        ]
      },
      {
        path: 'contracts/:contractId',
        canActivate: [roleGuard],
        data: { roles: ['FARMER', 'WORKER', 'DRIVER', 'EQUIP_OWNER', 'ADMIN'] },
        loadComponent: () => import('./features/dashboards/shared/contract-detail.component').then(m => m.ContractDetailComponent)
      },
      {
        path: 'negotiation/:negotiationId',
        canActivate: [roleGuard],
        data: { roles: ['FARMER', 'WORKER', 'ADMIN'] },
        loadComponent: () => import('./features/dashboards/shared/mission-negotiation.component').then(m => m.MissionNegotiationComponent)
      },
      {
        path: 'evaluate/:contractId',
        canActivate: [roleGuard],
        data: { roles: ['FARMER', 'ADMIN'] },
        loadComponent: () => import('./features/dashboards/shared/mission-evaluation-form.component').then(m => m.MissionEvaluationFormComponent)
      },
      {
        path: 'equipment-owner',
        canActivate: [roleGuard],
        data: { roles: ['EQUIP_OWNER', 'ADMIN'] },
        children: [
          { path: 'rentals', loadComponent: () => import('./features/dashboards/equipment-owner/equipment-owner-rentals.component').then(m => m.EquipmentOwnerRentalsComponent) },
          { path: 'contrats', loadComponent: () => import('./features/dashboards/shared/contract-inbox.component').then(m => m.ContractInboxComponent) },
          { path: '', redirectTo: 'rentals', pathMatch: 'full' }
        ]
      },
      {
        path: 'storage',
        canActivate: [roleGuard],
        data: { roles: ['EQUIP_OWNER', 'ADMIN'] },
        children: [
          { path: 'overview', loadComponent: () => import('./features/dashboards/storage/storage-overview.component').then(m => m.StorageOverviewComponent) },
          { path: 'rooms', loadComponent: () => import('./features/dashboards/storage/storage-rooms.component').then(m => m.StorageRoomsComponent) },
          { path: 'reservations', loadComponent: () => import('./features/dashboards/storage/storage-reservations.component').then(m => m.StorageReservationsComponent) },
          { path: 'revenue', loadComponent: () => import('./features/dashboards/storage/storage-revenue.component').then(m => m.StorageRevenueComponent) },
          { path: 'facility', loadComponent: () => import('./features/dashboards/storage/storage-facility.component').then(m => m.StorageFacilityComponent) },
          { path: '', redirectTo: 'overview', pathMatch: 'full' }
        ]
      },
      {
        path: 'apia',
        canActivate: [roleGuard],
        data: { roles: ['INSTITUTION', 'ADMIN'] },
        children: [
          { path: 'overview', loadComponent: () => import('./features/dashboards/apia/apia-dashboard.component').then(m => m.ApiaDashboardComponent) },
          { path: 'dossiers', loadComponent: () => import('./features/dashboards/apia/apia-dossiers.component').then(m => m.ApiaDossiersComponent) },
          { path: 'agriculteurs', loadComponent: () => import('./features/dashboards/apia/apia-farmer-lookup.component').then(m => m.ApiaFarmerLookupComponent) },
          { path: 'consentements', loadComponent: () => import('./features/dashboards/apia/apia-consent-audit.component').then(m => m.ApiaConsentAuditComponent) },
          { path: 'credit', loadComponent: () => import('./features/dashboards/apia/apia-credit.component').then(m => m.ApiaCreditComponent) },
          { path: 'projets', loadComponent: () => import('./features/dashboards/apia/apia-projects.component').then(m => m.ApiaProjectsComponent) },
          { path: 'porteurs', loadComponent: () => import('./features/dashboards/apia/apia-porteurs.component').then(m => m.ApiaPorteursComponent) },
          { path: 'opportunites', loadComponent: () => import('./features/dashboards/apia/apia-opportunites.component').then(m => m.ApiaOpportunitesComponent) },
          { path: 'calendrier', loadComponent: () => import('./features/dashboards/apia/apia-calendrier.component').then(m => m.ApiaCalendrierComponent) },
          { path: 'messages', data: { fullBleed: true }, loadComponent: () => import('./features/dashboards/apia/apia-messages.component').then(m => m.ApiaMessagesComponent) },
          { path: 'documents', loadComponent: () => import('./features/dashboards/apia/apia-dashboard.component').then(m => m.ApiaDashboardComponent) },
          { path: 'rapports', loadComponent: () => import('./features/dashboards/apia/apia-dashboard.component').then(m => m.ApiaDashboardComponent) },
          { path: 'mon-bureau', loadComponent: () => import('./features/dashboards/apia/apia-mon-bureau.component').then(m => m.ApiaMonBureauComponent) },
          { path: '', redirectTo: 'overview', pathMatch: 'full' }
        ]
      },
      {
        path: 'crda',
        canActivate: [roleGuard],
        data: { roles: ['INSTITUTION', 'ADMIN'] },
        children: [
          { path: 'overview', loadComponent: () => import('./features/dashboards/crda/crda-dashboard.component').then(m => m.CrdaDashboardComponent) },
          { path: 'dossiers', loadComponent: () => import('./features/dashboards/crda/crda-dossiers.component').then(m => m.CrdaDossiersComponent) },
          { path: 'agriculteurs', loadComponent: () => import('./features/dashboards/crda/crda-farmer-lookup.component').then(m => m.CrdaFarmerLookupComponent) },
          { path: 'consentements', loadComponent: () => import('./features/dashboards/crda/crda-consent-audit.component').then(m => m.CrdaConsentAuditComponent) },
          { path: 'carte', loadComponent: () => import('./features/dashboards/crda/crda-territory-map.component').then(m => m.CrdaTerritoryMapComponent) },
          { path: 'campagnes', loadComponent: () => import('./features/dashboards/crda/crda-campaigns.component').then(m => m.CrdaCampaignsComponent) },
          { path: 'alertes', loadComponent: () => import('./features/dashboards/crda/crda-dashboard.component').then(m => m.CrdaDashboardComponent) },
          { path: 'demandes', loadComponent: () => import('./features/dashboards/crda/crda-service-requests.component').then(m => m.CrdaServiceRequestsComponent) },
          { path: 'subventions', loadComponent: () => import('./features/dashboards/crda/crda-subventions.component').then(m => m.CrdaSubventionsComponent) },
          { path: 'eau', loadComponent: () => import('./features/dashboards/crda/crda-dashboard.component').then(m => m.CrdaDashboardComponent) },
          { path: 'agents', loadComponent: () => import('./features/dashboards/crda/crda-dashboard.component').then(m => m.CrdaDashboardComponent) },
          { path: 'annonces', loadComponent: () => import('./features/dashboards/crda/crda-dashboard.component').then(m => m.CrdaDashboardComponent) },
          { path: 'messages', loadComponent: () => import('./features/dashboards/crda/crda-dashboard.component').then(m => m.CrdaDashboardComponent) },
          { path: 'rapports', loadComponent: () => import('./features/dashboards/crda/crda-dashboard.component').then(m => m.CrdaDashboardComponent) },
          { path: 'mon-bureau', loadComponent: () => import('./features/dashboards/crda/crda-mon-bureau.component').then(m => m.CrdaMonBureauComponent) },
          { path: '', redirectTo: 'overview', pathMatch: 'full' }
        ]
      },
      {
        path: 'ambassador',
        canActivate: [roleGuard],
        data: { roles: ['FARMER_AMBASSADOR', 'ADMIN'], fullBleed: true },
        loadComponent: () => import('./features/dashboards/ambassador/ambassador-shell.component').then(m => m.AmbassadorShellComponent),
        children: [
          { path: 'overview',      loadComponent: () => import('./features/dashboards/ambassador/amb-overview.component').then(m => m.AmbOverviewComponent) },
          { path: 'farmers',       loadComponent: () => import('./features/dashboards/ambassador/amb-farmers.component').then(m => m.AmbFarmersComponent) },
          { path: 'map',           loadComponent: () => import('./features/dashboards/ambassador/amb-map.component').then(m => m.AmbMapComponent) },
          { path: 'alerts',        loadComponent: () => import('./features/dashboards/ambassador/amb-alerts.component').then(m => m.AmbAlertsComponent) },
          { path: 'diagnostics',   loadComponent: () => import('./features/dashboards/ambassador/amb-diagnostics.component').then(m => m.AmbDiagnosticsComponent) },
          { path: 'field-reports', loadComponent: () => import('./features/dashboards/ambassador/amb-field-reports.component').then(m => m.AmbFieldReportsComponent) },
          { path: 'messages',      loadComponent: () => import('./features/dashboards/ambassador/amb-messages.component').then(m => m.AmbMessagesComponent) },
          { path: 'onboarding',    loadComponent: () => import('./features/dashboards/ambassador/amb-onboarding.component').then(m => m.AmbOnboardingComponent) },
          { path: 'certifications', loadComponent: () => import('./features/dashboards/ambassador/amb-certifications.component').then(m => m.AmbCertificationsComponent) },
          { path: '', redirectTo: 'overview', pathMatch: 'full' },
        ]
      },
      {
        path: 'expert',
        canActivate: [roleGuard],
        data: { roles: ['EXPERT', 'ADMIN'], fullBleed: true },
        loadComponent: () => import('./features/dashboards/expert/expert-shell.component').then(m => m.ExpertShellComponent),
        children: [
          { path: 'overview', loadComponent: () => import('./features/dashboards/expert/exp-overview.component').then(m => m.ExpOverviewComponent) },
          { path: 'cases',    loadComponent: () => import('./features/dashboards/expert/exp-cases.component').then(m => m.ExpCasesComponent) },
          { path: 'heatmap',  loadComponent: () => import('./features/dashboards/expert/exp-heatmap.component').then(m => m.ExpHeatmapComponent) },
          { path: 'mes-agriculteurs', loadComponent: () => import('./features/dashboards/expert/exp-farmers.component').then(m => m.ExpFarmersComponent) },
          { path: 'alerts',   loadComponent: () => import('./features/dashboards/expert/exp-alerts.component').then(m => m.ExpAlertsComponent) },
          { path: 'prescriptions', loadComponent: () => import('./features/dashboards/expert/exp-prescriptions.component').then(m => m.ExpPrescriptionsComponent) },
          { path: 'consultations', loadComponent: () => import('./features/dashboards/expert/exp-consultations.component').then(m => m.ExpConsultationsComponent) },
          { path: 'messages', loadComponent: () => import('./features/dashboards/expert/exp-messages.component').then(m => m.ExpMessagesComponent) },
          { path: 'revenus',  loadComponent: () => import('./features/dashboards/expert/exp-revenus.component').then(m => m.ExpRevenusComponent) },
          { path: 'profil',   loadComponent: () => import('./features/dashboards/expert/expert-profile-manager.component').then(m => m.ExpertProfileManagerComponent) },
          { path: 'cahiers-culture', loadComponent: () => import('./features/dashboards/expert/exp-crop-journal.component').then(m => m.ExpCropJournalComponent) },
          { path: 'analyses-sol', loadComponent: () => import('./features/dashboards/expert/exp-soil-analysis.component').then(m => m.ExpSoilAnalysisComponent) },
          { path: 'projets-irrigation', loadComponent: () => import('./features/dashboards/expert/exp-water-projects.component').then(m => m.ExpWaterProjectsComponent) },
          { path: 'calcul-eau', loadComponent: () => import('./features/dashboards/expert/exp-water-calculator.component').then(m => m.ExpWaterCalculatorComponent) },
          { path: 'carte-puits', loadComponent: () => import('./features/dashboards/expert/exp-wells.component').then(m => m.ExpWellsComponent) },
          { path: 'stratigraphie', loadComponent: () => import('./features/dashboards/expert/exp-overview.component').then(m => m.ExpOverviewComponent) },
          { path: 'piezometrie', loadComponent: () => import('./features/dashboards/expert/exp-piezometry.component').then(m => m.ExpPiezometryComponent) },
          { path: 'mes-elevages', loadComponent: () => import('./features/dashboards/expert/exp-herd.component').then(m => m.ExpHerdComponent) },
          { path: 'calcul-rations', loadComponent: () => import('./features/dashboards/expert/exp-herd.component').then(m => m.ExpHerdComponent) },
          { path: 'calendrier-repro', loadComponent: () => import('./features/dashboards/expert/exp-reproduction-calendar.component').then(m => m.ExpReproductionCalendarComponent) },
          { path: 'dossiers-cliniques', loadComponent: () => import('./features/dashboards/expert/exp-clinical-dossiers.component').then(m => m.ExpClinicalDossiersComponent) },
          { path: 'vaccinations', loadComponent: () => import('./features/dashboards/expert/exp-vaccination.component').then(m => m.ExpVaccinationComponent) },
          { path: 'carte-quarantaine', loadComponent: () => import('./features/dashboards/expert/exp-quarantine-map.component').then(m => m.ExpQuarantineMapComponent) },
          { path: 'public-profile/:expertId', loadComponent: () => import('./features/dashboards/expert/expert-public-profile.component').then(m => m.ExpertPublicProfileComponent) },
          { path: '', redirectTo: 'overview', pathMatch: 'full' },
        ]
      },
      {
        path: 'worker',
        canActivate: [roleGuard],
        data: { roles: ['WORKER', 'ADMIN'] },
        children: [
          { path: 'profile', loadComponent: () => import('./features/dashboards/worker/worker-profile.component').then(m => m.WorkerProfileComponent) },
          { path: 'jobs', loadComponent: () => import('./features/dashboards/worker/worker-jobs.component').then(m => m.WorkerJobsComponent) },
          { path: 'missions', loadComponent: () => import('./features/dashboards/worker/worker-missions.component').then(m => m.WorkerMissionsComponent) },
          { path: 'earnings', loadComponent: () => import('./features/dashboards/worker/worker-earnings.component').then(m => m.WorkerEarningsComponent) },
          { path: 'notifications', loadComponent: () => import('./features/dashboards/worker/worker-notifications.component').then(m => m.WorkerNotificationsComponent) },
          { path: 'contrats',      loadComponent: () => import('./features/dashboards/shared/contract-inbox.component').then(m => m.ContractInboxComponent) },
          { path: '', redirectTo: 'profile', pathMatch: 'full' }
        ]
      },
      {
        path: 'driver',
        canActivate: [roleGuard],
        data: { roles: ['DRIVER', 'ADMIN'] },
        children: [
          { path: 'profil',        loadComponent: () => import('./features/dashboards/driver/driver-profile.component').then(m => m.DriverProfileComponent) },
          { path: 'missions',      loadComponent: () => import('./features/dashboards/driver/driver-missions.component').then(m => m.DriverMissionsComponent) },
          { path: 'en-cours',      loadComponent: () => import('./features/dashboards/driver/driver-current.component').then(m => m.DriverCurrentComponent) },
          { path: 'historique',    loadComponent: () => import('./features/dashboards/driver/driver-history.component').then(m => m.DriverHistoryComponent) },
          { path: 'revenus',       loadComponent: () => import('./features/dashboards/driver/driver-earnings.component').then(m => m.DriverEarningsComponent) },
          { path: 'notifications', loadComponent: () => import('./features/dashboards/driver/driver-notifications.component').then(m => m.DriverNotificationsComponent) },
          { path: 'vehicles',      loadComponent: () => import('./features/dashboards/driver/driver-vehicles.component').then(m => m.DriverVehiclesComponent) },
          { path: 'contrats',      loadComponent: () => import('./features/dashboards/shared/contract-inbox.component').then(m => m.ContractInboxComponent) },
          { path: '',              redirectTo: 'profil', pathMatch: 'full' }
        ]
      },
      {
        path: 'supplier',
        canActivate: [roleGuard],
        data: { roles: ['SUPPLIER', 'ADMIN'] },
        children: [
          { path: 'overview', loadComponent: () => import('./features/dashboards/supplier/supplier-overview.component').then(m => m.SupplierOverviewComponent) },
          { path: 'catalog', loadComponent: () => import('./features/dashboards/supplier/supplier-catalog.component').then(m => m.SupplierCatalogComponent) },
          { path: 'orders', loadComponent: () => import('./features/dashboards/supplier/supplier-orders.component').then(m => m.SupplierOrdersComponent) },
          { path: 'crm', loadComponent: () => import('./features/dashboards/supplier/supplier-crm.component').then(m => m.SupplierCrmComponent) },
          { path: 'promotions', loadComponent: () => import('./features/dashboards/supplier/supplier-promotions.component').then(m => m.SupplierPromotionsComponent) },
          { path: 'vitrine', loadComponent: () => import('./features/dashboards/supplier/supplier-vitrine-editor.component').then(m => m.SupplierVitrineEditorComponent) },
          { path: 'mon-bureau', loadComponent: () => import('./features/dashboards/supplier/supplier-mon-bureau/supplier-mon-bureau.component').then(m => m.SupplierMonBureauComponent) },
          { path: 'analytics', loadComponent: () => import('./features/dashboards/supplier/supplier-analytics.component').then(m => m.SupplierAnalyticsComponent) },
          { path: 'subscription', loadComponent: () => import('./features/dashboards/supplier/supplier-subscription.component').then(m => m.SupplierSubscriptionComponent) },
          { path: 'settings', loadComponent: () => import('./features/dashboards/supplier/supplier-settings.component').then(m => m.SupplierSettingsComponent) },
          { path: '', redirectTo: 'overview', pathMatch: 'full' }
        ]
      },
      {
        path: 'land_owner',
        canActivate: [roleGuard],
        data: { roles: ['LAND_OWNER', 'ADMIN'] },
        children: [
          { path: 'overview', loadComponent: () => import('./features/dashboards/land-owner/land-owner-dashboard.component').then(m => m.LandOwnerDashboardComponent) },
          { path: 'lands', loadComponent: () => import('./features/dashboards/land-owner/land-owner-lands.component').then(m => m.LandOwnerLandsComponent) },
          { path: 'auctions', loadComponent: () => import('./features/dashboards/land-owner/land-owner-auctions.component').then(m => m.LandOwnerAuctionsComponent) },
          { path: 'offers', loadComponent: () => import('./features/dashboards/land-owner/land-owner-offers.component').then(m => m.LandOwnerOffersComponent) },
          { path: '', redirectTo: 'lands', pathMatch: 'full' }
        ]
      },
      { path: '', canActivate: [dashboardRedirectGuard], children: [] },
      {
        path: 'storage',
        canActivate: [roleGuard],
        data: { roles: ['EQUIP_OWNER', 'ADMIN'] },
        children: [
          { path: 'overview',      loadComponent: () => import('./features/dashboards/storage/storage-overview.component').then(m => m.StorageOverviewComponent) },
          { path: 'clients',       loadComponent: () => import('./features/dashboards/storage/storage-clients.component').then(m => m.StorageClientsComponent) },
          { path: 'rooms',         loadComponent: () => import('./features/dashboards/storage/storage-rooms.component').then(m => m.StorageRoomsComponent) },
          { path: 'reservations',  loadComponent: () => import('./features/dashboards/storage/storage-reservations.component').then(m => m.StorageReservationsComponent) },
          { path: 'revenue',       loadComponent: () => import('./features/dashboards/storage/storage-revenue.component').then(m => m.StorageRevenueComponent) },
          { path: 'facility',      loadComponent: () => import('./features/dashboards/storage/storage-facility.component').then(m => m.StorageFacilityComponent) },
          { path: 'ledger',        loadComponent: () => import('./features/dashboards/storage/storage-ledger.component').then(m => m.StorageLedgerComponent) },
          { path: '',              redirectTo: 'overview', pathMatch: 'full' }
        ]
      },
      // ─── APIA Institution Dashboard ────────────────────────────────────────
      {
        path: 'apia',
        canActivate: [roleGuard],
        data: { roles: ['INSTITUTION', 'ADMIN'] },
        children: [
          { path: 'overview',    loadComponent: () => import('./features/dashboards/apia/apia-dashboard.component').then(m => m.ApiaDashboardComponent) },
          { path: 'dossiers',    loadComponent: () => import('./features/dashboards/apia/apia-dossiers.component').then(m => m.ApiaDossiersComponent) },
          { path: 'agriculteurs',loadComponent: () => import('./features/dashboards/apia/apia-farmer-lookup.component').then(m => m.ApiaFarmerLookupComponent) },
          { path: 'consentements',loadComponent: () => import('./features/dashboards/apia/apia-consent-audit.component').then(m => m.ApiaConsentAuditComponent) },
          { path: '',            redirectTo: 'overview', pathMatch: 'full' }
        ]
      },
      // ─── CRDA Institution Dashboard ────────────────────────────────────────
      {
        path: 'crda',
        canActivate: [roleGuard],
        data: { roles: ['INSTITUTION', 'ADMIN'] },
        children: [
          { path: 'overview',    loadComponent: () => import('./features/dashboards/crda/crda-dashboard.component').then(m => m.CrdaDashboardComponent) },
          { path: 'dossiers',    loadComponent: () => import('./features/dashboards/crda/crda-dossiers.component').then(m => m.CrdaDossiersComponent) },
          { path: 'agriculteurs',loadComponent: () => import('./features/dashboards/crda/crda-farmer-lookup.component').then(m => m.CrdaFarmerLookupComponent) },
          { path: 'consentements',loadComponent: () => import('./features/dashboards/crda/crda-consent-audit.component').then(m => m.CrdaConsentAuditComponent) },
          { path: '',            redirectTo: 'overview', pathMatch: 'full' }
        ]
      }
    ]
  },

  // Catch-all
  { path: '**', redirectTo: '' }
];
