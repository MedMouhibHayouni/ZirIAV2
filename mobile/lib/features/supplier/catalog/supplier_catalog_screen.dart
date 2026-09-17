import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../shared/widgets/zir_design_system.dart';
import '../../../../core/widgets/skeleton_widget.dart';
import '../../../../core/widgets/state_widgets.dart';

class SupplierProduct {
  final String id, name, category, unit;
  final double price, stock;
  final String? imageUrl;
  SupplierProduct({required this.id, required this.name, required this.category, required this.unit, required this.price, required this.stock, this.imageUrl});
  factory SupplierProduct.fromJson(Map j) => SupplierProduct(
        id: j['id'] ?? '',
        name: j['product_name'] ?? j['name'] ?? '',
        category: j['category'] ?? 'INPUT',
        unit: j['unit'] ?? 'unité',
        price: (double.tryParse(j['price']?.toString() ?? '0') ?? 0),
        stock: (double.tryParse(j['stock']?.toString() ?? '0') ?? 0),
        imageUrl: j['image_url'],
      );
}

final supplierCatalogProvider = FutureProvider<List<SupplierProduct>>((ref) async {
  final res = await ref.watch(dioProvider).get('/marketplace/listings/me');
  final list = res.data is List ? res.data as List : (res.data['items'] ?? []);
  return list.map<SupplierProduct>((e) => SupplierProduct.fromJson(e)).toList();
});

class SupplierCatalogScreen extends ConsumerWidget {
  const SupplierCatalogScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final fmt = NumberFormat('#,##0.00', 'fr_FR');
    
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: ZirGradientButton(
              label: 'AJOUTER UN PRODUIT AU CATALOGUE',
              icon: Icons.add_business_rounded,
              onPressed: () => _showAddProduct(context),
            ),
          ),
          Expanded(
            child: ref.watch(supplierCatalogProvider).when(
                  loading: () => const SkeletonGrid(count: 6),
                  error: (_, __) => ErrorState(onRetry: () => ref.invalidate(supplierCatalogProvider)),
                  data: (products) => products.isEmpty
                      ? const EmptyState(title: 'Catalogue vide', emoji: '🏬', subtitle: 'Commencez à vendre vos intrants')
                      : GridView.builder(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: 2, crossAxisSpacing: 16, mainAxisSpacing: 16, childAspectRatio: 0.75),
                          itemCount: products.length,
                          itemBuilder: (ctx, i) => _ProductCard(p: products[i], fmt: fmt),
                        ),
                ),
          ),
        ],
      ),
    );
  }

  void _showAddProduct(BuildContext context) {
    // Add logic
  }
}

class _ProductCard extends StatelessWidget {
  final SupplierProduct p;
  final NumberFormat fmt;
  const _ProductCard({required this.p, required this.fmt});

  @override
  Widget build(BuildContext context) {
    return ZirGlassCard(
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            height: 90,
            width: double.infinity,
            decoration: BoxDecoration(color: Colors.white.withOpacity(0.04), borderRadius: BorderRadius.circular(12)),
            child: const Center(child: Icon(Icons.inventory_2_outlined, color: ZiriaColors.accentEmerald, size: 32)),
          ),
          const SizedBox(height: 12),
          Text(p.name, style: ZiriaText.headingSmall(), maxLines: 1, overflow: TextOverflow.ellipsis),
          Text(p.category, style: ZiriaText.label(color: Colors.white24, fontSize: 8)),
          const Spacer(),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('${fmt.format(p.price)} TND', style: ZiriaText.labelBold(color: ZiriaColors.accentEmerald)),
              Text('${p.stock.toInt()} ${p.unit}', style: ZiriaText.label(color: Colors.white38, fontSize: 9)),
            ],
          ),
          const SizedBox(height: 8),
          Row(children: [
            Expanded(child: ZiriaButton(label: 'Éditer', height: 28, isOutlined: true, onPressed: () {})),
            const SizedBox(width: 8),
            Container(
              width: 28, height: 28,
              decoration: BoxDecoration(color: ZiriaColors.errorRed.withOpacity(0.1), borderRadius: BorderRadius.circular(8)),
              child: const Icon(Icons.delete_outline_rounded, color: ZiriaColors.errorRed, size: 16),
            ),
          ]),
        ],
      ),
    );
  }
}
