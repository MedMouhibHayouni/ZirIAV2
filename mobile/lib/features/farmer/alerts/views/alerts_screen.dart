import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/ziria_card.dart';
import '../../../../core/widgets/skeleton_widget.dart';
import '../../../../core/widgets/state_widgets.dart';

// ── Models ──────────────────────────────────────────────────────────────────
class ZiriaAlert {
  final String id, title, type, severity, message;
  final DateTime createdAt;
  final bool isRead;

  ZiriaAlert(
      {required this.id,
      required this.title,
      required this.type,
      required this.severity,
      required this.message,
      required this.createdAt,
      this.isRead = false});

  factory ZiriaAlert.fromJson(Map j) => ZiriaAlert(
        id: j['id']?.toString() ?? '',
        title: j['title'] ?? '',
        type: j['type'] ?? 'OTHER',
        severity: j['severity'] ?? 'INFO',
        message: j['message'] ?? '',
        createdAt: DateTime.tryParse(j['created_at']?.toString() ?? '') ?? DateTime.now(),
        isRead: j['is_read'] == true,
      );

  ZiriaAlert copyWith({bool? isRead}) {
    return ZiriaAlert(
      id: id,
      title: title,
      type: type,
      severity: severity,
      message: message,
      createdAt: createdAt,
      isRead: isRead ?? this.isRead,
    );
  }
}

// ── Provider ─────────────────────────────────────────────────────────────────
class AlertsNotifier extends AutoDisposeAsyncNotifier<List<ZiriaAlert>> {
  @override
  Future<List<ZiriaAlert>> build() async {
    return _fetchAlerts();
  }

  Future<List<ZiriaAlert>> _fetchAlerts() async {
    try {
      final dio = ref.read(dioProvider);
      final res = await dio.get('/notifications');
      final list = res.data is List ? res.data as List : (res.data['items'] ?? []);
      return list.map<ZiriaAlert>((e) => ZiriaAlert.fromJson(e)).toList();
    } catch (e) {
      throw Exception('Impossible de charger les alertes. Vérifiez votre connexion.');
    }
  }

  Future<void> markAsRead(String id) async {
    // Optimistic update
    final previousState = state;
    state = AsyncData(
      state.value?.map((a) => a.id == id ? a.copyWith(isRead: true) : a).toList() ?? [],
    );

    try {
      final dio = ref.read(dioProvider);
      await dio.patch('/notifications/$id/read');
    } catch (e) {
      // Revert on failure
      state = previousState;
    }
  }
}

final alertsNotifierProvider =
    AsyncNotifierProvider.autoDispose<AlertsNotifier, List<ZiriaAlert>>(() {
  return AlertsNotifier();
});

// ── Screen ──────────────────────────────────────────────────────────────────
class AlertsScreen extends ConsumerWidget {
  final String role;
  const AlertsScreen({super.key, required this.role});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final alertsAsync = ref.watch(alertsNotifierProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      body: alertsAsync.when(
        loading: () => ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: 5,
            itemBuilder: (_, __) => const SkeletonCard(height: 100)),
        error: (e, st) {
          print('!!! UI ERROR ALERTS: $e');
          return ErrorState(
              onRetry: () => ref.invalidate(alertsNotifierProvider));
        },
        data: (alerts) {
          if (alerts.isEmpty) {
            return const EmptyState(
                title: 'Aucune alerte',
                emoji: '🔔',
                subtitle: 'Tout est calme pour le moment.');
          }
          return ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: alerts.length,
            itemBuilder: (ctx, i) =>
                _AlertCard(
                  alert: alerts[i], 
                  isDark: isDark,
                  onTap: () => ref.read(alertsNotifierProvider.notifier).markAsRead(alerts[i].id),
                ),
          );
        },
      ),
    );
  }
}

class _AlertCard extends StatelessWidget {
  final ZiriaAlert alert;
  final bool isDark;
  final VoidCallback onTap;
  
  const _AlertCard({required this.alert, required this.isDark, required this.onTap});

  @override
  Widget build(BuildContext context) {
    Color color;
    switch (alert.severity.toUpperCase()) {
      case 'HIGH':
      case 'CRITICAL':
        color = ZiriaColors.errorRed;
        break;
      case 'MEDIUM':
      case 'WARNING':
        color = ZiriaColors.warningOrange;
        break;
      default:
        color = ZiriaColors.primaryGreen;
    }

    return GestureDetector(
      onTap: onTap,
      child: Opacity(
        opacity: alert.isRead ? 0.6 : 1.0,
        child: ZiriaCard(
          margin: const EdgeInsets.only(bottom: 12),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 4,
                height: 60,
                decoration: BoxDecoration(
                    color: color, borderRadius: BorderRadius.circular(2)),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(alert.title,
                            style: ZiriaText.labelBold(
                                color:
                                    isDark ? Colors.white : ZiriaColors.nightBlue)),
                        Text(alert.type,
                            style:
                                ZiriaText.bodySmall(color: ZiriaColors.textMuted)),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(alert.message, style: ZiriaText.bodyMedium()),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(_formatTimeAgo(alert.createdAt),
                            style: ZiriaText.bodySmall(color: ZiriaColors.textMuted)),
                        if (!alert.isRead)
                          Container(
                            width: 8,
                            height: 8,
                            decoration: const BoxDecoration(
                              color: ZiriaColors.accentEmerald,
                              shape: BoxShape.circle,
                            ),
                          )
                      ],
                    )
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
  
  String _formatTimeAgo(DateTime date) {
    final diff = DateTime.now().difference(date);
    if (diff.inMinutes < 60) return 'Il y a ${diff.inMinutes}m';
    if (diff.inHours < 24) return 'Il y a ${diff.inHours}h';
    return 'Il y a ${diff.inDays}j';
  }
}
