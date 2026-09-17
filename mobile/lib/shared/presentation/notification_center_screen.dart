import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

// MOCK Notifications Notifier & Data
class AppNotification {
  final String id;
  final String title;
  final String message;
  final String type; // 'WEATHER', 'JOB', 'TRANSACTION', 'DISEASE'
  final bool isRead;

  AppNotification({required this.id, required this.title, required this.message, required this.type, this.isRead = false});
  AppNotification copyWith({bool? isRead}) => AppNotification(id: id, title: title, message: message, type: type, isRead: isRead ?? this.isRead);
}

class NotificationsNotifier extends StateNotifier<List<AppNotification>> {
  NotificationsNotifier() : super([
    AppNotification(id: '1', title: 'Alerte Gel', message: 'Risque de gel cette nuit à Kasserine (-2°C).', type: 'WEATHER'),
    AppNotification(id: '2', title: 'Nouveau Job', message: 'Taille d\'oliviers (15j) à Foussana.', type: 'JOB'),
    AppNotification(id: '3', title: 'Paiement Reçu', message: 'Avance de 500 TND confirmée.', type: 'TRANSACTION', isRead: true),
  ]);

  void markAsRead(String id) {
    state = state.map((n) => n.id == id ? n.copyWith(isRead: true) : n).toList();
  }
}

final notificationsProvider = StateNotifierProvider<NotificationsNotifier, List<AppNotification>>((ref) => NotificationsNotifier());

class NotificationCenterScreen extends ConsumerWidget {
  const NotificationCenterScreen({super.key});

  IconData _getIconForType(String type) {
    switch (type) {
      case 'WEATHER': return Icons.cloud;
      case 'JOB': return Icons.work;
      case 'TRANSACTION': return Icons.attach_money;
      case 'DISEASE': return Icons.coronavirus;
      default: return Icons.notifications;
    }
  }

  Color _getColorForType(String type) {
    switch (type) {
      case 'WEATHER': return Colors.blue;
      case 'JOB': return Colors.orange;
      case 'TRANSACTION': return Colors.green;
      case 'DISEASE': return Colors.red;
      default: return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notifications = ref.watch(notificationsProvider);
    
    // Grouping could be done here, but for simplicity we list them with visual cues.
    final unreadCount = notifications.where((n) => !n.isRead).length;

    return Scaffold(
      appBar: AppBar(
        title: Text('Notifications ($unreadCount)'),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black87,
        elevation: 1,
      ),
      body: notifications.isEmpty
          ? const Center(child: Text('Aucune notification.'))
          : ListView.separated(
              itemCount: notifications.length,
              separatorBuilder: (context, index) => const Divider(height: 1),
              itemBuilder: (context, index) {
                final notif = notifications[index];
                final iconColor = _getColorForType(notif.type);

                return ListTile(
                  tileColor: notif.isRead ? Colors.transparent : iconColor.withOpacity(0.05),
                  leading: CircleAvatar(
                    backgroundColor: iconColor.withOpacity(0.2),
                    child: Icon(_getIconForType(notif.type), color: iconColor),
                  ),
                  title: Text(notif.title, style: TextStyle(fontWeight: notif.isRead ? FontWeight.normal : FontWeight.bold)),
                  subtitle: Text(notif.message),
                  trailing: notif.isRead ? null : const Icon(Icons.circle, color: Colors.blue, size: 12),
                  onTap: () {
                    ref.read(notificationsProvider.notifier).markAsRead(notif.id);
                  },
                );
              },
            ),
    );
  }
}
