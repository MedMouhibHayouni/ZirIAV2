import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../shared/widgets/zir_design_system.dart';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  AMBASSADOR SHELL  —  "Terrain Blue" accent palette
//  Tabs: Accueil · Mes Agriculteurs · Signalement · Marché
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class AmbassadorMainShell extends ConsumerStatefulWidget {
  const AmbassadorMainShell({super.key});
  @override
  ConsumerState<AmbassadorMainShell> createState() => _AmbassadorMainShellState();
}

class _AmbassadorMainShellState extends ConsumerState<AmbassadorMainShell> {
  int _idx = 0;

  static const _tabs = [
    _AmbTab(icon: Icons.dashboard_rounded,     label: 'Accueil',     color: Color(0xFF60A5FA)),
    _AmbTab(icon: Icons.people_alt_rounded,    label: 'Agriculteurs',color: Color(0xFF34D399)),
    _AmbTab(icon: Icons.campaign_rounded,      label: 'Signalement', color: Color(0xFFF87171)),
    _AmbTab(icon: Icons.storefront_rounded,    label: 'Marché',      color: Color(0xFFFBBF24)),
  ];

  late final List<Widget> _screens = [
    const _AmbDashboardScreen(),
    const _AmbFarmersScreen(),
    const _AmbReportScreen(),
    const _PlaceholderTab(title: 'Marché Local', icon: Icons.storefront_rounded, color: Color(0xFFFBBF24)),
  ];

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Scaffold(
      extendBody: true,
      backgroundColor: isDark ? ZiriaColors.bgNight : ZiriaColors.bgLight,
      body: IndexedStack(index: _idx, children: _screens),
      bottomNavigationBar: _AmbBottomNav(
        tabs: _tabs,
        currentIndex: _idx,
        isDark: isDark,
        onChanged: (i) => setState(() => _idx = i),
      ),
    );
  }
}

// ─── BOTTOM NAV ───────────────────────────────────────────────────────────────
class _AmbBottomNav extends StatelessWidget {
  final List<_AmbTab> tabs;
  final int currentIndex;
  final bool isDark;
  final ValueChanged<int> onChanged;
  const _AmbBottomNav({required this.tabs, required this.currentIndex, required this.isDark, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return ClipRect(
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 24, sigmaY: 24),
        child: Container(
          decoration: BoxDecoration(
            color: (isDark ? ZiriaColors.bgDeep : Colors.white).withOpacity(0.88),
            border: Border(top: BorderSide(color: isDark ? Colors.white.withOpacity(0.07) : Colors.black.withOpacity(0.06))),
          ),
          child: SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: List.generate(tabs.length, (i) => _AmbNavTab(
                  tab: tabs[i], isActive: currentIndex == i, isDark: isDark, onTap: () => onChanged(i),
                )),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _AmbNavTab extends StatefulWidget {
  final _AmbTab tab;
  final bool isActive;
  final bool isDark;
  final VoidCallback onTap;
  const _AmbNavTab({required this.tab, required this.isActive, required this.isDark, required this.onTap});
  @override State<_AmbNavTab> createState() => _AmbNavTabState();
}
class _AmbNavTabState extends State<_AmbNavTab> with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<double> _scale;
  @override void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 350));
    _scale = Tween<double>(begin: 1.0, end: 1.12).animate(CurvedAnimation(parent: _ctrl, curve: Curves.elasticOut));
    if (widget.isActive) _ctrl.forward();
  }
  @override void didUpdateWidget(_AmbNavTab old) {
    super.didUpdateWidget(old);
    if (widget.isActive && !old.isActive) {
      _ctrl.forward(from: 0);
    } else if (!widget.isActive && old.isActive) _ctrl.reverse();
  }
  @override void dispose() { _ctrl.dispose(); super.dispose(); }
  @override
  Widget build(BuildContext context) {
    final inactiveColor = widget.isDark ? Colors.white30 : Colors.black38;
    return ScaleTransition(
      scale: _scale,
      child: GestureDetector(
        onTap: widget.onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 240),
          padding: EdgeInsets.symmetric(horizontal: widget.isActive ? 16 : 10, vertical: 8),
          decoration: BoxDecoration(
            color: widget.isActive ? widget.tab.color.withOpacity(0.13) : Colors.transparent,
            borderRadius: BorderRadius.circular(22),
            border: widget.isActive ? Border.all(color: widget.tab.color.withOpacity(0.28)) : null,
          ),
          child: Row(mainAxisSize: MainAxisSize.min, children: [
            Icon(widget.tab.icon, color: widget.isActive ? widget.tab.color : inactiveColor, size: 22),
            AnimatedSize(
              duration: const Duration(milliseconds: 240),
              child: widget.isActive
                  ? Row(children: [
                      const SizedBox(width: 6),
                      Text(widget.tab.label, style: ZiriaText.bodySmall(color: widget.tab.color, fontWeight: FontWeight.w700)),
                    ])
                  : const SizedBox.shrink(),
            ),
          ]),
        ),
      ),
    );
  }
}

