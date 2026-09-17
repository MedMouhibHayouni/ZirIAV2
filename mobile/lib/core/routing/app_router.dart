import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../features/auth/providers/auth_notifier.dart';
// Auth
import '../../features/auth/presentation/splash_screen.dart';
import '../../features/auth/presentation/login_screen.dart';
import '../../features/auth/presentation/register_screen.dart';
// Farmer
import '../../features/farmer/shell/farmer_shell.dart';
import '../../features/farmer/agent/views/agent_chat_screen.dart';
import '../../features/farmer/parcels/views/parcel_intelligence_screen.dart';
import '../../features/farmer/diagnostic/views/diagnostic_screen.dart';
import '../../features/farmer/erp/views/finance_screen.dart';
import '../../features/farmer/alerts/views/alerts_screen.dart';
// Coop
import '../../features/coop/shell/coop_shell.dart';
import '../../features/coop/dashboard/coop_dashboard_screen.dart';
import '../../features/coop/members/members_screen.dart';
import '../../features/coop/marketplace/coop_marketplace_screen.dart';
// Expert
import '../../features/expert/shell/expert_shell.dart';
import '../../features/expert/heatmap/expert_heatmap_screen.dart';
import '../../features/expert/validations/expert_validations_screen.dart';
import '../../features/expert/reports/expert_reports_screen.dart';
// Equipment
import '../../features/equip/shell/equip_shell.dart';
import '../../features/equip/inventory/equip_inventory_screen.dart';
import '../../features/equip/rentals/equip_rentals_screen.dart';
// Worker
import '../../features/worker/shell/worker_shell.dart';
import '../../features/worker/jobs/worker_jobs_screen.dart';
import '../../features/worker/applications/worker_applications_screen.dart';
// Driver
import '../../features/driver/shell/driver_shell.dart';
import '../../features/driver/missions/driver_missions_screen.dart';
import '../../features/driver/logbook/driver_logbook_screen.dart';
// Admin
import '../../features/admin/shell/admin_shell.dart';
import '../../features/admin/dashboard/admin_dashboard_screen.dart';

import '../../features/land_owner/shell/land_owner_shell.dart';
import '../../features/land_owner/dashboard/land_owner_dashboard_screen.dart';
import '../../features/land_owner/lands/land_owner_lands_screen.dart';
import '../../features/land_owner/auctions/land_owner_auctions_screen.dart';
import '../../features/land_owner/offers/land_owner_offers_screen.dart';
// Supplier
import '../../features/supplier/shell/supplier_shell.dart';
import '../../features/supplier/catalog/supplier_catalog_screen.dart';
import '../../features/supplier/orders/supplier_orders_screen.dart';
import '../../features/supplier/alerts/supplier_alerts_screen.dart';

final _rootNavigatorKey = GlobalKey<NavigatorState>();

final appRouterProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authNotifierProvider);
  
  return GoRouter(
    navigatorKey: _rootNavigatorKey,
    initialLocation: '/splash',
    redirect: (context, state) {
      if (authState.isLoading) return null;
      
      final isAuth = authState.isAuthenticated;
      final loc = state.uri.path;
      final isPublic = loc == '/login' || loc == '/register' || loc == '/splash';
      
      if (!isAuth && !isPublic) return '/login';
      
      if (isAuth && isPublic) {
        return _roleHome(authState.user?['role'] as String? ?? '');
      }
      
      if (!isAuth && loc == '/splash') return '/login';

      return null;
    },
    routes: [
      GoRoute(path: '/splash', builder: (_, __) => const SplashScreen()),
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
      GoRoute(path: '/register', builder: (_, __) => const RegisterScreen()),
      
      // ── Farmer ──
      ShellRoute(
        builder: (_, __, child) => FarmerShell(child: child),
        routes: [
          GoRoute(path: '/farmer', redirect: (_, __) => '/farmer/agent'),
          GoRoute(path: '/farmer/agent', builder: (_, __) => const AgentChatScreen()),
          GoRoute(path: '/farmer/parcels', builder: (_, __) => const ParcelIntelligenceScreen()),
          GoRoute(path: '/farmer/diagnostic', builder: (_, __) => const DiagnosticScreen()),
          GoRoute(path: '/farmer/erp', builder: (_, __) => const ErpScreen()),
          GoRoute(path: '/farmer/alerts', builder: (_, __) => const AlertsScreen(role: 'FARMER')),
        ],
      ),
      // ── Coop ──
      ShellRoute(
        builder: (_, __, child) => CoopShell(child: child),
        routes: [
          GoRoute(path: '/coop', redirect: (_, __) => '/coop/dashboard'),
          GoRoute(path: '/coop/dashboard', builder: (_, __) => const CoopDashboardScreen()),
          GoRoute(path: '/coop/members', builder: (_, __) => const CoopMembersScreen()),
          GoRoute(path: '/coop/marketplace', builder: (_, __) => const CoopMarketplaceScreen()),
          GoRoute(path: '/coop/alerts', builder: (_, __) => const AlertsScreen(role: 'COOP')),
        ],
      ),
      // ── Expert ──
      ShellRoute(
        builder: (_, __, child) => ExpertShell(child: child),
        routes: [
          GoRoute(path: '/expert', redirect: (_, __) => '/expert/heatmap'),
          GoRoute(path: '/expert/heatmap', builder: (_, __) => const ExpertHeatmapScreen()),
          GoRoute(path: '/expert/validations', builder: (_, __) => const ExpertValidationsScreen()),
          GoRoute(path: '/expert/reports', builder: (_, __) => const ExpertReportsScreen()),
          GoRoute(path: '/expert/alerts', builder: (_, __) => const AlertsScreen(role: 'EXPERT')),
        ],
      ),
      // ── Equipment ──
      ShellRoute(
        builder: (_, __, child) => EquipShell(child: child),
        routes: [
          GoRoute(path: '/equip', redirect: (_, __) => '/equip/inventory'),
          GoRoute(path: '/equip/inventory', builder: (_, __) => const EquipInventoryScreen()),
          GoRoute(path: '/equip/rentals', builder: (_, __) => const EquipRentalsScreen()),
          GoRoute(path: '/equip/alerts', builder: (_, __) => const AlertsScreen(role: 'EQUIP')),
        ],
      ),
      // ── Worker ──
      ShellRoute(
        builder: (_, __, child) => WorkerShell(child: child),
        routes: [
          GoRoute(path: '/worker', redirect: (_, __) => '/worker/jobs'),
          GoRoute(path: '/worker/jobs', builder: (_, __) => const WorkerJobsScreen()),
          GoRoute(path: '/worker/applications', builder: (_, __) => const WorkerApplicationsScreen()),
          GoRoute(path: '/worker/alerts', builder: (_, __) => const AlertsScreen(role: 'WORKER')),
        ],
      ),
      // ── Driver ──
      ShellRoute(
        builder: (_, __, child) => DriverShell(child: child),
        routes: [
          GoRoute(path: '/driver', redirect: (_, __) => '/driver/missions'),
          GoRoute(path: '/driver/missions', builder: (_, __) => const DriverMissionsScreen()),
          GoRoute(path: '/driver/logbook', builder: (_, __) => const DriverLogbookScreen()),
          GoRoute(path: '/driver/alerts', builder: (_, __) => const AlertsScreen(role: 'DRIVER')),
        ],
      ),
      // ── Admin ──
      ShellRoute(
        builder: (_, __, child) => AdminShell(child: child),
        routes: [
          GoRoute(path: '/admin', redirect: (_, __) => '/admin/dashboard'),
          GoRoute(path: '/admin/dashboard', builder: (_, __) => const AdminDashboardScreen()),
        ],
      ),
      // ── Land Owner ──
      ShellRoute(
        builder: (_, __, child) => LandOwnerShell(child: child),
        routes: [
          GoRoute(path: '/land-owner', redirect: (_, __) => '/land-owner/dashboard'),
          GoRoute(path: '/land-owner/dashboard', builder: (_, __) => const LandOwnerDashboardScreen()),
          GoRoute(path: '/land-owner/lands', builder: (_, __) => const LandOwnerLandsScreen()),
          GoRoute(path: '/land-owner/auctions', builder: (_, __) => const LandOwnerAuctionsScreen()),
          GoRoute(path: '/land-owner/offers', builder: (_, __) => const LandOwnerOffersScreen()),
        ],
      ),
      // ── Supplier ──
      ShellRoute(
        builder: (_, __, child) => SupplierShell(child: child),
        routes: [
          GoRoute(path: '/supplier', redirect: (_, __) => '/supplier/catalog'),
          GoRoute(path: '/supplier/catalog', builder: (_, __) => const SupplierCatalogScreen()),
          GoRoute(path: '/supplier/orders', builder: (_, __) => const SupplierOrdersScreen()),
          GoRoute(path: '/supplier/alerts', builder: (_, __) => const SupplierAlertsScreen()),
        ],
      ),
    ],
  );
});

String _roleHome(String role) {
  switch (role) {
    case 'FARMER':
    case 'FARMER_AMBASSADOR': return '/farmer';
    case 'COOP_PRESIDENT': return '/coop';
    case 'EXPERT': return '/expert';
    case 'EQUIP_OWNER': return '/equip';
    case 'WORKER':
    case 'AGRI_WORKER': return '/worker';
    case 'DRIVER': return '/driver';
    case 'ADMIN': return '/admin';
    case 'LAND_OWNER': return '/land-owner';
    case 'SUPPLIER': return '/supplier';
    default: return '/login';
  }
}
