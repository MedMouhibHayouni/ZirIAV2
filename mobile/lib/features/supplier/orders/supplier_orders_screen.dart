import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../shared/widgets/zir_design_system.dart';
import '../../../../core/widgets/skeleton_widget.dart';
import '../../../../core/widgets/state_widgets.dart';

class SupplierOrder {
  final String id, customerName, status;
  final double totalAmount;
  final DateTime date;
  final List<String> items;
  SupplierOrder({required this.id, required this.customerName, required this.status, required this.totalAmount, required this.date, required this.items});
  factory SupplierOrder.fromJson(Map j) => SupplierOrder(
        id: j['id'] ?? '',
        customerName: j['customer']?['name'] ?? 'Client Anonyme',
        status: j['status'] ?? 'PENDING',
        totalAmount: (double.tryParse(j['total_price']?.toString() ?? '0') ?? 0),
        date: DateTime.tryParse(j['created_at'] ?? '') ?? DateTime.now(),
        items: (j['items'] as List?)?.map((e) => e['product_name'] as String).toList() ?? [],
      );
}

final supplierOrdersProvider = FutureProvider.family<List<SupplierOrder>, String>((ref, status) async {
  final res = await ref.watch(dioProvider).get('/orders/supplier/me', queryParameters: {'status': status});
  final list = res.data is List ? res.data as List : (res.data['items'] ?? []);
  return list.map<SupplierOrder>((e) => SupplierOrder.fromJson(e)).toList();
});

class SupplierOrdersScreen extends ConsumerStatefulWidget {
  const SupplierOrdersScreen({super.key});
  @override
  ConsumerState<SupplierOrdersScreen> createState() => _SupplierOrdersScreenState();
}

class _SupplierOrdersScreenState extends ConsumerState<SupplierOrdersScreen> with SingleTickerProviderStateMixin {
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
          tabs: const [Tab(text: 'Nouvelles'), Tab(text: 'Traitées'), Tab(text: 'Livrées')],
        ),
      ),
      Expanded(
        child: TabBarView(
          controller: _tab,
          children: [_buildList('PENDING'), _buildList('PROCESSING'), _buildList('DELIVERED')],
        ),
      ),
    ]);
  }

  Widget _buildList(String status) {
    return ref.watch(supplierOrdersProvider(status)).when(
          loading: () => ListView.builder(itemCount: 4, padding: const EdgeInsets.all(16), itemBuilder: (_, __) => const SkeletonCard(height: 120)),
          error: (_, __) => ErrorState(onRetry: () => ref.invalidate(supplierOrdersProvider(status))),
          data: (orders) => orders.isEmpty
              ? const EmptyState(title: 'Aucune commande', emoji: '📦', subtitle: 'Les commandes s\'afficheront ici')
              : ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: orders.length,
                  itemBuilder: (_, i) => _OrderCard(o: orders[i], onAction: () => ref.invalidate(supplierOrdersProvider(status))),
                ),
        );
  }
}

class _OrderCard extends StatelessWidget {
  final SupplierOrder o;
  final VoidCallback onAction;
  const _OrderCard({required this.o, required this.onAction});

  @override
  Widget build(BuildContext context) {
    final fmt = NumberFormat('#,##0.00', 'fr_FR');
    final isNew = o.status == 'PENDING';
    
    return ZirGlassCard(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Container(
            width: 44, height: 44,
            decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), borderRadius: BorderRadius.circular(12)),
            child: const Icon(Icons.shopping_bag_outlined, color: Colors.white38, size: 22),
          ),
          const SizedBox(width: 16),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(o.customerName, style: ZiriaText.headingSmall()),
            Text('${o.items.length} articles · ${DateFormat('dd/MM HH:mm').format(o.date)}', style: ZiriaText.bodySmall(color: Colors.white30)),
          ])),
          Text('${fmt.format(o.totalAmount)} TND', style: ZiriaText.labelBold(color: ZiriaColors.accentEmerald)),
        ]),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          children: o.items.take(3).map((it) => Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(color: Colors.white.withOpacity(0.04), borderRadius: BorderRadius.circular(8)),
            child: Text(it, style: const TextStyle(color: Colors.white54, fontSize: 10)),
          )).toList(),
        ),
        if (isNew) ...[
          const SizedBox(height: 20),
          ZirGradientButton(
            label: 'ACCEPTER ET PRÉPARER',
            height: 40,
            onPressed: () async {
              // Action logic
              onAction();
            },
          ),
        ],
      ]),
    );
  }
}
