import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/connectivity_banner.dart';
import '../../../core/providers/theme_provider.dart';
import '../../auth/providers/auth_notifier.dart';

/// Premium 5-tab Farmer shell — "Emerald Night" design
class FarmerShell extends ConsumerStatefulWidget {
  final Widget child;
  const FarmerShell({super.key, required this.child});

  @override
  ConsumerState<FarmerShell> createState() => _FarmerShellState();
}

class _FarmerShellState extends ConsumerState<FarmerShell> {
  static const _tabs = [
    '/farmer/agent',
    '/farmer/parcels',
    '/farmer/diagnostic',
    '/farmer/erp',
    '/farmer/alerts',
  ];

  static const _navItems = [
    _NavItem(icon: Icons.smart_toy_rounded,     activeIcon: Icons.smart_toy_rounded,    label: 'Agent IA',   color: Color(0xFF34D399)),
    _NavItem(icon: Icons.terrain_outlined,      activeIcon: Icons.terrain_rounded,      label: 'Parcelles',  color: Color(0xFF60A5FA)),
    _NavItem(icon: Icons.camera_alt_outlined,   activeIcon: Icons.camera_alt_rounded,   label: 'Diagnostic', color: Color(0xFFFB923C)),
    _NavItem(icon: Icons.trending_up_outlined,  activeIcon: Icons.trending_up_rounded,  label: 'Mon ERP',    color: Color(0xFFFBBF24)),
    _NavItem(icon: Icons.notifications_outlined,activeIcon: Icons.notifications_rounded,label: 'Alertes',    color: Color(0xFFF87171)),
  ];

  int _currentIndex = 0;

  void _onTap(int index) {
    setState(() => _currentIndex = index);
    context.go(_tabs[index]);
  }

  @override
  Widget build(BuildContext context) {
    final isDark = ref.watch(themeNotifierProvider) == ThemeMode.dark;
    final loc = GoRouterState.of(context).matchedLocation;
    final idx = _tabs.indexWhere((t) => loc.startsWith(t));
    if (idx >= 0 && idx != _currentIndex) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) setState(() => _currentIndex = idx);
      });
    }

    return Scaffold(
      backgroundColor: isDark ? ZiriaColors.bgNight : ZiriaColors.bgLight,
      appBar: _FarmerAppBar(
        label: _navItems[_currentIndex].label,
        isDark: isDark,
        onThemeToggle: () => ref.read(themeNotifierProvider.notifier).toggle(),
        onAlerts: () => context.push('/farmer/alerts'),
        onLogout: () => ref.read(authNotifierProvider.notifier).logout(),
      ),
      body: Column(
        children: [
          const ConnectivityBanner(),
          Expanded(child: widget.child),
        ],
      ),
      bottomNavigationBar: _PremiumFarmerNav(
        items: _navItems,
        currentIndex: _currentIndex,
        onTap: _onTap,
        isDark: isDark,
      ),
    );
  }
}

// ─── PREMIUM APP BAR ─────────────────────────────────────────────────────────
class _FarmerAppBar extends StatelessWidget implements PreferredSizeWidget {
  final String label;
  final bool isDark;
  final VoidCallback onThemeToggle;
  final VoidCallback onAlerts;
  final VoidCallback onLogout;

  const _FarmerAppBar({
    required this.label, required this.isDark,
    required this.onThemeToggle, required this.onAlerts, required this.onLogout,
  });

  @override
  Size get preferredSize => const Size.fromHeight(64);

