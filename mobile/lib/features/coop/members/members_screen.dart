import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../shared/widgets/zir_design_system.dart';
import '../../../../core/widgets/skeleton_widget.dart';
import '../../../../core/widgets/state_widgets.dart';

// ── Model ─────────────────────────────────────────────────────────────────────
class CoopMember {
  final String id, name, email, role, governorate, status;
  final int? parcelCount;
  const CoopMember({required this.id, required this.name, required this.email, required this.role, required this.governorate, required this.status, this.parcelCount});
  factory CoopMember.fromJson(Map j) => CoopMember(
        id: j['id'] ?? '',
        name: j['name'] ?? '',
        email: j['email'] ?? '',
        role: j['role'] ?? 'FARMER',
        governorate: j['governorate'] ?? '',
        status: j['status'] ?? 'PENDING',
        parcelCount: j['parcel_count'],
      );
}

// ── Provider ─────────────────────────────────────────────────────────────────
final coopMembersProvider = FutureProvider.family<List<CoopMember>, String>((ref, q) async {
  final res = await ref.watch(dioProvider).get('/cooperatives/members', queryParameters: {'page': 1, 'limit': 50, if (q.isNotEmpty) 'search': q});
  final list = res.data is List ? res.data as List : (res.data['items'] ?? []);
  return list.map<CoopMember>((e) => CoopMember.fromJson(e)).toList();
});

// ── Screen ────────────────────────────────────────────────────────────────────
class CoopMembersScreen extends ConsumerStatefulWidget {
  const CoopMembersScreen({super.key});
  @override
  ConsumerState<CoopMembersScreen> createState() => _CoopMembersScreenState();
}

class _CoopMembersScreenState extends ConsumerState<CoopMembersScreen> {
  final _searchCtrl = TextEditingController();
  String _q = '';

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Column(children: [
      Padding(
        padding: const EdgeInsets.all(16),
        child: Container(
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.05),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Colors.white.withOpacity(0.08)),
          ),
          child: TextField(
            controller: _searchCtrl,
            style: const TextStyle(color: Colors.white),
            decoration: InputDecoration(
              hintText: 'Rechercher un membre...',
              hintStyle: const TextStyle(color: Colors.white30),
              prefixIcon: const Icon(Icons.search_rounded, color: Colors.white38),
              border: InputBorder.none,
              suffixIcon: _q.isNotEmpty
                  ? IconButton(icon: const Icon(Icons.clear_rounded, color: Colors.white38), onPressed: () { _searchCtrl.clear(); setState(() => _q = ''); })
                  : null,
            ),
            onChanged: (v) => setState(() => _q = v),
          ),
        ),
      ),
      Expanded(
        child: ref.watch(coopMembersProvider(_q)).when(
              loading: () => ListView.builder(itemCount: 6, itemBuilder: (_, __) => const SkeletonListTile()),
              error: (_, __) => ErrorState(onRetry: () => ref.invalidate(coopMembersProvider(_q))),
              data: (members) => members.isEmpty
                  ? const EmptyState(title: 'Aucun membre', emoji: '👥', subtitle: 'La liste est vide')
                  : ListView.builder(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      itemCount: members.length,
                      itemBuilder: (_, i) => _MemberCard(m: members[i], isDark: isDark, onValidate: () => ref.invalidate(coopMembersProvider(_q))),
                    ),
            ),
      ),
    ]);
  }
}

class _MemberCard extends StatelessWidget {
  final CoopMember m;
  final bool isDark;
  final VoidCallback onValidate;
  const _MemberCard({required this.m, required this.isDark, required this.onValidate});

  @override
  Widget build(BuildContext context) {
    final verified = m.status == 'VERIFIED' || m.status == 'ACTIVE';
    return ZirGlassCard(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      onTap: () => _showProfile(context, m),
      child: Row(children: [
        Container(
          width: 48, height: 48,
          decoration: BoxDecoration(
            gradient: ZiriaColors.primaryGradient,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Center(child: Text(m.name[0].toUpperCase(), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18))),
        ),
        const SizedBox(width: 16),
        Expanded(child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(m.name, style: ZiriaText.headingSmall()),
            Text('${m.governorate} · ${m.parcelCount ?? 0} parcelles', style: ZiriaText.bodySmall(color: Colors.white38)),
          ]
        )),
        if (!verified)
          Consumer(builder: (ctx, ref, _) => IconButton(
            icon: const Icon(Icons.check_circle_outline_rounded, color: ZiriaColors.accentEmerald, size: 24),
            onPressed: () async {
              await ref.read(dioProvider).patch('/cooperatives/members/${m.id}', data: {'status': 'VERIFIED'});
              onValidate();
            },
          )),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: (verified ? ZiriaColors.accentEmerald : ZiriaColors.warningOrange).withOpacity(0.1),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: (verified ? ZiriaColors.accentEmerald : ZiriaColors.warningOrange).withOpacity(0.2)),
          ),
          child: Text(verified ? 'ACTIF' : 'ATTENTE', 
              style: ZiriaText.label(color: verified ? ZiriaColors.accentEmerald : ZiriaColors.warningOrange, fontSize: 8)),
        ),
      ]),
    );
  }

  void _showProfile(BuildContext context, CoopMember m) => showModalBottomSheet(
        context: context,
        backgroundColor: Colors.transparent,
        builder: (_) => BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 15, sigmaY: 15),
          child: ZirGlassCard(
            margin: const EdgeInsets.all(16),
            padding: const EdgeInsets.all(24),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
              Row(
                children: [
                  Container(
                    width: 64, height: 64,
                    decoration: BoxDecoration(gradient: ZiriaColors.primaryGradient, borderRadius: BorderRadius.circular(16)),
                    child: Center(child: Text(m.name[0].toUpperCase(), style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold))),
                  ),
                  const SizedBox(width: 16),
                  Expanded(child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(m.name, style: ZiriaText.headingLarge()),
                      Text(m.email, style: ZiriaText.bodySmall(color: Colors.white38)),
                    ]
                  )),
                ],
              ),
              const SizedBox(height: 24),
              _DetailRow(label: 'RÔLE', value: m.role.replaceAll('_', ' ')),
              _DetailRow(label: 'GOUVERNORAT', value: m.governorate),
              _DetailRow(label: 'PARCELLES', value: '${m.parcelCount ?? 0} terrains enregistrés'),
              const SizedBox(height: 32),
              SizedBox(
                width: double.infinity,
                child: ZiriaButton(
                  label: 'SUSPENDRE LE COMPTE',
                  icon: Icons.block_flipped,
                  gradient: LinearGradient(colors: [ZiriaColors.errorRed, ZiriaColors.errorRed.withOpacity(0.8)]),
                  onPressed: () => Navigator.pop(context),
                ),
              ),
            ]),
          ),
        ),
      );
}

class _DetailRow extends StatelessWidget {
  final String label, value;
  const _DetailRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(label, style: ZiriaText.label(color: Colors.white24, fontSize: 10)),
        const SizedBox(height: 4),
        Text(value, style: ZiriaText.bodyLarge(color: Colors.white70)),
      ]),
    );
  }
}
