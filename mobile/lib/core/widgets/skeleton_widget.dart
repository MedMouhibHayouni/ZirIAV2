import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';
import '../theme/app_theme.dart';

// ─── SkeletonCard ──────────────────────────────────────────────────────────────
class SkeletonCard extends StatelessWidget {
  final double height;
  final double? width;
  final double borderRadius;

  const SkeletonCard({
    super.key,
    this.height = 80,
    this.width,
    this.borderRadius = 16,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final baseColor = isDark ? ZiriaColors.cardDark : const Color(0xFFE0E0E0);
    final highlightColor = isDark ? const Color(0xFF1a2f4a) : const Color(0xFFF5F5F5);

    return Shimmer.fromColors(
      baseColor: baseColor,
      highlightColor: highlightColor,
      child: Container(
        height: height,
        width: width ?? double.infinity,
        margin: const EdgeInsets.symmetric(vertical: 6),
        decoration: BoxDecoration(
          color: baseColor,
          borderRadius: BorderRadius.circular(borderRadius),
        ),
      ),
    );
  }
}

// ─── SkeletonText ──────────────────────────────────────────────────────────────
class SkeletonText extends StatelessWidget {
  final double width;
  final double height;

  const SkeletonText({
    super.key,
    this.width = 120,
    this.height = 14,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final baseColor = isDark ? ZiriaColors.cardDark : const Color(0xFFE0E0E0);
    final highlightColor = isDark ? const Color(0xFF1a2f4a) : const Color(0xFFF5F5F5);

    return Shimmer.fromColors(
      baseColor: baseColor,
      highlightColor: highlightColor,
      child: Container(
        height: height,
        width: width,
        margin: const EdgeInsets.symmetric(vertical: 4),
        decoration: BoxDecoration(
          color: baseColor,
          borderRadius: BorderRadius.circular(8),
        ),
      ),
    );
  }
}

// ─── SkeletonCircle ────────────────────────────────────────────────────────────
class SkeletonCircle extends StatelessWidget {
  final double diameter;

  const SkeletonCircle({super.key, this.diameter = 48});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final baseColor = isDark ? ZiriaColors.cardDark : const Color(0xFFE0E0E0);
    final highlightColor = isDark ? const Color(0xFF1a2f4a) : const Color(0xFFF5F5F5);

    return Shimmer.fromColors(
      baseColor: baseColor,
      highlightColor: highlightColor,
      child: Container(
        height: diameter,
        width: diameter,
        decoration: BoxDecoration(
          color: baseColor,
          shape: BoxShape.circle,
        ),
      ),
    );
  }
}

// ─── SkeletonListTile ──────────────────────────────────────────────────────────
class SkeletonListTile extends StatelessWidget {
  const SkeletonListTile({super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      child: Row(
        children: [
          const SkeletonCircle(diameter: 44),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SkeletonText(width: double.infinity, height: 14),
                const SizedBox(height: 6),
                SkeletonText(width: MediaQuery.of(context).size.width * 0.4, height: 12),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ─── SkeletonGrid ──────────────────────────────────────────────────────────────
class SkeletonGrid extends StatelessWidget {
  final int count;
  final int crossAxisCount;

  const SkeletonGrid({
    super.key,
    this.count = 4,
    this.crossAxisCount = 2,
  });

  @override
  Widget build(BuildContext context) {
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: crossAxisCount,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
        childAspectRatio: 0.8,
      ),
      itemCount: count,
      itemBuilder: (_, __) => const SkeletonCard(height: 160, borderRadius: 16),
    );
  }
}
