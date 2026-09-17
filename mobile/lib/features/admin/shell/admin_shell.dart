import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/connectivity_banner.dart';
import '../../../core/providers/theme_provider.dart';
import '../../../shared/widgets/zir_design_system.dart';
import '../../auth/providers/auth_notifier.dart';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  ADMIN SHELL  —  "Command Gold" accent palette
//  Tabs: KPIs · Utilisateurs · Sécurité · Système
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const _kAdminGold   = Color(0xFFFBBF24);
const _kAdminAmber  = Color(0xFFF59E0B);
const _kAdminRose   = Color(0xFFF472B6);

class AdminShell extends ConsumerStatefulWidget {
  final Widget child;
  const AdminShell({super.key, required this.child});
  @override ConsumerState<AdminShell> createState() => _AdminShellState();
}

class _AdminShellState extends ConsumerState<AdminShell> {
  int _idx = 0;

  static const _navItems = [
    _AdmItem(icon: Icons.analytics_outlined,   activeIcon: Icons.analytics_rounded,   label: 'KPIs',        color: _kAdminGold),
    _AdmItem(icon: Icons.people_outline,        activeIcon: Icons.people_rounded,       label: 'Utilisateurs',color: Color(0xFF60A5FA)),
    _AdmItem(icon: Icons.security_outlined,     activeIcon: Icons.security_rounded,     label: 'Sécurité',    color: _kAdminRose),
    _AdmItem(icon: Icons.settings_outlined,     activeIcon: Icons.settings_rounded,     label: 'Système',     color: Color(0xFF34D399)),
  ];

  void _onTap(int i) {
    setState(() => _idx = i);
    if (i == 0) context.go('/admin/dashboard');
  }

  @override
  Widget build(BuildContext context) {
    final isDark = ref.watch(themeNotifierProvider) == ThemeMode.dark;
    return Scaffold(
      extendBody: true,
      backgroundColor: isDark ? ZiriaColors.bgNight : ZiriaColors.bgLight,
      appBar: _AdminAppBar(
        isDark: isDark, title: _navItems[_idx].label,
        onTheme: () => ref.read(themeNotifierProvider.notifier).toggle(),
        onLogout: () => ref.read(authNotifierProvider.notifier).logout(),
      ),
      body: Column(children: [
        const ConnectivityBanner(),
        Expanded(child: _idx == 0 ? const _AdminDashboardOverlay(child: null) : widget.child),
      ]),
      bottomNavigationBar: _AdminNav(items: _navItems, currentIndex: _idx, onTap: _onTap, isDark: isDark),
    );
  }
}

// ─── APP BAR ──────────────────────────────────────────────────────────────────
class _AdminAppBar extends StatelessWidget implements PreferredSizeWidget {
  final String title;
  final bool isDark;
  final VoidCallback onTheme, onLogout;
  const _AdminAppBar({required this.title, required this.isDark, required this.onTheme, required this.onLogout});
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
            Container(
              width: 36, height: 36,
              decoration: BoxDecoration(
                gradient: const LinearGradient(colors: [Color(0xFF78350F), _kAdminGold]),
                borderRadius: BorderRadius.circular(10),
                boxShadow: [BoxShadow(color: _kAdminGold.withOpacity(0.35), blurRadius: 14, offset: const Offset(0, 5))],
              ),
              child: const Center(child: Text('A', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w900))),
            ),
            const SizedBox(width: 12),
            Expanded(child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text('ADMIN CONTROL', style: ZiriaText.label(color: _kAdminGold)),
                Text(title, style: ZiriaText.headingSmall(color: isDark ? Colors.white : ZiriaColors.textLight)),
              ],
            )),
            _AdmBtn(icon: isDark ? Icons.wb_sunny_outlined : Icons.nightlight_outlined, isDark: isDark, onTap: onTheme),
            _AdmBtn(icon: Icons.logout_rounded, isDark: isDark, onTap: onLogout),
          ]),
        ),
      ),
    );
  }
}

