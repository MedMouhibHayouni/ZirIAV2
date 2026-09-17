import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../zir_premium_shell.dart';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  DRIVER SHELL  —  "Teal Road" identity
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class DriverShell extends ConsumerWidget {
  final Widget child;
  const DriverShell({super.key, required this.child});

  static const _tabs = [
    ZirShellTab(
      route: '/driver/missions',
      label: 'Missions',
      icon: Icons.local_shipping_outlined,
      activeIcon: Icons.local_shipping_rounded,
      color: Color(0xFF2DD4BF),
    ),
    ZirShellTab(
      route: '/driver/logbook',
      label: 'Journal',
      icon: Icons.book_outlined,
      activeIcon: Icons.book_rounded,
      color: Color(0xFF60A5FA)),
    ZirShellTab(
      route: '/driver/alerts',
      label: 'Alertes',
      icon: Icons.notifications_outlined,
      activeIcon: Icons.notifications_rounded,
      color: Color(0xFFF87171),
    ),
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return ZirPremiumShell(
      roleLabel: 'CHAUFFEUR LOGISTIQUE',
      identityLetter: 'D',
      identityGradient: const [Color(0xFF0D9488), Color(0xFF2DD4BF)],
      tabs: _tabs,
      child: child,
    );
  }
}
