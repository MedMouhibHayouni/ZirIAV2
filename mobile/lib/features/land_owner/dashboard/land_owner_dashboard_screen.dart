import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:intl/intl.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../shared/widgets/zir_design_system.dart';

class LandOwnerDashboardScreen extends ConsumerWidget {
  const LandOwnerDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final fmt = NumberFormat('#,##0', 'fr_FR');
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('VOTRE PATRIMOINE', style: ZiriaText.label(color: Colors.white38, letterSpacing: 1.5)),
                  Text('لوحة تحكم الملاك', style: ZiriaText.arabicMedium(color: ZiriaColors.accentEmerald)),
                ],
              ),
              const ZirGlassCard(
                padding: EdgeInsets.all(10),
                child: Icon(Icons.account_balance_wallet_rounded, color: ZiriaColors.accentEmerald, size: 20),
              ),
            ],
          ),
          const SizedBox(height: 24),
          
          GridView.count(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisCount: 2,
            crossAxisSpacing: 16,
            mainAxisSpacing: 16,
            childAspectRatio: 1.3,
            children: const [
              _KpiTile(label: 'SURFACE TOTAL', value: '450 ha', icon: Icons.terrain_rounded, color: ZiriaColors.primaryGreen),
              _KpiTile(label: 'PROPRIÉTÉS', value: '12', icon: Icons.map_rounded, color: Colors.blue),
              _KpiTile(label: 'OFFRES EN ATTENTE', value: '5', icon: Icons.notification_important_rounded, color: ZiriaColors.warningOrange),
              _KpiTile(label: 'REVENUS ANNUELS', value: '12.5k', icon: Icons.trending_up_rounded, color: ZiriaColors.accentEmerald, unit: 'TND'),
            ],
          ),
          
          const SizedBox(height: 24),
          
          ZirGlassCard(
            padding: const EdgeInsets.all(24),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('HISTORIQUE DES REVENUS FONCIERS', style: ZiriaText.label(color: Colors.white38, fontSize: 10)),
              const SizedBox(height: 24),
              SizedBox(
                height: 160,
                child: LineChart(LineChartData(
                  gridData: FlGridData(show: true, drawVerticalLine: false, getDrawingHorizontalLine: (v) => FlLine(color: Colors.white.withOpacity(0.05))),
                  borderData: FlBorderData(show: false),
                  titlesData: const FlTitlesData(show: false),
                  lineBarsData: [
                    LineChartBarData(
                      spots: [const FlSpot(0, 1), const FlSpot(1, 2.5), const FlSpot(2, 2), const FlSpot(3, 4.5), const FlSpot(4, 4), const FlSpot(5, 6)],
                      color: ZiriaColors.accentEmerald,
                      isCurved: true, barWidth: 3, dotData: const FlDotData(show: false),
                      belowBarData: BarAreaData(show: true, gradient: LinearGradient(colors: [ZiriaColors.accentEmerald.withOpacity(0.2), ZiriaColors.accentEmerald.withOpacity(0)])),
                    ),
                  ],
                )),
              ),
            ]),
          ),
          const SizedBox(height: 80),
        ],
      ),
    );
  }
}

class _KpiTile extends StatelessWidget {
  final String label, value;
  final String? unit;
  final IconData icon;
  final Color color;
  const _KpiTile({required this.label, required this.value, required this.icon, required this.color, this.unit});

  @override
  Widget build(BuildContext context) {
    return ZirGlassCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(label, style: ZiriaText.label(color: Colors.white30, fontSize: 8)),
              Icon(icon, size: 12, color: color.withOpacity(0.5)),
            ],
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(value, style: ZiriaText.headingMedium(color: Colors.white)),
              if (unit != null) Text(unit!, style: ZiriaText.label(color: color, fontSize: 9)),
            ],
          ),
        ],
      ),
    );
  }
}
