import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/connectivity_banner.dart';
import '../../../core/providers/theme_provider.dart';
import '../../auth/providers/auth_notifier.dart';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  EXPERT SHELL  —  "Deep Purple" accent palette
//  Tabs: Carte IA · Validations · Rapports · Alertes
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const _kExpertPurple  = Color(0xFFA78BFA);
const _kExpertViolet  = Color(0xFF7C3AED);
const _kExpertIndigo  = Color(0xFF6366F1);

class ExpertShell extends ConsumerStatefulWidget {
  final Widget child;
  const ExpertShell({super.key, required this.child});
  @override
  ConsumerState<ExpertShell> createState() => _ExpertShellState();
}

class _ExpertShellState extends ConsumerState<ExpertShell> {
  static const _tabs   = ['/expert/heatmap', '/expert/validations', '/expert/reports', '/expert/alerts'];
  static const _labels = ['Carte IA', 'Validations', 'Rapports', 'Alertes'];
  static const _items  = [
    _ExNavItem(icon: Icons.map_outlined,         activeIcon: Icons.map_rounded,          color: _kExpertPurple),
    _ExNavItem(icon: Icons.fact_check_outlined,  activeIcon: Icons.fact_check_rounded,   color: Color(0xFF34D399)),
    _ExNavItem(icon: Icons.description_outlined, activeIcon: Icons.description_rounded,  color: Color(0xFFFBBF24)),
    _ExNavItem(icon: Icons.notifications_outlined,activeIcon:Icons.notifications_rounded,color: Color(0xFFF87171)),
  ];

  int _idx = 0;

  void _onTap(int i) { setState(() => _idx = i); context.go(_tabs[i]); }

  @override
  Widget build(BuildContext context) {
    final isDark = ref.watch(themeNotifierProvider) == ThemeMode.dark;
    return Scaffold(
      extendBody: true,
      backgroundColor: isDark ? ZiriaColors.bgNight : ZiriaColors.bgLight,
      appBar: _ExpertAppBar(
        title: _labels[_idx], isDark: isDark,
        onTheme: () => ref.read(themeNotifierProvider.notifier).toggle(),
        onLogout: () => ref.read(authNotifierProvider.notifier).logout(),
      ),
      body: Column(children: [const ConnectivityBanner(), Expanded(child: widget.child)]),
      bottomNavigationBar: _ExpertNav(items: _items, currentIndex: _idx, onTap: _onTap, isDark: isDark),
    );
  }
}

// ─── APP BAR ──────────────────────────────────────────────────────────────────
class _ExpertAppBar extends StatelessWidget implements PreferredSizeWidget {
  final String title;
  final bool isDark;
  final VoidCallback onTheme, onLogout;
  const _ExpertAppBar({required this.title, required this.isDark, required this.onTheme, required this.onLogout});

  @override Size get preferredSize => const Size.fromHeight(64);

  @override
  Widget build(BuildContext context) {
    return ClipRect(
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
        child: Container(
          height: preferredSize.height + MediaQuery.of(context).padding.top,
          padding: EdgeInsets.only(top: MediaQuery.of(context).padding.top, left: 16, right: 8),
          decoration: BoxDecoration(
            color: (isDark ? ZiriaColors.bgDeep : Colors.white).withOpacity(0.82),
            border: Border(bottom: BorderSide(color: Colors.white.withOpacity(isDark ? 0.06 : 0.0))),
          ),
          child: Row(children: [
            // Expert avatar "E" — purple gradient
            Container(
              width: 36, height: 36,
              decoration: BoxDecoration(
                gradient: const LinearGradient(colors: [_kExpertViolet, _kExpertPurple]),
                borderRadius: BorderRadius.circular(10),
                boxShadow: [BoxShadow(color: _kExpertPurple.withOpacity(0.35), blurRadius: 14, offset: const Offset(0, 5))],
              ),
              child: const Center(child: Text('E', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w900))),
            ),
            const SizedBox(width: 12),
            Expanded(child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text('EXPERT AGRONOME', style: ZiriaText.label(color: _kExpertPurple)),
                Text(title, style: ZiriaText.headingSmall(color: isDark ? Colors.white : ZiriaColors.textLight)),
              ],
            )),
            _ExBtn(icon: isDark ? Icons.wb_sunny_outlined : Icons.nightlight_outlined, isDark: isDark, onTap: onTheme),
            _ExBtn(icon: Icons.logout_rounded, isDark: isDark, onTap: onLogout),
          ]),
        ),
      ),
    );
  }
}

