import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';

/// The main authenticated shell for the Farmer role.
/// Uses StatefulShellRoute from GoRouter to preserve tab state.
class FarmerMainShell extends StatelessWidget {
  final StatefulNavigationShell navigationShell;

  const FarmerMainShell({super.key, required this.navigationShell});

  static const _tabs = [
    _TabItem(
        icon: Icons.smart_toy_rounded,
        label: 'Agent IA',
        activeColor: Color(0xFF00E676)),
    _TabItem(
        icon: Icons.map_rounded,
        label: 'Parcelles',
        activeColor: Color(0xFF40C4FF)),
    _TabItem(
        icon: Icons.biotech_rounded,
        label: 'Diagnostic',
        activeColor: Color(0xFFFF6E40)),
    _TabItem(
        icon: Icons.inventory_2_rounded,
        label: 'Stock',
        activeColor: Color(0xFFFFD740)),
    _TabItem(
        icon: Icons.notifications_active_rounded,
        label: 'Alertes',
        activeColor: Color(0xFFFF4081)),
  ];

  @override
  Widget build(BuildContext context) {
    final currentIndex = navigationShell.currentIndex;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bgColor = isDark ? const Color(0xFF0A0E1A) : ZiriaColors.bgLight;
    final navBgColor = isDark ? const Color(0xFF0A0E1A) : Colors.white;

    return Scaffold(
      backgroundColor: bgColor,
      extendBody: true,
      body: navigationShell,
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Colors.transparent, navBgColor],
          ),
          border: Border(
            top: BorderSide(
              color: isDark ? Colors.white.withOpacity(0.08) : Colors.black.withOpacity(0.06),
              width: 1,
            ),
          ),
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: List.generate(_tabs.length, (index) {
                final tab = _tabs[index];
                final isActive = currentIndex == index;
                return _NavBarItem(
                  tab: tab,
                  isActive: isActive,
                  isDark: isDark,
                  onTap: () => navigationShell.goBranch(index),
                );
              }),
            ),
          ),
        ),
      ),
    );
  }
}

class _TabItem {
  final IconData icon;
  final String label;
  final Color activeColor;
  const _TabItem(
      {required this.icon, required this.label, required this.activeColor});
}

class _NavBarItem extends StatelessWidget {
  final _TabItem tab;
  final bool isActive;
  final bool isDark;
  final VoidCallback onTap;

  const _NavBarItem(
      {required this.tab, required this.isActive, required this.isDark, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final inactiveColor = isDark ? Colors.white38 : Colors.black38;
    
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 250),
        curve: Curves.easeInOut,
        padding:
            EdgeInsets.symmetric(horizontal: isActive ? 16 : 10, vertical: 8),
        decoration: BoxDecoration(
          color:
              isActive ? tab.activeColor.withOpacity(0.15) : Colors.transparent,
          borderRadius: BorderRadius.circular(20),
          border: isActive
              ? Border.all(color: tab.activeColor.withOpacity(0.3), width: 1)
              : null,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(tab.icon,
                color: isActive ? tab.activeColor : inactiveColor, size: 22),
            if (isActive) ...[
              const SizedBox(width: 6),
              Text(
                tab.label,
                style: TextStyle(
                  color: tab.activeColor,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 0.3,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
