import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

/// The main authenticated shell for the Driver (Chauffeur) role.
class DriverMainShell extends StatelessWidget {
  final StatefulNavigationShell navigationShell;

  const DriverMainShell({super.key, required this.navigationShell});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0A0E1A),
      body: navigationShell,
      bottomNavigationBar: NavigationBar(
        backgroundColor: const Color(0xFF111828),
        indicatorColor: const Color(0xFF40C4FF).withOpacity(0.2),
        selectedIndex: navigationShell.currentIndex,
        onDestinationSelected: (index) => navigationShell.goBranch(index),
        destinations: const [
          NavigationDestination(
            icon:
                Icon(Icons.format_list_bulleted_rounded, color: Colors.white54),
            selectedIcon: Icon(Icons.format_list_bulleted_rounded,
                color: Color(0xFF40C4FF)),
            label: 'Demandes',
          ),
          NavigationDestination(
            icon: Icon(Icons.map_rounded, color: Colors.white54),
            selectedIcon: Icon(Icons.map_rounded, color: Color(0xFF40C4FF)),
            label: 'Trajet Actuel',
          ),
          NavigationDestination(
            icon: Icon(Icons.history_rounded, color: Colors.white54),
            selectedIcon: Icon(Icons.history_rounded, color: Color(0xFF40C4FF)),
            label: 'Historique',
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------
// TAB 1 : DEMANDES DE TRANSPORT DISPONIBLES
// ---------------------------------------------------------
class DriverRequestsScreen extends StatelessWidget {
  const DriverRequestsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0A0E1A),
      appBar: AppBar(
        backgroundColor: const Color(0xFF111828),
        elevation: 0,
        title: const Text('🚛 Demandes Bourse Fret',
            style: TextStyle(fontWeight: FontWeight.bold)),
      ),
      body: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: 4,
        separatorBuilder: (_, __) => const SizedBox(height: 12),
        itemBuilder: (context, index) {
          return Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFF111828),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.white12),
            ),
            child: Column(
              children: [
                const Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('📦 10 Tonnes Olives',
                        style: TextStyle(
                            color: Colors.white,
                            fontSize: 16,
                            fontWeight: FontWeight.bold)),
                    Text('150 TND',
                        style: TextStyle(
                            color: Color(0xFF00E676),
                            fontSize: 18,
                            fontWeight: FontWeight.w900)),
                  ],
                ),
                const SizedBox(height: 16),
                const Row(
                  children: [
                    Icon(Icons.my_location_rounded,
                        color: Color(0xFF40C4FF), size: 16),
                    SizedBox(width: 8),
                    Expanded(
                        child: Text('Ferme Kairouan',
                            style: TextStyle(color: Colors.white70))),
                    Text('12 km', style: TextStyle(color: Colors.white38)),
                  ],
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Row(children: [
                    const SizedBox(width: 7),
                    Container(width: 2, height: 12, color: Colors.white12)
                  ]),
                ),
                const Row(
                  children: [
                    Icon(Icons.location_on_rounded,
                        color: Color(0xFFFF4081), size: 16),
                    SizedBox(width: 8),
                    Expanded(
                        child: Text('Usine Huile Sousse',
                            style: TextStyle(color: Colors.white70))),
                    Text('65 km', style: TextStyle(color: Colors.white38)),
                  ],
                ),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton(
                    onPressed: () {},
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF40C4FF),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12)),
                    ),
                    child: const Text('ACCEPTER LA COURSE',
                        style: TextStyle(
                            color: Colors.black, fontWeight: FontWeight.w800)),
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
// TAB 2 : TRAJET ACTUEL (MAP + ACTIONS)
// ---------------------------------------------------------
class DriverActiveTripScreen extends StatelessWidget {
  const DriverActiveTripScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0A0E1A),
      body: Stack(
        children: [
          // Simulated Map Background
          Container(
            width: double.infinity,
            height: double.infinity,
            color: const Color(0xFF1A2235),
            child: const Center(
                child: Text('🗺️ FlutterMap Routing',
                    style: TextStyle(color: Colors.white38, fontSize: 24))),
          ),

          // Top Status Bar
          Positioned(
            top: MediaQuery.of(context).padding.top + 10,
            left: 16,
            right: 16,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: const Color(0xFF111828),
                borderRadius: BorderRadius.circular(12),
                border:
                    Border.all(color: const Color(0xFF40C4FF).withOpacity(0.3)),
              ),
              child: const Row(
                children: [
                  Icon(Icons.navigation_rounded, color: Color(0xFF40C4FF)),
                  SizedBox(width: 12),
                  Text('En route vers le Chargement',
                      style: TextStyle(
                          color: Colors.white, fontWeight: FontWeight.bold)),
                ],
              ),
            ),
          ),

          // Bottom Action Sheet
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: Container(
              padding: const EdgeInsets.all(24),
              decoration: const BoxDecoration(
                color: Color(0xFF111828),
                borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
                boxShadow: [
                  BoxShadow(
                      color: Colors.black54,
                      blurRadius: 20,
                      offset: Offset(0, -5))
                ],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text('Client : Ferme Kairouan',
                      style: TextStyle(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.w700)),
                  const SizedBox(height: 4),
                  const Text('10 Tonnes Olives • Paiement 150 TND',
                      style: TextStyle(color: Colors.white54)),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    height: 56,
                    child: ElevatedButton.icon(
                      onPressed: () {},
                      icon: const Icon(Icons.check_circle_rounded),
                      label: const Text('ARRIVÉ AU CHARGEMENT',
                          style: TextStyle(
                              fontSize: 16, fontWeight: FontWeight.w900)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF00E676),
                        foregroundColor: Colors.black,
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16)),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
