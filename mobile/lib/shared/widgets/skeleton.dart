import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';

// ZirIA brand colors (mirrored)
const _kSurfaceD   = Color(0xFF1a2d45);
const _kSurface2D  = Color(0xFF263d58);
const _kSurfaceL   = Color(0xFFe8ede8);
const _kHighlightL = Color(0xFFf5f9f5);

// ═══════════════════════════════════════════════════════════════════════════
// ZirIA Skeleton Loading System
// Règle : Tout AsyncValue affiche des fausses cartes shimmering pendant le chargement.
// PAS d'écran vide. PAS de spinner seul.
// ═══════════════════════════════════════════════════════════════════════════

/// Widget racine shimmer — à utiliser comme wrapper
class ZirShimmer extends StatelessWidget {
  final Widget child;
  const ZirShimmer({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Shimmer.fromColors(
      baseColor: isDark ? _kSurfaceD : _kSurfaceL,
      highlightColor: isDark ? _kSurface2D : _kHighlightL,
      period: const Duration(milliseconds: 1400),
      child: child,
    );
  }
}

/// Boîte rectangle grise animée — base de toutes les skeletons
class SkeletonBox extends StatelessWidget {
  final double width;
  final double height;
  final double radius;
  const SkeletonBox({
    super.key,
    this.width = double.infinity,
    required this.height,
    this.radius = 10,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(radius),
      ),
    );
  }
}

/// Skeleton pour une carte de stat (chiffre + label)
class SkeletonStatCard extends StatelessWidget {
  const SkeletonStatCard({super.key});
  @override
  Widget build(BuildContext context) {
    return ZirShimmer(
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
        ),
        child: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SkeletonBox(height: 12, width: 80),
            SizedBox(height: 12),
            SkeletonBox(height: 28, width: 120),
            SizedBox(height: 8),
            SkeletonBox(height: 10, width: 60),
          ],
        ),
      ),
    );
  }
}

/// Skeleton pour une carte liste (avatar + lignes de texte)
class SkeletonListTile extends StatelessWidget {
  const SkeletonListTile({super.key});
  @override
  Widget build(BuildContext context) {
    return ZirShimmer(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        child: Row(
          children: [
            // Avatar
            Container(
              width: 44, height: 44,
              decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle),
            ),
            const SizedBox(width: 14),
            const Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SkeletonBox(height: 13, width: double.infinity),
                  SizedBox(height: 7),
                  SkeletonBox(height: 10, width: 200),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Skeleton pour une carte complète (image + textes)
class SkeletonCard extends StatelessWidget {
  final double imageHeight;
  final double? height;
  const SkeletonCard({super.key, this.imageHeight = 140, this.height});
  @override
  Widget build(BuildContext context) {
    return ZirShimmer(
      child: Container(
        height: height,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SkeletonBox(height: imageHeight, radius: 16),
            const Padding(
              padding: EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SkeletonBox(height: 14),
                  SizedBox(height: 8),
                  SkeletonBox(height: 10, width: 200),
                  SizedBox(height: 14),
                  SkeletonBox(height: 36, radius: 12),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Grille 2 colonnes de skeletons stat cards — pour Dashboard
class SkeletonDashboard extends StatelessWidget {
  const SkeletonDashboard({super.key});
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          // Row de stats
          GridView.count(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisCount: 2,
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            childAspectRatio: 1.5,
            children: const [
              SkeletonStatCard(), SkeletonStatCard(),
              SkeletonStatCard(), SkeletonStatCard(),
            ],
          ),
          const SizedBox(height: 20),
          // Titre section
          const ZirShimmer(child: SkeletonBox(height: 16, width: 160)),
          const SizedBox(height: 14),
          // Cartes liste
          const SkeletonListTile(),
          const SkeletonListTile(),
          const SkeletonListTile(),
          const SkeletonListTile(),
        ],
      ),
    );
  }
}

/// Liste de skeletons pour écrans de type "liste de résultats"
class SkeletonListView extends StatelessWidget {
  final int count;
  const SkeletonListView({super.key, this.count = 6});
  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: count,
      separatorBuilder: (_, __) => const Divider(height: 1),
      itemBuilder: (_, __) => const SkeletonListTile(),
    );
  }
}

/// Helper standalone — affiche skeleton ou le contenu selon un bool isLoading
Widget skeletonOr({required bool isLoading, required Widget child, Widget? skeleton}) {
  if (isLoading) return skeleton ?? const SkeletonDashboard();
  return child;
}

/// Widget d'erreur réutilisable pour afficher les échecs de chargement
class ZirErrorWidget extends StatelessWidget {
  final String message;
  const ZirErrorWidget({super.key, required this.message});
  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.wifi_off_rounded, size: 48, color: cs.error),
            const SizedBox(height: 12),
            Text('Erreur de connexion', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 6),
            Text(message, textAlign: TextAlign.center, style: Theme.of(context).textTheme.bodySmall),
          ],
        ),
      ),
    );
  }
}
