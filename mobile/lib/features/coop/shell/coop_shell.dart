import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/connectivity_banner.dart';
import '../../../core/providers/theme_provider.dart';
import '../../auth/providers/auth_notifier.dart';

class CoopShell extends ConsumerStatefulWidget {
  final Widget child;
  const CoopShell({super.key, required this.child});
  @override
  ConsumerState<CoopShell> createState() => _CoopShellState();
}

class _CoopShellState extends ConsumerState<CoopShell> {
  static const _tabs = [
    '/coop/dashboard',
    '/coop/members',
    '/coop/marketplace',
    '/coop/alerts'
  ];
  static const _labels = ['Tableau de bord', 'Membres', 'Marché', 'Alertes'];
  static const _icons = [
    Icons.dashboard_outlined,
    Icons.group_outlined,
    Icons.storefront_outlined,
    Icons.notifications_outlined,
  ];
  int _idx = 0;

  void _onTap(int i) {
    setState(() => _idx = i);
    context.go(_tabs[i]);
  }

  @override
  Widget build(BuildContext context) {
    final isDark = ref.watch(themeNotifierProvider) == ThemeMode.dark;
    return Scaffold(
      appBar: AppBar(
        leading: Padding(
          padding: const EdgeInsets.all(10),
          child: Container(
            decoration: const BoxDecoration(
                shape: BoxShape.circle,
                gradient: LinearGradient(
                    colors: [Color(0xFF1565C0), Color(0xFF0D47A1)])),
            child: const Center(
                child: Text('C',
                    style: TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.w900))),
          ),
        ),
        title: Text(_labels[_idx],
            style: ZiriaText.headingMedium(
                color: isDark ? Colors.white : ZiriaColors.nightBlue)),
        actions: [
          IconButton(
              icon: Icon(
                  isDark ? Icons.wb_sunny_outlined : Icons.nightlight_outlined,
                  color: isDark ? Colors.white70 : ZiriaColors.nightBlue),
              onPressed: () =>
                  ref.read(themeNotifierProvider.notifier).toggle()),
          IconButton(
              icon: Icon(Icons.logout_rounded,
                  color: isDark ? Colors.white70 : ZiriaColors.nightBlue),
              onPressed: () =>
                  ref.read(authNotifierProvider.notifier).logout()),
        ],
      ),
      body: Column(children: [
        const ConnectivityBanner(),
        Expanded(child: widget.child),
      ]),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _idx,
        onTap: _onTap,
        items: List.generate(
            _tabs.length,
            (i) => BottomNavigationBarItem(
                icon: Icon(_icons[i]), label: _labels[i])),
      ),
    );
  }
}
