import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../shared/widgets/zir_design_system.dart';
import '../../../../core/widgets/skeleton_widget.dart';
import '../../../../core/widgets/state_widgets.dart';

// ── Model ─────────────────────────────────────────────────────────────────────
class Equipment {
  final String id, name, type;
  final bool isAvailable;
  final double? dailyRate;
  Equipment({required this.id, required this.name, required this.type, required this.isAvailable, this.dailyRate});
  factory Equipment.fromJson(Map j) => Equipment(
        id: j['id'] ?? '',
        name: j['name'] ?? '',
        type: j['type'] ?? 'TRACTOR',
        isAvailable: j['is_available'] ?? true,
        dailyRate: (j['daily_rate'])?.toDouble(),
      );
}

// ── Provider ─────────────────────────────────────────────────────────────────
final equipInventoryProvider = FutureProvider<List<Equipment>>((ref) async {
  final res = await ref.watch(dioProvider).get('/equipment/my');
  final list = res.data is List ? res.data as List : (res.data['items'] ?? []);
  return list.map<Equipment>((e) => Equipment.fromJson(e)).toList();
});

// ── Screen ────────────────────────────────────────────────────────────────────
class EquipInventoryScreen extends ConsumerWidget {
  const EquipInventoryScreen({super.key});

  static const _typeIcons = {
    'TRACTOR': Icons.agriculture_rounded,
    'HARVESTER': Icons.grain_rounded,
    'PLOW': Icons.settings_input_component_rounded,
    'IRRIGATION': Icons.water_drop_rounded,
    'SPRAYER': Icons.opacity_rounded,
    'TRUCK': Icons.local_shipping_rounded,
  };

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return ref.watch(equipInventoryProvider).when(
          loading: () => ListView.builder(padding: const EdgeInsets.all(16), itemCount: 5, itemBuilder: (_, __) => const SkeletonCard(height: 100)),
          error: (_, __) => ErrorState(onRetry: () => ref.invalidate(equipInventoryProvider)),
          data: (items) => items.isEmpty
              ? const EmptyState(title: 'Aucun équipement', emoji: '🚜', subtitle: 'Gérez votre flotte ici')
              : ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: items.length,
                  itemBuilder: (_, i) => _EquipCard(eq: items[i], isDark: isDark),
                ),
        );
  }
}

class _EquipCard extends StatelessWidget {
  final Equipment eq;
  final bool isDark;
  const _EquipCard({required this.eq, required this.isDark});

  @override
  Widget build(BuildContext context) {
    return ZirGlassCard(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      child: Row(children: [
        Container(
          width: 52, height: 52,
          decoration: BoxDecoration(color: ZiriaColors.accentEmerald.withOpacity(0.1), borderRadius: BorderRadius.circular(12)),
          child: Icon(EquipInventoryScreen._typeIcons[eq.type] ?? Icons.settings_rounded, color: ZiriaColors.accentEmerald, size: 28),
        ),
        const SizedBox(width: 16),
        Expanded(child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(eq.name, style: ZiriaText.headingSmall()),
            Text(eq.type.replaceAll('_', ' '), style: ZiriaText.bodySmall(color: Colors.white38)),
            if (eq.dailyRate != null) 
              Text('${eq.dailyRate!.toStringAsFixed(0)} TND / JOUR', style: ZiriaText.label(color: ZiriaColors.accentEmerald, fontSize: 9)),
          ]
        )),
        Consumer(builder: (ctx, ref, _) => Switch.adaptive(
          value: eq.isAvailable,
          activeColor: ZiriaColors.accentEmerald,
          onChanged: (v) async {
            await ref.read(dioProvider).patch('/equipment/${eq.id}', data: {'is_available': v});
            ref.invalidate(equipInventoryProvider);
          },
        )),
      ]),
    );
  }
}
