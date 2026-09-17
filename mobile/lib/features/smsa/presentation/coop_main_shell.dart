import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/zir_design_system.dart';
import '../repositories/coop_repository.dart';
import 'screens/coop_dashboard_screen.dart';

// ─── COOP MAIN SHELL ──────────────────────────────────────────────────────────
class CoopMainShell extends ConsumerStatefulWidget {
  const CoopMainShell({super.key});

  @override
  ConsumerState<CoopMainShell> createState() => _CoopMainShellState();
}

class _CoopMainShellState extends ConsumerState<CoopMainShell> {
  int _currentIndex = 0;

  final List<_CoopTab> _tabs = const [
    _CoopTab(icon: Icons.dashboard_rounded,    label: 'Tableau',    color: ZiriaColors.accentEmerald),
    _CoopTab(icon: Icons.people_alt_rounded,   label: 'Membres',    color: Color(0xFF60A5FA)),
    _CoopTab(icon: Icons.map_rounded,          label: 'Carte',      color: Color(0xFF34D399)),
    _CoopTab(icon: Icons.storefront_rounded,   label: 'Marché',     color: ZiriaColors.earthAmber),
    _CoopTab(icon: Icons.warning_amber_rounded,label: 'Alertes',    color: Color(0xFFF87171)),
  ];

  final List<Widget> _screens = const [
    CoopDashboardScreen(),
    _MembersScreen(),
    _PlaceholderScreen(title: 'Carte Zones', icon: Icons.map_rounded),
    _PlaceholderScreen(title: 'Marketplace', icon: Icons.storefront_rounded),
    _PlaceholderScreen(title: 'Alertes', icon: Icons.warning_amber_rounded),
  ];

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Scaffold(
      extendBody: true,
      backgroundColor: isDark ? ZiriaColors.bgNight : ZiriaColors.bgLight,
      body: IndexedStack(
        index: _currentIndex,
        children: _screens,
      ),
      bottomNavigationBar: _CoopBottomNav(
        tabs: _tabs,
        currentIndex: _currentIndex,
        isDark: isDark,
        onTabChanged: (i) => setState(() => _currentIndex = i),
      ),
    );
  }
}

// ─── PREMIUM BOTTOM NAV ───────────────────────────────────────────────────────
class _CoopBottomNav extends StatelessWidget {
  final List<_CoopTab> tabs;
  final int currentIndex;
  final bool isDark;
  final ValueChanged<int> onTabChanged;

  const _CoopBottomNav({required this.tabs, required this.currentIndex, required this.isDark, required this.onTabChanged});

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
        child: Container(
          decoration: BoxDecoration(
            color: (isDark ? ZiriaColors.bgDeep : Colors.white).withOpacity(0.85),
            border: Border(top: BorderSide(color: isDark ? Colors.white.withOpacity(0.07) : Colors.black.withOpacity(0.06))),
          ),
          child: SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: List.generate(tabs.length, (i) {
                  return _NavTab(
                    tab: tabs[i],
                    isActive: currentIndex == i,
                    isDark: isDark,
                    onTap: () => onTabChanged(i),
                  );
                }),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _NavTab extends StatefulWidget {
  final _CoopTab tab;
  final bool isActive;
  final bool isDark;
  final VoidCallback onTap;

  const _NavTab({required this.tab, required this.isActive, required this.isDark, required this.onTap});

  @override
  State<_NavTab> createState() => _NavTabState();
}

class _NavTabState extends State<_NavTab> with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<double> _scaleAnim;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 300));
    _scaleAnim = Tween<double>(begin: 1.0, end: 1.1).animate(
      CurvedAnimation(parent: _ctrl, curve: Curves.elasticOut),
    );
    if (widget.isActive) _ctrl.forward();
  }

  @override
  void didUpdateWidget(_NavTab old) {
    super.didUpdateWidget(old);
    if (widget.isActive && !old.isActive) {
      _ctrl.forward(from: 0.0);
    } else if (!widget.isActive && old.isActive) {
      _ctrl.reverse();
    }
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final tab = widget.tab;
    final inactiveColor = widget.isDark ? Colors.white30 : Colors.black38;
    return GestureDetector(
      onTap: widget.onTap,
      child: ScaleTransition(
        scale: _scaleAnim,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeInOut,
          padding: EdgeInsets.symmetric(
            horizontal: widget.isActive ? 18 : 10,
            vertical: 8,
          ),
          decoration: BoxDecoration(
            color: widget.isActive ? tab.color.withOpacity(0.13) : Colors.transparent,
            borderRadius: BorderRadius.circular(22),
            border: widget.isActive
                ? Border.all(color: tab.color.withOpacity(0.25), width: 1)
                : null,
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                tab.icon,
                color: widget.isActive ? tab.color : inactiveColor,
                size: 22,
              ),
              AnimatedSize(
                duration: const Duration(milliseconds: 250),
                child: widget.isActive
                    ? Row(
                        children: [
                          const SizedBox(width: 7),
                          Text(
                            tab.label,
                            style: ZiriaText.bodySmall(color: tab.color, fontWeight: FontWeight.w700),
                          ),
                        ],
                      )
                    : const SizedBox.shrink(),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CoopTab {
  final IconData icon;
  final String label;
  final Color color;
  const _CoopTab({required this.icon, required this.label, required this.color});
}

// ─── MEMBERS SCREEN ───────────────────────────────────────────────────────────
class _MembersScreen extends ConsumerStatefulWidget {
  const _MembersScreen();

  @override
  ConsumerState<_MembersScreen> createState() => _MembersScreenState();
}

class _MembersScreenState extends ConsumerState<_MembersScreen> {
  bool _isLoading = true;
  List<dynamic> _members = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final data = await ref.read(coopRepositoryProvider).getMembers();
      if (mounted) setState(() { _members = data; _isLoading = false; });
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _showBroadcast() {
    final ctrl = TextEditingController();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _BroadcastSheet(ctrl: ctrl, onSend: (msg) async {
        await ref.read(coopRepositoryProvider).broadcastToMembers(msg);
        if (ctx.mounted) {
          Navigator.pop(ctx);
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Row(children: [
              const Icon(Icons.check_circle, color: ZiriaColors.accentEmerald, size: 18),
              const SizedBox(width: 8),
              Text('Diffusé à ${_members.length} membres', style: ZiriaText.bodyMedium(color: ZiriaColors.textPrimary)),
            ]),
          ));
        }
      }),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Scaffold(
      backgroundColor: isDark ? ZiriaColors.bgNight : ZiriaColors.bgLight,
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 8),
              child: Row(
                children: [
                  Expanded(child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('MEMBRES', style: ZiriaText.label(color: ZiriaColors.accentEmerald)),
                      Text('${_members.length} Agriculteurs', style: ZiriaText.headingLarge()),
                    ],
                  )),
                  ZirGradientButton(
                    label: 'Broadcast',
                    icon: Icons.campaign_rounded,
                    gradient: ZiriaColors.dangerGradient,
                    height: 42,
                    radius: 12,
                    onPressed: _showBroadcast,
                  ),
                ],
              ),
            ),
            Expanded(
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator(color: ZiriaColors.accentEmerald))
                  : _members.isEmpty
                      ? Center(child: Text('Aucun membre trouvé', style: ZiriaText.bodyMedium()))
                      : ListView.separated(
                          padding: const EdgeInsets.fromLTRB(20, 8, 20, 100),
                          itemCount: _members.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 10),
                          itemBuilder: (ctx, i) {
                            final m = _members[i];
                            return ZirGlassCard(
                              padding: const EdgeInsets.all(14),
                              radius: 18,
                              child: Row(
                                children: [
                                  ZirAvatar(name: m['name'] ?? '?', size: 46),
                                  const SizedBox(width: 14),
                                  Expanded(child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(m['name'] ?? 'Inconnu', style: ZiriaText.bodyMedium(color: ZiriaColors.textPrimary, fontWeight: FontWeight.w700)),
                                      Text(m['role'] ?? 'FARMER', style: ZiriaText.bodySmall()),
                                    ],
                                  )),
                                  const Icon(Icons.chevron_right_rounded, color: ZiriaColors.textMuted, size: 20),
                                ],
                              ),
                            );
                          },
                        ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─── BROADCAST SHEET ──────────────────────────────────────────────────────────
