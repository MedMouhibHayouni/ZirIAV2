import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../shared/widgets/zir_design_system.dart';
import '../../../../core/widgets/skeleton_widget.dart';
import '../../../../core/widgets/state_widgets.dart';

// ── Model ─────────────────────────────────────────────────────────────────────
class PendingValidation {
  final String id, diseaseName, severity, status;
  final String? imageUrl, farmerName, farmerPhone;
  final double confidence;
  final DateTime createdAt;
  const PendingValidation({required this.id, required this.diseaseName, required this.severity, required this.status, this.imageUrl, this.farmerName, this.farmerPhone, required this.confidence, required this.createdAt});
  factory PendingValidation.fromJson(Map j) => PendingValidation(
        id: j['id'] ?? '',
        diseaseName: j['disease_name'] ?? '',
        severity: j['severity'] ?? 'FAIBLE',
        status: j['status'] ?? 'PENDING',
        imageUrl: j['image_url'],
        farmerName: j['farmer']?['name'],
        farmerPhone: j['farmer']?['phone'],
        confidence: (double.tryParse(j['confidence']?.toString() ?? '0') ?? 0),
        createdAt: DateTime.tryParse(j['created_at'] ?? '') ?? DateTime.now(),
      );
}

// ── Provider ─────────────────────────────────────────────────────────────────
final expertValidationsProvider = FutureProvider.family<List<PendingValidation>, String>((ref, status) async {
  final res = await ref.watch(dioProvider).get('/disease-detections/expert/pending', queryParameters: {'status': status, 'page': 1, 'limit': 30});
  final list = res.data is List ? res.data as List : (res.data['items'] ?? []);
  return list.map<PendingValidation>((e) => PendingValidation.fromJson(e)).toList();
});

// ── Screen ────────────────────────────────────────────────────────────────────
class ExpertValidationsScreen extends ConsumerStatefulWidget {
  const ExpertValidationsScreen({super.key});
  @override
  ConsumerState<ExpertValidationsScreen> createState() => _ExpertValidationsScreenState();
}

