import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../shared/widgets/skeleton.dart';
import '../repositories/equip_repository.dart';

class EquipMainShell extends ConsumerStatefulWidget {
  const EquipMainShell({super.key});

  @override
  ConsumerState<EquipMainShell> createState() => _EquipMainShellState();
}

class _EquipMainShellState extends ConsumerState<EquipMainShell> {
  int _currentIndex = 1; // Start on Demandes tab for the demo

  final List<Widget> _tabs = [
    const Center(
        child:
            Text('Calendrier (Vue Semaine)', style: TextStyle(fontSize: 20))),
    const _RequestsTab(),
    const Center(
        child: Text('Ma Flotte (Tracteurs & Machines)',
            style: TextStyle(fontSize: 20))),
    const Center(child: Text('Revenus', style: TextStyle(fontSize: 20))),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Gestion Flotte'),
      ),
      body: _tabs[_currentIndex],
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (i) => setState(() => _currentIndex = i),
        destinations: const [
          NavigationDestination(
              icon: Icon(Icons.calendar_month_outlined),
              selectedIcon: Icon(Icons.calendar_month),
              label: 'Planning'),
          NavigationDestination(
              icon: Icon(Icons.assignment_outlined),
              selectedIcon: Icon(Icons.assignment),
              label: 'Demandes'),
          NavigationDestination(
              icon: Icon(Icons.agriculture_outlined),
              selectedIcon: Icon(Icons.agriculture),
              label: 'Flotte'),
          NavigationDestination(
              icon: Icon(Icons.attach_money_outlined),
              selectedIcon: Icon(Icons.attach_money),
              label: 'Revenus'),
        ],
      ),
    );
  }
}

class _RequestsTab extends ConsumerStatefulWidget {
  const _RequestsTab();

  @override
  ConsumerState<_RequestsTab> createState() => _RequestsTabState();
}

class _RequestsTabState extends ConsumerState<_RequestsTab> {
  bool _isLoading = false;
  List<dynamic> _requests = [];
  String? _processingId;

  @override
  void initState() {
    super.initState();
    _loadRequests();
  }

  Future<void> _loadRequests() async {
    setState(() => _isLoading = true);
    try {
      final requests =
          await ref.read(equipRepositoryProvider).getPendingReservations();
      setState(() => _requests = requests);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Erreur chargement demandes')),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _respond(String id, String status) async {
    setState(() => _processingId = id);
    try {
      await ref.read(equipRepositoryProvider).respondToRequest(id, status);
      // Retirer de la liste
      setState(() {
        _requests.removeWhere((r) => r['id'] == id);
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(status == 'CONFIRMED'
                ? 'Demande acceptée !'
                : 'Demande refusée.'),
            backgroundColor:
                status == 'CONFIRMED' ? ZiriaColors.successGreen : Colors.grey,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        // Affiche l'exception formattée (notamment la 409 Race Condition)
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text(e.toString().replaceAll('Exception: ', '')),
              backgroundColor: ZiriaColors.errorRed),
        );
      }
    } finally {
      if (mounted) setState(() => _processingId = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return ListView.builder(
        padding: const EdgeInsets.all(12),
        itemCount: 4,
        itemBuilder: (_, __) => const Padding(
          padding: EdgeInsets.only(bottom: 12),
          child: SkeletonCard(height: 160),
        ),
      );
    }

    if (_requests.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.inbox,
                size: 64, color: Theme.of(context).colorScheme.outlineVariant),
            const SizedBox(height: 16),
            Text('Aucune demande en attente',
                style: TextStyle(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                    fontSize: 16)),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadRequests,
      child: ListView.builder(
        padding: const EdgeInsets.all(12),
        itemCount: _requests.length,
        itemBuilder: (ctx, i) {
          final req = _requests[i];
          final reqId = req['id'];
          final isProcessing = _processingId == reqId;

          return Card(
            elevation: 2,
            margin: const EdgeInsets.only(bottom: 12),
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        req['equipment']?['name'] ?? 'Tracteur',
                        style: const TextStyle(
                            fontWeight: FontWeight.bold, fontSize: 16),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: ZiriaColors.earthOcher.withOpacity(0.15),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Text('En attente',
                            style: TextStyle(
                                color: ZiriaColors.earthOcher,
                                fontSize: 12,
                                fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text('Demandeur : ${req['farmer']?['name'] ?? 'Inconnu'}',
                      style: TextStyle(
                          color:
                              Theme.of(context).colorScheme.onSurfaceVariant)),
                  Text('Dates : ${req['startDate']} -> ${req['endDate']}',
                      style: TextStyle(
                          color:
                              Theme.of(context).colorScheme.onSurfaceVariant)),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: isProcessing
                              ? null
                              : () => _respond(reqId, 'REJECTED'),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: ZiriaColors.errorRed,
                            side: const BorderSide(color: ZiriaColors.errorRed),
                            shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12)),
                          ),
                          child: const Text('Refuser'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: FilledButton(
                          onPressed: isProcessing
                              ? null
                              : () => _respond(reqId, 'CONFIRMED'),
                          style: FilledButton.styleFrom(
                            backgroundColor: ZiriaColors.primaryGreen,
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12)),
                          ),
                          child: isProcessing
                              ? const SizedBox(
                                  height: 16,
                                  width: 16,
                                  child: CircularProgressIndicator(
                                      color: Colors.white, strokeWidth: 2))
                              : const Text('Accepter'),
                        ),
                      ),
                    ],
                  )
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
