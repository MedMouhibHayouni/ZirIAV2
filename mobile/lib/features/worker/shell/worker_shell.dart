import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../zir_premium_shell.dart';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  WORKER SHELL  —  "Harvest Orange" identity
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class WorkerShell extends ConsumerWidget {
  final Widget child;
  const WorkerShell({super.key, required this.child});

  static const _tabs = [
    ZirShellTab(
      route: '/worker/jobs',
      label: 'Offres',
      icon: Icons.work_outline,
      activeIcon: Icons.work_rounded,
      color: Color(0xFFFB923C),
    ),
    ZirShellTab(
      route: '/worker/applications',
      label: 'Candidatures',
      icon: Icons.assignment_outlined,
      activeIcon: Icons.assignment_rounded,
      color: Color(0xFF34D399),
    ),
    ZirShellTab(
      route: '/worker/alerts',
      label: 'Alertes',
      icon: Icons.notifications_outlined,
      activeIcon: Icons.notifications_rounded,
      color: Color(0xFFF87171),
    ),
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return ZirPremiumShell(
      roleLabel: 'OUVRIER AGRICOLE',
      identityLetter: 'W',
      identityGradient: const [Color(0xFFEA580C), Color(0xFFFB923C)],
      tabs: _tabs,
      child: child,
    );
  }
}
