import 'package:flutter/material.dart';

class SupplierShell extends StatelessWidget {
  final Widget child;
  const SupplierShell({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: child,
      bottomNavigationBar: NavigationBar(
        destinations: const [
          NavigationDestination(icon: Icon(Icons.inventory_2), label: 'Catalogue'),
          NavigationDestination(icon: Icon(Icons.shopping_cart), label: 'Commandes'),
          NavigationDestination(icon: Icon(Icons.notifications), label: 'Alertes'),
        ],
        selectedIndex: 0,
        onDestinationSelected: (idx) {
          // TODO: implement navigation
        },
      ),
    );
  }
}
