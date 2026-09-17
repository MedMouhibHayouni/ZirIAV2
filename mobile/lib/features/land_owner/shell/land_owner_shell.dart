import 'package:flutter/material.dart';

class LandOwnerShell extends StatelessWidget {
  final Widget child;
  const LandOwnerShell({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: child,
      bottomNavigationBar: NavigationBar(
        destinations: const [
          NavigationDestination(icon: Icon(Icons.dashboard), label: 'Dashboard'),
          NavigationDestination(icon: Icon(Icons.map), label: 'Mes Terres'),
          NavigationDestination(icon: Icon(Icons.gavel), label: 'Enchères'),
          NavigationDestination(icon: Icon(Icons.handshake), label: 'Offres'),
        ],
        selectedIndex: 0,
        onDestinationSelected: (idx) {
          // TODO: implement navigation
        },
      ),
    );
  }
}
