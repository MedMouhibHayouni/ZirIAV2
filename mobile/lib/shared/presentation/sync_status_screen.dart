import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

// MOCK: Représente les actions en attente dans Isar
class SyncAction {
  final String id;
  final String description; // ex: "Création annonce (10T Olives)"
  final DateTime createdAt;
  final String status; // 'QUEUED', 'SYNCING', 'FAILED'

  SyncAction({required this.id, required this.description, required this.createdAt, this.status = 'QUEUED'});
}

class SyncQueueNotifier extends StateNotifier<List<SyncAction>> {
  SyncQueueNotifier() : super([
    SyncAction(id: 'a1', description: 'Signalement CRDA (Stress Hydrique)', createdAt: DateTime.now().subtract(const Duration(minutes: 5))),
    SyncAction(id: 'a2', description: 'Message Chat Agent IA', createdAt: DateTime.now().subtract(const Duration(minutes: 2)), status: 'SYNCING'),
  ]);

  // Mock function to simulate processing
  void triggerSync() {
    state = state.map((a) => SyncAction(id: a.id, description: a.description, createdAt: a.createdAt, status: 'SYNCING')).toList();
    Future.delayed(const Duration(seconds: 2), () {
      state = [];
    });
  }
}

final syncQueueProvider = StateNotifierProvider<SyncQueueNotifier, List<SyncAction>>((ref) => SyncQueueNotifier());

class SyncStatusScreen extends ConsumerWidget {
  const SyncStatusScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final pendingActions = ref.watch(syncQueueProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Synchronisation Hors-ligne'),
        backgroundColor: Colors.blueGrey.shade800,
        foregroundColor: Colors.white,
      ),
      body: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            color: Colors.blueGrey.shade50,
            child: Row(
              children: [
                Icon(
                  pendingActions.isEmpty ? Icons.cloud_done : Icons.cloud_sync,
                  size: 48,
                  color: pendingActions.isEmpty ? Colors.green : Colors.orange,
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        pendingActions.isEmpty ? 'Toutes les données sont synchronisées' : '${pendingActions.length} actions en attente',
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        pendingActions.isEmpty ? 'Votre application est à jour avec les serveurs ZirIA.' : 'Ces actions seront envoyées dès le retour du réseau.',
                        style: TextStyle(color: Colors.grey.shade700, fontSize: 13),
                      ),
                    ],
                  ),
                )
              ],
            ),
          ),
          const Divider(height: 1, thickness: 1),
          if (pendingActions.isNotEmpty)
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: ElevatedButton.icon(
                onPressed: () {
                  ref.read(syncQueueProvider.notifier).triggerSync();
                },
                icon: const Icon(Icons.sync),
                label: const Text('FORCER LA SYNCHRONISATION'),
                style: ElevatedButton.styleFrom(
                  minimumSize: const Size(double.infinity, 50),
                  backgroundColor: Colors.blueGrey.shade800,
                  foregroundColor: Colors.white,
                ),
              ),
            ),
          Expanded(
            child: pendingActions.isEmpty
                ? const Center(child: Text('File d\'attente vide.'))
                : ListView.builder(
                    itemCount: pendingActions.length,
                    itemBuilder: (ctx, i) {
                      final action = pendingActions[i];
                      return ListTile(
                        leading: action.status == 'SYNCING'
                            ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2))
                            : const Icon(Icons.schedule, color: Colors.grey),
                        title: Text(action.description, style: const TextStyle(fontWeight: FontWeight.bold)),
                        subtitle: Text('Créé à ${action.createdAt.hour}:${action.createdAt.minute.toString().padLeft(2, '0')}'),
                        trailing: Text(
                          action.status == 'SYNCING' ? 'En cours...' : 'En attente',
                          style: TextStyle(color: action.status == 'SYNCING' ? Colors.blue : Colors.orange, fontWeight: FontWeight.bold),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}