class _ExpertValidationsScreenState extends ConsumerState<ExpertValidationsScreen> with SingleTickerProviderStateMixin {
  late TabController _tab;
  @override
  void initState() {
    super.initState();
    _tab = TabController(length: 2, vsync: this);
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
          tabs: const [Tab(text: 'En attente'), Tab(text: 'Validées')],
        ),
      ),
      Expanded(
        child: TabBarView(
          controller: _tab,
          children: [_buildList('PENDING', isDark), _buildList('VALIDATED', isDark)],
        ),
      ),
    ]);
  }

  Widget _buildList(String status, bool isDark) {
    return ref.watch(expertValidationsProvider(status)).when(
          loading: () => ListView.builder(itemCount: 4, padding: const EdgeInsets.all(16), itemBuilder: (_, __) => const SkeletonCard(height: 120)),
          error: (_, __) => ErrorState(onRetry: () => ref.invalidate(expertValidationsProvider(status))),
          data: (items) => items.isEmpty
              ? const EmptyState(title: 'Aucune demande', emoji: '🔬', subtitle: 'Tout est à jour !')
              : ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: items.length,
                  itemBuilder: (_, i) => _validationCard(items[i], isDark, status),
                ),
        );
  }

  Widget _validationCard(PendingValidation v, bool isDark, String tabStatus) => ZirGlassCard(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(12),
        onTap: () => _showDetail(v, isDark),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Container(
            width: 80, height: 80,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              color: Colors.white.withOpacity(0.05),
              border: Border.all(color: Colors.white.withOpacity(0.1)),
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: v.imageUrl != null
                  ? CachedNetworkImage(imageUrl: v.imageUrl!, fit: BoxFit.cover, errorWidget: (_, __, ___) => _imgPlaceholder())
                  : _imgPlaceholder(),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(v.diseaseName, style: ZiriaText.headingSmall(), maxLines: 1, overflow: TextOverflow.ellipsis),
                const SizedBox(height: 4),
                if (v.farmerName != null)
                  Row(children: [
                    const Icon(Icons.person_outline_rounded, size: 12, color: Colors.white38),
                    const SizedBox(width: 4),
                    Text(v.farmerName!, style: ZiriaText.bodySmall(color: Colors.white38)),
                  ]),
                const SizedBox(height: 8),
                Row(children: [
                  _badge(v.severity, _sevColor(v.severity)),
                  const Spacer(),
                  Text('${(v.confidence * 100).toInt()}% CONFiance', style: ZiriaText.label(color: Colors.white24, fontSize: 9)),
                ]),
              ]
            )
          ),
          if (tabStatus == 'PENDING') ...[
            const SizedBox(width: 8),
            _ActionBtn(icon: Icons.check_rounded, color: ZiriaColors.accentEmerald, onTap: () => _validate(v.id, 'approve')),
          ]
        ]),
      );

  Future<void> _validate(String id, String action) async {
    await ref.read(dioProvider).post('/disease-detections/$id/validate', data: {'action': action});
    ref.invalidate(expertValidationsProvider('PENDING'));
    ref.invalidate(expertValidationsProvider('VALIDATED'));
  }

  void _showDetail(PendingValidation v, bool isDark) => showModalBottomSheet(
        context: context,
        isScrollControlled: true,
        backgroundColor: Colors.transparent,
        builder: (_) => BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 15, sigmaY: 15),
          child: ZirGlassCard(
            margin: const EdgeInsets.all(16),
            padding: EdgeInsets.zero,
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              if (v.imageUrl != null)
                ClipRRect(
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
                  child: CachedNetworkImage(imageUrl: v.imageUrl!, width: double.infinity, height: 240, fit: BoxFit.cover),
                ),
              Padding(
                padding: const EdgeInsets.all(24),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Row(children: [
                    Expanded(child: Text(v.diseaseName, style: ZiriaText.headingLarge())),
                    _badge(v.severity, _sevColor(v.severity)),
                  ]),
                  const SizedBox(height: 8),
                  Text('SIGNALÉ PAR: ${v.farmerName ?? 'Inconnu'}', style: ZiriaText.label(color: Colors.white38)),
                  if (v.farmerPhone != null) Text('TÉL: ${v.farmerPhone}', style: ZiriaText.bodySmall(color: Colors.white38)),
                  const SizedBox(height: 24),
                  Row(children: [
                    Expanded(child: ZirGradientButton(
                      label: 'Confirmer Diagnostic',
                      icon: Icons.check_circle_rounded,
                      onPressed: () { Navigator.pop(context); _validate(v.id, 'approve'); },
                    )),
                    const SizedBox(width: 12),
                    Expanded(child: ZiriaButton(
                      label: 'Rejeter',
                      icon: Icons.cancel_rounded,
                      gradient: LinearGradient(colors: [ZiriaColors.errorRed, ZiriaColors.errorRed.withOpacity(0.8)]),
                      onPressed: () { Navigator.pop(context); _validate(v.id, 'reject'); },
                    )),
                  ]),
                ]),
              ),
            ]),
          ),
        ),
      );

  Widget _imgPlaceholder() => const Center(child: Icon(Icons.eco_rounded, color: ZiriaColors.accentEmerald, size: 24));

  Widget _badge(String label, Color color) => Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(color: color.withOpacity(0.12), borderRadius: BorderRadius.circular(8), border: Border.all(color: color.withOpacity(0.2))),
      child: Text(label, style: ZiriaText.label(color: color, fontSize: 9)));

  Color _sevColor(String s) {
    if (s == 'ÉLEVÉE' || s == 'HIGH') return ZiriaColors.errorRed;
    if (s == 'MODÉRÉE' || s == 'MEDIUM') return ZiriaColors.warningOrange;
    return ZiriaColors.accentEmerald;
  }
}

class _ActionBtn extends StatelessWidget {
  final IconData icon;
  final Color color;
  final VoidCallback onTap;
  const _ActionBtn({required this.icon, required this.color, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(color: color.withOpacity(0.15), shape: BoxShape.circle, border: Border.all(color: color.withOpacity(0.3))),
        child: Icon(icon, color: color, size: 20),
      ),
    );
  }
}
