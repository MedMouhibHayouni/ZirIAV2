import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/zir_design_system.dart';
import '../../../core/widgets/state_widgets.dart';
import '../../../core/network/api_client.dart';
import '../../../core/widgets/skeleton_widget.dart';

class AdminDashboardScreen extends ConsumerWidget {
  const AdminDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final kpisAsync = ref.watch(adminKpiProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: kpisAsync.when(
        data: (data) => SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('SYSTÈME CENTRAL', style: ZiriaText.label(color: Colors.white38, letterSpacing: 1.5)),
              const SizedBox(height: 4),
              Text('Surveillance Hub', style: ZiriaText.headingLarge(color: ZiriaColors.accentEmerald)),
              const SizedBox(height: 32),
              
              GridView.count(
                crossAxisCount: 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                mainAxisSpacing: 16,
                crossAxisSpacing: 16,
                childAspectRatio: 1.4,
                children: [
                  _AdminKpiCard(label: 'UTILISATEURS', value: data['totalUsers']?.toString() ?? '0', icon: Icons.people_rounded, color: Colors.blue),
                  _AdminKpiCard(label: 'GMV TOTAL', value: '${data['totalGMV'] ?? 0} DT', icon: Icons.account_balance_wallet_rounded, color: ZiriaColors.earthOcher),
                  _AdminKpiCard(label: 'PARCELLES', value: data['totalParcels']?.toString() ?? '0', icon: Icons.landscape_rounded, color: ZiriaColors.accentEmerald),
                  _AdminKpiCard(label: 'ALERTES ACTIVES', value: data['activeAlerts']?.toString() ?? '0', icon: Icons.warning_amber_rounded, color: ZiriaColors.errorRed),
                ],
              ),
              
              const SizedBox(height: 40),
              Text('ACTIVITÉ RÉCENTE', style: ZiriaText.label(color: Colors.white38, letterSpacing: 1.2)),
              const SizedBox(height: 16),
              const ZirGlassCard(
                padding: EdgeInsets.all(12),
                child: Column(
                  children: [
                    _ActivityItem(title: 'Nouveau Farmer inscrit', time: 'Il y a 5 min', icon: Icons.person_add_rounded, color: Colors.blue),
                    Divider(height: 1, color: Colors.white12, indent: 48),
                    _ActivityItem(title: 'Alerte Mildiou validée', time: 'Il y a 15 min', icon: Icons.verified_rounded, color: ZiriaColors.accentEmerald),
                    Divider(height: 1, color: Colors.white12, indent: 48),
                    _ActivityItem(title: 'Transaction B2B complétée', time: 'Il y a 1h', icon: Icons.receipt_long_rounded, color: ZiriaColors.warningOrange),
                  ],
                ),
              ),
              const SizedBox(height: 80),
            ],
          ),
        ),
        loading: () => const Padding(padding: EdgeInsets.all(24), child: SkeletonGrid(count: 4)),
        error: (e, s) => ErrorState(
          title: 'ERREUR KPI',
          subtitle: 'Impossible de joindre le serveur central.',
          onRetry: () => ref.invalidate(adminKpiProvider),
        ),
      ),
    );
  }
}

class _AdminKpiCard extends StatelessWidget {
  final String label, value;
  final IconData icon;
  final Color color;
  const _AdminKpiCard({required this.label, required this.value, required this.icon, required this.color});

  @override
  Widget build(BuildContext context) {
    return ZirGlassCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(8)),
            child: Icon(icon, color: color, size: 16),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(value, style: ZiriaText.headingMedium(color: Colors.white)),
              Text(label, style: ZiriaText.label(color: Colors.white24, fontSize: 8)),
            ],
          ),
        ],
      ),
    );
  }
}

class _ActivityItem extends StatelessWidget {
  final String title, time;
  final IconData icon;
  final Color color;
  const _ActivityItem({required this.title, required this.time, required this.icon, required this.color});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
      child: Row(
        children: [
          Container(
            width: 36, height: 36,
            decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(10)),
            child: Icon(icon, size: 18, color: color),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: ZiriaText.bodyMedium(color: Colors.white70)),
                Text(time, style: ZiriaText.bodySmall(color: Colors.white30)),
              ],
            ),
          ),
          const Icon(Icons.chevron_right_rounded, color: Colors.white12, size: 16),
        ],
      ),
    );
  }
}

final adminKpiProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final response = await ref.read(dioProvider).get('/admin/kpis');
  return response.data;
});
