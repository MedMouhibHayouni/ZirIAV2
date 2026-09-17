import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

// ─── Error State ───────────────────────────────────────────────────────────────
class ErrorState extends StatelessWidget {
  final String title;
  final String? subtitle;
  final VoidCallback onRetry;
  final IconData icon;

  const ErrorState({
    super.key,
    this.title = 'Une erreur est survenue',
    this.subtitle = 'Vérifiez votre connexion et réessayez.',
    required this.onRetry,
    this.icon = Icons.wifi_off_rounded,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: ZiriaColors.errorRed.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, size: 36, color: ZiriaColors.errorRed),
            ),
            const SizedBox(height: 20),
            Text(
              title,
              style: ZiriaText.headingMedium(
                  color: Theme.of(context).textTheme.bodyLarge?.color),
              textAlign: TextAlign.center,
            ),
            if (subtitle != null) ...[
              const SizedBox(height: 8),
              Text(
                subtitle!,
                style: ZiriaText.bodyMedium(
                    color: ZiriaColors.textMuted),
                textAlign: TextAlign.center,
              ),
            ],
            const SizedBox(height: 24),
            OutlinedButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh_rounded, size: 18),
              label: const Text('Réessayer'),
              style: OutlinedButton.styleFrom(
                foregroundColor: ZiriaColors.accentEmerald,
                side: const BorderSide(color: ZiriaColors.accentEmerald),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12)),
                padding:
                    const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Empty State ───────────────────────────────────────────────────────────────
class EmptyState extends StatelessWidget {
  final String title;
  final String? subtitle;
  final String emoji;
  final String? ctaLabel;
  final VoidCallback? onCta;

  const EmptyState({
    super.key,
    required this.title,
    this.subtitle,
    this.emoji = '📭',
    this.ctaLabel,
    this.onCta,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(emoji, style: const TextStyle(fontSize: 60)),
            const SizedBox(height: 16),
            Text(
              title,
              style: ZiriaText.headingMedium(
                  color: Theme.of(context).textTheme.bodyLarge?.color),
              textAlign: TextAlign.center,
            ),
            if (subtitle != null) ...[
              const SizedBox(height: 8),
              Text(
                subtitle!,
                style: ZiriaText.bodyMedium(color: ZiriaColors.textMuted),
                textAlign: TextAlign.center,
              ),
            ],
            if (ctaLabel != null && onCta != null) ...[
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: onCta,
                style: ElevatedButton.styleFrom(
                  backgroundColor: ZiriaColors.primaryGreen,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12)),
                  padding: const EdgeInsets.symmetric(
                      horizontal: 24, vertical: 12),
                ),
                child: Text(ctaLabel!),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