class _AdmBtn extends StatelessWidget {
  final IconData icon; final bool isDark; final VoidCallback onTap;
  const _AdmBtn({required this.icon, required this.isDark, required this.onTap});
  @override
  Widget build(BuildContext context) => GestureDetector(onTap: onTap, child: Container(
    margin: const EdgeInsets.symmetric(horizontal: 4),
    width: 40, height: 40,
    decoration: BoxDecoration(
      color: isDark ? Colors.white.withOpacity(0.06) : Colors.black.withOpacity(0.04),
      borderRadius: BorderRadius.circular(12),
      border: Border.all(color: isDark ? Colors.white.withOpacity(0.08) : Colors.black.withOpacity(0.06)),
    ),
    child: Icon(icon, size: 18, color: isDark ? Colors.white70 : ZiriaColors.textLight),
  ));
}

// ─── DASHBOARD OVERLAY (wraps child from router) ─────────────────────────────
class _AdminDashboardOverlay extends StatelessWidget {
  final Widget? child;
  const _AdminDashboardOverlay({this.child});
  @override
  Widget build(BuildContext context) {
    // Render the platform dashboard with a premium gold overlay header
    return Stack(children: [
      if (child != null) child!,
      // Gold accent header card on top of existing dashboard screen
      Positioned(top: 0, left: 0, right: 0, child: _AdminKpiStrip()),
    ]);
  }
}

class _AdminKpiStrip extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.all(16),
      child: ZirGlassCard(
        gradient: const LinearGradient(
          colors: [Color(0xFF451A03), Color(0xFF78350F), Color(0xFF92400E)],
          begin: Alignment.topLeft, end: Alignment.bottomRight,
        ),
        border: Border.all(color: _kAdminGold.withOpacity(0.3)),
        boxShadow: [BoxShadow(color: _kAdminGold.withOpacity(0.2), blurRadius: 20, offset: const Offset(0, 8))],
        child: Row(mainAxisAlignment: MainAxisAlignment.spaceAround, children: [
          const _Strip('Utilisateurs', '248', Icons.people_rounded),
          Container(width: 1, height: 40, color: Colors.white.withOpacity(0.15)),
          const _Strip('Coopératives', '12', Icons.domain_rounded),
          Container(width: 1, height: 40, color: Colors.white.withOpacity(0.15)),
          const _Strip('Revenus', '45K DT', Icons.account_balance_wallet_rounded),
        ]),
      ),
    );
  }
}

class _Strip extends StatelessWidget {
  final String label, value;
  final IconData icon;
  const _Strip(this.label, this.value, this.icon);
  @override
  Widget build(BuildContext context) => Column(mainAxisSize: MainAxisSize.min, children: [
    Icon(icon, color: _kAdminGold, size: 18),
    const SizedBox(height: 4),
    Text(value, style: ZiriaText.headingSmall(color: Colors.white)),
    Text(label, style: ZiriaText.label(color: Colors.white70)),
  ]);
}

// ─── BOTTOM NAV ───────────────────────────────────────────────────────────────
class _AdminNav extends StatelessWidget {
  final List<_AdmItem> items;
  final int currentIndex;
  final ValueChanged<int> onTap;
  final bool isDark;
  const _AdminNav({required this.items, required this.currentIndex, required this.onTap, required this.isDark});

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
            children: List.generate(items.length, (i) => _AdmTab(
              item: items[i], isActive: currentIndex == i, isDark: isDark, onTap: () => onTap(i),
            )),
          ),
        )),
      ),
    ),
  );
}

class _AdmTab extends StatefulWidget {
  final _AdmItem item; final bool isActive, isDark; final VoidCallback onTap;
  const _AdmTab({required this.item, required this.isActive, required this.isDark, required this.onTap});
  @override State<_AdmTab> createState() => _AdmTabState();
}
class _AdmTabState extends State<_AdmTab> with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<double> _sc;
  @override void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 350));
    _sc = Tween<double>(begin: 1.0, end: 1.12).animate(CurvedAnimation(parent: _ctrl, curve: Curves.elasticOut));
    if (widget.isActive) _ctrl.forward();
  }
  @override void didUpdateWidget(_AdmTab old) {
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
              ? Row(children: [const SizedBox(width: 6), Text(widget.item.label, style: ZiriaText.bodySmall(color: col, fontWeight: FontWeight.w700))])
              : const SizedBox.shrink()),
        ]),
      ),
    ));
  }
}

class _AdmItem {
  final IconData icon, activeIcon;
  final String label;
  final Color color;
  const _AdmItem({required this.icon, required this.activeIcon, required this.label, required this.color});
}