class _AmbTab {
  final IconData icon;
  final String label;
  final Color color;
  const _AmbTab({required this.icon, required this.label, required this.color});
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  AMBASSADOR DASHBOARD TAB
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class _AmbDashboardScreen extends StatelessWidget {
  const _AmbDashboardScreen();
  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Scaffold(
      backgroundColor: isDark ? ZiriaColors.bgNight : ZiriaColors.bgLight,
      body: CustomScrollView(
        physics: const BouncingScrollPhysics(),
        slivers: [
          SliverToBoxAdapter(child: _buildHero()),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 120),
            sliver: SliverList(delegate: SliverChildListDelegate([
              const SizedBox(height: 24),
              _buildKpis(),
              const SizedBox(height: 28),
              const ZirSectionHeader(title: 'Mes Agriculteurs', actionLabel: 'Voir tous'),
              const SizedBox(height: 14),
              ..._mockFarmers.map(_buildFarmerCard),
              const SizedBox(height: 24),
              const ZirSectionHeader(title: 'Signalements Récents', actionLabel: 'Historique'),
              const SizedBox(height: 14),
              const ZirActivityItem(icon: Icons.bug_report_rounded, color: ZiriaColors.errorRed,
                title: 'Mildiou détecté — Parcel Z14', subtitle: 'Transmis à Expert CRDA', time: 'Il y a 2h'),
              const SizedBox(height: 10),
              const ZirActivityItem(icon: Icons.water_drop_rounded, color: Color(0xFF60A5FA),
                title: 'Stress hydrique signalé', subtitle: 'Foussana, Zone Nord', time: 'Il y a 5h'),
            ])),
          ),
        ],
      ),
    );
  }

  Widget _buildHero() {
    return Stack(children: [
      Container(
        height: 200,
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFF030C1A), Color(0xFF0C2044), Color(0xFF0A1628)],
            begin: Alignment.topLeft, end: Alignment.bottomRight,
          ),
        ),
      ),
      Positioned(top: -30, right: -30, child: Container(
        width: 180, height: 180,
        decoration: BoxDecoration(shape: BoxShape.circle,
          gradient: RadialGradient(colors: [const Color(0xFF60A5FA).withOpacity(0.2), Colors.transparent]),
        ),
      )),
      SafeArea(bottom: false, child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Container(
              width: 44, height: 44,
              decoration: BoxDecoration(
                gradient: const LinearGradient(colors: [Color(0xFF1D4ED8), Color(0xFF60A5FA)]),
                borderRadius: BorderRadius.circular(14),
                boxShadow: [BoxShadow(color: const Color(0xFF60A5FA).withOpacity(0.3), blurRadius: 16, offset: const Offset(0, 6))],
              ),
              child: const Center(child: Text('A', style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w900))),
            ),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('Ambassadeur ZirIA', style: ZiriaText.bodySmall(color: const Color(0xFF60A5FA), fontWeight: FontWeight.w600)),
              Text('Bonjour, Mohamed', style: ZiriaText.headingMedium()),
            ])),
            const ZirNotifButton(count: 3),
          ]),
          const SizedBox(height: 20),
          const Wrap(spacing: 8, children: [
            ZirAlertChip(label: '12 Agriculteurs', color: Color(0xFF34D399), icon: Icons.people_alt_rounded),
            ZirAlertChip(label: 'Zone Foussana', color: Color(0xFF60A5FA), icon: Icons.location_on_rounded),
          ]),
        ]),
      )),
    ]);
  }

  Widget _buildKpis() {
    return GridView.count(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisCount: 2, crossAxisSpacing: 14, mainAxisSpacing: 14, childAspectRatio: 1.55,
      children: const [
        ZirKpiCard(label: 'Agriculteurs', value: '12', icon: Icons.people_alt_rounded,
          gradient: LinearGradient(colors: [Color(0xFF1D4ED8), Color(0xFF60A5FA)], begin: Alignment.topLeft, end: Alignment.bottomRight)),
        ZirKpiCard(label: 'Signalements', value: '3', icon: Icons.campaign_rounded,
          gradient: LinearGradient(colors: [Color(0xFF7F1D1D), Color(0xFFEF4444)], begin: Alignment.topLeft, end: Alignment.bottomRight)),
        ZirKpiCard(label: 'Zones actives', value: '2', icon: Icons.map_rounded,
          gradient: LinearGradient(colors: [Color(0xFF064E3B), Color(0xFF34D399)], begin: Alignment.topLeft, end: Alignment.bottomRight)),
        ZirKpiCard(label: 'Résolu ce mois', value: '8', icon: Icons.check_circle_rounded,
          gradient: LinearGradient(colors: [Color(0xFF78350F), Color(0xFFFBBF24)], begin: Alignment.topLeft, end: Alignment.bottomRight)),
      ],
    );
  }

  static const _mockFarmers = [
    {'name': 'Ahmed Ben Salah', 'zone': 'Foussana Nord', 'alert': true},
    {'name': 'Fatma Trabelsi', 'zone': 'Foussana Sud', 'alert': false},
    {'name': 'Karim Mansour', 'zone': 'Kasserine', 'alert': false},
  ];

  Widget _buildFarmerCard(Map m) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: ZirGlassCard(
        padding: const EdgeInsets.all(14),
        radius: 18,
        child: Row(children: [
          ZirAvatar(name: m['name'] as String, size: 46,
            gradient: const LinearGradient(colors: [Color(0xFF1D4ED8), Color(0xFF60A5FA)])),
          const SizedBox(width: 14),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(m['name'] as String, style: ZiriaText.bodyMedium(color: ZiriaColors.textPrimary, fontWeight: FontWeight.w700)),
            Text(m['zone'] as String, style: ZiriaText.bodySmall()),
          ])),
          if (m['alert'] as bool)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(color: ZiriaColors.errorRed.withOpacity(0.15), borderRadius: BorderRadius.circular(20), border: Border.all(color: ZiriaColors.errorRed.withOpacity(0.4))),
              child: Text('ALERTE', style: ZiriaText.label(color: ZiriaColors.errorRed)),
            )
          else
            const Icon(Icons.chevron_right_rounded, color: ZiriaColors.textMuted, size: 20),
        ]),
      ),
    );
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  AMBASSADOR FARMERS TAB  (list)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class _AmbFarmersScreen extends StatelessWidget {
  const _AmbFarmersScreen();
  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Scaffold(
      backgroundColor: isDark ? ZiriaColors.bgNight : ZiriaColors.bgLight,
      body: SafeArea(child: Column(children: [
        const Padding(
          padding: EdgeInsets.fromLTRB(20, 20, 20, 12),
          child: ZirSectionHeader(title: 'Mes 12 Agriculteurs', actionLabel: '+ Ajouter'),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: ZirGlassCard(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            radius: 14,
            child: Row(children: [
              const Icon(Icons.search_rounded, color: ZiriaColors.textMuted, size: 20),
              const SizedBox(width: 10),
              Text('Rechercher un agriculteur...', style: ZiriaText.bodyMedium()),
            ]),
          ),
        ),
        const SizedBox(height: 12),
        Expanded(
          child: ListView.separated(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 100),
            itemCount: 8,
            separatorBuilder: (_, __) => const SizedBox(height: 10),
            itemBuilder: (ctx, i) {
              final names = ['Ahmed Ben Salah', 'Fatma Trabelsi', 'Karim Mansour', 'Sami Bejaoui', 'Leila Jomni', 'Omar Ferchichi', 'Nadia Ksibi', 'Hassen Dridi'];
              final zones = ['Foussana Nord', 'Foussana Sud', 'Kasserine', 'Sbeitla', 'Foussana', 'Kasserine', 'Oued Zroud', 'Feriana'];
              return ZirGlassCard(
                padding: const EdgeInsets.all(14), radius: 18,
                child: Row(children: [
                  ZirAvatar(name: names[i], size: 46,
                    gradient: LinearGradient(colors: [const Color(0xFF1D4ED8).withOpacity(0.8), const Color(0xFF60A5FA)])),
                  const SizedBox(width: 14),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(names[i], style: ZiriaText.bodyMedium(color: ZiriaColors.textPrimary, fontWeight: FontWeight.w700)),
                    Text(zones[i], style: ZiriaText.bodySmall()),
                  ])),
                  ZirHealthBar(value: 0.5 + (i % 3) * 0.2, label: ''),
                ]),
              );
            },
          ),
        ),
      ])),
    );
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  AMBASSADOR REPORT / SIGNALEMENT TAB
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class _AmbReportScreen extends StatefulWidget {
  const _AmbReportScreen();
  @override State<_AmbReportScreen> createState() => _AmbReportScreenState();
}
class _AmbReportScreenState extends State<_AmbReportScreen> {
  String _location = '';
  bool _isLocating = false;
  bool _isSubmitting = false;
  String _type = 'Maladie inconnue';
  final _noteCtrl = TextEditingController();

