import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fl_chart/fl_chart.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../shared/widgets/zir_design_system.dart';
import '../../../../shared/widgets/skeleton.dart';
import '../../repositories/coop_repository.dart';

class CoopDashboardScreen extends ConsumerStatefulWidget {
  const CoopDashboardScreen({super.key});

  @override
  ConsumerState<CoopDashboardScreen> createState() => _CoopDashboardScreenState();
}

class _CoopDashboardScreenState extends ConsumerState<CoopDashboardScreen>
    with TickerProviderStateMixin {
  bool _isLoading = true;
  Map<String, dynamic>? _stats;
  List<dynamic> _activity = [];

  late AnimationController _headerCtrl;
  late Animation<Offset> _headerSlide;
  late AnimationController _contentCtrl;
  late Animation<double> _contentFade;

  @override
  void initState() {
    super.initState();

    _headerCtrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 700));
    _headerSlide = Tween<Offset>(begin: const Offset(0, -0.3), end: Offset.zero)
        .animate(CurvedAnimation(parent: _headerCtrl, curve: Curves.easeOutCubic));

    _contentCtrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 600));
    _contentFade = Tween<double>(begin: 0.0, end: 1.0)
        .animate(CurvedAnimation(parent: _contentCtrl, curve: Curves.easeOut));

    _loadData();
  }

  @override
  void dispose() {
    _headerCtrl.dispose();
    _contentCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      final repo = ref.read(coopRepositoryProvider);
      final results = await Future.wait([
        repo.getDashboardStats(),
        repo.getActivityFeed(),
      ]);
      if (mounted) {
        setState(() {
          _stats = results[0] as Map<String, dynamic>;
          _activity = results[1] as List<dynamic>;
          _isLoading = false;
        });
        _headerCtrl.forward();
        await Future.delayed(const Duration(milliseconds: 200));
        _contentCtrl.forward();
      }
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        backgroundColor: ZiriaColors.bgNight,
        body: SafeArea(child: SkeletonDashboard()),
      );
    }

    return Scaffold(
      backgroundColor: ZiriaColors.bgNight,
      body: RefreshIndicator(
        onRefresh: _loadData,
        color: ZiriaColors.accentEmerald,
        backgroundColor: ZiriaColors.bgCard,
        child: CustomScrollView(
          physics: const BouncingScrollPhysics(),
          slivers: [
            // ── Hero Header ──────────────────────────────────────────────
            SliverToBoxAdapter(child: _buildHeroHeader()),

            // ── KPI Grid ─────────────────────────────────────────────────
            SliverToBoxAdapter(
              child: FadeTransition(
                opacity: _contentFade,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 0),
                  child: _buildKpiGrid(),
                ),
              ),
            ),

            // ── Zone Health Chart ─────────────────────────────────────────
            SliverToBoxAdapter(
              child: FadeTransition(
                opacity: _contentFade,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 24, 20, 0),
                  child: _buildHealthChart(),
                ),
              ),
            ),

            // ── Quick Actions ─────────────────────────────────────────────
            SliverToBoxAdapter(
              child: FadeTransition(
                opacity: _contentFade,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 24, 20, 0),
                  child: _buildQuickActions(),
                ),
              ),
            ),

            // ── Activity Feed ─────────────────────────────────────────────
            SliverToBoxAdapter(
              child: FadeTransition(
                opacity: _contentFade,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 24, 20, 0),
                  child: ZirSectionHeader(
                    title: 'Activités Récentes',
                    actionLabel: 'Tout voir',
                    leading: Container(
                      width: 6, height: 18,
                      decoration: BoxDecoration(
                        gradient: ZiriaColors.primaryGradient,
                        borderRadius: BorderRadius.circular(3),
                      ),
                    ),
                  ),
                ),
              ),
            ),

            SliverPadding(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 120),
              sliver: SliverList(
                delegate: SliverChildBuilderDelegate(
                  (ctx, i) {
                    if (_activity.isEmpty) {
                      return Center(
                        child: Padding(
                          padding: const EdgeInsets.all(32),
                          child: Text('Aucune activité récente', style: ZiriaText.bodyMedium()),
                        ),
                      );
                    }
                    if (i >= _activity.length) return null;
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: FadeTransition(
                        opacity: _contentFade,
                        child: _buildActivityTile(_activity[i]),
                      ),
                    );
                  },
                  childCount: _activity.isEmpty ? 1 : (_activity.length > 8 ? 8 : _activity.length),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── Hero Header ─────────────────────────────────────────────────────────────
  Widget _buildHeroHeader() {
    final alerts = _stats?['active_alerts'] ?? 0;
    return SlideTransition(
      position: _headerSlide,
      child: Stack(
        children: [
          // Background gradient
          Container(
            height: 240,
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [Color(0xFF030D06), Color(0xFF052E16), Color(0xFF0A1628)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
            ),
          ),
          // Pattern overlay
          Positioned.fill(
            child: CustomPaint(painter: _DotPatternPainter()),
          ),
          // Glow orb
          Positioned(
            top: -40, right: -40,
            child: Container(
              width: 200, height: 200,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [ZiriaColors.accentEmerald.withOpacity(0.2), Colors.transparent],
                ),
              ),
            ),
          ),
          // Content
          SafeArea(
            bottom: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      // Logo / avatar
                      Container(
                        width: 44, height: 44,
                        decoration: BoxDecoration(
                          gradient: ZiriaColors.primaryGradient,
                          borderRadius: BorderRadius.circular(14),
                          boxShadow: ZiriaShadows.emeraldGlow,
                        ),
                        child: const Center(
                          child: Text('Z', style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w900)),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Bonjour, Président', style: ZiriaText.bodySmall(color: ZiriaColors.accentEmerald, fontWeight: FontWeight.w600)),
                            Text('SMSA Foussana', style: ZiriaText.headingMedium()),
                          ],
                        ),
                      ),
                      ZirNotifButton(count: alerts),
                    ],
                  ),
                  const SizedBox(height: 24),
                  // Status badges
                  Wrap(
                    spacing: 8,
                    children: [
                      ZirAlertChip(
                        label: '${_stats?['total_members'] ?? 0} Membres',
                        color: ZiriaColors.accentEmerald,
                        icon: Icons.people_alt_rounded,
                      ),
                      if (alerts > 0)
                        ZirAlertChip(
                          label: '$alerts Alertes',
                          color: ZiriaColors.errorRed,
                          icon: Icons.warning_rounded,
                        ),
                      const ZirAlertChip(
                        label: 'Zone Active',
                        color: ZiriaColors.infoBlue,
                        icon: Icons.circle,
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ── KPI Grid ─────────────────────────────────────────────────────────────────
  Widget _buildKpiGrid() {
    final kpis = [
      _KpiDef('Membres',  '${_stats?['total_members'] ?? 0}',   Icons.people_alt_rounded,    ZiriaColors.emeraldGlow),
      _KpiDef('Alertes',  '${_stats?['active_alerts'] ?? 0}',   Icons.warning_rounded,       ZiriaColors.dangerGradient),
      _KpiDef('Annonces', '${_stats?['total_listings'] ?? 0}',  Icons.storefront_rounded,    ZiriaColors.goldGradient),
      _KpiDef('Revenus',  '${_stats?['monthly_revenue'] ?? 0} DT', Icons.account_balance_wallet_rounded, ZiriaColors.oceanGradient),
    ];

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: 14,
        mainAxisSpacing: 14,
        childAspectRatio: 1.55,
      ),
      itemCount: kpis.length,
      itemBuilder: (ctx, i) => ZirKpiCard(
        label: kpis[i].label,
        value: kpis[i].value,
        icon: kpis[i].icon,
        gradient: kpis[i].gradient,
      ),
    );
  }

  // ── Zone Health Chart ─────────────────────────────────────────────────────────
  Widget _buildHealthChart() {
    final spots = [
      const FlSpot(0, 62), const FlSpot(1, 71), const FlSpot(2, 68),
      const FlSpot(3, 80), const FlSpot(4, 75), const FlSpot(5, 88), const FlSpot(6, 84),
    ];
    final labels = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'];

    return ZirGlassCard(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('SANTÉ DE LA ZONE', style: ZiriaText.label(color: ZiriaColors.accentEmerald)),
                  Text('Indice de vitalité 7 jours', style: ZiriaText.headingSmall()),
                ],
              )),
              const ZirAlertChip(label: '+8.5%', color: ZiriaColors.accentEmerald, icon: Icons.trending_up_rounded),
            ],
          ),
          const SizedBox(height: 24),
          SizedBox(
            height: 160,
            child: LineChart(
              LineChartData(
                minY: 40,
                maxY: 100,
                gridData: FlGridData(
                  show: true,
                  getDrawingHorizontalLine: (v) => FlLine(
                    color: Colors.white.withOpacity(0.04),
                    strokeWidth: 1,
                  ),
                  drawVerticalLine: false,
                ),
                borderData: FlBorderData(show: false),
                titlesData: FlTitlesData(
                  leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  bottomTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      getTitlesWidget: (val, meta) => Padding(
                        padding: const EdgeInsets.only(top: 8),
                        child: Text(labels[val.toInt()], style: ZiriaText.label()),
                      ),
                    ),
                  ),
                ),
                lineTouchData: LineTouchData(
                  touchTooltipData: LineTouchTooltipData(
                    getTooltipColor: (_) => ZiriaColors.bgCard,
                    getTooltipItems: (spots) => spots.map((s) => LineTooltipItem(
                      '${s.y.round()}%',
                      ZiriaText.bodySmall(color: ZiriaColors.accentEmerald, fontWeight: FontWeight.w700),
                    )).toList(),
                  ),
                ),
                lineBarsData: [
                  LineChartBarData(
                    spots: spots,
                    isCurved: true,
                    curveSmoothness: 0.35,
                    color: ZiriaColors.accentEmerald,
                    barWidth: 3,
                    isStrokeCapRound: true,
                    dotData: FlDotData(
                      show: true,
                      getDotPainter: (sp, _, __, ___) => FlDotCirclePainter(
                        radius: 4,
                        color: ZiriaColors.accentEmerald,
                        strokeWidth: 2,
                        strokeColor: ZiriaColors.bgNight,
                      ),
                    ),
                    belowBarData: BarAreaData(
                      show: true,
                      gradient: LinearGradient(
                        colors: [
                          ZiriaColors.accentEmerald.withOpacity(0.2),
                          ZiriaColors.accentEmerald.withOpacity(0.0),
                        ],
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ── Quick Actions ─────────────────────────────────────────────────────────────
  Widget _buildQuickActions() {
    final actions = [
      const _ActionDef('Ajouter membre',    Icons.person_add_rounded,       ZiriaColors.primaryGradient),
      const _ActionDef('Envoyer alerte',   Icons.campaign_rounded,          ZiriaColors.dangerGradient),
      const _ActionDef('Rapport',          Icons.assessment_rounded,        ZiriaColors.goldGradient),
      const _ActionDef('Contrats',         Icons.handshake_rounded,         ZiriaColors.oceanGradient),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        ZirSectionHeader(
          title: 'Actions Rapides',
          leading: Container(
            width: 6, height: 18,
            decoration: BoxDecoration(
              gradient: ZiriaColors.primaryGradient,
              borderRadius: BorderRadius.circular(3),
            ),
          ),
        ),
        const SizedBox(height: 14),
        SizedBox(
          height: 90,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: actions.length,
            separatorBuilder: (_, __) => const SizedBox(width: 12),
            itemBuilder: (ctx, i) {
              final a = actions[i];
              return GestureDetector(
                onTap: () {},
                child: ZirGlassCard(
                  padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
                  radius: 18,
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          gradient: a.gradient,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Icon(a.icon, color: Colors.white, size: 20),
                      ),
                      const SizedBox(height: 6),
                      Text(a.label, style: ZiriaText.bodySmall(fontWeight: FontWeight.w600)),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  // ── Activity Tile ─────────────────────────────────────────────────────────────
  Widget _buildActivityTile(dynamic activity) {
    final type   = activity['type'] ?? 'OTHER';
    final actor  = activity['actor_name'] ?? 'Inconnu';
    final action = activity['action'] ?? 'action';
    final entity = activity['entity_name'] ?? '';
    final date   = activity['created_at'];
    String timeStr = '';
    if (date != null) {
      try {
        final dt = DateTime.parse(date);
        final diff = DateTime.now().difference(dt);
        if (diff.inMinutes < 60) {
          timeStr = 'Il y a ${diff.inMinutes}min';
        } else if (diff.inHours < 24) timeStr = 'Il y a ${diff.inHours}h';
        else timeStr = 'Il y a ${diff.inDays}j';
      } catch (_) {}
    }

    return ZirActivityItem(
      icon:     _activityIcon(type),
      color:    _activityColor(type),
      title:    '$actor $action',
      subtitle: entity.isNotEmpty ? entity : type,
      time:     timeStr,
    );
  }

  IconData _activityIcon(String t) => switch (t) {
    'B2B_CONNECTION'   => Icons.handshake_rounded,
    'DISEASE_DETECTION' => Icons.bug_report_rounded,
    'JOB_OFFER'        => Icons.work_rounded,
    _                  => Icons.info_rounded,
  };

  Color _activityColor(String t) => switch (t) {
    'B2B_CONNECTION'   => ZiriaColors.earthAmber,
    'DISEASE_DETECTION' => ZiriaColors.errorRed,
    'JOB_OFFER'        => ZiriaColors.accentEmerald,
    _                  => ZiriaColors.textSecondary,
  };
}

// ─── DATA CLASSES ─────────────────────────────────────────────────────────────
class _KpiDef {
  final String label, value;
  final IconData icon;
  final LinearGradient gradient;
  const _KpiDef(this.label, this.value, this.icon, this.gradient);
}

class _ActionDef {
  final String label;
  final IconData icon;
  final LinearGradient gradient;
  const _ActionDef(this.label, this.icon, this.gradient);
}

// ─── DOT PATTERN PAINTER ─────────────────────────────────────────────────────
class _DotPatternPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.white.withOpacity(0.03)
      ..style = PaintingStyle.fill;
    const spacing = 24.0;
    for (double x = 0; x < size.width; x += spacing) {
      for (double y = 0; y < size.height; y += spacing) {
        canvas.drawCircle(Offset(x, y), 1.5, paint);
      }
    }
  }

  @override
  bool shouldRepaint(_) => false;
}
