import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

/// The main authenticated shell for the Worker (Saisonnier) role.
/// Ultra-simple UI for low digital literacy users.
class WorkerMainShell extends StatelessWidget {
  final StatefulNavigationShell navigationShell;

  const WorkerMainShell({super.key, required this.navigationShell});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bgColor = isDark ? const Color(0xFF0A0E1A) : ZiriaColors.bgLight;
    final navBgColor = isDark ? const Color(0xFF111828) : Colors.white;
    final inactiveIconColor = isDark ? Colors.white54 : Colors.black45;

    return Scaffold(
      backgroundColor: bgColor,
      body: navigationShell,
      bottomNavigationBar: NavigationBar(
        backgroundColor: navBgColor,
        indicatorColor: const Color(0xFF00E676).withOpacity(0.2),
        selectedIndex: navigationShell.currentIndex,
        onDestinationSelected: (index) => navigationShell.goBranch(index),
        destinations: [
          NavigationDestination(
            icon: Icon(Icons.work_outline_rounded, color: inactiveIconColor),
            selectedIcon: const Icon(Icons.work_rounded, color: Color(0xFF00E676)),
            label: 'Offres',
          ),
          NavigationDestination(
            icon: Icon(Icons.assignment_ind_outlined, color: inactiveIconColor),
            selectedIcon:
                const Icon(Icons.assignment_ind_rounded, color: Color(0xFF00E676)),
            label: 'Missions',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline_rounded, color: inactiveIconColor),
            selectedIcon: const Icon(Icons.person_rounded, color: Color(0xFF00E676)),
            label: 'Profil',
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------
// TAB 1 : OFFRES DISPONIBLES (Gigantic UI)
// ---------------------------------------------------------
class WorkerOffersScreen extends StatelessWidget {
  const WorkerOffersScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0A0E1A) : ZiriaColors.bgLight,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: const Text('💼 Offres de Travail',
            style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
      ),
      body: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: 3,
        separatorBuilder: (_, __) => const SizedBox(height: 16),
        itemBuilder: (context, index) {
          return Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: const Color(0xFF111828),
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: Colors.white12),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Récolte Olives',
                        style: TextStyle(
                            color: Colors.white,
                            fontSize: 24,
                            fontWeight: FontWeight.w800)),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                          color: const Color(0xFF40C4FF).withOpacity(0.2),
                          borderRadius: BorderRadius.circular(12)),
                      child: const Text('📍 4 km',
                          style: TextStyle(
                              color: Color(0xFF40C4FF),
                              fontSize: 16,
                              fontWeight: FontWeight.bold)),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                const Text('Ferme Ben Ali • Du 12 au 15 Mai',
                    style: TextStyle(color: Colors.white60, fontSize: 16)),
                const SizedBox(height: 20),
                const Text('45 TND / Jour',
                    style: TextStyle(
                        color: Color(0xFF00E676),
                        fontSize: 32,
                        fontWeight: FontWeight.w900)),
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  height: 64,
                  child: ElevatedButton(
                    onPressed: () {},
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF00E676),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(20)),
                    ),
                    child: const Text('POSTULER',
                        style: TextStyle(
                            color: Colors.black,
                            fontSize: 22,
                            fontWeight: FontWeight.w900)),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

// ---------------------------------------------------------
// TAB 2 : MISSIONS EN COURS
// ---------------------------------------------------------
class WorkerMissionsScreen extends StatelessWidget {
  const WorkerMissionsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0A0E1A) : ZiriaColors.bgLight,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: const Text('🚀 Mes Missions',
            style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: const Color(0xFF111828),
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: const Color(0xFFFFD740).withOpacity(0.5)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Row(
                children: [
                  Icon(Icons.warning_amber_rounded,
                      color: Color(0xFFFFD740), size: 28),
                  SizedBox(width: 10),
                  Text('Mission Aujourd\'hui',
                      style: TextStyle(
                          color: Color(0xFFFFD740),
                          fontSize: 20,
                          fontWeight: FontWeight.bold)),
                ],
              ),
              const SizedBox(height: 16),
              const Text('Récolte Tomates',
                  style: TextStyle(
                      color: Colors.white,
                      fontSize: 28,
                      fontWeight: FontWeight.w900)),
              const SizedBox(height: 8),
              const Text('Domaine El Khadra • 07:00 - 15:00',
                  style: TextStyle(color: Colors.white70, fontSize: 16)),
              const SizedBox(height: 24),
              Row(
                children: [
                  Expanded(
                    child: SizedBox(
                      height: 56,
                      child: ElevatedButton.icon(
                        onPressed: () {},
                        icon: const Icon(Icons.directions_rounded, size: 28),
                        label: const Text('GPS',
                            style: TextStyle(
                                fontSize: 18, fontWeight: FontWeight.bold)),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF40C4FF),
                          foregroundColor: Colors.black,
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16)),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: SizedBox(
                      height: 56,
                      child: ElevatedButton.icon(
                        onPressed: () {},
                        icon: const Icon(Icons.call_rounded, size: 28),
                        label: const Text('APPELER',
                            style: TextStyle(
                                fontSize: 18, fontWeight: FontWeight.bold)),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF1A2235),
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16)),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
