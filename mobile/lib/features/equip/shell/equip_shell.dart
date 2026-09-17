import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../zir_premium_shell.dart';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  EQUIPMENT SHELL  —  "Steel Red" identity
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class EquipShell extends ConsumerWidget {
  final Widget child;
  const EquipShell({super.key, required this.child});

  static const _tabs = [
    ZirShellTab(
      route: '/equip/inventory',
      label: 'Parc',
      icon: Icons.agriculture_outlined,
      activeIcon: Icons.agriculture_rounded,
      color: Color(0xFFF87171),
    ),
    ZirShellTab(
      route: '/equip/rentals',
      label: 'Locations',
      icon: Icons.calendar_month_outlined,
      activeIcon: Icons.calendar_month_rounded,
      color: Color(0xFFFBBF24),
    ),
    ZirShellTab(
      route: '/equip/alerts',
      label: 'Alertes',
      icon: Icons.notifications_outlined,
      activeIcon: Icons.notifications_rounded,
      color: Color(0xFFA78BFA),
    ),
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return ZirPremiumShell(
      roleLabel: 'GESTIONNAIRE MATÉRIEL',
      identityLetter: '⚙',
      identityGradient: const [Color(0xFF7F1D1D), Color(0xFFDC2626)],
      tabs: _tabs,
      child: child,
    );
  }
}
