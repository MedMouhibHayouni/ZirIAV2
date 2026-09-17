import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../shared/widgets/zir_design_system.dart';
import '../../../../core/widgets/skeleton_widget.dart';
import '../../../../core/widgets/state_widgets.dart';

// â”€â”€ Models â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
class JobOffer {
  final String id, title, company, location, governorate, description;
  final double salary;
  final DateTime date;
  final LatLng? coord;
  JobOffer({required this.id, required this.title, required this.company, required this.location, required this.governorate, required this.description, required this.salary, required this.date, this.coord});

  factory JobOffer.fromJson(Map j) => JobOffer(
        id: j['id'] ?? '',
        title: j['title'] ?? '',
        company: j['employer_name'] ?? 'Inconnu',
        location: j['location'] ?? '',
        governorate: j['governorate'] ?? 'Tunis',
        description: j['description'] ?? '',
        salary: (double.tryParse(j['salary_day']?.toString() ?? '0') ?? 0),
        date: DateTime.tryParse(j['created_at'] ?? '') ?? DateTime.now(),
        coord: j['latitude'] != null ? LatLng(j['latitude'], j['longitude']) : null,
      );
}

// â”€â”€ Provider â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
final jobsProvider = FutureProvider.family<List<JobOffer>, String?>((ref, gov) async {
  final params = gov != null ? {'governorate': gov} : null;
  final res = await ref.watch(dioProvider).get('/jobs/offers', queryParameters: params);
  final list = res.data is List ? res.data as List : (res.data['items'] ?? []);
  return list.map<JobOffer>((e) => JobOffer.fromJson(e)).toList();
});

// â”€â”€ Screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
class WorkerJobsScreen extends ConsumerStatefulWidget {
  const WorkerJobsScreen({super.key});
  @override
  ConsumerState<WorkerJobsScreen> createState() => _WorkerJobsScreenState();
}

class _WorkerJobsScreenState extends ConsumerState<WorkerJobsScreen> {
  String? _selectedGov;
  bool _isMapView = false;
  final _govs = ['Kasserine', 'Sidi Bouzid', 'Siliana', 'Kairouan', 'BÃ©ja', 'Jendouka', 'Le Kef'];

  @override
  Widget build(BuildContext context) {
    final jobsAsync = ref.watch(jobsProvider(_selectedGov));
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Stack(
      children: [
        // Content
        jobsAsync.when(
          loading: () => ListView.builder(padding: const EdgeInsets.fromLTRB(16, 80, 16, 16), itemCount: 4, itemBuilder: (_, __) => const SkeletonCard(height: 140)),
          error: (_, __) => ErrorState(onRetry: () => ref.invalidate(jobsProvider(_selectedGov))),
          data: (jobs) => _isMapView ? _buildMap(jobs, isDark) : _buildList(jobs, isDark),
        ),

        // Floating HUD: Filter & Toggle
        Positioned(
          top: 16, left: 16, right: 16,
          child: ZirGlassCard(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: [
                Expanded(
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      hint: Text('TOUTE LA TUNISIE', style: ZiriaText.label(color: Colors.white70, fontSize: 10)),
                      value: _selectedGov,
                      dropdownColor: ZiriaColors.bgDeep,
                      items: [
                        DropdownMenuItem(value: null, child: Text('TOUTE LA TUNISIE', style: ZiriaText.label(color: Colors.white70, fontSize: 10))),
                        ..._govs.map((g) => DropdownMenuItem(value: g, child: Text(g.toUpperCase(), style: ZiriaText.label(color: Colors.white, fontSize: 10)))),
                      ],
                      onChanged: (v) => setState(() => _selectedGov = v),
                    ),
                  ),
                ),
                Container(width: 1, height: 24, color: Colors.white12),
                IconButton(
                  icon: Icon(_isMapView ? Icons.format_list_bulleted_rounded : Icons.map_rounded, color: ZiriaColors.accentEmerald, size: 20),
                  onPressed: () => setState(() => _isMapView = !_isMapView),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildList(List<JobOffer> jobs, bool isDark) {
    if (jobs.isEmpty) return const EmptyState(title: 'Aucune offre', emoji: 'ðŸ”', subtitle: 'Changez de zone');
    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(16, 88, 16, 80),
      itemCount: jobs.length,
      itemBuilder: (ctx, i) => _JobOfferCard(job: jobs[i]),
    );
  }

  Widget _buildMap(List<JobOffer> jobs, bool isDark) {
    final tileUrl = isDark ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' : 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
    return FlutterMap(
      options: const MapOptions(initialCenter: LatLng(35.5, 9.5), initialZoom: 7.5),
      children: [
        TileLayer(retinaMode: RetinaMode.isHighDensity(context), urlTemplate: tileUrl, subdomains: const ['a', 'b', 'c']),
        MarkerLayer(
          markers: jobs.where((j) => j.coord != null).map((j) => Marker(
            point: j.coord!,
            width: 40, height: 40,
            child: const Icon(Icons.location_on_rounded, color: ZiriaColors.accentEmerald, size: 30),
          )).toList(),
        ),
      ],
    );
  }
}

class _JobOfferCard extends StatelessWidget {
  final JobOffer job;
  const _JobOfferCard({required this.job});

  @override
  Widget build(BuildContext context) {
    return ZirGlassCard(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      onTap: () => _showDetail(context),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          Expanded(child: Text(job.title, style: ZiriaText.headingSmall(), maxLines: 1, overflow: TextOverflow.ellipsis)),
          Text('${job.salary.toInt()} TND/J', style: ZiriaText.labelBold(color: ZiriaColors.accentEmerald)),
        ]),
        const SizedBox(height: 6),
        Row(children: [
          const Icon(Icons.business_center_rounded, size: 12, color: Colors.white38),
          const SizedBox(width: 6),
          Text(job.company, style: ZiriaText.bodySmall(color: Colors.white38)),
        ]),
        const SizedBox(height: 12),
        Text(job.description, style: ZiriaText.bodySmall(color: Colors.white70), maxLines: 2, overflow: TextOverflow.ellipsis),
        const SizedBox(height: 16),
        Row(children: [
          const Icon(Icons.location_on_rounded, size: 12, color: Colors.white30),
          const SizedBox(width: 6),
          Text('${job.governorate}, ${job.location}', style: ZiriaText.label(color: Colors.white24, fontSize: 9)),
          const Spacer(),
          ZirGradientButton(label: 'POSTULER', height: 32, width: 100, onPressed: () => _apply(context)),
        ]),
      ]),
    );
  }

  void _showDetail(BuildContext context) {
    // Show premium detail bottom sheet
  }

  void _apply(BuildContext context) {
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Candidature envoyÃ©e avec succÃ¨s !')));
  }
}
