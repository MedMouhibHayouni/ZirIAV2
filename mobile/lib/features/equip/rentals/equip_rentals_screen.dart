import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../shared/widgets/zir_design_system.dart';
import '../../../../core/widgets/skeleton_widget.dart';
import '../../../../core/widgets/state_widgets.dart';

// ── Model ─────────────────────────────────────────────────────────────────────
class RentalRequest {
  final String id, equipmentName, renterName, status;
  final DateTime startDate, endDate;
  final double totalPrice;
  const RentalRequest({required this.id, required this.equipmentName, required this.renterName, required this.status, required this.startDate, required this.endDate, required this.totalPrice});
  factory RentalRequest.fromJson(Map j) => RentalRequest(
        id: j['id'] ?? '',
        equipmentName: j['equipment']?['name'] ?? '',
        renterName: j['renter']?['name'] ?? '',
        status: j['status'] ?? 'PENDING',
        startDate: DateTime.tryParse(j['start_date'] ?? '') ?? DateTime.now(),
        endDate: DateTime.tryParse(j['end_date'] ?? '') ?? DateTime.now(),
        totalPrice: (double.tryParse(j['total_price']?.toString() ?? '0') ?? 0),
      );
}

// ── Provider ─────────────────────────────────────────────────────────────────
final rentalRequestsProvider = FutureProvider.family<List<RentalRequest>, String>((ref, status) async {
  final res = await ref.watch(dioProvider).get('/equipment/rentals/my', queryParameters: {'status': status, 'page': 1, 'limit': 30});
  final list = res.data is List ? res.data as List : (res.data['items'] ?? []);
  return list.map<RentalRequest>((e) => RentalRequest.fromJson(e)).toList();
});

// ── Screen ────────────────────────────────────────────────────────────────────
class EquipRentalsScreen extends ConsumerStatefulWidget {
  const EquipRentalsScreen({super.key});
  @override
  ConsumerState<EquipRentalsScreen> createState() => _EquipRentalsScreenState();
}

class _EquipRentalsScreenState extends ConsumerState<EquipRentalsScreen> with SingleTickerProviderStateMixin {
  late TabController _tab;
  @override
  void initState() {
    super.initState();
    _tab = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tab.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Column(children: [
      ZirGlassCard(
        margin: const EdgeInsets.all(16),
        padding: EdgeInsets.zero,
        child: TabBar(
          controller: _tab,
          labelColor: ZiriaColors.accentEmerald,
          unselectedLabelColor: Colors.white38,
          indicatorColor: ZiriaColors.accentEmerald,
          indicatorSize: TabBarIndicatorSize.label,
          dividerColor: Colors.transparent,
          tabs: const [Tab(text: 'En attente'), Tab(text: 'Actives'), Tab(text: 'Historique')],
        ),
      ),
      Expanded(
        child: TabBarView(
          controller: _tab,
          children: [_buildList('PENDING', isDark), _buildList('CONFIRMED', isDark), _buildList('COMPLETED', isDark)],
        ),
      ),
    ]);
  }

  Widget _buildList(String status, bool isDark) {
    return ref.watch(rentalRequestsProvider(status)).when(
          loading: () => ListView.builder(itemCount: 4, padding: const EdgeInsets.all(16), itemBuilder: (_, __) => const SkeletonCard(height: 120)),
          error: (_, __) => ErrorState(onRetry: () => ref.invalidate(rentalRequestsProvider(status))),
          data: (items) => items.isEmpty
              ? EmptyState(title: status == 'PENDING' ? 'Aucune demande' : 'Aucune location', emoji: status == 'PENDING' ? '⏳' : '📦', subtitle: 'Revenez plus tard')
              : ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: items.length,
                  itemBuilder: (_, i) => _RentalCard(r: items[i], isDark: isDark, status: status, onAction: () {
                    ref.invalidate(rentalRequestsProvider('PENDING'));
                    ref.invalidate(rentalRequestsProvider('CONFIRMED'));
                  }),
                ),
        );
  }
}

class _RentalCard extends StatelessWidget {
  final RentalRequest r;
  final bool isDark;
  final String status;
  final VoidCallback onAction;
  const _RentalCard({required this.r, required this.isDark, required this.status, required this.onAction});

  @override
  Widget build(BuildContext context) {
    final fmt = DateFormat('dd MMM');
    return ZirGlassCard(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Expanded(child: Text(r.equipmentName, style: ZiriaText.headingMedium())),
          Text('${r.totalPrice.toStringAsFixed(0)} TND', style: ZiriaText.headingSmall(color: ZiriaColors.accentEmerald)),
        ]),
        const SizedBox(height: 8),
        Row(children: [
          const Icon(Icons.person_outline_rounded, size: 14, color: Colors.white38),
          const SizedBox(width: 6),
          Text(r.renterName, style: ZiriaText.bodyMedium(color: Colors.white70)),
        ]),
        const SizedBox(height: 4),
        Row(children: [
          const Icon(Icons.calendar_today_rounded, size: 12, color: Colors.white30),
          const SizedBox(width: 6),
          Text('${fmt.format(r.startDate)} → ${fmt.format(r.endDate)}', style: ZiriaText.bodySmall(color: Colors.white38)),
        ]),
        if (status == 'PENDING') ...[
          const SizedBox(height: 20),
          Row(children: [
            Expanded(child: Consumer(builder: (ctx, ref, _) => ZirGradientButton(
              label: 'ACCEPTER',
              height: 40,
              onPressed: () async {
                await ref.read(dioProvider).patch('/equipment/rentals/${r.id}', data: {'status': 'CONFIRMED'});
                onAction();
              },
            ))),
            const SizedBox(width: 12),
            Expanded(child: Consumer(builder: (ctx, ref, _) => ZiriaButton(
              label: 'REFUSER',
              height: 40,
              gradient: LinearGradient(colors: [ZiriaColors.errorRed, ZiriaColors.errorRed.withOpacity(0.8)]),
              onPressed: () async {
                await ref.read(dioProvider).patch('/equipment/rentals/${r.id}', data: {'status': 'CANCELLED'});
                onAction();
              },
            ))),
          ]),
        ],
      ]),
    );
  }
}
