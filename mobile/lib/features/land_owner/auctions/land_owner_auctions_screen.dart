import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../shared/widgets/zir_design_system.dart';
import '../../../../core/widgets/skeleton_widget.dart';
import '../../../../core/widgets/state_widgets.dart';

class LandAuction {
  final String id, landName, status;
  final double startPrice, currentBid;
  final DateTime endDate;
  LandAuction({required this.id, required this.landName, required this.status, required this.startPrice, required this.currentBid, required this.endDate});
  factory LandAuction.fromJson(Map j) => LandAuction(
        id: j['id'] ?? '',
        landName: j['land']?['name'] ?? 'Terrain',
        status: j['status'] ?? 'ACTIVE',
        startPrice: (double.tryParse(j['starting_price']?.toString() ?? '0') ?? 0),
        currentBid: (double.tryParse(j['current_bid']?.toString() ?? '0') ?? 0),
        endDate: DateTime.tryParse(j['end_date'] ?? '') ?? DateTime.now().add(const Duration(days: 7)),
      );
}

final landOwnerAuctionsProvider = FutureProvider<List<LandAuction>>((ref) async {
  final res = await ref.watch(dioProvider).get('/lands/auctions/my');
  final list = res.data is List ? res.data as List : (res.data['items'] ?? []);
  return list.map<LandAuction>((e) => LandAuction.fromJson(e)).toList();
});

class LandOwnerAuctionsScreen extends ConsumerWidget {
  const LandOwnerAuctionsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: ZirGradientButton(
              label: 'DÉMARRER UNE ENCHÈRE FONCIÈRE',
              icon: Icons.gavel_rounded,
              onPressed: () {},
            ),
          ),
          Expanded(
            child: ref.watch(landOwnerAuctionsProvider).when(
                  loading: () => ListView.builder(padding: const EdgeInsets.all(16), itemCount: 3, itemBuilder: (_, __) => const SkeletonCard(height: 140)),
                  error: (_, __) => ErrorState(onRetry: () => ref.invalidate(landOwnerAuctionsProvider)),
                  data: (auctions) => auctions.isEmpty
                      ? const EmptyState(title: 'Aucune enchère', emoji: '🔨', subtitle: 'Proposez vos terrains aux enchères')
                      : ListView.builder(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          itemCount: auctions.length,
                          itemBuilder: (ctx, i) => _AuctionCard(a: auctions[i]),
                        ),
                ),
          ),
        ],
      ),
    );
  }
}

class _AuctionCard extends StatelessWidget {
  final LandAuction a;
  const _AuctionCard({required this.a});

  @override
  Widget build(BuildContext context) {
    final fmt = NumberFormat('#,##0', 'fr_FR');
    return ZirGlassCard(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Container(
            width: 44, height: 44,
            decoration: BoxDecoration(color: ZiriaColors.warningOrange.withOpacity(0.1), borderRadius: BorderRadius.circular(12)),
            child: const Icon(Icons.gavel_rounded, color: ZiriaColors.warningOrange, size: 24),
          ),
          const SizedBox(width: 16),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(a.landName, style: ZiriaText.headingSmall()),
            Text('Fin le ${DateFormat('dd MMM').format(a.endDate)}', style: ZiriaText.bodySmall(color: Colors.white38)),
          ])),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(color: ZiriaColors.accentEmerald.withOpacity(0.12), borderRadius: BorderRadius.circular(8)),
            child: const Text('LIVE', style: TextStyle(color: ZiriaColors.accentEmerald, fontSize: 10, fontWeight: FontWeight.bold)),
          ),
        ]),
        const SizedBox(height: 20),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            _PriceInfo(label: 'PRIX DÉPART', value: '${fmt.format(a.startPrice)} TND'),
            _PriceInfo(label: 'OFFRE ACTUELLE', value: '${fmt.format(a.currentBid)} TND', highlight: true),
          ],
        ),
      ]),
    );
  }
}

class _PriceInfo extends StatelessWidget {
  final String label, value;
  final bool highlight;
  const _PriceInfo({required this.label, required this.value, this.highlight = false});

  @override
  Widget build(BuildContext context) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(label, style: ZiriaText.label(color: Colors.white24, fontSize: 8)),
      const SizedBox(height: 2),
      Text(value, style: ZiriaText.headingSmall(color: highlight ? ZiriaColors.accentEmerald : Colors.white70)),
    ]);
  }
}
