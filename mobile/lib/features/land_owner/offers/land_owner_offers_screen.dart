import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../shared/widgets/zir_design_system.dart';
import '../../../../core/widgets/skeleton_widget.dart';
import '../../../../core/widgets/state_widgets.dart';

class LandOffer {
  final String id, landName, farmerName, type;
  final double amount;
  final DateTime date;
  LandOffer({required this.id, required this.landName, required this.farmerName, required this.type, required this.amount, required this.date});
  factory LandOffer.fromJson(Map j) => LandOffer(
        id: j['id'] ?? '',
        landName: j['land']?['name'] ?? 'Terrain',
        farmerName: j['farmer']?['name'] ?? 'Agriculteur',
        type: j['offer_type'] ?? 'RENT',
        amount: (double.tryParse(j['amount']?.toString() ?? '0') ?? 0),
        date: DateTime.tryParse(j['created_at'] ?? '') ?? DateTime.now(),
      );
}

final landOwnerOffersProvider = FutureProvider<List<LandOffer>>((ref) async {
  final res = await ref.watch(dioProvider).get('/lands/offers/my');
  final list = res.data is List ? res.data as List : (res.data['items'] ?? []);
  return list.map<LandOffer>((e) => LandOffer.fromJson(e)).toList();
});

class LandOwnerOffersScreen extends ConsumerWidget {
  const LandOwnerOffersScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: ref.watch(landOwnerOffersProvider).when(
            loading: () => ListView.builder(padding: const EdgeInsets.all(16), itemCount: 4, itemBuilder: (_, __) => const SkeletonCard(height: 120)),
            error: (_, __) => ErrorState(onRetry: () => ref.invalidate(landOwnerOffersProvider)),
            data: (offers) => offers.isEmpty
                ? const EmptyState(title: 'Aucune offre', emoji: '📜', subtitle: 'Les propositions de location s\'afficheront ici')
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: offers.length,
                    itemBuilder: (ctx, i) => _OfferCard(offer: offers[i]),
                  ),
          ),
    );
  }
}

class _OfferCard extends StatelessWidget {
  final LandOffer offer;
  const _OfferCard({required this.offer});

  @override
  Widget build(BuildContext context) {
    final fmt = NumberFormat('#,##0', 'fr_FR');
    final isRent = offer.type == 'RENT';
    
    return ZirGlassCard(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      child: Column(children: [
        Row(children: [
          Container(
            width: 44, height: 44,
            decoration: BoxDecoration(color: (isRent ? Colors.blue : Colors.purple).withOpacity(0.1), borderRadius: BorderRadius.circular(12)),
            child: Icon(isRent ? Icons.calendar_month_rounded : Icons.handshake_rounded, color: isRent ? Colors.blue : Colors.purple, size: 24),
          ),
          const SizedBox(width: 16),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(offer.landName, style: ZiriaText.headingSmall()),
            Text('Par ${offer.farmerName}', style: ZiriaText.bodySmall(color: Colors.white38)),
          ])),
          Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
            Text('${fmt.format(offer.amount)} TND', style: ZiriaText.headingSmall(color: ZiriaColors.accentEmerald)),
            Text(isRent ? '/ AN' : 'TOTAL', style: const TextStyle(color: Colors.white24, fontSize: 8, fontWeight: FontWeight.bold)),
          ]),
        ]),
        const SizedBox(height: 20),
        Row(children: [
          Expanded(child: ZirGradientButton(label: 'ACCEPTER', height: 36, onPressed: () {})),
          const SizedBox(width: 12),
          Expanded(child: ZiriaButton(label: 'REFUSER', height: 36, gradient: LinearGradient(colors: [ZiriaColors.errorRed, ZiriaColors.errorRed.withOpacity(0.8)]), onPressed: () {})),
        ]),
      ]),
    );
  }
}
