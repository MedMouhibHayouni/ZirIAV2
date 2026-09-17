import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../shared/widgets/zir_design_system.dart';
import '../../../../core/widgets/skeleton_widget.dart';
import '../../../../core/widgets/state_widgets.dart';

class JobApplication {
  final String id, jobTitle, status;
  final double? salary;
  final DateTime appliedAt;
  JobApplication({required this.id, required this.jobTitle, required this.status, this.salary, required this.appliedAt});
  factory JobApplication.fromJson(Map j) => JobApplication(
        id: j['id'] ?? '',
        jobTitle: j['job_offer']?['title'] ?? '',
        status: j['status'] ?? 'PENDING',
        salary: (j['job_offer']?['salary_day'])?.toDouble(),
        appliedAt: DateTime.tryParse(j['created_at'] ?? '') ?? DateTime.now(),
      );
}

final applicationsProvider = FutureProvider<List<JobApplication>>((ref) async {
  final res = await ref.watch(dioProvider).get('/workers/my-applications', queryParameters: {'page': 1, 'limit': 30});
  final list = res.data is List ? res.data as List : (res.data['items'] ?? []);
  return list.map<JobApplication>((e) => JobApplication.fromJson(e)).toList();
});

class WorkerApplicationsScreen extends ConsumerWidget {
  const WorkerApplicationsScreen({super.key});

  Color _statusColor(String s) {
    if (s == 'ACCEPTED') return ZiriaColors.accentEmerald;
    if (s == 'REJECTED') return ZiriaColors.errorRed;
    return ZiriaColors.warningOrange;
  }

  String _statusLabel(String s) {
    if (s == 'ACCEPTED') return 'ACCEPTÉE';
    if (s == 'REJECTED') return 'REFUSÉE';
    return 'EN ATTENTE';
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.all(20),
          child: Text('MES CANDIDATURES', style: ZiriaText.label(color: Colors.white38, letterSpacing: 1.5)),
        ),
        Expanded(
          child: ref.watch(applicationsProvider).when(
                loading: () => ListView.builder(padding: const EdgeInsets.symmetric(horizontal: 16), itemCount: 5, itemBuilder: (_, __) => const SkeletonCard(height: 100)),
                error: (_, __) => ErrorState(onRetry: () => ref.invalidate(applicationsProvider)),
                data: (apps) => apps.isEmpty
                    ? const EmptyState(title: 'Aucune candidature', emoji: '📝', subtitle: 'Postulez à une offre')
                    : ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        itemCount: apps.length,
                        itemBuilder: (_, i) => _ApplicationCard(a: apps[i], color: _statusColor(apps[i].status), label: _statusLabel(apps[i].status)),
                      ),
              ),
        ),
      ],
    );
  }
}

class _ApplicationCard extends StatelessWidget {
  final JobApplication a;
  final Color color;
  final String label;
  const _ApplicationCard({required this.a, required this.color, required this.label});

  @override
  Widget build(BuildContext context) {
    return ZirGlassCard(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      child: Row(children: [
        Container(
          width: 44, height: 44,
          decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(12)),
          child: Icon(Icons.description_rounded, color: color, size: 22),
        ),
        const SizedBox(width: 16),
        Expanded(child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(a.jobTitle, style: ZiriaText.headingSmall(), maxLines: 1, overflow: TextOverflow.ellipsis),
            Text(DateFormat('dd MMM yyyy').format(a.appliedAt), style: ZiriaText.label(color: Colors.white24, fontSize: 10)),
          ]
        )),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
          decoration: BoxDecoration(
            color: color.withOpacity(0.12),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: color.withOpacity(0.2)),
          ),
          child: Text(label, style: ZiriaText.label(color: color, fontSize: 9)),
        ),
      ]),
    );
  }
}