  @override void dispose() { _noteCtrl.dispose(); super.dispose(); }

  Future<void> _captureGps() async {
    setState(() => _isLocating = true);
    await Future.delayed(const Duration(seconds: 1));
    setState(() { _location = '35.612°N  8.824°E'; _isLocating = false; });
  }

  Future<void> _submit() async {
    setState(() => _isSubmitting = true);
    await Future.delayed(const Duration(seconds: 2));
    if (mounted) {
      setState(() => _isSubmitting = false);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Row(children: [
          const Icon(Icons.check_circle, color: ZiriaColors.accentEmerald, size: 18),
          const SizedBox(width: 8),
          Text('Signalement transmis à l\'Expert CRDA !', style: ZiriaText.bodyMedium(color: ZiriaColors.textPrimary)),
        ]),
      ));
      _noteCtrl.clear();
      setState(() => _location = '');
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Scaffold(
      backgroundColor: isDark ? ZiriaColors.bgNight : ZiriaColors.bgLight,
      body: CustomScrollView(
        physics: const BouncingScrollPhysics(),
        slivers: [
          SliverToBoxAdapter(child: SafeArea(bottom: false, child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('TERRAIN', style: ZiriaText.label(color: ZiriaColors.errorRed)),
              Text('Nouveau Signalement', style: ZiriaText.headingLarge()),
            ]),
          ))),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(20, 24, 20, 120),
            sliver: SliverList(delegate: SliverChildListDelegate([
              // Photo zone
              ZirGlassCard(
                radius: 20, padding: EdgeInsets.zero,
                child: Container(
                  height: 160,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(20),
                    gradient: const LinearGradient(
                      colors: [ZiriaColors.bgGlass, ZiriaColors.bgCard],
                      begin: Alignment.topLeft, end: Alignment.bottomRight,
                    ),
                  ),
                  child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(color: ZiriaColors.errorRed.withOpacity(0.1), shape: BoxShape.circle,
                        border: Border.all(color: ZiriaColors.errorRed.withOpacity(0.3))),
                      child: const Icon(Icons.camera_alt_rounded, size: 32, color: ZiriaColors.errorRed),
                    ),
                    const SizedBox(height: 12),
                    Text('Prendre une photo du problème', style: ZiriaText.bodyMedium()),
                    const SizedBox(height: 4),
                    Text('Photo géolocalisée automatiquement', style: ZiriaText.bodySmall()),
                  ]),
                ),
              ),
              const SizedBox(height: 16),

              // GPS row
              ZirGlassCard(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                radius: 16,
                child: Row(children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: const Color(0xFF60A5FA).withOpacity(0.12),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(Icons.gps_fixed_rounded, color: Color(0xFF60A5FA), size: 20),
                  ),
                  const SizedBox(width: 12),
                  Expanded(child: Text(
                    _location.isEmpty ? 'Appuyez pour localiser...' : _location,
                    style: ZiriaText.bodyMedium(color: _location.isEmpty ? ZiriaColors.textMuted : ZiriaColors.textPrimary, fontWeight: _location.isEmpty ? FontWeight.w400 : FontWeight.w700),
                  )),
                  if (_isLocating)
                    const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF60A5FA)))
                  else
                    GestureDetector(
                      onTap: _captureGps,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(colors: [Color(0xFF1D4ED8), Color(0xFF60A5FA)]),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text('Localiser', style: ZiriaText.label(color: Colors.white)),
                      ),
                    ),
                ]),
              ),
              const SizedBox(height: 16),

              // Type selector
              ZirGlassCard(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                radius: 16,
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    value: _type,
                    dropdownColor: ZiriaColors.bgCard,
                    icon: const Icon(Icons.expand_more_rounded, color: ZiriaColors.textSecondary),
                    style: ZiriaText.bodyMedium(color: ZiriaColors.textPrimary),
                    isExpanded: true,
                    items: ['Maladie inconnue', 'Invasion d\'insectes', 'Stress hydrique', 'Gel / Grêle', 'Autre']
                        .map((e) => DropdownMenuItem(value: e, child: Text(e))).toList(),
                    onChanged: (v) => setState(() => _type = v!),
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Notes
              ZirGlassCard(
                padding: const EdgeInsets.all(4),
                radius: 16,
                child: TextField(
                  controller: _noteCtrl,
                  maxLines: 4,
                  style: ZiriaText.bodyMedium(color: ZiriaColors.textPrimary),
                  decoration: const InputDecoration(
                    hintText: 'Décrivez vos observations sur le terrain...',
                    filled: false,
                    border: InputBorder.none,
                    contentPadding: EdgeInsets.all(16),
                  ),
                ),
              ),
              const SizedBox(height: 24),

              ZirGradientButton(
                label: 'ENVOYER À L\'EXPERT CRDA',
                icon: Icons.send_rounded,
                gradient: ZiriaColors.dangerGradient,
                height: 58,
                isLoading: _isSubmitting,
                onPressed: _submit,
              ),
            ])),
          ),
        ],
      ),
    );
  }
}

// ─── PLACEHOLDER ──────────────────────────────────────────────────────────────
class _PlaceholderTab extends StatelessWidget {
  final String title;
  final IconData icon;
  final Color color;
  const _PlaceholderTab({required this.title, required this.icon, required this.color});
  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Scaffold(
      backgroundColor: isDark ? ZiriaColors.bgNight : ZiriaColors.bgLight,
      body: Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
        Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: color.withOpacity(0.1),
            shape: BoxShape.circle,
            border: Border.all(color: color.withOpacity(0.3)),
          ),
          child: Icon(icon, size: 48, color: color),
        ),
        const SizedBox(height: 20),
        Text(title, style: ZiriaText.headingMedium()),
        const SizedBox(height: 8),
        Text('En cours de développement', style: ZiriaText.bodyMedium()),
      ])),
    );
  }
}