class _ExBtn extends StatelessWidget {
  final IconData icon;
  final bool isDark;
  final VoidCallback onTap;
  const _ExBtn({required this.icon, required this.isDark, required this.onTap});
  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: Container(
      margin: const EdgeInsets.symmetric(horizontal: 4),
      width: 40, height: 40,
      decoration: BoxDecoration(
        color: isDark ? Colors.white.withOpacity(0.06) : Colors.black.withOpacity(0.04),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: isDark ? Colors.white.withOpacity(0.08) : Colors.black.withOpacity(0.06)),
      ),
      child: Icon(icon, size: 18, color: isDark ? Colors.white70 : ZiriaColors.textLight),
    ),
  );
}

// ─── BOTTOM NAV ───────────────────────────────────────────────────────────────
class _ExpertNav extends StatelessWidget {
  final List<_ExNavItem> items;
  final int currentIndex;
  final ValueChanged<int> onTap;
  final bool isDark;
  const _ExpertNav({required this.items, required this.currentIndex, required this.onTap, required this.isDark});

  @override
  Widget build(BuildContext context) => ClipRect(
    child: BackdropFilter(
      filter: ImageFilter.blur(sigmaX: 24, sigmaY: 24),
      child: Container(
        decoration: BoxDecoration(
          color: (isDark ? ZiriaColors.bgDeep : Colors.white).withOpacity(0.88),
          border: Border(top: BorderSide(color: isDark ? Colors.white.withOpacity(0.07) : Colors.black.withOpacity(0.06))),
        ),
        child: SafeArea(top: false, child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: List.generate(items.length, (i) => _ExNavTab(
              item: items[i], isActive: currentIndex == i, isDark: isDark,
              label: const ['Carte IA', 'Validations', 'Rapports', 'Alertes'][i],
              onTap: () => onTap(i),
            )),
          ),
        )),
      ),
    ),
  );
}

class _ExNavTab extends StatefulWidget {
  final _ExNavItem item;
  final bool isActive, isDark;
  final String label;
  final VoidCallback onTap;
  const _ExNavTab({required this.item, required this.isActive, required this.isDark, required this.label, required this.onTap});
  @override State<_ExNavTab> createState() => _ExNavTabState();
}
class _ExNavTabState extends State<_ExNavTab> with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<double> _sc;
  @override void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 350));
    _sc = Tween<double>(begin: 1.0, end: 1.12).animate(CurvedAnimation(parent: _ctrl, curve: Curves.elasticOut));
    if (widget.isActive) _ctrl.forward();
  }
  @override void didUpdateWidget(_ExNavTab old) {
    super.didUpdateWidget(old);
    if (widget.isActive && !old.isActive) {
      _ctrl.forward(from: 0);
    } else if (!widget.isActive && old.isActive) _ctrl.reverse();
  }
  @override void dispose() { _ctrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    final col = widget.item.color;
    return ScaleTransition(scale: _sc, child: GestureDetector(
      onTap: widget.onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 240),
        padding: EdgeInsets.symmetric(horizontal: widget.isActive ? 16 : 10, vertical: 8),
        decoration: BoxDecoration(
          color: widget.isActive ? col.withOpacity(0.13) : Colors.transparent,
          borderRadius: BorderRadius.circular(22),
          border: widget.isActive ? Border.all(color: col.withOpacity(0.28)) : null,
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Icon(widget.isActive ? widget.item.activeIcon : widget.item.icon,
              color: widget.isActive ? col : (widget.isDark ? Colors.white30 : Colors.black38), size: 22),
          AnimatedSize(duration: const Duration(milliseconds: 240), child: widget.isActive
              ? Row(children: [const SizedBox(width: 6), Text(widget.label, style: ZiriaText.bodySmall(color: col, fontWeight: FontWeight.w700))])
              : const SizedBox.shrink()),
        ]),
      ),
    ));
  }
}

class _ExNavItem {
  final IconData icon, activeIcon;
  final Color color;
  const _ExNavItem({required this.icon, required this.activeIcon, required this.color});
}