  @override
  Widget build(BuildContext context) {
    return ClipRect(
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
        child: Container(
          height: preferredSize.height + MediaQuery.of(context).padding.top,
          padding: EdgeInsets.only(
            top: MediaQuery.of(context).padding.top,
            left: 16, right: 8,
          ),
          decoration: BoxDecoration(
            color: (isDark ? ZiriaColors.bgDeep : Colors.white).withOpacity(0.8),
            border: Border(bottom: BorderSide(color: Colors.white.withOpacity(isDark ? 0.06 : 0.0))),
          ),
          child: Row(
            children: [
              // ZirIA Logo — no background box
              Image.asset(
                'assets/images/ziria-icon.png',
                width: 44,
                height: 44,
                fit: BoxFit.contain,
                errorBuilder: (_, __, ___) => const Text('Z',
                  style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w900)),
              ),
              const SizedBox(width: 10),
              RichText(text: const TextSpan(children: [
                TextSpan(text: 'Zir', style: TextStyle(
                  fontSize: 20, fontWeight: FontWeight.w900,
                  color: Colors.white, letterSpacing: -0.5,
                  fontFamily: 'Inter',
                )),
                TextSpan(text: 'IA', style: TextStyle(
                  fontSize: 20, fontWeight: FontWeight.w900,
                  color: ZiriaColors.accentEmerald, letterSpacing: -0.5,
                  fontFamily: 'Inter',
                )),
              ])),
              const SizedBox(width: 12),
              Expanded(
                child: Text(label, style: ZiriaText.headingSmall(color: isDark ? Colors.white : ZiriaColors.textLight)),
              ),
              // Theme toggle
              _AppBarBtn(
                icon: isDark ? Icons.wb_sunny_outlined : Icons.nightlight_outlined,
                isDark: isDark,
                onTap: onThemeToggle,
              ),
              // Alerts
              _AppBarBtn(
                icon: Icons.notifications_outlined,
                isDark: isDark,
                onTap: onAlerts,
                hasBadge: true,
              ),
              // Logout
              _AppBarBtn(
                icon: Icons.logout_rounded,
                isDark: isDark,
                onTap: onLogout,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _AppBarBtn extends StatelessWidget {
  final IconData icon;
  final bool isDark;
  final VoidCallback onTap;
  final bool hasBadge;

  const _AppBarBtn({required this.icon, required this.isDark, required this.onTap, this.hasBadge = false});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Stack(
        children: [
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 4),
            width: 40, height: 40,
            decoration: BoxDecoration(
              color: isDark ? Colors.white.withOpacity(0.06) : Colors.black.withOpacity(0.04),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: isDark ? Colors.white.withOpacity(0.08) : Colors.black.withOpacity(0.06)),
            ),
            child: Icon(icon, size: 18, color: isDark ? Colors.white70 : ZiriaColors.textLight),
          ),
          if (hasBadge)
            Positioned(
              top: 6, right: 6,
              child: Container(
                width: 7, height: 7,
                decoration: const BoxDecoration(
                  color: ZiriaColors.errorRed,
                  shape: BoxShape.circle,
                ),
              ),
            ),
        ],
      ),
    );
  }
}

// ─── PREMIUM BOTTOM NAV ───────────────────────────────────────────────────────
class _PremiumFarmerNav extends StatelessWidget {
  final List<_NavItem> items;
  final int currentIndex;
  final ValueChanged<int> onTap;
  final bool isDark;

  const _PremiumFarmerNav({required this.items, required this.currentIndex, required this.onTap, required this.isDark});

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
                children: List.generate(items.length, (i) => _FarmerNavTab(
                  item: items[i],
                  isActive: currentIndex == i,
                  onTap: () => onTap(i),
                )),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _FarmerNavTab extends StatefulWidget {
  final _NavItem item;
  final bool isActive;
  final VoidCallback onTap;

  const _FarmerNavTab({required this.item, required this.isActive, required this.onTap});

  @override
  State<_FarmerNavTab> createState() => _FarmerNavTabState();
}

class _FarmerNavTabState extends State<_FarmerNavTab> with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<double> _scale;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 350));
    _scale = Tween<double>(begin: 1.0, end: 1.12).animate(
      CurvedAnimation(parent: _ctrl, curve: Curves.elasticOut),
    );
    if (widget.isActive) _ctrl.forward();
  }

  @override
  void didUpdateWidget(_FarmerNavTab old) {
    super.didUpdateWidget(old);
    if (widget.isActive && !old.isActive) {
      _ctrl.forward(from: 0);
    } else if (!widget.isActive && old.isActive) _ctrl.reverse();
  }

  @override
  void dispose() { _ctrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    final item = widget.item;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final inactiveColor = isDark ? Colors.white38 : Colors.black38;

    return ScaleTransition(
      scale: _scale,
      child: GestureDetector(
        onTap: widget.onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeInOut,
          padding: EdgeInsets.symmetric(
            horizontal: widget.isActive ? 16 : 10,
            vertical: 8,
          ),
          decoration: BoxDecoration(
            color: widget.isActive ? item.color.withOpacity(0.13) : Colors.transparent,
            borderRadius: BorderRadius.circular(22),
            border: widget.isActive ? Border.all(color: item.color.withOpacity(0.3)) : null,
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                widget.isActive ? item.activeIcon : item.icon,
                color: widget.isActive ? item.color : inactiveColor,
                size: 22,
              ),
              AnimatedSize(
                duration: const Duration(milliseconds: 250),
                child: widget.isActive
                    ? Row(children: [
                        const SizedBox(width: 6),
                        Text(item.label, style: ZiriaText.bodySmall(color: item.color, fontWeight: FontWeight.w700)),
                      ])
                    : const SizedBox.shrink(),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _NavItem {
  final IconData icon, activeIcon;
  final String label;
  final Color color;
  const _NavItem({required this.icon, required this.activeIcon, required this.label, required this.color});
}
