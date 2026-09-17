import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/connectivity_banner.dart';
import '../../core/providers/theme_provider.dart';
import 'package:ziria_mobile/features/auth/providers/auth_notifier.dart';

// ═══════════════════════════════════════════════════════════════════════════════
//  ZirPremiumShell  —  Universal premium shell used by Equip, Worker, Driver
//  Each role provides its own: identity letter, accent color, tab config
// ═══════════════════════════════════════════════════════════════════════════════

/// Tab configuration for ZirPremiumShell
class ZirShellTab {
  final String route;
  final String label;
  final IconData icon, activeIcon;
  final Color color;

  const ZirShellTab({
    required this.route,
    required this.label,
    required this.icon,
    required this.activeIcon,
    required this.color,
  });
}

/// Reusable premium shell widget for Equip / Worker / Driver roles
class ZirPremiumShell extends ConsumerStatefulWidget {
  final Widget child;
  final String roleLabel;
  final String identityLetter;
  final List<Color> identityGradient;
  final List<ZirShellTab> tabs;

  const ZirPremiumShell({
    super.key,
    required this.child,
    required this.roleLabel,
    required this.identityLetter,
    required this.identityGradient,
    required this.tabs,
  });

  @override
  ConsumerState<ZirPremiumShell> createState() => _ZirPremiumShellState();
}

class _ZirPremiumShellState extends ConsumerState<ZirPremiumShell> {
  int _idx = 0;

  void _onTap(int i) {
    setState(() => _idx = i);
    context.go(widget.tabs[i].route);
  }

  @override
  Widget build(BuildContext context) {
    final isDark = ref.watch(themeNotifierProvider) == ThemeMode.dark;
    final tab = widget.tabs[_idx];

    return Scaffold(
      extendBody: true,
      backgroundColor: isDark ? ZiriaColors.bgNight : ZiriaColors.bgLight,
      appBar: _PremiumAppBar(
        title: tab.label,
        roleLabel: widget.roleLabel,
        identityLetter: widget.identityLetter,
        identityGradient: widget.identityGradient,
        accentColor: tab.color,
        isDark: isDark,
        onTheme: () => ref.read(themeNotifierProvider.notifier).toggle(),
        onLogout: () => ref.read(authNotifierProvider.notifier).logout(),
      ),
      body: Column(children: [
        const ConnectivityBanner(),
        Expanded(child: widget.child),
      ]),
      bottomNavigationBar: _PremiumNav(
        tabs: widget.tabs,
        currentIndex: _idx,
        onTap: _onTap,
        isDark: isDark,
      ),
    );
  }
}

// ─── PREMIUM APP BAR ──────────────────────────────────────────────────────────
class _PremiumAppBar extends StatelessWidget implements PreferredSizeWidget {
  final String title, roleLabel, identityLetter;
  final List<Color> identityGradient;
  final Color accentColor;
  final bool isDark;
  final VoidCallback onTheme, onLogout;

  const _PremiumAppBar({
    required this.title,
    required this.roleLabel,
    required this.identityLetter,
    required this.identityGradient,
    required this.accentColor,
    required this.isDark,
    required this.onTheme,
    required this.onLogout,
  });

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
            Image.asset(
              'assets/images/ziria-logo-main.png',
              height: 28,
              fit: BoxFit.contain,
              errorBuilder: (_, __, ___) => Container(
                width: 36, height: 36,
                decoration: BoxDecoration(
                  gradient: LinearGradient(colors: identityGradient),
                  borderRadius: BorderRadius.circular(10),
                  boxShadow: [BoxShadow(color: identityGradient.last.withOpacity(0.35), blurRadius: 14, offset: const Offset(0, 5))],
                ),
                child: Center(child: Text(identityLetter, style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w900))),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(roleLabel, style: ZiriaText.label(color: accentColor)),
                Text(title, style: ZiriaText.headingSmall(color: isDark ? Colors.white : ZiriaColors.textLight)),
              ],
            )),
            _IcnBtn(icon: isDark ? Icons.wb_sunny_outlined : Icons.nightlight_outlined, isDark: isDark, onTap: onTheme),
            _IcnBtn(icon: Icons.logout_rounded, isDark: isDark, onTap: onLogout),
          ]),
        ),
      ),
    );
  }
}

class _IcnBtn extends StatelessWidget {
  final IconData icon; final bool isDark; final VoidCallback onTap;
  const _IcnBtn({required this.icon, required this.isDark, required this.onTap});
  @override
  Widget build(BuildContext context) => GestureDetector(onTap: onTap, child: Container(
    margin: const EdgeInsets.symmetric(horizontal: 4), width: 40, height: 40,
    decoration: BoxDecoration(
      color: isDark ? Colors.white.withOpacity(0.06) : Colors.black.withOpacity(0.04),
      borderRadius: BorderRadius.circular(12),
      border: Border.all(color: isDark ? Colors.white.withOpacity(0.08) : Colors.black.withOpacity(0.06)),
    ),
    child: Icon(icon, size: 18, color: isDark ? Colors.white70 : ZiriaColors.textLight),
  ));
}

// ─── PREMIUM NAV ──────────────────────────────────────────────────────────────
class _PremiumNav extends StatelessWidget {
  final List<ZirShellTab> tabs;
  final int currentIndex;
  final ValueChanged<int> onTap;
  final bool isDark;
  const _PremiumNav({required this.tabs, required this.currentIndex, required this.onTap, required this.isDark});

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
            children: List.generate(tabs.length, (i) => _PremNavTab(
              tab: tabs[i], isActive: currentIndex == i, isDark: isDark, onTap: () => onTap(i),
            )),
          ),
        )),
      ),
    ),
  );
}

class _PremNavTab extends StatefulWidget {
  final ZirShellTab tab; final bool isActive, isDark; final VoidCallback onTap;
  const _PremNavTab({required this.tab, required this.isActive, required this.isDark, required this.onTap});
  @override State<_PremNavTab> createState() => _PremNavTabState();
}
class _PremNavTabState extends State<_PremNavTab> with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<double> _sc;
  @override void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 350));
    _sc = Tween<double>(begin: 1.0, end: 1.12).animate(CurvedAnimation(parent: _ctrl, curve: Curves.elasticOut));
    if (widget.isActive) _ctrl.forward();
  }
  @override void didUpdateWidget(_PremNavTab old) {
    super.didUpdateWidget(old);
    if (widget.isActive && !old.isActive) {
      _ctrl.forward(from: 0);
    } else if (!widget.isActive && old.isActive) _ctrl.reverse();
  }
  @override void dispose() { _ctrl.dispose(); super.dispose(); }
  @override
  Widget build(BuildContext context) {
    final col = widget.tab.color;
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
          Icon(widget.isActive ? widget.tab.activeIcon : widget.tab.icon,
              color: widget.isActive ? col : (widget.isDark ? Colors.white30 : Colors.black26), size: 22),
          AnimatedSize(duration: const Duration(milliseconds: 240), child: widget.isActive
              ? Row(children: [const SizedBox(width: 6), Text(widget.tab.label, style: ZiriaText.bodySmall(color: col, fontWeight: FontWeight.w700))])
              : const SizedBox.shrink()),
        ]),
      ),
    ));
  }
}
