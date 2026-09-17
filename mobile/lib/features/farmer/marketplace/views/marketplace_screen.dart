import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../shared/widgets/skeleton.dart';
import '../repositories/marketplace_repository.dart';

// =============================================================================
// ZirIA — Marketplace Screen (B2B Agricole)
// =============================================================================

class MarketplaceScreen extends ConsumerWidget {
  const MarketplaceScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;

    // On utilise un futur provider ou stream si on veut, ici on va juste appeler le repo pour l'exemple
    // Mais l'idéal est un FutureProvider. Pour simplifier je vais faire un FutureBuilder.

    return Scaffold(
      backgroundColor: cs.surface,
      appBar: AppBar(
        title: const Text('Marché ZirIA'),
        actions: [
          IconButton(icon: const Icon(Icons.search_rounded), onPressed: () {}),
          IconButton(
              icon: const Icon(Icons.shopping_cart_outlined), onPressed: () {}),
        ],
      ),
      body: Column(
        children: [
          // Catégories
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(
              children: [
                _buildCategoryChip(context, 'Tous', true),
                _buildCategoryChip(context, 'Semences', false),
                _buildCategoryChip(context, 'Engrais', false),
                _buildCategoryChip(context, 'Matériel', false),
                _buildCategoryChip(context, 'Services', false),
              ],
            ),
          ),

          Expanded(
            child: FutureBuilder<List<MarketplaceProduct>>(
              future: ref
                  .read(marketplaceRepositoryProvider)
                  .getTreatmentProducts('all'),
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: 5,
                    itemBuilder: (_, __) => const Padding(
                      padding: EdgeInsets.only(bottom: 12),
                      child: SkeletonCard(height: 100),
                    ),
                  );
                }

                if (snapshot.hasError) {
                  return Center(child: Text('Erreur: ${snapshot.error}'));
                }

                final products = snapshot.data ?? [];

                if (products.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.store_mall_directory_outlined,
                            size: 64,
                            color: cs.onSurfaceVariant.withOpacity(0.2)),
                        const SizedBox(height: 16),
                        Text('Aucun produit disponible pour le moment.',
                            style: tt.bodyLarge),
                      ],
                    ),
                  );
                }

                return ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: products.length,
                  itemBuilder: (context, index) {
                    final p = products[index];
                    return Card(
                      margin: const EdgeInsets.only(bottom: 16),
                      child: Padding(
                        padding: const EdgeInsets.all(12),
                        child: Row(
                          children: [
                            Container(
                              width: 80,
                              height: 80,
                              decoration: BoxDecoration(
                                color: cs.surfaceContainerHighest,
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: const Icon(Icons.image_outlined,
                                  color: Colors.grey),
                            ),
                            const SizedBox(width: 16),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(p.name,
                                      style: tt.titleMedium?.copyWith(
                                          fontWeight: FontWeight.bold)),
                                  Text(p.supplier, style: tt.bodySmall),
                                  const SizedBox(height: 8),
                                  Text(
                                    '${p.price.toStringAsFixed(2)} TND / ${p.unit}',
                                    style: TextStyle(
                                        color: cs.primary,
                                        fontWeight: FontWeight.w800,
                                        fontSize: 16),
                                  ),
                                ],
                              ),
                            ),
                            ElevatedButton(
                              onPressed: () {},
                              style: ElevatedButton.styleFrom(
                                minimumSize: const Size(44, 44),
                                padding: EdgeInsets.zero,
                                shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12)),
                              ),
                              child: const Icon(Icons.add_shopping_cart_rounded,
                                  size: 20),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCategoryChip(BuildContext context, String label, bool selected) {
    final cs = Theme.of(context).colorScheme;
    return Container(
      margin: const EdgeInsets.only(right: 8),
      child: ChoiceChip(
        label: Text(label),
        selected: selected,
        onSelected: (_) {},
        selectedColor: cs.primary,
        labelStyle: TextStyle(
          color: selected ? Colors.white : cs.onSurface,
          fontWeight: selected ? FontWeight.bold : FontWeight.normal,
        ),
      ),
    );
  }
}
