import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../theme/app_theme.dart';
import '../database/sync_queue_service.dart';

class ConnectivityBanner extends ConsumerWidget {
  const ConnectivityBanner({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isConnected = ref.watch(connectivityProvider);
    final pendingCount = ref.watch(syncQueueCountProvider);

    return isConnected.maybeWhen(
      data: (connected) {
        if (connected) return const SizedBox.shrink();
        return AnimatedContainer(
          duration: const Duration(milliseconds: 300),
          color: ZiriaColors.errorRed,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Row(
            children: [
              const Icon(Icons.wifi_off_rounded,
                  color: Colors.white, size: 16),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Mode hors-ligne — synchronisation en attente',
                  style: ZiriaText.bodySmall(color: Colors.white),
                ),
              ),
              if (pendingCount > 0)
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    '$pendingCount en attente',
                    style: ZiriaText.bodySmall(color: Colors.white),
                  ),
                ),
            ],
          ),
        );
      },
      orElse: () => const SizedBox.shrink(),
    );
  }
}