class _BroadcastSheet extends StatefulWidget {
  final TextEditingController ctrl;
  final Future<void> Function(String) onSend;

  const _BroadcastSheet({required this.ctrl, required this.onSend});

  @override
  State<_BroadcastSheet> createState() => _BroadcastSheetState();
}

class _BroadcastSheetState extends State<_BroadcastSheet> {
  bool _isSending = false;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
        left: 16, right: 16,
      ),
      child: ZirGlassCard(
        gradient: ZiriaColors.cardGradient,
        border: Border.all(color: ZiriaColors.errorRed.withOpacity(0.3)),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const SizedBox(height: 8),
            Center(
              child: Container(
                width: 40, height: 4,
                decoration: BoxDecoration(
                  color: Colors.white24,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 20),
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    gradient: ZiriaColors.dangerGradient,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.campaign_rounded, color: Colors.white, size: 20),
                ),
                const SizedBox(width: 12),
                Text('Message d\'urgence', style: ZiriaText.headingSmall()),
              ],
            ),
            const SizedBox(height: 16),
            TextField(
              controller: widget.ctrl,
              maxLines: 4,
              style: ZiriaText.bodyLarge(),
              decoration: const InputDecoration(
                hintText: 'Alerte maladie, météo extrême, réunion urgente...',
              ),
            ),
            const SizedBox(height: 16),
            ZirGradientButton(
              label: 'ENVOYER À TOUS',
              icon: Icons.send_rounded,
              gradient: ZiriaColors.dangerGradient,
              isLoading: _isSending,
              onPressed: () async {
                if (widget.ctrl.text.trim().isEmpty) return;
                setState(() => _isSending = true);
                try {
                  await widget.onSend(widget.ctrl.text.trim());
                } catch (_) {
                  if (mounted) setState(() => _isSending = false);
                }
              },
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }
}

// ─── PLACEHOLDER SCREEN ───────────────────────────────────────────────────────
class _PlaceholderScreen extends StatelessWidget {
  final String title;
  final IconData icon;

  const _PlaceholderScreen({required this.title, required this.icon});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Scaffold(
      backgroundColor: isDark ? ZiriaColors.bgNight : ZiriaColors.bgLight,
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: const BoxDecoration(
                gradient: ZiriaColors.emeraldGlow,
                shape: BoxShape.circle,
              ),
              child: Icon(icon, size: 48, color: ZiriaColors.accentEmerald),
            ),
            const SizedBox(height: 20),
            Text(title, style: ZiriaText.headingMedium()),
            const SizedBox(height: 8),
            Text('En cours de développement', style: ZiriaText.bodyMedium()),
          ],
        ),
      ),
    );
  }
}
